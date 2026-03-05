# GitHub Copilot Instructions — AIMA Visualizations

## Project

Interactive visualization companion for *AI: A Modern Approach, 4th Ed.* (Russell & Norvig). Microfrontend architecture on GitHub Pages. Each chapter is an independent TypeScript project in `/chapter-XX-name/`. Landing page is in `/landing` (Astro).

The full textbook PDF is available at `Book.pdf` in the repository root. **Before implementing any chapter, fully read the relevant chapter(s) in the PDF to ensure every algorithmic detail, notation, and concept is accurately represented in the visualizations.**

---

## Book PDF — Table of Contents & Page Ranges

`Book.pdf` uses sequential page numbers that match the printed book pages exactly (PDF page N = book page N). Use these ranges when reading the PDF before implementing a chapter.

### Part I — Artificial Intelligence

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **1** | Introduction | **19 – 53** (35 pp.) | 1.1 What Is AI? (p.19) · 1.2 Foundations of AI (p.23) · 1.3 History of AI (p.35) · 1.4 State of the Art (p.45) · 1.5 Risks and Benefits (p.49) |
| **2** | Intelligent Agents | **54 – 80** (27 pp.) | 2.1 Agents and Environments (p.54) · 2.2 Rationality (p.57) · 2.3 Nature of Environments (p.60) · 2.4 Structure of Agents (p.65) |

### Part II — Problem Solving

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **3** | Solving Problems by Searching | **81 – 127** (47 pp.) | 3.1 Problem-Solving Agents (p.81) · 3.2 Example Problems (p.84) · 3.3 Search Algorithms (p.89) · 3.4 Uninformed Search (p.94) · 3.5 Informed (Heuristic) Search (p.102) · 3.6 Heuristic Functions (p.115) |
| **4** | Search in Complex Environments | **128 – 163** (36 pp.) | 4.1 Local Search & Optimization (p.128) · 4.2 Local Search in Continuous Spaces (p.137) · 4.3 Search with Nondeterministic Actions (p.140) · 4.4 Search in Partially Observable Environments (p.144) · 4.5 Online Search Agents (p.152) |
| **5** | Constraint Satisfaction Problems | **164 – 191** (28 pp.) | 5.1 Defining CSPs (p.164) · 5.2 Constraint Propagation / AC-3 (p.169) · 5.3 Backtracking Search (p.175) · 5.4 Local Search for CSPs (p.181) · 5.5 Structure of Problems (p.183) |
| **6** | Adversarial Search and Games | **192 – 225** (34 pp.) | 6.1 Game Theory (p.192) · 6.2 Optimal Decisions / Minimax (p.194) · 6.3 Heuristic Alpha–Beta (p.202) · 6.4 Monte Carlo Tree Search (p.207) · 6.5 Stochastic Games (p.210) · 6.6 Partially Observable Games (p.214) · 6.7 Limitations (p.219) |

### Part III — Knowledge, Reasoning, and Planning

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **7** | Logical Agents | **226 – 268** (43 pp.) | 7.1 Knowledge-Based Agents (p.227) · 7.2 The Wumpus World (p.228) · 7.3 Logic (p.232) · 7.4 Propositional Logic (p.235) · 7.5 Propositional Theorem Proving (p.240) · 7.6 Effective Propositional Model Checking (p.250) · 7.7 Agents Based on Propositional Logic (p.255) |
| **8** | First-Order Logic | **269 – 297** (29 pp.) | 8.1 Representation Revisited (p.269) · 8.2 Syntax and Semantics of FOL (p.274) · 8.3 Using FOL (p.283) · 8.4 Knowledge Engineering in FOL (p.289) |
| **9** | Inference in First-Order Logic | **298 – 331** (34 pp.) | 9.1 Propositional vs. FOL Inference (p.298) · 9.2 Unification and FOL Inference (p.300) · 9.3 Forward Chaining (p.304) · 9.4 Backward Chaining (p.311) · 9.5 Resolution (p.316) |
| **10** | Knowledge Representation | **332 – 361** (30 pp.) | 10.1 Ontological Engineering (p.332) · 10.2 Categories and Objects (p.335) · 10.3 Events (p.340) · 10.4 Mental Objects and Modal Logic (p.344) · 10.5 Reasoning Systems for Categories (p.347) · 10.6 Reasoning with Default Information (p.351) |
| **11** | Automated Planning | **362 – 402** (41 pp.) | 11.1 Definition of Classical Planning (p.362) · 11.2 Algorithms for Classical Planning (p.366) · 11.3 Heuristics for Planning (p.371) · 11.4 Hierarchical Planning (p.374) · 11.5 Planning in Nondeterministic Domains (p.383) · 11.6 Time, Schedules, and Resources (p.392) · 11.7 Analysis of Planning Approaches (p.396) |

