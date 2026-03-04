import { describe, it, expect } from 'vitest';
import {
  hillClimbing,
  simulatedAnnealing,
  geneticAlgorithm,
  localBeamSearch,
  gradientDescent,
  andOrSearch,
  sensorlessSearch,
  onlineDFSAgent,
  lrtaStar,
} from '../src/algorithms/index';

// ─── hillClimbing ─────────────────────────────────────────────────────────────

describe('hillClimbing', () => {
  it('single-element array: emits 1 step with moved=none and equal neighbors', () => {
    const steps = hillClimbing([5], 0);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.moved).toBe('none');
    expect(steps[0]!.currentX).toBe(0);
    expect(steps[0]!.currentValue).toBe(5);
    expect(steps[0]!.neighborLeft).toBe(5);
    expect(steps[0]!.neighborRight).toBe(5);
  });

  it('already at local max: emits 1 step with moved=none', () => {
    // x=1 is a local max: left=1 < 5 > right=2
    const steps = hillClimbing([1, 5, 2], 1);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.moved).toBe('none');
    expect(steps[0]!.currentX).toBe(1);
    expect(steps[0]!.currentValue).toBe(5);
    expect(steps[0]!.neighborLeft).toBe(1);
    expect(steps[0]!.neighborRight).toBe(2);
  });

  it('ascending right: climbs to the right until local max, last step moved=none', () => {
    // [1,2,3]: climbs 0→1→2, then x=2 is clamped max
    const steps = hillClimbing([1, 2, 3], 0);
    expect(steps.length).toBeGreaterThan(1);
    expect(steps[0]!.moved).toBe('right');
    expect(steps[1]!.moved).toBe('right');
    const last = steps[steps.length - 1]!;
    expect(last.moved).toBe('none');
    expect(last.currentX).toBe(2);
  });

  it('ascending left: climbs to the left until local max', () => {
    // [3,2,1]: from x=2 climbs left to x=0
    const steps = hillClimbing([3, 2, 1], 2);
    const moveSteps = steps.filter(s => s.moved !== 'none');
    const stopSteps = steps.filter(s => s.moved === 'none');
    expect(moveSteps.length).toBeGreaterThan(0);
    moveSteps.forEach(s => expect(s.moved).toBe('left'));
    expect(stopSteps).toHaveLength(1);
    const last = steps[steps.length - 1]!;
    expect(last.moved).toBe('none');
    expect(last.currentX).toBe(0);
  });

  it('prefers left neighbor when left >= right (tie-breaking)', () => {
    // [3,2,3]: from x=1, left=3 >= right=3 → bestX=leftX=0
    // leftValue(3) > currentValue(2) → moved='left'
    const steps = hillClimbing([3, 2, 3], 1);
    expect(steps[0]!.moved).toBe('left');
    expect(steps[0]!.currentX).toBe(1);
  });

  it('prefers right neighbor when right > left', () => {
    // [1,2,4]: from x=0, right neighbor (2) > left (1, clamped) → moved='right'
    const steps = hillClimbing([1, 2, 4], 0);
    expect(steps[0]!.moved).toBe('right');
  });

  it('left boundary: left neighbor is clamped to current position', () => {
    // [2,5,3]: x=0, leftX clamped to 0, rightX=1, rightValue=5>2 → moved=right
    const steps = hillClimbing([2, 5, 3], 0);
    expect(steps[0]!.neighborLeft).toBe(2); // clamped: values[0] = current
    expect(steps[0]!.moved).toBe('right');
  });

  it('right boundary: right neighbor is clamped to current position', () => {
    // [3,5,2]: x=2, rightX clamped to 2, leftX=1, leftValue=5>2 → moved=left
    const steps = hillClimbing([3, 5, 2], 2);
    expect(steps[0]!.neighborRight).toBe(2); // clamped: values[2] = current
    expect(steps[0]!.moved).toBe('left');
  });

  it('action string is non-empty for every step', () => {
    const steps = hillClimbing([1, 3, 2, 5, 4], 0);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('termination: algorithm always terminates at a local maximum', () => {
    const landscape = [2, 4, 3, 7, 5, 8, 6, 9, 4, 3, 6, 8, 7, 5, 2];
    const steps = hillClimbing(landscape, 0);
    const last = steps[steps.length - 1]!;
    expect(last.moved).toBe('none');
    // At local max: no neighbor is strictly better
    const { currentX, currentValue } = last;
    const left = landscape[Math.max(0, currentX - 1)]!;
    const right = landscape[Math.min(landscape.length - 1, currentX + 1)]!;
    expect(Math.max(left, right)).toBeLessThanOrEqual(currentValue);
  });

  it('two-element array from lower to higher: moves right then stops', () => {
    const steps = hillClimbing([1, 3], 0);
    expect(steps[0]!.moved).toBe('right');
    expect(steps[steps.length - 1]!.moved).toBe('none');
  });

  it('two-element array already at higher: stops immediately', () => {
    const steps = hillClimbing([1, 3], 1);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.moved).toBe('none');
  });
});

// ─── simulatedAnnealing ───────────────────────────────────────────────────────

