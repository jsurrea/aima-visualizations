import { describe, it, expect } from 'vitest';
import {
  buildOntologyHierarchy,
  getAncestors,
  inheritProperty,
  allenRelation,
  computeAllenSteps,
  isTrueAt,
  eventCalcTrace,
  dlClassify,
  dlConceptToString,
  computeDefaultExtension,
  nixonDiamond,
  jtmsAdd,
  jtmsRetract,
  circumscribe,
} from '../src/algorithms/index';
import type {
  OntologyNode,
  TimeInterval,
  EventCalcEvent,
  DLConcept,
  DLIndividual,
  DefaultFact,
  DefaultRule,
  JTMSNode,
  CircumscriptionFact,
} from '../src/algorithms/index';

// ─── Ontology ────────────────────────────────────────────────────────────────

describe('buildOntologyHierarchy', () => {
  it('builds subset hierarchy', () => {
    const result = buildOntologyHierarchy([
      { kind: 'subset', parent: 'Animal', child: 'Bird' },
      { kind: 'subset', parent: 'Bird', child: 'Penguin' },
    ]);
    expect(result.get('Animal')?.children).toContain('Bird');
    expect(result.get('Bird')?.children).toContain('Penguin');
    expect(result.has('Penguin')).toBe(true);
  });

  it('builds member assertions', () => {
    const result = buildOntologyHierarchy([
      { kind: 'member', category: 'Bird', individual: 'Tweety' },
    ]);
    expect(result.get('Bird')?.children).toContain('Tweety');
    expect(result.has('Tweety')).toBe(true);
  });

  it('handles mixed assertions', () => {
    const result = buildOntologyHierarchy([
      { kind: 'subset', parent: 'Animal', child: 'Bird' },
      { kind: 'member', category: 'Bird', individual: 'Tweety' },
    ]);
    expect(result.size).toBe(3);
  });

  it('handles empty assertions', () => {
    const result = buildOntologyHierarchy([]);
    expect(result.size).toBe(0);
  });

  it('ignores duplicate parent assignment for the same child', () => {
    // Two subset assertions giving 'Bird' two parents — first parent wins in parentOf
    const result = buildOntologyHierarchy([
      { kind: 'subset', parent: 'Animal', child: 'Bird' },
      { kind: 'subset', parent: 'LivingThing', child: 'Bird' },
    ]);
    // Both parents list Bird as a child
    expect(result.get('Animal')?.children).toContain('Bird');
    expect(result.get('LivingThing')?.children).toContain('Bird');
  });
});

describe('getAncestors', () => {
  it('returns parent chain in order', () => {
    const h = buildOntologyHierarchy([
      { kind: 'subset', parent: 'LivingThing', child: 'Animal' },
      { kind: 'subset', parent: 'Animal', child: 'Bird' },
      { kind: 'subset', parent: 'Bird', child: 'Penguin' },
    ]);
    const ancestors = getAncestors('Penguin', h);
    expect(ancestors[0]).toBe('Bird');
    expect(ancestors[1]).toBe('Animal');
    expect(ancestors[2]).toBe('LivingThing');
  });

  it('returns empty for root node', () => {
    const h = buildOntologyHierarchy([
      { kind: 'subset', parent: 'Animal', child: 'Bird' },
    ]);
    expect(getAncestors('Animal', h)).toHaveLength(0);
  });

  it('returns empty for unknown node', () => {
    const h = buildOntologyHierarchy([]);
    expect(getAncestors('X', h)).toHaveLength(0);
  });

  it('stops on cycle in hierarchy', () => {
    // Manually create a cyclic hierarchy (A→B→A)
    const cyclic = new Map<string, OntologyNode>([
      ['A', { id: 'A', label: 'A', children: ['B'], properties: [] }],
      ['B', { id: 'B', label: 'B', children: ['A'], properties: [] }],
    ]);
    // Should not infinite-loop
    const ancestors = getAncestors('A', cyclic);
    expect(ancestors.length).toBeLessThan(5);
  });

  it('uses first parent when child has multiple parents (diamond)', () => {
    // C appears in both A and B's children — parentOf should keep first assignment
    const diamond = new Map<string, OntologyNode>([
      ['A', { id: 'A', label: 'A', children: ['C'], properties: [] }],
      ['B', { id: 'B', label: 'B', children: ['C'], properties: [] }],
      ['C', { id: 'C', label: 'C', children: [], properties: [] }],
    ]);
    const ancestors = getAncestors('C', diamond);
    expect(ancestors).toHaveLength(1); // only one parent recorded
  });
});

