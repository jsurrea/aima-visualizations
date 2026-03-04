# Chapter 4 — Search in Complex Environments

**Part 2: Problem Solving**

Hill climbing, simulated annealing, genetic algorithms, and online search in complex spaces.

---

## Planned Visualizations

- **Hill Climbing Landscape** (`hill-climbing`)
- **Simulated Annealing** (`simulated-annealing`)
- **Genetic Algorithm** (`genetic-algorithm`)

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
