import { describe, it, expect } from 'vitest';
import {
  entropy,
  informationGain,
  learnDecisionTree,
  learnDecisionTreeSteps,
  linearRegressionGD,
  euclideanDistance,
  knnClassify,
  perceptronLearn,
  adaBoost,
  type DTExample,
} from '../src/algorithms/index';

// ─── Restaurant dataset (Table 19.2, AIMA 4th ed.) ───────────────────────────

const RESTAURANT: ReadonlyArray<DTExample> = [
  { attributes: { Alt: 'Yes', Bar: 'No',  Fri: 'No',  Hun: 'Yes', Pat: 'Some', Price: '$$$', Rain: 'No',  Res: 'Yes', Type: 'French', Est: '0-10'  }, label: true  },
  { attributes: { Alt: 'Yes', Bar: 'No',  Fri: 'No',  Hun: 'Yes', Pat: 'Full', Price: '$',   Rain: 'No',  Res: 'No',  Type: 'Thai',   Est: '30-60' }, label: false },
  { attributes: { Alt: 'No',  Bar: 'Yes', Fri: 'No',  Hun: 'No',  Pat: 'Some', Price: '$',   Rain: 'No',  Res: 'No',  Type: 'Burger', Est: '0-10'  }, label: true  },
  { attributes: { Alt: 'Yes', Bar: 'No',  Fri: 'Yes', Hun: 'Yes', Pat: 'Full', Price: '$',   Rain: 'Yes', Res: 'No',  Type: 'Thai',   Est: '10-30' }, label: true  },
  { attributes: { Alt: 'Yes', Bar: 'No',  Fri: 'Yes', Hun: 'No',  Pat: 'Full', Price: '$$$', Rain: 'No',  Res: 'Yes', Type: 'French', Est: '>60'   }, label: false },
  { attributes: { Alt: 'No',  Bar: 'Yes', Fri: 'No',  Hun: 'Yes', Pat: 'Some', Price: '$$',  Rain: 'Yes', Res: 'Yes', Type: 'Italian',Est: '0-10'  }, label: true  },
  { attributes: { Alt: 'No',  Bar: 'Yes', Fri: 'No',  Hun: 'No',  Pat: 'None', Price: '$',   Rain: 'Yes', Res: 'No',  Type: 'Burger', Est: '0-10'  }, label: false },
  { attributes: { Alt: 'No',  Bar: 'No',  Fri: 'No',  Hun: 'Yes', Pat: 'Some', Price: '$$',  Rain: 'Yes', Res: 'Yes', Type: 'Thai',   Est: '0-10'  }, label: true  },
  { attributes: { Alt: 'No',  Bar: 'Yes', Fri: 'Yes', Hun: 'No',  Pat: 'Full', Price: '$',   Rain: 'Yes', Res: 'No',  Type: 'Burger', Est: '>60'   }, label: false },
  { attributes: { Alt: 'Yes', Bar: 'Yes', Fri: 'Yes', Hun: 'Yes', Pat: 'Full', Price: '$$$', Rain: 'No',  Res: 'Yes', Type: 'Italian',Est: '10-30' }, label: false },
  { attributes: { Alt: 'No',  Bar: 'No',  Fri: 'No',  Hun: 'No',  Pat: 'None', Price: '$',   Rain: 'No',  Res: 'No',  Type: 'Thai',   Est: '0-10'  }, label: false },
  { attributes: { Alt: 'Yes', Bar: 'Yes', Fri: 'Yes', Hun: 'Yes', Pat: 'Full', Price: '$',   Rain: 'No',  Res: 'No',  Type: 'Burger', Est: '30-60' }, label: true  },
];

const ATTRIBUTES = ['Alt','Bar','Fri','Hun','Pat','Price','Rain','Res','Type','Est'];

// ─── entropy ─────────────────────────────────────────────────────────────────

