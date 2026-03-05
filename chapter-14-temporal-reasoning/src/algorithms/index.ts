/**
 * Chapter 14 — Probabilistic Reasoning over Time
 *
 * Implementations of:
 *   §14.2  HMM forward filtering, forward-backward smoothing, Viterbi
 *   §14.3  HMM matrix-form operations
 *   §14.4  1-D and multivariate Kalman filter
 *   §14.5  Particle filter (discrete HMM)
 *
 * All exported functions are pure with no side effects.
 * @module algorithms
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HMMParams {
  /** Number of hidden states S */
  numStates: number;
  /** S×S row-stochastic transition matrix; T[i][j] = P(X_t=j | X_{t-1}=i) */
  transitionMatrix: ReadonlyArray<ReadonlyArray<number>>;
  /** Initial state distribution, length S */
  prior: ReadonlyArray<number>;
  /** observationProbs[e][s] = P(evidence=e | state=s) */
  observationProbs: ReadonlyArray<ReadonlyArray<number>>;
}

export interface FilterStep {
  /** 1-based time index */
  t: number;
  /** P(X_t | e_{1:t}) — posterior after incorporating e_t */
  belief: ReadonlyArray<number>;
  /** Observation index at this step */
  evidence: number;
  /** P(X_t | e_{1:t-1}) — prediction before incorporating e_t */
  predBelief: ReadonlyArray<number>;
}

export interface SmoothStep {
  /** 1-based time index */
  t: number;
  /** Forward message f_{1:t} = P(X_t | e_{1:t}) */
  forward: ReadonlyArray<number>;
  /** Backward message b_{t+1:T} */
  backward: ReadonlyArray<number>;
  /** Smoothed estimate P(X_t | e_{1:T}) = α f_{1:t} × b_{t+1:T} */
  smoothed: ReadonlyArray<number>;
}

export interface ViterbiStep {
  /** 1-based time index */
  t: number;
  /** Maximum path probability to each state at this step */
  m: ReadonlyArray<number>;
  /** Best predecessor state index for each state */
  backpointer: ReadonlyArray<number>;
}

export interface ViterbiResult {
  steps: ReadonlyArray<ViterbiStep>;
  mostLikelyPath: ReadonlyArray<number>;
  pathProb: number;
}

export interface KalmanStep1D {
  /** 1-based time index */
  t: number;
  /** Mean entering this step (before prediction) */
  priorMean: number;
  /** Variance entering this step (before prediction) */
  priorVar: number;
  /** Predicted mean μ_{t|t-1} */
  predMean: number;
  /** Predicted variance σ²_{t|t-1} = priorVar + σ²_x */
  predVar: number;
  /** Observation z_t */
  observation: number;
  /** Updated mean μ_t */
  posteriorMean: number;
  /** Updated variance σ²_t */
  posteriorVar: number;
  /** Kalman gain K */
  kalmanGain: number;
}

export interface KalmanParams1D {
  /** Prior mean μ_0 */
  mu0: number;
  /** Prior variance σ²_0 */
  sigma0Sq: number;
  /** Transition (process) noise variance σ²_x */
  sigmaXSq: number;
  /** Sensor noise variance σ²_z */
  sigmaZSq: number;
  /** Sequence of scalar observations */
  observations: ReadonlyArray<number>;
}

export interface KalmanParams2D {
  /** Prior mean vector (length n) */
  mu0: ReadonlyArray<number>;
  /** Prior covariance matrix (n×n) */
  sigma0: ReadonlyArray<ReadonlyArray<number>>;
  /** State-transition matrix F (n×n) */
  F: ReadonlyArray<ReadonlyArray<number>>;
  /** Process-noise covariance Σ_x (n×n) */
  sigmaX: ReadonlyArray<ReadonlyArray<number>>;
  /** Observation matrix H (m×n) */
  H: ReadonlyArray<ReadonlyArray<number>>;
  /** Measurement-noise covariance Σ_z (m×m) */
  sigmaZ: ReadonlyArray<ReadonlyArray<number>>;
  /** Sequence of m-dimensional observations */
  observations: ReadonlyArray<ReadonlyArray<number>>;
}

