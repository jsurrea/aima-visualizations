# Chapter 8 — First-Order Logic

**Part 3: Knowledge, Reasoning, and Planning**

Interactive visualizations covering all four sections of Chapter 8 (AIMA 4th ed., pp. 269–297).

---

## Visualizations

### §8.1 Representation Revisited (`representation`)
Side-by-side comparison of propositional logic, first-order logic, and higher-order logic.
Shows expressiveness and complexity trade-offs with KaTeX-rendered example sentences.

### §8.2 FOL Syntax Tree Builder (`syntax-tree`)
Parse tree for a first-order formula. Each node shows the operator or symbol; colors indicate
the syntactic category (quantifier, connective, atom, term). Built from the `buildSyntaxTree`
pure function.

### §8.2 Unification — Robinson's Algorithm (`unification`)
Step-by-step playback of Robinson's unification algorithm. Shows the substitution θ growing,
remaining pairs to unify, and the final success/failure result. Demonstrates occurs-check
failures and symbol clashes.

### §8.2 Quantifier Scope (`quantifiers`)
Animates universal (∀) and existential (∃) quantifiers in a nested formula, highlighting
nesting depth and displaying which variables are free vs bound at each step.

### §8.3 Kinship Domain Knowledge Base (`kinship-kb`)
Four FOL sentences from the kinship domain (AIMA §8.3): no-self-parent, parent→child,
sibling biconditional, and grandparent transitivity. Click any sentence to expand its
natural-language description and KaTeX rendering.

### §8.4 Knowledge Engineering (`knowledge-engineering`)
Interactive six-step knowledge engineering process (§8.4). Navigate each step to read
its description, see an example, and inspect the artifacts it produces.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests with coverage
npm test -- --run --coverage

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/chapter-08/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-08/viz-name`
