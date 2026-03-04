# Chapter 13 — Probabilistic Reasoning

**Part 4: Uncertain Knowledge and Reasoning**

Bayesian network builder, variable elimination, MCMC, and causal inference visualizations.

---

## Planned Visualizations

- **Bayesian Network Builder** (`bayes-net`)
- **Variable Elimination** (`variable-elimination`)
- **MCMC Sampling** (`mcmc`)

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
- **Vite** for bundling (base path: `/chapter-13/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-13/viz-name`
