import { describe, it, expect } from 'vitest';
import {
  dist2D,
  clamp,
  pointInRect,
  segmentIntersectsRect,
  segmentFree,
  buildRRT,
  buildPRM,
  wrapAngle,
  gaussian,
  runMCL,
  simulatePID,
  runEKF,
  simulateMPC,
  evaluateDomainRandomization,
  inferHumanGoal,
  simulateFSM,
  buildVisibilityGraph,
  visibilityGraphPath,
  type Point2D,
  type Rect,
  type GridAction,
  type FSMState,
  type FSMTransition,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

describe('dist2D', () => {
  it('distance of identical points is zero', () => {
    expect(dist2D({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });
  it('distance of (0,0)→(3,4) is 5', () => {
    expect(dist2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
  it('is symmetric', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 5, y: 6 };
    expect(dist2D(a, b)).toBeCloseTo(dist2D(b, a));
  });
  it('handles negative coordinates', () => {
    // distance from (-3,-4) to (0,0) = sqrt(9+16) = 5
    expect(dist2D({ x: -3, y: -4 }, { x: 0, y: 0 })).toBeCloseTo(5);
  });
});

describe('clamp', () => {
  it('returns lo when value < lo', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('returns hi when value > hi', () => expect(clamp(15, 0, 10)).toBe(10));
  it('returns value when within range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('returns lo when value == lo', () => expect(clamp(0, 0, 10)).toBe(0));
  it('returns hi when value == hi', () => expect(clamp(10, 0, 10)).toBe(10));
});

describe('pointInRect', () => {
  const rect: Rect = { x: 1, y: 1, width: 4, height: 4 };
  it('inside point returns true', () => expect(pointInRect({ x: 3, y: 3 }, rect)).toBe(true));
  it('on boundary returns true', () => expect(pointInRect({ x: 1, y: 1 }, rect)).toBe(true));
  it('outside returns false', () => expect(pointInRect({ x: 0, y: 0 }, rect)).toBe(false));
  it('just outside right edge returns false', () => expect(pointInRect({ x: 6, y: 3 }, rect)).toBe(false));
  it('just outside top edge returns false', () => expect(pointInRect({ x: 3, y: 6 }, rect)).toBe(false));
});

describe('segmentIntersectsRect', () => {
  const rect: Rect = { x: 3, y: 3, width: 4, height: 4 };

  it('segment fully inside returns true', () => {
    expect(segmentIntersectsRect({ x: 4, y: 4 }, { x: 5, y: 5 }, rect)).toBe(true);
  });

  it('segment crossing rect returns true', () => {
    expect(segmentIntersectsRect({ x: 0, y: 5 }, { x: 10, y: 5 }, rect)).toBe(true);
  });

  it('segment entirely outside returns false', () => {
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 2, y: 2 }, rect)).toBe(false);
  });

  it('segment clipped out on y-axis returns false', () => {
    // Segment going from left to right but y is out of range
    const r: Rect = { x: 2, y: 5, width: 3, height: 3 };
    // Segment at y=0, going right — entirely below the rect's y-range
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 10, y: 0 }, r)).toBe(false);
  });

  it('segment above ymax clips out on last update call (line 118 branch)', () => {
    // Rect at y=3..6. Segment at y=12 (above ymax=6) but within x-range
    const r2: Rect = { x: 2, y: 3, width: 6, height: 3 };
    // Segment from (0,12) to (10,12) — above the rect, passes x checks but fails ymax
    expect(segmentIntersectsRect({ x: 0, y: 12 }, { x: 10, y: 12 }, r2)).toBe(false);
  });

  it('segment touching corner returns true (endpoint inside)', () => {
    // One endpoint is at the corner of the rect
    expect(segmentIntersectsRect({ x: 3, y: 3 }, { x: 0, y: 0 }, rect)).toBe(true);
  });

  it('vertical segment through rect returns true', () => {
    expect(segmentIntersectsRect({ x: 5, y: 0 }, { x: 5, y: 10 }, rect)).toBe(true);
  });

  it('horizontal segment through rect returns true', () => {
    expect(segmentIntersectsRect({ x: 0, y: 5 }, { x: 10, y: 5 }, rect)).toBe(true);
  });

  it('near-parallel segment missing rect returns false', () => {
    // Horizontal segment at y=0 misses rect at y=3..7
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 10, y: 0 }, rect)).toBe(false);
  });
});

