# Chapter 29 — The Future of AI

**Part 7: Conclusions**

AI capabilities roadmap, architecture spectrum, and human-compatible AI visualizations.

---

## Planned Visualizations

- **AI Capabilities Roadmap** (`capabilities-roadmap`)
- **Architecture Spectrum** (`architecture-spectrum`)
- **Human-Compatible AI** (`human-compatible`)

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
- **Vite** for bundling (base path: `/chapter-29/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-29/viz-name`
