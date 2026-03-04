# Contributing to AIMA Visualizations

Thank you for contributing to **AIMA Visualized** — an open-source interactive visualization companion for *Artificial Intelligence: A Modern Approach, 4th Edition*.

---

## Visualization Quality Standards

- Every visualization must be **interactive** — users can adjust parameters and see results update in real time.
- All visualizations must support **step-by-step** playback with play/pause, step forward/backward, speed control, and reset.
- Provide a **state inspection panel** showing current algorithm variables (frontier, explored set, current node, etc.).
- Render all mathematical expressions with **KaTeX** — never use plain Unicode math symbols in display text.
- All active/highlighted elements must use the **design system color palette** (CSS custom properties).
- Every visualization must be **responsive**: desktop ≥ 1024 px, tablet ≥ 768 px, mobile ≥ 375 px.
- All interactive elements need **ARIA labels** and full **keyboard navigation**.
- Respect `prefers-reduced-motion` — provide a static fallback for all animations.
- Per-chapter **bundle size must stay under 500 KB gzipped**.

---

## Algorithm Implementation Standards

- All algorithm logic lives in `src/algorithms/` as **pure TypeScript functions** with zero side effects.
- No `any` types. `strict: true` is enforced by `tsconfig.base.json`.
- **100% unit test coverage** (branch + line) is required for every exported function. Use **Vitest**.
- Tests live alongside source in `src/algorithms/*.test.ts` or in `tests/`.
- Exported functions must include **JSDoc comments** describing parameters, return type, and algorithmic complexity.
- No cross-chapter imports. Each chapter is a **fully self-contained** project.
- Use `requestAnimationFrame` for animations — never `setInterval`.

---

## Branch Naming

```
chapter-XX/viz-name
```

Examples:
- `chapter-03/astar-search`
- `chapter-22/backpropagation`
- `landing/chapter-grid-filter`

---

## PR Checklist

Before opening a pull request, ensure:

- [ ] Your branch name follows the `chapter-XX/viz-name` convention.
- [ ] All new/modified code is **TypeScript** — no `.js` source files in `src/`.
- [ ] All exported algorithm functions have **100% Vitest coverage** (`npm test -- --coverage`).
- [ ] All math is rendered with **KaTeX** — no Unicode math symbols in display text.
- [ ] The visualization is **responsive** at 320 px, 768 px, and 1280 px viewport widths.
- [ ] All interactive elements have **ARIA labels** and work with keyboard navigation.
- [ ] Animations respect **`prefers-reduced-motion`**.
- [ ] Gzip bundle size is **< 500 KB** (`npm run build` and check `dist/` output).
- [ ] `README.md` inside the chapter directory is updated with the new visualization description.
- [ ] The PR touches **only one chapter directory** plus the root `README.md` (if applicable).
- [ ] CI passes (lint, test, build).

---

## Design System

All components must use CSS custom properties defined in the global stylesheet:

```css
--color-primary: #6366F1;
--color-primary-dark: #4338CA;
--color-secondary: #10B981;
--color-accent: #F59E0B;
--surface-base: #0A0A0F;
--surface-1: #111118;
--surface-2: #1A1A24;
--surface-3: #242430;
```

Part colors for chapter badges:
```css
--part-1: #6366F1;  /* Part I  — Artificial Intelligence */
--part-2: #3B82F6;  /* Part II — Problem Solving */
--part-3: #8B5CF6;  /* Part III — Knowledge, Reasoning, and Planning */
--part-4: #EC4899;  /* Part IV — Uncertain Knowledge and Reasoning */
--part-5: #10B981;  /* Part V  — Machine Learning */
--part-6: #F59E0B;  /* Part VI — Communicating, Perceiving, and Acting */
--part-7: #EF4444;  /* Part VII — Conclusions */
```

---

## Getting Help

Open an issue with the label `question` or `help wanted`, or start a Discussion.

*Independent educational resource, not affiliated with Pearson Education, Stuart Russell, or Peter Norvig.*
