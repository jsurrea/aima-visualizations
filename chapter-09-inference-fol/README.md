# Chapter 9 — Inference in First-Order Logic

**Part 3: Knowledge, Reasoning, and Planning**

Unification, forward/backward chaining, and resolution refutation with step-by-step traces.

---

## Visualizations

### §9.1 — Propositional vs. First-Order Inference
Interactive demo of **Universal Instantiation (UI)** and **Existential Instantiation (EI)**. Shows how FOL sentences are reduced to propositional logic by substituting ground terms for universally quantified variables. Includes:
- Side-by-side comparison of UI and EI inference rules (KaTeX rendered)
- Clickable substitution buttons to see each instantiation
- Multiple example domains (evil kings, mortal philosophers, animals)
- "What if?" callout explaining the infinite-instantiation problem with function symbols

### §9.2 — Unification Step-by-Step
Interactive trace of **Robinson's UNIFY algorithm**. Shows how two FOL terms are unified to produce a Most General Unifier (MGU), with full step-by-step playback:
- Substitution θ built incrementally at each step
- Remaining pairs panel showing what's left to unify
- Occurs-check failure detection
- Three examples: simple match, impossible match, occurs check

### §9.3 — Forward Chaining
Step-by-step trace of **FOL-FC-ASK** (Horn clause forward chaining). Starting from known facts, rules fire repeatedly until the query is proved or a fixed point is reached:
- Ancestor KB (family relationships)
- New facts highlighted as they are derived
- Fired rule and variable bindings shown at each step
- Fixed-point detection

### §9.4 — Backward Chaining
Step-by-step trace of **FOL-BC-ASK** (backward chaining). Works backward from the goal through rules until known facts are reached:
- Two examples: AIMA Crime KB (Criminal(West)) and Family KB (GrandParent)
- Proof search tree shown with depth-indented nodes
- Node status: ✓ success, ✗ failure, ? pending
- Active variable bindings displayed at each step
- Backtracking steps clearly labeled

### §9.5 — Resolution Refutation
Step-by-step trace of propositional resolution. Negates the goal and resolves clause pairs until the empty clause (contradiction) is derived:
- Active clauses highlighted during each resolution step
- New resolvent marked with "← new"
- KB vs negated-goal clause labeling
- Fixed-point detection

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (100% coverage required)
npm test -- --run --coverage

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/aima-visualizations/chapter-09/`)
- **Vitest** for unit testing (100% branch + line coverage on `src/algorithms/`)
- **KaTeX** for math rendering

### Algorithm implementations (pure TS, `src/algorithms/index.ts`)

| Function | Description |
|---|---|
| `occursIn` | Variable occurs-check for unification |
| `applySubstitution` | Apply a substitution to a FOL term |
| `termToLatex` | Render a FOL term as a LaTeX string |
| `unify` | Robinson's UNIFY algorithm with step trace |
| `forwardChain` | FOL-FC-ASK (Horn clause forward chaining) with step trace |
| `backwardChain` | FOL-BC-ASK (Horn clause backward chaining) with step trace |
| `universalInstantiation` | Universal Instantiation demo for §9.1 |
| `literalToString` | Render a CNF literal as string |
| `clauseToLatex` | Render a CNF clause as LaTeX |
| `resolve` | Resolve two CNF clauses |
| `propositionalResolution` | Resolution refutation with step trace |

All functions are pure (no side effects) and return immutable step arrays for playback.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-09/viz-name`
