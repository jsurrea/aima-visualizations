/**
 * Chapter 19 — Learning from Examples
 *
 * Pure algorithm implementations: Decision Trees (ID3), Linear Regression,
 * k-Nearest Neighbors, Perceptron, and AdaBoost.
 *
 * @module algorithms
 */

// ─── Decision Tree (ID3) ──────────────────────────────────────────────────────

/** A labeled training example with string-valued attributes. */
export interface DTExample {
  /** Map of attribute name → attribute value. */
  readonly attributes: Readonly<Record<string, string>>;
  /** True for positive class, false for negative class. */
  readonly label: boolean;
}

/** A node in a learned decision tree. */
export interface DTNode {
  /** Splitting attribute (set for internal nodes). */
  readonly attribute?: string;
  /** Child subtrees keyed by attribute value (set for internal nodes). */
  readonly branches?: Readonly<Record<string, DTNode>>;
  /** Class label (set for leaf nodes). */
  readonly label?: boolean;
}

/** One step emitted by the step-by-step ID3 algorithm. */
export interface DTStep {
  /** Unique identifier for this node. */
  readonly nodeId: string;
  /** Parent node's ID (null for root). */
  readonly parentNodeId: string | null;
  /** Depth in the tree (root = 0). */
  readonly depth: number;
  /** Examples at this node. */
  readonly examples: ReadonlyArray<DTExample>;
  /** Remaining candidate attributes to split on. */
  readonly availableAttributes: ReadonlyArray<string>;
  /** Information gain for each available attribute, sorted descending. */
  readonly attributeGains: ReadonlyArray<{ readonly attribute: string; readonly gain: number }>;
  /** Best attribute chosen for splitting (null for leaf nodes). */
  readonly chosenAttribute: string | null;
  /** Class label assigned (null for internal nodes). */
  readonly leafLabel: boolean | null;
  /** The parent's splitting attribute (null for root). */
  readonly parentAttribute: string | null;
  /** The value of the parent's attribute that led to this branch (null for root). */
  readonly parentValue: string | null;
  /** Human-readable description of the action taken. */
  readonly action: string;
  /** Entropy H of the current example set. */
  readonly currentEntropyH: number;
  /** Count of positive-class examples. */
  readonly positiveCount: number;
  /** Count of negative-class examples. */
  readonly negativeCount: number;
}

/**
 * Binary entropy H(q) = −q log₂(q) − (1−q) log₂(1−q).
 * Accepts raw positive/negative counts for convenience.
 *
 * @param p - Number of positive examples.
 * @param n - Number of negative examples.
 * @returns Entropy in bits; 0 when p=0, n=0, or the other count is 0.
 * @complexity O(1)
 */
export function entropy(p: number, n: number): number {
  const total = p + n;
  if (total === 0) return 0;
  const pp = p / total;
  const pn = n / total;
  if (pp === 0 || pn === 0) return 0;
  return -(pp * Math.log2(pp) + pn * Math.log2(pn));
}

/**
 * Returns the majority label in an example set.
 * Ties go to positive (true).
 */
function pluralityValue(examples: ReadonlyArray<DTExample>): boolean {
  if (examples.length === 0) return false;
  const positives = examples.filter(e => e.label).length;
  return positives >= examples.length - positives;
}

/**
 * Information gain of splitting on a single attribute.
 * IG(A, examples) = H(examples) − Σ_v (|exs_v| / |examples|) · H(exs_v)
 *
 * @param attribute - Attribute name to evaluate.
 * @param examples  - Current example set.
 * @returns Information gain in bits (0 for empty example set).
 * @complexity O(|examples| · |values(A)|)
 */
export function informationGain(
  attribute: string,
  examples: ReadonlyArray<DTExample>,
): number {
  if (examples.length === 0) return 0;
  const p = examples.filter(e => e.label).length;
  const n = examples.length - p;
  const hBefore = entropy(p, n);

  const values = new Set<string>();
  for (const e of examples) {
    const v = e.attributes[attribute];
    if (v !== undefined) values.add(v);
  }

  let hAfter = 0;
  for (const v of values) {
    const subset = examples.filter(e => e.attributes[attribute] === v);
    const sp = subset.filter(e => e.label).length;
    const sn = subset.length - sp;
    hAfter += (subset.length / examples.length) * entropy(sp, sn);
  }

  return hBefore - hAfter;
}

