# Chapter 18 — Probabilistic Programming

**Part 4: Uncertain Knowledge and Reasoning**

Interactive visualizations covering every section of Chapter 18: Relational Probability Models (RPMs), Open-Universe Probability Models (OUPMs), data association / multitarget tracking, and probabilistic programs as probability models with MCMC inference.

---

## Visualizations

### §18.1 — Relational Probability Models (`RPMVisualizer`)

Animates the **grounding (unrolling)** of a book-recommendation RPM into a full Bayesian network.

- Step-by-step node addition: Quality(b), Honest(c), Kindness(c), Recommendation(c,b)
- Color-coded node types: blue=Quality, green=Honest, yellow=Kindness, pink=Recommendation
- Live formula showing network size: `C × (B + 3)` variables for C customers and B books
- **What-If control**: slider to change number of customers (1–3) and books (1–2)
- **Sample World** button: samples values from the RPM and displays them inline on each node
- KaTeX-rendered dependency rule: `Recommendation(c,b) \sim RecCPT(Honest(c), Kindness(c), Quality(b))`

### §18.2 — Open-Universe Probability Models (`OUPMVisualizer`)

Step-by-step animated table of **OUPM world generation** (AIMA Figure 18.4).

- Generates a complete world in topological order: `#Customer`, `#Book`, Honest(c), Kindness(c), Quality(b), `#LoginID(Owner=c)`, Recommendation(…)
- Color-coded rows: orange for **number variables**, blue for **property variables**
- Running probability product shown at the bottom right — visualizing how worlds become exponentially rare
- **Dishonest customer alert**: highlights when a customer with `Honest=false` generates 2–5 fake login IDs
- **Regenerate World** button: uses a fresh random seed to explore a different world
- KaTeX rendering for the model equations including `\#LoginID(Owner=c) \sim \text{if } Honest(c) \text{ then } Exactly(1) \text{ else } UniformInt(2,5)`

### §18.3 — Data Association & Multitarget Tracking (`DataAssociationVisualizer`)

Interactive visualization of the **data association problem** with two crossing aircraft (AIMA §18.3.1).

- 2D position-vs-time SVG plot: blip observations (+) connected to object tracks by colored lines
- Two algorithm modes (toggle):
  - **Nearest-Neighbor Filter**: greedy assignment — swaps tracks when aircraft cross
  - **Hungarian Algorithm**: globally optimal assignment — maintains correct tracks
- Pre-set crossing-path scenario chosen to reveal the difference between algorithms
- Step through time steps with play/pause/step/reset controls
- State inspection panel: current time, assignment list with distances, algorithm mode
- KaTeX rendering for the model: `X(a,t) \sim \mathcal{N}(FX(a,t-1), \Sigma_x)`

### §18.4 — Programs as Probability Models (`GenerativeProgramVisualizer`)

Two-panel interactive demo of **probabilistic programs as execution traces** (AIMA §18.4).

**Panel 1: Trace Explorer**
- Visualizes a single execution trace as a sequence of "choice boxes"
- Each box shows: variable name, distribution, sampled value, log-probability
- Total log-probability at bottom
- Generate New Trace button for fresh samples

**Panel 2: MCMC Inference**
- User types a short evidence word (default: "hi")
- MCMC runs Metropolis-Hastings for up to 30 iterations to find traces explaining the evidence
- Live log-likelihood chart (line chart) over iterations
- Shows best trace found and acceptance/rejection history
- **Model selector**: Independent Letters vs Markov (bigram) — bigram model generates more English-like sequences
- **Noise rate slider** (0.01–0.5): controls how hard inference is; higher noise = more ambiguity

---

## Algorithms Implemented (100% test coverage, 111 tests)

| Function | Description | Section |
|---|---|---|
| `groundRPM(customers, books)` | Unrolls RPM → grounding steps | §18.1 |
| `honestRecCPT(rec, kindness, quality)` | Honest recommendation CPT | §18.1 |
| `recommendationCPT(rec, honest, kindness, quality)` | Full Recommendation CPT | §18.1 |
| `sampleRPMWorld(customers, books, rng)` | Samples one RPM world | §18.1 |
| `generateOUPMWorld(rng)` | Generates OUPM world step-by-step | §18.2 |
| `nearestNeighborFilter(obs, tracks)` | Greedy data association | §18.3 |
| `hungarianAlgorithm(cost)` | Optimal assignment O(N³) | §18.3 |
| `hungarianFilter(obs, tracks)` | Optimal data association | §18.3 |
| `generateLettersTrace(lambda, rng)` | Independent letter generator | §18.4 |
| `generateMarkovLettersTrace(lambda, rng)` | Bigram Markov letter generator | §18.4 |
| `letterLogLikelihood(observed, generated, noiseRate)` | Observation log-likelihood | §18.4 |
| `rejectionSampling(...)` | Rejection sampling | §18.4 |
| `likelihoodWeighting(...)` | Likelihood weighting | §18.4 |
| `runMCMC(...)` | Metropolis-Hastings MCMC | §18.4 |
| `normalizeLogWeights(logWeights)` | Log-sum-exp normalization | §18.4 |
| `mulberry32(seed)` | Seeded PRNG | utility |
| `sampleCategorical(probs, rng)` | Discrete sampler | utility |
| `samplePoisson(lambda, rng)` | Poisson sampler (Knuth) | utility |
| `sampleNormal(mu, sigma, rng)` | Normal sampler (Box-Muller) | utility |
| `poissonPMF(k, lambda)` | Poisson PMF | utility |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests with coverage (must reach 100%)
npm test -- --run --coverage

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/aima-visualizations/chapter-18/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions with no side effects.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-18/viz-name`
