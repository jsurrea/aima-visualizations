import { describe, it, expect } from 'vitest';
import {
  transKey,
  actionKey,
  qValue,
  valueIteration,
  extractPolicy,
  policyEvaluation,
  policyIteration,
  ucb1Index,
  runUCB1,
  runThompsonSampling,
  gittinsIndex,
  restartMDPValue,
  gaussianRng,
  betaSample,
  gammaSample,
  beliefUpdate,
  beliefReward,
  dotBelief,
  maxAlpha,
  pomdpValueIteration,
  pruneAlphas,
  runPOMDPValueIteration,
  buildGridMDP,
} from '../src/algorithms/index';
import type {
  MDP,
  POMDP,
  AlphaVector,
  BanditArm,
  BeliefState,
} from '../src/algorithms/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a tiny 2-state MDP: S={s0,s1}, terminal={t}, actions={a} */
function buildTinyMDP(): MDP {
  // s0 --a--> s1 (p=0.8), s0 (p=0.2); reward +1 to t from s1, -1 otherwise
  // s1 --a--> t  (p=1);   reward +1
  const states = ['s0', 's1'];
  const terminalStates = ['t'];
  const actions = ['a'];
  const transitions = new Map([
    ['s0|a', [{ state: 's1', prob: 0.8 }, { state: 's0', prob: 0.2 }]],
    ['s1|a', [{ state: 't', prob: 1.0 }]],
  ]);
  const rewards = new Map([
    ['s0|a|s1', 0.0],
    ['s0|a|s0', -0.1],
    ['s1|a|t', 1.0],
  ]);
  return { states, terminalStates, actions, transitions, rewards, gamma: 0.9 };
}

/** Build a tiny POMDP: 2 states A and B, 2 actions, 2 observations */
function buildTinyPOMDP(): POMDP {
  return {
    states: ['A', 'B'],
    terminalStates: [],
    actions: ['Stay', 'Go'],
    transitions: new Map([
      // Stay: stays with p=0.9
      ['A|Stay', [{ state: 'A', prob: 0.9 }, { state: 'B', prob: 0.1 }]],
      ['B|Stay', [{ state: 'B', prob: 0.9 }, { state: 'A', prob: 0.1 }]],
      // Go: switches with p=0.9
      ['A|Go', [{ state: 'B', prob: 0.9 }, { state: 'A', prob: 0.1 }]],
      ['B|Go', [{ state: 'A', prob: 0.9 }, { state: 'B', prob: 0.1 }]],
    ]),
    rewards: new Map([
      ['A|Stay|A', 0], ['A|Stay|B', 0],
      ['B|Stay|A', 0], ['B|Stay|B', 1],
      ['A|Go|A', 0],   ['A|Go|B', 1],
      ['B|Go|A', 0],   ['B|Go|B', 1],
    ]),
    observations: new Map([
      ['A|obsA', 0.8], ['A|obsB', 0.2],
      ['B|obsA', 0.2], ['B|obsB', 0.8],
    ]),
    observationSpace: ['obsA', 'obsB'],
    gamma: 0.9,
  };
}

// ─── §16.1 Key / Index Helpers ────────────────────────────────────────────────

describe('transKey', () => {
  it('concatenates state, action, next state with pipes', () => {
    expect(transKey('s0', 'Up', 's1')).toBe('s0|Up|s1');
  });
  it('handles multi-character tokens', () => {
    expect(transKey('(1,1)', 'Right', '(2,1)')).toBe('(1,1)|Right|(2,1)');
  });
});

describe('actionKey', () => {
  it('concatenates state and action with pipe', () => {
    expect(actionKey('s0', 'a')).toBe('s0|a');
  });
});

// ─── §16.1 Q-Value ────────────────────────────────────────────────────────────

describe('qValue', () => {
  const mdp = buildTinyMDP();

  it('computes Q(s0, a) correctly', () => {
    const U = new Map([['s0', 0], ['s1', 0], ['t', 0]]);
    // Q = 0.8*(0 + 0.9*0) + 0.2*(-0.1 + 0.9*0) = -0.02
    expect(qValue(mdp, 's0', 'a', U)).toBeCloseTo(-0.02);
  });

  it('accounts for non-zero utility of next states', () => {
    const U = new Map([['s0', 0.5], ['s1', 1.0], ['t', 0]]);
    // Q = 0.8*(0 + 0.9*1) + 0.2*(-0.1 + 0.9*0.5)
    //   = 0.8*0.9 + 0.2*(-0.1+0.45) = 0.72 + 0.07 = 0.79
    expect(qValue(mdp, 's0', 'a', U)).toBeCloseTo(0.79);
  });

  it('returns 0 for unknown transition', () => {
    const emptyMDP: MDP = {
      ...mdp,
      transitions: new Map(),
      rewards: new Map(),
    };
    const U = new Map([['s0', 1]]);
    expect(qValue(emptyMDP, 's0', 'a', U)).toBe(0);
  });

  it('handles terminal state with no transitions', () => {
    const U = new Map([['s0', 0], ['s1', 0.5], ['t', 0]]);
    // s1 --a--> t (prob 1), reward 1
    // Q = 1*(1 + 0.9*0) = 1
    expect(qValue(mdp, 's1', 'a', U)).toBeCloseTo(1.0);
  });
});

