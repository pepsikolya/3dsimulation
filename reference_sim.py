"""
3D N-Body Orbital Mechanics & Antigravity Visualizer
Reference Numerical Implementation (Specification Section 5)
"""

import json
import csv
import numpy as np

# ==========================================
# 1. SIMULATION SETUP & CONSTANTS
# ==========================================
NUM_STEPS = 1000
DT = 0.01
G_INITIAL = 1.0
SOFTENING = 0.1
TOGGLE_STEP = 500  # Flip G to -G at step 500

bodies_data = [
    {"mass": 1000.0, "pos": [0.0, 0.0, 0.0], "vel": [0.0, 0.0, 0.0], "name": "Sun", "color": "#FFD700", "size": 12},
    {"mass": 1.0, "pos": [5.0, 0.0, 0.0], "vel": [0.0, 14.14, 2.0], "name": "Alpha", "color": "#00F0FF", "size": 6},
    {"mass": 2.0, "pos": [0.0, 10.0, 1.0], "vel": [-10.0, 0.0, -1.5], "name": "Beta", "color": "#FF007F", "size": 7},
    {"mass": 0.5, "pos": [-15.0, -5.0, 2.0], "vel": [3.0, -8.0, 1.0], "name": "Gamma", "color": "#7000FF", "size": 5},
]

def run_simulation(num_steps=NUM_STEPS, dt=DT, g_init=G_INITIAL, softening=SOFTENING, toggle_step=TOGGLE_STEP):
    num_bodies = len(bodies_data)
    masses = np.array([b["mass"] for b in bodies_data], dtype=np.float64)
    positions = np.array([b["pos"] for b in bodies_data], dtype=np.float64)
    velocities = np.array([b["vel"] for b in bodies_data], dtype=np.float64)

    history = np.zeros((num_steps, num_bodies, 3), dtype=np.float64)
    velocity_history = np.zeros((num_steps, num_bodies, 3), dtype=np.float64)
    g_history = np.zeros(num_steps, dtype=np.float64)

    G = g_init
    for t in range(num_steps):
        if t == toggle_step:
            G = -g_init
        
        g_history[t] = G
        history[t] = positions
        velocity_history[t] = velocities

        # Pairwise displacement: r_ij = pos_j - pos_i
        # Shape: (N, N, 3)
        r_ij = positions[np.newaxis, :, :] - positions[:, np.newaxis, :]
        distances = np.linalg.norm(r_ij, axis=-1)
        inv_dist3 = 1.0 / (distances**2 + softening**2)**1.5
        np.fill_diagonal(inv_dist3, 0.0)

        # Acceleration: a_i = G * sum_j(m_j * r_ij / dist^3)
        accelerations = G * np.sum(r_ij * (masses[np.newaxis, :, np.newaxis] * inv_dist3[:, :, np.newaxis]), axis=1)

        # Euler-Cromer update
        velocities += accelerations * dt
        positions += velocities * dt

    return {
        "num_steps": num_steps,
        "dt": dt,
        "toggle_step": toggle_step,
        "bodies": bodies_data,
        "history": history,
        "velocity_history": velocity_history,
        "g_history": g_history
    }

if __name__ == "__main__":
    print("Running reference Python simulation...")
    results = run_simulation()
    print(f"Simulation completed: {results['num_steps']} steps.")
    print("Initial positions:\n", results["history"][0])
    print("Position at step 499 (pre-inversion):\n", results["history"][499])
    print("Position at step 500 (inversion point):\n", results["history"][500])
    print("Position at step 999 (post-scattering):\n", results["history"][999])

    # Export reference data to JSON
    json_path = r"C:\Users\MandziukMykola\.gemini\antigravity\scratch\orbital-antigravity-sandbox\reference_trajectory.json"
    data_to_export = {
        "num_steps": results["num_steps"],
        "dt": results["dt"],
        "toggle_step": results["toggle_step"],
        "bodies": [b["name"] for b in results["bodies"]],
        "trajectory": results["history"].tolist()
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data_to_export, f)
    print(f"Exported reference trajectory to: {json_path}")
