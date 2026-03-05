/**
 * Chapter 7 — Logical Agents
 *
 * Pure algorithm implementations for:
 *  - Propositional logic evaluation and truth tables
 *  - DPLL SAT solver with step-by-step trace
 *  - Wumpus World KB-based exploration
 *
 * @module algorithms
 */

// ─── Propositional Logic Types ───────────────────────────────────────────────

/**
 * Propositional operators. 'not' is included per the type spec for completeness;
 * it is handled as the dedicated `neg` kind in PropFormula rather than as a
 * binary compound, so `Exclude<PropOp, 'not'>` is used in the compound node.
 */
export type PropOp = 'not' | 'and' | 'or' | 'implies' | 'iff';

export type PropFormula =
  | { kind: 'literal'; name: string }
  | { kind: 'neg'; arg: PropFormula }
  | { kind: 'compound'; op: Exclude<PropOp, 'not'>; left: PropFormula; right: PropFormula };

// ─── Truth Table ─────────────────────────────────────────────────────────────

export interface TruthTableRow {
  assignment: ReadonlyMap<string, boolean>;
  result: boolean;
}

/**
 * Extracts all variable names from a propositional formula.
 * Returns a sorted, deduplicated array of variable names.
 *
 * @param formula - The propositional formula.
 * @returns Alphabetically sorted variable names.
 * @complexity O(n log n) where n is the formula size.
 */
export function extractVariables(formula: PropFormula): ReadonlyArray<string> {
  const vars = new Set<string>();
  function collect(f: PropFormula): void {
    if (f.kind === 'literal') {
      vars.add(f.name);
    } else if (f.kind === 'neg') {
      collect(f.arg);
    } else {
      collect(f.left);
      collect(f.right);
    }
  }
  collect(formula);
  return [...vars].sort();
}

/**
 * Evaluates a propositional formula under a variable assignment.
 *
 * @param formula - The propositional formula.
 * @param assignment - Map from variable names to boolean values.
 * @returns The truth value of the formula.
 * @throws Error if a variable is not found in the assignment.
 * @complexity O(n) where n is the formula size.
 */
export function evaluateFormula(
  formula: PropFormula,
  assignment: ReadonlyMap<string, boolean>,
): boolean {
  if (formula.kind === 'literal') {
    const val = assignment.get(formula.name);
    if (val === undefined) {
      throw new Error(`Variable '${formula.name}' not found in assignment`);
    }
    return val;
  }
  if (formula.kind === 'neg') {
    return !evaluateFormula(formula.arg, assignment);
  }
  const left = evaluateFormula(formula.left, assignment);
  const right = evaluateFormula(formula.right, assignment);
  switch (formula.op) {
    case 'and':     return left && right;
    case 'or':      return left || right;
    case 'implies': return !left || right;
    case 'iff':     return left === right;
  }
}

/**
 * Generates all 2^n truth table rows for a propositional formula.
 * Variables are sorted alphabetically; rows enumerate all assignments in order.
 *
 * @param formula - The propositional formula.
 * @returns All truth table rows.
 * @complexity O(2^n * n) where n is the number of distinct variables.
 */
export function generateTruthTable(formula: PropFormula): ReadonlyArray<TruthTableRow> {
  const vars = extractVariables(formula);
  const n = vars.length;
  const rows: TruthTableRow[] = [];
  for (let i = 0; i < (1 << n); i++) {
    const assignment = new Map<string, boolean>();
    for (let j = 0; j < n; j++) {
      // vars[j] is always defined: j < n = vars.length
      assignment.set(vars[j]!, Boolean((i >> (n - 1 - j)) & 1));
    }
    rows.push({ assignment, result: evaluateFormula(formula, assignment) });
  }
  return rows;
}

// ─── DPLL ─────────────────────────────────────────────────────────────────────

/** A literal: positive "P" or negative "~P". */
export type Literal = string;
export type Clause = ReadonlyArray<Literal>;
export type CNF = ReadonlyArray<Clause>;

