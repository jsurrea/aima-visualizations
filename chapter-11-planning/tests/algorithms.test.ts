import { describe, it, expect } from 'vitest';
import {
  isApplicable,
  applyAction,
  satisfiesGoal,
  forwardSearch,
  backwardSearch,
  ignorePreconditionsHeuristic,
  ignoreDeleteListsHeuristic,
  isRelevant,
  regressGoal,
  htnSearch,
  updateBeliefState,
  sensorlessExecution,
  criticalPathMethod,
  type PlanningAction,
  type PlanningProblem,
  type HLADefinition,
  type ScheduleAction,
  type BeliefState,
} from '../src/algorithms/index.js';

// ─── Shared test fixtures ─────────────────────────────────────────────────────

/** Spare Tire problem (§11.1.2) */
const removeFlatAxle: PlanningAction = {
  name: 'Remove(Flat,Axle)',
  preconditions: ['At(Flat,Axle)'],
  negPreconditions: [],
  addList: ['At(Flat,Ground)'],
  deleteList: ['At(Flat,Axle)'],
};
const removeSpareTrunk: PlanningAction = {
  name: 'Remove(Spare,Trunk)',
  preconditions: ['At(Spare,Trunk)'],
  negPreconditions: [],
  addList: ['At(Spare,Ground)'],
  deleteList: ['At(Spare,Trunk)'],
};
const putOnAxle: PlanningAction = {
  name: 'PutOn(Spare,Axle)',
  preconditions: ['At(Spare,Ground)'],
  negPreconditions: ['At(Flat,Axle)', 'At(Spare,Axle)'],
  addList: ['At(Spare,Axle)'],
  deleteList: ['At(Spare,Ground)'],
};
const leaveOvernight: PlanningAction = {
  name: 'LeaveOvernight',
  preconditions: [],
  negPreconditions: [],
  addList: [],
  deleteList: [
    'At(Spare,Ground)',
    'At(Spare,Axle)',
    'At(Spare,Trunk)',
    'At(Flat,Ground)',
    'At(Flat,Axle)',
    'At(Flat,Trunk)',
  ],
};

const spareTireInitial = [
  'At(Flat,Axle)',
  'At(Spare,Trunk)',
  'Tire(Flat)',
  'Tire(Spare)',
];
const spareTireProblem: PlanningProblem = {
  initialState: spareTireInitial,
  goalFluents: ['At(Spare,Axle)'],
  goalNegFluents: [],
  actions: [removeFlatAxle, removeSpareTrunk, putOnAxle, leaveOvernight],
};

/** Minimal one-action problem: just add a fact */
const addAAction: PlanningAction = {
  name: 'AddA',
  preconditions: [],
  negPreconditions: [],
  addList: ['A'],
  deleteList: [],
};
const trivialProblem: PlanningProblem = {
  initialState: [],
  goalFluents: ['A'],
  goalNegFluents: [],
  actions: [addAAction],
};

// ─── isApplicable ─────────────────────────────────────────────────────────────

describe('isApplicable', () => {
  it('returns true when all preconditions are satisfied', () => {
    const state = new Set(['At(Flat,Axle)']);
    expect(isApplicable(state, removeFlatAxle)).toBe(true);
  });

  it('returns false when a positive precondition is missing', () => {
    const state = new Set<string>();
    expect(isApplicable(state, removeFlatAxle)).toBe(false);
  });

  it('returns false when a negative precondition is violated', () => {
    const state = new Set([
      'At(Spare,Ground)',
      'At(Flat,Axle)',    // negPrecondition violated
    ]);
    expect(isApplicable(state, putOnAxle)).toBe(false);
  });

  it('returns true when negative preconditions are absent', () => {
    const state = new Set(['At(Spare,Ground)']);
    expect(isApplicable(state, putOnAxle)).toBe(true);
  });

  it('returns true for action with no preconditions', () => {
    const state = new Set<string>();
    expect(isApplicable(state, leaveOvernight)).toBe(true);
  });
});

// ─── applyAction ──────────────────────────────────────────────────────────────