### Part IV — Uncertain Knowledge and Reasoning

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **12** | Quantifying Uncertainty | **403 – 429** (27 pp.) | 12.1 Acting under Uncertainty (p.403) · 12.2 Basic Probability Notation (p.406) · 12.3 Inference Using Full Joint Distributions (p.413) · 12.4 Independence (p.415) · 12.5 Bayes' Rule (p.417) · 12.6 Naive Bayes Models (p.420) · 12.7 The Wumpus World Revisited (p.422) |
| **13** | Probabilistic Reasoning | **430 – 478** (49 pp.) | 13.1 Representing Knowledge in an Uncertain Domain (p.430) · 13.2 Semantics of Bayesian Networks (p.432) · 13.3 Exact Inference in Bayesian Networks (p.445) · 13.4 Approximate Inference (p.453) · 13.5 Causal Networks (p.467) |
| **14** | Probabilistic Reasoning over Time | **479 – 517** (39 pp.) | 14.1 Time and Uncertainty (p.479) · 14.2 Inference in Temporal Models (p.483) · 14.3 Hidden Markov Models (p.491) · 14.4 Kalman Filters (p.497) · 14.5 Dynamic Bayesian Networks (p.503) |
| **15** | Making Simple Decisions | **518 – 551** (34 pp.) | 15.1 Combining Beliefs and Desires (p.518) · 15.2 Basis of Utility Theory (p.519) · 15.3 Utility Functions (p.522) · 15.4 Multi-attribute Utility Functions (p.530) · 15.5 Decision Networks (p.534) · 15.6 Value of Information (p.537) · 15.7 Unknown Preferences (p.543) |
| **16** | Making Complex Decisions | **552 – 588** (37 pp.) | 16.1 Sequential Decision Problems / MDPs (p.552) · 16.2 Algorithms for MDPs (p.562) · 16.3 Bandit Problems (p.571) · 16.4 Partially Observable MDPs (p.578) · 16.5 Algorithms for POMDPs (p.580) |
| **17** | Multiagent Decision Making | **589 – 640** (52 pp.) | 17.1 Properties of Multiagent Environments (p.589) · 17.2 Non-Cooperative Game Theory (p.595) · 17.3 Cooperative Game Theory (p.616) · 17.4 Making Collective Decisions (p.622) |
| **18** | Probabilistic Programming | **641 – 668** (28 pp.) | 18.1 Relational Probability Models (p.642) · 18.2 Open-Universe Probability Models (p.648) · 18.3 Keeping Track of a Complex World (p.655) · 18.4 Programs as Probability Models (p.660) |

### Part V — Machine Learning

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **19** | Learning from Examples | **669 – 738** (70 pp.) | 19.1 Forms of Learning (p.669) · 19.2 Supervised Learning (p.671) · 19.3 Learning Decision Trees (p.675) · 19.4 Model Selection and Optimization (p.683) · 19.5 The Theory of Learning (p.690) · 19.6 Linear Regression and Classification (p.694) · 19.7 Nonparametric Models (p.704) · 19.8 Ensemble Learning (p.714) · 19.9 Developing ML Systems (p.722) |
| **20** | Knowledge in Learning | **739 – 771** (33 pp.) | 20.1 A Logical Formulation of Learning (p.739) · 20.2 Knowledge in Learning (p.747) · 20.3 Explanation-Based Learning (p.750) · 20.4 Learning Using Relevance Information (p.754) · 20.5 Inductive Logic Programming (p.758) |
| **21** | Learning Probabilistic Models | **772 – 800** (29 pp.) | 21.1 Statistical Learning (p.772) · 21.2 Learning with Complete Data (p.775) · 21.3 Learning with Hidden Variables: The EM Algorithm (p.788) |
| **22** | Deep Learning | **801 – 839** (39 pp.) | 22.1 Simple Feedforward Networks (p.802) · 22.2 Computation Graphs for Deep Learning (p.807) · 22.3 Convolutional Networks (p.811) · 22.4 Learning Algorithms (p.816) · 22.5 Generalization (p.819) · 22.6 Recurrent Neural Networks (p.823) · 22.7 Unsupervised Learning and Transfer Learning (p.826) · 22.8 Applications (p.833) |
| **23** | Reinforcement Learning | **840 – 873** (34 pp.) | 23.1 Learning from Rewards (p.840) · 23.2 Passive Reinforcement Learning (p.842) · 23.3 Active Reinforcement Learning (p.848) · 23.4 Generalization in RL (p.854) · 23.5 Policy Search (p.861) · 23.6 Apprenticeship and Inverse RL (p.863) · 23.7 Applications of RL (p.866) |

