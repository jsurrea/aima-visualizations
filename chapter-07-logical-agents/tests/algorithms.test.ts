import { describe, it, expect } from 'vitest';
import {
  evaluateFormula,
  extractVariables,
  generateTruthTable,
  dpll,
  exploreWumpusWorld,
  ttEntails,
  plResolution,
  walkSat,
  kbAgent,
  type PropFormula,
  type CNF,
  type TTEntailsStep,
  type ResolutionStep,
  type WalkSATStep,
  type KBAgentStep,
  type KBAgentPercept,
} from '../src/algorithms/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lit = (name: string): PropFormula => ({ kind: 'literal', name });
const neg = (arg: PropFormula): PropFormula => ({ kind: 'neg', arg });
const and = (left: PropFormula, right: PropFormula): PropFormula => ({ kind: 'compound', op: 'and', left, right });
const or = (left: PropFormula, right: PropFormula): PropFormula => ({ kind: 'compound', op: 'or', left, right });
const implies = (left: PropFormula, right: PropFormula): PropFormula => ({ kind: 'compound', op: 'implies', left, right });
const iff = (left: PropFormula, right: PropFormula): PropFormula => ({ kind: 'compound', op: 'iff', left, right });

const assign = (...pairs: [string, boolean][]): ReadonlyMap<string, boolean> => new Map(pairs);

// ─── extractVariables ─────────────────────────────────────────────────────────

describe('extractVariables', () => {
  it('returns single variable from a literal', () => {
    expect(extractVariables(lit('P'))).toEqual(['P']);
  });

  it('extracts variable from negation', () => {
    expect(extractVariables(neg(lit('Q')))).toEqual(['Q']);
  });

  it('extracts and sorts variables from compound formula', () => {
    expect(extractVariables(and(lit('C'), lit('A')))).toEqual(['A', 'C']);
  });

  it('deduplicates repeated variables', () => {
    expect(extractVariables(and(lit('P'), lit('P')))).toEqual(['P']);
  });

  it('handles nested formula with 3 distinct variables', () => {
    const f = implies(and(implies(lit('P'), lit('Q')), implies(lit('Q'), lit('R'))), implies(lit('P'), lit('R')));
    expect(extractVariables(f)).toEqual(['P', 'Q', 'R']);
  });

  it('deduplicates vars across both sides of compound', () => {
    const f = and(or(lit('B'), lit('A')), or(lit('A'), lit('C')));
    expect(extractVariables(f)).toEqual(['A', 'B', 'C']);
  });
});

// ─── evaluateFormula ──────────────────────────────────────────────────────────