export interface KalmanStep2D {
  /** 1-based time index */
  t: number;
  /** Predicted mean μ_{t|t-1} */
  predMu: ReadonlyArray<number>;
  /** Predicted covariance Σ_{t|t-1} */
  predSigma: ReadonlyArray<ReadonlyArray<number>>;
  /** Observation z_t */
  observation: ReadonlyArray<number>;
  /** Updated mean μ_t */
  mu: ReadonlyArray<number>;
  /** Updated covariance Σ_t */
  sigma: ReadonlyArray<ReadonlyArray<number>>;
  /** Kalman gain matrix K (n×m) */
  kalmanGain: ReadonlyArray<ReadonlyArray<number>>;
}

export interface Particle {
  /** Discrete state index */
  state: number;
  weight: number;
}

export interface ParticleFilterStep {
  /** 1-based time index */
  t: number;
  /** Propagated state indices before resampling */
  particles: ReadonlyArray<number>;
  /** Unnormalized likelihood weights */
  weights: ReadonlyArray<number>;
  /** State indices after multinomial resampling */
  resampled: ReadonlyArray<number>;
  /** Histogram approximation of P(X_t | e_{1:t}) */
  beliefEstimate: ReadonlyArray<number>;
  /** Observation index at this step */
  evidence: number;
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

/**
 * Mulberry32 seeded PRNG — deterministic, returns values in [0, 1).
 * Period of ~2³² which is sufficient for particle filter use.
 * Used to ensure reproducible results given a fixed seed.
 *
 * @param seed 32-bit integer seed
 * @returns A stateful function that returns the next pseudo-random number in [0, 1)
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/**
 * Sample a category index via inverse-transform sampling.
 * `probs` should be a valid probability distribution (elements ≥ 0, sum ≤ 1).
 * Falls through to the last index to handle floating-point rounding where
 * the cumulative sum never quite reaches the drawn value.
 *
 * @param probs Probability distribution over S categories
 * @param rng   Source of uniform random values in [0, 1)
 * @returns Sampled category index in [0, probs.length - 1]
 * @complexity O(S)
 */
function sampleCategorical(probs: ReadonlyArray<number>, rng: () => number): number {
  let r = rng();
  for (let i = 0; i < probs.length - 1; i++) {
    r -= probs[i]!;
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

/**
 * Multinomial resampling for particle filters.
 * Draws `n` replacement samples from `states` with probability proportional
 * to the corresponding `weights` (unnormalized importance weights).
 *
 * @param states  Particle state values (length M)
 * @param weights Unnormalized importance weights (length M)
 * @param n       Number of output samples
 * @param rng     Source of uniform random values in [0, 1)
 * @returns Array of `n` resampled state values
 * @complexity O(n·M)
 */
function resampleMultinomial(
  states: ReadonlyArray<number>,
  weights: ReadonlyArray<number>,
  n: number,
  rng: () => number,
): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    let j = 0;
    while (j < states.length - 1) {
      r -= weights[j]!;
      if (r <= 0) break;
      j++;
    }
    result.push(states[j]!);
  }
  return result;
}

// ─── Matrix Helpers (exported) ────────────────────────────────────────────────

/**
 * Normalize a vector so its elements sum to 1.
 * Returns a uniform distribution when the sum is zero.
 *
 * @param v Input vector
 * @returns Normalized vector
 * @complexity O(n)
 */
export function normalize(v: ReadonlyArray<number>): number[] {
  const sum = v.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const n = v.length;
    return Array(n).fill(n > 0 ? 1 / n : 0) as number[];
  }
  return v.map(x => x / sum);
}

/**
 * Matrix multiplication C = A (m×k) · B (k×n).
 *
 * @param A Left matrix
 * @param B Right matrix
 * @returns Product matrix (m×n)
 * @complexity O(m·k·n)
 */
export function matMul(
  A: ReadonlyArray<ReadonlyArray<number>>,
  B: ReadonlyArray<ReadonlyArray<number>>,
): number[][] {
  const m = A.length;
  const k = B.length;
  const n = k > 0 ? B[0]!.length : 0;
  const C: number[][] = Array.from({ length: m }, () => Array(n).fill(0) as number[]);
  for (let i = 0; i < m; i++) {
    const rowC = C[i]!;
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) {
        sum += A[i]![p]! * B[p]![j]!;
      }
      rowC[j] = sum;
    }
  }
  return C;
}