export interface DPLLStep {
  readonly action: string;
  readonly assignment: ReadonlyMap<string, boolean>;
  readonly clauses: CNF;
  readonly result: 'pending' | 'sat' | 'unsat';
}

function negateLiteral(lit: Literal): Literal {
  return lit.startsWith('~') ? lit.slice(1) : `~${lit}`;
}

function literalVar(lit: Literal): string {
  return lit.startsWith('~') ? lit.slice(1) : lit;
}

function literalValue(lit: Literal): boolean {
  return !lit.startsWith('~');
}

/** Returns simplified clauses after asserting `lit` is true, or null on contradiction. */
function simplify(clauses: CNF, lit: Literal): CNF | null {
  const negLit = negateLiteral(lit);
  const result: Clause[] = [];
  for (const clause of clauses) {
    if (clause.includes(lit)) continue;          // clause satisfied — drop it
    const newClause = clause.filter(l => l !== negLit);
    if (newClause.length === 0) return null;      // contradiction — empty clause
    result.push(newClause);
  }
  return result;
}

/**
 * Davis-Putnam-Logemann-Loveland SAT solver.
 * Returns all execution steps for step-by-step playback.
 *
 * @param cnf - The formula in Conjunctive Normal Form.
 * @returns Array of DPLL execution steps.
 * @complexity O(2^n) worst case.
 */
export function dpll(cnf: CNF): ReadonlyArray<DPLLStep> {
  const steps: DPLLStep[] = [];

  function run(clauses: CNF, assignment: ReadonlyMap<string, boolean>): boolean {
    // Base case: all clauses satisfied
    if (clauses.length === 0) {
      steps.push({ action: 'All clauses satisfied — SAT', assignment, clauses, result: 'sat' });
      return true;
    }
    // Base case: empty clause exists
    if (clauses.some(c => c.length === 0)) {
      steps.push({ action: 'Empty clause found — UNSAT (backtrack)', assignment, clauses, result: 'unsat' });
      return false;
    }

    // Unit propagation
    const unit = clauses.find(c => c.length === 1);
    if (unit !== undefined) {
      // unit[0] is defined: we know unit.length === 1
      const lit = unit[0]!;
      const varName = literalVar(lit);
      const val = literalValue(lit);
      const newAssignment = new Map(assignment);
      newAssignment.set(varName, val);
      steps.push({
        action: `Unit propagation: ${lit} → ${varName} = ${val}`,
        assignment: newAssignment,
        clauses,
        result: 'pending',
      });
      const simplified = simplify(clauses, lit);
      if (simplified === null) {
        steps.push({
          action: `Contradiction after propagating ${lit} — UNSAT`,
          assignment: newAssignment,
          clauses: [[]],
          result: 'unsat',
        });
        return false;
      }
      return run(simplified, newAssignment);
    }

    // Collect all literals
    const allLits: string[] = [];
    for (const clause of clauses) {
      for (const l of clause) allLits.push(l);
    }
    const litSet = new Set(allLits);

    // Pure symbol elimination
    const pure = allLits.find(l => !litSet.has(negateLiteral(l)));
    if (pure !== undefined) {
      const varName = literalVar(pure);
      const val = literalValue(pure);
      const newAssignment = new Map(assignment);
      newAssignment.set(varName, val);
      steps.push({
        action: `Pure symbol: ${pure} → ${varName} = ${val}`,
        assignment: newAssignment,
        clauses,
        result: 'pending',
      });
      // Invariant: simplify never returns null for a pure literal.
      // A pure literal L has no negation ¬L in any clause, so removing ¬L
      // from the remaining clauses (those not already satisfied by L) can
      // never produce an empty clause.
      return run(simplify(clauses, pure)!, newAssignment);
    }

    // Branch on first unassigned variable.
    // Invariant: clauses.length > 0 (checked above) and each clause is non-empty
    // (checked above), so allLits is non-empty and an unassigned variable exists.
    const candidates = [...new Set(allLits.map(literalVar))].filter(v => !assignment.has(v));
    const varName = candidates[0]!;
    steps.push({ action: `Branch: try ${varName} = true`, assignment, clauses, result: 'pending' });
    // Invariant: simplify cannot return null here because there are no unit clauses
    // at this point (they were handled above). A clause becomes empty from simplify
    // only if it contained exactly one literal equal to the negated branch literal,
    // i.e., a unit clause — which we have already eliminated.
    if (run(simplify(clauses, varName)!, new Map([...assignment, [varName, true]]))) return true;

    steps.push({ action: `Backtrack: try ${varName} = false`, assignment, clauses, result: 'pending' });
    if (run(simplify(clauses, `~${varName}`)!, new Map([...assignment, [varName, false]]))) return true;

    steps.push({ action: `No solution for ${varName} — UNSAT`, assignment, clauses, result: 'unsat' });
    return false;
  }

  run(cnf, new Map());
  return steps;
}

