const canvas = document.getElementById('plantCanvas');
const ctx = canvas.getContext('2d');
const initialBud = document.getElementById('initialBud');
const wateringContainer = document.querySelector('.watering-container');
const waterDrops = document.querySelector('.water-drops');

// Get the device pixel ratio
const dpr = window.devicePixelRatio || 1;

// Ensure initialBud has full opacity at the start
initialBud.style.opacity = '1';

// Add a class with slower transition when needed
function addSlowerTransition() {
    wateringContainer.style.transition = 'transform 2.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1s ease';
}

function resizeCanvas() {
    // Get the size of the canvas in CSS pixels
    const rect = canvas.getBoundingClientRect();

    // Set the canvas drawing buffer size in device pixels
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Reset any existing transforms to avoid cumulative scaling issues (especially on mobile)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale the context to ensure correct drawing size
    ctx.scale(dpr, dpr);

    // Ensure the canvas style size matches the layout size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
}

resizeCanvas();
let baseSize = { width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height }; // Use rect size
window.addEventListener('resize', () => {
    resizeCanvas();
    if (!animationStarted) {
        baseSize = { width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height }; // Use rect size
    }
});

let branches = [];
let seeds = [];
let animationStarted = false;
let treeCount = 0; // Counter to track the number of trees
const MAX_TREES = 100; // Maximum number of trees allowed

