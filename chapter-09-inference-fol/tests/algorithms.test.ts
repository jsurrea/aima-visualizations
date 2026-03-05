import { describe, it, expect } from 'vitest';
import {
  occursIn,
  applySubstitution,
  termToLatex,
  unify,
  forwardChain,
  backwardChain,
  universalInstantiation,
  literalToString,
  clauseToLatex,
  resolve,
  propositionalResolution,
  type FOLTerm,
  type Substitution,
  type HornClause,
  type CNFClause,
  type Literal,
} from '../src/algorithms/index';

// ─── helpers ────────────────────────────────────────────────────────────────
const v = (name: string): FOLTerm => ({ kind: 'var', name });
const c = (name: string): FOLTerm => ({ kind: 'const', name });
const fn = (name: string, args: FOLTerm[]): FOLTerm => ({ kind: 'fn', name, args });

function makeSubst(entries: [string, FOLTerm][]): Substitution {
  return new Map(entries);
}

function lit(predicate: string, args: string[], negated: boolean): Literal {
  return { predicate, args, negated };
}

function clause(id: string, literals: Literal[], source: CNFClause['source']): CNFClause {
  return { id, literals, source };
}

// ─── occursIn ───────────────────────────────────────────────────────────────
describe('occursIn', () => {
  it('returns true when variable matches var node', () => {
    expect(occursIn('x', v('x'))).toBe(true);
  });

  it('returns false when variable does not match var node', () => {
    expect(occursIn('x', v('y'))).toBe(false);
  });

  it('returns false for const (always)', () => {
    expect(occursIn('x', c('x'))).toBe(false);
    expect(occursIn('a', c('a'))).toBe(false);
  });

  it('returns true when variable found in fn args', () => {
    expect(occursIn('x', fn('f', [c('a'), v('x')]))).toBe(true);
  });

  it('returns false when variable not in fn args', () => {
    expect(occursIn('x', fn('f', [c('a'), v('y')]))).toBe(false);
  });

  it('returns true when variable found deep in nested fn', () => {
    expect(occursIn('x', fn('f', [fn('g', [v('x')])]))).toBe(true);
  });

  it('returns false for empty fn args', () => {
    expect(occursIn('x', fn('f', []))).toBe(false);
  });
});

// ─── applySubstitution ──────────────────────────────────────────────────────
describe('applySubstitution', () => {
  it('substitutes a bound variable', () => {
    const theta = makeSubst([['x', c('a')]]);
    expect(applySubstitution(v('x'), theta)).toEqual(c('a'));
  });

  it('returns unbound variable as-is', () => {
    const theta = makeSubst([]);
    expect(applySubstitution(v('y'), theta)).toEqual(v('y'));
  });

  it('chases variable chains (var → var → const)', () => {
    const theta = makeSubst([['x', v('y')], ['y', c('a')]]);
    expect(applySubstitution(v('x'), theta)).toEqual(c('a'));
  });

  it('returns const unchanged', () => {
    const theta = makeSubst([['a', c('b')]]);
    expect(applySubstitution(c('a'), theta)).toEqual(c('a'));
  });

  it('applies substitution inside fn args', () => {
    const theta = makeSubst([['x', c('a')], ['y', c('b')]]);
    const term = fn('f', [v('x'), v('y')]);
    const result = applySubstitution(term, theta);
    expect(result).toEqual(fn('f', [c('a'), c('b')]));
  });

  it('leaves unbound vars in fn args', () => {
    const theta = makeSubst([]);
    const term = fn('f', [v('x')]);
    expect(applySubstitution(term, theta)).toEqual(fn('f', [v('x')]));
  });
});

// ─── termToLatex ────────────────────────────────────────────────────────────
describe('termToLatex', () => {
  it('renders var', () => {
    expect(termToLatex(v('x'))).toBe('{x}');
  });

  it('renders const', () => {
    expect(termToLatex(c('Tom'))).toBe('Tom');
  });

  it('renders fn with no args', () => {
    expect(termToLatex(fn('c', []))).toBe('c');
  });

  it('renders fn with args', () => {
    expect(termToLatex(fn('f', [v('x'), c('a')]))).toBe('f({x}, a)');
  });

  it('renders nested fn', () => {
    expect(termToLatex(fn('f', [fn('g', [v('y')])]))).toBe('f(g({y}))');
  });
});

