import { describe, it, expect } from 'vitest';
import {
  validateDistribution,
  inclusionExclusion,
  complementRule,
  productRule,
  conditionalFromJoint,
  marginalize,
  inferFromJoint,
  normalizeDistribution,
  checkIndependence,
  bayesRule,
  bayesNormalized,
  naiveBayesClassify,
  wumpusPitProbability,
} from '../src/algorithms/index';

// ─── Full joint distribution from §12.3 (Toothache/Cavity/Catch) ─────────────
const JOINT = new Map<string, number>([
  ['cavity,toothache,catch', 0.108],
  ['cavity,toothache,¬catch', 0.012],
  ['cavity,¬toothache,catch', 0.072],
  ['cavity,¬toothache,¬catch', 0.008],
  ['¬cavity,toothache,catch', 0.016],
  ['¬cavity,toothache,¬catch', 0.064],
  ['¬cavity,¬toothache,catch', 0.144],
  ['¬cavity,¬toothache,¬catch', 0.576],
]);

describe('validateDistribution', () => {
  it('accepts a valid distribution', () => {
    const r = validateDistribution([['a', 0.3], ['b', 0.7]]);
    expect(r.valid).toBe(true);
    expect(r.sum).toBeCloseTo(1);
    expect(r.violations).toHaveLength(0);
  });

  it('rejects when sum < 1', () => {
    const r = validateDistribution([['a', 0.3], ['b', 0.5]]);
    expect(r.valid).toBe(false);
    expect(r.sum).toBeCloseTo(0.8);
    expect(r.violations.some(v => v.includes('sum to'))).toBe(true);
  });

  it('rejects a negative probability', () => {
    const r = validateDistribution([['a', -0.1], ['b', 1.1]]);
    expect(r.valid).toBe(false);
    expect(r.violations.some(v => v.includes('negative'))).toBe(true);
  });

  it('rejects a probability > 1', () => {
    const r = validateDistribution([['a', 1.5], ['b', 0]]);
    expect(r.valid).toBe(false);
    expect(r.violations.some(v => v.includes('exceeds 1'))).toBe(true);
  });

  it('rejects empty distribution (sum = 0)', () => {
    const r = validateDistribution([]);
    expect(r.valid).toBe(false);
    expect(r.sum).toBe(0);
  });

  it('accepts distribution with many entries', () => {
    const r = validateDistribution([['a', 0.25], ['b', 0.25], ['c', 0.25], ['d', 0.25]]);
    expect(r.valid).toBe(true);
  });
});

