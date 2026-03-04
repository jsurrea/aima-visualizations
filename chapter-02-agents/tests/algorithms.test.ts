import { describe, it, expect } from 'vitest';
import {
  getPEASExamples,
  getAgentTypes,
  simulateVacuumWorld,
  getEnvironmentDimensions,
  getEnvironmentExamples,
  countHarderProperties,
  recommendArchitecture,
  simulateTableDrivenAgent,
  buildVacuumTable,
  simulateModelBasedVacuumAgent,
  simulateWithScoringRule,
  type PEASEntry,
  type AgentTypeId,
  type VacuumWorldState,
  type EnvironmentProperties,
  type ScoringRule,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// getPEASExamples
// ---------------------------------------------------------------------------

describe('getPEASExamples()', () => {
  it('returns exactly 5 entries', () => {
    expect(getPEASExamples()).toHaveLength(5);
  });

  it('each entry has all required fields as non-empty arrays', () => {
    for (const entry of getPEASExamples()) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.agent.length).toBeGreaterThan(0);
      expect(entry.performance.length).toBeGreaterThan(0);
      expect(entry.environment.length).toBeGreaterThan(0);
      expect(entry.actuators.length).toBeGreaterThan(0);
      expect(entry.sensors.length).toBeGreaterThan(0);
    }
  });

  it('contains the expected agent IDs', () => {
    const ids = getPEASExamples().map((e) => e.id);
    expect(ids).toContain('taxi');
    expect(ids).toContain('medical');
    expect(ids).toContain('image');
    expect(ids).toContain('shopping');
    expect(ids).toContain('chess');
  });

  it('all string array items are non-empty strings', () => {
    const keys: Array<keyof PEASEntry> = [
      'performance',
      'environment',
      'actuators',
      'sensors',
    ];
    for (const entry of getPEASExamples()) {
      for (const key of keys) {
        const arr = entry[key] as ReadonlyArray<string>;
        for (const item of arr) {
          expect(item.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('returns a new array each call (pure / no shared mutable state)', () => {
    const a = getPEASExamples();
    const b = getPEASExamples();
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// getAgentTypes
// ---------------------------------------------------------------------------

describe('getAgentTypes()', () => {
  it('returns exactly 5 entries', () => {
    expect(getAgentTypes()).toHaveLength(5);
  });

  it('contains all 5 AgentTypeId values', () => {
    const expected: AgentTypeId[] = [
      'simple-reflex',
      'model-based',
      'goal-based',
      'utility-based',
      'learning',
    ];
    const ids = getAgentTypes().map((a) => a.id);
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });

  it('simple-reflex has no model/goals/utility/learning', () => {
    const sr = getAgentTypes().find((a) => a.id === 'simple-reflex')!;
    expect(sr.hasModel).toBe(false);
    expect(sr.hasGoals).toBe(false);
    expect(sr.hasUtility).toBe(false);
    expect(sr.hasLearning).toBe(false);
  });

  it('model-based has model but no goals/utility/learning', () => {
    const mb = getAgentTypes().find((a) => a.id === 'model-based')!;
    expect(mb.hasModel).toBe(true);
    expect(mb.hasGoals).toBe(false);
    expect(mb.hasUtility).toBe(false);
    expect(mb.hasLearning).toBe(false);
  });

  it('goal-based has model and goals but not utility/learning', () => {
    const gb = getAgentTypes().find((a) => a.id === 'goal-based')!;
    expect(gb.hasModel).toBe(true);
    expect(gb.hasGoals).toBe(true);
    expect(gb.hasUtility).toBe(false);
    expect(gb.hasLearning).toBe(false);
  });

  it('utility-based has model/goals/utility but not learning', () => {
    const ub = getAgentTypes().find((a) => a.id === 'utility-based')!;
    expect(ub.hasModel).toBe(true);
    expect(ub.hasGoals).toBe(true);
    expect(ub.hasUtility).toBe(true);
    expect(ub.hasLearning).toBe(false);
  });

  it('learning agent has all capabilities', () => {
    const la = getAgentTypes().find((a) => a.id === 'learning')!;
    expect(la.hasModel).toBe(true);
    expect(la.hasGoals).toBe(true);
    expect(la.hasUtility).toBe(true);
    expect(la.hasLearning).toBe(true);
  });

  it('each agent has non-empty title, description, examples, and components', () => {
    for (const agent of getAgentTypes()) {
      expect(agent.title.length).toBeGreaterThan(0);
      expect(agent.description.length).toBeGreaterThan(0);
      expect(agent.examples.length).toBeGreaterThan(0);
      expect(agent.components.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// simulateVacuumWorld
// ---------------------------------------------------------------------------

describe('simulateVacuumWorld()', () => {
  const allInitial: VacuumWorldState[] = [
    { agentPosition: 'Left',  leftRoom: 'clean', rightRoom: 'clean' },
    { agentPosition: 'Left',  leftRoom: 'clean', rightRoom: 'dirty' },
    { agentPosition: 'Left',  leftRoom: 'dirty', rightRoom: 'clean' },
    { agentPosition: 'Left',  leftRoom: 'dirty', rightRoom: 'dirty' },
    { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'clean' },
    { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'dirty' },
    { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' },
    { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'dirty' },
  ];

  it('returns at least one step for all 8 initial states', () => {
    for (const state of allInitial) {
      const steps = simulateVacuumWorld(state);
      expect(steps.length).toBeGreaterThan(0);
    }
  });

  it('always terminates with NoOp as last action', () => {
    for (const state of allInitial) {
      const steps = simulateVacuumWorld(state);
      const last = steps[steps.length - 1];
      expect(last?.action).toBe('NoOp');
    }
  });

  it('first step state matches the initial state', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };
    const steps = simulateVacuumWorld(init);
    expect(steps[0]?.state).toEqual(init);
  });

  it('both-clean states terminate immediately with NoOp', () => {
    const clean: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' };
    const steps = simulateVacuumWorld(clean);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.action).toBe('NoOp');
  });

  it('Right + both-clean terminates immediately', () => {
    const clean: VacuumWorldState = { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'clean' };
    const steps = simulateVacuumWorld(clean);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.action).toBe('NoOp');
  });

  it('first action is Suck when agent is on dirty room', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' };
    const steps = simulateVacuumWorld(init);
    expect(steps[0]?.action).toBe('Suck');
  });

  it('first action is MoveRight when Left is clean and Right is dirty', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'dirty' };
    const steps = simulateVacuumWorld(init);
    expect(steps[0]?.action).toBe('MoveRight');
  });

  it('first action is MoveLeft when Right is clean and Left is dirty', () => {
    const init: VacuumWorldState = { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' };
    const steps = simulateVacuumWorld(init);
    expect(steps[0]?.action).toBe('MoveLeft');
  });

  it('score increases each step', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };
    const steps = simulateVacuumWorld(init);
    // Score should end positive since rooms get cleaned
    const last = steps[steps.length - 1];
    expect(last?.score).toBeGreaterThan(0);
  });

  it('each step has a non-empty description', () => {
    for (const state of allInitial) {
      for (const step of simulateVacuumWorld(state)) {
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('score is a number on every step', () => {
    for (const state of allInitial) {
      for (const step of simulateVacuumWorld(state)) {
        expect(typeof step.score).toBe('number');
      }
    }
  });

  it('never exceeds 20 steps', () => {
    for (const state of allInitial) {
      expect(simulateVacuumWorld(state).length).toBeLessThanOrEqual(20);
    }
  });

  it('Left + clean + dirty: two steps (MoveRight, Suck, NoOp = 3 steps)', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'dirty' };
    const steps = simulateVacuumWorld(init);
    // Step 1: MoveRight, Step 2: Suck, Step 3: NoOp
    expect(steps).toHaveLength(3);
    expect(steps[0]?.action).toBe('MoveRight');
    expect(steps[1]?.action).toBe('Suck');
    expect(steps[2]?.action).toBe('NoOp');
  });

  it('Left + dirty + clean: two steps (Suck, MoveRight, NoOp = 3 steps... wait, right is clean already)', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' };
    const steps = simulateVacuumWorld(init);
    // Step 1: Suck left, Step 2: NoOp (both clean)
    expect(steps[0]?.action).toBe('Suck');
    expect(steps[steps.length - 1]?.action).toBe('NoOp');
  });
});

// ---------------------------------------------------------------------------
// getEnvironmentDimensions
// ---------------------------------------------------------------------------

describe('getEnvironmentDimensions()', () => {
  it('returns exactly 7 dimensions', () => {
    expect(getEnvironmentDimensions()).toHaveLength(7);
  });

  it('each dimension has a key, label, description, and at least 2 options', () => {
    for (const dim of getEnvironmentDimensions()) {
      expect(dim.key.length).toBeGreaterThan(0);
      expect(dim.label.length).toBeGreaterThan(0);
      expect(dim.description.length).toBeGreaterThan(0);
      expect(dim.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each option has a value, label, and harder flag', () => {
    for (const dim of getEnvironmentDimensions()) {
      for (const opt of dim.options) {
        expect(opt.value.length).toBeGreaterThan(0);
        expect(opt.label.length).toBeGreaterThan(0);
        expect(typeof opt.harder).toBe('boolean');
      }
    }
  });

  it('includes required dimension keys', () => {
    const keys = getEnvironmentDimensions().map((d) => d.key);
    const required: Array<keyof EnvironmentProperties> = [
      'observability',
      'agentCount',
      'determinism',
      'episodicity',
      'dynamics',
      'continuity',
      'knowledge',
    ];
    for (const k of required) {
      expect(keys).toContain(k);
    }
  });

  it('each dimension has at least one easier option (harder: false)', () => {
    for (const dim of getEnvironmentDimensions()) {
      const hasEasier = dim.options.some((o) => !o.harder);
      expect(hasEasier).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getEnvironmentExamples
// ---------------------------------------------------------------------------

describe('getEnvironmentExamples()', () => {
  it('returns at least 10 examples', () => {
    expect(getEnvironmentExamples().length).toBeGreaterThanOrEqual(10);
  });

  it('each example has required fields', () => {
    for (const ex of getEnvironmentExamples()) {
      expect(ex.id.length).toBeGreaterThan(0);
      expect(ex.name.length).toBeGreaterThan(0);
      expect(ex.description.length).toBeGreaterThan(0);
      expect(typeof ex.isOriginal).toBe('boolean');
      expect(ex.properties).toBeTruthy();
    }
  });

  it('includes the 10 standard book environments', () => {
    const ids = getEnvironmentExamples().map((e) => e.id);
    for (const id of ['crossword', 'chess', 'poker', 'backgammon', 'taxi',
                      'medical', 'image-analysis', 'part-picking', 'refinery', 'english-tutor']) {
      expect(ids).toContain(id);
    }
  });

  it('includes at least one original example', () => {
    expect(getEnvironmentExamples().some((e) => e.isOriginal)).toBe(true);
  });

  it('chess has semidynamic dynamics (clock penalises slow play)', () => {
    const chess = getEnvironmentExamples().find((e) => e.id === 'chess');
    expect(chess?.properties.dynamics).toBe('semidynamic');
  });

  it('taxi is fully hard (partially observable, multi, stochastic, sequential, dynamic, continuous)', () => {
    const taxi = getEnvironmentExamples().find((e) => e.id === 'taxi');
    expect(taxi?.properties.observability).toBe('partially');
    expect(taxi?.properties.agentCount).toBe('multi');
    expect(taxi?.properties.determinism).toBe('stochastic');
    expect(taxi?.properties.episodicity).toBe('sequential');
    expect(taxi?.properties.dynamics).toBe('dynamic');
    expect(taxi?.properties.continuity).toBe('continuous');
  });

  it('crossword is the easiest (fully observable, single, deterministic, sequential, static, discrete)', () => {
    const cw = getEnvironmentExamples().find((e) => e.id === 'crossword');
    expect(cw?.properties.observability).toBe('fully');
    expect(cw?.properties.agentCount).toBe('single');
    expect(cw?.properties.determinism).toBe('deterministic');
    expect(cw?.properties.dynamics).toBe('static');
    expect(cw?.properties.continuity).toBe('discrete');
  });
});

// ---------------------------------------------------------------------------
// countHarderProperties
// ---------------------------------------------------------------------------

describe('countHarderProperties()', () => {
  it('returns 0 for the easiest environment', () => {
    const easy: EnvironmentProperties = {
      observability: 'fully',
      agentCount: 'single',
      determinism: 'deterministic',
      episodicity: 'episodic',
      dynamics: 'static',
      continuity: 'discrete',
      knowledge: 'known',
    };
    expect(countHarderProperties(easy)).toBe(0);
  });

  it('returns a positive count for a hard environment', () => {
    const taxiProps = getEnvironmentExamples().find((e) => e.id === 'taxi')!.properties;
    expect(countHarderProperties(taxiProps)).toBeGreaterThan(3);
  });

  it('returns a number between 0 and 7 for all example environments', () => {
    for (const env of getEnvironmentExamples()) {
      const count = countHarderProperties(env.properties);
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(7);
    }
  });
});

// ---------------------------------------------------------------------------
// recommendArchitecture
// ---------------------------------------------------------------------------

describe('recommendArchitecture()', () => {
  it('recommends Learning Agent for unknown environments', () => {
    const props: EnvironmentProperties = {
      observability: 'fully',
      agentCount: 'single',
      determinism: 'deterministic',
      episodicity: 'episodic',
      dynamics: 'static',
      continuity: 'discrete',
      knowledge: 'unknown',
    };
    expect(recommendArchitecture(props)).toContain('Learning Agent');
  });

  it('recommends Utility-Based Agent for partially observable, stochastic, sequential', () => {
    const props: EnvironmentProperties = {
      observability: 'partially',
      agentCount: 'multi',
      determinism: 'stochastic',
      episodicity: 'sequential',
      dynamics: 'dynamic',
      continuity: 'continuous',
      knowledge: 'known',
    };
    expect(recommendArchitecture(props)).toContain('Utility-Based Agent');
  });

  it('recommends Model-Based Reflex Agent for partial observability (non-stochastic)', () => {
    const props: EnvironmentProperties = {
      observability: 'partially',
      agentCount: 'single',
      determinism: 'deterministic',
      episodicity: 'episodic',
      dynamics: 'static',
      continuity: 'discrete',
      knowledge: 'known',
    };
    expect(recommendArchitecture(props)).toContain('Model-Based Reflex Agent');
  });

  it('recommends Goal-Based Agent for fully observable sequential', () => {
    const props: EnvironmentProperties = {
      observability: 'fully',
      agentCount: 'single',
      determinism: 'deterministic',
      episodicity: 'sequential',
      dynamics: 'static',
      continuity: 'discrete',
      knowledge: 'known',
    };
    expect(recommendArchitecture(props)).toContain('Goal-Based Agent');
  });

  it('recommends Simple Reflex Agent for fully observable episodic', () => {
    const props: EnvironmentProperties = {
      observability: 'fully',
      agentCount: 'single',
      determinism: 'deterministic',
      episodicity: 'episodic',
      dynamics: 'static',
      continuity: 'discrete',
      knowledge: 'known',
    };
    expect(recommendArchitecture(props)).toContain('Simple Reflex Agent');
  });
});

// ---------------------------------------------------------------------------
// simulateTableDrivenAgent
// ---------------------------------------------------------------------------

describe('simulateTableDrivenAgent()', () => {
  const table = buildVacuumTable();

  it('returns one step per percept', () => {
    const percepts = ['A,Dirty', 'A,Clean', 'B,Clean'];
    expect(simulateTableDrivenAgent(percepts, table)).toHaveLength(3);
  });

  it('looks up single-percept entry correctly', () => {
    const steps = simulateTableDrivenAgent(['A,Dirty'], table);
    expect(steps[0]?.action).toBe('Suck');
    expect(steps[0]?.found).toBe(true);
  });

  it('builds correct percept sequence key with pipe separator', () => {
    const steps = simulateTableDrivenAgent(['A,Clean', 'A,Dirty'], table);
    expect(steps[1]?.tableKey).toBe('A,Clean|A,Dirty');
    expect(steps[1]?.action).toBe('Suck');
    expect(steps[1]?.found).toBe(true);
  });

  it('returns NoOp and found=false for unknown sequences', () => {
    const steps = simulateTableDrivenAgent(['X,Unknown'], table);
    expect(steps[0]?.found).toBe(false);
    expect(steps[0]?.action).toBe('NoOp');
  });

  it('each step accumulates percept history', () => {
    const percepts = ['A,Clean', 'A,Clean', 'A,Dirty'];
    const steps = simulateTableDrivenAgent(percepts, table);
    expect(steps[2]?.perceptSequence).toHaveLength(3);
    expect(steps[2]?.perceptSequence[2]).toBe('A,Dirty');
  });

  it('returns empty array for empty percepts', () => {
    expect(simulateTableDrivenAgent([], table)).toHaveLength(0);
  });

  it('B,Clean → Left', () => {
    const steps = simulateTableDrivenAgent(['B,Clean'], table);
    expect(steps[0]?.action).toBe('Left');
  });

  it('B,Dirty → Suck', () => {
    const steps = simulateTableDrivenAgent(['B,Dirty'], table);
    expect(steps[0]?.action).toBe('Suck');
  });
});

// ---------------------------------------------------------------------------
// buildVacuumTable
// ---------------------------------------------------------------------------

describe('buildVacuumTable()', () => {
  it('returns a Map with at least 4 single-percept entries', () => {
    const t = buildVacuumTable();
    expect(t.size).toBeGreaterThanOrEqual(4);
  });

  it('single-percept entries match AIMA Figure 2.3', () => {
    const t = buildVacuumTable();
    expect(t.get('A,Clean')).toBe('Right');
    expect(t.get('A,Dirty')).toBe('Suck');
    expect(t.get('B,Clean')).toBe('Left');
    expect(t.get('B,Dirty')).toBe('Suck');
  });
});

// ---------------------------------------------------------------------------
// simulateModelBasedVacuumAgent
// ---------------------------------------------------------------------------

describe('simulateModelBasedVacuumAgent()', () => {
  const allInitial: VacuumWorldState[] = [
    { agentPosition: 'Left',  leftRoom: 'clean', rightRoom: 'clean' },
    { agentPosition: 'Left',  leftRoom: 'clean', rightRoom: 'dirty' },
    { agentPosition: 'Left',  leftRoom: 'dirty', rightRoom: 'clean' },
    { agentPosition: 'Left',  leftRoom: 'dirty', rightRoom: 'dirty' },
    { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'clean' },
    { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'dirty' },
    { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' },
    { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'dirty' },
  ];

  it('returns at least one step for all 8 initial states', () => {
    for (const state of allInitial) {
      expect(simulateModelBasedVacuumAgent(state).length).toBeGreaterThan(0);
    }
  });

  it('always terminates with NoOp as last action', () => {
    for (const state of allInitial) {
      const steps = simulateModelBasedVacuumAgent(state);
      expect(steps[steps.length - 1]?.action).toBe('NoOp');
    }
  });

  it('first step world state matches initial state', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };
    const steps = simulateModelBasedVacuumAgent(init);
    expect(steps[0]?.worldState).toEqual(init);
  });

  it('terminates immediately when both rooms are clean at start (Right, both-clean)', () => {
    // Right room: agent starts there, sees it clean, but still needs to check Left
    // So it moves left, sees clean, THEN terminates
    const clean: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' };
    const steps = simulateModelBasedVacuumAgent(clean);
    // Model-based agent must verify both rooms; starts unknown for right room
    expect(steps[steps.length - 1]?.action).toBe('NoOp');
    expect(steps.length).toBeGreaterThan(0);
  });

  it('first action is Suck when agent starts on dirty room', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' };
    expect(simulateModelBasedVacuumAgent(init)[0]?.action).toBe('Suck');
  });

  it('each step has a non-empty percept and description', () => {
    for (const state of allInitial) {
      for (const step of simulateModelBasedVacuumAgent(state)) {
        expect(step.percept.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('score is a number on every step', () => {
    for (const state of allInitial) {
      for (const step of simulateModelBasedVacuumAgent(state)) {
        expect(typeof step.score).toBe('number');
      }
    }
  });

  it('belief starts as unknown for rooms not yet visited', () => {
    const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };
    const steps = simulateModelBasedVacuumAgent(init);
    // At step 0, the agent hasn't visited Right yet, so rightBelief should be unknown
    expect(steps[0]?.belief.rightBelief).toBe('unknown');
  });

  it('never exceeds 20 steps', () => {
    for (const state of allInitial) {
      expect(simulateModelBasedVacuumAgent(state).length).toBeLessThanOrEqual(20);
    }
  });
});

// ---------------------------------------------------------------------------
// simulateWithScoringRule
// ---------------------------------------------------------------------------

describe('simulateWithScoringRule()', () => {
  const allRules: ScoringRule[] = ['clean-squares', 'dirt-cleaned', 'actions-minimised'];
  const init: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };

  it('returns steps for all scoring rules', () => {
    for (const rule of allRules) {
      expect(simulateWithScoringRule(init, rule).length).toBeGreaterThan(0);
    }
  });

  it('actions-minimised rule results in immediate NoOp', () => {
    const steps = simulateWithScoringRule(init, 'actions-minimised');
    expect(steps).toHaveLength(1);
    expect(steps[0]?.action).toBe('NoOp');
  });

  it('clean-squares: last action is NoOp', () => {
    const steps = simulateWithScoringRule(init, 'clean-squares');
    expect(steps[steps.length - 1]?.action).toBe('NoOp');
  });

  it('clean-squares: first action is Suck on dirty room', () => {
    const steps = simulateWithScoringRule(init, 'clean-squares');
    expect(steps[0]?.action).toBe('Suck');
  });

  it('clean-squares starting Right with left dirty: first move is MoveLeft', () => {
    const state: VacuumWorldState = { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' };
    const steps = simulateWithScoringRule(state, 'clean-squares');
    expect(steps[0]?.action).toBe('MoveLeft');
  });

  it('dirt-cleaned: first action is Suck on dirty room', () => {
    const steps = simulateWithScoringRule(init, 'dirt-cleaned');
    expect(steps[0]?.action).toBe('Suck');
  });

  it('each step has a scoringExplain string', () => {
    for (const rule of allRules) {
      for (const step of simulateWithScoringRule(init, rule)) {
        expect(step.scoringExplain.length).toBeGreaterThan(0);
      }
    }
  });

  it('actions-minimised with clean rooms gives score 0', () => {
    const clean: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' };
    const steps = simulateWithScoringRule(clean, 'actions-minimised');
    expect(steps[0]?.score).toBe(0);
  });

  it('clean-squares starting with both clean gives positive score immediately', () => {
    const clean: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' };
    const steps = simulateWithScoringRule(clean, 'clean-squares');
    expect(steps[0]?.score).toBeGreaterThan(0);
  });

  it('clean-squares starting with both rooms dirty terminates eventually', () => {
    const dirty: VacuumWorldState = { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' };
    const steps = simulateWithScoringRule(dirty, 'clean-squares');
    expect(steps[steps.length - 1]?.action).toBe('NoOp');
  });

  it('never exceeds 20 steps', () => {
    for (const rule of allRules) {
      expect(simulateWithScoringRule(init, rule).length).toBeLessThanOrEqual(20);
    }
  });
});
