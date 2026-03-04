# GitHub Copilot Instructions — AIMA Visualizations

## Project

Interactive visualization companion for *AI: A Modern Approach, 4th Ed.* (Russell & Norvig). Microfrontend architecture on GitHub Pages. Each chapter is an independent TypeScript project in `/chapter-XX-name/`. Landing page is in `/landing` (Astro).

The full textbook PDF is available at `Book.pdf` in the repository root. **Before implementing any chapter, fully read the relevant chapter(s) in the PDF to ensure every algorithmic detail, notation, and concept is accurately represented in the visualizations.**

---

## Mandatory Rules

- **TypeScript everywhere.** `strict: true`. No `any`. No plain `.js` in `src/`.
- **Algorithm logic:** pure functions in `src/algorithms/`, zero side effects, 100% test coverage (Vitest).
- **All math:** KaTeX. Import `katex/dist/katex.min.css`. Never use Unicode math symbols in display text.
- **All animations:** respect `prefers-reduced-motion`. Use `requestAnimationFrame`, not `setInterval`.
- **All colors:** WCAG AA contrast minimum. Use CSS custom properties from the design system.
- **Responsive:** mobile-first, works at 320 px width minimum.
- **No cross-chapter imports.** Each chapter is a standalone project.
- **Bundle size:** must stay under 500 KB gzipped per chapter.

---

## Visualization Standards

Every visualization must have:

1. A **title** and 1–2 sentence explanation of what it shows
2. **Controls:** play/pause, step forward, step backward, speed slider, reset
3. A **state inspection panel** showing current algorithm variables (frontier, explored, current node, etc.)
4. **LaTeX-rendered notation** for all mathematical expressions
5. **Active element highlighting** (current node, active constraint, active edge, etc.)
6. Full **keyboard navigation** and **ARIA labels** on all interactive elements
7. A static fallback when `prefers-reduced-motion` is enabled

---

## Algorithm Implementation Pattern

```typescript
// src/algorithms/bfs.ts

export interface BFSStep {
  frontier: ReadonlyArray<string>;
  explored: ReadonlySet<string>;
  currentNode: string;
  action: string;
}

export function bfs(
  graph: ReadonlyMap<string, ReadonlyArray<string>>,
  start: string,
  goal: string,
): ReadonlyArray<BFSStep> {
  // Pure function — returns all steps for playback
  // No side effects, no mutation of input
}
```

- Each algorithm returns **all steps** as an immutable array for step-by-step playback.
- The visualization component consumes this array and renders the step at the current index.
- Never mutate algorithm state from the visualization layer.

---

## Design System

Use these CSS custom properties (defined in global stylesheet):

```css
--color-primary: #6366F1;
--color-primary-dark: #4338CA;
--color-secondary: #10B981;
--color-accent: #F59E0B;
--surface-base: #0A0A0F;
--surface-1: #111118;
--surface-2: #1A1A24;
--surface-3: #242430;
--surface-border: rgba(255,255,255,0.08);
--part-1: #6366F1;  /* Part I  — AI */
--part-2: #3B82F6;  /* Part II — Problem Solving */
--part-3: #8B5CF6;  /* Part III — Knowledge */
--part-4: #EC4899;  /* Part IV — Uncertainty */
--part-5: #10B981;  /* Part V  — Machine Learning */
--part-6: #F59E0B;  /* Part VI — Communicating/Perceiving */
--part-7: #EF4444;  /* Part VII — Conclusions */
--radius: 12px;
--radius-lg: 20px;
--font-sans: 'Inter Variable', system-ui, sans-serif;
```

---

## File Structure (per chapter)

```
chapter-XX-name/
├── README.md              ← Chapter-specific outline and visualization specs
├── manifest.json          ← Chapter metadata (id, title, sections, status, etc.)
├── package.json           ← name: "@aima-vis/chapter-XX"
├── tsconfig.json          ← extends ../../tsconfig.base.json
├── vite.config.ts         ← base: '/chapter-XX/'
├── vitest.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── algorithms/        ← Pure TS algorithm implementations
    │   └── index.ts       ← Exported algorithm functions with JSDoc
    ├── components/        ← React components for visualizations
    │   └── Placeholder.tsx
    ├── types/
    │   └── index.ts       ← Shared TypeScript interfaces
    └── utils/
        └── mathUtils.ts   ← KaTeX wrapper, color utilities, animation helpers
```

---

## Testing Requirements

- Test file naming: `src/algorithms/*.test.ts` or `tests/algorithms.test.ts`
- Use **Vitest** with `describe`/`it`/`expect`
- 100% branch + line coverage on all exported algorithm functions
- Test edge cases: empty graphs, disconnected nodes, no-path scenarios, single-node graphs

---

## Chapter Directory → URL Path Mapping

| Directory | Deployed URL path |
|---|---|
| `chapter-01-introduction` | `/chapter-01` |
| `chapter-02-agents` | `/chapter-02` |
| `chapter-03-search` | `/chapter-03` |
| `chapter-04-search-complex` | `/chapter-04` |
| `chapter-05-csp` | `/chapter-05` |
| `chapter-06-adversarial` | `/chapter-06` |
| `chapter-07-logical-agents` | `/chapter-07` |
| `chapter-08-first-order-logic` | `/chapter-08` |
| `chapter-09-inference-fol` | `/chapter-09` |
| `chapter-10-knowledge-rep` | `/chapter-10` |
| `chapter-11-planning` | `/chapter-11` |
| `chapter-12-uncertainty` | `/chapter-12` |
| `chapter-13-probabilistic-reasoning` | `/chapter-13` |
| `chapter-14-temporal-reasoning` | `/chapter-14` |
| `chapter-15-simple-decisions` | `/chapter-15` |
| `chapter-16-complex-decisions` | `/chapter-16` |
| `chapter-17-multiagent` | `/chapter-17` |
| `chapter-18-prob-programming` | `/chapter-18` |
| `chapter-19-learning` | `/chapter-19` |
| `chapter-20-knowledge-learning` | `/chapter-20` |
| `chapter-21-prob-models` | `/chapter-21` |
| `chapter-22-deep-learning` | `/chapter-22` |
| `chapter-23-reinforcement-learning` | `/chapter-23` |
| `chapter-24-nlp` | `/chapter-24` |
| `chapter-25-deep-nlp` | `/chapter-25` |
| `chapter-26-robotics` | `/chapter-26` |
| `chapter-27-computer-vision` | `/chapter-27` |
| `chapter-28-ethics-safety` | `/chapter-28` |
| `chapter-29-future-ai` | `/chapter-29` |

---

## PR / Branch Conventions

- Branch name: `chapter-XX/viz-name` (e.g. `chapter-03/astar-search`)
- One PR per chapter directory
- CI must pass (lint, test with 100% coverage, build < 500 KB gzipped)
- Update `README.md` inside the chapter directory with new visualization descriptions
