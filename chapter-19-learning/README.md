# Chapter 19 — Learning from Examples

**Part 5: Machine Learning**

Decision trees, bias-variance tradeoff, SVMs, and ensemble methods with interactive training.

---

## Planned Visualizations

- **Decision Tree Learner** (`decision-tree`)
- **Bias-Variance Demo** (`bias-variance`)
- **Support Vector Machine** (`svm`)

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
- **Vite** for bundling (base path: `/chapter-19/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-19/viz-name`
