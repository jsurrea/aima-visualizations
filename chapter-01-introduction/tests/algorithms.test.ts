import { describe, it, expect } from 'vitest';
import {
  getAIApproaches,
  getAIHistoryEvents,
  getStandardModelSteps,
  type AIApproach,
  type HistoryEvent,
  type StandardModelStep,
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