describe('applyAction', () => {
  it('implements RESULT(s,a) = (s − DEL) ∪ ADD', () => {
    const state = new Set(['At(Flat,Axle)', 'Tire(Flat)']);
    const next = applyAction(state, removeFlatAxle);
    expect(next.has('At(Flat,Axle)')).toBe(false);  // deleted
    expect(next.has('At(Flat,Ground)')).toBe(true);  // added
    expect(next.has('Tire(Flat)')).toBe(true);        // unchanged
  });

  it('does not mutate the original state', () => {
    const state = new Set(['At(Flat,Axle)']);
    applyAction(state, removeFlatAxle);
    expect(state.has('At(Flat,Axle)')).toBe(true);
  });

  it('applies add list when delete list is empty', () => {
    const state = new Set<string>();
    const next = applyAction(state, addAAction);
    expect(next.has('A')).toBe(true);
  });

  it('applies delete list correctly with no add', () => {
    const state = new Set(['At(Spare,Ground)', 'At(Flat,Axle)']);
    const next = applyAction(state, leaveOvernight);
    expect(next.has('At(Spare,Ground)')).toBe(false);
    expect(next.has('At(Flat,Axle)')).toBe(false);
  });
});

// ─── satisfiesGoal ────────────────────────────────────────────────────────────

describe('satisfiesGoal', () => {
  it('returns true when all positive goal fluents are present', () => {
    const state = new Set(['At(Spare,Axle)', 'Tire(Spare)']);
    expect(satisfiesGoal(state, ['At(Spare,Axle)'], [])).toBe(true);
  });

  it('returns false when a goal fluent is missing', () => {
    const state = new Set(['Tire(Spare)']);
    expect(satisfiesGoal(state, ['At(Spare,Axle)'], [])).toBe(false);
  });

  it('returns false when a negative goal fluent is present', () => {
    const state = new Set(['A', 'B']);
    expect(satisfiesGoal(state, ['A'], ['B'])).toBe(false);
  });

  it('returns true when negative goals are absent', () => {
    const state = new Set(['A']);
    expect(satisfiesGoal(state, ['A'], ['B'])).toBe(true);
  });

  it('returns true for empty goal', () => {
    const state = new Set<string>();
    expect(satisfiesGoal(state, [], [])).toBe(true);
  });
});

// ─── ignorePreconditionsHeuristic ─────────────────────────────────────────────

describe('ignorePreconditionsHeuristic', () => {
  it('returns 0 when all goal fluents are satisfied', () => {
    const state = new Set(['At(Spare,Axle)']);
    expect(ignorePreconditionsHeuristic(state, ['At(Spare,Axle)'])).toBe(0);
  });

  it('counts unsatisfied goal fluents', () => {
    const state = new Set(['At(Spare,Ground)']);
    expect(
      ignorePreconditionsHeuristic(state, ['At(Spare,Axle)', 'A']),
    ).toBe(2);
  });

  it('returns 0 for empty goal', () => {
    const state = new Set<string>();
    expect(ignorePreconditionsHeuristic(state, [])).toBe(0);
  });

  it('partial satisfaction reduces count', () => {
    const state = new Set(['A']);
    expect(ignorePreconditionsHeuristic(state, ['A', 'B', 'C'])).toBe(2);
  });
});

// ─── ignoreDeleteListsHeuristic ───────────────────────────────────────────────

