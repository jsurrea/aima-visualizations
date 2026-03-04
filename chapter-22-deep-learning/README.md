# Chapter 22 — Deep Learning

**Part 5: Machine Learning**

Neural network playground, backpropagation, CNNs, LSTMs, and GANs step-by-step.

---

## Planned Visualizations

- **Neural Network Playground** (`nn-playground`)
- **Backpropagation Visualizer** (`backprop`)
- **CNN Feature Maps** (`cnn`)

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
- **Vite** for bundling (base path: `/chapter-22/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-22/viz-name`
