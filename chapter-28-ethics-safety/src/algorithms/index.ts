/**
 * Chapter 28 — Philosophy, Ethics, and Safety of AI
 *
 * Pure algorithm functions covering:
 *   §28.3.3 Fairness & Bias — demographic parity, equal opportunity, calibration, equal impact
 *   §28.3.2 Privacy — k-anonymity checking, differential privacy (Laplace mechanism)
 *   §28.3.7 AI Safety — fault tree analysis (AND/OR probability), value alignment scoring
 *
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Includes a JSDoc comment with parameter/return types and Big-O complexity
 *   - Has 100% branch + line coverage in the corresponding test file
 *
 * @module algorithms
 */

// ─── §28.3.3: Fairness Metrics ────────────────────────────────────────────────

/** A single prediction outcome for one individual. */
export interface Prediction {
  /** Predicted label (true = positive classification). */
  predicted: boolean;
  /** Ground-truth label. */
  actual: boolean;
  /** Demographic group identifier. */
  group: string;
}

/** Confusion matrix counts for a single group. */
export interface ConfusionMatrix {
  tp: number; // true positives
  fp: number; // false positives
  tn: number; // true negatives
  fn: number; // false negatives
}

/** Fairness metrics derived from confusion matrix. */
export interface FairnessMetrics {
  /** Group identifier. */
  group: string;
  /** Confusion matrix for the group. */
  confusion: ConfusionMatrix;
  /** True positive rate (recall / sensitivity). TPR = TP / (TP + FN). */
  tpr: number;
  /** False positive rate. FPR = FP / (FP + TN). */
  fpr: number;
  /** Positive predictive value (precision). PPV = TP / (TP + FP). */
  ppv: number;
  /** Fraction of positively predicted cases. PR = (TP + FP) / total. */
  positiveRate: number;
}

/**
 * Computes per-group fairness metrics from a list of predictions.
 *
 * Metrics computed (Book §28.3.3):
 *   - TPR (equal opportunity criterion)
 *   - FPR (equal false-positive-rate criterion)
 *   - PPV (calibration / well-calibrated criterion)
 *   - positive rate (demographic parity criterion)
 *
 * @param predictions - Array of individual predictions with group labels.
 * @returns Array of per-group fairness metrics, one entry per unique group.
 * @complexity O(n) where n = predictions.length
 */
export function computeFairnessMetrics(predictions: ReadonlyArray<Prediction>): FairnessMetrics[] {
  const groups = new Map<string, ConfusionMatrix>();
  for (const p of predictions) {
    if (!groups.has(p.group)) {
      groups.set(p.group, { tp: 0, fp: 0, tn: 0, fn: 0 });
    }
    const cm = groups.get(p.group)!;
    if (p.predicted && p.actual) cm.tp++;
    else if (p.predicted && !p.actual) cm.fp++;
    else if (!p.predicted && !p.actual) cm.tn++;
    else cm.fn++;
  }
  const results: FairnessMetrics[] = [];
  for (const [group, cm] of groups) {
    const total = cm.tp + cm.fp + cm.tn + cm.fn;
    const tpr = cm.tp + cm.fn > 0 ? cm.tp / (cm.tp + cm.fn) : 0;
    const fpr = cm.fp + cm.tn > 0 ? cm.fp / (cm.fp + cm.tn) : 0;
    const ppv = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : 0;
    /* v8 ignore start */
    const positiveRate = total > 0 ? (cm.tp + cm.fp) / total : 0;
    /* v8 ignore stop */
    results.push({ group, confusion: cm, tpr, fpr, ppv, positiveRate });
  }
  return results;
}

/**
 * Checks whether two groups satisfy demographic parity (equal positive rates)
 * within a given tolerance.
 *
 * @param metrics - Array of fairness metrics (at least two groups).
 * @param groupA - Identifier of the first group.
 * @param groupB - Identifier of the second group.
 * @param tolerance - Acceptable absolute difference (default 0.05).
 * @returns true if |positiveRate_A − positiveRate_B| ≤ tolerance.
 * @complexity O(n) where n = metrics.length
 */
export function hasDemographicParity(
  metrics: ReadonlyArray<FairnessMetrics>,
  groupA: string,
  groupB: string,
  tolerance = 0.05,
): boolean {
  const a = metrics.find(m => m.group === groupA);
  const b = metrics.find(m => m.group === groupB);
  if (!a || !b) return false;
  return Math.abs(a.positiveRate - b.positiveRate) <= tolerance;
}

