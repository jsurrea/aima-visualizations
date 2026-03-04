# Chapter 3 — Solving Problems by Searching

**Part 2: Problem Solving**

Step-by-step animated BFS, DFS, UCS, A*, and heuristic search visualizations.

---

## Planned Visualizations

- **Uninformed Search Visualizer** (`uninformed-search`)
- **Informed Search Visualizer** (`informed-search`)
- **Heuristic Comparison** (`heuristic-comparison`)

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
- **Vite** for bundling (base path: `/chapter-03/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-03/viz-name`
