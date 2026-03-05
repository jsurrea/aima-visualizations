# Chapter 17 — Multiagent Decision Making

**Part 4: Uncertain Knowledge and Reasoning**

Interactive visualizations covering all four sections of Chapter 17 (AIMA 4th ed., pp. 589–640): multiagent planning, non-cooperative game theory, cooperative game theory, and mechanism design.

---

## Visualizations

### §17.1 & §17.2 — Normal-Form Games & Nash Equilibria (`normal-form`)
- Editable 2×2 or 3×3 payoff matrix with four preset games: **Prisoner's Dilemma**, **Matching Pennies**, **Two-Finger Morra** (zero-sum), and **Coordination Game**
- Highlights all **pure-strategy Nash equilibria** directly in the matrix
- Identifies **dominant strategies** (strong and weak) for each player
- Computes **mixed-strategy Nash equilibrium** and **maximin strategy** for 2×2 games
- Shows **Pareto-optimal outcomes** and **utilitarian/egalitarian social welfare**
- *What-if*: drag any payoff cell to see how equilibria change in real time

### §17.2 — Repeated Games & Strategies (`repeated-games`)
- Iterated prisoner's dilemma simulator with five classic FSM strategies: **HAWK**, **DOVE**, **GRIM**, **TIT-FOR-TAT**, **TAT-FOR-TIT**
- Animated step-by-step round table with color-coded action cells (T = defect, R = cooperate)
- Running cumulative payoffs and **limit-of-means** utility
- Full play/pause/step/reset/speed controls
- *What-if*: switch strategies mid-game to observe the Folk Theorem in action

### §17.3 — Cooperative Game Theory & Shapley Value (`cooperative`)
- Adjustable characteristic function ν(C) for up to 4 players
- Computes **Shapley value** step-by-step (marginal contributions across all permutations)
- Checks whether a proposed imputation is in the **core** (shows blocking coalitions if not)
- Superadditivity checker and coalition structure welfare calculator
- SVG **coalition structure graph** (Figure 17.7 style) for N=4
- MC-Nets compact representation calculator
- *What-if*: change individual coalition values and watch Shapley shares update

### §17.4 — Auction Mechanisms (`auctions`)
- N-bidder private-value auction with adjustable valuations via sliders
- **English (ascending-bid) auction**: animated step-by-step bidding rounds
- **Vickrey (second-price sealed-bid)**: shows why truth-telling is dominant
- **VCG mechanism**: Clarke pivot tax computation for multi-good allocation
- Side-by-side revenue and efficiency comparison panel
- *What-if*: adjust reserve price or number of goods to see effects on efficiency

### §17.4 — Voting Procedures & Social Choice (`voting`)
- N voters with drag-to-reorder preference rankings
- Computes and compares: **Plurality**, **Borda Count**, **Instant Runoff**, **True-Majority/Condorcet**
- Loads the **Condorcet Paradox** scenario (Arrow's impossibility in action)
- Demonstrates **strategic manipulation** in plurality voting
- *What-if*: toggle "strategic voter" to see if misreporting preferences changes the winner

### §17.4 — Bargaining & Negotiation (`bargaining`)
- **Rubinstein alternating-offers** model with discount factor sliders (γ₁, γ₂)
- Animated SVG pie-splitting across bargaining rounds
- Shows the subgame-perfect equilibrium prediction vs. what happens if agents are impatient
- **Zeuthen strategy** for task-oriented negotiation: step-by-step concession table with risk values
- *What-if*: change patience (discount factors) and observe who gets a larger share

---

## Algorithm Coverage (src/algorithms/index.ts)

| Algorithm | Function |
|---|---|
| Interleaving model | `generateInterleavings` |
| Concurrent action constraint check | `checkConcurrentConstraints` |
| Pure Nash equilibria | `findPureNashEquilibria` |
| Dominant strategy analysis | `findDominantStrategies` |
| Maximin / mixed strategy (2×2 zero-sum) | `computeMaximinStrategy2x2` |
| Social welfare metrics | `computeSocialWelfare`, `isOutcomeParetoOptimal` |
| Repeated game FSM simulation | `simulateRepeatedGame`, `limitOfMeans` |
| 2×2 Nash equilibria (pure + mixed) | `findNashEquilibria2x2` |
| Shapley value | `computeShapleyValue` |
| Core check | `checkCore` |
| Superadditivity | `isSuperadditive` |
| MC-Nets characteristic function & Shapley | `mcNetsValue`, `mcNetsShapley` |
| Optimal coalition structure | `findOptimalCoalitionStructure`, `allCoalitionStructures` |
| English auction | `runEnglishAuction` |
| Vickrey auction | `runVickreyAuction` |
| VCG mechanism | `runVCGMechanism` |
| Borda count | `bordaCount` |
| Plurality voting | `pluralityVoting` |
| Instant runoff voting | `instantRunoffVoting` |
| Condorcet winner / paradox | `findCondorcetWinner`, `condorcetParadox` |
| Rubinstein bargaining | `rubinsteinBargaining` |
| Zeuthen risk / negotiation | `zeuthenRisk`, `simulateZeuthenNegotiation` |

All functions are pure TypeScript with 100% branch + line coverage (134 tests).

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
- **Vite** for bundling (base path: `/chapter-17/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-17/viz-name`