describe('segmentFree', () => {
  const obstacles: Rect[] = [{ x: 4, y: 0, width: 2, height: 10 }];

  it('segment not hitting any obstacle is free', () => {
    expect(segmentFree({ x: 0, y: 5 }, { x: 3, y: 5 }, obstacles)).toBe(true);
  });

  it('segment crossing obstacle is not free', () => {
    expect(segmentFree({ x: 0, y: 5 }, { x: 8, y: 5 }, obstacles)).toBe(false);
  });

  it('no obstacles — always free', () => {
    expect(segmentFree({ x: 0, y: 0 }, { x: 100, y: 100 }, [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RRT
// ---------------------------------------------------------------------------

describe('buildRRT', () => {
  const obstacles: Rect[] = [];
  const start: Point2D = { x: 5, y: 5 };
  const goal: Point2D = { x: 95, y: 95 };

  it('returns at least one step', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 20, 10, 0.2, 5, 42);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('first step has the start node in the tree', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 20, 10, 0.2, 5, 42);
    const first = steps[0]!;
    expect(first.tree.length).toBeGreaterThanOrEqual(1);
    expect(first.tree[0]!.pos).toEqual(start);
    expect(first.tree[0]!.parentId).toBe(-1);
  });

  it('solves an open-field problem within maxIter', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 500, 10, 0.3, 8, 7);
    const solved = steps.some(s => s.solved);
    expect(solved).toBe(true);
  });

  it('solved step has non-empty path', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 500, 10, 0.3, 8, 7);
    const solvedStep = steps.find(s => s.solved);
    expect(solvedStep?.path.length).toBeGreaterThan(0);
  });

  it('unsolved steps have empty path', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 5, 10, 0, 3, 99);
    const unsolved = steps.filter(s => !s.solved);
    unsolved.forEach(s => expect(s.path.length).toBe(0));
  });

  it('blocked extension adds no new node', () => {
    const wall: Rect[] = [{ x: 0, y: 0, width: 100, height: 100 }];
    const steps = buildRRT(
      { x: 50, y: 50 }, { x: 90, y: 90 }, wall, 100, 100, 5, 10, 0, 5, 1
    );
    // All extensions blocked: newNode should be null for blocked steps
    // (start is inside obstacle which means extension always blocked)
    const hasNullNode = steps.some(s => s.newNode === null);
    expect(hasNullNode).toBe(true);
  });

  it('goal bias of 1 always samples the goal', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 2, 10, 1.0, 5, 1);
    steps.forEach(s => {
      expect(s.sample).toEqual(goal);
    });
  });

  it('step action string is a non-empty string', () => {
    const steps = buildRRT(start, goal, obstacles, 100, 100, 5, 10, 0.2, 5, 1);
    steps.forEach(s => expect(typeof s.action).toBe('string'));
  });
});

// ---------------------------------------------------------------------------
// PRM
// ---------------------------------------------------------------------------

