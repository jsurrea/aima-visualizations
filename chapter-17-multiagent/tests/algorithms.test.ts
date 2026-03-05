import { describe, it, expect } from 'vitest';
import {
  generateInterleavings,
  checkConcurrentConstraints,
  findPureNashEquilibria,
  findDominantStrategies,
  computeMaximinStrategy2x2,
  computeSocialWelfare,
  isOutcomeParetoOptimal,
  simulateRepeatedGame,
  limitOfMeans,
  findNashEquilibria2x2,
  computeShapleyValue,
  checkCore,
  isSuperadditive,
  mcNetsValue,
  mcNetsShapley,
  findOptimalCoalitionStructure,
  coalitionStructureWelfare,
  allCoalitionStructures,
  runEnglishAuction,
  runVickreyAuction,
  runVCGMechanism,
  bordaCount,
  pluralityVoting,
  instantRunoffVoting,
  findCondorcetWinner,
  condorcetParadox,
  rubinsteinBargaining,
  zeuthenRisk,
  simulateZeuthenNegotiation,
} from '../src/algorithms/index';

// ─── §17.1  MULTIAGENT PLANNING ──────────────────────────────────────────────

describe('generateInterleavings', () => {
  it('two empty plans → single empty interleaving', () => {
    expect(generateInterleavings([], [])).toEqual([[]]);
  });

  it('empty planA → planB as single interleaving', () => {
    expect(generateInterleavings([], ['b1', 'b2'])).toEqual([['b1', 'b2']]);
  });

  it('empty planB → planA as single interleaving', () => {
    expect(generateInterleavings(['a1', 'a2'], [])).toEqual([['a1', 'a2']]);
  });

  it('1-action plans → 2 interleavings', () => {
    const result = generateInterleavings(['a'], ['b']);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(['a', 'b']);
    expect(result).toContainEqual(['b', 'a']);
  });

  it('C(m+n, n) total interleavings: m=2, n=2 → 6', () => {
    const result = generateInterleavings(['a1', 'a2'], ['b1', 'b2']);
    expect(result).toHaveLength(6);
  });

  it('preserves original action order within each plan', () => {
    const result = generateInterleavings(['a1', 'a2'], ['b1', 'b2']);
    for (const seq of result) {
      const aIdx = [seq.indexOf('a1'), seq.indexOf('a2')];
      const bIdx = [seq.indexOf('b1'), seq.indexOf('b2')];
      expect(aIdx[0]!).toBeLessThan(aIdx[1]!);
      expect(bIdx[0]!).toBeLessThan(bIdx[1]!);
    }
  });
});

