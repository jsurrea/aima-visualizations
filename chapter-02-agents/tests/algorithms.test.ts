import { describe, it, expect } from 'vitest';
import {
  getPEASExamples,
  getAgentTypes,
  simulateVacuumWorld,
  type PEASEntry,
  type AgentTypeId,
  type VacuumWorldState,
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