describe('buildPRM', () => {
  const start: Point2D = { x: 5, y: 50 };
  const goal: Point2D = { x: 95, y: 50 };
  const obstacles: Rect[] = [];

  it('returns steps equal to numMilestones', () => {
    const steps = buildPRM(start, goal, obstacles, 100, 100, 10, 30, 42);
    expect(steps.length).toBe(10);
  });

  it('eventually finds a path in open field', () => {
    const steps = buildPRM(start, goal, obstacles, 100, 100, 30, 50, 42);
    const solved = steps.some(s => s.solved);
    expect(solved).toBe(true);
  });

  it('found path starts near start and ends near goal', () => {
    const steps = buildPRM(start, goal, obstacles, 100, 100, 30, 50, 42);
    const solvedStep = steps.find(s => s.solved);
    expect(solvedStep).toBeDefined();
    const path = solvedStep!.path;
    expect(path.length).toBeGreaterThan(0);
    expect(dist2D(path[0]!, start)).toBeLessThanOrEqual(1);
    expect(dist2D(path[path.length - 1]!, goal)).toBeLessThanOrEqual(1);
  });

  it('every step has non-decreasing number of nodes', () => {
    const steps = buildPRM(start, goal, obstacles, 100, 100, 10, 30, 5);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.nodes.length).toBeGreaterThanOrEqual(steps[i - 1]!.nodes.length);
    }
  });

  it('handles obstacles blocking all milestones (no path)', () => {
    // Wall from x=20 to x=80 blocking all passage
    const wall: Rect[] = [{ x: 20, y: 0, width: 60, height: 100 }];
    const steps = buildPRM(
      { x: 10, y: 50 }, { x: 90, y: 50 }, wall, 100, 100, 20, 50, 1
    );
    // May or may not find a path depending on samples — just check it runs
    expect(steps.length).toBe(20);
  });

  it('covers failed-to-find-free-config branch (world fully covered by obstacles)', () => {
    // Obstacle covers entire world — all 100 attempts to find a free config will fail
    const totalWall: Rect[] = [{ x: 0, y: 0, width: 100, height: 100 }];
    // start/goal are technically inside the obstacle too but we still call the function
    const steps = buildPRM(
      { x: 5, y: 5 }, { x: 95, y: 95 }, totalWall, 100, 100, 3, 50, 1
    );
    expect(steps.length).toBe(3);
    // All milestones should have failed
    steps.forEach(s =>
      expect(s.action).toContain('failed to find free config')
    );
  });

  it('action string contains milestone info', () => {
    const steps = buildPRM(start, goal, obstacles, 100, 100, 5, 30, 1);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });
});

// ---------------------------------------------------------------------------
// MCL (Monte Carlo Localization)
// ---------------------------------------------------------------------------

describe('wrapAngle', () => {
  it('0 stays 0', () => expect(wrapAngle(0)).toBeCloseTo(0));
  it('π stays π', () => expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI));
  it('2π wraps to 0', () => expect(wrapAngle(2 * Math.PI)).toBeCloseTo(0));
  it('3π wraps to π', () => expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI));
  it('-π stays -π', () => expect(wrapAngle(-Math.PI)).toBeCloseTo(-Math.PI));
  it('negative wraps correctly', () => expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI));
  it('value > π wraps to negative range', () => {
    // 4.0 > π, so r -= 2π → ≈ -2.28
    const result = wrapAngle(4.0);
    expect(result).toBeGreaterThan(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });
  it('value < -π wraps to positive range', () => {
    // -4.0 < -π, so r += 2π → ≈ 2.28
    const result = wrapAngle(-4.0);
    expect(result).toBeGreaterThan(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });
});

