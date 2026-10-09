/**
 * 3D WebGL Visualization Engine using Three.js
 * Hardware-accelerated rendering matching modern Dark UI tokens (#0B0F19, #1E293B),
 * glowing celestial bodies, dynamic trajectory ribbons, and Antigravity shockwaves.
 */

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

export class SimulationRenderer3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Body visual objects map: id -> { mesh, glowMesh, trailLine, trailPoints, velArrow }
    this.bodyVisuals = new Map();

    // Scene helpers
    this.gridHelper = null;
    this.starfield = null;
    this.shockwaves = []; // Array of expanding shockwave meshes
    this.followTargetId = null; // ID of body to lock camera to, or null

    // Options
    this.maxTrailLength = 400;
    this.showTrails = true;
    this.showGrid = true;
    this.showVelocities = false;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121214);
    this.scene.fog = new THREE.FogExp2(0x121214, 0.0035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    this.camera.position.set(0, -35, 30);
    this.camera.up.set(0, 0, 1); // Z is "up" in 3D physics coords

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 600;
    this.controls.minDistance = 2;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.PointLight(0xffffff, 2.5, 300, 0.5);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    const dirLight = new THREE.DirectionalLight(0xa5b4fc, 0.5);
    dirLight.position.set(30, 40, 50);
    this.scene.add(dirLight);

    // 6. Environment (Grid & Starfield)
    this.createGrid();
    this.createStarfield();

    // 7. Window resize handler
    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGrid() {
    // 3D coordinate grid plane on XY (Z=0)
    const size = 120;
    const divisions = 24;
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x0a84ff, 0x2c2c2e);
    this.gridHelper.rotation.x = Math.PI / 2; // Orient along XY plane with Z perpendicular
    this.gridHelper.position.z = 0;
    this.scene.add(this.gridHelper);
  }

  createStarfield() {
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 300 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const tint = 0.8 + Math.random() * 0.2;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint * (0.85 + Math.random() * 0.15);
      colors[i * 3 + 2] = tint;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  syncBodies(bodies) {
    const activeIds = new Set(bodies.map(b => b.id));

    // Remove obsolete bodies
    for (const [id, visual] of this.bodyVisuals.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(visual.group);
        if (visual.trailLine) this.scene.remove(visual.trailLine);
        this.bodyVisuals.delete(id);
      }
    }

    // Add or update bodies
    for (const b of bodies) {
      let visual = this.bodyVisuals.get(b.id);
      if (!visual) {
        visual = this.createBodyVisual(b);
        this.bodyVisuals.set(b.id, visual);
      } else {
        // Update appearance if color or size changed
        this.updateBodyAppearance(visual, b);
      }
    }
  }

  createBodyVisual(body) {
    const group = new THREE.Group();
    const color = new THREE.Color(body.color);
    const radius = body.radius || (body.size ? body.size * 0.15 : 0.6);

    // 1. Core Sphere
    const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
    let sphereMat;

    if (body.isCentral) {
      // Emissive Sun
      sphereMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.1
      });
    } else {
      sphereMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.2
      });
    }

    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphereMesh);

    // 2. Halo Glow (additive)
    let glowMesh = null;
    if (body.isCentral || body.mass > 50) {
      const glowGeo = new THREE.SphereGeometry(radius * 1.6, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      glowMesh = new THREE.Mesh(glowGeo, glowMat);
      group.add(glowMesh);

      // Corona outer layer
      const coronaGeo = new THREE.SphereGeometry(radius * 2.5, 24, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
      group.add(coronaMesh);
    }

    this.scene.add(group);

    // 3. Dynamic Trail Line
    const maxPoints = this.maxTrailLength;
    const trailPositions = new Float32Array(maxPoints * 3);
    const trailColors = new Float32Array(maxPoints * 3);

    // Fill with starting position
    for (let i = 0; i < maxPoints; i++) {
      trailPositions[i * 3] = body.pos[0];
      trailPositions[i * 3 + 1] = body.pos[1];
      trailPositions[i * 3 + 2] = body.pos[2];

      const alpha = i / maxPoints;
      trailColors[i * 3] = color.r * alpha;
      trailColors[i * 3 + 1] = color.g * alpha;
      trailColors[i * 3 + 2] = color.b * alpha;
    }

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    const trailLine = new THREE.Line(trailGeo, trailMat);
    this.scene.add(trailLine);

    // 4. Velocity Vector Arrow
    const velArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(body.pos[0], body.pos[1], body.pos[2]),
      1,
      body.color,
      0.6,
      0.3
    );
    velArrow.visible = this.showVelocities;
    this.scene.add(velArrow);

    return {
      id: body.id,
      group,
      sphereMesh,
      glowMesh,
      trailLine,
      trailPositions,
      trailColors,
      trailPoints: [],
      velArrow,
      currentColor: body.color
    };
  }

  updateBodyAppearance(visual, body) {
    if (visual.currentColor !== body.color) {
      visual.currentColor = body.color;
      const col = new THREE.Color(body.color);
      visual.sphereMesh.material.color.set(col);
      if (visual.sphereMesh.material.emissive) {
        visual.sphereMesh.material.emissive.set(col);
      }
      if (visual.glowMesh) {
        visual.glowMesh.material.color.set(col);
      }
    }
  }

  updateFrame(bodies, isAntigravityActive = false) {
    for (const b of bodies) {
      const visual = this.bodyVisuals.get(b.id);
      if (!visual) continue;

      // Update position
      visual.group.position.set(b.pos[0], b.pos[1], b.pos[2]);

      // If central sun, update light position
      if (b.isCentral) {
        this.sunLight.position.set(b.pos[0], b.pos[1], b.pos[2]);
      }

      // Update trails
      if (this.showTrails) {
        visual.trailLine.visible = true;
        visual.trailPoints.push([...b.pos]);
        while (visual.trailPoints.length > this.maxTrailLength) {
          visual.trailPoints.shift();
        }

        const pts = visual.trailPoints;
        const count = Math.min(pts.length, this.maxTrailLength);
        const posAttr = visual.trailLine.geometry.attributes.position;
        const colAttr = visual.trailLine.geometry.attributes.color;
        const baseColor = new THREE.Color(isAntigravityActive ? 0xff453a : b.color);

        for (let i = 0; i < count; i++) {
          posAttr.setXYZ(i, pts[i][0], pts[i][1], pts[i][2]);
          const fade = count > 1 ? (0.15 + 0.85 * (i / (count - 1))) : 1.0;
          colAttr.setXYZ(i, baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
        }

        // Pad remainder with latest point to avoid zero-origin lines
        const latest = (pts.length > 0) ? pts[pts.length - 1] : [b.pos[0], b.pos[1], b.pos[2]];
        for (let i = count; i < this.maxTrailLength; i++) {
          posAttr.setXYZ(i, latest[0], latest[1], latest[2]);
          colAttr.setXYZ(i, 0, 0, 0);
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      } else {
        visual.trailLine.visible = false;
      }

      // Update velocity arrow
      if (this.showVelocities) {
        visual.velArrow.visible = true;
        visual.velArrow.position.set(b.pos[0], b.pos[1], b.pos[2]);
        const velVec = new THREE.Vector3(b.vel[0], b.vel[1], b.vel[2]);
        const speed = velVec.length();
        if (speed > 0.001) {
          visual.velArrow.setDirection(velVec.normalize());
          visual.velArrow.setLength(Math.min(speed * 0.35, 12));
        }
      } else {
        visual.velArrow.visible = false;
      }
    }

    // Camera follow target if set
    if (this.followTargetId) {
      const targetVisual = this.bodyVisuals.get(this.followTargetId);
      if (targetVisual) {
        const targetPos = targetVisual.group.position;
        this.controls.target.lerp(targetPos, 0.08);
      }
    }

    // Update shockwaves
    this.updateShockwaves();

    // Render step
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  triggerShockwave(origin = [0, 0, 0], isAntigravity = true) {
    const color = isAntigravity ? 0xff453a : 0x0a84ff;
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(origin[0], origin[1], origin[2]);
    this.scene.add(ringMesh);

    // Add spherical ripple as well
    const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.position.set(origin[0], origin[1], origin[2]);
    this.scene.add(sphereMesh);

    this.shockwaves.push({
      meshRing: ringMesh,
      meshSphere: sphereMesh,
      scale: 1,
      opacity: 1,
      growthRate: 1.8,
      fadeRate: 0.02
    });
  }

  updateShockwaves() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.scale += sw.growthRate;
      sw.opacity -= sw.fadeRate;

      sw.meshRing.scale.set(sw.scale, sw.scale, sw.scale);
      sw.meshSphere.scale.set(sw.scale, sw.scale, sw.scale);
      sw.meshRing.material.opacity = Math.max(0, sw.opacity);
      sw.meshSphere.material.opacity = Math.max(0, sw.opacity * 0.5);

      if (sw.opacity <= 0) {
        this.scene.remove(sw.meshRing);
        this.scene.remove(sw.meshSphere);
        this.shockwaves.splice(i, 1);
      }
    }
  }

  clearTrails() {
    for (const visual of this.bodyVisuals.values()) {
      visual.trailPoints = [];
      const posAttr = visual.trailLine.geometry.attributes.position;
      const colAttr = visual.trailLine.geometry.attributes.color;
      for (let i = 0; i < this.maxTrailLength; i++) {
        colAttr.setXYZ(i, 0, 0, 0);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  }

  populateTrailsFromHistory(history) {
    if (!history || history.length === 0) return;
    for (const [id, visual] of this.bodyVisuals.entries()) {
      visual.trailPoints = [];
      const count = history.length;
      const stepStride = Math.max(1, Math.floor(count / this.maxTrailLength));
      for (let i = 0; i < count; i += stepStride) {
        if (visual.trailPoints.length >= this.maxTrailLength) break;
        const frame = history[i];
        const fb = frame.bodies.find(b => b.id === id);
        if (fb) {
          visual.trailPoints.push([...fb.pos]);
        }
      }
    }
  }

  setCameraView(type) {
    if (type === 'perspective') {
      this.camera.position.set(0, -35, 30);
      this.controls.target.set(0, 0, 0);
    } else if (type === 'top') {
      this.camera.position.set(0, 0, 60);
      this.controls.target.set(0, 0, 0);
    } else if (type === 'side') {
      this.camera.position.set(60, 0, 0);
      this.controls.target.set(0, 0, 0);
    } else if (type === 'front') {
      this.camera.position.set(0, -60, 0);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  setFollowTarget(bodyId) {
    this.followTargetId = bodyId || null;
  }

  setShowTrails(val) {
    this.showTrails = val;
  }

  setShowGrid(val) {
    this.showGrid = val;
    if (this.gridHelper) this.gridHelper.visible = val;
  }

  setShowVelocities(val) {
    this.showVelocities = val;
  }

  setTrailLength(length) {
    this.maxTrailLength = length;
    // Clear and re-populate
    this.clearTrails();
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