/**
 * Transpose a matrix.
 *
 * @param A Input matrix (m×n)
 * @returns Transposed matrix (n×m)
 * @complexity O(m·n)
 */
export function matTranspose(A: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const m = A.length;
  const n = m > 0 ? A[0]!.length : 0;
  const T: number[][] = Array.from({ length: n }, () => Array(m).fill(0) as number[]);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      T[j]![i] = A[i]![j]!;
    }
  }
  return T;
}

/**
 * Inverse of a 2×2 matrix via the closed-form formula.
 *
 * @param A A 2×2 matrix
 * @returns Inverse of A
 * @throws If A is singular (det ≈ 0)
 * @complexity O(1)
 */
export function matInverse2x2(A: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const a = A[0]![0]!;
  const b = A[0]![1]!;
  const c = A[1]![0]!;
  const d = A[1]![1]!;
  const det = a * d - b * c;
  if (det === 0) throw new Error('Matrix is singular');
  return [
    [d / det, -b / det],
    [-c / det, a / det],
  ];
}

/**
 * Inverse of an N×N matrix via Gauss–Jordan elimination with partial pivoting.
 *
 * @param A Square matrix (n×n)
 * @returns Inverse of A
 * @throws If A is singular
 * @complexity O(n³)
 */
export function matInverse(A: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const n = A.length;
  // Augmented matrix [A | I], each row has length 2n
  const aug: number[][] = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    // Partial-pivot: find row with largest absolute value in this column
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row]![col]!) > Math.abs(aug[maxRow]![col]!)) {
        maxRow = row;
      }
    }
    const swapTmp = aug[col]!;
    aug[col] = aug[maxRow]!;
    aug[maxRow] = swapTmp;

    const pivot = aug[col]![col]!;
    if (Math.abs(pivot) < 1e-12) throw new Error('Matrix is singular');

    // Scale pivot row so the diagonal becomes 1
    const pivotRow = aug[col]!;
    for (let j = 0; j < 2 * n; j++) {
      pivotRow[j] = pivotRow[j]! / pivot;
    }

    // Eliminate all other entries in this column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row]![col]!;
      const curRow = aug[row]!;
      for (let j = 0; j < 2 * n; j++) {
        curRow[j] = curRow[j]! - factor * pivotRow[j]!;
      }
    }
  }

  return aug.map(row => row.slice(n));
}

/**
 * Element-wise matrix addition A + B.
 *
 * @complexity O(m·n)
 */
export function matAdd(
  A: ReadonlyArray<ReadonlyArray<number>>,
  B: ReadonlyArray<ReadonlyArray<number>>,
): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i]![j]!));
}

/**
 * Element-wise matrix subtraction A − B.
 *
 * @complexity O(m·n)
 */
export function matSub(
  A: ReadonlyArray<ReadonlyArray<number>>,
  B: ReadonlyArray<ReadonlyArray<number>>,
): number[][] {
  return A.map((row, i) => row.map((v, j) => v - B[i]![j]!));
}

/**
 * Scalar multiplication s·A.
 *
 * @complexity O(m·n)
 */
export function matScale(A: ReadonlyArray<ReadonlyArray<number>>, s: number): number[][] {
  return A.map(row => row.map(v => v * s));
}

/**
 * Matrix–vector product A·v where A is (m×n) and v has length n.
 *
 * @returns Result vector of length m
 * @complexity O(m·n)
 */
export function matVecMul(
  A: ReadonlyArray<ReadonlyArray<number>>,
  v: ReadonlyArray<number>,
): number[] {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j]!, 0));
}

/**
 * Outer product of two vectors: result[i][j] = v1[i] · v2[j].
 *
 * @complexity O(m·n)
 */
export function outerProduct(
  v1: ReadonlyArray<number>,
  v2: ReadonlyArray<number>,
): number[][] {
  return v1.map(a => v2.map(b => a * b));
}

/**
 * Identity matrix of size n×n.
 *
 * @complexity O(n²)
 */
export function identityMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

// ─── HMM Algorithms ───────────────────────────────────────────────────────────

/**
 * HMM forward filtering (§14.2.1).
 *
 * Computes P(X_t | e_{1:t}) for each t via:
 *   f_{1:t} = α · O_t · Tᵀ · f_{1:t-1}
 *
 * @param params  HMM parameters
 * @param evidence Sequence of observation indices (0-based)
 * @returns One {@link FilterStep} per time step
 * @complexity O(T·S²)
 */
