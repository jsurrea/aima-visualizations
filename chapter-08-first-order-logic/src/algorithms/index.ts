/**
 * Chapter 8 — First-Order Logic
 *
 * Pure algorithm implementations for FOL syntax trees, unification, and
 * quantifier scope analysis.  Every exported function is a pure function with
 * no side effects.
 *
 * @module algorithms
 */

// ---------------------------------------------------------------------------
// FOL Term / Formula types
// ---------------------------------------------------------------------------

/** A first-order logic term: variable, constant, or function application. */
export type FOLTerm =
  | { kind: 'var'; name: string }
  | { kind: 'const'; name: string }
  | { kind: 'fn'; name: string; args: ReadonlyArray<FOLTerm> };

/** A first-order logic formula. */
export type FOLFormula =
  | { kind: 'atom'; predicate: string; args: ReadonlyArray<FOLTerm> }
  | { kind: 'eq'; left: FOLTerm; right: FOLTerm }
  | { kind: 'neg'; arg: FOLFormula }
  | { kind: 'and'; left: FOLFormula; right: FOLFormula }
  | { kind: 'or'; left: FOLFormula; right: FOLFormula }
  | { kind: 'implies'; left: FOLFormula; right: FOLFormula }
  | { kind: 'iff'; left: FOLFormula; right: FOLFormula }
  | { kind: 'forall'; variable: string; body: FOLFormula }
  | { kind: 'exists'; variable: string; body: FOLFormula };

// ---------------------------------------------------------------------------
// Syntax Tree
// ---------------------------------------------------------------------------

/** A node in the syntax tree for rendering. */
export interface SyntaxTreeNode {
  id: string;
  label: string;
  latex: string;
  kind: string;
  children: ReadonlyArray<SyntaxTreeNode>;
}

let _idCounter = 0;
function freshId(): string {
  return `node-${++_idCounter}`;
}

/**
 * Converts a FOLTerm or FOLFormula into a tree of SyntaxTreeNodes.
 *
 * @param formula - The term or formula to convert.
 * @returns Root SyntaxTreeNode for the formula.
 * @complexity O(n) where n is the size of the formula.
 */
export function buildSyntaxTree(formula: FOLFormula | FOLTerm): SyntaxTreeNode {
  // Reset counter so IDs are deterministic in tests (per call sequence)
  const f = formula as FOLTerm | FOLFormula;

  if ('kind' in f) {
    switch (f.kind) {
      // Terms
      case 'var':
        return { id: freshId(), label: f.name, latex: f.name, kind: 'var', children: [] };
      case 'const':
        return { id: freshId(), label: f.name, latex: f.name, kind: 'const', children: [] };
      case 'fn': {
        const children = (f as { kind: 'fn'; name: string; args: ReadonlyArray<FOLTerm> }).args.map(
          a => buildSyntaxTree(a),
        );
        return {
          id: freshId(),
          label: `${f.name}(...)`,
          latex: `${f.name}(${children.map(c => c.latex).join(', ')})`,
          kind: 'fn',
          children,
        };
      }
      // Formulas
      case 'atom': {
        const ff = f as { kind: 'atom'; predicate: string; args: ReadonlyArray<FOLTerm> };
        const children = ff.args.map(a => buildSyntaxTree(a));
        return {
          id: freshId(),
          label: `${ff.predicate}(...)`,
          latex: `${ff.predicate}(${children.map(c => c.latex).join(', ')})`,
          kind: 'atom',
          children,
        };
      }
      case 'eq': {
        const ff = f as { kind: 'eq'; left: FOLTerm; right: FOLTerm };
        const left = buildSyntaxTree(ff.left);
        const right = buildSyntaxTree(ff.right);
        return {
          id: freshId(),
          label: '=',
          latex: `${left.latex} = ${right.latex}`,
          kind: 'eq',
          children: [left, right],
        };
      }
      case 'neg': {
        const ff = f as { kind: 'neg'; arg: FOLFormula };
        const child = buildSyntaxTree(ff.arg);
        return {
          id: freshId(),
          label: '¬',
          latex: `\\lnot ${child.latex}`,
          kind: 'neg',
          children: [child],
        };
      }
      case 'and': {
        const ff = f as { kind: 'and'; left: FOLFormula; right: FOLFormula };
        const left = buildSyntaxTree(ff.left);
        const right = buildSyntaxTree(ff.right);
        return {
          id: freshId(),
          label: '∧',
          latex: `(${left.latex} \\land ${right.latex})`,
          kind: 'and',
          children: [left, right],
        };
      }
      case 'or': {
        const ff = f as { kind: 'or'; left: FOLFormula; right: FOLFormula };
        const left = buildSyntaxTree(ff.left);
        const right = buildSyntaxTree(ff.right);
        return {
          id: freshId(),
          label: '∨',
          latex: `(${left.latex} \\lor ${right.latex})`,
          kind: 'or',
          children: [left, right],
        };
      }
      case 'implies': {
        const ff = f as { kind: 'implies'; left: FOLFormula; right: FOLFormula };
        const left = buildSyntaxTree(ff.left);
        const right = buildSyntaxTree(ff.right);
        return {
          id: freshId(),
          label: '⇒',
          latex: `(${left.latex} \\Rightarrow ${right.latex})`,
          kind: 'implies',
          children: [left, right],
        };
      }
      case 'iff': {
        const ff = f as { kind: 'iff'; left: FOLFormula; right: FOLFormula };
        const left = buildSyntaxTree(ff.left);
        const right = buildSyntaxTree(ff.right);
        return {
          id: freshId(),
          label: '⟺',
          latex: `(${left.latex} \\Leftrightarrow ${right.latex})`,
          kind: 'iff',
          children: [left, right],
        };
      }
      case 'forall': {
        const ff = f as { kind: 'forall'; variable: string; body: FOLFormula };
        const body = buildSyntaxTree(ff.body);
        return {
          id: freshId(),
          label: `∀${ff.variable}`,
          latex: `\\forall ${ff.variable}\\; ${body.latex}`,
          kind: 'forall',
          children: [body],
        };
      }
      case 'exists': {
        const ff = f as { kind: 'exists'; variable: string; body: FOLFormula };
        const body = buildSyntaxTree(ff.body);
        return {
          id: freshId(),
          label: `∃${ff.variable}`,
          latex: `\\exists ${ff.variable}\\; ${body.latex}`,
          kind: 'exists',
          children: [body],
        };
      }
    }
  }
  // Should never reach here with well-typed input
  return { id: freshId(), label: '?', latex: '?', kind: 'unknown', children: [] };
}