describe('entropy', () => {
  it('returns 0 when total is 0', () => {
    expect(entropy(0, 0)).toBe(0);
  });

  it('returns 0 when all examples are positive', () => {
    expect(entropy(5, 0)).toBe(0);
  });

  it('returns 0 when all examples are negative', () => {
    expect(entropy(0, 5)).toBe(0);
  });

  it('returns 1 for equal split (max entropy)', () => {
    expect(entropy(6, 6)).toBeCloseTo(1.0, 10);
  });

  it('returns a valid value for 3 positives, 1 negative', () => {
    const h = entropy(3, 1);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
    expect(h).toBeCloseTo(0.8113, 3);
  });

  it('returns a valid value for 9 positives, 5 negatives', () => {
    const h = entropy(9, 5);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
  });
});

// ─── informationGain ─────────────────────────────────────────────────────────

describe('informationGain', () => {
  it('returns 0 for empty examples', () => {
    expect(informationGain('Alt', [])).toBe(0);
  });

  it('returns positive gain for an informative attribute', () => {
    const gain = informationGain('Pat', RESTAURANT);
    expect(gain).toBeGreaterThan(0);
  });

  it('returns 0 gain for a useless attribute (all same value)', () => {
    const exs: DTExample[] = [
      { attributes: { X: 'a' }, label: true },
      { attributes: { X: 'a' }, label: false },
    ];
    // All have the same value, so entropy after split equals entropy before
    const gain = informationGain('X', exs);
    expect(gain).toBeCloseTo(0, 10);
  });

  it('returns full entropy gain for a perfectly separating attribute', () => {
    const exs: DTExample[] = [
      { attributes: { X: 'yes' }, label: true },
      { attributes: { X: 'yes' }, label: true },
      { attributes: { X: 'no' }, label: false },
      { attributes: { X: 'no' }, label: false },
    ];
    const gain = informationGain('X', exs);
    expect(gain).toBeCloseTo(1.0, 10);
  });

  it('Pat has the highest gain on the restaurant dataset', () => {
    const patGain = informationGain('Pat', RESTAURANT);
    for (const attr of ATTRIBUTES) {
      if (attr !== 'Pat') {
        expect(patGain).toBeGreaterThanOrEqual(informationGain(attr, RESTAURANT));
      }
    }
  });
});

// ─── learnDecisionTree ───────────────────────────────────────────────────────

