/**
 * Chapter 12 — Quantifying Uncertainty
 * Pure algorithm implementations. No React, no side effects.
 *
 * @module algorithms
 */

// ─── §12.2 Basic Probability ────────────────────────────────────────────────

/**
 * Validates a probability distribution: all values in [0,1] and sum ≈ 1.
 *
 * @param entries - Array of [label, probability] pairs.
 * @returns Validation result with sum and a list of violation messages.
 * @complexity O(n)
 */
export function validateDistribution(
  entries: ReadonlyArray<readonly [string, number]>,
): { valid: boolean; sum: number; violations: string[] } {
  const violations: string[] = [];
  let sum = 0;
  for (const [label, p] of entries) {
    sum += p;
    if (p < 0) violations.push(`P(${label}) = ${p} is negative`);
    else if (p > 1) violations.push(`P(${label}) = ${p} exceeds 1`);
  }
  const roundedSum = Math.round(sum * 1e9) / 1e9;
  if (Math.abs(roundedSum - 1) > 1e-9) {
    violations.push(`Probabilities sum to ${roundedSum}, not 1`);
  }
  return { valid: violations.length === 0, sum: roundedSum, violations };
}

/**
 * Inclusion-exclusion principle: P(a∨b) = P(a) + P(b) − P(a∧b).
 *
 * @param pa - P(a)
 * @param pb - P(b)
 * @param pab - P(a∧b)
 * @returns P(a∨b)
 * @complexity O(1)
 */
export function inclusionExclusion(pa: number, pb: number, pab: number): number {
  return pa + pb - pab;
}

/**
 * Complement rule: P(¬a) = 1 − P(a).
 *
 * @param pa - P(a)
 * @returns P(¬a)
 * @complexity O(1)
 */
export function complementRule(pa: number): number {
  return 1 - pa;
}

/**
 * Product rule: P(a∧b) = P(a|b) · P(b).
 *
 * @param pAgivenB - P(a|b)
 * @param pb - P(b)
 * @returns P(a∧b)
 * @complexity O(1)
 */
export function productRule(pAgivenB: number, pb: number): number {
  return pAgivenB * pb;
}

/**
 * Conditional probability from joint: P(a|b) = P(a∧b) / P(b).
 * Returns 0 if P(b) = 0 (undefined denominator).
 *
 * @param pAandB - P(a∧b)
 * @param pB - P(b)
 * @returns P(a|b), or 0 if P(b) = 0
 * @complexity O(1)
 */
export function conditionalFromJoint(pAandB: number, pB: number): number {
  if (pB === 0) return 0;
  return pAandB / pB;
}

// ─── §12.3 Full Joint Distributions ─────────────────────────────────────────

/**
 * Marginalizes (sums out) specified variable values from a joint distribution.
 * Keys are comma-separated value strings, e.g. "cavity,toothache,catch".
 * Each hiddenVarValue is an exact comma-separated component to remove.
 *
 * @param joint - Map from compound key to probability.
 * @param hiddenVarValues - All values the hidden variable can take (e.g. ["catch","¬catch"]).
 * @returns Marginalized distribution with the hidden variable removed.
 * @complexity O(n · k) where n = joint size, k = hiddenVarValues length
 */
export function marginalize(
  joint: ReadonlyMap<string, number>,
  hiddenVarValues: ReadonlyArray<string>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [key, prob] of joint) {
    const parts = key.split(',');
    const matchIdx = parts.findIndex(p => hiddenVarValues.includes(p));
    if (matchIdx === -1) continue;
    const remaining = parts.filter((_, i) => i !== matchIdx).join(',');
    result.set(remaining, (result.get(remaining) ?? 0) + prob);
  }
  return result;
}

/**
 * Infers P(queryValue | evidenceValues) from the full joint distribution.
 * Uses normalization: numerator = Σ P(key) where key contains queryValue and all evidence;
 * denominator = Σ P(key) where key contains all evidence.
 *
 * @param joint - Full joint distribution.
 * @param queryValue - The value to query (e.g. "cavity").
 * @param evidenceValues - Observed values (e.g. ["toothache"]).
 * @returns Conditional probability, or 0 if denominator is 0.
 * @complexity O(n)
 */
