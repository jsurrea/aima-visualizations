# Chapter 25 — Deep Learning for NLP

**Part 6: Communicating, Perceiving, and Acting**

Word embeddings, attention mechanisms, Transformer architecture, and GPT generation.

---

## Planned Visualizations

- **Word Embeddings Explorer** (`word-embeddings`)
- **Attention Mechanism** (`attention`)
- **Transformer Architecture** (`transformer`)

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
- **Vite** for bundling (base path: `/chapter-25/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-25/viz-name`
