# Chapter 28 — Philosophy, Ethics, and Safety of AI

**Part 7: Conclusions**

AI ethics taxonomy, algorithmic fairness metrics, and value alignment timeline.

---

## Planned Visualizations

- **AI Ethics Taxonomy** (`ethics-taxonomy`)
- **Algorithmic Fairness Demo** (`fairness`)
- **AI Safety Spectrum** (`safety-spectrum`)

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
- **Vite** for bundling (base path: `/chapter-28/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-28/viz-name`
