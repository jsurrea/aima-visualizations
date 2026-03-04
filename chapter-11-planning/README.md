# Chapter 11 — Automated Planning

**Part 3: Knowledge, Reasoning, and Planning**

Interactive visualizations covering all 7 sections of AIMA Chapter 11: classical PDDL planning, forward/backward search algorithms, heuristics, HTN decomposition, sensorless planning, and job-shop scheduling with the Critical Path Method.

---

## Visualizations

### §11.1 Classical Planning & PDDL (`classical-planning`)
An **interactive Blocks World** demo with blocks A, B, C. Users click applicable actions to transition the state. Shows:
- All current true fluents (color-coded per block)
- Goal satisfaction status for each goal fluent
- Applicable actions with their ADD/DELETE lists
- Block diagram updating in real-time
- KaTeX formula: `RESULT(s, a) = (s − DEL(a)) ∪ ADD(a)`

### §11.2 Forward & Backward Search (`search-algorithms`)
Step-by-step playback of BFS-based search on the **Spare Tire Problem**:
- **Forward (Progression)**: explores states by applying applicable actions; shows frontier size, explored count, heuristic value, and plan so far
- **Backward (Regression)**: regresses goal descriptions through relevant actions; shows current goal description (positive + negative fluents) at each step
- Play/Pause/Step/Reset controls and speed selector for both

### §11.3 Heuristics for Planning (`heuristics`)
Side-by-side comparison of `h₁` (ignore preconditions) and `h₂` (ignore delete lists):
- Slider to control how many goals are currently satisfied
- Live bar charts showing both heuristic values
- KaTeX formulas and explanation of admissibility and dominance (h₁ ≤ h₂ ≤ h*)

### §11.4 Hierarchical Task Networks (`htn-planning`)
Step-by-step BFS HTN search on a **Hawaii vacation planning** example:
- Hierarchy: `GoOnVacation → [GetToHawaii, DoActivities]` with multiple refinements
- Each step shows which HLA is being expanded, the refinement chosen, and the evolving plan
- HLAs vs. primitive actions visually distinguished; solution path highlighted

### §11.5 Sensorless & Contingent Planning (`nondeterministic`)
Belief-state evolution for the **painting problem**:
- Shows `trueFluents`, `falseFluents`, and `unknown` fluents separately
- Step-by-step playback of applying paint actions
- Demonstrates how sensorless actions eliminate uncertainty

### §11.6 Time, Schedules & Resources (`scheduling`)
Interactive **Critical Path Gantt Chart** for a car assembly problem:
- Color-coded Gantt bars: critical path in red/orange, non-critical in resource colors
- Dashed overlay shows slack window (LS − ES) for each non-critical action
- **What-if sliders** to adjust individual action durations — CPM recalculates instantly
- Hover any bar to see ES, EF, LS, LF, Slack, Duration
- KaTeX formulas for CPM forward/backward pass

### §11.7 Analysis of Planning Approaches (`analysis`)
Comparison table of Forward Search, Backward Search, HTN, and SAT-based planning:
- Completeness, complexity, strengths, weaknesses, and best-use-case columns
- Four insight cards covering complexity landscape, heuristics, domain knowledge, and beyond-classical planning

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
- **Vite** for bundling (base path: `/chapter-11/`)
- **Vitest** for unit testing (100% coverage on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
The visualization component is `src/components/PlanningVisualizer.tsx`.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-11/viz-name`
