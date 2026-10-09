/**
 * 3D N-Body Orbital Mechanics & Antigravity Physics Engine
 * Implements softened Newtonian gravity with symplectic Euler-Cromer integration,
 * dynamic Antigravity state toggling (G -> -G), and optional inelastic collisions.
 */

export class PhysicsEngine {
  constructor(options = {}) {
    this.G_INITIAL = options.G ?? 1.0;
    this.G = this.G_INITIAL;
    this.softening = options.softening ?? 0.1;
    this.dt = options.dt ?? 0.01;
    this.substeps = options.substeps ?? 1;
    this.collisionMerging = options.collisionMerging ?? false;
    this.autoToggleStep = options.autoToggleStep ?? 500;
    this.autoToggleEnabled = options.autoToggleEnabled ?? true;

    this.stepCount = 0;
    this.simulationTime = 0.0;
    this.isAntigravityActive = false;

    this.bodies = [];
    this.initialStateSnapshot = [];
    
    // Recording history for scrubber & export [step][bodyIndex][3]
    this.history = [];
    this.maxHistorySteps = options.maxHistorySteps ?? 2000;
    this.isRecording = true;

    // Listeners
    this.onStateToggleCallbacks = [];
    this.onCollisionCallbacks = [];
  }

  onStateToggle(callback) {
    this.onStateToggleCallbacks.push(callback);
  }

  onCollision(callback) {
    this.onCollisionCallbacks.push(callback);
  }

  setBodies(bodiesData) {
    this.bodies = bodiesData.map((b, idx) => ({
      id: b.id ?? `body_${idx}_${Date.now()}`,
      name: b.name ?? `Body ${idx}`,
      mass: Number(b.mass),
      pos: [...b.pos],
      vel: [...b.vel],
      acc: [0, 0, 0],
      color: b.color ?? '#ffffff',
      size: b.size ?? 6,
      radius: b.radius ?? (b.size ? b.size * 0.15 : 0.6),
      isCentral: b.isCentral ?? (idx === 0 && b.mass > 100)
    }));

    // Store deep copy for reset
    this.initialStateSnapshot = JSON.parse(JSON.stringify(this.bodies));
    this.resetState();
  }

  resetState() {
    this.stepCount = 0;
    this.simulationTime = 0.0;
    this.G = this.G_INITIAL;
    this.isAntigravityActive = this.G < 0;
    this.history = [];

    // Clone back from snapshot
    this.bodies = JSON.parse(JSON.stringify(this.initialStateSnapshot));
    for (const b of this.bodies) {
      b.acc = [0, 0, 0];
    }

    this.recordHistoryFrame();
  }

  toggleAntigravity() {
    this.G = -this.G;
    this.isAntigravityActive = this.G < 0;
    this.onStateToggleCallbacks.forEach(cb => cb(this.isAntigravityActive, this.G));
  }

  setG(value) {
    this.G = Number(value);
    const wasActive = this.isAntigravityActive;
    this.isAntigravityActive = this.G < 0;
    if (wasActive !== this.isAntigravityActive) {
      this.onStateToggleCallbacks.forEach(cb => cb(this.isAntigravityActive, this.G));
    }
  }

  recordHistoryFrame() {
    if (!this.isRecording) return;
    const frame = this.bodies.map(b => ({
      id: b.id,
      name: b.name,
      pos: [b.pos[0], b.pos[1], b.pos[2]],
      vel: [b.vel[0], b.vel[1], b.vel[2]],
      mass: b.mass
    }));
    this.history.push({
      step: this.stepCount,
      time: this.simulationTime,
      G: this.G,
      bodies: frame
    });
    if (this.history.length > this.maxHistorySteps) {
      this.history.shift();
    }
  }

  /**
   * Performs one simulation tick comprising `substeps` semi-implicit integration steps.
   */
  tick() {
    const subDt = this.dt / this.substeps;

    for (let s = 0; s < this.substeps; s++) {
      // Auto-toggle check at exact step (only on the primary step boundary)
      if (s === 0 && this.autoToggleEnabled && this.stepCount === this.autoToggleStep) {
        this.toggleAntigravity();
      }

      this.computeAccelerations();
      this.integrateEulerCromer(subDt);

      if (this.collisionMerging) {
        this.resolveCollisions();
      }
    }

    this.stepCount++;
    this.simulationTime += this.dt;
    this.recordHistoryFrame();
  }

