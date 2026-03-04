# Chapter 5 — Constraint Satisfaction Problems

**Part 2: Problem Solving**

AC-3 arc consistency, backtracking search, and heuristics for constraint satisfaction problems.

---

## Planned Visualizations

- **CSP Builder** (`csp-builder`)
- **AC-3 Algorithm** (`ac3`)
- **Backtracking Search** (`backtracking`)

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
- **Vite** for bundling (base path: `/chapter-05/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-05/viz-name`