// ─── Wumpus World ─────────────────────────────────────────────────────────────

export interface WumpusPercept {
  stench: boolean;
  breeze: boolean;
  glitter: boolean;
}

export interface WumpusCell {
  row: number;
  col: number;
  hasWumpus: boolean;
  hasPit: boolean;
  hasGold: boolean;
  visited: boolean;
  percept: WumpusPercept;
}

export type CellStatus = 'safe' | 'pit' | 'wumpus' | 'unknown';

export interface WumpusStep {
  readonly action: string;
  readonly agentRow: number;
  readonly agentCol: number;
  readonly visitedCells: ReadonlySet<string>;
  readonly cellStatus: ReadonlyMap<string, CellStatus>;
  readonly kbFacts: ReadonlyArray<string>;
}

/**
 * Creates a fixed 4×4 Wumpus World and returns safe-exploration steps.
 *
 * World layout:
 *   - Wumpus at (row=0, col=2)
 *   - Pits  at (row=2, col=0) and (row=2, col=2)
 *   - Gold  at (row=1, col=2)
 *   - Agent starts at (row=0, col=0)
 *
 * Exploration path: (0,0)→(0,1)→(1,1)→(1,0)→(1,2)
 *
 * @returns Ordered array of exploration steps with KB facts.
 * @complexity O(1) — fixed 4×4 world.
 */
