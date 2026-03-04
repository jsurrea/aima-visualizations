import { describe, it, expect } from 'vitest';
import {
  getAIApproaches,
  getAIHistoryEvents,
  getStandardModelSteps,
  getAIFoundations,
  getAICapabilities,
  getAIRisksAndBenefits,
  type AIApproach,
  type HistoryEvent,
  type StandardModelStep,
  type AIFoundation,
  type AICapability,
  type AIRisk,
} from '../src/algorithms/index';

/**
 * Chapter 1 — Introduction
 * Comprehensive test suite for all three pure-data functions.
 */
describe('getAIApproaches()', () => {
  it('returns exactly 4 approaches', () => {
    expect(getAIApproaches()).toHaveLength(4);
  });

  it('covers all four quadrants', () => {
    const approaches = getAIApproaches();
    const quadrants = approaches.map((a) => `${a.row}×${a.col}`);
    expect(quadrants).toContain('think×human');
    expect(quadrants).toContain('think×rational');
    expect(quadrants).toContain('act×human');
    expect(quadrants).toContain('act×rational');
  });

  it('each approach has all required fields non-empty', () => {
    for (const a of getAIApproaches()) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.tagline).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.keyFigure).toBeTruthy();
      expect(a.examples.length).toBeGreaterThan(0);
    }
  });

  it('row values are only "think" or "act"', () => {
    const valid: Array<AIApproach['row']> = ['think', 'act'];
    for (const a of getAIApproaches()) {
      expect(valid).toContain(a.row);
    }
  });

  it('col values are only "human" or "rational"', () => {
    const valid: Array<AIApproach['col']> = ['human', 'rational'];
    for (const a of getAIApproaches()) {
      expect(valid).toContain(a.col);
    }
  });

  it('ids are unique', () => {
    const ids = getAIApproaches().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns a new array on each call (pure / no shared reference)', () => {
    expect(getAIApproaches()).not.toBe(getAIApproaches());
  });
});

describe('getAIHistoryEvents()', () => {
  it('returns a non-empty array', () => {
    expect(getAIHistoryEvents().length).toBeGreaterThan(0);
  });

  it('is sorted in chronological (ascending year) order', () => {
    const events = getAIHistoryEvents();
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.year).toBeGreaterThanOrEqual(events[i - 1]!.year);
    }
  });

  it('covers all four category values', () => {
    const categories = new Set(getAIHistoryEvents().map((e) => e.category));
    const required: Array<HistoryEvent['category']> = [
      'foundations',
      'breakthrough',
      'setback',
      'milestone',
    ];
    for (const cat of required) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  it('each event has all required fields non-empty', () => {
    for (const e of getAIHistoryEvents()) {
      expect(e.year).toBeGreaterThan(0);
      expect(e.title).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(e.category).toBeTruthy();
    }
  });

  it('category values are only valid literals', () => {
    const valid: Array<HistoryEvent['category']> = [
      'foundations',
      'breakthrough',
      'setback',
      'milestone',
    ];
    for (const e of getAIHistoryEvents()) {
      expect(valid).toContain(e.category);
    }
  });

  it('returns a new array on each call (pure)', () => {
    expect(getAIHistoryEvents()).not.toBe(getAIHistoryEvents());
  });
});

describe('getStandardModelSteps()', () => {
  it('returns exactly 4 steps', () => {
    expect(getStandardModelSteps()).toHaveLength(4);
  });

  it('covers all four direction values', () => {
    const directions = new Set(getStandardModelSteps().map((s) => s.direction));
    const required: Array<StandardModelStep['direction']> = [
      'env-to-agent',
      'agent-internal',
      'agent-to-env',
      'env-internal',
    ];
    for (const dir of required) {
      expect(directions.has(dir)).toBe(true);
    }
  });

  it('each step has all required fields non-empty', () => {
    for (const s of getStandardModelSteps()) {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.direction).toBeTruthy();
    }
  });

  it('direction values are only valid literals', () => {
    const valid: Array<StandardModelStep['direction']> = [
      'env-to-agent',
      'agent-internal',
      'agent-to-env',
      'env-internal',
    ];
    for (const s of getStandardModelSteps()) {
      expect(valid).toContain(s.direction);
    }
  });

  it('ids are unique', () => {
    const ids = getStandardModelSteps().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns a new array on each call (pure)', () => {
    expect(getStandardModelSteps()).not.toBe(getStandardModelSteps());
  });
});