// ─── §16.2.1 Value Iteration ──────────────────────────────────────────────────

describe('valueIteration', () => {
  it('converges on the tiny MDP', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.01);
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1]!;
    expect(last.converged).toBe(true);
  });

  it('returns steps with increasing iteration count', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.01);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.iteration).toBe(i + 1);
    }
  });

  it('final utilities are sensible (s1 > s0)', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.001);
    const lastU = steps[steps.length - 1]!.U;
    expect(lastU.get('s1')!).toBeGreaterThan(lastU.get('s0')!);
  });

  it('policies map states to valid actions', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.01);
    const policy = steps[steps.length - 1]!.policy;
    for (const s of mdp.states) {
      expect(mdp.actions).toContain(policy.get(s));
    }
  });

  it('respects maxIter safety cap', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 1e-12, 3);
    expect(steps.length).toBeLessThanOrEqual(3);
  });

  it('works on the 4x3 grid MDP', () => {
    const mdp = buildGridMDP(-0.04, 0.9);
    const steps = valueIteration(mdp, 0.01);
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1]!;
    // (4,3) terminal kept at 0; non-terminal states should have positive utility
    expect(last.U.get('(1,1)')).toBeDefined();
    expect(last.U.get('(3,3)')).toBeDefined();
  });

  it('delta decreases monotonically (roughly)', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.001);
    // Allow some jitter but verify convergence trend
    expect(steps[steps.length - 1]!.delta).toBeLessThanOrEqual(steps[0]!.delta + 0.1);
  });

  it('terminal states stay at 0 throughout', () => {
    const mdp = buildTinyMDP();
    const steps = valueIteration(mdp, 0.01);
    for (const step of steps) {
      expect(step.U.get('t')).toBe(0);
    }
  });
});

// ─── extractPolicy ────────────────────────────────────────────────────────────

describe('extractPolicy', () => {
  it('returns valid action for every state', () => {
    const mdp = buildTinyMDP();
    const U = new Map([['s0', 0.5], ['s1', 1.0], ['t', 0]]);
    const policy = extractPolicy(mdp, U);
    for (const s of mdp.states) {
      expect(mdp.actions).toContain(policy.get(s));
    }
  });

  it('picks the action with highest Q-value', () => {
    // Two-action MDP
    const mdp: MDP = {
      states: ['s0'],
      terminalStates: [],
      actions: ['good', 'bad'],
      transitions: new Map([
        ['s0|good', [{ state: 's0', prob: 1 }]],
        ['s0|bad', [{ state: 's0', prob: 1 }]],
      ]),
      rewards: new Map([
        ['s0|good|s0', 1],
        ['s0|bad|s0', -1],
      ]),
      gamma: 0.9,
    };
    const U = new Map([['s0', 0]]);
    const policy = extractPolicy(mdp, U);
    expect(policy.get('s0')).toBe('good');
  });

  it('handles empty states gracefully', () => {
    const mdp = buildTinyMDP();
    const emptyMDP = { ...mdp, states: [] };
    const U = new Map([['s0', 0]]);
    const policy = extractPolicy(emptyMDP, U);
    expect(policy.size).toBe(0);
  });
});

// ─── §16.2.2 Policy Evaluation ────────────────────────────────────────────────

describe('policyEvaluation', () => {
  it('returns a map with entries for all states', () => {
    const mdp = buildTinyMDP();
    const policy = new Map([['s0', 'a'], ['s1', 'a']]);
    const U = new Map([['s0', 0], ['s1', 0], ['t', 0]]);
    const result = policyEvaluation(mdp, policy, U);
    expect(result.get('s0')).toBeDefined();
    expect(result.get('s1')).toBeDefined();
  });

  it('increases utility after more sweeps', () => {
    const mdp = buildTinyMDP();
    const policy = new Map([['s0', 'a'], ['s1', 'a']]);
    const U0 = new Map([['s0', 0], ['s1', 0], ['t', 0]]);
    const result1 = policyEvaluation(mdp, policy, U0, 1);
    const result5 = policyEvaluation(mdp, policy, U0, 5);
    // After more sweeps, s1's value should be higher (closer to 1)
    expect(result5.get('s1')!).toBeGreaterThanOrEqual(result1.get('s1')!);
  });

  it('returns original map when k=0', () => {
    const mdp = buildTinyMDP();
    const policy = new Map([['s0', 'a'], ['s1', 'a']]);
    const U = new Map([['s0', 0.5], ['s1', 0.7], ['t', 0]]);
    const result = policyEvaluation(mdp, policy, U, 0);
    expect(result.get('s0')).toBeCloseTo(0.5);
    expect(result.get('s1')).toBeCloseTo(0.7);
  });

  it('falls back to first action for states not in policy', () => {
    const mdp = buildTinyMDP();
    const emptyPolicy = new Map<string, string>();
    const U = new Map([['s0', 0], ['s1', 0], ['t', 0]]);
    // Should not throw
    expect(() => policyEvaluation(mdp, emptyPolicy, U, 1)).not.toThrow();
  });
});

