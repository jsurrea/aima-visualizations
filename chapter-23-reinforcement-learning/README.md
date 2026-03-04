# Chapter 23 — Reinforcement Learning

**Part 5: Machine Learning**

TD learning, Q-learning, policy gradient, and actor-critic on interactive grid worlds.

---

## Planned Visualizations

- **TD Learning Grid World** (`td-learning`)
- **Q-Learning Table** (`q-learning`)
- **Policy Gradient** (`policy-gradient`)

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
- **Vite** for bundling (base path: `/chapter-23/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-23/viz-name`