/**
 * ID3 decision tree learning algorithm.
 * Recursively builds a tree by greedily choosing the maximum-information-gain
 * attribute at each node.
 *
 * @param examples       - Training examples at this node.
 * @param attributes     - Remaining candidate split attributes.
 * @param parentExamples - Examples from the parent (used for the empty-branch default).
 * @returns A DTNode representing the learned (sub)tree.
 * @complexity O(|attributes| · |examples|) per level, O(b^d) overall
 */
export function learnDecisionTree(
  examples: ReadonlyArray<DTExample>,
  attributes: ReadonlyArray<string>,
  parentExamples: ReadonlyArray<DTExample>,
): DTNode {
  if (examples.length === 0) {
    return { label: pluralityValue(parentExamples) };
  }

  const firstLabel = examples[0]!.label;
  if (examples.every(e => e.label === firstLabel)) {
    return { label: firstLabel };
  }

  if (attributes.length === 0) {
    return { label: pluralityValue(examples) };
  }

  let bestAttr = attributes[0]!;
  let bestGain = -Infinity;
  for (const attr of attributes) {
    const gain = informationGain(attr, examples);
    if (gain > bestGain) {
      bestGain = gain;
      bestAttr = attr;
    }
  }

  const values = new Set<string>();
  for (const e of examples) {
    const v = e.attributes[bestAttr];
    if (v !== undefined) {
      values.add(v);
    }
  }

  const remainingAttrs = attributes.filter(a => a !== bestAttr);
  const branches: Record<string, DTNode> = {};
  for (const v of values) {
    const subset = examples.filter(e => e.attributes[bestAttr] === v);
    branches[v] = learnDecisionTree(subset, remainingAttrs, examples);
  }

  return { attribute: bestAttr, branches };
}

/**
 * Generates a step-by-step trace of the ID3 algorithm for visualization.
 * Each step represents one node being expanded in the growing decision tree.
 *
 * @param examples   - Initial training examples.
 * @param attributes - Full set of attribute names.
 * @returns Immutable array of steps describing the tree-building process.
 * @complexity O(|attributes| · |examples|) per level
 */