/**
 * Checks whether two groups satisfy equal opportunity (equal TPRs)
 * within a given tolerance.
 *
 * @param metrics - Array of fairness metrics.
 * @param groupA - Identifier of the first group.
 * @param groupB - Identifier of the second group.
 * @param tolerance - Acceptable absolute difference (default 0.05).
 * @returns true if |TPR_A − TPR_B| ≤ tolerance.
 * @complexity O(n)
 */
export function hasEqualOpportunity(
  metrics: ReadonlyArray<FairnessMetrics>,
  groupA: string,
  groupB: string,
  tolerance = 0.05,
): boolean {
  const a = metrics.find(m => m.group === groupA);
  const b = metrics.find(m => m.group === groupB);
  if (!a || !b) return false;
  return Math.abs(a.tpr - b.tpr) <= tolerance;
}

/**
 * Checks whether two groups satisfy calibration (equal PPVs) within tolerance.
 * A well-calibrated model assigns the same probability of positive outcome to
 * individuals with the same score, regardless of group (COMPAS criterion).
 *
 * @param metrics - Array of fairness metrics.
 * @param groupA - First group identifier.
 * @param groupB - Second group identifier.
 * @param tolerance - Acceptable absolute difference (default 0.05).
 * @returns true if |PPV_A − PPV_B| ≤ tolerance.
 * @complexity O(n)
 */
export function isWellCalibrated(
  metrics: ReadonlyArray<FairnessMetrics>,
  groupA: string,
  groupB: string,
  tolerance = 0.05,
): boolean {
  const a = metrics.find(m => m.group === groupA);
  const b = metrics.find(m => m.group === groupB);
  if (!a || !b) return false;
  return Math.abs(a.ppv - b.ppv) <= tolerance;
}

// ─── §28.3.2: k-Anonymity ────────────────────────────────────────────────────

/** A database record represented as attribute→value pairs. */
export type DatabaseRecord = Readonly<Record<string, string>>;

/**
 * Computes the k-anonymity level of a dataset.
 *
 * A dataset is k-anonymous if every record is indistinguishable from at
 * least k − 1 other records (Sweeney, 2000; Book §28.3.2).
 * This function returns the minimum equivalence-class size — the
 * largest k for which the dataset is k-anonymous.
 *
 * @param records - Array of database records (objects with string values).
 * @param quasiIdentifiers - Attribute names to use for grouping.
 * @returns The k-anonymity level (minimum group size). Returns 0 if empty.
 * @complexity O(n) where n = records.length
 */
