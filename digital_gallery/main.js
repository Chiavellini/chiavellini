const canvas = document.getElementById("galaxyCanvas");
const ctx = canvas.getContext("2d");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const closeLightbox = document.getElementById("closeLightbox");
const themeToggle = document.getElementById("themeToggle");

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

// Theme management
let isDarkTheme = localStorage.getItem('theme') !== 'light';

const themes = {
  dark: {
    background: '#070d14',
    nodeColor: 'rgba(255, 255, 255, {alpha})',
    connectionColor: 'rgba(200, 200, 200, {alpha})',
    starColor: 'rgba(255, 255, 255, {alpha})',
    starOpacity: 1.0
  },
  light: {
    background: '#e8f1f8',
    nodeColor: 'rgba(0, 0, 0, {alpha})',
    connectionColor: 'rgba(15, 15, 15, {alpha})',
    starColor: 'rgba(100, 120, 140, {alpha})',
    starOpacity: 0.6
  }
};

function getTheme() {
  return isDarkTheme ? themes.dark : themes.light;
}

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  updateThemeUI();
}

function updateThemeUI() {
  const icon = themeToggle.querySelector('.theme-icon');
  
  // Switch between sun image and moon image
  if (isDarkTheme) {
    icon.src = 'art/IMG_0479-removebg-preview.png';
    icon.alt = 'Sun icon';
    icon.classList.add('sun-icon');
    icon.classList.remove('moon-icon');
  } else {
    icon.src = 'art/IMG_0478-removebg-preview.png';
    icon.alt = 'Moon icon';
    icon.classList.add('moon-icon');
    icon.classList.remove('sun-icon');
  }
  
  // Update body class for CSS styling
  if (isDarkTheme) {
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
  }
}

themeToggle.addEventListener('click', toggleTheme);
updateThemeUI();

// 👇 Put your drawings here
const artworks = [
  { src: "art/IMG_0467.jpg", title: "zyn homies", color: "#ff6b6b" },
  { src: "art/IMG_0468.jpg", title: "gran sueño", color: "#ffd43b" },
  { src: "art/IMG_0469.jpg", title: "Mao", color: "#b197fc" },
  { src: "art/IMG_0470.jpg", title: "figura", color: "#51cf66" },
  { src: "art/IMG_0471.jpg", title: "sonder", color: "#ff8787" },
  { src: "art/IMG_0472.jpg", title: "mindChatter", color: "#74c0fc" },
  { src: "art/IMG_0473.jpg", title: "falll", color: "#ffafcc" },
  { src: "art/IMG_0474.jpg", title: "love", color: "#f4a261" },
  { src: "art/IMG_0475.jpg", title: "reverie", color: "#4dd0e1" }
];

const nodes = [];
const NUM_NODES = artworks.length;
const MAX_SPEED = 0.08;
const BASE_RADIUS = 12;

let mouse = { x: -9999, y: -9999, down: false, lastX: 0, lastY: 0 };
let hoveredNodeIndex = null;
let imagesLoaded = 0;
let stars = [];

// Preload images
artworks.forEach(artwork => {
  const img = new Image();
  img.onload = () => {
    imagesLoaded++;
  };
  img.src = artwork.src;
  artwork.image = img;
});

// Create static star field for galaxy background
function createStarField() {
  stars = [];
  const starCount = 50;
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 0.8 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.001 + 0.0005,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
}

createStarField();

// Simple noise function for organic movement
function simpleNoise(x, y, time) {
  const n = Math.sin(x * 0.2 + time) * Math.cos(y * 0.2 + time * 0.7);
  return n * 0.5 + 0.5; // Normalize to 0-1
}

