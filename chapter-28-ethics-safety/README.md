# Chapter 28 — Philosophy, Ethics, and Safety of AI

**Part VII: Conclusions** · Book pages 1032–1062

Interactive visualizations covering all three sections of Chapter 28: the philosophical limits of AI, whether machines can truly think, and the ethical responsibilities of building powerful AI systems.

---

## Visualizations

### §28.1 — The Limits of AI
**Arguments Against AI — Interactive Explorer** (`AILimitsViz`)
- Four argument cards: informality (Dreyfus), disability (Turing's list), mathematical objection (Gödel/Lucas/Penrose), and the Turing Test
- Toggle between the original claim and the modern rebuttal for each argument
- Turing Test historical timeline from 1950 to 2019

### §28.2 — Can Machines Really Think?
**The Chinese Room — Step-by-Step Simulation** (`ChineseRoomViz`)
- Animated four-step simulation of Searle's Chinese Room argument
- Toggle between Searle's view (no understanding) and the Systems Reply
- Play/pause/step/reset playback controls
- Consciousness theories explorer: Global Workspace Theory, IIT, Biological Naturalism, Polite Convention

### §28.3 — The Ethics of AI (overview)
**AI Ethics Principles Taxonomy + Future of Work** (`EthicsPrinciplesViz`)
- Eight principle cards (safety, fairness, privacy, transparency, accountability, autonomous weapons, human rights, employment impact)
- Category filter (safety / fairness / transparency / governance)
- Expandable cards with real-world examples and book section references
- Asimov's Laws of Robotics callout
- **Future of Work tab**: automation risk explorer for 10 occupations (Frey & Osborne data)
- Adjustable risk threshold with at-risk worker count

### §28.3.2 — Surveillance, Security, and Privacy
**k-Anonymity & Differential Privacy** (`PrivacyViz`)
- **k-Anonymity tab**: 8-record medical dataset with toggles for name removal, age generalisation (decade ranges), and zip suppression; live k-anonymity level badge with unique-record highlighting
- **Differential Privacy tab**: Laplace mechanism demo — adjust ε, true count, and number of queries; bar chart of noisy responses; formula display

### §28.3.3 — Fairness and Bias
**COMPAS-Style Fairness Demo** (`FairnessMetricsViz`)
- 400-record synthetic recidivism dataset with differing base rates across two groups
- Independent threshold sliders per group
- Live confusion matrices, TPR/FPR/PPV/positive-rate table
- Demographic parity, equal opportunity, and calibration satisfaction badges
- Kleinberg impossibility callout: calibration and equal opportunity are mutually exclusive when base rates differ
- Adjustable tolerance ε
- Fairness concepts guide with formula display

### §28.3.7 — AI Safety
**Fault Tree Analysis & Value Alignment** (`SafetyViz`)
- **Fault Tree tab**: 4-leaf AND/OR fault tree; adjustable per-component failure probabilities; real-time top-event probability with risk classification
- **Value Alignment tab**: 6 robot actions with human vs. robot utility sliders; Pearson correlation alignment score; low-impact penalty slider showing adjusted utilities; King Midas problem callout

---

## Algorithm Functions (`src/algorithms/index.ts`)

| Function | Description | §Book |
|---|---|---|
| `computeFairnessMetrics` | Per-group TPR/FPR/PPV/positive-rate | 28.3.3 |
| `hasDemographicParity` | Check equal positive rates | 28.3.3 |
| `hasEqualOpportunity` | Check equal TPRs | 28.3.3 |
| `isWellCalibrated` | Check equal PPVs (COMPAS criterion) | 28.3.3 |
| `computeKAnonymity` | Minimum equivalence-class size | 28.3.2 |
| `generalizeField` | Age→decade or *-suppression | 28.3.2 |
| `laplaceNoise` | Laplace mechanism for ε-differential privacy | 28.3.2 |
| `laplaceNoiseStdDev` | Expected std dev of Laplace noise | 28.3.2 |
| `faultTreeProbability` | AND/OR fault tree top-event probability | 28.3.7 |
| `valueAlignmentScore` | Pearson correlation human vs. robot utility | 28.3.7 |
| `lowImpactUtility` | Robot utility with state-change penalty | 28.3.7 |

All functions are pure (no side effects), fully typed, with 100% branch + line test coverage.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (100% coverage)
npm test -- --run --coverage

# Build for production
npm run build
```

---

## Architecture

Self-contained microfrontend:
- **React 18** + **TypeScript** (strict mode, no `any`)
- **Vite** — base path `/aima-visualizations/chapter-28/`
- **Vitest** — 100% branch + line coverage on `src/algorithms/`
- **KaTeX** — math rendering (import at `src/main.tsx`)
- No cross-chapter imports

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-28/viz-name`
