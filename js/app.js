/**
 * Aplikační koordinátor pro 3D Orbitální mechaniku & Antigravitační sandbox
 * Integruje fyzikální engine, WebGL vykreslování Three.js, telemetrii a Apple macOS UI.
 * Kompletně v českém jazyce.
 */

import { PhysicsEngine } from './physics.js';
import { SimulationRenderer3D } from './renderer3d.js';
import { TelemetryMonitor } from './telemetry.js';
import { PRESETS } from './presets.js';
import { TrajectoryExporter } from './exporters.js';

class OrbitalAntigravityApp {
  constructor() {
    this.isPlaying = false;
    this.speedMultiplier = 1.0;
    this.currentPresetKey = 'specification';

    this.initComponents();

    // Kontrola URL parametrů: ?preset=figureEight&steps=300&autostart=1&tab=tab-telemetry
    const urlParams = new URLSearchParams(window.location.search);
    const initialPreset = urlParams.get('preset') || this.currentPresetKey;
    this.loadPreset(initialPreset);
    this.bindEvents();

    // Spuštění vykreslovací smyčky
    this.lastTimestamp = performance.now();
    requestAnimationFrame(ts => this.loop(ts));

    this.showToast("Sandbox připraven. Stiskněte MEZERNÍK nebo Spustit pro start.");

    const autosteps = parseInt(urlParams.get('steps'));
    if (autosteps > 0) {
      for (let i = 0; i < autosteps; i++) {
        this.physics.tick();
      }
      this.updateScrubber();
      this.renderer.populateTrailsFromHistory(this.physics.history);
      this.renderer.updateFrame(this.physics.bodies, this.physics.isAntigravityActive);
      this.telemetry.update(this.physics.getTelemetry());
    }

    if (urlParams.get('autostart') === '1') {
      this.isPlaying = true;
      const playIcon = document.getElementById('icon-play');
      const pauseIcon = document.getElementById('icon-pause');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
    }

    const activeTab = urlParams.get('tab');
    if (activeTab) {
      document.querySelector(`[data-tab="${activeTab}"]`)?.click();
    }

    const modalParam = urlParams.get('modal');
    if (modalParam === 'tutorial') {
      document.getElementById('modal-tutorial')?.classList.add('active');
    } else if (modalParam === 'math') {
      document.getElementById('modal-math')?.classList.add('active');
    }
  }

  initComponents() {
    const canvasContainer = document.getElementById('canvas-container');
    const telemetryCanvas = document.getElementById('telemetry-canvas');

    this.renderer = new SimulationRenderer3D(canvasContainer);
    this.physics = new PhysicsEngine({
      G: 1.0,
      softening: 0.1,
      dt: 0.01,
      substeps: 1,
      autoToggleStep: 500,
      autoToggleEnabled: true
    });
    this.telemetry = new TelemetryMonitor(telemetryCanvas);

    // Propojení událostí fyziky
    this.physics.onStateToggle((isRepulsive, gVal) => {
      this.onAntigravityToggled(isRepulsive, gVal);
    });

    this.physics.onCollision((survivor, merged) => {
      this.onCollisionOccurred(survivor, merged);
    });

    this.renderPresetsList();
  }

  loadPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;

    this.currentPresetKey = key;
    this.physics.G_INITIAL = preset.G;
    this.physics.G = preset.G;
    this.physics.softening = preset.softening;
    this.physics.dt = preset.dt;
    this.physics.autoToggleStep = preset.autoToggleStep;
    this.physics.autoToggleEnabled = preset.autoToggleEnabled;

    this.physics.setBodies(preset.bodies);
    this.renderer.syncBodies(this.physics.bodies);
    this.renderer.clearTrails();

    if (preset.cameraPosition) {
      this.renderer.camera.position.set(...preset.cameraPosition);
    }
    if (preset.cameraTarget) {
      this.renderer.controls.target.set(...preset.cameraTarget);
      this.renderer.controls.update();
    }

    this.syncUIInputs();
    this.renderBodiesList();
    this.telemetry.reset();
    this.telemetry.update(this.physics.getTelemetry());

    // Zvýraznění aktivní předvolby v seznamu
    document.querySelectorAll('.scenario-card').forEach(card => {
      card.classList.toggle('active', card.dataset.preset === key);
    });

