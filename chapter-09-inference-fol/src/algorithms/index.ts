/**
 * Chapter 9 — Inference in First-Order Logic
 *
 * Implements Unification (Robinson's algorithm), Forward Chaining (FOL-FC-ASK),
 * and Propositional Resolution Refutation.
 *
 * All functions are pure with no side effects.
 * @module algorithms
 */

/**
 * Maximum number of resolution steps before halting.
 * Prevents runaway loops on large or unsatisfiable clause sets.
 */
const MAX_RESOLUTION_STEPS = 50;

// ─── Unification ────────────────────────────────────────────────────────────

/** A term in First-Order Logic. */
export type FOLTerm =
  | { readonly kind: 'var'; readonly name: string }
  | { readonly kind: 'const'; readonly name: string }
  | { readonly kind: 'fn'; readonly name: string; readonly args: ReadonlyArray<FOLTerm> };

/** A substitution mapping variable names to terms. */
export type Substitution = ReadonlyMap<string, FOLTerm>;

/** A single step in the unification trace. */
export interface UnificationStep {
  readonly action: string;
  readonly theta: Substitution;
  readonly remainingPairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]>;
  readonly result: 'pending' | 'success' | 'failure';
}

/**
 * Returns true if variable `variable` appears anywhere in `term`.
 * @complexity O(n) where n is the number of nodes in the term tree.
 */
export function occursIn(variable: string, term: FOLTerm): boolean {
  if (term.kind === 'var') return term.name === variable;
  if (term.kind === 'const') return false;
  return term.args.some((arg) => occursIn(variable, arg));
}

/**
 * Applies substitution `theta` to `term`, chasing variable chains.
 * @complexity O(n * |theta|)
 */
export function applySubstitution(term: FOLTerm, theta: Substitution): FOLTerm {
  if (term.kind === 'var') {
    const bound = theta.get(term.name);
    if (bound !== undefined) return applySubstitution(bound, theta);
    return term;
  }
  if (term.kind === 'const') return term;
  return { kind: 'fn', name: term.name, args: term.args.map((a) => applySubstitution(a, theta)) };
}

/**
 * Renders a FOL term as a LaTeX string.
 * @complexity O(n)
 */
export function termToLatex(term: FOLTerm): string {
  if (term.kind === 'var') return `{${term.name}}`;
  if (term.kind === 'const') return term.name;
  if (term.args.length === 0) return term.name;
  return `${term.name}(${term.args.map(termToLatex).join(', ')})`;
}

/** Compares two FOL terms for structural equality (ignoring substitutions). */
function termsEqual(a: FOLTerm, b: FOLTerm): boolean {
  if (a.kind === 'var' && b.kind === 'var') return a.name === b.name;
  if (a.kind === 'const' && b.kind === 'const') return a.name === b.name;
  if (a.kind === 'fn' && b.kind === 'fn') {
    return (
      a.name === b.name &&
      a.args.length === b.args.length &&
      a.args.every((arg, i) => termsEqual(arg, b.args[i]!))
    );
  }
  return false;
}

/**
 * Robinson's UNIFY algorithm. Returns all intermediate steps for playback.
 * @complexity O(n^2) in the worst case
 */