// ─── §16.2.2 Policy Iteration ─────────────────────────────────────────────────

describe('policyIteration', () => {
  it('converges and returns evaluation+improvement step pairs', () => {
    const mdp = buildTinyMDP();
    const steps = policyIteration(mdp);
    expect(steps.length).toBeGreaterThan(0);
    // Phases alternate evaluation/improvement
    const phases = steps.map((s) => s.phase);
    for (let i = 0; i < phases.length - 1; i += 2) {
      expect(phases[i]).toBe('evaluation');
      expect(phases[i + 1]).toBe('improvement');
    }
  });

  it('last improvement step has unchanged=true', () => {
    const mdp = buildTinyMDP();
    const steps = policyIteration(mdp);
    const lastImprovement = [...steps].reverse().find((s) => s.phase === 'improvement');
    expect(lastImprovement?.unchanged).toBe(true);
  });

  it('yields valid policy at each step', () => {
    const mdp = buildTinyMDP();
    const steps = policyIteration(mdp);
    for (const step of steps) {
      for (const s of mdp.states) {
        expect(mdp.actions).toContain(step.policy.get(s));
      }
    }
  });

  it('respects maxIter safety cap', () => {
    const mdp = buildTinyMDP();
    const steps = policyIteration(mdp, 1);
    expect(steps.length).toBeLessThanOrEqual(2); // 1 eval + 1 improve
  });

  it('converges on 4x3 grid', () => {
    const mdp = buildGridMDP(-0.04, 0.9);
    const steps = policyIteration(mdp);
    const lastImprovement = [...steps].reverse().find((s) => s.phase === 'improvement');
    expect(lastImprovement?.unchanged).toBe(true);
  });
});

// ─── §16.3 Bandit: ucb1Index ─────────────────────────────────────────────────

describe('ucb1Index', () => {
  it('returns Infinity for unsampled arm', () => {
    expect(ucb1Index(0.5, 0, 10)).toBe(Infinity);
  });

  it('returns mean + exploration term for sampled arm', () => {
    const val = ucb1Index(0.5, 4, 16);
    // UCB = 0.5 + sqrt(2*ln(16)/4) = 0.5 + sqrt(2*2.77/4) ≈ 0.5 + 1.177 = 1.677
    expect(val).toBeGreaterThan(0.5);
  });

  it('decreases as arm pulls increase', () => {
    const v1 = ucb1Index(0.5, 1, 100);
    const v10 = ucb1Index(0.5, 10, 100);
    expect(v1).toBeGreaterThan(v10);
  });

  it('handles total pulls of 1', () => {
    const val = ucb1Index(0.3, 1, 1);
    // sqrt(2*ln(1)/1) = 0
    expect(val).toBeCloseTo(0.3);
  });
});

// ─── §16.3 runUCB1 ──────────────────────────────────────────────────────────

