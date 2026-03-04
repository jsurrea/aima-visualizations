/**
 * Chapter 21 — Learning Probabilistic Models
 *
 * Pure algorithm implementations for:
 *   §21.1 Statistical Learning (Bayesian candy example)
 *   §21.2 Learning with Complete Data (MLE discrete/Gaussian, Beta/Bayesian params)
 *   §21.3 Learning with Hidden Variables: EM Algorithm (Mixture of Gaussians)
 *
 * Every exported function is pure (no side effects) and returns an immutable
 * array of step records for step-by-step playback in the visualizer.
 *
 * @module algorithms
 */

// ─── §21.1  Bayesian Learning — Candy Bag Example ────────────────────────────

/**
 * Observation type for the candy example (Section 21.1).
 */
export type CandyObs = 'cherry' | 'lime';

/**
 * A single step of Bayesian learning in the candy-bag example.
 * Five hypotheses: h1=100% cherry, h2=75/25, h3=50/50, h4=25/75, h5=100% lime.
 */
export interface BayesianCandyStep {
  /** Index of this observation (1-based). */
  readonly obsIndex: number;
  /** The observation made. */
  readonly observation: CandyObs;
  /** Posterior probabilities P(hi | d1..dN), one per hypothesis. */
  readonly posteriors: ReadonlyArray<number>;
  /** Predicted probability that the NEXT candy is lime: P(DN+1=lime | d). */
  readonly predictedLimeProb: number;
  /** Human-readable description of this step. */
  readonly action: string;
}

/** Cherry probability for each of the 5 candy hypotheses. */
const CANDY_CHERRY_PROBS = [1.0, 0.75, 0.5, 0.25, 0.0] as const;

/**
 * Runs Bayesian learning on a sequence of candy observations.
 * Updates P(hi|d) after each observation using Bayes' rule (Eq. 21.1).
 * Prediction uses the full mixture (Eq. 21.2).
 *
 * @param observations - Sequence of 'cherry' or 'lime' observations.
 * @param prior - Prior probabilities [P(h1),...,P(h5)]. Defaults to [0.1,0.2,0.4,0.2,0.1].
 * @returns Immutable array of BayesianCandyStep, one per observation.
 * @complexity O(N * K) where N = observations, K = 5 hypotheses
 */
export function bayesianCandyLearning(
  observations: ReadonlyArray<CandyObs>,
  prior: ReadonlyArray<number> = [0.1, 0.2, 0.4, 0.2, 0.1],
): ReadonlyArray<BayesianCandyStep> {
  const steps: BayesianCandyStep[] = [];
  let posteriors = [...prior];

  for (let n = 0; n < observations.length; n++) {
    const obs = observations[n];
    // P(obs | hi): cherry prob if obs=cherry, lime prob if obs=lime
    const likelihoods = CANDY_CHERRY_PROBS.map(p =>
      obs === 'cherry' ? p : 1 - p,
    );
    // Unnormalized: P(d | hi) * P(hi)
    const unnorm = posteriors.map((p, i) => p * likelihoods[i]);
    const total = unnorm.reduce((s, v) => s + v, 0);
    posteriors = total > 0 ? unnorm.map(v => v / total) : [...posteriors];

    // Predicted P(next = lime | d) = sum_i P(lime | hi) * P(hi | d)
    const predictedLimeProb = posteriors.reduce(
      (sum, p, i) => sum + (1 - CANDY_CHERRY_PROBS[i]) * p,
      0,
    );

    const mapIdx = posteriors.indexOf(Math.max(...posteriors));
    steps.push({
      obsIndex: n + 1,
      observation: obs,
      posteriors: [...posteriors],
      predictedLimeProb,
      action: `Obs ${n + 1}: ${obs} → MAP = h${mapIdx + 1} (P=${posteriors[mapIdx].toFixed(4)})`,
    });
  }
  return steps;
}

// ─── §21.2.1  MLE — Discrete Parameter Learning ──────────────────────────────

/**
 * A single step of MLE discrete parameter estimation.
 */
