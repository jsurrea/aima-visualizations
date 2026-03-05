import { describe, it, expect } from 'vitest';
import {
  assessComponentReadiness,
  systemReadiness,
  simulateAnytimeAlgorithm,
  findBoundedOptimalProgram,
  paretoFrontier,
  scoreArchitectures,
  recommendArchitecture,
} from '../src/algorithms/index';
import type {
  AgentProgram,
  TaskCharacteristics,
} from '../src/algorithms/index';

// ─── assessComponentReadiness ──────────────────────────────────────────────

describe('assessComponentReadiness', () => {
  it('returns 5 components at year 0', () => {
    const result = assessComponentReadiness(0);
    expect(result).toHaveLength(5);
  });

  it('projectedTRL equals currentTRL when yearsAhead is 0', () => {
    const result = assessComponentReadiness(0);
    for (const c of result) {
      expect(c.projectedTRL).toBe(c.currentTRL);
    }
  });

  it('projectedTRL is higher after 10 years', () => {
    const now = assessComponentReadiness(0);
    const future = assessComponentReadiness(10);
    for (let i = 0; i < now.length; i++) {
      expect(future[i]!.projectedTRL).toBeGreaterThanOrEqual(now[i]!.projectedTRL);
    }
  });

  it('clamps projectedTRL to max 9', () => {
    const result = assessComponentReadiness(20);
    for (const c of result) {
      expect(c.projectedTRL).toBeLessThanOrEqual(9);
    }
  });

  it('clamps yearsAhead below 0 to 0', () => {
    const negative = assessComponentReadiness(-5);
    const zero = assessComponentReadiness(0);
    expect(negative).toEqual(zero);
  });

  it('clamps yearsAhead above 20 to 20', () => {
    const at20 = assessComponentReadiness(20);
    const at25 = assessComponentReadiness(25);
    expect(at25).toEqual(at20);
  });

  it('includes a preference specification component (lowest TRL)', () => {
    const result = assessComponentReadiness(0);
    const prefs = result.find(c => c.category === 'preferences');
    expect(prefs).toBeDefined();
    expect(prefs!.currentTRL).toBeLessThan(5);
  });

  it('each component has non-empty bottleneck string', () => {
    const result = assessComponentReadiness(5);
    for (const c of result) {
      expect(c.bottleneck.length).toBeGreaterThan(0);
    }
  });

  it('all five categories are present', () => {
    const result = assessComponentReadiness(0);
    const cats = result.map(c => c.category);
    expect(cats).toContain('sensors');
    expect(cats).toContain('representation');
    expect(cats).toContain('action');
    expect(cats).toContain('preferences');
    expect(cats).toContain('learning');
  });
});

// ─── systemReadiness ───────────────────────────────────────────────────────

describe('systemReadiness', () => {
  it('returns 0 for empty array', () => {
    expect(systemReadiness([])).toBe(0);
  });

  it('returns the single component TRL for a one-element array', () => {
    const components = assessComponentReadiness(0);
    // harmonic mean of one value = the value itself
    const single = [{ ...components[0]!, projectedTRL: 6 }];
    expect(systemReadiness(single)).toBeCloseTo(6, 1);
  });

  it('is less than or equal to the arithmetic mean (HM ≤ AM)', () => {
    const components = assessComponentReadiness(0);
    const am = components.reduce((s, c) => s + c.projectedTRL, 0) / components.length;
    const hm = systemReadiness(components);
    expect(hm).toBeLessThanOrEqual(am + 0.01); // tiny float tolerance
  });

  it('is dominated by the weakest component', () => {
    const weak = assessComponentReadiness(0);
    // preference has the lowest TRL; harmonic mean should be pulled toward it
    const prefTRL = weak.find(c => c.category === 'preferences')!.projectedTRL;
    expect(systemReadiness(weak)).toBeLessThan(prefTRL + 3);
  });

  it('returns a positive number for standard components', () => {
    const components = assessComponentReadiness(5);
    expect(systemReadiness(components)).toBeGreaterThan(0);
  });
});

// ─── simulateAnytimeAlgorithm ──────────────────────────────────────────────