describe('simulatedAnnealing', () => {
  it('empty schedule: returns empty steps array', () => {
    const steps = simulatedAnnealing([1, 2, 3], 0, [], []);
    expect(steps).toHaveLength(0);
  });

  it('positive deltaE: always accepted, probability=1.0', () => {
    // currentX=0 (value=1), nextX=2 (value=3), deltaE=2>0
    const steps = simulatedAnnealing([1, 2, 3], 0, [1.0], [2]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.deltaE).toBe(2);
    expect(steps[0]!.probability).toBe(1.0);
    expect(steps[0]!.accepted).toBe(true);
    expect(steps[0]!.currentX).toBe(0);
    expect(steps[0]!.nextX).toBe(2);
  });

  it('negative deltaE with high temperature: probability > 0.5 → accepted', () => {
    // currentX=1 (value=2), nextX=2 (value=1), deltaE=-1, T=10 → exp(-0.1)≈0.905 > 0.5
    const steps = simulatedAnnealing([3, 2, 1], 1, [10.0], [2]);
    expect(steps[0]!.deltaE).toBe(-1);
    expect(steps[0]!.probability).toBeCloseTo(Math.exp(-0.1), 4);
    expect(steps[0]!.accepted).toBe(true);
    expect(steps[0]!.currentX).toBe(1); // before move
    // After acceptance, currentX moves to nextX=2 (but step[0] already stores pre-move state)
  });

  it('negative deltaE with low temperature: probability <= 0.5 → rejected', () => {
    // currentX=1 (value=2), nextX=2 (value=1), deltaE=-1, T=0.01 → exp(-100)≈0 ≤ 0.5
    const steps = simulatedAnnealing([3, 2, 1], 1, [0.01], [2]);
    expect(steps[0]!.deltaE).toBe(-1);
    expect(steps[0]!.probability).toBeCloseTo(Math.exp(-100), 10);
    expect(steps[0]!.accepted).toBe(false);
  });

  it('accepted move updates currentX for next iteration', () => {
    // 2 iterations: first moves, second uses updated position
    const steps = simulatedAnnealing([1, 2, 3], 0, [1.0, 1.0], [1, 2]);
    expect(steps[0]!.currentX).toBe(0);
    expect(steps[0]!.accepted).toBe(true);
    expect(steps[1]!.currentX).toBe(1); // moved after first accepted step
  });

  it('rejected move does NOT update currentX', () => {
    // First step rejected: stay at currentX=1; second step starts from same position
    const steps = simulatedAnnealing([3, 2, 1], 1, [0.01, 0.01], [2, 2]);
    expect(steps[0]!.accepted).toBe(false);
    expect(steps[1]!.currentX).toBe(1); // unchanged
  });

  it('iteration count matches schedule length', () => {
    const schedule = [5, 4, 3, 2, 1];
    const neighbors = [1, 2, 3, 4, 5];
    const steps = simulatedAnnealing([1, 2, 3, 4, 5, 6], 0, schedule, neighbors);
    expect(steps).toHaveLength(5);
    steps.forEach((s, i) => expect(s.iteration).toBe(i));
  });

  it('deltaE and values are computed correctly', () => {
    // values=[10,3,8], currentX=0 (value=10), nextX=2 (value=8), deltaE=8-10=-2
    const steps = simulatedAnnealing([10, 3, 8], 0, [1.0], [2]);
    expect(steps[0]!.currentValue).toBe(10);
    expect(steps[0]!.nextValue).toBe(8);
    expect(steps[0]!.deltaE).toBe(-2);
  });

  it('action string is non-empty for every step', () => {
    const steps = simulatedAnnealing([1, 2, 3], 0, [1.0, 0.01], [2, 0]);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });
});

// ─── geneticAlgorithm ─────────────────────────────────────────────────────────

const sumFitness = (genes: ReadonlyArray<number>) =>
  genes.reduce((acc, g) => acc + g, 0);

