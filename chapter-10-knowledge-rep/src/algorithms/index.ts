/**
 * Chapter 10 — Knowledge Representation
 *
 * Pure algorithm implementations covering:
 *   §10.1–10.2  Category hierarchy & ontology
 *   §10.3       Event calculus & Allen interval relations
 *   §10.5       Description Logic (CLASSIC-style subset)
 *   §10.6       Default logic, JTMS, and circumscription
 *
 * Every exported function is pure (no side effects) and returns an immutable
 * step array suitable for step-by-step playback in the visualization layer.
 *
 * @module algorithms
 */

// ─────────────────────────────────────────────────────────────────────────────
// §10.1–10.2  Category Hierarchy & Ontology
// ─────────────────────────────────────────────────────────────────────────────

/** A node in the upper-ontology hierarchy. */
export interface OntologyNode {
  readonly id: string;
  readonly label: string;
  /** Ids of direct child nodes (sub-categories or member individuals). */
  readonly children: ReadonlyArray<string>;
  /** Property names declared directly on this node. */
  readonly properties: ReadonlyArray<string>;
}

/**
 * Build a flat map of an ontology hierarchy from a list of subset / member
 * assertions (AIMA §10.2).
 *
 * @param assertions - Array of `{kind:'subset', parent, child}` or
 *   `{kind:'member', category, individual}` assertions.
 * @returns Map from node id → OntologyNode.
 * @complexity O(n) where n = number of assertions.
 */
export function buildOntologyHierarchy(
  assertions: ReadonlyArray<
    | { kind: 'subset'; parent: string; child: string }
    | { kind: 'member'; category: string; individual: string }
  >
): ReadonlyMap<string, OntologyNode> {
  const nodes = new Map<string, { id: string; label: string; children: string[]; properties: string[] }>();

  const getOrCreate = (id: string) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: id, children: [], properties: [] });
    }
    return nodes.get(id)!;
  };

  for (const assertion of assertions) {
    if (assertion.kind === 'subset') {
      getOrCreate(assertion.parent).children.push(assertion.child);
      getOrCreate(assertion.child);
    } else {
      // member — individual belongs to category
      getOrCreate(assertion.category).children.push(assertion.individual);
      getOrCreate(assertion.individual);
    }
  }

  // Freeze to match ReadonlyArray contract
  const result = new Map<string, OntologyNode>();
  for (const [id, node] of nodes) {
    result.set(id, {
      id: node.id,
      label: node.label,
      children: Object.freeze([...node.children]),
      properties: Object.freeze([...node.properties]),
    });
  }
  return result;
}

/**
 * Return all ancestor ids of a node in the ontology hierarchy, walking from
 * the node upward to the root.  Performs a BFS over the hierarchy searching
 * for nodes that list `id` as a child.
 *
 * @param id - Node whose ancestors are requested.
 * @param hierarchy - Full hierarchy map.
 * @returns Array of ancestor ids ordered from direct parent to root.
 * @complexity O(n) where n = number of nodes.
 */