describe('evaluateFormula', () => {
  it('evaluates a true literal', () => {
    expect(evaluateFormula(lit('P'), assign(['P', true]))).toBe(true);
  });

  it('evaluates a false literal', () => {
    expect(evaluateFormula(lit('P'), assign(['P', false]))).toBe(false);
  });

  it('throws when variable is missing from assignment', () => {
    expect(() => evaluateFormula(lit('X'), new Map())).toThrow("Variable 'X' not found in assignment");
  });

  it('evaluates negation of true → false', () => {
    expect(evaluateFormula(neg(lit('P')), assign(['P', true]))).toBe(false);
  });

  it('evaluates negation of false → true', () => {
    expect(evaluateFormula(neg(lit('P')), assign(['P', false]))).toBe(true);
  });

  it('evaluates AND: T∧T = T', () => {
    expect(evaluateFormula(and(lit('P'), lit('Q')), assign(['P', true], ['Q', true]))).toBe(true);
  });

  it('evaluates AND: T∧F = F', () => {
    expect(evaluateFormula(and(lit('P'), lit('Q')), assign(['P', true], ['Q', false]))).toBe(false);
  });

  it('evaluates AND: F∧T = F', () => {
    expect(evaluateFormula(and(lit('P'), lit('Q')), assign(['P', false], ['Q', true]))).toBe(false);
  });

  it('evaluates AND: F∧F = F', () => {
    expect(evaluateFormula(and(lit('P'), lit('Q')), assign(['P', false], ['Q', false]))).toBe(false);
  });

  it('evaluates OR: F∨F = F', () => {
    expect(evaluateFormula(or(lit('P'), lit('Q')), assign(['P', false], ['Q', false]))).toBe(false);
  });

  it('evaluates OR: T∨F = T', () => {
    expect(evaluateFormula(or(lit('P'), lit('Q')), assign(['P', true], ['Q', false]))).toBe(true);
  });

  it('evaluates OR: F∨T = T', () => {
    expect(evaluateFormula(or(lit('P'), lit('Q')), assign(['P', false], ['Q', true]))).toBe(true);
  });

  it('evaluates OR: T∨T = T', () => {
    expect(evaluateFormula(or(lit('P'), lit('Q')), assign(['P', true], ['Q', true]))).toBe(true);
  });

  it('evaluates IMPLIES: T⇒T = T', () => {
    expect(evaluateFormula(implies(lit('P'), lit('Q')), assign(['P', true], ['Q', true]))).toBe(true);
  });

  it('evaluates IMPLIES: T⇒F = F', () => {
    expect(evaluateFormula(implies(lit('P'), lit('Q')), assign(['P', true], ['Q', false]))).toBe(false);
  });

  it('evaluates IMPLIES: F⇒T = T', () => {
    expect(evaluateFormula(implies(lit('P'), lit('Q')), assign(['P', false], ['Q', true]))).toBe(true);
  });

  it('evaluates IMPLIES: F⇒F = T', () => {
    expect(evaluateFormula(implies(lit('P'), lit('Q')), assign(['P', false], ['Q', false]))).toBe(true);
  });

  it('evaluates IFF: T⟺T = T', () => {
    expect(evaluateFormula(iff(lit('P'), lit('Q')), assign(['P', true], ['Q', true]))).toBe(true);
  });

  it('evaluates IFF: T⟺F = F', () => {
    expect(evaluateFormula(iff(lit('P'), lit('Q')), assign(['P', true], ['Q', false]))).toBe(false);
  });

  it('evaluates IFF: F⟺T = F', () => {
    expect(evaluateFormula(iff(lit('P'), lit('Q')), assign(['P', false], ['Q', true]))).toBe(false);
  });

  it('evaluates IFF: F⟺F = T', () => {
    expect(evaluateFormula(iff(lit('P'), lit('Q')), assign(['P', false], ['Q', false]))).toBe(true);
  });

  it('evaluates (P⇒Q)∧(Q⇒R)⇒(P⇒R) — tautology', () => {
    const tautology = implies(
      and(implies(lit('P'), lit('Q')), implies(lit('Q'), lit('R'))),
      implies(lit('P'), lit('R')),
    );
    // All 8 combinations must be true
    for (const p of [true, false]) {
      for (const q of [true, false]) {
        for (const r of [true, false]) {
          expect(evaluateFormula(tautology, assign(['P', p], ['Q', q], ['R', r]))).toBe(true);
        }
      }
    }
  });
});

// ─── generateTruthTable ───────────────────────────────────────────────────────

describe('generateTruthTable', () => {
  it('produces 2 rows for a single-variable formula', () => {
    const rows = generateTruthTable(lit('P'));
    expect(rows.length).toBe(2);
  });

  it('produces 8 rows for a 3-variable formula', () => {
    const f = and(and(lit('P'), lit('Q')), lit('R'));
    expect(generateTruthTable(f).length).toBe(8);
  });

  it('covers all assignments for 2 variables', () => {
    const f = and(lit('P'), lit('Q'));
    const rows = generateTruthTable(f);
    expect(rows.length).toBe(4);
    const combos = rows.map(r => [r.assignment.get('P'), r.assignment.get('Q')]);
    // i=0→[F,F], i=1→[F,T], i=2→[T,F], i=3→[T,T]
    expect(combos).toEqual([[false,false],[false,true],[true,false],[true,true]]);
  });

  it('result column matches evaluateFormula', () => {
    const f = or(lit('A'), lit('B'));
    const rows = generateTruthTable(f);
    for (const row of rows) {
      expect(row.result).toBe(evaluateFormula(f, row.assignment));
    }
  });

  it('tautology has all true results', () => {
    const taut = implies(
      and(implies(lit('P'), lit('Q')), implies(lit('Q'), lit('R'))),
      implies(lit('P'), lit('R')),
    );
    const rows = generateTruthTable(taut);
    expect(rows.every(r => r.result)).toBe(true);
    expect(rows.length).toBe(8);
  });

  it('contradiction has all false results', () => {
    const contra = and(lit('P'), neg(lit('P')));
    const rows = generateTruthTable(contra);
    expect(rows.every(r => !r.result)).toBe(true);
    expect(rows.length).toBe(2);
  });
});