// ─── unify ───────────────────────────────────────────────────────────────────
describe('unify', () => {
  it('two identical vars → success', () => {
    const steps = unify(v('x'), v('x'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
  });

  it('two identical consts → success', () => {
    const steps = unify(c('a'), c('a'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
  });

  it('var unified with const → success with binding', () => {
    const steps = unify(v('x'), c('a'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(c('a'));
  });

  it('two different consts → failure', () => {
    const steps = unify(c('a'), c('b'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('const unified with var → success (symmetric)', () => {
    const steps = unify(c('a'), v('x'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(c('a'));
  });

  it('f(x, g(y)) unify f(a, g(b)) → success', () => {
    const t1 = fn('f', [v('x'), fn('g', [v('y')])]);
    const t2 = fn('f', [c('a'), fn('g', [c('b')])]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(c('a'));
    expect(last.theta.get('y')).toEqual(c('b'));
  });

  it('f(x, x) unify f(a, b) → failure (x cannot be both a and b)', () => {
    const t1 = fn('f', [v('x'), v('x')]);
    const t2 = fn('f', [c('a'), c('b')]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('different function names → failure', () => {
    const t1 = fn('f', [c('a')]);
    const t2 = fn('g', [c('a')]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('different arities → failure', () => {
    const t1 = fn('f', [c('a'), c('b')]);
    const t2 = fn('f', [c('a')]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('occurs check: x unify f(x) → failure', () => {
    const steps = unify(v('x'), fn('f', [v('x')]));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
    expect(last.action).toMatch(/occurs check/i);
  });

  it('occurs check symmetric: f(x) unify x → failure', () => {
    const steps = unify(fn('f', [v('x')]), v('x'));
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('f(x, g(x)) unify f(g(y), y) → failure (occurs check on circular term)', () => {
    // After binding x=g(y) from first arg pair, the second pair becomes g(g(y)) vs y.
    // Attempting to bind y=g(g(y)) triggers the occurs check → failure.
    const t1 = fn('f', [v('x'), fn('g', [v('x')])]);
    const t2 = fn('f', [fn('g', [v('y')]), v('y')]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('returns at least one step', () => {
    expect(unify(c('a'), c('a')).length).toBeGreaterThan(0);
  });

  it('identical pair in middle produces pending step (not final)', () => {
    // f(a, c) vs f(a, b) → decompose, then [a,a] is identical but NOT final (pending), then [c,b] fails
    const t1 = fn('f', [c('a'), c('c')]);
    const t2 = fn('f', [c('a'), c('b')]);
    const steps = unify(t1, t2);
    const pendingIdentical = steps.find((s) => s.action.includes('identical') && s.result === 'pending');
    expect(pendingIdentical).toBeDefined();
  });

  it('right-is-var with more pairs produces pending step', () => {
    // f(a, x) vs f(y, b) → decompose → [a,y] right-is-var pending, then [x,b] left-is-var success
    const t1 = fn('f', [c('a'), v('x')]);
    const t2 = fn('f', [v('y'), c('b')]);
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    // A right-is-var pending step must exist
    const rightVarPending = steps.find((s) => s.action.includes('\\mapsto') && s.result === 'pending');
    expect(rightVarPending).toBeDefined();
  });

  it('intermediate steps have result pending', () => {
    const t1 = fn('f', [v('x'), v('y')]);
    const t2 = fn('f', [c('a'), c('b')]);
    const steps = unify(t1, t2);
    const pendingSteps = steps.filter((s) => s.result === 'pending');
    expect(pendingSteps.length).toBeGreaterThan(0);
  });

  it('empty step list not returned (always at least one step)', () => {
    expect(unify(v('x'), v('y')).length).toBeGreaterThan(0);
  });

  it('fn with zero args unified with same fn zero args → success', () => {
    const steps = unify(fn('c', []), fn('c', []));
    // After decompose (0 arg pairs), remaining is empty → success
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
  });
});

// ─── forwardChain ────────────────────────────────────────────────────────────
describe('forwardChain', () => {
  const parentRules: HornClause[] = [
    {
      head: 'Ancestor',
      headArgs: ['x', 'y'],
      body: [{ predicate: 'Parent', args: ['x', 'y'] }],
    },
    {
      head: 'Ancestor',
      headArgs: ['x', 'z'],
      body: [
        { predicate: 'Ancestor', args: ['x', 'y'] },
        { predicate: 'Parent', args: ['y', 'z'] },
      ],
    },
  ];

  it('query already in initial facts → immediate success', () => {
    const steps = forwardChain(parentRules, ['Ancestor(Tom,Bob)'], 'Ancestor(Tom,Bob)');
    expect(steps.some((s) => s.action.includes('found in initial facts'))).toBe(true);
  });

  it('single-step chain: Parent → Ancestor', () => {
    const steps = forwardChain(parentRules, ['Parent(Tom,Bob)'], 'Ancestor(Tom,Bob)');
    const queryFound = steps.some((s) => s.action.includes('found'));
    expect(queryFound).toBe(true);
  });

  it('multi-step chain: derives Ancestor(Tom,Ann)', () => {
    const steps = forwardChain(
      parentRules,
      ['Parent(Tom,Bob)', 'Parent(Bob,Ann)'],
      'Ancestor(Tom,Ann)',
    );
    const facts = steps[steps.length - 1]!.facts;
    expect(facts).toContain('Ancestor(Tom,Ann)');
  });

  it('fixed point reached when query not provable', () => {
    const steps = forwardChain(parentRules, ['Parent(Tom,Bob)'], 'Ancestor(Bob,Tom)');
    const last = steps[steps.length - 1]!;
    expect(last.action).toMatch(/fixed point/i);
  });

  it('empty body clause fires unconditionally', () => {
    const factRule: HornClause = {
      head: 'Known',
      headArgs: [],
      body: [],
    };
    const steps = forwardChain([factRule], [], 'Known');
    expect(steps.some((s) => s.newFact === 'Known')).toBe(true);
  });

  it('emits initialize step first', () => {
    const steps = forwardChain(parentRules, ['Parent(Tom,Bob)'], 'Ancestor(Tom,Bob)');
    expect(steps[0]!.action).toBe('Initialize facts');
  });

  it('does not re-add existing facts', () => {
    const steps = forwardChain(parentRules, ['Parent(Tom,Bob)', 'Ancestor(Tom,Bob)'], 'Ancestor(Tom,Bob)');
    const derivedSteps = steps.filter((s) => s.newFact === 'Ancestor(Tom,Bob)');
    // Should not be derived again because it's already in initial facts
    expect(derivedSteps.length).toBe(0);
  });

  it('handles no-args predicate in body', () => {
    const rule: HornClause = {
      head: 'Result',
      headArgs: [],
      body: [{ predicate: 'Input', args: [] }],
    };
    const steps = forwardChain([rule], ['Input'], 'Result');
    expect(steps.some((s) => s.newFact === 'Result')).toBe(true);
  });

  it('handles binding conflict (same var must map to different consts)', () => {
    // Rule: SamePair(x,x) → Reflexive(x)
    // This requires x to be bound consistently to both args; SamePair(Tom,Bob) can't match.
    const rule: HornClause = {
      head: 'Reflexive',
      headArgs: ['x'],
      body: [{ predicate: 'SamePair', args: ['x', 'x'] }],
    };
    // SamePair(Tom,Bob): first arg binds x=Tom, second arg tries to bind x=Bob → conflict
    // SamePair(Ann,Ann): first arg binds x=Ann, second arg consistent x=Ann → OK
    const steps = forwardChain([rule], ['SamePair(Tom,Bob)', 'SamePair(Ann,Ann)'], 'Reflexive(Ann)');
    expect(steps.some((s) => s.newFact === 'Reflexive(Ann)')).toBe(true);
    expect(steps.some((s) => s.newFact === 'Reflexive(Tom)')).toBe(false);
  });

  it('ignores malformed facts (empty predicate before paren)', () => {
    // "(Tom)" — parenIdx=0, empty predicate → parseFact returns null → safely skipped
    const rule: HornClause = {
      head: 'Q',
      headArgs: [],
      body: [{ predicate: 'P', args: [] }],
    };
    const steps = forwardChain([rule], ['(Tom)', 'P'], 'Q');
    expect(steps.some((s) => s.newFact === 'Q')).toBe(true);
  });

  it('ignores facts with wrong arity', () => {
    // Rule expects P(x,y) (2 args) but fact P(Tom) has 1 arg → args length mismatch → skipped
    const rule: HornClause = {
      head: 'Q',
      headArgs: ['x', 'y'],
      body: [{ predicate: 'P', args: ['x', 'y'] }],
    };
    const steps = forwardChain([rule], ['P(Tom)'], 'Q(Tom,Bob)');
    const last = steps[steps.length - 1]!;
    expect(last.action).toMatch(/fixed point/i);
  });
});

// ─── literalToString ─────────────────────────────────────────────────────────
describe('literalToString', () => {
  it('positive literal with args', () => {
    expect(literalToString(lit('P', ['a', 'b'], false))).toBe('P(a,b)');
  });

  it('negated literal with args', () => {
    expect(literalToString(lit('P', ['a'], true))).toBe('¬P(a)');
  });

  it('positive literal no args', () => {
    expect(literalToString(lit('Q', [], false))).toBe('Q');
  });

  it('negated literal no args', () => {
    expect(literalToString(lit('R', [], true))).toBe('¬R');
  });
});

// ─── clauseToLatex ───────────────────────────────────────────────────────────
describe('clauseToLatex', () => {
  it('single literal clause', () => {
    const cl = clause('c1', [lit('P', [], false)], 'kb');
    expect(clauseToLatex(cl)).toBe('P');
  });

  it('multiple literals', () => {
    const cl = clause('c1', [lit('P', [], false), lit('Q', [], true)], 'kb');
    expect(clauseToLatex(cl)).toBe('P \\lor ¬Q');
  });

  it('empty clause renders as square', () => {
    const cl = clause('c1', [], 'derived');
    expect(clauseToLatex(cl)).toBe('\\square');
  });
});

// ─── resolve ─────────────────────────────────────────────────────────────────
describe('resolve', () => {
  it('returns null when no complementary literals', () => {
    const c1 = clause('c1', [lit('P', [], false)], 'kb');
    const c2 = clause('c2', [lit('Q', [], false)], 'kb');
    expect(resolve(c1, c2, 'c3')).toBeNull();
  });

  it('produces correct resolvent', () => {
    const c1 = clause('c1', [lit('P', [], false), lit('Q', [], false)], 'kb');
    const c2 = clause('c2', [lit('P', [], true), lit('R', [], false)], 'kb');
    const result = resolve(c1, c2, 'c3');
    expect(result).not.toBeNull();
    const lits = result!.literals.map(literalToString).sort();
    expect(lits).toContain('Q');
    expect(lits).toContain('R');
  });

  it('produces empty resolvent (empty clause)', () => {
    const c1 = clause('c1', [lit('P', [], false)], 'kb');
    const c2 = clause('c2', [lit('P', [], true)], 'kb');
    const result = resolve(c1, c2, 'c3');
    expect(result).not.toBeNull();
    expect(result!.literals.length).toBe(0);
  });

  it('sets id and source on resolvent', () => {
    const c1 = clause('c1', [lit('P', [], false)], 'kb');
    const c2 = clause('c2', [lit('P', [], true)], 'kb');
    const result = resolve(c1, c2, 'c99');
    expect(result!.id).toBe('c99');
    expect(result!.source).toBe('derived');
  });

  it('avoids duplicate literals in resolvent', () => {
    const c1 = clause('c1', [lit('P', [], false), lit('Q', [], false)], 'kb');
    const c2 = clause('c2', [lit('P', [], true), lit('Q', [], false)], 'kb');
    const result = resolve(c1, c2, 'c3');
    expect(result).not.toBeNull();
    const qCount = result!.literals.filter((l) => l.predicate === 'Q').length;
    expect(qCount).toBe(1);
  });

  it('resolves literals with args', () => {
    const c1 = clause('c1', [lit('P', ['a', 'b'], false)], 'kb');
    const c2 = clause('c2', [lit('P', ['a', 'b'], true)], 'kb');
    const result = resolve(c1, c2, 'c3');
    expect(result).not.toBeNull();
    expect(result!.literals.length).toBe(0);
  });

  it('returns null when args differ', () => {
    const c1 = clause('c1', [lit('P', ['a'], false)], 'kb');
    const c2 = clause('c2', [lit('P', ['b'], true)], 'kb');
    expect(resolve(c1, c2, 'c3')).toBeNull();
  });
});

// ─── propositionalResolution ─────────────────────────────────────────────────
describe('propositionalResolution', () => {
  it('derives empty clause and resolves (simple P, ¬P case)', () => {
    const kb = [clause('c1', [lit('P', [], false)], 'kb')];
    const goal = clause('c2', [lit('P', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    const last = steps[steps.length - 1]!;
    expect(last.resolved).toBe(true);
  });

  it('includes all clauses in each step', () => {
    const kb = [clause('c1', [lit('P', [], false)], 'kb')];
    const goal = clause('c2', [lit('P', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    steps.forEach((s) => expect(s.allClauses.length).toBeGreaterThan(0));
  });

  it('fixed point reached when no resolution possible', () => {
    const kb = [
      clause('c1', [lit('P', [], false)], 'kb'),
      clause('c2', [lit('Q', [], false)], 'kb'),
    ];
    const goal = clause('c3', [lit('R', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    const last = steps[steps.length - 1]!;
    expect(last.resolved).toBe(false);
    expect(last.action).toMatch(/fixed point/i);
  });

  it('multi-step resolution (P∨Q, ¬P∨R, ¬Q∨R, ¬R → empty)', () => {
    const kb = [
      clause('c1', [lit('P', [], false), lit('Q', [], false)], 'kb'),
      clause('c2', [lit('P', [], true), lit('R', [], false)], 'kb'),
      clause('c3', [lit('Q', [], true), lit('R', [], false)], 'kb'),
    ];
    const goal = clause('c4', [lit('R', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    const anyResolved = steps.some((s) => s.resolved);
    expect(anyResolved).toBe(true);
  });

  it('deduplicates identical resolvents', () => {
    const kb = [
      clause('c1', [lit('P', [], false), lit('Q', [], false)], 'kb'),
      clause('c2', [lit('P', [], true), lit('Q', [], false)], 'kb'),
    ];
    const goal = clause('c3', [lit('Q', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    // Just check it terminates
    expect(steps.length).toBeGreaterThan(0);
  });

  it('each step has clause1Id and clause2Id set when resolving', () => {
    const kb = [clause('c1', [lit('P', [], false)], 'kb')];
    const goal = clause('c2', [lit('P', [], true)], 'negated-goal');
    const steps = propositionalResolution(kb, goal);
    const resolvingSteps = steps.filter((s) => s.clause1Id !== '');
    expect(resolvingSteps.length).toBeGreaterThan(0);
  });
});

// ─── backwardChain ───────────────────────────────────────────────────────────

const BC_CRIME_CLAUSES: HornClause[] = [
  // Missile(x) ∧ Owns(Nono,x) → Sells(West,x,Nono)
  {
    head: 'Sells',
    headArgs: ['West', 'x', 'Nono'],
    body: [
      { predicate: 'Missile', args: ['x'] },
      { predicate: 'Owns', args: ['Nono', 'x'] },
    ],
  },
  // Missile(x) → Weapon(x)
  {
    head: 'Weapon',
    headArgs: ['x'],
    body: [{ predicate: 'Missile', args: ['x'] }],
  },
  // Enemy(x,America) → Hostile(x)
  {
    head: 'Hostile',
    headArgs: ['x'],
    body: [{ predicate: 'Enemy', args: ['x', 'America'] }],
  },
  // American(x) ∧ Weapon(y) ∧ Sells(x,y,z) ∧ Hostile(z) → Criminal(x)
  {
    head: 'Criminal',
    headArgs: ['x'],
    body: [
      { predicate: 'American', args: ['x'] },
      { predicate: 'Weapon', args: ['y'] },
      { predicate: 'Sells', args: ['x', 'y', 'z'] },
      { predicate: 'Hostile', args: ['z'] },
    ],
  },
];

const BC_CRIME_FACTS = [
  'American(West)',
  'Enemy(Nono,America)',
  'Owns(Nono,M1)',
  'Missile(M1)',
];

describe('backwardChain', () => {
  it('proves Criminal(West) from crime KB', () => {
    const steps = backwardChain(BC_CRIME_CLAUSES, BC_CRIME_FACTS, 'Criminal(West)');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
    expect(last.failed).toBe(false);
  });

  it('first step is initialization', () => {
    const steps = backwardChain(BC_CRIME_CLAUSES, BC_CRIME_FACTS, 'Criminal(West)');
    expect(steps[0]!.action).toContain('Start backward chaining');
    expect(steps[0]!.currentGoal).toBe('Criminal(West)');
  });

  it('proves a direct fact in one match step', () => {
    const steps = backwardChain([], ['Foo(bar)'], 'Foo(bar)');
    expect(steps.some((s) => s.action.includes('matched fact'))).toBe(true);
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('returns failure for unprovable query', () => {
    const steps = backwardChain([], ['Foo(a)'], 'Bar(x)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
    expect(last.succeeded).toBe(false);
  });

  it('uses rules to derive new facts', () => {
    const rules: HornClause[] = [
      {
        head: 'Ancestor',
        headArgs: ['x', 'y'],
        body: [{ predicate: 'Parent', args: ['x', 'y'] }],
      },
    ];
    const facts = ['Parent(Tom,Bob)'];
    const steps = backwardChain(rules, facts, 'Ancestor(Tom,Bob)');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('each step has required fields', () => {
    const steps = backwardChain(BC_CRIME_CLAUSES, BC_CRIME_FACTS, 'Criminal(West)');
    for (const step of steps) {
      expect(typeof step.action).toBe('string');
      expect(typeof step.currentGoal).toBe('string');
      expect(step.node).toBeDefined();
      expect(Array.isArray(step.proofNodes)).toBe(true);
      expect(step.bindings).toBeDefined();
    }
  });

  it('proof nodes have status field', () => {
    const steps = backwardChain(BC_CRIME_CLAUSES, BC_CRIME_FACTS, 'Criminal(West)');
    const lastStep = steps[steps.length - 1]!;
    for (const node of lastStep.proofNodes) {
      expect(['success', 'failure', 'pending']).toContain(node.status);
    }
  });

  it('handles depth limit — returns failure when maxDepth=0 and no fact match', () => {
    const rules: HornClause[] = [
      {
        head: 'A',
        headArgs: ['x'],
        body: [{ predicate: 'B', args: ['x'] }],
      },
    ];
    const steps = backwardChain(rules, [], 'A(foo)', 0);
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });

  it('proves query that is already in facts (no rules needed)', () => {
    const steps = backwardChain([], ['Criminal(West)'], 'Criminal(West)');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('handles fact with no arguments', () => {
    const steps = backwardChain([], ['Raining'], 'Raining');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('handles rule with no body (unconditional fact as rule)', () => {
    const rules: HornClause[] = [
      { head: 'Happy', headArgs: [], body: [] },
    ];
    const steps = backwardChain(rules, [], 'Happy');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('backtracks when first rule fails', () => {
    const rules: HornClause[] = [
      // Rule that can't fire (no facts for P)
      { head: 'Q', headArgs: [], body: [{ predicate: 'P', args: [] }] },
      // Rule that can fire (no body)
      { head: 'Q', headArgs: [], body: [] },
    ];
    const steps = backwardChain(rules, [], 'Q');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
    // Should have a backtracking step
    expect(steps.some((s) => s.action.includes('backtracking'))).toBe(true);
  });

  it('produces proof nodes at different depths', () => {
    const steps = backwardChain(BC_CRIME_CLAUSES, BC_CRIME_FACTS, 'Criminal(West)');
    const lastStep = steps[steps.length - 1]!;
    const depths = lastStep.proofNodes.map((n) => n.depth);
    expect(Math.max(...depths)).toBeGreaterThan(0);
  });

  it('fails when goal constant args do not match fact constant args', () => {
    // Foo(Alpha) vs Foo(Beta) — both uppercase constants, constant clash
    const steps = backwardChain([], ['Foo(Alpha)'], 'Foo(Beta)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });

  it('fails when query has repeated variable that conflicts across fact positions', () => {
    // Query Pair(x,x): x must bind to Alpha AND Beta → conflict (exercises line 622 in index.ts)
    const steps = backwardChain([], ['Pair(Alpha,Beta)'], 'Pair(x,x)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });

  it('fails when rule head has repeated variable but goal has different constants there', () => {
    // Rule: Result(x,x) ← Foo(x); goal Result(Alpha,Beta): x_1 can't be both Alpha and Beta
    const rules: HornClause[] = [
      { head: 'Result', headArgs: ['x', 'x'], body: [{ predicate: 'Foo', args: ['x'] }] },
    ];
    const steps = backwardChain(rules, ['Foo(Alpha)'], 'Result(Alpha,Beta)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });

  it('ignores malformed facts with empty predicate', () => {
    // '(Alpha)' has empty predicate → parseFact returns null → skipped gracefully
    const steps = backwardChain([], ['(Alpha)', 'Foo(Alpha)'], 'Foo(Alpha)');
    const last = steps[steps.length - 1]!;
    expect(last.succeeded).toBe(true);
  });

  it('fails gracefully when query goal has malformed format', () => {
    // '(x)' has empty predicate — parseFact returns null inside solveGoal
    const steps = backwardChain([], ['Foo(Alpha)'], '(x)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });

  it('does not match facts with same predicate but different arity', () => {
    // Foo(Alpha,Beta) ≠ Foo(Alpha) — arity mismatch
    const steps = backwardChain([], ['Foo(Alpha,Beta)'], 'Foo(Alpha)');
    const last = steps[steps.length - 1]!;
    expect(last.failed).toBe(true);
  });
});

// ─── universalInstantiation ──────────────────────────────────────────────────

describe('universalInstantiation', () => {
  it('substitutes single ground term', () => {
    const steps = universalInstantiation('King(x) ∧ Greedy(x) ⇒ Evil(x)', 'x', ['John']);
    expect(steps.length).toBe(1);
    expect(steps[0]!.instantiated).toBe('King(John) ∧ Greedy(John) ⇒ Evil(John)');
    expect(steps[0]!.groundTerm).toBe('John');
    expect(steps[0]!.variable).toBe('x');
  });

  it('substitutes multiple ground terms', () => {
    const steps = universalInstantiation('King(x) ∧ Greedy(x) ⇒ Evil(x)', 'x', ['John', 'Richard']);
    expect(steps.length).toBe(2);
    expect(steps[0]!.instantiated).toBe('King(John) ∧ Greedy(John) ⇒ Evil(John)');
    expect(steps[1]!.instantiated).toBe('King(Richard) ∧ Greedy(Richard) ⇒ Evil(Richard)');
  });

  it('returns empty array for no ground terms', () => {
    const steps = universalInstantiation('King(x)', 'x', []);
    expect(steps.length).toBe(0);
  });

  it('description includes variable and ground term', () => {
    const steps = universalInstantiation('P(x)', 'x', ['a']);
    expect(steps[0]!.description).toContain('x');
    expect(steps[0]!.description).toContain('a');
  });

  it('does not substitute partial matches', () => {
    // 'xx' should not be substituted when variable is 'x'
    const steps = universalInstantiation('Foo(xx)', 'x', ['a']);
    expect(steps[0]!.instantiated).toBe('Foo(xx)');
  });

  it('preserves original formula', () => {
    const formula = 'Animal(x) ⇒ Alive(x)';
    const steps = universalInstantiation(formula, 'x', ['Cat']);
    expect(steps[0]!.original).toBe(formula);
  });
});