describe('ignoreDeleteListsHeuristic', () => {
  it('returns 0 when goal is already satisfied', () => {
    const state = new Set(['A', 'B']);
    expect(ignoreDeleteListsHeuristic(state, ['A', 'B'], [])).toBe(0);
  });

  it('returns 1 for one unsatisfied goal achievable in one action', () => {
    const state = new Set<string>();
    const actions: PlanningAction[] = [
      { name: 'AddA', preconditions: [], negPreconditions: [], addList: ['A'], deleteList: [] },
    ];
    expect(ignoreDeleteListsHeuristic(state, ['A'], actions)).toBe(1);
  });

  it('uses greedy set-cover approach', () => {
    const state = new Set<string>();
    const actions: PlanningAction[] = [
      { name: 'AddAB', preconditions: [], negPreconditions: [], addList: ['A', 'B'], deleteList: [] },
      { name: 'AddC', preconditions: [], negPreconditions: [], addList: ['C'], deleteList: [] },
    ];
    // AddAB achieves 2 goals, then AddC achieves 1 — 2 steps
    expect(ignoreDeleteListsHeuristic(state, ['A', 'B', 'C'], actions)).toBe(2);
  });

  it('returns high value when goal is unreachable (no actions)', () => {
    const state = new Set<string>();
    expect(ignoreDeleteListsHeuristic(state, ['A'], [])).toBe(2);
  });

  it('treats all actions as applicable (ignores preconditions)', () => {
    const state = new Set<string>();
    const actions: PlanningAction[] = [
      {
        name: 'AddA',
        preconditions: ['Missing'],  // would not be applicable normally
        negPreconditions: [],
        addList: ['A'],
        deleteList: [],
      },
    ];
    expect(ignoreDeleteListsHeuristic(state, ['A'], actions)).toBe(1);
  });
});

// ─── isRelevant ───────────────────────────────────────────────────────────────

describe('isRelevant', () => {
  it('returns true when action adds a positive goal fluent and has no conflicts', () => {
    expect(isRelevant(putOnAxle, ['At(Spare,Axle)'], [])).toBe(true);
  });

  it('returns false when action adds nothing in the goal', () => {
    expect(isRelevant(removeFlatAxle, ['At(Spare,Axle)'], [])).toBe(false);
  });

  it('returns false when action deletes a positive goal fluent', () => {
    // leaveOvernight deletes everything including at(Spare,Axle)
    expect(isRelevant(leaveOvernight, ['At(Spare,Axle)'], [])).toBe(false);
  });

  it('returns false when action adds a negative goal fluent', () => {
    const action: PlanningAction = {
      name: 'SetB',
      preconditions: [],
      negPreconditions: [],
      addList: ['A', 'B'],
      deleteList: [],
    };
    // B must not hold (negative goal), but action adds B
    expect(isRelevant(action, ['A'], ['B'])).toBe(false);
  });

  it('returns true when action achieves neg-goal by deleting a neg-goal fluent', () => {
    // Action deletes 'Bad' which is in goalNeg — this IS relevant
    const clearBad: PlanningAction = {
      name: 'ClearBad',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['Bad'],
    };
    expect(isRelevant(clearBad, [], ['Bad'])).toBe(true);
  });

  it('returns false when action achieves neg-goal but also deletes a positive goal fluent', () => {
    // Action deletes Bad (achieves neg goal ¬Bad) BUT also deletes PosGoal (conflict!)
    const conflictNegAction: PlanningAction = {
      name: 'ConflictNeg',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['PosGoal', 'Bad'],
    };
    expect(isRelevant(conflictNegAction, ['PosGoal'], ['Bad'])).toBe(false);
  });
});

// ─── regressGoal ──────────────────────────────────────────────────────────────

describe('regressGoal', () => {
  it('regresses PutOn(Spare,Axle) through goal At(Spare,Axle)', () => {
    const { pos, neg } = regressGoal(
      ['At(Spare,Axle)'],
      [],
      putOnAxle,
    );
    // Removes ADD effect, adds preconditions
    expect(pos).not.toContain('At(Spare,Axle)'); // removed (was achieved by action)
    expect(pos).toContain('At(Spare,Ground)');    // positive precondition
    expect(neg).toContain('At(Flat,Axle)');       // negative precondition
    expect(neg).toContain('At(Spare,Axle)');      // negative precondition
  });

  it('removes deleted fluents from neg-goal', () => {
    const action: PlanningAction = {
      name: 'Fix',
      preconditions: [],
      negPreconditions: [],
      addList: ['A'],
      deleteList: ['B'],
    };
    const { pos, neg } = regressGoal(['A'], ['B'], action);
    // A was added → no longer needed as goal
    expect(pos).not.toContain('A');
    // B was deleted → no longer a neg goal (it would be false after anyway)
    expect(neg).not.toContain('B');
  });
});

