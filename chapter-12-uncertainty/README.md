# Chapter 12 — Quantifying Uncertainty

**Part 4: Uncertain Knowledge and Reasoning**

Probability axioms, joint distributions, Bayes' rule, and naive Bayes with interactive demos.

---

## Planned Visualizations

- **Probability Axiom Explorer** (`probability-axioms`)
- **Joint Distribution Table** (`joint-distribution`)
- **Bayes' Rule Demo** (`bayes-rule`)

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
- **Vite** for bundling (base path: `/chapter-12/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-12/viz-name`