// New unified event handler for both click and touchend events
function handleWatering(event) {
    event.preventDefault();
    if (animationStarted) return;
    animationStarted = true;
    
    // Disable hover animation by adding a class
    wateringContainer.classList.add('no-hover');
    
    // Apply slower transition before adding the pouring class
    addSlowerTransition();
    
    // Add pouring class to start the watering animation
    wateringContainer.classList.add('pouring');
    
    // Start at the bud's position
    const budRect = initialBud.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const startX = (budRect.left - canvasRect.left + budRect.width / 2);
    const startY = (budRect.top - canvasRect.top + budRect.height / 2);
    
    // Reduce the animation duration for water droplets
    const drops = document.querySelectorAll('.drop');
    drops.forEach(drop => {
        drop.style.animationDuration = '0.7s';
    });
    
    // Wait for the water animation to complete, then start growth
    setTimeout(() => {
        // Stop the water animation by removing the pouring class
        wateringContainer.classList.remove('pouring');
        
        // Re-measure the bud's position right before growing
        const budRect = initialBud.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const freshStartX = (budRect.left - canvasRect.left + budRect.width / 2);
        const freshStartY = (budRect.top - canvasRect.top + budRect.height / 2);
        startGrowth(freshStartX, freshStartY);
        
        // Wait for the plant to start growing before fading out the watering can
        setTimeout(() => {
            // Add fade-out class to the watering can
            wateringContainer.classList.add('fade-out');
            
            // Add a smooth transition for the initialBud
            initialBud.style.transition = 'opacity 1.5s ease-in-out';
            initialBud.style.opacity = '0';
            
            // Wait for fade-out to complete before hiding
            setTimeout(() => {
                wateringContainer.style.display = 'none';
                initialBud.style.display = 'none';
                
                // Wait an additional 1 second before removing the dead space
                setTimeout(() => {
                    // Get the social-links element and adjust its margin to remove dead space
                    const socialLinks = document.querySelector('.social-links');
                    if (socialLinks) {
                        // Add a transition for smooth animation
                        socialLinks.style.transition = 'margin-bottom 1.5s ease-in-out';
                        // After a small delay to ensure transition is applied
                        setTimeout(() => {
                            socialLinks.style.marginBottom = '0.45rem';
                        }, 50);
                    }
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1500);
}

wateringContainer.addEventListener('click', handleWatering, { once: true });
wateringContainer.addEventListener('touchend', handleWatering, { once: true });

class Branch {
    constructor(startX, startY, length, angle, branchWidth, depth) {
        this.startX = startX;
        this.startY = startY;
        this.length = length;
        this.angle = angle;
        this.branchWidth = branchWidth; // Keep width relative to CSS pixels for visual consistency
        this.depth = depth;
        this.grown = 0;
        this.finished = false;
        this.floweringProgress = 0;
        this.flowered = false;
        this.flowerColor = `hsl(${Math.random() * 360}, 70%, 85%)`;
        this.flowerPosition = 0.6 + Math.random() * 0.4; // Between 60% and 100% of branch length
    }

    update() {
        if (this.grown < this.length) {
            // Adjust growth speed based on scaled length
            this.grown += (this.length / 150);
        } else if (!this.finished && this.depth > 0) {
            const branchesCount = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < branchesCount; i++) {
                const newAngle = this.angle + (Math.random() * 60 - 30);
                const newLength = this.length * (0.9 + Math.random() * 0.2);
                const newWidth = this.branchWidth * 0.75;
                // Calculate new start positions in CSS pixels (context already scaled)
                const newStartX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length;
                const newStartY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length;

                branches.push(new Branch(
                    newStartX,
                    newStartY,
                    newLength,
                    newAngle, newWidth, this.depth - 1
                ));
            }
            this.finished = true;
        }

        if (this.depth <= 2 && !this.flowered && this.grown >= this.length && Math.random() > 0.7) {
            this.flowered = true;
            this.startFlowering();
        }

        this.draw();
    }

    startFlowering() {
        if (this.floweringProgress < 1) {
            this.floweringProgress += 0.01;
            setTimeout(() => this.startFlowering(), 100);
        } else {
            setTimeout(() => {
                // Calculate seed position in CSS pixels (context is already scaled)
                const seedX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
                const seedY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
                seeds.push(new Seed(seedX, seedY));
            }, 1000 + Math.random() * 5000);
        }
    }

    draw() {
        ctx.lineWidth = this.branchWidth; // Use original width
        ctx.strokeStyle = '#8fb996';
        ctx.beginPath();
        // Draw in scaled coordinates
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(
            this.startX + Math.sin(this.angle * Math.PI / 180) * -this.grown,
            this.startY + Math.cos(this.angle * Math.PI / 180) * -this.grown
        );
        ctx.stroke();

        // Only draw flowers when floweringProgress is greater than 0
        if (this.floweringProgress > 0) {
            // Calculate flower position in scaled coordinates
            const flowerX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            const flowerY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            ctx.fillStyle = this.flowerColor;
            ctx.beginPath();

            // Calculate flower size based on three stages - keep visual size consistent
            let flowerSize;
            if (this.floweringProgress < 0.33) {
                flowerSize = 1.5 + (1.5 * (this.floweringProgress / 0.33));
            } else if (this.floweringProgress < 0.66) {
                flowerSize = 3 + (1.5 * ((this.floweringProgress - 0.33) / 0.33));
            } else {
                flowerSize = 4.5 + (1.5 * ((this.floweringProgress - 0.66) / 0.34));
            }

            // Draw flower arc in scaled coordinates but use visually consistent size
            ctx.arc(flowerX, flowerY, flowerSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Seed {
    constructor(x, y) {
        // Store coordinates directly as CSS pixels
        this.x = x;
        this.y = y;
        this.vx = (Math.random() * 2 - 1); // Keep velocity relative to CSS pixels
        this.speed = (Math.random() * 1 + 0.5); // Keep speed relative to CSS pixels
        this.planted = false;
        this.hasCheckedGrowth = false;
    }

    update() {
        // Check against scaled canvas height
        if (this.y < canvas.getBoundingClientRect().height) {
            this.x += this.vx;
            this.y += this.speed;
        } else if (!this.planted && !this.hasCheckedGrowth) {
            this.hasCheckedGrowth = true;
            // Only create a new branch if we haven't reached the maximum number of trees
            if (Math.random() < 0.02 && treeCount < MAX_TREES) {
                // Provide coordinates in CSS pixels for the Branch constructor
                const branchStartX = this.x;
                const branchStartY = canvas.getBoundingClientRect().height; // Start at bottom in CSS pixels
                const branchLength = canvas.getBoundingClientRect().height / 6; // Use CSS pixel length

                branches.push(new Branch(branchStartX, branchStartY, branchLength, 0, 8, 5));
                treeCount++; // Increment the tree counter
            }
            this.planted = true;
        }
        this.draw();
    }

    draw() {
        ctx.fillStyle = '#c9a07a';
        ctx.beginPath();
        // Draw arc in scaled coordinates, use visually consistent size
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animate() {
    // Save the current context state (including the scale)
    ctx.save();
    // Reset the transform to identity for clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Clear the canvas with the background color
    ctx.fillStyle = '#fbf8ef'; // match the body background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Restore the context state (including the scale)
    ctx.restore();

    // Update and draw branches and seeds (which use the scaled context)
    branches.forEach(branch => branch.update());
    seeds.forEach(seed => seed.update());
    requestAnimationFrame(animate);
}

// Updated startGrowth function to use canvas.height directly for consistent measurements
function startGrowth(startX, startY) {
    const offsetY = 5; // optional offset
    const finalStartX = startX; // use as-is in CSS pixels
    const finalStartY = startY + offsetY;

    // Compute canvas height in CSS pixels
    const cssCanvasHeight = canvas.height / dpr;

    // Create the upward growing branch using canvas.height
    const upBranchLength = cssCanvasHeight / 7.5;
    branches.push(new Branch(finalStartX, finalStartY, upBranchLength, 0, 10, 7));
    treeCount++; // Increment tree counter for the main upward branch

    // Create the downward growing branch (root) using canvas.height
    let rootBranchLength = cssCanvasHeight - finalStartY;
    // Clamp the root branch length so it never goes below 50px
    if (rootBranchLength < 50) {
      rootBranchLength = 50;
    }
    const rootBranch = new Branch(finalStartX, finalStartY, rootBranchLength, 180, 10, 0);
    // Prevent the root from flowering
    rootBranch.floweringProgress = -1;
    rootBranch.flowered = true;
    branches.push(rootBranch);

    animate();
}