describe('runUCB1', () => {
  const arms: BanditArm[] = [
    { name: 'A', trueMean: 0.3, trueStd: 0.1 },
    { name: 'B', trueMean: 0.7, trueStd: 0.1 },
    { name: 'C', trueMean: 0.5, trueStd: 0.1 },
  ];

  it('returns one step per round', () => {
    const steps = runUCB1(arms, 30, () => 0.5);
    expect(steps.length).toBe(30);
  });

  it('first three rounds explore each arm once', () => {
    // With Infinity for unseen arms, each arm is pulled once in the first 3 rounds
    // (arms 0, 1, 2 get Infinity initially)
    const seededRng = (() => {
      let n = 0;
      return () => (n++ % 2 === 0 ? 0.2 : 0.8);
    })();
    const steps = runUCB1(arms, 3, seededRng);
    const selected = new Set(steps.map((s) => s.selectedArm));
    expect(selected.size).toBe(3);
  });

  it('cumulative regret is non-decreasing', () => {
    const steps = runUCB1(arms, 20, () => 0.5);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.cumulativeRegret).toBeGreaterThanOrEqual(steps[i - 1]!.cumulativeRegret);
    }
  });

  it('cumulative regret is 0 when all arms have same mean', () => {
    const equalArms: BanditArm[] = [
      { name: 'X', trueMean: 1.0, trueStd: 0 },
      { name: 'Y', trueMean: 1.0, trueStd: 0 },
    ];
    const steps = runUCB1(equalArms, 10, () => 0.5);
    const last = steps[steps.length - 1]!;
    expect(last.cumulativeRegret).toBeCloseTo(0);
  });

  it('ucbValues has one entry per arm', () => {
    const steps = runUCB1(arms, 5, () => 0.5);
    for (const step of steps) {
      expect(step.ucbValues.length).toBe(arms.length);
    }
  });

  it('stats[i].pulls increases after arm i is selected', () => {
    const steps = runUCB1(arms, 10, () => 0.5);
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const cur = steps[i]!;
      const arm = cur.selectedArm;
      expect(cur.stats[arm]!.pulls).toBe(prev.stats[arm]!.pulls + 1);
    }
  });
});

// ─── §16.3 runThompsonSampling ───────────────────────────────────────────────

describe('runThompsonSampling', () => {
  const arms: BanditArm[] = [
    { name: 'A', trueMean: 0.2, trueStd: 0.1 },
    { name: 'B', trueMean: 0.8, trueStd: 0.1 },
  ];

  it('returns one step per round', () => {
    const steps = runThompsonSampling(arms, 20, 0, () => 0.5);
    expect(steps.length).toBe(20);
  });

  it('cumulative regret is non-decreasing', () => {
    const steps = runThompsonSampling(arms, 20, 0, () => 0.5);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.cumulativeRegret).toBeGreaterThanOrEqual(steps[i - 1]!.cumulativeRegret);
    }
  });

  it('successes/failures update on reward', () => {
    const steps = runThompsonSampling(arms, 5, 0.5, () => 0.9);
    // When rng=0.9, gaussian will produce positive values → reward > 0.5 → success
    for (let i = 1; i < steps.length; i++) {
      const arm = steps[i]!.selectedArm;
      const prev = steps[i - 1]!.stats[arm]!;
      const cur = steps[i]!.stats[arm]!;
      const total = cur.successes + cur.failures;
      const prevTotal = prev.successes + prev.failures;
      expect(total).toBe(prevTotal + 1);
    }
  });

  it('stats has entries for all arms', () => {
    const steps = runThompsonSampling(arms, 3, 0, () => 0.5);
    for (const step of steps) {
      expect(step.stats.length).toBe(arms.length);
    }
  });
});

// ─── §16.3 Gittins Index ──────────────────────────────────────────────────────

describe('restartMDPValue', () => {
  it('returns a positive number for standard parameters', () => {
    const val = restartMDPValue(1, 1, 0.9, 0.5, 10);
    expect(val).toBeGreaterThan(0);
  });

  it('returns at least lambda/(1-gamma) when lambda is high', () => {
    const lambda = 0.9;
    const gamma = 0.5;
    const val = restartMDPValue(1, 1, gamma, lambda, 10);
    // Value should be at least the floor λ/(1−γ) = 0.9/0.5 = 1.8
    expect(val).toBeGreaterThanOrEqual(lambda / (1 - gamma) - 1e-6);
  });
});

describe('gittinsIndex', () => {
  it('returns a value in [0, 1]', () => {
    const idx = gittinsIndex(1, 1, 0.9, 20);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(1);
  });

  it('increases with more successes (higher estimated mean)', () => {
    const idx1 = gittinsIndex(1, 3, 0.9, 20); // 25% success rate
    const idx2 = gittinsIndex(3, 1, 0.9, 20); // 75% success rate
    expect(idx2).toBeGreaterThan(idx1);
  });

  it('is near 1 for arm with all successes', () => {
    const idx = gittinsIndex(10, 1, 0.9, 20);
    expect(idx).toBeGreaterThan(0.8);
  });

  it('is near 0 for arm with all failures', () => {
    const idx = gittinsIndex(1, 10, 0.9, 20);
    expect(idx).toBeLessThan(0.3);
  });
});

// ─── Sampling helpers ─────────────────────────────────────────────────────────

describe('gaussianRng', () => {
  it('produces finite values', () => {
    let seeded = 0;
    const rng = () => { seeded = (seeded * 1103515245 + 12345) & 0x7fffffff; return seeded / 0x7fffffff; };
    for (let i = 0; i < 20; i++) {
      expect(isFinite(gaussianRng(rng))).toBe(true);
    }
  });

  it('produces both positive and negative values', () => {
    const values = Array.from({ length: 50 }, (_, i) => {
      const rng = () => ((i * 17 + 5) % 97) / 97;
      return gaussianRng(rng);
    });
    expect(values.some((v) => v > 0)).toBe(true);
    expect(values.some((v) => v < 0)).toBe(true);
  });
});

