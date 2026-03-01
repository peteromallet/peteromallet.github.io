// A simple Node.js server to serve the static files
const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const PORT = process.env.PORT || 3002;
// Use 0.0.0.0 to listen on all network interfaces (needed for external access)
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

// Function to parse frontmatter from markdown content
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { metadata: {}, content: content };
  }
  
  const frontmatterText = match[1];
  const contentWithoutFrontmatter = content.slice(match[0].length);
  
  const metadata = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      metadata[key] = value;
    }
  });
  
  return { metadata, content: contentWithoutFrontmatter };
}

// Function to validate if a post has valid title and date
function isValidPost(content, metadata, filePath) {
  // Check for valid title - must start with # heading and have non-empty content
  const titleMatch = content.match(/^#\s+(.+)/m);
  if (!titleMatch || !titleMatch[1] || titleMatch[1].trim().length === 0) {
    console.log(`Post validation failed: No valid title found in ${filePath}`);
    return false;
  }
  
  // Additional check: title should have at least one alphanumeric character
  if (!/[a-zA-Z0-9]/.test(titleMatch[1])) {
    console.log(`Post validation failed: Title contains no alphanumeric characters in ${filePath}`);
    return false;
  }
  
  // Check for valid date
  let postDate = null;
  
  // Try to get date from frontmatter
  if (metadata.date) {
    postDate = new Date(metadata.date);
    // Check if date is valid
    if (isNaN(postDate.getTime())) {
      console.log(`Post validation failed: Invalid date format "${metadata.date}" in frontmatter for ${filePath}`);
      return false;
    }
    
    // Check if date is reasonable (not before 2000 or too far in future)
    const year = postDate.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 10) {
      console.log(`Post validation failed: Date year ${year} is outside reasonable range (2000-${currentYear + 10}) for ${filePath}`);
      return false;
    }
  } else {
    // Try to get date from file stats
    try {
      const stats = fs.statSync(filePath);
      postDate = stats.birthtime;
      if (!postDate || isNaN(postDate.getTime())) {
        console.log(`Post validation failed: Invalid file date for ${filePath}`);
        return false;
      }
    } catch (err) {
      console.log(`Post validation failed: Cannot read file stats for ${filePath}: ${err.message}`);
      return false;
    }
  }
  
  console.log(`Post validation succeeded: ${filePath} (title: "${titleMatch[1].substring(0, 50)}...", date: ${postDate.toISOString().split('T')[0]})`);
  return true;
}

