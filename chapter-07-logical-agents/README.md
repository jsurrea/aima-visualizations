# Chapter 7 — Logical Agents

**Part 3: Knowledge, Reasoning, and Planning**

Interactive visualizations for Wumpus World exploration, propositional logic, DPLL, WalkSAT, and resolution-based theorem proving.

---

## Visualizations

### §7.1 KB-Agent (`kb-agent`)
Step-by-step simulation of the Knowledge-Based Agent loop (Figure 7.1). Shows TELL/ASK cycle with percept-driven KB updates, for a 5-step Wumpus World scenario. Includes a “what-if” breeze toggle to see how the agent’s reasoning changes.

### §7.2 Wumpus World (`wumpus-world`)
A 4×4 grid where the agent uses a propositional KB to infer safe cells, locate the Wumpus, and find the gold. Each step shows the current KB facts and cell status deductions (safe, pit, wumpus, unknown).

### §7.3–7.4 Logic & Entailment (`logic`)
Visualizes TT-ENTAILS (Figure 7.10): enumerates all truth-table rows to check if KB ⊨ α. Rows where KB is true are highlighted. Includes three preset examples: modus ponens (proved), counter-example (disproved), and tautology check (always proved).

### §7.4 Truth Table (`truth-table`)
Generates the full truth table for the hypothetical syllogism tautology (P⇒Q) ∧ (Q⇒R) ⇒ (P⇒R). All 8 rows shown with per-column sub-formula evaluation.

### §7.5 PL-Resolution (`resolution`)
Step-by-step PL-RESOLUTION (Figure 7.12). Resolves clause pairs from KB ∧ ¬α until the empty clause is derived (proved) or no new clauses can be added (disproved). Two preset examples with selectable “what-if” control.

### §7.6 DPLL (`dpll`)
Davis-Putnam-Logemann-Loveland SAT solver with unit propagation, pure symbol elimination, and recursive branching. Each decision and backtrack step is shown with the current partial assignment.

### §7.6–7.7 WalkSAT (`walksat`)
Randomized local-search SAT solver (Figure 7.15). Visualizes each flip as either greedy (maximizes satisfied clauses) or random walk. Includes noise-level slider (p) and formula selector to explore the tradeoff between greedy and random search.

---

## Development

```bash
npm install   # Install dependencies
npm run dev   # Start dev server
npm test      # Run tests (100% coverage required)
npm run build # Production build
```

---

## Architecture

Self-contained microfrontend:
- **React 18** + **TypeScript** (strict mode)
- **Vite** (base: `/aima-visualizations/chapter-07/`)
- **Vitest** (100% branch+line coverage on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions. Never import from other chapter directories.