// Draw organic circle with wobble
function drawOrganicCircle(ctx, node, displayRadius, timestamp, segments = 32) {
  const timeOffset = timestamp * node.wobbleSpeed;
  
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Only wobble during/after collision
    let wobbleDeformation = 0;
    if (node.impactIntensity > 0.1) {
      const wobbleAmount = displayRadius * Math.min(node.impactIntensity * 0.025, 0.15); // Max 15%
      
      // Create smooth noise-based deformation
      const noiseX = node.noiseOffsetX + Math.cos(angle) * 30;
      const noiseY = node.noiseOffsetY + Math.sin(angle) * 30;
      
      // Primary wobble
      const noise1 = simpleNoise(noiseX, noiseY, timeOffset);
      const wobble1 = (noise1 - 0.5) * wobbleAmount;
      
      // Secondary wobble with faster frequency
      const noise2 = simpleNoise(noiseX * 0.5, noiseY * 0.5, timeOffset * 1.8);
      const wobble2 = (noise2 - 0.5) * wobbleAmount * 0.4;
      
      wobbleDeformation = wobble1 + wobble2;
    }
    
    // Directional flattening from impacts (only if impact is active)
    let impactDeformation = 0;
    if (node.impactIntensity > 0.1) {
      const impactAngle = Math.atan2(node.impactDirection.y, node.impactDirection.x);
      const angleToImpact = angle - impactAngle;
      const impactAlignment = Math.cos(angleToImpact); // 1 at impact direction, -1 opposite
      
      // Flatten amount capped at 15%
      const deformAmount = Math.min(node.impactIntensity * displayRadius * 0.025, displayRadius * 0.15);
      
      if (impactAlignment > 0.2) {
        // Side facing the impact - flatten it
        impactDeformation = -deformAmount * Math.pow(impactAlignment, 2);
      } else if (impactAlignment < -0.2) {
        // Opposite side - slight bulge
        impactDeformation = deformAmount * 0.4 * Math.pow(-impactAlignment, 1.5);
      }
    }
    
    const r = displayRadius + wobbleDeformation + impactDeformation;
    const x = node.x + Math.cos(angle) * r;
    const y = node.y + Math.sin(angle) * r;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// LocalStorage functions
function loadVisitedNodes() {
  try {
    const visited = localStorage.getItem('visitedNodes');
    return visited ? JSON.parse(visited) : [];
  } catch (e) {
    return [];
  }
}

function saveVisitedNode(artworkSrc) {
  try {
    const visited = loadVisitedNodes();
    if (!visited.includes(artworkSrc)) {
      visited.push(artworkSrc);
      localStorage.setItem('visitedNodes', JSON.stringify(visited));
    }
  } catch (e) {
    console.error('Could not save to localStorage:', e);
  }
}

function createNodes() {
  nodes.length = 0;
  const visitedNodes = loadVisitedNodes();
  
  for (let i = 0; i < NUM_NODES; i++) {
    const angle = (i / NUM_NODES) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.3 + (Math.random() - 0.5) * 60;

    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;

    const nodeRadius = BASE_RADIUS + (Math.random() * 10 - 5);
    const isVisited = visitedNodes.includes(artworks[i].src);
    const node = {
      x,
      y,
      vx: (Math.random() - 0.5) * MAX_SPEED,
      vy: (Math.random() - 0.5) * MAX_SPEED,
      r: nodeRadius,
      filled: isVisited,
      artwork: artworks[i],
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
      wobbleSpeed: 0.003 + Math.random() * 0.002,
      impactIntensity: 0,
      impactDirection: { x: 0, y: 0 },
      collisionPhase: 0 // 0 = free, 1 = approaching, 2 = compressing, 3 = bouncing back
    };
    nodes.push(node);
  }
}

createNodes();

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  createStarField();
  // You could re-call createNodes() here if you want to reposition on resize
}

window.addEventListener("resize", resize);

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function hexToRgba(hex, alpha) {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function handleMouseMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
}

function handleMouseDown(e) {
  mouse.down = true;
  mouse.lastX = e.clientX;
  mouse.lastY = e.clientY;
}

function handleMouseUp() {
  mouse.down = false;
}

function handleClick() {
  if (hoveredNodeIndex !== null) {
    const node = nodes[hoveredNodeIndex];
    node.filled = true;
    saveVisitedNode(node.artwork.src);
    openLightbox(node.artwork);
  }
}

canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("click", handleClick);

function openLightbox(artwork) {
  lightboxImg.src = artwork.src;
  lightboxImg.alt = artwork.title || 'Artwork';
  lightboxCaption.textContent = artwork.title;
  lightbox.classList.remove("hidden");
}

function closeLightboxFn() {
  lightbox.classList.add("hidden");
  lightboxImg.src = "";
  lightboxImg.alt = "";
  lightboxCaption.textContent = "";
}

closeLightbox.addEventListener("click", closeLightboxFn);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    closeLightboxFn();
  }
});

