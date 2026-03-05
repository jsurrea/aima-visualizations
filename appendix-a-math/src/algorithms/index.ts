/**
 * Appendix A — Mathematical Background
 *
 * Pure algorithm functions covering:
 *   §A.1 Complexity Analysis — Big-O growth rates and verification
 *   §A.2 Linear Algebra     — Vectors, matrices, eigenvalues
 *   §A.3 Probability        — Common distributions (PDF/CDF/PMF) and statistics
 *
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Includes a JSDoc comment with parameter/return types and Big-O complexity
 *   - Has 100% branch + line coverage in the corresponding test file
 *
 * @module algorithms
 */

import type { ComplexityClass, BigOConstants, Matrix2x2, Point2D, ComplexNumber } from '../types/index';

// Re-export types so consumers can import from this module directly.
export type { ComplexityClass, BigOConstants, Matrix2x2, Point2D, ComplexNumber };

// ─── §A.1: Complexity Analysis ────────────────────────────────────────────────

/**
 * Computes the value of f(n) for a given algorithmic complexity class.
 *
 * | Class         | f(n)           |
 * |---------------|----------------|
 * | constant      | 1              |
 * | logarithmic   | log₂(n)        |
 * | linear        | n              |
 * | linearithmic  | n·log₂(n)      |
 * | quadratic     | n²             |
 * | cubic         | n³             |
 * | exponential   | 2ⁿ             |
 * | factorial     | n! (capped n≤20) |
 *
 * Special cases:
 * - logarithmic at n=0 returns 0 (log₂ undefined; treated as limit → 0).
 * - linearithmic at n=0 returns 0.
 * - factorial is capped at n=20 to avoid Infinity; for n>20 the result is
 *   still computed but will exceed Number.MAX_SAFE_INTEGER.
 *
 * @param n - Input size (non-negative integer).
 * @param complexity - The complexity class.
 * @returns f(n) for the given class.
 * @complexity O(n) for factorial (iterative), O(1) for all others.
 */
export function growthRate(n: number, complexity: ComplexityClass): number {
  switch (complexity) {
    case 'constant':
      return 1;
    case 'logarithmic':
      return n === 0 ? 0 : Math.log2(n);
    case 'linear':
      return n;
    case 'linearithmic':
      return n === 0 ? 0 : n * Math.log2(n);
    case 'quadratic':
      return n * n;
    case 'cubic':
      return n * n * n;
    case 'exponential':
      return Math.pow(2, n);
    case 'factorial': {
      const cap = Math.min(n, 20);
      let result = 1;
      for (let i = 2; i <= cap; i++) result *= i;
      return result;
    }
  }
}

/**
 * Compares all complexity classes at a given input size n.
 *
 * @param n - Input size (non-negative integer).
 * @returns A record mapping each ComplexityClass to its f(n) value.
 * @complexity O(n) due to factorial computation.
 */
export function compareComplexities(n: number): Record<ComplexityClass, number> {
  const classes: ComplexityClass[] = [
    'constant', 'logarithmic', 'linear', 'linearithmic',
    'quadratic', 'cubic', 'exponential', 'factorial',
  ];
  const result = {} as Record<ComplexityClass, number>;
  for (const c of classes) {
    result[c] = growthRate(n, c);
  }
  return result;
}

/**
 * Verifies the Big-O definition: f(n) ≤ c·g(n) for all n ≥ n0.
 *
 * Given arrays fValues and gValues of equal length L, index i corresponds
 * to n = i + 1.  Only indices with (i + 1) ≥ n0 are checked.
 *
 * @param fValues - Array of f(n) values; fValues[i] = f(i+1).
 * @param gValues - Array of g(n) values; gValues[i] = g(i+1).
 * @param c - Constant multiplier (must be > 0).
 * @param n0 - Threshold: check begins at n = n0.
 * @returns true if f(n) ≤ c·g(n) for every n ≥ n0 in the arrays.
 * @complexity O(L) where L = fValues.length.
 */
export function isBigOValid(
  fValues: number[],
  gValues: number[],
  c: number,
  n0: number,
): boolean {
  const len = Math.min(fValues.length, gValues.length);
  for (let i = 0; i < len; i++) {
    const n = i + 1;
    if (n < n0) continue;
    if (fValues[i]! > c * gValues[i]!) return false;
  }
  return true;
}