describe('inheritProperty', () => {
  it('finds property on the start node itself', () => {
    const owner = new Map([['Bird', ['canFly']]]);
    const parent = new Map([['Bird', 'Animal']]);
    const steps = inheritProperty('Bird', 'canFly', owner, parent);
    expect(steps.some(s => s.foundProperty)).toBe(true);
    expect(steps[0]?.node).toBe('Bird');
  });

  it('finds property on ancestor', () => {
    const owner = new Map([['Animal', ['breathes']], ['Bird', []]]);
    const parent = new Map([['Bird', 'Animal']]);
    const steps = inheritProperty('Bird', 'breathes', owner, parent);
    const foundStep = steps.find(s => s.foundProperty);
    expect(foundStep?.node).toBe('Animal');
  });

  it('reports not-found when property is absent in whole chain', () => {
    const owner = new Map<string, ReadonlyArray<string>>([['Bird', []], ['Animal', []]]);
    const parent = new Map([['Bird', 'Animal']]);
    const steps = inheritProperty('Bird', 'canSwim', owner, parent);
    expect(steps.every(s => !s.foundProperty)).toBe(true);
    expect(steps[steps.length - 1]?.action).toMatch(/root|Reached/);
  });

  it('handles cycle gracefully', () => {
    const owner = new Map<string, ReadonlyArray<string>>([['A', []], ['B', []]]);
    const parent = new Map([['A', 'B'], ['B', 'A']]);
    const steps = inheritProperty('A', 'p', owner, parent);
    expect(steps.some(s => s.action.includes('cycle'))).toBe(true);
  });

  it('handles node not in propertyOwner map (falls back to empty)', () => {
    // 'Bird' is not in propertyOwner at all — should fall back to [] and continue
    const owner = new Map<string, ReadonlyArray<string>>([['Animal', ['breathes']]]);
    const parent = new Map([['Bird', 'Animal']]);
    const steps = inheritProperty('Bird', 'breathes', owner, parent);
    const foundStep = steps.find(s => s.foundProperty);
    expect(foundStep?.node).toBe('Animal');
  });
});

// ─── Allen's Interval Relations ───────────────────────────────────────────────

describe('allenRelation', () => {
  const cases: [TimeInterval, TimeInterval, string][] = [
    [{ start: 1, end: 2 }, { start: 4, end: 6 }, 'precedes'],
    [{ start: 1, end: 3 }, { start: 3, end: 6 }, 'meets'],
    [{ start: 1, end: 4 }, { start: 3, end: 6 }, 'overlaps'],
    [{ start: 1, end: 3 }, { start: 1, end: 6 }, 'starts'],
    [{ start: 2, end: 4 }, { start: 1, end: 6 }, 'during'],
    [{ start: 3, end: 6 }, { start: 1, end: 6 }, 'finishes'],
    [{ start: 1, end: 6 }, { start: 1, end: 6 }, 'equals'],
    [{ start: 4, end: 6 }, { start: 1, end: 2 }, 'preceded-by'],
    [{ start: 3, end: 6 }, { start: 1, end: 3 }, 'met-by'],
    [{ start: 3, end: 6 }, { start: 1, end: 4 }, 'overlapped-by'],
    [{ start: 1, end: 6 }, { start: 1, end: 3 }, 'started-by'],
    [{ start: 1, end: 6 }, { start: 2, end: 4 }, 'contains'],
    [{ start: 1, end: 6 }, { start: 3, end: 6 }, 'finished-by'],
  ];

  for (const [a, b, expected] of cases) {
    it(`[${a.start},${a.end}] vs [${b.start},${b.end}] → ${expected}`, () => {
      expect(allenRelation(a, b)).toBe(expected);
    });
  }
});

