/**
 * Exporty dat pro 3D grafické a fyzikální potrubí (Blender Geometry Nodes / Unreal Engine / Python)
 * Implementace rozšíření č. 2 ze specifikace projektu.
 * Lokalizováno do češtiny.
 */

export class TrajectoryExporter {
  static downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exportuje prostorovou historii trajektorií do strukturovaného JSONu.
   * Obsahuje matici [Kroky, Tělesa, 3] identickou s polem v NumPy pro Blender a Unreal.
   */
  static exportJSON(physicsEngine) {
    const history = physicsEngine.history;
    if (!history || history.length === 0) {
      alert("Zatím nebyla zaznamenána žádná data simulace. Spusťte prosím simulaci.");
      return;
    }

    const firstFrame = history[0];
    const bodyNames = firstFrame.bodies.map(b => b.name);
    const bodyIds = firstFrame.bodies.map(b => b.id);

    // 3D matice pozic: tvar [T, N, 3]
    const trajectoryMatrix = history.map(frame => 
      frame.bodies.map(b => [b.pos[0], b.pos[1], b.pos[2]])
    );

    const velocityMatrix = history.map(frame => 
      frame.bodies.map(b => [b.vel[0], b.vel[1], b.vel[2]])
    );

    const exportData = {
      generator: "3D Orbitální simulátor a antigravitační sandbox",
      cas_exportu: new Date().toISOString(),
      pocet_kroku: history.length,
      dt: physicsEngine.dt,
      softening: physicsEngine.softening,
      telesa: bodyNames,
      identifikatory_teles: bodyIds,
      snimky: history,
      matice_pozic: trajectoryMatrix,
      matice_rychlosti: velocityMatrix
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    this.downloadFile(`orbitalni_trajektorie_${Date.now()}.json`, jsonStr, 'application/json');
  }

  /**
   * Exportuje prostorovou historii do tabulkového CSV pro Unreal Engine, Excel nebo Pandas.
   */
  static exportCSV(physicsEngine) {
    const history = physicsEngine.history;
    if (!history || history.length === 0) {
      alert("Zatím nebyla zaznamenána žádná data simulace. Spusťte prosím simulaci.");
      return;
    }

    const rows = [
      ["krok", "cas", "G", "nazev_telesa", "id_telesa", "pozice_x", "pozice_y", "pozice_z", "rychlost_x", "rychlost_y", "rychlost_z", "hmotnost"]
    ];

    for (const frame of history) {
      const step = frame.step;
      const time = frame.time.toFixed(4);
      const G = frame.G.toFixed(4);

      for (const b of frame.bodies) {
        rows.push([
          step,
          time,
          G,
          `"${b.name.replace(/"/g, '""')}"`,
          b.id,
          b.pos[0].toFixed(5),
          b.pos[1].toFixed(5),
          b.pos[2].toFixed(5),
          b.vel[0].toFixed(5),
          b.vel[1].toFixed(5),
          b.vel[2].toFixed(5),
          b.mass
        ]);
      }
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');
    this.downloadFile(`orbitalni_data_${Date.now()}.csv`, csvContent, 'text/csv');
  }

  /**
   * Exportuje aktuální konfiguraci soustavy jako načitatelnou předvolbu.
   */
  static exportPreset(physicsEngine) {
    const preset = {
      name: `Vlastní soustava (${new Date().toLocaleTimeString('cs-CZ')})`,
      description: "Uživatelsky upravené nastavení gravitační soustavy",
      G: physicsEngine.G,
      softening: physicsEngine.softening,
      dt: physicsEngine.dt,
      autoToggleStep: physicsEngine.autoToggleStep,
      autoToggleEnabled: physicsEngine.autoToggleEnabled,
      bodies: physicsEngine.bodies.map(b => ({
        id: b.id,
        name: b.name,
        mass: b.mass,
        pos: [...b.pos],
        vel: [...b.vel],
        color: b.color,
        size: b.size,
        radius: b.radius,
        isCentral: b.isCentral
      }))
    };

    const jsonStr = JSON.stringify(preset, null, 2);
    this.downloadFile(`vlastni_predvolba_${Date.now()}.json`, jsonStr, 'application/json');
  }
}