describe('simulateAnytimeAlgorithm', () => {
  it('returns maxIterations steps', () => {
    expect(simulateAnytimeAlgorithm(10, 'linear')).toHaveLength(10);
    expect(simulateAnytimeAlgorithm(1, 'linear')).toHaveLength(1);
  });

  it('first step has iteration 0', () => {
    const steps = simulateAnytimeAlgorithm(5, 'sigmoid');
    expect(steps[0]!.iteration).toBe(0);
  });

  it('last iteration equals maxIterations - 1', () => {
    const steps = simulateAnytimeAlgorithm(20, 'logarithmic');
    expect(steps[steps.length - 1]!.iteration).toBe(19);
  });

  it('quality stays within [0, 1] for all shapes', () => {
    for (const shape of ['linear', 'logarithmic', 'sigmoid'] as const) {
      const steps = simulateAnytimeAlgorithm(50, shape);
      for (const s of steps) {
        expect(s.quality).toBeGreaterThanOrEqual(0);
        expect(s.quality).toBeLessThanOrEqual(1);
      }
    }
  });

  it('first step is labelled "Initial solution found"', () => {
    const steps = simulateAnytimeAlgorithm(10, 'linear');
    expect(steps[0]!.action).toBe('Initial solution found');
  });

  it('sigmoid shape yields quality ≈ 0.5 at the middle step', () => {
    const n = 51;
    const steps = simulateAnytimeAlgorithm(n, 'sigmoid', 0);
    // Middle index at t=0.5; sigmoid(0) = 0.5; noise is ±0.025
    const midQ = steps[Math.floor(n / 2)]!.quality;
    expect(midQ).toBeGreaterThan(0.4);
    expect(midQ).toBeLessThan(0.6);
  });

  it('clamps maxIterations < 1 to 1', () => {
    expect(simulateAnytimeAlgorithm(0, 'linear')).toHaveLength(1);
  });

  it('linear shape is monotonically non-decreasing (approximate, noise ≤ 0.025)', () => {
    const steps = simulateAnytimeAlgorithm(100, 'linear', 0);
    // Allow up to the noise amplitude * 2 = 0.05 for backwards fluctuations
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.quality).toBeGreaterThan(steps[i - 1]!.quality - 0.06);
    }
  });
});

// ─── findBoundedOptimalProgram ─────────────────────────────────────────────

describe('findBoundedOptimalProgram', () => {
  const programs: AgentProgram[] = [
    { name: 'Reflex',    computeRequired: 1,  qualityAchieved: 0.3,  description: 'Fast reflex' },
    { name: 'GoalBased', computeRequired: 5,  qualityAchieved: 0.65, description: 'Goal planner' },
    { name: 'Utility',   computeRequired: 10, qualityAchieved: 0.9,  description: 'Utility agent' },
    { name: 'Optimal',   computeRequired: 20, qualityAchieved: 1.0,  description: 'Optimal agent' },
  ];

  it('returns null for empty programs', () => {
    expect(findBoundedOptimalProgram([], 100)).toBeNull();
  });

  it('returns null when budget is 0', () => {
    expect(findBoundedOptimalProgram(programs, 0)).toBeNull();
  });

  it('returns null when no program fits the budget', () => {
    expect(findBoundedOptimalProgram(programs, 0.5)).toBeNull();
  });

  it('returns the highest-quality affordable program', () => {
    const result = findBoundedOptimalProgram(programs, 10);
    expect(result?.name).toBe('Utility');
  });

  it('returns the only affordable program', () => {
    const result = findBoundedOptimalProgram(programs, 2);
    expect(result?.name).toBe('Reflex');
  });

  it('returns the optimal program when budget is large enough', () => {
    const result = findBoundedOptimalProgram(programs, 100);
    expect(result?.name).toBe('Optimal');
  });

  it('handles programs with equal quality by returning either', () => {
    const tied: AgentProgram[] = [
      { name: 'A', computeRequired: 1, qualityAchieved: 0.5, description: '' },
      { name: 'B', computeRequired: 2, qualityAchieved: 0.5, description: '' },
    ];
    const result = findBoundedOptimalProgram(tied, 5);
    expect(['A', 'B']).toContain(result?.name);
  });
});

// ─── paretoFrontier ────────────────────────────────────────────────────────

