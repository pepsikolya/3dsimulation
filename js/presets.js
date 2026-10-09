/**
 * Scénáře a předvolby pro 3D Orbitální simulátor a antigravitační sandbox
 * Lokalizováno do češtiny v souladu s technickou specifikací a Apple designem.
 */

export const PRESETS = {
  specification: {
    name: "Základní systém (Slunce + Alfa, Beta, Gama)",
    description: "Referenční scénář z technické specifikace. Centrální hvězda a 3 planety s automatickou inverzí gravitace v kroku 500.",
    G: 1.0,
    softening: 0.1,
    dt: 0.01,
    autoToggleStep: 500,
    autoToggleEnabled: true,
    cameraPosition: [0, -35, 30],
    cameraTarget: [0, 0, 0],
    bodies: [
      {
        id: "sun",
        name: "Slunce",
        mass: 1000.0,
        pos: [0.0, 0.0, 0.0],
        vel: [0.0, 0.0, 0.0],
        color: "#ff9f0a",
        size: 14,
        radius: 1.5,
        isCentral: true
      },
      {
        id: "alpha",
        name: "Alfa (vnitřní)",
        mass: 1.0,
        pos: [5.0, 0.0, 0.0],
        vel: [0.0, 14.14, 2.0],
        color: "#63e6e2",
        size: 6,
        radius: 0.6
      },
      {
        id: "beta",
        name: "Beta (střední)",
        mass: 2.0,
        pos: [0.0, 10.0, 1.0],
        vel: [-10.0, 0.0, -1.5],
        color: "#ff453a",
        size: 7,
        radius: 0.7
      },
      {
        id: "gamma",
        name: "Gama (vnější)",
        mass: 0.5,
        pos: [-15.0, -5.0, 2.0],
        vel: [3.0, -8.0, 1.0],
        color: "#bf5af2",
        size: 5,
        radius: 0.5
      }
    ]
  },

  figureEight: {
    name: "Choreografie ve tvaru osmičky (3 tělesa)",
    description: "Slavné stabilní analytické řešení problému tří těles o stejné hmotnosti, která obíhají po společné trajektorii ležaté osmičky.",
    G: 1.0,
    softening: 0.05,
    dt: 0.008,
    autoToggleStep: 800,
    autoToggleEnabled: false,
    cameraPosition: [0, -30, 25],
    cameraTarget: [0, 0, 0],
    bodies: [
      {
        id: "body_8_1",
        name: "Choreografická Alfa",
        mass: 100.0,
        pos: [-14.55, 3.65, 0.0],
        vel: [3.49, 3.99, 0.0],
        color: "#0a84ff",
        size: 9,
        radius: 0.9
      },
      {
        id: "body_8_2",
        name: "Choreografická Beta",
        mass: 100.0,
        pos: [14.55, -3.65, 0.0],
        vel: [3.49, 3.99, 0.0],
        color: "#ff453a",
        size: 9,
        radius: 0.9
      },
      {
        id: "body_8_3",
        name: "Choreografická Gama",
        mass: 100.0,
        pos: [0.0, 0.0, 0.0],
        vel: [-6.98, -7.98, 0.0],
        color: "#ff9f0a",
        size: 9,
        radius: 0.9
      }
    ]
  },

  binaryStars: {
    name: "Dvojhvězda a cirkumbinární planety",
    description: "Dvě centrální hvězdy obíhající společné těžiště se dvěma vnějšími planetami na stabilních drahách.",
    G: 1.0,
    softening: 0.1,
    dt: 0.01,
    autoToggleStep: 600,
    autoToggleEnabled: false,
    cameraPosition: [0, -45, 35],
    cameraTarget: [0, 0, 0],
    bodies: [
      {
        id: "star_a",
        name: "Slunce Primus",
        mass: 600.0,
        pos: [-3.5, 0.0, 0.0],
        vel: [0.0, -6.5, 0.0],
        color: "#ff9f0a",
        size: 11,
        radius: 1.2,
        isCentral: true
      },
      {
        id: "star_b",
        name: "Slunce Secundus",
        mass: 600.0,
        pos: [3.5, 0.0, 0.0],
        vel: [0.0, 6.5, 0.0],
        color: "#0a84ff",
        size: 11,
        radius: 1.2,
        isCentral: true
      },
      {
        id: "planet_tatooine",
        name: "Planeta Tatooine",
        mass: 1.5,
        pos: [0.0, 16.0, 2.0],
        vel: [-8.6, 0.0, -1.0],
        color: "#30d158",
        size: 6,
        radius: 0.6
      },
      {
        id: "planet_gliese",
        name: "Planeta Gliese",
        mass: 0.8,
        pos: [-24.0, 0.0, -3.0],
        vel: [0.0, -7.0, 0.5],
        color: "#bf5af2",
        size: 5,
        radius: 0.5
      }
    ]
  },

  lagrangeTrojan: {
    name: "Lagrangeovy body a Trojané",
    description: "Slunce, plynný obr a planetky stabilně usazené v rovnostranných Lagrangeových bodech L4 a L5.",
    G: 1.0,
    softening: 0.1,
    dt: 0.01,
    autoToggleStep: 600,
    autoToggleEnabled: false,
    cameraPosition: [0, -40, 30],
    cameraTarget: [0, 0, 0],
    bodies: [
      {
        id: "sun_lagrange",
        name: "Centrální hvězda",
        mass: 1200.0,
        pos: [0.0, 0.0, 0.0],
        vel: [0.0, 0.0, 0.0],
        color: "#ff9f0a",
        size: 14,
        radius: 1.5,
        isCentral: true
      },
      {
        id: "jupiter",
        name: "Plynný obr",
        mass: 35.0,
        pos: [14.0, 0.0, 0.0],
        vel: [0.0, 9.25, 0.0],
        color: "#ff453a",
        size: 8,
        radius: 0.9
      },
      {
        id: "trojan_l4",
        name: "Trojané (bod L4 +60°)",
        mass: 0.1,
        pos: [7.0, 12.12, 0.0],
        vel: [-8.01, 4.62, 0.3],
        color: "#63e6e2",
        size: 4,
        radius: 0.4
      },
      {
        id: "trojan_l5",
        name: "Řekové (bod L5 -60°)",
        mass: 0.1,
        pos: [7.0, -12.12, 0.0],
        vel: [8.01, 4.62, -0.3],
        color: "#bf5af2",
        size: 4,
        radius: 0.4
      }
    ]
  },

  chaosCluster: {
    name: "Chaotická kulová hvězdokupa (16 těles)",
    description: "Gravitačně provázaný shluk těles. Přepnutí na antigravitaci vyvolá okamžitý rozptyl všech těles do prostoru.",
    G: 1.0,
    softening: 0.2,
    dt: 0.008,
    autoToggleStep: 400,
    autoToggleEnabled: false,
    cameraPosition: [0, -50, 40],
    cameraTarget: [0, 0, 0],
    bodies: (() => {
      const bodies = [
        {
          id: "cluster_core",
          name: "Jádro hvězdokupy",
          mass: 800.0,
          pos: [0, 0, 0],
          vel: [0, 0, 0],
          color: "#f5f5f7",
          size: 13,
          radius: 1.4,
          isCentral: true
        }
      ];
      const colors = ["#0a84ff", "#ff453a", "#63e6e2", "#ff9f0a", "#bf5af2", "#30d158", "#5e5ce6", "#ffd60a"];
      const n = 15;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = 5.0 + Math.random() * 16.0;
        const z = (Math.random() - 0.5) * 6.0;
        const vMag = Math.sqrt((1.0 * 800.0) / dist) * (0.85 + Math.random() * 0.3);
        const vx = -Math.sin(angle) * vMag;
        const vy = Math.cos(angle) * vMag;
        const vz = (Math.random() - 0.5) * 2.0;
        bodies.push({
          id: `cluster_body_${i}`,
          name: `Hvězda ${i + 1}`,
          mass: 0.5 + Math.random() * 4.0,
          pos: [Math.cos(angle) * dist, Math.sin(angle) * dist, z],
          vel: [vx, vy, vz],
          color: colors[i % colors.length],
          size: 4 + Math.random() * 4,
          radius: 0.5
        });
      }
      return bodies;
    })()
  }
};
