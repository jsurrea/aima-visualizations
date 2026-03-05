/**
 * Chapter 13 — Probabilistic Reasoning
 *
 * Pure TypeScript implementations of exact and approximate inference algorithms
 * for Boolean Bayesian networks, as described in AIMA 4th edition, Chapter 13.
 *
 * Algorithms included:
 *  - Enumeration-Ask  (§13.3, Figure 13.11)
 *  - Variable Elimination (§13.3, Figure 13.13)
 *  - Prior Sampling  (§13.4.1)
 *  - Rejection Sampling  (§13.4.2)
 *  - Likelihood Weighting  (§13.4.3)
 *  - Gibbs Sampling  (§13.4.4, Figure 13.20)
 *  - Noisy-OR CPT generation (§13.2)
 *  - do-calculus / causal intervention (§13.5)
 *
 * @module algorithms
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core data structures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Boolean Bayesian network node.
 *
 * CPT indexing convention (shared across this module):
 *   For k parents, `cpt` has 2^k entries.
 *   Entry i: bit j of i is 1 when parent[j] = true.
 *   `cpt[i]` = P(node = true | parent combination i).
 *   Nodes with no parents: `cpt = [P(node = true)]`.
 */
export interface BayesNode {
  /** Variable name. */
  name: string;
  /** Ordered list of parent variable names. */
  parents: string[];
  /** CPT entries; length = 2^parents.length. */
  cpt: number[];
}

/** A Bayesian network over Boolean random variables. */
export interface BayesNet {
  /** Variable names in topological order (parents before children). */
  variables: string[];
  /** Map from variable name to node definition. */
  nodes: ReadonlyMap<string, BayesNode>;
}

/** A (possibly partial) truth-value assignment to named variables. */
export type Assignment = ReadonlyMap<string, boolean>;

// ─────────────────────────────────────────────────────────────────────────────
// Canonical networks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The alarm network from AIMA Figure 13.2.
 *
 * Variables: Burglary, Earthquake, Alarm, JohnCalls, MaryCalls.
 */
export const BURGLARY_NET: BayesNet = (() => {
  const nodes = new Map<string, BayesNode>([
    ['Burglary',   { name: 'Burglary',   parents: [],                       cpt: [0.001] }],
    ['Earthquake', { name: 'Earthquake', parents: [],                       cpt: [0.002] }],
    ['Alarm',      { name: 'Alarm',      parents: ['Burglary','Earthquake'], cpt: [0.001, 0.94, 0.29, 0.95] }],
    ['JohnCalls',  { name: 'JohnCalls',  parents: ['Alarm'],                cpt: [0.05, 0.90] }],
    ['MaryCalls',  { name: 'MaryCalls',  parents: ['Alarm'],                cpt: [0.01, 0.70] }],
  ]);
  return {
    variables: ['Burglary','Earthquake','Alarm','JohnCalls','MaryCalls'],
    nodes,
  };
})();

/**
 * The lawn-sprinkler network from AIMA Figure 13.15.
 *
 * Variables: Cloudy, Sprinkler, Rain, WetGrass.
 */
