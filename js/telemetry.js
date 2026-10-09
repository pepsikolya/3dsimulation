/**
 * Sledování telemetrie a zachování energie v reálném čase
 * Stylizováno podle Apple Activity Monitor / Instruments.
 * Lokalizováno do češtiny.
 */

export class TelemetryMonitor {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.maxDataPoints = options.maxDataPoints ?? 120;
    
    // Buffery pro vykreslení grafu
    this.dataPoints = {
      steps: [],
      kinetic: [],
      potential: [],
      total: [],
      isAntigravity: []
    };

    // UI prvky pro zobrazení hodnot
    this.readouts = {
      step: document.getElementById('telemetry-step'),
      time: document.getElementById('telemetry-time'),
      gVal: document.getElementById('telemetry-g'),
      kinetic: document.getElementById('telemetry-ek'),
      potential: document.getElementById('telemetry-ep'),
      total: document.getElementById('telemetry-etot'),
      cmPos: document.getElementById('telemetry-cm-pos'),
      cmVel: document.getElementById('telemetry-cm-vel'),
      bodyCount: document.getElementById('telemetry-body-count')
    };

    this.setupCanvasDpi();
    window.addEventListener('resize', () => this.setupCanvasDpi());
  }

  setupCanvasDpi() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = (rect.width || 320) * dpr;
    this.canvas.height = (rect.height || 100) * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.cssWidth = rect.width || 320;
    this.cssHeight = rect.height || 100;
  }

  reset() {
    this.dataPoints.steps = [];
    this.dataPoints.kinetic = [];
    this.dataPoints.potential = [];
    this.dataPoints.total = [];
    this.dataPoints.isAntigravity = [];
    this.renderChart();
  }

  update(telemetry) {
    // 1. Aktualizace textových ukazatelů
    if (this.readouts.step) this.readouts.step.textContent = telemetry.step;
    if (this.readouts.time) this.readouts.time.textContent = telemetry.time.toFixed(2) + ' s';
    if (this.readouts.gVal) this.readouts.gVal.textContent = telemetry.G.toFixed(2);
    if (this.readouts.kinetic) this.readouts.kinetic.textContent = telemetry.kineticEnergy.toFixed(1);
    if (this.readouts.potential) this.readouts.potential.textContent = telemetry.potentialEnergy.toFixed(1);
    if (this.readouts.total) this.readouts.total.textContent = telemetry.totalEnergy.toFixed(1);
    if (this.readouts.bodyCount) this.readouts.bodyCount.textContent = telemetry.bodyCount;

    if (this.readouts.cmPos) {
      this.readouts.cmPos.textContent = `[${telemetry.cmPos.map(v => v.toFixed(1)).join(', ')}]`;
    }
    if (this.readouts.cmVel) {
      const speed = Math.sqrt(telemetry.cmVel.reduce((sum, v) => sum + v * v, 0));
      this.readouts.cmVel.textContent = `${speed.toFixed(2)} j/s`;
    }

    // 2. Přidání do datového bufferu
    if (telemetry.step % 2 === 0) {
      this.dataPoints.steps.push(telemetry.step);
      this.dataPoints.kinetic.push(telemetry.kineticEnergy);
      this.dataPoints.potential.push(telemetry.potentialEnergy);
      this.dataPoints.total.push(telemetry.totalEnergy);
      this.dataPoints.isAntigravity.push(telemetry.isAntigravityActive);

      if (this.dataPoints.steps.length > this.maxDataPoints) {
        this.dataPoints.steps.shift();
        this.dataPoints.kinetic.shift();
        this.dataPoints.potential.shift();
        this.dataPoints.total.shift();
        this.dataPoints.isAntigravity.shift();
      }

      this.renderChart();
    }
  }

  renderChart() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const pts = this.dataPoints.steps.length;

    ctx.clearRect(0, 0, w, h);

    if (pts < 2) {
      ctx.fillStyle = '#86868b';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillText('Zaznamenávání telemetrie energie...', 12, h / 2);
      return;
    }

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < pts; i++) {
      const k = this.dataPoints.kinetic[i];
      const p = this.dataPoints.potential[i];
      const t = this.dataPoints.total[i];

      if (k < minVal) minVal = k;
      if (k > maxVal) maxVal = k;
      if (p < minVal) minVal = p;
      if (p > maxVal) maxVal = p;
      if (t < minVal) minVal = t;
      if (t > maxVal) maxVal = t;
    }

    if (Math.abs(maxVal - minVal) < 1e-4) {
      maxVal += 1;
      minVal -= 1;
    }

    const paddingX = 8;
    const paddingY = 8;
    const plotH = h - paddingY * 2;
    const plotW = w - paddingX * 2;

    const scaleY = (val) => {
      const norm = (val - minVal) / (maxVal - minVal);
      return paddingY + (1.0 - norm) * plotH;
    };

    // Jemná mřížka v Apple Instruments stylu
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const zeroY = scaleY(0);
    ctx.moveTo(paddingX, zeroY);
    ctx.lineTo(w - paddingX, zeroY);
    ctx.stroke();

    // Vykreslení datové řady
    const drawSeries = (data, color, width = 1.2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const x = paddingX + (i / (pts - 1)) * plotW;
        const y = scaleY(data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Zvýraznění fáze antigravitace
    for (let i = 0; i < pts; i++) {
      if (this.dataPoints.isAntigravity[i]) {
        const x = paddingX + (i / (pts - 1)) * plotW;
        ctx.fillStyle = 'rgba(255, 69, 58, 0.07)';
        ctx.fillRect(x, paddingY, plotW / pts + 1, plotH);
      }
    }

    // Ep - Potenciální energie (Apple Red)
    drawSeries(this.dataPoints.potential, '#ff453a', 1.2);
    // Ek - Kinetická energie (Apple Mint)
    drawSeries(this.dataPoints.kinetic, '#63e6e2', 1.2);
    // E - Celková mechanická energie (Apple Blue)
    drawSeries(this.dataPoints.total, '#0a84ff', 1.6);
  }
}
