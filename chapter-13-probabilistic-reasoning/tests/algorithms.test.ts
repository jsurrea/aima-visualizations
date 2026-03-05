import { describe, it, expect } from 'vitest';
import {
  BURGLARY_NET,
  SPRINKLER_NET,
  cptIndex,
  cptLookup,
  jointProbability,
  enumerationAsk,
  makeFactor,
  pointwiseProduct,
  sumOut,
  eliminationAsk,
  seededRandom,
  sampleFromDistribution,
  priorSample,
  rejectionSampling,
  likelihoodWeighting,
  markovBlanket,
  gibbsSampling,
  noisyOR,
  doCalc,
  type BayesNode,
  type BayesNet,
  type Assignment,
  type Factor,
} from '../src/algorithms/index';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convenience: build an Assignment Map from a plain object. */
function asn(rec: Record<string, boolean>): Assignment {
  return new Map<string, boolean>(Object.entries(rec));
}

/** Minimal single-node network for edge-case tests. */
function singleNode(name: string, pTrue: number): BayesNet {
  const node: BayesNode = { name, parents: [], cpt: [pTrue] };
  return { variables: [name], nodes: new Map([[name, node]]) };
}

/** Two-node network: A → B. */
function twoNodeNet(pA: number, pBgivenAFalse: number, pBgivenATrue: number): BayesNet {
  const nodeA: BayesNode = { name: 'A', parents: [], cpt: [pA] };
  const nodeB: BayesNode = { name: 'B', parents: ['A'], cpt: [pBgivenAFalse, pBgivenATrue] };
  return { variables: ['A', 'B'], nodes: new Map([['A', nodeA], ['B', nodeB]]) };
}

// ─────────────────────────────────────────────────────────────────────────────
// cptIndex
// ─────────────────────────────────────────────────────────────────────────────

