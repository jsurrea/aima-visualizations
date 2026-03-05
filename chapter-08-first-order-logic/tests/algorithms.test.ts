import { describe, it, expect } from 'vitest';
import {
  FOLFormula,
  FOLTerm,
  formulaToLatex,
  buildSyntaxTree,
  occursIn,
  applySubstitution,
  unify,
  freeVariables,
  boundVariables,
  analyzeQuantifierScope,
  Substitution,
  getRepresentationLevels,
  getKinshipKB,
  getKnowledgeEngineeringSteps,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Helper formulas
// ---------------------------------------------------------------------------

const varX: FOLTerm = { kind: 'var', name: 'x' };
const varY: FOLTerm = { kind: 'var', name: 'y' };
const constA: FOLTerm = { kind: 'const', name: 'a' };
const constB: FOLTerm = { kind: 'const', name: 'b' };
const fnFxy: FOLTerm = { kind: 'fn', name: 'f', args: [varX, varY] };
const fnGx: FOLTerm = { kind: 'fn', name: 'g', args: [varX] };

const atomHuman: FOLFormula = { kind: 'atom', predicate: 'Human', args: [varX] };
const atomLoves: FOLFormula = { kind: 'atom', predicate: 'Loves', args: [varX, varY] };
const atomMortal: FOLFormula = { kind: 'atom', predicate: 'Mortal', args: [varY] };
const atomNoArgs: FOLFormula = { kind: 'atom', predicate: 'True', args: [] };
const eqFormula: FOLFormula = { kind: 'eq', left: varX, right: constA };

const negHuman: FOLFormula = { kind: 'neg', arg: atomHuman };
const andFormula: FOLFormula = { kind: 'and', left: atomHuman, right: atomLoves };
const orFormula: FOLFormula = { kind: 'or', left: atomHuman, right: atomLoves };
const impliesFormula: FOLFormula = { kind: 'implies', left: atomHuman, right: atomLoves };
const iffFormula: FOLFormula = { kind: 'iff', left: atomHuman, right: atomLoves };
const forallFormula: FOLFormula = { kind: 'forall', variable: 'x', body: atomHuman };
const existsFormula: FOLFormula = { kind: 'exists', variable: 'y', body: atomMortal };

const nestedFormula: FOLFormula = {
  kind: 'forall',
  variable: 'x',
  body: {
    kind: 'implies',
    left: atomHuman,
    right: {
      kind: 'exists',
      variable: 'y',
      body: { kind: 'and', left: atomLoves, right: { kind: 'neg', arg: atomMortal } },
    },
  },
};

// ---------------------------------------------------------------------------
// formulaToLatex
// ---------------------------------------------------------------------------
describe('formulaToLatex', () => {
  it('renders a variable term', () => {
    expect(formulaToLatex(varX)).toBe('x');
  });

  it('renders a constant term', () => {
    expect(formulaToLatex(constA)).toBe('a');
  });

  it('renders a function term', () => {
    expect(formulaToLatex(fnFxy)).toBe('f(x, y)');
  });

  it('renders a nested function term', () => {
    const nested: FOLTerm = { kind: 'fn', name: 'f', args: [fnGx] };
    expect(formulaToLatex(nested)).toBe('f(g(x))');
  });

  it('renders an atom with args', () => {
    expect(formulaToLatex(atomHuman)).toBe('Human(x)');
  });

  it('renders an atom with no args', () => {
    expect(formulaToLatex(atomNoArgs)).toBe('True');
  });

  it('renders an equality formula', () => {
    expect(formulaToLatex(eqFormula)).toBe('x = a');
  });

  it('renders negation', () => {
    expect(formulaToLatex(negHuman)).toBe('\\lnot Human(x)');
  });

  it('renders conjunction', () => {
    expect(formulaToLatex(andFormula)).toBe('(Human(x) \\land Loves(x, y))');
  });

  it('renders disjunction', () => {
    expect(formulaToLatex(orFormula)).toBe('(Human(x) \\lor Loves(x, y))');
  });

  it('renders implication', () => {
    expect(formulaToLatex(impliesFormula)).toBe('(Human(x) \\Rightarrow Loves(x, y))');
  });

  it('renders biconditional', () => {
    expect(formulaToLatex(iffFormula)).toBe('(Human(x) \\Leftrightarrow Loves(x, y))');
  });

  it('renders universal quantifier', () => {
    expect(formulaToLatex(forallFormula)).toBe('\\forall x\\; Human(x)');
  });

  it('renders existential quantifier', () => {
    expect(formulaToLatex(existsFormula)).toBe('\\exists y\\; Mortal(y)');
  });

  it('renders nested formula', () => {
    const latex = formulaToLatex(nestedFormula);
    expect(latex).toContain('\\forall x');
    expect(latex).toContain('\\exists y');
    expect(latex).toContain('\\Rightarrow');
  });
});

// ---------------------------------------------------------------------------
// buildSyntaxTree
// ---------------------------------------------------------------------------
describe('buildSyntaxTree', () => {
  it('builds a node for a variable', () => {
    const node = buildSyntaxTree(varX);
    expect(node.kind).toBe('var');
    expect(node.label).toBe('x');
    expect(node.latex).toBe('x');
    expect(node.children).toHaveLength(0);
  });

  it('builds a node for a constant', () => {
    const node = buildSyntaxTree(constA);
    expect(node.kind).toBe('const');
    expect(node.label).toBe('a');
    expect(node.children).toHaveLength(0);
  });

  it('builds a node for a function term with children', () => {
    const node = buildSyntaxTree(fnFxy);
    expect(node.kind).toBe('fn');
    expect(node.children).toHaveLength(2);
    expect(node.children[0]!.kind).toBe('var');
    expect(node.children[1]!.kind).toBe('var');
  });

  it('builds a node for an atom', () => {
    const node = buildSyntaxTree(atomHuman);
    expect(node.kind).toBe('atom');
    expect(node.children).toHaveLength(1);
  });

  it('builds a node for an atom with no args', () => {
    const node = buildSyntaxTree(atomNoArgs);
    expect(node.kind).toBe('atom');
    expect(node.children).toHaveLength(0);
  });

  it('builds a node for equality', () => {
    const node = buildSyntaxTree(eqFormula);
    expect(node.kind).toBe('eq');
    expect(node.children).toHaveLength(2);
  });

  it('builds a node for negation with one child', () => {
    const node = buildSyntaxTree(negHuman);
    expect(node.kind).toBe('neg');
    expect(node.label).toBe('¬');
    expect(node.children).toHaveLength(1);
  });

  it('builds a node for conjunction with two children', () => {
    const node = buildSyntaxTree(andFormula);
    expect(node.kind).toBe('and');
    expect(node.label).toBe('∧');
    expect(node.children).toHaveLength(2);
  });

  it('builds a node for disjunction', () => {
    const node = buildSyntaxTree(orFormula);
    expect(node.kind).toBe('or');
    expect(node.children).toHaveLength(2);
  });

  it('builds a node for implication', () => {
    const node = buildSyntaxTree(impliesFormula);
    expect(node.kind).toBe('implies');
    expect(node.children).toHaveLength(2);
  });

  it('builds a node for biconditional', () => {
    const node = buildSyntaxTree(iffFormula);
    expect(node.kind).toBe('iff');
    expect(node.children).toHaveLength(2);
  });

  it('builds a node for forall with one child', () => {
    const node = buildSyntaxTree(forallFormula);
    expect(node.kind).toBe('forall');
    expect(node.children).toHaveLength(1);
    expect(node.label).toContain('∀');
  });

  it('builds a node for exists with one child', () => {
    const node = buildSyntaxTree(existsFormula);
    expect(node.kind).toBe('exists');
    expect(node.children).toHaveLength(1);
    expect(node.label).toContain('∃');
  });

  it('assigns unique ids to all nodes in a complex tree', () => {
    const node = buildSyntaxTree(nestedFormula);
    const ids: string[] = [];
    function collect(n: ReturnType<typeof buildSyntaxTree>) {
      ids.push(n.id);
      n.children.forEach(collect);
    }
    collect(node);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('latex in tree node is non-empty string', () => {
    const node = buildSyntaxTree(nestedFormula);
    expect(node.latex.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// occursIn
// ---------------------------------------------------------------------------
describe('occursIn', () => {
  it('returns true for matching variable', () => {
    expect(occursIn('x', varX)).toBe(true);
  });

  it('returns false for non-matching variable', () => {
    expect(occursIn('z', varX)).toBe(false);
  });

  it('always returns false for constants', () => {
    expect(occursIn('a', constA)).toBe(false);
    expect(occursIn('x', constA)).toBe(false);
  });

  it('returns true when variable is deep in function args', () => {
    expect(occursIn('x', fnFxy)).toBe(true);
    expect(occursIn('y', fnFxy)).toBe(true);
  });

  it('returns false when variable not in function', () => {
    expect(occursIn('z', fnFxy)).toBe(false);
  });

  it('returns true in nested function', () => {
    const nested: FOLTerm = { kind: 'fn', name: 'h', args: [fnGx] };
    expect(occursIn('x', nested)).toBe(true);
  });

  it('returns false in nested function with no match', () => {
    const nested: FOLTerm = { kind: 'fn', name: 'h', args: [fnGx] };
    expect(occursIn('z', nested)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applySubstitution
// ---------------------------------------------------------------------------
describe('applySubstitution', () => {
  const theta: Substitution = new Map([['x', constA]]);

  it('substitutes matching variable', () => {
    expect(applySubstitution(varX, theta)).toEqual(constA);
  });

  it('leaves non-matching variable unchanged', () => {
    expect(applySubstitution(varY, theta)).toEqual(varY);
  });

  it('leaves constants unchanged', () => {
    expect(applySubstitution(constA, theta)).toEqual(constA);
    expect(applySubstitution(constB, theta)).toEqual(constB);
  });

  it('applies substitution recursively in function args', () => {
    const result = applySubstitution(fnFxy, theta);
    expect(result.kind).toBe('fn');
    if (result.kind === 'fn') {
      expect(result.args[0]).toEqual(constA);
      expect(result.args[1]).toEqual(varY);
    }
  });

  it('applies chained substitution (follows variable chain)', () => {
    const chain: Substitution = new Map<string, FOLTerm>([['x', varY], ['y', constB]]);
    expect(applySubstitution(varX, chain)).toEqual(constB);
  });

  it('returns term unchanged with empty substitution', () => {
    expect(applySubstitution(varX, new Map())).toEqual(varX);
    expect(applySubstitution(fnFxy, new Map())).toEqual(fnFxy);
  });
});

// ---------------------------------------------------------------------------
// unify
// ---------------------------------------------------------------------------
describe('unify', () => {
  it('unifies two identical constants successfully', () => {
    const steps = unify(constA, constA);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.size).toBe(0);
  });

  it('binds variable to constant', () => {
    const steps = unify(varX, constA);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(constA);
  });

  it('binds constant to variable (symmetry)', () => {
    const steps = unify(constA, varX);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(constA);
  });

  it('fails for different constants', () => {
    const steps = unify(constA, constB);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('unifies function args successfully', () => {
    const t1: FOLTerm = { kind: 'fn', name: 'f', args: [varX, { kind: 'fn', name: 'g', args: [varY] }] };
    const t2: FOLTerm = { kind: 'fn', name: 'f', args: [constA, { kind: 'fn', name: 'g', args: [constB] }] };
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    expect(last.theta.get('x')).toEqual(constA);
    expect(last.theta.get('y')).toEqual(constB);
  });

  it('fails for different functor names', () => {
    const t1: FOLTerm = { kind: 'fn', name: 'f', args: [varX] };
    const t2: FOLTerm = { kind: 'fn', name: 'g', args: [varX] };
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('fails for different arity', () => {
    const t1: FOLTerm = { kind: 'fn', name: 'f', args: [varX] };
    const t2: FOLTerm = { kind: 'fn', name: 'f', args: [varX, varY] };
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('fails with occurs check', () => {
    // x ~ f(x) — occurs check
    const t1: FOLTerm = varX;
    const t2: FOLTerm = fnGx; // g(x)
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('fails: f(x,x) ~ f(a,b)', () => {
    const t1: FOLTerm = { kind: 'fn', name: 'f', args: [varX, varX] };
    const t2: FOLTerm = { kind: 'fn', name: 'f', args: [constA, constB] };
    const steps = unify(t1, t2);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });

  it('returns multiple steps', () => {
    const t1: FOLTerm = { kind: 'fn', name: 'f', args: [varX, varY] };
    const t2: FOLTerm = { kind: 'fn', name: 'f', args: [constA, constB] };
    const steps = unify(t1, t2);
    expect(steps.length).toBeGreaterThan(2);
  });

  it('first step has result pending', () => {
    const steps = unify(varX, constA);
    expect(steps[0]!.result).toBe('pending');
  });

  it('unifies two identical variables', () => {
    const steps = unify(varX, varX);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
  });

  it('unifies two different variables', () => {
    const steps = unify(varX, varY);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('success');
    // one variable bound to the other
    expect(last.theta.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// freeVariables
// ---------------------------------------------------------------------------
describe('freeVariables', () => {
  it('returns single free variable in atom', () => {
    expect(freeVariables(atomHuman)).toContain('x');
  });

  it('returns free variables in atom with multiple args', () => {
    const fv = freeVariables(atomLoves);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });

  it('returns empty for atom with no args', () => {
    expect(freeVariables(atomNoArgs)).toHaveLength(0);
  });

  it('quantifier removes bound variable from free list', () => {
    const fv = freeVariables(forallFormula);
    expect(fv).not.toContain('x');
  });

  it('nested quantifiers remove variables at their scopes', () => {
    const fv = freeVariables(nestedFormula);
    expect(fv).not.toContain('x');
    expect(fv).not.toContain('y');
  });

  it('returns free var in equality', () => {
    const fv = freeVariables(eqFormula);
    expect(fv).toContain('x');
    expect(fv).not.toContain('a'); // constant, not a variable
  });

  it('returns free var in negation', () => {
    expect(freeVariables(negHuman)).toContain('x');
  });

  it('returns free vars in conjunction', () => {
    const fv = freeVariables(andFormula);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });

  it('returns free vars in disjunction', () => {
    const fv = freeVariables(orFormula);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });

  it('returns free vars in implication', () => {
    const fv = freeVariables(impliesFormula);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });

  it('returns free vars in biconditional', () => {
    const fv = freeVariables(iffFormula);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });

  it('deduplicates free variables', () => {
    const fv = freeVariables(andFormula);
    expect(fv.filter(v => v === 'x').length).toBe(1);
  });

  it('works on term: var', () => {
    expect(freeVariables(varX)).toEqual(['x']);
  });

  it('works on term: const', () => {
    expect(freeVariables(constA)).toEqual([]);
  });

  it('works on term: fn', () => {
    const fv = freeVariables(fnFxy);
    expect(fv).toContain('x');
    expect(fv).toContain('y');
  });
});

// ---------------------------------------------------------------------------
// boundVariables
// ---------------------------------------------------------------------------
describe('boundVariables', () => {
  it('returns empty for atom', () => {
    expect(boundVariables(atomHuman)).toHaveLength(0);
  });

  it('returns empty for equality', () => {
    expect(boundVariables(eqFormula)).toHaveLength(0);
  });

  it('returns empty for negation of atom', () => {
    expect(boundVariables(negHuman)).toHaveLength(0);
  });

  it('returns empty for conjunction of atoms', () => {
    expect(boundVariables(andFormula)).toHaveLength(0);
  });

  it('returns empty for disjunction of atoms', () => {
    expect(boundVariables(orFormula)).toHaveLength(0);
  });

  it('returns empty for implication of atoms', () => {
    expect(boundVariables(impliesFormula)).toHaveLength(0);
  });

  it('returns empty for biconditional of atoms', () => {
    expect(boundVariables(iffFormula)).toHaveLength(0);
  });

  it('returns bound variable for forall', () => {
    expect(boundVariables(forallFormula)).toContain('x');
  });

  it('returns bound variable for exists', () => {
    expect(boundVariables(existsFormula)).toContain('y');
  });

  it('returns all bound variables in nested formula', () => {
    const bv = boundVariables(nestedFormula);
    expect(bv).toContain('x');
    expect(bv).toContain('y');
  });

  it('deduplicates bound variables', () => {
    const doubleForall: FOLFormula = {
      kind: 'forall',
      variable: 'x',
      body: { kind: 'forall', variable: 'x', body: atomHuman },
    };
    const bv = boundVariables(doubleForall);
    expect(bv.filter(v => v === 'x').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// analyzeQuantifierScope
// ---------------------------------------------------------------------------
describe('analyzeQuantifierScope', () => {
  it('returns at least one step for a quantified formula', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('first step has no activeQuantifier', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    expect(steps[0]!.activeQuantifier).toBeNull();
  });

  it('steps include one step per quantifier', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    // nestedFormula has forall x and exists y → at least 2 quantifier steps
    const qSteps = steps.filter(s => s.activeQuantifier !== null);
    expect(qSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('forall quantifier has correct variable', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const forallStep = steps.find(s => s.activeQuantifier?.quantifier === 'forall');
    expect(forallStep?.activeQuantifier?.variable).toBe('x');
  });

  it('exists quantifier has correct variable', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const existsStep = steps.find(s => s.activeQuantifier?.quantifier === 'exists');
    expect(existsStep?.activeQuantifier?.variable).toBe('y');
  });

  it('forall is at depth 0', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const forallStep = steps.find(s => s.activeQuantifier?.quantifier === 'forall');
    expect(forallStep?.activeQuantifier?.depth).toBe(0);
  });

  it('exists is deeper than forall', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const forallStep = steps.find(s => s.activeQuantifier?.quantifier === 'forall');
    const existsStep = steps.find(s => s.activeQuantifier?.quantifier === 'exists');
    const forallDepth = forallStep?.activeQuantifier?.depth ?? 0;
    const existsDepth = existsStep?.activeQuantifier?.depth ?? 0;
    expect(existsDepth).toBeGreaterThan(forallDepth);
  });

  it('allQuantifiers contains both quantifiers from the start', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    expect(steps[0]!.allQuantifiers.length).toBeGreaterThanOrEqual(2);
  });

  it('freeVariables are empty for fully quantified formula', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    expect(steps[0]!.freeVariables).toHaveLength(0);
  });

  it('boundVariables contains x and y', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    expect(steps[0]!.boundVariables).toContain('x');
    expect(steps[0]!.boundVariables).toContain('y');
  });

  it('last step has null activeQuantifier (summary)', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const last = steps[steps.length - 1]!;
    expect(last.activeQuantifier).toBeNull();
  });

  it('works for atom with no quantifiers — returns just begin and summary', () => {
    const steps = analyzeQuantifierScope(atomHuman);
    // begin + summary = 2 steps
    expect(steps.length).toBe(2);
    expect(steps[0]!.allQuantifiers).toHaveLength(0);
  });

  it('scope latex is non-empty string', () => {
    const steps = analyzeQuantifierScope(nestedFormula);
    const qStep = steps.find(s => s.activeQuantifier !== null);
    expect(qStep?.activeQuantifier?.latex.length).toBeGreaterThan(0);
  });
});


// ---------------------------------------------------------------------------
// getRepresentationLevels
// ---------------------------------------------------------------------------
describe('getRepresentationLevels', () => {
  it('returns 3 levels', () => {
    expect(getRepresentationLevels().length).toBe(3);
  });

  it('first level is propositional logic', () => {
    expect(getRepresentationLevels()[0]!.name).toContain('Propositional');
  });

  it('second level is FOL', () => {
    expect(getRepresentationLevels()[1]!.name).toContain('First-Order');
  });

  it('FOL has high expressiveness', () => {
    expect(getRepresentationLevels()[1]!.expressiveness).toBe('high');
  });

  it('propositional logic has low expressiveness', () => {
    expect(getRepresentationLevels()[0]!.expressiveness).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// getKinshipKB
// ---------------------------------------------------------------------------
describe('getKinshipKB', () => {
  it('returns at least 4 sentences', () => {
    expect(getKinshipKB().length).toBeGreaterThanOrEqual(4);
  });

  it('first sentence has id and formula', () => {
    const kb = getKinshipKB();
    expect(kb[0]!.id).toBeDefined();
    expect(kb[0]!.formula).toBeDefined();
  });

  it('all sentences have latex strings', () => {
    const kb = getKinshipKB();
    for (const s of kb) {
      expect(s.latex.length).toBeGreaterThan(0);
    }
  });

  it('contains a sibling definition', () => {
    const kb = getKinshipKB();
    const sibling = kb.find(s => s.id === 'sibling');
    expect(sibling).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getKnowledgeEngineeringSteps
// ---------------------------------------------------------------------------
describe('getKnowledgeEngineeringSteps', () => {
  it('returns 6 steps', () => {
    expect(getKnowledgeEngineeringSteps().length).toBe(6);
  });

  it('steps are numbered 1 through 6', () => {
    const steps = getKnowledgeEngineeringSteps();
    steps.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it('each step has title and description', () => {
    for (const step of getKnowledgeEngineeringSteps()) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('each step has artifacts array', () => {
    for (const step of getKnowledgeEngineeringSteps()) {
      expect(step.artifacts.length).toBeGreaterThan(0);
    }
  });
});

// Test for y-variable occurs-check failure (lines 403-409 in algorithms/index.ts)
describe('unify - y variable occurs check', () => {
  it('fails when second arg is a variable that occurs in the first arg structure', () => {
    // unify(g(y), y): the second term is a var 'y', occursIn('y', g(y))=true → failure
    const y: FOLTerm = { kind: 'var', name: 'y' };
    const gy: FOLTerm = { kind: 'fn', name: 'g', args: [y] };
    const steps = unify(gy, y);
    const last = steps[steps.length - 1]!;
    expect(last.result).toBe('failure');
  });
});