export function hmmForward(
  params: HMMParams,
  evidence: ReadonlyArray<number>,
): ReadonlyArray<FilterStep> {
  const S = params.numStates;
  const steps: FilterStep[] = [];
  let curr: number[] = [...params.prior];

  for (let t = 0; t < evidence.length; t++) {
    const e = evidence[t]!;
    const obsRow = params.observationProbs[e]!;

    // Prediction: pred[j] = Σ_i T[i][j] · curr[i]
    const pred: number[] = Array(S).fill(0) as number[];
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        pred[j] = pred[j]! + params.transitionMatrix[i]![j]! * curr[i]!;
      }
    }

    // Update: multiply by observation likelihood and normalize
    const updated = pred.map((p, j) => p * obsRow[j]!);
    const belief = normalize(updated);

    steps.push({ t: t + 1, belief, evidence: e, predBelief: [...pred] });
    curr = belief;
  }
  return steps;
}

/**
 * HMM backward pass (§14.2.2).
 *
 * Returns T+1 messages where result[k] = b_{k+1:T}:
 *   result[T] = [1,…,1]  (trivial base case)
 *   result[k] computed via: b[i] = Σ_j T[i][j] · P(e_{k+1}|j) · b_{k+2:T}[j]
 *
 * @param params  HMM parameters
 * @param evidence Sequence of observation indices (length T)
 * @returns Array of T+1 backward messages
 * @complexity O(T·S²)
 */
export function hmmBackward(
  params: HMMParams,
  evidence: ReadonlyArray<number>,
): ReadonlyArray<ReadonlyArray<number>> {
  const S = params.numStates;
  const T = evidence.length;
  const result: number[][] = Array(T + 1);

  // Base case b_{T+1:T} = [1,…,1]
  result[T] = Array(S).fill(1) as number[];

  for (let k = T - 1; k >= 0; k--) {
    const bNext = result[k + 1]!;
    const e = evidence[k]!;
    const obsRow = params.observationProbs[e]!;
    const b: number[] = Array(S).fill(0) as number[];
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < S; j++) {
        b[i] = b[i]! + params.transitionMatrix[i]![j]! * obsRow[j]! * bNext[j]!;
      }
    }
    result[k] = b;
  }
  return result;
}

/**
 * Forward-backward smoothing algorithm (§14.2.2).
 *
 * Computes P(X_k | e_{1:T}) = α · f_{1:k} × b_{k+1:T} for each k.
 *
 * @param params  HMM parameters
 * @param evidence Sequence of observation indices (length T)
 * @returns One {@link SmoothStep} per time step (1-indexed)
 * @complexity O(T·S²)
 */
export function forwardBackward(
  params: HMMParams,
  evidence: ReadonlyArray<number>,
): ReadonlyArray<SmoothStep> {
  const S = params.numStates;
  const T = evidence.length;

  // Forward pass: fwd[0] = prior, fwd[t] = P(X_t | e_{1:t})
  const fwd: number[][] = Array(T + 1);
  fwd[0] = [...params.prior];
  for (let t = 0; t < T; t++) {
    const prev = fwd[t]!;
    const e = evidence[t]!;
    const obsRow = params.observationProbs[e]!;
    const pred: number[] = Array(S).fill(0) as number[];
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        pred[j] = pred[j]! + params.transitionMatrix[i]![j]! * prev[i]!;
      }
    }
    fwd[t + 1] = normalize(pred.map((p, j) => p * obsRow[j]!));
  }

  // Backward pass
  const bwd = hmmBackward(params, evidence);

  // Smoothed estimates
  const result: SmoothStep[] = [];
  for (let t = 1; t <= T; t++) {
    const forward = fwd[t]!;
    const backward = bwd[t]!; // b_{t+1:T}
    const product = forward.map((f, j) => f * backward[j]!);
    const smoothed = normalize(product);
    result.push({ t, forward, backward, smoothed });
  }
  return result;
}

