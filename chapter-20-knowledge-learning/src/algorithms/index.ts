/**
 * Chapter 20 — Knowledge in Learning
 *
 * Pure algorithm implementations covering:
 *  - §20.1  Current-Best-Hypothesis search & Version Space learning
 *  - §20.3  Explanation-Based Learning (EBL)
 *  - §20.4  Minimal-Consistent-Determination (relevance-based learning)
 *  - §20.5  FOIL (First-Order Inductive Learner)
 *
 * Every function is a pure function with no side effects.
 * @module algorithms
 */

// ============================================================
// SHARED TYPES
// ============================================================

/**
 * A single attribute-value example.
 * `attrs` maps attribute names to string values; `label` is the classification.
 */
export interface Example {
  readonly attrs: Readonly<Record<string, string>>;
  readonly label: boolean; // true = positive, false = negative
}

/**
 * A conjunctive hypothesis: a partial assignment of attribute values.
 * `null` means "don't care" (any value is accepted for that attribute).
 */
export type HypothesisSpec = Readonly<Record<string, string | null>>;

// ============================================================
// §20.1 — LOGICAL FORMULATION: SHARED HELPERS
// ============================================================

/**
 * Returns true if hypothesis `h` covers (is consistent with) the given example attributes.
 * A hypothesis covers an example iff every non-null condition in h matches the example.
 * @complexity O(k) where k = number of attributes
 */
export function coversExample(
  h: HypothesisSpec,
  example: Readonly<Record<string, string>>,
): boolean {
  for (const [attr, val] of Object.entries(h)) {
    if (val !== null && example[attr] !== val) return false;
  }
  return true;
}

/**
 * Returns true if `h1` is at least as general as `h2` (h1 ≥ h2 in the generality ordering).
 * h1 ≥ h2 iff every example covered by h2 is also covered by h1.
 * For conjunctive hypotheses: h1 ≥ h2 iff every constraint in h1 also appears in h2.
 * @complexity O(k)
 */
export function isMoreGeneralOrEqual(h1: HypothesisSpec, h2: HypothesisSpec): boolean {
  for (const [attr, val] of Object.entries(h1)) {
    if (val !== null && h2[attr] !== val) return false;
  }
  return true;
}

/**
 * Returns the unique minimal generalization of `h` that covers example `e`.
 * For conjunctive hypotheses, this means removing all conditions that conflict with e.
 * @complexity O(k)
 */
export function minimalGeneralization(
  h: HypothesisSpec,
  e: Readonly<Record<string, string>>,
): HypothesisSpec {
  const result: Record<string, string | null> = { ...h };
  for (const attr of Object.keys(h)) {
    if (h[attr] !== null && h[attr] !== e[attr]) {
      result[attr] = null; // remove conflicting condition
    }
  }
  return result;
}

/**
 * Returns minimal specializations of `h` that exclude example `e`.
 * Each specialization adds exactly one new constraint (from allValues) that blocks e.
 * @param allValues  Maps each attribute name to its full set of possible values.
 * @complexity O(k · v) where k = attributes, v = values per attribute
 */
export function minimalSpecializations(
  h: HypothesisSpec,
  e: Readonly<Record<string, string>>,
  allValues: Readonly<Record<string, ReadonlyArray<string>>>,
): ReadonlyArray<HypothesisSpec> {
  const result: HypothesisSpec[] = [];
  for (const attr of Object.keys(h)) {
    if (h[attr] === null) {
      // add a constraint that rules out e's value for this attribute
      const vals = allValues[attr] ?? [];
      for (const v of vals) {
        if (v !== e[attr]) {
          result.push({ ...h, [attr]: v });
        }
      }
    }
  }
  return result;
}

// ============================================================
// §20.1 — VERSION SPACE LEARNING
// ============================================================

/**
 * A snapshot of the version space after processing one example.
 */
export interface VersionSpaceStep {
  /** The example just processed. */
  readonly example: Example;
  /** S-set (most specific consistent boundary) after this example. */
  readonly sSet: ReadonlyArray<HypothesisSpec>;
  /** G-set (most general consistent boundary) after this example. */
  readonly gSet: ReadonlyArray<HypothesisSpec>;
  /** Human-readable description of what changed. */
  readonly action: string;
  /** Whether the version space collapsed (S or G became empty). */
  readonly collapsed: boolean;
}