describe('computeAllenSteps', () => {
  it('returns one step with matching relation', () => {
    const steps = computeAllenSteps({ start: 1, end: 2 }, { start: 4, end: 6 });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.relation).toBe('precedes');
    expect(steps[0]?.description).toBeTruthy();
  });

  it('carries interval coordinates in step', () => {
    const a: TimeInterval = { start: 1, end: 3 };
    const b: TimeInterval = { start: 3, end: 6 };
    const [step] = computeAllenSteps(a, b);
    expect(step?.aStart).toBe(1);
    expect(step?.bEnd).toBe(6);
  });
});

// ─── Event Calculus ───────────────────────────────────────────────────────────

describe('isTrueAt', () => {
  const events: EventCalcEvent[] = [
    { id: 'e1', start: 2, end: 4, initiates: ['Lit'], terminates: [] },
    { id: 'e2', start: 5, end: 7, initiates: [], terminates: ['Lit'] },
  ];

  it('initial fluent is true before events', () => {
    expect(isTrueAt('Alive', 0, [], ['Alive'])).toBe(true);
  });

  it('fluent initiated by event is true after event start', () => {
    expect(isTrueAt('Lit', 3, events, [])).toBe(true);
  });

  it('fluent terminated by later event is false afterwards', () => {
    expect(isTrueAt('Lit', 6, events, [])).toBe(false);
  });

  it('unknown fluent is false', () => {
    expect(isTrueAt('Invisible', 5, events, [])).toBe(false);
  });

  it('initial fluent terminated is false afterwards', () => {
    const ev: EventCalcEvent[] = [
      { id: 'e1', start: 1, end: 3, initiates: [], terminates: ['Alive'] },
    ];
    expect(isTrueAt('Alive', 5, ev, ['Alive'])).toBe(false);
  });

  it('fluent re-initiated after termination is true again', () => {
    // e1 terminates Lit at t=2, e2 re-initiates Lit at t=4
    const ev: EventCalcEvent[] = [
      { id: 'e1', start: 2, end: 3, initiates: [], terminates: ['Lit'] },
      { id: 'e2', start: 4, end: 5, initiates: ['Lit'], terminates: [] },
    ];
    // At t=5: latest initiation is 4, termination at 2 < 4 → still true
    expect(isTrueAt('Lit', 5, ev, ['Lit'])).toBe(true);
  });
});

describe('eventCalcTrace', () => {
  const events: EventCalcEvent[] = [
    { id: 'e1', start: 1, end: 2, initiates: ['Power'], terminates: [] },
    { id: 'e2', start: 3, end: 4, initiates: [], terminates: ['Power'] },
  ];

  it('produces one step per time point', () => {
    const steps = eventCalcTrace(events, [], [0, 1, 2, 3, 4]);
    expect(steps).toHaveLength(5);
  });

  it('records active event id when applicable', () => {
    const steps = eventCalcTrace(events, [], [1]);
    expect(steps[0]?.eventId).toBe('e1');
  });

  it('null eventId when no event active', () => {
    const steps = eventCalcTrace(events, [], [0]);
    expect(steps[0]?.eventId).toBeNull();
  });

  it('correct fluents at each time', () => {
    const steps = eventCalcTrace(events, [], [2, 5]);
    const powerAt2 = steps[0]?.activeFluents.includes('Power');
    const powerAt5 = steps[1]?.activeFluents.includes('Power');
    expect(powerAt2).toBe(true);
    expect(powerAt5).toBe(false);
  });
});

// ─── Description Logic ────────────────────────────────────────────────────────