// ─── forwardSearch ────────────────────────────────────────────────────────────

describe('forwardSearch', () => {
  it('solves trivial one-action problem', () => {
    const result = forwardSearch(trivialProblem);
    expect(result.found).toBe(true);
    expect(result.plan).toContain('AddA');
  });

  it('solves the spare tire problem', () => {
    const result = forwardSearch(spareTireProblem);
    expect(result.found).toBe(true);
    // Solution: Remove(Flat,Axle), Remove(Spare,Trunk), PutOn(Spare,Axle)
    expect(result.plan).toEqual([
      'Remove(Flat,Axle)',
      'Remove(Spare,Trunk)',
      'PutOn(Spare,Axle)',
    ]);
  });

  it('initial state is already goal — returns empty plan', () => {
    const problem: PlanningProblem = {
      initialState: ['A'],
      goalFluents: ['A'],
      goalNegFluents: [],
      actions: [],
    };
    const result = forwardSearch(problem);
    expect(result.found).toBe(true);
    expect(result.plan).toHaveLength(0);
  });

  it('returns found=false when problem is unsolvable within maxSteps', () => {
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Unreachable'],
      goalNegFluents: [],
      actions: [],
    };
    const result = forwardSearch(problem, 5);
    expect(result.found).toBe(false);
  });

  it('records steps with correct heuristic and plan fields', () => {
    const result = forwardSearch(trivialProblem);
    expect(result.steps.length).toBeGreaterThan(0);
    const first = result.steps[0]!;
    expect(first.stepIndex).toBe(0);
    expect(first.appliedAction).toBeNull();
    expect(first.heuristic).toBe(1); // 1 goal unsatisfied
  });

  it('handles negative goal fluents', () => {
    const clearA: PlanningAction = {
      name: 'ClearA',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['A'],
    };
    const problem: PlanningProblem = {
      initialState: ['A'],
      goalFluents: [],
      goalNegFluents: ['A'],
      actions: [clearA],
    };
    const result = forwardSearch(problem);
    expect(result.found).toBe(true);
  });
});

// ─── backwardSearch ───────────────────────────────────────────────────────────