export function getAncestors(
  id: string,
  hierarchy: ReadonlyMap<string, OntologyNode>
): ReadonlyArray<string> {
  // Build child→parent index
  const parentOf = new Map<string, string>();
  for (const [nodeId, node] of hierarchy) {
    for (const child of node.children) {
      if (!parentOf.has(child)) {
        parentOf.set(child, nodeId);
      }
    }
  }

  const ancestors: string[] = [];
  let current = id;
  const visited = new Set<string>();
  while (parentOf.has(current)) {
    const parent = parentOf.get(current)!;
    if (visited.has(parent)) break;
    visited.add(parent);
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

/** One step of property-inheritance traversal. */
export interface InheritanceStep {
  readonly node: string;
  readonly foundProperty: boolean;
  readonly action: string;
}

/**
 * Perform property inheritance lookup (AIMA §10.2).  Walks from `startId`
 * toward the root via `parentMap`, looking for the first node that declares
 * `property` in `propertyOwner`.
 *
 * @param startId - The node to start the lookup from.
 * @param property - Property name to find.
 * @param propertyOwner - Map from node id → properties declared on that node.
 * @param parentMap - Map from child id → parent id.
 * @returns Array of InheritanceStep objects recording the traversal.
 * @complexity O(d) where d = depth of hierarchy.
 */
export function inheritProperty(
  startId: string,
  property: string,
  propertyOwner: ReadonlyMap<string, ReadonlyArray<string>>,
  parentMap: ReadonlyMap<string, string>
): ReadonlyArray<InheritanceStep> {
  const steps: InheritanceStep[] = [];
  let current: string | undefined = startId;
  const visited = new Set<string>();

  while (current !== undefined) {
    if (visited.has(current)) {
      steps.push({ node: current, foundProperty: false, action: 'cycle detected — stopping' });
      break;
    }
    visited.add(current);

    const ownProps = propertyOwner.get(current) ?? [];
    const found = ownProps.includes(property);

    steps.push({
      node: current,
      foundProperty: found,
      action: found
        ? `Found property "${property}" on node "${current}"`
        : `Property "${property}" not on "${current}", moving to parent`,
    });

    if (found) break;

    const parent = parentMap.get(current);
    if (parent === undefined) {
      steps.push({
        node: current,
        foundProperty: false,
        action: `Reached root without finding "${property}"`,
      });
      break;
    }
    current = parent;
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.3.1  Allen's Interval Relations
// ─────────────────────────────────────────────────────────────────────────────

/** A closed time interval [start, end]. */
export interface TimeInterval {
  readonly start: number;
  readonly end: number;
}

/**
 * The 13 mutually-exclusive temporal relations between two intervals, as
 * defined by Allen (1983) and referenced in AIMA §10.3.
 */
export type AllenRelation =
  | 'precedes'
  | 'meets'
  | 'overlaps'
  | 'starts'
  | 'during'
  | 'finishes'
  | 'equals'
  | 'preceded-by'
  | 'met-by'
  | 'overlapped-by'
  | 'started-by'
  | 'contains'
  | 'finished-by';

/**
 * Compute the Allen interval relation between two intervals a and b.
 *
 * @param a - First interval.
 * @param b - Second interval.
 * @returns The single AllenRelation that holds between a and b.
 * @complexity O(1)
 */
export function allenRelation(a: TimeInterval, b: TimeInterval): AllenRelation {
  const { start: as, end: ae } = a;
  const { start: bs, end: be } = b;

  // Canonical ordering of all 13 Allen relations (most-specific first to avoid
  // falling through to less-specific cases)
  if (ae < bs)                               return 'precedes';
  if (ae === bs)                             return 'meets';
  if (as > be)                               return 'preceded-by';
  if (as === be)                             return 'met-by';
  if (as === bs && ae === be)                return 'equals';
  if (as === bs && ae < be)                  return 'starts';
  if (as === bs && ae > be)                  return 'started-by';
  if (as > bs && ae === be)                  return 'finishes';
  if (as < bs && ae === be)                  return 'finished-by';
  if (as > bs && ae < be)                    return 'during';
  if (as < bs && ae > be)                    return 'contains';
  if (as < bs && ae > bs && ae < be)         return 'overlaps';
  // as > bs && as < be && ae > be (i begins after j, ends after j)
  // v8 ignore start
  return 'overlapped-by';
  // v8 ignore stop
}

/** A single step in an Allen-relation computation, carrying full context. */
export interface AllenStep {
  readonly relation: AllenRelation;
  readonly description: string;
  readonly aStart: number;
  readonly aEnd: number;
  readonly bStart: number;
  readonly bEnd: number;
}

/**
 * Return a one-element step array describing the Allen relation between a and b.
 *
 * @param a - First interval.
 * @param b - Second interval.
 * @returns Single-element array with the computed AllenStep.
 * @complexity O(1)
 */
export function computeAllenSteps(
  a: TimeInterval,
  b: TimeInterval
): ReadonlyArray<AllenStep> {
  const relation = allenRelation(a, b);
  const descriptions: Record<AllenRelation, string> = {
    precedes: 'A ends before B starts',
    meets: 'A ends exactly where B starts',
    overlaps: 'A starts before B, and they overlap',
    starts: 'A and B start together; A ends first',
    during: 'A is entirely within B',
    finishes: 'A ends with B; B starts first',
    equals: 'A and B are identical intervals',
    'preceded-by': 'B ends before A starts',
    'met-by': 'B ends exactly where A starts',
    'overlapped-by': 'B starts before A, and they overlap',
    'started-by': 'A and B start together; B ends first',
    contains: 'B is entirely within A',
    'finished-by': 'A ends with B; A starts first',
  };
  return [
    {
      relation,
      description: descriptions[relation],
      aStart: a.start,
      aEnd: a.end,
      bStart: b.start,
      bEnd: b.end,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.3  Event Calculus
// ─────────────────────────────────────────────────────────────────────────────

/** A fluent — a time-varying property of the world. */
export interface Fluent {
  readonly name: string;
}

/** An event that initiates and/or terminates fluents during [start, end]. */
export interface EventCalcEvent {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  /** Fluent names initiated (made true) when this event starts. */
  readonly initiates: ReadonlyArray<string>;
  /** Fluent names terminated (made false) when this event ends. */
  readonly terminates: ReadonlyArray<string>;
}

/** One recorded step in the event-calculus trace. */
export interface EventCalcStep {
  readonly time: number;
  readonly action: string;
  readonly activeFluents: ReadonlyArray<string>;
  readonly eventId: string | null;
}

/**
 * Check whether a fluent is true at `time` given the event history and initial
 * fluents (AIMA §10.3 — simplified event calculus).
 *
 * A fluent is true at time t if:
 *   - it was in initialFluents AND no event terminates it before t, OR
 *   - some event initiates it at event.start ≤ t AND no later event
 *     terminates it before t.
 *
 * @param fluentName - Fluent to test.
 * @param time - Time point.
 * @param events - Sorted or unsorted event list.
 * @param initialFluents - Fluent names true at time 0.
 * @returns `true` if the fluent holds at `time`.
 * @complexity O(e) where e = number of events.
 */
export function isTrueAt(
  fluentName: string,
  time: number,
  events: ReadonlyArray<EventCalcEvent>,
  initialFluents: ReadonlyArray<string>
): boolean {
  // INITIAL_TIME represents time "before all events" — fluents that are true initially
  // are treated as initiated at negative infinity, meaning they hold from the start.
  const INITIAL_TIME = Number.NEGATIVE_INFINITY;
  const initiations: number[] = initialFluents.includes(fluentName) ? [INITIAL_TIME] : [];
  const terminations: number[] = [];

  for (const ev of events) {
    if (ev.initiates.includes(fluentName) && ev.start <= time) {
      initiations.push(ev.start);
    }
    if (ev.terminates.includes(fluentName) && ev.start <= time) {
      terminations.push(ev.start);
    }
  }

  if (initiations.length === 0) return false;

  // Latest initiation at or before time
  const latestInit = Math.max(...initiations);

  // Is there any termination strictly after latestInit and at or before time?
  for (const term of terminations) {
    if (term > latestInit && term <= time) return false;
  }

  return true;
}

/**
 * Produce a step-by-step trace of fluent states across the given time points
 * (AIMA §10.3 event calculus).
 *
 * @param events - Events to process.
 * @param initialFluents - Fluents that are true before any event.
 * @param timePoints - Ordered time points at which to record state.
 * @returns Array of EventCalcStep — one per time point plus event-boundary steps.
 * @complexity O(t × e × f) where t = timePoints, e = events, f = fluents.
 */
export function eventCalcTrace(
  events: ReadonlyArray<EventCalcEvent>,
  initialFluents: ReadonlyArray<string>,
  timePoints: ReadonlyArray<number>
): ReadonlyArray<EventCalcStep> {
  const steps: EventCalcStep[] = [];

  // Collect all unique fluent names
  const allFluents = new Set<string>(initialFluents);
  for (const ev of events) {
    for (const f of ev.initiates) allFluents.add(f);
    for (const f of ev.terminates) allFluents.add(f);
  }

  for (const t of timePoints) {
    // Find event active at this time (start ≤ t ≤ end)
    const activeEvent = events.find(ev => ev.start <= t && ev.end >= t) ?? null;

    const activeFluents = [...allFluents].filter(f =>
      isTrueAt(f, t, events, initialFluents)
    );

    const action = activeEvent
      ? `t=${t}: event "${activeEvent.id}" active — fluents updated`
      : `t=${t}: no active event — fluents unchanged`;

    steps.push({
      time: t,
      action,
      activeFluents: Object.freeze([...activeFluents]),
      eventId: activeEvent?.id ?? null,
    });
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.5  Description Logic (CLASSIC-style subset)
// ─────────────────────────────────────────────────────────────────────────────

/** A DL concept expression — subset of CLASSIC (AIMA §10.5.2). */
export type DLConcept =
  | { readonly kind: 'top' }
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'and'; readonly concepts: ReadonlyArray<DLConcept> }
  | { readonly kind: 'all'; readonly role: string; readonly filler: DLConcept }
  | { readonly kind: 'atleast'; readonly n: number; readonly role: string }
  | { readonly kind: 'atmost'; readonly n: number; readonly role: string };

/** An individual with primitive memberships, role assertions, and role counts. */
export interface DLIndividual {
  readonly name: string;
  /** Primitive concept names this individual belongs to. */
  readonly memberOf: ReadonlyArray<string>;
  /** Role assertions (subject → filler name). */
  readonly roles: ReadonlyArray<{ role: string; filler: string }>;
  /** Pre-computed counts for ≥n / ≤n restrictions. */
  readonly roleCounts: ReadonlyArray<{ role: string; count: number }>;
}

/** One step of a DL classification proof. */
export interface DLClassifyStep {
  readonly action: string;
  /** String rendering of the concept being tested. */
  readonly concept: string;
  readonly result: boolean | 'pending';
}

/**
 * Render a DL concept as a human-readable string.
 *
 * @param concept - Concept to render.
 * @returns String representation.
 * @complexity O(n) in concept tree size.
 */
export function dlConceptToString(concept: DLConcept): string {
  switch (concept.kind) {
    case 'top':
      return '⊤';
    case 'name':
      return concept.name;
    case 'and':
      return `(${concept.concepts.map(dlConceptToString).join(' ⊓ ')})`;
    case 'all':
      return `(∀${concept.role}.${dlConceptToString(concept.filler)})`;
    case 'atleast':
      return `(≥${concept.n} ${concept.role})`;
    case 'atmost':
      return `(≤${concept.n} ${concept.role})`;
  }
}

/**
 * Check whether an individual satisfies a DL concept (AIMA §10.5.2).
 * Returns a proof-trace as an array of DLClassifyStep.
 *
 * Supported constructs:
 *   - ⊤ (top) — always satisfied
 *   - named concept — check individual.memberOf
 *   - conjunction (⊓) — all conjuncts must hold
 *   - ∀R.C (all-values) — every R-filler of the individual satisfies C
 *   - ≥n R (at-least) — individual has ≥ n R-role fillers
 *   - ≤n R (at-most)  — individual has ≤ n R-role fillers
 *
 * @param individual - Individual to classify.
 * @param concept - DL concept to test against.
 * @param allIndividuals - Map of all individuals (for ∀R.C checks).
 * @returns Array of DLClassifyStep tracing the proof.
 * @complexity O(n × f) where n = concept tree nodes, f = role fillers.
 */
export function dlClassify(
  individual: DLIndividual,
  concept: DLConcept,
  allIndividuals: ReadonlyMap<string, DLIndividual>
): ReadonlyArray<DLClassifyStep> {
  const steps: DLClassifyStep[] = [];

  function check(ind: DLIndividual, c: DLConcept): boolean {
    const conceptStr = dlConceptToString(c);
    steps.push({ action: `Testing "${ind.name}" against ${conceptStr}`, concept: conceptStr, result: 'pending' });

    let result: boolean;

    switch (c.kind) {
      case 'top': {
        result = true;
        break;
      }
      case 'name': {
        result = ind.memberOf.includes(c.name);
        break;
      }
      case 'and': {
        result = c.concepts.every(sub => check(ind, sub));
        break;
      }
      case 'all': {
        const fillers = ind.roles.filter(r => r.role === c.role).map(r => r.filler);
        result = fillers.every(fillerName => {
          const fillerInd = allIndividuals.get(fillerName);
          if (fillerInd === undefined) return false;
          return check(fillerInd, c.filler);
        });
        break;
      }
      case 'atleast': {
        const count = ind.roleCounts.find(rc => rc.role === c.role)?.count ?? 0;
        result = count >= c.n;
        break;
      }
      case 'atmost': {
        const count = ind.roleCounts.find(rc => rc.role === c.role)?.count ?? 0;
        result = count <= c.n;
        break;
      }
    }

    steps.push({ action: `Result for "${ind.name}" against ${conceptStr}: ${String(result)}`, concept: conceptStr, result });
    return result;
  }

  check(individual, concept);
  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.6.1  Default Logic
// ─────────────────────────────────────────────────────────────────────────────

/** A Reiter default rule:  prerequisite : justification / conclusion. */
export interface DefaultRule {
  readonly id: string;
  /** Prerequisite formula string, e.g. "Bird(x)". */
  readonly prerequisite: string;
  /** Justification (consistency check), e.g. "Flies(x)". */
  readonly justification: string;
  /** Consequent, e.g. "Flies(x)". */
  readonly conclusion: string;
}

/** A ground fact in the default theory. */
export interface DefaultFact {
  readonly id: string;
  readonly formula: string;
}

/** One step in the default extension computation. */
export interface DefaultStep {
  readonly action: string;
  readonly ruleApplied: string | null;
  readonly conclusions: ReadonlyArray<string>;
  readonly blocked: ReadonlyArray<string>;
}

/**
 * Compute one extension of a default theory using a greedy fixed-point
 * algorithm (AIMA §10.6.1).  Rules are applied in order; a rule fires when:
 *   1. Its prerequisite is in the current extension.
 *   2. Its justification is consistent with the extension (i.e. the
 *      negation "¬justification" is NOT in the extension).
 *
 * @param facts - Initial ground facts forming Δ₀.
 * @param rules - Default rules.
 * @returns Array of DefaultStep tracing the computation.
 * @complexity O(r² × f) where r = rules, f = facts.
 */
export function computeDefaultExtension(
  facts: ReadonlyArray<DefaultFact>,
  rules: ReadonlyArray<DefaultRule>
): ReadonlyArray<DefaultStep> {
  const steps: DefaultStep[] = [];
  const extension = new Set<string>(facts.map(f => f.formula));
  const appliedRuleIds = new Set<string>();

  steps.push({
    action: `Initial extension: {${[...extension].join(', ')}}`,
    ruleApplied: null,
    conclusions: [...extension],
    blocked: [],
  });

  let changed = true;
  while (changed) {
    changed = false;
    const blocked: string[] = [];

    for (const rule of rules) {
      if (appliedRuleIds.has(rule.id)) continue;

      // Prerequisite must be in extension
      if (!extension.has(rule.prerequisite)) continue;

      // Justification must be consistent (negation not in extension)
      const negJustification = `¬${rule.justification}`;
      if (extension.has(negJustification)) {
        blocked.push(rule.id);
        continue;
      }

      // Fire rule
      extension.add(rule.conclusion);
      appliedRuleIds.add(rule.id);
      changed = true;

      steps.push({
        action: `Applied rule "${rule.id}": ${rule.prerequisite} : ${rule.justification} / ${rule.conclusion}`,
        ruleApplied: rule.id,
        conclusions: [...extension],
        blocked: [...blocked],
      });
    }
  }

  // Final step listing any blocked rules
  const finalBlocked = rules
    .filter(r => !appliedRuleIds.has(r.id) && extension.has(r.prerequisite))
    .map(r => r.id);

  steps.push({
    action: `Extension complete: {${[...extension].join(', ')}}`,
    ruleApplied: null,
    conclusions: [...extension],
    blocked: finalBlocked,
  });

  return steps;
}

/**
 * The Nixon Diamond (AIMA §10.6.1) — the canonical example of conflicting
 * defaults.  Nixon is both a Quaker (pacifist default) and a Republican
 * (non-pacifist default), yielding two possible extensions.
 *
 * @returns The fact/rule setup and both computed extensions.
 * @complexity O(1) — fixed example.
 */
export function nixonDiamond(): {
  readonly facts: ReadonlyArray<DefaultFact>;
  readonly rules: ReadonlyArray<DefaultRule>;
  readonly extension1: ReadonlyArray<DefaultStep>;
  readonly extension2: ReadonlyArray<DefaultStep>;
} {
  const facts: ReadonlyArray<DefaultFact> = [
    { id: 'f1', formula: 'Republican(Nixon)' },
    { id: 'f2', formula: 'Quaker(Nixon)' },
  ];

  // Rule order determines which extension we compute
  const rules1: ReadonlyArray<DefaultRule> = [
    {
      id: 'r-pacifist',
      prerequisite: 'Quaker(Nixon)',
      justification: 'Pacifist(Nixon)',
      conclusion: 'Pacifist(Nixon)',
    },
    {
      id: 'r-not-pacifist',
      prerequisite: 'Republican(Nixon)',
      justification: '¬Pacifist(Nixon)',
      conclusion: '¬Pacifist(Nixon)',
    },
  ];

  const rules2: ReadonlyArray<DefaultRule> = [
    {
      id: 'r-not-pacifist',
      prerequisite: 'Republican(Nixon)',
      justification: '¬Pacifist(Nixon)',
      conclusion: '¬Pacifist(Nixon)',
    },
    {
      id: 'r-pacifist',
      prerequisite: 'Quaker(Nixon)',
      justification: 'Pacifist(Nixon)',
      conclusion: 'Pacifist(Nixon)',
    },
  ];

  return {
    facts,
    rules: rules1,
    extension1: computeDefaultExtension(facts, rules1),
    extension2: computeDefaultExtension(facts, rules2),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.6.2  JTMS — Justification-based Truth Maintenance System
// ─────────────────────────────────────────────────────────────────────────────

/** A node in the JTMS belief base. */
export interface JTMSNode {
  readonly sentence: string;
  /** Each justification is an array of sentence ids that together support this sentence. */
  readonly justifications: ReadonlyArray<ReadonlyArray<string>>;
  readonly inKB: boolean;
}

/** One step produced by a JTMS operation. */
export interface JTMSStep {
  readonly action: string;
  readonly sentence: string;
  readonly kb: ReadonlyArray<{ sentence: string; inKB: boolean }>;
}

/** Serialize the current KB into a sorted snapshot for step recording. */
function kbSnapshot(kb: ReadonlyMap<string, JTMSNode>): ReadonlyArray<{ sentence: string; inKB: boolean }> {
  return [...kb.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sentence, node]) => ({ sentence, inKB: node.inKB }));
}

/**
 * Add a sentence to the JTMS with a given justification set (AIMA §10.6.2).
 * The sentence is believed (inKB = true) when all sentences in its justification
 * are also believed.
 *
 * @param kb - Current belief base.
 * @param sentence - Sentence to add.
 * @param justification - Array of sentence ids that justify this sentence.
 * @returns New KB and step trace.
 * @complexity O(n) where n = KB size.
 */
export function jtmsAdd(
  kb: ReadonlyMap<string, JTMSNode>,
  sentence: string,
  justification: ReadonlyArray<string>
): { readonly newKb: ReadonlyMap<string, JTMSNode>; readonly steps: ReadonlyArray<JTMSStep> } {
  const steps: JTMSStep[] = [];
  const mutable = new Map<string, JTMSNode>(kb);

  // Ensure all justification sentences exist in KB (not necessarily believed)
  for (const dep of justification) {
    if (!mutable.has(dep)) {
      mutable.set(dep, { sentence: dep, justifications: [], inKB: false });
    }
  }

  const allJustified = justification.every(dep => mutable.get(dep)?.inKB === true);

  const existing = mutable.get(sentence);
  const newJusts: ReadonlyArray<ReadonlyArray<string>> = existing
    ? [...existing.justifications, justification]
    : [justification];

  // Sentence is believed if ANY justification is fully supported
  const believedViaExisting =
    existing?.justifications.some(j => j.every(dep => mutable.get(dep)?.inKB === true)) ?? false;
  const inKB = allJustified || believedViaExisting;

  mutable.set(sentence, { sentence, justifications: newJusts, inKB });

  steps.push({
    action: `Added "${sentence}" with justification [${justification.join(', ')}]; inKB=${String(inKB)}`,
    sentence,
    kb: kbSnapshot(mutable),
  });

  return { newKb: mutable, steps };
}

/**
 * Retract a sentence from the JTMS and propagate the retraction to any
 * sentence whose every justification is broken by this retraction
 * (AIMA §10.6.2).
 *
 * @param kb - Current belief base.
 * @param sentence - Sentence to retract.
 * @returns New KB and step trace.
 * @complexity O(n²) in the worst case (cascading retractions).
 */
export function jtmsRetract(
  kb: ReadonlyMap<string, JTMSNode>,
  sentence: string
): { readonly newKb: ReadonlyMap<string, JTMSNode>; readonly steps: ReadonlyArray<JTMSStep> } {
  const steps: JTMSStep[] = [];
  const mutable = new Map<string, JTMSNode>(kb);

  if (!mutable.has(sentence)) {
    steps.push({ action: `"${sentence}" not in KB — nothing to retract`, sentence, kb: kbSnapshot(mutable) });
    return { newKb: mutable, steps };
  }

  // Queue for cascading removal
  const toRetract = new Set<string>([sentence]);
  const retracted: string[] = [];

  while (toRetract.size > 0) {
    const current = [...toRetract][0]!;
    toRetract.delete(current);

    const node = mutable.get(current)!;

    mutable.set(current, { ...node, inKB: false });
    retracted.push(current);

    steps.push({
      action: `Retracted "${current}"`,
      sentence: current,
      kb: kbSnapshot(mutable),
    });

    // Find any sentence whose EVERY justification now has at least one
    // unbelieved support — those sentences must also be retracted.
    for (const [sid, snode] of mutable) {
      if (!snode.inKB) continue;
      const allJustsBlocked = snode.justifications.every(just =>
        just.some(dep => mutable.get(dep)?.inKB === false)
      );
      if (allJustsBlocked) {
        toRetract.add(sid);
      }
    }
  }

  return { newKb: mutable, steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// §10.6.1  Circumscription
// ─────────────────────────────────────────────────────────────────────────────

/** A fact used in circumscription reasoning. */
export interface CircumscriptionFact {
  readonly id: string;
  readonly formula: string;
  /** True when this fact is an Abnormal(x) predicate instance. */
  readonly isAbnormal: boolean;
}

/** Result of a circumscription computation. */
export interface CircumscriptionResult {
  /** Abnormal predicates that were NOT minimized away (still needed). */
  readonly minimizedAbnormals: ReadonlyArray<string>;
  /** Non-abnormal conclusions that are derivable under minimal abnormality. */
  readonly conclusions: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<{ action: string; formula: string }>;
}

/**
 * Apply circumscription to minimize abnormal predicates and derive default
 * conclusions (AIMA §10.6.1).
 *
 * Algorithm:
 *   1. Collect all Abnormal facts from `facts`.
 *   2. For each default `{ condition, abnormalPred, conclusion }`:
 *      - If the condition holds in the fact base AND `abnormalPred` is NOT
 *        in the fact base, add the conclusion (bird-flies reasoning).
 *      - If `abnormalPred` IS present, the default is blocked.
 *   3. Report which abnormals survive minimization.
 *
 * @param facts - Ground facts (some may be Abnormal predicates).
 * @param defaults - Default rules guarded by abnormality predicates.
 * @returns CircumscriptionResult with minimized abnormals and derived conclusions.
 * @complexity O(d × f) where d = defaults, f = facts.
 */
export function circumscribe(
  facts: ReadonlyArray<CircumscriptionFact>,
  defaults: ReadonlyArray<{ condition: string; abnormalPred: string; conclusion: string }>
): CircumscriptionResult {
  const stepsArr: { action: string; formula: string }[] = [];

  const knownFormulas = new Set<string>(facts.map(f => f.formula));
  const abnormalFacts = facts.filter(f => f.isAbnormal).map(f => f.formula);
  const abnormalSet = new Set<string>(abnormalFacts);

  stepsArr.push({
    action: 'Initial facts loaded',
    formula: [...knownFormulas].join(', '),
  });

  stepsArr.push({
    action: `Abnormal predicates in KB: ${abnormalFacts.length === 0 ? '∅' : abnormalFacts.join(', ')}`,
    formula: abnormalFacts.join(', '),
  });

  const conclusions: string[] = [];
  const minimizedAbnormals: string[] = [];

  for (const def of defaults) {
    if (!knownFormulas.has(def.condition)) {
      stepsArr.push({
        action: `Condition "${def.condition}" not in KB — skipping default`,
        formula: def.condition,
      });
      continue;
    }

    if (abnormalSet.has(def.abnormalPred)) {
      // Abnormal predicate present — default is blocked; abnormal survives
      minimizedAbnormals.push(def.abnormalPred);
      stepsArr.push({
        action: `"${def.abnormalPred}" present — blocks default conclusion "${def.conclusion}"`,
        formula: def.abnormalPred,
      });
    } else {
      // No abnormality — derive default conclusion
      conclusions.push(def.conclusion);
      stepsArr.push({
        action: `No abnormality for "${def.condition}" — deriving "${def.conclusion}"`,
        formula: def.conclusion,
      });
    }
  }

  stepsArr.push({
    action: `Circumscription complete — conclusions: {${conclusions.join(', ')}}`,
    formula: conclusions.join(', '),
  });

  return {
    minimizedAbnormals: Object.freeze([...minimizedAbnormals]),
    conclusions: Object.freeze([...conclusions]),
    steps: Object.freeze([...stepsArr]),
  };
}
