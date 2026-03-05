# Chapter 14 — Probabilistic Reasoning over Time

**Part 4: Uncertain Knowledge and Reasoning**

Interactive visualizations for HMMs, Kalman filters, particle filters, and dynamic Bayesian networks over time — covering §14.1 through §14.5 of *AI: A Modern Approach, 4th Ed.*

---

## Visualizations

### 1. Time & Inference in Temporal Models (§14.1–14.2)

**Umbrella World HMM** — teaches temporal reasoning from first principles using the classic umbrella world example (Russell & Norvig §14.1–14.2).

- Toggle umbrella/sun evidence for up to 8 days
- Three view modes: **Filter** (forward pass), **Smooth** (forward-backward), **Viterbi** (most likely path)
- Animated day-by-day belief updates with bar charts (Rain vs No-Rain)
- Prediction chart: shows P(Rain) converging to stationary distribution over k future steps
- What-if sliders: transition probability P(stay rain) and sensor reliability P(umbrella | rain)

### 2. Hidden Markov Models (§14.3)

**Robot Localization on a 4×4 Grid** — demonstrates HMM matrix-form inference with a concrete localization task.

- 4×4 grid with walls; robot senses N/E/S/W wall presence
- Posterior distribution shown as heat-map on grid cells (dark → bright pink = low → high probability)
- Side-by-side: HMM filter view vs Viterbi most-likely-path view
- ε slider (sensor error rate 0–0.4) updates all probabilities live
- "Randomize observations" generates new sensing sequences
- Full ARIA labels on all grid cells

### 3. Kalman Filters (§14.4)

**1D and 2D Kalman Filter** — visualizes the predict-update cycle and uncertainty tracking.

- **1D section**: SVG chart with observation dots, posterior mean line, ±1σ shaded band, and animated Gaussian bell curve at current step. Sliders for μ₀, σ²₀, σ²ₓ, σ²_z.
- **2D section**: Circular trajectory with noisy observations, filtered path in pink, covariance ellipse (eigendecomposition) that shrinks as observations accumulate.
- σ_z/σ_x ratio slider shows how the filter balances prediction vs observation trust.

### 4. Particle Filter & DBNs (§14.5)

**Particle Filter for Umbrella World** — illustrates why particle filters work where exact inference becomes intractable.

- N particles (10–200) shown as colored dots (Rain=blue, NoRain=orange)
- Three animated phases: **Propagate** → **Weight** (dot size ∝ likelihood) → **Resample**
- Comparison chart: exact HMM filtering vs particle filter estimate vs SIS (no resampling) — shows weight degeneracy without resampling
- N particles slider demonstrates variance-accuracy trade-off

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
- **Vite** for bundling (base path: `/chapter-14/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-14/viz-name`
