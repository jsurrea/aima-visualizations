# Chapter 26 — Robotics

**Part 6: Communicating, Perceiving, and Acting**

Configuration space, RRT path planning, particle filter localization, and SLAM.

---

## Planned Visualizations

- **Configuration Space** (`config-space`)
- **RRT Path Planning** (`rrt`)
- **SLAM Demo** (`slam`)

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
- **Vite** for bundling (base path: `/chapter-26/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-26/viz-name`