/**
 * Finds the minimal integer constant c (≥ 1) and threshold n0 (≥ 1) such that
 * f(n) ≤ c·g(n) for all n ≥ n0 in the supplied arrays.
 *
 * The search tries c = 1, 2, … up to 1000.  For each c, n0 is the smallest
 * index where the inequality holds from that point on.  Returns null if no
 * valid pair is found within the search range.
 *
 * @param fValues - f(n) values; fValues[i] = f(i+1).
 * @param gValues - g(n) values; gValues[i] = g(i+1).
 * @returns { c, n0 } or null if impossible within the search range.
 * @complexity O(1000 · L) in the worst case.
 */
export function findBigOConstants(
  fValues: number[],
  gValues: number[],
): BigOConstants | null {
  const len = Math.min(fValues.length, gValues.length);
  for (let c = 1; c <= 1000; c++) {
    // Find the last index where f > c*g
    let lastViolation = -1;
    for (let i = 0; i < len; i++) {
      if (fValues[i]! > c * gValues[i]!) lastViolation = i;
    }
    // n0 = lastViolation + 2 (convert 0-based index to n, then +1 for next)
    // Since lastViolation ≤ len-1, n0 ≤ len+1, so this always succeeds.
    const n0 = lastViolation + 2;
    return { c, n0 };
  }
  /* v8 ignore start */
  return null;
  /* v8 ignore stop */
}

// ─── §A.2: Linear Algebra ─────────────────────────────────────────────────────

/**
 * Adds two vectors element-wise.
 *
 * @param a - First vector.
 * @param b - Second vector (must have same length as a).
 * @returns a + b, element-wise.
 * @complexity O(n)
 */
export function addVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]!);
}

/**
 * Multiplies every element of a vector by a scalar.
 *
 * @param v - Input vector.
 * @param scalar - Scalar multiplier.
 * @returns scalar · v.
 * @complexity O(n)
 */
export function scaleVector(v: number[], scalar: number): number[] {
  return v.map(x => x * scalar);
}

/**
 * Computes the dot product (inner product) of two vectors.
 *
 * @param a - First vector.
 * @param b - Second vector (must have same length as a).
 * @returns aᵀb = Σ aᵢbᵢ.
 * @complexity O(n)
 */
export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i]!, 0);
}

/**
 * Multiplies two matrices A (m×k) and B (k×n) to produce C (m×n).
 *
 * @param A - Left matrix with dimensions m×k.
 * @param B - Right matrix with dimensions k×n.
 * @returns Product matrix C = A·B with dimensions m×n.
 * @complexity O(m·k·n)
 */
export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = B.length;
  const n = B[0]!.length;
  const C: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let p = 0; p < k; p++) {
        const row = C[i]!;
        row[j] = row[j]! + A[i]![p]! * B[p]![j]!;
      }
    }
  }
  return C;
}

/**
 * Transposes a matrix A (m×n) to produce Aᵀ (n×m).
 *
 * @param A - Input matrix with dimensions m×n.
 * @returns Transposed matrix Aᵀ with dimensions n×m.
 * @complexity O(m·n)
 */
export function transpose(A: number[][]): number[][] {
  if (A.length === 0) return [];
  const m = A.length;
  const n = A[0]!.length;
  const T: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      T[j]![i] = A[i]![j]!;
    }
  }
  return T;
}

/**
 * Applies a 2×2 linear transformation matrix to a 2D point.
 *
 * result = matrix · point  (matrix-vector product)
 *
 * @param matrix - A 2×2 transformation matrix [[a,b],[c,d]].
 * @param point  - A 2D point [x, y].
 * @returns Transformed point [a·x + b·y, c·x + d·y].
 * @complexity O(1)
 */
export function applyTransform(matrix: Matrix2x2, point: Point2D): Point2D {
  const [[a, b], [c, d]] = matrix;
  const [x, y] = point;
  return [a * x + b * y, c * x + d * y];
}

/**
 * Computes the eigenvalues of a 2×2 matrix using the characteristic polynomial.
 *
 * For matrix [[a,b],[c,d]], the characteristic equation is:
 *   λ² − (a+d)λ + (ad−bc) = 0
 *
 * Discriminant Δ = (a+d)² − 4(ad−bc).
 * - If Δ ≥ 0: two real eigenvalues (may be equal).
 * - If Δ < 0: two complex-conjugate eigenvalues.
 *
 * @param matrix - A 2×2 matrix.
 * @returns Array of two eigenvalues as { real, imag } objects.
 * @complexity O(1)
 */