export function exploreWumpusWorld(): ReadonlyArray<WumpusStep> {
  const status = new Map<string, CellStatus>();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      status.set(`${r},${c}`, 'unknown');
    }
  }
  const visited = new Set<string>();
  const kb: string[] = [];
  const steps: WumpusStep[] = [];

  function snapshot(action: string, r: number, c: number): void {
    steps.push({
      action,
      agentRow: r,
      agentCol: c,
      visitedCells: new Set(visited),
      cellStatus: new Map(status),
      kbFacts: [...kb],
    });
  }

  // Step 1 — (0,0): no stench, no breeze
  visited.add('0,0');
  status.set('0,0', 'safe');
  kb.push('Visited (0,0): no stench, no breeze');
  kb.push('¬Pit adjacent to (0,0)  →  ¬Pit(0,1),  ¬Pit(1,0)');
  kb.push('¬Wumpus adjacent to (0,0)  →  ¬Wumpus(0,1),  ¬Wumpus(1,0)');
  status.set('0,1', 'safe');
  status.set('1,0', 'safe');
  snapshot('Enter (0,0): no stench, no breeze — infer (0,1) and (1,0) safe', 0, 0);

  // Step 2 — (0,1): stench, no breeze
  visited.add('0,1');
  status.set('0,1', 'safe');
  kb.push('Visited (0,1): stench detected, no breeze');
  kb.push('Stench(0,1)  →  Wumpus ∈ {(0,0),(0,2),(1,1)}');
  kb.push('¬Wumpus(0,0) [visited safe]  →  Wumpus ∈ {(0,2),(1,1)}');
  kb.push('¬Pit adjacent to (0,1)  →  ¬Pit(0,0),(0,2),(1,1)');
  snapshot('Move to (0,1): stench! Wumpus is in {(0,2),(1,1)}', 0, 1);

  // Step 3 — (1,1): no stench, no breeze
  visited.add('1,1');
  status.set('1,1', 'safe');
  kb.push('Visited (1,1): no stench, no breeze');
  kb.push('¬Stench(1,1)  →  ¬Wumpus(0,1),(1,0),(1,2),(2,1)');
  kb.push('¬Breeze(1,1)  →  ¬Pit(0,1),(1,0),(1,2),(2,1)  →  (1,2) and (2,1) safe');
  kb.push('¬Wumpus(1,1) [visited safe] + Wumpus ∈ {(0,2),(1,1)}  →  Wumpus(0,2)!');
  status.set('0,2', 'wumpus');
  status.set('1,2', 'safe');
  status.set('2,1', 'safe');
  snapshot('Move to (1,1): no percepts — infer Wumpus at (0,2), (1,2) safe', 1, 1);

  // Step 4 — (1,0): no stench, breeze
  visited.add('1,0');
  status.set('1,0', 'safe');
  kb.push('Visited (1,0): no stench, breeze detected');
  kb.push('Breeze(1,0)  →  Pit ∈ {(0,0),(1,1),(2,0)}');
  kb.push('¬Pit(0,0),¬Pit(1,1) [visited safe]  →  Pit(2,0)!');
  status.set('2,0', 'pit');
  snapshot('Move to (1,0): breeze! Infer Pit at (2,0)', 1, 0);

  // Step 5 — (1,2): stench, breeze, glitter
  visited.add('1,2');
  status.set('1,2', 'safe');
  kb.push('Visited (1,2): stench + breeze + glitter');
  kb.push('Stench(1,2): confirms Wumpus(0,2) ✓');
  kb.push('Breeze(1,2)  →  Pit ∈ {(0,2),(2,2),(1,1),(1,3)}');
  kb.push('¬Pit(1,1) [safe], (0,2) is Wumpus (no pit)  →  Pit ∈ {(2,2),(1,3)}');
  kb.push('Glitter(1,2)  →  GOLD at (1,2)! 🏆');
  status.set('2,2', 'pit');
  snapshot('Move to (1,2): GOLD FOUND! Stench confirms Wumpus(0,2), breeze near (2,2)', 1, 2);

  return steps;
}

// ─── TT-ENTAILS (§7.4) ───────────────────────────────────────────────────────

export interface TTEntailsStep {
  readonly assignment: ReadonlyMap<string, boolean>;
  readonly kbValue: boolean;
  readonly alphaValue: boolean;
  readonly rowIndex: number;
  readonly totalRows: number;
  readonly result: 'pending' | 'proved' | 'disproved';
}

/**
 * TT-ENTAILS: Check whether KB |= alpha using truth tables (Figure 7.10).
 * Enumerates all 2^n variable assignments; for each row where the KB is true,
 * verifies alpha is also true.  Returns a step for every row evaluated.
 * Terminates early with 'disproved' on the first counter-example.
 * The final step is marked 'proved' when no counter-example is found.
 *
 * @param kb    - Conjunction of KB formulas.
 * @param alpha - Query formula.
 * @returns Steps for each truth-table row checked.
 */