/**
 * Converts a FOLTerm or FOLFormula to a LaTeX string.
 *
 * @param formula - Term or formula.
 * @returns LaTeX string representation.
 * @complexity O(n)
 */
export function formulaToLatex(formula: FOLFormula | FOLTerm): string {
  const f = formula as FOLTerm | FOLFormula;
  switch (f.kind) {
    case 'var':
      return f.name;
    case 'const':
      return f.name;
    case 'fn': {
      const ff = f as { kind: 'fn'; name: string; args: ReadonlyArray<FOLTerm> };
      return `${ff.name}(${ff.args.map(formulaToLatex).join(', ')})`;
    }
    case 'atom': {
      const ff = f as { kind: 'atom'; predicate: string; args: ReadonlyArray<FOLTerm> };
      if (ff.args.length === 0) return ff.predicate;
      return `${ff.predicate}(${ff.args.map(formulaToLatex).join(', ')})`;
    }
    case 'eq': {
      const ff = f as { kind: 'eq'; left: FOLTerm; right: FOLTerm };
      return `${formulaToLatex(ff.left)} = ${formulaToLatex(ff.right)}`;
    }
    case 'neg': {
      const ff = f as { kind: 'neg'; arg: FOLFormula };
      return `\\lnot ${formulaToLatex(ff.arg)}`;
    }
    case 'and': {
      const ff = f as { kind: 'and'; left: FOLFormula; right: FOLFormula };
      return `(${formulaToLatex(ff.left)} \\land ${formulaToLatex(ff.right)})`;
    }
    case 'or': {
      const ff = f as { kind: 'or'; left: FOLFormula; right: FOLFormula };
      return `(${formulaToLatex(ff.left)} \\lor ${formulaToLatex(ff.right)})`;
    }
    case 'implies': {
      const ff = f as { kind: 'implies'; left: FOLFormula; right: FOLFormula };
      return `(${formulaToLatex(ff.left)} \\Rightarrow ${formulaToLatex(ff.right)})`;
    }
    case 'iff': {
      const ff = f as { kind: 'iff'; left: FOLFormula; right: FOLFormula };
      return `(${formulaToLatex(ff.left)} \\Leftrightarrow ${formulaToLatex(ff.right)})`;
    }
    case 'forall': {
      const ff = f as { kind: 'forall'; variable: string; body: FOLFormula };
      return `\\forall ${ff.variable}\\; ${formulaToLatex(ff.body)}`;
    }
    case 'exists': {
      const ff = f as { kind: 'exists'; variable: string; body: FOLFormula };
      return `\\exists ${ff.variable}\\; ${formulaToLatex(ff.body)}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Unification (Robinson's algorithm)
// ---------------------------------------------------------------------------

/** A substitution mapping variable names to FOL terms. */
export type Substitution = ReadonlyMap<string, FOLTerm>;

/** One step in the unification trace. */
export interface UnificationStep {
  readonly action: string;
  readonly theta: Substitution;
  readonly remainingPairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]>;
  readonly result: 'pending' | 'success' | 'failure';
}

/**
 * Returns true if variable `v` appears anywhere in term `t` (occurs check).
 *
 * @param variable - Variable name to search for.
 * @param term - Term to search within.
 * @returns True if the variable occurs in the term.
 * @complexity O(n)
 */
export function occursIn(variable: string, term: FOLTerm): boolean {
  switch (term.kind) {
    case 'var':
      return term.name === variable;
    case 'const':
      return false;
    case 'fn':
      return term.args.some(a => occursIn(variable, a));
  }
}

/**
 * Applies substitution `theta` to term `t`, replacing all variable
 * occurrences with their bound values.
 *
 * @param term - The term to substitute into.
 * @param theta - The substitution to apply.
 * @returns New term with substitution applied.
 * @complexity O(n * |theta|)
 */
export function applySubstitution(term: FOLTerm, theta: Substitution): FOLTerm {
  switch (term.kind) {
    case 'var': {
      const bound = theta.get(term.name);
      return bound !== undefined ? applySubstitution(bound, theta) : term;
    }
    case 'const':
      return term;
    case 'fn':
      return { kind: 'fn', name: term.name, args: term.args.map(a => applySubstitution(a, theta)) };
  }
}

/** Extend substitution by composing in x → term, applying existing theta to term first. */
function extendSubstitution(theta: Substitution, variable: string, term: FOLTerm): Substitution {
  const newTerm = applySubstitution(term, theta);
  const result = new Map(theta);
  result.set(variable, newTerm);
  return result;
}

/**
 * Runs Robinson's unification algorithm on two FOL terms.
 * Returns all steps including the final success/failure step.
 *
 * @param t1 - First term.
 * @param t2 - Second term.
 * @returns Array of UnificationStep records.
 * @complexity O(n^2) worst case (occurs check)
 */
export function unify(t1: FOLTerm, t2: FOLTerm): ReadonlyArray<UnificationStep> {
  const steps: UnificationStep[] = [];
  const initialPairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]> = [[t1, t2]];

  steps.push({
    action: `Start: unify ${formulaToLatex(t1)} with ${formulaToLatex(t2)}`,
    theta: new Map(),
    remainingPairs: initialPairs,
    result: 'pending',
  });

  const result = unifyPairs([[t1, t2]], new Map(), steps);

  if (result === null) {
    steps.push({
      action: 'Unification failed',
      theta: new Map(),
      remainingPairs: [],
      result: 'failure',
    });
  } else {
    steps.push({
      action: `Unification succeeded: θ = {${[...result.entries()].map(([k, v]) => `${k} → ${formulaToLatex(v)}`).join(', ')}}`,
      theta: result,
      remainingPairs: [],
      result: 'success',
    });
  }

  return steps;
}

function unifyPairs(
  pairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]>,
  theta: Substitution,
  steps: UnificationStep[],
): Substitution | null {
  if (pairs.length === 0) return theta;

  const first = pairs[0]!;
  const rest = pairs.slice(1);
  const [x, y] = first;
  const sx = applySubstitution(x, theta);
  const sy = applySubstitution(y, theta);

  // Identical terms
  if (termsEqual(sx, sy)) {
    steps.push({
      action: `${formulaToLatex(sx)} = ${formulaToLatex(sy)}: identical, skip`,
      theta,
      remainingPairs: rest,
      result: 'pending',
    });
    return unifyPairs(rest, theta, steps);
  }

  // x is variable
  if (sx.kind === 'var') {
    if (occursIn(sx.name, sy)) {
      steps.push({
        action: `Occurs check failed: ${sx.name} occurs in ${formulaToLatex(sy)}`,
        theta,
        remainingPairs: rest,
        result: 'pending',
      });
      return null;
    }
    const newTheta = extendSubstitution(theta, sx.name, sy);
    steps.push({
      action: `Bind ${sx.name} → ${formulaToLatex(sy)}`,
      theta: newTheta,
      remainingPairs: rest,
      result: 'pending',
    });
    return unifyPairs(rest, newTheta, steps);
  }

  // y is variable
  if (sy.kind === 'var') {
    if (occursIn(sy.name, sx)) {
      steps.push({
        action: `Occurs check failed: ${sy.name} occurs in ${formulaToLatex(sx)}`,
        theta,
        remainingPairs: rest,
        result: 'pending',
      });
      return null;
    }
    const newTheta = extendSubstitution(theta, sy.name, sx);
    steps.push({
      action: `Bind ${sy.name} → ${formulaToLatex(sx)}`,
      theta: newTheta,
      remainingPairs: rest,
      result: 'pending',
    });
    return unifyPairs(rest, newTheta, steps);
  }

  // Both function terms
  if (sx.kind === 'fn' && sy.kind === 'fn') {
    if (sx.name !== sy.name || sx.args.length !== sy.args.length) {
      steps.push({
        action: `Symbol clash: ${formulaToLatex(sx)} ≠ ${formulaToLatex(sy)}`,
        theta,
        remainingPairs: rest,
        result: 'pending',
      });
      return null;
    }
    const argPairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]> = sx.args.map((a, i): readonly [FOLTerm, FOLTerm] => {
      const bArg = sy.args[i];
      if (bArg === undefined) throw new Error('arg index out of bounds');
      return [a, bArg] as const;
    });
    const newRest = [...argPairs, ...rest];
    steps.push({
      action: `Decompose ${formulaToLatex(sx)} = ${formulaToLatex(sy)}: add ${argPairs.length} pair(s)`,
      theta,
      remainingPairs: newRest,
      result: 'pending',
    });
    return unifyPairs(newRest, theta, steps);
  }

  // Both constants but different (already checked equal above)
  steps.push({
    action: `Clash: ${formulaToLatex(sx)} ≠ ${formulaToLatex(sy)}`,
    theta,
    remainingPairs: rest,
    result: 'pending',
  });
  return null;
}

/** Structural equality check for two FOLTerms. */
function termsEqual(a: FOLTerm, b: FOLTerm): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'var' && b.kind === 'var') return a.name === b.name;
  if (a.kind === 'const' && b.kind === 'const') return a.name === b.name;
  if (a.kind === 'fn' && b.kind === 'fn') {
    if (a.name !== b.name || a.args.length !== b.args.length) return false;
    return a.args.every((arg, i) => {
      const bArg = b.args[i];
      return bArg !== undefined && termsEqual(arg, bArg);
    });
  }
  return false;
}

// ---------------------------------------------------------------------------
// Quantifier Scope Analysis
// ---------------------------------------------------------------------------

/** Describes the scope of a single quantifier. */
export interface QuantifierScope {
  quantifier: 'forall' | 'exists';
  variable: string;
  depth: number;
  scopeStart: number;
  scopeEnd: number;
  latex: string;
}

/** One step in the quantifier scope trace. */
export interface ScopeStep {
  readonly action: string;
  readonly formula: FOLFormula;
  readonly activeQuantifier: QuantifierScope | null;
  readonly allQuantifiers: ReadonlyArray<QuantifierScope>;
  readonly freeVariables: ReadonlyArray<string>;
  readonly boundVariables: ReadonlyArray<string>;
}

/**
 * Returns free variables in a formula or term (deduplicated).
 *
 * @param formula - Term or formula to analyze.
 * @returns Sorted array of free variable names.
 * @complexity O(n)
 */
export function freeVariables(formula: FOLFormula | FOLTerm): ReadonlyArray<string> {
  const vars = collectFreeVars(formula, new Set<string>());
  return [...new Set(vars)].sort();
}

function collectFreeVars(node: FOLFormula | FOLTerm, bound: ReadonlySet<string>): string[] {
  const n = node as FOLTerm | FOLFormula;
  switch (n.kind) {
    case 'var':
      return bound.has(n.name) ? [] : [n.name];
    case 'const':
      return [];
    case 'fn':
      return (n as { kind: 'fn'; args: ReadonlyArray<FOLTerm> }).args.flatMap(a => collectFreeVars(a, bound));
    case 'atom':
      return (n as { kind: 'atom'; args: ReadonlyArray<FOLTerm> }).args.flatMap(a => collectFreeVars(a, bound));
    case 'eq': {
      const ff = n as { kind: 'eq'; left: FOLTerm; right: FOLTerm };
      return [...collectFreeVars(ff.left, bound), ...collectFreeVars(ff.right, bound)];
    }
    case 'neg':
      return collectFreeVars((n as { kind: 'neg'; arg: FOLFormula }).arg, bound);
    case 'and':
    case 'or':
    case 'implies':
    case 'iff': {
      const ff = n as { kind: string; left: FOLFormula; right: FOLFormula };
      return [...collectFreeVars(ff.left, bound), ...collectFreeVars(ff.right, bound)];
    }
    case 'forall':
    case 'exists': {
      const ff = n as { kind: string; variable: string; body: FOLFormula };
      const newBound = new Set(bound);
      newBound.add(ff.variable);
      return collectFreeVars(ff.body, newBound);
    }
  }
}

/**
 * Returns bound variables in a formula (deduplicated).
 *
 * @param formula - Formula to analyze.
 * @returns Sorted array of bound variable names.
 * @complexity O(n)
 */
export function boundVariables(formula: FOLFormula): ReadonlyArray<string> {
  const vars = collectBoundVars(formula);
  return [...new Set(vars)].sort();
}

function collectBoundVars(node: FOLFormula): string[] {
  switch (node.kind) {
    case 'atom':
    case 'eq':
      return [];
    case 'neg':
      return collectBoundVars(node.arg);
    case 'and':
    case 'or':
    case 'implies':
    case 'iff':
      return [...collectBoundVars(node.left), ...collectBoundVars(node.right)];
    case 'forall':
    case 'exists':
      return [node.variable, ...collectBoundVars(node.body)];
  }
}

/**
 * Analyzes a FOL formula for quantifier scopes, free and bound variables.
 * Returns one step per quantifier found, plus a final summary step.
 *
 * @param formula - Root formula to analyze.
 * @returns Array of ScopeStep records.
 * @complexity O(n)
 */
export function analyzeQuantifierScope(formula: FOLFormula): ReadonlyArray<ScopeStep> {
  const steps: ScopeStep[] = [];
  const allQuantifiers: QuantifierScope[] = [];

  collectQuantifiers(formula, 0, 0, formulaToLatex(formula).length, allQuantifiers);

  const free = freeVariables(formula);
  const bound = boundVariables(formula);

  // Initial step
  steps.push({
    action: 'Begin quantifier scope analysis',
    formula,
    activeQuantifier: null,
    allQuantifiers: [...allQuantifiers],
    freeVariables: free,
    boundVariables: bound,
  });

  // One step per quantifier
  for (const q of allQuantifiers) {
    steps.push({
      action: `Found ${q.quantifier === 'forall' ? '∀' : '∃'}${q.variable} at depth ${q.depth}`,
      formula,
      activeQuantifier: q,
      allQuantifiers: [...allQuantifiers],
      freeVariables: free,
      boundVariables: bound,
    });
  }

  // Final summary
  steps.push({
    action: `Analysis complete: ${allQuantifiers.length} quantifier(s), ${free.length} free variable(s)`,
    formula,
    activeQuantifier: null,
    allQuantifiers: [...allQuantifiers],
    freeVariables: free,
    boundVariables: bound,
  });

  return steps;
}

function collectQuantifiers(
  node: FOLFormula,
  depth: number,
  start: number,
  end: number,
  out: QuantifierScope[],
): void {
  switch (node.kind) {
    case 'atom':
    case 'eq':
      break;
    case 'neg':
      collectQuantifiers(node.arg, depth, start, end, out);
      break;
    case 'and':
    case 'or':
    case 'implies':
    case 'iff':
      collectQuantifiers(node.left, depth, start, end, out);
      collectQuantifiers(node.right, depth, start, end, out);
      break;
    case 'forall':
    case 'exists': {
      const bodyLatex = formulaToLatex(node.body);
      const scopeLen = bodyLatex.length;
      out.push({
        quantifier: node.kind,
        variable: node.variable,
        depth,
        scopeStart: start,
        scopeEnd: start + scopeLen,
        latex: formulaToLatex(node),
      });
      collectQuantifiers(node.body, depth + 1, start, start + scopeLen, out);
      break;
    }
  }
}