describe('geneticAlgorithm', () => {
  it('0 generations: returns only initial step (generation 0)', () => {
    const pop = [[1, 0, 1, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [], [], 0);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.generation).toBe(0);
    expect(steps[0]!.action).toBe('Initial population');
    expect(steps[0]!.bestIndividual.fitness).toBe(2);
  });

  it('1 generation: returns 2 steps (initial + gen 1)', () => {
    const pop = [[1, 0, 1, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 1, 0, 0]], 1);
    expect(steps).toHaveLength(2);
    expect(steps[1]!.generation).toBe(1);
  });

  it('multiple generations: step count equals generations + 1', () => {
    const pop = [[1, 1, 0, 0], [0, 1, 1, 0], [1, 0, 0, 1]];
    const steps = geneticAlgorithm(
      pop,
      sumFitness,
      [2, 1, 3],
      [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      3,
    );
    expect(steps).toHaveLength(4);
  });

  it('fitness function applied to initial population', () => {
    const pop = [[1, 1, 1, 0], [0, 1, 0, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    const initPop = steps[0]!.population;
    expect(initPop[0]!.fitness).toBe(3); // [1,1,1,0] → 3
    expect(initPop[1]!.fitness).toBe(1); // [0,1,0,0] → 1
  });

  it('best individual is tracked correctly across generations', () => {
    const pop = [[1, 1, 1, 1], [1, 0, 0, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    // Initial best is [1,1,1,1] with fitness 4
    expect(steps[0]!.bestIndividual.fitness).toBe(4);
  });

  it('crossover with paired parents produces expected child genes', () => {
    // popSize=4 → numParents=2. Pair (P0, P1): crossover at point 2.
    // After sorting desc by fitness: P0=[1,1,1,0] (3), P1=[0,1,1,0] (2), rest lower.
    // cp=2: child = P0[0:2] + P1[2:] = [1,1] + [1,0] = [1,1,1,0]  (no mutation)
    const pop = [[1, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    const gen1Pop = steps[1]!.population;
    // 1 child padded to 4 copies
    expect(gen1Pop).toHaveLength(4);
    expect(gen1Pop[0]!.genes).toEqual([1, 1, 1, 0]);
  });

  it('mutation correctly flips genes where mask=1', () => {
    // P0=[1,0,1,0], cp=4 (all from P0), mask=[0,1,0,1]: flip idx 1 and 3
    // Expected child: [1,1,1,1]
    const pop = [[1, 0, 1, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [4], [[0, 1, 0, 1]], 1);
    expect(steps[1]!.population[0]!.genes).toEqual([1, 1, 1, 1]);
  });

  it('mutation does NOT flip genes where mask=0', () => {
    // P0=[1,0,1,0], cp=4, mask=[0,0,0,0]: no flips → child=[1,0,1,0]
    const pop = [[1, 0, 1, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [4], [[0, 0, 0, 0]], 1);
    expect(steps[1]!.population[0]!.genes).toEqual([1, 0, 1, 0]);
  });

  it('population size is maintained after padding (popSize=4 → 1 child padded to 4)', () => {
    const pop = [
      [1, 1, 1, 0], // fitness=3
      [0, 1, 0, 1], // fitness=2
      [1, 0, 0, 0], // fitness=1
      [0, 0, 0, 0], // fitness=0
    ];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    expect(steps[1]!.population).toHaveLength(4);
  });

  it('while-padding not entered when popSize=1 (single individual)', () => {
    // popSize=1: numParents=1, 1 child = popSize, no padding needed
    const pop = [[1, 0, 1, 0]];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    expect(steps[1]!.population).toHaveLength(1);
  });

  it('crossover with odd parent count performs self-crossover for unpaired parent', () => {
    // popSize=5, numParents=3, parents=[P0,P1,P2]
    // pair (0,1): child from P0+P1; pair (2,2): child from P2+P2 (self-crossover)
    const pop = [
      [1, 1, 1, 1], // fitness=4
      [1, 1, 1, 0], // fitness=3
      [1, 1, 0, 0], // fitness=2
      [1, 0, 0, 0], // fitness=1
      [0, 0, 0, 0], // fitness=0
    ];
    const steps = geneticAlgorithm(pop, sumFitness, [2], [[0, 0, 0, 0]], 1);
    // 2 distinct children + 3 padding copies = 5 total
    expect(steps[1]!.population).toHaveLength(5);
    expect(steps[1]!.generation).toBe(1);
  });

  it('action string is non-empty for every step', () => {
    const pop = [[1, 0], [0, 1]];
    const steps = geneticAlgorithm(pop, sumFitness, [1], [[0, 0]], 1);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('selection keeps top half by fitness', () => {
    // Pop sorted desc: [1,1,1,1]=4, [1,1,1,0]=3, [0,0,0,1]=1, [0,0,0,0]=0
    // numParents=2: P0=[1,1,1,1], P1=[1,1,1,0]. With cp=4 (all from P0) and no mutation:
    // child = [1,1,1,1], child fitness=4
    const pop = [
      [0, 0, 0, 0], // fitness=0
      [1, 1, 1, 1], // fitness=4
      [0, 0, 0, 1], // fitness=1
      [1, 1, 1, 0], // fitness=3
    ];
    const steps = geneticAlgorithm(pop, sumFitness, [4], [[0, 0, 0, 0]], 1);
    // P0=[1,1,1,1], P1=[1,1,1,0] → child = P0[:4] + P1[4:] = [1,1,1,1]
    expect(steps[1]!.bestIndividual.fitness).toBe(4);
  });
});

// ─── localBeamSearch ──────────────────────────────────────────────────────────

describe('localBeamSearch', () => {
  const landscape = [1, 3, 2, 7, 4, 8, 6, 9, 5, 2]; // peak at x=7 (value=9)

  it('returns at least one step (initial state)', () => {
    const steps = localBeamSearch(landscape, [0], 10);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.beams[0]!.x).toBe(0);
    expect(steps[0]!.beams[0]!.value).toBe(1);
  });

  it('stops when no improvement found (local maximum)', () => {
    // Start at x=7 (value=9), neighbours x=6 (6) and x=8 (5) are both lower
    const steps = localBeamSearch(landscape, [7], 20);
    const last = steps[steps.length - 1]!;
    expect(last.action).toContain('No improvement');
    expect(last.beams[0]!.x).toBe(7);
  });

  it('maxIterations=0 returns exactly one step', () => {
    const steps = localBeamSearch(landscape, [0], 0);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toContain('Max iterations');
  });

  it('advances beams toward higher-value positions', () => {
    // Start at x=0 (value=1); should move right toward the peak
    const steps = localBeamSearch(landscape, [0], 20);
    const last = steps[steps.length - 1]!;
    expect(last.beams[0]!.value).toBeGreaterThan(1);
  });

  it('keeps exactly k beams (top-k selection)', () => {
    const k = 3;
    const steps = localBeamSearch(landscape, [0, 2, 4], 5);
    steps.forEach(s => expect(s.beams.length).toBeLessThanOrEqual(k));
  });

  it('allSuccessors are deduplicated by x and sorted by value desc', () => {
    // Single beam at x=3: left=2 (value=2), right=4 (value=4)
    const steps = localBeamSearch(landscape, [3], 1);
    const succ = steps[0]!.allSuccessors;
    // No duplicate x values
    const xVals = succ.map(s => s.x);
    expect(new Set(xVals).size).toBe(xVals.length);
    // Sorted descending by value (ties broken by x ascending)
    for (let i = 1; i < succ.length; i++) {
      expect(succ[i - 1]!.value).toBeGreaterThanOrEqual(succ[i]!.value);
    }
  });

  it('empty initialPositions: returns one step with empty beams and successors', () => {
    const steps = localBeamSearch(landscape, [], 5);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.beams).toHaveLength(0);
    expect(steps[0]!.allSuccessors).toHaveLength(0);
  });

  it('empty values array (n=0): guard skips successor generation, returns one step', () => {
    const steps = localBeamSearch([], [], 5);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.allSuccessors).toHaveLength(0);
  });

  it('two beams converge on the global peak', () => {
    const steps = localBeamSearch(landscape, [0, 9], 30);
    const last = steps[steps.length - 1]!;
    // Both beams should end at or near x=7 (value=9)
    expect(last.bestValue).toBe(9);
  });

  it('bestValue in each step equals the max of beams at that iteration', () => {
    const steps = localBeamSearch(landscape, [0, 2], 10);
    steps.forEach(s => {
      const maxBeam = s.beams.reduce((m, b) => Math.max(m, b.value), -Infinity);
      expect(s.bestValue).toBe(maxBeam);
    });
  });

  it('action string is non-empty for every step', () => {
    const steps = localBeamSearch(landscape, [0], 5);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('boundaries: beam at x=0 produces left neighbour clamped to x=0', () => {
    const steps = localBeamSearch([5, 3, 1], [0], 1);
    const succ = steps[0]!.allSuccessors;
    // x=0 (clamped left) and x=1 both appear
    expect(succ.some(s => s.x === 0)).toBe(true);
    expect(succ.some(s => s.x === 1)).toBe(true);
  });

  it('boundaries: beam at last index produces right neighbour clamped', () => {
    const vals = [1, 2, 5];
    const steps = localBeamSearch(vals, [2], 1);
    const succ = steps[0]!.allSuccessors;
    // x=1 and x=2 (clamped right)
    expect(succ.some(s => s.x === 1)).toBe(true);
    expect(succ.some(s => s.x === 2)).toBe(true);
  });

  it('stops after maxIterations even when improvement would continue', () => {
    // Strictly ascending: algorithm would keep climbing indefinitely
    const vals = Array.from({ length: 20 }, (_, i) => i);
    const steps = localBeamSearch(vals, [0], 3);
    expect(steps).toHaveLength(4); // iterations 0,1,2,3 (stop at 3)
    expect(steps[steps.length - 1]!.action).toContain('Max iterations');
  });
});

// ─── gradientDescent ──────────────────────────────────────────────────────────

describe('gradientDescent', () => {
  // f(x) = (x-3)^2 + 2*sin(5x),  f'(x) = 2(x-3) + 10*cos(5x)

  it('returns at least one step (initial state)', () => {
    const steps = gradientDescent(0, 0.01, 10, 1e-6);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]!.iteration).toBe(0);
    expect(steps[0]!.x).toBeCloseTo(0, 10);
  });

  it('first step records correct f(x) and gradient at initial x=0', () => {
    // f(0) = 9 + 2*sin(0) = 9; f'(0) = -6 + 10*cos(0) = 4
    const steps = gradientDescent(0, 0.01, 100, 1e-6);
    expect(steps[0]!.fx).toBeCloseTo(9, 8);
    expect(steps[0]!.gradient).toBeCloseTo(4, 8);
  });

  it('x updates correctly: x1 = x0 - stepSize * gradient', () => {
    const steps = gradientDescent(0, 0.1, 5, 1e-6);
    // x0=0, gradient=4 → x1 = 0 - 0.1*4 = -0.4
    expect(steps[1]!.x).toBeCloseTo(-0.4, 8);
  });

  it('converges immediately when |gradient| < tolerance', () => {
    // tolerance=100 → |gradient| at any x < 100 (gradient bounded by ~|2(x-3)| + 10)
    // gradient at x=0 is 4 < 100 → converge on first step
    const steps = gradientDescent(0, 0.01, 100, 100);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toContain('Converged');
  });

  it('stops at maxIterations when not converged', () => {
    // Very tight tolerance → not converged quickly
    const steps = gradientDescent(0, 0.001, 5, 1e-12);
    expect(steps).toHaveLength(6); // iterations 0..5
    expect(steps[steps.length - 1]!.action).toContain('Max iterations');
  });

  it('maxIterations=0 returns exactly one step', () => {
    const steps = gradientDescent(1, 0.1, 0, 1e-6);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toContain('Max iterations');
  });

  it('stepSize is recorded in every step', () => {
    const steps = gradientDescent(0, 0.05, 5, 1e-6);
    steps.forEach(s => expect(s.stepSize).toBe(0.05));
  });

  it('iteration counter increments correctly', () => {
    const steps = gradientDescent(0, 0.001, 4, 1e-12);
    steps.forEach((s, i) => expect(s.iteration).toBe(i));
  });

  it('f(x) matches (x-3)^2 + 2*sin(5x) at each step', () => {
    const steps = gradientDescent(2, 0.01, 5, 1e-12);
    steps.forEach(s => {
      const expected = (s.x - 3) ** 2 + 2 * Math.sin(5 * s.x);
      expect(s.fx).toBeCloseTo(expected, 10);
    });
  });

  it('gradient matches 2*(x-3) + 10*cos(5x) at each step', () => {
    const steps = gradientDescent(2, 0.01, 5, 1e-12);
    steps.forEach(s => {
      const expected = 2 * (s.x - 3) + 10 * Math.cos(5 * s.x);
      expect(s.gradient).toBeCloseTo(expected, 10);
    });
  });

  it('action string is non-empty for every step', () => {
    const steps = gradientDescent(0, 0.01, 5, 1e-6);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });
});

// ─── andOrSearch ──────────────────────────────────────────────────────────────

describe('andOrSearch', () => {
  it('goal state 7: returns goal node with single step', () => {
    const { steps, tree } = andOrSearch(7);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.visiting).toBe(7);
    expect(steps[0]!.nodeType).toBe('OR');
    expect(steps[0]!.path).toEqual([]);
    expect(tree.state).toBe(7);
    expect(tree.type).toBe('OR');
    expect(tree.result).toBe('goal');
    expect(tree.depth).toBe(0);
  });

  it('goal state 8: returns goal node immediately', () => {
    const { steps, tree } = andOrSearch(8);
    expect(steps).toHaveLength(1);
    expect(tree.result).toBe('goal');
    expect(tree.state).toBe(8);
  });

  it('state 1: root tree node is a solution', () => {
    const { tree } = andOrSearch(1);
    expect(tree.result).toBe('solution');
    expect(tree.state).toBe(1);
    expect(tree.type).toBe('OR');
  });

  it('state 1: chosen action is Right (Left loops back to state 1)', () => {
    const { tree } = andOrSearch(1);
    expect(tree.action).toBe('Right');
  });

  it('state 1: AND child has outcomes=[2] and action=Right', () => {
    const { tree } = andOrSearch(1);
    const andChild = tree.children![0]!;
    expect(andChild.type).toBe('AND');
    expect(andChild.action).toBe('Right');
    expect(andChild.outcomes).toEqual([2]);
  });

  it('state 1: sub-plan for state 2 uses action Suck → outcomes [4,8]', () => {
    const { tree } = andOrSearch(1);
    const andFromRoot = tree.children![0]!;    // AND(Right→[2])
    const orState2 = andFromRoot.children![0]!; // OR(2)
    expect(orState2.state).toBe(2);
    expect(orState2.result).toBe('solution');
    expect(orState2.action).toBe('Suck');
    const andSuck = orState2.children![0]!;
    expect(andSuck.outcomes).toEqual([4, 8]);
  });

  it('state 1: state 8 is recognised as goal inside the AND subtree', () => {
    const { tree } = andOrSearch(1);
    const andSuck = tree.children![0]!.children![0]!.children![0]!; // AND(Suck,[4,8])
    // One of its OR children should be goal=8
    const goalChild = andSuck.children!.find(c => c.state === 8);
    expect(goalChild?.result).toBe('goal');
  });

  it('steps include both OR and AND node types', () => {
    const { steps } = andOrSearch(1);
    expect(steps.some(s => s.nodeType === 'OR')).toBe(true);
    expect(steps.some(s => s.nodeType === 'AND')).toBe(true);
  });

  it('loop detection: steps include OR nodes whose path contains their state', () => {
    const { steps } = andOrSearch(1);
    const loopSteps = steps.filter(
      s => s.nodeType === 'OR' && s.path.includes(s.visiting),
    );
    expect(loopSteps.length).toBeGreaterThan(0);
  });

  it('step numbers are sequential starting from 0', () => {
    const { steps } = andOrSearch(1);
    steps.forEach((s, i) => expect(s.step).toBe(i));
  });

  it('action strings are non-empty for every step', () => {
    const { steps } = andOrSearch(1);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('state 3: solution uses Suck → outcome [7] (goal)', () => {
    const { tree } = andOrSearch(3);
    expect(tree.result).toBe('solution');
    expect(tree.action).toBe('Suck');
    const andNode = tree.children![0]!;
    expect(andNode.outcomes).toEqual([7]);
    expect(andNode.children![0]!.result).toBe('goal');
  });

  it('AND failure: andSearch returns failure when child OR node loops', () => {
    // In the search from state 1, action Left produces outcome [1] which loops.
    // This exercises the AND failure branch. Verify tree does NOT use Left.
    const { tree } = andOrSearch(1);
    expect(tree.action).not.toBe('Left');
  });

  it('all states 1-8 produce valid solution or goal trees', () => {
    for (let state = 1; state <= 8; state++) {
      const { tree } = andOrSearch(state);
      expect(['goal', 'solution']).toContain(tree.result);
    }
  });
});

// ─── sensorlessSearch ─────────────────────────────────────────────────────────

describe('sensorlessSearch', () => {
  it('initial belief already at goal [7,8]: returns empty steps and plan', () => {
    const { steps, plan } = sensorlessSearch([7, 8]);
    expect(steps).toHaveLength(0);
    expect(plan).toHaveLength(0);
  });

  it('initial belief [7]: already goal, returns empty', () => {
    const { steps, plan } = sensorlessSearch([7]);
    expect(steps).toHaveLength(0);
    expect(plan).toHaveLength(0);
  });

  it('full initial belief [1..8]: finds a 4-step plan', () => {
    const { plan } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plan).toHaveLength(4);
  });

  it('plan [Left, Suck, Right, Suck] is discovered from full initial belief', () => {
    const { plan } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plan).toEqual(['Left', 'Suck', 'Right', 'Suck']);
  });

  it('steps length equals plan length', () => {
    const { steps, plan } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(steps).toHaveLength(plan.length);
  });

  it('each step action matches the plan action at that index', () => {
    const { steps, plan } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    steps.forEach((s, i) => expect(s.action).toBe(plan[i]));
  });

  it('final step nextBeliefState is all goal states', () => {
    const { steps } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    const lastNext = steps[steps.length - 1]!.nextBeliefState;
    expect(lastNext.every(s => s === 7 || s === 8)).toBe(true);
  });

  it('each step beliefState matches previous nextBeliefState', () => {
    const { steps } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.beliefState).toEqual(steps[i - 1]!.nextBeliefState);
    }
  });

  it('description string is non-empty for every step', () => {
    const { steps } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    steps.forEach(s => expect(s.description.length).toBeGreaterThan(0));
  });

  it('step indices start at 0 and increment by 1', () => {
    const { steps } = sensorlessSearch([1, 2, 3, 4, 5, 6, 7, 8]);
    steps.forEach((s, i) => expect(s.step).toBe(i));
  });

  it('subset initial belief [1,2]: finds valid plan reaching goal', () => {
    const { plan, steps } = sensorlessSearch([1, 2]);
    expect(plan.length).toBeGreaterThan(0);
    const lastNext = steps[steps.length - 1]!.nextBeliefState;
    expect(lastNext.every(s => s === 7 || s === 8)).toBe(true);
  });

  it('single non-goal state [1]: finds a valid plan', () => {
    const { plan, steps } = sensorlessSearch([1]);
    expect(plan.length).toBeGreaterThan(0);
    const lastNext = steps[steps.length - 1]!.nextBeliefState;
    expect(lastNext.every(s => s === 7 || s === 8)).toBe(true);
  });
});

// ─── onlineDFSAgent ───────────────────────────────────────────────────────────

// Grid graph for tests:
//   (1,3) - (2,3) - (3,3)[GOAL]
//     |       |
//   (1,2) - (2,2)
//     |
//   (1,1)[START]
const onlineGraph = new Map<string, ReadonlyArray<string>>([
  ['1,1', ['1,2']],
  ['1,2', ['1,1', '1,3', '2,2']],
  ['1,3', ['1,2', '2,3']],
  ['2,2', ['1,2', '2,3']],
  ['2,3', ['1,3', '2,2', '3,3']],
  ['3,3', ['2,3']],
]);

describe('onlineDFSAgent', () => {
  it('eventually reaches the goal state', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    const last = steps[steps.length - 1]!;
    expect(last.action).toBe('Stop');
    expect(last.currentState).toBe('3,3');
    expect(last.description).toContain('Goal state');
  });

  it('step numbers are sequential starting from 0', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    steps.forEach((s, i) => expect(s.step).toBe(i));
  });

  it('visited set grows monotonically and includes start', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    expect(steps[0]!.visited).toContain('1,1');
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.visited.length).toBeGreaterThanOrEqual(steps[i - 1]!.visited.length);
    }
  });

  it('all graph nodes are visited by the time goal is reached', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    const lastVisited = steps[steps.length - 1]!.visited;
    const allNodes = ['1,1', '1,2', '1,3', '2,2', '2,3', '3,3'];
    allNodes.forEach(n => expect(lastVisited).toContain(n));
  });

  it('result field of each step is the state moved to', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    steps.filter(s => s.action !== 'Stop').forEach(s => {
      expect(s.result).toBe(s.action.replace('Move to ', ''));
    });
  });

  it('action strings are non-empty for every step', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('description strings are non-empty for every step', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    steps.forEach(s => expect(s.description.length).toBeGreaterThan(0));
  });

  it('backtracking step has description containing "Backtracking"', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    const backtrackSteps = steps.filter(s => s.description.includes('Backtracking'));
    expect(backtrackSteps.length).toBeGreaterThan(0);
  });

  it('start=goal: returns single Stop step immediately', () => {
    const steps = onlineDFSAgent(onlineGraph, '3,3', '3,3');
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toBe('Stop');
    expect(steps[0]!.currentState).toBe('3,3');
  });

  it('dead-end: returns Stop when goal is unreachable', () => {
    // Two nodes A↔B; goal C is unreachable
    const deadGraph = new Map<string, ReadonlyArray<string>>([
      ['A', ['B']],
      ['B', ['A']],
    ]);
    const steps = onlineDFSAgent(deadGraph, 'A', 'C');
    const last = steps[steps.length - 1]!;
    expect(last.action).toBe('Stop');
    expect(last.description).toContain('No more states to explore');
  });

  it('untried map is updated after first visit (chosen action removed)', () => {
    const steps = onlineDFSAgent(onlineGraph, '1,1', '3,3');
    // After step 0, '1,2' should have been removed from untried['1,1']
    const step0 = steps[0]!;
    const untriedAt11 = step0.untried.get('1,1') ?? [];
    expect(untriedAt11).not.toContain('1,2');
  });
});

