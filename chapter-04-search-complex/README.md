# Chapter 4 — Search in Complex Environments

**Part 2: Problem Solving**

Hill climbing, simulated annealing, genetic algorithms, beam search, gradient descent, AND-OR search, belief states, and online search in complex spaces (AIMA §4.1–4.5).

---

## Visualizations

### §4.1–4.1.4 Local Search & Optimization
- **Hill Climbing** (`hill-climbing`) — Steepest-ascent local search on a discrete landscape; shows current position, neighbors, and local-maximum detection.
- **Simulated Annealing** (`simulated-annealing`) — Stochastic local search with temperature schedule; demonstrates acceptance of downhill moves with probability e^(ΔE/T).
- **Genetic Algorithm** (`genetic-algorithm`) — Population-based search; visualizes selection, single-point crossover, and bitstring mutation across generations.

### §4.1.3 Local Beam Search
- **Local Beam Search** (`beam-search`) — Tracks k=3 beams simultaneously on the landscape; successors of all beams are generated and the top-k retained each iteration.

### §4.2 Local Search in Continuous Spaces
- **Gradient Descent** (`continuous-search`) — Minimizes f(x) = (x−3)² + 2·sin(5x) via gradient descent; SVG curve with trajectory dots; interactive α (step-size) slider shows the effect of learning rate on convergence.

### §4.3 Search with Nondeterministic Actions
- **AND-OR Search (Erratic Vacuum World)** (`and-or-search`) — Explores the 8-state erratic vacuum world where Suck can have two possible outcomes; visualizes the AND-OR tree with OR nodes (agent choices) and AND nodes (environment outcomes).

### §4.4 Search in Partially Observable Environments
- **Sensorless Belief State Search** (`belief-states`) — BFS over belief states of the deterministic vacuum world; shows how the set of possible states shrinks from {1..8} to {7,8} after the 4-step plan [Left, Suck, Right, Suck].

### §4.5 Online Search Agents
- **Online DFS Agent** (`online-search`) — Explores an unknown 3×3 grid maze using AIMA's ONLINE-DFS-AGENT; shows backtracking and incremental map building.
- **LRTA\*** (`online-search`) — Learning Real-Time A* on the same maze; visualizes H-value updates and how learned estimates guide the agent away from local minima.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/chapter-04/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-04/viz-name`
