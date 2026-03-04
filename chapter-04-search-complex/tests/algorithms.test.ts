import { describe, it, expect } from 'vitest';
import {
  hillClimbing,
  simulatedAnnealing,
  geneticAlgorithm,
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

  it('crossover produces correct child genes (even parent count, true branch)', () => {
    // popSize=4 → numParents=2. Pair (P0, P1) takes the true branch (i+1=1 < 2=parents.length).
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

  it('odd parent count uses same parent for unpaired parent (false branch)', () => {
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