export function learnDecisionTreeSteps(
  examples: ReadonlyArray<DTExample>,
  attributes: ReadonlyArray<string>,
): ReadonlyArray<DTStep> {
  const steps: DTStep[] = [];
  let nodeCounter = 0;

  function build(
    exs: ReadonlyArray<DTExample>,
    attrs: ReadonlyArray<string>,
    parentExs: ReadonlyArray<DTExample>,
    depth: number,
    parentNodeId: string | null,
    parentAttribute: string | null,
    parentValue: string | null,
  ): DTNode {
    const nodeId = `node-${nodeCounter++}`;
    const p = exs.filter(e => e.label).length;
    const n = exs.length - p;
    const currentEntropyH = entropy(p, n);

    if (exs.length === 0) {
      const leafLabel = pluralityValue(parentExs);
      steps.push({
        nodeId, parentNodeId, depth,
        examples: exs, availableAttributes: attrs,
        attributeGains: [], chosenAttribute: null, leafLabel,
        parentAttribute, parentValue,
        action: `Empty examples → default leaf`,
        currentEntropyH: 0, positiveCount: 0, negativeCount: 0,
      });
      return { label: leafLabel };
    }

    const firstLabel = exs[0]!.label;
    if (exs.every(e => e.label === firstLabel)) {
      steps.push({
        nodeId, parentNodeId, depth,
        examples: exs, availableAttributes: attrs,
        attributeGains: [], chosenAttribute: null, leafLabel: firstLabel,
        parentAttribute, parentValue,
        action: `All ${exs.length} examples → ${firstLabel ? 'Yes' : 'No'} leaf`,
        currentEntropyH: 0,
        positiveCount: firstLabel ? exs.length : 0,
        negativeCount: firstLabel ? 0 : exs.length,
      });
      return { label: firstLabel };
    }

    if (attrs.length === 0) {
      const leafLabel = pluralityValue(exs);
      steps.push({
        nodeId, parentNodeId, depth,
        examples: exs, availableAttributes: [],
        attributeGains: [], chosenAttribute: null, leafLabel,
        parentAttribute, parentValue,
        action: `No attributes remaining → plurality leaf (${leafLabel ? 'Yes' : 'No'})`,
        currentEntropyH, positiveCount: p, negativeCount: n,
      });
      return { label: leafLabel };
    }

    const attributeGains = attrs
      .map(attr => ({ attribute: attr, gain: informationGain(attr, exs) }))
      .sort((a, b) => b.gain - a.gain);

    const best = attributeGains[0]!;
    const bestAttr = best.attribute;

    steps.push({
      nodeId, parentNodeId, depth,
      examples: exs, availableAttributes: attrs,
      attributeGains, chosenAttribute: bestAttr, leafLabel: null,
      parentAttribute, parentValue,
      action: `Split on "${bestAttr}" (gain=${best.gain.toFixed(4)}, H=${currentEntropyH.toFixed(4)})`,
      currentEntropyH, positiveCount: p, negativeCount: n,
    });

    const values: string[] = [];
    for (const e of exs) {
      const v = e.attributes[bestAttr];
      if (v !== undefined && !values.includes(v)) values.push(v);
    }

    const remainingAttrs = attrs.filter(a => a !== bestAttr);
    const branches: Record<string, DTNode> = {};
    for (const v of values) {
      const subset = exs.filter(e => e.attributes[bestAttr] === v);
      branches[v] = build(subset, remainingAttrs, exs, depth + 1, nodeId, bestAttr, v);
    }
    return { attribute: bestAttr, branches };
  }

  build(examples, attributes, examples, 0, null, null, null);
  return steps;
}

// ─── Linear Regression (Gradient Descent) ────────────────────────────────────

/** State snapshot for one gradient-descent iteration. */
export interface LinearRegressionStep {
  /** Intercept (bias term w₀). */
  readonly w0: number;
  /** Slope (w₁). */
  readonly w1: number;
  /** Mean squared error on the training data. */
  readonly loss: number;
  /** Iteration index (0 = initial weights). */
  readonly iteration: number;
}

/**
 * Batch gradient descent for univariate linear regression.
 * Model: ŷ = w₁x + w₀.  Loss: MSE = (1/n) Σ(ŷᵢ − yᵢ)².
 *
 * @param data         - Training data as (x, y) pairs.
 * @param learningRate - Step size η.
 * @param epochs       - Number of gradient-descent iterations.
 * @returns One step per iteration (including iteration 0 = initial state).
 * @complexity O(epochs · n)
 */
export function linearRegressionGD(
  data: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  learningRate: number,
  epochs: number,
): ReadonlyArray<LinearRegressionStep> {
  const steps: LinearRegressionStep[] = [];

  if (data.length === 0) {
    return [{ w0: 0, w1: 0, loss: 0, iteration: 0 }];
  }

  let w0 = 0;
  let w1 = 0;

  const computeLoss = (): number => {
    const sumSq = data.reduce((s, pt) => {
      const err = (w0 + w1 * pt.x) - pt.y;
      return s + err * err;
    }, 0);
    return sumSq / data.length;
  };

  steps.push({ w0, w1, loss: computeLoss(), iteration: 0 });

  for (let i = 1; i <= epochs; i++) {
    let dw0 = 0;
    let dw1 = 0;
    for (const pt of data) {
      const err = (w0 + w1 * pt.x) - pt.y;
      dw0 += err;
      dw1 += err * pt.x;
    }
    w0 -= learningRate * (2 / data.length) * dw0;
    w1 -= learningRate * (2 / data.length) * dw1;
    steps.push({ w0, w1, loss: computeLoss(), iteration: i });
  }

  return steps;
}

