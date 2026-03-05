# Chapter 26 — Robotics

**Part 6: Communicating, Perceiving, and Acting**

Interactive visualizations covering every section of Chapter 26 from *AI: A Modern Approach, 4th Ed.*

---

## Visualizations

### §26.1–26.3 Robots, Hardware & Problem Types
- **Robot Types Browser**: Explore 6 robot types (manipulators, mobile, UAVs, AVs, legged, underwater), with sensors and real-world examples.
- **Sensor Taxonomy**: Interactive cards for all sensor types (range finders, cameras, GPS, IMU, force/torque sensors), passive vs. active.

### §26.3–26.5 Configuration Space & Kinematics
- **Drag-to-Explore C-Space**: Drag a triangular robot in a workspace; the corresponding point in C-space moves in real time, with the C-obstacle shown as the Minkowski sum expansion.
- **DOF table**: 4 robot types showing different C-space dimensionality.
- **Forward vs. Inverse Kinematics**: Side-by-side explanation panel.

### §26.4 Robotic Perception & Localization
- **MCL (Particle Filter)**: 1-D corridor world with beacons. Watch particles cluster to robot's true position as it moves. Control: particles, sensor noise, seed.
- **EKF (Kalman Filter)**: Gaussian belief (mean + variance) updated on each motion/measurement step. Live state inspection panel shows K, μ, σ².
- **MCL vs EKF comparison** panel (pros/cons).

### §26.5.2 Motion Planning
- **RRT visualization**: Tree grows step-by-step in a 2-D obstacle field. Controls: goal bias, step size, seed.
- **PRM visualization**: Builds roadmap milestones, connects them, finds path via A*. Controls: connection radius, seed.
- **RRT vs RRT* vs Trajectory Optimization** comparison panel.
- Full play/pause/step/speed/reset controls on both.

### §26.5.3–26.5.4 Trajectory Tracking Control
- **PID Controller**: Live position-vs-time chart. Tune K_P, K_I, K_D and see oscillation, overshoot, and settling.
- **MPC (Model Predictive Control)**: Receding horizon planner. Tune horizon H from 0 (greedy) to 15. Planned horizon shown as dashed overlay.
- State inspection panel shows all 6 PID variables (error, integral, derivative, control).

### §26.6 Planning Uncertain Movements
- **Guarded Move Simulator**: 20 trial trajectories for "naive" vs "guarded" strategy, with Monte Carlo success rates shown side-by-side.
- **What-if control**: velocity uncertainty cone half-angle and random seed.
- **Hierarchy panel**: 4 approaches to uncertainty (most-likely, MPC, guarded, POMDP) ranked by quality.

### §26.7 Reinforcement Learning in Robotics
- **Domain Randomization Experiment**: P-controller with friction randomized in [lo, hi]. Bar chart of per-instance success. Tune K_P and friction range live.
- **Narrow vs Wide DR comparison**: Success rates for friction ∈ [0.4, 0.6] vs [0.05, 0.95].
- **Sim-to-real gap** panel: 4 practical sources of the gap.

### §26.8–26.9 Human-Robot Interaction & Reactive Controllers
- **Human Intent Inference**: Grid world with 3 goals. Move the human 🚶 with arrow buttons; robot 🤖 updates its Bayesian posterior P(goal | actions) using Boltzmann rationality. Tune β (rationality).
- **Hexapod FSM**: Step through a reactive finite state machine for a hexapod gait including obstacle detection and recovery. Full state inspection panel.
- **Subsumption architecture** explanation panel.

### §26.10 Application Domains & Future Challenges
- **5 domain browsers**: Manipulation, Mobile/Outdoor, Autonomous Vehicles, Home/Service, Aerial/Underwater — each with 3 real-world examples and relevant tech stack.
- **Open challenges**: 5 frontier problems (dexterity, long-horizon planning, few-shot learning, safe AI, NLU).
- **Chapter summary**: 8-point condensed takeaways.

---

## Algorithms Implemented (pure TypeScript)

| Function | §Section | Description |
|----------|---------|-------------|
| `segmentIntersectsRect` | 26.5 | Liang-Barsky line-segment/AABB intersection |
| `segmentFree` | 26.5 | Collision-free test for a path segment |
| `buildRRT` | 26.5.2 | Rapidly-exploring Random Tree |
| `buildPRM` | 26.5.2 | Probabilistic Roadmap with A* query |
| `buildVisibilityGraph` | 26.5.2 | Exact visibility graph for convex polygons |
| `wrapAngle` | 26.4 | Angle wrapping to (−π, π] |
| `gaussian` | 26.4 | Unnormalised Gaussian PDF |
| `runMCL` | 26.4 | Monte Carlo Localization (particle filter) |
| `runEKF` | 26.4 | Extended Kalman Filter (1-D) |
| `simulatePID` | 26.5.3 | PID controller simulation |
| `simulateMPC` | 26.5.4 | Model Predictive Control simulation |
| `valueIterationLinear` | 26.6 | Linear value iteration (POMDP baseline) |
| `evaluateDomainRandomization` | 26.7 | Domain randomization evaluation |
| `inferHumanGoal` | 26.8 | Boltzmann-rational goal inference |
| `simulateFSM` | 26.9 | Reactive finite state machine |

---

## Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm test          # run tests (107 tests, 100% coverage)
npm run build     # production build (~43 KB gzip)
```

---

## Architecture

Self-contained microfrontend built with React 18 + TypeScript strict, Vite, Vitest, KaTeX.
All algorithm logic in `src/algorithms/index.ts` — pure functions, zero side effects.