function updateNodes(delta) {
  const verticalPadding = 100; // 100px border on top/bottom
  
  for (const node of nodes) {
    // Apply movement first
    node.x += node.vx * delta;
    node.y += node.vy * delta;

    let hitWall = false;
    let wallDirection = { x: 0, y: 0 };
    
    // Check and handle collisions - horizontal (account for node radius)
    if (node.x <= node.r) {
      node.x = node.r;
      node.vx = Math.abs(node.vx) * 0.75; // Bounce back
      node.impactIntensity = 6;
      wallDirection.x = -1;
      hitWall = true;
    } else if (node.x >= width - node.r) {
      node.x = width - node.r;
      node.vx = -Math.abs(node.vx) * 0.75; // Bounce back
      node.impactIntensity = 6;
      wallDirection.x = 1;
      hitWall = true;
    }
    
    // Check and handle collisions - vertical (account for node radius + padding)
    if (node.y <= verticalPadding + node.r) {
      node.y = verticalPadding + node.r;
      node.vy = Math.abs(node.vy) * 0.75; // Bounce back
      node.impactIntensity = Math.max(node.impactIntensity, 6);
      wallDirection.y = -1;
      hitWall = true;
    } else if (node.y >= height - verticalPadding - node.r) {
      node.y = height - verticalPadding - node.r;
      node.vy = -Math.abs(node.vy) * 0.75; // Bounce back
      node.impactIntensity = Math.max(node.impactIntensity, 6);
      wallDirection.y = 1;
      hitWall = true;
    }
    
    if (hitWall) {
      node.impactDirection = wallDirection;
      node.collisionPhase = 2; // Collision moment
    }
    
    // Gradual decay of impact after collision - reduce by 0.1 per second
    if (node.impactIntensity > 0.1) {
      node.impactIntensity -= 0.1 * (delta / 1000); // Reduce by 0.1 per second
      if (node.impactIntensity < 0) node.impactIntensity = 0;
      node.collisionPhase = 3; // Recovery phase
    } else {
      node.impactIntensity = 0;
      node.impactDirection = { x: 0, y: 0 };
      node.collisionPhase = 0;
    }

    // Slight drag behavior when dragging the mouse
    if (mouse.down) {
      const dx = mouse.x - mouse.lastX;
      const dy = mouse.y - mouse.lastY;
      node.x += dx * 0.02;
      node.y += dy * 0.02;
    }
  }
  mouse.lastX = mouse.x;
  mouse.lastY = mouse.y;
}

function findHoveredNode() {
  hoveredNodeIndex = null;
  const mousePos = { x: mouse.x, y: mouse.y };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const d = distance(node, mousePos);
    if (d < node.r + 8) {
      hoveredNodeIndex = i;
      break;
    }
  }
}

let lastTime = 0;

function animate(timestamp) {
  const delta = lastTime ? timestamp - lastTime : 16;
  lastTime = timestamp;

  ctx.clearRect(0, 0, width, height);

  const theme = getTheme();

  // Background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  // Draw galaxy star field with subtle twinkling
  for (const star of stars) {
    const twinkle = Math.sin(timestamp * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
    const opacity = star.opacity * twinkle * theme.starOpacity;
    ctx.fillStyle = theme.starColor.replace('{alpha}', opacity);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  updateNodes(delta);
  findHoveredNode();

  // Draw connections (always connected)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const ni = nodes[i];
      const nj = nodes[j];
      const d = distance(ni, nj);
      
      const isConnectedToHover =
        hoveredNodeIndex !== null &&
        (i === hoveredNodeIndex || j === hoveredNodeIndex);

      // Calculate alpha based on distance for visual depth
      const maxDist = Math.sqrt(width * width + height * height);
      const strength = 1 - (d / maxDist);
      const alpha = 0.1 + strength * 0.3;

      if (isConnectedToHover) {
        const hoverAlpha = Math.min(alpha * 2.8, 0.9);
        ctx.strokeStyle = theme.connectionColor.replace('{alpha}', hoverAlpha);
        ctx.lineWidth = (0.5 + strength * 0.5) * 2.5; // Bolder on hover
      } else {
        ctx.strokeStyle = theme.connectionColor.replace('{alpha}', alpha * 0.6);
        ctx.lineWidth = 0.5 + strength * 0.5; // Thicker normal state
      }

      // Calculate connection points at the border of each node
      const dx = nj.x - ni.x;
      const dy = nj.y - ni.y;
      const angle = Math.atan2(dy, dx);
      
      const iRadius = (hoveredNodeIndex === i) ? ni.r * 1.2 : ni.r;
      const jRadius = (hoveredNodeIndex === j) ? nj.r * 1.2 : nj.r;
      
      const startX = ni.x + Math.cos(angle) * iRadius;
      const startY = ni.y + Math.sin(angle) * iRadius;
      const endX = nj.x - Math.cos(angle) * jRadius;
      const endY = nj.y - Math.sin(angle) * jRadius;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  // Draw nodes with organic wobble
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isHovered = i === hoveredNodeIndex;
    const displayRadius = isHovered ? node.r * 1.2 : node.r;

    drawOrganicCircle(ctx, node, displayRadius, timestamp);
    
    if (node.filled) {
      // Filled dot
      const alpha = isHovered ? 1 : 0.9;
      ctx.fillStyle = theme.nodeColor.replace('{alpha}', alpha);
      ctx.fill();
    } else {
      // Hollow bordered ball
      ctx.strokeStyle = theme.nodeColor.replace('{alpha}', isHovered ? 1 : 0.9);
      ctx.lineWidth = isHovered ? 1.8 : 1.2; // Thicker borders
      ctx.stroke();
    }
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