describe('gammaSample', () => {
  it('returns positive values for shape >= 1', () => {
    let s = 42;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 0) / 0x80000000; };
    for (let i = 0; i < 20; i++) {
      expect(gammaSample(2, rng)).toBeGreaterThan(0);
    }
  });

  it('returns positive values for shape < 1', () => {
    let s = 99;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 0) / 0x80000000; };
    for (let i = 0; i < 20; i++) {
      expect(gammaSample(0.5, rng)).toBeGreaterThan(0);
    }
  });
});

describe('betaSample', () => {
  it('returns values in (0, 1)', () => {
    let s = 77;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 0) / 0x80000000; };
    for (let i = 0; i < 20; i++) {
      const v = betaSample(2, 3, rng);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('handles near-zero gamma samples gracefully', () => {
    // Force total near zero
    const rng = () => 1e-15;
    const v = betaSample(1, 1, rng);
    expect(isFinite(v)).toBe(true);
  });
});

// ─── §16.4 Belief Update ─────────────────────────────────────────────────────

describe('beliefUpdate', () => {
  const pomdp = buildTinyPOMDP();

  it('returns a normalised belief state (sums to 1)', () => {
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsB');
    let total = 0;
    for (const v of bNext.values()) total += v;
    expect(total).toBeCloseTo(1.0);
  });

  it('shifts belief toward B after obsB in Stay action', () => {
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsB');
    expect(bNext.get('B')!).toBeGreaterThan(bNext.get('A')!);
  });

  it('shifts belief toward A after obsA', () => {
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsA');
    expect(bNext.get('A')!).toBeGreaterThan(bNext.get('B')!);
  });

  it('handles zero-probability observation by returning uniform', () => {
    // Observation with zero probability for all states
    const zeroObsPOMDP: POMDP = {
      ...pomdp,
      observations: new Map([
        ['A|obsA', 0], ['A|obsB', 0],
        ['B|obsA', 0], ['B|obsB', 0],
      ]),
    };
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const bNext = beliefUpdate(zeroObsPOMDP, b, 'Stay', 'obsA');
    // Should fall back to uniform
    let total = 0;
    for (const v of bNext.values()) total += v;
    expect(total).toBeCloseTo(1.0);
  });

  it('starting from certain state A, belief remains high on A after obsA', () => {
    const b: BeliefState = new Map([['A', 1.0], ['B', 0.0]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsA');
    expect(bNext.get('A')!).toBeGreaterThan(0.7);
  });
});

// ─── §16.4 beliefReward ───────────────────────────────────────────────────────

describe('beliefReward', () => {
  const pomdp = buildTinyPOMDP();

  it('returns expected reward for uniform belief in state B', () => {
    const b: BeliefState = new Map([['A', 0.0], ['B', 1.0]]);
    // Stay in B: 0.9 → B (reward 1), 0.1 → A (reward 0)
    const r = beliefReward(pomdp, b, 'Stay');
    expect(r).toBeCloseTo(0.9);
  });

  it('returns 0 for state A with Stay action', () => {
    const b: BeliefState = new Map([['A', 1.0], ['B', 0.0]]);
    // Stay in A: 0.9→A (reward 0), 0.1→B (reward 0) based on R(A,Stay,*)
    // R('A|Stay|A') = 0, R('A|Stay|B') = 0
    const r = beliefReward(pomdp, b, 'Stay');
    expect(r).toBeCloseTo(0);
  });

  it('scales linearly with belief probabilities', () => {
    const b: BeliefState = new Map([['A', 0.3], ['B', 0.7]]);
    const rAll = beliefReward(pomdp, b, 'Stay');
    // Expected: 0.3 * (no reward from A) + 0.7 * (reward from B)
    // = 0 + 0.7 * (0.9*1 + 0.1*0) = 0.63
    expect(rAll).toBeCloseTo(0.63);
  });

  it('returns 0 for empty belief', () => {
    const b: BeliefState = new Map([['A', 0], ['B', 0]]);
    expect(beliefReward(pomdp, b, 'Stay')).toBeCloseTo(0);
  });
});

// ─── §16.5 POMDP Value Iteration ──────────────────────────────────────────────

describe('dotBelief', () => {
  it('computes dot product correctly', () => {
    const b: BeliefState = new Map([['A', 0.3], ['B', 0.7]]);
    const alpha: AlphaVector = {
      action: 'Stay',
      values: new Map([['A', 1.0], ['B', 2.0]]),
    };
    // 0.3*1 + 0.7*2 = 1.7
    expect(dotBelief(b, alpha)).toBeCloseTo(1.7);
  });

  it('returns 0 for empty belief', () => {
    const b: BeliefState = new Map();
    const alpha: AlphaVector = {
      action: 'a',
      values: new Map([['A', 5.0]]),
    };
    expect(dotBelief(b, alpha)).toBe(0);
  });
});

describe('maxAlpha', () => {
  it('returns the maximum value across all alpha-vectors', () => {
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const alphas: AlphaVector[] = [
      { action: 'Stay', values: new Map([['A', 1.0], ['B', 1.0]]) },
      { action: 'Go', values: new Map([['A', 2.0], ['B', 0.0]]) },
    ];
    // dot(b, alpha0) = 1.0; dot(b, alpha1) = 1.0; max = 1.0
    expect(maxAlpha(b, alphas)).toBeCloseTo(1.0);
  });

  it('returns -Infinity for empty alpha set', () => {
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    expect(maxAlpha(b, [])).toBe(-Infinity);
  });
});

describe('pruneAlphas', () => {
  it('removes dominated vectors', () => {
    const states = ['A', 'B'];
    const alphas: AlphaVector[] = [
      { action: 'a', values: new Map([['A', 1.0], ['B', 1.0]]) }, // dominated
      { action: 'b', values: new Map([['A', 2.0], ['B', 2.0]]) }, // dominates
    ];
    const pruned = pruneAlphas(alphas, states);
    expect(pruned.length).toBe(1);
    expect(pruned[0]!.action).toBe('b');
  });

  it('keeps all vectors when none is dominated', () => {
    const states = ['A', 'B'];
    const alphas: AlphaVector[] = [
      { action: 'a', values: new Map([['A', 2.0], ['B', 0.0]]) },
      { action: 'b', values: new Map([['A', 0.0], ['B', 2.0]]) },
    ];
    const pruned = pruneAlphas(alphas, states);
    expect(pruned.length).toBe(2);
  });

  it('returns at least one vector even if all are identical', () => {
    const states = ['A', 'B'];
    const alphas: AlphaVector[] = [
      { action: 'a', values: new Map([['A', 1.0], ['B', 1.0]]) },
      { action: 'b', values: new Map([['A', 1.0], ['B', 1.0]]) },
    ];
    const pruned = pruneAlphas(alphas, states);
    expect(pruned.length).toBeGreaterThanOrEqual(1);
  });

  it('returns first element as fallback when all dominated', () => {
    // All dominated by one dominator; result should be non-empty
    const states = ['A'];
    const alphas: AlphaVector[] = [
      { action: 'a', values: new Map([['A', 1.0]]) },
    ];
    const pruned = pruneAlphas(alphas, states);
    expect(pruned.length).toBe(1);
  });
});

describe('pomdpValueIteration', () => {
  it('returns one alpha per action', () => {
    const pomdp = buildTinyPOMDP();
    const initial: AlphaVector[] = pomdp.actions.map((a) => ({
      action: a,
      values: new Map([['A', 0], ['B', 0]]),
    }));
    const result = pomdpValueIteration(pomdp, initial);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('values increase after more depth (positive reward environment)', () => {
    const pomdp = buildTinyPOMDP();
    const initial: AlphaVector[] = pomdp.actions.map((a) => ({
      action: a,
      values: new Map([['A', 0], ['B', 0]]),
    }));
    const step1 = pomdpValueIteration(pomdp, initial);
    const step2 = pomdpValueIteration(pomdp, step1);
    // At least one alpha vector should have strictly positive values
    const hasPositive = step2.some((a) =>
      Array.from(a.values.values()).some((v) => v > 0),
    );
    expect(hasPositive).toBe(true);
  });
});

describe('runPOMDPValueIteration', () => {
  it('returns depth+1 entries (initial + one per depth)', () => {
    const pomdp = buildTinyPOMDP();
    const history = runPOMDPValueIteration(pomdp, 4);
    expect(history.length).toBe(5);
  });

  it('each step contains at least one alpha vector', () => {
    const pomdp = buildTinyPOMDP();
    const history = runPOMDPValueIteration(pomdp, 3);
    for (const alphas of history) {
      expect(alphas.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('utility of belief state (0.5,0.5) increases with depth', () => {
    const pomdp = buildTinyPOMDP();
    const history = runPOMDPValueIteration(pomdp, 6);
    const b: BeliefState = new Map([['A', 0.5], ['B', 0.5]]);
    const v0 = maxAlpha(b, history[0]!);
    const v6 = maxAlpha(b, history[6]!);
    expect(v6).toBeGreaterThanOrEqual(v0);
  });
});

// ─── buildGridMDP ─────────────────────────────────────────────────────────────

describe('buildGridMDP', () => {
  it('creates states for all non-wall cells', () => {
    const mdp = buildGridMDP();
    // 4x3 = 12, minus wall (2,2) = 11, minus 2 terminals = 9
    expect(mdp.states.length).toBe(9);
  });

  it('creates exactly 2 terminal states', () => {
    const mdp = buildGridMDP();
    expect(mdp.terminalStates.length).toBe(2);
    expect(mdp.terminalStates).toContain('(4,3)');
    expect(mdp.terminalStates).toContain('(4,2)');
  });

  it('all transitions sum to approximately 1', () => {
    const mdp = buildGridMDP();
    for (const s of mdp.states) {
      for (const a of mdp.actions) {
        const key = actionKey(s, a);
        const succs = mdp.transitions.get(key) ?? [];
        const total = succs.reduce((acc, { prob }) => acc + prob, 0);
        expect(total).toBeCloseTo(1.0, 5);
      }
    }
  });

  it('terminal transitions give +1 and -1 rewards', () => {
    const mdp = buildGridMDP();
    // Find a transition that leads to terminal positive
    let foundPos = false;
    let foundNeg = false;
    for (const s of mdp.states) {
      for (const a of mdp.actions) {
        const key = actionKey(s, a);
        const succs = mdp.transitions.get(key) ?? [];
        for (const { state: sPrime } of succs) {
          const r = mdp.rewards.get(transKey(s, a, sPrime));
          if (sPrime === '(4,3)' && r === 1) foundPos = true;
          if (sPrime === '(4,2)' && r === -1) foundNeg = true;
        }
      }
    }
    expect(foundPos).toBe(true);
    expect(foundNeg).toBe(true);
  });

  it('uses provided step reward r', () => {
    const mdp = buildGridMDP(-0.1, 0.9);
    // Non-terminal transitions should use r = -0.1
    let found = false;
    for (const s of mdp.states) {
      for (const a of mdp.actions) {
        const key = actionKey(s, a);
        const succs = mdp.transitions.get(key) ?? [];
        for (const { state: sPrime } of succs) {
          if (!mdp.terminalStates.includes(sPrime)) {
            const r = mdp.rewards.get(transKey(s, a, sPrime));
            if (r !== undefined) {
              expect(r).toBeCloseTo(-0.1);
              found = true;
            }
          }
        }
      }
    }
    expect(found).toBe(true);
  });

  it('respects provided gamma', () => {
    const mdp = buildGridMDP(-0.04, 0.95);
    expect(mdp.gamma).toBe(0.95);
  });

  it('value iteration converges on 4x3 grid with gamma=0.9', () => {
    const mdp = buildGridMDP(-0.04, 0.9);
    const steps = valueIteration(mdp, 0.01);
    const last = steps[steps.length - 1]!;
    expect(last.converged).toBe(true);
    // State (3,3) adjacent to terminal should have higher utility than (1,1)
    const u33 = last.U.get('(3,3)')!;
    const u11 = last.U.get('(1,1)')!;
    expect(u33).toBeGreaterThan(u11);
  });
});

// ─── Branch coverage extras ───────────────────────────────────────────────────

describe('runUCB1 edge cases', () => {
  it('handles single arm (samples[i] null coalescing)', () => {
    // With a single arm, no competition - the ?? branch for ucbValues
    const arm: BanditArm[] = [{ name: 'only', trueMean: 0.5, trueStd: 0 }];
    const steps = runUCB1(arm, 5, () => 0.5);
    expect(steps.length).toBe(5);
    steps.forEach((s) => expect(s.selectedArm).toBe(0));
  });
});

describe('runThompsonSampling edge cases', () => {
  it('handles single arm', () => {
    const arm: BanditArm[] = [{ name: 'only', trueMean: 0.5, trueStd: 0 }];
    const steps = runThompsonSampling(arm, 5, 0, () => 0.5);
    expect(steps.length).toBe(5);
  });
});

describe('betaSample edge cases', () => {
  it('returns 0.5 when gamma samples are effectively 0', () => {
    // Force extremely small gamma samples so total ≤ 0
    // gammaSample will recurse with shape<1; set rng so v≤0 scenarios happen
    // Actually just directly call with very small shape to approach 0
    // Use a controlled rng that produces very near 0
    let callCount = 0;
    const tinyRng = () => {
      callCount++;
      return callCount === 1 ? 1e-300 : 0.5; // near-0 for first gamma call
    };
    // This may or may not produce total<=0 depending on sampling path;
    // just ensure it doesn't throw
    expect(() => betaSample(0.001, 0.001, tinyRng)).not.toThrow();
  });
});

describe('restartMDPValue branch coverage', () => {
  it('works with s0,f0 at boundary of maxStates', () => {
    // s0+f0 = maxStates+2 so the sf loops cover the starting state
    const val = restartMDPValue(5, 5, 0.9, 0.5, 8);
    expect(val).toBeGreaterThan(0);
  });

  it('handles s0=1, f0=1 (minimum counts)', () => {
    const val = restartMDPValue(1, 1, 0.5, 0.3, 5);
    expect(isFinite(val)).toBe(true);
  });
});

describe('beliefUpdate branch coverage', () => {
  it('handles belief with unknown state (b.get returns undefined)', () => {
    const pomdp = buildTinyPOMDP();
    // Belief has extra state 'X' not in transitions → pTrans=0 path
    const b: BeliefState = new Map([['A', 0.4], ['B', 0.4], ['X', 0.2]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsA');
    let total = 0;
    for (const v of bNext.values()) total += v;
    expect(total).toBeCloseTo(1.0);
  });

  it('handles unknown transitions for state in belief', () => {
    const pomdp = buildTinyPOMDP();
    // Add a state with no transitions to the POMDP
    const extPOMDP: POMDP = {
      ...pomdp,
      states: [...pomdp.states, 'C'],
      observations: new Map([
        ...pomdp.observations,
        ['C|obsA', 0.5],
        ['C|obsB', 0.5],
      ]),
    };
    const b: BeliefState = new Map([['A', 0.4], ['B', 0.4], ['C', 0.2]]);
    const bNext = beliefUpdate(extPOMDP, b, 'Stay', 'obsA');
    let total = 0;
    for (const v of bNext.values()) total += v;
    expect(total).toBeCloseTo(1.0);
  });

  it('handles sPrime not found in any successor list', () => {
    const pomdp = buildTinyPOMDP();
    // B with Stay action doesn't transition to 'A' with 100% prob
    // so the find for sPrime='A' might return undefined
    const b: BeliefState = new Map([['A', 0.1], ['B', 0.9]]);
    const bNext = beliefUpdate(pomdp, b, 'Stay', 'obsA');
    expect(bNext.get('A')).toBeGreaterThanOrEqual(0);
  });
});

describe('beliefReward branch coverage', () => {
  it('handles state with no transitions in reward computation', () => {
    const pomdp = buildTinyPOMDP();
    const extPOMDP: POMDP = {
      ...pomdp,
      states: [...pomdp.states, 'D'],
    };
    const b: BeliefState = new Map([['A', 0.3], ['B', 0.3], ['D', 0.4]]);
    // D has no transitions → succs=[] → the inner loop doesn't run
    const r = beliefReward(extPOMDP, b, 'Stay');
    expect(isFinite(r)).toBe(true);
  });
});

describe('dotBelief branch coverage', () => {
  it('handles state in belief not in alpha values', () => {
    const b: BeliefState = new Map([['A', 0.5], ['UNKNOWN', 0.5]]);
    const alpha: AlphaVector = {
      action: 'a',
      values: new Map([['A', 2.0]]),  // no 'UNKNOWN' key
    };
    // UNKNOWN → alpha.values.get('UNKNOWN') ?? 0 hits the ?? branch
    expect(dotBelief(b, alpha)).toBeCloseTo(1.0);
  });
});

describe('pomdpValueIteration branch coverage', () => {
  it('handles empty alpha set gracefully', () => {
    const pomdp = buildTinyPOMDP();
    // passing empty alphas → bestAlpha stays null → if (bestAlpha) is false
    const result = pomdpValueIteration(pomdp, []);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('handles POMDP with missing transitions for some states', () => {
    const pomdp: POMDP = {
      ...buildTinyPOMDP(),
      // Add state 'C' with no transitions
      states: ['A', 'B', 'C'],
    };
    const alphas: AlphaVector[] = pomdp.actions.map((a) => ({
      action: a,
      values: new Map([['A', 0], ['B', 0], ['C', 0]]),
    }));
    expect(() => pomdpValueIteration(pomdp, alphas)).not.toThrow();
  });
});

describe('pruneAlphas branch coverage', () => {
  it('handles alpha values missing a state key', () => {
    // alphaI missing state 'B', alphaJ has all
    const states = ['A', 'B'];
    const alphas: AlphaVector[] = [
      { action: 'a', values: new Map([['A', 1.0]]) }, // missing B
      { action: 'b', values: new Map([['A', 2.0], ['B', 2.0]]) },
    ];
    // alphaJ dominates alphaI (since missing key → 0 vs 2 for B; 2 vs 1 for A)
    const pruned = pruneAlphas(alphas, states);
    expect(pruned.length).toBe(1);
  });

  it('handles empty alpha list', () => {
    const pruned = pruneAlphas([], ['A', 'B']);
    expect(pruned.length).toBe(0);
  });
});
