# Chapter 24 — Natural Language Processing

**Part 6: Communicating, Perceiving, and Acting**

N-gram models, CYK parsing, text classification, and smoothing techniques.

---

## Planned Visualizations

- **N-gram Language Model** (`ngram`)
- **CYK Parser** (`cyk`)
- **Text Classification Pipeline** (`text-classification`)

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
- **Vite** for bundling (base path: `/chapter-24/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-24/viz-name`