// Function to get all markdown files from posts directory
function getPostsPosts() {
  const postsDir = path.join(__dirname, 'posts');
  
  if (!fs.existsSync(postsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
  
  return files
    .map(file => {
      const filePath = path.join(postsDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const { metadata, content } = parseFrontmatter(rawContent);
      const slug = file.replace('.md', '');
      
      // Validate post has valid title and date
      if (!isValidPost(content, metadata, filePath)) {
        return null;
      }
      
      // Extract title from first heading - MUST start with #
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch[1];
      
      // Remove the first # heading from content for excerpt extraction
      const contentWithoutTitle = content.replace(/^#\s+.+$/m, '').trim();
      
      // Extract excerpt from first paragraph
      const paragraphMatch = contentWithoutTitle.match(/^([^#\n].+?)(?:\n\n|$)/);
      let excerpt = paragraphMatch ? paragraphMatch[1] : '';
      
      // Remove hyperlinks [text](url) -> text
      excerpt = excerpt.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      
      // Limit to one line and very short length
      excerpt = excerpt.split('\n')[0].substring(0, 30);
      
      // Add ellipsis if truncated
      if (excerpt.length === 30 && paragraphMatch && paragraphMatch[1].length > 30) {
        excerpt += '...';
      }
      
      // Use date from frontmatter if available, otherwise fall back to file stats
      let postDate;
      if (metadata.date) {
        postDate = new Date(metadata.date);
      } else {
        const stats = fs.statSync(filePath);
        postDate = stats.birthtime;
      }
      
      return {
        slug,
        title,
        excerpt,
        date: postDate
      };
    })
    .filter(post => post !== null) // Remove null entries (invalid posts)
    .sort((a, b) => b.date - a.date); // Sort by date, newest first
}

// Function to render markdown post with proper error handling
function renderMarkdownPost(slug, callback) {
  const filePath = path.join(__dirname, 'posts', `${slug}.md`);
  
  // Check if markdown file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return callback(null, null); // File doesn't exist
    }
    
    // Read the markdown file first to validate it
    fs.readFile(filePath, 'utf-8', (err, rawContent) => {
      if (err) {
        return callback(err, null);
      }
      
      // Parse frontmatter
      const { metadata, content } = parseFrontmatter(rawContent);
      
      // Validate post has valid title and date
      if (!isValidPost(content, metadata, filePath)) {
        console.log(`Attempted to access invalid post: ${slug}`);
        return callback(null, null); // Invalid post
      }
      
      // Get all posts to determine navigation (only valid posts will be in this list)
      const allPosts = getPostsPosts();
      const currentIndex = allPosts.findIndex(post => post.slug === slug);
      
      if (currentIndex === -1) {
        return callback(null, null); // Post not found in list
      }
      
      const currentPost = allPosts[currentIndex];
      // Previous = newer post (in reading order), Next = older post (in reading order)
      const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
      const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
      
      // Extract title from first # heading
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch[1];
      
      // Remove the first # heading from content before rendering
      const contentWithoutTitle = content.replace(/^#\s+.+$/m, '').trim();
      
      const html = marked(contentWithoutTitle);

      // Fix video source paths in the rendered markdown
      let fixedHtml = html.replace(/src="\.\.\/assets\//g, 'src="/assets/');
      
      // Add mobile-specific video attributes
      fixedHtml = fixedHtml.replace(
        /<video([^>]*)>/g, 
        '<video$1 playsinline preload="metadata" muted>'
      );

      // Use date from frontmatter if available, otherwise fall back to file stats
      const getDateAndContinue = () => {
        if (metadata.date) {
          const postDate = new Date(metadata.date);
          const date = postDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          continueWithDate(date);
        } else {
          fs.stat(filePath, (err, stats) => {
            if (err) {
              return callback(err, null);
            }
            
            const date = stats.birthtime.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            continueWithDate(date);
          });
        }
      };
      
      const continueWithDate = (date) => {
        
        // Generate navigation HTML
        const prevNav = prevPost ? 
          `<a href="/posts/${prevPost.slug}" class="nav-link nav-prev">
            <span class="nav-arrow">←</span>
            <span class="nav-title">${prevPost.title}</span>
          </a>` : '<div class="nav-spacer"></div>';
        
        const nextNav = nextPost ? 
          `<a href="/posts/${nextPost.slug}" class="nav-link nav-next">
            <span class="nav-title">${nextPost.title}</span>
            <span class="nav-arrow">→</span>
          </a>` : '<div class="nav-spacer"></div>';
        
        // Load template
        const templatePath = path.join(__dirname, 'posts-post.html');
        fs.readFile(templatePath, 'utf-8', (err, template) => {
          if (err) {
            return callback(err, null);
          }
          
          // Fix relative paths to absolute paths
          template = template.replace(/href="\.\.\/styles\.css"/g, 'href="/styles.css"');
          template = template.replace(/src="\.\.\/script\.js"/g, 'src="/script.js"');
          template = template.replace(/src="\.\.\/plant-animation\.js"/g, 'src="/plant-animation.js"');
          template = template.replace(/href="\.\.\/favicon\.ico"/g, 'href="/favicon.ico"');
          template = template.replace(/href="\/writing\/" class="back-link"/g, 'href="/writing" class="back-link"');
          
          template = template.replace(/\{\{TITLE\}\}/g, title);
          template = template.replace(/\{\{DATE\}\}/g, date);
          template = template.replace(/\{\{CONTENT\}\}/g, fixedHtml);
          template = template.replace(/\{\{PREV_NAV\}\}/g, prevNav);
          template = template.replace(/\{\{NEXT_NAV\}\}/g, nextNav);
          
          callback(null, template);
        });
      };
      
      getDateAndContinue();
    });
  });
}

const server = http.createServer((req, res) => {
  console.log(`Request for ${req.url}`);
  
  // Handle API routes
  if (req.url === '/api/posts') {
    const posts = getPostsPosts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(posts));
    return;
  }
  
  // Redirect /posts/ to /posts for consistency
  if (req.url === '/posts/') {
    res.writeHead(301, { 'Location': '/posts' });
    res.end();
    return;
  }

  // Handle posts routes - serve dedicated posts page
  if (req.url === '/posts') {
    fs.readFile('./index.html', (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Page not found');
      } else {
        // Create posts page by modifying the home page structure
        let html = content.toString();

        // Fix relative paths to absolute paths to prevent /posts/styles.css issues
        html = html.replace(/href="styles\.css"/g, 'href="/styles.css"');
        html = html.replace(/src="script\.js"/g, 'src="/script.js"');
        html = html.replace(/src="plant-animation\.js"/g, 'src="/plant-animation.js"');
        html = html.replace(/src="weights-chart\.js"/g, 'src="/weights-chart.js"');
        html = html.replace(/href="favicon\.ico"/g, 'href="/favicon.ico"');
        html = html.replace(/src="assets\//g, 'src="/assets/');

        // Update the toggle to show Posts as active and link About back to home
        html = html.replace(
          '<span class="toggle-btn active">About</span>',
          '<a href="/" class="toggle-btn">About</a>'
        );
        html = html.replace(
          '<a href="/posts" class="toggle-btn">Posts</a>',
          '<span class="toggle-btn active">Posts</span>'
        );
        
        // Make POM letters clickable to link to home page
        html = html.replace(
          '<div class="large-letters loading-element" id="pom-letters">',
          '<a href="/" class="large-letters loading-element" id="pom-letters">'
        );
        html = html.replace(
          '</div>\n\n            <!-- About/Writing Toggle -->',
          '</a>\n\n            <!-- About/Writing Toggle -->'
        );
        
        // Replace everything from about section to watering can with posts content
        const aboutSectionRegex = /<div id="about-section" class="content-section">([\s\S]*?)<!-- Watering Can Animation -->/;
        const postsContent = `<div id="posts-section" class="content-section">
            <!-- Posts Content -->
            <div class="posts-section-content">
                <div class="posts-list loading-element">
                    <!-- Posts will be loaded here -->
                </div>
            </div>
        </div> <!-- End Posts Section -->

        <!-- Watering Can Animation -->`;
        
        html = html.replace(aboutSectionRegex, postsContent);

        // Add script to load posts
        const scriptToAdd = `
    <script>
        // Load posts on page load
        function loadPostsPosts() {
            fetch('/api/posts')
                .then(response => response.json())
                .then(posts => {
                    const postsList = document.querySelector('.posts-list');
                    if (posts.length === 0) {
                        postsList.innerHTML = '<div class="no-posts"><p>No posts yet.</p><p>Add markdown files to the posts/ folder to see them here.</p></div>';
                        return;
                    }

                    postsList.innerHTML = posts.map((post, index) => {
                        const colorClass = 'color-' + (Math.floor(Math.random() * 8) + 1);
                        return \`
                        <a href="/posts/\${post.slug}" class="posts-post-card-link">
                            <div class="posts-post-card \${colorClass}">
                                <h3>\${post.title}</h3>
                                <p class="post-date">\${new Date(post.date).toLocaleDateString()}</p>
                                <p class="post-excerpt">\${post.excerpt}</p>
                            </div>
                        </a>
                    \`;
                    }).join('');
                })
                .catch(error => {
                    console.error('Error loading posts:', error);
                    document.querySelector('.posts-list').innerHTML = '<div class="error"><p>Error loading posts.</p></div>';
                });
        }

        // Load posts when page loads
        loadPostsPosts();
    </script>`;
        
        html = html.replace('</body>', scriptToAdd + '</body>');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html, 'utf-8');
      }
    });
    return;
  }
  
  // Redirect /projects/ to /projects for consistency
  if (req.url === '/projects/') {
    res.writeHead(301, { 'Location': '/projects' });
    res.end();
    return;
  }

  // Handle projects page
  if (req.url === '/projects') {
    fs.readFile('./index.html', (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Page not found');
      } else {
        let html = content.toString();

        // Fix relative paths
        html = html.replace(/href="styles\.css"/g, 'href="/styles.css"');
        html = html.replace(/src="script\.js"/g, 'src="/script.js"');
        html = html.replace(/src="plant-animation\.js"/g, 'src="/plant-animation.js"');
        html = html.replace(/src="weights-chart\.js"/g, 'src="/weights-chart.js"');
        html = html.replace(/href="favicon\.ico"/g, 'href="/favicon.ico"');
        html = html.replace(/src="assets\//g, 'src="/assets/');

        // Update toggle to show Projects as active
        html = html.replace(
          '<span class="toggle-btn active">About</span>',
          '<a href="/" class="toggle-btn">About</a>'
        );
        html = html.replace(
          '<a href="/projects" class="toggle-btn">Projects</a>',
          '<span class="toggle-btn active">Projects</span>'
        );

        // Make POM letters clickable
        html = html.replace(
          '<div class="large-letters loading-element" id="pom-letters">',
          '<a href="/" class="large-letters loading-element" id="pom-letters">'
        );
        html = html.replace(
          '</div>\n\n            <!-- About/Writing Toggle -->',
          '</a>\n\n            <!-- About/Writing Toggle -->'
        );

        // Replace about section with projects content
        const aboutSectionRegex = /<div id="about-section" class="content-section">([\s\S]*?)<!-- Watering Can Animation -->/;
        const projectsContent = `<div id="projects-section" class="content-section">
            <div class="projects-section-content">
                <div class="projects-filter">
                    <button class="projects-filter-btn active" data-filter="all">All</button>
                    <button class="projects-filter-btn" data-filter="ongoing">Ongoing</button>
                </div>
                <div class="projects-list">

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">Feb 2026\u2013now</span>
                        <span class="project-desc">I want to release every bit of data I produce for AIs to train on. As a start, I built <a href="https://github.com/peteromallet/dataclaw" target="_blank" class="project-link">dataclaw</a> to export AI coding conversations to HuggingFace.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">Feb 2026\u2013now</span>
                        <span class="project-desc">I was concerned the code I was writing was a bit shit, so I built an open source agent harness called <a href="https://github.com/peteromallet/desloppify" target="_blank" class="project-link">desloppify</a> that hunts down bad software engineering in all its forms. Gives your codebase a health score you can't game.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">Jan 2026\u2013now</span>
                        <span class="project-desc">I've become too agent-brained to use interfaces that abstract away code, so I built <a href="https://github.com/peteromallet/VibeComfy" target="_blank" class="project-link">VibeComfy</a> to bridge Claude Code and ComfyUI via MCP. You talk, Claude manipulates the workflow.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">Nov 2025\u2013now</span>
                        <span class="project-desc">Banodoco runs <a href="https://arcagidan.com/" target="_blank" class="project-link">The Arca Gidan Prize</a> \u2014 an art competition pushing open-source AI models to their limits.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">2025\u2013now</span>
                        <span class="project-desc">I believe providing reference images is the best way to control image generation, so I'm training the InX series \u2014 LoRAs for various image editing models. So far: <a href="https://huggingface.co/peteromallet/Flux-Kontext-InScene" target="_blank" class="project-link">Flux-Kontext-InScene</a> for <span class="hover-trigger" data-img="/assets/projects/flux-kontext-inscene.png">scene-consistent variations</span>, and QwenEdit LoRAs for surgical editing \u2014 <span class="hover-trigger" data-img="/assets/projects/qwen-inscene.png">preserving the scene</span>, the subject, or <span class="hover-trigger" data-img="/assets/projects/qwen-instyle.png">transferring the style</span>. Trained on curated datasets that I'll all release publicly, including ~4,000 <a href="https://huggingface.co/datasets/peteromallet/high-quality-midjouney-srefs" target="_blank" class="project-link">Midjourney style references</a>.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">2024</span>
                        <span class="project-desc">I built <a href="https://github.com/banodoco/Dough" target="_blank" class="project-link">Dough</a> to bring the AnimateDiff ecosystem to artists. I believe the direction was right but it was early and the execution was sloppy. People still made <a href="/posts/5-artworks-from-dough" class="project-link">beautiful work</a> with it.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">2023\u2013now</span>
                        <span class="project-desc">I like to train Motion LoRAs to get video models to do interesting things. For AnimateDiff, I trained <a href="https://huggingface.co/peteromallet/ad_motion_loras/tree/main" target="_blank" class="project-link">WAS26</a> (community art), <a href="https://huggingface.co/peteromallet/ad_motion_loras/tree/main" target="_blank" class="project-link">Smoooth</a> (smooth motion), <a href="https://huggingface.co/peteromallet/ad_motion_loras/tree/main" target="_blank" class="project-link">LiquidAF</a> (liquid sims), and others. For Wan, I trained <a href="https://huggingface.co/peteromallet/There_Will_Be_Bloom" target="_blank" class="project-link">There Will Be Bloom</a> \u2014 <span class="hover-trigger" data-img="/assets/projects/there-will-be-bloom.gif">timelapse growth videos</span>.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">Nov 2023</span>
                        <span class="project-desc">I believe <a href="https://github.com/banodoco/Steerable-Motion" target="_blank" class="project-link">Steerable Motion</a> was the first streamlined method for controlling video models using key frames. Evolved from Creative Interpolation. People used it for festival visuals, which was surreal.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">2023</span>
                        <span class="project-desc">I believe the image version of <a href="https://huggingface.co/peteromallet/steerable-motion" target="_blank" class="project-link">Steerable Motion</a> was the first approach for creating key frames from a single image. Fine-tuned SD 1.5 on motion data, built on InstructPix2Pix. Magnetron collected the data for it.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">Aug 2023</span>
                        <span class="project-desc">I built <a href="https://github.com/peteromallet/magnetron" target="_blank" class="project-link">Magnetron</a> to collect precisely-tagged motion data for training video models. It ran as a Discord bot.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">2023\u2013now</span>
                        <span class="project-desc">Together with my wife Hannah, I run <a href="https://ados.events/" target="_blank" class="project-link">ADOS</a> \u2014 a real-world gathering for people who are passionate about open source AI.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">2022\u2013now</span>
                        <span class="project-desc">I started <a href="https://banodoco.ai" target="_blank" class="project-link">Banodoco</a> as a parent organisation for open source AI art. This is what I wanted to do with my life, so I figured I might as well make it official. I also just like the name.</span>
                    </div>

                    <div class="project-entry" data-ongoing="true">
                        <span class="project-date">2022\u2013ongoing</span>
                        <span class="project-desc">Knowing how little I knew about AI, I started the <a href="https://discord.gg/acg8aNBTxd" target="_blank" class="project-link">Banodoco Discord</a> as a space for people to learn together.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">2022</span>
                        <span class="project-desc">The first art tool I made was the Banodoco Tool. It also very much went nowhere.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">2018\u20132023</span>
                        <span class="project-desc">I spent five years building <a href="https://github.com/peteromallet/Advisable" target="_blank" class="project-link">Advisable</a> \u2014 a misguided startup that ultimately went nowhere, wasting millions of investor dollars along the way. Though it wasn't all bad \u2014 I learned a lot, got to work with some great people, and open-sourced the 9,321-commit codebase for AIs to learn from.</span>
                    </div>

                    <div class="project-entry">
                        <span class="project-date">2012\u20132019</span>
                        <span class="project-desc">I worked for various startups, a few of which were reasonably successful.</span>
                    </div>

                </div>
            </div>
        </div> <!-- End Projects Section -->

        <!-- Watering Can Animation -->`;

        html = html.replace(aboutSectionRegex, projectsContent);

        // Add hover interaction script
        const projectsScript = `
    <script>
        (function() {
            // Create hover popup element
            var popup = document.createElement('div');
            popup.className = 'hover-image-popup';
            popup.innerHTML = '<img src="" alt="">';
            document.body.appendChild(popup);
            var popupImg = popup.querySelector('img');
            var currentTrigger = null;

            // Filter functionality
            document.querySelectorAll('.projects-filter-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.projects-filter-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    var filter = btn.dataset.filter;
                    document.querySelectorAll('.project-entry').forEach(function(entry) {
                        if (filter === 'all' || entry.dataset.ongoing === 'true') {
                            entry.classList.remove('filtered-out');
                        } else {
                            entry.classList.add('filtered-out');
                        }
                    });
                });
            });

            // Preload all hover images
            document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                var imgSrc = trigger.dataset.img;
                if (imgSrc) {
                    var preload = new Image();
                    preload.src = imgSrc;
                }
            });

            // Desktop hover behavior
            document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                var imgSrc = trigger.dataset.img;
                if (!imgSrc) return;

                trigger.addEventListener('mouseenter', function() {
                    popupImg.src = imgSrc;
                    popup.classList.add('visible');
                    currentTrigger = trigger;
                });

                trigger.addEventListener('mouseleave', function() {
                    popup.classList.remove('visible');
                    currentTrigger = null;
                });

                trigger.addEventListener('mousemove', function(e) {
                    var popupRect = popup.getBoundingClientRect();
                    var popupW = popupRect.width || 400;
                    var popupH = popupRect.height || 300;

                    var x = e.clientX + 20;
                    var y = e.clientY - popupH / 2;

                    // Keep on screen
                    if (x + popupW > window.innerWidth - 20) {
                        x = e.clientX - popupW - 20;
                    }
                    y = Math.max(20, Math.min(y, window.innerHeight - popupH - 20));

                    popup.style.left = x + 'px';
                    popup.style.top = y + 'px';
                });
            });

            // Mobile: tap to toggle
            if ('ontouchstart' in window) {
                document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                    trigger.addEventListener('touchstart', function(e) {
                        var imgSrc = trigger.dataset.img;
                        if (!imgSrc) return;

                        if (currentTrigger === trigger && popup.classList.contains('visible')) {
                            popup.classList.remove('visible');
                            currentTrigger = null;
                        } else {
                            popupImg.src = imgSrc;
                            var rect = trigger.getBoundingClientRect();
                            popup.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
                            popup.style.top = (rect.bottom + 10) + 'px';
                            popup.classList.add('visible');
                            currentTrigger = trigger;
                        }
                        e.preventDefault();
                    });
                });

                document.addEventListener('touchstart', function(e) {
                    if (!e.target.closest('.hover-trigger') && !e.target.closest('.hover-trigger-plain') && !e.target.closest('.hover-image-popup')) {
                        popup.classList.remove('visible');
                        currentTrigger = null;
                    }
                });
            }
        })();
    </script>`;

        html = html.replace('</body>', projectsScript + '</body>');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html, 'utf-8');
      }
    });
    return;
  }

  // Handle individual posts
  const postsMatch = req.url.match(/^\/posts\/([^\/]+)\/?$/);
  if (postsMatch) {
    const slug = postsMatch[1];
    
    renderMarkdownPost(slug, (err, postHtml) => {
      if (err) {
        console.error('Error rendering markdown post:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('Internal server error');
        return;
      }
      
      if (postHtml) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(postHtml, 'utf-8');
      } else {
        // Post not found - serve 404 page
        fs.readFile('./404.html', (err, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content || 'Post not found', 'utf-8');
        });
      }
    });
    return;
  }
  
  // Handle the root path
  let filePath = req.url === '/' 
    ? './index.html' 
    : '.' + req.url;
  
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        fs.readFile('./404.html', (err, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content || 'Page not found', 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success - add additional headers for video files
      const headers = { 'Content-Type': contentType };
      
      // Add video-specific headers for better mobile compatibility
      if (contentType.startsWith('video/')) {
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Length'] = content.length;
        headers['Cache-Control'] = 'public, max-age=31536000';
      }
      
      res.writeHead(200, headers);
      res.end(content, contentType.startsWith('text/') ? 'utf-8' : undefined);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`To access from other devices on your network, use your computer's IP address: http://YOUR_IP_ADDRESS:${PORT}/`);
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 3000);
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown); // Ctrl+C
process.on('SIGTERM', gracefulShutdown); // kill command 