/**
 * Viterbi algorithm — finds the most likely state sequence (§14.2.3).
 *
 * m_{1:t+1}[j] = P(e_{t+1}|j) · max_i P(j|i) · m_{1:t}[i]
 * with traceback via stored backpointers.
 *
 * @param params  HMM parameters
 * @param evidence Sequence of observation indices (length T)
 * @returns {@link ViterbiResult} containing steps, most likely path, and path probability
 * @complexity O(T·S²)
 */
export function viterbi(
  params: HMMParams,
  evidence: ReadonlyArray<number>,
): ViterbiResult {
  const S = params.numStates;
  const T = evidence.length;

  if (T === 0) {
    return { steps: [], mostLikelyPath: [], pathProb: 1 };
  }

  const steps: ViterbiStep[] = [];

  // Initialise at t = 1
  const e0 = evidence[0]!;
  const obs0 = params.observationProbs[e0]!;
  const m0: number[] = params.prior.map((p, j) => p * obs0[j]!);
  steps.push({ t: 1, m: [...m0], backpointer: Array(S).fill(-1) as number[] });
  let prev = m0;

  // Recursion for t = 2 … T
  for (let t = 1; t < T; t++) {
    const e = evidence[t]!;
    const obsRow = params.observationProbs[e]!;
    const m: number[] = Array(S).fill(0) as number[];
    const bp: number[] = Array(S).fill(0) as number[];

    for (let j = 0; j < S; j++) {
      let maxVal = -Infinity;
      let maxState = 0;
      for (let i = 0; i < S; i++) {
        const val = params.transitionMatrix[i]![j]! * prev[i]!;
        if (val > maxVal) {
          maxVal = val;
          maxState = i;
        }
      }
      m[j] = obsRow[j]! * maxVal;
      bp[j] = maxState;
    }
    steps.push({ t: t + 1, m: [...m], backpointer: [...bp] });
    prev = m;
  }

  // Traceback
  const path: number[] = Array(T).fill(0) as number[];
  const lastM = steps[T - 1]!.m;
  let maxProb = -Infinity;
  let maxState = 0;
  for (let i = 0; i < S; i++) {
    if (lastM[i]! > maxProb) {
      maxProb = lastM[i]!;
      maxState = i;
    }
  }
  path[T - 1] = maxState;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = steps[t + 1]!.backpointer[path[t + 1]!]!;
  }

  return { steps, mostLikelyPath: path, pathProb: maxProb };
}

// ─── Kalman Filter ────────────────────────────────────────────────────────────

/**
 * 1-D Kalman filter with scalar-identity transition (§14.4.2).
 *
 * Prediction: predMean = μ_{t-1},  predVar = σ²_{t-1} + σ²_x
 * Update:     K = predVar / (predVar + σ²_z)
 *             μ_t = predMean + K·(z_t − predMean)
 *             σ²_t = (1 − K)·predVar
 *
 * @param params  1-D Kalman parameters
 * @returns One {@link KalmanStep1D} per observation
 * @complexity O(T)
 */
export function kalmanFilter1D(params: KalmanParams1D): ReadonlyArray<KalmanStep1D> {
  let mu = params.mu0;
  let sigmaSq = params.sigma0Sq;
  const steps: KalmanStep1D[] = [];

  for (let t = 0; t < params.observations.length; t++) {
    const z = params.observations[t]!;
    const priorMean = mu;
    const priorVar = sigmaSq;

    // Prediction (identity transition: F = 1)
    const predMean = mu;
    const predVar = sigmaSq + params.sigmaXSq;

    // Update
    const K = predVar / (predVar + params.sigmaZSq);
    const posteriorMean = predMean + K * (z - predMean);
    const posteriorVar = (1 - K) * predVar;

    steps.push({
      t: t + 1,
      priorMean,
      priorVar,
      predMean,
      predVar,
      observation: z,
      posteriorMean,
      posteriorVar,
      kalmanGain: K,
    });

    mu = posteriorMean;
    sigmaSq = posteriorVar;
  }
  return steps;
}

/**
 * Multivariate Kalman filter (§14.4.3).
 *
 * Prediction:
 *   μ_{t|t-1} = F·μ_{t-1}
 *   Σ_{t|t-1} = F·Σ_{t-1}·Fᵀ + Σ_x
 *
 * Update:
 *   K = Σ_{t|t-1}·Hᵀ·(H·Σ_{t|t-1}·Hᵀ + Σ_z)⁻¹
 *   μ_t = μ_{t|t-1} + K·(z − H·μ_{t|t-1})
 *   Σ_t = (I − K·H)·Σ_{t|t-1}
 *
 * @param params  Multivariate Kalman parameters
 * @returns One {@link KalmanStep2D} per observation
 * @complexity O(T·n³)
 */