  /**
   * Softened Newtonian pair-wise gravitational acceleration:
   * a_i = G * sum_{j != i} m_j * (r_j - r_i) / (|r_j - r_i|^2 + eps^2)^(3/2)
   */
  computeAccelerations() {
    const n = this.bodies.length;
    const eps2 = this.softening * this.softening;
    const G = this.G;

    // Reset accelerations
    for (let i = 0; i < n; i++) {
      this.bodies[i].acc[0] = 0;
      this.bodies[i].acc[1] = 0;
      this.bodies[i].acc[2] = 0;
    }

    // Pairwise interactions (Newton's 3rd Law optimization)
    for (let i = 0; i < n; i++) {
      const b1 = this.bodies[i];
      const p1 = b1.pos;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.bodies[j];
        const p2 = b2.pos;

        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];

        const distSq = dx * dx + dy * dy + dz * dz;
        const softenedCubic = Math.pow(distSq + eps2, 1.5);
        const invCubic = 1.0 / softenedCubic;

        // Force factor per unit mass
        const factor = G * invCubic;

        // a_i += G * m_j * r_ij / dist3
        const f1 = factor * b2.mass;
        b1.acc[0] += dx * f1;
        b1.acc[1] += dy * f1;
        b1.acc[2] += dz * f1;

        // a_j -= G * m_i * r_ij / dist3 (Newton's 3rd law: -r_ij = r_ji)
        const f2 = factor * b1.mass;
        b2.acc[0] -= dx * f2;
        b2.acc[1] -= dy * f2;
        b2.acc[2] -= dz * f2;
      }
    }
  }

  /**
   * Semi-Implicit Euler-Cromer:
   * v(t + dt) = v(t) + a(t) * dt
   * r(t + dt) = r(t) + v(t + dt) * dt
   * Symplectic: preserves phase space volume and Keplerian stability.
   */
  integrateEulerCromer(subDt) {
    const n = this.bodies.length;
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      // Velocity update first
      b.vel[0] += b.acc[0] * subDt;
      b.vel[1] += b.acc[1] * subDt;
      b.vel[2] += b.acc[2] * subDt;

      // Position update with new velocity
      b.pos[0] += b.vel[0] * subDt;
      b.pos[1] += b.vel[1] * subDt;
      b.pos[2] += b.vel[2] * subDt;
    }
  }

  /**
   * Inelastic collision merging (Extension #1 from spec):
   * When |r_ij| < r_i + r_j, merge into single body conserving mass & linear momentum:
   * v_new = (m1 * v1 + m2 * v2) / (m1 + m2)
   */
  resolveCollisions() {
    let merged = false;
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b1 = this.bodies[i];
        const b2 = this.bodies[j];

        const dx = b2.pos[0] - b1.pos[0];
        const dy = b2.pos[1] - b1.pos[1];
        const dz = b2.pos[2] - b1.pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const mergeThreshold = (b1.radius + b2.radius) * 0.8;

        if (dist < mergeThreshold) {
          // Merge b2 into b1
          const totalMass = b1.mass + b2.mass;
          // Center of mass position
          b1.pos[0] = (b1.pos[0] * b1.mass + b2.pos[0] * b2.mass) / totalMass;
          b1.pos[1] = (b1.pos[1] * b1.mass + b2.pos[1] * b2.mass) / totalMass;
          b1.pos[2] = (b1.pos[2] * b1.mass + b2.pos[2] * b2.mass) / totalMass;

          // Conservation of linear momentum
          b1.vel[0] = (b1.vel[0] * b1.mass + b2.vel[0] * b2.mass) / totalMass;
          b1.vel[1] = (b1.vel[1] * b1.mass + b2.vel[1] * b2.mass) / totalMass;
          b1.vel[2] = (b1.vel[2] * b1.mass + b2.vel[2] * b2.mass) / totalMass;

          // Volume conservation for new radius: V = 4/3 pi r^3 => r ~ cbrt(r1^3 + r2^3)
          b1.radius = Math.cbrt(Math.pow(b1.radius, 3) + Math.pow(b2.radius, 3));
          b1.size = Math.max(b1.size, b2.size) * 1.15;
          b1.mass = totalMass;
          b1.name = `${b1.name} + ${b2.name}`;

          this.onCollisionCallbacks.forEach(cb => cb(b1, b2));

          // Remove b2
          this.bodies.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  /**
   * Computes system telemetry:
   * Kinetic energy: E_k = 1/2 sum m_i |v_i|^2
   * Gravitational potential energy: E_p = - sum_{i<j} G m_i m_j / sqrt(r_ij^2 + eps^2)
   * Center of mass position & velocity
   */
  getTelemetry() {
    let kineticEnergy = 0.0;
    let potentialEnergy = 0.0;
    let totalMass = 0.0;
    let cmPos = [0, 0, 0];
    let cmVel = [0, 0, 0];
    const n = this.bodies.length;
    const eps2 = this.softening * this.softening;

    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      const m = b.mass;
      totalMass += m;

      const vSq = b.vel[0] * b.vel[0] + b.vel[1] * b.vel[1] + b.vel[2] * b.vel[2];
      kineticEnergy += 0.5 * m * vSq;

      cmPos[0] += b.pos[0] * m;
      cmPos[1] += b.pos[1] * m;
      cmPos[2] += b.pos[2] * m;

      cmVel[0] += b.vel[0] * m;
      cmVel[1] += b.vel[1] * m;
      cmVel[2] += b.vel[2] * m;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.bodies[j];
        const dx = b2.pos[0] - b.pos[0];
        const dy = b2.pos[1] - b.pos[1];
        const dz = b2.pos[2] - b.pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
        // Potential energy V_ij = - G * m_i * m_j / dist
        potentialEnergy -= (this.G * m * b2.mass) / dist;
      }
    }

    if (totalMass > 0) {
      cmPos[0] /= totalMass;
      cmPos[1] /= totalMass;
      cmPos[2] /= totalMass;

      cmVel[0] /= totalMass;
      cmVel[1] /= totalMass;
      cmVel[2] /= totalMass;
    }

    const totalEnergy = kineticEnergy + potentialEnergy;

    return {
      step: this.stepCount,
      time: this.simulationTime,
      G: this.G,
      isAntigravityActive: this.isAntigravityActive,
      totalMass,
      kineticEnergy,
      potentialEnergy,
      totalEnergy,
      cmPos,
      cmVel,
      bodyCount: n
    };
  }

  addBody(bodyData) {
    const newBody = {
      id: bodyData.id ?? `body_custom_${Date.now()}`,
      name: bodyData.name ?? `Planet ${this.bodies.length + 1}`,
      mass: Number(bodyData.mass ?? 1.0),
      pos: [...(bodyData.pos ?? [0, 0, 0])],
      vel: [...(bodyData.vel ?? [0, 0, 0])],
      acc: [0, 0, 0],
      color: bodyData.color ?? '#38bdf8',
      size: bodyData.size ?? 6,
      radius: bodyData.radius ?? 0.6,
      isCentral: bodyData.isCentral ?? false
    };
    this.bodies.push(newBody);
    return newBody;
  }

  removeBody(id) {
    const idx = this.bodies.findIndex(b => b.id === id);
    if (idx !== -1) {
      return this.bodies.splice(idx, 1)[0];
    }
    return null;
  }

  updateBody(id, params) {
    const body = this.bodies.find(b => b.id === id);
    if (!body) return null;
    if (params.mass !== undefined) body.mass = Number(params.mass);
    if (params.color !== undefined) body.color = params.color;
    if (params.name !== undefined) body.name = params.name;
    if (params.pos !== undefined) body.pos = [...params.pos];
    if (params.vel !== undefined) body.vel = [...params.vel];
    return body;
  }
}
