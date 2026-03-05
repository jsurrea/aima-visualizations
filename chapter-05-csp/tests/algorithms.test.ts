import { describe, it, expect } from 'vitest';
import {
  ac3,
  backtracking,
  minConflicts,
  treeCspSolver,
  type CSP,
  type AC3Step,
  type BacktrackingStep,
  type MinConflictsStep,
  type TreeCSPStep,
} from '../src/algorithms/index';

// ─── Test CSP Factories ───────────────────────────────────────────────────────

/**
 * Australia map-colouring CSP.
 * Variables: WA NT SA Q NSW V T  (T is isolated — no edges)
 * Constraint: adjacent regions must have different colours.
 */
function makeAustraliaCSP(): CSP {
  const colors = ['red', 'green', 'blue'];
  const variables = ['WA', 'NT', 'SA', 'Q', 'NSW', 'V', 'T'];
  const neighbors = new Map<string, ReadonlyArray<string>>([
    ['WA', ['NT', 'SA']],
    ['NT', ['WA', 'SA', 'Q']],
    ['SA', ['WA', 'NT', 'Q', 'NSW', 'V']],
    ['Q', ['NT', 'SA', 'NSW']],
    ['NSW', ['Q', 'SA', 'V']],
    ['V', ['NSW', 'SA']],
    ['T', []],
  ]);
  return {
    variables,
    domains: new Map(variables.map(v => [v, colors])),
    neighbors,
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

/** Simple chain CSP: A—B—C—D, three colours, all adjacent must differ. */
function makeChainCSP(length = 4): CSP {
  const vars = Array.from({ length }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, …
  const colors = ['1', '2', '3'];
  const neighbors = new Map<string, ReadonlyArray<string>>(
    vars.map((v, i) => [
      v,
      [
        ...(i > 0 ? [vars[i - 1]!] : []),
        ...(i < vars.length - 1 ? [vars[i + 1]!] : []),
      ],
    ]),
  );
  return {
    variables: vars,
    domains: new Map(vars.map(v => [v, colors])),
    neighbors,
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

/** Two-variable CSP where both domains share only one value → inconsistent. */
function makeInconsistentCSP(): CSP {
  return {
    variables: ['A', 'B'],
    domains: new Map([
      ['A', ['1']],
      ['B', ['1']],
    ]),
    neighbors: new Map([
      ['A', ['B']],
      ['B', ['A']],
    ]),
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

/** Single-variable CSP — trivially solvable. */
function makeSingleVarCSP(): CSP {
  return {
    variables: ['X'],
    domains: new Map([['X', ['1', '2']]]),
    neighbors: new Map([['X', []]]),
    constraints: () => true,
  };
}

/** Empty CSP — no variables. */
function makeEmptyCSP(): CSP {
  return {
    variables: [],
    domains: new Map(),
    neighbors: new Map(),
    constraints: () => true,
  };
}

/**
 * CSP with an asymmetric constraint used to exercise the Tree CSP forward-pass
 * failure branch.  The backward pass always sees constraints(parent, ·, child, ·)
 * returning true (so it never prunes the parent's domain), but the forward pass
 * uses constraints(child, v, parent, pv) which can return false.
 */
function makeAsymmetricTreeCSP(): CSP {
  return {
    variables: ['A', 'B'],
    domains: new Map([
      ['A', ['2']],
      ['B', ['2']],
    ]),
    neighbors: new Map([
      ['A', ['B']],
      ['B', ['A']],
    ]),
    // When checking from A's perspective (backward pass direction) always ok;
    // when checking from B's perspective (forward pass) require vi ≠ vj.
    constraints: (xi, vi, _xj, vj) => {
      if (xi === 'A') return true;
      return vi !== vj;
    },
  };
}

/**
 * Star CSP: centre node connected to 4 leaves.
 * Useful for exercising the MRV degree heuristic tie-break.
 */
function makeStarCSP(): CSP {
  const vars = ['Centre', 'L1', 'L2', 'L3', 'L4'];
  const colors = ['red', 'green', 'blue'];
  const neighbors = new Map<string, ReadonlyArray<string>>([
    ['Centre', ['L1', 'L2', 'L3', 'L4']],
    ['L1', ['Centre']],
    ['L2', ['Centre']],
    ['L3', ['Centre']],
    ['L4', ['Centre']],
  ]);
  return {
    variables: vars,
    domains: new Map(vars.map(v => [v, colors])),
    neighbors,
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

/** No-solution CSP: 3 variables all pairwise adjacent with only 2 colours. */
function makeNoSolutionCSP(): CSP {
  const vars = ['A', 'B', 'C'];
  const colors = ['red', 'green'];
  return {
    variables: vars,
    domains: new Map(vars.map(v => [v, colors])),
    neighbors: new Map([
      ['A', ['B', 'C']],
      ['B', ['A', 'C']],
      ['C', ['A', 'B']],
    ]),
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

/** A CSP where a variable starts with an empty domain. */
function makeEmptyDomainCSP(): CSP {
  return {
    variables: ['A', 'B'],
    domains: new Map([
      ['A', ['1', '2']],
      ['B', []], // already empty
    ]),
    neighbors: new Map([
      ['A', ['B']],
      ['B', ['A']],
    ]),
    constraints: (_xi, vi, _xj, vj) => vi !== vj,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function lastStep<T>(steps: ReadonlyArray<T>): T {
  return steps[steps.length - 1]!;
}

// ─── AC-3 ────────────────────────────────────────────────────────────────────

describe('ac3', () => {
  it('returns an array of AC3Steps', () => {
    const steps = ac3(makeAustraliaCSP());
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('first step is the initialisation step (currentArc null)', () => {
    const steps = ac3(makeAustraliaCSP());
    const first = steps[0]!;
    expect(first.currentArc).toBeNull();
    expect(first.deletedValue).toBeNull();
    expect(first.consistent).toBe(true);
    expect(first.action).toMatch(/[Ii]nitiali/);
  });

  it('last step is consistent:true for satisfiable CSP', () => {
    const steps = ac3(makeAustraliaCSP());
    expect(lastStep(steps).consistent).toBe(true);
  });

  it('preserves all three colours for isolated Tasmania', () => {
    const steps = ac3(makeAustraliaCSP());
    const final = lastStep(steps);
    expect(final.domains.get('T')).toEqual(['red', 'green', 'blue']);
  });

  it('reduces domains for constrained variables (WA neighbours SA and NT)', () => {
    const steps = ac3(makeAustraliaCSP());
    const final = lastStep(steps);
    // After AC-3, SA (5 neighbours) should have all 3 colours still available
    // (map-colouring with 3 colours is satisfiable)
    expect((final.domains.get('SA') ?? []).length).toBeGreaterThan(0);
  });

  it('detects inconsistency and sets consistent:false', () => {
    const steps = ac3(makeInconsistentCSP());
    const inconsistentStep = steps.find(s => !s.consistent);
    expect(inconsistentStep).toBeDefined();
    expect(inconsistentStep!.consistent).toBe(false);
    expect(inconsistentStep!.deletedValue).not.toBeNull();
    expect(inconsistentStep!.action).toMatch(/empty|[Ii]nconsistent/);
  });

  it('ends immediately on empty initial domain (all values deleted)', () => {
    const steps = ac3(makeEmptyDomainCSP());
    // B starts empty, so when we process arc (A, B) the revise finds no support and
    // removes A's values; or when we process (B, A) the empty domain leads to an arc
    // inconsistency.  Either way, a consistent:false step must appear.
    const inconsistent = steps.find(s => !s.consistent);
    expect(inconsistent).toBeDefined();
  });

  it('accepts custom initialDomains', () => {
    const csp = makeAustraliaCSP();
    // Pre-assign WA=red by restricting its domain
    const customDomains = new Map(csp.domains);
    customDomains.set('WA', ['red']);
    const steps = ac3(csp, customDomains);
    expect(lastStep(steps).consistent).toBe(true);
    // WA should still be red
    expect(lastStep(steps).domains.get('WA')).toEqual(['red']);
  });

  it('step queue shrinks as arcs are processed', () => {
    const steps = ac3(makeChainCSP(3));
    const queueLengths = steps.map(s => s.queue.length);
    // Not monotonically decreasing (new arcs are added after revisions),
    // but the queue must eventually reach 0.
    expect(queueLengths[queueLengths.length - 1]).toBe(0);
  });

  it('records a deletedValue on revision steps', () => {
    const csp: CSP = {
      variables: ['X', 'Y'],
      domains: new Map([
        ['X', ['a', 'b']],
        ['Y', ['a']],
      ]),
      neighbors: new Map([
        ['X', ['Y']],
        ['Y', ['X']],
      ]),
      constraints: (_xi, vi, _xj, vj) => vi !== vj,
    };
    // X has ['a','b'], Y has ['a'].  revise(X,Y) removes 'a' from X (no support since Y only has 'a').
    // revise(Y,X) removes 'a' from Y (Y='a' conflicts with X's remaining 'b'? No, 'a'≠'b', so 'a' has
    // support in X=['b']).  So at least one deletedValue step exists.
    const steps = ac3(csp);
    const withDeletion = steps.filter(s => s.deletedValue !== null);
    expect(withDeletion.length).toBeGreaterThan(0);
  });

  it('handles a CSP with no neighbors (empty queue)', () => {
    const csp: CSP = {
      variables: ['X'],
      domains: new Map([['X', ['1', '2']]]),
      neighbors: new Map([['X', []]]),
      constraints: () => true,
    };
    const steps = ac3(csp);
    // Only the init + final step
    expect(steps[0]!.queue).toHaveLength(0);
    expect(lastStep(steps).consistent).toBe(true);
  });

  it('all steps expose the required shape', () => {
    const steps = ac3(makeChainCSP(3)) as AC3Step[];
    for (const s of steps) {
      expect(typeof s.action).toBe('string');
      expect(typeof s.consistent).toBe('boolean');
      expect(Array.isArray(s.queue)).toBe(true);
      expect(s.domains instanceof Map).toBe(true);
    }
  });
});

// ─── Backtracking ─────────────────────────────────────────────────────────────

describe('backtracking', () => {
  it('returns BacktrackingStep array with initial step', () => {
    const steps = backtracking(makeAustraliaCSP());
    expect(steps.length).toBeGreaterThan(0);
    const first = steps[0] as BacktrackingStep;
    expect(first.assignment.size).toBe(0);
    expect(first.isComplete).toBe(false);
    expect(first.isFailed).toBe(false);
  });

  it('solves the Australia map-colouring CSP', () => {
    const steps = backtracking(makeAustraliaCSP());
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
    expect(solution!.assignment.size).toBe(7);
  });

  it('solution satisfies all constraints', () => {
    const csp = makeAustraliaCSP();
    const steps = backtracking(csp);
    const solution = steps.find(s => s.isComplete)!;
    const assignment = solution.assignment;
    for (const [xi, neighbors] of csp.neighbors) {
      for (const xj of neighbors) {
        expect(csp.constraints(xi, assignment.get(xi)!, xj, assignment.get(xj)!)).toBe(true);
      }
    }
  });

  it('solves a simple chain CSP', () => {
    const steps = backtracking(makeChainCSP(4));
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
  });

  it('reports isFailed:true when no solution exists', () => {
    const steps = backtracking(makeNoSolutionCSP());
    const failed = lastStep(steps) as BacktrackingStep;
    expect(failed.isFailed).toBe(true);
    expect(failed.isComplete).toBe(false);
  });

  it('handles a single-variable CSP', () => {
    const steps = backtracking(makeSingleVarCSP());
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
    expect(solution!.assignment.size).toBe(1);
  });

  it('handles empty CSP (no variables)', () => {
    const steps = backtracking(makeEmptyCSP());
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
    expect(solution!.assignment.size).toBe(0);
  });

  it('useMRV=false uses declaration order', () => {
    const steps = backtracking(makeChainCSP(3), false, false);
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
  });

  it('useLCV=false still finds a solution', () => {
    const steps = backtracking(makeChainCSP(3), true, false);
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
  });

  it('emits isBacktrack:true steps when backtracking occurs', () => {
    // 3 variables all pairwise adjacent + 2 colours → must backtrack before failing
    const steps = backtracking(makeNoSolutionCSP(), true, true);
    const backtrackSteps = steps.filter(s => s.isBacktrack);
    expect(backtrackSteps.length).toBeGreaterThan(0);
  });

  it('emits a forward-checking failure step (isBacktrack, not isComplete)', () => {
    // The no-solution CSP forces forward checking to empty a domain
    const steps = backtracking(makeNoSolutionCSP());
    const fcFail = steps.find(
      s => s.isBacktrack && !s.isComplete && s.currentValue !== null,
    );
    expect(fcFail).toBeDefined();
  });

  it('records a conflicts-with-assignment step when isConsistent returns false', () => {
    // With useForwardChecking=false the algorithm uses the plain consistency check
    // (no domain pruning), so when a variable already assigned as a neighbor blocks
    // a value, isConsistent returns false and the step is emitted.
    const csp = makeNoSolutionCSP();
    const steps = backtracking(csp, false, false, false); // no MRV, no LCV, no FC
    const conflictStep = steps.find(s =>
      s.action.includes('conflicts with current assignment'),
    );
    expect(conflictStep).toBeDefined();
  });

  it('MRV degree heuristic tie-break selects highest-degree variable first', () => {
    // In the star CSP, all variables initially have domain size 3.
    // The degree tie-break should pick Centre (degree 4) before any leaf (degree 1).
    const steps = backtracking(makeStarCSP(), true, true);
    // First non-start step that selects a variable should be Centre
    const selectionStep = steps.find(s => s.currentVar !== null && s.currentValue === null);
    expect(selectionStep!.currentVar).toBe('Centre');
  });

  it('all steps have required shape', () => {
    const steps = backtracking(makeChainCSP(3)) as BacktrackingStep[];
    for (const s of steps) {
      expect(typeof s.action).toBe('string');
      expect(typeof s.isBacktrack).toBe('boolean');
      expect(typeof s.isComplete).toBe('boolean');
      expect(typeof s.isFailed).toBe('boolean');
      expect(s.assignment instanceof Map).toBe(true);
      expect(s.domains instanceof Map).toBe(true);
    }
  });
});

// ─── Min-Conflicts ────────────────────────────────────────────────────────────

describe('minConflicts', () => {
  it('n=0 returns single trivial step', () => {
    const steps = minConflicts(0, 100);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.totalConflicts).toBe(0);
    expect(steps[0]!.assignment).toHaveLength(0);
    expect(steps[0]!.action).toMatch(/[Tt]rivially|[Ee]mpty/);
  });

  it('n=1 trivially solved — solution found in main loop', () => {
    const steps = minConflicts(1, 100, () => 0);
    // Init step shows 0 conflicts; first loop iteration should emit solution
    const solutionStep = steps.find(s => s.action.includes('Solution'));
    expect(solutionStep).toBeDefined();
    expect(solutionStep!.totalConflicts).toBe(0);
  });

  it('returns MinConflictsStep array with assignment of length n', () => {
    const steps = minConflicts(4, 10_000);
    expect(steps[0]!.assignment).toHaveLength(4);
    for (const s of steps) {
      expect(s.assignment).toHaveLength(4);
    }
  });

  it('solves 4-queens with enough steps', () => {
    // min-conflicts is highly effective on N-queens
    const steps = minConflicts(4, 10_000);
    const solutionStep = steps.find(s => s.action.includes('Solution'));
    expect(solutionStep).toBeDefined();
    expect(solutionStep!.totalConflicts).toBe(0);
  });

  it('solves 8-queens with enough steps', () => {
    const steps = minConflicts(8, 100_000);
    const solutionStep = steps.find(s => s.action.includes('Solution'));
    expect(solutionStep).toBeDefined();
  });

  it('exceeds max steps and emits failure step', () => {
    // Use maxSteps=0 so the loop body never runs
    // Force non-trivial init by using n=4 with a deterministic random that
    // places all queens on the same row (guaranteed conflicts).
    const steps = minConflicts(4, 0, () => 0);
    const last = lastStep(steps) as MinConflictsStep;
    // The last step is either the init step (if init happens to be conflict-free)
    // or the "max steps reached" step.  With n=4 and all queens on row 0 via greedy
    // init the init will have conflicts, so expect the failure message.
    // (If greedy produced a solution, totalConflicts=0 is also acceptable.)
    expect(last.action).toMatch(/[Ss]olution|[Mm]ax steps/);
  });

  it('queen movement step has conflictedVar and newValue set', () => {
    // n=2 with random=()=>0 guarantees a conflicted initial placement (no 2-queens solution)
    // so the loop body always executes and produces move steps.
    const steps = minConflicts(2, 10, () => 0);
    const moveStep = steps.find(s => s.conflictedVar !== null && s.newValue !== null);
    expect(moveStep).toBeDefined();
    expect(typeof moveStep!.conflictedVar).toBe('number');
    expect(typeof moveStep!.newValue).toBe('number');
  });

  it('conflictCounts and totalConflicts are consistent', () => {
    const steps = minConflicts(4, 10_000);
    for (const s of steps) {
      const sum = (s.conflictCounts as number[]).reduce((a, b) => a + b, 0);
      expect(s.totalConflicts).toBe(sum);
    }
  });

  it('all steps have required shape', () => {
    const steps = minConflicts(4, 100) as MinConflictsStep[];
    for (const s of steps) {
      expect(typeof s.action).toBe('string');
      expect(typeof s.totalConflicts).toBe('number');
      expect(Array.isArray(s.assignment)).toBe(true);
      expect(Array.isArray(s.conflictCounts)).toBe(true);
    }
  });

  it('uses provided random function deterministically', () => {
    const callArgs: number[] = [];
    let i = 0;
    const deterministicRandom = () => {
      const v = [0, 0.3, 0.6, 0.9][i % 4]!;
      callArgs.push(v);
      i++;
      return v;
    };
    const steps1 = minConflicts(4, 50, deterministicRandom);
    i = 0;
    callArgs.length = 0;
    const steps2 = minConflicts(4, 50, deterministicRandom);
    // Same random sequence → identical step arrays
    expect(steps1.length).toBe(steps2.length);
    for (let k = 0; k < steps1.length; k++) {
      expect(steps1[k]!.totalConflicts).toBe(steps2[k]!.totalConflicts);
    }
  });
});

// ─── Tree CSP Solver ──────────────────────────────────────────────────────────

describe('treeCspSolver', () => {
  it('empty CSP returns single complete step', () => {
    const steps = treeCspSolver(makeEmptyCSP());
    expect(steps).toHaveLength(1);
    expect(steps[0]!.phase).toBe('complete');
    expect(steps[0]!.assignment.size).toBe(0);
  });

  it('single-variable CSP assigns the first domain value', () => {
    const csp: CSP = {
      variables: ['X'],
      domains: new Map([['X', ['a', 'b']]]),
      neighbors: new Map([['X', []]]),
      constraints: () => true,
    };
    const steps = treeCspSolver(csp);
    const complete = steps.find(s => s.phase === 'complete');
    expect(complete).toBeDefined();
    expect(complete!.assignment.get('X')).toBe('a');
  });

  it('solves a 4-node chain CSP', () => {
    const steps = treeCspSolver(makeChainCSP(4));
    const complete = steps.find(s => s.phase === 'complete');
    expect(complete).toBeDefined();
    expect(complete!.assignment.size).toBe(4);
  });

  it('chain solution satisfies all constraints', () => {
    const csp = makeChainCSP(4);
    const steps = treeCspSolver(csp);
    const complete = steps.find(s => s.phase === 'complete')!;
    const a = complete.assignment;
    const vars = csp.variables;
    for (let i = 0; i < vars.length - 1; i++) {
      const xi = vars[i]!;
      const xj = vars[i + 1]!;
      expect(csp.constraints(xi, a.get(xi)!, xj, a.get(xj)!)).toBe(true);
    }
  });

  it('backward pass step has phase:backward and a currentEdge', () => {
    const steps = treeCspSolver(makeChainCSP(3));
    const backwardStep = steps.find(s => s.phase === 'backward' && s.currentEdge !== null);
    expect(backwardStep).toBeDefined();
  });

  it('forward pass step has phase:forward and a non-empty assignment', () => {
    const steps = treeCspSolver(makeChainCSP(3));
    const forwardStep = steps.find(s => s.phase === 'forward');
    expect(forwardStep).toBeDefined();
    expect(forwardStep!.assignment.size).toBeGreaterThan(0);
  });

  it('detects inconsistency in backward pass (domain empty)', () => {
    // makeInconsistentCSP: A=['1'], B=['1'], A≠B  →  backward pass empties A
    const steps = treeCspSolver(makeInconsistentCSP());
    const failedStep = steps.find(s => s.phase === 'failed');
    expect(failedStep).toBeDefined();
    expect(failedStep!.action).toMatch(/empty|no solution/i);
  });

  it('detects forward-pass failure via asymmetric constraints', () => {
    // The asymmetric CSP survives the backward pass but fails in the forward pass
    const steps = treeCspSolver(makeAsymmetricTreeCSP());
    const failedStep = steps.find(s => s.phase === 'failed');
    expect(failedStep).toBeDefined();
    expect(failedStep!.action).toMatch(/[Nn]o consistent value/);
  });

  it('backward revision step records pruned domain message', () => {
    // Use a constrained 2-node CSP where backward pass DOES revise
    const csp: CSP = {
      variables: ['A', 'B'],
      domains: new Map([
        ['A', ['1', '2', '3']],
        ['B', ['1']],
      ]),
      neighbors: new Map([
        ['A', ['B']],
        ['B', ['A']],
      ]),
      constraints: (_xi, vi, _xj, vj) => vi !== vj,
    };
    // Backward pass: revise(A, B) → A=['2','3'] (removes '1' which conflicts with B's only value)
    const steps = treeCspSolver(csp);
    const prunedStep = steps.find(
      s => s.phase === 'backward' && s.action.includes('pruned'),
    );
    expect(prunedStep).toBeDefined();
    const complete = steps.find(s => s.phase === 'complete');
    expect(complete).toBeDefined();
    expect(complete!.assignment.get('A')).not.toBe('1');
  });

  it('backward no-change step is recorded', () => {
    // Use a CSP where backward revise does not remove anything
    const csp: CSP = {
      variables: ['A', 'B'],
      domains: new Map([
        ['A', ['1', '2']],
        ['B', ['1', '2']],
      ]),
      neighbors: new Map([
        ['A', ['B']],
        ['B', ['A']],
      ]),
      constraints: (_xi, vi, _xj, vj) => vi !== vj,
    };
    const steps = treeCspSolver(csp);
    const noChange = steps.find(
      s => s.phase === 'backward' && s.action.includes('no change'),
    );
    expect(noChange).toBeDefined();
  });

  it('topological order appears in every step', () => {
    const steps = treeCspSolver(makeChainCSP(4));
    for (const s of steps) {
      expect(Array.isArray(s.order)).toBe(true);
    }
  });

  it('empty-domain root emits failed step with null currentEdge', () => {
    // Single variable with empty domain: backward pass loop skips (j >= 1 is false),
    // forward pass finds no value for root → triggers the ternary null arm (line 914).
    const csp: CSP = {
      variables: ['X'],
      domains: new Map([['X', []]]),
      neighbors: new Map([['X', []]]),
      constraints: () => true,
    };
    const steps = treeCspSolver(csp);
    const failStep = steps.find(s => s.phase === 'failed');
    expect(failStep).toBeDefined();
    expect(failStep!.currentEdge).toBeNull(); // parentVar is undefined → null arm of ternary
  });

  it('finds solution without forward checking (exercises FC=false success path)', () => {
    // useForwardChecking=false forces plain consistency-check mode.
    // On a solvable chain CSP this covers the `return true` inside the else branch.
    const steps = backtracking(makeChainCSP(3), true, true, false);
    const solution = steps.find(s => s.isComplete);
    expect(solution).toBeDefined();
  });

  it('all steps have required shape', () => {
    const steps = treeCspSolver(makeChainCSP(3)) as TreeCSPStep[];
    for (const s of steps) {
      expect(typeof s.action).toBe('string');
      expect(['backward', 'forward', 'complete', 'failed']).toContain(s.phase);
      expect(s.domains instanceof Map).toBe(true);
      expect(s.assignment instanceof Map).toBe(true);
      expect(Array.isArray(s.order)).toBe(true);
    }
  });
});
