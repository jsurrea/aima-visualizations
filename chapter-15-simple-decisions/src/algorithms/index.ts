/**
 * Chapter 15 — Making Simple Decisions
 *
 * Algorithm implementations based on AIMA 4th Edition, Chapter 15 (pp. 518–551).
 *
 * Covers:
 *   §15.1  Maximum Expected Utility (MEU)
 *   §15.2  Utility Axiom Verification (transitivity, Allais paradox)
 *   §15.3  Utility Functions (logarithmic, linear, power, exponential;
 *           certainty equivalent, insurance premium, optimizer's curse)
 *   §15.4  Multiattribute Utility (strict dominance, additive utility,
 *           stochastic dominance)
 *   §15.5  Decision Networks (variable enumeration)
 *   §15.6  Value of Perfect Information (VPI, myopic gathering,
 *           treasure-hunt ordering)
 *   §15.7  Off-Switch Game (deference to humans, uncertain utility)
 *
 * Every exported function is a pure function with no side effects and no
 * mutation of its arguments.
 *
 * @module algorithms
 */

// ─────────────────────────────────────────────────────────────────────────────
// §15.1 — Maximum Expected Utility (MEU)
// ─────────────────────────────────────────────────────────────────────────────

export interface Action {
  readonly name: string;
  readonly outcomes: ReadonlyArray<{ probability: number; utility: number }>;
}

export interface MEUStep {
  readonly actionName: string;
  readonly expectedUtility: number;
  /** Human-readable calculation string, e.g. "0.8×10 + 0.2×(−5) = 7.0000" */
  readonly calculation: string;
}

/**
 * Compute the expected utility for each action and return the one with
 * maximum EU.
 *
 * EU(a) = Σᵢ P(resultᵢ | a) · U(resultᵢ)
 *
 * @param actions - List of actions, each with probability-weighted outcomes.
 * @returns Steps with per-action EU values, plus the best action name and EU.
 * @complexity O(n·m) where n = |actions|, m = max outcomes per action.
 */
