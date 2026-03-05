import { describe, it, expect } from 'vitest';
import {
  computeFairnessMetrics,
  hasDemographicParity,
  hasEqualOpportunity,
  isWellCalibrated,
  computeKAnonymity,
  generalizeField,
  laplaceNoise,
  laplaceNoiseStdDev,
  faultTreeProbability,
  valueAlignmentScore,
  lowImpactUtility,
  type Prediction,
  type DatabaseRecord,
  type FaultTreeNode,
  type AlignmentScenario,
} from '../src/algorithms/index';

// ─── computeFairnessMetrics ───────────────────────────────────────────────────

describe('computeFairnessMetrics', () => {
  const preds: Prediction[] = [
    // Group A: 2 TP, 1 FP, 1 TN, 1 FN
    { predicted: true,  actual: true,  group: 'A' },
    { predicted: true,  actual: true,  group: 'A' },
    { predicted: true,  actual: false, group: 'A' },
    { predicted: false, actual: false, group: 'A' },
    { predicted: false, actual: true,  group: 'A' },
    // Group B: 1 TP, 2 FP, 1 TN, 1 FN
    { predicted: true,  actual: true,  group: 'B' },
    { predicted: true,  actual: false, group: 'B' },
    { predicted: true,  actual: false, group: 'B' },
    { predicted: false, actual: false, group: 'B' },
    { predicted: false, actual: true,  group: 'B' },
  ];

  it('returns one result per group', () => {
    const result = computeFairnessMetrics(preds);
    expect(result.length).toBe(2);
    const groups = result.map(r => r.group).sort();
    expect(groups).toEqual(['A', 'B']);
  });

  it('computes confusion matrix correctly for group A', () => {
    const result = computeFairnessMetrics(preds);
    const a = result.find(r => r.group === 'A')!;
    expect(a.confusion.tp).toBe(2);
    expect(a.confusion.fp).toBe(1);
    expect(a.confusion.tn).toBe(1);
    expect(a.confusion.fn).toBe(1);
  });

  it('computes confusion matrix correctly for group B', () => {
    const result = computeFairnessMetrics(preds);
    const b = result.find(r => r.group === 'B')!;
    expect(b.confusion.tp).toBe(1);
    expect(b.confusion.fp).toBe(2);
    expect(b.confusion.tn).toBe(1);
    expect(b.confusion.fn).toBe(1);
  });

  it('computes TPR correctly: TP / (TP + FN)', () => {
    const result = computeFairnessMetrics(preds);
    const a = result.find(r => r.group === 'A')!;
    expect(a.tpr).toBeCloseTo(2 / 3, 5);
  });

  it('computes FPR correctly: FP / (FP + TN)', () => {
    const result = computeFairnessMetrics(preds);
    const a = result.find(r => r.group === 'A')!;
    expect(a.fpr).toBeCloseTo(1 / 2, 5);
  });

  it('computes PPV correctly: TP / (TP + FP)', () => {
    const result = computeFairnessMetrics(preds);
    const a = result.find(r => r.group === 'A')!;
    expect(a.ppv).toBeCloseTo(2 / 3, 5);
  });

  it('computes positiveRate correctly: (TP + FP) / total', () => {
    const result = computeFairnessMetrics(preds);
    const a = result.find(r => r.group === 'A')!;
    expect(a.positiveRate).toBeCloseTo(3 / 5, 5);
  });

  it('handles zero TP + FN (TPR = 0)', () => {
    const p: Prediction[] = [
      { predicted: true, actual: false, group: 'X' },
      { predicted: false, actual: false, group: 'X' },
    ];
    const [r] = computeFairnessMetrics(p);
    expect(r!.tpr).toBe(0);
  });

  it('handles zero FP + TN (FPR = 0)', () => {
    const p: Prediction[] = [
      { predicted: true, actual: true, group: 'X' },
      { predicted: false, actual: true, group: 'X' },
    ];
    const [r] = computeFairnessMetrics(p);
    expect(r!.fpr).toBe(0);
  });

  it('handles zero TP + FP (PPV = 0)', () => {
    const p: Prediction[] = [
      { predicted: false, actual: true, group: 'X' },
      { predicted: false, actual: false, group: 'X' },
    ];
    const [r] = computeFairnessMetrics(p);
    expect(r!.ppv).toBe(0);
  });

  it('handles zero total predictions (positiveRate = 0)', () => {
    // Force zero-total edge by passing empty array (no groups produced)
    const result = computeFairnessMetrics([]);
    expect(result).toEqual([]);
  });

  it('handles a single prediction', () => {
    const p: Prediction[] = [{ predicted: true, actual: true, group: 'solo' }];
    const [r] = computeFairnessMetrics(p);
    expect(r!.tpr).toBe(1);
    expect(r!.positiveRate).toBe(1);
  });
});