export const SPRINKLER_NET: BayesNet = (() => {
  const nodes = new Map<string, BayesNode>([
    ['Cloudy',     { name: 'Cloudy',     parents: [],                    cpt: [0.5] }],
    ['Sprinkler',  { name: 'Sprinkler',  parents: ['Cloudy'],            cpt: [0.5, 0.1] }],
    ['Rain',       { name: 'Rain',       parents: ['Cloudy'],            cpt: [0.2, 0.8] }],
    ['WetGrass',   { name: 'WetGrass',   parents: ['Sprinkler','Rain'],  cpt: [0.0, 0.9, 0.9, 0.99] }],
  ]);
  return {
    variables: ['Cloudy','Sprinkler','Rain','WetGrass'],
    nodes,
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// Core probability helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the index into a node's CPT array for the given parent assignment.
 *
 * Bit j of the returned index is 1 when `parents[j]` is true in `assignment`.
 *
 * @param parents   - ordered parent names (matches node.parents)
 * @param assignment - current variable assignment
 * @returns CPT index in [0, 2^parents.length)
 * @complexity O(k) where k = parents.length
 */
export function cptIndex(parents: string[], assignment: Assignment): number {
  let idx = 0;
  for (let j = 0; j < parents.length; j++) {
    if (assignment.get(parents[j]!) === true) {
      idx |= (1 << j);
    }
  }
  return idx;
}

/**
 * Returns P(node = true | parents) using the node's CPT and the current assignment.
 *
 * @param node       - Bayesian network node
 * @param assignment - current variable assignment (must cover all of node.parents)
 * @returns P(node = true | parents)
 * @complexity O(k) where k = node.parents.length
 */
export function cptLookup(node: BayesNode, assignment: Assignment): number {
  const idx = cptIndex(node.parents, assignment);
  // CPT always has 2^k entries; index is always in bounds for valid networks.
  return node.cpt[idx]!;
}

/**
 * Computes the joint probability P(x₁, …, xₙ) = ∏ P(xᵢ | parents(Xᵢ)).
 *
 * @param bn         - Bayesian network
 * @param assignment - complete assignment to all variables in the network
 * @returns joint probability
 * @complexity O(n·k) where n = |variables|, k = max parents
 */
export function jointProbability(bn: BayesNet, assignment: Assignment): number {
  let prob = 1.0;
  for (const varName of bn.variables) {
    const node = bn.nodes.get(varName)!;
    const pTrue = cptLookup(node, assignment);
    const val = assignment.get(varName);
    prob *= val ? pTrue : (1 - pTrue);
  }
  return prob;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enumeration-Ask (Figure 13.11)
// ─────────────────────────────────────────────────────────────────────────────

/** A single node visit recorded during enumeration inference. */
export interface EnumerationStep {
  /** Recursion depth (0 = top-level variable). */
  readonly depth: number;
  /** Variable being processed at this step. */
  readonly varName: string;
  /** Value assigned to varName at this step. */
  readonly value: boolean;
  /** Full evidence map (including query assignment) at this call frame. */
  readonly evidence: Readonly<Record<string, boolean>>;
  /** Product P(varName = value | parents) × enumerateAll(rest, …). */
  readonly subResult: number;
  /** Human-readable description of this computation. */
  readonly action: string;
}

/** Result of {@link enumerationAsk}. */
export interface EnumerationResult {
  /** All node-visit steps in depth-first order. */
  readonly steps: ReadonlyArray<EnumerationStep>;
  /** Normalised distribution: [P(query=false), P(query=true)]. */
  readonly distribution: readonly [number, number];
}

/** Snapshot a Map<string,boolean> to a plain record. */
function mapToRecord(m: Map<string, boolean>): Record<string, boolean> {
  const rec: Record<string, boolean> = {};
  m.forEach((v, k) => { rec[k] = v; });
  return rec;
}

/**
 * Recursive helper used by {@link enumerationAsk}.
 *
 * Returns the unnormalised probability contribution and all steps taken.
 */
function enumerateAll(
  vars: readonly string[],
  evidenceMap: Map<string, boolean>,
  bn: BayesNet,
  depth: number,
): { prob: number; steps: EnumerationStep[] } {
  if (vars.length === 0) {
    return { prob: 1.0, steps: [] };
  }

  const first = vars[0]!;
  const rest = vars.slice(1);
  const node = bn.nodes.get(first)!;

  if (evidenceMap.has(first)) {
    const val = evidenceMap.get(first)!;
    const pTrue = cptLookup(node, evidenceMap);
    const p = val ? pTrue : (1 - pTrue);
    const { prob: subProb, steps: subSteps } = enumerateAll(rest, evidenceMap, bn, depth + 1);
    const subResult = p * subProb;
    const step: EnumerationStep = {
      depth,
      varName: first,
      value: val,
      evidence: mapToRecord(evidenceMap),
      subResult,
      action: `P(${first}=${String(val)}|parents)×enum(rest)=${subResult.toFixed(8)}`,
    };
    return { prob: subResult, steps: [...subSteps, step] };
  } else {
    const allSteps: EnumerationStep[] = [];
    let total = 0;
    for (const v of [false, true] as const) {
      const ext = new Map<string, boolean>(evidenceMap);
      ext.set(first, v);
      const pTrue = cptLookup(node, ext);
      const p = v ? pTrue : (1 - pTrue);
      const { prob: subProb, steps: subSteps } = enumerateAll(rest, ext, bn, depth + 1);
      const subResult = p * subProb;
      const step: EnumerationStep = {
        depth,
        varName: first,
        value: v,
        evidence: mapToRecord(ext),
        subResult,
        action: `P(${first}=${String(v)}|parents)×enum(rest)=${subResult.toFixed(8)}`,
      };
      allSteps.push(...subSteps, step);
      total += subResult;
    }
    return { prob: total, steps: allSteps };
  }
}

/**
 * Exact inference by enumeration (AIMA Figure 13.11).
 *
 * Computes P(query | evidence) by summing over all possible assignments to
 * hidden variables, then normalising.
 *
 * @param query    - variable name to query
 * @param evidence - observed variable assignments
 * @param bn       - Bayesian network
 * @returns enumeration result with all steps and normalised distribution
 * @complexity O(n · 2^n) where n = |variables|
 */
export function enumerationAsk(
  query: string,
  evidence: Assignment,
  bn: BayesNet,
): EnumerationResult {
  const allSteps: EnumerationStep[] = [];
  const probs: number[] = [];

  for (const value of [false, true] as const) {
    const ext = new Map<string, boolean>();
    evidence.forEach((v, k) => { ext.set(k, v); });
    ext.set(query, value);
    const { prob, steps } = enumerateAll(bn.variables, ext, bn, 0);
    allSteps.push(...steps);
    probs.push(prob);
  }

  const p0 = probs[0]!;
  const p1 = probs[1]!;
  const total = p0 + p1;
  const distribution: readonly [number, number] =
    total > 0 ? [p0 / total, p1 / total] : [0.5, 0.5];

  return { steps: allSteps, distribution };
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable Elimination (Figure 13.13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A factor — a function over a subset of variables, represented as a flat
 * array of values indexed by bit-combinations of those variables.
 *
 * `variables[j]` is true when bit j of the index is 1.
 */
export interface Factor {
  /** Ordered variable names spanned by this factor. */
  readonly variables: ReadonlyArray<string>;
  /** Values; length = 2^variables.length. */
  readonly values: ReadonlyArray<number>;
}

/** A single operation recorded during variable elimination. */
export interface VEStep {
  /** What kind of operation this is. */
  readonly operation: 'make-factor' | 'pointwise-product' | 'sum-out' | 'normalize';
  /** Human-readable description. */
  readonly description: string;
  /** Input factors for this operation. */
  readonly factors: ReadonlyArray<Factor>;
  /** Output factor (if applicable). */
  readonly result?: Factor;
  /** Variable involved (if applicable). */
  readonly variable?: string;
  /** Short action label for display. */
  readonly action: string;
}

/**
 * Creates a factor for `variable` from its CPT, with evidence variables fixed.
 *
 * Factor variables = {variable} ∪ {parents} − {evidence variables}.
 * For each assignment of the free variables, the factor value is
 * P(variable = freeVal | parents) consistent with the evidence.
 *
 * @param variable - variable name
 * @param evidence - observed variable assignments
 * @param bn       - Bayesian network
 * @returns factor over the free (non-evidence) variables
 * @complexity O(2^k) where k = free variables in {variable, parents}
 */
export function makeFactor(variable: string, evidence: Assignment, bn: BayesNet): Factor {
  const node = bn.nodes.get(variable)!;
  const allVars = [variable, ...node.parents];
  const freeVars = allVars.filter(v => !evidence.has(v));
  const size = 1 << freeVars.length;
  const values: number[] = [];

  for (let i = 0; i < size; i++) {
    // Build assignment for free variables from bit pattern of i.
    const freeAssignment = new Map<string, boolean>();
    for (let j = 0; j < freeVars.length; j++) {
      freeAssignment.set(freeVars[j]!, (i & (1 << j)) !== 0);
    }

    // Full assignment = evidence + freeAssignment.
    const fullAssignment = new Map<string, boolean>();
    evidence.forEach((v, k) => { fullAssignment.set(k, v); });
    freeAssignment.forEach((v, k) => { fullAssignment.set(k, v); });

    const pTrue = cptLookup(node, fullAssignment);

    // Determine the value of `variable` from evidence or free assignment.
    const xVal = evidence.has(variable)
      ? evidence.get(variable)!
      : freeAssignment.get(variable)!;

    values.push(xVal ? pTrue : (1 - pTrue));
  }

  return { variables: freeVars, values };
}

/**
 * Computes the pointwise product of two factors (AIMA Figure 13.12).
 *
 * Result variables = union of f1.variables and f2.variables.
 * For each assignment of result variables, multiplies the corresponding
 * values from f1 and f2.
 *
 * @param f1 - first factor
 * @param f2 - second factor
 * @returns product factor
 * @complexity O(2^|vars1 ∪ vars2|)
 */
export function pointwiseProduct(f1: Factor, f2: Factor): Factor {
  // Build result variables as ordered union.
  const resultVars: string[] = [...f1.variables];
  for (const v of f2.variables) {
    if (!resultVars.includes(v)) resultVars.push(v);
  }

  const size = 1 << resultVars.length;
  const values: number[] = [];

  for (let i = 0; i < size; i++) {
    // Map result index bits back to sub-factor indices.
    let f1Idx = 0;
    for (let j = 0; j < f1.variables.length; j++) {
      const rPos = resultVars.indexOf(f1.variables[j]!);
      if ((i & (1 << rPos)) !== 0) f1Idx |= (1 << j);
    }
    let f2Idx = 0;
    for (let j = 0; j < f2.variables.length; j++) {
      const rPos = resultVars.indexOf(f2.variables[j]!);
      if ((i & (1 << rPos)) !== 0) f2Idx |= (1 << j);
    }
    values.push(f1.values[f1Idx]! * f2.values[f2Idx]!);
  }

  return { variables: resultVars, values };
}

/**
 * Sums out (marginalises) `variable` from factor `f`.
 *
 * Result variables = f.variables − {variable}.
 * For each assignment of result variables, sums f values over both settings
 * of `variable`.
 *
 * @param variable - variable to marginalise out
 * @param f        - input factor
 * @returns reduced factor without `variable`
 * @complexity O(2^|f.variables|)
 */
export function sumOut(variable: string, f: Factor): Factor {
  const varIdx = f.variables.indexOf(variable);
  const resultVars = f.variables.filter(v => v !== variable);
  const size = 1 << resultVars.length;
  const values: number[] = new Array(size).fill(0) as number[];

  for (let i = 0; i < size; i++) {
    for (const val of [false, true] as const) {
      // Build the index into f.values combining result bits and summed variable.
      let fIdx = 0;
      let resJ = 0;
      for (let j = 0; j < f.variables.length; j++) {
        if (j === varIdx) {
          if (val) fIdx |= (1 << j);
        } else {
          if ((i & (1 << resJ)) !== 0) fIdx |= (1 << j);
          resJ++;
        }
      }
      values[i] = values[i]! + f.values[fIdx]!;
    }
  }

  return { variables: resultVars, values };
}

/**
 * Exact inference by variable elimination (AIMA Figure 13.13).
 *
 * Processes variables in reverse topological order: for each non-query,
 * non-evidence variable, creates a factor, multiplies all factors that
 * mention it, then sums it out.
 *
 * @param query    - variable name to query
 * @param evidence - observed variable assignments
 * @param bn       - Bayesian network
 * @returns VE steps for visualisation and normalised distribution
 * @complexity O(n · 2^w) where w is the induced treewidth
 */
export function eliminationAsk(
  query: string,
  evidence: Assignment,
  bn: BayesNet,
): { steps: VEStep[]; distribution: [number, number] } {
  const steps: VEStep[] = [];
  let factors: Factor[] = [];

  // Process variables in reverse topological order.
  const reversedVars = [...bn.variables].reverse();

  for (const varName of reversedVars) {
    const f = makeFactor(varName, evidence, bn);
    factors.push(f);
    steps.push({
      operation: 'make-factor',
      description: `Create factor for ${varName}`,
      factors: [f],
      result: f,
      variable: varName,
      action: `makeFactor(${varName})`,
    });

    // Hidden variables (not query, not observed) are summed out.
    if (varName !== query && !evidence.has(varName)) {
      const relevant = factors.filter(fac => fac.variables.includes(varName));
      const irrelevant = factors.filter(fac => !fac.variables.includes(varName));

      // Pointwise product of all relevant factors.
      let product = relevant[0]!;
      for (let k = 1; k < relevant.length; k++) {
        const prev = product;
        product = pointwiseProduct(prev, relevant[k]!);
        steps.push({
          operation: 'pointwise-product',
          description: `Multiply factors containing ${varName}`,
          factors: [prev, relevant[k]!],
          result: product,
          variable: varName,
          action: `pointwiseProduct(f1, f2)`,
        });
      }

      // Sum out the hidden variable.
      const summed = sumOut(varName, product);
      steps.push({
        operation: 'sum-out',
        description: `Sum out ${varName}`,
        factors: [product],
        result: summed,
        variable: varName,
        action: `sumOut(${varName})`,
      });

      factors = [...irrelevant, summed];
    }
  }

  // Pointwise product of all remaining factors.
  let finalFactor = factors[0]!;
  for (let k = 1; k < factors.length; k++) {
    const prev = finalFactor;
    finalFactor = pointwiseProduct(prev, factors[k]!);
    steps.push({
      operation: 'pointwise-product',
      description: `Multiply remaining factors`,
      factors: [prev, factors[k]!],
      result: finalFactor,
      action: `pointwiseProduct(f1, f2)`,
    });
  }

  // qFactor.variables should now be [query]; values[0]=P(false), values[1]=P(true).
  // Invariant: after eliminating all hidden variables, finalFactor has exactly [query].
  const qFactor = finalFactor;
  const pFalse = qFactor.values[0]!;
  const pTrue = qFactor.values[1]!;
  const total = pFalse + pTrue;
  const distribution: [number, number] =
    total > 0 ? [pFalse / total, pTrue / total] : [0.5, 0.5];

  steps.push({
    operation: 'normalize',
    description: `Normalize distribution for ${query}`,
    factors: [qFactor],
    result: { variables: [query], values: distribution },
    variable: query,
    action: `normalize([${pFalse.toFixed(6)}, ${pTrue.toFixed(6)}])`,
  });

  return { steps, distribution };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pseudo-random number generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a seeded pseudo-random number generator using the xorshift32 algorithm.
 *
 * The returned function produces values uniformly distributed in [0, 1).
 * The same seed always produces the same sequence (reproducible sampling).
 *
 * @param seed - 32-bit integer seed (0 is treated as 1)
 * @returns () => number in [0, 1)
 * @complexity O(1) per call
 */
export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 1; // xorshift32 must not be zero
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * Samples an index from an array of unnormalised probabilities.
 *
 * @param probs - array of non-negative weights
 * @param rng   - uniform [0, 1) random source
 * @returns sampled index in [0, probs.length)
 * @complexity O(n)
 */
export function sampleFromDistribution(probs: number[], rng: () => number): number {
  const total = probs.reduce((a, b) => a + b, 0);
  const r = rng() * total;
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i]!;
    if (r < cumulative) return i;
  }
  // Reached when r ≥ total (floating-point edge case or rng returns ≥ 1).
  return probs.length - 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prior Sampling
// ─────────────────────────────────────────────────────────────────────────────

/** A single variable sampling event in {@link priorSample}. */
export interface PriorSampleStep {
  /** Variable being sampled. */
  readonly variable: string;
  /** Values of all parents at the time of sampling. */
  readonly parentValues: Readonly<Record<string, boolean>>;
  /** P(variable = true | parentValues). */
  readonly pTrue: number;
  /** Sampled value. */
  readonly sampledValue: boolean;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Generates one complete sample from the prior distribution P(X₁, …, Xₙ)
 * by sampling each variable in topological order conditioned on its parents.
 *
 * @param bn   - Bayesian network
 * @param seed - optional RNG seed (default: 42)
 * @returns sampled assignment and per-variable steps
 * @complexity O(n)
 */
export function priorSample(
  bn: BayesNet,
  seed?: number,
): {
  readonly assignment: Readonly<Record<string, boolean>>;
  readonly steps: ReadonlyArray<PriorSampleStep>;
} {
  const rng = seededRandom(seed ?? 42);
  const assignment = new Map<string, boolean>();
  const steps: PriorSampleStep[] = [];

  for (const varName of bn.variables) {
    const node = bn.nodes.get(varName)!;
    const pTrue = cptLookup(node, assignment);
    const sampledValue = rng() < pTrue;

    const parentValues: Record<string, boolean> = {};
    for (const parent of node.parents) {
      parentValues[parent] = assignment.get(parent)!;
    }

    steps.push({
      variable: varName,
      parentValues,
      pTrue,
      sampledValue,
      action: `Sample ${varName}=${String(sampledValue)} (P(true)=${pTrue.toFixed(4)})`,
    });

    assignment.set(varName, sampledValue);
  }

  const assignmentRecord: Record<string, boolean> = {};
  assignment.forEach((v, k) => { assignmentRecord[k] = v; });

  return { assignment: assignmentRecord, steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rejection Sampling
// ─────────────────────────────────────────────────────────────────────────────

/** One complete prior sample evaluated during rejection sampling. */
export interface RejectionSamplingStep {
  /** Zero-based index of this sample. */
  readonly sampleIndex: number;
  /** Full sampled assignment. */
  readonly sample: Readonly<Record<string, boolean>>;
  /** Whether the sample is consistent with the evidence. */
  readonly consistent: boolean;
  /** Running count of accepted samples where query = true. */
  readonly countsTrue: number;
  /** Running count of accepted samples where query = false. */
  readonly countsFalse: number;
  /** Total accepted samples so far. */
  readonly totalAccepted: number;
  /** Current estimate P(query = true). */
  readonly estimate: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Approximate inference by rejection sampling (AIMA §13.4.2).
 *
 * Repeatedly draws prior samples; keeps those consistent with evidence and
 * counts query outcomes to estimate P(query | evidence).
 *
 * @param query      - variable to query
 * @param evidence   - observed variable assignments
 * @param bn         - Bayesian network
 * @param numSamples - number of prior samples to draw
 * @param seed       - optional RNG seed (default: 42)
 * @returns per-sample steps and normalised distribution
 * @complexity O(numSamples · n)
 */
export function rejectionSampling(
  query: string,
  evidence: Assignment,
  bn: BayesNet,
  numSamples: number,
  seed?: number,
): {
  readonly steps: ReadonlyArray<RejectionSamplingStep>;
  readonly distribution: readonly [number, number];
} {
  const rng = seededRandom(seed ?? 42);
  const steps: RejectionSamplingStep[] = [];
  let countsTrue = 0;
  let countsFalse = 0;

  for (let i = 0; i < numSamples; i++) {
    // Generate a prior sample.
    const sampleMap = new Map<string, boolean>();
    for (const varName of bn.variables) {
      const node = bn.nodes.get(varName)!;
      const pTrue = cptLookup(node, sampleMap);
      sampleMap.set(varName, rng() < pTrue);
    }

    // Check consistency with evidence.
    let consistent = true;
    evidence.forEach((v, k) => {
      if (sampleMap.get(k) !== v) consistent = false;
    });

    if (consistent) {
      if (sampleMap.get(query) === true) countsTrue++;
      else countsFalse++;
    }

    const totalAccepted = countsTrue + countsFalse;
    const estimate = totalAccepted > 0 ? countsTrue / totalAccepted : 0.5;

    const sampleRecord: Record<string, boolean> = {};
    sampleMap.forEach((v, k) => { sampleRecord[k] = v; });

    steps.push({
      sampleIndex: i,
      sample: sampleRecord,
      consistent,
      countsTrue,
      countsFalse,
      totalAccepted,
      estimate,
      action: consistent
        ? `Accepted: ${query}=${String(sampleMap.get(query))}`
        : `Rejected (inconsistent with evidence)`,
    });
  }

  const total = countsTrue + countsFalse;
  const distribution: readonly [number, number] =
    total > 0 ? [countsFalse / total, countsTrue / total] : [0.5, 0.5];

  return { steps, distribution };
}

// ─────────────────────────────────────────────────────────────────────────────
// Likelihood Weighting
// ─────────────────────────────────────────────────────────────────────────────

/** One complete weighted sample generated during likelihood weighting. */
export interface LikelihoodWeightingStep {
  /** Zero-based index of this sample. */
  readonly sampleIndex: number;
  /** Full assignment (evidence vars fixed, others sampled). */
  readonly sample: Readonly<Record<string, boolean>>;
  /** Likelihood weight for this sample. */
  readonly weight: number;
  /** Accumulated weighted count for query = true. */
  readonly weightedCountTrue: number;
  /** Accumulated weighted count for query = false. */
  readonly weightedCountFalse: number;
  /** Current estimate P(query = true). */
  readonly estimate: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Approximate inference by likelihood weighting (AIMA §13.4.3).
 *
 * Evidence variables are fixed to their observed values; each sample is
 * weighted by the likelihood of the evidence given the sample's other values.
 *
 * @param query      - variable to query
 * @param evidence   - observed variable assignments
 * @param bn         - Bayesian network
 * @param numSamples - number of weighted samples to draw
 * @param seed       - optional RNG seed (default: 42)
 * @returns per-sample steps and normalised distribution
 * @complexity O(numSamples · n)
 */
export function likelihoodWeighting(
  query: string,
  evidence: Assignment,
  bn: BayesNet,
  numSamples: number,
  seed?: number,
): {
  readonly steps: ReadonlyArray<LikelihoodWeightingStep>;
  readonly distribution: readonly [number, number];
} {
  const rng = seededRandom(seed ?? 42);
  const steps: LikelihoodWeightingStep[] = [];
  let weightedCountTrue = 0;
  let weightedCountFalse = 0;

  for (let i = 0; i < numSamples; i++) {
    const sampleMap = new Map<string, boolean>();
    let weight = 1.0;

    for (const varName of bn.variables) {
      const node = bn.nodes.get(varName)!;
      const pTrue = cptLookup(node, sampleMap);

      if (evidence.has(varName)) {
        // Fix to observed value and multiply weight.
        const evVal = evidence.get(varName)!;
        sampleMap.set(varName, evVal);
        weight *= evVal ? pTrue : (1 - pTrue);
      } else {
        // Sample from prior conditional.
        sampleMap.set(varName, rng() < pTrue);
      }
    }

    if (sampleMap.get(query) === true) {
      weightedCountTrue += weight;
    } else {
      weightedCountFalse += weight;
    }

    const totalWeight = weightedCountTrue + weightedCountFalse;
    const estimate = totalWeight > 0 ? weightedCountTrue / totalWeight : 0.5;

    const sampleRecord: Record<string, boolean> = {};
    sampleMap.forEach((v, k) => { sampleRecord[k] = v; });

    steps.push({
      sampleIndex: i,
      sample: sampleRecord,
      weight,
      weightedCountTrue,
      weightedCountFalse,
      estimate,
      action: `Sample ${i}: ${query}=${String(sampleMap.get(query))}, w=${weight.toFixed(6)}`,
    });
  }

  const total = weightedCountTrue + weightedCountFalse;
  const distribution: readonly [number, number] =
    total > 0 ? [weightedCountFalse / total, weightedCountTrue / total] : [0.5, 0.5];

  return { steps, distribution };
}

// ─────────────────────────────────────────────────────────────────────────────
// Markov Blanket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the Markov blanket of `variable`: its parents, children, and each
 * child's other parents.
 *
 * The Markov blanket d-separates `variable` from all other nodes in the network,
 * so P(variable | all others) = P(variable | mb(variable)).
 *
 * @param variable - variable name
 * @param bn       - Bayesian network
 * @returns array of Markov-blanket variable names (no duplicates, no self)
 * @complexity O(n·k) where n = variables, k = max parents
 */
export function markovBlanket(variable: string, bn: BayesNet): string[] {
  const result = new Set<string>();

  // Parents of variable.
  const node = bn.nodes.get(variable)!;
  for (const parent of node.parents) {
    result.add(parent);
  }

  // Children and their other parents.
  bn.nodes.forEach((n, name) => {
    if (n.parents.includes(variable)) {
      result.add(name); // child
      for (const otherParent of n.parents) {
        if (otherParent !== variable) result.add(otherParent);
      }
    }
  });

  return [...result];
}

// ─────────────────────────────────────────────────────────────────────────────
// Gibbs Sampling (Figure 13.20)
// ─────────────────────────────────────────────────────────────────────────────

/** One sampling step recorded during Gibbs sampling. */
export interface GibbsStep {
  /** Zero-based step index. */
  readonly stepIndex: number;
  /** Which variable was resampled. */
  readonly sampledVar: string;
  /** Newly sampled value for that variable. */
  readonly newValue: boolean;
  /** [P(false), P(true)] for sampledVar given its Markov blanket. */
  readonly distribution: readonly [number, number];
  /** Full state after this step. */
  readonly state: Readonly<Record<string, boolean>>;
  /** Running count of states where query = true. */
  readonly countsTrue: number;
  /** Running count of states where query = false. */
  readonly countsFalse: number;
  /** Current estimate P(query = true). */
  readonly estimate: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Computes P(xi | mb(Xi)) ∝ P(xi | parents(Xi)) × ∏_{Yj ∈ Children(Xi)} P(Yj | parents(Yj))
 * for both values of xi, using the current state.
 */
function mbDistribution(
  variable: string,
  state: Map<string, boolean>,
  bn: BayesNet,
): readonly [number, number] {
  const node = bn.nodes.get(variable)!;

  const computeProb = (val: boolean): number => {
    const testMap = new Map<string, boolean>(state);
    testMap.set(variable, val);

    const pTrue = cptLookup(node, testMap);
    let prob = val ? pTrue : (1 - pTrue);

    // Multiply in children's conditional probabilities.
    bn.nodes.forEach((n) => {
      if (n.parents.includes(variable)) {
        const childPTrue = cptLookup(n, testMap);
        const childVal = testMap.get(n.name)!;
        prob *= childVal ? childPTrue : (1 - childPTrue);
      }
    });

    return prob;
  };

  const pFalse = computeProb(false);
  const pTrue = computeProb(true);
  const total = pFalse + pTrue;
  return total > 0 ? [pFalse / total, pTrue / total] : [0.5, 0.5];
}

/**
 * Approximate inference by Gibbs sampling (AIMA Figure 13.20).
 *
 * Initialises non-evidence variables randomly, then repeatedly resamples
 * one non-evidence variable from its Markov-blanket conditional and counts
 * query outcomes.
 *
 * @param query      - variable to estimate
 * @param evidence   - observed variable assignments
 * @param bn         - Bayesian network
 * @param numSamples - number of Gibbs steps to run
 * @param seed       - optional RNG seed (default: 42)
 * @returns per-step records and normalised distribution
 * @complexity O(numSamples · n) per run
 */
export function gibbsSampling(
  query: string,
  evidence: Assignment,
  bn: BayesNet,
  numSamples: number,
  seed?: number,
): {
  readonly steps: ReadonlyArray<GibbsStep>;
  readonly distribution: readonly [number, number];
} {
  const rng = seededRandom(seed ?? 42);
  const nonEvidenceVars = bn.variables.filter(v => !evidence.has(v));

  // Edge case: all variables are observed (including query).
  if (nonEvidenceVars.length === 0) {
    const queryVal = evidence.get(query)!;
    const distribution: readonly [number, number] = queryVal ? [0, 1] : [1, 0];
    return { steps: [], distribution };
  }

  // Initialise state: fix evidence, randomise the rest.
  const state = new Map<string, boolean>();
  bn.variables.forEach(v => {
    state.set(v, evidence.has(v) ? evidence.get(v)! : rng() < 0.5);
  });

  const steps: GibbsStep[] = [];
  let countsTrue = 0;
  let countsFalse = 0;

  for (let i = 0; i < numSamples; i++) {
    // Uniformly pick a non-evidence variable to resample.
    const idx = Math.floor(rng() * nonEvidenceVars.length);
    const sampledVar = nonEvidenceVars[idx]!;

    // Sample from P(sampledVar | mb(sampledVar)).
    const dist = mbDistribution(sampledVar, state, bn);
    const newValue = rng() < dist[1];
    state.set(sampledVar, newValue);

    // Tally the current query value.
    if (state.get(query) === true) countsTrue++;
    else countsFalse++;

    // Total is always > 0 here since we just incremented one of the counts.
    const estimate = countsTrue / (countsTrue + countsFalse);

    const stateRecord: Record<string, boolean> = {};
    state.forEach((v, k) => { stateRecord[k] = v; });

    steps.push({
      stepIndex: i,
      sampledVar,
      newValue,
      distribution: dist,
      state: stateRecord,
      countsTrue,
      countsFalse,
      estimate,
      action: `Resample ${sampledVar}=${String(newValue)} (P(true|mb)=${dist[1].toFixed(4)})`,
    });
  }

  const total = countsTrue + countsFalse;
  const distribution: readonly [number, number] =
    total > 0 ? [countsFalse / total, countsTrue / total] : [0.5, 0.5];

  return { steps, distribution };
}

// ─────────────────────────────────────────────────────────────────────────────
// Noisy-OR CPT
// ─────────────────────────────────────────────────────────────────────────────

/** One row of a noisy-OR CPT. */
export interface NoisyOREntry {
  /** Boolean value for each parent in this row. */
  readonly parentValues: ReadonlyArray<boolean>;
  /** q values (inhibition probabilities) for each active parent. */
  readonly inhibitions: ReadonlyArray<number>;
  /** P(effect = false | parents) = ∏_{j: parent_j=true} q_j. */
  readonly pFalse: number;
  /** P(effect = true | parents) = 1 − pFalse. */
  readonly pTrue: number;
}

/**
 * Computes the noisy-OR CPT for all parent combinations.
 *
 * For each parent combination, P(effect = false | parents) = ∏ q_j for active parents,
 * and P(effect = true | parents) = 1 − P(effect = false | parents).
 *
 * @param qValues            - inhibition probability q_j for each parent (length n)
 * @param parentCombinations - optional explicit list of parent value rows;
 *                             defaults to all 2^n combinations
 * @returns one NoisyOREntry per parent combination
 * @complexity O(2^n · n) by default
 */
export function noisyOR(
  qValues: ReadonlyArray<number>,
  parentCombinations?: ReadonlyArray<ReadonlyArray<boolean>>,
): ReadonlyArray<NoisyOREntry> {
  const n = qValues.length;

  let combinations: ReadonlyArray<ReadonlyArray<boolean>>;
  if (parentCombinations !== undefined) {
    combinations = parentCombinations;
  } else {
    const all: boolean[][] = [];
    for (let i = 0; i < (1 << n); i++) {
      const combo: boolean[] = [];
      for (let j = 0; j < n; j++) {
        combo.push((i & (1 << j)) !== 0);
      }
      all.push(combo);
    }
    combinations = all;
  }

  return combinations.map(parentValues => {
    const inhibitions: number[] = [];
    let pFalse = 1.0;
    for (let j = 0; j < n; j++) {
      if (parentValues[j] === true) {
        const q = qValues[j]!;
        inhibitions.push(q);
        pFalse *= q;
      }
    }
    return {
      parentValues,
      inhibitions,
      pFalse,
      pTrue: 1 - pFalse,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// do-calculus / causal intervention (§13.5)
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a do-calculus computation. */
export interface DoCalcResult {
  /** P(target | interventionVar = interventionValue) via standard conditioning. */
  readonly original: readonly [number, number];
  /** P(target | do(interventionVar = interventionValue)) in mutilated network. */
  readonly intervened: readonly [number, number];
  /** Network with all edges into interventionVar removed and its CPT set to 1/0. */
  readonly mutilatedNet: BayesNet;
  /** Human-readable explanation of the difference. */
  readonly explanation: string;
}

/**
 * Implements the do-calculus intervention operator (AIMA §13.5.1).
 *
 * Creates a "mutilated" network by removing all parent edges from
 * `interventionVar` (making it a root whose value is forced to
 * `interventionValue`), then computes P(targetVar) in that network.
 *
 * This separates correlation (standard conditioning) from causation
 * (do-operator): the two may differ because conditioning on a variable
 * does not block back-door paths from its parents, but the do-operator does.
 *
 * @param interventionVar   - variable to intervene on
 * @param interventionValue - value to force
 * @param targetVar         - variable whose distribution we want
 * @param bn                - original Bayesian network
 * @returns original and interventional distributions plus mutilated network
 * @complexity O(n · 2^n) for the internal enumeration calls
 */
export function doCalc(
  interventionVar: string,
  interventionValue: boolean,
  targetVar: string,
  bn: BayesNet,
): DoCalcResult {
  // Original: P(targetVar | interventionVar = interventionValue).
  const obsEvidence = new Map<string, boolean>([[interventionVar, interventionValue]]);
  const originalResult = enumerationAsk(targetVar, obsEvidence, bn);

  // Mutilated network: interventionVar becomes a root with P(true) = 1 or 0.
  const mutilatedNodes = new Map<string, BayesNode>();
  bn.nodes.forEach((n, name) => {
    if (name === interventionVar) {
      mutilatedNodes.set(name, {
        name,
        parents: [],
        cpt: [interventionValue ? 1.0 : 0.0],
      });
    } else {
      mutilatedNodes.set(name, n);
    }
  });

  const mutilatedNet: BayesNet = {
    variables: bn.variables,
    nodes: mutilatedNodes,
  };

  // Interventional: P(targetVar) in mutilated network (no conditioning needed).
  const mutilatedResult = enumerationAsk(
    targetVar,
    new Map<string, boolean>(),
    mutilatedNet,
  );

  const original = originalResult.distribution;
  const intervened = mutilatedResult.distribution;

  const explanation =
    `Intervention do(${interventionVar}=${String(interventionValue)}) removes all ` +
    `edges into ${interventionVar}, blocking back-door paths. ` +
    `P(${targetVar}=true | obs)=${original[1].toFixed(4)}, ` +
    `P(${targetVar}=true | do)=${intervened[1].toFixed(4)}.`;

  return { original, intervened, mutilatedNet, explanation };
}