describe('learnDecisionTree', () => {
  it('empty examples → plurality of parentExamples (majority positive)', () => {
    const parent: DTExample[] = [
      { attributes: {}, label: true },
      { attributes: {}, label: true },
    ];
    const node = learnDecisionTree([], [], parent);
    expect(node.label).toBe(true);
  });

  it('empty examples → plurality of parentExamples (majority negative)', () => {
    const parent: DTExample[] = [
      { attributes: {}, label: false },
      { attributes: {}, label: false },
    ];
    const node = learnDecisionTree([], [], parent);
    expect(node.label).toBe(false);
  });

  it('empty examples with empty parentExamples → false (default)', () => {
    const node = learnDecisionTree([], [], []);
    expect(node.label).toBe(false);
  });

  it('all same positive label → leaf true', () => {
    const exs: DTExample[] = [
      { attributes: { A: 'x' }, label: true },
      { attributes: { A: 'y' }, label: true },
    ];
    const node = learnDecisionTree(exs, ['A'], []);
    expect(node.label).toBe(true);
  });

  it('all same negative label → leaf false', () => {
    const exs: DTExample[] = [
      { attributes: { A: 'x' }, label: false },
      { attributes: { A: 'y' }, label: false },
    ];
    const node = learnDecisionTree(exs, ['A'], []);
    expect(node.label).toBe(false);
  });

  it('no attributes remaining → plurality leaf (majority positive)', () => {
    const exs: DTExample[] = [
      { attributes: {}, label: true },
      { attributes: {}, label: true },
      { attributes: {}, label: false },
    ];
    const node = learnDecisionTree(exs, [], []);
    expect(node.label).toBe(true);
  });

  it('no attributes remaining → plurality leaf (majority negative)', () => {
    const exs: DTExample[] = [
      { attributes: {}, label: false },
      { attributes: {}, label: false },
      { attributes: {}, label: true },
    ];
    const node = learnDecisionTree(exs, [], []);
    expect(node.label).toBe(false);
  });

  it('no attributes remaining → tie goes to positive', () => {
    const exs: DTExample[] = [
      { attributes: {}, label: true },
      { attributes: {}, label: false },
    ];
    const node = learnDecisionTree(exs, [], []);
    expect(node.label).toBe(true);
  });

  it('restaurant dataset: root splits on Pat', () => {
    const tree = learnDecisionTree(RESTAURANT, ATTRIBUTES, []);
    expect(tree.attribute).toBe('Pat');
    expect(tree.branches).toBeDefined();
  });

  it('restaurant dataset: Pat=Some branch is a leaf Yes', () => {
    const tree = learnDecisionTree(RESTAURANT, ATTRIBUTES, []);
    const someBranch = tree.branches?.['Some'];
    expect(someBranch?.label).toBe(true);
  });

  it('restaurant dataset: Pat=None branch is a leaf No', () => {
    const tree = learnDecisionTree(RESTAURANT, ATTRIBUTES, []);
    const noneBranch = tree.branches?.['None'];
    expect(noneBranch?.label).toBe(false);
  });

  it('restaurant dataset: Pat=Full branch is an internal node', () => {
    const tree = learnDecisionTree(RESTAURANT, ATTRIBUTES, []);
    const fullBranch = tree.branches?.['Full'];
    expect(fullBranch?.attribute).toBeDefined();
    expect(fullBranch?.label).toBeUndefined();
  });

  it('handles examples with missing attribute values', () => {
    // exs[1] has no 'A' attribute → v is undefined when e.attributes['A'] is accessed
    const exs: DTExample[] = [
      { attributes: { A: 'x' }, label: true },
      { attributes: {}, label: false },   // no 'A' attribute
    ];
    const tree = learnDecisionTree(exs, ['A'], []);
    // Should split on A (only value 'x' is found)
    expect(tree.attribute).toBe('A');
    expect(tree.branches?.['x']?.label).toBe(true);
  });

  it('simple perfectly separable 1-attribute dataset', () => {
    const exs: DTExample[] = [
      { attributes: { color: 'red' }, label: true },
      { attributes: { color: 'blue' }, label: false },
    ];
    const tree = learnDecisionTree(exs, ['color'], []);
    expect(tree.attribute).toBe('color');
    expect(tree.branches?.['red']?.label).toBe(true);
    expect(tree.branches?.['blue']?.label).toBe(false);
  });
});

// ─── learnDecisionTreeSteps ──────────────────────────────────────────────────

