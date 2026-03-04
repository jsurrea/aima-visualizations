# Chapter 6 — Adversarial Search and Games

**Part 2: Problem Solving**

Minimax, alpha-beta pruning, MCTS, and stochastic game trees with interactive game playing.

---

## Planned Visualizations

- **Minimax Game Tree** (`minimax`)
- **Alpha-Beta Pruning** (`alpha-beta`)
- **Monte Carlo Tree Search** (`mcts`)

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
- **Vite** for bundling (base path: `/chapter-06/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-06/viz-name`
