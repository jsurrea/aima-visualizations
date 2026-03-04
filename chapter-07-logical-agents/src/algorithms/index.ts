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
      // Pure literal elimination cannot produce an empty clause
      return run(simplify(clauses, pure)!, newAssignment);
    }

    // Branch on first unassigned variable
    const varName = [...new Set(allLits.map(literalVar))].find(v => !assignment.has(v))!;
    steps.push({ action: `Branch: try ${varName} = true`, assignment, clauses, result: 'pending' });
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
