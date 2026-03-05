# Chapter 16 — Making Complex Decisions

**Part 4: Uncertain Knowledge and Reasoning** (pp. 552–588)

Interactive visualizations covering sequential decision problems, algorithms for MDPs, bandit problems, and partially observable MDPs.

---

## Visualizations

### §16.1 — MDP Grid World (`MDPGridWorldViz`)
The classic 4×3 grid-world MDP from Figure 16.1. Features:
- Heat-colored cells showing state utilities (red=low, green=high)
- Policy arrows showing the optimal action in each state
- Interactive **r** (step reward) and **γ** (discount factor) sliders that rebuild the MDP live
- Bellman equation rendered with KaTeX
- "What if" control: change r from -0.04 to -1.0 or 0 to see dramatically different optimal policies
- Hover cells to inspect utility and policy

### §16.2.1 — Value Iteration (`ValueIterationViz`)
Step-by-step animation of the value iteration algorithm (Figure 16.6). Features:
- Play/Pause/Step/Speed controls with requestAnimationFrame animation
- SVG line chart showing convergence of utilities for 4 key states over iterations
- State inspection panel: iteration count, max delta, convergence status
- Grid showing all utility values at each step
- "What if": change gamma to see how many iterations convergence requires

### §16.2.2 — Policy Iteration (`PolicyIterationViz`)
Policy iteration with phase-tinted visualization (Figure 16.9). Features:
- Blue background for policy evaluation phase, green for improvement phase
- Side-by-side old policy vs. new policy comparison when improvement happens
- Shows which states changed their policy in each improvement step
- "What if": adjust the step reward

### §16.3 — Bandit Simulator (`BanditSimulator`)
Multi-armed bandit with UCB1 and Thompson Sampling (Section 16.3). Features:
- Configure 3 arms with adjustable true means (sliders 0-1)
- SVG bar chart showing estimated means and UCB confidence intervals
- Cumulative regret plot over rounds
- Toggle between UCB1 and Thompson Sampling algorithms
- State panel: current round, selected arm, last reward, cumulative regret

### §16.4/§16.5 — POMDP Visualizer (`POMDPViz`)
Two-state POMDP with alpha-vector value iteration (Figure 16.15). Features:
- Belief state slider: b(B) from 0 to 1
- SVG alpha-vector plot showing hyperplanes and the piecewise-linear value function envelope
- Interactive belief update buttons (action + observation)
- Play through value iteration depth steps with animation
- "What if": adjust sensor accuracy to see how less informative sensors flatten the value function

---

## Tests

96 tests with 100% branch, line, function, and statement coverage:

```bash
npm test -- --run --coverage
```

---

## Development

```bash
npm install     # Install dependencies
npm run dev     # Start dev server
npm test        # Run tests with coverage
npm run build   # Build for production (gzip ~13 kB chapter code)
```

---

## Architecture

Self-contained microfrontend built with:
- **React 18** + **TypeScript** (strict mode, no `any`)
- **Vite** (base: `/aima-visualizations/chapter-16/`)
- **Vitest** for unit testing (100% coverage on `src/algorithms/`)
- **KaTeX** for all math rendering

Algorithm logic lives in `src/algorithms/index.ts` as pure functions with no side effects.
Never import from other chapter directories.