export function computeMEU(actions: ReadonlyArray<Action>): {
  steps: ReadonlyArray<MEUStep>;
  bestAction: string;
  bestEU: number;
} {
  if (actions.length === 0) {
    return { steps: [], bestAction: '', bestEU: -Infinity };
  }

  const steps: MEUStep[] = actions.map((action) => {
    const eu = action.outcomes.reduce(
      (sum, o) => sum + o.probability * o.utility,
      0,
    );
    const parts = action.outcomes.map((o) => `${o.probability}×${o.utility}`);
    const calculation = `${parts.join(' + ')} = ${eu.toFixed(4)}`;
    return { actionName: action.name, expectedUtility: eu, calculation };
  });

  let bestEU = -Infinity;
  let bestAction = '';
  for (const step of steps) {
    if (step.expectedUtility > bestEU) {
      bestEU = step.expectedUtility;
      bestAction = step.actionName;
    }
  }

  return { steps, bestAction, bestEU };
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.2 — Utility Axiom Verification
// ─────────────────────────────────────────────────────────────────────────────

export type Preference = 'preferred' | 'indifferent' | 'dispreferred';

export interface PreferenceEntry {
  readonly optionA: string;
  readonly optionB: string;
  /** optionA relative to optionB */
  readonly preference: Preference;
}

export interface AxiomViolation {
  readonly axiom: string;
  readonly description: string;
  readonly options: ReadonlyArray<string>;
}

/**
 * Check for transitivity violations in a set of pairwise preferences.
 *
 * Transitivity: if A ≻ B and B ≻ C then A ≻ C.
 * This function detects two kinds of violations:
 *  1. Preference cycles: A ≻ B ≻ C ≻ A.
 *  2. Explicit contradictions: A ≻ B ≻ C, but recorded preference contradicts
 *     A ≻ C (i.e., A ~ C or A ≺ C is explicitly present).
 *
 * @param prefs - Pairwise preference entries.
 * @returns Array of axiom violations found.
 * @complexity O(n³ + n·|prefs|) where n = distinct options.
 */
export function checkTransitivity(
  prefs: ReadonlyArray<PreferenceEntry>,
): ReadonlyArray<AxiomViolation> {
  const strictGraph = new Map<string, Set<string>>();
  const allOptions = new Set<string>();

  for (const entry of prefs) {
    allOptions.add(entry.optionA);
    allOptions.add(entry.optionB);
    if (entry.preference === 'preferred') {
      if (!strictGraph.has(entry.optionA)) {
        strictGraph.set(entry.optionA, new Set());
      }
      strictGraph.get(entry.optionA)!.add(entry.optionB);
    }
  }

  const violations: AxiomViolation[] = [];
  const reported = new Set<string>();

  for (const a of allOptions) {
    for (const b of strictGraph.get(a) ?? []) {
      for (const c of strictGraph.get(b) ?? []) {
        if (c === a) continue;

        // Use a single key per triple so cycle and contradiction are never
        // double-reported for the same (a, b, c) combination.
        const tripleKey = [a, b, c].sort().join('|');
        if (reported.has(tripleKey)) continue;

        // 1. Cycle: C ≻ A  (a ≻ b ≻ c ≻ a)
        if (strictGraph.get(c)?.has(a)) {
          reported.add(tripleKey);
          violations.push({
            axiom: 'Transitivity',
            description: `Preference cycle detected: ${a} ≻ ${b} ≻ ${c} ≻ ${a}`,
            options: [a, b, c],
          });
          continue;
        }

        // 2. Explicit contradiction: A ≻ B ≻ C, but a recorded entry contradicts A ≻ C
        for (const entry of prefs) {
          if (reported.has(tripleKey)) break;

          const isAC =
            (entry.optionA === a && entry.optionB === c) ||
            (entry.optionA === c && entry.optionB === a);
          if (!isAC) continue;

          // C ≻ A already handled above as a cycle; here catch A ~ C or A ≺ C
          const isContradiction =
            (entry.optionA === a &&
              entry.optionB === c &&
              (entry.preference === 'dispreferred' ||
                entry.preference === 'indifferent')) ||
            (entry.optionA === c &&
              entry.optionB === a &&
              entry.preference === 'indifferent');

          if (isContradiction) {
            reported.add(tripleKey);
            violations.push({
              axiom: 'Transitivity',
              description: `Non-transitive: ${a} ≻ ${b} ≻ ${c}, but recorded preference contradicts ${a} ≻ ${c}`,
              options: [a, b, c],
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Allais paradox choice for the two-stage gamble experiment.
 *
 * Choice AB:  A = 80 % chance of $4 000,  B = 100 % chance of $3 000.
 * Choice CD:  C = 20 % chance of $4 000,  D =  25 % chance of $3 000.
 */
export interface AllaisChoice {
  readonly choiceAB: 'A' | 'B';
  readonly choiceCD: 'C' | 'D';
}

/**
 * Detect whether the given Allais gamble choices violate expected utility theory.
 *
 * Choosing B ≻ A implies U(3000) > 0.8·U(4000), which in turn implies
 * 0.25·U(3000) > 0.2·U(4000), i.e. D ≻ C.  Simultaneously choosing C ≻ D
 * contradicts this — the classic Allais Paradox.
 *
 * Likewise, choosing A ≻ B while choosing D ≻ C is the symmetric violation.
 *
 * @param choice - The decision-maker's choices in both gambles.
 * @returns `true` if the choices violate expected utility theory.
 * @complexity O(1)
 */
export function detectAllaisParadox(choice: AllaisChoice): boolean {
  // B ≻ A and C ≻ D: classic paradox (certainty effect)
  const paradox1 = choice.choiceAB === 'B' && choice.choiceCD === 'C';
  // A ≻ B and D ≻ C: symmetric violation
  const paradox2 = choice.choiceAB === 'A' && choice.choiceCD === 'D';
  return paradox1 || paradox2;
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.3 — Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export type UtilityCurveType = 'logarithmic' | 'linear' | 'power' | 'exponential';

// ── Internal numerical helpers ────────────────────────────────────────────────

/**
 * Approximation of the error function via Chebyshev fitting (max error < 1.2e-7).
 * Used only for the normal CDF approximation required by optimizerCurseDistribution.
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.5 * ax);
  const tau =
    t *
    Math.exp(
      -ax * ax -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087294)))))))),
    );
  return sign * (1.0 - tau);
}

/** Standard normal CDF Φ(x). */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Standard normal PDF φ(x). */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ── Exported utility functions ────────────────────────────────────────────────

/**
 * Compute the utility of a monetary amount using the specified curve type.
 *
 * | curve        | formula                           | default riskParam |
 * |--------------|-----------------------------------|-------------------|
 * | logarithmic  | ln(x + 1)                         | —                 |
 * | linear       | x                                 | —                 |
 * | power        | x^ρ  (x ≥ 0); −|x|^ρ (x < 0)    | ρ = 0.5           |
 * | exponential  | 1 − e^(−x/R)                     | R = 1000          |
 *
 * @param amount    - Monetary amount.
 * @param curveType - Shape of the utility curve.
 * @param riskParam - Optional risk parameter (ρ for power, R for exponential).
 * @returns Utility value.
 * @complexity O(1)
 */
export function computeUtility(
  amount: number,
  curveType: UtilityCurveType,
  riskParam?: number,
): number {
  switch (curveType) {
    case 'logarithmic':
      return Math.log(amount + 1);
    case 'linear':
      return amount;
    case 'power': {
      const rho = riskParam ?? 0.5;
      return amount >= 0 ? Math.pow(amount, rho) : -Math.pow(-amount, rho);
    }
    case 'exponential': {
      const R = riskParam ?? 1000;
      return 1 - Math.exp(-amount / R);
    }
  }
}

/**
 * Find CE such that U(CE) ≈ targetU via binary search on [lo, hi].
 * The utility function must be monotonically increasing over [lo, hi].
 */
function inverseUtility(
  targetU: number,
  curveType: UtilityCurveType,
  riskParam: number | undefined,
  lo: number,
  hi: number,
): number {
  const MAX_ITER = 100;
  const TOLERANCE = 1e-9;
  let low = lo;
  let high = hi;
  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (low + high) / 2;
    const uMid = computeUtility(mid, curveType, riskParam);
    if (Math.abs(uMid - targetU) < TOLERANCE) return mid;
    if (uMid < targetU) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Compute the certainty equivalent (CE) of a lottery.
 *
 * CE is the sure amount for which U(CE) = EU(lottery).
 * Found via binary search on the inverse utility function.
 *
 * @param lottery   - Array of {probability, amount} pairs (must sum to 1).
 * @param curveType - Utility curve type.
 * @param riskParam - Optional risk parameter.
 * @returns The certainty-equivalent monetary amount.
 * @complexity O(m · log(1/ε)) where m = |lottery|, ε = 1e-9 tolerance.
 */
export function certaintyEquivalent(
  lottery: ReadonlyArray<{ probability: number; amount: number }>,
  curveType: UtilityCurveType,
  riskParam?: number,
): number {
  const eu = lottery.reduce(
    (sum, o) => sum + o.probability * computeUtility(o.amount, curveType, riskParam),
    0,
  );
  const amounts = lottery.map((o) => o.amount);
  const minAmt = Math.min(...amounts);
  const maxAmt = Math.max(...amounts);
  return inverseUtility(eu, curveType, riskParam, minAmt - 1000, maxAmt + 1000);
}

/**
 * Compute the insurance premium for a lottery.
 *
 * Premium = EMV(lottery) − CE(lottery).
 * A positive premium indicates risk aversion (agent pays to avoid the gamble).
 * A negative premium indicates risk seeking.
 *
 * @param lottery   - Array of {probability, amount} pairs.
 * @param curveType - Utility curve type.
 * @param riskParam - Optional risk parameter.
 * @returns The insurance premium (EMV − CE).
 * @complexity O(m · log(1/ε))
 */
export function insurancePremium(
  lottery: ReadonlyArray<{ probability: number; amount: number }>,
  curveType: UtilityCurveType,
  riskParam?: number,
): number {
  const emv = lottery.reduce((sum, o) => sum + o.probability * o.amount, 0);
  const ce = certaintyEquivalent(lottery, curveType, riskParam);
  return emv - ce;
}

/**
 * Compute the optimizer's-curse density for the maximum of k i.i.d. N(0,1) rvs.
 *
 * The optimizer's curse: when we pick the best of k independently estimated
 * options, the winner's true value regresses toward the mean.  The PDF of
 * max(X₁, …, Xₖ) where Xᵢ ~ N(0,1) is:
 *
 *   f_max(x) = k · φ(x) · Φ(x)^(k−1)
 *
 * @param k         - Number of independent estimates.
 * @param numPoints - Number of evaluation points (default 60).
 * @returns Array of {x, density} over [−4, 4].
 * @complexity O(numPoints)
 */
export function optimizerCurseDistribution(
  k: number,
  numPoints = 60,
): ReadonlyArray<{ x: number; density: number }> {
  const LOW = -4;
  const HIGH = 4;
  const points: Array<{ x: number; density: number }> = [];
  for (let i = 0; i < numPoints; i++) {
    const x = LOW + ((HIGH - LOW) * i) / (numPoints - 1);
    const phi = normalPDF(x);
    const Phi = normalCDF(x);
    const density = k * phi * Math.pow(Phi, k - 1);
    points.push({ x, density });
  }
  return points;
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.4 — Multiattribute Utility
// ─────────────────────────────────────────────────────────────────────────────

export interface Option {
  readonly name: string;
  readonly attributes: Readonly<Record<string, number>>;
}

/**
 * Find options that are strictly dominated by at least one other option.
 *
 * Option A strictly dominates B iff A ≥ B on every attribute and A > B on
 * at least one attribute.
 *
 * @param options - Options with numeric attribute values.
 * @returns Names of strictly dominated options.
 * @complexity O(n² · d) where n = |options|, d = number of attributes.
 */
export function strictlyDominatedOptions(
  options: ReadonlyArray<Option>,
): ReadonlyArray<string> {
  const dominated: string[] = [];

  for (let i = 0; i < options.length; i++) {
    const b = options[i]!;
    for (let j = 0; j < options.length; j++) {
      if (i === j) continue;
      const a = options[j]!;
      const attrKeys = Object.keys(a.attributes);

      const aGeqBAll = attrKeys.every(
        (k) => a.attributes[k]! >= (b.attributes[k] ?? -Infinity),
      );
      const aGtBSome = attrKeys.some(
        (k) => a.attributes[k]! > (b.attributes[k] ?? -Infinity),
      );

      if (aGeqBAll && aGtBSome) {
        dominated.push(b.name);
        break;
      }
    }
  }

  return dominated;
}

export interface AttributeWeight {
  readonly attribute: string;
  readonly weight: number;
}

/**
 * Compute the additive multi-attribute utility for an option.
 *
 * V(x) = Σᵢ wᵢ · xᵢ   (weights should sum to 1 for proper scaling)
 *
 * @param option  - Option to evaluate.
 * @param weights - Attribute weights.
 * @returns Weighted additive utility score.
 * @complexity O(d) where d = |weights|.
 */
export function additiveUtility(
  option: Option,
  weights: ReadonlyArray<AttributeWeight>,
): number {
  return weights.reduce((sum, w) => {
    const val = option.attributes[w.attribute] ?? 0;
    return sum + w.weight * val;
  }, 0);
}

/**
 * Check whether distribution A first-order stochastically dominates B.
 *
 * A FO-stochastically dominates B iff for all x: F_A(x) ≤ F_B(x), where F
 * is the empirical CDF.  Intuitively, A tends to produce higher values.
 *
 * @param distA - Samples or discrete values from distribution A.
 * @param distB - Samples or discrete values from distribution B.
 * @returns `true` if A stochastically dominates B.
 * @complexity O(n log n) for sorting.
 */
export function stochasticDominance(
  distA: ReadonlyArray<number>,
  distB: ReadonlyArray<number>,
): boolean {
  if (distA.length === 0 || distB.length === 0) return false;

  const sortedA = [...distA].sort((x, y) => x - y);
  const sortedB = [...distB].sort((x, y) => x - y);

  const allValues = [...new Set([...sortedA, ...sortedB])].sort((x, y) => x - y);

  let idxA = 0;
  let idxB = 0;

  for (const x of allValues) {
    while (idxA < sortedA.length && sortedA[idxA]! <= x) idxA++;
    while (idxB < sortedB.length && sortedB[idxB]! <= x) idxB++;

    const cdfA = idxA / sortedA.length;
    const cdfB = idxB / sortedB.length;

    if (cdfA > cdfB) return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.5 — Decision Networks
// ─────────────────────────────────────────────────────────────────────────────

export type NodeType = 'chance' | 'decision' | 'utility';

export interface DecisionNetworkNode {
  readonly id: string;
  readonly type: NodeType;
  readonly parents: ReadonlyArray<string>;
  /**
   * For chance nodes: maps parent-assignment key (parent values joined by ',')
   * to a map of node-value → probability.
   * Root nodes use the empty string '' as the parent key.
   */
  readonly cpt?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * For utility nodes: maps parent-assignment key to a utility value.
   */
  readonly utilityTable?: Readonly<Record<string, number>>;
  readonly values: ReadonlyArray<string>;
}

export interface DecisionNetworkStep {
  readonly decisionValue: string;
  /**
   * Marginal posterior probabilities keyed as "nodeId=value",
   * e.g. { "Weather=sunny": 0.7, "Weather=rainy": 0.3 }.
   */
  readonly posteriorProbs: Readonly<Record<string, number>>;
  readonly expectedUtility: number;
  readonly action: string;
}

/** Build the CPT lookup key from a parent assignment map and parent id list. */
function parentKey(
  assignment: ReadonlyMap<string, string>,
  parents: ReadonlyArray<string>,
): string {
  return parents.map((p) => assignment.get(p) ?? '').join(',');
}

/**
 * Generate all complete value assignments for a list of nodes.
 * Returns an array of Maps from node id → value.
 */
function enumerateAssignments(
  nodes: ReadonlyArray<{ id: string; values: ReadonlyArray<string> }>,
): ReadonlyArray<ReadonlyMap<string, string>> {
  let result: Array<Map<string, string>> = [new Map()];
  for (const node of nodes) {
    const expanded: Array<Map<string, string>> = [];
    for (const current of result) {
      for (const val of node.values) {
        const next = new Map(current);
        next.set(node.id, val);
        expanded.push(next);
      }
    }
    result = expanded;
  }
  return result;
}

/**
 * Compute the joint probability of an assignment for all free (non-evidence)
 * chance nodes.  Evidence nodes are conditioned on and contribute factor 1.
 * Decision nodes are fixed and contribute factor 1.
 */
function computeJointProb(
  nodeMap: ReadonlyMap<string, DecisionNetworkNode>,
  assignment: ReadonlyMap<string, string>,
  evidenceKeys: ReadonlySet<string>,
): number {
  let prob = 1.0;
  for (const [id, node] of nodeMap) {
    if (node.type !== 'chance') continue;
    if (evidenceKeys.has(id)) continue; // observed — condition on it (factor = 1)
    const cpt = node.cpt;
    if (!cpt) continue;
    const key = parentKey(assignment, node.parents);
    const row = cpt[key] ?? cpt[''] ?? {};
    const val = assignment.get(node.id)!;
    prob *= row[val] ?? 0;
  }
  return prob;
}

/**
 * Evaluate a decision network by enumerating all joint chance-variable
 * assignments.
 *
 * For each possible value of the decision node:
 *  1. Fix the decision node and any given evidence.
 *  2. Enumerate all remaining chance-variable combinations.
 *  3. Weight each combination's utility by its joint probability.
 *  4. Sum to obtain the expected utility for this decision value.
 *
 * @param nodes          - All nodes in the network.
 * @param evidence       - Observed evidence (nodeId → observed value).
 * @param decisionNodeId - ID of the single decision node.
 * @param utilityNodeId  - ID of the single utility node.
 * @returns Per-decision steps and the optimal decision.
 * @complexity O(d · vⁿ) where d = |decision values|, v = avg values per
 *             chance node, n = number of free chance nodes.
 */
export function evaluateDecisionNetwork(
  nodes: ReadonlyArray<DecisionNetworkNode>,
  evidence: Readonly<Record<string, string>>,
  decisionNodeId: string,
  utilityNodeId: string,
): {
  steps: ReadonlyArray<DecisionNetworkStep>;
  bestDecision: string;
  bestEU: number;
} {
  const nodeMap = new Map<string, DecisionNetworkNode>(
    nodes.map((n) => [n.id, n]),
  );
  const decisionNode = nodeMap.get(decisionNodeId);
  const utilityNode = nodeMap.get(utilityNodeId);

  if (!decisionNode || !utilityNode) {
    return { steps: [], bestDecision: '', bestEU: -Infinity };
  }

  // Chance nodes not already fixed by evidence
  const freeChanceNodes = nodes.filter(
    (n) => n.type === 'chance' && !(n.id in evidence),
  );
  const evidenceKeys = new Set(Object.keys(evidence));

  const steps: DecisionNetworkStep[] = [];

  for (const decisionValue of decisionNode.values) {
    const base = new Map<string, string>(Object.entries(evidence));
    base.set(decisionNodeId, decisionValue);

    const chanceAssignments = enumerateAssignments(freeChanceNodes);

    let eu = 0;
    let totalProb = 0;

    // Accumulate marginal counts for posterior display
    const marginal: Record<string, Record<string, number>> = {};
    for (const node of freeChanceNodes) {
      marginal[node.id] = {};
      for (const val of node.values) {
        marginal[node.id]![val] = 0;
      }
    }

    for (const chanceAssign of chanceAssignments) {
      const full = new Map<string, string>(base);
      for (const [k, v] of chanceAssign) full.set(k, v);

      const prob = computeJointProb(nodeMap, full, evidenceKeys);
      if (prob <= 0) continue;

      totalProb += prob;

      const uKey = parentKey(full, utilityNode.parents);
      const utilVal = utilityNode.utilityTable?.[uKey] ?? 0;
      eu += prob * utilVal;

      for (const node of freeChanceNodes) {
        const val = full.get(node.id)!;
        const nm = marginal[node.id]!;
        nm[val] = nm[val]! + prob;
      }
    }

    // Normalise marginals to posterior probabilities
    const posteriorProbs: Record<string, number> = {};
    for (const node of freeChanceNodes) {
      const nm = marginal[node.id]!;
      for (const [val, count] of Object.entries(nm)) {
        posteriorProbs[`${node.id}=${val}`] =
          totalProb > 0 ? count / totalProb : 0;
      }
    }

    steps.push({
      decisionValue,
      posteriorProbs,
      expectedUtility: eu,
      action: `Set ${decisionNodeId} = ${decisionValue}`,
    });
  }

  let bestEU = -Infinity;
  let bestDecision = '';
  for (const step of steps) {
    if (step.expectedUtility > bestEU) {
      bestEU = step.expectedUtility;
      bestDecision = step.decisionValue;
    }
  }

  return { steps, bestDecision, bestEU };
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.6 — Value of Perfect Information (VPI)
// ─────────────────────────────────────────────────────────────────────────────

export interface VPIAction {
  readonly name: string;
  readonly outcomes: ReadonlyArray<{
    readonly evidenceValue: string;
    /** P(this outcome | evidenceValue) — conditional on the evidence value. */
    readonly probability: number;
    readonly utility: number;
  }>;
}

export interface VPIResult {
  readonly currentBestEU: number;
  readonly expectedEUWithInfo: number;
  readonly vpi: number;
  /** `true` when VPI > informationCost */
  readonly worthGathering: boolean;
}

/**
 * Compute the Value of Perfect Information (VPI) for an observable variable Eⱼ.
 *
 * VPI(Eⱼ) = Σⱼ P(Eⱼ=eⱼ) · EU(best action | Eⱼ=eⱼ)  −  EU(best action)
 *
 * VPI is always ≥ 0: knowing more never hurts a rational agent.
 *
 * @param actions                - Actions with outcomes conditional on evidence.
 * @param evidenceProbabilities  - P(Eⱼ = eⱼ) for each evidence value.
 * @param informationCost        - Cost to obtain the information.
 * @returns VPI result including whether gathering is worth its cost.
 * @complexity O(|actions| · |evidenceValues|)
 */
export function computeVPI(
  actions: ReadonlyArray<VPIAction>,
  evidenceProbabilities: Readonly<Record<string, number>>,
  informationCost: number,
): VPIResult {
  // Current EU for each action: Σ_ej P(ej) · Σ_{outcomes with ev=ej} p(o|ej)·u(o)
  const currentEUs = actions.map((action) =>
    Object.entries(evidenceProbabilities).reduce((sum, [ev, pEv]) => {
      const euGivenEv = action.outcomes
        .filter((o) => o.evidenceValue === ev)
        .reduce((s, o) => s + o.probability * o.utility, 0);
      return sum + pEv * euGivenEv;
    }, 0),
  );
  const currentBestEU =
    currentEUs.length > 0 ? Math.max(...currentEUs) : -Infinity;

  // Expected EU with perfect information: Σ_ej P(ej) · max_a EU(a | ej)
  let expectedEUWithInfo = 0;
  for (const [ev, pEv] of Object.entries(evidenceProbabilities)) {
    if (pEv <= 0) continue;
    const euPerAction = actions.map((action) =>
      action.outcomes
        .filter((o) => o.evidenceValue === ev)
        .reduce((s, o) => s + o.probability * o.utility, 0),
    );
    const bestEuGivenEv =
      euPerAction.length > 0 ? Math.max(...euPerAction) : 0;
    expectedEUWithInfo += pEv * bestEuGivenEv;
  }

  const vpi = Math.max(0, expectedEUWithInfo - currentBestEU);

  return {
    currentBestEU,
    expectedEUWithInfo,
    vpi,
    worthGathering: vpi > informationCost,
  };
}

export interface ObservableVariable {
  readonly id: string;
  readonly cost: number;
  readonly vpi: number;
}

export interface InformationGatheringStep {
  readonly observation: string;
  readonly vpi: number;
  readonly cost: number;
  readonly ratio: number;
  readonly action: 'gather' | 'act';
}

/**
 * Myopic information-gathering policy (§15.6).
 *
 * Greedily gather observations where VPI > cost, sorted by descending VPI/cost
 * ratio.  Stop as soon as no remaining observation clears its cost, then act.
 *
 * The final step always has action = 'act'.
 *
 * @param variables - Observable variables with associated VPI estimates and costs.
 * @returns Ordered sequence of gather/act steps.
 * @complexity O(n log n) for sorting.
 */
export function myopicInformationGathering(
  variables: ReadonlyArray<ObservableVariable>,
): ReadonlyArray<InformationGatheringStep> {
  const withRatios = variables.map((v) => ({
    ...v,
    ratio: v.cost > 0 ? v.vpi / v.cost : v.vpi > 0 ? Infinity : 0,
  }));

  const sorted = [...withRatios].sort((a, b) => b.ratio - a.ratio);

  const steps: InformationGatheringStep[] = [];

  for (const v of sorted) {
    if (v.vpi > v.cost) {
      steps.push({
        observation: v.id,
        vpi: v.vpi,
        cost: v.cost,
        ratio: v.ratio,
        action: 'gather',
      });
    } else {
      // Sorted by ratio — once one fails the threshold, all subsequent will too
      break;
    }
  }

  steps.push({ observation: '', vpi: 0, cost: 0, ratio: 0, action: 'act' });

  return steps;
}

export interface TreasureLocation {
  readonly id: string;
  /** P(treasure is here) */
  readonly probability: number;
  /** Cost to search this location */
  readonly cost: number;
}

/**
 * Return treasure locations in the optimal search order.
 *
 * The optimal policy sorts by descending p/c ratio (probability ÷ cost).
 * This minimises the expected total search cost before finding the treasure.
 *
 * @param locations - Candidate locations with treasure probability and cost.
 * @returns Locations sorted by descending p/c.
 * @complexity O(n log n)
 */
export function treasureHuntOptimalOrder(
  locations: ReadonlyArray<TreasureLocation>,
): ReadonlyArray<TreasureLocation> {
  return [...locations].sort((a, b) => {
    const rA = a.cost > 0 ? a.probability / a.cost : a.probability > 0 ? Infinity : 0;
    const rB = b.cost > 0 ? b.probability / b.cost : b.probability > 0 ? Infinity : 0;
    return rB - rA;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §15.7 — Off-Switch Game (Deference to Humans / Unknown Preferences)
// ─────────────────────────────────────────────────────────────────────────────

export interface OffSwitchScenario {
  /** Minimum possible value of the robot's action (may be negative). */
  readonly actionValueMin: number;
  /** Maximum possible value of the robot's action. */
  readonly actionValueMax: number;
  /**
   * Probability that the human acts against the robot's true interests
   * (0 = perfectly rational human, 1 = always makes the wrong call).
   */
  readonly humanErrorProbability: number;
}

export interface OffSwitchResult {
  readonly euAct: number;
  readonly euSwitchOff: number;
  readonly euDefer: number;
  readonly shouldDefer: boolean;
  readonly deferenceMargin: number;
  readonly pHumanSwitchesOff: number;
}

/**
 * Evaluate the off-switch game from §15.7.
 *
 * The robot's true action value u is drawn uniformly from [uMin, uMax].
 *
 *  EU(act)       = E[u] = (uMin + uMax) / 2
 *  EU(switch off) = 0
 *  EU(defer)     = ∫ P(allow | u) · u · (1/range) du
 *
 * A rational human allows the action when u ≥ 0 and switches off when u < 0.
 * The human errs with probability pErr.
 *
 * Key insight (§15.7): EU(defer) ≥ EU(act) whenever there is genuine
 * uncertainty about preferences, making deference a dominant strategy.
 *
 * @param scenario - Off-switch scenario parameters.
 * @returns Computed expected utilities and whether the robot should defer.
 * @complexity O(1)
 */
export function offSwitchGame(scenario: OffSwitchScenario): OffSwitchResult {
  const { actionValueMin: uMin, actionValueMax: uMax, humanErrorProbability: pErr } =
    scenario;

  const range = uMax - uMin;

  // Degenerate case: zero-range interval
  if (range <= 0) {
    const u = uMin;
    const euDefer = pErr === 0 ? Math.max(u, 0) : u * (1 - pErr);
    return {
      euAct: u,
      euSwitchOff: 0,
      euDefer,
      shouldDefer: euDefer > u,
      deferenceMargin: euDefer - u,
      pHumanSwitchesOff: u >= 0 ? pErr : 1 - pErr,
    };
  }

  const euAct = (uMin + uMax) / 2;
  const euSwitchOff = 0;

  // ∫_{a}^{b} u/range du = (b² − a²) / (2 · range)
  const integral = (a: number, b: number): number =>
    (b * b - a * a) / (2 * range);

  let euDefer: number;

  if (uMin >= 0) {
    // All u ≥ 0: rational human always allows; error → switches off
    euDefer = (1 - pErr) * integral(uMin, uMax);
  } else if (uMax <= 0) {
    // All u ≤ 0: rational human always switches off; error → allows
    euDefer = pErr * integral(uMin, uMax);
  } else {
    // Mixed: uMin < 0 < uMax
    const posContrib = (1 - pErr) * integral(0, uMax);
    const negContrib = pErr * integral(uMin, 0);
    euDefer = posContrib + negContrib;
  }

  // P(human switches off) = P(u ≥ 0)·pErr + P(u < 0)·(1−pErr)
  const pUPos = uMin >= 0 ? 1 : uMax <= 0 ? 0 : (uMax - 0) / range;
  const pUNeg = 1 - pUPos;
  const pHumanSwitchesOff = pUPos * pErr + pUNeg * (1 - pErr);

  return {
    euAct,
    euSwitchOff,
    euDefer,
    shouldDefer: euDefer > euAct,
    deferenceMargin: euDefer - euAct,
    pHumanSwitchesOff,
  };
}

export interface UncertainUtilityAction {
  readonly name: string;
  readonly outcomes: ReadonlyArray<{
    readonly state: string;
    readonly probability: number;
    readonly possibleUtilities: ReadonlyArray<{
      utility: number;
      probability: number;
    }>;
  }>;
}

/**
 * Compute expected utility when the utility function itself is uncertain.
 *
 * By the law of iterated expectations:
 *   EU(a) = Σ_s P(s | a) · E[U(s)]
 *          = Σ_s P(s | a) · Σ_k P(Uₖ) · Uₖ
 *
 * This models "moving uncertainty about preferences into the world" (§15.7):
 * the agent treats the unknown utility function as another random variable.
 *
 * @param action - Action with outcomes that carry uncertain utility distributions.
 * @returns Expected utility of the action.
 * @complexity O(n · m) where n = |outcomes|, m = max |possibleUtilities|.
 */
export function computeEUWithUncertainUtility(
  action: UncertainUtilityAction,
): number {
  return action.outcomes.reduce((sum, outcome) => {
    const expectedU = outcome.possibleUtilities.reduce(
      (uSum, u) => uSum + u.probability * u.utility,
      0,
    );
    return sum + outcome.probability * expectedU;
  }, 0);
}