export function unify(t1: FOLTerm, t2: FOLTerm): ReadonlyArray<UnificationStep> {
  const steps: UnificationStep[] = [];
  let theta: Substitution = new Map();
  let pairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]> = [[t1, t2]];

  while (pairs.length > 0) {
    const [x, y] = pairs[0]!;
    const rest = pairs.slice(1);

    const tx = applySubstitution(x, theta);
    const ty = applySubstitution(y, theta);

    // Identical terms
    if (termsEqual(tx, ty)) {
      const remaining = rest.map(([a, b]) => [applySubstitution(a, theta), applySubstitution(b, theta)] as const);
      pairs = remaining;
      steps.push({
        action: `Terms ${termToLatex(tx)} and ${termToLatex(ty)} are identical, skip`,
        theta,
        remainingPairs: remaining,
        result: remaining.length === 0 ? 'success' : 'pending',
      });
      continue;
    }

    // Left is var
    if (tx.kind === 'var') {
      if (occursIn(tx.name, ty)) {
        steps.push({
          action: `Occurs check failed: ${tx.name} occurs in ${termToLatex(ty)}`,
          theta,
          remainingPairs: rest,
          result: 'failure',
        });
        return steps;
      }
      const newTheta: Map<string, FOLTerm> = new Map(theta);
      newTheta.set(tx.name, ty);
      const frozen: Substitution = newTheta;
      const remaining = rest.map(([a, b]) => [applySubstitution(a, frozen), applySubstitution(b, frozen)] as const);
      theta = frozen;
      pairs = remaining;
      steps.push({
        action: `Bind ${tx.name} \\mapsto ${termToLatex(ty)}`,
        theta,
        remainingPairs: remaining,
        result: remaining.length === 0 ? 'success' : 'pending',
      });
      continue;
    }

    // Right is var
    if (ty.kind === 'var') {
      if (occursIn(ty.name, tx)) {
        steps.push({
          action: `Occurs check failed: ${ty.name} occurs in ${termToLatex(tx)}`,
          theta,
          remainingPairs: rest,
          result: 'failure',
        });
        return steps;
      }
      const newTheta: Map<string, FOLTerm> = new Map(theta);
      newTheta.set(ty.name, tx);
      const frozen: Substitution = newTheta;
      const remaining = rest.map(([a, b]) => [applySubstitution(a, frozen), applySubstitution(b, frozen)] as const);
      theta = frozen;
      pairs = remaining;
      steps.push({
        action: `Bind ${ty.name} \\mapsto ${termToLatex(tx)}`,
        theta,
        remainingPairs: remaining,
        result: remaining.length === 0 ? 'success' : 'pending',
      });
      continue;
    }

    // Both are functions
    if (tx.kind === 'fn' && ty.kind === 'fn') {
      if (tx.name !== ty.name || tx.args.length !== ty.args.length) {
        steps.push({
          action: `Symbol clash: ${termToLatex(tx)} vs ${termToLatex(ty)}`,
          theta,
          remainingPairs: rest,
          result: 'failure',
        });
        return steps;
      }
      const newPairs: ReadonlyArray<readonly [FOLTerm, FOLTerm]> = tx.args.map(
        (arg, i) => [arg, ty.args[i]!] as const,
      );
      pairs = [...newPairs, ...rest];
      steps.push({
        action: `Decompose ${termToLatex(tx)}: add ${tx.args.length} arg pair(s)`,
        theta,
        remainingPairs: pairs,
        result: 'pending',
      });
      continue;
    }

    // Constant clash (both consts but not equal — would have been caught by termsEqual above)
    steps.push({
      action: `Symbol clash: ${termToLatex(tx)} vs ${termToLatex(ty)}`,
      theta,
      remainingPairs: rest,
      result: 'failure',
    });
    return steps;
  }

  return steps;
}

// ─── Forward Chaining ────────────────────────────────────────────────────────

/** A Horn clause with a single head and a (possibly empty) body. */
export interface HornClause {
  readonly head: string;
  readonly headArgs: ReadonlyArray<string>;
  readonly body: ReadonlyArray<{ readonly predicate: string; readonly args: ReadonlyArray<string> }>;
}

/** A single step in the forward chaining trace. */
export interface ForwardChainStep {
  readonly action: string;
  readonly newFact: string | null;
  readonly facts: ReadonlyArray<string>;
  readonly firedClause: HornClause | null;
  readonly bindings: Readonly<Record<string, string>> | null;
}

/** Parses "Predicate(arg1,arg2)" or "Predicate" into structured form. */
function parseFact(fact: string): { predicate: string; args: string[] } | null {
  const parenIdx = fact.indexOf('(');
  if (parenIdx === -1) {
    return { predicate: fact.trim(), args: [] };
  }
  const predicate = fact.slice(0, parenIdx).trim();
  const inner = fact.slice(parenIdx + 1, fact.lastIndexOf(')'));
  if (!predicate) return null;
  const args = inner.split(',').map((s) => s.trim()).filter(Boolean);
  return { predicate, args };
}

/** Returns true if the string is a logic variable (starts lowercase). */
function isVariable(s: string): boolean {
  const ch = s.charCodeAt(0);
  return s.length > 0 && ch >= 97 && ch <= 122;
}

/** Applies existing bindings to an argument list. */
function applyBindings(args: ReadonlyArray<string>, bindings: Readonly<Record<string, string>>): string[] {
  return args.map((a) => (isVariable(a) && bindings[a] !== undefined ? bindings[a]! : a));
}

/**
 * Returns all extended binding sets that match bodyLit against known facts.
 * Applies existing bindings to bodyLit args before matching.
 */