### Part VI — Communicating, Perceiving, and Acting

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **24** | Natural Language Processing | **874 – 906** (33 pp.) | 24.1 Language Models (p.874) · 24.2 Grammar (p.884) · 24.3 Parsing (p.886) · 24.4 Augmented Grammars (p.892) · 24.5 Complications of Real Natural Language (p.896) · 24.6 NLP Tasks (p.900) |
| **25** | Deep Learning for NLP | **907 – 931** (25 pp.) | 25.1 Word Embeddings (p.907) · 25.2 RNNs for NLP (p.911) · 25.3 Sequence-to-Sequence Models (p.915) · 25.4 The Transformer Architecture (p.919) · 25.5 Pretraining and Transfer Learning (p.922) · 25.6 State of the Art (p.926) |
| **26** | Robotics | **932 – 987** (56 pp.) | 26.1 Robots (p.932) · 26.2 Robot Hardware (p.933) · 26.3 What Kind of Problem Is Robotics Solving? (p.937) · 26.4 Robotic Perception (p.938) · 26.5 Planning and Control (p.945) · 26.6 Planning Uncertain Movements (p.963) · 26.7 RL in Robotics (p.965) · 26.8 Humans and Robots (p.968) · 26.9 Alternative Robotic Frameworks (p.975) · 26.10 Application Domains (p.978) |
| **27** | Computer Vision | **988 – 1031** (44 pp.) | 27.1 Introduction (p.988) · 27.2 Image Formation (p.989) · 27.3 Simple Image Features (p.995) · 27.4 Classifying Images (p.1002) · 27.5 Detecting Objects (p.1006) · 27.6 The 3D World (p.1008) · 27.7 Using Computer Vision (p.1013) |

### Part VII — Conclusions

| Chapter | Title | PDF Pages | Sections |
|---------|-------|-----------|----------|
| **28** | Philosophy, Ethics, and Safety of AI | **1032 – 1062** (31 pp.) | 28.1 The Limits of AI (p.1032) · 28.2 Can Machines Really Think? (p.1035) · 28.3 The Ethics of AI (p.1037) |
| **29** | The Future of AI | **1063 – 1073** (11 pp.) | 29.1 AI Components (p.1063) · 29.2 AI Architectures (p.1069) |

### Appendices (supplementary reading)

| | Title | PDF Pages | Sections |
|--|-------|-----------|----------|
| **A** | Mathematical Background | **1074 – 1080** (7 pp.) | A.1 Complexity Analysis and O() Notation (p.1074) · A.2 Vectors, Matrices, and Linear Algebra (p.1076) · A.3 Probability Distributions (p.1078) |
| **B** | Notes on Languages and Algorithms | **1081 – 1083** (3 pp.) | B.1 Defining Languages with BNF (p.1081) · B.2 Describing Algorithms with Pseudocode (p.1082) · B.3 Online Supplemental Material (p.1083) |

> **How to read the PDF efficiently:** Use a PDF reader that supports page-number jump. Jump directly to the start page listed above for the chapter you are implementing. Read the full chapter — including all pseudocode boxes, figures, and sidebars — before writing any code.

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
| `appendix-a-math` | `/appendix-a` |
| `appendix-b-languages` | `/appendix-b` |

---

## PR / Branch Conventions

- Branch name: `chapter-XX/viz-name` (e.g. `chapter-03/astar-search`)
- One PR per chapter directory
- CI must pass (lint, test with 100% coverage, build < 500 KB gzipped)
- Update `README.md` inside the chapter directory with new visualization descriptions
