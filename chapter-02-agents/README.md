# Chapter 2 — Intelligent Agents

**Part 1: Artificial Intelligence**

PEAS framework, five agent architectures, and environment properties with interactive simulations.

---

## Planned Visualizations

- **PEAS Framework Builder** (`peas`)
- **Agent Type Explorer** (`agent-types`)
- **Vacuum Cleaner World** (`vacuum-world`)

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
- **Vite** for bundling (base path: `/chapter-02/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-02/viz-name`
