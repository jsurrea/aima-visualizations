# Chapter 27 — Computer Vision

**Part 6: Communicating, Perceiving, and Acting**

Convolution, edge detection, optical flow, object detection, and CNN feature visualization.

---

## Planned Visualizations

- **Convolution Animation** (`convolution`)
- **Edge Detection Pipeline** (`edge-detection`)
- **Optical Flow** (`optical-flow`)

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
- **Vite** for bundling (base path: `/chapter-27/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-27/viz-name`