// ─── lrtaStar ─────────────────────────────────────────────────────────────────

// 1D linear chain from Figure 4.23: s1–s2–s3–s4–s5–s6–s7, edge cost=1, goal=s7
const lrtaGraph = new Map([
  ['s1', [{ neighbor: 's2', cost: 1 }]],
  ['s2', [{ neighbor: 's1', cost: 1 }, { neighbor: 's3', cost: 1 }]],
  ['s3', [{ neighbor: 's2', cost: 1 }, { neighbor: 's4', cost: 1 }]],
  ['s4', [{ neighbor: 's3', cost: 1 }, { neighbor: 's5', cost: 1 }]],
  ['s5', [{ neighbor: 's4', cost: 1 }, { neighbor: 's6', cost: 1 }]],
  ['s6', [{ neighbor: 's5', cost: 1 }, { neighbor: 's7', cost: 1 }]],
  ['s7', [] satisfies Array<{ neighbor: string; cost: number }>],
]);
const lrtaH0 = new Map([
  ['s1', 8], ['s2', 9], ['s3', 2], ['s4', 2], ['s5', 4], ['s6', 3], ['s7', 0],
]);

describe('lrtaStar', () => {
  it('reaches goal s7 from s1', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const last = steps[steps.length - 1]!;
    expect(last.action).toBe('Stop');
    expect(last.currentState).toBe('s7');
    expect(last.description).toContain('Goal');
  });

  it('step 0 (s1→s2): H[s1] updated to 10 (max(8, 1+H[s2]=10))', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const step0 = steps[0]!;
    expect(step0.currentState).toBe('s1');
    expect(step0.nextState).toBe('s2');
    expect(step0.updatedH).toBe(10);
    expect(step0.hValues.get('s1')).toBe(10);
  });

  it('step 1 (s2→s3): H[s2] stays 9 (max(9, 1+H[s3]=3) = 9)', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const step1 = steps[1]!;
    expect(step1.currentState).toBe('s2');
    expect(step1.nextState).toBe('s3');
    expect(step1.updatedH).toBe(9);
  });

  it('step 2 (s3→s4): H[s3] updated to 3 (max(2, 1+H[s4]=3))', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const step2 = steps[2]!;
    expect(step2.currentState).toBe('s3');
    expect(step2.nextState).toBe('s4');
    expect(step2.updatedH).toBe(3);
  });

  it('step 3 (s4→s3): H[s4] updated to 4 (goes back because s3 is cheaper)', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const step3 = steps[3]!;
    expect(step3.currentState).toBe('s4');
    expect(step3.nextState).toBe('s3');
    expect(step3.updatedH).toBe(4);
  });

  it('H values are monotonically non-decreasing for each state across steps', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const hHistory = new Map<string, number>();
    for (const step of steps) {
      for (const [state, hVal] of step.hValues) {
        const prev = hHistory.get(state) ?? 0;
        expect(hVal).toBeGreaterThanOrEqual(prev);
        hHistory.set(state, hVal);
      }
    }
  });

  it('step numbers are sequential starting from 0', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    steps.forEach((s, i) => expect(s.step).toBe(i));
  });

  it('maxSteps=1: returns exactly 1 step (the first move)', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 1);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.currentState).toBe('s1');
    expect(steps[0]!.nextState).toBe('s2');
  });

  it('start=goal: first step is Stop with updatedH=0', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's7', 's7', 10);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.action).toBe('Stop');
    expect(steps[0]!.currentState).toBe('s7');
  });

  it('dead-end non-goal state: stops without crashing', () => {
    const deadGraph = new Map([
      ['start', [{ neighbor: 'dead', cost: 1 }]],
      ['dead', [] satisfies Array<{ neighbor: string; cost: number }>],
    ]);
    const deadH = new Map([['start', 5], ['dead', 3]]);
    const steps = lrtaStar(deadGraph, deadH, 'start', 'goal', 10);
    // Moves to 'dead', then stops (no neighbors from 'dead')
    expect(steps).toHaveLength(1);
    expect(steps[0]!.nextState).toBe('dead');
  });

  it('action strings are non-empty for every step', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    steps.forEach(s => expect(s.action.length).toBeGreaterThan(0));
  });

  it('hValues snapshot in each step is a deep copy (immutable history)', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    // Verify step 0 hValues still show H[s1]=10 even after further updates
    expect(steps[0]!.hValues.get('s1')).toBe(10);
    // Later steps may have different H[s1] (but in this chain s1 isn't revisited)
    // The key test is that snapshots don't alias the live map
    expect(steps[0]!.hValues).not.toBe(steps[1]!.hValues);
  });

  it('path s1→s2→s3→s4→s3→s4→s5→s6→s7 matches expected trajectory', () => {
    const steps = lrtaStar(lrtaGraph, lrtaH0, 's1', 's7', 50);
    const trajectory = steps
      .filter(s => s.action !== 'Stop')
      .map(s => s.currentState);
    expect(trajectory).toEqual(['s1', 's2', 's3', 's4', 's3', 's4', 's5', 's6']);
  });
});

