# Chapter 21 — Learning Probabilistic Models

**Part 5: Machine Learning**

MLE, Bayesian parameter learning, and EM algorithm for mixture of Gaussians visualizations.

---

## Planned Visualizations

- **Maximum Likelihood Estimation** (`mle`)
- **Bayesian Parameter Learning** (`bayesian-learning`)
- **EM Algorithm** (`em-algorithm`)

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
- **Vite** for bundling (base path: `/chapter-21/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-21/viz-name`