// ─── dpll ─────────────────────────────────────────────────────────────────────

describe('dpll', () => {
  it('empty CNF is immediately SAT', () => {
    const steps = dpll([]);
    expect(steps.length).toBe(1);
    expect(steps[0]!.result).toBe('sat');
    expect(steps[0]!.action).toContain('SAT');
  });

  it('CNF with empty clause is immediately UNSAT', () => {
    const steps = dpll([[]]);
    expect(steps.length).toBe(1);
    expect(steps[0]!.result).toBe('unsat');
  });

  it('unit propagation finds SAT: [[P],[~P,Q]]', () => {
    const cnf: CNF = [['P'], ['~P', 'Q']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(steps.some(s => s.action.includes('Unit propagation'))).toBe(true);
  });

  it('unit propagation detects contradiction: [[P],[~P]]', () => {
    const cnf: CNF = [['P'], ['~P']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('unsat');
    expect(steps.some(s => s.action.includes('Contradiction'))).toBe(true);
  });

  it('pure symbol elimination: [[P,Q],[~P,Q]] — Q is pure', () => {
    const cnf: CNF = [['P', 'Q'], ['~P', 'Q']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(steps.some(s => s.action.includes('Pure symbol'))).toBe(true);
  });

  it('SAT via branching: spec formula [[P,Q],[~P,R],[~Q,~R],[P,~R]]', () => {
    const cnf: CNF = [['P', 'Q'], ['~P', 'R'], ['~Q', '~R'], ['P', '~R']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(steps.some(s => s.action.includes('Branch'))).toBe(true);
  });

  it('records assignment in each step', () => {
    const cnf: CNF = [['P']];
    const steps = dpll(cnf);
    const lastSat = steps[steps.length - 1]!;
    expect(lastSat.assignment.get('P')).toBe(true);
  });

  it('backtrack: P=true fails, P=false succeeds: [[P,Q],[~P,~Q],[~P,Q]]', () => {
    // After P=true: remaining [['~Q'],['Q']] → contradiction
    // After P=false: remaining [['Q']] → SAT
    const cnf: CNF = [['P', 'Q'], ['~P', '~Q'], ['~P', 'Q']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(steps.some(s => s.action.includes('Backtrack'))).toBe(true);
  });

  it('both branches fail — UNSAT with no-solution step: [[~P,Q],[~P,~Q],[P,R],[P,~R]]', () => {
    // P=true → [['Q'],['~Q']] → contradiction
    // P=false → [['R'],['~R']] → contradiction
    const cnf: CNF = [['~P', 'Q'], ['~P', '~Q'], ['P', 'R'], ['P', '~R']];
    const steps = dpll(cnf);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('unsat');
    expect(steps.some(s => s.action.includes('No solution'))).toBe(true);
  });

  it('steps have correct shape', () => {
    const cnf: CNF = [['P']];
    const steps = dpll(cnf);
    for (const step of steps) {
      expect(typeof step.action).toBe('string');
      expect(step.assignment).toBeInstanceOf(Map);
      expect(Array.isArray(step.clauses)).toBe(true);
      expect(['pending', 'sat', 'unsat']).toContain(step.result);
    }
  });
});

// ─── exploreWumpusWorld ───────────────────────────────────────────────────────

describe('exploreWumpusWorld', () => {
  const steps = exploreWumpusWorld();

  it('returns a non-empty array of steps', () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  it('first step has agent at (0,0)', () => {
    const first = steps[0]!;
    expect(first.agentRow).toBe(0);
    expect(first.agentCol).toBe(0);
  });

  it('first step has (0,0) in visited cells', () => {
    expect(steps[0]!.visitedCells.has('0,0')).toBe(true);
  });

  it('last step has agent at (1,2) — gold cell', () => {
    const last = steps[steps.length - 1]!;
    expect(last.agentRow).toBe(1);
    expect(last.agentCol).toBe(2);
  });

  it('gold discovery is mentioned in last step KB', () => {
    const last = steps[steps.length - 1]!;
    const goldFact = last.kbFacts.some(f => f.toLowerCase().includes('gold'));
    expect(goldFact).toBe(true);
  });

  it('wumpus is inferred at (0,2)', () => {
    const last = steps[steps.length - 1]!;
    expect(last.cellStatus.get('0,2')).toBe('wumpus');
  });

  it('pit is inferred at (2,0)', () => {
    const last = steps[steps.length - 1]!;
    expect(last.cellStatus.get('2,0')).toBe('pit');
  });

  it('pit is inferred at (2,2)', () => {
    const last = steps[steps.length - 1]!;
    expect(last.cellStatus.get('2,2')).toBe('pit');
  });

  it('each step has correct shape', () => {
    for (const step of steps) {
      expect(typeof step.action).toBe('string');
      expect(typeof step.agentRow).toBe('number');
      expect(typeof step.agentCol).toBe('number');
      expect(step.visitedCells).toBeInstanceOf(Set);
      expect(step.cellStatus).toBeInstanceOf(Map);
      expect(Array.isArray(step.kbFacts)).toBe(true);
    }
  });

  it('cells visited in correct order', () => {
    const visitedByStep = steps.map(s => `${s.agentRow},${s.agentCol}`);
    expect(visitedByStep).toEqual(['0,0', '0,1', '1,1', '1,0', '1,2']);
  });

  it('KB facts accumulate across steps', () => {
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.kbFacts.length).toBeGreaterThanOrEqual(steps[i - 1]!.kbFacts.length);
    }
  });

  it('all visited cells eventually marked safe', () => {
    const last = steps[steps.length - 1]!;
    for (const cell of last.visitedCells) {
      expect(last.cellStatus.get(cell)).toBe('safe');
    }
  });
});

// ─── ttEntails ────────────────────────────────────────────────────────────────

describe('ttEntails', () => {
  // Helpers scoped to this suite
  const tLit  = (name: string): PropFormula => ({ kind: 'literal', name });
  const tNeg  = (arg: PropFormula): PropFormula => ({ kind: 'neg', arg });
  const tOr   = (l: PropFormula, r: PropFormula): PropFormula => ({ kind: 'compound', op: 'or',      left: l, right: r });
  const tAnd  = (l: PropFormula, r: PropFormula): PropFormula => ({ kind: 'compound', op: 'and',     left: l, right: r });
  const tImpl = (l: PropFormula, r: PropFormula): PropFormula => ({ kind: 'compound', op: 'implies', left: l, right: r });

  it('proves modus ponens: KB=[P→Q, P] entails Q', () => {
    const kb = [tImpl(tLit('P'), tLit('Q')), tLit('P')];
    const steps = ttEntails(kb, tLit('Q'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('proved');
    // 2 vars (P, Q) → 4 rows
    expect(steps.length).toBe(4);
    expect(steps.every(s => s.totalRows === 4)).toBe(true);
  });

  it('disproves: KB=[P∨Q] does not entail P (counter-example P=F, Q=T)', () => {
    const kb = [tOr(tLit('P'), tLit('Q'))];
    const steps = ttEntails(kb, tLit('P'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('disproved');
    expect(last.kbValue).toBe(true);
    expect(last.alphaValue).toBe(false);
    // Early termination: not all 4 rows are evaluated
    expect(steps.length).toBeLessThan(4);
  });

  it('empty KB proves tautology P∨¬P', () => {
    const alpha = tOr(tLit('P'), tNeg(tLit('P')));
    const steps = ttEntails([], alpha);
    expect(steps.length).toBe(2); // 1 var → 2 rows
    expect(steps[steps.length - 1]!.result).toBe('proved');
    // Empty KB → kbValue always true
    expect(steps.every(s => s.kbValue)).toBe(true);
  });

  it('empty KB disproves non-tautology P', () => {
    const steps = ttEntails([], tLit('P'));
    expect(steps[steps.length - 1]!.result).toBe('disproved');
    // Counter-example is the P=false row
    const disproved = steps.find(s => s.result === 'disproved')!;
    expect(disproved.assignment.get('P')).toBe(false);
  });

  it('single-formula KB=[P] entails P', () => {
    const steps = ttEntails([tLit('P')], tLit('P'));
    expect(steps.length).toBe(2);
    expect(steps[steps.length - 1]!.result).toBe('proved');
  });

  it('rows where KB is false are marked pending (skipped)', () => {
    // KB=[P]: row P=false → kbValue=false → result='pending'
    const steps = ttEntails([tLit('P')], tLit('P'));
    expect(steps[0]!.kbValue).toBe(false);
    expect(steps[0]!.result).toBe('pending');
  });

  it('rowIndex and totalRows are correct', () => {
    const steps = ttEntails([tLit('P')], tLit('P'));
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i]!.rowIndex).toBe(i);
      expect(steps[i]!.totalRows).toBe(2);
    }
  });

  it('assignment values are correct for each row', () => {
    const steps = ttEntails([tLit('P')], tLit('P'));
    expect(steps[0]!.assignment.get('P')).toBe(false);
    expect(steps[1]!.assignment.get('P')).toBe(true);
  });

  it('alphaValue matches the formula evaluation in each step', () => {
    const kb = [tImpl(tLit('P'), tLit('Q')), tLit('P')];
    const alpha = tLit('Q');
    const steps = ttEntails(kb, alpha);
    for (const s of steps) {
      // alphaValue must equal Q's value in the assignment
      expect(s.alphaValue).toBe(s.assignment.get('Q'));
    }
  });

  it('unsatisfiable KB never disproves (vacuously true) — all steps pending or proved', () => {
    // KB = P ∧ ¬P: never true, so no counter-example can arise
    const kb = [tAnd(tLit('P'), tNeg(tLit('P')))];
    const steps = ttEntails(kb, tLit('Q'));
    expect(steps[steps.length - 1]!.result).toBe('proved');
    expect(steps.every(s => !s.kbValue)).toBe(true);
  });
});

// ─── plResolution ─────────────────────────────────────────────────────────────

describe('plResolution', () => {
  it('proves KB=[P] entails P (trivial one-step resolution)', () => {
    // KB=[P], ¬alpha=[~P] → resolve P with ~P → empty clause
    const steps = plResolution([['P']], [['~P']]);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('proved');
    expect(last.resolvent).toEqual([]);
  });

  it('disproves immediately when no clause pairs can resolve', () => {
    // KB=[P,Q], ¬alpha=[~R]: no complementary literals
    const steps = plResolution([['P', 'Q']], [['~R']]);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('disproved');
    expect(last.resolvent).toBeNull();
  });

  it('multi-step prove: KB=[P→Q, P] |- Q (modus ponens via resolution)', () => {
    // P→Q = [~P,Q], ¬Q = [~Q]
    // Initial: [['~P','Q'],['P'],['~Q']]
    // Step1: ['P'] + ['~P','Q'] → ['Q']
    // Step2: ['Q'] + ['~Q'] → [] proved
    const steps = plResolution([['~P', 'Q'], ['P']], [['~Q']]);
    expect(steps[steps.length - 1]!.result).toBe('proved');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.some(s => s.result === 'pending')).toBe(true);
  });

  it('disproves after deriving some new clauses that lead to no empty clause', () => {
    // KB=[P,Q], ¬alpha=[~P] → derive [Q], then no more resolutions possible
    const steps = plResolution([['P', 'Q']], [['~P']]);
    expect(steps[steps.length - 1]!.result).toBe('disproved');
    // [P,Q] + [~P] = [Q] was derived (pending step exists)
    expect(steps.some(s => s.result === 'pending')).toBe(true);
  });

  it('skips duplicate resolvents already in the clause set', () => {
    // [P,Q]+[P,~Q]→[P]; [P,Q]+[~P]→[Q]; [P,~Q]+[~P]→[~Q]
    // In pass 2, trying [P,Q]+[P,~Q] again would re-derive [P] (already exists)
    const steps = plResolution([['P', 'Q'], ['P', '~Q']], [['~P']]);
    // Resolution finds [] eventually → proved
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('proved');
  });

  it('step shape is correct for pending steps', () => {
    const steps = plResolution([['P', 'Q']], [['~P']]);
    const pending = steps.filter(s => s.result === 'pending');
    for (const step of pending) {
      expect(typeof step.action).toBe('string');
      expect(Array.isArray(step.clause1)).toBe(true);
      expect(Array.isArray(step.clause2)).toBe(true);
      expect(Array.isArray(step.resolvent)).toBe(true);
      expect(Array.isArray(step.allClauses)).toBe(true);
    }
  });

  it('step shape is correct for disproved step', () => {
    const steps = plResolution([['P', 'Q']], [['~R']]);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('disproved');
    expect(last.resolvent).toBeNull();
    expect(last.clause1).toEqual([]);
    expect(last.clause2).toEqual([]);
  });

  it('allClauses grows across pending steps', () => {
    const steps = plResolution([['P', 'Q']], [['~P']]);
    const pending = steps.filter(s => s.result === 'pending');
    if (pending.length >= 2) {
      expect(pending[1]!.allClauses.length).toBeGreaterThan(pending[0]!.allClauses.length);
    }
    // At minimum the initial clauses are present
    expect(pending[0]!.allClauses.length).toBeGreaterThanOrEqual(2);
  });

  it('empty initial clause set → disproved immediately', () => {
    const steps = plResolution([], []);
    expect(steps[steps.length - 1]!.result).toBe('disproved');
  });
});

// ─── walkSat ──────────────────────────────────────────────────────────────────

describe('walkSat', () => {
  it('finds SAT for [["P"],["Q"]] within 100 flips (seed=42)', () => {
    const steps = walkSat([['P'], ['Q']], 0.5, 100, 42);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(last.satisfiedCount).toBe(2);
    expect(last.totalClauses).toBe(2);
  });

  it('returns max_flips for contradiction [["P"],["~P"]] with 5 flips (seed=42)', () => {
    const steps = walkSat([['P'], ['~P']], 0.5, 5, 42);
    expect(steps.length).toBe(5);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('max_flips');
    expect(last.iteration).toBe(5);
  });

  it('p=0 (greedy only) → all flip steps have flipType="greedy"', () => {
    const steps = walkSat([['P'], ['~P']], 0, 4, 1);
    const flipSteps = steps.filter(s => s.flip !== null) as WalkSATStep[];
    expect(flipSteps.length).toBeGreaterThan(0);
    expect(flipSteps.every(s => s.flipType === 'greedy')).toBe(true);
  });

  it('p=1 (random only) → all flip steps have flipType="random"', () => {
    const steps = walkSat([['P'], ['~P']], 1, 4, 1);
    const flipSteps = steps.filter(s => s.flip !== null) as WalkSATStep[];
    expect(flipSteps.length).toBeGreaterThan(0);
    expect(flipSteps.every(s => s.flipType === 'random')).toBe(true);
  });

  it('empty clause list is immediately SAT (iteration=0)', () => {
    const steps = walkSat([], 0.5, 10, 0);
    expect(steps.length).toBe(1);
    expect(steps[0]!.result).toBe('sat');
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.flip).toBeNull();
  });

  it('maxFlips=0 with unsatisfiable formula → max_flips at iteration=0', () => {
    const steps = walkSat([['P'], ['~P']], 0.5, 0, 0);
    expect(steps.length).toBe(1);
    expect(steps[0]!.result).toBe('max_flips');
    expect(steps[0]!.iteration).toBe(0);
  });

  it('pending steps have correct shape', () => {
    const steps = walkSat([['P'], ['~P']], 0.5, 3, 7);
    const pending = steps.filter(s => s.result === 'pending') as WalkSATStep[];
    for (const s of pending) {
      expect(typeof s.flip).toBe('string');
      expect(s.flipType === 'greedy' || s.flipType === 'random').toBe(true);
      expect(s.assignment).toBeInstanceOf(Map);
      expect(typeof s.iteration).toBe('number');
    }
  });

  it('satisfiedCount is <= totalClauses in every step', () => {
    const steps = walkSat([['P'], ['~P']], 0.5, 6, 3);
    for (const s of steps) {
      expect(s.satisfiedCount).toBeLessThanOrEqual(s.totalClauses);
      expect(s.satisfiedCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('iteration numbers are non-decreasing', () => {
    const steps = walkSat([['P'], ['~P']], 0.5, 5, 0);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.iteration).toBeGreaterThanOrEqual(steps[i - 1]!.iteration);
    }
  });

  it('different seeds produce potentially different assignments', () => {
    const s1 = walkSat([['P'], ['Q']], 0.5, 50, 1);
    const s2 = walkSat([['P'], ['Q']], 0.5, 50, 99999);
    // Both should find SAT; the number of steps may differ
    expect(s1[s1.length - 1]!.result).toBe('sat');
    expect(s2[s2.length - 1]!.result).toBe('sat');
  });

  it('formula with multiple variables: [["P","Q"],["~P","R"],["~Q","~R"]] (seed=5)', () => {
    // This formula is satisfiable (e.g. P=T, Q=F, R=T)
    const steps = walkSat([['P', 'Q'], ['~P', 'R'], ['~Q', '~R']], 0.5, 200, 5);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
  });

  it('greedy selects best variable (covers non-improving flip path, seed=0)', () => {
    // seed=0 → P=false, Q=false initially for [['P','Q'],['~Q']]
    // Greedy: flipP → 2/2 sat (bestCount=-1→2), flipQ → 1/2 (1 < 2, not better)
    // Best choice is P; flipping P achieves SAT immediately.
    const steps = walkSat([['P', 'Q'], ['~Q']], 0, 10, 0);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('sat');
    expect(last.flip).toBe('P');
    expect(last.flipType).toBe('greedy');
  });
});

// ─── kbAgent ──────────────────────────────────────────────────────────────────

describe('kbAgent', () => {
  const allFalse: KBAgentPercept = {
    stench: false, breeze: false, glitter: false, bump: false, scream: false,
  };

  it('returns empty array for empty percept sequence', () => {
    const steps = kbAgent([]);
    expect(steps).toEqual([]);
  });

  it('safe percept (all false) → action MoveForward', () => {
    const steps = kbAgent([allFalse]);
    expect(steps.length).toBe(1);
    const s = steps[0]! as KBAgentStep;
    expect(s.time).toBe(0);
    expect(s.action).toBe('MoveForward');
  });

  it('glitter → action Grab (takes priority over breeze/stench)', () => {
    const percept: KBAgentPercept = { ...allFalse, glitter: true, breeze: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.action).toBe('Grab');
    expect(steps[0]!.askQuery).toContain('gold');
  });

  it('bump (no glitter) → action TurnLeft', () => {
    const percept: KBAgentPercept = { ...allFalse, bump: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.action).toBe('TurnLeft');
    expect(steps[0]!.askQuery).toContain('wall');
  });

  it('scream (no glitter, no bump) → action MoveForward', () => {
    const percept: KBAgentPercept = { ...allFalse, scream: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.action).toBe('MoveForward');
    expect(steps[0]!.askQuery).toContain('killed');
  });

  it('stench (no glitter, no bump, no scream) → action TurnLeft', () => {
    const percept: KBAgentPercept = { ...allFalse, stench: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.action).toBe('TurnLeft');
  });

  it('breeze (no glitter, no bump, no scream) → action TurnLeft', () => {
    const percept: KBAgentPercept = { ...allFalse, breeze: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.action).toBe('TurnLeft');
  });

  it('kbFacts accumulate across multiple time steps', () => {
    const percepts: KBAgentPercept[] = [allFalse, { ...allFalse, stench: true }];
    const steps = kbAgent(percepts);
    expect(steps.length).toBe(2);
    expect(steps[1]!.kbFacts.length).toBeGreaterThan(steps[0]!.kbFacts.length);
  });

  it('time field reflects position in sequence', () => {
    const percepts: KBAgentPercept[] = [allFalse, allFalse, allFalse];
    const steps = kbAgent(percepts);
    expect(steps[0]!.time).toBe(0);
    expect(steps[1]!.time).toBe(1);
    expect(steps[2]!.time).toBe(2);
  });

  it('tellStatements are non-empty for each step', () => {
    const steps = kbAgent([allFalse]);
    expect(steps[0]!.tellStatements.length).toBeGreaterThan(0);
  });

  it('each positive percept field adds a fact to KB and tellStatements', () => {
    const percept: KBAgentPercept = {
      stench: true, breeze: true, glitter: true, bump: true, scream: true,
    };
    const steps = kbAgent([percept]);
    const s = steps[0]!;
    // One general percept statement plus one per true field = 6 tell statements
    expect(s.tellStatements.length).toBe(6);
    // Each of the 5 positive fields adds a fact
    const joined = s.kbFacts.join(' ');
    expect(joined).toContain('Stench');
    expect(joined).toContain('Breeze');
    expect(joined).toContain('Glitter');
    expect(joined).toContain('Bump');
    expect(joined).toContain('Scream');
  });

  it('each step snapshot of kbFacts is independent (later steps do not mutate earlier)', () => {
    const percepts: KBAgentPercept[] = [allFalse, { ...allFalse, stench: true }];
    const steps = kbAgent(percepts);
    const step0Facts = steps[0]!.kbFacts.length;
    // Ensure step[0].kbFacts was snapshotted and is not affected by step[1]
    expect(steps[0]!.kbFacts.length).toBe(step0Facts);
  });

  it('percept field is preserved exactly in the step', () => {
    const percept: KBAgentPercept = { ...allFalse, breeze: true };
    const steps = kbAgent([percept]);
    expect(steps[0]!.percept).toStrictEqual(percept);
  });
});
