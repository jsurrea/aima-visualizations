/**
 * Chapter 5 — Constraint Satisfaction Problems
 *
 * Implementations of:
 *   1. AC-3 (Arc Consistency 3)          — Figure 5.3  (AIMA 4e, p. 170)
 *   2. Backtracking Search               — Figure 5.5  (AIMA 4e, p. 175)
 *      with MRV, Degree, and LCV heuristics + forward-checking inference
 *   3. Min-Conflicts local search        — Figure 5.9  (AIMA 4e, p. 181)
 *      applied to the N-queens problem
 *   4. Tree CSP Solver                   — Figure 5.11 (AIMA 4e, p. 184)
 *
 * All exported functions are pure (no side effects, no input mutation).
 * Each returns an immutable array of steps for step-by-step playback.
 *
 * @module algorithms
 */

// ─── Core Data Model ─────────────────────────────────────────────────────────

/**
 * A Constraint Satisfaction Problem represented by:
 * - variables:   ordered list of variable names
 * - domains:     map from variable name → allowed values
 * - neighbors:   map from variable name → list of constrained neighbors
 * - constraints: binary predicate — true iff assigning xi=vi and xj=vj is consistent
 */
export interface CSP {
  readonly variables: ReadonlyArray<string>;
  readonly domains: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly neighbors: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly constraints: (xi: string, vi: string, xj: string, vj: string) => boolean;
}

// ─── Step Types ──────────────────────────────────────────────────────────────

/** One recorded step of the AC-3 algorithm. */
export interface AC3Step {
  /** Arcs still waiting to be processed. */
  readonly queue: ReadonlyArray<readonly [string, string]>;
  /** Current domain state for every variable. */
  readonly domains: ReadonlyMap<string, ReadonlyArray<string>>;
  /** The arc being processed this step, or null for the init / final step. */
  readonly currentArc: readonly [string, string] | null;
  /** The value just deleted from the arc's head domain, or null if nothing was deleted. */
  readonly deletedValue: string | null;
  /** False only when a domain is wiped out (arc inconsistency detected). */
  readonly consistent: boolean;
  /** Human-readable description of this step. */
  readonly action: string;
}

/** One recorded step of the Backtracking Search algorithm. */
export interface BacktrackingStep {
  /** Partial (or complete) variable assignment at this point. */
  readonly assignment: ReadonlyMap<string, string>;
  /** Current pruned domains for all variables. */
  readonly domains: ReadonlyMap<string, ReadonlyArray<string>>;
  /** Variable being considered right now, or null at start / solution / failure. */
  readonly currentVar: string | null;
  /** Value being tried for currentVar, or null when just selecting a variable. */
  readonly currentValue: string | null;
  readonly action: string;
  /** True when the algorithm undoes a previous assignment. */
  readonly isBacktrack: boolean;
  /** True on the step that records a complete consistent solution. */
  readonly isComplete: boolean;
  /** True on the final step when no solution exists. */
  readonly isFailed: boolean;
}

/**
 * One recorded step of the Min-Conflicts algorithm (N-queens formulation).
 * assignment[col] = row of the queen in that column.
 */
export interface MinConflictsStep {
  readonly assignment: ReadonlyArray<number>;
  /** Column index of the queen chosen for movement (null on init / solution / failure steps). */
  readonly conflictedVar: number | null;
  /** New row the queen was moved to (null on init / solution / failure steps). */
  readonly newValue: number | null;
  /** conflictCounts[col] = number of other queens that conflict with column col. */
  readonly conflictCounts: ReadonlyArray<number>;
  readonly totalConflicts: number;
  readonly action: string;
}