export function inferFromJoint(
  joint: ReadonlyMap<string, number>,
  queryValue: string,
  evidenceValues: ReadonlyArray<string>,
): number {
  let numerator = 0;
  let denominator = 0;
  for (const [key, prob] of joint) {
    const parts = key.split(',');
    const matchesEvidence = evidenceValues.every(ev => parts.includes(ev));
    if (!matchesEvidence) continue;
    denominator += prob;
    if (parts.includes(queryValue)) numerator += prob;
  }
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Normalizes an array of non-negative numbers to sum to 1.
 * Returns a zeros array if the sum is 0.
 *
 * @param values - Non-negative numbers.
 * @returns Normalized array summing to 1 (or all zeros).
 * @complexity O(n)
 */
export function normalizeDistribution(values: ReadonlyArray<number>): number[] {
  if (values.length === 0) return [];
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => 0);
  return values.map(v => v / total);
}

// ─── §12.4 Independence ──────────────────────────────────────────────────────

/**
 * Checks probabilistic independence: P(a∧b) ≈ P(a)·P(b) within tolerance.
 *
 * @param pA - P(a)
 * @param pB - P(b)
 * @param pAandB - P(a∧b)
 * @param tol - Absolute tolerance (default 1e-9).
 * @returns true iff |P(a∧b) − P(a)·P(b)| ≤ tol
 * @complexity O(1)
 */
export function checkIndependence(
  pA: number,
  pB: number,
  pAandB: number,
  tol = 1e-9,
): boolean {
  return Math.abs(pAandB - pA * pB) <= tol;
}

// ─── §12.5 Bayes' Rule ───────────────────────────────────────────────────────

/**
 * Bayes' rule: P(cause|effect) = P(effect|cause)·P(cause) / P(effect).
 * Returns 0 if P(effect) = 0.
 *
 * @param pEffectGivenCause - P(effect|cause)
 * @param pCause - P(cause)
 * @param pEffect - P(effect)
 * @returns P(cause|effect), or 0 if P(effect) = 0
 * @complexity O(1)
 */
export function bayesRule(
  pEffectGivenCause: number,
  pCause: number,
  pEffect: number,
): number {
  if (pEffect === 0) return 0;
  return (pEffectGivenCause * pCause) / pEffect;
}

/**
 * Bayes' rule with normalization across multiple hypotheses.
 * posteriors[i] ∝ likelihoods[i] · priors[i].
 * Returns uniform if all products are zero; returns [] for mismatched/empty arrays.
 *
 * @param likelihoods - P(evidence|hypothesis_i) for each hypothesis.
 * @param priors - P(hypothesis_i) for each hypothesis.
 * @returns Normalized posterior probabilities.
 * @complexity O(n)
 */
export function bayesNormalized(
  likelihoods: ReadonlyArray<number>,
  priors: ReadonlyArray<number>,
): number[] {
  if (likelihoods.length === 0 || likelihoods.length !== priors.length) return [];
  const raw = likelihoods.map((l, i) => l * priors[i]!);
  const total = raw.reduce((s, v) => s + v, 0);
  if (total === 0) return raw.map(() => 1 / raw.length);
  return raw.map(v => v / total);
}

// ─── §12.6 Naive Bayes ───────────────────────────────────────────────────────

/**
 * Naive Bayes classifier.
 * score(c) = P(c) · Π_f [ observed(f) ? P(f|c) : (1−P(f|c)) ]
 * Returns normalized posteriors. Features missing from likelihoods are ignored (factor=1).
 *
 * @param priors - Map from class name to P(class).
 * @param likelihoods - Map from class → feature → P(feature|class).
 * @param observations - Map from feature → whether it was observed.
 * @returns Normalized posterior probabilities per class.
 * @complexity O(|classes| · |features|)
 */
export function naiveBayesClassify(
  priors: ReadonlyMap<string, number>,
  likelihoods: ReadonlyMap<string, ReadonlyMap<string, number>>,
  observations: ReadonlyMap<string, boolean>,
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const [cls, prior] of priors) {
    let score = prior;
    const clsLikelihoods = likelihoods.get(cls);
    for (const [feature, observed] of observations) {
      const pFeatureGivenCls = clsLikelihoods?.get(feature) ?? 1.0;
      score *= observed ? pFeatureGivenCls : 1 - pFeatureGivenCls;
    }
    scores.set(cls, score);
  }
  const total = Array.from(scores.values()).reduce((s, v) => s + v, 0);
  const result = new Map<string, number>();
  for (const [cls, score] of scores) {
    result.set(cls, total === 0 ? 0 : score / total);
  }
  return result;
}

// ─── §12.7 Wumpus World Pit Probability ──────────────────────────────────────

