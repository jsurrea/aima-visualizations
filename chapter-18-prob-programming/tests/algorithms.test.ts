import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  sampleCategorical,
  samplePoisson,
  sampleNormal,
  poissonPMF,
  groundRPM,
  honestRecCPT,
  recommendationCPT,
  DISHONEST_REC_PROBS,
  sampleRPMWorld,
  generateOUPMWorld,
  euclideanDist,
  nearestNeighborFilter,
  hungarianAlgorithm,
  hungarianFilter,
  generateLettersTrace,
  generateMarkovLettersTrace,
  UNIFORM_LETTER_PROBS,
  bigramLetterProbs,
  letterLogLikelihood,
  rejectionSampling,
  likelihoodWeighting,
  mcmcStep,
  runMCMC,
  outputLengthHistogram,
  normalizeLogWeights,
} from '../src/algorithms/index';
import type {
  RPMCustomer,
  RPMBook,
  RadarBlip,
  TrackState,
} from '../src/algorithms/index';

// ─── PRNG ─────────────────────────────────────────────────────────────────────

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic with same seed', () => {
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toEqual(rng2());
    }
  });

  it('differs with different seeds', () => {
    const v1 = mulberry32(1)();
    const v2 = mulberry32(2)();
    expect(v1).not.toEqual(v2);
  });
});

// ─── sampleCategorical ────────────────────────────────────────────────────────

describe('sampleCategorical', () => {
  it('returns valid index', () => {
    const rng = mulberry32(7);
    const probs = [0.2, 0.5, 0.3];
    for (let i = 0; i < 50; i++) {
      const idx = sampleCategorical(probs, rng);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
    }
  });

  it('returns last index when cumulative misses due to float', () => {
    // All probability on last bin
    const rng = mulberry32(99);
    const probs = [0, 0, 1];
    expect(sampleCategorical(probs, rng)).toBe(2);
  });

  it('handles single-element distribution', () => {
    const rng = mulberry32(1);
    expect(sampleCategorical([1], rng)).toBe(0);
  });

  it('respects probabilities asymptotically', () => {
    const rng = mulberry32(42);
    const probs = [0.9, 0.1];
    let cnt0 = 0;
    for (let i = 0; i < 1000; i++) {
      if (sampleCategorical(probs, rng) === 0) cnt0++;
    }
    // Should be mostly 0
    expect(cnt0).toBeGreaterThan(800);
  });
});

// ─── samplePoisson ────────────────────────────────────────────────────────────

describe('samplePoisson', () => {
  it('returns 0 for lambda = 0', () => {
    const rng = mulberry32(1);
    expect(samplePoisson(0, rng)).toBe(0);
  });

  it('returns 0 for negative lambda', () => {
    const rng = mulberry32(1);
    expect(samplePoisson(-1, rng)).toBe(0);
  });

  it('returns non-negative integer', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const v = samplePoisson(3, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('has mean close to lambda for many samples', () => {
    const rng = mulberry32(42);
    const lambda = 5;
    let sum = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) sum += samplePoisson(lambda, rng);
    expect(sum / n).toBeCloseTo(lambda, 0);
  });
});

// ─── sampleNormal ─────────────────────────────────────────────────────────────

describe('sampleNormal', () => {
  it('returns a number', () => {
    const rng = mulberry32(42);
    const v = sampleNormal(0, 1, rng);
    expect(typeof v).toBe('number');
    expect(isFinite(v)).toBe(true);
  });

  it('has mean close to mu', () => {
    const rng = mulberry32(99);
    let sum = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) sum += sampleNormal(5, 1, rng);
    expect(sum / n).toBeCloseTo(5, 0);
  });
});

// ─── poissonPMF ───────────────────────────────────────────────────────────────

