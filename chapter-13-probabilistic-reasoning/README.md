# Chapter 13 — Probabilistic Reasoning

Interactive visualizations for AIMA 4th Ed., Chapter 13 (§13.1–13.5).

## Visualizations

### 1. Bayesian Networks (§13.1–13.2)
Interactive DAG visualization supporting both the **Alarm network** (Burglary/Earthquake → Alarm → JohnCalls/MaryCalls) and the **Sprinkler network** (Cloudy → Sprinkler/Rain → WetGrass).

- Click any node to highlight its **Markov blanket** (parents + children + children's other parents)
- View the full **CPT table** for any selected node
- Toggle variable assignments (T/F) to compute the **joint probability** P(x₁,...,xₙ) = ∏ P(xᵢ | parents(Xᵢ))
- **Path explorer**: select two nodes to check connectivity

### 2. Exact Inference (§13.3)
Step-by-step visualization of the two exact inference algorithms on the Alarm network.

- **Enumeration-Ask** (Figure 13.11): depth-first enumeration over hidden variables with configurable query and evidence
- **Variable Elimination** (Figure 13.13): factor creation, pointwise products, marginalization, and normalization
- Play/Pause/Step Forward/Step Back/Reset controls with speed slider

### 3. Approximate Sampling (§13.4.1–13.4.3)
Side-by-side comparison of three sampling methods on the Sprinkler network (query: Rain, evidence: Sprinkler=true).

- **Prior Sampling**: generates samples from the joint prior, showing P(Rain) without conditioning
- **Rejection Sampling**: discards samples inconsistent with evidence; tracks acceptance rate
- **Likelihood Weighting**: weights each sample by the likelihood of the evidence; no rejection

Each method shows a 200-sample grid (green=true, red=false, gray=rejected) with running estimate vs. true value from enumeration.

### 4. Gibbs Sampling / MCMC (§13.4.4)
Visualizes the Gibbs sampling Markov chain on the Sprinkler network.

- Animated network diagram highlighting the currently resampled variable and its Markov blanket
- **MB distribution bar chart**: P(false) / P(true) for the resampled variable given its blanket
- **Markov chain history**: last 20 states shown as a color-coded grid
- Convergence tracking: running estimate vs. true value

### 5. Causal Networks (§13.5)
Side-by-side comparison of observational and interventional probabilities.

- **Observe panel**: standard conditioning P(WetGrass=T | Sprinkler=T)
- **Intervene panel**: do-operator P(WetGrass=T | do(Sprinkler=T)) with the Cloudy→Sprinkler edge removed (shown as dashed red)
- **Back-door criterion**: shows the confounding path S ← C → R → WG and the adjustment formula
- Step-by-step back-door computation displaying each confounder's contribution

## Tech Stack
React · TypeScript (strict) · KaTeX · Vite · Vitest
