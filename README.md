# 🧠 AIMA Visualized — *Artificial Intelligence: A Modern Approach* (4th ed.)

> An interactive, animated, open-source learning companion for the classic AI textbook by Stuart Russell and Peter Norvig. Every concept is brought to life through beautiful, explorable visualizations built for the web.

---

## 🌐 Live Site

[**aima-visualized.github.io**](https://aima-visualized.github.io) *(replace with your GH Pages URL)*

---

## 📖 What Is This?

This repository is a **complete visual reference** for all 29 chapters of *Artificial Intelligence: A Modern Approach, 4th Edition*. Each chapter lives in its own independent micro-frontend module. Users can:

- **Run algorithms step-by-step**, inspecting variable states, data structures, and control flow at each tick
- **Interact** with every parameter — change heuristics, swap graph topologies, tweak probabilities, adjust network architectures — and see results update in real time
- **Read** the core ideas alongside each visualization, with LaTeX-rendered math and clear nomenclature
- **Explore** without needing to install anything — everything runs in the browser at its own URL path

---

## 🏗️ Architecture

```
aima-visualized/
├── landing/                  # Astro landing page (GitHub Pages root)
│   ├── src/
│   ├── public/
│   ├── astro.config.mjs
│   └── package.json
│
├── Chapter 01 - Introduction/
├── Chapter 02 - Intelligent Agents/
├── Chapter 03 - Solving Problems by Searching/
│   └── ...                   # Each chapter is an independent TypeScript project
│
├── .github/
│   ├── workflows/
│   │   ├── deploy-landing.yml
│   │   ├── deploy-chapter-01.yml
│   │   └── ...               # One workflow per chapter, triggered by path changes
│   └── copilot-instructions.md
│
└── README.md
```

### Microfrontend Design

- Each `Chapter XX - Name/` directory is a **fully self-contained project** with its own `package.json`, build tool, and `tsconfig.json`
- Chapters are deployed to `/chapter-XX/` URL paths (e.g., `.../chapter-03/`)
- The landing page loads chapter metadata from a shared `chapters.json` manifest; it never imports chapter code directly
- No shared runtime dependencies between chapters
- All code must be **TypeScript** — `.js` source files are not permitted

### Tech Constraints

| Concern | Decision |
|---|---|
| Language | TypeScript (strict mode) everywhere |
| Landing page | Astro + Tailwind + Framer Motion |
| Chapter stack | Author's choice (React/Svelte/Vue/Vanilla + Vite) |
| Deployment | GitHub Pages (static output only) |
| Math rendering | KaTeX |
| Testing | Vitest + Testing Library; **100% coverage required** on algorithm implementations |
| CI | Per-path GitHub Actions workflows |

---

## 🤖 Copilot Agent Custom Instructions

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Key rules:

1. **TypeScript only.** Never emit `.js` source files.
2. **Test everything.** Every exported function/class needs a `*.test.ts` with 100% branch + line coverage.
3. **Self-contained chapters.** Never import from a sibling chapter directory.
4. **Accessible.** All interactive elements need ARIA labels and keyboard navigation.
5. **Performance.** Bundle size per chapter must stay under 500 KB gzipped.
6. **LaTeX math.** Render all math with KaTeX; never use plain Unicode math symbols in display text.

---

## 📚 Chapter Contents & Visualization Specifications

---

### Part I — Artificial Intelligence

---

#### Chapter 01 — Introduction

**Core visualizations:**
- The four definitions of AI as a 2×2 interactive matrix (Thinking/Acting × Human/Rational) with examples populating each quadrant on hover
- Scrollable AI history timeline (1943–present) with expandable milestones: McCulloch & Pitts neuron model, Dartmouth 1956 workshop, first neural net (SNARC), expert systems era, AI winters, deep learning breakthroughs, AlphaGo, large language models
- Standard Model loop: Agent ↔ Environment ↔ Performance Measure, animated as a live cycle diagram
- Turing Test interactive demo: chat interface, scoring widget
- Value Alignment problem: "specify the objective" game where poorly-specified goals produce unintended consequences (King Midas problem illustration)
- Risk/benefit radar chart for AI applications, toggleable by domain (medicine, autonomous weapons, surveillance, employment)
- Brain vs. computer spec comparison (from Figure 1.2 data) as an animated infographic

**Text coverage:** What is AI? · Four approaches · Foundations (philosophy, math, economics, neuroscience, psychology, CS, control theory, linguistics) · History 1943–present · State of the art · Risks and benefits · Value alignment · Limited rationality · Standard model · Gorilla problem · King Midas problem

---

#### Chapter 02 — Intelligent Agents

**Core visualizations:**
- Agent-Environment interaction loop: animated percepts flowing in, actions flowing out, with adjustable sensor/actuator types
- PEAS framework builder: interactive form for Performance, Environment, Actuators, Sensors across multiple domains (taxi driver, chess player, medical diagnosis)
- Agent type explorer: side-by-side animated walkthroughs of all five agent architectures operating in the same environment:
  - Simple Reflex Agent
  - Model-Based Reflex Agent
  - Goal-Based Agent
  - Utility-Based Agent
  - Learning Agent
- Vacuum-cleaner world simulator: 2D grid, configurable dirt generation, pluggable agent programs, live performance score counter
- Environment property matrix: toggle all six dimensions (Fully/Partially Observable, Deterministic/Stochastic, Episodic/Sequential, Static/Dynamic, Discrete/Continuous, Single/Multi-agent) and watch examples re-categorize
- Agent function vs. agent program split-pane: abstract lookup table alongside executing code

**Text coverage:** Agents and environments · Percepts and actions · Agent function vs. agent program · Rationality definition · Omniscience vs. rationality · Information gathering · Learning and autonomy · PEAS description · All six environment properties · All five agent architectures · Table-driven agents

---

### Part II — Problem Solving

---

#### Chapter 03 — Solving Problems by Searching

**Core visualizations:**
- Problem formulation editor: define state space, initial state, goal test, and action costs for classic problems (8-puzzle, Romania map, missionaries-and-cannibals)
- Graph/tree search visualizer — runnable step-by-step for **all** uninformed strategies, each showing frontier contents, explored set, current node, path cost g(n), and nodes expanded:
  - Breadth-First Search (BFS)
  - Uniform-Cost Search (UCS)
  - Depth-First Search (DFS)
  - Depth-Limited Search (DLS)
  - Iterative Deepening DFS (IDDFS)
  - Bidirectional Search
- Algorithm complexity table updating live as the user tweaks branching factor *b* and solution depth *d*
- Informed search visualizer with f(n) = g(n) + h(n) displayed live for every node:
  - Greedy Best-First Search
  - A\* Search (admissibility condition highlighted)
  - Weighted A\*
  - IDA\*
  - RBFS
- Heuristic comparison tool: run multiple heuristics on the same 8-puzzle and compare nodes expanded, effective branching factor, and path quality
- Dominance relationship visualizer: cost contour map showing h₁ dominating h₂

**Text coverage:** Problem-solving agents · Well-defined problems · State space graphs · BFS/UCS/DFS/DLS/IDDFS/Bidirectional algorithms and complexity · Completeness and optimality proofs · Greedy best-first · A\* admissibility and consistency · Contours and h-value monotonicity · Heuristic functions · Relaxed problems · Pattern databases · Effective branching factor

---

#### Chapter 04 — Search in Complex Environments

**Core visualizations:**
- Hill-Climbing fitness landscape: 2D/3D terrain with interactive reshaping, demonstrating steepest-ascent, sideways moves, random-restart, and plateau navigation
- Simulated Annealing: temperature schedule visualization, live acceptance probability P = e^(ΔE/T) display, escape-from-local-optima demonstration
- Local Beam Search: *k* parallel walkers with inter-beam communication
- Genetic Algorithm step-by-step: population fitness bar chart, crossover and mutation animations, generation counter
- AND-OR tree builder for nondeterministic actions, showing contingency plans
- Belief-state search: set of possible states as a Venn diagram shrinking with observations
- Online search / LRTA\*: unknown grid world with real-time H(s) value learning shown as cell color updates

**Text coverage:** Local search · Hill climbing (steepest-ascent, sideways, random-restart, stochastic) · Simulated annealing · Local beam search · Evolutionary algorithms · Crossover and mutation · Continuous spaces (gradient descent, Newton-Raphson) · Nondeterministic actions · AND-OR graphs · Belief states · Sensorless problems · Contingency plans · Online search · Competitive ratio · LRTA\*

---

#### Chapter 05 — Constraint Satisfaction Problems

**Core visualizations:**
- CSP builder: define variables, domains, and constraints (unary, binary, global) for map coloring, N-Queens, Sudoku, and cryptarithmetic
- Constraint graph visualizer: nodes as variables, edges as constraints, domain values shown inline
- AC-3 step-by-step: queue display, arc being processed, domain reductions highlighted, constraint check counter
- Backtracking search with live variable/domain state and violated constraints highlighted in red
- Heuristic comparison panel (toggle independently): MRV, Degree heuristic, Least Constraining Value, Forward Checking, MAC
- Min-conflicts local search on N-Queens: iterative repair with conflict count animation
- Tree-structured CSP: linear-time algorithm contrasted against exponential backtracking

**Text coverage:** CSP definition · Constraint types (unary, binary, higher-order, global) · Constraint graphs · AC-3 algorithm and complexity · Backtracking search · MRV/Degree/LCV heuristics · Forward checking · MAC · Local search for CSPs · Min-conflicts · Cutsets · Tree-structured CSPs · Tree decomposition

---

#### Chapter 06 — Adversarial Search and Games

**Core visualizations:**
- Interactive game tree explorer: build arbitrary trees, watch Minimax propagate values with animated MAX/MIN labels
- Alpha-Beta Pruning: α and β values at each node, pruned branches in red, nodes-evaluated counter vs. total
- Move ordering impact: same tree with/without good ordering side-by-side
- Heuristic evaluation tuner: sliders for piece values in chess with live position score update
- Monte Carlo Tree Search (MCTS): four-phase animation (Selection → Expansion → Simulation → Backpropagation), UCB1 = w/n + c√(ln N/n) display, visit count heatmap
- Stochastic games: Expectiminimax tree with chance nodes, animated dice roll, expected value propagation
- Partially Observable games: information sets for card games, belief state representation

**Text coverage:** Game types (zero-sum, stochastic, partial information) · Minimax algorithm · Alpha-beta pruning · Move ordering · Heuristic evaluation · Quiescence search · Horizon effect · MCTS · UCB1 formula · Stochastic games · Expectiminimax · Partially observable games · Limitations of game search

---

### Part III — Knowledge, Reasoning, and Planning

---

#### Chapter 07 — Logical Agents

**Core visualizations:**
- Wumpus World interactive simulator: 4×4 grid, percepts revealed cell-by-cell, KB sentences growing, inferred safe/dangerous cells highlighted
- Truth table builder and evaluator for propositional logic formulas (up to 6 variables)
- Model enumeration: all 2^n models shown, those satisfying KB ∧ ¬α highlighted for entailment checking
- DPLL step-by-step: unit propagation, pure symbol elimination, recursive calls on a SAT instance
- WALKSAT animation: random restarts, flip counts, satisfied clause counter
- Agent KB evolution timeline as agent navigates the Wumpus World

**Text coverage:** Knowledge-based agents · Wumpus World (PEAS, grid layout) · Entailment · Propositional logic syntax and semantics · Truth tables · Logical equivalences · Validity and satisfiability · Modus Ponens · Resolution · Conjunctive Normal Form (CNF) · DPLL algorithm · WALKSAT · Agents based on propositional logic

---

#### Chapter 08 — First-Order Logic

**Core visualizations:**
- FOL syntax tree builder: drag-and-drop interface for terms, predicates, quantifiers, and connectives with well-formedness checking
- Interpretation explorer: assign domain elements to constants/functions/predicates, verify sentence truth values
- Quantifier scope visualizer: color-coded binding scope for ∀ and ∃ in nested formulas
- KB builder for family domain, kinship, electronic circuits, and Wumpus World in FOL

**Text coverage:** Syntax (terms, atomic/complex sentences, quantifiers) · Semantics (interpretations, models, satisfaction) · Using FOL (TELL/ASK, assertions, queries) · Equality · Numbers, sets, and lists in FOL · Knowledge engineering methodology

---

#### Chapter 09 — Inference in First-Order Logic

**Core visualizations:**
- Unification step-by-step: substitution θ built incrementally, UNIFY algorithm trace, failure cases with explanations
- Forward Chaining on a crime KB: rule firing one at a time, new facts added to KB, justification chain highlighted
- Backward Chaining goal tree: AND-OR structure, depth-first resolution, backtracking on failure
- Resolution refutation: Skolemization → CNF conversion → resolution steps as tree with clashing literals highlighted
- Datalog vs. Prolog execution trace comparison side-by-side

**Text coverage:** Propositional vs. FOL inference · Herbrand's theorem · Lifting · Unification (UNIFY, most general unifier) · Generalized Modus Ponens · Forward chaining (datalog, Rete algorithm) · Backward chaining (Prolog, depth-first, infinite loops) · Resolution algorithm · Completeness of resolution

---

#### Chapter 10 — Knowledge Representation

**Core visualizations:**
- Ontology hierarchy: interactive tree of general ontology categories (Things, Substances, Events, Mental Objects) with expandable nodes and property inheritance
- Category membership explorer: necessary vs. sufficient conditions, prototypical members, natural kinds
- Event calculus timeline: Initiates/Terminates/HoldsAt predicates animated over a time axis
- Description Logic / Semantic network browser: IS-A hierarchy, property inheritance, instance classification
- Default logic: normal defaults, extension computation, conflicting defaults resolution

**Text coverage:** Ontological engineering · Categories and objects · Subclasses and composite objects · Physical composition · Measures and units · Time and events · Fluents · Event calculus · Mental objects and modal logic · Possible worlds · Description logics · Semantic networks · Inheritance · Default reasoning · Non-monotonic logic · Circumscription · Truth maintenance systems (JTMS/ATMS)

---

#### Chapter 11 — Automated Planning

**Core visualizations:**
- PDDL editor: write domain/problem files, parse into planning graph with state nodes and action edges
- Forward/backward state-space search with precondition/effect annotations on each transition
- GRAPHPLAN: layer-by-layer construction, mutex detection highlighted, solution extraction via backward chaining
- SATPlan: planning-to-SAT encoding visualization with variable count display
- Hierarchical Task Network (HTN): task decomposition tree, method expansion animation, abstract vs. primitive task levels
- Contingent planning: AND-OR tree for sensing actions in nondeterministic domains
- Job-shop scheduling: Gantt chart with constraint propagation

**Text coverage:** Classical planning definition · PDDL syntax (domain/problem/action schemas) · Forward/backward state-space search · GRAPHPLAN · Mutexes · Planning heuristics (relaxed plan, max-level, set-level) · HTN planning · Methods and task networks · Partial-order planning · Nondeterministic domains · Conditional planning · Continuous time and resources · Scheduling (critical path, precedence constraints) · Analysis of planning approaches

---

### Part IV — Uncertain Knowledge and Reasoning

---

#### Chapter 12 — Quantifying Uncertainty

**Core visualizations:**
- Probability axiom explorer: interactive Venn diagrams, union/intersection calculations
- Full joint distribution table: build small distributions, compute marginals by summing out, run queries
- Conditional probability and Bayes' rule: animated belief update on a medical diagnosis example
- Naive Bayes classifier: spam filtering demo with live posterior update as words are added
- Wumpus World probabilistic: probability overlays on grid updating with each percept

**Text coverage:** Uncertainty and rational decisions · Probability notation · Sample spaces · Axioms of probability · Prior and conditional probabilities · Marginalization · Product rule · Bayes' rule · Independence · Conditional independence · Naive Bayes · Full joint distributions · Inference by enumeration

---

#### Chapter 13 — Probabilistic Reasoning

**Core visualizations:**
- Bayesian Network builder: drag-and-drop nodes and edges, inline CPT editor with auto-normalization, force-directed layout
- Variable Elimination step-by-step: factor tables, summation/product operations, elimination order impact on complexity
- Belief Propagation: messages flowing in both directions on polytree and loopy networks
- MCMC (Gibbs Sampling): Markov chain state, transition probabilities, histogram building up, convergence diagnostics
- Likelihood Weighting: weight counter per sample, scatter plot converging to true posterior
- Rejection Sampling: accepted/rejected sample visualizer with running ratio
- Causal network: intervention do(X=x) vs. conditioning on observation, front-door and back-door criteria

**Text coverage:** Representing uncertain knowledge · Bayesian network syntax/semantics · Compactness · Conditional independence in Bayesian networks · Variable elimination · Factor operations · Complexity of exact inference · Polytree algorithm · Approximate inference (rejection sampling, likelihood weighting, MCMC, Gibbs) · Causal networks · Interventions · Counterfactuals · Identifiability

---

#### Chapter 14 — Probabilistic Reasoning over Time

**Core visualizations:**
- Temporal model: Markov assumption visualization, transition and sensor models on a timeline
- Filtering (Forward Algorithm): probability distribution over hidden states animating forward with each observation
- Smoothing: forward-backward algorithm showing how future observations update past beliefs
- Prediction: probability distribution spreading into the future
- Viterbi algorithm: animated trellis diagram with highlighted optimal path and backpointers
- HMM editor: state/observation sequence, emission matrix, transition matrix, all inference tasks
- Kalman Filter: 2D tracking with live covariance ellipses updating on noisy measurements
- DBN: unrolled Dynamic Bayesian Network over time steps with slice connections
- Particle filter: particle swarm on 2D map, weight and resample animation

**Text coverage:** Time and uncertainty · Markov property · Transition and sensor models · Filtering · Smoothing · Prediction · Most likely sequence · Forward-backward algorithm · HMMs · Viterbi algorithm · EM for HMMs · Kalman filters (prediction and update steps) · Extended Kalman filter · Particle filters · Dynamic Bayesian networks

---

#### Chapter 15 — Making Simple Decisions

**Core visualizations:**
- Utility function shape explorer: risk-averse/neutral/seeking curves, certainty equivalents, risk premium
- Expected Utility calculator: lottery builder with probability sliders, live EU display
- Utility axioms: interactive demonstration of completeness, transitivity, continuity, substitutability
- Decision network (influence diagram) editor: chance, decision, and utility nodes; variable elimination for optimal policy
- Value of Information: EVPI calculation animated, decisions with and without information compared
- Multi-attribute utility: 2-attribute tradeoff surface, iso-utility curves
- Human preference anomalies: Allais paradox and Ellsberg paradox interactive demos

**Text coverage:** Utility theory axioms · Utility functions · Risk aversion · Certainty equivalent · Multi-attribute utility (additive, multiplicative) · Decision networks · Information value (VPI, EVPI) · Sequential VoI · Unknown preferences · Human irrationality

---

#### Chapter 16 — Making Complex Decisions

**Core visualizations:**
- MDP grid world: draw any grid, place rewards/penalties, set stochastic transition probabilities
- Value Iteration: V(s) values updating cell-by-cell with convergence plot and Bellman residual
- Policy Iteration: alternating policy evaluation and improvement, convergence comparison
- Policy visualization: optimal policy arrows on grid, value function heatmap
- Bandit simulator: k-armed bandit with reward distributions, live regret curve for ε-greedy, UCB, and Thompson Sampling
- POMDP: belief-space as probability simplex, policy graph animation, alpha vectors

**Text coverage:** Sequential decision problems · MDPs · Utilities over time · Discount factor · Optimal policies · Bellman equations · Value iteration (convergence) · Policy iteration · RTDP · Bandits · Regret · UCB1 · Thompson Sampling · POMDPs · Belief states · Alpha vectors · PBVI

---

#### Chapter 17 — Multiagent Decision Making

**Core visualizations:**
- Normal-form game editor: 2×2 to 4×4 payoff matrix, auto-computed Nash Equilibria, dominant strategy highlighting
- Best-response correspondence plot, Nash equilibrium as intersection
- Nash Equilibrium finder: iterated elimination of dominated strategies step-by-step
- Mixed strategy visualizer: expected payoff as function of mixing probability
- Prisoner's Dilemma tournament: multiple strategies (TFT, ALLC, ALLD, Pavlov), score evolution
- Mechanism design: Vickrey auction simulator, truthful bidding incentives
- Extensive-form game: tree with subgame perfect equilibrium via backward induction
- Social choice: Condorcet paradox, voting rules comparison

**Text coverage:** Multiagent environments · Strategic form games · Dominant strategies · Nash equilibrium (pure and mixed) · Computing NE · Sequential games · Extensive form · Backward induction · Subgame perfect equilibrium · Coalitional games · Shapley value · Core · Mechanism design · Revelation principle · Auctions · Social choice · Voting rules · Arrow's impossibility theorem

---

#### Chapter 18 — Probabilistic Programming

**Core visualizations:**
- Relational probability model editor: plate notation diagram, ground network generation
- Open-universe model: animate uncertain object count, identity uncertainty
- Probabilistic program tracer: step through a Church/BLOG-style program, execution traces as derivation trees
- MCMC inference over a probabilistic program: posterior distribution building up

**Text coverage:** Relational probability models · Directed dependencies · Plate notation · Open-universe models · Identity uncertainty · BLOG language · Programs as probability models · Inference in probabilistic programs

---

### Part V — Machine Learning

---

#### Chapter 19 — Learning from Examples

**Core visualizations:**
- Decision Tree learner: CSV dataset loader, ID3 entropy-based splitting animation, information gain bar chart, live tree rendering
- Pruning: pre-pruning and post-pruning on same tree with accuracy comparison
- Bias-Variance decomposition: polynomial regression with noise slider, underfitting ↔ overfitting transition, bias²+variance+noise bar chart
- Learning curves: error vs. dataset size, error vs. model complexity
- k-NN classifier: Voronoi diagram coloring as k changes, distance metric selector
- SVM: margin maximizer on 2D points, kernel trick (RBF, polynomial), C hyperparameter effect on margin
- Linear/Logistic regression: gradient descent step-by-step with loss landscape contour
- Ensemble methods: AdaBoost weighted sample visualization, Random Forest feature importance

**Text coverage:** Forms of learning · Supervised learning framework · Decision trees (ID3, entropy, information gain, Gini) · Overfitting · Cross-validation · Regularization (L1/L2) · PAC learning · VC dimension · Perceptron · Logistic regression · k-NN · SVM and kernels · Bagging, boosting, random forests · ML system development

---

#### Chapter 20 — Knowledge in Learning

**Core visualizations:**
- Explanation-Based Learning (EBL): proof tree for example generalization, operationalization animation
- ILP (FOIL): literal additions to clause step-by-step
- Version space: hypothesis lattice, S-boundary and G-boundary updates

**Text coverage:** Logical formulation of learning · Version spaces · Candidate elimination · EBL · Operationalization · Relevance-based learning · ILP (FOIL, inverse resolution)

---

#### Chapter 21 — Learning Probabilistic Models

**Core visualizations:**
- MLE: likelihood surface over θ for coin flips, gradient ascent to peak
- Bayesian parameter learning: prior × likelihood → posterior animated as Beta distribution narrowing
- EM Algorithm: mixture of Gaussians — E-step soft assignments, M-step updating centers, log-likelihood per iteration

**Text coverage:** MLE · MAP estimates · Bayesian parameter learning · Dirichlet prior · Learning Bayesian network structure · EM algorithm derivation and convergence · K-means as hard EM · Learning HMM parameters

---

#### Chapter 22 — Deep Learning

**Core visualizations:**
- Neural network playground: configurable layers/neurons/activations, 2D classification data, live decision boundary animation
- Backpropagation: forward pass activations then backward gradients, Δw = -η ∂L/∂w highlighted per weight
- Computation graph: expression DAG, automatic differentiation in both modes
- CNN feature map visualizer: filters applied to sample image, activation maps per layer, pooling operations
- Optimizer comparison: SGD vs. Momentum vs. Adam trajectory traces on loss landscape
- Dropout, Batch Normalization, Layer Normalization: effect on training dynamics
- LSTM unrolled: gate activations (forget/input/output/cell) per time step
- Autoencoder: latent space 2D projection, reconstruction quality vs. bottleneck size
- GAN training: generator and discriminator loss curves, generated sample gallery improving over epochs

**Text coverage:** Feedforward networks · Activation functions (ReLU, sigmoid, tanh, softmax, GELU) · Computation graphs · Automatic differentiation · Backpropagation · CNNs (convolution, pooling, receptive fields) · Optimization (SGD, momentum, Adam) · Regularization (dropout, weight decay, early stopping) · Batch normalization · RNNs · LSTMs · GRUs · Autoencoders · VAEs · GANs · Transfer learning

---

#### Chapter 23 — Reinforcement Learning

**Core visualizations:**
- Temporal Difference learning: V(s) values updating in grid world, TD error signal, comparison with Monte Carlo
- Q-Learning: Q-table heatmap evolving episode by episode, ε-greedy policy visualization
- SARSA vs Q-Learning: side-by-side on cliff-walking, on-policy vs. off-policy policy difference
- Actor-Critic: separate actor and critic networks, advantage A(s,a) = Q(s,a) - V(s) signal
- Policy Gradient (REINFORCE): trajectory sampling, log-probability gradient animation
- Exploration strategies: ε-greedy, UCB, Thompson Sampling, curiosity-based — regret comparison
- Inverse RL: observed trajectories → recovered reward function animation

**Text coverage:** Learning from rewards · Passive RL (direct utility estimation, ADP, TD) · Active RL · Exploration-exploitation · Q-learning · SARSA · Function approximation · Deep Q-Networks (DQN) · Experience replay · Policy gradient theorem · REINFORCE · Actor-critic · Proximal Policy Optimization · MCTS in RL · Inverse RL · Applications

---

### Part VI — Communicating, Perceiving, and Acting

---

#### Chapter 24 — Natural Language Processing

**Core visualizations:**
- N-gram language model: build from corpus, show probability tables, generate text by sampling, perplexity metric
- Smoothing comparison: Laplace, Kneser-Ney, back-off — probability mass redistribution
- CFG parser (CYK): dynamic programming table filling animation, parse trees for ambiguous sentences
- Chart/Earley parser: active/completed arc visualization
- Text classification pipeline: tokenization → TF-IDF → classifier decision boundary

**Text coverage:** Language models · N-grams · Perplexity · Smoothing · Text classification · TF-IDF · CFG · CNF · CYK algorithm · Chart parsing · Earley algorithm · Augmented grammars (ATN, DCG) · Ambiguity · Coreference · NLU tasks (QA, summarization, IE, MT)

---

#### Chapter 25 — Deep Learning for NLP

**Core visualizations:**
- Word embeddings: 3D PCA/t-SNE projection, nearest-neighbor queries, analogy arithmetic (king - man + woman = queen)
- seq2seq encoder-decoder: token-by-token encoding, attention weight heatmap per decoder step
- Transformer architecture: multi-head self-attention, positional encoding sinusoidal patterns, residual connections, layer-by-layer flow
- BERT pre-training: masked token prediction animation, [CLS] token for classification fine-tuning
- GPT autoregressive generation: causal mask, token probability distribution, sampling strategies (greedy, top-k, nucleus)

**Text coverage:** Word2Vec (CBOW, skip-gram) · GloVe · Contextualized embeddings · Encoder-decoder · Attention (Bahdanau, Luong) · Self-attention · Transformer architecture · Multi-head attention · Positional encoding · BERT · GPT · Pre-training and fine-tuning paradigm

---

#### Chapter 26 — Robotics

**Core visualizations:**
- Configuration space: 2-link arm in joint-space vs. Cartesian workspace, obstacles mapped to C-space
- PRM: random sampling in C-space, connection graph, query path
- RRT: tree growth in real time, bidirectional RRT, path smoothing
- Kalman Filter localization: position covariance ellipse updating on sensor measurement
- Particle Filter (MCL): particle cloud kidnapped-robot recovery, weight/resample animation
- SLAM: simultaneous map building and localization, landmark observations and associations
- PID controller: P/I/D component bars, step response visualization

**Text coverage:** Robot types · Sensors and actuators · Kinematics (forward/inverse) · Configuration space · PRM · RRT/RRT\* · Localization · Kalman filter · Particle filter · SLAM · PID/LQR control · RL in robotics · Human-robot interaction · Alternative frameworks · Application domains

---

#### Chapter 27 — Computer Vision

**Core visualizations:**
- Image formation: pinhole camera model, perspective projection, intrinsic/extrinsic parameters
- Convolution animation: kernel sliding over image, output feature map for edge/blur/sharpen kernels
- Canny edge detection pipeline: Gaussian blur → gradient → NMS → hysteresis
- Optical flow: Lucas-Kanade vector field, aperture problem illustration
- Stereo vision: epipolar geometry, disparity map computation
- Object detection pipeline: anchor boxes, IoU calculation, NMS step-by-step
- CNN classification: layer-by-layer feature activation t-SNE visualization

**Text coverage:** Image formation · Cameras · Image features (edges, corners, SIFT, HOG) · Optical flow · Stereo (epipolar geometry, disparity) · Structure from motion · Object detection (sliding window, R-CNN, YOLO, NMS) · Object recognition · Image segmentation · Face detection · Medical imaging

---

### Part VII — Conclusions

---

#### Chapter 28 — Philosophy, Ethics, and Safety of AI

**Core visualizations:**
- AI ethics taxonomy: interactive map of ethical issues (bias, surveillance, autonomous weapons, privacy, employment, safety) with case studies
- Algorithmic fairness demo: classifier on protected-attribute data, multiple fairness metrics compared (demographic parity, equalized odds, calibration) with conflict visualization
- AI Safety spectrum: severity vs. probability 2D matrix for near-term and long-term risks
- Value alignment timeline: assistance games, inverse RL, debate, amplification, constitutional AI

**Text coverage:** Limits of AI · Weak AI vs. strong AI · Turing test debate · Consciousness and qualia · Chinese Room argument · Physical symbol system hypothesis · Ethics of AI · Lethal autonomous weapons · Surveillance · Bias · Employment impact · Safety-critical applications · Cybersecurity · Long-term future · Superintelligence · Value alignment · Corrigibility · AI governance

---

#### Chapter 29 — The Future of AI

**Core visualizations:**
- AI capabilities roadmap: radar chart of components (learning, language, world models, reasoning, planning, perception, action, social intelligence)
- Architecture spectrum: reactive vs. deliberative vs. hybrid agents
- Human-compatible AI: assistance game payoff matrix, corrigibility visualization

**Text coverage:** AI components overview · World models · Neural-symbolic integration · AGI debate · Beneficial AI · Human-compatible AI · Long-term outlook

---

### Appendix A — Mathematical Background

**Core visualizations:**
- Big-O complexity chart: input-size slider comparing O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ) on log-log scale
- Linear algebra: matrix multiplication animation, eigenvalue decomposition, PCA on 2D data
- Probability distributions gallery: parameter sliders for Normal, Bernoulli, Binomial, Poisson, Beta, Dirichlet, Gamma, Exponential with PDF/CDF toggle