function matchBodyLiteral(
  bodyLit: { predicate: string; args: ReadonlyArray<string> },
  bindings: Readonly<Record<string, string>>,
  facts: string[],
): Readonly<Record<string, string>>[] {
  const resolvedArgs = applyBindings(bodyLit.args, bindings);
  const results: Readonly<Record<string, string>>[] = [];

  for (const fact of facts) {
    const parsed = parseFact(fact);
    if (!parsed) continue;
    if (parsed.predicate !== bodyLit.predicate) continue;
    if (parsed.args.length !== resolvedArgs.length) continue;

    let extended: Record<string, string> = { ...bindings };
    let ok = true;
    for (let i = 0; i < resolvedArgs.length; i++) {
      const rArg = resolvedArgs[i]!;
      const fArg = parsed.args[i]!;
      if (isVariable(rArg)) {
        if (extended[rArg] !== undefined && extended[rArg] !== fArg) {
          ok = false;
          break;
        }
        extended = { ...extended, [rArg]: fArg };
      } else if (rArg !== fArg) {
        ok = false;
        break;
      }
    }
    if (ok) results.push(extended);
  }
  return results;
}

/**
 * Returns all consistent binding sets that satisfy all body literals.
 */
function tryMatchBody(
  bodyLits: ReadonlyArray<{ predicate: string; args: ReadonlyArray<string> }>,
  facts: string[],
): Readonly<Record<string, string>>[] {
  let bindingSets: Readonly<Record<string, string>>[] = [{}];
  for (const lit of bodyLits) {
    const next: Readonly<Record<string, string>>[] = [];
    for (const b of bindingSets) {
      next.push(...matchBodyLiteral(lit, b, facts));
    }
    bindingSets = next;
    if (bindingSets.length === 0) return [];
  }
  return bindingSets;
}

/**
 * FOL-FC-ASK (simplified, propositionalised Horn clause forward chaining).
 * Returns all steps for playback.
 * @complexity O(k * n * m) per iteration, where k=clauses, n=facts, m=body length
 */
export function forwardChain(
  clauses: ReadonlyArray<HornClause>,
  initialFacts: ReadonlyArray<string>,
  query: string,
): ReadonlyArray<ForwardChainStep> {
  const steps: ForwardChainStep[] = [];
  let facts = [...initialFacts];

  steps.push({
    action: 'Initialize facts',
    newFact: null,
    facts: [...facts],
    firedClause: null,
    bindings: null,
  });

  if (facts.includes(query)) {
    steps.push({
      action: `Query "${query}" found in initial facts`,
      newFact: null,
      facts: [...facts],
      firedClause: null,
      bindings: null,
    });
    return steps;
  }

  let newFactAdded = true;
  while (newFactAdded) {
    newFactAdded = false;
    for (const clause of clauses) {
      const bindingSets =
        clause.body.length === 0 ? [{}] : tryMatchBody(clause.body, facts);

      for (const bindings of bindingSets) {
        const headArgs = applyBindings(clause.headArgs, bindings);
        const newFact =
          headArgs.length === 0
            ? clause.head
            : `${clause.head}(${headArgs.join(',')})`;

        if (!facts.includes(newFact)) {
          facts = [...facts, newFact];
          newFactAdded = true;
          steps.push({
            action: `Fired clause: derive "${newFact}"`,
            newFact,
            facts: [...facts],
            firedClause: clause,
            bindings,
          });

          if (newFact === query) {
            steps.push({
              action: `Query "${query}" found`,
              newFact: null,
              facts: [...facts],
              firedClause: null,
              bindings: null,
            });
            return steps;
          }
        }
      }
    }
  }

  steps.push({
    action: 'Fixed point reached — no new facts derivable',
    newFact: null,
    facts: [...facts],
    firedClause: null,
    bindings: null,
  });
  return steps;
}

// ─── Propositional Resolution ────────────────────────────────────────────────

/** A literal in a CNF clause. */
export interface Literal {
  readonly predicate: string;
  readonly args: ReadonlyArray<string>;
  readonly negated: boolean;
}

/** A CNF clause (disjunction of literals). */
export interface CNFClause {
  readonly id: string;
  readonly literals: ReadonlyArray<Literal>;
  readonly source: 'kb' | 'negated-goal' | 'derived';
  readonly parents?: ReadonlyArray<string>;
}

/** A single step in the resolution trace. */
export interface ResolutionStep {
  readonly action: string;
  readonly clause1Id: string;
  readonly clause2Id: string;
  readonly resolvent: CNFClause | null;
  readonly allClauses: ReadonlyArray<CNFClause>;
  readonly resolved: boolean;
}

