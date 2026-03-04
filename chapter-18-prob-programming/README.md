# Chapter 18 — Probabilistic Programming

**Part 4: Uncertain Knowledge and Reasoning**

Relational probability models, plate notation, and MCMC inference over probabilistic programs.

---

## Planned Visualizations

- **Relational Probability Model** (`relational-model`)
- **Plate Notation Diagram** (`plate-notation`)
- **Probabilistic Program Tracer** (`program-tracer`)

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
- **Vite** for bundling (base path: `/chapter-18/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-18/viz-name`