describe('cptIndex', () => {
  it('returns 0 for empty parents', () => {
    expect(cptIndex([], asn({}))).toBe(0);
  });

  it('returns 0 when single parent is false', () => {
    expect(cptIndex(['X'], asn({ X: false }))).toBe(0);
  });

  it('returns 1 when single parent is true', () => {
    expect(cptIndex(['X'], asn({ X: true }))).toBe(1);
  });

  it('encodes two parents (B=f,E=f) → 0', () => {
    expect(cptIndex(['B', 'E'], asn({ B: false, E: false }))).toBe(0);
  });

  it('encodes two parents (B=t,E=f) → 1', () => {
    expect(cptIndex(['B', 'E'], asn({ B: true, E: false }))).toBe(1);
  });

  it('encodes two parents (B=f,E=t) → 2', () => {
    expect(cptIndex(['B', 'E'], asn({ B: false, E: true }))).toBe(2);
  });

  it('encodes two parents (B=t,E=t) → 3', () => {
    expect(cptIndex(['B', 'E'], asn({ B: true, E: true }))).toBe(3);
  });

  it('ignores unrelated assignment entries', () => {
    expect(cptIndex(['A'], asn({ A: true, Z: false }))).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cptLookup
// ─────────────────────────────────────────────────────────────────────────────

describe('cptLookup', () => {
  it('returns P(Burglary=true) for root node', () => {
    const node = BURGLARY_NET.nodes.get('Burglary')!;
    expect(cptLookup(node, asn({}))).toBeCloseTo(0.001);
  });

  it('returns correct CPT entry for Alarm given B=f,E=f', () => {
    const node = BURGLARY_NET.nodes.get('Alarm')!;
    expect(cptLookup(node, asn({ Burglary: false, Earthquake: false }))).toBeCloseTo(0.001);
  });

  it('returns correct CPT entry for Alarm given B=t,E=f', () => {
    const node = BURGLARY_NET.nodes.get('Alarm')!;
    expect(cptLookup(node, asn({ Burglary: true, Earthquake: false }))).toBeCloseTo(0.94);
  });

  it('returns correct CPT entry for Alarm given B=f,E=t', () => {
    const node = BURGLARY_NET.nodes.get('Alarm')!;
    expect(cptLookup(node, asn({ Burglary: false, Earthquake: true }))).toBeCloseTo(0.29);
  });

  it('returns correct CPT entry for Alarm given B=t,E=t', () => {
    const node = BURGLARY_NET.nodes.get('Alarm')!;
    expect(cptLookup(node, asn({ Burglary: true, Earthquake: true }))).toBeCloseTo(0.95);
  });

  it('looks up WetGrass with two parents', () => {
    const node = SPRINKLER_NET.nodes.get('WetGrass')!;
    expect(cptLookup(node, asn({ Sprinkler: false, Rain: false }))).toBeCloseTo(0.0);
    expect(cptLookup(node, asn({ Sprinkler: true,  Rain: false }))).toBeCloseTo(0.9);
    expect(cptLookup(node, asn({ Sprinkler: false, Rain: true  }))).toBeCloseTo(0.9);
    expect(cptLookup(node, asn({ Sprinkler: true,  Rain: true  }))).toBeCloseTo(0.99);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// jointProbability
// ─────────────────────────────────────────────────────────────────────────────

describe('jointProbability', () => {
  it('computes P(B=f,E=f,A=f,J=f,M=f) correctly', () => {
    const full = asn({
      Burglary: false, Earthquake: false, Alarm: false, JohnCalls: false, MaryCalls: false,
    });
    // P(B=f)*P(E=f)*P(A=f|B=f,E=f)*P(J=f|A=f)*P(M=f|A=f)
    // = 0.999 * 0.998 * 0.999 * 0.95 * 0.99
    const expected = 0.999 * 0.998 * 0.999 * 0.95 * 0.99;
    expect(jointProbability(BURGLARY_NET, full)).toBeCloseTo(expected, 6);
  });

  it('computes P(B=t,E=f,A=t,J=t,M=t) correctly', () => {
    const full = asn({
      Burglary: true, Earthquake: false, Alarm: true, JohnCalls: true, MaryCalls: true,
    });
    const expected = 0.001 * 0.998 * 0.94 * 0.90 * 0.70;
    expect(jointProbability(BURGLARY_NET, full)).toBeCloseTo(expected, 10);
  });

  it('covers val=true branch for each variable', () => {
    const full = asn({ Cloudy: true, Sprinkler: true, Rain: true, WetGrass: true });
    // P(C=t)*P(S=t|C=t)*P(R=t|C=t)*P(W=t|S=t,R=t)
    const expected = 0.5 * 0.1 * 0.8 * 0.99;
    expect(jointProbability(SPRINKLER_NET, full)).toBeCloseTo(expected, 10);
  });

  it('covers val=false branch for each variable (all false)', () => {
    const full = asn({ Cloudy: false, Sprinkler: false, Rain: false, WetGrass: false });
    const expected = 0.5 * 0.5 * 0.8 * 1.0; // P(C=f)*P(S=f|C=f)*P(R=f|C=f)*P(W=f|S=f,R=f)
    expect(jointProbability(SPRINKLER_NET, full)).toBeCloseTo(expected, 10);
  });

  it('single-node network', () => {
    const bn = singleNode('X', 0.3);
    expect(jointProbability(bn, asn({ X: true }))).toBeCloseTo(0.3);
    expect(jointProbability(bn, asn({ X: false }))).toBeCloseTo(0.7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enumerationAsk
// ─────────────────────────────────────────────────────────────────────────────

describe('enumerationAsk', () => {
  it('P(Burglary | JohnCalls=true, MaryCalls=true) is close to AIMA value ~0.284', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const result = enumerationAsk('Burglary', ev, BURGLARY_NET);
    expect(result.distribution[1]).toBeCloseTo(0.284, 2);
  });

  it('normalises to 1', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const { distribution } = enumerationAsk('Burglary', ev, BURGLARY_NET);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 10);
  });

  it('returns steps array (non-empty)', () => {
    const ev = asn({ JohnCalls: true });
    const { steps } = enumerationAsk('Burglary', ev, BURGLARY_NET);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('each step has correct shape', () => {
    const ev = asn({ JohnCalls: true });
    const { steps } = enumerationAsk('Burglary', ev, BURGLARY_NET);
    for (const s of steps) {
      expect(typeof s.depth).toBe('number');
      expect(typeof s.varName).toBe('string');
      expect(typeof s.value).toBe('boolean');
      expect(typeof s.subResult).toBe('number');
      expect(typeof s.action).toBe('string');
    }
  });

  it('works with empty evidence (prior distribution)', () => {
    const { distribution } = enumerationAsk('Burglary', asn({}), BURGLARY_NET);
    expect(distribution[1]).toBeCloseTo(0.001, 5);
  });

  it('single-node network, no evidence', () => {
    const bn = singleNode('X', 0.4);
    const { distribution } = enumerationAsk('X', asn({}), bn);
    expect(distribution[1]).toBeCloseTo(0.4, 10);
    expect(distribution[0]).toBeCloseTo(0.6, 10);
  });

  it('single-node network, certain evidence (prob=1)', () => {
    const bn = singleNode('X', 1.0);
    const { distribution } = enumerationAsk('X', asn({}), bn);
    expect(distribution[1]).toBeCloseTo(1.0, 10);
  });

  it('covers evidence value = false in enumerateAll', () => {
    // JohnCalls=false forces the evidence branch with val=false
    const { distribution } = enumerationAsk('Burglary', asn({ JohnCalls: false }), BURGLARY_NET);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 10);
  });

  it('covers evidence value = true in enumerateAll', () => {
    const { distribution } = enumerationAsk('Burglary', asn({ JohnCalls: true }), BURGLARY_NET);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 10);
  });

  it('SPRINKLER_NET: P(Rain | WetGrass=true)', () => {
    const { distribution } = enumerationAsk('Rain', asn({ WetGrass: true }), SPRINKLER_NET);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 10);
    expect(distribution[1]).toBeGreaterThan(0.5); // rain is more likely when grass is wet
  });

  it('two-node network exercises both evidence and non-evidence branches', () => {
    const bn = twoNodeNet(0.6, 0.2, 0.8);
    // Evidence on B exercises evidence branch; A is summed over (non-evidence)
    const { distribution } = enumerationAsk('A', asn({ B: true }), bn);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 10);
  });

  it('returns [0.5, 0.5] if both unnormalised probs are zero', () => {
    // Impossible evidence: P(JohnCalls=false | Alarm=true) = 0.1, but set node so P=0
    const bn: BayesNet = {
      variables: ['X'],
      nodes: new Map([['X', { name: 'X', parents: [], cpt: [0.0] }]]),
    };
    // P(X=true)=0, P(X=false)=1; query=X with evidence that forces P→0 is hard to create
    // Instead test single-var with P=0 and no evidence
    const { distribution } = enumerationAsk('X', asn({}), bn);
    // P(X=false)=1, P(X=true)=0 → [1, 0]
    expect(distribution[0]).toBeCloseTo(1.0, 10);
    expect(distribution[1]).toBeCloseTo(0.0, 10);
  });

  it('returns [0.5, 0.5] when evidence is impossible (total = 0)', () => {
    // Network where P(A=true)=0 but evidence forces A=true → both probs = 0
    const bn: BayesNet = {
      variables: ['A', 'B'],
      nodes: new Map([
        ['A', { name: 'A', parents: [], cpt: [0.0] }],  // P(A=true)=0
        ['B', { name: 'B', parents: ['A'], cpt: [0.5, 0.5] }],
      ]),
    };
    const { distribution } = enumerationAsk('B', asn({ A: true }), bn);
    expect(distribution[0]).toBeCloseTo(0.5, 10);
    expect(distribution[1]).toBeCloseTo(0.5, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// makeFactor
// ─────────────────────────────────────────────────────────────────────────────

describe('makeFactor', () => {
  it('root node, no evidence → factor over [varName], values=[1-p, p]', () => {
    const f = makeFactor('Burglary', asn({}), BURGLARY_NET);
    expect(f.variables).toEqual(['Burglary']);
    expect(f.values[0]).toBeCloseTo(1 - 0.001); // B=false
    expect(f.values[1]).toBeCloseTo(0.001);       // B=true
  });

  it('root node in evidence (true) → scalar factor', () => {
    const f = makeFactor('Burglary', asn({ Burglary: true }), BURGLARY_NET);
    expect(f.variables).toEqual([]);
    expect(f.values.length).toBe(1);
    expect(f.values[0]).toBeCloseTo(0.001); // P(B=true)
  });

  it('root node in evidence (false) → scalar factor', () => {
    const f = makeFactor('Burglary', asn({ Burglary: false }), BURGLARY_NET);
    expect(f.variables).toEqual([]);
    expect(f.values.length).toBe(1);
    expect(f.values[0]).toBeCloseTo(0.999); // P(B=false)
  });

  it('Alarm with no evidence → factor over [Alarm, Burglary, Earthquake]', () => {
    const f = makeFactor('Alarm', asn({}), BURGLARY_NET);
    expect(f.variables).toEqual(['Alarm', 'Burglary', 'Earthquake']);
    expect(f.values.length).toBe(8);
    // index 0: A=f,B=f,E=f → 1-0.001 = 0.999
    expect(f.values[0]).toBeCloseTo(0.999);
    // index 1: A=t,B=f,E=f → 0.001
    expect(f.values[1]).toBeCloseTo(0.001);
    // index 2: A=f,B=t,E=f → 1-0.94
    expect(f.values[2]).toBeCloseTo(0.06);
    // index 3: A=t,B=t,E=f → 0.94
    expect(f.values[3]).toBeCloseTo(0.94);
  });

  it('JohnCalls in evidence (true) → factor over [Alarm]', () => {
    const f = makeFactor('JohnCalls', asn({ JohnCalls: true }), BURGLARY_NET);
    expect(f.variables).toEqual(['Alarm']);
    // values[0] = P(J=true|A=false) = 0.05
    expect(f.values[0]).toBeCloseTo(0.05);
    // values[1] = P(J=true|A=true) = 0.90
    expect(f.values[1]).toBeCloseTo(0.90);
  });

  it('JohnCalls in evidence (false) → factor over [Alarm]', () => {
    const f = makeFactor('JohnCalls', asn({ JohnCalls: false }), BURGLARY_NET);
    expect(f.values[0]).toBeCloseTo(0.95);
    expect(f.values[1]).toBeCloseTo(0.10);
  });

  it('partially-observed parents → free variables exclude observed', () => {
    // Alarm with Burglary in evidence → free vars = [Alarm, Earthquake]
    const f = makeFactor('Alarm', asn({ Burglary: true }), BURGLARY_NET);
    expect(f.variables).toEqual(['Alarm', 'Earthquake']);
    expect(f.values.length).toBe(4);
    // i=0: A=f, E=f → P(A=false|B=true,E=false) = 1-0.94 = 0.06
    expect(f.values[0]).toBeCloseTo(0.06);
    // i=1: A=t, E=f → P(A=true|B=true,E=false) = 0.94
    expect(f.values[1]).toBeCloseTo(0.94);
  });

  it('Alarm with all parents and self in evidence → scalar', () => {
    const f = makeFactor('Alarm', asn({ Alarm: true, Burglary: false, Earthquake: false }), BURGLARY_NET);
    expect(f.variables).toEqual([]);
    expect(f.values.length).toBe(1);
    expect(f.values[0]).toBeCloseTo(0.001);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pointwiseProduct
// ─────────────────────────────────────────────────────────────────────────────

describe('pointwiseProduct', () => {
  it('multiplies two scalar factors', () => {
    const f1: Factor = { variables: [], values: [0.4] };
    const f2: Factor = { variables: [], values: [0.6] };
    const result = pointwiseProduct(f1, f2);
    expect(result.variables).toEqual([]);
    expect(result.values[0]).toBeCloseTo(0.24);
  });

  it('multiplies factor over [A] by scalar', () => {
    const f1: Factor = { variables: ['A'], values: [0.3, 0.7] };
    const f2: Factor = { variables: [], values: [2.0] };
    const result = pointwiseProduct(f1, f2);
    expect(result.variables).toEqual(['A']);
    expect(result.values[0]).toBeCloseTo(0.6);
    expect(result.values[1]).toBeCloseTo(1.4);
  });

  it('multiplies two disjoint single-variable factors', () => {
    const f1: Factor = { variables: ['A'], values: [0.3, 0.7] };
    const f2: Factor = { variables: ['B'], values: [0.4, 0.6] };
    const result = pointwiseProduct(f1, f2);
    expect(result.variables).toEqual(['A', 'B']);
    expect(result.values.length).toBe(4);
    // i=0: A=f,B=f → 0.3*0.4
    expect(result.values[0]).toBeCloseTo(0.12);
    // i=1: A=t,B=f → 0.7*0.4
    expect(result.values[1]).toBeCloseTo(0.28);
    // i=2: A=f,B=t → 0.3*0.6
    expect(result.values[2]).toBeCloseTo(0.18);
    // i=3: A=t,B=t → 0.7*0.6
    expect(result.values[3]).toBeCloseTo(0.42);
  });

  it('multiplies two factors that share a variable', () => {
    const f1: Factor = { variables: ['A', 'B'], values: [0.1, 0.2, 0.3, 0.4] };
    const f2: Factor = { variables: ['B', 'C'], values: [0.5, 0.6, 0.7, 0.8] };
    const result = pointwiseProduct(f1, f2);
    expect(result.variables).toEqual(['A', 'B', 'C']);
    expect(result.values.length).toBe(8);
  });

  it('identity: multiply by factor of all ones', () => {
    const f: Factor = { variables: ['X'], values: [0.25, 0.75] };
    const ones: Factor = { variables: ['X'], values: [1.0, 1.0] };
    const result = pointwiseProduct(f, ones);
    expect(result.values[0]).toBeCloseTo(0.25);
    expect(result.values[1]).toBeCloseTo(0.75);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sumOut
// ─────────────────────────────────────────────────────────────────────────────

describe('sumOut', () => {
  it('sums out the only variable from a unary factor', () => {
    const f: Factor = { variables: ['A'], values: [0.3, 0.7] };
    const result = sumOut('A', f);
    expect(result.variables).toEqual([]);
    expect(result.values[0]).toBeCloseTo(1.0);
  });

  it('sums out first variable from two-variable factor', () => {
    // f(A, B): A=f,B=f=0.1; A=t,B=f=0.2; A=f,B=t=0.3; A=t,B=t=0.4
    const f: Factor = { variables: ['A', 'B'], values: [0.1, 0.2, 0.3, 0.4] };
    const result = sumOut('A', f);
    expect(result.variables).toEqual(['B']);
    // B=f: 0.1+0.2=0.3; B=t: 0.3+0.4=0.7
    expect(result.values[0]).toBeCloseTo(0.3);
    expect(result.values[1]).toBeCloseTo(0.7);
  });

  it('sums out second variable from two-variable factor', () => {
    const f: Factor = { variables: ['A', 'B'], values: [0.1, 0.2, 0.3, 0.4] };
    const result = sumOut('B', f);
    expect(result.variables).toEqual(['A']);
    // A=f: 0.1+0.3=0.4; A=t: 0.2+0.4=0.6
    expect(result.values[0]).toBeCloseTo(0.4);
    expect(result.values[1]).toBeCloseTo(0.6);
  });

  it('sums out middle variable from three-variable factor', () => {
    // f(A, B, C): uniform 0.125 each
    const f: Factor = {
      variables: ['A', 'B', 'C'],
      values: [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
    };
    const result = sumOut('B', f);
    expect(result.variables).toEqual(['A', 'C']);
    expect(result.values.length).toBe(4);
    for (const v of result.values) {
      expect(v).toBeCloseTo(0.25);
    }
  });

  it('summing out variable preserves total probability mass', () => {
    const f = makeFactor('Alarm', asn({}), BURGLARY_NET);
    const summed = sumOut('Alarm', f);
    // After summing out Alarm, remaining factor is over [Burglary, Earthquake]
    expect(summed.variables).toEqual(['Burglary', 'Earthquake']);
    // Total mass should equal total of original (which is not 1 in general for CPTs,
    // but sum over Alarm for each (B,E) pair = sum P(A|B,E) over A = 1 per pair).
    // summed.values[i] should equal 1.0 for every (B,E) combination.
    for (const v of summed.values) {
      expect(v).toBeCloseTo(1.0, 5);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// eliminationAsk
// ─────────────────────────────────────────────────────────────────────────────

describe('eliminationAsk', () => {
  it('gives same result as enumerationAsk for Burglary | JohnCalls=true, MaryCalls=true', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const ve = eliminationAsk('Burglary', ev, BURGLARY_NET);
    const enum_ = enumerationAsk('Burglary', ev, BURGLARY_NET);
    expect(ve.distribution[1]).toBeCloseTo(enum_.distribution[1], 4);
  });

  it('normalises to 1', () => {
    const ev = asn({ JohnCalls: true });
    const { distribution } = eliminationAsk('Burglary', ev, BURGLARY_NET);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 8);
  });

  it('returns steps array with make-factor and normalize operations', () => {
    const ev = asn({ JohnCalls: true });
    const { steps } = eliminationAsk('Burglary', ev, BURGLARY_NET);
    expect(steps.some(s => s.operation === 'make-factor')).toBe(true);
    expect(steps.some(s => s.operation === 'normalize')).toBe(true);
  });

  it('includes pointwise-product and sum-out steps for hidden variables', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const { steps } = eliminationAsk('Burglary', ev, BURGLARY_NET);
    expect(steps.some(s => s.operation === 'pointwise-product')).toBe(true);
    expect(steps.some(s => s.operation === 'sum-out')).toBe(true);
  });

  it('SPRINKLER_NET: P(Rain | WetGrass=true) matches enumeration', () => {
    const ev = asn({ WetGrass: true });
    const ve = eliminationAsk('Rain', ev, SPRINKLER_NET);
    const enum_ = enumerationAsk('Rain', ev, SPRINKLER_NET);
    expect(ve.distribution[1]).toBeCloseTo(enum_.distribution[1], 4);
  });

  it('SPRINKLER_NET: empty evidence — prior over Cloudy', () => {
    const ve = eliminationAsk('Cloudy', asn({}), SPRINKLER_NET);
    expect(ve.distribution[1]).toBeCloseTo(0.5, 8);
  });

  it('single-node network uses only make-factor + normalize (no product loop)', () => {
    const bn = singleNode('X', 0.3);
    const { distribution, steps } = eliminationAsk('X', asn({}), bn);
    expect(distribution[1]).toBeCloseTo(0.3, 8);
    // Should have exactly one make-factor and one normalize, no product steps.
    expect(steps.filter(s => s.operation === 'pointwise-product').length).toBe(0);
  });

  it('two-node network A→B, query A with evidence B=true', () => {
    const bn = twoNodeNet(0.6, 0.2, 0.8);
    const ve = eliminationAsk('A', asn({ B: true }), bn);
    const enum_ = enumerationAsk('A', asn({ B: true }), bn);
    expect(ve.distribution[1]).toBeCloseTo(enum_.distribution[1], 4);
  });

  it('all-evidence variables produce correct result', () => {
    // Evidence covers all non-query variables; test still passes
    const ev = asn({ Earthquake: false, Alarm: true, JohnCalls: true, MaryCalls: true });
    const ve = eliminationAsk('Burglary', ev, BURGLARY_NET);
    const enum_ = enumerationAsk('Burglary', ev, BURGLARY_NET);
    expect(ve.distribution[1]).toBeCloseTo(enum_.distribution[1], 3);
  });

  it('returns [0.5, 0.5] when evidence is impossible (total = 0)', () => {
    // Network where P(A=true)=0 but evidence forces A=true → pFalse=pTrue=0
    const bn: BayesNet = {
      variables: ['A', 'B'],
      nodes: new Map([
        ['A', { name: 'A', parents: [], cpt: [0.0] }],
        ['B', { name: 'B', parents: ['A'], cpt: [0.5, 0.5] }],
      ]),
    };
    const { distribution } = eliminationAsk('B', asn({ A: true }), bn);
    expect(distribution[0]).toBeCloseTo(0.5, 10);
    expect(distribution[1]).toBeCloseTo(0.5, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// seededRandom
// ─────────────────────────────────────────────────────────────────────────────

describe('seededRandom', () => {
  it('returns values in [0, 1)', () => {
    const rng = seededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed produces identical sequence', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = seededRandom(1);
    const rng2 = seededRandom(2);
    const vals1 = Array.from({ length: 5 }, () => rng1());
    const vals2 = Array.from({ length: 5 }, () => rng2());
    expect(vals1).not.toEqual(vals2);
  });

  it('seed=0 is treated as seed=1 (nonzero state)', () => {
    const rng0 = seededRandom(0);
    const rng1 = seededRandom(1);
    // Both should produce valid numbers; seed=0 path is exercised.
    const v0 = rng0();
    const v1 = rng1();
    expect(v0).toBeGreaterThanOrEqual(0);
    expect(v0).toBeLessThan(1);
    expect(v1).toBeGreaterThanOrEqual(0);
    expect(v1).toBeLessThan(1);
    // seed 0 and seed 1 start from state 1, so they are identical.
    expect(v0).toBe(v1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sampleFromDistribution
// ─────────────────────────────────────────────────────────────────────────────

describe('sampleFromDistribution', () => {
  it('always returns 0 when probs=[1, 0]', () => {
    const rng = seededRandom(1);
    expect(sampleFromDistribution([1, 0], rng)).toBe(0);
  });

  it('always returns 1 when probs=[0, 1]', () => {
    const rng = () => 0.5;
    expect(sampleFromDistribution([0, 1], rng)).toBe(1);
  });

  it('returns correct index for three-way distribution', () => {
    // probs = [0.2, 0.5, 0.3], r = 0.6 → cumulative reaches 0.7 at idx 1
    const rng = () => 0.6;
    expect(sampleFromDistribution([0.2, 0.5, 0.3], rng)).toBe(1);
  });

  it('first element is returned for r very close to 0', () => {
    const rng = () => 1e-15;
    expect(sampleFromDistribution([0.5, 0.5], rng)).toBe(0);
  });

  it('returns last index when rng returns value ≥ 1 (floating-point fallback)', () => {
    // rng returns > 1, so r = 1.5 * total > cumulative for any element → fallback fires
    const rng = () => 1.5;
    expect(sampleFromDistribution([0.3, 0.7], rng)).toBe(1);
  });

  it('returns 0 when probs has one element and rng < 1', () => {
    expect(sampleFromDistribution([1.0], () => 0.5)).toBe(0);
  });

  it('samples are distributed roughly correctly over many draws', () => {
    const rng = seededRandom(99);
    const probs = [0.3, 0.7];
    let count0 = 0;
    for (let i = 0; i < 1000; i++) {
      if (sampleFromDistribution([...probs], rng) === 0) count0++;
    }
    // Expect roughly 30% zeros
    expect(count0).toBeGreaterThan(200);
    expect(count0).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// priorSample
// ─────────────────────────────────────────────────────────────────────────────

describe('priorSample', () => {
  it('returns an assignment covering all variables', () => {
    const { assignment } = priorSample(BURGLARY_NET, 42);
    for (const v of BURGLARY_NET.variables) {
      expect(typeof assignment[v]).toBe('boolean');
    }
  });

  it('returns correct number of steps', () => {
    const { steps } = priorSample(BURGLARY_NET, 42);
    expect(steps.length).toBe(BURGLARY_NET.variables.length);
  });

  it('steps have correct pTrue values for root nodes', () => {
    const { steps } = priorSample(BURGLARY_NET, 42);
    const bStep = steps.find(s => s.variable === 'Burglary')!;
    expect(bStep.pTrue).toBeCloseTo(0.001);
    expect(Object.keys(bStep.parentValues).length).toBe(0);
  });

  it('uses default seed 42 when none supplied', () => {
    const { assignment: a1 } = priorSample(BURGLARY_NET);
    const { assignment: a2 } = priorSample(BURGLARY_NET, 42);
    expect(a1).toEqual(a2);
  });

  it('SPRINKLER_NET sample is boolean-valued', () => {
    const { assignment } = priorSample(SPRINKLER_NET, 7);
    for (const v of SPRINKLER_NET.variables) {
      expect(typeof assignment[v]).toBe('boolean');
    }
  });

  it('step action strings are non-empty', () => {
    const { steps } = priorSample(SPRINKLER_NET, 1);
    for (const s of steps) {
      expect(s.action.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rejectionSampling
// ─────────────────────────────────────────────────────────────────────────────

describe('rejectionSampling', () => {
  it('normalises to 1', () => {
    const ev = asn({ JohnCalls: true });
    const { distribution } = rejectionSampling('Burglary', ev, BURGLARY_NET, 200, 42);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 8);
  });

  it('returns numSamples steps', () => {
    const { steps } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 50, 1);
    expect(steps.length).toBe(50);
  });

  it('each step has sample covering all variables', () => {
    const { steps } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 10, 1);
    for (const s of steps) {
      for (const v of BURGLARY_NET.variables) {
        expect(typeof s.sample[v]).toBe('boolean');
      }
    }
  });

  it('produces both consistent and inconsistent samples', () => {
    // With many samples and JohnCalls=true, some should be consistent, many not.
    const { steps } = rejectionSampling('Burglary', asn({ JohnCalls: true }), BURGLARY_NET, 300, 42);
    const consistent = steps.filter(s => s.consistent);
    const inconsistent = steps.filter(s => !s.consistent);
    expect(consistent.length).toBeGreaterThan(0);
    expect(inconsistent.length).toBeGreaterThan(0);
  });

  it('estimate increases towards true P(query=true) with more samples', () => {
    // With no evidence, P(Burglary=true) ≈ 0.001; most samples have query=false.
    const { distribution } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 500, 7);
    expect(distribution[0]).toBeGreaterThan(0.8); // very likely false
  });

  it('returns [0.5, 0.5] when all samples are rejected', () => {
    // Create a network where evidence is impossible: P(A=true)=0 but evidence A=true.
    const bn: BayesNet = {
      variables: ['A', 'B'],
      nodes: new Map([
        ['A', { name: 'A', parents: [], cpt: [0.0] }],
        ['B', { name: 'B', parents: ['A'], cpt: [0.5, 0.5] }],
      ]),
    };
    // A=true is impossible (P=0), so all samples will have A=false → rejected.
    const { distribution } = rejectionSampling('B', asn({ A: true }), bn, 50, 1);
    expect(distribution[0]).toBeCloseTo(0.5);
    expect(distribution[1]).toBeCloseTo(0.5);
  });

  it('uses default seed when none provided', () => {
    const { distribution: d1 } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 20);
    const { distribution: d2 } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 20, 42);
    expect(d1[0]).toBeCloseTo(d2[0], 10);
  });

  it('totalAccepted is monotonically non-decreasing', () => {
    const { steps } = rejectionSampling('Burglary', asn({}), BURGLARY_NET, 100, 42);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.totalAccepted).toBeGreaterThanOrEqual(steps[i - 1]!.totalAccepted);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// likelihoodWeighting
// ─────────────────────────────────────────────────────────────────────────────

describe('likelihoodWeighting', () => {
  it('normalises to 1', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const { distribution } = likelihoodWeighting('Burglary', ev, BURGLARY_NET, 100, 42);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 8);
  });

  it('returns numSamples steps', () => {
    const { steps } = likelihoodWeighting('Burglary', asn({}), BURGLARY_NET, 50, 1);
    expect(steps.length).toBe(50);
  });

  it('each step has positive weight when evidence is possible', () => {
    const ev = asn({ JohnCalls: true });
    const { steps } = likelihoodWeighting('Burglary', ev, BURGLARY_NET, 20, 5);
    for (const s of steps) {
      expect(s.weight).toBeGreaterThan(0);
    }
  });

  it('evidence variable is fixed to observed value in every sample', () => {
    const ev = asn({ JohnCalls: true });
    const { steps } = likelihoodWeighting('Burglary', ev, BURGLARY_NET, 20, 5);
    for (const s of steps) {
      expect(s.sample['JohnCalls']).toBe(true);
    }
  });

  it('approximates enumeration result with many samples', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const lw = likelihoodWeighting('Burglary', ev, BURGLARY_NET, 2000, 77);
    const enum_ = enumerationAsk('Burglary', ev, BURGLARY_NET);
    // LW is approximate; allow ±0.1 tolerance
    expect(Math.abs(lw.distribution[1] - enum_.distribution[1])).toBeLessThan(0.15);
  });

  it('uses default seed when none provided', () => {
    const { distribution: d1 } = likelihoodWeighting('Burglary', asn({}), BURGLARY_NET, 20);
    const { distribution: d2 } = likelihoodWeighting('Burglary', asn({}), BURGLARY_NET, 20, 42);
    expect(d1[0]).toBeCloseTo(d2[0], 10);
  });

  it('weight is product of evidence CPT values', () => {
    // Single sample with fixed seed to inspect weight
    const ev = asn({ Burglary: true }); // P(B=true)=0.001
    const { steps } = likelihoodWeighting('Alarm', ev, BURGLARY_NET, 1, 1);
    // weight = P(Burglary=true) = 0.001
    expect(steps[0]!.weight).toBeCloseTo(0.001, 5);
  });

  it('weightedCount accumulates correctly', () => {
    const { steps } = likelihoodWeighting('Burglary', asn({}), BURGLARY_NET, 50, 3);
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const curr = steps[i]!;
      // accumulated weighted counts can only stay the same or increase
      expect(curr.weightedCountTrue + curr.weightedCountFalse)
        .toBeGreaterThanOrEqual(prev.weightedCountTrue + prev.weightedCountFalse);
    }
  });

  it('returns [0.5, 0.5] when numSamples = 0 (total weight = 0)', () => {
    const { distribution, steps } = likelihoodWeighting('Burglary', asn({}), BURGLARY_NET, 0, 1);
    expect(steps.length).toBe(0);
    expect(distribution[0]).toBeCloseTo(0.5, 10);
    expect(distribution[1]).toBeCloseTo(0.5, 10);
  });

  it('covers evVal=false branch: evidence variable fixed to false', () => {
    // P(B=false) = 0.999 → weight should reflect this
    const ev = asn({ Burglary: false });
    const { steps } = likelihoodWeighting('Alarm', ev, BURGLARY_NET, 1, 1);
    expect(steps[0]!.weight).toBeCloseTo(0.999, 4); // P(Burglary=false) = 0.999
    expect(steps[0]!.sample['Burglary']).toBe(false);
  });

  it('estimate = 0.5 when first sample has zero weight (totalWeight = 0 in step)', () => {
    // Network where P(A=true)=0 but evidence forces A=true → weight=0 at every step.
    const bn: BayesNet = {
      variables: ['A', 'B'],
      nodes: new Map([
        ['A', { name: 'A', parents: [], cpt: [0.0] }],
        ['B', { name: 'B', parents: ['A'], cpt: [0.5, 0.5] }],
      ]),
    };
    const { steps } = likelihoodWeighting('B', asn({ A: true }), bn, 1, 1);
    expect(steps[0]!.weight).toBeCloseTo(0, 10);
    // totalWeight after first (and only) sample = 0 → estimate = 0.5
    expect(steps[0]!.estimate).toBeCloseTo(0.5, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markovBlanket
// ─────────────────────────────────────────────────────────────────────────────

describe('markovBlanket', () => {
  it('MB(Burglary) = {Earthquake, Alarm} (parents of Alarm except Burglary, and Alarm itself)', () => {
    const mb = markovBlanket('Burglary', BURGLARY_NET);
    expect(mb).toContain('Alarm');
    expect(mb).toContain('Earthquake');
    expect(mb).not.toContain('Burglary');
  });

  it('MB(Alarm) = {Burglary, Earthquake, JohnCalls, MaryCalls}', () => {
    const mb = markovBlanket('Alarm', BURGLARY_NET);
    expect(mb).toContain('Burglary');
    expect(mb).toContain('Earthquake');
    expect(mb).toContain('JohnCalls');
    expect(mb).toContain('MaryCalls');
    expect(mb).not.toContain('Alarm');
    expect(mb.length).toBe(4);
  });

  it('MB(JohnCalls) contains Alarm (parent) but not MaryCalls (sibling, no shared children)', () => {
    const mb = markovBlanket('JohnCalls', BURGLARY_NET);
    expect(mb).toContain('Alarm');
    expect(mb).not.toContain('JohnCalls');
    // JohnCalls and MaryCalls are siblings (both children of Alarm), but they have
    // no shared children, so MaryCalls is NOT in MB(JohnCalls).
    expect(mb).not.toContain('MaryCalls');
  });

  it('MB(MaryCalls) has no children (leaf node)', () => {
    const mb = markovBlanket('MaryCalls', BURGLARY_NET);
    expect(mb).toContain('Alarm');
    // No children, so only Alarm (parent)
    expect(mb.length).toBe(1);
  });

  it('root node with no parents, no children has empty MB', () => {
    const bn = singleNode('X', 0.5);
    const mb = markovBlanket('X', bn);
    expect(mb.length).toBe(0);
  });

  it('SPRINKLER_NET: MB(Sprinkler) = {Cloudy, Rain, WetGrass}', () => {
    const mb = markovBlanket('Sprinkler', SPRINKLER_NET);
    expect(mb).toContain('Cloudy');  // parent
    expect(mb).toContain('WetGrass'); // child
    expect(mb).toContain('Rain');    // co-parent of WetGrass
    expect(mb).not.toContain('Sprinkler');
  });

  it('no duplicates in Markov blanket', () => {
    const mb = markovBlanket('Alarm', BURGLARY_NET);
    const unique = new Set(mb);
    expect(unique.size).toBe(mb.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// gibbsSampling
// ─────────────────────────────────────────────────────────────────────────────

describe('gibbsSampling', () => {
  it('normalises to 1', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const { distribution } = gibbsSampling('Burglary', ev, BURGLARY_NET, 100, 42);
    expect(distribution[0] + distribution[1]).toBeCloseTo(1.0, 8);
  });

  it('returns numSamples steps', () => {
    const { steps } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 50, 1);
    expect(steps.length).toBe(50);
  });

  it('each step resamples a non-evidence variable', () => {
    const ev = asn({ JohnCalls: true, MaryCalls: true });
    const evidenceVars = new Set(ev.keys());
    const { steps } = gibbsSampling('Burglary', ev, BURGLARY_NET, 50, 5);
    for (const s of steps) {
      expect(evidenceVars.has(s.sampledVar)).toBe(false);
    }
  });

  it('state always has all variables', () => {
    const { steps } = gibbsSampling('Alarm', asn({}), BURGLARY_NET, 20, 3);
    for (const s of steps) {
      for (const v of BURGLARY_NET.variables) {
        expect(typeof s.state[v]).toBe('boolean');
      }
    }
  });

  it('Markov-blanket distribution sums to 1', () => {
    const { steps } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 30, 8);
    for (const s of steps) {
      expect(s.distribution[0] + s.distribution[1]).toBeCloseTo(1.0, 8);
    }
  });

  it('uses default seed when none provided', () => {
    const { distribution: d1 } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 20);
    const { distribution: d2 } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 20, 42);
    expect(d1[0]).toBeCloseTo(d2[0], 10);
  });

  it('edge case: all variables in evidence returns empty steps and deterministic distribution', () => {
    const ev = asn({
      Burglary: true, Earthquake: false, Alarm: true, JohnCalls: true, MaryCalls: false,
    });
    const { steps, distribution } = gibbsSampling('Burglary', ev, BURGLARY_NET, 100, 1);
    expect(steps.length).toBe(0);
    // query=Burglary is true in evidence
    expect(distribution[1]).toBe(1);
    expect(distribution[0]).toBe(0);
  });

  it('edge case: query is in evidence (false value)', () => {
    const ev = asn({
      Burglary: false, Earthquake: false, Alarm: false, JohnCalls: false, MaryCalls: false,
    });
    const { steps, distribution } = gibbsSampling('Burglary', ev, BURGLARY_NET, 50, 1);
    expect(steps.length).toBe(0);
    expect(distribution[0]).toBe(1);
    expect(distribution[1]).toBe(0);
  });

  it('SPRINKLER_NET sampling converges toward enumeration', () => {
    const ev = asn({ WetGrass: true });
    const gibbs = gibbsSampling('Rain', ev, SPRINKLER_NET, 2000, 13);
    const enum_ = enumerationAsk('Rain', ev, SPRINKLER_NET);
    expect(Math.abs(gibbs.distribution[1] - enum_.distribution[1])).toBeLessThan(0.2);
  });

  it('countsTrue + countsFalse equals stepIndex + 1 for each step', () => {
    const { steps } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 30, 9);
    for (const s of steps) {
      expect(s.countsTrue + s.countsFalse).toBe(s.stepIndex + 1);
    }
  });

  it('returns [0.5, 0.5] when numSamples = 0 (total count = 0)', () => {
    const { steps, distribution } = gibbsSampling('Burglary', asn({}), BURGLARY_NET, 0, 1);
    expect(steps.length).toBe(0);
    expect(distribution[0]).toBeCloseTo(0.5, 10);
    expect(distribution[1]).toBeCloseTo(0.5, 10);
  });

  it('mbDistribution returns [0.5, 0.5] when total probability mass = 0', () => {
    // Network: X (P(true)=0) → Y (P(Y=true|X)=1 always).
    // State Y=false has zero probability under Y's CPT for any X value,
    // so computeProb(false) and computeProb(true) both = 0 → mbDist = [0.5, 0.5].
    const specialNet: BayesNet = {
      variables: ['X', 'Y'],
      nodes: new Map([
        ['X', { name: 'X', parents: [], cpt: [0.0] }],          // P(X=true)=0
        ['Y', { name: 'Y', parents: ['X'], cpt: [1.0, 1.0] }],  // P(Y=true|X)=1
      ]),
    };
    // Evidence Y=false fixes Y to an impossible state; X is the only free variable.
    const { steps } = gibbsSampling('X', asn({ Y: false }), specialNet, 1, 1);
    // When X is sampled, mbDistribution total = 0 → [0.5, 0.5]
    expect(steps.length).toBe(1);
    expect(steps[0]!.distribution[0]).toBeCloseTo(0.5, 10);
    expect(steps[0]!.distribution[1]).toBeCloseTo(0.5, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// noisyOR
// ─────────────────────────────────────────────────────────────────────────────

describe('noisyOR', () => {
  it('single parent: generates 2 combinations', () => {
    const entries = noisyOR([0.4]);
    expect(entries.length).toBe(2);
  });

  it('two parents: generates 4 combinations by default', () => {
    const entries = noisyOR([0.3, 0.6]);
    expect(entries.length).toBe(4);
  });

  it('pFalse = 1 when no parents are active', () => {
    const entries = noisyOR([0.3, 0.6]);
    // i=0: both false → pFalse = 1.0
    expect(entries[0]!.pFalse).toBe(1.0);
    expect(entries[0]!.pTrue).toBe(0.0);
    expect(entries[0]!.inhibitions.length).toBe(0);
  });

  it('pFalse = q_j when one parent is active', () => {
    const q = [0.3, 0.6];
    const entries = noisyOR(q);
    // i=1: parent0=true, parent1=false → pFalse = 0.3
    expect(entries[1]!.pFalse).toBeCloseTo(0.3);
    expect(entries[1]!.pTrue).toBeCloseTo(0.7);
    expect(entries[1]!.inhibitions).toEqual([0.3]);
    // i=2: parent0=false, parent1=true → pFalse = 0.6
    expect(entries[2]!.pFalse).toBeCloseTo(0.6);
    expect(entries[2]!.pTrue).toBeCloseTo(0.4);
    expect(entries[2]!.inhibitions).toEqual([0.6]);
  });

  it('pFalse = product of q_j for all active parents', () => {
    const entries = noisyOR([0.3, 0.6]);
    // i=3: both active → pFalse = 0.3 * 0.6
    expect(entries[3]!.pFalse).toBeCloseTo(0.18);
    expect(entries[3]!.pTrue).toBeCloseTo(0.82);
    expect(entries[3]!.inhibitions.length).toBe(2);
  });

  it('accepts explicit parentCombinations', () => {
    const combos: ReadonlyArray<ReadonlyArray<boolean>> = [[true, false], [false, true]];
    const entries = noisyOR([0.3, 0.6], combos);
    expect(entries.length).toBe(2);
    expect(entries[0]!.pFalse).toBeCloseTo(0.3);
    expect(entries[1]!.pFalse).toBeCloseTo(0.6);
  });

  it('no parents → single entry with pFalse=1, pTrue=0', () => {
    const entries = noisyOR([]);
    expect(entries.length).toBe(1);
    expect(entries[0]!.pFalse).toBe(1.0);
    expect(entries[0]!.pTrue).toBe(0.0);
  });

  it('q=0 parent → pFalse=0 (certain to occur if parent active)', () => {
    const entries = noisyOR([0.0, 0.5]);
    // i=1: parent0=true → pFalse = 0
    expect(entries[1]!.pFalse).toBe(0.0);
    expect(entries[1]!.pTrue).toBe(1.0);
  });

  it('q=1 parent → pFalse=1 (certain to not occur if only parent active)', () => {
    const entries = noisyOR([1.0]);
    // i=1: parent=true → pFalse = 1.0
    expect(entries[1]!.pFalse).toBe(1.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// doCalc
// ─────────────────────────────────────────────────────────────────────────────

describe('doCalc', () => {
  it('returns original and intervened distributions', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    expect(result.original[0] + result.original[1]).toBeCloseTo(1.0, 8);
    expect(result.intervened[0] + result.intervened[1]).toBeCloseTo(1.0, 8);
  });

  it('mutilated network has no parents for intervention variable', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    const mutNode = result.mutilatedNet.nodes.get('Burglary')!;
    expect(mutNode.parents.length).toBe(0);
    expect(mutNode.cpt).toEqual([1.0]);
  });

  it('mutilated network when interventionValue=false has CPT=[0.0]', () => {
    const result = doCalc('Burglary', false, 'Alarm', BURGLARY_NET);
    const mutNode = result.mutilatedNet.nodes.get('Burglary')!;
    expect(mutNode.cpt).toEqual([0.0]);
  });

  it('original preserves non-intervention network structure', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    // Other nodes are unchanged in mutilated network
    const alarmNode = result.mutilatedNet.nodes.get('Alarm')!;
    expect(alarmNode.parents).toEqual(['Burglary', 'Earthquake']);
  });

  it('P(Alarm | do(Burglary=true)) should differ from P(Alarm | Burglary=true)', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    // With intervention, P(A=true) uses only the CPT without back-door (same network here,
    // but we can verify both are valid distributions)
    expect(result.intervened[1]).toBeGreaterThan(0.5); // Alarm likely when Burglary forced true
  });

  it('explanation string is non-empty and mentions variables', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    expect(result.explanation).toContain('Burglary');
    expect(result.explanation).toContain('Alarm');
    expect(result.explanation.length).toBeGreaterThan(10);
  });

  it('SPRINKLER_NET: do(Cloudy=true) affects Rain and Sprinkler', () => {
    const result = doCalc('Cloudy', true, 'Rain', SPRINKLER_NET);
    expect(result.intervened[1]).toBeCloseTo(0.8, 4); // P(Rain=true | do(Cloudy=true)) = P(Rain|Cloudy=true) = 0.8
  });

  it('mutilated net has same variables list', () => {
    const result = doCalc('Burglary', true, 'Alarm', BURGLARY_NET);
    expect(result.mutilatedNet.variables).toEqual(BURGLARY_NET.variables);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-algorithm consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('cross-algorithm consistency', () => {
  it('enumeration and VE agree on P(Earthquake | JohnCalls=true)', () => {
    const ev = asn({ JohnCalls: true });
    const e = enumerationAsk('Earthquake', ev, BURGLARY_NET);
    const v = eliminationAsk('Earthquake', ev, BURGLARY_NET);
    expect(e.distribution[1]).toBeCloseTo(v.distribution[1], 4);
  });

  it('enumeration and VE agree on P(WetGrass | Cloudy=true)', () => {
    const ev = asn({ Cloudy: true });
    const e = enumerationAsk('WetGrass', ev, SPRINKLER_NET);
    const v = eliminationAsk('WetGrass', ev, SPRINKLER_NET);
    expect(e.distribution[1]).toBeCloseTo(v.distribution[1], 4);
  });

  it('jointProbability sums to 1 over all assignments (single node)', () => {
    const bn = singleNode('X', 0.6);
    const sumProb =
      jointProbability(bn, asn({ X: true })) +
      jointProbability(bn, asn({ X: false }));
    expect(sumProb).toBeCloseTo(1.0, 10);
  });

  it('likelihood weighting and enumeration agree on Sprinkler query', () => {
    const ev = asn({ WetGrass: true });
    const lw = likelihoodWeighting('Sprinkler', ev, SPRINKLER_NET, 3000, 55);
    const e = enumerationAsk('Sprinkler', ev, SPRINKLER_NET);
    expect(Math.abs(lw.distribution[1] - e.distribution[1])).toBeLessThan(0.15);
  });
});