// ─── hasDemographicParity ────────────────────────────────────────────────────

describe('hasDemographicParity', () => {
  const metrics = [
    { group: 'X', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv:0, positiveRate: 0.5 },
    { group: 'Y', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv:0, positiveRate: 0.52 },
    { group: 'Z', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv:0, positiveRate: 0.7 },
  ];

  it('returns true when difference is within tolerance', () => {
    expect(hasDemographicParity(metrics, 'X', 'Y', 0.05)).toBe(true);
  });

  it('returns false when difference exceeds tolerance', () => {
    expect(hasDemographicParity(metrics, 'X', 'Z', 0.05)).toBe(false);
  });

  it('returns false when a group is not found', () => {
    expect(hasDemographicParity(metrics, 'X', 'MISSING', 0.05)).toBe(false);
    expect(hasDemographicParity(metrics, 'MISSING', 'Y', 0.05)).toBe(false);
  });

  it('uses default tolerance of 0.05', () => {
    expect(hasDemographicParity(metrics, 'X', 'Y')).toBe(true);
  });
});

// ─── hasEqualOpportunity ─────────────────────────────────────────────────────

describe('hasEqualOpportunity', () => {
  const metrics = [
    { group: 'A', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr: 0.8, fpr:0, ppv:0, positiveRate:0 },
    { group: 'B', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr: 0.5, fpr:0, ppv:0, positiveRate:0 },
  ];

  it('returns false when TPRs differ by more than tolerance', () => {
    expect(hasEqualOpportunity(metrics, 'A', 'B', 0.05)).toBe(false);
  });

  it('returns true when TPRs are equal', () => {
    const m = [
      { group: 'A', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr: 0.8, fpr:0, ppv:0, positiveRate:0 },
      { group: 'B', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr: 0.82, fpr:0, ppv:0, positiveRate:0 },
    ];
    expect(hasEqualOpportunity(m, 'A', 'B', 0.05)).toBe(true);
  });

  it('returns false when group not found', () => {
    expect(hasEqualOpportunity(metrics, 'A', 'NONE')).toBe(false);
  });
});

// ─── isWellCalibrated ────────────────────────────────────────────────────────

describe('isWellCalibrated', () => {
  const metrics = [
    { group: 'A', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv: 0.6, positiveRate:0 },
    { group: 'B', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv: 0.61, positiveRate:0 },
    { group: 'C', confusion: { tp:0, fp:0, tn:0, fn:0 }, tpr:0, fpr:0, ppv: 0.9, positiveRate:0 },
  ];

  it('returns true when PPVs are within tolerance', () => {
    expect(isWellCalibrated(metrics, 'A', 'B', 0.05)).toBe(true);
  });

  it('returns false when PPVs differ by more than tolerance', () => {
    expect(isWellCalibrated(metrics, 'A', 'C', 0.05)).toBe(false);
  });

  it('returns false when group not found', () => {
    expect(isWellCalibrated(metrics, 'A', 'NONE')).toBe(false);
    expect(isWellCalibrated(metrics, 'NONE', 'B')).toBe(false);
  });

  it('uses default tolerance', () => {
    expect(isWellCalibrated(metrics, 'A', 'B')).toBe(true);
  });
});

// ─── computeKAnonymity ───────────────────────────────────────────────────────

describe('computeKAnonymity', () => {
  const records: DatabaseRecord[] = [
    { age: '30', zip: '94720', gender: 'M' },
    { age: '30', zip: '94720', gender: 'M' },
    { age: '30', zip: '94720', gender: 'M' },
    { age: '25', zip: '94721', gender: 'F' },
    { age: '25', zip: '94721', gender: 'F' },
    { age: '40', zip: '94722', gender: 'M' },
  ];

  it('returns minimum group size (k=1 for unique record)', () => {
    const k = computeKAnonymity(records, ['age', 'zip', 'gender']);
    expect(k).toBe(1);
  });

  it('returns 2 when minimum group has 2 records', () => {
    const recs: DatabaseRecord[] = [
      { age: '30', zip: '94720' },
      { age: '30', zip: '94720' },
      { age: '25', zip: '94721' },
      { age: '25', zip: '94721' },
      { age: '25', zip: '94721' },
    ];
    expect(computeKAnonymity(recs, ['age', 'zip'])).toBe(2);
  });

  it('returns record count when all records are identical', () => {
    const recs: DatabaseRecord[] = [
      { age: '30' }, { age: '30' }, { age: '30' },
    ];
    expect(computeKAnonymity(recs, ['age'])).toBe(3);
  });

  it('returns 0 for empty dataset', () => {
    expect(computeKAnonymity([], ['age'])).toBe(0);
  });

  it('handles missing attribute values (treated as empty string)', () => {
    const recs: DatabaseRecord[] = [
      { age: '30' },
      { age: '30' },
    ];
    expect(computeKAnonymity(recs, ['age', 'zip'])).toBe(2);
  });
});