export function ttEntails(
  kb: ReadonlyArray<PropFormula>,
  alpha: PropFormula,
): ReadonlyArray<TTEntailsStep> {
  const varSet = new Set<string>();
  for (const f of kb) for (const v of extractVariables(f)) varSet.add(v);
  for (const v of extractVariables(alpha)) varSet.add(v);
  const vars = [...varSet].sort();
  const n = vars.length;
  const totalRows = 1 << n;
  const steps: TTEntailsStep[] = [];

  for (let i = 0; i < totalRows; i++) {
    const assignment = new Map<string, boolean>();
    for (let j = 0; j < n; j++) {
      assignment.set(vars[j]!, Boolean((i >> (n - 1 - j)) & 1));
    }
    const kbValue = kb.length === 0 || kb.every(f => evaluateFormula(f, assignment));
    const alphaValue = evaluateFormula(alpha, assignment);
    if (kbValue && !alphaValue) {
      steps.push({ assignment, kbValue, alphaValue, rowIndex: i, totalRows, result: 'disproved' });
      return steps;
    }
    steps.push({ assignment, kbValue, alphaValue, rowIndex: i, totalRows, result: 'pending' });
  }

  // All KB-true rows had alpha true → entailment holds; mark last step 'proved'.
  const last = steps[steps.length - 1]!;
  steps[steps.length - 1] = { ...last, result: 'proved' };
  return steps;
}

// ─── PL-RESOLUTION (§7.5) ────────────────────────────────────────────────────

/** Returns true iff `clause` (order-independent) is already in `set`. */
function clauseInSet(clause: Clause, set: Clause[]): boolean {
  const sorted = [...clause].sort();
  return set.some(c => {
    const cs = [...c].sort();
    return cs.length === sorted.length && cs.every((l, i) => l === sorted[i]);
  });
}

/**
 * Attempt to resolve two clauses by finding a complementary literal pair.
 * Returns the resolvent (with duplicates removed) or null if no resolution
 * is possible.
 */
function plResolve(ci: Clause, cj: Clause): Clause | null {
  for (const l of ci) {
    const neg = negateLiteral(l);
    if (cj.includes(neg)) {
      const resolvent = [
        ...ci.filter(x => x !== l),
        ...cj.filter(x => x !== neg),
      ];
      return [...new Set(resolvent)];
    }
  }
  return null;
}

export interface ResolutionStep {
  readonly action: string;
  readonly clause1: Clause;
  readonly clause2: Clause;
  readonly resolvent: Clause | null;
  readonly allClauses: CNF;
  readonly result: 'pending' | 'proved' | 'disproved';
}

/**
 * PL-RESOLUTION: Proves KB |= alpha by showing (KB ∧ ¬alpha) is unsatisfiable
 * (Figure 7.12).  Repeatedly resolves pairs of clauses; terminates when the
 * empty clause is derived (proved) or no new clauses can be added (disproved).
 *
 * @param kbClauses      - KB in CNF.
 * @param negAlphaClauses - Negation of alpha in CNF.
 * @returns Steps of resolution.
 */
export function plResolution(
  kbClauses: CNF,
  negAlphaClauses: CNF,
): ReadonlyArray<ResolutionStep> {
  const steps: ResolutionStep[] = [];
  let clauses: Clause[] = [...kbClauses, ...negAlphaClauses];

  for (;;) {
    const newClauses: Clause[] = [];

    for (let i = 0; i < clauses.length; i++) {
      for (let j = i + 1; j < clauses.length; j++) {
        const ci = clauses[i]!;
        const cj = clauses[j]!;
        const resolvent = plResolve(ci, cj);
        if (resolvent === null) continue;

        if (resolvent.length === 0) {
          steps.push({
            action: 'Empty clause derived — KB ∧ ¬α is unsatisfiable (proved)',
            clause1: ci, clause2: cj, resolvent,
            allClauses: [...clauses, resolvent],
            result: 'proved',
          });
          return steps;
        }

        if (!clauseInSet(resolvent, clauses) && !clauseInSet(resolvent, newClauses)) {
          newClauses.push(resolvent);
          steps.push({
            action: `Derived [${resolvent.join(', ')}] from [${ci.join(', ')}] and [${cj.join(', ')}]`,
            clause1: ci, clause2: cj, resolvent,
            allClauses: [...clauses, ...newClauses],
            result: 'pending',
          });
        }
      }
    }

    if (newClauses.length === 0) {
      steps.push({
        action: 'No new clauses can be derived — KB ∧ ¬α is satisfiable (disproved)',
        clause1: [], clause2: [], resolvent: null,
        allClauses: [...clauses],
        result: 'disproved',
      });
      return steps;
    }

    clauses = [...clauses, ...newClauses];
  }
}