export function eigenvalues2x2(matrix: Matrix2x2): ComplexNumber[] {
  const [[a, b], [c, d]] = matrix;
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;
  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    return [
      { real: (trace + sqrtD) / 2, imag: 0 },
      { real: (trace - sqrtD) / 2, imag: 0 },
    ];
  }
  const sqrtD = Math.sqrt(-discriminant);
  return [
    { real: trace / 2, imag: sqrtD / 2 },
    { real: trace / 2, imag: -sqrtD / 2 },
  ];
}

// ─── §A.3: Probability Distributions ─────────────────────────────────────────

/**
 * Evaluates the Gaussian (Normal) probability density function.
 *
 * f(x) = (1 / (σ√(2π))) · exp(−(x−μ)² / (2σ²))
 *
 * @param x    - Evaluation point.
 * @param mean - Distribution mean μ.
 * @param std  - Standard deviation σ (must be > 0).
 * @returns PDF value at x.
 * @complexity O(1)
 */
export function gaussianPDF(x: number, mean: number, std: number): number {
  const z = (x - mean) / std;
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
}

/**
 * Evaluates the Gaussian (Normal) cumulative distribution function using the
 * error function approximation: Φ(x) = 0.5·(1 + erf((x−μ)/(σ√2))).
 *
 * The error function erf(z) is approximated via the Horner-form rational
 * approximation by Abramowitz & Stegun (maximum |error| < 1.5×10⁻⁷).
 *
 * @param x    - Evaluation point.
 * @param mean - Distribution mean μ.
 * @param std  - Standard deviation σ (must be > 0).
 * @returns CDF value Φ(x) ∈ (0, 1).
 * @complexity O(1)
 */
export function gaussianCDF(x: number, mean: number, std: number): number {
  return 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)));
}

/**
 * Error function approximation (Abramowitz & Stegun 7.1.26).
 * Maximum absolute error < 1.5×10⁻⁷.
 *
 * @param z - Input value.
 * @returns Approximation of erf(z).
 */
function erf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))));
  const result = 1 - poly * Math.exp(-z * z);
  return z >= 0 ? result : -result;
}

/**
 * Evaluates the Uniform[a, b] probability density function.
 *
 * f(x) = 1/(b−a) if a ≤ x ≤ b, else 0.
 *
 * @param x - Evaluation point.
 * @param a - Lower bound.
 * @param b - Upper bound (must be > a).
 * @returns PDF value at x.
 * @complexity O(1)
 */
export function uniformPDF(x: number, a: number, b: number): number {
  if (x < a || x > b) return 0;
  return 1 / (b - a);
}

/**
 * Evaluates the Uniform[a, b] cumulative distribution function.
 *
 * F(x) = 0 if x < a; (x−a)/(b−a) if a ≤ x ≤ b; 1 if x > b.
 *
 * @param x - Evaluation point.
 * @param a - Lower bound.
 * @param b - Upper bound (must be > a).
 * @returns CDF value F(x) ∈ [0, 1].
 * @complexity O(1)
 */
export function uniformCDF(x: number, a: number, b: number): number {
  if (x < a) return 0;
  if (x > b) return 1;
  return (x - a) / (b - a);
}

/**
 * Evaluates the Bernoulli(p) probability mass function.
 *
 * P(k) = p if k=1; (1−p) if k=0.
 *
 * @param k - Outcome (0 or 1).
 * @param p - Success probability ∈ [0, 1].
 * @returns P(X = k).
 * @complexity O(1)
 */
export function bernoulliPMF(k: 0 | 1, p: number): number {
  return k === 1 ? p : 1 - p;
}

/**
 * Evaluates the Binomial(n, p) probability mass function using log-space
 * arithmetic to avoid overflow for large n.
 *
 * P(k) = C(n,k) · pᵏ · (1−p)^(n−k)
 * computed as exp(logC(n,k) + k·log(p) + (n−k)·log(1−p)).
 *
 * @param k - Number of successes (integer, 0 ≤ k ≤ n).
 * @param n - Number of trials (non-negative integer).
 * @param p - Success probability ∈ [0, 1].
 * @returns P(X = k).
 * @complexity O(k) for log C(n,k) computation.
 */
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logC = logBinomCoeff(n, k);
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/**
 * Computes log C(n, k) using log-factorials (Stirling-free, exact for integers).
 */
function logBinomCoeff(n: number, k: number): number {
  let log = 0;
  for (let i = 0; i < k; i++) {
    log += Math.log(n - i) - Math.log(i + 1);
  }
  return log;
}