describe('backwardSearch', () => {
  it('solves trivial problem via regression', () => {
    const result = backwardSearch(trivialProblem);
    expect(result.found).toBe(true);
    expect(result.plan).toContain('AddA');
  });

  it('returns found=false when problem unsolvable', () => {
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Unreachable'],
      goalNegFluents: [],
      actions: [],
    };
    const result = backwardSearch(problem, 5);
    expect(result.found).toBe(false);
  });

  it('returns found=true when goal is already the initial state', () => {
    const problem: PlanningProblem = {
      initialState: ['A'],
      goalFluents: ['A'],
      goalNegFluents: [],
      actions: [],
    };
    const result = backwardSearch(problem);
    expect(result.found).toBe(true);
    expect(result.plan).toHaveLength(0);
  });

  it('records steps with correct structure', () => {
    const result = backwardSearch(trivialProblem);
    expect(result.steps.length).toBeGreaterThan(0);
    const first = result.steps[0]!;
    expect(first.stepIndex).toBe(0);
    expect(first.goalPos).toContain('A');
  });

  it('solves a two-action problem', () => {
    const a1: PlanningAction = {
      name: 'A1',
      preconditions: [],
      negPreconditions: [],
      addList: ['X'],
      deleteList: [],
    };
    const a2: PlanningAction = {
      name: 'A2',
      preconditions: ['X'],
      negPreconditions: [],
      addList: ['Y'],
      deleteList: [],
    };
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Y'],
      goalNegFluents: [],
      actions: [a1, a2],
    };
    const result = backwardSearch(problem);
    expect(result.found).toBe(true);
    expect(result.plan).toEqual(['A1', 'A2']);
  });

  it('returns found=false when initial state violates a negative goal fluent', () => {
    // Initial state has 'Bad', goal requires ¬Bad — backward search should find
    // a plan to delete Bad, but if no action deletes it, it should fail.
    const problem: PlanningProblem = {
      initialState: ['Bad'],
      goalFluents: [],
      goalNegFluents: ['Bad'],
      actions: [], // no actions available to remove Bad
    };
    const result = backwardSearch(problem, 5);
    // No way to remove Bad, so should not find a plan
    expect(result.found).toBe(false);
  });

  it('handles goal with negative fluent when regression can satisfy it', () => {
    // Goal: ¬A (A must be false)
    // Initial: A=true
    // Action: ClearA removes A
    const clearA: PlanningAction = {
      name: 'ClearA',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['A'],
    };
    const problem: PlanningProblem = {
      initialState: ['A'],
      goalFluents: [],
      goalNegFluents: ['A'],
      actions: [clearA],
    };
    const result = backwardSearch(problem);
    expect(result.found).toBe(true);
  });

  it('skips already-explored goal descriptions (duplicate detection)', () => {
    // Two actions that both regress to the same intermediate goal → one should be skipped
    const a1: PlanningAction = {
      name: 'Path1',
      preconditions: ['X'],
      negPreconditions: [],
      addList: ['Z'],
      deleteList: [],
    };
    const a2: PlanningAction = {
      name: 'Path2',
      preconditions: ['X'],
      negPreconditions: [],
      addList: ['Z'],
      deleteList: [],
    };
    const a3: PlanningAction = {
      name: 'MakeX',
      preconditions: [],
      negPreconditions: [],
      addList: ['X'],
      deleteList: [],
    };
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Z'],
      goalNegFluents: [],
      actions: [a1, a2, a3],
    };
    const result = backwardSearch(problem);
    expect(result.found).toBe(true);
    // Should find plan using one of the paths
    expect(result.plan).toHaveLength(2);
  });

  it('does not re-add already-explored goal descriptions (regression cycle)', () => {
    // Regression creates a cycle: Y→Z via A1, Z→Y via A2 (cycle detected at line 404)
    // But also Y→X via A4 and X→initial via A3 (solvable path)
    const a1: PlanningAction = {
      name: 'A1', preconditions: ['Z'], negPreconditions: [],
      addList: ['Y'], deleteList: [],
    };
    const a2: PlanningAction = {
      name: 'A2', preconditions: ['Y'], negPreconditions: [],
      addList: ['Z'], deleteList: [],
    };
    const a3: PlanningAction = {
      name: 'A3', preconditions: [], negPreconditions: [],
      addList: ['X'], deleteList: [],
    };
    const a4: PlanningAction = {
      name: 'A4', preconditions: ['X'], negPreconditions: [],
      addList: ['Y'], deleteList: [],
    };
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Y'],
      goalNegFluents: [],
      actions: [a1, a2, a3, a4],
    };
    const result = backwardSearch(problem, 50);
    expect(result.found).toBe(true);
    expect(result.plan).toEqual(['A3', 'A4']);
  });

  it('accepts initial state when neg goal fluents are absent (continues neg loop)', () => {
    // goalNeg=['OtherFluent'] but initial state doesn't have it → loop continues, returns true
    const problem: PlanningProblem = {
      initialState: ['X'],
      goalFluents: ['X'],
      goalNegFluents: ['Y'],  // Y not in initial state → isInitialGoal's neg loop runs without hitting return false
      actions: [],
    };
    const result = backwardSearch(problem);
    expect(result.found).toBe(true);
    expect(result.plan).toHaveLength(0);
  });
});

// ─── htnSearch ────────────────────────────────────────────────────────────────

