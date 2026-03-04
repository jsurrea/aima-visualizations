# Chapter 15 — Making Simple Decisions

**Part 4: Uncertain Knowledge and Reasoning**

Utility functions, decision networks, value of information, and human preference anomalies.

---

## Planned Visualizations

- **Utility Function Explorer** (`utility-functions`)
- **Decision Network Editor** (`decision-network`)
- **Value of Information** (`voi`)

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
- **Vite** for bundling (base path: `/chapter-15/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-15/viz-name`
