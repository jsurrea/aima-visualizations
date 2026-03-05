import { describe, it, expect } from 'vitest';
import {
  createGridWorld,
  getReward,
  sampleTransition,
  directUtilityEstimation,
  passiveTDLearner,
  passiveADPLearner,
  qLearningStep,
  sarsaStep,
  runQLearning,
  runSARSA,
  linearFunctionApprox,
  tdFAUpdate,
  qFAUpdate,
  softmaxPolicy,
  reinforceUpdate,
  computeFeatureExpectations,
  featureMatchingIRL,
  type GridAction,
  type State,
  type Trial,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Grid-world helpers
// ---------------------------------------------------------------------------

describe('createGridWorld', () => {
  it('returns 3×4 grid', () => {
    const gw = createGridWorld();
    expect(gw.rows).toBe(3);
    expect(gw.cols).toBe(4);
  });
  it('has wall at (1,1)', () => {
    const gw = createGridWorld();
    expect(gw.walls.has('1,1')).toBe(true);
    expect(gw.walls.size).toBe(1);
  });
  it('terminal (0,3) → +1', () => {
    expect(createGridWorld().terminals.get('0,3')).toBe(1.0);
  });
  it('terminal (1,3) → -1', () => {
    expect(createGridWorld().terminals.get('1,3')).toBe(-1.0);
  });
  it('defaultReward is -0.04', () => {
    expect(createGridWorld().defaultReward).toBeCloseTo(-0.04);
  });
});

describe('getReward', () => {
  const gw = createGridWorld();
  it('positive terminal', () => expect(getReward('0,3', gw)).toBe(1.0));
  it('negative terminal', () => expect(getReward('1,3', gw)).toBe(-1.0));
  it('normal state → default reward', () => expect(getReward('0,0', gw)).toBeCloseTo(-0.04));
  it('wall state → 0', () => expect(getReward('1,1', gw)).toBe(0));
});

// ---------------------------------------------------------------------------
// sampleTransition (covers all branches of applyAction + getPerpendicularActions)
// ---------------------------------------------------------------------------

describe('sampleTransition', () => {
  const gw = createGridWorld();

  it('p < 0.8 → intended direction up', () => {
    expect(sampleTransition('2,0', 'up', gw, () => 0.5)).toBe('1,0');
  });
  it('p < 0.8 → intended direction down', () => {
    expect(sampleTransition('0,0', 'down', gw, () => 0.5)).toBe('1,0');
  });
  it('p < 0.8 → intended direction right', () => {
    expect(sampleTransition('2,0', 'right', gw, () => 0.5)).toBe('2,1');
  });
  it('p < 0.8 → intended direction left bounces on boundary', () => {
    expect(sampleTransition('2,0', 'left', gw, () => 0.5)).toBe('2,0');
  });
  it('0.8 ≤ p < 0.9 → first perp (left when going up)', () => {
    // up → perp[0]=left. (2,2) left → (2,1)
    expect(sampleTransition('2,2', 'up', gw, () => 0.85)).toBe('2,1');
  });
  it('0.8 ≤ p < 0.9 → first perp (up when going right) bounces on wall', () => {
    // right → perp[0]=up. (2,1) up → (1,1) is wall → stay
    expect(sampleTransition('2,1', 'right', gw, () => 0.85)).toBe('2,1');
  });
  it('0.8 ≤ p < 0.9 → first perp (right when going down)', () => {
    // down → perp[0]=left. (0,2) left → (0,1)
    expect(sampleTransition('0,2', 'down', gw, () => 0.85)).toBe('0,1');
  });
  it('0.8 ≤ p < 0.9 → first perp (up when going left)', () => {
    // left → perp[0]=up. (2,2) up → (1,2)
    expect(sampleTransition('2,2', 'left', gw, () => 0.85)).toBe('1,2');
  });
  it('p ≥ 0.9 → second perp (right when going up)', () => {
    // up → perp[1]=right. (2,0) right → (2,1)
    expect(sampleTransition('2,0', 'up', gw, () => 0.95)).toBe('2,1');
  });
  it('p ≥ 0.9 → second perp (down when going left)', () => {
    // left → perp[1]=down. (0,2) down → (1,2)
    expect(sampleTransition('0,2', 'left', gw, () => 0.95)).toBe('1,2');
  });
  it('p ≥ 0.9 → second perp (left when going down)', () => {
    // down → perp[1]=right. (0,0) right → (0,1)
    expect(sampleTransition('0,0', 'down', gw, () => 0.95)).toBe('0,1');
  });
  it('p ≥ 0.9 → second perp (down when going right)', () => {
    // right → perp[1]=down. (0,0) down → (1,0)
    expect(sampleTransition('0,0', 'right', gw, () => 0.95)).toBe('1,0');
  });
  it('bounces off top boundary', () => {
    expect(sampleTransition('0,0', 'up', gw, () => 0.5)).toBe('0,0');
  });
  it('bounces off bottom boundary', () => {
    expect(sampleTransition('2,3', 'down', gw, () => 0.5)).toBe('2,3');
  });
  it('bounces off right boundary', () => {
    expect(sampleTransition('2,3', 'right', gw, () => 0.5)).toBe('2,3');
  });
  it('bounces off left boundary via intended', () => {
    expect(sampleTransition('0,0', 'left', gw, () => 0.5)).toBe('0,0');
  });
  it('bounces off wall tile via intended', () => {
    // (1,0) going right → (1,1) is wall → stay
    expect(sampleTransition('1,0', 'right', gw, () => 0.5)).toBe('1,0');
  });
});

// ---------------------------------------------------------------------------
// §23.2 — Passive RL
// ---------------------------------------------------------------------------

describe('directUtilityEstimation', () => {
  it('empty trials → empty maps', () => {
    const result = directUtilityEstimation([], 0.9);
    expect(result.utilities.size).toBe(0);
    expect(result.visitCounts.size).toBe(0);
  });

  it('single trial single step', () => {
    const trial: Trial = [
      { state: '2,0', action: 'up', reward: -0.04, nextState: '1,0' },
    ];
    const result = directUtilityEstimation([trial], 1.0);
    expect(result.utilities.get('2,0')).toBeCloseTo(-0.04);
    expect(result.visitCounts.get('2,0')).toBe(1);
  });

  it('multi-step discounted return', () => {
    const trial: Trial = [
      { state: 'A', action: 'right', reward: 0.5, nextState: 'B' },
      { state: 'B', action: 'right', reward: 1.0, nextState: 'T' },
    ];
    const result = directUtilityEstimation([trial], 0.9);
    expect(result.utilities.get('A')).toBeCloseTo(0.5 + 0.9 * 1.0);
    expect(result.utilities.get('B')).toBeCloseTo(1.0);
  });

  it('multiple trials average returns', () => {
    const t1: Trial = [{ state: 'A', action: 'right', reward: 2.0, nextState: 'T' }];
    const t2: Trial = [{ state: 'A', action: 'right', reward: 0.0, nextState: 'T' }];
    const result = directUtilityEstimation([t1, t2], 1.0);
    expect(result.utilities.get('A')).toBeCloseTo(1.0);
    expect(result.visitCounts.get('A')).toBe(2);
  });

  it('state visited multiple times in one trial averages correctly', () => {
    const trial: Trial = [
      { state: 'A', action: 'right', reward: 1.0, nextState: 'B' },
      { state: 'B', action: 'right', reward: 1.0, nextState: 'A' },
      { state: 'A', action: 'right', reward: 1.0, nextState: 'T' },
    ];
    const result = directUtilityEstimation([trial], 1.0);
    // first A: G=1+1+1=3; second A: G=1; avg=2
    expect(result.utilities.get('A')).toBeCloseTo(2.0);
    expect(result.visitCounts.get('A')).toBe(2);
  });
});

describe('passiveTDLearner', () => {
  it('empty trials → empty history', () => {
    expect(passiveTDLearner([], 0.9, 0.1)).toHaveLength(0);
  });

  it('returns one snapshot per trial', () => {
    const trial: Trial = [
      { state: 'A', action: 'right', reward: 1.0, nextState: 'T' },
    ];
    expect(passiveTDLearner([trial, trial], 0.9, 0.3)).toHaveLength(2);
  });

  it('trial index recorded correctly', () => {
    const trial: Trial = [{ state: 'A', action: 'up', reward: 0, nextState: 'B' }];
    const hist = passiveTDLearner([trial, trial, trial], 0.9, 0.1);
    expect(hist[0]!.trial).toBe(0);
    expect(hist[2]!.trial).toBe(2);
  });

  it('utility updates toward TD target', () => {
    const trial: Trial = [
      { state: '2,1', action: 'up', reward: 1.0, nextState: '0,3' },
    ];
    const hist = passiveTDLearner([trial], 0.9, 0.5);
    const u = hist[0]!.utilities.get('2,1') ?? 0;
    // δ = 1.0 + 0.9*0 - 0 = 1.0; U = 0 + 0.5*1 = 0.5
    expect(u).toBeCloseTo(0.5);
  });

  it('converges with many identical trials', () => {
    const trial: Trial = [
      { state: 'A', action: 'right', reward: 1.0, nextState: 'T' },
    ];
    const hist = passiveTDLearner(Array(100).fill(trial), 0.9, 0.3);
    expect(hist[99]!.utilities.get('A') ?? 0).toBeGreaterThan(0.7);
  });
});

describe('passiveADPLearner', () => {
  it('estimates transition probabilities', () => {
    const trial: Trial = [
      { state: '2,0', action: 'right', reward: -0.04, nextState: '2,1' },
    ];
    const result = passiveADPLearner([trial], 0.9);
    expect(result.transitionModel.get('2,0;right;2,1')).toBeCloseTo(1.0);
  });

  it('reward model records observed rewards', () => {
    const t1: Trial = [{ state: 'A', action: 'right', reward: 1.0, nextState: 'T' }];
    const t2: Trial = [{ state: 'A', action: 'right', reward: 1.0, nextState: 'T' }];
    const result = passiveADPLearner([t1, t2], 0.9);
    expect(result.rewardModel.get('T')).toBeCloseTo(1.0);
  });

  it('utilities map is returned as a Map', () => {
    const trial: Trial = [{ state: '2,0', action: 'right', reward: -0.04, nextState: '2,1' }];
    const result = passiveADPLearner([trial], 0.9);
    expect(result.utilities).toBeInstanceOf(Map);
  });

  it('averages rewards when same state entered multiple times', () => {
    const t1: Trial = [{ state: 'A', action: 'right', reward: 2.0, nextState: 'B' }];
    const t2: Trial = [{ state: 'A', action: 'right', reward: 0.0, nextState: 'B' }];
    const result = passiveADPLearner([t1, t2], 0.9);
    expect(result.rewardModel.get('B')).toBeCloseTo(1.0);
  });

  it('handles multi-step trials', () => {
    const trial: Trial = [
      { state: '2,0', action: 'right', reward: -0.04, nextState: '2,1' },
      { state: '2,1', action: 'right', reward: -0.04, nextState: '2,2' },
    ];
    const result = passiveADPLearner([trial], 0.9);
    expect(result.transitionModel.get('2,1;right;2,2')).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// §23.3 — Active RL
// ---------------------------------------------------------------------------

describe('qLearningStep', () => {
  const emptyQ = new Map<State, ReadonlyMap<GridAction, number>>();
  const emptyN = new Map<State, ReadonlyMap<GridAction, number>>();

  it('first call: N(s,a)=1 and Q updated', () => {
    const r = qLearningStep(emptyQ, emptyN, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
    expect(r.Nsa.get('2,0')?.get('right')).toBe(1);
    expect(r.Q.get('2,0')?.get('right')).toBeDefined();
  });

  it('exploration branch (n=0 < Ne=5): uses Rplus for next state', () => {
    const r = qLearningStep(emptyQ, emptyN, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
    // maxNextQ = Rplus=2.0; α=1; Q=0+1*(-0.04+0.9*2.0-0)=1.76
    expect(r.Q.get('2,0')?.get('right')).toBeCloseTo(1.76);
  });

  it('exploitation branch (n >= Ne): uses actual Q', () => {
    const nMap = new Map<GridAction, number>([['up',5],['down',5],['left',5],['right',5]]);
    const n = new Map<State, ReadonlyMap<GridAction, number>>([['2,1', nMap]]);
    const qMap = new Map<GridAction, number>([['up',0.5],['down',0.3],['left',0.1],['right',0.2]]);
    const q = new Map<State, ReadonlyMap<GridAction, number>>([['2,1', qMap]]);
    const r = qLearningStep(q, n, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
    // maxNextQ=0.5 (best Q); α=1; Q=0+1*(-0.04+0.9*0.5)=0.41
    expect(r.Q.get('2,0')?.get('right')).toBeCloseTo(0.41);
  });

  it('isNextTerminal=true → future=0, Q→reward', () => {
    const r = qLearningStep(emptyQ, emptyN, '0,2', 'right', 1.0, '0,3', 0.9, 2.0, 5, true);
    // α=1; Q=0+1*(1.0+0-0)=1.0
    expect(r.Q.get('0,2')?.get('right')).toBeCloseTo(1.0);
  });

  it('isNextTerminal defaults to false (exploration applies)', () => {
    const r = qLearningStep(emptyQ, emptyN, '2,0', 'up', -0.04, '1,0', 0.9, 2.0, 5);
    expect(r.Q.get('2,0')?.get('up')).toBeCloseTo(-0.04 + 0.9 * 2.0);
  });

  it('N increments on repeated calls', () => {
    let q = emptyQ as ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
    let n = emptyN as ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
    for (let i = 0; i < 4; i++) {
      const res = qLearningStep(q, n, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
      q = res.Q; n = res.Nsa;
    }
    expect(n.get('2,0')?.get('right')).toBe(4);
  });

  it('does not mutate existing Q values for other actions', () => {
    const qMap = new Map<GridAction, number>([['up', 0.77]]);
    const q = new Map<State, ReadonlyMap<GridAction, number>>([['2,0', qMap]]);
    const r = qLearningStep(q, emptyN, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
    expect(r.Q.get('2,0')?.get('up')).toBeCloseTo(0.77);
  });

  it('maxNextQ takes the max over all actions', () => {
    // next state has up=0.1, down=0.9, left=0.2, right=0.3 all with n>=Ne
    const nMap = new Map<GridAction, number>([['up',5],['down',5],['left',5],['right',5]]);
    const n = new Map<State, ReadonlyMap<GridAction, number>>([['2,1', nMap]]);
    const qMap = new Map<GridAction, number>([['up',0.1],['down',0.9],['left',0.2],['right',0.3]]);
    const q = new Map<State, ReadonlyMap<GridAction, number>>([['2,1', qMap]]);
    const r = qLearningStep(q, n, '2,0', 'right', -0.04, '2,1', 0.9, 2.0, 5);
    // maxNextQ=0.9; Q=0+1*(-0.04+0.9*0.9)=0.77
    expect(r.Q.get('2,0')?.get('right')).toBeCloseTo(0.77);
  });
});

describe('sarsaStep', () => {
  it('basic update from empty Q', () => {
    const q = new Map<State, ReadonlyMap<GridAction, number>>();
    const newQ = sarsaStep(q, '2,0', 'right', -0.04, '2,1', 'up', 0.9, 0.5);
    // Q=0+0.5*(-0.04+0.9*0-0)=-0.02
    expect(newQ.get('2,0')?.get('right')).toBeCloseTo(-0.02);
  });

  it('uses Q(s′,a′) not max', () => {
    const qMap = new Map<GridAction, number>([['up', 1.0], ['right', 0.5]]);
    const q = new Map<State, ReadonlyMap<GridAction, number>>([['2,1', qMap]]);
    const newQ = sarsaStep(q, '2,0', 'right', -0.04, '2,1', 'right', 0.9, 1.0);
    // Q=0+1*(-0.04+0.9*0.5)=0.41
    expect(newQ.get('2,0')?.get('right')).toBeCloseTo(0.41);
  });

  it('preserves unrelated Q entries', () => {
    const qMap = new Map<GridAction, number>([['up', 0.88]]);
    const q = new Map<State, ReadonlyMap<GridAction, number>>([['2,0', qMap]]);
    const newQ = sarsaStep(q, '2,0', 'right', -0.04, '2,1', 'up', 0.9, 0.3);
    expect(newQ.get('2,0')?.get('up')).toBeCloseTo(0.88);
  });
});

describe('runQLearning', () => {
  const gw = createGridWorld();

  it('returns requested episode count', () => {
    expect(runQLearning(gw, 10, 0.9, 2.0, 5, 1)).toHaveLength(10);
  });

  it('episode numbers sequential', () => {
    const hist = runQLearning(gw, 5, 0.9, 2.0, 5, 1);
    expect(hist[0]!.episode).toBe(0);
    expect(hist[4]!.episode).toBe(4);
  });

  it('exploration counts are non-negative integers', () => {
    const hist = runQLearning(gw, 10, 0.9, 2.0, 5, 42);
    let total = 0;
    for (const [, actions] of hist[9]!.explorationCounts) {
      for (const [, n] of actions) { expect(n).toBeGreaterThanOrEqual(0); total += n; }
    }
    expect(total).toBeGreaterThan(0);
  });

  it('policy is defined for non-terminal states', () => {
    const hist = runQLearning(gw, 5, 0.9, 2.0, 5, 42);
    expect(hist[0]!.policy.size).toBeGreaterThan(0);
  });

  it('totalReward is finite', () => {
    const hist = runQLearning(gw, 5, 0.9, 2.0, 5, 42);
    hist.forEach(h => expect(Number.isFinite(h.totalReward)).toBe(true));
  });

  it('gamma=0 runs without error', () => {
    expect(runQLearning(gw, 3, 0.0, 1.0, 3, 1)).toHaveLength(3);
  });

  it('Ne=0 (pure exploitation) runs without error', () => {
    expect(runQLearning(gw, 3, 0.9, 2.0, 0, 1)).toHaveLength(3);
  });
});

describe('runSARSA', () => {
  const gw = createGridWorld();

  it('returns requested episode count', () => {
    expect(runSARSA(gw, 8, 0.9, 0.3, 0.1, 42)).toHaveLength(8);
  });

  it('episode index sequential', () => {
    const hist = runSARSA(gw, 3, 0.9, 0.3, 0.1, 42);
    expect(hist[0]!.episode).toBe(0);
    expect(hist[2]!.episode).toBe(2);
  });

  it('totalReward is finite', () => {
    runSARSA(gw, 5, 0.9, 0.3, 0.1, 42).forEach(h =>
      expect(Number.isFinite(h.totalReward)).toBe(true));
  });

  it('epsilon=0 (greedy) runs', () => {
    expect(runSARSA(gw, 3, 0.9, 0.3, 0, 42)).toHaveLength(3);
  });

  it('epsilon=1 (random) runs', () => {
    expect(runSARSA(gw, 3, 0.9, 0.3, 1.0, 42)).toHaveLength(3);
  });

  it('policy is defined', () => {
    const hist = runSARSA(gw, 5, 0.9, 0.3, 0.1, 42);
    expect(hist[4]!.policy).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §23.4 — Function Approximation
// ---------------------------------------------------------------------------

describe('linearFunctionApprox', () => {
  it('basic dot product', () => {
    expect(linearFunctionApprox([1, 2, 3], [4, 5, 6])).toBeCloseTo(32);
  });
  it('zero theta → 0', () => {
    expect(linearFunctionApprox([0, 0, 0], [1, 2, 3])).toBeCloseTo(0);
  });
  it('shorter features pads with 0', () => {
    expect(linearFunctionApprox([1, 2, 3], [4, 5])).toBeCloseTo(14);
  });
  it('shorter theta pads with 0', () => {
    expect(linearFunctionApprox([1, 2], [4, 5, 6])).toBeCloseTo(14);
  });
  it('single element', () => {
    expect(linearFunctionApprox([3], [4])).toBeCloseTo(12);
  });
  it('empty vectors → 0', () => {
    expect(linearFunctionApprox([], [])).toBeCloseTo(0);
  });
});

describe('tdFAUpdate', () => {
  it('zero reward and equal state features → zero tdError', () => {
    const f = [1, 0, 1];
    const result = tdFAUpdate([1, 0, 0.5], f, f, 0, 1.0, 0.1);
    expect(result.tdError).toBeCloseTo(0);
  });

  it('positive reward increases theta in feature direction', () => {
    const result = tdFAUpdate([0, 0], [1, 0], [0, 0], 1.0, 0.9, 0.5);
    // δ=1.0, Δθ[0]=0.5*1*1=0.5
    expect(result.theta[0]).toBeCloseTo(0.5);
    expect(result.tdError).toBeCloseTo(1.0);
  });

  it('discount applied to next state value', () => {
    // θ=[0,1], f_s=[0,1], f_s'=[0,1], r=0, γ=0.5
    // uS=1, uSP=1, δ=0+0.5*1-1=-0.5
    const result = tdFAUpdate([0, 1], [0, 1], [0, 1], 0, 0.5, 0.1);
    expect(result.tdError).toBeCloseTo(-0.5);
  });
});

describe('qFAUpdate', () => {
  it('updates theta using Q-FA rule', () => {
    const result = qFAUpdate([0, 0], [1, 0], [0, 1], 1.0, 0.9, 0.5);
    // qSA=0, qNext=0, δ=1.0, Δθ[0]=0.5*1*1=0.5
    expect(result.theta[0]).toBeCloseTo(0.5);
    expect(result.tdError).toBeCloseTo(1.0);
  });

  it('negative td error decreases theta', () => {
    // θ=[1], fSA=[1], fBest=[0], r=-1, γ=0.9
    // qSA=1, qNext=0, δ=-1-1=-2, Δθ=0.5*(-2)*1=-1 → θ=0
    const result = qFAUpdate([1.0], [1], [0], -1.0, 0.9, 0.5);
    expect(result.theta[0]).toBeCloseTo(0);
  });

  it('zero tdError → no change', () => {
    // θ=[1], fSA=[1], fBest=[1], r=0, γ=1
    // qSA=1, qNext=1, δ=0+1*1-1=0
    const result = qFAUpdate([1.0], [1], [1], 0, 1.0, 0.5);
    expect(result.theta[0]).toBeCloseTo(1.0);
    expect(result.tdError).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// §23.5 — Policy Gradient
// ---------------------------------------------------------------------------

describe('softmaxPolicy', () => {
  it('probabilities sum to 1', () => {
    const qVals = new Map<GridAction, number>([
      ['up', 1.0], ['down', 0.5], ['left', 0.2], ['right', 0.8],
    ]);
    const total = [...softmaxPolicy(qVals, 1.0).values()].reduce((a,b) => a+b, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it('all-zero Q → uniform (0.25 each)', () => {
    const qVals = new Map<GridAction, number>([
      ['up',0],['down',0],['left',0],['right',0],
    ]);
    for (const p of softmaxPolicy(qVals, 1.0).values()) {
      expect(p).toBeCloseTo(0.25);
    }
  });

  it('high beta → best action nearly certain', () => {
    const qVals = new Map<GridAction, number>([
      ['up',2.0],['down',0.0],['left',0.0],['right',0.0],
    ]);
    expect(softmaxPolicy(qVals, 20.0).get('up') ?? 0).toBeGreaterThan(0.99);
  });

  it('missing actions default to Q=0', () => {
    const qVals = new Map<GridAction, number>([['up', 1.0]]);
    const probs = softmaxPolicy(qVals, 1.0);
    expect(probs.size).toBe(4);
    expect(probs.get('up') ?? 0).toBeGreaterThan(probs.get('down') ?? 0);
  });

  it('beta=0 → uniform regardless of Q values', () => {
    const qVals = new Map<GridAction, number>([
      ['up',10.0],['down',-5.0],['left',3.0],['right',0.0],
    ]);
    for (const p of softmaxPolicy(qVals, 0).values()) {
      expect(p).toBeCloseTo(0.25);
    }
  });
});

describe('reinforceUpdate', () => {
  it('returns same-length theta', () => {
    const result = reinforceUpdate([0,0,0], [[1,0,0],[0,1,0],[0,0,1],[0,0,0]], 0, [0.25,0.25,0.25,0.25], 1.0, 0.1);
    expect(result).toHaveLength(3);
  });

  it('positive reward with clear gradient increases parameter', () => {
    // actionTaken=0, f[up]=[1,0], others=[0,0]
    const result = reinforceUpdate([0,0], [[1,0],[0,0],[0,0],[0,0]], 0, [0.25,0.25,0.25,0.25], 1.0, 1.0);
    // grad[0]=1 - 0.25*1=0.75 → θ[0]=0.75
    expect(result[0]).toBeCloseTo(0.75);
  });

  it('zero total reward → no change', () => {
    const result = reinforceUpdate([1.0,2.0], [[1,0],[0,1],[0,0],[0,0]], 0, [0.5,0.5,0,0], 0, 0.5);
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[1]).toBeCloseTo(2.0);
  });

  it('handles sparse feature arrays', () => {
    expect(() => reinforceUpdate([0,0], [[1,0]], 0, [0.5,0.5,0,0], 1.0, 0.1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §23.6 — Inverse RL
// ---------------------------------------------------------------------------

describe('computeFeatureExpectations', () => {
  it('empty trajectories → empty', () => {
    const result = computeFeatureExpectations([], () => [1, 0], 0.9);
    expect(result.expectations).toHaveLength(0);
    expect(result.numTrajectories).toBe(0);
  });

  it('single trajectory gamma=1', () => {
    const traj = [['A', 'B', 'A']];
    const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1,0] : [0,1];
    const r = computeFeatureExpectations(traj, fx, 1.0);
    // µ[0]=(1+0+1)/1=2; µ[1]=(0+1+0)/1=1
    expect(r.expectations[0]).toBeCloseTo(2);
    expect(r.expectations[1]).toBeCloseTo(1);
  });

  it('gamma < 1 discounts future states', () => {
    const traj = [['A', 'B']];
    const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1,0] : [0,1];
    const r = computeFeatureExpectations(traj, fx, 0.5);
    expect(r.expectations[0]).toBeCloseTo(1.0);
    expect(r.expectations[1]).toBeCloseTo(0.5);
  });

  it('averages over multiple trajectories', () => {
    const trajs = [['A'], ['B']];
    const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1,0] : [0,1];
    const r = computeFeatureExpectations(trajs, fx, 1.0);
    expect(r.expectations[0]).toBeCloseTo(0.5);
    expect(r.expectations[1]).toBeCloseTo(0.5);
    expect(r.numTrajectories).toBe(2);
  });
});

describe('featureMatchingIRL', () => {
  const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1,0] : [0,1];

  it('returns weights of correct length', () => {
    const r = featureMatchingIRL([['A','B']], [[['B','A']]], fx, 1.0, 1);
    expect(r.weights).toHaveLength(2);
  });

  it('iteration count = min(iterations, candidates)', () => {
    const r = featureMatchingIRL([['A']], [[['B']], [['A']]], fx, 1.0, 2);
    expect(r.iterations).toHaveLength(2);
  });

  it('margin=0 when expert === candidate (weights stay zero)', () => {
    const r = featureMatchingIRL([['A','B']], [[['A','B']]], fx, 1.0, 1);
    expect(r.iterations[0]!.margin).toBeCloseTo(0);
    expect(r.weights[0]).toBeCloseTo(0);
    expect(r.weights[1]).toBeCloseTo(0);
  });

  it('positive margin → L2-normalised weights', () => {
    const r = featureMatchingIRL([['A']], [[['B']]], fx, 1.0, 1);
    const norm = Math.sqrt(r.weights.reduce((s,w) => s+w*w, 0));
    expect(norm).toBeCloseTo(1.0);
  });

  it('clamps to available candidates', () => {
    const r = featureMatchingIRL([['A']], [[['B']]], fx, 1.0, 99);
    expect(r.iterations).toHaveLength(1);
  });

  it('iteration record has expert and policy expectations', () => {
    const r = featureMatchingIRL([['A']], [[['B']]], fx, 1.0, 1);
    expect(r.iterations[0]!.expertExpectations).toHaveLength(2);
    expect(r.iterations[0]!.policyExpectations).toHaveLength(2);
  });

  it('margin stored and positive for differing distributions', () => {
    const r = featureMatchingIRL([['A']], [[['B']]], fx, 1.0, 1);
    expect(r.iterations[0]!.margin).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests for defensive ?? operators
// ---------------------------------------------------------------------------

describe('tdFAUpdate — theta longer than features (line 849 branch)', () => {
  it('features_s shorter than theta → missing elements treated as 0', () => {
    // theta has 3 elements, features_s has 2 → features_s[2] ?? 0 = 0
    const result = tdFAUpdate([0, 0, 1], [1, 0], [1, 0], 1.0, 0.9, 0.5);
    // uS = 0*1+0*0+1*0 = 0 (features_s[2] = undefined → 0, so θ[2]*0=0)
    // uSP = same = 0
    // δ = 1.0, Δθ[2] = 0.5*1*0 = 0 (features_s[2]=undefined→0)
    expect(result.theta).toHaveLength(3);
    expect(result.theta[2]).toBeCloseTo(1); // unchanged since feature is 0
  });
});

describe('qFAUpdate — theta longer than features (line 882 branch)', () => {
  it('features_s_a shorter than theta → missing elements treated as 0', () => {
    // theta=[0,0,1], features_s_a=[1,0] (len 2) → features_s_a[2] ?? 0 = 0
    const result = qFAUpdate([0, 0, 1], [1, 0], [0, 0], 1.0, 0.9, 0.5);
    expect(result.theta).toHaveLength(3);
    expect(result.theta[2]).toBeCloseTo(1); // features_s_a[2]=undefined→0, no update
  });
});

describe('reinforceUpdate — out-of-bounds actionTaken (line 951 branch)', () => {
  it('actionTaken beyond stateFeatures length → treated as 0', () => {
    // stateFeatures has 4 entries, actionTaken=4 is out of bounds
    const result = reinforceUpdate(
      [0, 0],
      [[1, 0], [0, 1], [0, 0], [0, 0]],
      4, // out of bounds
      [0.25, 0.25, 0.25, 0.25],
      1.0,
      0.1,
    );
    expect(result).toHaveLength(2);
  });
});

describe('computeFeatureExpectations — featureExtractor shorter for some states (line 989)', () => {
  it('feats shorter than numFeatures → missing dimensions treated as 0', () => {
    // A returns [1,2] (2 features), B returns [3] (1 feature, numFeatures=2)
    const traj = [['A', 'B']];
    const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1, 2] : [3];
    const r = computeFeatureExpectations(traj, fx, 1.0);
    // t=0 A: [1,2], t=1 B: [3,undefined→0]
    expect(r.expectations[0]).toBeCloseTo(1 + 3); // 4
    expect(r.expectations[1]).toBeCloseTo(2 + 0); // 2
  });
});

describe('featureMatchingIRL — empty candidate policy (line 1032 branch)', () => {
  it('empty candidate trajectories → policyExp=[], missing indices default to 0', () => {
    const fx = (s: State): ReadonlyArray<number> => s === 'A' ? [1, 0] : [0, 1];
    const expert = [['A']];
    const emptyCandidate: ReadonlyArray<ReadonlyArray<State>> = [];
    const r = featureMatchingIRL(expert, [emptyCandidate], fx, 1.0, 1);
    // policyExp = [] (empty), expertExp = [1,0]
    // raw = [1-0, 0-0] = [1,0], margin=1, weights=[1,0]
    expect(r.weights[0]).toBeCloseTo(1.0);
    expect(r.weights[1]).toBeCloseTo(0.0);
  });
});