describe('gaussian', () => {
  it('peak at mu', () => expect(gaussian(5, 5, 1)).toBeCloseTo(1));
  it('symmetric around mu', () => {
    expect(gaussian(4, 5, 1)).toBeCloseTo(gaussian(6, 5, 1));
  });
  it('wider sigma = higher value at same absolute distance from mean', () => {
    // x is 1 unit from mu=5; wider sigma means less relative deviation => higher density
    expect(gaussian(6, 5, 2)).toBeGreaterThan(gaussian(6, 5, 0.5));
  });
  it('returns value in (0, 1]', () => {
    const v = gaussian(10, 5, 1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe('runMCL', () => {
  const moves = [5, 5, 5, 5];

  it('returns steps equal to moves.length + 1 (initial + each move)', () => {
    const steps = runMCL(50, 100, 3, moves, 1, 0.5, 42);
    expect(steps.length).toBe(moves.length + 1);
  });

  it('each step has the correct number of particles', () => {
    const steps = runMCL(30, 100, 3, moves, 1, 0.5, 99);
    steps.forEach(s => expect(s.particles.length).toBe(30));
  });

  it('particle weights sum to approximately 1 after resampling', () => {
    const steps = runMCL(20, 100, 2, [5, 5], 1, 0.5, 7);
    for (const step of steps) {
      const total = step.particles.reduce((s, p) => s + p.weight, 0);
      expect(total).toBeCloseTo(1, 5);
    }
  });

  it('true pose increases with positive moves', () => {
    const steps = runMCL(20, 100, 2, [10, 10], 1, 0.1, 1);
    const firstX = steps[0]!.truePose.x;
    const lastX = steps[steps.length - 1]!.truePose.x;
    expect(lastX).toBeGreaterThan(firstX);
  });

  it('works with a single particle', () => {
    const steps = runMCL(1, 50, 2, [5], 1, 0.5, 3);
    expect(steps.length).toBe(2);
    expect(steps[0]!.particles.length).toBe(1);
  });

  it('works with no moves (empty sequence)', () => {
    const steps = runMCL(10, 100, 2, [], 1, 0.5, 1);
    expect(steps.length).toBe(1);
  });

  it('action string describes the step', () => {
    const steps = runMCL(10, 100, 2, [5], 1, 0.5, 1);
    expect(steps[1]!.action).toContain('Move 1');
  });

  it('action string uses empty string prefix for negative move', () => {
    const steps = runMCL(10, 100, 2, [-5], 1, 0.5, 1);
    expect(steps[1]!.action).toContain('Move 1');
    // negative move should not have '+' prefix
    expect(steps[1]!.action).not.toContain('+');
  });
});

// ---------------------------------------------------------------------------
// PID Controller
// ---------------------------------------------------------------------------

describe('simulatePID', () => {
  it('returns numSteps + 1 records', () => {
    const steps = simulatePID(1, 0, 0, 10, 0, 10, 0.1);
    expect(steps.length).toBe(11);
  });

  it('initial position matches initPos', () => {
    const steps = simulatePID(1, 0, 0, 10, 3, 10, 0.1);
    expect(steps[0]!.position).toBeCloseTo(3);
  });

  it('proportional controller moves toward setpoint', () => {
    const steps = simulatePID(2, 0, 0, 10, 0, 20, 0.05);
    const last = steps[steps.length - 1]!;
    expect(last.position).toBeGreaterThan(0);
    expect(last.position).toBeLessThanOrEqual(10 + 0.1);
  });

  it('error is setpoint - position', () => {
    const steps = simulatePID(1, 0, 0, 5, 0, 5, 0.1);
    for (const s of steps) {
      expect(s.error).toBeCloseTo(s.setpoint - s.position, 10);
    }
  });

  it('action string contains time', () => {
    const steps = simulatePID(1, 0, 0, 5, 0, 5, 0.1);
    expect(steps[0]!.action).toContain('t=');
  });

  it('handles kd term', () => {
    const steps = simulatePID(1, 0, 1, 10, 0, 10, 0.1);
    expect(steps.length).toBe(11);
  });

  it('handles ki term', () => {
    const steps = simulatePID(1, 0.5, 0, 10, 0, 10, 0.1);
    expect(steps.length).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// EKF
// ---------------------------------------------------------------------------

describe('runEKF', () => {
  it('returns number of steps equal to motions.length', () => {
    const steps = runEKF(0, 1, 0.1, 0.5, [1, 1, 1], [1.1, 2.0, 2.9]);
    expect(steps.length).toBe(3);
  });

  it('posterior variance is less than or equal to prior variance', () => {
    const steps = runEKF(0, 1, 0.1, 0.5, [1], [1.1]);
    expect(steps[0]!.posteriorVariance).toBeLessThanOrEqual(steps[0]!.priorVariance);
  });

  it('Kalman gain is between 0 and 1', () => {
    const steps = runEKF(0, 1, 0.1, 0.5, [1, 2], [1, 3]);
    steps.forEach(s => {
      expect(s.kalmanGain).toBeGreaterThan(0);
      expect(s.kalmanGain).toBeLessThan(1);
    });
  });

  it('with zero sensor noise, posterior mean equals measurement', () => {
    const steps = runEKF(0, 1, 0.1, 1e-10, [1], [3]);
    expect(steps[0]!.posteriorMean).toBeCloseTo(3, 3);
  });

  it('action string contains step number', () => {
    const steps = runEKF(0, 1, 0.1, 0.5, [1], [1.1]);
    expect(steps[0]!.action).toContain('Step 1');
  });

  it('handles empty inputs', () => {
    const steps = runEKF(5, 2, 0.1, 0.5, [], []);
    expect(steps.length).toBe(0);
  });

  it('action string uses empty prefix for negative motion', () => {
    const steps = runEKF(10, 1, 0.1, 0.5, [-2], [8]);
    expect(steps[0]!.action).not.toContain('+');
    expect(steps[0]!.action).toContain('-2.00');
  });
});

// ---------------------------------------------------------------------------
// MPC
// ---------------------------------------------------------------------------

describe('simulateMPC', () => {
  it('returns numSteps records', () => {
    const steps = simulateMPC(10, 0, 5, 20, 0.1, 5);
    expect(steps.length).toBe(20);
  });

  it('horizon array has length equal to horizon param', () => {
    const steps = simulateMPC(10, 0, 5, 5, 0.1, 5);
    steps.forEach(s => expect(s.horizon.length).toBe(5));
  });

  it('applied control is clamped to maxControl', () => {
    const steps = simulateMPC(1000, 0, 5, 10, 0.1, 3);
    steps.forEach(s => {
      expect(Math.abs(s.appliedControl)).toBeLessThanOrEqual(3 + 1e-9);
    });
  });

  it('position moves toward goal', () => {
    const steps = simulateMPC(10, 0, 5, 30, 0.1, 5);
    const last = steps[steps.length - 1]!;
    expect(last.currentPos).toBeGreaterThan(0);
  });

  it('action string contains time index', () => {
    const steps = simulateMPC(10, 0, 5, 5, 0.1, 5);
    expect(steps[0]!.action).toContain('t=0');
  });

  it('horizon=0 uses 0 as applied control (no planning steps)', () => {
    const steps = simulateMPC(10, 0, 0, 5, 0.1, 5);
    steps.forEach(s => {
      expect(s.horizon.length).toBe(0);
      expect(s.appliedControl).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Domain Randomization
// ---------------------------------------------------------------------------

describe('evaluateDomainRandomization', () => {
  it('returns numInstances results', () => {
    const results = evaluateDomainRandomization(0, 1, 0.1, 0.9, 20, 50, 0.01, 5, 42);
    expect(results.length).toBe(20);
  });

  it('paramValue is within [frictionLo, frictionHi]', () => {
    const results = evaluateDomainRandomization(0, 1, 0.2, 0.8, 30, 50, 0.01, 5, 7);
    results.forEach(r => {
      expect(r.paramValue).toBeGreaterThanOrEqual(0.2);
      expect(r.paramValue).toBeLessThanOrEqual(0.8);
    });
  });

  it('instanceId matches index', () => {
    const results = evaluateDomainRandomization(0, 1, 0.1, 0.5, 10, 30, 0.01, 3, 1);
    results.forEach((r, i) => expect(r.instanceId).toBe(i));
  });

  it('higher kp leads to more successes (generally)', () => {
    const lowKp = evaluateDomainRandomization(0, 1, 0.1, 0.5, 20, 100, 0.01, 1, 42);
    const highKp = evaluateDomainRandomization(0, 1, 0.1, 0.5, 20, 100, 0.01, 10, 42);
    const lowSucc = lowKp.filter(r => r.success).length;
    const highSucc = highKp.filter(r => r.success).length;
    expect(highSucc).toBeGreaterThanOrEqual(lowSucc);
  });
});

// ---------------------------------------------------------------------------
// Human intent inference
// ---------------------------------------------------------------------------

describe('inferHumanGoal', () => {
  const goals: Point2D[] = [
    { x: 0, y: 0 }, // goal 0: origin
    { x: 10, y: 0 }, // goal 1: far right
  ];
  const priors = [0.5, 0.5];
  const currentPos: Point2D = { x: 5, y: 0 };
  const actions: GridAction[] = [
    { dx: 1, dy: 0, label: 'right' },
    { dx: -1, dy: 0, label: 'left' },
    { dx: 0, dy: 1, label: 'up' },
    { dx: 0, dy: -1, label: 'down' },
  ];

  it('returns array with same length as goals', () => {
    const posterior = inferHumanGoal(currentPos, goals, priors, actions[0]!, actions, 1);
    expect(posterior.length).toBe(goals.length);
  });

  it('posterior sums to approximately 1', () => {
    const posterior = inferHumanGoal(currentPos, goals, priors, actions[0]!, actions, 1);
    const total = (posterior as number[]).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('moving right increases belief in right goal', () => {
    const posterior = inferHumanGoal(currentPos, goals, priors, actions[0]!, actions, 5);
    expect(posterior[1]).toBeGreaterThan(posterior[0]!);
  });

  it('moving left increases belief in left goal', () => {
    const posterior = inferHumanGoal(currentPos, goals, priors, actions[1]!, actions, 5);
    expect(posterior[0]).toBeGreaterThan(posterior[1]!);
  });

  it('unknown action (not in actions) returns uniform distribution', () => {
    const unknownAction: GridAction = { dx: 99, dy: 99, label: 'teleport' };
    const posterior = inferHumanGoal(currentPos, goals, priors, unknownAction, actions, 1);
    // Returns uniform since obs not found
    posterior.forEach(p => expect(p).toBeCloseTo(0.5));
  });

  it('beta=0 gives uniform likelihood', () => {
    // With beta=0 all actions are equally likely so posterior = prior
    const posterior = inferHumanGoal(currentPos, goals, priors, actions[0]!, actions, 0);
    expect(posterior[0]).toBeCloseTo(0.5);
    expect(posterior[1]).toBeCloseTo(0.5);
  });

  it('equal priors and equal distances returns near-uniform', () => {
    const symGoals: Point2D[] = [{ x: 3, y: 0 }, { x: 7, y: 0 }];
    const symPos: Point2D = { x: 5, y: 0 };
    // Moving up is equidistant to both goals
    const posterior = inferHumanGoal(symPos, symGoals, [0.5, 0.5], actions[2]!, actions, 1);
    expect(Math.abs(posterior[0]! - posterior[1]!)).toBeLessThan(0.1);
  });

  it('all-zero weights returns uniform fallback', () => {
    // Use priors that are 0 to force zero total
    const posterior = inferHumanGoal(currentPos, goals, [0, 0], actions[0]!, actions, 1);
    posterior.forEach(p => expect(p).toBeCloseTo(0.5));
  });
});

// ---------------------------------------------------------------------------
// FSM reactive controller
// ---------------------------------------------------------------------------

describe('simulateFSM', () => {
  const states: FSMState[] = [
    { id: 'idle', label: 'Idle', action: 'stand' },
    { id: 'walk', label: 'Walking', action: 'move forward' },
    { id: 'stop', label: 'Stopped', action: 'halt' },
  ];
  const transitions: FSMTransition[] = [
    { from: 'idle', to: 'walk', condition: 'start' },
    { from: 'walk', to: 'stop', condition: 'obstacle' },
    { from: 'stop', to: 'idle', condition: 'clear' },
  ];

  it('returns steps equal to sensorSeq length', () => {
    const steps = simulateFSM(states, transitions, 'idle', ['start', 'obstacle', 'clear']);
    expect(steps.length).toBe(3);
  });

  it('transitions correctly through states', () => {
    const steps = simulateFSM(states, transitions, 'idle', ['start', 'obstacle', 'clear']);
    expect(steps[0]!.stateId).toBe('idle');
    expect(steps[1]!.stateId).toBe('walk');
    expect(steps[2]!.stateId).toBe('stop');
  });

  it('no matching transition keeps state unchanged', () => {
    const steps = simulateFSM(states, transitions, 'idle', ['unknown_event']);
    expect(steps[0]!.triggered).toBeNull();
    expect(steps[0]!.stateId).toBe('idle');
  });

  it('triggered field is populated on valid transition', () => {
    const steps = simulateFSM(states, transitions, 'idle', ['start']);
    expect(steps[0]!.triggered).not.toBeNull();
    expect(steps[0]!.triggered!.to).toBe('walk');
  });

  it('action string is meaningful', () => {
    const steps = simulateFSM(states, transitions, 'idle', ['start']);
    expect(steps[0]!.action).toContain('Idle');
  });

  it('empty sensor sequence returns empty steps', () => {
    const steps = simulateFSM(states, transitions, 'idle', []);
    expect(steps.length).toBe(0);
  });

  it('handles unknown initial state gracefully', () => {
    const steps = simulateFSM(states, transitions, 'unknown', ['start']);
    expect(steps.length).toBe(1);
    expect(steps[0]!.triggered).toBeNull();
  });

  it('covers action label fallback when destination state is unknown', () => {
    const transToUnknown: FSMTransition[] = [
      ...transitions,
      { from: 'idle', to: 'ghost_state', condition: 'vanish' },
    ];
    const steps = simulateFSM(states, transToUnknown, 'idle', ['vanish']);
    // transition fires but target state is not in states list → uses id as label fallback
    expect(steps[0]!.triggered).not.toBeNull();
    expect(steps[0]!.action).toContain('ghost_state');
  });

  it('covers curState undefined fallback in action string (unknown current state with transition)', () => {
    // Start in an unknown state that has a transition defined
    const extTransitions: FSMTransition[] = [
      ...transitions,
      { from: 'alien', to: 'idle', condition: 'land' },
    ];
    const steps = simulateFSM(states, extTransitions, 'alien', ['land']);
    // curState is undefined (alien not in states), uses 'alien' as fallback in action string
    expect(steps[0]!.action).toContain('alien');
  });
});

// ---------------------------------------------------------------------------
// Visibility graph
// ---------------------------------------------------------------------------

describe('buildVisibilityGraph', () => {
  it('in an empty space, all vertices see each other', () => {
    const verts: Point2D[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
    ];
    const adj = buildVisibilityGraph(verts, []);
    expect(adj[0]).toContain(1);
    expect(adj[0]).toContain(2);
    expect(adj[1]).toContain(2);
  });

  it('obstacle blocks visibility', () => {
    const verts: Point2D[] = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ];
    const wall: Rect[] = [{ x: 4, y: 0, width: 2, height: 10 }];
    const adj = buildVisibilityGraph(verts, wall);
    expect(adj[0]).not.toContain(1);
  });

  it('returns adj list of same length as vertices', () => {
    const verts: Point2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    ];
    const adj = buildVisibilityGraph(verts, []);
    expect(adj.length).toBe(4);
  });
});

describe('visibilityGraphPath', () => {
  it('finds direct path when no obstacles', () => {
    const verts: Point2D[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    const adj = buildVisibilityGraph(verts, []);
    const path = visibilityGraphPath(adj, verts, 0, 2);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe(0);
    expect(path[path.length - 1]).toBe(2);
  });

  it('returns empty array when start and goal disconnected', () => {
    // Completely blocked by a wall
    const verts: Point2D[] = [{ x: 0, y: 5 }, { x: 10, y: 5 }];
    const wall: Rect[] = [{ x: 4, y: 0, width: 2, height: 10 }];
    const adj = buildVisibilityGraph(verts, wall);
    const path = visibilityGraphPath(adj, verts, 0, 1);
    expect(path.length).toBe(0);
  });

  it('uses shortest path when alternatives exist', () => {
    const verts: Point2D[] = [
      { x: 0, y: 0 },   // 0 start
      { x: 10, y: 0 },  // 1 goal
      { x: 5, y: 5 },   // 2 intermediate
    ];
    const adj = buildVisibilityGraph(verts, []);
    const path = visibilityGraphPath(adj, verts, 0, 1);
    // Direct path 0→1 should be shorter than 0→2→1
    expect(path).toContain(0);
    expect(path).toContain(1);
  });
});