describe('dlConceptToString', () => {
  it('top', () => expect(dlConceptToString({ kind: 'top' })).toBe('⊤'));
  it('name', () => expect(dlConceptToString({ kind: 'name', name: 'Bird' })).toBe('Bird'));
  it('and', () => {
    const c: DLConcept = { kind: 'and', concepts: [{ kind: 'name', name: 'A' }, { kind: 'name', name: 'B' }] };
    expect(dlConceptToString(c)).toBe('(A ⊓ B)');
  });
  it('all', () => {
    const c: DLConcept = { kind: 'all', role: 'hasChild', filler: { kind: 'name', name: 'Human' } };
    expect(dlConceptToString(c)).toBe('(∀hasChild.Human)');
  });
  it('atleast', () => expect(dlConceptToString({ kind: 'atleast', n: 2, role: 'hasChild' })).toBe('(≥2 hasChild)'));
  it('atmost', () => expect(dlConceptToString({ kind: 'atmost', n: 1, role: 'hasChild' })).toBe('(≤1 hasChild)'));
});

describe('dlClassify', () => {
  const tweety: DLIndividual = {
    name: 'Tweety',
    memberOf: ['Bird', 'Animal'],
    roles: [{ role: 'hasChild', filler: 'Tweety2' }],
    roleCounts: [{ role: 'hasChild', count: 1 }],
  };
  const tweety2: DLIndividual = {
    name: 'Tweety2',
    memberOf: ['Bird'],
    roles: [],
    roleCounts: [],
  };
  const individuals = new Map<string, DLIndividual>([
    ['Tweety', tweety],
    ['Tweety2', tweety2],
  ]);

  it('top is always satisfied', () => {
    const steps = dlClassify(tweety, { kind: 'top' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('named concept membership succeeds', () => {
    const steps = dlClassify(tweety, { kind: 'name', name: 'Bird' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('named concept membership fails', () => {
    const steps = dlClassify(tweety, { kind: 'name', name: 'Fish' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('conjunction succeeds when all hold', () => {
    const c: DLConcept = {
      kind: 'and',
      concepts: [{ kind: 'name', name: 'Bird' }, { kind: 'name', name: 'Animal' }],
    };
    const steps = dlClassify(tweety, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('conjunction fails when one does not hold', () => {
    const c: DLConcept = {
      kind: 'and',
      concepts: [{ kind: 'name', name: 'Bird' }, { kind: 'name', name: 'Fish' }],
    };
    const steps = dlClassify(tweety, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('all-values succeeds when filler satisfies concept', () => {
    const c: DLConcept = {
      kind: 'all',
      role: 'hasChild',
      filler: { kind: 'name', name: 'Bird' },
    };
    const steps = dlClassify(tweety, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('all-values fails when filler does not satisfy concept', () => {
    const c: DLConcept = {
      kind: 'all',
      role: 'hasChild',
      filler: { kind: 'name', name: 'Fish' },
    };
    const steps = dlClassify(tweety, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('all-values vacuously true when no role fillers', () => {
    const c: DLConcept = { kind: 'all', role: 'hasParent', filler: { kind: 'name', name: 'Alien' } };
    const steps = dlClassify(tweety, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('all-values fails when filler individual not found', () => {
    const indWithMissing: DLIndividual = {
      ...tweety,
      roles: [{ role: 'hasChild', filler: 'Ghost' }],
    };
    const c: DLConcept = { kind: 'all', role: 'hasChild', filler: { kind: 'name', name: 'Bird' } };
    const steps = dlClassify(indWithMissing, c, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('at-least satisfied', () => {
    const steps = dlClassify(tweety, { kind: 'atleast', n: 1, role: 'hasChild' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('at-least not satisfied', () => {
    const steps = dlClassify(tweety, { kind: 'atleast', n: 3, role: 'hasChild' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('at-most satisfied', () => {
    const steps = dlClassify(tweety, { kind: 'atmost', n: 2, role: 'hasChild' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(true);
  });

  it('at-most not satisfied', () => {
    const steps = dlClassify(tweety, { kind: 'atmost', n: 0, role: 'hasChild' }, individuals);
    expect(steps[steps.length - 1]?.result).toBe(false);
  });

  it('at-least / at-most defaults to 0 when role not in roleCounts', () => {
    const c1: DLConcept = { kind: 'atleast', n: 0, role: 'unknownRole' };
    const c2: DLConcept = { kind: 'atmost', n: 1, role: 'unknownRole' };
    const steps1 = dlClassify(tweety, c1, individuals);
    const steps2 = dlClassify(tweety, c2, individuals);
    expect(steps1[steps1.length - 1]?.result).toBe(true);
    expect(steps2[steps2.length - 1]?.result).toBe(true);
  });
});

// ─── Default Logic ────────────────────────────────────────────────────────────

describe('computeDefaultExtension', () => {
  const facts: DefaultFact[] = [
    { id: 'f1', formula: 'Bird(Tweety)' },
  ];
  const rules: DefaultRule[] = [
    {
      id: 'r1',
      prerequisite: 'Bird(Tweety)',
      justification: 'Flies(Tweety)',
      conclusion: 'Flies(Tweety)',
    },
  ];

  it('applies applicable rule', () => {
    const steps = computeDefaultExtension(facts, rules);
    const applied = steps.find(s => s.ruleApplied === 'r1');
    expect(applied).toBeDefined();
    expect(applied?.conclusions).toContain('Flies(Tweety)');
  });

  it('blocks rule when negation of justification in extension', () => {
    const blockedFacts: DefaultFact[] = [
      { id: 'f1', formula: 'Bird(Tweety)' },
      { id: 'f2', formula: '¬Flies(Tweety)' },
    ];
    const steps = computeDefaultExtension(blockedFacts, rules);
    const applied = steps.find(s => s.ruleApplied === 'r1');
    expect(applied).toBeUndefined();
  });

  it('does not reapply a rule', () => {
    const steps = computeDefaultExtension(facts, rules);
    const applied = steps.filter(s => s.ruleApplied === 'r1');
    expect(applied.length).toBe(1);
  });

  it('skips rule when prerequisite not in extension', () => {
    const steps = computeDefaultExtension([], rules);
    const applied = steps.find(s => s.ruleApplied === 'r1');
    expect(applied).toBeUndefined();
  });
});

describe('nixonDiamond', () => {
  it('returns two distinct extensions', () => {
    const { extension1, extension2 } = nixonDiamond();
    const concl1 = extension1[extension1.length - 1]?.conclusions ?? [];
    const concl2 = extension2[extension2.length - 1]?.conclusions ?? [];
    // One extension has Pacifist, the other has ¬Pacifist
    const hasPacifist1 = concl1.includes('Pacifist(Nixon)');
    const hasNotPacifist2 = concl2.includes('¬Pacifist(Nixon)');
    expect(hasPacifist1).toBe(true);
    expect(hasNotPacifist2).toBe(true);
  });

  it('facts include Republican and Quaker', () => {
    const { facts } = nixonDiamond();
    expect(facts.map(f => f.formula)).toContain('Republican(Nixon)');
    expect(facts.map(f => f.formula)).toContain('Quaker(Nixon)');
  });
});

// ─── JTMS ─────────────────────────────────────────────────────────────────────

describe('jtmsAdd', () => {
  it('adds believed sentence when justification is empty', () => {
    const kb = new Map<string, JTMSNode>();
    const { newKb } = jtmsAdd(kb, 'A', []);
    expect(newKb.get('A')?.inKB).toBe(true);
  });

  it('adds sentence as believed when all justification sentences are believed', () => {
    const kb0 = new Map<string, JTMSNode>([
      ['A', { sentence: 'A', justifications: [[]], inKB: true }],
    ]);
    const { newKb } = jtmsAdd(kb0, 'B', ['A']);
    expect(newKb.get('B')?.inKB).toBe(true);
  });

  it('sentence not believed when dependency not believed', () => {
    const kb = new Map<string, JTMSNode>([
      ['A', { sentence: 'A', justifications: [], inKB: false }],
    ]);
    const { newKb } = jtmsAdd(kb, 'B', ['A']);
    expect(newKb.get('B')?.inKB).toBe(false);
  });

  it('produces steps', () => {
    const { steps } = jtmsAdd(new Map(), 'X', []);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('appends new justification to existing sentence', () => {
    const kb0 = new Map<string, JTMSNode>();
    const { newKb: kb1 } = jtmsAdd(kb0, 'A', []);
    const { newKb } = jtmsAdd(kb1, 'A', ['X']);
    expect(newKb.get('A')?.justifications.length).toBeGreaterThanOrEqual(2);
  });
});

describe('jtmsRetract', () => {
  it('retracts existing sentence', () => {
    const kb0 = new Map<string, JTMSNode>();
    const { newKb: kb1 } = jtmsAdd(kb0, 'A', []);
    const { newKb } = jtmsRetract(kb1, 'A');
    expect(newKb.get('A')?.inKB).toBe(false);
  });

  it('cascades retraction to dependents', () => {
    const kb0 = new Map<string, JTMSNode>();
    const { newKb: kb1 } = jtmsAdd(kb0, 'A', []);
    const { newKb: kb2 } = jtmsAdd(kb1, 'B', ['A']);
    const { newKb } = jtmsRetract(kb2, 'A');
    expect(newKb.get('B')?.inKB).toBe(false);
  });

  it('sentence not retracted if it has another valid justification', () => {
    const kb0 = new Map<string, JTMSNode>();
    const { newKb: kb1 } = jtmsAdd(kb0, 'A', []);
    const { newKb: kb2 } = jtmsAdd(kb1, 'C', []);
    const { newKb: kb3 } = jtmsAdd(kb2, 'B', ['A']);
    // Add second justification via C
    const { newKb: kb4 } = jtmsAdd(kb3, 'B', ['C']);
    const { newKb } = jtmsRetract(kb4, 'A');
    // B still believed because C supports it
    expect(newKb.get('B')?.inKB).toBe(true);
  });

  it('handles retraction of non-existent sentence gracefully', () => {
    const kb = new Map<string, JTMSNode>();
    const { steps } = jtmsRetract(kb, 'Z');
    expect(steps[0]?.action).toMatch(/not in KB/);
  });

  it('produces steps', () => {
    const kb0 = new Map<string, JTMSNode>();
    const { newKb: kb1 } = jtmsAdd(kb0, 'A', []);
    const { steps } = jtmsRetract(kb1, 'A');
    expect(steps.length).toBeGreaterThan(0);
  });
});

// ─── Circumscription ──────────────────────────────────────────────────────────

describe('circumscribe', () => {
  const facts: CircumscriptionFact[] = [
    { id: 'f1', formula: 'Bird(Tweety)', isAbnormal: false },
  ];
  const defaults = [
    { condition: 'Bird(Tweety)', abnormalPred: 'Abnormal(Tweety)', conclusion: 'Flies(Tweety)' },
  ];

  it('derives default conclusion when no abnormality', () => {
    const result = circumscribe(facts, defaults);
    expect(result.conclusions).toContain('Flies(Tweety)');
    expect(result.minimizedAbnormals).toHaveLength(0);
  });

  it('blocks default when abnormal predicate present', () => {
    const abnFacts: CircumscriptionFact[] = [
      { id: 'f1', formula: 'Bird(Tweety)', isAbnormal: false },
      { id: 'f2', formula: 'Abnormal(Tweety)', isAbnormal: true },
    ];
    const result = circumscribe(abnFacts, defaults);
    expect(result.conclusions).not.toContain('Flies(Tweety)');
    expect(result.minimizedAbnormals).toContain('Abnormal(Tweety)');
  });

  it('skips defaults whose condition is not in KB', () => {
    const result = circumscribe([], defaults);
    expect(result.conclusions).toHaveLength(0);
  });

  it('produces steps', () => {
    const result = circumscribe(facts, defaults);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('handles empty facts and defaults', () => {
    const result = circumscribe([], []);
    expect(result.conclusions).toHaveLength(0);
    expect(result.minimizedAbnormals).toHaveLength(0);
  });
});