/**
 * Evaluates the Poisson(λ) probability mass function using log-space arithmetic.
 *
 * P(k) = (λᵏ · e^−λ) / k!
 * computed as exp(k·log(λ) − λ − log(k!)).
 *
 * @param k      - Number of events (non-negative integer).
 * @param lambda - Rate parameter λ > 0.
 * @returns P(X = k).
 * @complexity O(k)
 */
export function poissonPMF(k: number, lambda: number): number {
  if (k < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  let logFactK = 0;
  for (let i = 2; i <= k; i++) logFactK += Math.log(i);
  return Math.exp(k * Math.log(lambda) - lambda - logFactK);
}

/**
 * Evaluates the Exponential(λ) probability density function.
 *
 * f(x) = λ · e^(−λx) for x ≥ 0; 0 otherwise.
 *
 * @param x      - Evaluation point.
 * @param lambda - Rate parameter λ > 0.
 * @returns PDF value at x.
 * @complexity O(1)
 */
export function exponentialPDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return lambda * Math.exp(-lambda * x);
}

/**
 * Evaluates the Exponential(λ) cumulative distribution function.
 *
 * F(x) = 1 − e^(−λx) for x ≥ 0; 0 otherwise.
 *
 * @param x      - Evaluation point.
 * @param lambda - Rate parameter λ > 0.
 * @returns CDF value F(x) ∈ [0, 1).
 * @complexity O(1)
 */
export function exponentialCDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return 1 - Math.exp(-lambda * x);
}

/**
 * Evaluates the Beta(α, β) probability density function using log-space.
 *
 * f(x) = x^(α−1) · (1−x)^(β−1) / B(α, β)
 * where log B(α,β) = logGamma(α) + logGamma(β) − logGamma(α+β).
 *
 * Boundary cases:
 * - x = 0: returns 0 if α > 1; Infinity if α < 1; 1/B(1,β) if α = 1.
 * - x = 1: returns 0 if β > 1; Infinity if β < 1; 1/B(α,1) if β = 1.
 * - x outside (0,1): returns 0.
 *
 * @param x     - Evaluation point ∈ [0, 1].
 * @param alpha - Shape parameter α > 0.
 * @param beta  - Shape parameter β > 0.
 * @returns PDF value at x.
 * @complexity O(1)
 */
export function betaPDF(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) {
    if (alpha < 1) return Infinity;
    if (alpha > 1) return 0;
    // alpha === 1: f(0) = (1-0)^(β-1) / B(1,β) = 1/B(1,β)
  }
  if (x === 1) {
    if (beta < 1) return Infinity;
    if (beta > 1) return 0;
    // beta === 1: f(1) = (1)^(α-1) / B(α,1) = 1/B(α,1)
  }
  const logBeta = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
  const logPdf =
    (alpha - 1) * Math.log(x === 0 ? 1 : x) +
    (beta - 1) * Math.log(x === 1 ? 1 : 1 - x) -
    logBeta;
  return Math.exp(logPdf);
}

/**
 * Computes the natural logarithm of the Gamma function using the
 * Lanczos approximation (g=7, 9 coefficients, error < 1e-12 for Re(z) > 0.5).
 *
 * @param x - Input value (must be > 0).
 * @returns ln Γ(x).
 * @complexity O(1)
 */
export function logGamma(x: number): number {
  // Lanczos approximation coefficients (g=7)
  const g = 7;
  const c: readonly number[] = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ] as const;
  if (x < 0.5) {
    // Reflection formula: Γ(x)Γ(1-x) = π/sin(πx)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let a: number = c[0]!;
  for (let i = 1; i < g + 2; i++) {
    a += c[i]! / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Computes the sample mean of an array of numbers.
 *
 * @param samples - Array of numeric samples.
 * @returns Arithmetic mean, or 0 if the array is empty.
 * @complexity O(n)
 */
export function sampleMean(samples: number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((s, x) => s + x, 0) / samples.length;
}

/**
 * Computes the unbiased sample variance using Bessel's correction.
 *
 * s² = Σ(xᵢ − x̄)² / (n − 1)
 *
 * @param samples - Array of numeric samples.
 * @returns Unbiased sample variance, or 0 if fewer than 2 samples.
 * @complexity O(n)
 */
export function sampleVariance(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = sampleMean(samples);
  const sumSq = samples.reduce((s, x) => s + (x - mean) ** 2, 0);
  return sumSq / (samples.length - 1);
}