describe('learnDecisionTreeSteps', () => {
  it('empty examples → single step (empty-branch leaf)', () => {
    const steps = learnDecisionTreeSteps([], ['A']);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toContain('Empty examples');
    expect(steps[0]!.leafLabel).toBe(false);
    expect(steps[0]!.parentNodeId).toBeNull();
  });

  it('all same label → single step (pure leaf)', () => {
    const exs: DTExample[] = [
      { attributes: { A: 'x' }, label: true },
      { attributes: { A: 'y' }, label: true },
    ];
    const steps = learnDecisionTreeSteps(exs, ['A']);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.leafLabel).toBe(true);
    expect(steps[0]!.chosenAttribute).toBeNull();
  });

  it('returns single step with false label when all examples are negative', () => {
    const exs: DTExample[] = [
      { attributes: { A: 'x' }, label: false },
      { attributes: { A: 'y' }, label: false },
    ];
    const steps = learnDecisionTreeSteps(exs, ['A']);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.leafLabel).toBe(false);
    expect(steps[0]!.positiveCount).toBe(0);
    expect(steps[0]!.negativeCount).toBe(2);
  });


  it('no attributes → single step (plurality leaf)', () => {
    const exs: DTExample[] = [
      { attributes: {}, label: false },
      { attributes: {}, label: false },
      { attributes: {}, label: true },
    ];
    const steps = learnDecisionTreeSteps(exs, []);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.leafLabel).toBe(false);
    expect(steps[0]!.action).toContain('No attributes');
  });

  it('no attributes → plurality true when tied', () => {
    const exs: DTExample[] = [
      { attributes: {}, label: true },
      { attributes: {}, label: false },
    ];
    const steps = learnDecisionTreeSteps(exs, []);
    expect(steps[0]!.leafLabel).toBe(true);
  });

  it('normal split → first step has chosenAttribute set', () => {
    const exs: DTExample[] = [
      { attributes: { color: 'red' }, label: true },
      { attributes: { color: 'blue' }, label: false },
    ];
    const steps = learnDecisionTreeSteps(exs, ['color']);
    expect(steps[0]!.chosenAttribute).toBe('color');
    expect(steps[0]!.attributeGains).toHaveLength(1);
    expect(steps[0]!.parentNodeId).toBeNull();
  });

  it('child steps have parentNodeId set', () => {
    const exs: DTExample[] = [
      { attributes: { color: 'red' }, label: true },
      { attributes: { color: 'blue' }, label: false },
    ];
    const steps = learnDecisionTreeSteps(exs, ['color']);
    expect(steps.length).toBeGreaterThan(1);
    const childStep = steps[1]!;
    expect(childStep.parentNodeId).toBe(steps[0]!.nodeId);
  });

  it('restaurant dataset: generates at least 10 steps', () => {
    const steps = learnDecisionTreeSteps(RESTAURANT, ATTRIBUTES);
    expect(steps.length).toBeGreaterThan(10);
  });

  it('restaurant dataset: first step splits on Pat', () => {
    const steps = learnDecisionTreeSteps(RESTAURANT, ATTRIBUTES);
    expect(steps[0]!.chosenAttribute).toBe('Pat');
  });

  it('restaurant dataset: all steps have valid nodeIds', () => {
    const steps = learnDecisionTreeSteps(RESTAURANT, ATTRIBUTES);
    const ids = new Set(steps.map(s => s.nodeId));
    expect(ids.size).toBe(steps.length);
  });

  it('entropy and counts are consistent', () => {
    const exs: DTExample[] = [
      { attributes: { A: 'x', B: 'p' }, label: true },
      { attributes: { A: 'x', B: 'q' }, label: false },
      { attributes: { A: 'y', B: 'p' }, label: true },
    ];
    const steps = learnDecisionTreeSteps(exs, ['A', 'B']);
    const root = steps[0]!;
    expect(root.positiveCount + root.negativeCount).toBe(exs.length);
  });
});

// ─── linearRegressionGD ──────────────────────────────────────────────────────

describe('linearRegressionGD', () => {
  it('empty data → returns single zero step', () => {
    const steps = linearRegressionGD([], 0.01, 10);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.w0).toBe(0);
    expect(steps[0]!.w1).toBe(0);
    expect(steps[0]!.loss).toBe(0);
    expect(steps[0]!.iteration).toBe(0);
  });

  it('returns epochs+1 steps for normal data', () => {
    const data = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }];
    const steps = linearRegressionGD(data, 0.01, 50);
    expect(steps).toHaveLength(51);
  });

  it('first step has iteration 0', () => {
    const data = [{ x: 0, y: 1 }];
    const steps = linearRegressionGD(data, 0.01, 5);
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.w0).toBe(0);
    expect(steps[0]!.w1).toBe(0);
  });

  it('loss decreases on a simple linear dataset', () => {
    const data = [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }];
    const steps = linearRegressionGD(data, 0.05, 200);
    const firstLoss = steps[0]!.loss;
    const lastLoss = steps[steps.length - 1]!.loss;
    expect(lastLoss).toBeLessThan(firstLoss);
  });

  it('converges on y=2x+1', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 2 * i + 1 }));
    const steps = linearRegressionGD(data, 0.005, 2000);
    const last = steps[steps.length - 1]!;
    expect(last.loss).toBeLessThan(0.01);
  });
});