describe('htnSearch', () => {
  const actHLA: HLADefinition = {
    name: 'Act',
    refinements: [
      { steps: ['AddA'] },
      { steps: [] }, // do nothing refinement
    ],
  };
  const hierarchy = new Map<string, HLADefinition>([['Act', actHLA]]);

  it('finds a primitive solution for trivial problem', () => {
    const result = htnSearch(trivialProblem, hierarchy, ['Act']);
    expect(result.found).toBe(true);
    expect(result.plan).toContain('AddA');
  });

  it('uses empty refinement when goal is already met', () => {
    const problem: PlanningProblem = {
      initialState: ['A'],
      goalFluents: ['A'],
      goalNegFluents: [],
      actions: [addAAction],
    };
    const result = htnSearch(problem, hierarchy, ['Act']);
    expect(result.found).toBe(true);
  });

  it('records expansion steps', () => {
    const result = htnSearch(trivialProblem, hierarchy, ['Act']);
    expect(result.steps.length).toBeGreaterThan(0);
    const first = result.steps[0]!;
    expect(first.plan).toContain('Act');
    expect(first.expandedHLA).toBe('Act');
  });

  it('returns found=false when no solution within maxSteps', () => {
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['X'],
      goalNegFluents: [],
      actions: [],
    };
    const emptyHierarchy = new Map<string, HLADefinition>();
    const result = htnSearch(problem, emptyHierarchy, ['Act'], 5);
    expect(result.found).toBe(false);
  });

  it('handles multi-HLA plan with chain of refinements', () => {
    const a1: PlanningAction = {
      name: 'A1',
      preconditions: [],
      negPreconditions: [],
      addList: ['X'],
      deleteList: [],
    };
    const a2: PlanningAction = {
      name: 'A2',
      preconditions: ['X'],
      negPreconditions: [],
      addList: ['Y'],
      deleteList: [],
    };
    const hla1: HLADefinition = {
      name: 'DoX',
      refinements: [{ steps: ['A1'] }],
    };
    const hla2: HLADefinition = {
      name: 'DoY',
      refinements: [{ steps: ['A2'] }],
    };
    const h = new Map([['DoX', hla1], ['DoY', hla2]]);
    const problem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Y'],
      goalNegFluents: [],
      actions: [a1, a2],
    };
    const result = htnSearch(problem, h, ['DoX', 'DoY']);
    expect(result.found).toBe(true);
    expect(result.plan).toEqual(['A1', 'A2']);
  });

  it('marks non-goal primitive plans correctly', () => {
    // A plan that produces something but not the goal
    const noGoalProblem: PlanningProblem = {
      initialState: [],
      goalFluents: ['Z'],
      goalNegFluents: [],
      actions: [addAAction],
    };
    const hlaFail: HLADefinition = {
      name: 'Act',
      refinements: [{ steps: ['AddA'] }], // only adds A, not Z
    };
    const h = new Map([['Act', hlaFail]]);
    const result = htnSearch(noGoalProblem, h, ['Act'], 10);
    expect(result.found).toBe(false);
    // The primitive-plan step should be recorded
    const primStep = result.steps.find(s => s.isPrimitive);
    expect(primStep).toBeDefined();
    expect(primStep!.isGoal).toBe(false);
  });
});

// ─── updateBeliefState ────────────────────────────────────────────────────────

describe('updateBeliefState', () => {
  const initial: BeliefState = {
    trueFluents: ['Open(C1)'],
    falseFluents: [],
  };

  it('adds fluents from ADD list to belief state', () => {
    const action: PlanningAction = {
      name: 'RemoveLid',
      preconditions: [],
      negPreconditions: [],
      addList: ['Open(Can1)'],
      deleteList: [],
    };
    const next = updateBeliefState(
      { trueFluents: [], falseFluents: [] },
      action,
    );
    expect(next.trueFluents).toContain('Open(Can1)');
  });

  it('removes fluents from DELETE list', () => {
    const action: PlanningAction = {
      name: 'Close',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['Open(C1)'],
    };
    const next = updateBeliefState(initial, action);
    expect(next.trueFluents).not.toContain('Open(C1)');
    expect(next.falseFluents).toContain('Open(C1)');
  });

  it('preserves unknown fluents (not in true or false sets)', () => {
    const b: BeliefState = { trueFluents: ['A'], falseFluents: ['B'] };
    const action: PlanningAction = {
      name: 'Noop',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: [],
    };
    const next = updateBeliefState(b, action);
    expect(next.trueFluents).toContain('A');
    expect(next.falseFluents).toContain('B');
  });
});

// ─── sensorlessExecution ─────────────────────────────────────────────────────