// ─── WALKSAT (§7.6) ──────────────────────────────────────────────────────────

/** Linear congruential generator for deterministic pseudo-random numbers. */
function makeLCG(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = ((1664525 * state + 1013904223) & 0xFFFFFFFF) >>> 0;
    return state / 0x100000000;
  };
}

export interface WalkSATStep {
  readonly iteration: number;
  readonly assignment: ReadonlyMap<string, boolean>;
  readonly flip: string | null;
  readonly flipType: 'greedy' | 'random' | null;
  readonly satisfiedCount: number;
  readonly totalClauses: number;
  readonly result: 'pending' | 'sat' | 'max_flips';
}

/**
 * WALKSAT: Randomized local search for satisfiability (Figure 7.18).
 * Each step picks an unsatisfied clause, then either flips the variable that
 * maximises satisfied clauses (prob 1−p, "greedy") or flips a random variable
 * from the clause (prob p, "random walk").
 *
 * @param clauses  - CNF formula.
 * @param p        - Random-walk probability (noise), in [0, 1].
 * @param maxFlips - Maximum number of variable flips.
 * @param seed     - Seed for the internal LCG (default 0).
 * @returns Steps of WalkSAT execution.
 */
export function walkSat(
  clauses: CNF,
  p: number,
  maxFlips: number,
  seed = 0,
): ReadonlyArray<WalkSATStep> {
  const rng = makeLCG(seed);

  const varSet = new Set<string>();
  for (const clause of clauses) {
    for (const l of clause) varSet.add(literalVar(l));
  }
  const vars = [...varSet].sort();

  const assignment = new Map<string, boolean>();
  for (const v of vars) assignment.set(v, rng() >= 0.5);

  /** Count how many clauses are satisfied under the given assignment. */
  function countSat(asgn: ReadonlyMap<string, boolean>): number {
    return clauses.filter(clause =>
      clause.some(l => {
        const val = asgn.get(literalVar(l));
        return val !== undefined && literalValue(l) === val;
      })
    ).length;
  }

  const steps: WalkSATStep[] = [];

  // Check initial state (before any flip).
  const initSat = countSat(assignment);
  if (initSat === clauses.length) {
    return [{ iteration: 0, assignment: new Map(assignment), flip: null, flipType: null, satisfiedCount: initSat, totalClauses: clauses.length, result: 'sat' }];
  }
  if (maxFlips === 0) {
    return [{ iteration: 0, assignment: new Map(assignment), flip: null, flipType: null, satisfiedCount: initSat, totalClauses: clauses.length, result: 'max_flips' }];
  }

  // Main flip loop: each iteration makes one flip then records the state.
  for (let i = 0; i < maxFlips; i++) {
    const unsatisfied = clauses.filter(c =>
      !c.some(l => {
        const val = assignment.get(literalVar(l));
        return val !== undefined && literalValue(l) === val;
      })
    );
    const pickedClause = unsatisfied[Math.floor(rng() * unsatisfied.length)]!;
    const clauseVars = [...new Set(pickedClause.map(l => literalVar(l)))];

    let flipVar: string;
    let flipType: 'greedy' | 'random';

    if (rng() < p) {
      flipVar = clauseVars[Math.floor(rng() * clauseVars.length)]!;
      flipType = 'random';
    } else {
      let bestVar = clauseVars[0]!;
      let bestCount = -1;
      for (const v of clauseVars) {
        const temp = new Map(assignment);
        temp.set(v, !(assignment.get(v)!));
        const cnt = countSat(temp);
        if (cnt > bestCount) { bestCount = cnt; bestVar = v; }
      }
      flipVar = bestVar;
      flipType = 'greedy';
    }

    assignment.set(flipVar, !(assignment.get(flipVar)!));
    const postSat = countSat(assignment);
    const isLast = i === maxFlips - 1;
    const result: 'sat' | 'max_flips' | 'pending' =
      postSat === clauses.length ? 'sat' : isLast ? 'max_flips' : 'pending';

    steps.push({
      iteration: i + 1, assignment: new Map(assignment),
      flip: flipVar, flipType,
      satisfiedCount: postSat, totalClauses: clauses.length, result,
    });

    if (result !== 'pending') return steps;
  }

  /* v8 ignore next */
  return steps;
}

