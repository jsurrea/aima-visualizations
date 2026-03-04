# Chapter 19 — Learning from Examples

**Part 5: Machine Learning** · Color: `#10B981`

Interactive visualizations for AIMA Chapter 19 (pp. 669–738): decision trees, bias–variance tradeoff, linear regression, k-nearest neighbors, and ensemble methods.

---

## Visualizations

### 19.1 Forms of Learning
Static diagram illustrating the taxonomy of learning paradigms: supervised, unsupervised, reinforcement, semi-supervised, and online learning.

### 19.2 Supervised Learning & Bias–Variance Tradeoff (`BiasVarianceDemo`)
- Generates noisy observations from sin(x) (20 train / 5 test points)
- User selects polynomial degree (1, 2, 3, 5, 8, 12)
- SVG plot shows fitted curve vs. true function and individual data points
- Noise level slider regenerates data
- Displays training MSE and test MSE; highlights overfitting/underfitting

### 19.3 Decision Tree Learner — ID3 (`DecisionTreeVisualizer`)
- Restaurant dataset from the book (12 examples, 10 attributes)
- Step-by-step tree building: play/pause/step-back/step-forward/reset + speed slider
- SVG tree renders nodes as they are added; active node highlighted in `--color-primary`
- State panel shows: entropy H, sorted attribute information gains, step action
- **What-If**: toggle individual examples on/off; tree rebuilds in real time
- KaTeX-rendered entropy and information-gain formulas

### 19.4 Model Selection & Overfitting
Explanatory section with underfitting/overfitting summary cards and k-fold cross-validation formula.

### 19.5 Theory of Learning (PAC)
PAC learning sample-complexity bounds — both finite |H| and VC-dimension variants — rendered with KaTeX. Symbol glossary included.

### 19.6 Linear Regression (`LinearRegressionVisualizer`)
- Scatter plot with 8 default points; click to add new data points
- Batch gradient descent runs for 300 iterations
- Regression line updates in real time; controls: play/pause/step/reset + speed & learning-rate sliders
- Loss curve (MSE over iterations) with current-step marker
- State panel: w₀, w₁, MSE rendered with KaTeX

### 19.7 k-Nearest Neighbors (`KNNVisualizer`)
- 20 pre-loaded 2D points (two classes with slight overlap)
- Click to place a query point; k slider (1–10)
- Decision boundary rendered by grid-sampling (30×30) the feature space
- Neighbor lines drawn from query to the k nearest points
- State panel lists each neighbor with its label and Euclidean distance

### 19.8 Ensemble Learning — AdaBoost (`EnsembleVisualizer`)
- 16 points in a non-linearly-separable layout
- Step through up to 5 AdaBoost rounds; each round adds a decision stump
- Circle radius encodes sample weight (misclassified examples grow larger)
- Current stump boundary highlighted; past stumps shown as dashed lines
- State panel shows feature, threshold, polarity, error ε, and stump weight α
- KaTeX-rendered AdaBoost prediction formula

### 19.9 Developing ML Systems
Step-by-step practical checklist: understand the problem, collect data, feature engineering, baseline, model selection, error analysis, iterate & deploy.

---

## Algorithms (`src/algorithms/index.ts`)

| Function | Description | Complexity |
|---|---|---|
| `entropy(p, n)` | Binary entropy H(p/(p+n)) | O(1) |
| `informationGain(attr, examples)` | Information gain for ID3 | O(n·v) |
| `learnDecisionTree(examples, attrs, parent)` | ID3 recursive tree builder | O(a·n) / level |
| `learnDecisionTreeSteps(examples, attrs)` | Step-by-step ID3 trace | O(a·n) / level |
| `linearRegressionGD(data, lr, epochs)` | Batch gradient descent | O(epochs·n) |
| `euclideanDistance(a, b)` | L2 distance | O(d) |
| `knnClassify(training, query, k)` | k-NN classifier | O(n log n) |
| `perceptronLearn(data, lr, maxEpochs)` | Perceptron learning | O(epochs·n·d) |
| `adaBoost(data, rounds)` | AdaBoost with stumps | O(rounds·n·d·v) |

All functions: pure, no side effects, 100% branch + line coverage.

---

## Development

```bash
npm install
npm run dev       # Start dev server at http://localhost:5173/aima-visualizations/chapter-19/
npm test          # Run Vitest (66 tests)
npm test -- --run --coverage   # Coverage report (must be 100%)
npm run build     # TypeScript check + Vite build
```

---

## Architecture

Self-contained microfrontend:
- **React 18** + **TypeScript** (`strict: true`, `noUncheckedIndexedAccess: true`)
- **Vite** (base: `/aima-visualizations/chapter-19/`)
- **Module Federation** via `@originjs/vite-plugin-federation`
- **Vitest** (100% branch + line coverage on `src/algorithms/`)
- **KaTeX** (CSS imported once in `src/main.tsx`)

No cross-chapter imports. All styles use inline CSS with design-system CSS custom properties.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Branch naming: `chapter-19/viz-name`