describe('checkConcurrentConstraints', () => {
  const constraints = new Map([
    ['move', { mustConcurrent: ['sense'], mustNotConcurrent: ['communicate'] }],
    ['sense', {}],
  ]);

  it('valid profile with all mustConcurrent present', () => {
    const r = checkConcurrentConstraints(['move', 'sense'], constraints);
    expect(r.valid).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('violation when mustConcurrent action is absent', () => {
    const r = checkConcurrentConstraints(['move'], constraints);
    expect(r.valid).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('violation when mustNotConcurrent action is present', () => {
    const r = checkConcurrentConstraints(['move', 'sense', 'communicate'], constraints);
    expect(r.valid).toBe(false);
    expect(r.violations.some((v) => v.includes('communicate'))).toBe(true);
  });

  it('action with no constraint → no violation', () => {
    const r = checkConcurrentConstraints(['other'], constraints);
    expect(r.valid).toBe(true);
  });

  it('empty profile → valid', () => {
    const r = checkConcurrentConstraints([], constraints);
    expect(r.valid).toBe(true);
  });
});

// ─── §17.2  NON-COOPERATIVE GAME THEORY ─────────────────────────────────────

describe('findPureNashEquilibria', () => {
  it('prisoner dilemma has one pure NE at (T,T) = (0,0)', () => {
    // TT=(-5,-5), TR=(0,-10), RT=(-10,0), RR=(-1,-1)
    const pd: [number, number][][] = [
      [[-5, -5], [0, -10]],
      [[-10, 0], [-1, -1]],
    ];
    const ne = findPureNashEquilibria(pd);
    expect(ne).toHaveLength(1);
    expect(ne[0]).toEqual([0, 0]);
  });

  it('coordination game has two pure NEs', () => {
    // Both prefer matching: (0,0) and (1,1)
    const game: [number, number][][] = [
      [[2, 2], [0, 0]],
      [[0, 0], [2, 2]],
    ];
    const ne = findPureNashEquilibria(game);
    expect(ne).toHaveLength(2);
  });

  it('empty payoff matrix → no equilibria', () => {
    expect(findPureNashEquilibria([])).toHaveLength(0);
  });

  it('Battle of the Sexes has two pure NEs', () => {
    const game: [number, number][][] = [
      [[2, 1], [0, 0]],
      [[0, 0], [1, 2]],
    ];
    expect(findPureNashEquilibria(game)).toHaveLength(2);
  });
});

describe('findDominantStrategies', () => {
  it('prisoner dilemma: both players strongly dominant at action 0 (T)', () => {
    const pd: [number, number][][] = [
      [[-5, -5], [0, -10]],
      [[-10, 0], [-1, -1]],
    ];
    const r = findDominantStrategies(pd);
    expect(r.rowDominant).toBe(0);
    expect(r.colDominant).toBe(0);
  });

  it('coordination game: no strongly dominant strategy', () => {
    const game: [number, number][][] = [
      [[2, 2], [0, 0]],
      [[0, 0], [2, 2]],
    ];
    const r = findDominantStrategies(game);
    expect(r.rowDominant).toBeNull();
    expect(r.colDominant).toBeNull();
  });

  it('empty payoff → all null', () => {
    const r = findDominantStrategies([]);
    expect(r.rowDominant).toBeNull();
    expect(r.colDominant).toBeNull();
    expect(r.rowWeaklyDominant).toBeNull();
    expect(r.colWeaklyDominant).toBeNull();
  });

  it('weakly dominant strategy detected', () => {
    // Row 0 weakly dominates row 1: [3,2] vs [3,1] — equal in col0, strict in col1
    const game: [number, number][][] = [
      [[3, 0], [2, 0]],
      [[3, 0], [1, 0]],
    ];
    const r = findDominantStrategies(game);
    expect(r.rowWeaklyDominant).toBe(0);
  });
});

describe('computeMaximinStrategy2x2', () => {
  it('matching pennies: uniform mix, game value 0', () => {
    // Row: +1 if match, -1 otherwise (zero-sum)
    const r = computeMaximinStrategy2x2([[1, -1], [-1, 1]]);
    expect(r.rowStrategy[0]).toBeCloseTo(0.5);
    expect(r.colStrategy[0]).toBeCloseTo(0.5);
    expect(r.gameValue).toBeCloseTo(0);
  });

  it('degenerate matrix (constant): returns a pure strategy', () => {
    const r = computeMaximinStrategy2x2([[2, 2], [2, 2]]);
    expect(typeof r.gameValue).toBe('number');
    expect(r.rowStrategy[0] + r.rowStrategy[1]).toBeCloseTo(1);
    expect(r.colStrategy[0] + r.colStrategy[1]).toBeCloseTo(1);
  });

  it('degenerate: bestRow=1, bestCol=0 (row 1 is safer; both cols equally risky)', () => {
    // denom = 0-0-2+2 = 0, minRow0=0<2=minRow1 → bestRow=1; maxCol0=maxCol1 → bestCol=0
    const r = computeMaximinStrategy2x2([[0, 0], [2, 2]]);
    expect(r.rowStrategy).toEqual([0, 1]);
    expect(r.colStrategy).toEqual([1, 0]);
    expect(r.gameValue).toBe(2); // a10
  });

  it('degenerate: bestRow=0, bestCol=1 (row 0 safer; col 1 has lower max)', () => {
    // denom = 3-1-3+1 = 0, minRow0=1=minRow1 → bestRow=0; maxCol0=3>1=maxCol1 → bestCol=1
    const r = computeMaximinStrategy2x2([[3, 1], [3, 1]]);
    expect(r.rowStrategy).toEqual([1, 0]);
    expect(r.colStrategy).toEqual([0, 1]);
    expect(r.gameValue).toBe(1); // a01
  });

  it('degenerate: bestRow=1, bestCol=1 (row 1 safer; col 1 has lower max)', () => {
    // denom = 3-1-5+3 = 0, minRow0=1<3=minRow1 → bestRow=1; maxCol0=5>3=maxCol1 → bestCol=1
    const r = computeMaximinStrategy2x2([[3, 1], [5, 3]]);
    expect(r.rowStrategy).toEqual([0, 1]);
    expect(r.colStrategy).toEqual([0, 1]);
    expect(r.gameValue).toBe(3); // a11
  });
});

describe('computeSocialWelfare', () => {
  const pd: [number, number][][] = [
    [[-5, -5], [0, -10]],
    [[-10, 0], [-1, -1]],
  ];

  it('RR outcome: utilitarian=-2, egalitarian=-1', () => {
    const r = computeSocialWelfare(pd, 1, 1);
    expect(r.utilitarian).toBe(-2);
    expect(r.egalitarian).toBe(-1);
  });

  it('RR is Pareto optimal in PD', () => {
    // Both players get -1 at RR; no single deviation improves both simultaneously
    const r = computeSocialWelfare(pd, 1, 1);
    // TR = (0,-10): row better but col worse; RT = (-10,0): col better but row worse
    // TT = (-5,-5): both worse
    expect(r.paretoOptimal).toBe(true);
  });

  it('TT is NOT Pareto optimal (RR dominates it)', () => {
    const r = computeSocialWelfare(pd, 0, 0);
    expect(r.paretoOptimal).toBe(false);
  });
});

describe('isOutcomeParetoOptimal', () => {
  it('strictly dominated outcome is not Pareto optimal', () => {
    const game: [number, number][][] = [
      [[1, 1], [3, 0]],
      [[0, 3], [2, 2]],
    ];
    // (0,0) = [1,1] is dominated by (1,1) = [2,2]
    expect(isOutcomeParetoOptimal(game, 0, 0)).toBe(false);
  });

  it('Pareto efficient outcome returns true', () => {
    const game: [number, number][][] = [
      [[3, 0], [0, 0]],
      [[0, 0], [0, 3]],
    ];
    expect(isOutcomeParetoOptimal(game, 0, 0)).toBe(true);
  });

  it('identical payoffs at another cell does NOT block Pareto optimality', () => {
    // (0,0)=[2,2] and (1,1)=[2,2]: neither strictly dominates the other
    const game: [number, number][][] = [
      [[2, 2], [0, 0]],
      [[0, 0], [2, 2]],
    ];
    // (0,0) is Pareto optimal because (1,1) has equal — not strictly better — payoffs
    expect(isOutcomeParetoOptimal(game, 0, 0)).toBe(true);
  });
});

describe('simulateRepeatedGame', () => {
  // Prisoner's dilemma: TT=(-5,-5), TR=(0,-10), RT=(-10,0), RR=(-1,-1)
  const pdPayoffs: [number, number][][] = [
    [[-5, -5], [0, -10]],
    [[-10, 0], [-1, -1]],
  ];

  it('HAWK vs HAWK → always TT', () => {
    const rounds = simulateRepeatedGame('HAWK', 'HAWK', 3, pdPayoffs);
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      expect(r.agentAAction).toBe('T');
      expect(r.agentBAction).toBe('T');
      expect(r.payoffA).toBe(-5);
    }
  });

  it('DOVE vs DOVE → always RR', () => {
    const rounds = simulateRepeatedGame('DOVE', 'DOVE', 3, pdPayoffs);
    for (const r of rounds) {
      expect(r.agentAAction).toBe('R');
      expect(r.agentBAction).toBe('R');
    }
  });

  it('TIT_FOR_TAT vs DOVE → cooperate every round', () => {
    const rounds = simulateRepeatedGame('TIT_FOR_TAT', 'DOVE', 4, pdPayoffs);
    for (const r of rounds) {
      expect(r.agentAAction).toBe('R');
    }
  });

  it('TIT_FOR_TAT vs HAWK → defect from round 1 onwards', () => {
    const rounds = simulateRepeatedGame('TIT_FOR_TAT', 'HAWK', 4, pdPayoffs);
    expect(rounds[0]!.agentAAction).toBe('R'); // starts cooperating
    expect(rounds[1]!.agentAAction).toBe('T'); // copies HAWK's T
    expect(rounds[2]!.agentAAction).toBe('T');
  });

  it('TAT_FOR_TIT starts by defecting then copies opponent', () => {
    const rounds = simulateRepeatedGame('TAT_FOR_TIT', 'DOVE', 4, pdPayoffs);
    expect(rounds[0]!.agentAAction).toBe('T'); // starts defecting
    expect(rounds[1]!.agentAAction).toBe('R'); // copies DOVE's R
  });

  it('GRIM vs DOVE: cooperates while DOVE never defects', () => {
    const rounds = simulateRepeatedGame('GRIM', 'DOVE', 3, pdPayoffs);
    for (const r of rounds) {
      expect(r.agentAAction).toBe('R');
    }
  });

  it('GRIM triggers on first defection', () => {
    const rounds = simulateRepeatedGame('GRIM', 'HAWK', 4, pdPayoffs);
    // HAWK always plays T, so GRIM should defect from round 1
    expect(rounds[0]!.agentAAction).toBe('R'); // first round before observing
    expect(rounds[1]!.agentAAction).toBe('T'); // triggers
    expect(rounds[3]!.agentAAction).toBe('T'); // stays T
  });

  it('round indices are sequential', () => {
    const rounds = simulateRepeatedGame('DOVE', 'DOVE', 5, pdPayoffs);
    rounds.forEach((r, i) => expect(r.round).toBe(i));
  });

  it('zero rounds → empty array', () => {
    expect(simulateRepeatedGame('HAWK', 'DOVE', 0, pdPayoffs)).toHaveLength(0);
  });
});

describe('limitOfMeans', () => {
  it('empty array → 0', () => expect(limitOfMeans([])).toBe(0));
  it('single value → itself', () => expect(limitOfMeans([5])).toBe(5));
  it('average of [1,2,3] → 2', () => expect(limitOfMeans([1, 2, 3])).toBe(2));
  it('all negative values', () => expect(limitOfMeans([-2, -4])).toBe(-3));
});

describe('findNashEquilibria2x2', () => {
  it('prisoner dilemma has one pure NE', () => {
    const pd: [number, number][][] = [
      [[-5, -5], [0, -10]],
      [[-10, 0], [-1, -1]],
    ];
    const ne = findNashEquilibria2x2(pd);
    const pureNE = ne.filter((e) => e.type === 'pure');
    expect(pureNE).toHaveLength(1);
    expect(pureNE[0]!.rowMixed).toEqual([1, 0]);
    expect(pureNE[0]!.colMixed).toEqual([1, 0]);
  });

  it('matching pennies has one mixed NE', () => {
    const mp: [number, number][][] = [
      [[1, -1], [-1, 1]],
      [[-1, 1], [1, -1]],
    ];
    const ne = findNashEquilibria2x2(mp);
    const mixed = ne.filter((e) => e.type === 'mixed');
    expect(mixed).toHaveLength(1);
    expect(mixed[0]!.rowMixed[0]).toBeCloseTo(0.5);
    expect(mixed[0]!.colMixed[0]).toBeCloseTo(0.5);
  });

  it('coordination game has two pure NEs and one mixed NE', () => {
    const game: [number, number][][] = [
      [[2, 2], [0, 0]],
      [[0, 0], [2, 2]],
    ];
    const ne = findNashEquilibria2x2(game);
    const pureNE = ne.filter((e) => e.type === 'pure');
    const mixedNE = ne.filter((e) => e.type === 'mixed');
    expect(pureNE).toHaveLength(2);
    expect(mixedNE).toHaveLength(1);
    expect(mixedNE[0]!.rowMixed[0]).toBeCloseTo(0.5);
  });

  it('all-equal payoffs: denom is zero, only pure NEs returned', () => {
    // denomQ = 0 and denomP = 0 → skip mixed NE block
    const game: [number, number][][] = [
      [[2, 1], [2, 1]],
      [[2, 1], [2, 1]],
    ];
    const ne = findNashEquilibria2x2(game);
    expect(ne.every((e) => e.type === 'pure')).toBe(true);
  });
});

// ─── §17.3  COOPERATIVE GAME THEORY ─────────────────────────────────────────

describe('computeShapleyValue', () => {
  it('empty player set → empty map', () => {
    expect(computeShapleyValue([], () => 0).size).toBe(0);
  });

  it('single player gets entire value', () => {
    const sv = computeShapleyValue([0], (S) => (S.length > 0 ? 10 : 0));
    expect(sv.get(0)).toBeCloseTo(10);
  });

  it('symmetric game: equal Shapley values', () => {
    const v = (S: readonly number[]) => S.length;
    const sv = computeShapleyValue([0, 1, 2], v);
    expect(sv.get(0)).toBeCloseTo(sv.get(1)!);
    expect(sv.get(1)).toBeCloseTo(sv.get(2)!);
  });

  it('values sum to grand coalition value (efficiency)', () => {
    const v = (S: readonly number[]) => {
      const s = new Set(S);
      if (s.has(0) && s.has(1)) return 10;
      if (s.has(0)) return 4;
      if (s.has(1)) return 6;
      return 0;
    };
    const sv = computeShapleyValue([0, 1], v);
    const total = (sv.get(0) ?? 0) + (sv.get(1) ?? 0);
    expect(total).toBeCloseTo(10);
  });

  it('dummy player gets 0', () => {
    // Player 2 contributes nothing to any coalition
    const v = (S: readonly number[]) => {
      const s = new Set(S);
      return (s.has(0) ? 1 : 0) + (s.has(1) ? 1 : 0);
    };
    const sv = computeShapleyValue([0, 1, 2], v);
    expect(sv.get(2)).toBeCloseTo(0);
  });
});

describe('checkCore', () => {
  const players = [0, 1, 2];
  const v = (S: readonly number[]) => {
    const s = new Set(S);
    if (s.has(0) && s.has(1) && s.has(2)) return 9;
    if (s.has(0) && s.has(1)) return 6;
    if (s.has(0) && s.has(2)) return 4;
    if (s.has(1) && s.has(2)) return 5;
    if (s.has(0)) return 2;
    if (s.has(1)) return 3;
    if (s.has(2)) return 1;
    return 0;
  };

  it('equal split (3,3,3) is in the core', () => {
    const imp = new Map([[0, 3], [1, 3], [2, 3]]);
    const r = checkCore(players, v, imp);
    expect(r.inCore).toBe(true);
    expect(r.blockingCoalitions).toHaveLength(0);
  });

  it('unfair split is blocked', () => {
    // Give player 0 only 1, which is less than v({0})=2
    const imp = new Map([[0, 1], [1, 4], [2, 4]]);
    const r = checkCore(players, v, imp);
    expect(r.inCore).toBe(false);
    expect(r.blockingCoalitions.length).toBeGreaterThan(0);
  });

  it('imputation with missing player treated as 0', () => {
    // Only player 0 in the imputation map — players 1 and 2 default to 0
    const imp = new Map([[0, 9]]);
    const r = checkCore(players, v, imp);
    // Coalition {1,2} can get v({1,2})=5 but imp-sum=0+0=0 → blocks
    expect(r.inCore).toBe(false);
  });
});

describe('isSuperadditive', () => {
  it('additive game is superadditive', () => {
    const v = (S: readonly number[]) => S.length;
    expect(isSuperadditive([0, 1, 2], v)).toBe(true);
  });

  it('sub-additive game fails', () => {
    // v({0,1}) < v({0}) + v({1})
    const v = (S: readonly number[]) => {
      const s = new Set(S);
      if (s.has(0) && s.has(1)) return 1;
      if (s.has(0)) return 2;
      if (s.has(1)) return 2;
      return 0;
    };
    expect(isSuperadditive([0, 1], v)).toBe(false);
  });

  it('empty player set → superadditive (vacuously)', () => {
    expect(isSuperadditive([], () => 0)).toBe(true);
  });
});

describe('mcNetsValue', () => {
  const rules = [
    { coalition: [0, 1], value: 4 },
    { coalition: [1, 2], value: 3 },
    { coalition: [0], value: 1 },
  ];

  it('{0,1} contains rules {0,1} and {0} → value 5', () => {
    expect(mcNetsValue(rules, [0, 1])).toBe(5);
  });

  it('{0,1,2} contains all three rules → value 8', () => {
    expect(mcNetsValue(rules, [0, 1, 2])).toBe(8);
  });

  it('{2} contains no rules → value 0', () => {
    expect(mcNetsValue(rules, [2])).toBe(0);
  });

  it('empty coalition → 0', () => {
    expect(mcNetsValue(rules, [])).toBe(0);
  });
});

describe('mcNetsShapley', () => {
  it('two-player game: each player in pair gets half the joint rule value', () => {
    const rules = [{ coalition: [0, 1], value: 4 }];
    const sv = mcNetsShapley(rules, [0, 1]);
    expect(sv.get(0)).toBeCloseTo(2);
    expect(sv.get(1)).toBeCloseTo(2);
  });

  it('singleton rule: full value goes to that player', () => {
    const rules = [{ coalition: [0], value: 6 }];
    const sv = mcNetsShapley(rules, [0, 1]);
    expect(sv.get(0)).toBeCloseTo(6);
    expect(sv.get(1)).toBeCloseTo(0);
  });

  it('empty rule list → all zeros', () => {
    const sv = mcNetsShapley([], [0, 1]);
    expect(sv.get(0)).toBeCloseTo(0);
  });

  it('rule with player not in players list: that player is silently skipped', () => {
    // Player 99 is in the rule coalition but not in the players array → shapley.has(99) = false
    const rules = [{ coalition: [0, 99], value: 6 }];
    const sv = mcNetsShapley(rules, [0, 1]);
    expect(sv.get(0)).toBeCloseTo(3); // 6/2 for player 0
    expect(sv.get(1)).toBeCloseTo(0); // player 1 not in rule
    expect(sv.has(99)).toBe(false);   // 99 never added
  });

  it('rule with empty coalition is skipped', () => {
    // k=0 → the `if (k === 0) continue` TRUE branch
    const rules = [{ coalition: [] as number[], value: 10 }];
    const sv = mcNetsShapley(rules, [0, 1]);
    expect(sv.get(0)).toBeCloseTo(0);
  });
});

describe('findOptimalCoalitionStructure', () => {
  it('single player: singleton structure', () => {
    const r = findOptimalCoalitionStructure([0], (S) => S.length);
    expect(r.structure).toHaveLength(1);
    expect(r.welfare).toBe(1);
  });

  it('grand coalition optimal when superadditive', () => {
    // v({0,1}) = 10 > v({0}) + v({1}) = 3+4 = 7
    const v = (S: readonly number[]) => {
      const s = new Set(S);
      if (s.has(0) && s.has(1)) return 10;
      if (s.has(0)) return 3;
      if (s.has(1)) return 4;
      return 0;
    };
    const r = findOptimalCoalitionStructure([0, 1], v);
    expect(r.welfare).toBe(10);
    expect(r.structure).toHaveLength(1);
  });

  it('singletons optimal when sub-additive', () => {
    const v = (S: readonly number[]) => (S.length === 1 ? 5 : 3);
    const r = findOptimalCoalitionStructure([0, 1], v);
    expect(r.welfare).toBe(10); // two singletons
  });

  it('empty players → empty structure with welfare 0', () => {
    const r = findOptimalCoalitionStructure([], () => 0);
    expect(r.welfare).toBe(0);
  });
});

describe('coalitionStructureWelfare', () => {
  it('sum of coalition values', () => {
    const v = (S: readonly number[]) => S.length * 2;
    expect(coalitionStructureWelfare([[0, 1], [2]], v)).toBe(4 + 2);
  });

  it('empty structure → 0', () => {
    expect(coalitionStructureWelfare([], () => 99)).toBe(0);
  });
});

describe('allCoalitionStructures', () => {
  it('0 players → one empty structure', () => {
    expect(allCoalitionStructures([])).toHaveLength(1);
    expect(allCoalitionStructures([])[0]).toHaveLength(0);
  });

  it('1 player → one singleton structure', () => {
    const cs = allCoalitionStructures([0]);
    expect(cs).toHaveLength(1);
    expect(cs[0]).toEqual([[0]]);
  });

  it('2 players → 2 structures: singleton pair + grand coalition', () => {
    expect(allCoalitionStructures([0, 1])).toHaveLength(2);
  });

  it('3 players → Bell(3) = 5 structures', () => {
    expect(allCoalitionStructures([0, 1, 2])).toHaveLength(5);
  });

  it('each structure covers all players exactly once', () => {
    for (const structure of allCoalitionStructures([0, 1, 2])) {
      const all = structure.flatMap((c) => c);
      expect(all.sort()).toEqual([0, 1, 2]);
    }
  });
});

// ─── §17.4  MECHANISM DESIGN ─────────────────────────────────────────────────

describe('runEnglishAuction', () => {
  it('no bidders → failed auction step', () => {
    const steps = runEnglishAuction([], 0, 1);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.highestBidder).toBeNull();
  });

  it('no bidder meets reserve → failed auction step', () => {
    const steps = runEnglishAuction([1, 2], 10, 1);
    expect(steps[0]!.highestBidder).toBeNull();
  });

  it('single bidder above reserve wins immediately', () => {
    const steps = runEnglishAuction([5], 1, 1);
    const last = steps[steps.length - 1]!;
    expect(last.highestBidder).toBe(0);
  });

  it('two bidders: higher-value bidder wins', () => {
    const steps = runEnglishAuction([10, 6], 1, 1);
    const last = steps[steps.length - 1]!;
    expect(last.highestBidder).toBe(0);
  });

  it('all bidders drop simultaneously → no winner', () => {
    // Two bidders with equal value 3; reserve=1, increment=3 → price jumps from 1 to 4,
    // both drop out at price 4 (valuation 3 < 4)
    const steps = runEnglishAuction([3, 3], 1, 3);
    const last = steps[steps.length - 1]!;
    expect(last.highestBidder).toBeNull();
    expect(last.action).toContain('no winner');
  });

  it('drop-step reduce keeps current best when newcomer is weaker', () => {
    // valuations=[10,7,5]: at price 6, bidder 2 drops; newActive=[0,1] (10>7)
    // reduce: val[1]=7 > val[0]=10 → false → keeps best=0 (false branch of line-932 ternary)
    const steps = runEnglishAuction([10, 7, 5], 1, 1);
    const dropStep = steps.find((s) => s.action.includes('Bidder 2'));
    expect(dropStep).toBeDefined();
    expect(dropStep!.highestBidder).toBe(0);
  });

  it('reduce covers both TRUE and FALSE branches when 3+ bidders remain after drop', () => {
    // [5,10,7,3]: at price 4, bidder 3 drops; newActive=[0,1,2] (vals 5,10,7)
    // reduce: 10>5 → TRUE (picks 1); 7>10 → FALSE (keeps 1)
    // outer reduce at start: 10>5 → TRUE; 7>10 → FALSE; 3>10 → FALSE
    const steps = runEnglishAuction([5, 10, 7, 3], 1, 1);
    const dropStep = steps.find((s) => s.action.includes('Bidder 3'));
    expect(dropStep).toBeDefined();
    expect(dropStep!.highestBidder).toBe(1); // bidder 1 has highest value 10
  });
});

describe('runVickreyAuction', () => {
  it('empty bidders → no winner', () => {
    const r = runVickreyAuction([]);
    expect(r.winner).toBe(-1);
  });

  it('single bidder pays 0', () => {
    const r = runVickreyAuction([10]);
    expect(r.winner).toBe(0);
    expect(r.winnerPays).toBe(0);
    expect(r.utilities[0]).toBe(10);
  });

  it('winner is highest bidder', () => {
    const r = runVickreyAuction([3, 8, 5]);
    expect(r.winner).toBe(1);
  });

  it('winner pays second-price', () => {
    const r = runVickreyAuction([10, 7, 4]);
    expect(r.winnerPays).toBe(7);
    expect(r.utilities[0]).toBe(10 - 7);
  });

  it('losers have zero utility', () => {
    const r = runVickreyAuction([10, 7, 4]);
    expect(r.utilities[1]).toBe(0);
    expect(r.utilities[2]).toBe(0);
  });
});

describe('runVCGMechanism', () => {
  it('empty bidders → empty result', () => {
    const r = runVCGMechanism([], 2);
    expect(r.winners).toHaveLength(0);
    expect(r.globalUtility).toBe(0);
  });

  it('allocate 1 good: reduces to Vickrey', () => {
    const r = runVCGMechanism([10, 7, 4], 1);
    expect(r.winners).toContain(0);
    expect(r.taxes[0]).toBe(7); // best loser = second-highest bid
  });

  it('allocate 2 goods: top 2 win, each pays 3rd-highest', () => {
    const r = runVCGMechanism([10, 7, 4], 2);
    expect(r.winners.length).toBe(2);
    expect(r.taxes[0]).toBe(4);
    expect(r.taxes[1]).toBe(4);
    expect(r.taxes[2]).toBe(0); // loser pays 0
  });

  it('more goods than bidders: all win, no tax', () => {
    const r = runVCGMechanism([5, 3], 10);
    expect(r.winners.length).toBe(2);
    expect(r.taxes.every((t) => t === 0)).toBe(true);
  });

  it('globalUtility is sum of winner valuations', () => {
    const r = runVCGMechanism([10, 7, 4], 2);
    expect(r.globalUtility).toBe(10 + 7);
  });
});

describe('bordaCount', () => {
  it('3 voters, 3 candidates: correct winner', () => {
    // Voters: [A,B,C], [A,C,B], [B,A,C] → A gets 2+2+1=5, B gets 1+0+2=3, C gets 0+1+0=1
    const r = bordaCount([[0, 1, 2], [0, 2, 1], [1, 0, 2]], 3);
    expect(r.winner).toBe(0); // Candidate A
  });

  it('scores map has correct size', () => {
    const r = bordaCount([[0, 1], [1, 0]], 2);
    expect(r.scores.size).toBe(2);
  });

  it('ranking is sorted by score descending', () => {
    const r = bordaCount([[0, 1, 2], [0, 1, 2]], 3);
    for (let i = 0; i + 1 < r.ranking.length; i++) {
      expect(r.scores.get(r.ranking[i]!)!).toBeGreaterThanOrEqual(
        r.scores.get(r.ranking[i + 1]!)!,
      );
    }
  });

  it('no voters → all scores 0, winner is candidate 0', () => {
    const r = bordaCount([], 3);
    expect(r.scores.get(0)).toBe(0);
    expect(r.winner).toBe(0);
  });

  it('voter ranks a candidate outside the initialized range (graceful fallback)', () => {
    // candidate 3 is not pre-seeded when numCandidates=3 (only 0,1,2 are seeded)
    // scores.get(3) returns undefined → ?? 0 fallback fires
    const r = bordaCount([[3, 0, 1, 2]], 3);
    // candidate 3 gets numCandidates-1-0 = 2 points (out-of-range but handled gracefully)
    expect(r.scores.get(3)).toBe(2);
  });
});

describe('pluralityVoting', () => {
  it('majority winner', () => {
    // 3 vote for A, 1 for B
    const r = pluralityVoting([[0], [0], [0], [1]], 2);
    expect(r.winner).toBe(0);
    expect(r.counts.get(0)).toBe(3);
    expect(r.counts.get(1)).toBe(1);
  });

  it('no voters → winner is 0 with 0 votes', () => {
    const r = pluralityVoting([], 2);
    expect(r.counts.get(0)).toBe(0);
  });

  it('voter top choice outside initialized range (graceful fallback)', () => {
    // candidate 5 not pre-seeded when numCandidates=2 → counts.get(5) = undefined → ?? 0
    const r = pluralityVoting([[5], [0]], 2);
    expect(r.counts.get(5)).toBe(1);
    expect(r.counts.get(0)).toBe(1);
  });

  it('voters with empty preferences are skipped', () => {
    const r = pluralityVoting([[], [0]], 2);
    expect(r.counts.get(0)).toBe(1);
  });
});

describe('instantRunoffVoting', () => {
  it('0 candidates → winner -1', () => {
    const r = instantRunoffVoting([[]], 0);
    expect(r.winner).toBe(-1);
  });

  it('1 candidate → wins immediately', () => {
    const r = instantRunoffVoting([[0], [0]], 1);
    expect(r.winner).toBe(0);
    expect(r.rounds).toHaveLength(1);
  });

  it('majority in first round → no elimination', () => {
    // Candidate 0 has 3/4 votes
    const r = instantRunoffVoting([[0, 1], [0, 1], [0, 1], [1, 0]], 2);
    expect(r.winner).toBe(0);
    expect(r.rounds).toHaveLength(1);
    expect(r.rounds[0]!.eliminated).toBeNull();
  });

  it('Condorcet paradox scenario: eliminates weakest each round', () => {
    // [A>B>C, B>C>A, C>A>B] — no majority, C has fewest first-choice votes
    const prefs = [[0, 1, 2], [1, 2, 0], [0, 2, 1], [2, 0, 1]];
    const r = instantRunoffVoting(prefs, 3);
    expect(r.winner).toBeGreaterThanOrEqual(0);
    expect(r.winner).toBeLessThan(3);
  });

  it('eliminated candidates get count -1 in subsequent rounds', () => {
    const prefs = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
    const r = instantRunoffVoting(prefs, 3);
    const lastRound = r.rounds[r.rounds.length - 1]!;
    // Winner should have non-negative count
    expect(lastRound.counts[r.winner]!).toBeGreaterThanOrEqual(0);
  });
});

describe('findCondorcetWinner', () => {
  it('returns -1 in Condorcet paradox (cycle)', () => {
    const prefs = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
    expect(findCondorcetWinner(prefs, 3)).toBe(-1);
  });

  it('finds clear Condorcet winner', () => {
    // A beats B and C pairwise: A>B>C, A>B>C, A>C>B
    const prefs = [[0, 1, 2], [0, 1, 2], [0, 2, 1]];
    expect(findCondorcetWinner(prefs, 3)).toBe(0);
  });

  it('two-candidate majority vote has Condorcet winner', () => {
    const prefs = [[0, 1], [0, 1], [1, 0]];
    expect(findCondorcetWinner(prefs, 2)).toBe(0);
  });

  it('no voters → -1', () => {
    expect(findCondorcetWinner([], 3)).toBe(-1);
  });
});

describe('condorcetParadox', () => {
  it('returns 3 voters and a length-3 cycle', () => {
    const p = condorcetParadox();
    expect(p.preferences).toHaveLength(3);
    expect(p.cycle).toHaveLength(3);
  });

  it('preferences exhibit the paradox: no Condorcet winner', () => {
    const { preferences } = condorcetParadox();
    expect(findCondorcetWinner(preferences, 3)).toBe(-1);
  });

  it('cycle entries are distinct candidates 0,1,2', () => {
    const { cycle } = condorcetParadox();
    expect(new Set(cycle).size).toBe(3);
  });
});

describe('rubinsteinBargaining', () => {
  it('equal discount factors: symmetric split', () => {
    const r = rubinsteinBargaining(0.9, 0.9);
    // With equal δ: share1 = 1/(1+δ) ≈ 0.526
    expect(r.agent1Gets).toBeCloseTo(1 / (1 + 0.9), 3);
    expect(r.agent2Gets).toBeCloseTo(0.9 / (1 + 0.9), 3);
    expect(r.agent1Gets + r.agent2Gets).toBeCloseTo(1, 5);
  });

  it('agreement in round 1', () => {
    expect(rubinsteinBargaining(0.8, 0.8).acceptsAtRound).toBe(1);
  });

  it('δ_B → 0: agent 1 gets nearly everything', () => {
    const r = rubinsteinBargaining(0.5, 0.01);
    expect(r.agent1Gets).toBeGreaterThan(0.95);
  });

  it('δ_A → 0: agent 1 gets everything (immediate first-mover advantage)', () => {
    const r = rubinsteinBargaining(0.01, 0.8);
    // (1-0.8)/(1-0.01*0.8) = 0.2/0.992 ≈ 0.20
    expect(r.agent1Gets).toBeGreaterThan(0);
  });

  it('degenerate (both δ → 1): falls back to 50/50', () => {
    const r = rubinsteinBargaining(1, 1);
    expect(r.agent1Gets).toBeCloseTo(0.5);
    expect(r.agent2Gets).toBeCloseTo(0.5);
  });
});

describe('zeuthenRisk', () => {
  it('accepting other proposal exactly → risk 0', () => {
    expect(zeuthenRisk(10, 0, 10)).toBeCloseTo(0);
  });

  it('other proposal equals conflict utility → risk 1', () => {
    expect(zeuthenRisk(10, 5, 5)).toBeCloseTo(1);
  });

  it('standard calculation: (10-7)/(10-0) = 0.3', () => {
    expect(zeuthenRisk(10, 0, 7)).toBeCloseTo(0.3);
  });

  it('denominator ≤ 0 → risk 0', () => {
    // myUtility ≤ conflictUtility
    expect(zeuthenRisk(3, 5, 1)).toBe(0);
    expect(zeuthenRisk(5, 5, 2)).toBe(0);
  });

  it('result is clamped to [0, 1]', () => {
    // otherProposalUtility < conflictUtility: clamp at 0
    expect(zeuthenRisk(10, 8, 6)).toBeGreaterThanOrEqual(0);
    expect(zeuthenRisk(10, 8, 6)).toBeLessThanOrEqual(1);
  });
});

describe('simulateZeuthenNegotiation', () => {
  it('immediately compatible demands → agreement in round 0', () => {
    // prop1 + prop2 = 0.4 + 0.4 = 0.8 ≤ 1
    const rounds = simulateZeuthenNegotiation(0.4, 0.4, 0, 0);
    expect(rounds[0]!.status).toBe('agreement');
  });

  it('incompatible demands eventually reach agreement or conflict', () => {
    const rounds = simulateZeuthenNegotiation(0.9, 0.9, 0.1, 0.1);
    const last = rounds[rounds.length - 1]!;
    expect(['agreement', 'conflict']).toContain(last.status);
  });

  it('negotiating rounds have correct round index', () => {
    const rounds = simulateZeuthenNegotiation(0.8, 0.8, 0.1, 0.1);
    rounds.forEach((r, i) => expect(r.round).toBe(i));
  });

  it('conflict when both agents have very high conflict utilities', () => {
    // Both agents will not concede since they have nothing to gain
    // conflictUtility near proposal value → very low risk for both
    const rounds = simulateZeuthenNegotiation(0.6, 0.6, 0.59, 0.59);
    const last = rounds[rounds.length - 1]!;
    expect(['agreement', 'conflict']).toContain(last.status);
  });

  it('conceding agent is 1 or 2 during negotiating rounds', () => {
    const rounds = simulateZeuthenNegotiation(0.9, 0.8, 0.0, 0.0);
    for (const r of rounds) {
      if (r.status === 'negotiating') {
        expect([1, 2]).toContain(r.conceding);
      } else {
        expect(r.conceding).toBeNull();
      }
    }
  });

  it('both risks zero with incompatible proposals → immediate conflict', () => {
    // Both agents have conflict utility above their own proposal → denom ≤ 0 → risk = 0
    // but proposals are incompatible (0.6+0.6=1.2 > 1)
    const rounds = simulateZeuthenNegotiation(0.6, 0.6, 0.7, 0.7);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.status).toBe('conflict');
    expect(rounds[0]!.conceding).toBeNull();
  });

  it('agent 2 denomNew ≈ 0: agent 2 concedes to conflict utility', () => {
    // risk1 ≈ 1 (agent 2's proposal gives agent 1 zero utility = conflict utility)
    // So agent 2 concedes and 1−risk1 ≈ 0 → prop2 = conflictUtility2
    const rounds = simulateZeuthenNegotiation(0.9, 1.0, 0.0, 0.0);
    const lastRound = rounds[rounds.length - 1]!;
    expect(lastRound.status).toBe('agreement');
    // Agent 2 should have conceded in round 0
    expect(rounds[0]!.conceding).toBe(2);
  });

  it('agent 1 denomNew ≈ 0: agent 1 concedes to conflict utility', () => {
    // Symmetric: risk2 ≈ 1 so agent 1 concedes with denom 1-risk2 ≈ 0
    const rounds = simulateZeuthenNegotiation(1.0, 0.9, 0.0, 0.0);
    expect(rounds[0]!.conceding).toBe(1);
    const lastRound = rounds[rounds.length - 1]!;
    expect(lastRound.status).toBe('agreement');
  });
});