// ─── k-Nearest Neighbors ─────────────────────────────────────────────────────

/** A labeled point in feature space. */
export interface KNNPoint {
  /** Feature vector. */
  readonly features: ReadonlyArray<number>;
  /** Class label string. */
  readonly label: string;
}

/**
 * Euclidean (L2) distance between two feature vectors.
 *
 * @param a - First feature vector.
 * @param b - Second feature vector (iterated up to a.length).
 * @returns L2 distance.
 * @complexity O(d)
 */
export function euclideanDistance(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;       // i < a.length: always defined
    const bi = b[i] ?? 0;   // b may be shorter; treat missing as 0
    sum += (ai - bi) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * k-Nearest Neighbors classifier.
 * Returns the plurality-vote prediction and the k nearest training points.
 *
 * @param training - Labeled training set.
 * @param query    - Query feature vector.
 * @param k        - Number of neighbors (clamped to training set size).
 * @returns Predicted label and array of neighbor descriptors.
 * @complexity O(n log n) where n = |training|
 */
export function knnClassify(
  training: ReadonlyArray<KNNPoint>,
  query: ReadonlyArray<number>,
  k: number,
): {
  readonly prediction: string;
  readonly neighbors: ReadonlyArray<{ readonly point: KNNPoint; readonly distance: number }>;
} {
  if (training.length === 0) {
    return { prediction: '', neighbors: [] };
  }

  const withDist = training
    .map(point => ({ point, distance: euclideanDistance(point.features, query) }))
    .sort((a, b) => a.distance - b.distance);

  const effectiveK = Math.min(k, training.length);
  const neighbors = withDist.slice(0, effectiveK);

  const votes = new Map<string, number>();
  for (const { point } of neighbors) {
    votes.set(point.label, (votes.get(point.label) ?? 0) + 1);
  }

  let prediction = '';
  let maxVotes = -1;
  for (const [label, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count;
      prediction = label;
    }
  }

  return { prediction, neighbors };
}

// ─── Perceptron ───────────────────────────────────────────────────────────────

/** State snapshot after one perceptron learning epoch. */
export interface PerceptronStep {
  /** Current weight vector. */
  readonly weights: ReadonlyArray<number>;
  /** Current bias. */
  readonly bias: number;
  /** Epoch index (0 = initial). */
  readonly iteration: number;
  /** Number of misclassified training examples in this epoch. */
  readonly misclassified: number;
}

/**
 * Perceptron learning algorithm (online updates, binary labels 0/1).
 * Stops early when all examples are correctly classified.
 *
 * @param data         - Training data; labels must be 0 or 1.
 * @param learningRate - Learning rate η.
 * @param maxEpochs    - Maximum number of training epochs.
 * @returns Step snapshots, one per epoch (including epoch 0 = initial weights).
 * @complexity O(maxEpochs · n · d)
 */
export function perceptronLearn(
  data: ReadonlyArray<{ readonly features: ReadonlyArray<number>; readonly label: number }>,
  learningRate: number,
  maxEpochs: number,
): ReadonlyArray<PerceptronStep> {
  const steps: PerceptronStep[] = [];

  if (data.length === 0) {
    return [{ weights: [], bias: 0, iteration: 0, misclassified: 0 }];
  }

  const dim = data[0]!.features.length;
  let weights: number[] = new Array<number>(dim).fill(0);
  let bias = 0;

  const countMisclassified = (): number =>
    data.filter(d => {
      let dot = bias;
      for (let i = 0; i < weights.length; i++) {
        dot += weights[i]! * d.features[i]!;  // i < dim = features.length
      }
      return (dot >= 0 ? 1 : 0) !== d.label;
    }).length;

  steps.push({ weights: [...weights], bias, iteration: 0, misclassified: countMisclassified() });

  for (let epoch = 1; epoch <= maxEpochs; epoch++) {
    let changed = false;
    for (const d of data) {
      let dot = bias;
      for (let i = 0; i < weights.length; i++) {
        dot += weights[i]! * d.features[i]!;  // i < dim = features.length
      }
      const pred = dot >= 0 ? 1 : 0;
      if (pred !== d.label) {
        const err = d.label - pred;
        weights = weights.map((w, i) => w + learningRate * err * d.features[i]!);
        bias += learningRate * err;
        changed = true;
      }
    }
    steps.push({
      weights: [...weights],
      bias,
      iteration: epoch,
      misclassified: countMisclassified(),
    });
    if (!changed) break;
  }

  return steps;
}

// ─── AdaBoost (decision stumps) ───────────────────────────────────────────────

/** State snapshot after one AdaBoost boosting round. */
export interface BoostStep {
  /** Round index (1-based). */
  readonly round: number;
  /** Feature index used by the winning decision stump. */
  readonly stumpFeature: number;
  /** Threshold value of the winning decision stump. */
  readonly stumpThreshold: number;
  /** Stump polarity: +1 → predict +1 when feature ≥ threshold; −1 → opposite. */
  readonly stumpPolarity: number;
  /** Stump weight α in the ensemble. */
  readonly alpha: number;
  /** Updated (normalized) sample weight distribution after this round. */
  readonly weights: ReadonlyArray<number>;
  /** Weighted training error of the stump before updating weights. */
  readonly error: number;
}

/**
 * AdaBoost with decision stumps (1-level trees on a single feature).
 * Uses ±1 labels internally (input labels 0/1 are mapped to −1/+1).
 *
 * @param data   - Training data; labels should be 0 or 1.
 * @param rounds - Number of boosting rounds T.
 * @returns One BoostStep per round; empty array when data is empty or rounds ≤ 0.
 * @complexity O(rounds · n · d · |unique values per feature|)
 */
export function adaBoost(
  data: ReadonlyArray<{ readonly features: ReadonlyArray<number>; readonly label: number }>,
  rounds: number,
): ReadonlyArray<BoostStep> {
  if (data.length === 0 || rounds <= 0) return [];

  const m = data.length;
  let weights: number[] = new Array<number>(m).fill(1 / m);
  const steps: BoostStep[] = [];
  const dim = data[0]!.features.length;

  for (let t = 0; t < rounds; t++) {
    let bestError = Infinity;
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestPolarity = 1;

    for (let f = 0; f < dim; f++) {
      const featureValues = data.map(d => d.features[f]!);
      const sortedUnique = [...new Set(featureValues)].sort((a, b) => a - b);

      for (const threshold of sortedUnique) {
        for (const polarity of [1, -1]) {
          let error = 0;
          for (let i = 0; i < m; i++) {
            const feat = data[i]!.features[f]!;
            const pred = polarity * (feat - threshold) >= 0 ? 1 : -1;
            const actual = data[i]!.label === 1 ? 1 : -1;
            if (pred !== actual) error += weights[i]!;
          }
          if (error < bestError) {
            bestError = error;
            bestFeature = f;
            bestThreshold = threshold;
            bestPolarity = polarity;
          }
        }
      }
    }

    const clippedError = Math.max(bestError, 1e-10);
    const alpha = 0.5 * Math.log((1 - clippedError) / clippedError);

    const newWeights: number[] = [];
    let weightSum = 0;
    for (let i = 0; i < m; i++) {
      const feat = data[i]!.features[bestFeature]!;
      const pred = bestPolarity * (feat - bestThreshold) >= 0 ? 1 : -1;
      const actual = data[i]!.label === 1 ? 1 : -1;
      const w = weights[i]! * Math.exp(-alpha * actual * pred);
      newWeights.push(w);
      weightSum += w;
    }
    weights = newWeights.map(w => w / weightSum);

    steps.push({
      round: t + 1,
      stumpFeature: bestFeature,
      stumpThreshold: bestThreshold,
      stumpPolarity: bestPolarity,
      alpha,
      weights: [...weights],
      error: bestError,
    });
  }

  return steps;
}