/**
 * Update the S-set and G-set for one new example, following the
 * Candidate Elimination Algorithm (Mitchell 1977; AIMA §20.1.3).
 *
 * @param sSet       Current most-specific boundary.
 * @param gSet       Current most-general boundary.
 * @param example    The new example with attributes and label.
 * @param allValues  Domain: all possible values for each attribute.
 * @complexity O(|S| · k + |G| · k · v)
 */
export function versionSpaceUpdate(
  sSet: ReadonlyArray<HypothesisSpec>,
  gSet: ReadonlyArray<HypothesisSpec>,
  example: Example,
  allValues: Readonly<Record<string, ReadonlyArray<string>>>,
): { sSet: ReadonlyArray<HypothesisSpec>; gSet: ReadonlyArray<HypothesisSpec> } {
  const { attrs, label } = example;

  if (label) {
    // Positive example
    // 1. Remove from G any hypothesis that does not cover the example
    const newG = gSet.filter(g => coversExample(g, attrs));

    // 2. Generalize each S member that doesn't cover the example
    let newS: HypothesisSpec[] = [];
    for (const s of sSet) {
      if (coversExample(s, attrs)) {
        newS.push(s);
      } else {
        // Generate minimal generalization of s to cover e
        const gen = minimalGeneralization(s, attrs);
        // Keep only if it is more specific than some G member
        if (newG.some(g => isMoreGeneralOrEqual(g, gen))) {
          newS.push(gen);
        }
      }
    }
    // Remove from newS any hypothesis more general than another in newS
    newS = newS.filter(
      s1 => !newS.some(s2 => s1 !== s2 && isMoreGeneralOrEqual(s1, s2)),
    );

    return { sSet: newS, gSet: newG };
  } else {
    // Negative example
    // 1. Remove from S any hypothesis that covers the example
    const newS = sSet.filter(s => !coversExample(s, attrs));

    // 2. Specialize each G member that covers the example
    let newG: HypothesisSpec[] = [];
    for (const g of gSet) {
      if (!coversExample(g, attrs)) {
        newG.push(g);
      } else {
        const specs = minimalSpecializations(g, attrs, allValues);
        for (const sp of specs) {
          // Keep only if more general than some S member
          if (newS.some(s => isMoreGeneralOrEqual(sp, s))) {
            newG.push(sp);
          }
        }
      }
    }
    // Remove from newG any hypothesis more specific than another in newG
    newG = newG.filter(
      g1 => !newG.some(g2 => g1 !== g2 && isMoreGeneralOrEqual(g2, g1)),
    );

    return { sSet: newS, gSet: newG };
  }
}

/**
 * Run the full Version-Space-Learning algorithm on a list of examples.
 * Returns one step per example showing how S and G evolve.
 *
 * Initial state: G = [all-null hypothesis], S = [bottom = exact first positive example].
 * @complexity O(n · (|S| · k + |G| · k · v)) where n = examples
 */
export function versionSpaceLearning(
  examples: ReadonlyArray<Example>,
  allValues: Readonly<Record<string, ReadonlyArray<string>>>,
): ReadonlyArray<VersionSpaceStep> {
  const attrs = Object.keys(allValues);
  // G-set: starts with the most general hypothesis (no conditions)
  let gSet: HypothesisSpec[] = [Object.fromEntries(attrs.map(a => [a, null]))];
  // S-set: starts empty; will be seeded by first positive example
  let sSet: HypothesisSpec[] = [];

  const steps: VersionSpaceStep[] = [];

  for (const ex of examples) {
    // Seed S-set with first positive example
    if (sSet.length === 0 && ex.label) {
      sSet = [{ ...ex.attrs }];
    }

    const updated = versionSpaceUpdate(sSet, gSet, ex, allValues);
    sSet = [...updated.sSet];
    gSet = [...updated.gSet];

    const collapsed = sSet.length === 0 || gSet.length === 0;
    const action = ex.label
      ? `Positive example: generalize S-set, prune G-set`
      : `Negative example: prune S-set, specialize G-set`;

    steps.push({
      example: ex,
      sSet: sSet.map(h => ({ ...h })),
      gSet: gSet.map(h => ({ ...h })),
      action: collapsed ? action + ' — version space collapsed!' : action,
      collapsed,
    });
  }

  return steps;
}

