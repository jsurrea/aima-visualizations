# Chapter 3 — Solving Problems by Searching

**Part 2: Problem Solving** | [Live Demo](/chapter-03)

Comprehensive interactive visualization suite covering all six sections of Chapter 3 of *AI: A Modern Approach, 4th Ed.* (Russell & Norvig, pp. 81–127).

---

## Visualizations

### §3.1 — Problem-Solving Agents: Problem Formulation Builder
**Component:** `src/components/ProblemFormulation.tsx`

An interactive domain selector that renders the full 6-tuple problem formulation
`⟨S, s₀, A, T, G, c⟩` for three domains:
- **Romania Route-Finding** — 20 cities, road distances
- **8-Puzzle** — 181,440 reachable states, 4 move actions
- **Vacuum World** — 8 states, 3 actions

**What If:** Switch the goal state to see how `G(s)` changes and how that affects the problem.

---

### §3.2 — Example Problems: Interactive 8-Puzzle
**Component:** `src/components/EightPuzzle.tsx`

A fully interactive 3×3 sliding puzzle with:
- **Manual tile sliding** — click adjacent tiles to move them
- **Scramble** — randomize with 30 random moves
- **BFS Solve** — run BFS on the state space to find the optimal solution
- **Step-by-step playback** — step through the solution path
- **State representation panel** — shows the board as a 3×3 matrix

---

### §3.3 — Search Algorithms: Generic Search Tree Visualizer
**Component:** `src/components/SearchTreeViz.tsx`

A side-by-side visualization of:
- **State space graph** (left) — 7-node graph with start S and goal G
- **Search tree** (middle) — grows dynamically as BFS expands nodes
- **Node data structure** (right) — shows `{state, parent, depth, path}` for the current node

**What If:** Toggle between **Graph Search** (explored set prevents revisits) and **Tree Search** (no explored set, warns about potential loops).

---

### §3.4 — Uninformed Search: Algorithm Comparison + Romania Visualizer
**Components:** `src/components/AlgorithmComparison.tsx`, `src/components/SearchVisualizer.tsx`

- **Complexity comparison table** — BFS, DFS, UCS, IDDFS, A* with time/space complexity in KaTeX, completeness, and optimality
- **Romania road map visualizer** — all uninformed algorithms (BFS, DFS, UCS, IDDFS) with step/animate controls
- Key insight panel: IDDFS achieves BFS's `O(b^d)` time with DFS's `O(bd)` space

---

### §3.5 — Informed Search: Heuristic Algorithm Visualizer
**Component:** `src/components/SearchVisualizer.tsx` (with `defaultAlgorithms` prop)

- **Greedy Best-First Search** — minimizes `h(n)` only; fast but suboptimal
- **A* Search** — minimizes `f(n) = g(n) + h(n)`; optimal with admissible heuristic
- Both use **SLD to Bucharest** as the heuristic on the Romania map
- `f(n) = g(n) + h(n)` formula rendered with KaTeX

---

### §3.6 — Heuristic Functions: Heuristic Lab
**Component:** `src/components/HeuristicLab.tsx`

An 8×8 interactive grid demonstrating:
- **Straight-Line Distance (SLD/Euclidean)** — admissible & consistent
- **Manhattan Distance** — admissible & consistent; dominates SLD for 4-directional grids
- **Inadmissible heuristic** (SLD × 1.5) — cells where `h(n) > h*(n)` highlighted in red
- Click any cell to **move the goal** and watch h-values update in real time
- Hover a cell to see `h(n)`, `h*(n)`, admissibility check
- **Dominance explanation** with KaTeX notation
- **Nodes expanded bar chart** comparing BFS vs A* with the selected heuristic

---

## Algorithms Implemented

All in `src/algorithms/index.ts` as pure functions with 100% test coverage:

| Function | Description | Complexity |
|---|---|---|
| `bfs` | Breadth-First Search | O(b^d) time & space |
| `dfs` | Depth-First Search | O(b^m) time, O(bm) space |
| `ucs` | Uniform-Cost Search | O(b^(1+⌊C*/ε⌋)) |
| `aStar` | A* Search | O(b^d) with admissible h |
| `greedyBestFirst` | Greedy Best-First Search | O(b^m) worst case |
| `iddfs` | Iterative Deepening DFS | O(b^d) time, O(bd) space |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (56 tests, 100% coverage)
npm test

# Build for production
npm run build
```

---

## Architecture

Self-contained microfrontend built with:
- **React 18** + **TypeScript** (strict mode, no `any`)
- **Vite** for bundling (base path: `/chapter-03/`)
- **Vitest** for unit testing
- **KaTeX** for math rendering (CSS imported once in `main.tsx`)

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-03/viz-name`