describe('poissonPMF', () => {
  it('returns 1 for k=0, lambda=0', () => {
    expect(poissonPMF(0, 0)).toBe(1);
  });

  it('returns 0 for k>0, lambda=0', () => {
    expect(poissonPMF(1, 0)).toBe(0);
  });

  it('returns 0 for negative k', () => {
    expect(poissonPMF(-1, 2)).toBe(0);
  });

  it('returns 0 for non-integer k', () => {
    expect(poissonPMF(1.5, 2)).toBe(0);
  });

  it('returns correct PMF for k=0, lambda=1', () => {
    expect(poissonPMF(0, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  it('returns correct PMF for k=2, lambda=2', () => {
    // P(2|2) = 2^2 * e^-2 / 2! = 2 * e^-2 = 0.2707
    expect(poissonPMF(2, 2)).toBeCloseTo(2 * Math.exp(-2), 6);
  });

  it('sums to approximately 1 over range', () => {
    const lambda = 3;
    let sum = 0;
    for (let k = 0; k <= 20; k++) sum += poissonPMF(k, lambda);
    expect(sum).toBeCloseTo(1, 3);
  });
});

// ─── §18.1 RPM ────────────────────────────────────────────────────────────────

describe('groundRPM', () => {
  const customers: RPMCustomer[] = [
    { id: 'C1', honestProb: 0.99, kindnessPrior: [0.1, 0.1, 0.2, 0.3, 0.3] },
    { id: 'C2', honestProb: 0.8, kindnessPrior: [0.2, 0.2, 0.2, 0.2, 0.2] },
  ];
  const books: RPMBook[] = [
    { id: 'B1', qualityPrior: [0.05, 0.2, 0.4, 0.2, 0.15] },
    { id: 'B2', qualityPrior: [0.1, 0.2, 0.3, 0.3, 0.1] },
  ];

  it('produces correct number of variables', () => {
    // 2 Quality + 2*(1 Honest + 1 Kindness + 2 Recommendation) = 2 + 2*4 = 10
    const steps = groundRPM(customers, books);
    expect(steps.length).toBe(10);
  });

  it('first steps are Quality variables', () => {
    const steps = groundRPM(customers, books);
    expect(steps[0]!.variable.type).toBe('Quality');
    expect(steps[1]!.variable.type).toBe('Quality');
  });

  it('Recommendation variables have 3 parents', () => {
    const steps = groundRPM(customers, books);
    const recSteps = steps.filter(s => s.variable.type === 'Recommendation');
    for (const step of recSteps) {
      expect(step.variable.parents.length).toBe(3);
    }
  });

  it('groundedVariables grows monotonically', () => {
    const steps = groundRPM(customers, books);
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i]!.groundedVariables.length).toBe(i + 1);
    }
  });

  it('works with 1 customer and 1 book', () => {
    const c = [{ id: 'C1', honestProb: 0.99, kindnessPrior: [0.1, 0.1, 0.2, 0.3, 0.3] }];
    const b = [{ id: 'B1', qualityPrior: [0.05, 0.2, 0.4, 0.2, 0.15] }];
    const steps = groundRPM(c, b);
    // 1 Quality + 1 Honest + 1 Kindness + 1 Recommendation = 4
    expect(steps.length).toBe(4);
  });

  it('works with empty inputs', () => {
    const steps = groundRPM([], []);
    expect(steps.length).toBe(0);
  });
});

describe('honestRecCPT', () => {
  it('returns 0 for out-of-range rec', () => {
    expect(honestRecCPT(0, 3, 3)).toBe(0);
    expect(honestRecCPT(6, 3, 3)).toBe(0);
  });

  it('returns 1 for exact match when avg is integer', () => {
    // k=2, q=2: avg=2, lo=hi=2
    expect(honestRecCPT(2, 2, 2)).toBe(1);
    expect(honestRecCPT(1, 2, 2)).toBe(0);
  });

  it('splits 50/50 when avg is non-integer', () => {
    // k=2, q=3: avg=2.5, lo=2, hi=3
    expect(honestRecCPT(2, 2, 3)).toBe(0.5);
    expect(honestRecCPT(3, 2, 3)).toBe(0.5);
    expect(honestRecCPT(1, 2, 3)).toBe(0);
  });

  it('handles boundary values k=1 q=1', () => {
    // avg=1, should give 1 for rec=1
    expect(honestRecCPT(1, 1, 1)).toBe(1);
  });

  it('handles k=5, q=5', () => {
    // avg=5, should give 1 for rec=5
    expect(honestRecCPT(5, 5, 5)).toBe(1);
    expect(honestRecCPT(4, 5, 5)).toBe(0);
  });
});

describe('recommendationCPT', () => {
  it('uses dishonest probs when not honest', () => {
    for (let r = 1; r <= 5; r++) {
      expect(recommendationCPT(r, false, 3, 3)).toBe(DISHONEST_REC_PROBS[r - 1]);
    }
  });

  it('uses honest CPT when honest', () => {
    expect(recommendationCPT(3, true, 3, 3)).toBe(honestRecCPT(3, 3, 3));
  });

  it('returns 0 for out-of-range rec', () => {
    expect(recommendationCPT(0, true, 3, 3)).toBe(0);
    expect(recommendationCPT(6, false, 3, 3)).toBe(0);
  });

  it('DISHONEST_REC_PROBS sums to 1', () => {
    const sum = DISHONEST_REC_PROBS.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('sampleRPMWorld', () => {
  const customers: RPMCustomer[] = [
    { id: 'C1', honestProb: 0.99, kindnessPrior: [0.1, 0.1, 0.2, 0.3, 0.3] },
  ];
  const books: RPMBook[] = [
    { id: 'B1', qualityPrior: [0.05, 0.2, 0.4, 0.2, 0.15] },
  ];

  it('assigns all expected variables', () => {
    const rng = mulberry32(1);
    const world = sampleRPMWorld(customers, books, rng);
    expect(world.assignments['Quality(B1)']).toBeDefined();
    expect(world.assignments['Honest(C1)']).toBeDefined();
    expect(world.assignments['Kindness(C1)']).toBeDefined();
    expect(world.assignments['Recommendation(C1,B1)']).toBeDefined();
  });

  it('quality is in 1-5', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const w = sampleRPMWorld(customers, books, rng);
      expect(w.assignments['Quality(B1)']).toBeGreaterThanOrEqual(1);
      expect(w.assignments['Quality(B1)']).toBeLessThanOrEqual(5);
    }
  });

  it('Honest is 0 or 1', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 20; i++) {
      const w = sampleRPMWorld(customers, books, rng);
      expect([0, 1]).toContain(w.assignments['Honest(C1)']);
    }
  });

  it('logProb is a finite negative number', () => {
    const rng = mulberry32(99);
    const w = sampleRPMWorld(customers, books, rng);
    expect(isFinite(w.logProb)).toBe(true);
    expect(w.logProb).toBeLessThan(0);
  });

  it('works with multiple customers and books', () => {
    const cs: RPMCustomer[] = [
      { id: 'C1', honestProb: 0.9, kindnessPrior: [0.2, 0.2, 0.2, 0.2, 0.2] },
      { id: 'C2', honestProb: 0.5, kindnessPrior: [0.2, 0.2, 0.2, 0.2, 0.2] },
    ];
    const bs: RPMBook[] = [
      { id: 'B1', qualityPrior: [0.2, 0.2, 0.2, 0.2, 0.2] },
      { id: 'B2', qualityPrior: [0.2, 0.2, 0.2, 0.2, 0.2] },
    ];
    const rng = mulberry32(7);
    const w = sampleRPMWorld(cs, bs, rng);
    expect(w.assignments['Recommendation(C1,B1)']).toBeDefined();
    expect(w.assignments['Recommendation(C2,B2)']).toBeDefined();
  });
});

// ─── §18.2 OUPM ──────────────────────────────────────────────────────────────

describe('generateOUPMWorld', () => {
  it('returns at least the number statements plus some properties', () => {
    const rng = mulberry32(1);
    const steps = generateOUPMWorld(rng);
    // At minimum: #Customer, #Book, honest/kindness per customer, quality per book, #LoginID per customer
    expect(steps.length).toBeGreaterThan(5);
  });

  it('starts with #Customer and #Book number statements', () => {
    const rng = mulberry32(1);
    const steps = generateOUPMWorld(rng);
    expect(steps[0]!.variableName).toBe('#Customer');
    expect(steps[0]!.kind).toBe('number');
    expect(steps[1]!.variableName).toBe('#Book');
    expect(steps[1]!.kind).toBe('number');
  });

  it('#Customer is in 1-3', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = mulberry32(seed);
      const steps = generateOUPMWorld(rng);
      const numCust = steps[0]!.value as number;
      expect(numCust).toBeGreaterThanOrEqual(1);
      expect(numCust).toBeLessThanOrEqual(3);
    }
  });

  it('#Book is in 2-4', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = mulberry32(seed);
      const steps = generateOUPMWorld(rng);
      const numBooks = steps[1]!.value as number;
      expect(numBooks).toBeGreaterThanOrEqual(2);
      expect(numBooks).toBeLessThanOrEqual(4);
    }
  });

  it('running probability is monotonically decreasing', () => {
    const rng = mulberry32(7);
    const steps = generateOUPMWorld(rng);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.runningProb).toBeLessThanOrEqual(steps[i - 1]!.runningProb + 1e-8);
    }
  });

  it('honest customers get exactly 1 LoginID', () => {
    // Find a run where C1 is honest (common at 99% honesty)
    let found = false;
    for (let seed = 0; seed < 50; seed++) {
      const rng = mulberry32(seed);
      const steps = generateOUPMWorld(rng);
      const honestStep = steps.find(s => s.variableName === 'Honest(C1)');
      const loginStep = steps.find(s => s.variableName === '#LoginID(Owner=C1)');
      if (honestStep && loginStep && honestStep.value === true) {
        expect(loginStep.value).toBe(1);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('dishonest customers get 2-5 LoginIDs', () => {
    // Force a dishonest customer by using a rng that gives low value for Honest sampling
    // We need rng to return < 0.01 for the Honest check
    // Seed search: find a seed where some customer is dishonest
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      const steps = generateOUPMWorld(rng);
      const honestStep = steps.find(s => s.variableName === 'Honest(C1)');
      const loginStep = steps.find(s => s.variableName === '#LoginID(Owner=C1)');
      if (honestStep && loginStep && honestStep.value === false) {
        const numLogins = loginStep.value as number;
        expect(numLogins).toBeGreaterThanOrEqual(2);
        expect(numLogins).toBeLessThanOrEqual(5);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('each step has a description', () => {
    const rng = mulberry32(1);
    const steps = generateOUPMWorld(rng);
    for (const step of steps) {
      expect(step.action.length).toBeGreaterThan(0);
    }
  });
});

// ─── §18.3 Data Association ──────────────────────────────────────────────────

describe('euclideanDist', () => {
  it('returns 0 for identical points', () => {
    expect(euclideanDist({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0);
  });

  it('returns correct distance', () => {
    expect(euclideanDist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 10);
  });

  it('is symmetric', () => {
    const a = { x: 1, y: 3 };
    const b = { x: 4, y: 7 };
    expect(euclideanDist(a, b)).toBeCloseTo(euclideanDist(b, a), 10);
  });
});

describe('nearestNeighborFilter', () => {
  const initialTracks: TrackState[] = [
    { objectId: 1, time: 0, truePosition: { x: 0, y: 0 }, predictedPosition: { x: 0, y: 0 } },
    { objectId: 2, time: 0, truePosition: { x: 10, y: 0 }, predictedPosition: { x: 10, y: 0 } },
  ];

  const observations: RadarBlip[][] = [
    [
      { time: 1, id: 1, position: { x: 1, y: 0 } },
      { time: 1, id: 2, position: { x: 9, y: 0 } },
    ],
    [
      { time: 2, id: 3, position: { x: 2, y: 0 } },
      { time: 2, id: 4, position: { x: 8, y: 0 } },
    ],
  ];

  it('returns one step per time step', () => {
    const steps = nearestNeighborFilter(observations, initialTracks);
    expect(steps.length).toBe(2);
  });

  it('assigns nearest blip to each object', () => {
    const steps = nearestNeighborFilter(observations, initialTracks);
    const step1 = steps[0]!;
    // Blip at (1,0) is closest to Obj#1 at (0,0); Blip at (9,0) closest to Obj#2 at (10,0)
    const a1 = step1.assignment.find(a => a.objectId === 1);
    const a2 = step1.assignment.find(a => a.objectId === 2);
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    expect(a1!.blipId).toBe(1);
    expect(a2!.blipId).toBe(2);
  });

  it('updates track positions after assignment', () => {
    const steps = nearestNeighborFilter(observations, initialTracks);
    const updated1 = steps[0]!.updatedTracks.find(t => t.objectId === 1);
    expect(updated1!.truePosition.x).toBeCloseTo(1, 5);
  });

  it('handles empty observations', () => {
    const steps = nearestNeighborFilter([], initialTracks);
    expect(steps.length).toBe(0);
  });

  it('handles more objects than blips', () => {
    const obs: RadarBlip[][] = [
      [{ time: 1, id: 1, position: { x: 0, y: 0 } }],
    ];
    const steps = nearestNeighborFilter(obs, initialTracks);
    expect(steps[0]!.assignment.length).toBe(1);
  });

  it('handles empty blips at a time step', () => {
    const obs: RadarBlip[][] = [[]];
    const steps = nearestNeighborFilter(obs, initialTracks);
    expect(steps[0]!.assignment.length).toBe(0);
  });
});

describe('hungarianAlgorithm', () => {
  it('returns empty for empty input', () => {
    expect(hungarianAlgorithm([])).toEqual([]);
  });

  it('returns trivial assignment for 1x1', () => {
    const result = hungarianAlgorithm([[5]]);
    expect(result).toEqual([0]);
  });

  it('returns optimal assignment for 2x2', () => {
    const cost = [
      [4, 1],
      [2, 3],
    ];
    const result = hungarianAlgorithm(cost);
    // Optimal: row0->col1 (1), row1->col0 (2) = total 3
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(0);
  });

  it('returns optimal assignment for 3x3', () => {
    const cost = [
      [4, 2, 8],
      [4, 3, 7],
      [3, 1, 6],
    ];
    const result = hungarianAlgorithm(cost);
    // Each entry must be a valid column index (0, 1, or 2)
    expect(result.length).toBe(3);
    for (const col of result) {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(3);
    }
    // The result should be a valid permutation
    const colSet = new Set(result);
    expect(colSet.size).toBe(3);
    // The total cost should equal the known minimum of 12
    const total = result.reduce((s, col, row) => s + cost[row]![col]!, 0);
    expect(total).toBeCloseTo(12, 5);
  });

  it('each column appears at most once in assignment', () => {
    const cost = [[1, 2], [3, 4]];
    const result = hungarianAlgorithm(cost);
    const cols = new Set(result);
    expect(cols.size).toBe(result.length);
  });

  it('handles uniform cost matrix', () => {
    const cost = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const result = hungarianAlgorithm(cost);
    expect(result.length).toBe(3);
    // Should be a valid permutation
    const cols = new Set(result);
    expect(cols.size).toBe(3);
  });
});

describe('hungarianFilter', () => {
  const initialTracks: TrackState[] = [
    { objectId: 1, time: 0, truePosition: { x: 0, y: 0 }, predictedPosition: { x: 0, y: 0 } },
    { objectId: 2, time: 0, truePosition: { x: 10, y: 0 }, predictedPosition: { x: 10, y: 0 } },
  ];

  const observations: RadarBlip[][] = [
    [
      { time: 1, id: 1, position: { x: 1, y: 0 } },
      { time: 1, id: 2, position: { x: 9, y: 0 } },
    ],
  ];

  it('returns one step per time step', () => {
    const steps = hungarianFilter(observations, initialTracks);
    expect(steps.length).toBe(1);
  });

  it('produces valid assignment', () => {
    const steps = hungarianFilter(observations, initialTracks);
    expect(steps[0]!.assignment.length).toBeGreaterThan(0);
  });

  it('handles empty observations', () => {
    const steps = hungarianFilter([], initialTracks);
    expect(steps.length).toBe(0);
  });

  it('handles no blips at step', () => {
    const obs: RadarBlip[][] = [[]];
    const steps = hungarianFilter(obs, initialTracks);
    expect(steps[0]!.assignment.length).toBe(0);
  });

  it('handles single blip single object', () => {
    const tracks = [
      { objectId: 1, time: 0, truePosition: { x: 0, y: 0 }, predictedPosition: { x: 0, y: 0 } },
    ];
    const obs: RadarBlip[][] = [[{ time: 1, id: 1, position: { x: 1, y: 1 } }]];
    const steps = hungarianFilter(obs, tracks);
    expect(steps[0]!.assignment[0]!.objectId).toBe(1);
  });
});

// ─── §18.4 Generative Programs ───────────────────────────────────────────────

describe('UNIFORM_LETTER_PROBS', () => {
  it('has 26 entries', () => {
    expect(UNIFORM_LETTER_PROBS.length).toBe(26);
  });

  it('sums to 1', () => {
    const sum = UNIFORM_LETTER_PROBS.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('bigramLetterProbs', () => {
  it('returns 26 probabilities', () => {
    expect(bigramLetterProbs(0).length).toBe(26);
    expect(bigramLetterProbs(1).length).toBe(26);
  });

  it('sums to 1 for vowel predecessor', () => {
    const sum = bigramLetterProbs(0).reduce((a, b) => a + b, 0); // 'a' is vowel
    expect(sum).toBeCloseTo(1, 10);
  });

  it('sums to 1 for consonant predecessor', () => {
    const sum = bigramLetterProbs(1).reduce((a, b) => a + b, 0); // 'b' is consonant
    expect(sum).toBeCloseTo(1, 10);
  });

  it('after vowel, vowels and consonants are equally likely overall', () => {
    const probs = bigramLetterProbs(0); // after 'a' (vowel)
    const VOWELS = new Set([0, 4, 8, 14, 20]);
    const vowelTotal = [...VOWELS].reduce((s, i) => s + probs[i]!, 0);
    const consonantTotal = 1 - vowelTotal;
    // By design: 0.5 to vowels, 0.5 to consonants after a vowel
    expect(vowelTotal).toBeCloseTo(0.5, 5);
    expect(consonantTotal).toBeCloseTo(0.5, 5);
  });

  it('after consonant, vowels are more likely overall', () => {
    const probs = bigramLetterProbs(1); // after 'b' (consonant)
    const VOWELS = new Set([0, 4, 8, 14, 20]);
    const vowelTotal = [...VOWELS].reduce((s, i) => s + probs[i]!, 0);
    const consonantTotal = 1 - vowelTotal;
    expect(vowelTotal).toBeGreaterThan(consonantTotal);
  });
});

describe('generateLettersTrace', () => {
  it('returns a trace with choices and output', () => {
    const rng = mulberry32(42);
    const trace = generateLettersTrace(5, rng);
    expect(trace.choices.length).toBeGreaterThan(0);
    expect(Array.isArray(trace.output)).toBe(true);
  });

  it('first choice is n', () => {
    const rng = mulberry32(42);
    const trace = generateLettersTrace(5, rng);
    expect(trace.choices[0]!.name).toBe('n');
  });

  it('output length matches sampled n', () => {
    const rng = mulberry32(42);
    const trace = generateLettersTrace(5, rng);
    const n = trace.choices[0]!.value as number;
    expect(trace.output.length).toBe(n);
  });

  it('logProb is sum of choice logProbs', () => {
    const rng = mulberry32(1);
    const trace = generateLettersTrace(3, rng);
    const sum = trace.choices.reduce((s, c) => s + c.logProb, 0);
    expect(trace.logProb).toBeCloseTo(sum, 10);
  });

  it('handles lambda=0 (produces empty trace)', () => {
    const rng = mulberry32(1);
    const trace = generateLettersTrace(0, rng);
    expect(trace.output.length).toBe(0);
  });

  it('output letters are lowercase a-z', () => {
    const rng = mulberry32(7);
    const trace = generateLettersTrace(10, rng);
    for (const l of trace.output) {
      expect(l).toMatch(/^[a-z]$/);
    }
  });
});

describe('generateMarkovLettersTrace', () => {
  it('output length matches sampled n', () => {
    const rng = mulberry32(42);
    const trace = generateMarkovLettersTrace(5, rng);
    const n = trace.choices[0]!.value as number;
    expect(trace.output.length).toBe(n);
  });

  it('logProb is sum of choice logProbs', () => {
    const rng = mulberry32(3);
    const trace = generateMarkovLettersTrace(4, rng);
    const sum = trace.choices.reduce((s, c) => s + c.logProb, 0);
    expect(trace.logProb).toBeCloseTo(sum, 10);
  });

  it('all output letters are valid', () => {
    const rng = mulberry32(99);
    const trace = generateMarkovLettersTrace(8, rng);
    for (const l of trace.output) {
      expect(l).toMatch(/^[a-z]$/);
    }
  });

  it('handles lambda=0', () => {
    const rng = mulberry32(1);
    const trace = generateMarkovLettersTrace(0, rng);
    expect(trace.output.length).toBe(0);
  });
});

describe('letterLogLikelihood', () => {
  it('returns -Infinity for empty generated', () => {
    expect(letterLogLikelihood(['a', 'b'], [], 0.1)).toBe(-Infinity);
  });

  it('returns -Infinity for empty observed', () => {
    expect(letterLogLikelihood([], ['a', 'b'], 0.1)).toBe(-Infinity);
  });

  it('returns -Infinity for length mismatch', () => {
    expect(letterLogLikelihood(['a'], ['a', 'b'], 0.1)).toBe(-Infinity);
  });

  it('returns high value for perfect match with low noise', () => {
    const ll = letterLogLikelihood(['a', 'b', 'c'], ['a', 'b', 'c'], 0.01);
    expect(ll).toBeGreaterThan(-0.1);
  });

  it('returns lower value for mismatched letters', () => {
    const ll1 = letterLogLikelihood(['a', 'b', 'c'], ['a', 'b', 'c'], 0.1);
    const ll2 = letterLogLikelihood(['a', 'b', 'c'], ['a', 'x', 'y'], 0.1);
    expect(ll1).toBeGreaterThan(ll2);
  });

  it('is finite for valid equal-length arrays', () => {
    const ll = letterLogLikelihood(['a', 'b'], ['c', 'd'], 0.1);
    expect(isFinite(ll)).toBe(true);
  });
});

describe('rejectionSampling', () => {
  it('returns totalTrials equal to maxTrials', () => {
    const rng = mulberry32(1);
    const { totalTrials } = rejectionSampling(3, ['a', 'b'], 10, false, rng);
    expect(totalTrials).toBe(10);
  });

  it('accepted traces all match evidence exactly', () => {
    const rng = mulberry32(42);
    const evidence = ['a'];
    const { accepted } = rejectionSampling(1, evidence, 500, false, rng);
    for (const t of accepted) {
      expect(t.output).toEqual(['a']);
    }
  });

  it('works with markov model', () => {
    const rng = mulberry32(1);
    const { totalTrials } = rejectionSampling(2, ['a', 'b'], 5, true, rng);
    expect(totalTrials).toBe(5);
  });
});

describe('likelihoodWeighting', () => {
  it('returns numSamples results', () => {
    const rng = mulberry32(1);
    const results = likelihoodWeighting(3, ['a', 'b'], 10, 0.1, false, rng);
    expect(results.length).toBe(10);
  });

  it('matching traces have higher logWeight than mismatching', () => {
    const rng = mulberry32(42);
    const evidence = ['a', 'b'];
    const results = likelihoodWeighting(2, evidence, 200, 0.01, false, rng);
    const matching = results.filter(r => r.trace.output.join('') === evidence.join(''));
    const nonMatching = results.filter(r => r.trace.output.join('') !== evidence.join('') && isFinite(r.logWeight));
    if (matching.length > 0 && nonMatching.length > 0) {
      const avgMatch = matching.reduce((s, r) => s + r.logWeight, 0) / matching.length;
      const avgNon = nonMatching.reduce((s, r) => s + r.logWeight, 0) / nonMatching.length;
      expect(avgMatch).toBeGreaterThan(avgNon);
    }
  });

  it('works with markov model', () => {
    const rng = mulberry32(1);
    const results = likelihoodWeighting(3, ['a', 'b', 'c'], 5, 0.1, true, rng);
    expect(results.length).toBe(5);
  });
});

describe('mcmcStep', () => {
  it('returns a trace with accepted boolean', () => {
    const rng = mulberry32(1);
    const initial = generateLettersTrace(3, rng);
    const rng2 = mulberry32(99);
    const { next, accepted } = mcmcStep(initial, ['a', 'b', 'c'], 0.1, 3, false, rng2);
    expect(typeof accepted).toBe('boolean');
    expect(next.output).toBeDefined();
  });

  it('next trace has logLikelihood set', () => {
    const rng = mulberry32(1);
    const initial = generateLettersTrace(2, rng);
    const rng2 = mulberry32(10);
    const { next } = mcmcStep(initial, ['a', 'b'], 0.1, 2, false, rng2);
    // logLikelihood should not be the default 0 after mcmcStep
    expect(next.logLikelihood).toBeDefined();
  });

  it('works with markov model', () => {
    const rng = mulberry32(5);
    const initial = generateMarkovLettersTrace(3, rng);
    const rng2 = mulberry32(7);
    const { next } = mcmcStep(initial, ['a', 'b', 'c'], 0.05, 3, true, rng2);
    expect(next.output).toBeDefined();
  });
});

describe('runMCMC', () => {
  it('returns numIter + 1 results (including initial)', () => {
    const rng = mulberry32(1);
    const results = runMCMC(3, ['a', 'b', 'c'], 5, 0.1, false, rng);
    expect(results.length).toBe(6); // iter 0..5
  });

  it('first result is always accepted', () => {
    const rng = mulberry32(1);
    const results = runMCMC(3, ['a', 'b'], 3, 0.1, false, rng);
    expect(results[0]!.accepted).toBe(true);
    expect(results[0]!.iteration).toBe(0);
  });

  it('iteration numbers are sequential', () => {
    const rng = mulberry32(1);
    const results = runMCMC(3, ['a', 'b', 'c'], 4, 0.1, false, rng);
    for (let i = 0; i < results.length; i++) {
      expect(results[i]!.iteration).toBe(i);
    }
  });

  it('works with markov model', () => {
    const rng = mulberry32(1);
    const results = runMCMC(3, ['a', 'b', 'c'], 3, 0.1, true, rng);
    expect(results.length).toBe(4);
  });
});

describe('outputLengthHistogram', () => {
  it('returns empty map for empty input', () => {
    const hist = outputLengthHistogram([]);
    expect(hist.size).toBe(0);
  });

  it('correctly counts lengths', () => {
    const rng = mulberry32(1);
    const traces = [
      generateLettersTrace(2, rng),
      generateLettersTrace(3, rng),
      generateLettersTrace(2, rng),
    ];
    const hist = outputLengthHistogram(traces);
    // Lengths depend on Poisson samples; just check counts sum to 3
    let total = 0;
    for (const count of hist.values()) total += count;
    expect(total).toBe(3);
  });
});

describe('normalizeLogWeights', () => {
  it('returns all zeros for all -Infinity weights', () => {
    const result = normalizeLogWeights([-Infinity, -Infinity]);
    expect(result.every(v => v === 0)).toBe(true);
  });

  it('sums to 1 for valid weights', () => {
    const result = normalizeLogWeights([-1, -2, -3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 8);
  });

  it('higher log-weight gets higher normalized probability', () => {
    const result = normalizeLogWeights([-1, -5]);
    expect(result[0]).toBeGreaterThan(result[1]!);
  });

  it('handles single weight', () => {
    const result = normalizeLogWeights([-3]);
    expect(result[0]).toBeCloseTo(1, 10);
  });

  it('handles mix of finite and -Infinity', () => {
    const result = normalizeLogWeights([-1, -Infinity, -2]);
    expect(result[1]).toBe(0);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 8);
  });
});
