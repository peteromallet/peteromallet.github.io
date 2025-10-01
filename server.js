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
      
      // Extract title from first heading - MUST start with #
      const titleMatch = content.match(/^#\s+(.+)/m);
      
      // Skip posts that don't start with a # heading
      if (!titleMatch) {
        return null;
      }
      
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
    .filter(post => post !== null) // Remove null entries (posts without # headings)
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
    
    // Get all posts to determine navigation
    const allPosts = getPostsPosts();
    const currentIndex = allPosts.findIndex(post => post.slug === slug);
    
    if (currentIndex === -1) {
      return callback(null, null); // Post not found in list
    }
    
    const currentPost = allPosts[currentIndex];
    // Previous = newer post (in reading order), Next = older post (in reading order)
    const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
    
    // Read the markdown file
    fs.readFile(filePath, 'utf-8', (err, rawContent) => {
      if (err) {
        return callback(err, null);
      }
      
      // Parse frontmatter
      const { metadata, content } = parseFrontmatter(rawContent);
      
      // Extract title from first # heading
      const titleMatch = content.match(/^#\s+(.+)/m);
      
      // If post doesn't start with #, treat as not found
      if (!titleMatch) {
        return callback(null, null);
      }
      
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