// ─── generalizeField ─────────────────────────────────────────────────────────

describe('generalizeField', () => {
  it('generalizes age to decade range', () => {
    expect(generalizeField('34', 'age')).toBe('30-39');
    expect(generalizeField('30', 'age')).toBe('30-39');
    expect(generalizeField('39', 'age')).toBe('30-39');
    expect(generalizeField('0', 'age')).toBe('0-9');
    expect(generalizeField('100', 'age')).toBe('100-109');
  });

  it('returns * for non-numeric age', () => {
    expect(generalizeField('unknown', 'age')).toBe('*');
  });

  it('suppresses all other fields to *', () => {
    expect(generalizeField('94720', 'zip')).toBe('*');
    expect(generalizeField('M', 'gender')).toBe('*');
    expect(generalizeField('anything', 'name')).toBe('*');
  });
});

// ─── laplaceNoise ────────────────────────────────────────────────────────────

describe('laplaceNoise', () => {
  it('returns trueValue unchanged when epsilon <= 0', () => {
    expect(laplaceNoise(42, 1, 0)).toBe(42);
    expect(laplaceNoise(42, 1, -1)).toBe(42);
  });

  it('returns a number close to trueValue on average', () => {
    // Average over many trials should converge close to 0 bias
    let sum = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      sum += laplaceNoise(100, 1, 1) - 100;
    }
    expect(Math.abs(sum / N)).toBeLessThan(0.3); // Expected 0, tight tolerance on avg
  });

  it('produces more noise for smaller epsilon', () => {
    let varHighEps = 0, varLowEps = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      varHighEps += Math.pow(laplaceNoise(0, 1, 10) - 0, 2);
      varLowEps += Math.pow(laplaceNoise(0, 1, 0.1) - 0, 2);
    }
    expect(varLowEps / N).toBeGreaterThan(varHighEps / N);
  });
});

// ─── laplaceNoiseStdDev ──────────────────────────────────────────────────────

describe('laplaceNoiseStdDev', () => {
  it('returns correct std dev: sqrt(2) * sensitivity / epsilon', () => {
    expect(laplaceNoiseStdDev(1, 1)).toBeCloseTo(Math.SQRT2, 5);
    expect(laplaceNoiseStdDev(1, 2)).toBeCloseTo(Math.SQRT2 / 2, 5);
    expect(laplaceNoiseStdDev(2, 1)).toBeCloseTo(2 * Math.SQRT2, 5);
  });

  it('returns Infinity for epsilon <= 0', () => {
    expect(laplaceNoiseStdDev(1, 0)).toBe(Infinity);
    expect(laplaceNoiseStdDev(1, -1)).toBe(Infinity);
  });
});

// ─── faultTreeProbability ────────────────────────────────────────────────────