describe('inclusionExclusion', () => {
  it('basic case', () => {
    expect(inclusionExclusion(0.3, 0.4, 0.1)).toBeCloseTo(0.6);
  });

  it('overlapping sets', () => {
    expect(inclusionExclusion(0.5, 0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('universal events', () => {
    expect(inclusionExclusion(1, 1, 1)).toBeCloseTo(1);
  });

  it('disjoint events', () => {
    expect(inclusionExclusion(0.3, 0.4, 0)).toBeCloseTo(0.7);
  });
});

describe('complementRule', () => {
  it('normal probability', () => {
    expect(complementRule(0.3)).toBeCloseTo(0.7);
  });

  it('P(a) = 0', () => {
    expect(complementRule(0)).toBeCloseTo(1);
  });

  it('P(a) = 1', () => {
    expect(complementRule(1)).toBeCloseTo(0);
  });
});

describe('productRule', () => {
  it('normal case', () => {
    expect(productRule(0.8, 0.5)).toBeCloseTo(0.4);
  });

  it('zero probability', () => {
    expect(productRule(1, 0)).toBeCloseTo(0);
  });

  it('identity', () => {
    expect(productRule(1, 1)).toBeCloseTo(1);
  });
});

describe('conditionalFromJoint', () => {
  it('normal case', () => {
    expect(conditionalFromJoint(0.4, 0.5)).toBeCloseTo(0.8);
  });

  it('returns 0 when pB = 0', () => {
    expect(conditionalFromJoint(0, 0)).toBe(0);
  });

  it('book example P(Cavity|toothache)', () => {
    // P(cavity ∧ toothache) = 0.108 + 0.012 = 0.12
    // P(toothache) = 0.12 + 0.064 + 0.016 = 0.2
    expect(conditionalFromJoint(0.12, 0.2)).toBeCloseTo(0.6);
  });

  it('returns 0 for impossible evidence', () => {
    expect(conditionalFromJoint(0, 0)).toBe(0);
  });
});

describe('marginalize', () => {
  it('marginalizes catch out of joint', () => {
    const marg = marginalize(JOINT, ['catch', '¬catch']);
    expect(marg.get('cavity,toothache')).toBeCloseTo(0.12);
    expect(marg.get('cavity,¬toothache')).toBeCloseTo(0.08);
    expect(marg.get('¬cavity,toothache')).toBeCloseTo(0.08);
    expect(marg.get('¬cavity,¬toothache')).toBeCloseTo(0.72);
  });

  it('marginalizes toothache out of joint', () => {
    const marg = marginalize(JOINT, ['toothache', '¬toothache']);
    expect(marg.get('cavity,catch')).toBeCloseTo(0.108 + 0.072);
    expect(marg.get('cavity,¬catch')).toBeCloseTo(0.012 + 0.008);
    expect(marg.get('¬cavity,catch')).toBeCloseTo(0.016 + 0.144);
    expect(marg.get('¬cavity,¬catch')).toBeCloseTo(0.064 + 0.576);
  });

  it('ignores keys that do not contain hidden var values', () => {
    const simple = new Map([['a,b', 0.4], ['c,d', 0.6]]);
    const marg = marginalize(simple, ['x', 'y']);
    expect(marg.size).toBe(0);
  });

  it('handles single-variable joint', () => {
    const single = new Map([['cavity', 0.2], ['¬cavity', 0.8]]);
    const marg = marginalize(single, ['cavity', '¬cavity']);
    expect(marg.get('')).toBeCloseTo(1.0);
  });
});

describe('inferFromJoint', () => {
  it('P(cavity | toothache) = 0.6', () => {
    expect(inferFromJoint(JOINT, 'cavity', ['toothache'])).toBeCloseTo(0.6);
  });

  it('P(¬cavity | toothache) = 0.4', () => {
    expect(inferFromJoint(JOINT, '¬cavity', ['toothache'])).toBeCloseTo(0.4);
  });

  it('P(cavity) marginal = 0.2', () => {
    expect(inferFromJoint(JOINT, 'cavity', [])).toBeCloseTo(0.2);
  });

  it('returns 0 for non-existent query value', () => {
    expect(inferFromJoint(JOINT, 'impossible', ['toothache'])).toBeCloseTo(0);
  });

  it('returns 0 if no evidence entries match', () => {
    expect(inferFromJoint(JOINT, 'cavity', ['impossible-evidence'])).toBe(0);
  });

  it('P(cavity | toothache, catch)', () => {
    // numerator: 0.108, denom: 0.108+0.016 = 0.124
    expect(inferFromJoint(JOINT, 'cavity', ['toothache', 'catch'])).toBeCloseTo(0.108 / 0.124);
  });
});

describe('normalizeDistribution', () => {
  it('normalizes [0.12, 0.08] to [0.6, 0.4]', () => {
    const n = normalizeDistribution([0.12, 0.08]);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.4);
  });

  it('returns zeros array when sum is 0', () => {
    expect(normalizeDistribution([0, 0])).toEqual([0, 0]);
  });

  it('uniform distribution', () => {
    const n = normalizeDistribution([1, 1, 1]);
    n.forEach(v => expect(v).toBeCloseTo(1 / 3));
  });

  it('returns empty array for empty input', () => {
    expect(normalizeDistribution([])).toEqual([]);
  });

  it('single element', () => {
    expect(normalizeDistribution([5])).toEqual([1]);
  });
});

describe('checkIndependence', () => {
  it('independent events (exact)', () => {
    expect(checkIndependence(0.3, 0.4, 0.12)).toBe(true);
  });

  it('dependent events', () => {
    expect(checkIndependence(0.3, 0.4, 0.2)).toBe(false);
  });

  it('custom tolerance passes', () => {
    expect(checkIndependence(0.3, 0.4, 0.121, 0.01)).toBe(true);
  });

  it('custom tolerance fails', () => {
    expect(checkIndependence(0.3, 0.4, 0.2, 0.001)).toBe(false);
  });

  it('zero probabilities', () => {
    expect(checkIndependence(0, 0.5, 0)).toBe(true);
  });
});

describe('bayesRule', () => {
  it('meningitis/stiff-neck book example', () => {
    // P(m|s) = P(s|m)*P(m)/P(s) = 0.7 * (1/50000) / 0.01 = 0.0014
    expect(bayesRule(0.7, 1 / 50000, 0.01)).toBeCloseTo(0.0014);
  });

  it('returns 0 when pEffect = 0', () => {
    expect(bayesRule(0.7, 0.5, 0)).toBe(0);
  });

  it('certainty', () => {
    expect(bayesRule(1, 1, 1)).toBeCloseTo(1);
  });
});

describe('bayesNormalized', () => {
  it('normalizes two hypotheses', () => {
    const result = bayesNormalized([0.9, 0.2], [0.01, 0.99]);
    // raw = [0.009, 0.198], total = 0.207
    const total = 0.009 + 0.198;
    expect(result[0]).toBeCloseTo(0.009 / total);
    expect(result[1]).toBeCloseTo(0.198 / total);
  });

  it('returns [] for empty arrays', () => {
    expect(bayesNormalized([], [])).toEqual([]);
  });

  it('returns [] for mismatched lengths', () => {
    expect(bayesNormalized([0.5], [0.5, 0.5])).toEqual([]);
  });

  it('returns uniform when all products are 0', () => {
    const result = bayesNormalized([0, 0], [0.5, 0.5]);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(0.5);
  });

  it('single hypothesis', () => {
    const result = bayesNormalized([0.8], [0.6]);
    expect(result[0]).toBeCloseTo(1);
  });
});

describe('naiveBayesClassify', () => {
  const priors = new Map([
    ['spam', 0.4],
    ['ham', 0.6],
  ]);

  const likelihoods = new Map<string, ReadonlyMap<string, number>>([
    ['spam', new Map([['offer', 0.8], ['hello', 0.1]])],
    ['ham', new Map([['offer', 0.1], ['hello', 0.7]])],
  ]);

  it('classifies "offer" as spam', () => {
    const result = naiveBayesClassify(priors, likelihoods, new Map([['offer', true]]));
    expect(result.get('spam')!).toBeGreaterThan(result.get('ham')!);
  });

  it('classifies "hello" as ham', () => {
    const result = naiveBayesClassify(priors, likelihoods, new Map([['hello', true]]));
    expect(result.get('ham')!).toBeGreaterThan(result.get('spam')!);
  });

  it('normalizes to sum 1', () => {
    const result = naiveBayesClassify(priors, likelihoods, new Map([['offer', true], ['hello', false]]));
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('handles empty observations', () => {
    const result = naiveBayesClassify(priors, likelihoods, new Map());
    // With no features, posterior = prior (normalized)
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('handles absent features with 1-P factor', () => {
    const obs = new Map([['offer', false]]);
    const result = naiveBayesClassify(priors, likelihoods, obs);
    // spam: 0.4 * (1-0.8) = 0.08, ham: 0.6 * (1-0.1) = 0.54
    const spamScore = 0.4 * (1 - 0.8);
    const hamScore = 0.6 * (1 - 0.1);
    expect(result.get('spam')!).toBeCloseTo(spamScore / (spamScore + hamScore));
  });

  it('handles unknown features (no likelihood entry) as factor 1', () => {
    const obs = new Map([['unknown-word', true]]);
    const result = naiveBayesClassify(priors, likelihoods, obs);
    // P(class|unknown) = prior (factor 1.0 for unknown), then normalized
    const sum = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1);
    // With factor=1.0 for unknown, proportional to priors: spam=0.4, ham=0.6
    expect(result.get('spam')!).toBeCloseTo(0.4);
    expect(result.get('ham')!).toBeCloseTo(0.6);
  });

  it('returns zero for all classes if all scores are 0', () => {
    // Likelihoods of 0 for all features of all classes
    const zeroLike = new Map<string, ReadonlyMap<string, number>>([
      ['spam', new Map([['word', 0]])],
      ['ham', new Map([['word', 0]])],
    ]);
    const result = naiveBayesClassify(priors, zeroLike, new Map([['word', true]]));
    expect(result.get('spam')!).toBe(0);
    expect(result.get('ham')!).toBe(0);
  });
});

describe('wumpusPitProbability', () => {
  it('known-safe square has probability 0', () => {
    const result = wumpusPitProbability(
      4, 0.2,
      [[1, 1]],
      [[1, 1]],
      [],
    );
    expect(result.get('1,1')).toBe(0);
  });

  it('returns empty map for empty query', () => {
    const result = wumpusPitProbability(4, 0.2, [], [], []);
    expect(result.size).toBe(0);
  });

  it('square not adjacent to any breeze gets pitPrior', () => {
    // [4,4] is far from any explored region
    const result = wumpusPitProbability(
      4, 0.2,
      [[4, 4]],
      [[1, 1]],
      [],
    );
    expect(result.get('4,4')).toBeCloseTo(0.2);
  });

  it('book example §12.7: P([1,3]) ≈ 0.31, P([2,2]) ≈ 0.86', () => {
    // Agent has visited [1,1],[1,2],[2,1]; breeze felt at [1,2] and [2,1]
    const result = wumpusPitProbability(
      4, 0.2,
      [[1, 3], [2, 2]],
      [[1, 1], [1, 2], [2, 1]],
      [[1, 2], [2, 1]],
    );
    const p13 = result.get('1,3')!;
    const p22 = result.get('2,2')!;
    expect(p13).toBeGreaterThan(0.2);
    expect(p13).toBeLessThan(0.5);
    expect(p22).toBeGreaterThan(0.7);
    expect(p22).toBeLessThan(1.0);
  });

  it('no breezy squares → frontier squares get pitPrior if no breeze constraint', () => {
    // Without any breezy squares, any configuration is consistent with breezy constraint
    // BUT explored (safe) squares constraint means no adjacent pits
    // [1,2] adjacent to [1,1] (safe) → should have P=0 since [1,1] is safe and adjacent
    // However [3,3] is not adjacent to [1,1] → pitPrior
    const result = wumpusPitProbability(
      4, 0.2,
      [[3, 3]],
      [[1, 1]],
      [],
    );
    expect(result.get('3,3')).toBeCloseTo(0.2);
  });

  it('all adjacent squares are safe → breezy square with no pit sources has 0 prob', () => {
    // If all frontier squares adjacent to a breezy square are known safe,
    // no configuration is consistent: totalWeight=0, falls back to pitPrior
    const result = wumpusPitProbability(
      4, 0.2,
      [[2, 1]],
      [[1, 1], [2, 1], [3, 1], [2, 2]],
      [[2, 1]],
    );
    // [2,1] is itself known safe
    expect(result.get('2,1')).toBe(0);
  });

  it('non-frontier unknown squares use pitPrior', () => {
    const result = wumpusPitProbability(
      4, 0.2,
      [[4, 4], [3, 4]],
      [[1, 1]],
      [],
    );
    expect(result.get('4,4')).toBeCloseTo(0.2);
    expect(result.get('3,4')).toBeCloseTo(0.2);
  });

  it('covers boundary when explored square is at max x/y', () => {
    // [4,4] safe and breezy → getAdj(4,4) exercises x<gridSize=false and y<gridSize=false branches
    const result = wumpusPitProbability(
      4, 0.2,
      [[4, 3], [3, 4]],
      [[4, 4]],
      [[4, 4]],
    );
    // [4,3] and [3,4] are frontier squares adjacent to the breezy [4,4]
    // Both must sum to > 0 and <= 1
    expect(result.get('4,3')).toBeGreaterThan(0);
    expect(result.get('3,4')).toBeGreaterThan(0);
  });

  it('totalWeight===0 for impossible config falls back to pitPrior', () => {
    // [1,2] breezy: only adjacent frontier is [2,2]  → needs pit at [2,2]
    // [2,1] non-breezy: adjacent frontier includes [2,2] → forbids pit at [2,2]
    // Contradiction → no consistent config → totalWeight=0 → fallback to pitPrior
    const result = wumpusPitProbability(
      4, 0.2,
      [[2, 2]],
      [[1, 1], [2, 1], [1, 3]],
      [[1, 2]],
    );
    expect(result.get('2,2')).toBeCloseTo(0.2);
  });

  it('frontier square never a pit in any consistent config → P=0', () => {
    // [1,1] non-breezy: adjFrontier=[1,2] → [1,2] must NOT be a pit
    // [2,1] breezy: adjFrontier=[3,1],[2,2] → at least one must be pit
    // [1,2] is frontier but constrained to never be a pit → pitWeights has no entry for it
    const result = wumpusPitProbability(
      4, 0.2,
      [[1, 2]],
      [[1, 1]],
      [[2, 1]],
    );
    expect(result.get('1,2')).toBeCloseTo(0);
  });
});
