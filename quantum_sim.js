/*
 * quantum_sim.js
 *
 * A simple educational visualization of "quantum" particles interacting
 * with one another. This simulation uses the p5.js library to draw
 * particles on the canvas and compute forces between them using a
 * Coulomb‑like inverse‑square law. Positive charges are shown in red,
 * negative charges in blue, and interaction lines illustrate forces
 * between the particles. The simulation is intentionally simplified
 * to highlight concepts rather than provide an exact quantum mechanical
 * treatment.
 */

// Number of particles in the simulation. Feel free to adjust to see
// how many objects you can comfortably animate on your device.
const NUM_PARTICLES = 20;

// Strength of the Coulomb‑like interaction. Larger values lead to
// stronger forces and faster movement. Keep this moderate for
// stability.
const COULOMB_CONSTANT = 500;

// Minimum distance squared between particles to avoid extremely
// large forces when two particles get very close. Without this
// precaution the simulation can become unstable.
const MIN_DIST_SQ = 25;

// Interaction range beyond which lines are not drawn between
// particles. Larger values will draw more lines and may clutter
// the visualization. The force law still applies beyond this range.
const LINE_RANGE = 200;

// Particle class encapsulating position, velocity, and charge.
class Particle {
  constructor(x, y, vx, vy, charge) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0);
    this.charge = charge; // either +1 or -1
  }

  // Reset acceleration at the start of each frame
  resetForce() {
    this.acc.set(0, 0);
  }

  // Apply a force to this particle (Newton's second law: F = ma,
  // here m is assumed to be 1 for simplicity)
  applyForce(force) {
    this.acc.add(force);
  }

  // Integrate the particle's motion using a simple Euler step.
  // dt is the time step in seconds.
  update(dt) {
    // Update velocity and position
    this.vel.add(p5.Vector.mult(this.acc, dt));
    this.pos.add(p5.Vector.mult(this.vel, dt));

    // Constrain particles to the canvas by bouncing off the edges
    if (this.pos.x < 0 || this.pos.x > width) {
      this.vel.x *= -1;
      this.pos.x = constrain(this.pos.x, 0, width);
    }
    if (this.pos.y < 0 || this.pos.y > height) {
      this.vel.y *= -1;
      this.pos.y = constrain(this.pos.y, 0, height);
    }
  }

  // Draw the particle on the canvas
  draw() {
    noStroke();
    // Color particles based on their charge
    if (this.charge > 0) {
      fill(255, 80, 80); // red for positive
    } else {
      fill(80, 80, 255); // blue for negative
    }
    ellipse(this.pos.x, this.pos.y, 10, 10);
  }
}

// Global array of particles
let particles = [];

// p5.js setup function; called once when the sketch starts
function setup() {
  // Create a canvas that fills the browser window
  createCanvas(windowWidth, windowHeight);
  // Initialize particles with random positions, velocities and charges
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const x = random(width);
    const y = random(height);
    const vx = random(-50, 50);
    const vy = random(-50, 50);
    // Assign half of the particles positive charge and half negative
    const charge = i % 2 === 0 ? 1 : -1;
    particles.push(new Particle(x, y, vx, vy, charge));
  }
}

// p5.js draw function; called every frame (~60 times per second)
function draw() {
  // Dark semi‑transparent background to create motion trails
  background(0, 0, 0, 50);

  const dt = deltaTime / 1000; // Convert milliseconds to seconds

  // Reset forces before calculating new ones
  for (let p of particles) {
    p.resetForce();
  }

  // Compute pairwise forces between particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      // Vector pointing from p1 to p2
      const direction = p5.Vector.sub(p2.pos, p1.pos);
      const distSq = max(direction.magSq(), MIN_DIST_SQ);
      const dist = sqrt(distSq);
      // Normalized direction
      const forceDir = direction.copy().div(dist);
      // Coulomb‑like force magnitude (charge product over distance squared)
      const forceMag = (COULOMB_CONSTANT * p1.charge * p2.charge) / distSq;
      // Compute the force vector
      const force = forceDir.copy().mult(forceMag);
      // Apply equal and opposite forces to each particle
      p1.applyForce(p5.Vector.mult(force, 1));
      p2.applyForce(p5.Vector.mult(force, -1));

      // Draw a line between particles if within range. The
      // transparency and thickness scale with the interaction strength.
      if (dist < LINE_RANGE) {
        const alpha = map(abs(forceMag), 0, COULOMB_CONSTANT / (MIN_DIST_SQ), 50, 200, true);
        strokeWeight(1.5);
        // Use purple hue for attraction and green hue for repulsion
        if (p1.charge * p2.charge > 0) {
          // repulsive (same charge) – use green
          stroke(0, 255, 150, alpha);
        } else {
          // attractive (opposite charges) – use purple
          stroke(200, 100, 255, alpha);
        }
        line(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
      }
    }
  }

  // Update particle positions based on computed forces
  for (let p of particles) {
    p.update(dt);
    p.draw();
  }
}

// Resize the canvas when the browser window changes
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}