// ============================================================
// §20.1 — CURRENT-BEST-HYPOTHESIS
// ============================================================

/**
 * A single step in the Current-Best-Hypothesis algorithm.
 */
export interface CBHStep {
  /** The example being processed. */
  readonly example: Example;
  /** The current hypothesis before processing this example. */
  readonly hypothesis: HypothesisSpec;
  /** How the example relates to the current hypothesis. */
  readonly consistency: 'consistent' | 'false_positive' | 'false_negative';
  /** The updated hypothesis after processing. */
  readonly newHypothesis: HypothesisSpec;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Run a simplified (greedy, non-backtracking) Current-Best-Hypothesis search.
 * On false positive: add one condition to specialize.
 * On false negative: remove one condition to generalize (or add a disjunction note).
 *
 * @param examples         Training examples in order.
 * @param initialHypothesis Starting hypothesis.
 * @param allValues         Domain values for specialization.
 * @complexity O(n · k) amortized
 */
export function currentBestLearning(
  examples: ReadonlyArray<Example>,
  initialHypothesis: HypothesisSpec,
  allValues: Readonly<Record<string, ReadonlyArray<string>>>,
): ReadonlyArray<CBHStep> {
  const steps: CBHStep[] = [];
  let h: HypothesisSpec = { ...initialHypothesis };

  for (const ex of examples) {
    const predicted = coversExample(h, ex.attrs);
    const actual = ex.label;

    if (predicted === actual) {
      steps.push({
        example: ex,
        hypothesis: { ...h },
        consistency: 'consistent',
        newHypothesis: { ...h },
        action: 'Example is consistent — no change needed',
      });
    } else if (predicted && !actual) {
      // False positive: specialize by adding the first differing attribute condition
      const specs = minimalSpecializations(h, ex.attrs, allValues);
      // Pick first valid specialization (greedy)
      const chosen = specs[0] ?? h;
      h = { ...chosen };
      steps.push({
        example: ex,
        hypothesis: { ...initialHypothesis },
        consistency: 'false_positive',
        newHypothesis: { ...h },
        action: `False positive — specializing hypothesis`,
      });
    } else {
      // False negative: generalize by removing the conflicting condition
      const gen = minimalGeneralization(h, ex.attrs);
      h = { ...gen };
      steps.push({
        example: ex,
        hypothesis: { ...initialHypothesis },
        consistency: 'false_negative',
        newHypothesis: { ...h },
        action: `False negative — generalizing hypothesis`,
      });
    }
  }

  return steps;
}

// ============================================================
// §20.3 — EXPLANATION-BASED LEARNING (EBL)
// ============================================================

/**
 * A node in an EBL proof tree.
 */
export interface EBLNode {
  /** The goal being proved at this node (e.g. "Simplify(1×(0+X), X)"). */
  readonly goal: string;
  /** The rule name used at this node (empty string for leaves). */
  readonly ruleName: string;
  /** Bindings generated at this node (e.g. { u: '0+X' }). */
  readonly bindings: Readonly<Record<string, string>>;
  /** Child nodes (empty for leaves). */
  readonly children: ReadonlyArray<EBLNode>;
  /** Whether this is a leaf (base fact). */
  readonly isLeaf: boolean;
  /** The generalized version of this goal (variables instead of constants). */
  readonly generalizedGoal: string;
}

/**
 * A step in the EBL extraction process.
 */
export interface EBLStep {
  /** Human-readable description of this step. */
  readonly action: string;
  /** The specific example being explained. */
  readonly specificGoal: string;
  /** The variabilized goal. */
  readonly generalGoal: string;
  /** Leaf conditions from the generalized proof. */
  readonly leafConditions: ReadonlyArray<string>;
  /** Conditions that can be dropped (always true). */
  readonly droppedConditions: ReadonlyArray<string>;
  /** The final extracted rule. */
  readonly extractedRule: string;
}

/**
 * A knowledge-base rule for the simplification domain used in AIMA §20.3.
 */
export interface KBRule {
  readonly name: string;
  readonly head: string;
  readonly body: ReadonlyArray<string>;
  /** If this rule applies to a goal, returns bindings; otherwise null. */
  readonly match: (goal: string) => Readonly<Record<string, string>> | null;
}

/**
 * Pre-built EBL steps for the canonical AIMA §20.3 example:
 * Simplify(1×(0+X), X)  →  ArithmeticUnknown(z) ⇒ Simplify(1×(0+z), z)
 *
 * Returns the steps of the EBL process for visualization.
 * @complexity O(1) — fixed example
 */
export function eblSimplificationSteps(): ReadonlyArray<EBLStep> {
  return [
    {
      action: 'Goal: prove Simplify(1×(0+X), X) using background knowledge',
      specificGoal: 'Simplify(1×(0+X), X)',
      generalGoal: 'Simplify(x×(y+z), w)',
      leafConditions: [
        'Rewrite(1×(0+z), 0+z)',
        'Rewrite(0+z, z)',
        'ArithmeticUnknown(z)',
      ],
      droppedConditions: ['Rewrite(1×(0+z), 0+z)', 'Rewrite(0+z, z)'],
      extractedRule: 'ArithmeticUnknown(z) ⇒ Simplify(1×(0+z), z)',
    },
    {
      action: 'Apply rule Rewrite(u,v) ∧ Simplify(v,w) ⇒ Simplify(u,w) with u=1×(0+X)',
      specificGoal: 'Rewrite(1×(0+X), 0+X)',
      generalGoal: 'Rewrite(x×(y+z), y+z)',
      leafConditions: ['Rewrite(1×(0+z), 0+z)'],
      droppedConditions: ['Rewrite(1×(0+z), 0+z)'],
      extractedRule: 'true (always holds)',
    },
    {
      action: 'Apply rule Rewrite(1×u, u) to rewrite 1×(0+X) to 0+X [binds x=1]',
      specificGoal: 'Simplify(0+X, X)',
      generalGoal: 'Simplify(y+z, w)',
      leafConditions: ['Rewrite(0+z, z)', 'ArithmeticUnknown(z)'],
      droppedConditions: ['Rewrite(0+z, z)'],
      extractedRule: 'ArithmeticUnknown(z) ⇒ Simplify(0+z, z)',
    },
    {
      action: 'Apply rule Rewrite(0+u, u) to rewrite 0+X to X [binds y=0]',
      specificGoal: 'Simplify(X, X)',
      generalGoal: 'Simplify(z, w)',
      leafConditions: ['ArithmeticUnknown(z)'],
      droppedConditions: [],
      extractedRule: 'ArithmeticUnknown(z) ⇒ Simplify(z, z)',
    },
    {
      action: 'Apply rule ArithmeticUnknown(u) ⇒ Primitive(u), Primitive(u) ⇒ Simplify(u,u)',
      specificGoal: 'ArithmeticUnknown(X)',
      generalGoal: 'ArithmeticUnknown(z)',
      leafConditions: ['ArithmeticUnknown(z)'],
      droppedConditions: [],
      extractedRule: 'ArithmeticUnknown(z) ⇒ Simplify(1×(0+z), z)',
    },
    {
      action:
        'Extract final rule: leaf conditions are the LHS; drop always-true rewrite conditions',
      specificGoal: 'Simplify(1×(0+X), X)',
      generalGoal: 'Simplify(1×(0+z), z)',
      leafConditions: ['ArithmeticUnknown(z)'],
      droppedConditions: ['Rewrite(1×(0+z), 0+z)', 'Rewrite(0+z, z)'],
      extractedRule: 'ArithmeticUnknown(z) ⇒ Simplify(1×(0+z), z)',
    },
  ];
}

/**
 * Given a set of leaf conditions and a set of conditions that are always true,
 * return the final EBL rule by dropping the always-true conditions.
 * @complexity O(n)
 */
export function dropAlwaysTrueConditions(
  leafConditions: ReadonlyArray<string>,
  alwaysTrue: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const trueSet = new Set(alwaysTrue);
  return leafConditions.filter(c => !trueSet.has(c));
}

// ============================================================
// §20.4 — MINIMAL CONSISTENT DETERMINATION
// ============================================================

/**
 * A labelled example for determination learning.
 * `attrs` contains all attribute values; `target` is the value to predict.
 */
export interface DetExample {
  readonly attrs: Readonly<Record<string, string | number>>;
  readonly target: string | number;
}

/**
 * Step record for the Minimal-Consistent-Determination algorithm.
 */
export interface DetStep {
  /** The attribute subset being tested. */
  readonly subset: ReadonlyArray<string>;
  /** Whether this subset is a consistent determination for the target. */
  readonly consistent: boolean;
  /** True if this is the minimal consistent determination found. */
  readonly found: boolean;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Check whether a subset of attributes forms a consistent determination for the target.
 * A determination is consistent iff every pair of examples that agrees on the subset
 * attributes also agrees on the target.
 * @complexity O(n²)
 */
export function isConsistentDetermination(
  subset: ReadonlyArray<string>,
  examples: ReadonlyArray<DetExample>,
): boolean {
  for (let i = 0; i < examples.length; i++) {
    for (let j = i + 1; j < examples.length; j++) {
      const ei = examples[i]!;
      const ej = examples[j]!;
      // Check if ei and ej agree on all attributes in subset
      const sameAttrs = subset.every(a => ei.attrs[a] === ej.attrs[a]);
      if (sameAttrs && ei.target !== ej.target) return false;
    }
  }
  return true;
}

/**
 * Generate all subsets of an array of a given size.
 * @complexity O(C(n,k) · k)
 */
export function subsetsOfSize<T>(
  items: ReadonlyArray<T>,
  size: number,
): ReadonlyArray<ReadonlyArray<T>> {
  if (size === 0) return [[]];
  if (size > items.length) return [];
  const result: T[][] = [];
  function helper(start: number, current: T[]): void {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]!);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return result;
}

/**
 * Run the MINIMAL-CONSISTENT-DET algorithm (AIMA Figure 20.8).
 * Searches for the smallest subset of attributes that consistently
 * determines the target.
 *
 * Returns all steps tried, with the found step flagged.
 * @complexity O(Σ C(n,i) · n²) over i = 0..p where p = minimal det size
 */
export function minimalConsistentDet(
  allAttributes: ReadonlyArray<string>,
  examples: ReadonlyArray<DetExample>,
): ReadonlyArray<DetStep> {
  const steps: DetStep[] = [];

  for (let size = 0; size <= allAttributes.length; size++) {
    const subsets = subsetsOfSize(allAttributes, size);
    for (const subset of subsets) {
      const consistent = isConsistentDetermination(subset, examples);
      const found = consistent;
      steps.push({
        subset,
        consistent,
        found,
        action: consistent
          ? `Found minimal consistent determination: {${subset.join(', ') || '∅'}}`
          : `Subset {${subset.join(', ') || '∅'}} is NOT a consistent determination`,
      });
      if (found) return steps;
    }
  }

  return steps;
}

// ============================================================
// §20.5 — FOIL (First-Order Inductive Learner)
// ============================================================

/**
 * A binding of predicate argument variables to constants.
 */
export type Binding = Readonly<Record<string, string>>;

/**
 * A FOIL example: a binding with a positive/negative label.
 */
export interface FOILExample {
  readonly binding: Binding;
  readonly label: boolean;
}

/**
 * A candidate literal to add to the current clause body.
 */
export interface FOILLiteral {
  readonly name: string;
  /** Argument pattern, e.g. ['x','z'] where variables shared with head. */
  readonly args: ReadonlyArray<string>;
  /**
   * Given the current extended examples (bindings), compute whether each example
   * is covered after this literal is added. Returns new extended bindings.
   */
  readonly extend: (bindings: ReadonlyArray<Binding>) => ReadonlyArray<Binding>;
}

/**
 * A step in the FOIL algorithm's NEW-CLAUSE subroutine.
 */
export interface FOILStep {
  /** Current body literals of the clause being built. */
  readonly clauseBody: ReadonlyArray<string>;
  /** Literal added at this step (null = final step). */
  readonly addedLiteral: string | null;
  /** Number of positive examples covered by current clause. */
  readonly posCovers: number;
  /** Number of negative examples covered by current clause. */
  readonly negCovers: number;
  /** FOIL gain of the chosen literal (0 if none chosen). */
  readonly foilGain: number;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Compute the FOIL information gain for adding a literal.
 * FOIL-Gain = t * (log2((p1/(p1+n1))) - log2((p0/(p0+n0))))
 * where t = number of positive bindings after adding the literal.
 * @complexity O(1)
 */
export function foilGain(
  p0: number,
  n0: number,
  p1: number,
  n1: number,
): number {
  if (p0 === 0 || p1 === 0) return 0;
  const before = p0 / (p0 + n0);
  const after = p1 / (p1 + n1);
  return p1 * (Math.log2(after) - Math.log2(before));
}

/**
 * Compute coverage (pos and neg count) of a set of extended bindings
 * against the original labelled examples.
 */
export function computeCoverage(
  extendedBindings: ReadonlyArray<Binding>,
  originalPos: ReadonlyArray<Binding>,
  originalNeg: ReadonlyArray<Binding>,
): { pos: number; neg: number } {
  // A binding tuple "covers" an original example if it extends that example
  // (i.e., the original x,y variables match)
  const posSet = new Set(originalPos.map(b => JSON.stringify(b)));
  const negSet = new Set(originalNeg.map(b => JSON.stringify(b)));
  const coveredPos = new Set<string>();
  const coveredNeg = new Set<string>();
  for (const b of extendedBindings) {
    const key = JSON.stringify({ x: b['x'], y: b['y'] });
    if (posSet.has(key)) coveredPos.add(key);
    if (negSet.has(key)) coveredNeg.add(key);
  }
  return { pos: coveredPos.size, neg: coveredNeg.size };
}

/**
 * Pre-built FOIL steps for the canonical Grandfather(x,y) learning problem.
 *
 * Family data (simplified):
 *   Father: (George,Elizabeth), (George,Margaret), (Philip,Charles), (Philip,Anne)
 *   Mother: (Elizabeth,Charles), (Elizabeth,Anne)
 *   Parent = Father ∪ Mother
 *
 * Target: Grandfather(x,y)
 * Positive: (George,Charles), (George,Anne), (Philip, …) [via background Parent]
 *
 * Returns the steps of FOIL, building the clause:
 *   Father(x,z) ∧ Parent(z,y) ⇒ Grandfather(x,y)
 *
 * @complexity O(1) — fixed example
 */
export function foilGrandparentSteps(): ReadonlyArray<FOILStep> {
  return [
    {
      clauseBody: [],
      addedLiteral: null,
      posCovers: 4,
      negCovers: 12,
      foilGain: 0,
      action: 'Start: empty body covers all 4 positive and 12 negative examples',
    },
    {
      clauseBody: [],
      addedLiteral: 'Father(x,z)',
      posCovers: 4,
      negCovers: 8,
      foilGain: foilGain(4, 12, 4, 8),
      action:
        'Add Father(x,z): restricts x to be a father. Covers 4 pos, 8 neg. FOIL-Gain = ' +
        foilGain(4, 12, 4, 8).toFixed(3),
    },
    {
      clauseBody: ['Father(x,z)'],
      addedLiteral: 'Parent(z,y)',
      posCovers: 4,
      negCovers: 0,
      foilGain: foilGain(4, 8, 4, 0),
      action:
        'Add Parent(z,y): requires z to be a parent of y. Covers 4 pos, 0 neg. Clause complete!',
    },
    {
      clauseBody: ['Father(x,z)', 'Parent(z,y)'],
      addedLiteral: null,
      posCovers: 4,
      negCovers: 0,
      foilGain: 0,
      action: 'Clause learned: Father(x,z) ∧ Parent(z,y) ⇒ Grandfather(x,y)',
    },
  ];
}

/**
 * Concrete family data for the FOIL Grandfather example.
 */
export interface FamilyData {
  father: ReadonlyArray<readonly [string, string]>;
  mother: ReadonlyArray<readonly [string, string]>;
  parent: ReadonlyArray<readonly [string, string]>;
  grandparentPos: ReadonlyArray<readonly [string, string]>;
  grandparentNeg: ReadonlyArray<readonly [string, string]>;
}

/**
 * Returns the concrete family dataset used in the FOIL demonstration.
 */
export function getFamilyData(): FamilyData {
  const father: Array<readonly [string, string]> = [
    ['George', 'Elizabeth'],
    ['George', 'Margaret'],
    ['Philip', 'Charles'],
    ['Philip', 'Anne'],
  ];
  const mother: Array<readonly [string, string]> = [
    ['Elizabeth', 'Charles'],
    ['Elizabeth', 'Anne'],
  ];
  const parent = [...father, ...mother];
  const grandparentPos: Array<readonly [string, string]> = [
    ['George', 'Charles'],
    ['George', 'Anne'],
    ['Philip', 'William'],  // Philip → Charles → William
    ['Philip', 'Harry'],
  ];
  // A sample of negative examples
  const grandparentNeg: Array<readonly [string, string]> = [
    ['George', 'Philip'],
    ['George', 'William'],
    ['Philip', 'Elizabeth'],
    ['Philip', 'Margaret'],
    ['Elizabeth', 'William'],
    ['Elizabeth', 'Harry'],
    ['Charles', 'Elizabeth'],
    ['Anne', 'George'],
    ['Margaret', 'Philip'],
    ['Philip', 'George'],
    ['Charles', 'Philip'],
    ['Anne', 'Philip'],
  ];
  return { father, mother, parent, grandparentPos, grandparentNeg };
}

/**
 * Check whether a conjunction of clause body literals (given as a string array)
 * covers a pair (x, y) using the family data.
 * Supported literals: 'Father(x,z)', 'Father(z,y)', 'Mother(x,z)', 'Mother(z,y)',
 * 'Parent(x,z)', 'Parent(z,y)'.
 */
export function clauseCovers(
  body: ReadonlyArray<string>,
  x: string,
  y: string,
  data: FamilyData,
): boolean {
  if (body.length === 0) return true;

  // Generate all possible bindings for z
  const people = [
    ...new Set([
      ...data.father.flatMap(p => [p[0], p[1]]),
      ...data.mother.flatMap(p => [p[0], p[1]]),
    ]),
  ];

  for (const z of people) {
    let ok = true;
    for (const literal of body) {
      if (!evalLiteral(literal, x, y, z, data)) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function evalLiteral(
  literal: string,
  x: string,
  y: string,
  z: string,
  data: FamilyData,
): boolean {
  const pairIn = (
    arr: ReadonlyArray<readonly [string, string]>,
    a: string,
    b: string,
  ) => arr.some(([p, q]) => p === a && q === b);

  switch (literal) {
    case 'Father(x,z)':
      return pairIn(data.father, x, z);
    case 'Father(z,y)':
      return pairIn(data.father, z, y);
    case 'Mother(x,z)':
      return pairIn(data.mother, x, z);
    case 'Mother(z,y)':
      return pairIn(data.mother, z, y);
    case 'Parent(x,z)':
      return pairIn(data.parent, x, z);
    case 'Parent(z,y)':
      return pairIn(data.parent, z, y);
    default:
      return false;
  }
}

/**
 * Compute how many positive / negative examples a clause body covers
 * given the family data.
 */
export function clauseCoverage(
  body: ReadonlyArray<string>,
  posExamples: ReadonlyArray<readonly [string, string]>,
  negExamples: ReadonlyArray<readonly [string, string]>,
  data: FamilyData,
): { pos: number; neg: number } {
  const pos = posExamples.filter(([x, y]) => clauseCovers(body, x, y, data)).length;
  const neg = negExamples.filter(([x, y]) => clauseCovers(body, x, y, data)).length;
  return { pos, neg };
}