// ─── KB-AGENT (§7.1 — Figure 7.1) ───────────────────────────────────────────

export interface KBAgentPercept {
  readonly stench: boolean;
  readonly breeze: boolean;
  readonly glitter: boolean;
  readonly bump: boolean;
  readonly scream: boolean;
}

export interface KBAgentStep {
  readonly time: number;
  readonly percept: KBAgentPercept;
  readonly action: string;
  readonly kbFacts: ReadonlyArray<string>;
  readonly tellStatements: ReadonlyArray<string>;
  readonly askQuery: string;
}

/**
 * KB-AGENT: Simulates the knowledge-based agent loop (Figure 7.1).
 * At each time step the agent TELLs the KB what was perceived and any
 * immediate inferences, then ASKs for the best action.
 *
 * @param percepts - Ordered sequence of percepts.
 * @returns One KBAgentStep per time step.
 */
export function kbAgent(
  percepts: ReadonlyArray<KBAgentPercept>,
): ReadonlyArray<KBAgentStep> {
  const kbFacts: string[] = [];
  const steps: KBAgentStep[] = [];

  for (let t = 0; t < percepts.length; t++) {
    const percept = percepts[t]!;
    const tellStatements: string[] = [];

    // TELL — record percept and derive immediate facts
    tellStatements.push(
      `Percept(t=${t}): stench=${percept.stench}, breeze=${percept.breeze}, ` +
      `glitter=${percept.glitter}, bump=${percept.bump}, scream=${percept.scream}`,
    );
    kbFacts.push(`Percept(t=${t}): ${JSON.stringify(percept)}`);

    if (percept.stench) {
      const fact = `Stench(t=${t}) → Wumpus is in an adjacent cell`;
      tellStatements.push(fact);
      kbFacts.push(fact);
    }
    if (percept.breeze) {
      const fact = `Breeze(t=${t}) → Pit is in an adjacent cell`;
      tellStatements.push(fact);
      kbFacts.push(fact);
    }
    if (percept.glitter) {
      const fact = `Glitter(t=${t}) → Gold is in this cell`;
      tellStatements.push(fact);
      kbFacts.push(fact);
    }
    if (percept.bump) {
      const fact = `Bump(t=${t}) → Wall detected ahead`;
      tellStatements.push(fact);
      kbFacts.push(fact);
    }
    if (percept.scream) {
      const fact = `Scream(t=${t}) → Wumpus has been killed`;
      tellStatements.push(fact);
      kbFacts.push(fact);
    }

    // ASK — choose action based on current KB state
    let action: string;
    let askQuery: string;

    if (percept.glitter) {
      askQuery = 'Is there gold in the current cell?';
      action = 'Grab';
    } else if (percept.bump) {
      askQuery = 'Is there a wall directly ahead?';
      action = 'TurnLeft';
    } else if (percept.scream) {
      askQuery = 'Has the Wumpus been killed?';
      action = 'MoveForward';
    } else if (!percept.stench && !percept.breeze) {
      askQuery = 'Is the cell ahead provably safe?';
      action = 'MoveForward';
    } else {
      askQuery = 'Is any adjacent cell known to be safe?';
      action = 'TurnLeft';
    }

    steps.push({
      time: t,
      percept,
      action,
      kbFacts: [...kbFacts],
      tellStatements,
      askQuery,
    });
  }

  return steps;
}