describe('faultTreeProbability', () => {
  it('returns probability for a LEAF node', () => {
    const leaf: FaultTreeNode = { type: 'LEAF', probability: 0.3 };
    expect(faultTreeProbability(leaf)).toBeCloseTo(0.3, 5);
  });

  it('clamps LEAF probability to [0, 1]', () => {
    expect(faultTreeProbability({ type: 'LEAF', probability: -0.5 })).toBe(0);
    expect(faultTreeProbability({ type: 'LEAF', probability: 1.5 })).toBe(1);
  });

  it('defaults to 0 for LEAF with no probability', () => {
    expect(faultTreeProbability({ type: 'LEAF' })).toBe(0);
  });

  it('AND gate: product of child probabilities', () => {
    const tree: FaultTreeNode = {
      type: 'AND',
      children: [
        { type: 'LEAF', probability: 0.5 },
        { type: 'LEAF', probability: 0.4 },
      ],
    };
    expect(faultTreeProbability(tree)).toBeCloseTo(0.2, 5);
  });

  it('OR gate: 1 − product of (1 − P_i)', () => {
    const tree: FaultTreeNode = {
      type: 'OR',
      children: [
        { type: 'LEAF', probability: 0.3 },
        { type: 'LEAF', probability: 0.4 },
      ],
    };
    // 1 - (1-0.3)*(1-0.4) = 1 - 0.7*0.6 = 1 - 0.42 = 0.58
    expect(faultTreeProbability(tree)).toBeCloseTo(0.58, 5);
  });

  it('returns 0 for AND/OR node with no children', () => {
    expect(faultTreeProbability({ type: 'AND', children: [] })).toBe(0);
    expect(faultTreeProbability({ type: 'OR', children: [] })).toBe(0);
  });

  it('returns 0 for AND/OR node with undefined children', () => {
    expect(faultTreeProbability({ type: 'AND' })).toBe(0);
    expect(faultTreeProbability({ type: 'OR' })).toBe(0);
  });

  it('handles nested AND/OR trees', () => {
    // P(top) = OR(AND(0.5,0.4), LEAF(0.1)) = OR(0.2, 0.1) = 1-(0.8*0.9)=0.28
    const tree: FaultTreeNode = {
      type: 'OR',
      children: [
        {
          type: 'AND',
          children: [
            { type: 'LEAF', probability: 0.5 },
            { type: 'LEAF', probability: 0.4 },
          ],
        },
        { type: 'LEAF', probability: 0.1 },
      ],
    };
    expect(faultTreeProbability(tree)).toBeCloseTo(0.28, 5);
  });

  it('handles single-child AND (same as LEAF)', () => {
    const tree: FaultTreeNode = {
      type: 'AND',
      children: [{ type: 'LEAF', probability: 0.7 }],
    };
    expect(faultTreeProbability(tree)).toBeCloseTo(0.7, 5);
  });

  it('handles single-child OR (same as LEAF)', () => {
    const tree: FaultTreeNode = {
      type: 'OR',
      children: [{ type: 'LEAF', probability: 0.7 }],
    };
    expect(faultTreeProbability(tree)).toBeCloseTo(0.7, 5);
  });
});

// ─── valueAlignmentScore ─────────────────────────────────────────────────────

describe('valueAlignmentScore', () => {
  it('returns 0 for empty scenarios', () => {
    expect(valueAlignmentScore([])).toBe(0);
  });

  it('returns 1 for perfectly correlated utilities', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 1, robotUtility: 2 },
      { humanUtility: 2, robotUtility: 4 },
      { humanUtility: 3, robotUtility: 6 },
    ];
    expect(valueAlignmentScore(scenarios)).toBeCloseTo(1, 5);
  });

  it('returns -1 for perfectly negatively correlated utilities', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 1, robotUtility: -1 },
      { humanUtility: 2, robotUtility: -2 },
      { humanUtility: 3, robotUtility: -3 },
    ];
    expect(valueAlignmentScore(scenarios)).toBeCloseTo(-1, 5);
  });

  it('returns 0 when variance is zero (constant vectors)', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 5, robotUtility: 5 },
      { humanUtility: 5, robotUtility: 5 },
    ];
    expect(valueAlignmentScore(scenarios)).toBe(0);
  });

  it('returns 0 when human variance is zero', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 3, robotUtility: 1 },
      { humanUtility: 3, robotUtility: 2 },
    ];
    expect(valueAlignmentScore(scenarios)).toBe(0);
  });

  it('returns 0 when robot variance is zero', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 1, robotUtility: 5 },
      { humanUtility: 2, robotUtility: 5 },
    ];
    expect(valueAlignmentScore(scenarios)).toBe(0);
  });

  it('returns value in [-1, 1] for arbitrary inputs', () => {
    const scenarios: AlignmentScenario[] = [
      { humanUtility: 3, robotUtility: 1 },
      { humanUtility: 1, robotUtility: 3 },
      { humanUtility: 2, robotUtility: 4 },
    ];
    const score = valueAlignmentScore(scenarios);
    expect(score).toBeGreaterThanOrEqual(-1);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('handles single scenario (returns 0 since no variance)', () => {
    const scenarios: AlignmentScenario[] = [{ humanUtility: 5, robotUtility: 3 }];
    expect(valueAlignmentScore(scenarios)).toBe(0);
  });
});

// ─── lowImpactUtility ────────────────────────────────────────────────────────

describe('lowImpactUtility', () => {
  it('subtracts impactPenalty * stateChanges from robotUtility', () => {
    expect(lowImpactUtility(10, 5, 0.1)).toBeCloseTo(9.5, 5);
    expect(lowImpactUtility(10, 0, 0.1)).toBeCloseTo(10, 5);
    expect(lowImpactUtility(5, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it('uses default impactPenalty of 0.1', () => {
    expect(lowImpactUtility(10, 3)).toBeCloseTo(9.7, 5);
  });

  it('can produce negative adjusted utility', () => {
    expect(lowImpactUtility(1, 100, 1.0)).toBeCloseTo(-99, 5);
  });

  it('returns robotUtility unchanged when stateChanges = 0', () => {
    expect(lowImpactUtility(7, 0)).toBe(7);
  });
});
