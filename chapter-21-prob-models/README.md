# Chapter 21 — Learning Probabilistic Models

**Part 5: Machine Learning** · AIMA 4th Ed., pp. 772–800

Interactive visualizations covering every section of Chapter 21: Bayesian learning, MLE, Beta conjugate priors, and the EM Algorithm.

---

## Visualizations

### §21.1 Statistical Learning — Bayesian Candy Example
**Component:** `BayesianLearningVisualizer`

Step-by-step Bayesian posterior update over five candy-bag hypotheses (h₁=100% cherry … h₅=100% lime). Features:
- Clickable observation sequence (cherry/lime); add/remove observations interactively
- Live bar chart of P(hᵢ | d) after each observation
- Bayesian vs MAP prediction comparison (P(next=lime | d))
- Full play/pause/step-back/step-forward controls with speed slider
- Prediction history chart showing both Bayesian and MAP predictions over time

### §21.2 Maximum Likelihood Estimation — Discrete & Gaussian
**Component:** `MLEVisualizer`

Two tabbed panels:
- **Discrete (Candy):** MLE estimate θ̂ = c/N updated after each cherry/lime observation; click any observation to highlight; θ vs N chart and log-likelihood display
- **Gaussian (Continuous):** Enter data points to fit a Gaussian; live density curve overlaid on data ticks; µ̂ and σ̂ shown with Laplace formula

### §21.2.5 Bayesian Parameter Learning — Beta Conjugate Prior
**Component:** `BetaPriorVisualizer`

Animated Beta(a, b) density curve that updates after each observation:
- "What if?" sliders for hyperparameters a₀, b₀ (virtual counts)
- Navigate forward/backward through observations; shows current and previous curve (dashed) to visualize update magnitude
- Posterior mean sparkline history
- Gallery of preset Beta distributions illustrating how the shape evolves (uniform → converged)

### §21.3 EM Algorithm — Mixture of Gaussians
**Component:** `EMVisualizer`

Full step-by-step EM visualization on 1D Gaussian mixture data:
- **Two scenarios:** 2-cluster and 3-cluster datasets (seeded PRNG for reproducibility)
- **E-step panel:** Color-coded data points by soft assignments; responsibility table (first 10 rows)
- **M-step panel:** Updated component means (vertical dashed lines), density curves with weights
- **Log-likelihood sparkline** showing monotonic increase over iterations
- Adjustable max iterations slider
- **§21.3.2 Candy Mixture Table:** Book data (Eq. 21.9–21.11) showing true → init → iter1 → converged parameters for θ, θ_F1, θ_W1, θ_H1, θ_F2

---

## Algorithm Implementations

All in `src/algorithms/index.ts` (pure functions, 100% coverage, 79 tests):

| Function | Description |
|---|---|
| `bayesianCandyLearning` | Bayesian posterior over 5 candy hypotheses (§21.1) |
| `mleDiscreteSteps` | MLE θ̂ = c/N with log-likelihood (§21.2.1) |
| `gaussianMLESteps` | Gaussian MLE µ̂, σ̂ incremental steps (§21.2.4) |
| `betaPDF` | Beta(θ; a, b) density value (§21.2.5) |
| `betaMean` | Mean a/(a+b) of Beta distribution |
| `betaLearningSteps` | Conjugate prior updates with Beta (§21.2.5) |
| `gaussianPDF` | 1-D Gaussian PDF |
| `mixtureLogLikelihood` | Log-likelihood of data under GMM |
| `emMixtureOfGaussians` | Full EM for 1-D Gaussian mixture (§21.3) |
| `trainNaiveBayes` | Naive Bayes training with Laplace smoothing (§21.2.2) |
| `classifyNaiveBayes` | Naive Bayes classification |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests with coverage (must be 100%)
npm test -- --run --coverage

# Build for production (must be < 500 KB gzipped)
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode + `noUncheckedIndexedAccess`)
- **Vite** + `@originjs/vite-plugin-federation` (base: `/aima-visualizations/chapter-21/`)
- **Vitest** for unit testing (100% branch/line/function coverage on `src/algorithms/`)
- **KaTeX** for math rendering (imported once at `src/main.tsx`)
- **SVG** for all custom charts and visualizations

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-21/viz-name`