// ─── Targeted branch coverage for ?? null-fallback paths ─────────────────────

describe('sensorlessSearch (empty belief branch)', () => {
  it('empty belief []: BFS exhausts with no solution → fallback empty return (line 616)', () => {
    // All actions on an empty set produce another empty set (already in visited),
    // so BFS queue empties and the no-solution fallback is reached.
    const { steps, plan } = sensorlessSearch([]);
    expect(steps).toHaveLength(0);
    expect(plan).toHaveLength(0);
  });
});

describe('onlineDFSAgent (null-fallback branches)', () => {
  it('state not in graph map: graph.get(s)??[] fires empty-array branch', () => {
    // 'B' is a neighbour of 'A' but has no entry as a key → graph.get('B')=undefined
    const g = new Map<string, ReadonlyArray<string>>([['A', ['B']]]);
    const steps = onlineDFSAgent(g, 'A', 'B');
    // A→B: on visiting B, graph.get('B') returns undefined → ?? [] branch
    const last = steps[steps.length - 1]!;
    expect(last.action).toBe('Stop');
    expect(last.currentState).toBe('B');
  });

  it('start state with no graph entry: both graph.get??[] and unbacktracked.get??[] fire', () => {
    // Empty graph → graph.get('A')=undefined and unbacktracked.get('A')=undefined
    const steps = onlineDFSAgent(new Map(), 'A', 'B');
    const last = steps[steps.length - 1]!;
    expect(last.action).toBe('Stop');
    expect(last.description).toContain('No more states');
  });
});