/** One recorded step of the Tree CSP Solver algorithm. */
export interface TreeCSPStep {
  readonly domains: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly assignment: ReadonlyMap<string, string>;
  /** The edge (parent, child) being processed, or null outside arc-consistency / assignment steps. */
  readonly currentEdge: readonly [string, string] | null;
  /** Topological variable order computed from the tree root. */
  readonly order: ReadonlyArray<string>;
  readonly phase: 'backward' | 'forward' | 'complete' | 'failed';
  readonly action: string;
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/** Shallow-copy a domain map (values are immutable arrays, so sharing them is safe). */
function copyDomains(
  domains: ReadonlyMap<string, ReadonlyArray<string>>,
): Map<string, ReadonlyArray<string>> {
  return new Map(domains);
}

/**
 * Revise the domain of xi by removing every value that has no support in xj's domain.
 * A value vi "has support" when at least one vj in Dj satisfies constraints(xi, vi, xj, vj).
 *
 * @returns revised   — whether any value was removed
 *          newDomain — the updated domain for xi
 *          deleted   — list of removed values (for step-by-step display)
 * @complexity O(d²) where d = max domain size
 */
function revise(
  xi: string,
  xj: string,
  domains: ReadonlyMap<string, ReadonlyArray<string>>,
  constraints: CSP['constraints'],
): { revised: boolean; newDomain: ReadonlyArray<string>; deleted: ReadonlyArray<string> } {
  const di = domains.get(xi)!;
  const dj = domains.get(xj)!;

  const kept: string[] = [];
  const deleted: string[] = [];

  for (const vi of di) {
    if (dj.some(vj => constraints(xi, vi, xj, vj))) {
      kept.push(vi);
    } else {
      deleted.push(vi);
    }
  }

  return { revised: deleted.length > 0, newDomain: kept, deleted };
}

/**
 * Check whether assigning variable=value is consistent with every already-assigned neighbor.
 * @complexity O(d) where d = number of constrained neighbors
 */
function isConsistent(
  csp: CSP,
  variable: string,
  value: string,
  assignment: ReadonlyMap<string, string>,
): boolean {
  const neighbors = csp.neighbors.get(variable)!;
  for (const neighbor of neighbors) {
    const neighborValue = assignment.get(neighbor);
    if (neighborValue !== undefined) {
      if (!csp.constraints(variable, value, neighbor, neighborValue)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Forward checking: after assigning variable=value, prune every value from each unassigned
 * neighbor's domain that is inconsistent with the new assignment.
 *
 * @returns consistent  — false if any neighbor domain becomes empty
 *          newDomains  — updated domain map (independent copy)
 * @complexity O(n·d²) where n = neighbors, d = domain size
 */
function forwardCheck(
  csp: CSP,
  variable: string,
  value: string,
  assignment: ReadonlyMap<string, string>,
  domains: ReadonlyMap<string, ReadonlyArray<string>>,
): { consistent: boolean; newDomains: Map<string, ReadonlyArray<string>> } {
  const newDomains = copyDomains(domains);
  const neighbors = csp.neighbors.get(variable)!;

  for (const neighbor of neighbors) {
    if (assignment.has(neighbor)) continue;

    const neighborDomain = newDomains.get(neighbor)!;
    const filtered = neighborDomain.filter(nv =>
      csp.constraints(variable, value, neighbor, nv),
    );

    if (filtered.length === 0) {
      newDomains.set(neighbor, []);
      return { consistent: false, newDomains };
    }
    newDomains.set(neighbor, filtered);
  }

  return { consistent: true, newDomains };
}

/**
 * MRV (Minimum Remaining Values) variable selection with Degree heuristic as tie-breaker.
 * When useMRV is false, returns the first unassigned variable in declaration order.
 * @complexity O(n²) where n = number of variables
 */
function selectUnassignedVariable(
  csp: CSP,
  assignment: ReadonlyMap<string, string>,
  domains: ReadonlyMap<string, ReadonlyArray<string>>,
  useMRV: boolean,
): string {
  const unassigned = csp.variables.filter(v => !assignment.has(v));

  if (!useMRV) {
    return unassigned[0]!;
  }

  // MRV: fewest remaining domain values; tie-break by highest degree (most unassigned neighbors)
  let best = unassigned[0]!;
  let bestSize = domains.get(best)!.length;
  let bestDegree = csp.neighbors.get(best)!.filter(n => !assignment.has(n)).length;

  for (let i = 1; i < unassigned.length; i++) {
    const v = unassigned[i]!;
    const size = domains.get(v)!.length;
    const degree = csp.neighbors.get(v)!.filter(n => !assignment.has(n)).length;

    if (size < bestSize || (size === bestSize && degree > bestDegree)) {
      best = v;
      bestSize = size;
      bestDegree = degree;
    }
  }

  return best;
}

/**
 * LCV (Least Constraining Value) ordering for a variable's domain.
 * Values that rule out the fewest choices for neighbors are preferred.
 * When useLCV is false, values are returned in their natural domain order.
 * @complexity O(d·n·d) = O(n·d²)
 */
function orderDomainValues(
  csp: CSP,
  variable: string,
  assignment: ReadonlyMap<string, string>,
  domains: ReadonlyMap<string, ReadonlyArray<string>>,
  useLCV: boolean,
): ReadonlyArray<string> {
  const vals = [...domains.get(variable)!];

  if (!useLCV) {
    return vals;
  }

  // Count how many neighbor values each candidate eliminates
  const scored = vals.map(value => {
    const neighbors = csp.neighbors.get(variable)!;
    let eliminated = 0;
    for (const neighbor of neighbors) {
      if (assignment.has(neighbor)) continue;
      const nd = domains.get(neighbor)!;
      for (const nv of nd) {
        if (!csp.constraints(variable, value, neighbor, nv)) {
          eliminated++;
        }
      }
    }
    return { value, eliminated };
  });

  scored.sort((a, b) => a.eliminated - b.eliminated);
  return scored.map(s => s.value);
}

/**
 * Count how many currently placed queens conflict with a queen placed at (col, row).
 * Conflicts: same row, or same diagonal (|Δrow| === |Δcol|).
 */
function countConflicts(
  n: number,
  col: number,
  row: number,
  assignment: ReadonlyArray<number>,
): number {
  let count = 0;
  for (let c = 0; c < n; c++) {
    if (c === col) continue;
    const r = assignment[c]!;
    if (r === row || Math.abs(r - row) === Math.abs(c - col)) {
      count++;
    }
  }
  return count;
}

/** Compute per-column conflict counts for the current N-queens assignment. */
function computeConflictCounts(n: number, assignment: ReadonlyArray<number>): ReadonlyArray<number> {
  return Array.from({ length: n }, (_, col) =>
    countConflicts(n, col, assignment[col]!, assignment),
  );
}

/**
 * Greedy initializer for N-queens: for each column (left to right) place the queen
 * in the row that minimises current conflicts, breaking ties with the random function.
 */
function initQueens(n: number, random: () => number): number[] {
  const assignment = new Array<number>(n).fill(0);
  for (let col = 0; col < n; col++) {
    let minC = Infinity;
    const best: number[] = [];
    for (let row = 0; row < n; row++) {
      const c = countConflicts(n, col, row, assignment);
      if (c < minC) {
        minC = c;
        best.length = 0;
        best.push(row);
      } else if (c === minC) {
        best.push(row);
      }
    }
    assignment[col] = best[Math.floor(random() * best.length)]!;
  }
  return assignment;
}

/**
 * BFS topological ordering of the CSP's variable graph starting from the first variable.
 * For a tree-structured CSP this gives a valid parent-before-child ordering.
 * NOTE: this function assumes a tree (no cycles); each variable must appear in csp.neighbors.
 */
function topologicalOrder(csp: CSP): ReadonlyArray<string> {
  const root = csp.variables[0]!;
  const visited = new Set<string>();
  const order: string[] = [];
  const queue: string[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    visited.add(node);
    order.push(node);
    for (const neighbor of csp.neighbors.get(node)!) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return order;
}

/**
 * Build a parent map for the BFS tree rooted at order[0].
 * parent.get(v) = the node that first discovered v in BFS order.
 * NOTE: assumes tree structure (each non-root node has exactly one parent).
 */
function buildParentMap(
  csp: CSP,
  order: ReadonlyArray<string>,
): Map<string, string> {
  const parent = new Map<string, string>();
  const visited = new Set<string>();

  for (const node of order) {
    visited.add(node);
    for (const neighbor of csp.neighbors.get(node)!) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
      }
    }
  }

  return parent;
}

// ─── Recursive Backtracking Core ─────────────────────────────────────────────

function backtrackHelper(
  csp: CSP,
  assignment: Map<string, string>,
  domains: Map<string, ReadonlyArray<string>>,
  steps: BacktrackingStep[],
  useMRV: boolean,
  useLCV: boolean,
  useForwardChecking: boolean,
): boolean {
  // Base case: all variables assigned
  if (assignment.size === csp.variables.length) {
    steps.push({
      assignment: new Map(assignment),
      domains: copyDomains(domains),
      currentVar: null,
      currentValue: null,
      action: 'Solution found!',
      isBacktrack: false,
      isComplete: true,
      isFailed: false,
    });
    return true;
  }

  const variable = selectUnassignedVariable(csp, assignment, domains, useMRV);

  steps.push({
    assignment: new Map(assignment),
    domains: copyDomains(domains),
    currentVar: variable,
    currentValue: null,
    action: `Select variable: ${variable} (${domains.get(variable)!.length} values remaining)`,
    isBacktrack: false,
    isComplete: false,
    isFailed: false,
  });

  const orderedValues = orderDomainValues(csp, variable, assignment, domains, useLCV);

  for (const value of orderedValues) {
    // Without forward checking we must explicitly test consistency against assigned neighbors,
    // because no prior pruning has guaranteed the domain values are conflict-free.
    if (!useForwardChecking && !isConsistent(csp, variable, value, assignment)) {
      steps.push({
        assignment: new Map(assignment),
        domains: copyDomains(domains),
        currentVar: variable,
        currentValue: value,
        action: `${variable} = ${value}: conflicts with current assignment`,
        isBacktrack: false,
        isComplete: false,
        isFailed: false,
      });
      continue;
    }

    // Tentatively assign
    assignment.set(variable, value);

    if (useForwardChecking) {
      const { consistent, newDomains } = forwardCheck(csp, variable, value, assignment, domains);

      if (!consistent) {
        steps.push({
          assignment: new Map(assignment),
          domains: copyDomains(newDomains),
          currentVar: variable,
          currentValue: value,
          action: `${variable} = ${value}: forward checking emptied a neighbor domain`,
          isBacktrack: true,
          isComplete: false,
          isFailed: false,
        });
        assignment.delete(variable);
        continue;
      }

      steps.push({
        assignment: new Map(assignment),
        domains: copyDomains(newDomains),
        currentVar: variable,
        currentValue: value,
        action: `Assign ${variable} = ${value}`,
        isBacktrack: false,
        isComplete: false,
        isFailed: false,
      });

      if (backtrackHelper(csp, assignment, new Map(newDomains), steps, useMRV, useLCV, useForwardChecking)) {
        return true;
      }
    } else {
      steps.push({
        assignment: new Map(assignment),
        domains: copyDomains(domains),
        currentVar: variable,
        currentValue: value,
        action: `Assign ${variable} = ${value}`,
        isBacktrack: false,
        isComplete: false,
        isFailed: false,
      });

      if (backtrackHelper(csp, assignment, new Map(domains), steps, useMRV, useLCV, useForwardChecking)) {
        return true;
      }
    }

    // Recursive call failed — undo
    steps.push({
      assignment: new Map(assignment),
      domains: copyDomains(domains),
      currentVar: variable,
      currentValue: value,
      action: `Backtrack: ${variable} = ${value} leads to dead end`,
      isBacktrack: true,
      isComplete: false,
      isFailed: false,
    });
    assignment.delete(variable);
  }

  // All values exhausted
  steps.push({
    assignment: new Map(assignment),
    domains: copyDomains(domains),
    currentVar: variable,
    currentValue: null,
    action: `All values for ${variable} exhausted — backtracking`,
    isBacktrack: true,
    isComplete: false,
    isFailed: false,
  });

  return false;
}

// ─── Exported Algorithms ─────────────────────────────────────────────────────

/**
 * AC-3: Arc Consistency 3 (Figure 5.3, AIMA 4e p. 170).
 *
 * Enforces arc consistency on the entire CSP by repeatedly revising arcs until
 * no more values can be removed.  Returns a step array for playback.
 *
 * @param csp            The constraint satisfaction problem.
 * @param initialDomains Optional starting domains (defaults to csp.domains).
 *                       Pass a pre-reduced domain map to run AC-3 as a sub-procedure.
 * @returns              Immutable array of AC3Steps.
 * @complexity           O(e·d³) where e = number of arcs, d = max domain size.
 */
export function ac3(
  csp: CSP,
  initialDomains?: ReadonlyMap<string, ReadonlyArray<string>>,
): ReadonlyArray<AC3Step> {
  const steps: AC3Step[] = [];
  let domains = copyDomains(initialDomains ?? csp.domains);

  // Initialise queue with every arc in both directions
  const queue: Array<readonly [string, string]> = [];
  for (const [xi, neighbors] of csp.neighbors) {
    for (const xj of neighbors) {
      queue.push([xi, xj]);
    }
  }

  steps.push({
    queue: [...queue],
    domains: copyDomains(domains),
    currentArc: null,
    deletedValue: null,
    consistent: true,
    action: `Initialise: ${queue.length} arcs in queue`,
  });

  while (queue.length > 0) {
    const arc = queue.shift()!;
    const [xi, xj] = arc;

    const { revised, newDomain, deleted } = revise(xi, xj, domains, csp.constraints);

    if (!revised) {
      steps.push({
        queue: [...queue],
        domains: copyDomains(domains),
        currentArc: arc,
        deletedValue: null,
        consistent: true,
        action: `Arc (${xi}, ${xj}): no revision needed`,
      });
      continue;
    }

    // Update working copy once for this arc
    domains = copyDomains(domains);
    domains.set(xi, newDomain);

    // Emit one step per deleted value (shows the domain shrinking)
    for (const deletedValue of deleted) {
      const isEmpty = newDomain.length === 0;
      steps.push({
        queue: isEmpty ? [] : [...queue],
        domains: copyDomains(domains),
        currentArc: arc,
        deletedValue,
        consistent: !isEmpty,
        action: isEmpty
          ? `Removed ${deletedValue} from ${xi} → domain empty — inconsistent!`
          : `Removed ${deletedValue} from ${xi}'s domain`,
      });

      if (isEmpty) return steps; // early exit on inconsistency
    }

    // Re-queue (xk, xi) for every neighbor xk of xi except xj
    const xiNeighbors = csp.neighbors.get(xi)!;
    for (const xk of xiNeighbors) {
      if (xk !== xj) {
        queue.push([xk, xi]);
      }
    }

    steps.push({
      queue: [...queue],
      domains: copyDomains(domains),
      currentArc: arc,
      deletedValue: null,
      consistent: true,
      action: `Arc (${xi}, ${xj}): revised — added neighbor arcs to queue`,
    });
  }

  steps.push({
    queue: [],
    domains: copyDomains(domains),
    currentArc: null,
    deletedValue: null,
    consistent: true,
    action: 'AC-3 complete — all arcs arc-consistent',
  });

  return steps;
}

/**
 * Backtracking Search (Figure 5.5, AIMA 4e p. 175).
 *
 * Solves the CSP via recursive backtracking with:
 *   - MRV (Minimum Remaining Values) + Degree heuristic for variable ordering
 *   - LCV (Least Constraining Value) for value ordering
 *   - Forward Checking as the default inference procedure (disable via useForwardChecking)
 *
 * @param csp                The constraint satisfaction problem.
 * @param useMRV             Use MRV variable-selection heuristic (default true).
 * @param useLCV             Use LCV value-ordering heuristic (default true).
 * @param useForwardChecking Prune neighbor domains after each assignment (default true).
 *                           When false, falls back to plain consistency checking with no
 *                           domain pruning — useful for comparing search strategies.
 * @returns                  Immutable array of BacktrackingSteps.
 * @complexity               O(d^n) worst case; heuristics dramatically improve average.
 */
export function backtracking(
  csp: CSP,
  useMRV = true,
  useLCV = true,
  useForwardChecking = true,
): ReadonlyArray<BacktrackingStep> {
  const steps: BacktrackingStep[] = [];

  steps.push({
    assignment: new Map(),
    domains: copyDomains(csp.domains),
    currentVar: null,
    currentValue: null,
    action: 'Start backtracking search',
    isBacktrack: false,
    isComplete: false,
    isFailed: false,
  });

  const found = backtrackHelper(
    csp,
    new Map<string, string>(),
    copyDomains(csp.domains),
    steps,
    useMRV,
    useLCV,
    useForwardChecking,
  );

  if (!found) {
    steps.push({
      assignment: new Map(),
      domains: copyDomains(csp.domains),
      currentVar: null,
      currentValue: null,
      action: 'No solution exists',
      isBacktrack: false,
      isComplete: false,
      isFailed: true,
    });
  }

  return steps;
}

/**
 * Min-Conflicts local search for N-queens (Figure 5.9, AIMA 4e p. 181).
 *
 * Starts with a greedy queen placement (one per column, minimising conflicts),
 * then iteratively picks a conflicted column at random and moves its queen to
 * the row that minimises conflicts (random tie-break).
 *
 * @param n        Board size (n×n, n queens).
 * @param maxSteps Maximum number of repair moves before giving up.
 * @param random   Optional PRNG — defaults to Math.random; inject for deterministic tests.
 * @returns        Immutable array of MinConflictsSteps.
 * @complexity     O(n) per step; typically O(n) steps empirically for large n.
 */
export function minConflicts(
  n: number,
  maxSteps: number,
  random: () => number = Math.random,
): ReadonlyArray<MinConflictsStep> {
  if (n === 0) {
    return [
      {
        assignment: [],
        conflictedVar: null,
        newValue: null,
        conflictCounts: [],
        totalConflicts: 0,
        action: 'Empty board — trivially solved',
      },
    ];
  }

  const steps: MinConflictsStep[] = [];

  // Greedy initialisation
  const assignment = initQueens(n, random);
  let conflictCounts = computeConflictCounts(n, assignment);
  let totalConflicts = (conflictCounts as number[]).reduce((a, b) => a + b, 0);

  steps.push({
    assignment: [...assignment],
    conflictedVar: null,
    newValue: null,
    conflictCounts: [...conflictCounts],
    totalConflicts,
    action: `Initialise ${n}-queens (greedy placement)`,
  });

  for (let step = 0; step < maxSteps; step++) {
    if (totalConflicts === 0) {
      steps.push({
        assignment: [...assignment],
        conflictedVar: null,
        newValue: null,
        conflictCounts: [...conflictCounts],
        totalConflicts: 0,
        action: 'Solution found — no conflicts remain!',
      });
      return steps;
    }

    // Pick a random conflicted column
    const conflicted: number[] = [];
    for (let col = 0; col < n; col++) {
      if (conflictCounts[col]! > 0) conflicted.push(col);
    }
    const conflictedCol = conflicted[Math.floor(random() * conflicted.length)]!;

    // Find the row that minimises conflicts for this column
    let minC = Infinity;
    const bestRows: number[] = [];
    for (let row = 0; row < n; row++) {
      const c = countConflicts(n, conflictedCol, row, assignment);
      if (c < minC) {
        minC = c;
        bestRows.length = 0;
        bestRows.push(row);
      } else if (c === minC) {
        bestRows.push(row);
      }
    }
    const newRow = bestRows[Math.floor(random() * bestRows.length)]!;

    assignment[conflictedCol] = newRow;
    conflictCounts = computeConflictCounts(n, assignment);
    totalConflicts = (conflictCounts as number[]).reduce((a, b) => a + b, 0);

    steps.push({
      assignment: [...assignment],
      conflictedVar: conflictedCol,
      newValue: newRow,
      conflictCounts: [...conflictCounts],
      totalConflicts,
      action: `Move queen in column ${conflictedCol} to row ${newRow}`,
    });

    // Check for solution immediately after the move
    if (totalConflicts === 0) {
      steps.push({
        assignment: [...assignment],
        conflictedVar: null,
        newValue: null,
        conflictCounts: [...conflictCounts],
        totalConflicts: 0,
        action: 'Solution found — no conflicts remain!',
      });
      return steps;
    }
  }

  // Exceeded max steps
  steps.push({
    assignment: [...assignment],
    conflictedVar: null,
    newValue: null,
    conflictCounts: [...conflictCounts],
    totalConflicts,
    action: `Max steps (${maxSteps}) reached — no solution found`,
  });

  return steps;
}

/**
 * Tree CSP Solver (Figure 5.11, AIMA 4e p. 184).
 *
 * Exploits the tree structure of a CSP to solve it in polynomial time:
 *   1. Compute a topological (BFS) order from the first variable as root.
 *   2. Backward pass: for each node (reverse order), make the parent→child arc consistent.
 *   3. Forward pass: assign each variable the first value consistent with its parent.
 *
 * Requires the CSP's neighbor graph to be a tree (no cycles).
 *
 * @param csp  Tree-structured CSP.
 * @returns    Immutable array of TreeCSPSteps.
 * @complexity O(n·d²) where n = variables, d = max domain size.
 */
export function treeCspSolver(csp: CSP): ReadonlyArray<TreeCSPStep> {
  const steps: TreeCSPStep[] = [];

  if (csp.variables.length === 0) {
    steps.push({
      domains: copyDomains(csp.domains),
      assignment: new Map(),
      currentEdge: null,
      order: [],
      phase: 'complete',
      action: 'No variables — trivially solved',
    });
    return steps;
  }

  // Step 1: Topological order
  const order = topologicalOrder(csp);
  const parent = buildParentMap(csp, order);

  steps.push({
    domains: copyDomains(csp.domains),
    assignment: new Map(),
    currentEdge: null,
    order: [...order],
    phase: 'backward',
    action: `Topological order: ${order.join(' → ')}. Beginning backward pass.`,
  });

  // Step 2: Backward pass — make each parent→child arc consistent
  const domains = copyDomains(csp.domains);

  for (let j = order.length - 1; j >= 1; j--) {
    const xj = order[j]!;
    const xi = parent.get(xj)!; // safe: every non-root node has a parent

    const { revised, newDomain } = revise(xi, xj, domains, csp.constraints);

    if (revised) {
      domains.set(xi, newDomain);
    }

    steps.push({
      domains: copyDomains(domains),
      assignment: new Map(),
      currentEdge: [xi, xj],
      order: [...order],
      phase: 'backward',
      action: revised
        ? `Backward: MAKE-ARC-CONSISTENT(${xi}, ${xj}) — pruned ${xi}'s domain`
        : `Backward: MAKE-ARC-CONSISTENT(${xi}, ${xj}) — no change`,
    });

    if (newDomain.length === 0) {
      steps.push({
        domains: copyDomains(domains),
        assignment: new Map(),
        currentEdge: [xi, xj],
        order: [...order],
        phase: 'failed',
        action: `Domain of ${xi} is empty — CSP has no solution`,
      });
      return steps;
    }
  }

  // Step 3: Forward pass — assign values in topological order
  const assignment = new Map<string, string>();

  for (const xi of order) {
    const xiDomain = domains.get(xi)!;
    const parentVar = parent.get(xi);
    let assigned = false;

    for (const value of xiDomain) {
      if (parentVar === undefined) {
        // Root: any value is acceptable
        assignment.set(xi, value);
        assigned = true;
        steps.push({
          domains: copyDomains(domains),
          assignment: new Map(assignment),
          currentEdge: null,
          order: [...order],
          phase: 'forward',
          action: `Forward: assign ${xi} = ${value} (root)`,
        });
        break;
      }

      const parentValue = assignment.get(parentVar)!;
      if (csp.constraints(xi, value, parentVar, parentValue)) {
        assignment.set(xi, value);
        assigned = true;
        steps.push({
          domains: copyDomains(domains),
          assignment: new Map(assignment),
          currentEdge: [parentVar, xi],
          order: [...order],
          phase: 'forward',
          action: `Forward: assign ${xi} = ${value} (consistent with ${parentVar} = ${parentValue})`,
        });
        break;
      }
    }

    if (!assigned) {
      steps.push({
        domains: copyDomains(domains),
        assignment: new Map(assignment),
        currentEdge: parentVar !== undefined ? [parentVar, xi] : null,
        order: [...order],
        phase: 'failed',
        action: `No consistent value for ${xi} — CSP failed`,
      });
      return steps;
    }
  }

  steps.push({
    domains: copyDomains(domains),
    assignment: new Map(assignment),
    currentEdge: null,
    order: [...order],
    phase: 'complete',
    action: 'Tree CSP solved successfully!',
  });

  return steps;
}
