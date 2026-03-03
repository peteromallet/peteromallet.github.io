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
  // Skip drafts
  if (metadata.draft === 'true') {
    console.log(`Post skipped: draft post ${filePath}`);
    return false;
  }

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
      
      // Extract excerpt from first text paragraph (skip HTML tags and blank lines)
      const lines = contentWithoutTitle.split('\n');
      let excerpt = '';
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines, headings, and lines that start with HTML tags
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<')) continue;
        excerpt = trimmed;
        break;
      }

      // Remove hyperlinks [text](url) -> text
      excerpt = excerpt.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      
      // Limit to one line and very short length
      const fullExcerpt = excerpt.split('\n')[0];
      excerpt = fullExcerpt.substring(0, 30);

      // Add ellipsis if truncated
      if (excerpt.length === 30 && fullExcerpt.length > 30) {
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
  
  // Handle home page — strip loading-element from header so it doesn't replay on navigation
  if (req.url === '/') {
    fs.readFile('./index.html', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('Server error');
        return;
      }
      let html = content.toString();
      html = html.replace(
        '<div class="large-letters loading-element" id="pom-letters">',
        '<div class="large-letters" id="pom-letters">'
      );
      html = html.replace(
        '<div class="section-toggle loading-element">',
        '<div class="section-toggle">'
      );
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html, 'utf-8');
    });
    return;
  }

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
        const postsSection = `<div id="posts-section" class="content-section">
            <!-- Posts Content -->
            <div class="posts-section-content">
                <div class="posts-list loading-element">
                    <!-- Posts will be loaded here -->
                </div>
            </div>
        </div> <!-- End Posts Section -->`;

        let html = prepareSubpageShell(content.toString(), postsSection, 'posts');

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
  
  // Redirect old /projects URLs to new location
  if (req.url === '/projects' || req.url === '/projects/') {
    res.writeHead(301, { 'Location': '/assorted/projects' });
    res.end();
    return;
  }

  // Helper: prepare sub-page shell (shared by sorted pages, posts, etc.)
  function prepareSubpageShell(html, sectionContent, activeTab) {
    // Fix relative paths
    html = html.replace(/href="styles\.css"/g, 'href="/styles.css"');
    html = html.replace(/src="script\.js"/g, 'src="/script.js"');
    html = html.replace(/src="plant-animation\.js"/g, 'src="/plant-animation.js"');
    html = html.replace(/src="weights-chart\.js"/g, 'src="/weights-chart.js"');
    html = html.replace(/href="favicon\.ico"/g, 'href="/favicon.ico"');
    html = html.replace(/src="assets\//g, 'src="/assets/');

    // Remove loading-element from header so it doesn't replay animations
    html = html.replace(
      '<div class="large-letters loading-element" id="pom-letters">',
      '<a href="/" class="large-letters" id="pom-letters">'
    );
    html = html.replace(
      '</div>\n\n            <!-- About/Writing Toggle -->',
      '</a>\n\n            <!-- About/Writing Toggle -->'
    );
    html = html.replace(
      '<div class="section-toggle loading-element">',
      '<div class="section-toggle">'
    );

    // Update toggle to show active tab
    html = html.replace(
      '<span class="toggle-btn active">About</span>',
      '<a href="/" class="toggle-btn">About</a>'
    );
    if (activeTab === 'sorted') {
      html = html.replace(
        '<a href="/assorted" class="toggle-btn">Assorted</a>',
        '<span class="toggle-btn active">Assorted</span>'
      );
    } else if (activeTab === 'posts') {
      html = html.replace(
        '<a href="/posts" class="toggle-btn">Posts</a>',
        '<span class="toggle-btn active">Posts</span>'
      );
    }

    // Replace about section with provided content
    // Use a function replacement to avoid $1/$2/etc in sectionContent being interpreted as backreferences
    const aboutSectionRegex = /<div id="about-section" class="content-section">([\s\S]*?)<!-- Watering Can Animation -->/;
    html = html.replace(aboutSectionRegex, () => sectionContent + '\n\n        <!-- Watering Can Animation -->');

    // Strip scripts that are only needed on the home page
    html = html.replace(/<script src="\/plant-animation\.js"><\/script>/, '');
    html = html.replace(/<script src="\/weights-chart\.js"><\/script>/, '');

    // Strip the watering can / plant animation markup
    html = html.replace(/<!-- Watering Can Animation -->\s*<div class="social-links">[\s\S]*?<div id="initialBud"><\/div>\s*<\/div>/, '');

    return html;
  }

  // Redirect old /housekeeping and /sorted URLs to /assorted
  if (req.url.startsWith('/housekeeping')) {
    res.writeHead(301, { 'Location': req.url.replace('/housekeeping', '/assorted') });
    res.end();
    return;
  }
  if (req.url.startsWith('/sorted')) {
    res.writeHead(301, { 'Location': req.url.replace('/sorted', '/assorted') });
    res.end();
    return;
  }

  // Redirect trailing slashes for sorted routes
  if (req.url === '/assorted/' || req.url === '/assorted/accountability/' || req.url === '/assorted/mute-list/' || req.url === '/assorted/projects/' || req.url === '/assorted/crypto-conversations/') {
    res.writeHead(301, { 'Location': req.url.replace(/\/$/, '') });
    res.end();
    return;
  }

  // Handle sorted pages
  if (req.url === '/assorted' || req.url === '/assorted/accountability' || req.url === '/assorted/mute-list' || req.url === '/assorted/projects' || req.url === '/assorted/crypto-conversations' || req.url.match(/^\/assorted\/crypto-conversations\/[a-zA-Z0-9_]+$/)) {
    fs.readFile('./index.html', (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Page not found');
        return;
      }

      let html = content.toString();
      let sectionContent;

      if (req.url === '/assorted') {
        // Index page — directory of sub-pages
        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-directory">
                    <a href="/assorted/projects" class="sorted-dir-link">
                        <span class="dir-name">Projects</span>
                        <span class="dir-desc">Things I've built and am building</span>
                        <span class="dir-arrow">\u2192</span>
                    </a>
                    <a href="/assorted/accountability" class="sorted-dir-link">
                        <span class="dir-name">Accountability</span>
                        <span class="dir-desc">Public commitments and follow-through</span>
                        <span class="dir-arrow">\u2192</span>
                    </a>
                    <a href="/assorted/crypto-conversations" class="sorted-dir-link">
                        <span class="dir-name">Crypto conversations</span>
                        <span class="dir-desc">Full transparency on any conversations related to crypto</span>
                        <span class="dir-arrow">\u2192</span>
                    </a>
                    <a href="/assorted/mute-list" class="sorted-dir-link">
                        <span class="dir-name">Mute list</span>
                        <span class="dir-desc">People and topics I'm currently ignoring</span>
                        <span class="dir-arrow">\u2192</span>
                    </a>
                    <div class="sorted-dir-link sorted-dir-coming-soon">
                        <span class="dir-coming-soon-tag">Coming soon</span>
                        <span class="dir-name">Feedback</span>
                        <span class="dir-desc">I'm going to allow public feedback from anyone on this website</span>
                    </div>
                </div>
            </div>
        </div> <!-- End Sorted Section -->`;

      } else if (req.url === '/assorted/accountability') {
        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-breadcrumb">
                    <a href="/assorted">Assorted</a> / Accountability
                </div>
                <div class="accountability-list">

                    <details id="dataclaw" class="commitment-entry">
                        <summary>
                            <span class="commitment-title">Donate all $DataClaw creator fees to The Arca Gidan Art Prize</span>
                            <span class="commitment-status status-in-progress">In Progress</span>
                            <button class="commitment-copy-link" title="Copy link" onclick="event.preventDefault(); navigator.clipboard.writeText(window.location.origin + '/assorted/accountability#dataclaw').then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = '\\u{1F517}', 1500); });">&#x1F517;</button>
                        </summary>
                        <div class="commitment-details">
                            <div class="commitment-dates">
                                <span>Committed: March 2, 2026</span>
                            </div>
                            <ul class="commitment-bullets">
                                <li><strong>What:</strong> I created an open source project called <a href="https://github.com/peteromallet/dataclaw" target="_blank">DataClaw</a>. Random crypto people created a token around it.</li>
                                <li><strong>Fees:</strong> I didn't own any of this token, but they gave me creator tokens \u2014 which earn a <strong>0.05% fee</strong> on every trade via Pump.fun.</li>
                                <li><strong>Commitment:</strong> <strong>100% of $DataClaw fees</strong> will be donated to <a href="https://arcagidan.com/" target="_blank">The Arca Gidan Art Prize</a>, an art competition run by Banodoco that pushes open-source AI models to their limits.</li>
                                <li><strong>Current balance:</strong> ~752 SOL (~680 from $DataClaw, ~72 from $DESLOPPIFY tokens) across 126 fee claims.</li>
                            </ul>
                            <div class="commitment-onchain">
                                <p><strong>DataClaw CA:</strong> <code>Duxeg8HrG89Dq95oyiydrnFd8irZhjApGZu8PYrEpump</code></p>
                                <p><strong>Creator wallet:</strong> <code>3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu</code></p>
                                <p><strong>Fee mechanism:</strong> 0.05% creator fee on every PumpSwap trade, auto-claimed to the wallet above. Full breakdown in the <a href="https://github.com/peteromallet/peteromallet.github.io/blob/main/random_docs/solana-wallet-analysis.md" target="_blank">wallet analysis</a>.</p>
                            </div>
                            <p class="commitment-conversions-note">Conversions as of March 2, 2026.</p>
                        </div>
                    </details>

                    <details id="desloppify" class="commitment-entry">
                        <summary>
                            <span class="commitment-title">Donate all $DESLOPPIFY creator fees to code quality bounties</span>
                            <span class="commitment-status status-in-progress">In Progress</span>
                            <button class="commitment-copy-link" title="Copy link" onclick="event.preventDefault(); navigator.clipboard.writeText(window.location.origin + '/assorted/accountability#desloppify').then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = '\\u{1F517}', 1500); });">&#x1F517;</button>
                        </summary>
                        <div class="commitment-details">
                            <div class="commitment-dates">
                                <span>Committed: March 3, 2026</span>
                            </div>
                            <ul class="commitment-bullets">
                                <li><strong>What:</strong> Two community-created $DESLOPPIFY tokens based on my <a href="https://github.com/peteromallet/desloppify" target="_blank">Desloppify</a> project also generate Pump.fun creator fees to the same wallet.</li>
                                <li><strong>Commitment:</strong> Starting at <strong>100% of $DESLOPPIFY fees</strong> going to bounties for people who discover issues with code that <a href="https://github.com/peteromallet/desloppify" target="_blank">Desloppify</a> has approved \u2014 putting the tool's own money where its mouth is. Over time, I may also spend fees on improving or augmenting the Desloppify ecosystem. Aside from getting open source projects paid for, I won't personally profit.</li>
                                <li><strong>Current balance:</strong> ~72 SOL (~28 from $DESLOPPIFY #2, ~44 from $DESLOPPIFY #3) of the wallet's 752 SOL.</li>
                                <li><strong>Bounties:</strong> Announced via <a href="https://github.com/peteromallet/desloppify/issues" target="_blank">Desloppify GitHub Issues</a>.</li>
                            </ul>
                            <div class="commitment-onchain">
                                <p><strong>DESLOPPIFY #2 CA:</strong> <code>2XZyVjE6r5p84wL8CqHKFXH2v9iTd21cBRsoPpCJpump</code></p>
                                <p><strong>DESLOPPIFY #3 CA:</strong> <code>6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump</code></p>
                                <p><strong>Creator wallet:</strong> <code>3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu</code></p>
                                <p><strong>Fee mechanism:</strong> Same 0.05% creator fee as $DataClaw, same wallet. Full breakdown in the <a href="https://github.com/peteromallet/peteromallet.github.io/blob/main/random_docs/solana-wallet-analysis.md" target="_blank">wallet analysis</a>.</p>
                            </div>
                            <p class="commitment-conversions-note">Conversions as of March 2, 2026.</p>
                        </div>
                    </details>

                    <details id="tokens" class="commitment-entry">
                        <summary>
                            <span class="commitment-title">Slowly sell gifted $DESLOPPIFY tokens to fund open source AI work</span>
                            <span class="commitment-status status-in-progress">In Progress</span>
                            <button class="commitment-copy-link" title="Copy link" onclick="event.preventDefault(); navigator.clipboard.writeText(window.location.origin + '/assorted/accountability#tokens').then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = '\\u{1F517}', 1500); });">&#x1F517;</button>
                        </summary>
                        <div class="commitment-details">
                            <div class="commitment-dates">
                                <span>Committed: March 3, 2026</span>
                            </div>
                            <ul class="commitment-bullets">
                                <li><strong>What:</strong> People have also sent me tokens from the community-created $DESLOPPIFY, based on my <a href="https://github.com/peteromallet/desloppify" target="_blank">Desloppify</a> project. I didn't own any of it, but now I hold 7%.</li>
                                <li><strong>No sell unless:</strong> I won't sell any unless the token has stayed above a <strong>&#36;10M market cap for more than 7 days</strong>.</li>
                                <li><strong>When I sell:</strong> Slowly, responsibly, and with <strong>pre-announcement</strong>. Used to buy LLM tokens, compute, and possibly hardware.</li>
                                <li><strong>Who benefits:</strong> This will fund open source AI development and training. Transparently, this will first fund <em>my</em> AI development, but will be extended to others who work on open source projects if funds allow.</li>
                                <li><strong>Goal:</strong> All data released via <a href="https://github.com/peteromallet/dataclaw" target="_blank">DataClaw</a>, all code open source, all work dedicated towards improving the open source ecosystem and tooling.</li>
                                <li><strong>Transparency:</strong> All invoices and token sales will be published. Full ledger in the <a href="https://github.com/peteromallet/peteromallet.github.io/blob/main/random_docs/desloppify-token-fund.md" target="_blank">sales &amp; spending tracker</a> (currently empty).</li>
                            </ul>

                            <div class="commitment-onchain">
                                <p><strong>Wallet:</strong> <code>3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu</code></p>
                                <p><strong>DESLOPPIFY #3 CA:</strong> <code>6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump</code></p>
                                <p><strong>DESLOPPIFY #3 held:</strong> 71,200,000 tokens (~$6,644)</p>
                            </div>
                            <p class="commitment-conversions-note">Conversions as of March 2, 2026.</p>
                        </div>
                    </details>

                </div>
                <script>
                    if (window.location.hash) {
                        const el = document.querySelector(window.location.hash);
                        if (el && el.tagName === 'DETAILS') {
                            el.open = true;
                            el.scrollIntoView({ behavior: 'smooth' });
                            el.classList.add('highlight');
                            setTimeout(() => el.classList.remove('highlight'), 2000);
                        }
                    }
                </script>
            </div>
        </div> <!-- End Sorted Section -->`;

      } else if (req.url === '/assorted/crypto-conversations') {
        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-breadcrumb">
                    <a href="/assorted">Assorted</a> / Crypto conversations
                </div>
                <div class="crypto-conversations">
                    <p class="crypto-conversations-intro">I believe that back rooms are the seed of corruption, and I'd rather not get corrupted. So I'm going to share any conversations I have related to any crypto token that I'm involved in publicly here. Mostly, I hope, with nice friendly people who have no desire for corruption!</p>

                    <div class="conversation-list">
                        <a href="/assorted/crypto-conversations/quanatee" class="conversation-link">
                            <span class="conversation-date">March 2\u20133, 2026</span>
                            <span class="conversation-title">Quanatee explains liquidity pools & LP positions</span>
                            <span class="dir-arrow">\u2192</span>
                        </a>
                    </div>
                </div>
            </div>
        </div> <!-- End Sorted Section -->`;

      } else if (req.url.match(/^\/assorted\/crypto-conversations\/[a-zA-Z0-9_]+$/)) {
        const convId = req.url.split('/').pop();

        // Conversation data store
        const conversations = {
          'quanatee': {
            title: 'Quanatee explains liquidity pools & LP positions',
            date: 'March 2\u20133, 2026',
            platform: 'X (DM)',
            context: 'Quanatee reached out to explain how single-sided liquidity pool positions work for the $DESLOP token. This conversation has been shared with Quanatee\'s knowledge and consent. A screenshot from Quanatee\'s initial outreach has been omitted at their request.',
            participants: [
              { name: 'Peter O\'Malley', handle: '@peteromallet', url: 'https://x.com/peteromallet', avatar: null },
              { name: 'Quanatee', handle: '@quanatee', url: 'https://x.com/quanatee', avatar: null },
            ],
            messages: [
              { sender: 'Quanatee', text: 'Hey POM, i wanted to give you a simple brief of what a single sided LP position looks like. Its idea because you can provide the tokens to the LP without having to front USDC or SOL. The only difference is that you only earn fees from the upside of the token. This is a good trade-off for not having to provide "cash" and aligns with token value.', side: 'other' },
              { sender: 'Quanatee', text: '[Screenshot omitted at Quanatee\'s request]', side: 'other' },
              { sender: 'Quanatee', text: 'This is what it looks like to provide 1% of your tokens (10M) to a DESLOP-USDC pool (meaning the token is paired with USDC). You can see that the USDC is 0, but the DESLOP is 10M.\n\nVolatility strategy of spot is good here, which basically means you will earn the same amount of fees at any price within the given price range.\n\nThe price range (min-max price) reflects the current price up to mcap of ~100m, which i think is ideal. Probably better to set a bit higher but not too high in order to maximize feels but still give market participants believe that the token can reach those levels. (or better yet set all the way to 1B lol)', side: 'other' },
              { sender: 'Quanatee', text: 'Just one tip, min price and max price will re-shift the price due to the bucketing system. This is normal behavior. Don\'t add the full position first. Add a bit- like 5M (0.5%) to get a feel for how it is, check and maybe even show us to confirm its done right.\n\nNo refunds in crypto for getting it wrong \ud83d\ude2d', side: 'other' },
              { sender: 'Quanatee', text: 'Hey', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'Happy to chat here if you\'re happy for me to screenshot share it all', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Or for it to be all shared on my website is probably better', side: 'me' },
              { sender: 'Quanatee', text: 'lol this is not so serious', side: 'other' },
              { sender: 'Quanatee', text: 'do you know anything about LP, AMM?', side: 'other' },
              { sender: 'Quanatee', text: 'i need to know your level of knowledge so i can adjust', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'I know nothing', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'but in general, the path to corruption is backroom so I wwant to eliminate the possibility of that', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'So am going to want everything public i do in crypto as a rule', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'context: i\'m an odd duck', side: 'me' },
              { sender: 'Quanatee', text: 'you dont know how green flag that is', side: 'other' },
              { sender: 'Quanatee', text: 'im partially that way, but im not an online public guy so its not really required', side: 'other' },
              { sender: 'Quanatee', text: 'Alright, i know where to start. So in traditional stock markets, you have an order book, bid/ask spread and limit orders?', side: 'other' },
              { sender: 'Quanatee', text: 'Crypto didnt start with ANY of that, so we invented this thing called an Automated Market Maker (AMM) which replicates somewhat what a traditional market maker would do in the stock market', side: 'other' },
              { sender: 'Quanatee', text: 'An AMM handles the buy and sell orders of trading in crypto. If i bought 5 deslop using sol, i bought from a liquidity pool (entity that executes the AMM concept) that has deslop/sol', side: 'other' },
              { sender: 'Quanatee', text: 'that liquidity pool has to manage its own liquidity to ensure there is enough across the price range', side: 'other' },
              { sender: 'Quanatee', text: 'Infact, the creator fees you\'re getting- they come from an LP. its just subtracted and simplified to the point we don\'t need to understand. We just need to know we get fees.', side: 'other' },
              { sender: 'Quanatee', text: 'Any questions so far?', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'yep!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'who owns the liquidity pool?', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'is that implemented in some kind of structural way into the system or managed by someone?', side: 'me' },
              { sender: 'Quanatee', text: 'In the past, we didnt have infra like pump.fun, so whoever launched a token created their own liquidity pool. But this led to scams and rugs because the creator had total control over what they could do.\n\nSince then crypto evolved and we have launchpads like pump.fun, which are essentially trusted services that launch decentralized assets like the liquidity pool which are guaranteed immutable, which means they cannot be modified or changed once launched. That makes it trustless aka we dont need to trust pump.fun (kinda), if it launches from pump.fun some of the potential risk vectors are mitigated.', side: 'other' },
              { sender: 'Quanatee', text: 'Some parts of this ecosystem have changed since of course, since we can now direct creator fees- so that part is now trust-based. but the core principles of the LP are still there', side: 'other' },
              { sender: 'Quanatee', text: 'BTW, there isn\'t just 1 liquidity pool for a token. At launch yes there is only one which is from the launchpad', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'Is the liquidity pool basically just people who are selling on an going basis with X constraints?', side: 'me' },
              { sender: 'Quanatee', text: 'Its bidirectional. Kind of like an escrow.\nI want to sell deslop, but i dont have to manually find a buyer. I just sell through my app. The LP processes my sale and the price and market cap of the token is adjusted accordingly. If someone buys, the LP processes that purchase too, and the tokens price is adjusted again', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'i get ya!', side: 'me' },
              { sender: 'Quanatee', text: 'Alright! but of course an escrow doesn\'t do work for free right?', side: 'other' },
              { sender: 'Quanatee', text: 'so each transaction (buy/sell) has a fee attached to it', side: 'other' },
              { sender: 'Quanatee', text: 'So the first LP that the launchpad creates, the creator fees that you\'ve accrued are actually LP fees.', side: 'other' },
              { sender: 'Quanatee', text: 'but that\'s like a solo adventure', side: 'other' },
              { sender: 'Quanatee', text: 'crypto is multiplayer though', side: 'other' },
              { sender: 'Quanatee', text: 'so anybody can actually create their own LP and compete in capturing the volume from people buying and selling to get those fees', side: 'other' },
              { sender: 'Quanatee', text: 'Good so far?', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'yes!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Agree this was better via DM!', side: 'me' },
              { sender: 'Quanatee', text: 'Alright this is where it gets a bit complicated', side: 'other' },
              { sender: 'Quanatee', text: 'There are 2 types of liquidity pools, standard and concentrated', side: 'other' },
              { sender: 'Quanatee', text: 'Standard is basically a generalized and balanced liquidity pool that ensures that there is enough liquidity spread throughout the entire possible price range of a token, from $0 to $inf. Every launchpad starts with this. (Im simplifying here, really so if there is a contradiction its not because your thoughts are wrong if you chance on something else later on)', side: 'other' },
              { sender: 'Quanatee', text: 'A standard LP is always a pair, like USD/JPY, we have DESLOP/SOL, or DESLOP/USDC', side: 'other' },
              { sender: 'Quanatee', text: 'A standard LP needs to be funded with both tokens in order to function, and it generalizes across the entire possible pricing space', side: 'other' },
              { sender: 'Quanatee', text: 'A concentrated LP is different. It\'s more customizable, more advanced. You can choose which price range you want to provide liquidity towards and because you have that choice, the liquidity you provide isn\'t spread thinly throughout the entire price range. The main benefit here is it maximizes the amount of fees they can earn.\n\nAnother benefit is that it allows you to provide only 1 token in a pair, which basically single sided liquidity.', side: 'other' },
              { sender: 'Quanatee', text: 'That means that you can provide liquidity to deslop using the deslop tokens that you already have, without having to put up SOL or USDC and earn fees from it. Providing liquidity is itself already a net positive because crypto prices swing a lot because of the lack of liquidity providers.', side: 'other' },
              { sender: 'Quanatee', text: 'One question you might have:\nWhy can\'t i provide single sided liquidity through the entire price range then?', side: 'other' },
              { sender: 'Quanatee', text: 'Well because you cannot provide single sided liquidity to a current price. The AMM system needs to balance liquidity, and providing just 1 side doesn\'t do that unless you position the liquidity at a price that the token hasn\'t gotten to yet.\n\nSo if i provided single sided liquidity at $1, and the price now is $0.5, thats fine. when the price goes to $1.1, that means some of the tokens i provided have been exchanged to the paired token like SOL', side: 'other' },
              { sender: 'Quanatee', text: 'Understand so far?', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'Yes i believe so!', side: 'me' },
              { sender: 'Quanatee', text: 'Aight we\'re nearing the end here', side: 'other' },
              { sender: 'Quanatee', text: 'When you provide liquidity, and some one buys- that means that the token you provided was sold', side: 'other' },
              { sender: 'Quanatee', text: 'So indirectly- its kind of like you are selling your tokens + getting a fee on top of it.', side: 'other' },
              { sender: 'Quanatee', text: 'But because you tokens are in a liquidity pool, it isn\'t exactly a sale either. If you never exit your liquidity pool, and the price comes back down to the same level as the transaction, when some one sells, your token comes back- aka you become a buyer.', side: 'other' },
              { sender: 'Quanatee', text: 'Some people use this strategy to sell their tokens cleanly without dumping on the chart, others use it to earn fees from tokens with high volume', side: 'other' },
              { sender: 'Quanatee', text: 'In any case, your objective should be to earn fees, and providing liquidity allows you to benefit from a much longer and aligned earning system as opposed to selling tokens directly', side: 'other' },
              { sender: 'Quanatee', text: 'however considerate or timely your are in directly selling tokens, you need to know one thing', side: 'other' },
              { sender: 'Quanatee', text: 'and it\'s the most important thing of all in this already long chat session', side: 'other' },
              { sender: 'Quanatee', text: 'Crypto people are 80% idiots.', side: 'other' },
              { sender: 'Quanatee', text: 'When we see dev selling, we panic and go "OMG WHY DEV SELL, DEV IS RUGGING HE A SCAMMER NOOOOOOOOOOOOOOO"', side: 'other' },
              { sender: 'Quanatee', text: 'Even if it was planned and communicated, the result has always been the same. And because it has been the same, it forces the other 20% of non-idiot crypto people to react and accordingly as well.', side: 'other' },
              { sender: 'Quanatee', text: 'Such is just the way of being in a more primitive space of trading', side: 'other' },
              { sender: 'Quanatee', text: 'Which is why I hope you\'ll consider liquidity provisioning instead of direct sales', side: 'other' },
              { sender: 'Quanatee', text: 'There, I\'m done!', side: 'other' },
              { sender: 'Quanatee', text: 'Floor is now yours for questions, or if you want my opinions etc', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'That makes sense!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'And if you were completely transparent about what\'s happening, would it not in effect be the same as the graph?', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'or you think the psychological impact is important?', side: 'me' },
              { sender: 'Quanatee', text: '1. the psychological impact is important. Most traders use trading terminals with indicators of when the dev buys or sells, or even claims fees. For example:', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'Yeah, i can see that', side: 'me' },
              { sender: 'Quanatee', text: 'aight wont need to make screenshots then', side: 'other' },
              { sender: 'Quanatee', text: '2. it wouldn\'t because the other benefit of providing liquidity is really- PROVIDING LIQUIDITY. Crypto is such an illiquid market that its hard for anyone to buy or sell in size, so thickening the pool is a net positive for taking the token more seriously', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'YEah, i think this makes sense', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Thank you so much for the explanation!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Think will almost certainly do this', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Thank you so much!', side: 'me' },
              { sender: 'Quanatee', text: 'Happy to have helped!', side: 'other' },
              { sender: 'Quanatee', text: '(if you are going to share the chat for transparency purposes- dont share the screenshot from the first time i reached out- cos that i has my deets)', side: 'other' },
              { sender: 'Peter O\'Malley', text: 'yes, will omit!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Thank you so much once more!', side: 'me' },
              { sender: 'Peter O\'Malley', text: 'Really excellent explanation', side: 'me' },
              { sender: 'Quanatee', text: 'Oh i missed out one thing', side: 'other' },
              { sender: 'Quanatee', text: 'Standard and concentrated liquidity pools go by different product names from different platforms\nStandard LP: Balanced AMM, DAMM\nConcentrated LP: Single Sided, CLMM, DLMM', side: 'other' },
              { sender: 'Quanatee', text: 'just so if you\'re reading up or talking about it and people use different acronyms and terms, they\'re all the same', side: 'other' },
            ]
          }
        };

        const conv = conversations[convId];
        if (!conv) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('Conversation not found');
          return;
        }

        // Build participant lookup for avatars in messages
        const participantMap = {};
        conv.participants.forEach(p => { participantMap[p.name] = p; });

        const participantsHtml = conv.participants.map(p => {
          const avatar = p.avatar
            ? `<img class="chat-header-avatar" src="${p.avatar}" alt="${p.name}">`
            : `<div class="chat-header-avatar chat-header-avatar-placeholder">${p.name.charAt(0)}</div>`;
          return `<a href="${p.url}" target="_blank" class="chat-header-participant">
                            ${avatar}
                            <div class="chat-header-info">
                                <span class="chat-header-name">${p.name}</span>
                                <span class="chat-header-handle">${p.handle}</span>
                            </div>
                        </a>`;
        }).join('<span class="chat-header-separator">&</span>');

        const messagesHtml = conv.messages.map(m => {
          const p = participantMap[m.sender] || {};
          const avatar = p.avatar
            ? `<img class="chat-msg-avatar" src="${p.avatar}" alt="${m.sender}">`
            : `<div class="chat-msg-avatar chat-msg-avatar-placeholder">${m.sender.charAt(0)}</div>`;
          const avatarLink = p.url
            ? `<a href="${p.url}" target="_blank" class="chat-msg-avatar-link">${avatar}</a>`
            : avatar;
          return `<div class="chat-msg chat-msg-${m.side}">
                            ${avatarLink}
                            <div class="chat-msg-content">
                                <span class="chat-msg-sender">${m.sender}</span>
                                <p>${m.text}</p>
                            </div>
                        </div>`;
        }).join('');

        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-breadcrumb">
                    <a href="/assorted">Assorted</a> / <a href="/assorted/crypto-conversations">Crypto conversations</a> / ${conv.title}
                </div>
                <div class="chat-page">
                    <div class="chat-header">
                        <div class="chat-header-participants">
                            ${participantsHtml}
                        </div>
                        <div class="chat-header-meta">
                            <span class="chat-header-platform">${conv.platform}</span>
                            <span class="chat-header-date">${conv.date}</span>
                        </div>
                    </div>
                    <p class="chat-context">${conv.context}</p>
                    <div class="chat-thread">
                        ${messagesHtml}
                    </div>
                </div>
            </div>
        </div> <!-- End Sorted Section -->`;

      } else if (req.url === '/assorted/mute-list') {
        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-breadcrumb">
                    <a href="/assorted">Assorted</a> / Mute list
                </div>
                <div class="mute-list">
                    <p class="mute-list-intro">People and topics I'm currently muting or ignoring. Nothing personal \u2014 just managing attention.</p>
                    <p class="mute-list-note">A lot of these have been done automatically by AI. Please DM me if you want to be removed \u2014 I will remove anyone, no questions asked. I'm going to automate this soon.</p>
                </div>
            </div>
        </div> <!-- End Sorted Section -->`;

      } else if (req.url === '/assorted/projects') {
        sectionContent = `<div id="sorted-section" class="content-section">
            <div class="sorted-section-content">
                <div class="sorted-breadcrumb">
                    <a href="/assorted">Assorted</a> / Projects
                </div>
            </div>
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
                        <span class="project-desc">I'm building <a href="https://reigh.art/" target="_blank" class="project-link">Reigh</a> \u2014 an art tool that unleashes the technical potential of the open source AI art space. Naturally, it's <a href="https://github.com/banodoco/reigh" target="_blank" class="project-link">open source</a>.</span>
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
        </div> <!-- End Sorted Section -->`;
      }

      html = prepareSubpageShell(html, sectionContent, 'sorted');

      // Add projects hover script if on projects page
      if (req.url === '/assorted/projects') {
        const projectsScript = `
    <script>
        (function() {
            var popup = document.createElement('div');
            popup.className = 'hover-image-popup';
            popup.innerHTML = '<img src="" alt="">';
            document.body.appendChild(popup);
            var popupImg = popup.querySelector('img');
            var currentTrigger = null;

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

            document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                var imgSrc = trigger.dataset.img;
                if (imgSrc) { var preload = new Image(); preload.src = imgSrc; }
            });

            document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                var imgSrc = trigger.dataset.img;
                if (!imgSrc) return;
                trigger.addEventListener('mouseenter', function() { popupImg.src = imgSrc; popup.classList.add('visible'); currentTrigger = trigger; });
                trigger.addEventListener('mouseleave', function() { popup.classList.remove('visible'); currentTrigger = null; });
                trigger.addEventListener('mousemove', function(e) {
                    var popupRect = popup.getBoundingClientRect();
                    var popupW = popupRect.width || 400;
                    var popupH = popupRect.height || 300;
                    var x = e.clientX + 20;
                    var y = e.clientY - popupH / 2;
                    if (x + popupW > window.innerWidth - 20) { x = e.clientX - popupW - 20; }
                    y = Math.max(20, Math.min(y, window.innerHeight - popupH - 20));
                    popup.style.left = x + 'px';
                    popup.style.top = y + 'px';
                });
            });

            if ('ontouchstart' in window) {
                document.querySelectorAll('.hover-trigger, .hover-trigger-plain').forEach(function(trigger) {
                    trigger.addEventListener('touchstart', function(e) {
                        var imgSrc = trigger.dataset.img;
                        if (!imgSrc) return;
                        if (currentTrigger === trigger && popup.classList.contains('visible')) { popup.classList.remove('visible'); currentTrigger = null; }
                        else { popupImg.src = imgSrc; var rect = trigger.getBoundingClientRect(); popup.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px'; popup.style.top = (rect.bottom + 10) + 'px'; popup.classList.add('visible'); currentTrigger = trigger; }
                        e.preventDefault();
                    });
                });
                document.addEventListener('touchstart', function(e) {
                    if (!e.target.closest('.hover-trigger') && !e.target.closest('.hover-trigger-plain') && !e.target.closest('.hover-image-popup')) { popup.classList.remove('visible'); currentTrigger = null; }
                });
            }
        })();
    </script>`;
        html = html.replace('</body>', projectsScript + '</body>');
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html, 'utf-8');
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