export interface MLEDiscreteStep {
  /** Cumulative cherry count so far. */
  readonly cherryCount: number;
  /** Cumulative lime count so far. */
  readonly limeCount: number;
  /** Current MLE estimate: θ = cherryCount / (cherryCount + limeCount). */
  readonly theta: number;
  /** Log-likelihood of all data so far: c·log(θ) + l·log(1−θ). */
  readonly logLikelihood: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Step-by-step MLE estimation of the cherry fraction θ from a candy sequence.
 * Implements the three-step MLE method from Section 21.2.1.
 *
 * @param observations - Sequence of candy observations.
 * @returns Array of MLEDiscreteStep, one per observation.
 * @complexity O(N)
 */
export function mleDiscreteSteps(
  observations: ReadonlyArray<CandyObs>,
): ReadonlyArray<MLEDiscreteStep> {
  const steps: MLEDiscreteStep[] = [];
  let c = 0;
  let l = 0;

  for (const obs of observations) {
    if (obs === 'cherry') c++;
    else l++;

    // c + l >= 1 is always true here (we just incremented)
    const theta = c / (c + l);
    // log-likelihood: c*log(theta) + l*log(1-theta), with 0*log(0) = 0
    const ll =
      (c > 0 ? c * Math.log(theta) : 0) +
      (l > 0 ? l * Math.log(1 - theta) : 0);

    steps.push({
      cherryCount: c,
      limeCount: l,
      theta,
      logLikelihood: ll,
      action: `N=${c + l}: ${c} cherry, ${l} lime → θ̂=${theta.toFixed(4)}`,
    });
  }
  return steps;
}

// ─── §21.2.4  MLE — Gaussian Parameter Learning ──────────────────────────────

/**
 * A single step of Gaussian MLE parameter estimation.
 */
export interface GaussianMLEStep {
  /** Data points seen so far. */
  readonly data: ReadonlyArray<number>;
  /** MLE mean estimate: sample average. */
  readonly muMLE: number;
  /** MLE std-dev estimate: sqrt of sample variance (biased). */
  readonly sigmaMLE: number;
  /** Log-likelihood under the current MLE Gaussian. */
  readonly logLikelihood: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Step-by-step MLE estimation of mean µ and std-dev σ for a Gaussian.
 * Implements Equations (21.4) from Section 21.2.4.
 *
 * @param data - Observed continuous data points.
 * @returns Array of GaussianMLEStep, one per observation.
 * @complexity O(N²) in the naive running implementation
 */
export function gaussianMLESteps(
  data: ReadonlyArray<number>,
): ReadonlyArray<GaussianMLEStep> {
  const steps: GaussianMLEStep[] = [];
  const seen: number[] = [];

  for (const x of data) {
    seen.push(x);
    const n = seen.length;
    const mu = seen.reduce((s, v) => s + v, 0) / n;
    const variance = seen.reduce((s, v) => s + (v - mu) ** 2, 0) / n;
    const sigma = Math.sqrt(variance);

    // Log-likelihood: sum_j log(N(xj; mu, sigma))
    let ll = -Infinity;
    if (sigma > 0) {
      ll = seen.reduce(
        (s, v) =>
          s -
          0.5 * Math.log(2 * Math.PI) -
          Math.log(sigma) -
          (v - mu) ** 2 / (2 * sigma ** 2),
        0,
      );
    }

    steps.push({
      data: [...seen],
      muMLE: mu,
      sigmaMLE: sigma,
      logLikelihood: ll,
      action: `N=${n}: µ̂=${mu.toFixed(3)}, σ̂=${sigma.toFixed(3)}`,
    });
  }
  return steps;
}

// ─── §21.2.5  Bayesian Parameter Learning — Beta Conjugate Prior ──────────────

/**
 * Evaluates the Beta(θ; a, b) PDF at a given θ value (unnormalized).
 * Beta(θ; a, b) ∝ θ^(a−1) · (1−θ)^(b−1), for θ ∈ (0, 1).
 *
 * @param theta - Value in (0, 1).
 * @param a - Shape parameter a > 0.
 * @param b - Shape parameter b > 0.
 * @returns Unnormalized Beta density value.
 * @complexity O(1)
 */
export function betaPDF(theta: number, a: number, b: number): number {
  if (theta <= 0 || theta >= 1) return 0;
  return Math.exp((a - 1) * Math.log(theta) + (b - 1) * Math.log(1 - theta));
}

/**
 * Computes the mean of a Beta(a, b) distribution: a/(a+b).
 *
 * @param a - Shape parameter a > 0.
 * @param b - Shape parameter b > 0.
 * @returns Mean a / (a+b).
 * @complexity O(1)
 */
export function betaMean(a: number, b: number): number {
  return a / (a + b);
}

/**
 * A single step of Bayesian parameter learning with a Beta prior.
 */
export interface BetaLearningStep {
  /** Observation that triggered this update. */
  readonly observation: CandyObs;
  /** New Beta shape parameter a (cherry virtual count + 1). */
  readonly a: number;
  /** New Beta shape parameter b (lime virtual count + 1). */
  readonly b: number;
  /** Posterior mean of θ: a/(a+b). */
  readonly posteriorMean: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Bayesian parameter learning for a Bernoulli variable using a Beta conjugate prior.
 * Each cherry observation increments a; each lime observation increments b.
 * Implements Section 21.2.5.
 *
 * @param observations - Sequence of 'cherry' or 'lime' observations.
 * @param initA - Initial Beta shape parameter a (default 1 = uniform prior).
 * @param initB - Initial Beta shape parameter b (default 1 = uniform prior).
 * @returns Array of BetaLearningStep, one per observation.
 * @complexity O(N)
 */
export function betaLearningSteps(
  observations: ReadonlyArray<CandyObs>,
  initA = 1,
  initB = 1,
): ReadonlyArray<BetaLearningStep> {
  const steps: BetaLearningStep[] = [];
  let a = initA;
  let b = initB;

  for (const obs of observations) {
    if (obs === 'cherry') a++;
    else b++;

    const posteriorMean = betaMean(a, b);
    steps.push({
      observation: obs,
      a,
      b,
      posteriorMean,
      action: `Obs: ${obs} → Beta(${a}, ${b}), mean = ${posteriorMean.toFixed(4)}`,
    });
  }
  return steps;
}

// ─── §21.3.1  EM Algorithm — Mixture of Gaussians ─────────────────────────────

/**
 * Parameters for a single 1-D Gaussian component.
 */
export interface GaussianComponent {
  /** Mixture weight w_i = P(C=i). */
  readonly weight: number;
  /** Mean µ_i. */
  readonly mean: number;
  /** Standard deviation σ_i (> 0). */
  readonly stdDev: number;
}

/**
 * Evaluates the 1-D Gaussian PDF: N(x; µ, σ).
 *
 * @param x - Point to evaluate at.
 * @param mu - Mean.
 * @param sigma - Standard deviation (> 0).
 * @returns Probability density value.
 * @complexity O(1)
 */
export function gaussianPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * One step (E-step or M-step) of the EM algorithm for a 1-D Gaussian mixture.
 */
export interface EMStep {
  /** Iteration index (0 = initial/after M-step 0 = initialization). */
  readonly iteration: number;
  /** 'init' | 'E' | 'M' */
  readonly phase: 'init' | 'E' | 'M';
  /** Current component parameters. */
  readonly components: ReadonlyArray<GaussianComponent>;
  /**
   * Responsibilities r[j][i] = P(C=i | x_j) after the E-step.
   * Dimensions: [nData][nComponents].
   * Undefined during the init phase.
   */
  readonly responsibilities: ReadonlyArray<ReadonlyArray<number>> | null;
  /** Log-likelihood of the data under the current model. */
  readonly logLikelihood: number;
  /** Human-readable description of this step. */
  readonly action: string;
}

/**
 * Evaluates the log-likelihood of 1-D data under a Gaussian mixture model.
 *
 * @param data - Data points.
 * @param components - Mixture components.
 * @returns Log-likelihood (negative values expected).
 * @complexity O(N * K)
 */
export function mixtureLogLikelihood(
  data: ReadonlyArray<number>,
  components: ReadonlyArray<GaussianComponent>,
): number {
  return data.reduce((sum, x) => {
    const p = components.reduce(
      (s, c) => s + c.weight * gaussianPDF(x, c.mean, c.stdDev),
      0,
    );
    return sum + (p > 0 ? Math.log(p) : -1e10);
  }, 0);
}

/**
 * Runs the EM algorithm for a 1-D Gaussian mixture model.
 * Returns all steps (init + alternating E/M steps) for playback.
 *
 * @param data - 1-D data points.
 * @param k - Number of Gaussian components.
 * @param maxIter - Maximum EM iterations.
 * @param initComponents - Initial component parameters. If omitted, uses k evenly-spaced means.
 * @param tolerance - Convergence threshold on log-likelihood change (default 1e-6).
 * @returns Immutable array of EMStep records.
 * @complexity O(maxIter * N * K)
 */
export function emMixtureOfGaussians(
  data: ReadonlyArray<number>,
  k: number,
  maxIter: number,
  initComponents?: ReadonlyArray<GaussianComponent>,
  tolerance = 1e-6,
): ReadonlyArray<EMStep> {
  const n = data.length;
  if (n === 0 || k <= 0) return [];

  const steps: EMStep[] = [];

  // ── Initialization ──────────────────────────────────────────────────────────
  let components: GaussianComponent[];

  if (initComponents && initComponents.length === k) {
    components = initComponents.map(c => ({ ...c }));
  } else {
    // Default: k components with evenly-spaced means covering data range
    const minX = Math.min(...data);
    const maxX = Math.max(...data);
    const range = maxX - minX || 1;
    const globalStd = Math.sqrt(
      data.reduce((s, x) => {
        const m = (minX + maxX) / 2;
        return s + (x - m) ** 2;
      }, 0) / n,
    ) || 1;
    components = Array.from({ length: k }, (_, i) => ({
      weight: 1 / k,
      mean: minX + (range / (k + 1)) * (i + 1),
      stdDev: globalStd,
    }));
  }

  let ll = mixtureLogLikelihood(data, components);

  steps.push({
    iteration: 0,
    phase: 'init',
    components: components.map(c => ({ ...c })),
    responsibilities: null,
    logLikelihood: ll,
    action: `Initialize ${k} Gaussian components`,
  });

  for (let iter = 1; iter <= maxIter; iter++) {
    // ── E-step ────────────────────────────────────────────────────────────────
    const resp: number[][] = data.map(x => {
      const raw = components.map(c => c.weight * gaussianPDF(x, c.mean, c.stdDev));
      const total = raw.reduce((s, v) => s + v, 0);
      return total > 0 ? raw.map(v => v / total) : raw.map(() => 1 / k);
    });

    steps.push({
      iteration: iter,
      phase: 'E',
      components: components.map(c => ({ ...c })),
      responsibilities: resp.map(row => [...row]),
      logLikelihood: ll,
      action: `E-step ${iter}: compute soft assignments P(C=i | x_j)`,
    });

    // ── M-step ────────────────────────────────────────────────────────────────
    const newComponents: GaussianComponent[] = [];

    for (let i = 0; i < k; i++) {
      // n_i = effective count for component i
      const ni = resp.reduce((s, row) => s + row[i], 0);

      if (ni < 1e-10) {
        // Degenerate component — keep old parameters
        newComponents.push({ ...components[i] });
        continue;
      }

      const newMean = resp.reduce((s, row, j) => s + row[i] * data[j], 0) / ni;
      const newVariance =
        resp.reduce((s, row, j) => s + row[i] * (data[j] - newMean) ** 2, 0) /
        ni;
      const newStdDev = Math.sqrt(newVariance) || 1e-6;
      const newWeight = ni / n;

      newComponents.push({ weight: newWeight, mean: newMean, stdDev: newStdDev });
    }

    components = newComponents;
    const newLL = mixtureLogLikelihood(data, components);

    steps.push({
      iteration: iter,
      phase: 'M',
      components: components.map(c => ({ ...c })),
      responsibilities: resp.map(row => [...row]),
      logLikelihood: newLL,
      action: `M-step ${iter}: update µ, σ, w → LL = ${newLL.toFixed(3)}`,
    });

    if (Math.abs(newLL - ll) < tolerance) {
      break;
    }
    ll = newLL;
  }

  return steps;
}

// ─── §21.2.2  Naive Bayes Classifier ─────────────────────────────────────────

/**
 * A labeled training example for the Naive Bayes classifier.
 */
export interface NaiveBayesExample {
  /** Feature vector. */
  readonly features: ReadonlyArray<boolean>;
  /** Class label (true = positive, false = negative). */
  readonly label: boolean;
}

/**
 * Naive Bayes model parameters learned from data.
 */
export interface NaiveBayesModel {
  /** Prior P(C = true). */
  readonly priorTrue: number;
  /** P(Xi = true | C = true) for each feature i. */
  readonly likelihoodsTrue: ReadonlyArray<number>;
  /** P(Xi = true | C = false) for each feature i. */
  readonly likelihoodsFalse: ReadonlyArray<number>;
}

/**
 * Trains a Naive Bayes classifier from labeled Boolean data using MLE.
 * Uses Laplace smoothing (count initialised to 1) to avoid zero probabilities.
 * Implements Section 21.2.2.
 *
 * @param examples - Labeled training examples (Boolean features).
 * @returns Learned Naive Bayes model.
 * @complexity O(N * F) where F = number of features
 */
export function trainNaiveBayes(
  examples: ReadonlyArray<NaiveBayesExample>,
): NaiveBayesModel {
  if (examples.length === 0) {
    return { priorTrue: 0.5, likelihoodsTrue: [], likelihoodsFalse: [] };
  }

  const nFeatures = examples[0].features.length;
  const posExamples = examples.filter(e => e.label);
  const negExamples = examples.filter(e => !e.label);

  // Laplace-smoothed prior
  const priorTrue = (posExamples.length + 1) / (examples.length + 2);

  const likelihoodsTrue = Array.from({ length: nFeatures }, (_, f) => {
    const trueCount = posExamples.filter(e => e.features[f]).length;
    return (trueCount + 1) / (posExamples.length + 2);
  });

  const likelihoodsFalse = Array.from({ length: nFeatures }, (_, f) => {
    const trueCount = negExamples.filter(e => e.features[f]).length;
    return (trueCount + 1) / (negExamples.length + 2);
  });

  return { priorTrue, likelihoodsTrue, likelihoodsFalse };
}

/**
 * Classifies a new example using a trained Naive Bayes model.
 * Returns P(C = true | x1, ..., xn) (normalized).
 *
 * @param model - Trained model from trainNaiveBayes.
 * @param features - Boolean feature values of the query example.
 * @returns Probability that the class is true.
 * @complexity O(F)
 */
export function classifyNaiveBayes(
  model: NaiveBayesModel,
  features: ReadonlyArray<boolean>,
): number {
  const logPos = features.reduce((s, f, i) => {
    const p = model.likelihoodsTrue[i] ?? 0.5;
    return s + Math.log(f ? p : 1 - p);
  }, Math.log(model.priorTrue));

  const logNeg = features.reduce((s, f, i) => {
    const p = model.likelihoodsFalse[i] ?? 0.5;
    return s + Math.log(f ? p : 1 - p);
  }, Math.log(1 - model.priorTrue));

  // Normalize in log-space for numerical stability
  const maxLog = Math.max(logPos, logNeg);
  const posExp = Math.exp(logPos - maxLog);
  const negExp = Math.exp(logNeg - maxLog);
  return posExp / (posExp + negExp);
}
