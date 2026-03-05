# Chapter 20 — Knowledge in Learning

**Part 5: Machine Learning** | Status: ✅ Complete

Interactive visualization companion for AIMA Chapter 20 (pp. 739–771), covering all five sections.

---

## Visualizations

### §20.1 — Logical Formulation of Learning

#### Current-Best-Hypothesis (CBH)
Maintains a single hypothesis and refines it as examples arrive:
- **False positive** → specialize (add a condition)
- **False negative** → generalize (drop a condition)

Interactive step-by-step playback with play/pause/step controls. Includes a **what-if panel** to change the initial hypothesis and observe how the refinement path changes.

#### Version Space Explorer
Tracks the complete set of consistent hypotheses using two boundary sets:
- **G-set** (most general) — upper boundary
- **S-set** (most specific) — lower boundary

Step-by-step update for each new example (positive/negative). Supports adding custom examples to see live updates to S and G. Includes a **"Inject Contradiction"** button to demonstrate version space collapse.

---

### §20.2 — Knowledge in Learning (Entailment Constraints)

Side-by-side comparison of all four learning paradigms with their formal entailment constraints (rendered in KaTeX):

| Paradigm | Constraint | Key insight |
|----------|-----------|-------------|
| Pure Inductive Learning (PIL) | `Hypothesis ∧ Desc ⊨ Class` | No background needed; many examples required |
| Explanation-Based Learning (EBL) | `Background ⊨ Hypothesis` | Deductive; one example suffices |
| Relevance-Based Learning (RBL) | `Background ∧ Desc ∧ Class ⊨ Hypothesis` | Determinations shrink hypothesis space |
| KBIL / ILP | `Background ∧ Hypothesis ∧ Desc ⊨ Class` | Most general; learns new relational facts |

Includes an interactive comparison table and cumulative learning diagram.

---

### §20.3 — Explanation-Based Learning (EBL)

Step-by-step walkthrough of the canonical AIMA example:
- Goal: `Simplify(1×(0+X), X)`
- Background: rewrite rules for arithmetic simplification
- Extracted rule: `ArithmeticUnknown(z) ⇒ Simplify(1×(0+z), z)`

Features:
- Interactive proof tree viewer (specific ↔ generalized toggle)
- Leaf conditions panel showing dropped vs. retained conditions
- Collapsible KB rules viewer
- **What-if panel**: change the expression to see what rule EBL would extract

---

### §20.4 — Relevance-Based Learning: Minimal Consistent Determinations

Interactive implementation of the MINIMAL-CONSISTENT-DET algorithm (AIMA Figure 20.8).

Features:
- Two datasets: conductance (book example) and grades (custom)
- Step-by-step subset search with consistency checking
- **Manual subset tester**: toggle attributes and instantly see if they form a consistent determination
- Learning curve comparison (DTL vs. RBDTL exponential speedup)

---

### §20.5 — Inductive Logic Programming: FOIL

Step-by-step visualization of the FOIL algorithm learning `Grandfather(x,y)`:
- Clause construction: `Father(x,z) ∧ Parent(z,y) ⇒ Grandfather(x,y)`
- FOIL-Gain heuristic shown at each step
- Coverage bars for positive/negative examples

Also includes:
- **Interactive clause builder**: toggle any combination of 6 literals and see live coverage stats
- Family tree visualization
- Inverse resolution explanation with diagram (§20.5.3)

---

## Algorithm Implementations (src/algorithms/index.ts)

All functions are pure (no side effects) with 100% test coverage:

| Function | Description |
|----------|-------------|
| `coversExample` | Check if hypothesis covers an example |
| `isMoreGeneralOrEqual` | Generality ordering on hypotheses |
| `minimalGeneralization` | Generalize h to cover a positive example |
| `minimalSpecializations` | Specialize h to exclude a negative example |
| `versionSpaceUpdate` | One-step Candidate Elimination update |
| `versionSpaceLearning` | Full Version Space algorithm (returns steps) |
| `currentBestLearning` | Current-Best-Hypothesis search (returns steps) |
| `eblSimplificationSteps` | Pre-built EBL proof steps for arithmetic example |
| `dropAlwaysTrueConditions` | Filter leaf conditions by background KB |
| `isConsistentDetermination` | Check if attribute subset determines target |
| `subsetsOfSize` | Generate all k-subsets |
| `minimalConsistentDet` | MINIMAL-CONSISTENT-DET algorithm (returns steps) |
| `foilGain` | FOIL information gain heuristic |
| `computeCoverage` | Count pos/neg examples covered by bindings |
| `foilGrandparentSteps` | Pre-built FOIL steps for Grandfather example |
| `getFamilyData` | Family dataset for FOIL demonstration |
| `clauseCovers` | Check if clause body covers a (x,y) pair |
| `clauseCoverage` | Compute pos/neg coverage for a clause |

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

Self-contained microfrontend:
- **React 18** + **TypeScript** (strict mode, `noUncheckedIndexedAccess`)
- **Vite** (base: `/aima-visualizations/chapter-20/`)
- **Vitest** with 100% branch+line+function+statement coverage
- **KaTeX** for all math (imported once at `src/main.tsx`)
- Module federation via `@originjs/vite-plugin-federation`