/**
 * Renders a literal as a string like "¬P(a,b)" or "Q".
 * @complexity O(n)
 */
export function literalToString(lit: Literal): string {
  const base = lit.args.length === 0 ? lit.predicate : `${lit.predicate}(${lit.args.join(',')})`;
  return lit.negated ? `¬${base}` : base;
}

/**
 * Renders a CNF clause as a LaTeX string.
 * @complexity O(n)
 */
export function clauseToLatex(clause: CNFClause): string {
  if (clause.literals.length === 0) return '\\square';
  return clause.literals.map(literalToString).join(' \\lor ');
}

/** Returns true if two literals are identical. */
function literalsEqual(a: Literal, b: Literal): boolean {
  return (
    a.predicate === b.predicate &&
    a.negated === b.negated &&
    a.args.length === b.args.length &&
    a.args.every((arg, i) => arg === b.args[i])
  );
}

/**
 * Resolves two clauses. Returns the resolvent clause or null if no
 * complementary literals exist.
 * @complexity O(n * m)
 */
export function resolve(c1: CNFClause, c2: CNFClause, nextId: string): CNFClause | null {
  for (const lit1 of c1.literals) {
    for (const lit2 of c2.literals) {
      if (
        lit1.predicate === lit2.predicate &&
        lit1.negated !== lit2.negated &&
        lit1.args.length === lit2.args.length &&
        lit1.args.every((a, i) => a === lit2.args[i])
      ) {
        const remaining1 = c1.literals.filter((l) => !literalsEqual(l, lit1));
        const remaining2 = c2.literals.filter((l) => !literalsEqual(l, lit2));
        const combined = [...remaining1];
        for (const l of remaining2) {
          if (!combined.some((x) => literalsEqual(x, l))) combined.push(l);
        }
        return {
          id: nextId,
          literals: combined,
          source: 'derived',
          parents: [c1.id, c2.id],
        };
      }
    }
  }
  return null;
}

/**
 * Propositional resolution refutation. Uses set-of-support strategy.
 * Returns all steps for playback.
 * @complexity O(n^2) per iteration
 */
export function propositionalResolution(
  kbClauses: ReadonlyArray<CNFClause>,
  goalClause: CNFClause,
): ReadonlyArray<ResolutionStep> {
  const steps: ResolutionStep[] = [];
  let allClauses: CNFClause[] = [...kbClauses, goalClause];
  const seenSignatures = new Set<string>(allClauses.map(clauseSignature));

  let clauseCounter = allClauses.length;

  let newClauseFound = true;
  while (newClauseFound && steps.length < MAX_RESOLUTION_STEPS) {
    newClauseFound = false;
    const snapshot = [...allClauses];

    for (let i = 0; i < snapshot.length && steps.length < MAX_RESOLUTION_STEPS; i++) {
      for (let j = i + 1; j < snapshot.length && steps.length < MAX_RESOLUTION_STEPS; j++) {
        const c1 = snapshot[i]!;
        const c2 = snapshot[j]!;
        const nextId = `c${++clauseCounter}`;
        const resolvent = resolve(c1, c2, nextId);

        if (resolvent === null) continue;

        const sig = clauseSignature(resolvent);
        if (seenSignatures.has(sig)) continue;
        seenSignatures.add(sig);
        allClauses = [...allClauses, resolvent];

        if (resolvent.literals.length === 0) {
          steps.push({
            action: `Resolved ${c1.id} and ${c2.id} → empty clause □ (contradiction!)`,
            clause1Id: c1.id,
            clause2Id: c2.id,
            resolvent,
            allClauses: [...allClauses],
            resolved: true,
          });
          return steps;
        }

        steps.push({
          action: `Resolved ${c1.id} and ${c2.id} → ${clauseToLatex(resolvent)}`,
          clause1Id: c1.id,
          clause2Id: c2.id,
          resolvent,
          allClauses: [...allClauses],
          resolved: false,
        });
        newClauseFound = true;
      }
    }
  }

  steps.push({
    action: 'No more resolvents — fixed point reached',
    clause1Id: '',
    clause2Id: '',
    resolvent: null,
    allClauses: [...allClauses],
    resolved: false,
  });
  return steps;
}

/** Produces a canonical signature string for a clause (for deduplication). */
function clauseSignature(clause: CNFClause): string {
  return clause.literals
    .map(literalToString)
    .sort()
    .join('|');
}