export function kalmanFilter2D(params: KalmanParams2D): ReadonlyArray<KalmanStep2D> {
  let mu: number[] = [...params.mu0];
  let sigma: number[][] = params.sigma0.map(r => [...r]);
  const n = mu.length;
  const I = identityMatrix(n);
  const steps: KalmanStep2D[] = [];

  for (let t = 0; t < params.observations.length; t++) {
    const z = params.observations[t]!;

    // Prediction
    const predMu = matVecMul(params.F, mu);
    const predSigma = matAdd(
      matMul(matMul(params.F, sigma), matTranspose(params.F)),
      params.sigmaX,
    );

    // Innovation covariance S = H·Σ_{t|t-1}·Hᵀ + Σ_z
    const HT = matTranspose(params.H);
    const S = matAdd(matMul(matMul(params.H, predSigma), HT), params.sigmaZ);

    // Kalman gain K = Σ_{t|t-1}·Hᵀ·S⁻¹
    const K = matMul(matMul(predSigma, HT), matInverse(S));

    // Innovation y = z − H·μ_{t|t-1}
    const Hmu = matVecMul(params.H, predMu);
    const innovation = z.map((zi, i) => zi - Hmu[i]!);

    // Updated mean and covariance
    const Kinno = matVecMul(K, innovation);
    const newMu = predMu.map((m, i) => m + Kinno[i]!);
    const newSigma = matMul(matSub(I, matMul(K, params.H)), predSigma);

    steps.push({
      t: t + 1,
      predMu,
      predSigma,
      observation: [...z],
      mu: newMu,
      sigma: newSigma,
      kalmanGain: K,
    });

    mu = newMu;
    sigma = newSigma;
  }
  return steps;
}

// ─── Particle Filter ──────────────────────────────────────────────────────────

/**
 * Particle filter for a discrete HMM (§14.5.3).
 *
 * Per time step:
 *   1. Propagate: x'_i ~ P(X_t | X_{t-1} = s_i)  (transition sample)
 *   2. Weight:    w_i = P(e_t | X_t = x'_i)
 *   3. Resample:  draw N samples ∝ {w_i} (multinomial)
 *
 * Uses a seeded PRNG so results are reproducible.
 *
 * @param params       HMM parameters
 * @param evidence     Sequence of observation indices (length T)
 * @param numParticles Number of particles N
 * @param seed         RNG seed (default 42)
 * @returns One {@link ParticleFilterStep} per time step
 * @complexity O(T·N·S)
 */
export function particleFilter(
  params: HMMParams,
  evidence: ReadonlyArray<number>,
  numParticles: number,
  seed = 42,
): ReadonlyArray<ParticleFilterStep> {
  const rng = mulberry32(seed);
  const S = params.numStates;

  // Initialise particles by sampling from the prior
  let currentParticles = Array.from({ length: numParticles }, () =>
    sampleCategorical(params.prior, rng),
  );

  const steps: ParticleFilterStep[] = [];

  for (let t = 0; t < evidence.length; t++) {
    const e = evidence[t]!;
    const obsRow = params.observationProbs[e]!;

    // 1. Propagate via transition model
    const propagated = currentParticles.map(s =>
      sampleCategorical(params.transitionMatrix[s]!, rng),
    );

    // 2. Weight by observation likelihood
    const weights = propagated.map(s => obsRow[s]!);

    // 3. Resample
    const resampled = resampleMultinomial(propagated, weights, numParticles, rng);

    // Belief estimate: normalised histogram of resampled particles
    const beliefEstimate: number[] = Array(S).fill(0) as number[];
    for (const s of resampled) {
      beliefEstimate[s] = beliefEstimate[s]! + 1 / numParticles;
    }

    steps.push({
      t: t + 1,
      particles: [...propagated],
      weights: [...weights],
      resampled: [...resampled],
      beliefEstimate,
      evidence: e,
    });

    currentParticles = resampled;
  }
  return steps;
}