describe('getAIFoundations()', () => {
  it('returns exactly 8 foundations', () => {
    expect(getAIFoundations()).toHaveLength(8);
  });

  it('each foundation has all required fields non-empty', () => {
    for (const f of getAIFoundations()) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.emoji).toBeTruthy();
      expect(f.coreQuestion).toBeTruthy();
      expect(f.keyContributions.length).toBeGreaterThan(0);
      expect(f.keyFigures.length).toBeGreaterThan(0);
      expect(f.connectionToAI).toBeTruthy();
      expect(f.color).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = getAIFoundations().map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('colors are non-empty strings', () => {
    for (const f of getAIFoundations()) {
      expect(typeof f.color).toBe('string');
      expect(f.color.length).toBeGreaterThan(0);
    }
  });

  it('keyContributions has at least 3 items per foundation', () => {
    for (const f of getAIFoundations()) {
      expect(f.keyContributions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('returns a new array on each call (pure / no shared reference)', () => {
    expect(getAIFoundations()).not.toBe(getAIFoundations());
  });

  it('type annotation: AIFoundation fields match expected shape', () => {
    const foundation: AIFoundation = getAIFoundations()[0]!;
    expect(typeof foundation.id).toBe('string');
    expect(typeof foundation.name).toBe('string');
    expect(Array.isArray(foundation.keyContributions)).toBe(true);
    expect(Array.isArray(foundation.keyFigures)).toBe(true);
  });
});

describe('getAICapabilities()', () => {
  it('returns a non-empty array', () => {
    expect(getAICapabilities().length).toBeGreaterThan(0);
  });

  it('humanComparison values are only valid literals', () => {
    const valid: Array<AICapability['humanComparison']> = [
      'exceeds',
      'matches',
      'approaching',
      'below',
    ];
    for (const c of getAICapabilities()) {
      expect(valid).toContain(c.humanComparison);
    }
  });

  it('ids are unique', () => {
    const ids = getAICapabilities().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('years are positive integers', () => {
    for (const c of getAICapabilities()) {
      expect(c.year).toBeGreaterThan(0);
      expect(Number.isInteger(c.year)).toBe(true);
    }
  });

  it('each capability has all required fields non-empty', () => {
    for (const c of getAICapabilities()) {
      expect(c.id).toBeTruthy();
      expect(c.domain).toBeTruthy();
      expect(c.emoji).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.milestone).toBeTruthy();
    }
  });

  it('contains at least one "exceeds" comparison', () => {
    const hasExceeds = getAICapabilities().some((c) => c.humanComparison === 'exceeds');
    expect(hasExceeds).toBe(true);
  });

  it('returns a new array on each call (pure / no shared reference)', () => {
    expect(getAICapabilities()).not.toBe(getAICapabilities());
  });
});

describe('getAIRisksAndBenefits()', () => {
  it('returns a non-empty array', () => {
    expect(getAIRisksAndBenefits().length).toBeGreaterThan(0);
  });

  it('contains both risk and benefit types', () => {
    const types = new Set(getAIRisksAndBenefits().map((r) => r.type));
    expect(types.has('risk')).toBe(true);
    expect(types.has('benefit')).toBe(true);
  });

  it('severity is valid for risk items', () => {
    const validSeverity: Array<AIRisk['severity']> = ['high', 'medium', 'low'];
    for (const r of getAIRisksAndBenefits()) {
      if (r.type === 'risk') {
        expect(validSeverity).toContain(r.severity);
      }
    }
  });

  it('timeframe values are only valid literals', () => {
    const validTimeframes: Array<AIRisk['timeframe']> = ['near-term', 'long-term', 'present'];
    for (const r of getAIRisksAndBenefits()) {
      expect(validTimeframes).toContain(r.timeframe);
    }
  });

  it('ids are unique', () => {
    const ids = getAIRisksAndBenefits().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each item has all required fields non-empty', () => {
    for (const r of getAIRisksAndBenefits()) {
      expect(r.id).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.emoji).toBeTruthy();
    }
  });

  it('includes the value alignment problem', () => {
    const hasAlignment = getAIRisksAndBenefits().some((r) => r.id === 'risk-value-alignment');
    expect(hasAlignment).toBe(true);
  });

  it('value alignment problem is long-term', () => {
    const alignment = getAIRisksAndBenefits().find((r) => r.id === 'risk-value-alignment');
    expect(alignment?.timeframe).toBe('long-term');
  });

  it('returns a new array on each call (pure / no shared reference)', () => {
    expect(getAIRisksAndBenefits()).not.toBe(getAIRisksAndBenefits());
  });
});