export function computeKAnonymity(
  records: ReadonlyArray<DatabaseRecord>,
  quasiIdentifiers: ReadonlyArray<string>,
): number {
  if (records.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const rec of records) {
    const key = quasiIdentifiers.map(attr => `${attr}=${rec[attr] ?? ''}`).join('|');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let min = Infinity;
  for (const count of counts.values()) {
    if (count < min) min = count;
  }
  /* v8 ignore start */
  return min === Infinity ? 0 : min;
  /* v8 ignore stop */
}

/**
 * Generalizes a field value to a coarser representation to improve k-anonymity.
 * Numeric age strings are rounded down to the nearest decade (e.g., "34" → "30-39").
 * All other values are replaced with "*" (full suppression).
 *
 * @param value - Original field value.
 * @param field - Field name (used to decide generalisation strategy).
 * @returns Generalised value string.
 * @complexity O(1)
 */
export function generalizeField(value: string, field: string): string {
  if (field === 'age') {
    const n = parseInt(value, 10);
    if (!isNaN(n)) {
      const lo = Math.floor(n / 10) * 10;
      return `${lo}-${lo + 9}`;
    }
  }
  return '*';
}

// ─── §28.3.2: Differential Privacy (Laplace Mechanism) ───────────────────────

/**
 * Adds Laplace noise to a numeric query result to achieve ε-differential privacy.
 *
 * The Laplace mechanism (Dwork, 2008; Book §28.3.2) draws noise from
 * Laplace(0, sensitivity/ε). For counting queries, sensitivity = 1.
 *
 * NOTE: This function uses Math.random() internally and is therefore
 * NOT purely deterministic, but it is side-effect free.
 *
 * @param trueValue - The exact query answer.
 * @param sensitivity - L1 sensitivity of the query (often 1 for counts).
 * @param epsilon - Privacy parameter ε > 0. Smaller ε = more privacy.
 * @returns Noisy query result (may be non-integer).
 * @complexity O(1)
 */
export function laplaceNoise(trueValue: number, sensitivity: number, epsilon: number): number {
  if (epsilon <= 0) return trueValue;
  const scale = sensitivity / epsilon;
  // Inverse CDF of Laplace distribution
  const u = Math.random() - 0.5;
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return trueValue + noise;
}

/**
 * Computes the expected standard deviation of Laplace noise for a given
 * sensitivity and privacy budget ε.
 * σ = √2 · (sensitivity / ε)
 *
 * @param sensitivity - L1 sensitivity of the query.
 * @param epsilon - Privacy budget ε > 0.
 * @returns Expected standard deviation of the added noise.
 * @complexity O(1)
 */
export function laplaceNoiseStdDev(sensitivity: number, epsilon: number): number {
  if (epsilon <= 0) return Infinity;
  return Math.SQRT2 * (sensitivity / epsilon);
}

// ─── §28.3.7: Fault Tree Analysis ────────────────────────────────────────────

/** A node in a fault tree (AND/OR logic). */
export interface FaultTreeNode {
  /** Node type: 'AND' (all children must fail), 'OR' (any child fails), or 'LEAF' (base event). */
  type: 'AND' | 'OR' | 'LEAF';
  /** Failure probability for LEAF nodes (0–1). Ignored for AND/OR nodes. */
  probability?: number;
  /** Children for AND/OR nodes. */
  children?: FaultTreeNode[];
}

/**
 * Computes the top-event failure probability from a fault tree using
 * AND/OR gate logic (Book §28.3.7).
 *
 * AND gate: P(failure) = product of children's probabilities.
 * OR gate:  P(failure) = 1 − product of (1 − P_i) for all children.
 * LEAF:     P(failure) = node.probability.
 *
 * @param node - Root node of the fault tree.
 * @returns Probability that the top event occurs (0–1).
 * @complexity O(n) where n = number of nodes in the tree
 */
export function faultTreeProbability(node: FaultTreeNode): number {
  if (node.type === 'LEAF') {
    return Math.max(0, Math.min(1, node.probability ?? 0));
  }
  const children = node.children ?? [];
  if (children.length === 0) return 0;
  if (node.type === 'AND') {
    return children.reduce((acc, child) => acc * faultTreeProbability(child), 1);
  }
  // OR gate
  return 1 - children.reduce((acc, child) => acc * (1 - faultTreeProbability(child)), 1);
}

// ─── §28.3.7: Value Alignment ────────────────────────────────────────────────

/** A possible world-state action with human and robot utility estimates. */
export interface AlignmentScenario {
  /** Human's true utility for this action (ground truth). */
  humanUtility: number;
  /** Robot's estimated utility for this action. */
  robotUtility: number;
}

/**
 * Computes a value alignment score: how well the robot's utility estimates
 * match human preferences (Book §28.3.7 "value alignment problem").
 *
 * The score is the Pearson correlation coefficient between the robot and
 * human utility vectors, clamped to [−1, 1]. A score of 1 means perfect
 * alignment; −1 means perfect misalignment; 0 means no correlation.
 *
 * @param scenarios - Array of action scenarios with human and robot utilities.
 * @returns Alignment score in [−1, 1]. Returns 0 if the variance is zero.
 * @complexity O(n) where n = scenarios.length
 */
export function valueAlignmentScore(scenarios: ReadonlyArray<AlignmentScenario>): number {
  const n = scenarios.length;
  if (n === 0) return 0;
  const hMean = scenarios.reduce((s, x) => s + x.humanUtility, 0) / n;
  const rMean = scenarios.reduce((s, x) => s + x.robotUtility, 0) / n;
  let num = 0, hVar = 0, rVar = 0;
  for (const sc of scenarios) {
    const dh = sc.humanUtility - hMean;
    const dr = sc.robotUtility - rMean;
    num += dh * dr;
    hVar += dh * dh;
    rVar += dr * dr;
  }
  const denom = Math.sqrt(hVar * rVar);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, num / denom));
}

/**
 * Simulates the "low-impact" safety mechanism (Armstrong & Levinstein, 2017;
 * Book §28.3.7): re-weights robot utility by subtracting a penalty proportional
 * to the number of state changes caused by the action.
 *
 * adjustedUtility = robotUtility − impactPenalty × stateChanges
 *
 * @param robotUtility - Original utility estimate for an action.
 * @param stateChanges - Number of world-state variables the action changes.
 * @param impactPenalty - Penalty per state change (default 0.1).
 * @returns Adjusted utility value (may be negative).
 * @complexity O(1)
 */
export function lowImpactUtility(
  robotUtility: number,
  stateChanges: number,
  impactPenalty = 0.1,
): number {
  return robotUtility - impactPenalty * stateChanges;
}