describe('sensorlessExecution', () => {
  it('records initial step with no applied action', () => {
    const initial: BeliefState = { trueFluents: [], falseFluents: [] };
    const steps = sensorlessExecution(initial, [], ['A'], []);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.appliedAction).toBeNull();
    expect(steps[0]!.goalSatisfied).toBe(false);
  });

  it('reaches goal after applying correct actions', () => {
    const initial: BeliefState = { trueFluents: [], falseFluents: [] };
    const actions: PlanningAction[] = [
      { name: 'AddA', preconditions: [], negPreconditions: [], addList: ['A'], deleteList: [] },
    ];
    const steps = sensorlessExecution(initial, actions, ['A'], []);
    expect(steps).toHaveLength(2);
    expect(steps[1]!.goalSatisfied).toBe(true);
    expect(steps[1]!.appliedAction).toBe('AddA');
  });

  it('tracks negative goal fluents correctly', () => {
    const initial: BeliefState = { trueFluents: ['Bad'], falseFluents: [] };
    const removeBad: PlanningAction = {
      name: 'RemoveBad',
      preconditions: [],
      negPreconditions: [],
      addList: [],
      deleteList: ['Bad'],
    };
    const steps = sensorlessExecution(initial, [removeBad], [], ['Bad']);
    expect(steps[1]!.goalSatisfied).toBe(true);
  });

  it('handles multiple sequential actions', () => {
    const initial: BeliefState = { trueFluents: [], falseFluents: [] };
    const actions: PlanningAction[] = [
      { name: 'A1', preconditions: [], negPreconditions: [], addList: ['X'], deleteList: [] },
      { name: 'A2', preconditions: [], negPreconditions: [], addList: ['Y'], deleteList: [] },
    ];
    const steps = sensorlessExecution(initial, actions, ['X', 'Y'], []);
    expect(steps).toHaveLength(3);
    expect(steps[2]!.goalSatisfied).toBe(true);
  });
});

// ─── criticalPathMethod ───────────────────────────────────────────────────────

