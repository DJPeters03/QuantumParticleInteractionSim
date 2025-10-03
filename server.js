const http = require('http');
const fs = require('fs');
const path = require('path');

/*
 * Simple HTTP server written using Node's built‑in `http` module.  This server
 * exposes two routes:
 *
 *   1. GET `/` or `/index.html` – serves a static HTML page.  The page uses
 *      vanilla JavaScript on the front end to visualise a toy “quantum
 *      universe”.  You can open it in a browser to interact with the model.
 *
 *   2. POST `/simulate` – accepts a JSON body describing an array of bodies
 *      (each with `mass`, `x`, `y`, `vx` and `vy`) along with simulation
 *      parameters (`dt` and `steps`).  It returns an array of positions at
 *      each simulation step.  The gravitational calculations are based on
 *      Newton’s law of universal gravitation, which states that every
 *      particle attracts every other particle with a force proportional to
 *      the product of their masses and inversely proportional to the square
 *      of the distance between them【134279613549064†L354-L375】.  We add a
 *      small, optional random “quantum” perturbation to each step to mimic
 *      uncertainty.
 */

// Scaled gravitational constant to make the simulation visually interesting.
// In real physics the universal gravitational constant G ≈ 6.674×10⁻¹¹ N·m²/kg²
//【134279613549064†L354-L375】, but such a small value results in almost no
// movement at human scales.  Here we use a much larger value to exaggerate
// the gravitational attraction.
const G = 1.0;

/**
 * Compute the trajectory of multiple bodies under mutual gravitation.
 *
 * @param {Array<Object>} bodies Array of objects with keys: mass, x, y, vx, vy
 * @param {number} dt Time step for each iteration
 * @param {number} steps Number of iterations to compute
 * @param {number} jitter Amplitude of random jitter to apply each step
 * @returns {Array<Array<{x:number,y:number}>>} Positions of bodies at each step
 */
function simulate(bodies, dt, steps, jitter = 0.0) {
  // Deep copy the bodies to avoid mutating caller’s data
  const state = bodies.map(b => ({
    mass: b.mass,
    x: b.x,
    y: b.y,
    vx: b.vx,
    vy: b.vy
  }));
  const trajectories = [];
  for (let step = 0; step < steps; step++) {
    // Compute pairwise forces
    const forces = state.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < state.length; i++) {
      for (let j = i + 1; j < state.length; j++) {
        const dx = state[j].x - state[i].x;
        const dy = state[j].y - state[i].y;
        const distSq = dx * dx + dy * dy + 1e-8; // avoid division by zero
        const dist = Math.sqrt(distSq);
        // Newtonian gravitational force magnitude
        const forceMag = (G * state[i].mass * state[j].mass) / distSq;
        const fx = forceMag * (dx / dist);
        const fy = forceMag * (dy / dist);
        forces[i].x += fx;
        forces[i].y += fy;
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }
    // Update velocities and positions
    for (let i = 0; i < state.length; i++) {
      const ax = forces[i].x / state[i].mass;
      const ay = forces[i].y / state[i].mass;
      state[i].vx += ax * dt;
      state[i].vy += ay * dt;
      state[i].x += state[i].vx * dt + (Math.random() - 0.5) * jitter;
      state[i].y += state[i].vy * dt + (Math.random() - 0.5) * jitter;
    }
    // Record positions for this step
    trajectories.push(state.map(b => ({ x: b.x, y: b.y })));
  }
  return trajectories;
}

/**
 * Helper to serve static files from the `public` directory.
 */
function serveStaticFile(req, res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    // Serve the main HTML file
    const indexPath = path.join(__dirname, 'index.html');
    serveStaticFile(req, res, indexPath, 'text/html; charset=utf-8');
  } else if (req.method === 'GET' && pathname.startsWith('/assets/')) {
    // Serve any assets (e.g. images or JS files) under /assets/
    const assetPath = path.join(__dirname, pathname);
    const ext = path.extname(assetPath).toLowerCase();
    const typeMap = { '.js': 'application/javascript', '.css': 'text/css' };
    const contentType = typeMap[ext] || 'application/octet-stream';
    serveStaticFile(req, res, assetPath, contentType);
  } else if (req.method === 'POST' && pathname === '/simulate') {
    // Handle simulation requests
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const bodies = payload.bodies || [];
        const dt = typeof payload.dt === 'number' ? payload.dt : 0.1;
        const steps = typeof payload.steps === 'number' ? payload.steps : 100;
        const jitter = typeof payload.jitter === 'number' ? payload.jitter : 0.0;
        const result = simulate(bodies, dt, steps, jitter);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ positions: result }));
      } catch (e) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Invalid JSON payload');
      }
    });
  } else {
    // Not found
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quantum universe simulation server running on http://localhost:${PORT}`);
});