// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // --- Staggered Loading Animation --- REVERTED TO SIMPLER APPROACH ---
    const baseDelay = 100;                              // keep it global
    const loadingElements = document.querySelectorAll('.loading-element');

    // first phase: mark everything .loaded without any delay
    loadingElements.forEach(el => el.classList.add('loaded'));

    // --- End Staggered Loading Animation ---

    // Generate POM border letters dynamically
    const topBorderDiv = document.querySelector('.pom-border-top > div');
    const bottomBorderDiv = document.querySelector('.pom-border-bottom > div');
    const repetitions = 60; // Adjust as needed for desired width

    if (topBorderDiv && bottomBorderDiv) {
        // Use DocumentFragment for performance when adding many elements
        const topFragment = document.createDocumentFragment();
        const bottomFragment = document.createDocumentFragment();

        for (let i = 0; i < repetitions; i++) {
            const letters = ['P', 'O', 'M'];
            const classes = ['letter-p', 'letter-o', 'letter-m'];

            letters.forEach((letter, index) => {
                // Create spans for top border
                const topSpan = document.createElement('span');
                topSpan.classList.add(classes[index]);
                topSpan.textContent = letter;
                topFragment.appendChild(topSpan);

                // Create spans for bottom border
                const bottomSpan = document.createElement('span');
                bottomSpan.classList.add(classes[index]);
                bottomSpan.textContent = letter;
                bottomFragment.appendChild(bottomSpan);
            });
        }
        // Append all spans at once
        topBorderDiv.appendChild(topFragment);
        bottomBorderDiv.appendChild(bottomFragment);
    }

    // Preload the Steerable Motion GIF
    const steerableMotionGifUrl = 'assets/steerable-motion-animation.gif';
    const preloadGif = new Image();
    preloadGif.src = steerableMotionGifUrl;
    
    // Handle POM letters name reveal
    const pomLetters = document.getElementById('pom-letters');
    
    // Add scroll detection for the top border
    const topBorder = document.querySelector('.pom-border-top');
    const bottomBorder = document.querySelector('.pom-border-bottom');
    let lastScrollTop = 0;
    const scrollThreshold = 20; // Reduced threshold to show top border sooner
    const bottomThreshold = 150; // Increased threshold to keep bottom border visible longer
    
    // Function to handle scroll events
    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        // Show the top border when scrolled down past the threshold
        // Hide it when at the very top of the page with a smoother transition
        if (scrollTop <= 0) {
            // At the very top of the page
            topBorder.classList.remove('visible');
            topBorder.classList.remove('fading');
        } else if (scrollTop < scrollThreshold) {
            // In the transition zone - add fading class
            topBorder.classList.remove('visible');
            topBorder.classList.add('fading');
        } else {
            // Scrolled down past the threshold
            topBorder.classList.add('visible');
            topBorder.classList.remove('fading');
        }
        
        // Create a more gradual transition for the bottom border
        // Calculate how close we are to the bottom as a percentage
        const distanceToBottom = documentHeight - (scrollTop + windowHeight);
        const bottomThresholdFull = 200; // Increased from 150 for a longer transition zone
        
        // Remove all classes first
        bottomBorder.classList.remove('hidden', 'fading', 'fading-light', 'fading-medium');
        
        if (distanceToBottom <= 0) {
            // At the very bottom - fully hidden
            bottomBorder.classList.add('hidden');
        } else if (distanceToBottom < bottomThresholdFull * 0.25) {
            // Very close to bottom - almost hidden
            bottomBorder.classList.add('fading-light');
        } else if (distanceToBottom < bottomThresholdFull * 0.5) {
            // Moderately close to bottom - medium visibility
            bottomBorder.classList.add('fading-medium');
        } else if (distanceToBottom < bottomThresholdFull) {
            // Approaching bottom - starting to fade
            bottomBorder.classList.add('fading');
        }
        // Otherwise it's fully visible with no classes added
        
        lastScrollTop = scrollTop;
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initialize scroll state on page load
    handleScroll();
    
    // Handle meme card expansion - removed old implementation as it's now handled by the general card expansion system
    
    if (pomLetters) {
        // Get all the letters
        const letters = pomLetters.querySelectorAll('.letter');
        let lastClickTime = Date.now();
        let inactivityTimer = null;
        let nameResetTimer = null; // Timer for resetting name back to POM
        let allLettersClicked = false;
        let anyLetterClicked = false;
        
        // Function to check if all letters have been clicked
        function checkAllLettersClicked() {
            allLettersClicked = Array.from(letters).every(letter => letter.classList.contains('clicked'));
            
            if (allLettersClicked) {
                // If all letters are clicked, activate the name reveal
                clearTimeout(inactivityTimer); // Clear any existing timer
                
                // Stop all vibrations
                letters.forEach(letter => {
                    letter.style.animation = '';
                });
                
                setTimeout(() => {
                    pomLetters.classList.add('active');
                    
                    // Set timer to reset back to POM after 5 seconds
                    clearTimeout(nameResetTimer);
                    nameResetTimer = setTimeout(() => {
                        resetLetters();
                    }, 5000); // 5 seconds
                }, 300);
                
                return true;
            }
            
            return false;
        }
        
        // Function to reset the letters
        function resetLetters() {
            letters.forEach(letter => {
                letter.classList.remove('clicked');
                letter.style.animation = '';
            });
            pomLetters.classList.remove('active');
            allLettersClicked = false;
            anyLetterClicked = false;
            
            clearTimeout(inactivityTimer);
            clearTimeout(nameResetTimer);
        }
        
        // Function to start vibrating all letters
        function startVibratingLetters() {
            letters.forEach(letter => {
                // Only vibrate letters that have been clicked
                if (letter.classList.contains('clicked')) {
                    letter.style.animation = 'letter-vibrate 1s infinite';
                }
            });
            
            // Set a timer to stop vibration after 10 seconds
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (!allLettersClicked) {
                    // Stop vibration but keep the clicked state
                    letters.forEach(letter => {
                        if (letter.classList.contains('clicked')) {
                            letter.style.animation = 'letter-clicked-pulse 2s infinite';
                        }
                    });
                }
            }, 10000); // 10 seconds
        }
        
        // Add click event to each individual letter
        letters.forEach((letter, index) => {
            letter.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the event from bubbling up
                
                // If letter is not already clicked, mark it as clicked
                if (!letter.classList.contains('clicked')) {
                    letter.classList.add('clicked');
                    anyLetterClicked = true;
                    
                    // Start vibrating all clicked letters
                    startVibratingLetters();
                    
                    // Check if all letters are now clicked
                    if (checkAllLettersClicked()) {
                        // If all letters are clicked, stop the vibration
                        letters.forEach(letter => {
                            letter.style.animation = '';
                        });
                    }
                }
            });
        });
        
        // Add click event to the container to reset if clicking outside letters
        pomLetters.addEventListener('click', (e) => {
            // Only trigger if clicking directly on the container (not on a letter)
            if (e.target === pomLetters) {
                resetLetters();
            }
        });
        
        // Add mouseout event to reset when hovering away
        pomLetters.addEventListener('mouseleave', () => {
            // Only reset if not all letters have been clicked yet
            if (!allLettersClicked) {
                resetLetters();
            }
        });
        
        // Add mouseover event to ensure animations continue
        pomLetters.addEventListener('mouseenter', () => {
            // If any letter has been clicked but not all, ensure clicked letters are vibrating
            if (anyLetterClicked && !allLettersClicked && !pomLetters.classList.contains('active')) {
                startVibratingLetters();
            }
        });

        // Adding hover behavior for adjacent letters in #pom-letters
        letters.forEach(letter => {
            letter.addEventListener('mouseenter', () => {
                // Add transformed class only to hovered letter
                letter.classList.add('transformed');
                // Add only 'adjacent' class to previous letter if exists
                const prev = letter.previousElementSibling;
                if (prev && prev.classList.contains('letter')) {
                    prev.classList.add('adjacent');
                }
                // Add only 'adjacent' class to next letter if exists
                const next = letter.nextElementSibling;
                if (next && next.classList.contains('letter')) {
                    next.classList.add('adjacent');
                }
            });
            letter.addEventListener('mouseleave', () => {
                // Remove transformed from hovered letter
                letter.classList.remove('transformed');
                // Remove only 'adjacent' class from previous letter if exists
                const prev = letter.previousElementSibling;
                if (prev && prev.classList.contains('letter')) {
                    prev.classList.remove('adjacent');
                }
                // Remove only 'adjacent' class from next letter if exists
                const next = letter.nextElementSibling;
                if (next && next.classList.contains('letter')) {
                    next.classList.remove('adjacent');
                }
            });
        });

        letters[2].addEventListener('click', () => {
            letters[2].classList.add('clicked');
            startVibratingLetters();

            setTimeout(() => {
                letters.forEach(letter => {
                    letter.style.animation = '';
                });
                proceedWithTransformation();
            }, 1500);
        });
    }
    
    // Reset all image filters on page load
    function resetImageFilters() {
        // Reset tile images
        document.querySelectorAll('.tile-image:not(.gif-image)').forEach(img => {
            img.style.filter = 'grayscale(0%)';
        });
        
        // Reset square images
        document.querySelectorAll('.square-image').forEach(img => {
            img.style.filter = 'grayscale(0%)';
            img.style.transform = 'scale(1)'; // Ensure images start at normal scale
        });
        
        // Reset video thumbnails
        document.querySelectorAll('.video-thumbnail').forEach(img => {
            img.style.filter = 'grayscale(0%)';
        });
        
        // Reset GIF images
        document.querySelectorAll('.gif-image').forEach(img => {
            img.style.opacity = '0';
        });
        
        document.querySelectorAll('.static-image').forEach(img => {
            img.style.opacity = '1';
        });
        
        // Reset hover-gifs
        document.querySelectorAll('.hover-gif').forEach(gif => {
            gif.style.opacity = '0';
        });
    }
    
    // Handle links with data-href attributes
    const linksWithHref = document.querySelectorAll('.link[data-href]');
    
    linksWithHref.forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card expansion
            const href = link.getAttribute('data-href');
            if (href) {
                window.open(href, '_blank');
            }
        });
    });

    // Detect truncated paragraphs and add the 'truncated' class
    function detectTruncatedText() {
        document.querySelectorAll('.card p').forEach(p => {
            // Check if the paragraph is truncated
            if (p.scrollHeight > p.clientHeight) {
                p.classList.add('truncated');
            } else {
                p.classList.remove('truncated');
            }
        });
    }

    // Reset all image filters on page load
    resetImageFilters();

    // Detect truncated text after the page has loaded
    window.addEventListener('load', detectTruncatedText);
    window.addEventListener('resize', detectTruncatedText);

    // Handle hover text visibility
    function ensureHoverTextVisibility() {
        const hoverTextElements = document.querySelectorAll('.image-hover-text');
        
        hoverTextElements.forEach(element => {
            // Add mouseenter event to each container
            element.parentElement.addEventListener('mouseenter', () => {
                // Reset any height constraints
                element.style.maxHeight = 'none';
                element.style.overflow = 'visible';
                
                // Get the computed height after removing constraints
                const fullHeight = element.scrollHeight;
                
                // Apply the height
                element.style.height = `${fullHeight}px`;
            });
            
            // Reset on mouseleave
            element.parentElement.addEventListener('mouseleave', () => {
                element.style.height = '';
            });
        });
    }
    
    // Initialize hover text visibility
    window.addEventListener('load', ensureHoverTextVisibility);

    // Handle hover-gif visibility for project tiles
    const projectTiles = document.querySelectorAll('.project-tile');
    projectTiles.forEach(tile => {
        const hoverGif = tile.querySelector('.hover-gif');
        if (hoverGif) {
            const gifImg = hoverGif.querySelector('img');
            const originalSrc = gifImg ? gifImg.src : '';
            
            // Show hover-gif on mouseenter
            tile.addEventListener('mouseenter', () => {
                hoverGif.style.opacity = '1';
            });
            
            // Hide hover-gif and reset GIF on mouseleave
            tile.addEventListener('mouseleave', () => {
                hoverGif.style.opacity = '0';
                
                // Reset the GIF by removing and re-adding the src
                if (gifImg && originalSrc) {
                    // Use setTimeout to ensure the opacity transition completes first
                    setTimeout(() => {
                        gifImg.src = '';
                        // Force browser reflow
                        void gifImg.offsetWidth;
                        gifImg.src = originalSrc;
                    }, 500); // Wait for opacity transition to complete
                }
            });
        }
    });

    // Sort cards based on data-position attribute
    function sortCardsByPosition() {
        const dashboard = document.querySelector('.dashboard');
        const cards = Array.from(dashboard.querySelectorAll('.card'));
        
        // Sort cards by their data-position attribute
        cards.sort((a, b) => {
            const posA = parseInt(a.getAttribute('data-position')) || 999;
            const posB = parseInt(b.getAttribute('data-position')) || 999;
            return posA - posB;
        });
        
        // Reappend cards in the sorted order
        cards.forEach(card => {
            dashboard.appendChild(card);
        });
    }
    
    // Call sort function on load
    sortCardsByPosition();

    // Store original iframe sources for each video card
    const videoSources = new Map();

    // Function to reset all video cards
    function resetAllVideoCards() {
        document.querySelectorAll('.video-card').forEach(card => {
            const videoEmbed = card.querySelector('.video-embed');
            const videoOverlay = card.querySelector('.video-overlay');
            
            // Remove any existing iframe
            while (videoEmbed.firstChild) {
                videoEmbed.removeChild(videoEmbed.firstChild);
            }
            
            // Show the overlay
            if (videoOverlay) {
                videoOverlay.style.opacity = '1';
                videoOverlay.style.visibility = 'visible';
            }
            
            // Hide the embed container
            videoEmbed.style.opacity = '0';
            videoEmbed.style.visibility = 'hidden';
        });
    }

    // Add helper function to reset all video cards except the current one
    function resetOtherVideoCards(currentCard) {
        const allVideoCards = document.querySelectorAll('.video-card');
        allVideoCards.forEach(card => {
            if (card !== currentCard) {
                const videoEmbed = card.querySelector('.video-embed');
                const videoOverlay = card.querySelector('.video-overlay');
                if (videoEmbed) {
                    while (videoEmbed.firstChild) {
                        videoEmbed.removeChild(videoEmbed.firstChild);
                    }
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                }
                if (videoOverlay) {
                    videoOverlay.style.opacity = '1';
                    videoOverlay.style.visibility = 'visible';
                }
            }
        });
    }

    // Handle video cards
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        const videoEmbed = card.querySelector('.video-embed');
        const iframe = videoEmbed.querySelector('iframe');
        
        // Store the original iframe source
        if (iframe) {
            videoSources.set(card, {
                src: iframe.src,
                width: iframe.width,
                height: iframe.height,
                title: iframe.title,
                frameborder: iframe.getAttribute('frameborder'),
                allow: iframe.getAttribute('allow'),
                allowfullscreen: iframe.hasAttribute('allowfullscreen')
            });
            
            // Remove the iframe initially
            videoEmbed.removeChild(iframe);
        }
        
        // For mobile, handle click on the video overlay
        const videoOverlay = card.querySelector('.video-overlay');
        if (videoOverlay) {
            videoOverlay.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card expansion
                // Reset all other video cards except current one
                resetOtherVideoCards(card);
                
                // Create a new iframe with the stored attributes
                const iframeData = videoSources.get(card);
                if (iframeData) {
                    const newIframe = document.createElement('iframe');
                    newIframe.src = iframeData.src + (iframeData.src.includes('?') ? '&' : '?') + 'autoplay=1';
                    newIframe.width = iframeData.width;
                    newIframe.height = iframeData.height;
                    newIframe.title = iframeData.title;
                    
                    if (iframeData.frameborder) {
                        newIframe.setAttribute('frameborder', iframeData.frameborder);
                    }
                    
                    if (iframeData.allow) {
                        newIframe.setAttribute('allow', iframeData.allow);
                    }
                    
                    if (iframeData.allowfullscreen) {
                        newIframe.setAttribute('allowfullscreen', '');
                    }
                    
                    // Add the new iframe to the embed container
                    videoEmbed.appendChild(newIframe);
                    
                    // Hide the overlay and show the embed
                    videoOverlay.style.opacity = '0';
                    videoOverlay.style.visibility = 'hidden';
                    videoEmbed.style.opacity = '1';
                    videoEmbed.style.visibility = 'visible';
                    
                    // Explicitly hide the thumbnail
                    const thumbnail = card.querySelector('.video-thumbnail');
                    if (thumbnail) {
                        thumbnail.style.opacity = '0';
                        thumbnail.style.visibility = 'hidden';
                        thumbnail.style.display = 'none';
                    }
                    
                    // For mobile, also expand the card when clicking on the video
                    if (window.innerWidth <= 768) {
                        // Reset all cards first
                        cards.forEach(c => {
                            if (c !== card) {
                                c.classList.remove('expanded');
                                handleHoverGifForMobile(c, false);
                                
                                // Reset any fixed positioning
                                c.style.position = '';
                                c.style.top = '';
                                c.style.left = '';
                                c.style.width = '';
                                c.style.zIndex = '';
                                c.style.transform = '';
                            }
                        });
                        
                        // Expand this card
                        if (!card.classList.contains('expanded')) {
                            handleCardExpansion(card);
                            handleHoverGifForMobile(card, true);
                        }
                    }
                }
            });
        }

        // Update mouseleave event to immediately hide and remove the video
        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) { // only apply for desktop
                const videoEmbed = card.querySelector('.video-embed');
                const videoOverlay = card.querySelector('.video-overlay');
                const thumbnail = card.querySelector('.video-thumbnail');
                
                // Immediately hide the video embed and show the overlay
                if (videoEmbed) {
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                    // Remove the iframe immediately to stop the video
                    while (videoEmbed.firstChild) {
                        videoEmbed.removeChild(videoEmbed.firstChild);
                    }
                }
                
                if (videoOverlay) {
                    videoOverlay.style.opacity = '1';
                    videoOverlay.style.visibility = 'visible';
                }
                
                // Restore the thumbnail if it exists
                if (thumbnail) {
                    thumbnail.style.display = '';
                    thumbnail.style.opacity = '1';
                    thumbnail.style.visibility = 'visible';
                }
            }
        });

        card.addEventListener('mouseenter', () => {
            const videoEmbed = card.querySelector('.video-embed');
            const videoOverlay = card.querySelector('.video-overlay');
            
            if (videoEmbed) {
                // If the video embed has an iframe (video was playing), show it again
                if (videoEmbed.children.length > 0) {
                    videoEmbed.style.opacity = '1';
                    videoEmbed.style.visibility = 'visible';
                    
                    if (videoOverlay) {
                        videoOverlay.style.opacity = '0';
                        videoOverlay.style.visibility = 'hidden';
                    }
                } else {
                    // Otherwise, ensure the overlay is visible
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                    
                    if (videoOverlay) {
                        videoOverlay.style.opacity = '1';
                        videoOverlay.style.visibility = 'visible';
                    }
                }
            }
        });
    });

    // Handle square image containers for mobile and hover
    const squareImageContainers = document.querySelectorAll('.square-image-container');
    
    squareImageContainers.forEach(container => {
        container.addEventListener('click', () => {
            // First, remove mobile-active class from all containers
            squareImageContainers.forEach(c => {
                if (c !== container) {
                    c.classList.remove('mobile-active');
                }
            });
            
            // Toggle mobile-active class for the clicked container
            container.classList.toggle('mobile-active');
        });
        
        // Add hover events as fallback for color transition
        container.addEventListener('mouseenter', () => {
            const image = container.querySelector('.square-image');
            if (image) {
                image.style.filter = 'grayscale(0%)';
                image.style.transform = 'scale(1.05)';
                container.style.zIndex = '2'; // Ensure hovered container is on top
            }
        });
        
        // Add mouseleave event to de-expand square images when hovering away
        container.addEventListener('mouseleave', () => {
            // Remove mobile-active class when hovering away
            container.classList.remove('mobile-active');
            
            const image = container.querySelector('.square-image');
            if (image) {
                image.style.filter = 'grayscale(0%)';
                image.style.transform = 'scale(1)';
                container.style.zIndex = '1'; // Reset z-index
            }
        });
    });

    // Handle card expansion logic
    const cards = document.querySelectorAll('.card');
    
    // Add a touchstart event listener to the document to ensure touch events are properly initialized
    document.addEventListener('touchstart', function() {
        // This is just to ensure touch events are properly registered
    }, {passive: true});
    
    // Function to handle hover-gif for mobile
    function handleHoverGifForMobile(card, isExpanded) {
        const hoverGif = card.querySelector('.hover-gif');
        if (hoverGif) {
            if (isExpanded) {
                // Show the hover-gif when card is expanded on mobile
                hoverGif.style.opacity = '1';
            } else {
                // Hide the hover-gif when card is collapsed on mobile
                hoverGif.style.opacity = '0';
            }
        }
    }
    
    // Function to get card position relative to viewport
    function getCardPosition(card) {
        const rect = card.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            cardHeight: rect.height,
            viewportHeight: window.innerHeight
        };
    }
    
    // Function to scroll to maintain card position after expansion
    function maintainCardPosition(card, originalPosition) {
        // Get the new position after expansion
        const newRect = card.getBoundingClientRect();
        
        // Calculate how much the card has moved
        const deltaY = newRect.top - originalPosition.top;
        
        // Only scroll if there's a significant shift
        if (Math.abs(deltaY) > 10) {
            // Smooth scroll to adjust for the shift
            window.scrollBy({
                top: deltaY,
                behavior: 'smooth'
            });
        }
    }
    
    // Function to handle card expansion that prevents diagonal movement
    function handleCardExpansion(card) {
        // Get the current position before any changes
        const rect = card.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add expanded class first
        card.classList.add('expanded');
        
        // Wait longer for the expanded class to fully take effect
        // This helps prevent the diagonal movement by ensuring the expansion is complete
        setTimeout(() => {
            // Get the expanded dimensions
            const expandedRect = card.getBoundingClientRect();
            
            // Calculate scroll behavior based on device type
            const isMobile = window.innerWidth <= 768;
            let scrollOffset;
            
            if (isMobile) {
                // For mobile: scroll to the top of the card with a larger offset to position it lower
                scrollOffset = expandedRect.top - 60; // Changed from -10 to -60
            } else {
                // For desktop: center the card vertically (original behavior)
                // Calculate the center of the viewport
                const viewportHeight = window.innerHeight;
                const viewportCenterY = viewportHeight / 2;
                
                // Calculate where the center of the card is relative to the viewport
                const cardCenterY = expandedRect.top + (expandedRect.height / 2);
                
                // Calculate how much we need to scroll to center the card
                scrollOffset = cardCenterY - viewportCenterY;
            }
            
            // Only scroll if adjustment is needed (with some tolerance)
            if (Math.abs(scrollOffset) > 20) {
                // Calculate the new scroll position
                const newScrollTop = scrollTop + scrollOffset;
                
                // Get the document height
                const documentHeight = Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );
                
                // Ensure we don't scroll beyond the document boundaries
                const maxScrollTop = documentHeight - window.innerHeight;
                const targetScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
                
                // Scroll to the calculated position
                window.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
        }, 300); // Increased from 50ms to 300ms to ensure expansion is complete
    }
    
    // Function to handle mobile card interaction
    function handleMobileCardInteraction(card, e) {
        // Prevent default behavior to avoid any conflicts
        e.preventDefault();
        
        // Special handling for Steerable Motion card
        const isSteerableMotionCard = card.getAttribute('data-position') === '2';
        
        const isExpanded = card.classList.contains('expanded');
        
        // Reset all cards first
        cards.forEach(c => {
            // Skip the current card if it's expanded (we'll handle it separately)
            if (c === card && isExpanded) {
                return;
            }
            
            c.classList.remove('expanded');
            
            // Hide zoom buttons for weights chart when collapsing
            const zoomControls = c.querySelector('.chart-zoom-controls');
            if (zoomControls) {
                zoomControls.style.opacity = '0';
                zoomControls.style.pointerEvents = 'none';
            }
            
            // Reset hover-gif for all cards
            handleHoverGifForMobile(c, false);
            
            // Reset all meme cards when closing
            if (c.classList.contains('meme-card')) {
                const memeImages = c.querySelectorAll('.meme-image');
                memeImages.forEach(img => {
                    img.style.transform = 'translateY(10px)';
                    img.style.opacity = '0';
                });
            }
            
            // For video cards, restore the thumbnail and overlay
            if (c.classList.contains('video-card')) {
                const videoEmbed = c.querySelector('.video-embed');
                const videoOverlay = c.querySelector('.video-overlay');
                const thumbnail = c.querySelector('.video-thumbnail');
                
                // Clear video embed
                if (videoEmbed) {
                    videoEmbed.innerHTML = '';
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                    videoEmbed.style.display = 'none';
                }
                
                // Restore overlay
                if (videoOverlay) {
                    videoOverlay.style.opacity = '1';
                    videoOverlay.style.visibility = 'visible';
                    videoOverlay.style.display = 'flex';
                }
                
                // Restore thumbnail
                if (thumbnail) {
                    thumbnail.style.opacity = '1';
                    thumbnail.style.visibility = 'visible';
                    thumbnail.style.display = 'block';
                }
            }
            
            // Reset any fixed positioning that might have been applied
            c.style.position = '';
            c.style.top = '';
            c.style.left = '';
            c.style.width = '';
            c.style.zIndex = '';
            c.style.transform = ''; // Reset transform as well
            
            // Ensure links are hidden when card is unexpanded
            const link = c.querySelector('.link');
            if (link) {
                link.style.opacity = '0';
                link.style.transform = 'translateY(10px)';
                link.style.pointerEvents = 'none';
                link.style.display = 'none';
            }
        });
        
        if (isExpanded) {
            // If the card is already expanded, just collapse it
            card.classList.remove('expanded');
            handleHoverGifForMobile(card, false);
            
            // Explicitly hide zoom buttons for weights chart
            const zoomControls = card.querySelector('.chart-zoom-controls');
            if (zoomControls) {
                zoomControls.style.opacity = '0';
                zoomControls.style.pointerEvents = 'none';
            }
            
            // Reset any fixed positioning
            card.style.position = '';
            card.style.top = '';
            card.style.left = '';
            card.style.width = '';
            card.style.zIndex = '';
            card.style.transform = ''; // Reset transform as well
            
            // Ensure link is hidden when card is unexpanded
            const link = card.querySelector('.link');
            if (link) {
                link.style.opacity = '0';
                link.style.transform = 'translateY(10px)';
                link.style.pointerEvents = 'none';
                link.style.display = 'none'; // Ensure link is not displayed
            }
            
            // Reset GIF if this is the Steerable Motion card
            if (isSteerableMotionCard) {
                const gifImg = card.querySelector('.hover-gif img');
                if (gifImg) {
                    const originalSrc = gifImg.src;
                    setTimeout(() => {
                        gifImg.src = '';
                        void gifImg.offsetWidth;
                        gifImg.src = originalSrc;
                    }, 500);
                }
            }
            
            // Reset meme card if needed
            if (card.classList.contains('meme-card')) {
                const memeImages = card.querySelectorAll('.meme-image');
                memeImages.forEach(img => {
                    img.style.transform = 'translateY(10px)';
                    img.style.opacity = '0';
                });
            }
        } else {
            // For Steerable Motion card, force expansion and show GIF immediately
            if (isSteerableMotionCard) {
                const hoverGif = card.querySelector('.hover-gif');
                if (hoverGif) {
                    hoverGif.style.opacity = '1';
                    hoverGif.style.pointerEvents = 'none';
                }
            }
            
            // Use the new expansion handler
            handleCardExpansion(card);
            
            // Handle hover-gif for this card
            handleHoverGifForMobile(card, true);
            
            // Make link visible when card is expanded
            const link = card.querySelector('.link');
            if (link) {
                link.style.opacity = '1';
                link.style.transform = 'translateY(0)';
                link.style.pointerEvents = 'auto';
                link.style.display = 'inline-block'; // Ensure link is displayed
            }
            
            // Special handling for meme cards on mobile click
            if (card.classList.contains('meme-card')) {
                const memeImages = card.querySelectorAll('.meme-image');
                memeImages.forEach((img, index) => {
                    img.style.transitionDelay = `${0.1 * (index + 1)}s`;
                    img.style.transform = 'translateY(0)';
                    img.style.opacity = '1';
                });
            }
        }

        // NEW: For video cards (except the special Steerable Motion card already handled), simulate a click on the video-overlay to hide it
        if (card.classList.contains('video-card') && !card.getAttribute('data-position').includes('2')) {
            const videoOverlay = card.querySelector('.video-overlay');
            const videoEmbed = card.querySelector('.video-embed');
            const thumbnail = card.querySelector('.video-thumbnail');
            
            // First ensure the card is expanded
            card.classList.add('expanded');
            
            // Then handle the video elements
            if (videoOverlay) {
                videoOverlay.style.opacity = '0';
                videoOverlay.style.visibility = 'hidden';
                videoOverlay.style.display = 'none';
            }
            
            if (thumbnail) {
                thumbnail.style.opacity = '0';
                thumbnail.style.visibility = 'hidden';
                thumbnail.style.display = 'none';
            }
            
            if (videoEmbed) {
                // Clear any existing content
                videoEmbed.innerHTML = '';
                videoEmbed.classList.add('revealed');
                
                // Create a dedicated div for YouTube player
                const playerDiv = document.createElement('div');
                playerDiv.style.width = '100%';
                playerDiv.style.height = '100%';
                videoEmbed.appendChild(playerDiv);
                
                // Make the video embed visible
                videoEmbed.style.opacity = '1';
                videoEmbed.style.visibility = 'visible';
                videoEmbed.style.display = 'block';
                
                // Create the YouTube player
                const createPlayer = function() {
                    card._player = new YT.Player(playerDiv, {
                        videoId: "4AgXLXE5QIo",
                        width: '100%',
                        height: '100%',
                        playerVars: { 
                            autoplay: 1,
                            mute: 0,
                            playsinline: 1,
                            enablejsapi: 1,
                            origin: window.location.origin
                        },
                        events: {
                            onReady: function(event) {
                                event.target.playVideo();
                            }
                        }
                    });
                };
                
                // Create the player if YouTube API is ready, otherwise wait
                if (window.YT && window.YT.Player) {
                    createPlayer();
                } else {
                    var interval = setInterval(function() {
                        if (window.YT && window.YT.Player) {
                            clearInterval(interval);
                            createPlayer();
                        }
                    }, 100);
                }
            }
        }
    }

    cards.forEach(card => {
        // Hover-based expansion for desktop
        card.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                cards.forEach(c => c.classList.remove('expanded'));
                card.classList.add('expanded');
                
                // Special handling for meme cards on desktop hover
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach((img, index) => {
                        img.style.transitionDelay = `${0.1 * (index + 1)}s`;
                        img.style.transform = 'translateY(0)';
                        img.style.opacity = '1';
                    });
                }
            }
        });

        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                card.classList.remove('expanded');
                
                // Special handling for meme cards on desktop hover out
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach(img => {
                        img.style.transitionDelay = '0s';
                        img.style.transform = 'translateY(10px)';
                        img.style.opacity = '0';
                    });
                }
            }
        });

        // Mobile interaction handling - use touchstart as the primary event
        if ('ontouchstart' in window) {
            // For touch devices, use touchstart for more responsive interaction
            card.addEventListener('touchstart', function(e) {
                if (window.innerWidth <= 768) {
                    // Store touch start position to detect if it's a tap or scroll
                    const touchStartY = e.touches[0].clientY;
                    
                    // Add touchend listener to check if it's a tap
                    const touchEndHandler = function(endEvent) {
                        // Remove this listener after it's used
                        card.removeEventListener('touchend', touchEndHandler);
                        
                        // Calculate touch movement
                        const touchEndY = endEvent.changedTouches[0].clientY;
                        const touchDiff = Math.abs(touchEndY - touchStartY);
                        
                        // If movement is small enough, consider it a tap
                        if (touchDiff < 10) {
                            handleMobileCardInteraction(card, endEvent);
                        }
                    };
                    
                    // Add temporary touchend listener
                    card.addEventListener('touchend', touchEndHandler);
                }
            }, {passive: true});
            
            // Prevent click events from firing twice on touch devices
            card.addEventListener('click', function(e) {
                if (window.innerWidth <= 768 && e.pointerType !== 'mouse') {
                    e.preventDefault();
                }
            });
        } else {
            // Fallback to click for non-touch devices
            card.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    handleMobileCardInteraction(card, e);
                }
            });
        }
    });

    // Update the body click/touch handler to reset any fixed positioning
    document.body.addEventListener('click', (e) => {
        // Only collapse if click did not occur inside a card
        if (window.innerWidth <= 768 && !e.target.closest('.card')) {
            // Reset all video cards when clicking outside
            resetAllVideoCards();
            
            cards.forEach(card => {
                card.classList.remove('expanded');
                
                // Reset hover-gif for all cards
                handleHoverGifForMobile(card, false);
                
                // Hide zoom buttons for weights chart
                const zoomControls = card.querySelector('.chart-zoom-controls');
                if (zoomControls) {
                    zoomControls.style.opacity = '0';
                    zoomControls.style.pointerEvents = 'none';
                }

                // Reset meme images
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach(img => {
                        img.style.transform = 'translateY(10px)';
                        img.style.opacity = '0';
                    });
                }
                
                // Reset any fixed positioning
                card.style.position = '';
                card.style.top = '';
                card.style.left = '';
                card.style.width = '';
                card.style.zIndex = '';
                card.style.transform = ''; // Reset transform as well
                
                // Hide links when clicking outside cards
                const link = card.querySelector('.link');
                if (link) {
                    link.style.opacity = '0';
                    link.style.transform = 'translateY(10px)';
                    link.style.pointerEvents = 'none';
                    link.style.display = 'none'; // Ensure link is not displayed
                }
            });
        }
    });
    
    // Add a touchend event listener to the document body to ensure touch events are properly handled
    document.body.addEventListener('touchend', (e) => {
        // This is just to ensure touch events are properly registered
        // The actual logic is handled in the click event
    }, {passive: true});
    
    // Reset all video cards on page load
    resetAllVideoCards();
    
    // Special handling for Steerable Motion card on mobile
    if (window.innerWidth <= 768) {
        const steerableMotionCard = document.querySelector('.card[data-position="2"]');
        if (steerableMotionCard) {
            console.log('Found Steerable Motion card, applying special mobile handling');
            
            // Force the hover-gif to be non-interactive
            const hoverGif = steerableMotionCard.querySelector('.hover-gif');
            if (hoverGif) {
                // Ensure pointer events are disabled
                hoverGif.style.pointerEvents = 'none';
                
                // Make sure all children also have pointer events disabled
                hoverGif.querySelectorAll('*').forEach(el => {
                    el.style.pointerEvents = 'none';
                });
            }
        }
    } else {
        document.querySelectorAll('.hover-gif').forEach(hoverGif => {
            hoverGif.style.pointerEvents = 'auto';
        });
    }

    // Ensure GIF is properly preloaded
    preloadGif.onload = () => {
        // Once preloaded, find the actual GIF in the DOM and ensure it's using the preloaded version
        const steerableMotionCard = document.querySelector('.card[data-position="2"]');
        if (steerableMotionCard) {
            const hoverGif = steerableMotionCard.querySelector('.hover-gif img');
            if (hoverGif) {
                // Force the browser to use the preloaded version
                hoverGif.src = steerableMotionGifUrl + '?preloaded=true';
            }
        }
    };

    // Function to set equal heights for cards in the same row
    function setEqualCardHeights() {
        if (window.innerWidth > 768) {
            // First, remove any previously set row classes
            document.querySelectorAll('.card').forEach(card => {
                const classes = [...card.classList];
                classes.forEach(cls => {
                    if (cls.startsWith('card-row-')) {
                        card.classList.remove(cls);
                    }
                });
                // Reset inline height
                card.style.height = '';
            });

            // Get all unexpanded cards
            const cards = document.querySelectorAll('.card:not(.expanded)');
            let rows = {};
            let rowCounter = 0;

            // Group cards by their top offset (row)
            cards.forEach(card => {
                const topOffset = Math.round(card.getBoundingClientRect().top);
                if (!rows[topOffset]) {
                    rows[topOffset] = {
                        cards: [],
                        rowIndex: rowCounter++
                    };
                }
                rows[topOffset].cards.push(card);
            });

            // For each row, find the tallest card and set a CSS custom property
            Object.values(rows).forEach(row => {
                const rowClass = `card-row-${row.rowIndex}`;
                const maxHeight = Math.max(...row.cards.map(card => {
                    // Temporarily remove any height constraints
                    const originalHeight = card.style.height;
                    card.style.height = 'auto';
                    const height = card.offsetHeight;
                    card.style.height = originalHeight;
                    return height;
                }));

                // Add row class to each card and set the row height
                row.cards.forEach(card => {
                    card.classList.add(rowClass);
                    card.style.setProperty('--row-height', `${maxHeight}px`);
                });
            });

            // Add a style element if it doesn't exist
            let styleEl = document.getElementById('equal-height-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'equal-height-styles';
                document.head.appendChild(styleEl);
            }

            // Create CSS rules for each row
            let css = '';
            for (let i = 0; i < rowCounter; i++) {
                css += `.card-row-${i}:not(.expanded) { height: var(--row-height) !important; }\n`;
            }
            styleEl.textContent = css;
        } else {
            // Reset heights on mobile
            document.querySelectorAll('.card').forEach(card => {
                card.style.height = '';
                card.style.removeProperty('--row-height');
            });
            
            // Remove the style element
            const styleEl = document.getElementById('equal-height-styles');
            if (styleEl) {
                styleEl.textContent = '';
            }
        }

        // At the end of setEqualCardHeights function, smoothly fade in the dashboard
        const dashboard = document.querySelector('.dashboard');
        if (dashboard && !dashboard.classList.contains('visible')) {
            dashboard.classList.add('visible');
        }
    }

    // Call on load and resize only
    window.addEventListener('load', setEqualCardHeights);
    window.addEventListener('resize', debounce(setEqualCardHeights, 250));

    // Simple debounce function to prevent excessive recalculations
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Initialize original text for border letters so we can revert later
    const borderLetters = document.querySelectorAll('.pom-border-top span, .pom-border-bottom span');
    borderLetters.forEach(letter => {
        letter.dataset.originalText = letter.textContent;
    });

    // Define transformation mapping and helper functions
    const mapping = ['P','E','T','E','R','O','M','A','L','L','E','Y'];
    // Define pastel rainbow colors: pastel red, pastel orange, pastel yellow, pastel green, pastel blue, pastel indigo, pastel violet
    const rainbowColors = ['#FF6961', '#FFB347', '#FDFD96', '#77DD77', '#AEC6CF', '#C1CDFF', '#CDA4DE'];

    function transformLetter(letter) {
        const parent = letter.parentElement;
        // Get the index of this letter within its parent
        const index = Array.prototype.indexOf.call(parent.children, letter);
        letter.textContent = mapping[index % mapping.length];
        // Assign pastel rainbow colors in order
        letter.style.color = rainbowColors[index % rainbowColors.length];
    }

    function revertLetter(letter) {
        if(letter.dataset.originalText) {
            letter.textContent = letter.dataset.originalText;
            letter.style.color = '';
        }
    }

    // Adding hover behavior with immediate deactivation for desktop
    borderLetters.forEach(letter => {
        let revertTimeout;

        letter.addEventListener('mouseenter', (e) => {
            clearTimeout(revertTimeout);
            letter.classList.remove('deactivating');
            letter.classList.add('transformed');
            transformLetter(letter);

            const prev = letter.previousElementSibling;
            if (prev && prev.tagName.toLowerCase() === 'span') {
                prev.classList.remove('deactivating');
                prev.classList.add('transformed', 'adjacent');
                transformLetter(prev);
            }

            const next = letter.nextElementSibling;
            if (next && next.tagName.toLowerCase() === 'span') {
                next.classList.remove('deactivating');
                next.classList.add('transformed', 'adjacent');
                transformLetter(next);
            }
        });

        letter.addEventListener('mouseleave', (e) => {
            clearTimeout(revertTimeout);
            // Wait 1.5 seconds before starting deactivation
            revertTimeout = setTimeout(() => {
                letter.classList.add('deactivating');
                
                const prev = letter.previousElementSibling;
                if (prev && prev.tagName.toLowerCase() === 'span') {
                    prev.classList.add('deactivating');
                }
                
                const next = letter.nextElementSibling;
                if (next && next.tagName.toLowerCase() === 'span') {
                    next.classList.add('deactivating');
                }

                // Complete reversion after animation
                setTimeout(() => {
                    letter.classList.remove('transformed', 'deactivating');
                    revertLetter(letter);

                    if (prev && prev.tagName.toLowerCase() === 'span') {
                        prev.classList.remove('transformed', 'adjacent', 'deactivating');
                        revertLetter(prev);
                    }

                    if (next && next.tagName.toLowerCase() === 'span') {
                        next.classList.remove('transformed', 'adjacent', 'deactivating');
                        revertLetter(next);
                    }
                }, 150);
            }, 1500);
        });
    });

    // Adding touch behavior for mobile devices with immediate deactivation
    borderLetters.forEach(letter => {
        let revertTimeout;

        letter.addEventListener('touchstart', (e) => {
            e.preventDefault();
            clearTimeout(revertTimeout);
            letter.classList.remove('deactivating');
            letter.classList.add('transformed');
            transformLetter(letter);

            const prev = letter.previousElementSibling;
            if (prev && prev.tagName.toLowerCase() === 'span') {
                prev.classList.remove('deactivating');
                prev.classList.add('transformed', 'adjacent');
                transformLetter(prev);
            }

            const next = letter.nextElementSibling;
            if (next && next.tagName.toLowerCase() === 'span') {
                next.classList.remove('deactivating');
                next.classList.add('transformed', 'adjacent');
                transformLetter(next);
            }

            // Start deactivation sequence after 3 seconds total (1.5s peak + 1.5s fade)
            revertTimeout = setTimeout(() => {
                letter.classList.add('deactivating');
                
                if (prev && prev.tagName.toLowerCase() === 'span') {
                    prev.classList.add('deactivating');
                }
                
                if (next && next.tagName.toLowerCase() === 'span') {
                    next.classList.add('deactivating');
                }

                // Complete reversion after animation
                setTimeout(() => {
                    letter.classList.remove('transformed', 'deactivating');
                    revertLetter(letter);

                    if (prev && prev.tagName.toLowerCase() === 'span') {
                        prev.classList.remove('transformed', 'adjacent', 'deactivating');
                        revertLetter(prev);
                    }

                    if (next && next.tagName.toLowerCase() === 'span') {
                        next.classList.remove('transformed', 'adjacent', 'deactivating');
                        revertLetter(next);
                    }
                }, 150);
            }, 1500); // Changed from 3000 to 1500 to match desktop behavior
        });
    });

    // Loading element handling
    // Set body to visible when DOM is ready (already happens via CSS transition, but explicit set is okay)
    document.body.style.opacity = '1';

    // Function to mark an element as loaded (Now potentially redundant for initial load, but keep for safety/other uses)
    function markAsLoaded(element) {
      if (element) {
        element.classList.add('loaded');
      }
    }

    // Process all loading elements - REMOVED DELAY LOGIC FROM HERE
    // const baseDelay = 100; // REMOVED
    loadingElements.forEach(function(element, index) { // Removed index
      // REMOVED Delay Calculation
      // const delay = (index + 1) * baseDelay;
      // element.style.setProperty('--load-delay', `${delay}ms`); // REMOVED CSS variable

      // Find images within the element, excluding those with class 'ignore-load'
      const images = element.querySelectorAll('img:not(.ignore-load)');

      if (images.length > 0) {
        let loadedImagesCount = 0;
        const totalImages = images.length;

        // For each image in the element
        images.forEach(function(img) {
          if (img.complete || !img.src) {
            loadedImagesCount++;
            if (loadedImagesCount === totalImages) {
              markAsLoaded(element);
            }
          } else {
            img.addEventListener('load', function() {
              loadedImagesCount++;
              if (loadedImagesCount === totalImages) {
                markAsLoaded(element);
              }
            });

            img.addEventListener('error', function() { // Also mark as loaded on error
              loadedImagesCount++;
              if (loadedImagesCount === totalImages) {
                markAsLoaded(element);
              }
            });
          }
        });
      } else {
        // If no images, mark as loaded immediately
        // markAsLoaded(element); // Commented out - loaded class added in initial loop
      }
    });

    // Footer visibility logic
    const footer = document.querySelector('.github-suggestion-footer');
    if (footer) {
      let scrollTimeout;
      let lastKnownScrollPosition = 0;
      let ticking = false;

      function updateFooterVisibility() {
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop; // Use pageYOffset for broader compatibility
        const totalHeight = Math.max( // Use Math.max for more reliable document height calculation
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        const distanceFromBottom = totalHeight - (scrollPosition + viewportHeight);

        // Adjust threshold slightly if needed, 50px seems reasonable
        if (distanceFromBottom <= 50) {
          footer.classList.add('visible');
        } else {
          footer.classList.remove('visible');
        }
      }

      // Initial check
      updateFooterVisibility();

      // Handle scroll events with requestAnimationFrame
      window.addEventListener('scroll', function() {
        lastKnownScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        if (!ticking) {
          window.requestAnimationFrame(function() {
            updateFooterVisibility();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true }); // Use passive listener for scroll

      // Debounced resize handler
      const debouncedResizeHandler = debounce(updateFooterVisibility, 100); // Use existing debounce
      window.addEventListener('resize', debouncedResizeHandler);

      // Mutation observer for dynamic content changes
      // Use the existing debounce function for the mutation observer callback
      const observerCallback = debounce(updateFooterVisibility, 100);
      const observer = new MutationObserver(observerCallback);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true // Keep attributes true, characterData might be overkill
      });
    }

    // Initialize Weights Chart
    let weightsChart = null;
    
    function shouldInitializeChart() {
        // Check if we're in development mode
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname.startsWith('192.168.') ||
                     hostname.includes('dev') ||
                     window.location.port !== '';
        
        // For now, allow chart in both dev and production
        // To disable in production, change this to: return isDev;
        return true;
    }
    
    function initializeWeightsChart() {
        if (!shouldInitializeChart()) {
            console.log('Weights chart disabled in production environment');
            return;
        }
        
        if (typeof WeightsChart !== 'undefined') {
            weightsChart = new WeightsChart('weights-chart-container');
            weightsChart.init().catch(error => {
                console.error('Failed to initialize weights chart:', error);
            });
        } else {
            console.warn('WeightsChart class not available');
        }
    }
    
    // Initialize the chart after a short delay to ensure all other elements are loaded
    setTimeout(initializeWeightsChart, 1000);
    
    // Cleanup chart on page unload
    window.addEventListener('beforeunload', () => {
        if (weightsChart) {
            weightsChart.destroy();
        }
    });

    // Added to fix black flicker on mobile when returning to the page (Outside DOMContentLoaded)
    window.addEventListener('pageshow', function(event) {
      // Ensure both opacity and background are set immediately on page show
      document.body.style.opacity = '1';
      document.body.style.backgroundColor = '#fbf8ef'; // Explicitly set background
    });

    // --- Filter Logic --- //
    const filterButtons = document.querySelectorAll('.filter-btn');
    const dashboardCards = document.querySelectorAll('.dashboard .card');
    const allButton = document.querySelector('.filter-btn[data-filter="all"]');

    let activeFilters = new Set(['all']); // Start with 'all' active

    filterButtons.forEach(button => {
        const deselectIcon = button.querySelector('.deselect-icon');
        if (deselectIcon) {
            deselectIcon.textContent = '×'; // Set the 'x' symbol
        }
        
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');

            if (filter === 'all') {
                // If 'all' is clicked
                if (!activeFilters.has('all')) {
                    // If 'all' wasn't active, activate it and deactivate others
                    activeFilters.clear();
                    activeFilters.add('all');
                } 
                // If 'all' was already active, clicking it again does nothing
                
            } else {
                // If a category button is clicked
                if (activeFilters.has('all')) {
                    // If 'all' was active, deactivate it and activate the clicked category
                    activeFilters.delete('all');
                    activeFilters.add(filter);
                } else {
                    // If 'all' was not active
                    if (activeFilters.has(filter)) {
                        // If the clicked category was active, deactivate it
                        activeFilters.delete(filter);
                    } else {
                        // If the clicked category wasn't active, activate it
                        activeFilters.add(filter);
                    }
                    // If no category buttons are active, activate 'all'
                    if (activeFilters.size === 0) {
                        activeFilters.add('all');
                    }
                }
            }

            updateButtonStates();
            filterCards();
        });
    });

    function updateButtonStates() {
        filterButtons.forEach(btn => {
            const btnFilter = btn.getAttribute('data-filter');
            if (activeFilters.has(btnFilter)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function filterCards() {
        const transitionDuration = 500; // ms, should match CSS transition

        // 1. First: Get initial positions of all cards
        const initialPositions = new Map();
        dashboardCards.forEach(card => {
            initialPositions.set(card, card.getBoundingClientRect());
        });

        // Identify cards to hide, show, or keep
        const cardsToHide = [];
        const cardsToShow = [];
        const cardsToKeep = [];

        dashboardCards.forEach(card => {
            const categoryString = card.getAttribute('data-category'); // Get the attribute
            const cardCategories = categoryString ? categoryString.split(' ') : []; // Split only if it exists

            const isVisibleTarget = activeFilters.has('all') || cardCategories.some(category => activeFilters.has(category));
            const isCurrentlyVisible = !card.classList.contains('hiding') && !card.classList.contains('removed');

            if (isVisibleTarget && !isCurrentlyVisible) {
                cardsToShow.push(card);
            } else if (!isVisibleTarget && isCurrentlyVisible) {
                cardsToHide.push(card);
            } else if (isVisibleTarget && isCurrentlyVisible) {
                cardsToKeep.push(card);
            }
            // Cards that are already hidden (!isVisibleTarget && !isCurrentlyVisible) are ignored for animation
        });

        // --- Get dashboard container rect for relative positioning --- 
        const dashboardRect = document.querySelector('.dashboard')?.getBoundingClientRect();

        // 2. Apply initial changes (hide cards, prepare cards to show)
        cardsToHide.forEach(card => {
            const initialPos = initialPositions.get(card);
            if (!dashboardRect) return; // Skip if dashboard not found

            // --- Log position for hiding card --- 
            console.log('[HIDING] Card:', card.querySelector('h3')?.textContent.trim());
            console.log('[HIDING] Initial Pos:', { top: initialPos.top, left: initialPos.left, width: initialPos.width });
            // --- End Log ---
            
            // Keep position absolute during fade-out
            card.style.position = 'absolute';
            card.style.top = `${initialPos.top + window.scrollY}px`;
            // --- Calculate left relative to the dashboard container --- 
            const relativeLeft = initialPos.left - dashboardRect.left;
            card.style.left = `${relativeLeft}px`; 
            card.style.width = `${initialPos.width}px`;
            card.style.height = `${initialPos.height}px`;
            card.classList.add('hiding');
            card.classList.remove('removed'); // Ensure it's not display:none during transition

            // Optional: truly remove after transition
            setTimeout(() => {
                 // Only remove if it's still meant to be hidden
                 const currentCategoryString = card.getAttribute('data-category');
                 const currentCardCategories = currentCategoryString ? currentCategoryString.split(' ') : [];
                 const stillShouldBeHidden = !activeFilters.has('all') && !currentCardCategories.some(category => activeFilters.has(category));
                 
                 if(stillShouldBeHidden) {
                     card.classList.add('removed');
                     // Reset styles needed for absolute positioning
                     card.style.position = '';
                     card.style.top = '';
                     card.style.left = '';
                     card.style.width = '';
                     card.style.height = '';
                 }
            }, transitionDuration);
        });

        cardsToShow.forEach(card => {
            card.classList.remove('hiding', 'removed');
            card.style.position = ''; // Ensure it's back in the grid flow
            card.style.top = '';
            card.style.left = '';
            card.style.width = '';
            card.style.height = '';
            card.classList.add('before-show'); // Make initially invisible
        });

        // --- Define cardsToAnimate earlier --- 
        const cardsToAnimate = [...cardsToKeep, ...cardsToShow];

        // 3. Last: Get final positions after layout reflow
        // --- Remove explicit reflow --- 
        // const dashboard = document.querySelector('.dashboard'); // Get the container
        // if (dashboard) { 
        //     void dashboard.offsetWidth; 
        // }

        // Measure final positions *after* initial hiding/showing styles are applied
        const finalPositions = new Map();
        cardsToAnimate.forEach(card => {
            // Ensure card is not display:none when measuring
            if (!card.classList.contains('removed')) { 
                finalPositions.set(card, card.getBoundingClientRect());
            }
        });

        // 4. Invert: Calculate deltas and apply initial transforms
        cardsToAnimate.forEach(card => {
            const initialPos = initialPositions.get(card);
            const finalPos = finalPositions.get(card);
            
            if (!finalPos) return;

            const deltaX = initialPos.left - finalPos.left;
            const deltaY = initialPos.top - finalPos.top;

            // --- Add console logging for debugging --- 
            console.log('Card:', card.querySelector('h3')?.textContent.trim());
            console.log('Initial:', { top: initialPos.top, left: initialPos.left });
            console.log('Final:', { top: finalPos.top, left: finalPos.left });
            console.log('Delta:', { deltaX, deltaY });
            // --- End console logging --- 

            // Only apply transform if position actually changed
            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5 || card.classList.contains('before-show')) {
                card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else {
                card.style.transform = ''; // Ensure no lingering transform
            }
        });

        // 5. Play: Remove transforms and fade in new cards in the next frame
        requestAnimationFrame(() => {
            cardsToAnimate.forEach(card => {
                // Remove the initial transform to let it transition to (0,0)
                card.style.transition = `transform ${transitionDuration}ms ease-out, opacity ${transitionDuration}ms ease-out`;
                card.style.transform = ''; 
                
                // Remove before-show class to fade in
                if (card.classList.contains('before-show')) {
                    card.classList.remove('before-show');
                }
                 // Reset inline transition after animation is done
                 setTimeout(() => {
                     card.style.transition = ''; 
                 }, transitionDuration);
            });
        });
    }

    // Initial state setup
    updateButtonStates(); // Set initial button states based on activeFilters ('all')
    // No need to call filterCards() initially if 'all' is default, as all cards are visible

    // Ensure plant animation doesn't overlap footer after filtering might change height
    const plantCanvas = document.getElementById('plantCanvas');
    if (plantCanvas) {
        // Re-calculate canvas height if needed after filtering
        // This might need adjustment based on your plant animation logic
    }

    /* --------------------------------------------------
       Force-display the Steerable Motion card immediately
       -------------------------------------------------- */
    (function revealSteerableMotionCardEarly() {
        /* 1.  Grab the card – it may move around, so try a few selectors   */
        let smCard =
            document.querySelector('.card.project-tile[data-position="3"]') ||   // current position
            document.querySelector('.card.project-tile[data-position="2"]');     // fallback

        /* Fallback – search by heading text if positions ever change       */
        if (!smCard) {
            smCard = Array.from(document.querySelectorAll('.card.project-tile'))
                .find(card =>
                    card.querySelector('h3')?.textContent
                        .toLowerCase()
                        .includes('steerable motion')
                );
        }

        if (!smCard) return;   // Nothing found – abort.

        /* 2.  Add the "loaded" class to the card itself and every element  */
        /*     inside it that is still marked as a loading-element.         */
        [smCard, ...smCard.querySelectorAll('.loading-element')].forEach(el => {
            el.classList.add('loaded');
        });
    })();

    // second phase: re-apply the visual stagger _in the new order_
    applyStaggeredDelay();

    // helper that is called right here and can be reused later
    function applyStaggeredDelay() {
        // grab only the elements that are _actually visible_ now
        const orderedElems = document.querySelectorAll('.loading-element:not(.removed)');
        orderedElems.forEach((el, i) => {
            const delay = (i + 1) * baseDelay;
            el.style.transitionDelay = `${delay}ms`;
        });
    }

    // --- Single-Click Video Swap for Square Images ---
    
    // Helper function to setup video swap for an image container
    function setupVideoSwap(imageContainer, videoUrl) {
        const image = imageContainer?.querySelector('.square-image');
        if (!image || !imageContainer) return;
        
        // Add class to indicate this image has video functionality
        imageContainer.classList.add('has-video');
        
        let videoElement = null;
        let isVideoPlaying = false;
        
        // Pre-load video in background after a short delay
        setTimeout(() => {
            videoElement = document.createElement('video');
            videoElement.src = videoUrl;
            videoElement.preload = 'auto';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.display = 'none';
            videoElement.setAttribute('playsinline', '');
            videoElement.muted = false;
            
            // Add to container but keep hidden
            imageContainer.appendChild(videoElement);
            
            // Preload the video
            videoElement.load();
        }, 1000); // Load after 1 second to let other content load first
        
        // Handle single click/tap to swap and play video
        const handlePlayVideo = (e) => {
            if (isVideoPlaying) return; // Prevent triggering during playback
            
            // Ensure video is loaded
            if (!videoElement) {
                videoElement = document.createElement('video');
                videoElement.src = videoUrl;
                videoElement.preload = 'auto';
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'cover';
                videoElement.style.display = 'none';
                videoElement.setAttribute('playsinline', '');
                videoElement.muted = false;
                imageContainer.appendChild(videoElement);
                videoElement.load();
            }
            
            // Wait for video to be ready before swapping
            const playVideo = () => {
                // Swap to video
                image.style.display = 'none';
                videoElement.style.display = 'block';
                isVideoPlaying = true;
                
                // Play video
                videoElement.play();
                
                // When video ends, swap back to image
                videoElement.onended = () => {
                    videoElement.style.display = 'none';
                    image.style.display = 'block';
                    isVideoPlaying = false;
                    
                    // Reset video to beginning for next play
                    videoElement.currentTime = 0;
                };
            };
            
            // Check if video is ready to play
            if (videoElement.readyState >= 3) {
                // Video is ready, play immediately
                playVideo();
            } else {
                // Wait for video to be ready
                videoElement.addEventListener('canplay', playVideo, { once: true });
            }
        };
        
        // Add both click and touch event listeners for better mobile support
        image.addEventListener('click', handlePlayVideo);
        image.addEventListener('touchstart', (e) => {
            // Show text briefly on touch
            imageContainer.classList.add('mobile-active');
            setTimeout(() => {
                imageContainer.classList.remove('mobile-active');
            }, 300);
        });
        
        // Handle click on video to prevent propagation
        imageContainer.addEventListener('click', (e) => {
            if (e.target === videoElement) {
                e.stopPropagation();
            }
        });
    }
    
    // Setup video for first image (How my wife sees me)
    const firstImageContainer = document.querySelector('.square-image-container');
    if (firstImageContainer) {
        setupVideoSwap(firstImageContainer, 'assets/how-wife-sees-me.mp4');
    }
    
    // Setup video for second image (How I see me)
    const allSquareImageContainers = document.querySelectorAll('.square-image-container');
    if (allSquareImageContainers[1]) {
        setupVideoSwap(allSquareImageContainers[1], 'assets/how-i-see-me.mp4');
    }
    
    // Setup video for third image (How my dog sees me)
    if (allSquareImageContainers[2]) {
        setupVideoSwap(allSquareImageContainers[2], 'assets/how-dog-sees-me.mp4');
    }
    
    // --- End Single-Click Video Swap ---
}); 