describe('lrtaStar (null-fallback branches)', () => {
  it('all heuristic ?? Infinity and ?? 0 branches: empty heuristic map', () => {
    // h is empty → h.get(currentState)??0 (line 814), h.get(neighbor)??Infinity (802, 806),
    // and h.get(goal)??0 (line 791) all fire.
    const g = new Map([
      ['A', [{ neighbor: 'B', cost: 1 }, { neighbor: 'C', cost: 2 }, { neighbor: 'D', cost: 3 }]],
      ['B', [] satisfies Array<{ neighbor: string; cost: number }>],
      ['C', [] satisfies Array<{ neighbor: string; cost: number }>],
      ['D', [] satisfies Array<{ neighbor: string; cost: number }>],
    ]);
    const h = new Map<string, number>(); // empty — no heuristic values at all
    const steps = lrtaStar(g, h, 'A', 'B', 5);
    // A: prevH=0 (??0), all neighbor costs=Infinity (??Infinity). Move to B (first, tie-broken).
    // B: goal. updatedH=0 (??0 at goal step).
    expect(steps).toHaveLength(2);
    expect(steps[0]!.currentState).toBe('A');
    expect(steps[0]!.updatedH).toBe(Infinity);
    expect(steps[1]!.action).toBe('Stop');
    expect(steps[1]!.updatedH).toBe(0);
  });

  it('graph.get(currentState)??[] fires when agent moves to state not in graph', () => {
    // 'B' is a valid goal-state neighbour but not a key in the graph.
    // After moving to 'B', graph.get('B')=undefined → ??[] branch fires.
    const g = new Map([['A', [{ neighbor: 'B', cost: 1 }]]]);
    const h = new Map([['A', 5], ['B', 3]]);
    // goal='Z' is unreachable so we reach 'B' as a dead-end non-goal state
    const steps = lrtaStar(g, h, 'A', 'Z', 5);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.nextState).toBe('B');
  });
});
