# Chapter 1 — Introduction

**Part 1: Artificial Intelligence**

The four approaches to AI, history of artificial intelligence, and the standard model of rational agents.

---

## Planned Visualizations

- **The Four Approaches to AI** (`bfs-intro`)
- **AI History Timeline** (`timeline`)
- **Standard Model Loop** (`standard-model`)

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
- **Vite** for bundling (base path: `/chapter-01/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-01/viz-name`