// ─── euclideanDistance ───────────────────────────────────────────────────────

describe('euclideanDistance', () => {
  it('returns 0 for identical vectors', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('3-4-5 triangle', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 10);
  });

  it('1D distance', () => {
    expect(euclideanDistance([7], [3])).toBeCloseTo(4, 10);
  });

  it('handles shorter b (treats missing as 0)', () => {
    // a=[3,4], b=[0] → √(9+16) = 5
    expect(euclideanDistance([3, 4], [0])).toBeCloseTo(5, 10);
  });

  it('handles empty vectors', () => {
    expect(euclideanDistance([], [])).toBe(0);
  });
});

// ─── knnClassify ─────────────────────────────────────────────────────────────

describe('knnClassify', () => {
  it('empty training set → empty prediction', () => {
    const result = knnClassify([], [0, 0], 3);
    expect(result.prediction).toBe('');
    expect(result.neighbors).toHaveLength(0);
  });

  it('k=1 returns nearest neighbor', () => {
    const training = [
      { features: [0, 0], label: 'A' },
      { features: [10, 10], label: 'B' },
    ];
    const result = knnClassify(training, [0.1, 0.1], 1);
    expect(result.prediction).toBe('A');
    expect(result.neighbors).toHaveLength(1);
  });

  it('k > training size uses all points', () => {
    const training = [
      { features: [0], label: 'A' },
      { features: [1], label: 'B' },
    ];
    const result = knnClassify(training, [0.4], 10);
    expect(result.neighbors).toHaveLength(2);
  });

  it('k=3 plurality vote', () => {
    const training = [
      { features: [0, 0], label: 'A' },
      { features: [1, 0], label: 'A' },
      { features: [0, 1], label: 'A' },
      { features: [5, 5], label: 'B' },
      { features: [6, 5], label: 'B' },
    ];
    const result = knnClassify(training, [0.5, 0.5], 3);
    expect(result.prediction).toBe('A');
    expect(result.neighbors).toHaveLength(3);
  });

  it('distances are correctly ordered ascending', () => {
    const training = [
      { features: [3], label: 'far' },
      { features: [1], label: 'near' },
      { features: [2], label: 'mid' },
    ];
    const result = knnClassify(training, [0], 3);
    expect(result.neighbors[0]!.point.label).toBe('near');
    expect(result.neighbors[1]!.point.label).toBe('mid');
    expect(result.neighbors[2]!.point.label).toBe('far');
  });
});

// ─── perceptronLearn ─────────────────────────────────────────────────────────

describe('perceptronLearn', () => {
  it('empty data → single initial step', () => {
    const steps = perceptronLearn([], 0.1, 100);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.weights).toHaveLength(0);
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.misclassified).toBe(0);
  });

  it('linearly separable data converges (early stopping)', () => {
    // Simple 1D: positive → 1, negative → 0
    const data = [
      { features: [2], label: 1 },
      { features: [-2], label: 0 },
    ];
    const steps = perceptronLearn(data, 1.0, 100);
    // Should converge before 100 epochs
    const lastStep = steps[steps.length - 1]!;
    expect(lastStep.misclassified).toBe(0);
    expect(steps.length).toBeLessThan(101);
  });

  it('early stopping: fewer steps than maxEpochs when convergent', () => {
    const data = [
      { features: [2], label: 1 },
      { features: [-2], label: 0 },
    ];
    const steps = perceptronLearn(data, 1.0, 1000);
    // converges before 1000 epochs, so we get fewer steps
    expect(steps.length).toBeLessThan(1001);
  });

  it('non-convergent data runs all epochs', () => {
    // XOR is not linearly separable
    const xor = [
      { features: [0, 0], label: 0 },
      { features: [0, 1], label: 1 },
      { features: [1, 0], label: 1 },
      { features: [1, 1], label: 0 },
    ];
    const steps = perceptronLearn(xor, 0.1, 5);
    // All 5 epochs run, never breaks early (plus epoch-0 initial step = 6)
    expect(steps).toHaveLength(6);
  });

  it('first step has iteration 0 with zero weights', () => {
    const data = [{ features: [1, 2], label: 1 }];
    const steps = perceptronLearn(data, 0.1, 5);
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.weights).toEqual([0, 0]);
    expect(steps[0]!.bias).toBe(0);
  });

  it('weights update correctly on single misclassified example', () => {
    // w=0, b=0, x=[1], label=0 → dot=0 >= 0 → pred=1 → err=-1
    // w -= 0.1*(-1)*1 = 0.1... wait: w += lr*err*x = 0.1*(-1)*1 = -0.1
    // bias += lr*err = 0.1*(-1) = -0.1
    const data = [{ features: [1], label: 0 }];
    const steps = perceptronLearn(data, 0.1, 1);
    expect(steps).toHaveLength(2);
    expect(steps[1]!.weights[0]).toBeCloseTo(-0.1, 10);
    expect(steps[1]!.bias).toBeCloseTo(-0.1, 10);
  });
});

