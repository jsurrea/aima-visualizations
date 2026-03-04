# Chapter 11 — Automated Planning

**Part 3: Knowledge, Reasoning, and Planning**

PDDL editor, GRAPHPLAN, HTN decomposition, and job-shop scheduling visualizations.

---

## Planned Visualizations

- **PDDL Editor** (`pddl`)
- **GRAPHPLAN Layer Builder** (`graphplan`)
- **HTN Decomposition** (`htn`)

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
- **Vite** for bundling (base path: `/chapter-11/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-11/viz-name`
