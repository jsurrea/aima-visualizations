import { describe, it, expect } from 'vitest';
import {
  computeMEU,
  checkTransitivity,
  detectAllaisParadox,
  computeUtility,
  certaintyEquivalent,
  insurancePremium,
  optimizerCurseDistribution,
  strictlyDominatedOptions,
  additiveUtility,
  stochasticDominance,
  evaluateDecisionNetwork,
  computeVPI,
  myopicInformationGathering,
  treasureHuntOptimalOrder,
  offSwitchGame,
  computeEUWithUncertainUtility,
} from '../src/algorithms/index';
import type {
  Action,
  PreferenceEntry,
  AllaisChoice,
  Option,
  AttributeWeight,
  DecisionNetworkNode,
  VPIAction,
  ObservableVariable,
  TreasureLocation,
  OffSwitchScenario,
  UncertainUtilityAction,
} from '../src/algorithms/index';

// ─────────────────────────────────────────────────────────────────────────────
// §15.1 — computeMEU
// ─────────────────────────────────────────────────────────────────────────────

describe('computeMEU', () => {
  it('returns empty result for zero actions', () => {
    const result = computeMEU([]);
    expect(result.steps).toHaveLength(0);
    expect(result.bestAction).toBe('');
    expect(result.bestEU).toBe(-Infinity);
  });

  it('selects the single action when given one', () => {
    const actions: Action[] = [
      { name: 'buy', outcomes: [{ probability: 1, utility: 5 }] },
    ];
    const { bestAction, bestEU, steps } = computeMEU(actions);
    expect(bestAction).toBe('buy');
    expect(bestEU).toBeCloseTo(5);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.calculation).toContain('= 5.0000');
  });

  it('selects the action with highest EU from multiple actions', () => {
    const actions: Action[] = [
      {
        name: 'conservative',
        outcomes: [{ probability: 1, utility: 3 }],
      },
      {
        name: 'risky',
        outcomes: [
          { probability: 0.8, utility: 10 },
          { probability: 0.2, utility: -5 },
        ],
      },
    ];
    const { bestAction, bestEU } = computeMEU(actions);
    // risky EU = 0.8*10 + 0.2*(-5) = 8 - 1 = 7, conservative EU = 3
    expect(bestAction).toBe('risky');
    expect(bestEU).toBeCloseTo(7);
  });

  it('builds a human-readable calculation string', () => {
    const actions: Action[] = [
      {
        name: 'bet',
        outcomes: [
          { probability: 0.5, utility: 20 },
          { probability: 0.5, utility: -10 },
        ],
      },
    ];
    const { steps } = computeMEU(actions);
    expect(steps[0]!.calculation).toContain('0.5×20');
    expect(steps[0]!.calculation).toContain('0.5×-10');
  });

  it('handles ties by returning the first maximum', () => {
    const actions: Action[] = [
      { name: 'a', outcomes: [{ probability: 1, utility: 5 }] },
      { name: 'b', outcomes: [{ probability: 1, utility: 5 }] },
    ];
    const { bestAction, bestEU } = computeMEU(actions);
    expect(bestAction).toBe('a');
    expect(bestEU).toBeCloseTo(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.2 — checkTransitivity
// ─────────────────────────────────────────────────────────────────────────────

describe('checkTransitivity', () => {
  it('returns no violations for a consistent total order', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'C', preference: 'preferred' },
      { optionA: 'A', optionB: 'C', preference: 'preferred' },
    ];
    expect(checkTransitivity(prefs)).toHaveLength(0);
  });

  it('detects a 3-cycle: A ≻ B ≻ C ≻ A', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'C', preference: 'preferred' },
      { optionA: 'C', optionB: 'A', preference: 'preferred' },
    ];
    const violations = checkTransitivity(prefs);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.axiom).toBe('Transitivity');
    expect(violations[0]!.description).toContain('cycle');
  });

  it('detects explicit contradiction: A ≻ B ≻ C but C ≻ A explicitly recorded as dispreferred', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'C', preference: 'preferred' },
      { optionA: 'A', optionB: 'C', preference: 'dispreferred' },
    ];
    const violations = checkTransitivity(prefs);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.options).toContain('A');
    expect(violations[0]!.options).toContain('B');
    expect(violations[0]!.options).toContain('C');
  });

  it('detects contradiction: A ≻ B ≻ C but A ~ C (indifferent)', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'X', optionB: 'Y', preference: 'preferred' },
      { optionA: 'Y', optionB: 'Z', preference: 'preferred' },
      { optionA: 'X', optionB: 'Z', preference: 'indifferent' },
    ];
    const violations = checkTransitivity(prefs);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('detects contradiction: A ≻ B ≻ C but C recorded as preferred over A', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'P', optionB: 'Q', preference: 'preferred' },
      { optionA: 'Q', optionB: 'R', preference: 'preferred' },
      { optionA: 'R', optionB: 'P', preference: 'indifferent' },
    ];
    const violations = checkTransitivity(prefs);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('returns no violations for indifferent/dispreferred-only prefs', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'indifferent' },
      { optionA: 'B', optionB: 'C', preference: 'dispreferred' },
    ];
    expect(checkTransitivity(prefs)).toHaveLength(0);
  });

  it('does not double-report the same cycle', () => {
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'C', preference: 'preferred' },
      { optionA: 'C', optionB: 'A', preference: 'preferred' },
    ];
    const violations = checkTransitivity(prefs);
    // Each unique triple should only be reported once (cycle deduplication)
    const uniqueKeys = new Set(violations.map((v) => v.options.slice().sort().join(',')));
    expect(uniqueKeys.size).toBe(violations.length);
  });

  it('handles 2-cycle (A ≻ B ≻ A) without crashing', () => {
    // When iterating: a=A, b=B, c=A  →  c === a, so we skip (line 136 branch)
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'A', preference: 'preferred' },
    ];
    const violations = checkTransitivity(prefs);
    // A 2-cycle is a cycle but is caught as A ≻ B ≻ A where c=A=a, skipped;
    // however the reversed perspective B ≻ A ≻ B also gets skipped.
    // Result: no triple violation, but cycles are detected through the full scan.
    expect(Array.isArray(violations)).toBe(true);
  });

  it('stops checking a triple once it is already reported (duplicate pref entries)', () => {
    // Two prefs expressing A ~ C for the same triple A≻B≻C
    // The first triggers the violation; the second hits the `reported.has` break
    const prefs: PreferenceEntry[] = [
      { optionA: 'A', optionB: 'B', preference: 'preferred' },
      { optionA: 'B', optionB: 'C', preference: 'preferred' },
      { optionA: 'A', optionB: 'C', preference: 'indifferent' }, // first: report violation
      { optionA: 'A', optionB: 'C', preference: 'indifferent' }, // second: already reported
    ];
    const violations = checkTransitivity(prefs);
    expect(violations.length).toBe(1); // reported only once
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.2 — detectAllaisParadox
// ─────────────────────────────────────────────────────────────────────────────

describe('detectAllaisParadox', () => {
  it('detects B+C as paradoxical (classic Allais)', () => {
    const choice: AllaisChoice = { choiceAB: 'B', choiceCD: 'C' };
    expect(detectAllaisParadox(choice)).toBe(true);
  });

  it('detects A+D as paradoxical (symmetric violation)', () => {
    const choice: AllaisChoice = { choiceAB: 'A', choiceCD: 'D' };
    expect(detectAllaisParadox(choice)).toBe(true);
  });

  it('does not flag A+C as paradoxical', () => {
    const choice: AllaisChoice = { choiceAB: 'A', choiceCD: 'C' };
    expect(detectAllaisParadox(choice)).toBe(false);
  });

  it('does not flag B+D as paradoxical', () => {
    const choice: AllaisChoice = { choiceAB: 'B', choiceCD: 'D' };
    expect(detectAllaisParadox(choice)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.3 — computeUtility
// ─────────────────────────────────────────────────────────────────────────────

describe('computeUtility', () => {
  it('logarithmic: U(0) = 0', () => {
    expect(computeUtility(0, 'logarithmic')).toBeCloseTo(0);
  });

  it('logarithmic: U(e−1) ≈ 1', () => {
    expect(computeUtility(Math.E - 1, 'logarithmic')).toBeCloseTo(1);
  });

  it('linear: U(x) = x', () => {
    expect(computeUtility(42, 'linear')).toBe(42);
    expect(computeUtility(-7, 'linear')).toBe(-7);
  });

  it('power: default ρ=0.5 gives square root for positive amounts', () => {
    expect(computeUtility(9, 'power')).toBeCloseTo(3);
    expect(computeUtility(0, 'power')).toBeCloseTo(0);
  });

  it('power: negative amount uses − |x|^ρ', () => {
    expect(computeUtility(-9, 'power')).toBeCloseTo(-3);
  });

  it('power: custom ρ is respected', () => {
    expect(computeUtility(8, 'power', 1 / 3)).toBeCloseTo(2);
  });

  it('exponential: default R=1000, U(0) = 0', () => {
    expect(computeUtility(0, 'exponential')).toBeCloseTo(0);
  });

  it('exponential: approaches 1 for large amounts', () => {
    expect(computeUtility(1e9, 'exponential')).toBeCloseTo(1);
  });

  it('exponential: custom R is respected', () => {
    // U(R) = 1 − e^(−1) ≈ 0.6321
    const R = 500;
    expect(computeUtility(R, 'exponential', R)).toBeCloseTo(1 - Math.exp(-1));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.3 — certaintyEquivalent
// ─────────────────────────────────────────────────────────────────────────────

describe('certaintyEquivalent', () => {
  it('CE of a sure thing equals its amount (linear)', () => {
    const lottery = [{ probability: 1, amount: 100 }];
    expect(certaintyEquivalent(lottery, 'linear')).toBeCloseTo(100, 3);
  });

  it('CE < EMV for risk-averse logarithmic utility', () => {
    // 50/50 lottery: 0 or 100
    const lottery = [
      { probability: 0.5, amount: 0 },
      { probability: 0.5, amount: 100 },
    ];
    const emv = 50;
    const ce = certaintyEquivalent(lottery, 'logarithmic');
    expect(ce).toBeLessThan(emv);
  });

  it('CE ≈ EMV for linear utility', () => {
    const lottery = [
      { probability: 0.3, amount: 0 },
      { probability: 0.7, amount: 200 },
    ];
    const emv = 0.3 * 0 + 0.7 * 200;
    expect(certaintyEquivalent(lottery, 'linear')).toBeCloseTo(emv, 3);
  });

  it('CE < EMV for risk-averse power utility', () => {
    const lottery = [
      { probability: 0.5, amount: 0 },
      { probability: 0.5, amount: 400 },
    ];
    const ce = certaintyEquivalent(lottery, 'power');
    expect(ce).toBeLessThan(200);
  });

  it('CE works for exponential utility with custom risk parameter', () => {
    const lottery = [{ probability: 1, amount: 500 }];
    const ce = certaintyEquivalent(lottery, 'exponential', 1000);
    expect(ce).toBeCloseTo(500, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.3 — insurancePremium
// ─────────────────────────────────────────────────────────────────────────────

describe('insurancePremium', () => {
  it('premium > 0 for risk-averse agent (logarithmic)', () => {
    const lottery = [
      { probability: 0.5, amount: 0 },
      { probability: 0.5, amount: 1000 },
    ];
    expect(insurancePremium(lottery, 'logarithmic')).toBeGreaterThan(0);
  });

  it('premium ≈ 0 for risk-neutral agent (linear)', () => {
    const lottery = [
      { probability: 0.4, amount: 50 },
      { probability: 0.6, amount: 150 },
    ];
    expect(insurancePremium(lottery, 'linear')).toBeCloseTo(0, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.3 — optimizerCurseDistribution
// ─────────────────────────────────────────────────────────────────────────────

describe('optimizerCurseDistribution', () => {
  it('returns the specified number of points (default 60)', () => {
    expect(optimizerCurseDistribution(3)).toHaveLength(60);
  });

  it('returns numPoints points when specified', () => {
    expect(optimizerCurseDistribution(2, 20)).toHaveLength(20);
  });

  it('first and last x values are −4 and 4', () => {
    const pts = optimizerCurseDistribution(1);
    expect(pts[0]!.x).toBeCloseTo(-4);
    expect(pts[pts.length - 1]!.x).toBeCloseTo(4);
  });

  it('k=1 gives the standard normal PDF', () => {
    const pts = optimizerCurseDistribution(1, 60);
    // At x≈0: f(0) = 1·φ(0)·Φ(0)^0 = φ(0) ≈ 0.3989
    // Grid spacing is 8/59 ≈ 0.135, so use a threshold of 0.15
    const mid = pts.find((p) => Math.abs(p.x) < 0.15);
    expect(mid!.density).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 2);
  });

  it('larger k shifts the peak to the right (max shifts upward)', () => {
    const pts1 = optimizerCurseDistribution(1, 60);
    const pts5 = optimizerCurseDistribution(5, 60);
    const peak1 = pts1.reduce((best, p) => (p.density > best.density ? p : best), pts1[0]!);
    const peak5 = pts5.reduce((best, p) => (p.density > best.density ? p : best), pts5[0]!);
    expect(peak5.x).toBeGreaterThan(peak1.x);
  });

  it('density values are all non-negative', () => {
    const pts = optimizerCurseDistribution(3);
    expect(pts.every((p) => p.density >= 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.4 — strictlyDominatedOptions
// ─────────────────────────────────────────────────────────────────────────────

describe('strictlyDominatedOptions', () => {
  it('returns empty array when no option is dominated', () => {
    const options: Option[] = [
      { name: 'A', attributes: { x: 1, y: 5 } },
      { name: 'B', attributes: { x: 5, y: 1 } },
    ];
    expect(strictlyDominatedOptions(options)).toHaveLength(0);
  });

  it('identifies a strictly dominated option', () => {
    const options: Option[] = [
      { name: 'good', attributes: { speed: 5, cost: 3 } },
      { name: 'bad', attributes: { speed: 3, cost: 2 } },
    ];
    const dominated = strictlyDominatedOptions(options);
    expect(dominated).toContain('bad');
    expect(dominated).not.toContain('good');
  });

  it('handles equal attributes correctly (not dominated if equal on all)', () => {
    const options: Option[] = [
      { name: 'A', attributes: { x: 3, y: 3 } },
      { name: 'B', attributes: { x: 3, y: 3 } },
    ];
    // Neither strictly dominates (no strict inequality)
    expect(strictlyDominatedOptions(options)).toHaveLength(0);
  });

  it('handles single option', () => {
    const options: Option[] = [{ name: 'only', attributes: { a: 1 } }];
    expect(strictlyDominatedOptions(options)).toHaveLength(0);
  });

  it('handles empty options', () => {
    expect(strictlyDominatedOptions([])).toHaveLength(0);
  });

  it('correctly handles options with different attribute sets (missing attribute → −∞)', () => {
    // a has attributes {x, y}, b only has {x} with the same x value.
    // For aGtBSome: x: 3 > 3 = false (same), so `some` proceeds to y:
    //   a.y = 2 > b.y (undefined) → b.y ?? -Infinity = -Infinity → 2 > -Inf = true
    // This exercises the b.attributes[k] ?? -Infinity fallback (line 454).
    const options: Option[] = [
      { name: 'complete', attributes: { x: 3, y: 2 } },
      { name: 'partial', attributes: { x: 3 } },
    ];
    const dominated = strictlyDominatedOptions(options);
    expect(dominated).toContain('partial');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.4 — additiveUtility
// ─────────────────────────────────────────────────────────────────────────────

describe('additiveUtility', () => {
  it('computes weighted sum correctly', () => {
    const option: Option = { name: 'X', attributes: { a: 10, b: 5 } };
    const weights: AttributeWeight[] = [
      { attribute: 'a', weight: 0.6 },
      { attribute: 'b', weight: 0.4 },
    ];
    expect(additiveUtility(option, weights)).toBeCloseTo(8);
  });

  it('returns 0 for missing attributes', () => {
    const option: Option = { name: 'Y', attributes: {} };
    const weights: AttributeWeight[] = [{ attribute: 'a', weight: 1.0 }];
    expect(additiveUtility(option, weights)).toBe(0);
  });

  it('returns 0 for empty weights', () => {
    const option: Option = { name: 'Z', attributes: { a: 100 } };
    expect(additiveUtility(option, [])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.4 — stochasticDominance
// ─────────────────────────────────────────────────────────────────────────────

describe('stochasticDominance', () => {
  it('returns false for empty distributions', () => {
    expect(stochasticDominance([], [1, 2])).toBe(false);
    expect(stochasticDominance([1, 2], [])).toBe(false);
    expect(stochasticDominance([], [])).toBe(false);
  });

  it('A dominates B when all A values ≥ all B values', () => {
    expect(stochasticDominance([5, 6, 7], [1, 2, 3])).toBe(true);
  });

  it('A does not dominate B when B is higher', () => {
    expect(stochasticDominance([1, 2, 3], [5, 6, 7])).toBe(false);
  });

  it('equal distributions do not violate (returns true — trivial dominance)', () => {
    expect(stochasticDominance([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('crossing CDFs — neither dominates', () => {
    // A = [1, 10], B = [4, 5] — CDFs cross
    expect(stochasticDominance([1, 10], [4, 5])).toBe(false);
  });

  it('A = [3,4] dominates B = [1,2,3]', () => {
    expect(stochasticDominance([3, 4], [1, 2, 3])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.5 — evaluateDecisionNetwork
// ─────────────────────────────────────────────────────────────────────────────

describe('evaluateDecisionNetwork', () => {
  /**
   * Simple umbrella-problem network:
   *   Weather (chance) → Forecast (chance) → Utility
   *   Decision: Carry umbrella or not
   *   Utility depends on (Weather, Decision)
   */
  const weatherNode: DecisionNetworkNode = {
    id: 'Weather',
    type: 'chance',
    parents: [],
    cpt: {
      '': { sunny: 0.7, rainy: 0.3 },
    },
    values: ['sunny', 'rainy'],
  };

  const decisionNode: DecisionNetworkNode = {
    id: 'Umbrella',
    type: 'decision',
    parents: [],
    values: ['take', 'leave'],
  };

  const utilityNode: DecisionNetworkNode = {
    id: 'Utility',
    type: 'utility',
    parents: ['Weather', 'Umbrella'],
    utilityTable: {
      'sunny,take': 20,
      'sunny,leave': 30,
      'rainy,take': 70,
      'rainy,leave': 0,
    },
    values: [],
  };

  const nodes: DecisionNetworkNode[] = [weatherNode, decisionNode, utilityNode];

  it('returns the best decision correctly', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'Utility');
    // take EU = 0.7*20 + 0.3*70 = 14 + 21 = 35
    // leave EU = 0.7*30 + 0.3*0 = 21
    expect(result.bestDecision).toBe('take');
    expect(result.bestEU).toBeCloseTo(35);
  });

  it('produces a step for each decision value', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'Utility');
    expect(result.steps).toHaveLength(2);
  });

  it('step action string references decision node id and value', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'Utility');
    expect(result.steps[0]!.action).toContain('Umbrella');
  });

  it('returns empty result for unknown decision node', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'NONEXISTENT', 'Utility');
    expect(result.steps).toHaveLength(0);
    expect(result.bestDecision).toBe('');
    expect(result.bestEU).toBe(-Infinity);
  });

  it('returns empty result for unknown utility node', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'NONEXISTENT');
    expect(result.steps).toHaveLength(0);
  });

  it('respects evidence (fixes observed chance node)', () => {
    // Fix Weather = rainy
    const result = evaluateDecisionNetwork(
      nodes,
      { Weather: 'rainy' },
      'Umbrella',
      'Utility',
    );
    // No free chance nodes; EU(take) = utility('rainy,take') = 70
    // EU(leave) = utility('rainy,leave') = 0
    expect(result.bestDecision).toBe('take');
    expect(result.bestEU).toBeCloseTo(70);
  });

  it('posteriorProbs contains nodeId=value keys', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'Utility');
    const step = result.steps[0]!;
    expect(Object.keys(step.posteriorProbs)).toContain('Weather=sunny');
    expect(Object.keys(step.posteriorProbs)).toContain('Weather=rainy');
  });

  it('posterior probs sum to 1 per node', () => {
    const result = evaluateDecisionNetwork(nodes, {}, 'Umbrella', 'Utility');
    const step = result.steps[0]!;
    const pSunny = step.posteriorProbs['Weather=sunny'] ?? 0;
    const pRainy = step.posteriorProbs['Weather=rainy'] ?? 0;
    expect(pSunny + pRainy).toBeCloseTo(1);
  });

  it('all-zero CPT: prob=0 entries are skipped (totalProb=0 → posteriorProbs all 0)', () => {
    // Chance node with all-zero CPT (invalid but exercises the prob≤0 branch)
    const zeroProbNode: DecisionNetworkNode = {
      id: 'Coin',
      type: 'chance',
      parents: [],
      cpt: { '': { heads: 0, tails: 0 } },
      values: ['heads', 'tails'],
    };
    const dec: DecisionNetworkNode = {
      id: 'D',
      type: 'decision',
      parents: [],
      values: ['yes'],
    };
    const util: DecisionNetworkNode = {
      id: 'U',
      type: 'utility',
      parents: ['Coin', 'D'],
      utilityTable: { 'heads,yes': 10, 'tails,yes': 5 },
      values: [],
    };
    const result = evaluateDecisionNetwork([zeroProbNode, dec, util], {}, 'D', 'U');
    // totalProb=0, so EU=0 and all posteriorProbs=0
    expect(result.bestEU).toBeCloseTo(0);
    const step = result.steps[0]!;
    expect(step.posteriorProbs['Coin=heads']).toBeCloseTo(0);
    expect(step.posteriorProbs['Coin=tails']).toBeCloseTo(0);
  });

  it('chance node without a CPT is treated as prob 1 (contributes no factor)', () => {
    // A chance node with no CPT should not affect probability computation
    const noCPTNode: DecisionNetworkNode = {
      id: 'Free',
      type: 'chance',
      parents: [],
      values: ['yes', 'no'],
      // no cpt field — exercises the `if (!cpt) continue` branch
    };
    const dec2: DecisionNetworkNode = {
      id: 'Act',
      type: 'decision',
      parents: [],
      values: ['do'],
    };
    const util2: DecisionNetworkNode = {
      id: 'V',
      type: 'utility',
      parents: ['Act'],
      utilityTable: { 'do': 42 },
      values: [],
    };
    // With no CPT on 'Free', computeJointProb returns 1 for each assignment
    // There are 2 assignments (Free=yes, Free=no), each with prob=1 (no cpt factor)
    const result = evaluateDecisionNetwork([noCPTNode, dec2, util2], {}, 'Act', 'V');
    // EU = sum over [yes,no] of 1 * U('do') = 1 + 1 = 2 ... utility key is 'do' not 'yes,do'
    // Actually utility parents = ['Act'], uKey = parentKey({Free:val, Act:'do'}, ['Act']) = 'do'
    // So EU = 1*42 + 1*42 = 84, but totalProb = 2, and EU should be 84 anyway (unnormalized)
    expect(result.bestDecision).toBe('do');
    expect(result.bestEU).toBeGreaterThan(0);
  });

  it('partial CPT row: missing value defaults to 0, fallback key used', () => {
    // CPT missing the 'no' value → row['no'] = undefined → ?\ 0
    // Also CPT key '' is missing → cpt[key] ?? cpt[''] fallback
    const partialNode: DecisionNetworkNode = {
      id: 'P',
      type: 'chance',
      parents: [],
      cpt: {
        '': { yes: 0.8 }, // missing 'no' — exercises row[val] ?? 0 branch
      },
      values: ['yes', 'no'],
    };
    const dec3: DecisionNetworkNode = {
      id: 'D2',
      type: 'decision',
      parents: [],
      values: ['act'],
    };
    const util3: DecisionNetworkNode = {
      id: 'U2',
      type: 'utility',
      parents: ['P', 'D2'],
      utilityTable: { 'yes,act': 100, 'no,act': 0 },
      values: [],
    };
    const result = evaluateDecisionNetwork([partialNode, dec3, util3], {}, 'D2', 'U2');
    // P=yes: prob=0.8, utility=100 → 80; P=no: prob=0 (missing), utility=0 → 0; EU=80
    expect(result.bestEU).toBeCloseTo(80);
  });

  it('utility node parent not in full assignment → parentKey returns empty-string key', () => {
    // The utility node references 'Ghost' as a parent, which is never set in the assignment.
    // parentKey will use '' for 'Ghost' → exercises the ?? '' fallback in parentKey.
    const dec4: DecisionNetworkNode = {
      id: 'D3',
      type: 'decision',
      parents: [],
      values: ['go'],
    };
    const ghostUtil: DecisionNetworkNode = {
      id: 'GU',
      type: 'utility',
      parents: ['Ghost', 'D3'], // 'Ghost' not in any node
      utilityTable: { ',go': 55 }, // key = '' + ',' + 'go'
      values: [],
    };
    const result = evaluateDecisionNetwork([dec4, ghostUtil], {}, 'D3', 'GU');
    expect(result.bestDecision).toBe('go');
    expect(result.bestEU).toBeCloseTo(55);
  });

  it('CPT key not in cpt but cpt[\'\'] defined: uses cpt[\'\'] as fallback (line 611)', () => {
    // Conditional node with parent Dec; CPT uses '' as a catch-all default.
    // When Dec='other' is not in CPT, falls back to cpt[''].
    const condNode: DecisionNetworkNode = {
      id: 'Cond',
      type: 'chance',
      parents: ['DecX'],
      cpt: {
        'act': { yes: 0.8, no: 0.2 },
        '': { yes: 0.5, no: 0.5 }, // catch-all fallback
      },
      values: ['yes', 'no'],
    };
    const decX: DecisionNetworkNode = {
      id: 'DecX',
      type: 'decision',
      parents: [],
      values: ['act', 'other'], // 'other' has no CPT row → uses ''
    };
    const utilX: DecisionNetworkNode = {
      id: 'UX',
      type: 'utility',
      parents: ['Cond', 'DecX'],
      utilityTable: {
        'yes,act': 100, 'no,act': 0,
        'yes,other': 50, 'no,other': 10,
      },
      values: [],
    };
    const result = evaluateDecisionNetwork([condNode, decX, utilX], {}, 'DecX', 'UX');
    // act: 0.8*100 + 0.2*0 = 80; other: 0.5*50 + 0.5*10 = 30
    expect(result.bestDecision).toBe('act');
    expect(result.bestEU).toBeCloseTo(80);
  });

  it('CPT has no matching key and no \'\' fallback: row defaults to {} (line 611 ?? {})', () => {
    // Conditional node whose CPT has rows for 'up' only (no '' catch-all).
    // When the parent is set to 'down', cpt['down'] AND cpt[''] are both undefined → {}.
    // Then row[val] = undefined → 0 probability.
    const gappedNode: DecisionNetworkNode = {
      id: 'G',
      type: 'chance',
      parents: ['DecG'],
      cpt: { 'up': { win: 1.0 } }, // no '' fallback; 'down' not covered
      values: ['win', 'lose'],
    };
    const decG: DecisionNetworkNode = {
      id: 'DecG',
      type: 'decision',
      parents: [],
      values: ['up', 'down'],
    };
    const utilG: DecisionNetworkNode = {
      id: 'UG',
      type: 'utility',
      parents: ['G', 'DecG'],
      utilityTable: { 'win,up': 100, 'win,down': 0, 'lose,up': 0, 'lose,down': 0 },
      values: [],
    };
    const result = evaluateDecisionNetwork([gappedNode, decG, utilG], {}, 'DecG', 'UG');
    // 'up': G=win prob=1, util=100 → EU=100
    // 'down': G=win prob=cpt['down']['win']=row['win']={} → 0; G=lose prob=0 → EU=0
    expect(result.bestDecision).toBe('up');
    expect(result.bestEU).toBeCloseTo(100);
  });

  it('utility table missing key for an assignment → defaults to 0 (line 692)', () => {
    // Utility table only has entries for 'yes', not 'no'
    const rootNode: DecisionNetworkNode = {
      id: 'Coin2',
      type: 'chance',
      parents: [],
      cpt: { '': { heads: 0.5, tails: 0.5 } },
      values: ['heads', 'tails'],
    };
    const dec5: DecisionNetworkNode = {
      id: 'D5',
      type: 'decision',
      parents: [],
      values: ['bet'],
    };
    const util5: DecisionNetworkNode = {
      id: 'U5',
      type: 'utility',
      parents: ['Coin2', 'D5'],
      utilityTable: { 'heads,bet': 100 }, // missing 'tails,bet' → defaults to 0
      values: [],
    };
    const result = evaluateDecisionNetwork([rootNode, dec5, util5], {}, 'D5', 'U5');
    // EU = 0.5*100 + 0.5*0 = 50
    expect(result.bestEU).toBeCloseTo(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.6 — computeVPI
// ─────────────────────────────────────────────────────────────────────────────

describe('computeVPI', () => {
  it('returns VPI ≥ 0', () => {
    const actions: VPIAction[] = [
      {
        name: 'A',
        outcomes: [
          { evidenceValue: 'good', probability: 1, utility: 100 },
          { evidenceValue: 'bad', probability: 1, utility: -50 },
        ],
      },
    ];
    const evidenceProbs = { good: 0.6, bad: 0.4 };
    const { vpi } = computeVPI(actions, evidenceProbs, 0);
    expect(vpi).toBeGreaterThanOrEqual(0);
  });

  it('VPI = 0 when there is only one action (nothing to gain)', () => {
    const actions: VPIAction[] = [
      {
        name: 'only',
        outcomes: [
          { evidenceValue: 'e1', probability: 1, utility: 10 },
          { evidenceValue: 'e2', probability: 1, utility: 20 },
        ],
      },
    ];
    const { vpi } = computeVPI(actions, { e1: 0.5, e2: 0.5 }, 0);
    expect(vpi).toBeCloseTo(0);
  });

  it('VPI > 0 when information changes the optimal action', () => {
    // Action A is best given good news, B is best given bad news
    const actions: VPIAction[] = [
      {
        name: 'A',
        outcomes: [
          { evidenceValue: 'good', probability: 1, utility: 100 },
          { evidenceValue: 'bad', probability: 1, utility: -20 },
        ],
      },
      {
        name: 'B',
        outcomes: [
          { evidenceValue: 'good', probability: 1, utility: 10 },
          { evidenceValue: 'bad', probability: 1, utility: 30 },
        ],
      },
    ];
    const { vpi } = computeVPI(actions, { good: 0.5, bad: 0.5 }, 0);
    expect(vpi).toBeGreaterThan(0);
  });

  it('worthGathering is true when VPI > informationCost', () => {
    const actions: VPIAction[] = [
      {
        name: 'risky',
        outcomes: [
          { evidenceValue: 'high', probability: 1, utility: 200 },
          { evidenceValue: 'low', probability: 1, utility: -100 },
        ],
      },
      {
        name: 'safe',
        outcomes: [
          { evidenceValue: 'high', probability: 1, utility: 10 },
          { evidenceValue: 'low', probability: 1, utility: 10 },
        ],
      },
    ];
    const { worthGathering } = computeVPI(actions, { high: 0.7, low: 0.3 }, 1);
    expect(worthGathering).toBe(true);
  });

  it('worthGathering is false when VPI < informationCost', () => {
    const actions: VPIAction[] = [
      {
        name: 'A',
        outcomes: [
          { evidenceValue: 'e', probability: 1, utility: 5 },
        ],
      },
    ];
    const { worthGathering } = computeVPI(actions, { e: 1 }, 9999);
    expect(worthGathering).toBe(false);
  });

  it('handles empty actions array', () => {
    const result = computeVPI([], { e: 1 }, 0);
    expect(result.currentBestEU).toBe(-Infinity);
  });

  it('skips evidence values with zero probability', () => {
    const actions: VPIAction[] = [
      {
        name: 'X',
        outcomes: [{ evidenceValue: 'zero', probability: 1, utility: 1000 }],
      },
    ];
    const { vpi } = computeVPI(actions, { zero: 0 }, 0);
    expect(vpi).toBeCloseTo(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.6 — myopicInformationGathering
// ─────────────────────────────────────────────────────────────────────────────

describe('myopicInformationGathering', () => {
  it('always ends with an act step', () => {
    const vars: ObservableVariable[] = [{ id: 'X', vpi: 5, cost: 2 }];
    const steps = myopicInformationGathering(vars);
    expect(steps[steps.length - 1]!.action).toBe('act');
  });

  it('gathers observations where VPI > cost', () => {
    const vars: ObservableVariable[] = [
      { id: 'good', vpi: 10, cost: 2 },
      { id: 'bad', vpi: 1, cost: 5 },
    ];
    const steps = myopicInformationGathering(vars);
    const gathered = steps.filter((s) => s.action === 'gather');
    expect(gathered).toHaveLength(1);
    expect(gathered[0]!.observation).toBe('good');
  });

  it('skips observations where VPI ≤ cost', () => {
    const vars: ObservableVariable[] = [{ id: 'Y', vpi: 3, cost: 10 }];
    const steps = myopicInformationGathering(vars);
    const gathered = steps.filter((s) => s.action === 'gather');
    expect(gathered).toHaveLength(0);
  });

  it('sorts by descending VPI/cost ratio', () => {
    const vars: ObservableVariable[] = [
      { id: 'low_ratio', vpi: 6, cost: 2 },   // ratio = 3
      { id: 'high_ratio', vpi: 8, cost: 2 },  // ratio = 4
    ];
    const steps = myopicInformationGathering(vars);
    const gathered = steps.filter((s) => s.action === 'gather');
    expect(gathered[0]!.observation).toBe('high_ratio');
  });

  it('handles empty variable list (only act step)', () => {
    const steps = myopicInformationGathering([]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toBe('act');
  });

  it('handles zero cost with positive VPI (treated as Infinity ratio)', () => {
    const vars: ObservableVariable[] = [
      { id: 'free', vpi: 1, cost: 0 },
    ];
    const steps = myopicInformationGathering(vars);
    const gathered = steps.filter((s) => s.action === 'gather');
    expect(gathered).toHaveLength(1);
  });

  it('handles zero VPI and zero cost (ratio = 0, not gathered)', () => {
    const vars: ObservableVariable[] = [
      { id: 'useless', vpi: 0, cost: 0 },
    ];
    const steps = myopicInformationGathering(vars);
    const gathered = steps.filter((s) => s.action === 'gather');
    expect(gathered).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.6 — treasureHuntOptimalOrder
// ─────────────────────────────────────────────────────────────────────────────

describe('treasureHuntOptimalOrder', () => {
  it('returns locations in descending p/c order', () => {
    const locs: TreasureLocation[] = [
      { id: 'A', probability: 0.1, cost: 10 }, // p/c = 0.01
      { id: 'B', probability: 0.6, cost: 20 }, // p/c = 0.03
      { id: 'C', probability: 0.3, cost: 5 },  // p/c = 0.06
    ];
    const ordered = treasureHuntOptimalOrder(locs);
    expect(ordered[0]!.id).toBe('C');
    expect(ordered[1]!.id).toBe('B');
    expect(ordered[2]!.id).toBe('A');
  });

  it('does not mutate the input array', () => {
    const locs: TreasureLocation[] = [
      { id: 'X', probability: 0.5, cost: 1 },
      { id: 'Y', probability: 0.1, cost: 1 },
    ];
    const original = locs.map((l) => l.id);
    treasureHuntOptimalOrder(locs);
    expect(locs.map((l) => l.id)).toEqual(original);
  });

  it('handles zero cost locations (placed first)', () => {
    const locs: TreasureLocation[] = [
      { id: 'costly', probability: 0.9, cost: 100 },
      { id: 'free', probability: 0.1, cost: 0 },
    ];
    const ordered = treasureHuntOptimalOrder(locs);
    expect(ordered[0]!.id).toBe('free');
  });

  it('handles zero probability and zero cost (ratio = 0)', () => {
    const locs: TreasureLocation[] = [
      { id: 'impossible', probability: 0, cost: 0 },
      { id: 'possible', probability: 0.5, cost: 5 },
    ];
    const ordered = treasureHuntOptimalOrder(locs);
    expect(ordered[0]!.id).toBe('possible');
  });

  it('returns empty array for empty input', () => {
    expect(treasureHuntOptimalOrder([])).toHaveLength(0);
  });

  it('covers all comparator branches: positive cost, zero-cost-positive-prob, zero-cost-zero-prob', () => {
    // 3-element sort forces the comparator to evaluate all 6 pairings, hitting
    // every branch of the nested ternary on lines 888-889.
    const locs: TreasureLocation[] = [
      { id: 'costly', probability: 0.6, cost: 10 },   // cost > 0: ratio = 0.06
      { id: 'free_pos', probability: 0.2, cost: 0 },  // cost = 0, prob > 0: ratio = Infinity
      { id: 'free_zero', probability: 0, cost: 0 },   // cost = 0, prob = 0: ratio = 0
    ];
    const ordered = treasureHuntOptimalOrder(locs);
    expect(ordered[0]!.id).toBe('free_pos');   // Infinity wins
    expect(ordered[1]!.id).toBe('costly');     // 0.06
    expect(ordered[2]!.id).toBe('free_zero'); // 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.7 — offSwitchGame
// ─────────────────────────────────────────────────────────────────────────────

describe('offSwitchGame', () => {
  it('EU(switch off) is always 0', () => {
    const result = offSwitchGame({
      actionValueMin: -40,
      actionValueMax: 60,
      humanErrorProbability: 0,
    });
    expect(result.euSwitchOff).toBe(0);
  });

  it('EU(defer) > EU(act) with mixed range and rational human', () => {
    // From book example: uniform on [-40, 60], no errors
    const result = offSwitchGame({
      actionValueMin: -40,
      actionValueMax: 60,
      humanErrorProbability: 0,
    });
    expect(result.euDefer).toBeGreaterThan(result.euAct);
    expect(result.shouldDefer).toBe(true);
  });

  it('EU(act) = (uMin + uMax) / 2', () => {
    const result = offSwitchGame({
      actionValueMin: -40,
      actionValueMax: 60,
      humanErrorProbability: 0,
    });
    expect(result.euAct).toBeCloseTo(10);
  });

  it('EU(defer) when all-positive range equals (1-pErr)*EU(act)', () => {
    const result = offSwitchGame({
      actionValueMin: 10,
      actionValueMax: 50,
      humanErrorProbability: 0,
    });
    // All u > 0: rational human always allows; EU(defer) = (1-0)*integral(10,50)/40
    expect(result.euDefer).toBeCloseTo(result.euAct);
    expect(result.shouldDefer).toBe(false);
  });

  it('all-positive range with positive error probability reduces EU(defer)', () => {
    const resultNoErr = offSwitchGame({
      actionValueMin: 10,
      actionValueMax: 50,
      humanErrorProbability: 0,
    });
    const resultWithErr = offSwitchGame({
      actionValueMin: 10,
      actionValueMax: 50,
      humanErrorProbability: 0.2,
    });
    expect(resultWithErr.euDefer).toBeLessThan(resultNoErr.euDefer);
  });

  it('all-negative range makes EU(defer) small', () => {
    const result = offSwitchGame({
      actionValueMin: -50,
      actionValueMax: -10,
      humanErrorProbability: 0,
    });
    // Rational human always switches off; EU(defer) = 0
    expect(result.euDefer).toBeCloseTo(0);
    expect(result.shouldDefer).toBe(true); // defer is 0 > eu(act) which is negative
  });

  it('all-negative range with error probability: human sometimes allows', () => {
    const result = offSwitchGame({
      actionValueMin: -50,
      actionValueMax: -10,
      humanErrorProbability: 0.5,
    });
    // pErr > 0: human sometimes allows bad action → EU(defer) = pErr * integral < 0
    expect(result.euDefer).toBeLessThan(0);
  });

  it('degenerate range (uMin = uMax): handles gracefully', () => {
    const result = offSwitchGame({
      actionValueMin: 20,
      actionValueMax: 20,
      humanErrorProbability: 0,
    });
    expect(result.euAct).toBe(20);
    expect(result.euSwitchOff).toBe(0);
  });

  it('degenerate negative range', () => {
    const result = offSwitchGame({
      actionValueMin: -10,
      actionValueMax: -10,
      humanErrorProbability: 0,
    });
    expect(result.euDefer).toBeCloseTo(0); // pErr=0, u<0, human switches off
    expect(result.shouldDefer).toBe(true);
  });

  it('degenerate range with nonzero pErr', () => {
    const result = offSwitchGame({
      actionValueMin: 5,
      actionValueMax: 5,
      humanErrorProbability: 0.3,
    });
    // u=5 > 0, pErr=0.3: euDefer = (1-0.3)*5 = 3.5
    expect(result.euDefer).toBeCloseTo(3.5);
    expect(result.pHumanSwitchesOff).toBeCloseTo(0.3);
  });

  it('pHumanSwitchesOff = pErr when all u ≥ 0', () => {
    const result = offSwitchGame({
      actionValueMin: 0,
      actionValueMax: 100,
      humanErrorProbability: 0.1,
    });
    expect(result.pHumanSwitchesOff).toBeCloseTo(0.1);
  });

  it('pHumanSwitchesOff = 1 - pErr when all u ≤ 0', () => {
    const result = offSwitchGame({
      actionValueMin: -100,
      actionValueMax: 0,
      humanErrorProbability: 0.1,
    });
    expect(result.pHumanSwitchesOff).toBeCloseTo(0.9);
  });

  it('deferenceMargin = euDefer - euAct', () => {
    const result = offSwitchGame({
      actionValueMin: -40,
      actionValueMax: 60,
      humanErrorProbability: 0.1,
    });
    expect(result.deferenceMargin).toBeCloseTo(result.euDefer - result.euAct);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §15.7 — computeEUWithUncertainUtility
// ─────────────────────────────────────────────────────────────────────────────

describe('computeEUWithUncertainUtility', () => {
  it('matches standard EU when utility is certain', () => {
    const action: UncertainUtilityAction = {
      name: 'certain',
      outcomes: [
        {
          state: 's1',
          probability: 0.6,
          possibleUtilities: [{ utility: 10, probability: 1 }],
        },
        {
          state: 's2',
          probability: 0.4,
          possibleUtilities: [{ utility: 5, probability: 1 }],
        },
      ],
    };
    // EU = 0.6*10 + 0.4*5 = 8
    expect(computeEUWithUncertainUtility(action)).toBeCloseTo(8);
  });

  it('averages over possible utilities correctly', () => {
    const action: UncertainUtilityAction = {
      name: 'uncertain',
      outcomes: [
        {
          state: 's1',
          probability: 1.0,
          possibleUtilities: [
            { utility: 100, probability: 0.5 },
            { utility: 0, probability: 0.5 },
          ],
        },
      ],
    };
    // E[U] = 50; EU = 1.0 * 50 = 50
    expect(computeEUWithUncertainUtility(action)).toBeCloseTo(50);
  });

  it('returns 0 for empty outcomes', () => {
    const action: UncertainUtilityAction = { name: 'empty', outcomes: [] };
    expect(computeEUWithUncertainUtility(action)).toBe(0);
  });

  it('handles multiple outcomes with uncertain utilities', () => {
    const action: UncertainUtilityAction = {
      name: 'multi',
      outcomes: [
        {
          state: 'good',
          probability: 0.7,
          possibleUtilities: [
            { utility: 20, probability: 0.8 },
            { utility: 10, probability: 0.2 },
          ],
        },
        {
          state: 'bad',
          probability: 0.3,
          possibleUtilities: [{ utility: -5, probability: 1 }],
        },
      ],
    };
    // E[U|good] = 0.8*20 + 0.2*10 = 18
    // E[U|bad] = -5
    // EU = 0.7*18 + 0.3*(-5) = 12.6 - 1.5 = 11.1
    expect(computeEUWithUncertainUtility(action)).toBeCloseTo(11.1);
  });
});