describe('criticalPathMethod', () => {
  /** Example from Figure 11.13/11.14 of the textbook (car assembly). */
  const carActions: ScheduleAction[] = [
    { id: 'AddEngine1', duration: 30, predecessors: [], resource: 'EngineHoists' },
    { id: 'AddEngine2', duration: 60, predecessors: [], resource: 'EngineHoists' },
    { id: 'AddWheels1', duration: 30, predecessors: ['AddEngine1'], resource: 'WheelStations' },
    { id: 'AddWheels2', duration: 15, predecessors: ['AddEngine2'], resource: 'WheelStations' },
    { id: 'Inspect1', duration: 10, predecessors: ['AddWheels1'], resource: 'Inspectors' },
    { id: 'Inspect2', duration: 10, predecessors: ['AddWheels2'], resource: 'Inspectors' },
  ];

  it('returns empty array for empty input', () => {
    expect(criticalPathMethod([])).toHaveLength(0);
  });

  it('computes correct makespan for the car assembly problem', () => {
    const results = criticalPathMethod(carActions);
    const makespan = Math.max(...results.map(r => r.ef));
    // Critical path: AddEngine2(60) + AddWheels2(15) + Inspect2(10) = 85
    expect(makespan).toBe(85);
  });

  it('identifies critical path (slack=0) correctly', () => {
    const results = criticalPathMethod(carActions);
    const byId = new Map(results.map(r => [r.id, r]));
    // Critical path: Engine2 → Wheels2 → Inspect2
    expect(byId.get('AddEngine2')!.onCriticalPath).toBe(true);
    expect(byId.get('AddWheels2')!.onCriticalPath).toBe(true);
    expect(byId.get('Inspect2')!.onCriticalPath).toBe(true);
    // Non-critical: Engine1 → Wheels1 → Inspect1 (have slack)
    expect(byId.get('AddEngine1')!.onCriticalPath).toBe(false);
  });

  it('computes correct ES for each action', () => {
    const results = criticalPathMethod(carActions);
    const byId = new Map(results.map(r => [r.id, r]));
    expect(byId.get('AddEngine1')!.es).toBe(0);
    expect(byId.get('AddEngine2')!.es).toBe(0);
    expect(byId.get('AddWheels1')!.es).toBe(30);
    expect(byId.get('AddWheels2')!.es).toBe(60);
    expect(byId.get('Inspect1')!.es).toBe(60);
    expect(byId.get('Inspect2')!.es).toBe(75);
  });

  it('computes correct slack for non-critical actions', () => {
    const results = criticalPathMethod(carActions);
    const byId = new Map(results.map(r => [r.id, r]));
    // AddEngine1 can start up to 15 min late
    expect(byId.get('AddEngine1')!.slack).toBe(15);
    expect(byId.get('AddWheels1')!.slack).toBe(15);
    expect(byId.get('Inspect1')!.slack).toBe(15);
  });

  it('handles single action with no predecessors', () => {
    const single: ScheduleAction[] = [
      { id: 'OnlyOne', duration: 42, predecessors: [] },
    ];
    const results = criticalPathMethod(single);
    expect(results).toHaveLength(1);
    expect(results[0]!.es).toBe(0);
    expect(results[0]!.ef).toBe(42);
    expect(results[0]!.slack).toBe(0);
    expect(results[0]!.onCriticalPath).toBe(true);
  });

  it('handles a linear chain', () => {
    const chain: ScheduleAction[] = [
      { id: 'A', duration: 10, predecessors: [] },
      { id: 'B', duration: 20, predecessors: ['A'] },
      { id: 'C', duration: 5, predecessors: ['B'] },
    ];
    const results = criticalPathMethod(chain);
    const byId = new Map(results.map(r => [r.id, r]));
    expect(byId.get('A')!.es).toBe(0);
    expect(byId.get('B')!.es).toBe(10);
    expect(byId.get('C')!.es).toBe(30);
    expect(byId.get('A')!.onCriticalPath).toBe(true);
    expect(byId.get('B')!.onCriticalPath).toBe(true);
    expect(byId.get('C')!.onCriticalPath).toBe(true);
    expect(byId.get('C')!.ef).toBe(35);
  });

  it('preserves resource field in output', () => {
    const actions: ScheduleAction[] = [
      { id: 'T1', duration: 5, predecessors: [], resource: 'Workers' },
    ];
    const results = criticalPathMethod(actions);
    expect(results[0]!.resource).toBe('Workers');
  });

  it('handles a diamond dependency (two paths to one action)', () => {
    const diamond: ScheduleAction[] = [
      { id: 'Start', duration: 0, predecessors: [] },
      { id: 'Left', duration: 10, predecessors: ['Start'] },
      { id: 'Right', duration: 20, predecessors: ['Start'] },
      { id: 'End', duration: 5, predecessors: ['Left', 'Right'] },
    ];
    const results = criticalPathMethod(diamond);
    const byId = new Map(results.map(r => [r.id, r]));
    // Critical path: Start(0) → Right(20) → End(5) = 25
    expect(byId.get('End')!.es).toBe(20);
    expect(byId.get('Left')!.slack).toBe(10);
    expect(byId.get('Right')!.onCriticalPath).toBe(true);
  });

  it('handles multiple successors where earliest finish determines minimum slack correctly', () => {
    // A has two successors: B (longer, so smaller LS) and C (shorter, larger LS)
    // When processing A in backward pass: LS(B) < LS(C), so second iteration doesn't update
    const actions: ScheduleAction[] = [
      { id: 'A', duration: 5, predecessors: [] },
      { id: 'B', duration: 20, predecessors: ['A'] },  // LS(B) = makespan - 20 = 5
      { id: 'C', duration: 10, predecessors: ['A'] },  // LS(C) = makespan - 10 = 15
    ];
    const results = criticalPathMethod(actions);
    const byId = new Map(results.map(r => [r.id, r]));
    // Makespan = 5 + 20 = 25 (A→B critical)
    expect(byId.get('A')!.onCriticalPath).toBe(true);
    expect(byId.get('B')!.onCriticalPath).toBe(true);
    // C has slack: LS(C)=15, ES(C)=5 → slack=10
    expect(byId.get('C')!.slack).toBe(10);
  });
});