describe('paretoFrontier', () => {
  const programs: AgentProgram[] = [
    { name: 'A', computeRequired: 1,  qualityAchieved: 0.3,  description: '' },
    { name: 'B', computeRequired: 5,  qualityAchieved: 0.6,  description: '' },
    { name: 'C', computeRequired: 5,  qualityAchieved: 0.5,  description: '' }, // dominated by B
    { name: 'D', computeRequired: 10, qualityAchieved: 0.9,  description: '' },
  ];

  it('excludes dominated programs', () => {
    const frontier = paretoFrontier(programs);
    expect(frontier.find(p => p.name === 'C')).toBeUndefined();
  });

  it('includes non-dominated programs', () => {
    const frontier = paretoFrontier(programs);
    const names = frontier.map(p => p.name);
    expect(names).toContain('A');
    expect(names).toContain('B');
    expect(names).toContain('D');
  });

  it('result is sorted by computeRequired ascending', () => {
    const frontier = paretoFrontier(programs);
    for (let i = 1; i < frontier.length; i++) {
      expect(frontier[i]!.computeRequired).toBeGreaterThanOrEqual(
        frontier[i - 1]!.computeRequired,
      );
    }
  });

  it('returns empty array for empty input', () => {
    expect(paretoFrontier([])).toHaveLength(0);
  });

  it('returns single item for single-element input', () => {
    const single: AgentProgram[] = [
      { name: 'X', computeRequired: 3, qualityAchieved: 0.7, description: '' },
    ];
    expect(paretoFrontier(single)).toHaveLength(1);
  });
});

// ─── scoreArchitectures ────────────────────────────────────────────────────

describe('scoreArchitectures', () => {
  it('returns 5 architectures', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.5, uncertainty: 0.5, goalComplexity: 0.5, dynamism: 0.5 };
    expect(scoreArchitectures(task)).toHaveLength(5);
  });

  it('favours simple-reflex for real-time, low-uncertainty, single-goal tasks', () => {
    const task: TaskCharacteristics = { timeAvailable: 0, uncertainty: 0, goalComplexity: 0, dynamism: 0.1 };
    const recs = scoreArchitectures(task);
    expect(recs[0]!.architecture).toBe('simple-reflex');
  });

  it('favours utility-based for deliberative, uncertain, multi-goal tasks', () => {
    const task: TaskCharacteristics = { timeAvailable: 1, uncertainty: 1, goalComplexity: 1, dynamism: 0 };
    const recs = scoreArchitectures(task);
    expect(recs[0]!.architecture).toBe('utility-based');
  });

  it('all scores are in [0, 1]', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.7, uncertainty: 0.3, goalComplexity: 0.8, dynamism: 0.6 };
    for (const r of scoreArchitectures(task)) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('all recommendations include non-empty rationale', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.5, uncertainty: 0.5, goalComplexity: 0.5, dynamism: 0.5 };
    for (const r of scoreArchitectures(task)) {
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });

  it('results are sorted by score descending', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.5, uncertainty: 0.5, goalComplexity: 0.5, dynamism: 0.5 };
    const recs = scoreArchitectures(task);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i]!.score).toBeLessThanOrEqual(recs[i - 1]!.score);
    }
  });

  it('favours learning in highly dynamic environments', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.5, uncertainty: 0.8, goalComplexity: 0.8, dynamism: 1.0 };
    const recs = scoreArchitectures(task);
    // learning should appear in top 2
    const top2 = recs.slice(0, 2).map(r => r.architecture);
    expect(top2).toContain('learning');
  });
});

// ─── recommendArchitecture ─────────────────────────────────────────────────

describe('recommendArchitecture', () => {
  it('returns a valid architecture type', () => {
    const valid = ['simple-reflex', 'model-based-reflex', 'goal-based', 'utility-based', 'learning'];
    const task: TaskCharacteristics = { timeAvailable: 0.5, uncertainty: 0.5, goalComplexity: 0.5, dynamism: 0.5 };
    expect(valid).toContain(recommendArchitecture(task));
  });

  it('matches the top score from scoreArchitectures', () => {
    const task: TaskCharacteristics = { timeAvailable: 0.8, uncertainty: 0.9, goalComplexity: 0.9, dynamism: 0.2 };
    const top = scoreArchitectures(task)[0]!.architecture;
    expect(recommendArchitecture(task)).toBe(top);
  });
});