    this.renderer.updateFrame(this.physics.bodies, this.physics.isAntigravityActive);
    this.showToast(`Načten scénář: ${preset.name}`);
  }

  syncUIInputs() {
    const sliderG = document.getElementById('slider-g');
    const valG = document.getElementById('val-g');
    const sliderSoftening = document.getElementById('slider-softening');
    const valSoftening = document.getElementById('val-softening');
    const sliderDt = document.getElementById('slider-dt');
    const valDt = document.getElementById('val-dt');
    const checkAutoToggle = document.getElementById('check-auto-toggle');
    const sliderToggleStep = document.getElementById('slider-toggle-step');
    const valToggleStep = document.getElementById('val-toggle-step');
    const checkCollision = document.getElementById('check-collision');

    if (sliderG) { sliderG.value = this.physics.G; valG.textContent = Number(this.physics.G).toFixed(2); }
    if (sliderSoftening) { sliderSoftening.value = this.physics.softening; valSoftening.textContent = Number(this.physics.softening).toFixed(2); }
    if (sliderDt) { sliderDt.value = this.physics.dt; valDt.textContent = Number(this.physics.dt).toFixed(3); }
    if (checkAutoToggle) { checkAutoToggle.checked = this.physics.autoToggleEnabled; }
    if (sliderToggleStep) { sliderToggleStep.value = this.physics.autoToggleStep; valToggleStep.textContent = this.physics.autoToggleStep; }
    if (checkCollision) { checkCollision.checked = this.physics.collisionMerging; }

    this.updateGravityModeVisuals();
  }

  updateGravityModeVisuals() {
    const btnAttractive = document.getElementById('btn-mode-attractive');
    const btnRepulsive = document.getElementById('btn-mode-repulsive');
    const isRepulsive = this.physics.isAntigravityActive;

    if (btnAttractive && btnRepulsive) {
      btnAttractive.classList.toggle('active', !isRepulsive);
      btnRepulsive.classList.toggle('active', isRepulsive);
    }
  }

  onAntigravityToggled(isRepulsive, gVal) {
    this.updateGravityModeVisuals();

    // Vizuální rázová vlna
    const origin = this.physics.bodies[0]?.pos || [0, 0, 0];
    this.renderer.triggerShockwave(origin, isRepulsive);

    const message = isRepulsive
      ? `Antigravitace aktivována: G = ${gVal.toFixed(2)} (Odpudivé pole)`
      : `Gravitace obnovena: G = ${gVal.toFixed(2)} (Přitažlivé pole)`;
    
    this.showToast(message, isRepulsive ? "repulsive" : "attractive");

    const sliderG = document.getElementById('slider-g');
    const valG = document.getElementById('val-g');
    if (sliderG) { sliderG.value = gVal; valG.textContent = gVal.toFixed(2); }
  }

  onCollisionOccurred(survivor, merged) {
    this.renderer.triggerShockwave(survivor.pos, false);
    this.showToast(`Srážka: Tělesa sloučena do "${survivor.name}"! Hmotnost: ${survivor.mass.toFixed(1)}`, "attractive");
    this.renderBodiesList();
  }

  renderBodiesList() {
    const container = document.getElementById('bodies-list-container');
    const badgeCount = document.getElementById('tab-body-count');
    if (!container) return;

    badgeCount.textContent = this.physics.bodies.length;
    container.innerHTML = '';

    this.physics.bodies.forEach(b => {
      const card = document.createElement('div');
      card.className = 'body-item-card';
      card.innerHTML = `
        <div class="body-item-header">
          <div class="body-identity">
            <span class="body-color-swatch" style="background: ${b.color};"></span>
            <span class="body-item-name">${b.name}</span>
          </div>
          <div class="body-actions">
            <button class="action-btn-mini btn-focus-body" data-id="${b.id}" title="Sledovat kamerou">Sledovat</button>
            ${!b.isCentral ? `<button class="action-btn-mini btn-remove-body" data-id="${b.id}" title="Odebrat těleso" style="color: var(--apple-red);">&times;</button>` : ''}
          </div>
        </div>
        <div class="control-row" style="margin-top: 2px;">
          <span class="control-caption">Hmotnost:</span>
          <div class="slider-wrapper">
            <input type="range" class="body-mass-slider" data-id="${b.id}" min="0.1" max="${b.isCentral ? 2500 : 50}" step="0.1" value="${b.mass}">
            <span class="value-badge body-mass-val">${b.mass.toFixed(1)}</span>
          </div>
        </div>
      `;

      // Posuvník hmotnosti v reálném čase
      const massSlider = card.querySelector('.body-mass-slider');
      const massVal = card.querySelector('.body-mass-val');
      massSlider.addEventListener('input', (e) => {
        const newMass = parseFloat(e.target.value);
        massVal.textContent = newMass.toFixed(1);
        this.physics.updateBody(b.id, { mass: newMass });
      });

      // Sledování kamerou
      const focusBtn = card.querySelector('.btn-focus-body');
      focusBtn.addEventListener('click', () => {
        if (this.renderer.followTargetId === b.id) {
          this.renderer.setFollowTarget(null);
          focusBtn.textContent = 'Sledovat';
          focusBtn.classList.remove('active');
          this.showToast(`Kamera uvolněna`);
        } else {
          this.renderer.setFollowTarget(b.id);
          document.querySelectorAll('.btn-focus-body').forEach(btn => {
            btn.textContent = 'Sledovat';
            btn.classList.remove('active');
          });
          focusBtn.textContent = 'Sleduji';
          focusBtn.classList.add('active');
          this.showToast(`Sledování tělesa: ${b.name}`);
        }
      });

      // Odebrání tělesa
      const removeBtn = card.querySelector('.btn-remove-body');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.physics.removeBody(b.id);
          this.renderer.syncBodies(this.physics.bodies);
          this.renderBodiesList();
          this.showToast(`Odebráno těleso: ${b.name}`);
        });
      }

      container.appendChild(card);
    });
  }

  renderPresetsList() {
    const container = document.getElementById('presets-list-container');
    if (!container) return;

    container.innerHTML = '';
    Object.entries(PRESETS).forEach(([key, preset]) => {
      const card = document.createElement('div');
      card.className = `scenario-card ${key === this.currentPresetKey ? 'active' : ''}`;
      card.dataset.preset = key;
      card.innerHTML = `
        <div class="scenario-card-title">${preset.name}</div>
        <div class="scenario-card-desc">${preset.description}</div>
      `;

      card.addEventListener('click', () => {
        this.loadPreset(key);
      });

      container.appendChild(card);
    });
  }

  showToast(message, type = "normal") {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `apple-notification ${type === 'repulsive' ? 'repulsive' : (type === 'attractive' ? 'attractive' : '')}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  bindEvents() {
    // 1. Spustit / Pozastavit
    const btnPlayPause = document.getElementById('btn-play-pause');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');

    const togglePlay = () => {
      this.isPlaying = !this.isPlaying;
      iconPlay.style.display = this.isPlaying ? 'none' : 'block';
      iconPause.style.display = this.isPlaying ? 'block' : 'none';
      btnPlayPause.classList.toggle('primary', this.isPlaying);
    };

    btnPlayPause.addEventListener('click', togglePlay);

    // 2. Krok vpřed
    document.getElementById('btn-step')?.addEventListener('click', () => {
      this.physics.tick();
      this.telemetry.update(this.physics.getTelemetry());
      this.updateScrubber();
    });

    // 3. Reset do výchozího stavu
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.physics.resetState();
      this.renderer.syncBodies(this.physics.bodies);
      this.renderer.clearTrails();
      this.telemetry.reset();
      this.telemetry.update(this.physics.getTelemetry());
      this.updateScrubber();
      this.showToast("Simulace obnovena do výchozího stavu.");
    });

    // 4. Rychlost simulace
    document.querySelectorAll('.speed-segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.speed-segment-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.speedMultiplier = parseFloat(e.target.dataset.speed);
      });
    });

    // 5. Segmentovaný přepínač gravitace (Attractive / Repulsive)
    document.getElementById('btn-mode-attractive')?.addEventListener('click', () => {
      if (this.physics.isAntigravityActive) {
        this.physics.toggleAntigravity();
      }
    });

    document.getElementById('btn-mode-repulsive')?.addEventListener('click', () => {
      if (!this.physics.isAntigravityActive) {
        this.physics.toggleAntigravity();
      }
    });

    // 6. Fyzikální posuvníky
    const sliderG = document.getElementById('slider-g');
    const valG = document.getElementById('val-g');
    sliderG?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valG.textContent = v.toFixed(2);
      this.physics.setG(v);
      this.updateGravityModeVisuals();
    });

    const sliderSoftening = document.getElementById('slider-softening');
    const valSoftening = document.getElementById('val-softening');
    sliderSoftening?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valSoftening.textContent = v.toFixed(2);
      this.physics.softening = v;
    });

    const sliderDt = document.getElementById('slider-dt');
    const valDt = document.getElementById('val-dt');
    sliderDt?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valDt.textContent = v.toFixed(3);
      this.physics.dt = v;
    });

    const checkAutoToggle = document.getElementById('check-auto-toggle');
    checkAutoToggle?.addEventListener('change', (e) => {
      this.physics.autoToggleEnabled = e.target.checked;
      document.getElementById('row-auto-step').style.opacity = e.target.checked ? '1' : '0.4';
    });

    const sliderToggleStep = document.getElementById('slider-toggle-step');
    const valToggleStep = document.getElementById('val-toggle-step');
    sliderToggleStep?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      valToggleStep.textContent = v;
      this.physics.autoToggleStep = v;
    });

    const checkCollision = document.getElementById('check-collision');
    checkCollision?.addEventListener('change', (e) => {
      this.physics.collisionMerging = e.target.checked;
      this.showToast(`Nepružné srážky: ${e.target.checked ? 'ZAPNUTO' : 'VYPNUTO'}`);
    });

    const selectSubsteps = document.getElementById('select-substeps');
    selectSubsteps?.addEventListener('change', (e) => {
      this.physics.substeps = parseInt(e.target.value);
    });

    // 7. Časová osa (Scrubber)
    const scrubber = document.getElementById('timeline-scrubber');
    scrubber?.addEventListener('input', (e) => {
      const targetStep = parseInt(e.target.value);
      this.scrubToStep(targetStep);
    });

    // 8. Záložky inspektoru
    document.querySelectorAll('.inspector-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.target.dataset.tab;
        document.querySelectorAll('.inspector-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.inspector-pane').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
        if (targetId === 'tab-telemetry') {
          this.telemetry.setupCanvasDpi();
          this.telemetry.renderChart();
        }
      });
    });

    // 9. Nástroje pohledu
    document.getElementById('tool-toggle-sidebar')?.addEventListener('click', () => {
      const sidebar = document.getElementById('macos-inspector');
      sidebar.classList.toggle('collapsed');
    });

    document.getElementById('tool-cam-perspective')?.addEventListener('click', () => {
      this.renderer.setCameraView('perspective');
      document.getElementById('tool-cam-perspective').classList.add('active');
      document.getElementById('tool-cam-top').classList.remove('active');
    });

    document.getElementById('tool-cam-top')?.addEventListener('click', () => {
      this.renderer.setCameraView('top');
      document.getElementById('tool-cam-top').classList.add('active');
      document.getElementById('tool-cam-perspective').classList.remove('active');
    });

    const toolTrails = document.getElementById('tool-toggle-trails');
    toolTrails?.addEventListener('click', () => {
      this.renderer.showTrails = !this.renderer.showTrails;
      toolTrails.classList.toggle('active', this.renderer.showTrails);
    });

    const toolGrid = document.getElementById('tool-toggle-grid');
    toolGrid?.addEventListener('click', () => {
      const show = !this.renderer.gridHelper.visible;
      this.renderer.setShowGrid(show);
      toolGrid.classList.toggle('active', show);
    });

    const toolVectors = document.getElementById('tool-toggle-vectors');
    toolVectors?.addEventListener('click', () => {
      const show = !this.renderer.showVelocities;
      this.renderer.setShowVelocities(show);
      toolVectors.classList.toggle('active', show);
    });

    document.getElementById('tool-clear-trails')?.addEventListener('click', () => {
      this.renderer.clearTrails();
      this.showToast("Stopy trajektorií vymazány.");
    });

    // 10. Modální listy (Tutorial, Math, Add Body)
    const modalTutorial = document.getElementById('modal-tutorial');
    const modalMath = document.getElementById('modal-math');
    const modalAdd = document.getElementById('modal-add-body');

    document.getElementById('btn-open-tutorial')?.addEventListener('click', () => modalTutorial.classList.add('active'));
    document.getElementById('btn-close-tutorial')?.addEventListener('click', () => modalTutorial.classList.remove('active'));
    document.getElementById('btn-dismiss-tutorial')?.addEventListener('click', () => modalTutorial.classList.remove('active'));

    document.getElementById('btn-open-math')?.addEventListener('click', () => modalMath.classList.add('active'));
    document.getElementById('btn-close-math')?.addEventListener('click', () => modalMath.classList.remove('active'));
    document.getElementById('btn-dismiss-math')?.addEventListener('click', () => modalMath.classList.remove('active'));

    document.getElementById('btn-open-add-body')?.addEventListener('click', () => modalAdd.classList.add('active'));
    document.getElementById('btn-close-add-modal')?.addEventListener('click', () => modalAdd.classList.remove('active'));
    document.getElementById('btn-cancel-add-body')?.addEventListener('click', () => modalAdd.classList.remove('active'));

    // Potvrzení přidání tělesa
    document.getElementById('btn-confirm-add-body')?.addEventListener('click', () => {
      const name = document.getElementById('input-new-name').value.trim() || 'Nové těleso';
      const mass = parseFloat(document.getElementById('input-new-mass').value) || 1.0;
      const px = parseFloat(document.getElementById('input-new-pos-x').value) || 0;
      const py = parseFloat(document.getElementById('input-new-pos-y').value) || 0;
      const pz = parseFloat(document.getElementById('input-new-pos-z').value) || 0;
      const vx = parseFloat(document.getElementById('input-new-vel-x').value) || 0;
      const vy = parseFloat(document.getElementById('input-new-vel-y').value) || 0;
      const vz = parseFloat(document.getElementById('input-new-vel-z').value) || 0;
      const color = document.getElementById('input-new-color').value;

      this.physics.addBody({
        name,
        mass,
        pos: [px, py, pz],
        vel: [vx, vy, vz],
        color,
        size: Math.max(4, Math.min(10, mass * 2))
      });

      this.renderer.syncBodies(this.physics.bodies);
      this.renderBodiesList();
      modalAdd.classList.remove('active');
      this.showToast(`Vytvořeno nebeské těleso: ${name}`, "attractive");
    });

    // 11. Exporty
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      TrajectoryExporter.exportJSON(this.physics);
      this.showToast("Matice trajektorií exportována do JSON.");
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      TrajectoryExporter.exportCSV(this.physics);
      this.showToast("Historie trajektorií exportována do CSV.");
    });

    document.getElementById('btn-export-preset')?.addEventListener('click', () => {
      TrajectoryExporter.exportPreset(this.physics);
      this.showToast("Předvolba soustavy uložena do JSON.");
    });

    document.getElementById('btn-view-python')?.addEventListener('click', () => {
      modalMath.classList.add('active');
    });

    // 12. Klávesové zkratky
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyG':
          e.preventDefault();
          this.physics.toggleAntigravity();
          this.updateGravityModeVisuals();
          break;
        case 'KeyR':
          e.preventDefault();
          document.getElementById('btn-reset')?.click();
          break;
        case 'KeyC':
          e.preventDefault();
          this.renderer.clearTrails();
          break;
        case 'KeyH':
          e.preventDefault();
          document.getElementById('tool-toggle-sidebar')?.click();
          break;
        case 'Period':
          e.preventDefault();
          document.getElementById('btn-step')?.click();
          break;
        case 'KeyT':
          e.preventDefault();
          document.getElementById('tool-cam-top')?.click();
          break;
      }
    });
  }

  scrubToStep(targetStep) {
    if (this.physics.history.length === 0) return;
    const frame = this.physics.history.find(h => h.step === targetStep);
    if (!frame) return;

    if (this.isPlaying) {
      document.getElementById('btn-play-pause')?.click();
    }

    frame.bodies.forEach(saved => {
      const live = this.physics.bodies.find(b => b.id === saved.id);
      if (live) {
        live.pos = [...saved.pos];
        live.vel = [...saved.vel];
      }
    });

    this.physics.stepCount = frame.step;
    this.physics.simulationTime = frame.time;
    this.physics.setG(frame.G);
    this.updateGravityModeVisuals();

    const historyUpToStep = this.physics.history.filter(h => h.step <= targetStep);
    this.renderer.populateTrailsFromHistory(historyUpToStep);

    this.updateScrubber();
    this.telemetry.update(this.physics.getTelemetry());
  }

  updateScrubber() {
    const counter = document.getElementById('counter-step');
    const scrubber = document.getElementById('timeline-scrubber');
    if (counter) counter.textContent = this.physics.stepCount;
    if (scrubber) {
      scrubber.max = Math.max(1000, this.physics.stepCount);
      scrubber.value = this.physics.stepCount;
    }
  }

  loop(timestamp) {
    requestAnimationFrame(ts => this.loop(ts));

    if (this.isPlaying) {
      const stepsToRun = Math.max(1, Math.round(this.speedMultiplier));
      for (let i = 0; i < stepsToRun; i++) {
        this.physics.tick();
      }

      this.updateScrubber();
      this.telemetry.update(this.physics.getTelemetry());
    }

    this.renderer.updateFrame(this.physics.bodies, this.physics.isAntigravityActive);
  }
}

// Inicializace
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new OrbitalAntigravityApp();
  });
} else {
  window.appInstance = new OrbitalAntigravityApp();
}
