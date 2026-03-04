import { describe, it, expect } from 'vitest';
import {
  evaluateFormula,
  extractVariables,
  generateTruthTable,
  dpll,
  exploreWumpusWorld,
  type PropFormula,
  type CNF,
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
