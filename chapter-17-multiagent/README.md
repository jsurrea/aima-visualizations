# Chapter 17 — Multiagent Decision Making

**Part 4: Uncertain Knowledge and Reasoning**

Normal-form games, Nash equilibria, mechanism design, and social choice visualizations.

---

## Planned Visualizations

- **Normal-Form Game Editor** (`normal-form`)
- **Nash Equilibrium Finder** (`nash-equilibrium`)
- **Mechanism Design** (`auction`)

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
- **Vite** for bundling (base path: `/chapter-17/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-17/viz-name`
