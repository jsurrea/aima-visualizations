# Chapter 12 — Quantifying Uncertainty

**Part 4: Uncertain Knowledge and Reasoning**

Probability axioms, joint distributions, Bayes' rule, and naive Bayes with interactive demos.

---

## Visualizations

### §12.1–12.2 Probability Axiom Explorer (`probability-axioms`)
Interactive sliders for P(A), P(B), and P(A∩B). Automatically computes P(A∨B) via the inclusion-exclusion principle, complements, and validates the Kolmogorov axioms in real time. Highlights violations in red and warns about Dutch Book arguments when the distribution is invalid.

### §12.3 Full Joint Distribution (`joint-distribution`)
Displays the complete 8-row P(Cavity, Toothache, Catch) joint distribution from §12.3. Click variable values to condition on them as evidence; consistent rows are highlighted while others are dimmed. Live inference shows P(Cavity | evidence) with the normalization constant α. Supports marginalization to sum out the Catch variable.

### §12.4 Independence Explorer (`independence-explorer`)
Shows the independence relationship between Weather (Sunny) and Dental health (Cavity). Sliders control P(Sunny) and P(Cavity); a dependency slider lets you deviate from the independent joint. A 2×2 joint table updates live and the independence check P(A∧B) = P(A)·P(B) is verified numerically.

### §12.5 Bayes' Rule Demo (`bayes-rule`)
Step-by-step animated walkthrough of the meningitis/stiff-neck example from §12.5. Five steps progress from prior → likelihood → evidence → formula → posterior result, with play/pause/speed controls. A separate panel demonstrates conditional independence: Toothache ⊥ Catch | Cavity.

### §12.6 Naive Bayes Classifier (`naive-bayes`)
Text classification demo with 15 toggleable feature words across four news categories (news, sports, business, weather). Selecting words updates the posterior bar chart in real time via naïve Bayes inference. Shows the full computation table P(c) · ∏ P(wᵢ|c) for each class.

### §12.7 Wumpus World Uncertainty (`wumpus-world`)
Interactive 4×4 Wumpus grid. Click cells to toggle breeze observations, Shift+click to mark safe. Pit probabilities are computed via frontier enumeration (exact Bayesian inference over pit configurations). Includes a "Book Example" button that loads the Fig 12.6 scenario from §12.7, showing P([1,3]) ≈ 0.31 and P([2,2]) ≈ 0.86.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (100% branch + line coverage required)
npm test

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/aima-visualizations/chapter-12/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-12/viz-name`
