# Chapter 20 — Knowledge in Learning

**Part 5: Machine Learning**

Explanation-based learning, ILP, and version spaces with interactive hypothesis lattices.

---

## Planned Visualizations

- **Explanation-Based Learning** (`ebl`)
- **ILP Step-by-Step** (`ilp`)
- **Version Space Explorer** (`version-space`)

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
- **Vite** for bundling (base path: `/chapter-20/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-20/viz-name`