### Appendix B — Languages and Algorithms

**Core visualizations:**
- BNF grammar derivation tree explorer: animated leftmost derivation for a sample expression language
- Pseudocode notation reference with annotated examples from the book

---

## 🗂️ Per-Chapter File Structure

```
Chapter XX - Name/
├── README.md              ← Chapter-specific outline
├── package.json           ← name: "@aima-vis/chapter-XX"
├── tsconfig.json          ← extends ../../tsconfig.base.json
├── vite.config.ts         ← base: "/chapter-XX/"
├── index.html
├── src/
│   ├── main.ts
│   ├── algorithms/        ← Pure TS algorithm implementations
│   │   ├── *.ts
│   │   └── *.test.ts      ← 100% coverage required
│   ├── components/
│   ├── visualizations/
│   └── styles/
├── public/
└── dist/                  ← git-ignored build output
```

---

## 🚀 Getting Started

```bash
# Clone and set up landing page
git clone https://github.com/<your-org>/aima-visualized.git
cd aima-visualized/landing && npm install && npm run dev

# Work on a specific chapter
cd "Chapter 03 - Solving Problems by Searching"
npm install && npm run dev

# Test with coverage
npm test

# Build for production
npm run build
```

---

## 🤝 Contributing

1. PRs should touch only one chapter directory plus root `README.md`
2. All algorithm code requires 100% unit test coverage (Vitest)
3. Visualizations must be responsive (desktop ≥1024px, tablet ≥768px, mobile ≥375px)
4. Verify gzip bundle < 500 KB before opening a PR
5. Math must use KaTeX — no Unicode math symbols in display text

---

## 📄 License

MIT — See [LICENSE](LICENSE)

*Independent educational resource, not affiliated with Pearson Education, Stuart Russell, or Peter Norvig.*
