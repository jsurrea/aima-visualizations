import { describe, it, expect } from 'vitest';
import {
  coversExample,
  isMoreGeneralOrEqual,
  minimalGeneralization,
  minimalSpecializations,
  versionSpaceUpdate,
  versionSpaceLearning,
  currentBestLearning,
  eblSimplificationSteps,
  dropAlwaysTrueConditions,
  isConsistentDetermination,
  subsetsOfSize,
  minimalConsistentDet,
  foilGain,
  computeCoverage,
  foilGrandparentSteps,
  getFamilyData,
  clauseCovers,
  clauseCoverage,
} from '../src/algorithms/index';
import type {
  HypothesisSpec,
  Example,
  DetExample,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Domain used across many tests: 3 binary attributes
// ---------------------------------------------------------------------------
const ALL_VALUES = {
  size: ['small', 'large'],
  color: ['red', 'blue'],
  shape: ['circle', 'square'],
} as const;

const BOTTOM: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' }; // very specific
const TOP: HypothesisSpec = { size: null, color: null, shape: null }; // most general

// ---------------------------------------------------------------------------
// coversExample
// ---------------------------------------------------------------------------
describe('coversExample', () => {
  it('top hypothesis (all null) covers any example', () => {
    expect(coversExample(TOP, { size: 'large', color: 'blue', shape: 'square' })).toBe(true);
  });

  it('exact hypothesis covers matching example', () => {
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' };
    expect(coversExample(h, { size: 'small', color: 'red', shape: 'circle' })).toBe(true);
  });

  it('exact hypothesis does NOT cover non-matching example', () => {
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' };
    expect(coversExample(h, { size: 'large', color: 'red', shape: 'circle' })).toBe(false);
  });

  it('partial hypothesis covers when constrained attrs match', () => {
    const h: HypothesisSpec = { size: null, color: 'red', shape: null };
    expect(coversExample(h, { size: 'large', color: 'red', shape: 'square' })).toBe(true);
  });

  it('partial hypothesis does NOT cover when constrained attr differs', () => {
    const h: HypothesisSpec = { size: null, color: 'red', shape: null };
    expect(coversExample(h, { size: 'large', color: 'blue', shape: 'square' })).toBe(false);
  });

  it('empty hypothesis (no keys) covers everything', () => {
    expect(coversExample({}, { size: 'large', color: 'blue' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isMoreGeneralOrEqual
// ---------------------------------------------------------------------------
describe('isMoreGeneralOrEqual', () => {
  it('TOP >= BOTTOM', () => {
    expect(isMoreGeneralOrEqual(TOP, BOTTOM)).toBe(true);
  });

  it('BOTTOM is NOT >= TOP', () => {
    expect(isMoreGeneralOrEqual(BOTTOM, TOP)).toBe(false);
  });

  it('identical hypotheses are equal (>= in both directions)', () => {
    const h: HypothesisSpec = { size: 'small', color: null, shape: 'circle' };
    expect(isMoreGeneralOrEqual(h, h)).toBe(true);
  });

  it('h1 with one fewer condition is more general', () => {
    const h1: HypothesisSpec = { size: null, color: 'red', shape: null };
    const h2: HypothesisSpec = { size: null, color: 'red', shape: 'circle' };
    expect(isMoreGeneralOrEqual(h1, h2)).toBe(true);
    expect(isMoreGeneralOrEqual(h2, h1)).toBe(false);
  });

  it('incomparable hypotheses: neither is more general', () => {
    const h1: HypothesisSpec = { size: 'small', color: null };
    const h2: HypothesisSpec = { size: null, color: 'red' };
    expect(isMoreGeneralOrEqual(h1, h2)).toBe(false);
    expect(isMoreGeneralOrEqual(h2, h1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// minimalGeneralization
// ---------------------------------------------------------------------------
describe('minimalGeneralization', () => {
  it('removes conflicting conditions', () => {
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' };
    const e = { size: 'large', color: 'red', shape: 'circle' };
    const gen = minimalGeneralization(h, e);
    expect(gen.size).toBeNull();
    expect(gen.color).toBe('red');
    expect(gen.shape).toBe('circle');
  });

  it('removes multiple conflicting conditions', () => {
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'square' };
    const e = { size: 'large', color: 'blue', shape: 'square' };
    const gen = minimalGeneralization(h, e);
    expect(gen.size).toBeNull();
    expect(gen.color).toBeNull();
    expect(gen.shape).toBe('square');
  });

  it('returns unchanged h when h already covers e', () => {
    const h: HypothesisSpec = { size: null, color: 'red', shape: null };
    const e = { size: 'large', color: 'red', shape: 'circle' };
    const gen = minimalGeneralization(h, e);
    expect(gen.size).toBeNull();
    expect(gen.color).toBe('red');
    expect(gen.shape).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// minimalSpecializations
// ---------------------------------------------------------------------------
describe('minimalSpecializations', () => {
  it('TOP hypothesis: one specialization per attribute value ≠ e', () => {
    const e = { size: 'large', color: 'blue', shape: 'circle' };
    const specs = minimalSpecializations(TOP, e, ALL_VALUES);
    // size can become 'small', color can become 'red', shape can become 'square'
    expect(specs.length).toBe(3);
    expect(specs.some(s => s.size === 'small')).toBe(true);
    expect(specs.some(s => s.color === 'red')).toBe(true);
    expect(specs.some(s => s.shape === 'square')).toBe(true);
  });

  it('already constrained attribute does not produce specializations', () => {
    const h: HypothesisSpec = { size: 'small', color: null, shape: null };
    const e = { size: 'large', color: 'blue', shape: 'circle' };
    const specs = minimalSpecializations(h, e, ALL_VALUES);
    // Only color and shape can be specialized
    expect(specs.length).toBe(2);
    expect(specs.every(s => s.size === 'small')).toBe(true);
  });

  it('returns empty array when all attributes are already constrained', () => {
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' };
    const e = { size: 'large', color: 'blue', shape: 'square' };
    const specs = minimalSpecializations(h, e, ALL_VALUES);
    expect(specs.length).toBe(0);
  });

  it('attribute with no alternative values produces no specializations', () => {
    const h: HypothesisSpec = { size: null };
    const e = { size: 'large' };
    // allValues has only one value for size — none differs from e.size, so no specialization
    const specs = minimalSpecializations(h, e, { size: ['large'] });
    expect(specs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// versionSpaceUpdate
// ---------------------------------------------------------------------------
describe('versionSpaceUpdate', () => {
  const allVals = ALL_VALUES;

  it('positive example: generalizes S, keeps G covering the example', () => {
    const s: HypothesisSpec[] = [{ size: 'small', color: 'red', shape: 'circle' }];
    const g: HypothesisSpec[] = [{ size: null, color: null, shape: null }];
    const ex: Example = { attrs: { size: 'large', color: 'red', shape: 'circle' }, label: true };
    const { sSet, gSet } = versionSpaceUpdate(s, g, ex, allVals);
    expect(gSet.length).toBe(1); // G still covers the positive example
    // S should now be more general
    expect(sSet.some(h => h.size === null)).toBe(true);
  });

  it('negative example: removes S members that cover the example, specializes G', () => {
    const s: HypothesisSpec[] = [{ size: null, color: 'red', shape: null }];
    const g: HypothesisSpec[] = [{ size: null, color: null, shape: null }];
    const ex: Example = { attrs: { size: 'large', color: 'blue', shape: 'circle' }, label: false };
    const { sSet, gSet } = versionSpaceUpdate(s, g, ex, allVals);
    // S should be unchanged (doesn't cover the negative example)
    expect(sSet.length).toBe(1);
    // G should be specialized
    expect(gSet.every(g => !coversExample(g, ex.attrs))).toBe(true);
  });

  it('positive example that falsifies G: G shrinks', () => {
    const s: HypothesisSpec[] = [{ size: 'small', color: 'red', shape: 'circle' }];
    const g: HypothesisSpec[] = [
      { size: 'small', color: null, shape: null },
      { size: null, color: 'red', shape: null },
    ];
    const ex: Example = { attrs: { size: 'large', color: 'blue', shape: 'square' }, label: true };
    const { gSet } = versionSpaceUpdate(s, g, ex, allVals);
    // Neither G member covers (large, blue, square)
    expect(gSet.length).toBe(0);
  });

  it('negative example: S member covering the example is removed', () => {
    const s: HypothesisSpec[] = [{ size: null, color: null, shape: null }];
    const g: HypothesisSpec[] = [{ size: null, color: null, shape: null }];
    const ex: Example = { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false };
    const { sSet } = versionSpaceUpdate(s, g, ex, allVals);
    // The all-null S member covers the negative example → removed
    expect(sSet.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// versionSpaceLearning (full algorithm)
// ---------------------------------------------------------------------------
describe('versionSpaceLearning', () => {
  it('classic 3-attribute toy sequence produces correct steps', () => {
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
      { attrs: { size: 'large', color: 'blue', shape: 'circle' }, label: false },
      { attrs: { size: 'small', color: 'red', shape: 'square' }, label: true },
    ];
    const steps = versionSpaceLearning(examples, ALL_VALUES);
    expect(steps.length).toBe(3);
    // After 3rd positive example, S should not be empty
    expect(steps[2]!.sSet.length).toBeGreaterThan(0);
  });

  it('returns one step per example', () => {
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
      { attrs: { size: 'large', color: 'blue', shape: 'square' }, label: false },
    ];
    const steps = versionSpaceLearning(examples, ALL_VALUES);
    expect(steps.length).toBe(examples.length);
  });

  it('collapsed flag is set when version space collapses', () => {
    // Two contradictory positive examples that force G to collapse
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false }, // contradiction
    ];
    const steps = versionSpaceLearning(examples, ALL_VALUES);
    // The second step should collapse the version space
    expect(steps[1]!.collapsed).toBe(true);
  });

  it('handles empty examples list', () => {
    const steps = versionSpaceLearning([], ALL_VALUES);
    expect(steps.length).toBe(0);
  });

  it('seeds S-set on first positive example', () => {
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
    ];
    const steps = versionSpaceLearning(examples, ALL_VALUES);
    expect(steps[0]!.sSet.length).toBe(1);
    expect(steps[0]!.sSet[0]!.size).toBe('small');
  });

  it('skips seeding when first example is negative', () => {
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false },
      { attrs: { size: 'large', color: 'blue', shape: 'square' }, label: true },
    ];
    const steps = versionSpaceLearning(examples, ALL_VALUES);
    expect(steps.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// currentBestLearning
// ---------------------------------------------------------------------------
describe('currentBestLearning', () => {
  const allVals = ALL_VALUES;

  it('consistent example produces no change', () => {
    const h: HypothesisSpec = { size: null, color: null, shape: null };
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
    ];
    const steps = currentBestLearning(examples, h, allVals);
    expect(steps[0]!.consistency).toBe('consistent');
    expect(steps[0]!.newHypothesis).toEqual(h);
  });

  it('false positive triggers specialization', () => {
    const h: HypothesisSpec = { size: null, color: null, shape: null };
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false },
    ];
    const steps = currentBestLearning(examples, h, allVals);
    expect(steps[0]!.consistency).toBe('false_positive');
    // New hypothesis should be more specific
    expect(JSON.stringify(steps[0]!.newHypothesis)).not.toBe(JSON.stringify(h));
  });

  it('false negative triggers generalization', () => {
    const h: HypothesisSpec = { size: 'large', color: 'red', shape: 'circle' };
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
    ];
    const steps = currentBestLearning(examples, h, allVals);
    expect(steps[0]!.consistency).toBe('false_negative');
    // Size should be generalized to null
    expect(steps[0]!.newHypothesis.size).toBeNull();
  });

  it('multiple examples produce one step each', () => {
    const h: HypothesisSpec = { size: null, color: null, shape: null };
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
      { attrs: { size: 'large', color: 'blue', shape: 'square' }, label: false },
      { attrs: { size: 'small', color: 'red', shape: 'square' }, label: true },
    ];
    const steps = currentBestLearning(examples, h, allVals);
    expect(steps.length).toBe(3);
  });

  it('empty examples list returns empty steps', () => {
    const steps = currentBestLearning([], BOTTOM, allVals);
    expect(steps.length).toBe(0);
  });

  it('false positive when no specializations available — keeps current h', () => {
    // h has all attrs constrained already; minimalSpecializations returns []
    const h: HypothesisSpec = { size: 'small', color: 'red', shape: 'circle' };
    const examples: Example[] = [
      { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false },
    ];
    const steps = currentBestLearning(examples, h, allVals);
    expect(steps[0]!.consistency).toBe('false_positive');
    // Should keep h unchanged (no valid specialization)
    expect(steps[0]!.newHypothesis).toEqual(h);
  });
});

// ---------------------------------------------------------------------------
// EBL
// ---------------------------------------------------------------------------
describe('eblSimplificationSteps', () => {
  it('returns exactly 6 steps', () => {
    const steps = eblSimplificationSteps();
    expect(steps.length).toBe(6);
  });

  it('each step has a non-empty action', () => {
    const steps = eblSimplificationSteps();
    for (const s of steps) {
      expect(s.action.length).toBeGreaterThan(0);
    }
  });

  it('final step contains the extracted rule', () => {
    const steps = eblSimplificationSteps();
    const last = steps[steps.length - 1]!;
    expect(last.extractedRule).toContain('ArithmeticUnknown');
    expect(last.extractedRule).toContain('Simplify');
  });

  it('first step general goal is variabilized', () => {
    const steps = eblSimplificationSteps();
    expect(steps[0]!.generalGoal).toContain('x');
    expect(steps[0]!.generalGoal).toContain('y');
    expect(steps[0]!.generalGoal).toContain('z');
  });

  it('leaf conditions are arrays', () => {
    const steps = eblSimplificationSteps();
    for (const s of steps) {
      expect(Array.isArray(s.leafConditions)).toBe(true);
    }
  });
});

describe('dropAlwaysTrueConditions', () => {
  it('removes conditions in the alwaysTrue set', () => {
    const leaf = ['Rewrite(1×(0+z), 0+z)', 'Rewrite(0+z, z)', 'ArithmeticUnknown(z)'];
    const always = ['Rewrite(1×(0+z), 0+z)', 'Rewrite(0+z, z)'];
    const result = dropAlwaysTrueConditions(leaf, always);
    expect(result).toEqual(['ArithmeticUnknown(z)']);
  });

  it('returns all conditions when alwaysTrue is empty', () => {
    const leaf = ['A', 'B', 'C'];
    const result = dropAlwaysTrueConditions(leaf, []);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('returns empty array when all conditions are always true', () => {
    const leaf = ['A', 'B'];
    const result = dropAlwaysTrueConditions(leaf, ['A', 'B']);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isConsistentDetermination
// ---------------------------------------------------------------------------
describe('isConsistentDetermination', () => {
  const conductanceData: DetExample[] = [
    { attrs: { mass: '12', temp: '26', material: 'Copper', size: '3' }, target: '0.59' },
    { attrs: { mass: '12', temp: '100', material: 'Copper', size: '3' }, target: '0.57' },
    { attrs: { mass: '24', temp: '26', material: 'Copper', size: '6' }, target: '0.59' },
    { attrs: { mass: '12', temp: '26', material: 'Lead', size: '2' }, target: '0.05' },
    { attrs: { mass: '12', temp: '100', material: 'Lead', size: '2' }, target: '0.04' },
    { attrs: { mass: '24', temp: '26', material: 'Lead', size: '4' }, target: '0.05' },
  ];

  it('Material ∧ Temperature is a consistent determination', () => {
    expect(isConsistentDetermination(['material', 'temp'], conductanceData)).toBe(true);
  });

  it('Material alone is NOT a consistent determination (temp changes conductance)', () => {
    expect(isConsistentDetermination(['material'], conductanceData)).toBe(false);
  });

  it('Mass alone is NOT consistent', () => {
    // mass=12 appears with both Copper(0.59,0.57) and Lead(0.05,0.04) — different targets
    expect(isConsistentDetermination(['mass'], conductanceData)).toBe(false);
  });

  it('all attributes is always consistent', () => {
    expect(
      isConsistentDetermination(['mass', 'temp', 'material', 'size'], conductanceData),
    ).toBe(true);
  });

  it('empty subset is consistent only if all examples have the same target', () => {
    const sameTarget: DetExample[] = [
      { attrs: { x: '1' }, target: 'yes' },
      { attrs: { x: '2' }, target: 'yes' },
    ];
    expect(isConsistentDetermination([], sameTarget)).toBe(true);
  });

  it('empty subset is NOT consistent if targets differ', () => {
    const diffTarget: DetExample[] = [
      { attrs: { x: '1' }, target: 'yes' },
      { attrs: { x: '2' }, target: 'no' },
    ];
    expect(isConsistentDetermination([], diffTarget)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// subsetsOfSize
// ---------------------------------------------------------------------------
describe('subsetsOfSize', () => {
  it('size 0 returns one empty subset', () => {
    const result = subsetsOfSize(['a', 'b', 'c'], 0);
    expect(result).toEqual([[]]);
  });

  it('size = array length returns the whole array', () => {
    const result = subsetsOfSize(['a', 'b', 'c'], 3);
    expect(result).toEqual([['a', 'b', 'c']]);
  });

  it('size > array length returns empty', () => {
    const result = subsetsOfSize(['a', 'b'], 3);
    expect(result).toEqual([]);
  });

  it('size 1 returns all singletons', () => {
    const result = subsetsOfSize(['a', 'b', 'c'], 1);
    expect(result.length).toBe(3);
    expect(result).toContainEqual(['a']);
    expect(result).toContainEqual(['b']);
    expect(result).toContainEqual(['c']);
  });

  it('size 2 from 4 gives 6 subsets', () => {
    const result = subsetsOfSize(['a', 'b', 'c', 'd'], 2);
    expect(result.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// minimalConsistentDet
// ---------------------------------------------------------------------------
describe('minimalConsistentDet', () => {
  const conductanceData: DetExample[] = [
    { attrs: { mass: '12', temp: '26', material: 'Copper', size: '3' }, target: '0.59' },
    { attrs: { mass: '12', temp: '100', material: 'Copper', size: '3' }, target: '0.57' },
    { attrs: { mass: '24', temp: '26', material: 'Copper', size: '6' }, target: '0.59' },
    { attrs: { mass: '12', temp: '26', material: 'Lead', size: '2' }, target: '0.05' },
    { attrs: { mass: '12', temp: '100', material: 'Lead', size: '2' }, target: '0.04' },
    { attrs: { mass: '24', temp: '26', material: 'Lead', size: '4' }, target: '0.05' },
  ];

  it('finds Material ∧ Temperature as minimal consistent determination', () => {
    const steps = minimalConsistentDet(['material', 'temp', 'mass', 'size'], conductanceData);
    const found = steps.find(s => s.found);
    expect(found).toBeDefined();
    expect([...found!.subset].sort()).toEqual(['material', 'temp'].sort());
  });

  it('last step in steps is the found step', () => {
    const steps = minimalConsistentDet(['material', 'temp', 'mass', 'size'], conductanceData);
    expect(steps[steps.length - 1]!.found).toBe(true);
  });

  it('trivially consistent data: empty subset is found first', () => {
    const trivial: DetExample[] = [
      { attrs: { a: '1' }, target: 'yes' },
      { attrs: { a: '2' }, target: 'yes' },
    ];
    const steps = minimalConsistentDet(['a'], trivial);
    expect(steps[0]!.found).toBe(true);
    expect(steps[0]!.subset).toEqual([]);
  });

  it('returns steps with action strings', () => {
    const steps = minimalConsistentDet(['material', 'temp'], conductanceData);
    for (const s of steps) {
      expect(s.action.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// foilGain
// ---------------------------------------------------------------------------
describe('foilGain', () => {
  it('returns 0 when p0 = 0', () => {
    expect(foilGain(0, 5, 3, 2)).toBe(0);
  });

  it('returns 0 when p1 = 0', () => {
    expect(foilGain(4, 8, 0, 4)).toBe(0);
  });

  it('returns positive value for a good literal (high precision improvement)', () => {
    // Before: 4 pos, 8 neg (33% precision). After: 4 pos, 0 neg (100% precision)
    const gain = foilGain(4, 8, 4, 0);
    expect(gain).toBeGreaterThan(0);
  });

  it('returns lower value for a less informative literal', () => {
    const gain1 = foilGain(4, 8, 4, 0);
    const gain2 = foilGain(4, 8, 4, 4);
    expect(gain1).toBeGreaterThan(gain2);
  });

  it('gain is zero when before == after precision', () => {
    // 50% before, 50% after
    const gain = foilGain(4, 4, 2, 2);
    expect(gain).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// computeCoverage
// ---------------------------------------------------------------------------
describe('computeCoverage', () => {
  it('computes coverage correctly', () => {
    const pos = [{ x: 'A', y: 'C' }, { x: 'A', y: 'D' }];
    const neg = [{ x: 'B', y: 'C' }, { x: 'B', y: 'D' }];
    const extended = [{ x: 'A', y: 'C', z: 'B' }];
    const { pos: p, neg: n } = computeCoverage(extended, pos, neg);
    expect(p).toBe(1);
    expect(n).toBe(0);
  });

  it('empty extended bindings gives zero coverage', () => {
    const pos = [{ x: 'A', y: 'C' }];
    const neg = [{ x: 'B', y: 'D' }];
    const { pos: p, neg: n } = computeCoverage([], pos, neg);
    expect(p).toBe(0);
    expect(n).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// foilGrandparentSteps
// ---------------------------------------------------------------------------
describe('foilGrandparentSteps', () => {
  it('returns 4 steps', () => {
    const steps = foilGrandparentSteps();
    expect(steps.length).toBe(4);
  });

  it('first step has empty clauseBody', () => {
    const steps = foilGrandparentSteps();
    expect(steps[0]!.clauseBody).toEqual([]);
  });

  it('second step adds Father(x,z)', () => {
    const steps = foilGrandparentSteps();
    expect(steps[1]!.addedLiteral).toBe('Father(x,z)');
  });

  it('third step adds Parent(z,y)', () => {
    const steps = foilGrandparentSteps();
    expect(steps[2]!.addedLiteral).toBe('Parent(z,y)');
  });

  it('final step has zero negative coverage', () => {
    const steps = foilGrandparentSteps();
    expect(steps[3]!.negCovers).toBe(0);
  });

  it('each step has a non-empty action', () => {
    for (const s of foilGrandparentSteps()) {
      expect(s.action.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getFamilyData
// ---------------------------------------------------------------------------
describe('getFamilyData', () => {
  it('returns consistent family data', () => {
    const data = getFamilyData();
    expect(data.father.length).toBeGreaterThan(0);
    expect(data.mother.length).toBeGreaterThan(0);
    expect(data.parent.length).toBe(data.father.length + data.mother.length);
  });

  it('parent = father ∪ mother', () => {
    const data = getFamilyData();
    const parentStr = data.parent.map(p => `${p[0]}-${p[1]}`).sort();
    const fatherMotherStr = [...data.father, ...data.mother]
      .map(p => `${p[0]}-${p[1]}`)
      .sort();
    expect(parentStr).toEqual(fatherMotherStr);
  });
});

// ---------------------------------------------------------------------------
// clauseCovers
// ---------------------------------------------------------------------------
describe('clauseCovers', () => {
  const data = getFamilyData();

  it('empty body covers everything', () => {
    expect(clauseCovers([], 'George', 'Elizabeth', data)).toBe(true);
    expect(clauseCovers([], 'nobody', 'nobody', data)).toBe(true);
  });

  it('Father(x,z) ∧ Parent(z,y): covers correct grandfather pairs', () => {
    expect(clauseCovers(['Father(x,z)', 'Parent(z,y)'], 'George', 'Charles', data)).toBe(true);
    expect(clauseCovers(['Father(x,z)', 'Parent(z,y)'], 'George', 'Anne', data)).toBe(true);
  });

  it('Father(x,z) ∧ Parent(z,y): does not cover non-grandfather pairs', () => {
    expect(clauseCovers(['Father(x,z)', 'Parent(z,y)'], 'George', 'Philip', data)).toBe(false);
  });

  it('Father(x,z) alone: covers x who is a father', () => {
    expect(clauseCovers(['Father(x,z)'], 'George', 'anyone', data)).toBe(true);
  });

  it('Mother(x,z): covers mothers', () => {
    expect(clauseCovers(['Mother(x,z)'], 'Elizabeth', 'anyone', data)).toBe(true);
  });

  it('Mother(z,y): covers people whose mother is z', () => {
    expect(clauseCovers(['Mother(z,y)'], 'anyone', 'Charles', data)).toBe(true);
  });

  it('unknown literal returns false', () => {
    expect(clauseCovers(['UnknownPredicate(x,z)'], 'George', 'Charles', data)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clauseCoverage
// ---------------------------------------------------------------------------
describe('clauseCoverage', () => {
  const data = getFamilyData();

  it('computes correct pos and neg for the learned clause', () => {
    const body = ['Father(x,z)', 'Parent(z,y)'];
    const { pos, neg } = clauseCoverage(body, data.grandparentPos, data.grandparentNeg, data);
    expect(pos).toBeGreaterThan(0);
    expect(neg).toBe(0);
  });

  it('empty body covers all examples', () => {
    const { pos, neg } = clauseCoverage([], data.grandparentPos, data.grandparentNeg, data);
    expect(pos).toBe(data.grandparentPos.length);
    expect(neg).toBe(data.grandparentNeg.length);
  });
});

// ---------------------------------------------------------------------------
// Additional branch coverage
// ---------------------------------------------------------------------------
describe('versionSpaceUpdate – G member already excludes negative example', () => {
  it('G member that already excludes negative example is kept as-is (line 181 branch)', () => {
    // Both G members don't cover the negative example → both go through line 181
    const s: HypothesisSpec[] = [{ size: 'small', color: 'red', shape: null }];
    const g: HypothesisSpec[] = [
      { size: 'small', color: null, shape: null }, // does NOT cover (large, blue, circle)
      { size: null, color: 'red', shape: null },   // does NOT cover (large, blue, circle)
    ];
    const ex: Example = { attrs: { size: 'large', color: 'blue', shape: 'circle' }, label: false };
    const { gSet } = versionSpaceUpdate(s, g, ex, ALL_VALUES);
    // Both G members excluded the negative example already → both kept (incomparable, no dedup)
    expect(gSet.length).toBe(2);
    expect(gSet.some(h => h.size === 'small')).toBe(true);
    expect(gSet.some(h => h.color === 'red')).toBe(true);
  });
});

describe('minimalSpecializations – missing allValues key', () => {
  it('treats missing attribute in allValues as empty (no specs for that attr)', () => {
    const h: HypothesisSpec = { size: null, color: null };
    const e = { size: 'large', color: 'blue' };
    // allValues does not include 'size' → ?? [] fallback for 'size'
    const specs = minimalSpecializations(h, e, { color: ['red', 'blue'] } as Readonly<Record<string, ReadonlyArray<string>>>);
    // 'size' has no allValues entry → no specs for size
    // 'color': values are ['red','blue']; only 'red' ≠ 'blue' → one spec
    expect(specs.length).toBe(1);
    expect(specs[0]!.color).toBe('red');
  });
});

describe('versionSpaceUpdate – S deduplication (line 168)', () => {
  it('removes S members that are more general than another S member', () => {
    // Two S members that both need generalization for the new positive example
    const s: HypothesisSpec[] = [
      { size: 'small', color: 'red', shape: 'circle' },
      { size: 'small', color: 'red', shape: 'square' },
    ];
    const g: HypothesisSpec[] = [{ size: null, color: null, shape: null }];
    // Positive example: (small, blue, circle) — not covered by either S member (color conflict)
    const ex: Example = { attrs: { size: 'small', color: 'blue', shape: 'circle' }, label: true };
    const { sSet } = versionSpaceUpdate(s, g, ex, ALL_VALUES);
    // S1 gen: {size:'small', color:null, shape:'circle'}
    // S2 gen: {size:'small', color:null, shape:null} (more general, covers everything S1 covers)
    // Dedup: S2 is more general than S1 → S2 is REMOVED (S keeps only most specific)
    // Result: [{size:'small', color:null, shape:'circle'}]
    expect(sSet.length).toBe(1);
    expect(sSet[0]!.shape).toBe('circle'); // the more specific hypothesis is kept
    expect(sSet[0]!.color).toBeNull();
  });
});

describe('computeCoverage – covers negative examples', () => {
  it('correctly counts negative example coverage', () => {
    const pos = [{ x: 'A', y: 'C' }];
    const neg = [{ x: 'B', y: 'D' }];
    // Extended binding covers a negative example
    const extended = [{ x: 'B', y: 'D', z: 'X' }];
    const { pos: p, neg: n } = computeCoverage(extended, pos, neg);
    expect(p).toBe(0);
    expect(n).toBe(1);
  });

  it('covers both positive and negative examples', () => {
    const pos = [{ x: 'A', y: 'C' }];
    const neg = [{ x: 'B', y: 'D' }];
    const extended = [{ x: 'A', y: 'C', z: 'X' }, { x: 'B', y: 'D', z: 'Y' }];
    const { pos: p, neg: n } = computeCoverage(extended, pos, neg);
    expect(p).toBe(1);
    expect(n).toBe(1);
  });
});

describe('minimalConsistentDet – no consistent determination found', () => {
  it('returns all steps without found=true when no consistent det exists', () => {
    // Deliberately contradictory data: same attrs, different targets
    const noDetData: DetExample[] = [
      { attrs: { a: 'x', b: 'y' }, target: 'pos' },
      { attrs: { a: 'x', b: 'y' }, target: 'neg' },
    ];
    const steps = minimalConsistentDet(['a', 'b'], noDetData);
    // None should be found
    expect(steps.every(s => !s.found)).toBe(true);
    // Should have tried all subsets including {a,b} without success
    expect(steps[steps.length - 1]!.found).toBe(false);
  });
});

describe('clauseCovers – Father(z,y) and Parent(x,z) branches', () => {
  const data = getFamilyData();

  it('Father(z,y): covers pairs where z is father of y', () => {
    // Philip is father of Charles → Father(z,y) with z=Philip, y=Charles
    expect(clauseCovers(['Father(z,y)'], 'anyone', 'Charles', data)).toBe(true);
  });

  it('Parent(x,z): covers pairs where x is parent of z', () => {
    // George is father of Elizabeth → Parent(x,z) with x=George, z=Elizabeth
    expect(clauseCovers(['Parent(x,z)'], 'George', 'anyone', data)).toBe(true);
  });

  it('Father(z,y) does not cover pairs with no matching father', () => {
    // 'nobody' is not a father of 'Charles'
    expect(clauseCovers(['Father(z,y)'], 'anyone', 'George', data)).toBe(false);
  });
});