// ─── adaBoost ────────────────────────────────────────────────────────────────

describe('adaBoost', () => {
  it('empty data → empty steps', () => {
    expect(adaBoost([], 5)).toHaveLength(0);
  });

  it('rounds=0 → empty steps', () => {
    const data = [{ features: [1, 0], label: 1 }, { features: [0, 1], label: 0 }];
    expect(adaBoost(data, 0)).toHaveLength(0);
  });

  it('rounds=-1 → empty steps (negative rounds treated as ≤0)', () => {
    const data = [{ features: [1], label: 1 }];
    expect(adaBoost(data, -1)).toHaveLength(0);
  });

  it('returns correct number of rounds', () => {
    const data = [
      { features: [1], label: 1 },
      { features: [2], label: 1 },
      { features: [3], label: 0 },
      { features: [4], label: 0 },
    ];
    const steps = adaBoost(data, 3);
    expect(steps).toHaveLength(3);
  });

  it('round index is 1-based', () => {
    const data = [
      { features: [0], label: 0 },
      { features: [1], label: 1 },
      { features: [2], label: 1 },
    ];
    const steps = adaBoost(data, 2);
    expect(steps[0]!.round).toBe(1);
    expect(steps[1]!.round).toBe(2);
  });

  it('weights sum to approximately 1 after each round', () => {
    const data = [
      { features: [0.0], label: 0 },
      { features: [0.5], label: 0 },
      { features: [1.5], label: 1 },
      { features: [2.0], label: 1 },
    ];
    const steps = adaBoost(data, 3);
    for (const step of steps) {
      const sum = step.weights.reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('error is between 0 and 1', () => {
    const data = [
      { features: [1, 0], label: 1 },
      { features: [0, 1], label: 0 },
      { features: [2, 0], label: 1 },
      { features: [0, 2], label: 0 },
    ];
    const steps = adaBoost(data, 4);
    for (const step of steps) {
      expect(step.error).toBeGreaterThanOrEqual(0);
      expect(step.error).toBeLessThanOrEqual(1);
    }
  });

  it('alpha is finite for non-trivial error', () => {
    const data = [
      { features: [1], label: 1 },
      { features: [-1], label: 0 },
      { features: [2], label: 1 },
      { features: [-2], label: 0 },
    ];
    const steps = adaBoost(data, 2);
    for (const step of steps) {
      expect(isFinite(step.alpha)).toBe(true);
    }
  });

  it('stumpFeature is a valid feature index', () => {
    const data = [
      { features: [1, 2], label: 1 },
      { features: [3, 4], label: 0 },
    ];
    const steps = adaBoost(data, 2);
    for (const step of steps) {
      expect(step.stumpFeature).toBeGreaterThanOrEqual(0);
      expect(step.stumpFeature).toBeLessThan(2);
    }
  });
});
