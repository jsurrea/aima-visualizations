# Chapter 1 — Introduction

**Part 1: Artificial Intelligence**

The four approaches to AI, history of artificial intelligence, and the standard model of rational agents.

---

## Visualizations

- **The Four Approaches to AI** (`approaches`) — §1.1: Interactive 2×2 matrix (Thinking/Acting × Human/Rational). Click any cell to see examples and key figures.
- **The Foundations of AI** (`foundations`) — §1.2: The 8 disciplines that contributed to AI (Philosophy, Mathematics, Economics, Neuroscience, Psychology, Computer Engineering, Control Theory, Linguistics). Expandable cards with a "What if?" selector.
- **AI History Timeline** (`timeline`) — §1.3: Chronological timeline of key AI events from 1943 to present.
- **Standard Agent-Environment Loop** (`standard-model`) — §1.1.4: Animated step-through of the perceive–decide–act–update cycle.
- **The State of the Art** (`capabilities`) — §1.4: What AI can do today, with domain filters, human-comparison badges, and sortable cards.
- **Risks and Benefits of AI** (`risks-benefits`) — §1.5: Two-column layout of benefits vs risks, AI capability level slider, and a dedicated Value Alignment Problem section with King Midas, Gorilla, and Standard Model's Flaw explanations.

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
- **Vite** for bundling (base path: `/chapter-01/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-01/viz-name`