/**
 * Computes posterior pit probabilities for query squares in the Wumpus world.
 * Uses frontier enumeration: enumerates all pit configurations on frontier squares,
 * weights each by its prior and the consistency with breeze observations,
 * then computes P(pit at q) for each query square.
 *
 * Non-frontier unknown squares keep pitPrior (independent of observations).
 * Known-safe squares get probability 0.
 *
 * @param gridSize - Side length of the grid (4 for a 4×4 world).
 * @param pitPrior - Prior probability of a pit in any non-start square.
 * @param querySquares - Squares for which to compute pit probability.
 * @param knownSafeSquares - Squares confirmed to have no pit.
 * @param breezySquares - Explored squares where a breeze was sensed.
 * @returns Map from "x,y" string to pit probability.
 * @complexity O(2^|frontier| · |explored|)
 */
export function wumpusPitProbability(
  gridSize: number,
  pitPrior: number,
  querySquares: ReadonlyArray<readonly [number, number]>,
  knownSafeSquares: ReadonlyArray<readonly [number, number]>,
  breezySquares: ReadonlyArray<readonly [number, number]>,
): Map<string, number> {
  const result = new Map<string, number>();
  if (querySquares.length === 0) return result;

  const parseKey = (key: string): [number, number] => {
    const comma = key.indexOf(',');
    return [parseInt(key.slice(0, comma), 10), parseInt(key.slice(comma + 1), 10)];
  };

  const safeSet = new Set(knownSafeSquares.map(([x, y]) => `${x},${y}`));
  const breezySet = new Set(breezySquares.map(([x, y]) => `${x},${y}`));

  const getAdj = (x: number, y: number): Array<[number, number]> => {
    const adj: Array<[number, number]> = [];
    if (x > 1) adj.push([x - 1, y]);
    if (x < gridSize) adj.push([x + 1, y]);
    if (y > 1) adj.push([x, y - 1]);
    if (y < gridSize) adj.push([x, y + 1]);
    return adj;
  };

  // All explored squares = safe squares + breezy squares
  const exploredSet = new Set([...safeSet, ...breezySet]);

  // Frontier: unknown squares adjacent to any explored square
  const frontierSet = new Set<string>();
  for (const key of exploredSet) {
    const [x, y] = parseKey(key);
    for (const [ax, ay] of getAdj(x, y)) {
      const aKey = `${ax},${ay}`;
      if (!exploredSet.has(aKey)) frontierSet.add(aKey);
    }
  }

  const frontier = Array.from(frontierSet).map(k => parseKey(k));

  // Check consistency of a pit configuration (subset of frontier has pits)
  const isConsistent = (pitSubset: Set<string>): boolean => {
    // Each breezy explored square must have at least one adjacent pit in frontier
    for (const bKey of breezySet) {
      const [bx, by] = parseKey(bKey);
      const adjFrontier = getAdj(bx, by).filter(([ax, ay]) => frontierSet.has(`${ax},${ay}`));
      const hasPit = adjFrontier.some(([ax, ay]) => pitSubset.has(`${ax},${ay}`));
      if (!hasPit) return false;
    }
    // Each NON-breezy explored square must have no adjacent pit in frontier
    // (a breezy square is explored but has adjacent pits, so only check non-breezy)
    for (const sKey of exploredSet) {
      if (breezySet.has(sKey)) continue;
      const [sx, sy] = parseKey(sKey);
      for (const [ax, ay] of getAdj(sx, sy)) {
        if (pitSubset.has(`${ax},${ay}`)) return false;
      }
    }
    return true;
  };

  // Enumerate all 2^|frontier| subsets
  const n = frontier.length;
  let totalWeight = 0;
  const pitWeights = new Map<string, number>();

  for (let mask = 0; mask < (1 << n); mask++) {
    const pitSubset = new Set<string>();
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const cell = frontier[i]!;
        const [x, y] = cell;
        pitSubset.add(`${x},${y}`);
      }
    }
    if (!isConsistent(pitSubset)) continue;
    // Weight = pitPrior^numPits * (1-pitPrior)^numNoPit
    const numPits = pitSubset.size;
    const numNoPit = n - numPits;
    const weight = Math.pow(pitPrior, numPits) * Math.pow(1 - pitPrior, numNoPit);
    totalWeight += weight;
    for (const key of pitSubset) {
      pitWeights.set(key, (pitWeights.get(key) ?? 0) + weight);
    }
  }

  for (const [qx, qy] of querySquares) {
    const qKey = `${qx},${qy}`;
    if (safeSet.has(qKey)) {
      result.set(qKey, 0);
    } else if (frontierSet.has(qKey)) {
      result.set(
        qKey,
        totalWeight === 0 ? pitPrior : (pitWeights.get(qKey) ?? 0) / totalWeight,
      );
    } else {
      result.set(qKey, pitPrior);
    }
  }

  return result;
}
