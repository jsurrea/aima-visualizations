# Chapter 14 — Probabilistic Reasoning over Time

**Part 4: Uncertain Knowledge and Reasoning**

HMMs, Kalman filters, particle filters, and dynamic Bayesian networks over time.

---

## Planned Visualizations

- **Hidden Markov Model** (`hmm`)
- **Kalman Filter** (`kalman-filter`)
- **Particle Filter** (`particle-filter`)

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
