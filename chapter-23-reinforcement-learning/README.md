# Chapter 23 — Reinforcement Learning

**Part 5: Machine Learning** · Status: ✅ Complete

Interactive visualizations for AIMA Chapter 23 — covering passive RL, active RL,
function approximation, policy gradient methods, and inverse RL — all on the
canonical 4×3 AIMA grid world (Fig. 23.1).

---

## Visualizations

### §23.2–23.3 Passive & Active RL — Grid World (`#passive-rl`)
Interactive 4×3 grid world showing Q-Learning or SARSA running episode-by-episode.
- Heat-map colouring of cells by max Q-value
- Greedy policy arrows update in real time
- Play / pause / step / reset controls with speed slider
- Algorithm switcher (Q-Learning vs SARSA)
- Configurable γ and number of episodes

### §23.2.3 Passive TD(0) — Utility Convergence Chart (`#td-learning`)
Line chart showing how each state's utility estimate evolves over trials under
the Passive TD(0) update rule `U(s) ← U(s) + α[r + γU(s′) − U(s)]`.
- Five key states tracked with distinct colours
- Interactive α and γ sliders rebuild the convergence curves instantly
- Play / pause / step / reset animation controls

### §23.3.3 Q-Learning — Q-Table Heat Map (`#q-learning`)
Detailed per-cell Q-table view with:
- Heat-map colouring by max Q(s,a)
- Best-action arrow per cell
- Click any cell to see all four Q-values and visit counts N(s,a)
- Sliders for γ, R⁺, Nₑ, number of episodes and episode playback position
- Episodic total-reward history chart at the bottom

### §23.4 Linear Function Approximation (`#function-approx`)
Demonstrates `Û_θ(s) = θ · f(s)` with five hand-crafted features:
bias, normalised column, normalised row, 1/dist-to-goal, 1/dist-to-pit.
- θ parameter bar chart updates after each TD step
- Grid heat-map shows estimated utility for every state
- TD error history chart
- Step / ×20 / Reset buttons; α and γ sliders

### §23.5 Softmax Policy & REINFORCE (`#policy-gradient`)
Shows the Boltzmann (softmax) policy `π(a|s) = exp(βQ)/Σexp(βQ)` for the grid:
- Click any non-terminal cell to inspect action probability bars
- β slider adjusts temperature (0 = uniform, ∞ = greedy)
- One-click REINFORCE gradient update for any action in the selected state
- Running log of REINFORCE updates and Q-value display

### §23.6 Inverse Reinforcement Learning (`#inverse-rl`)
Feature-matching IRL (Abbeel & Ng 2004):
`w⁽ⁱ⁾ = μ̂(π_E) − μ̂(π⁽ⁱ⁻¹⁾)` then L2-normalised.
- Toggle between expert trajectories and candidate-policy trajectories
- Grid heat-map coloured by inferred reward function
- Reward-weight bar chart (positive / negative features highlighted)
- Feature-expectation matching table compares expert vs. candidate
- IRL iterations slider (1–5) and γ slider

---

## Algorithm Coverage

| Section | Algorithm | Pure function |
|---------|-----------|---------------|
| §23.2.1 | Direct Utility Estimation | `directUtilityEstimation` |
| §23.2.2 | Passive ADP | `passiveADPLearner` |
| §23.2.3 | Passive TD(0) | `passiveTDLearner` |
| §23.3.3 | Q-Learning (exploration fn) | `qLearningStep`, `runQLearning` |
| §23.3.4 | SARSA | `sarsaStep`, `runSARSA` |
| §23.4   | Linear FA, TD-FA, Q-FA | `linearFunctionApprox`, `tdFAUpdate`, `qFAUpdate` |
| §23.5   | Softmax policy, REINFORCE | `softmaxPolicy`, `reinforceUpdate` |
| §23.6   | Feature expectations, IRL | `computeFeatureExpectations`, `featureMatchingIRL` |

---

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm test         # Run tests (100% branch + line coverage required)
npm run build    # Production build
```

---

## Architecture

Self-contained microfrontend — no imports from other chapter directories.

- **React 18** + **TypeScript strict**
- **Vite** (base path: `/chapter-23/`)
- **Vitest** + `@vitest/coverage-v8` (thresholds: branches 100%, lines 100%)
- **KaTeX** for all math rendering (imported once in `src/main.tsx`)
- All algorithm logic in `src/algorithms/index.ts` — pure functions, no side effects
- `requestAnimationFrame` for all animations; `prefers-reduced-motion` respected

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-23/viz-name`

