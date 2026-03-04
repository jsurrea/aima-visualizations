/**
 * Chapter 4 — Search in Complex Environments
 *
 * Pure algorithm implementations for hill climbing, simulated annealing,
 * and genetic algorithms (AIMA 4th Ed., Chapter 4).
 *
 * Each function:
 *   - Is a pure function with no side effects
 *   - Returns an immutable array of steps for playback
 *   - Has 100% branch + line coverage in tests/algorithms.test.ts
 *
 * @module algorithms
 */

// ─── Hill Climbing ───────────────────────────────────────────────────────────

export interface HillClimbingStep {
  readonly currentX: number;
  readonly currentValue: number;
  readonly neighborLeft: number;
  readonly neighborRight: number;
  readonly moved: 'left' | 'right' | 'none';
  readonly action: string;
}

/**
 * Discrete Hill Climbing — gradient ascent on a value array.
 * Moves to the neighbor (left or right, step=1) with the highest value.
 * Stops when no neighbor improves the current value (local maximum found).
 * Always emits at least one step (even if already at a local max).
 *
 * @param values - The discrete landscape; values[i] is the "height" at position i.
 * @param initial - Starting index (0-based).
 * @returns Immutable array of steps for playback.
 * @complexity O(n) worst case.
 */
export function hillClimbing(
  values: ReadonlyArray<number>,
  initial: number,
): ReadonlyArray<HillClimbingStep> {
  const n = values.length;
  const steps: HillClimbingStep[] = [];
  let currentX = initial;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const currentValue = values[currentX]!;
    const leftX = Math.max(0, currentX - 1);
    const rightX = Math.min(n - 1, currentX + 1);
    const neighborLeft = values[leftX]!;
    const neighborRight = values[rightX]!;

    let bestX: number;
    let bestValue: number;
    if (neighborLeft >= neighborRight) {
      bestX = leftX;
      bestValue = neighborLeft;
    } else {
      bestX = rightX;
      bestValue = neighborRight;
    }

    if (bestValue > currentValue) {
      const moved: 'left' | 'right' = bestX < currentX ? 'left' : 'right';
      steps.push({
        currentX,
        currentValue,
        neighborLeft,
        neighborRight,
        moved,
        action: `Moving ${moved} to x=${bestX} (value=${bestValue})`,
      });
      currentX = bestX;
    } else {
      steps.push({
        currentX,
        currentValue,
        neighborLeft,
        neighborRight,
        moved: 'none',
        action: `Local maximum at x=${currentX} (value=${currentValue})`,
      });
      break;
    }
  }

  return steps;
}

// ─── Simulated Annealing ─────────────────────────────────────────────────────

export interface SimulatedAnnealingStep {
  readonly iteration: number;
  readonly currentX: number;
  readonly currentValue: number;
  readonly nextX: number;
  readonly nextValue: number;
  readonly deltaE: number;
  readonly temperature: number;
  readonly probability: number;
  readonly accepted: boolean;
  readonly action: string;
}

/**
 * Simulated Annealing — stochastic local search (AIMA Algorithm 4.5).
 * Pre-generated schedule (temperatures) and neighbor sequence make this pure/deterministic.
 * Acceptance rule: accept if ΔE > 0; otherwise accept if exp(ΔE/T) > 0.5.
 *
 * @param values - Discrete landscape; values[i] is the objective value at i.
 * @param initial - Starting position index.
 * @param schedule - Pre-generated temperature for each iteration; length = number of iterations.
 * @param neighbors - Pre-generated next positions to try at each iteration; same length as schedule.
 * @returns Immutable array of steps for playback.
 * @complexity O(|schedule|)
 */
export function simulatedAnnealing(
  values: ReadonlyArray<number>,
  initial: number,
  schedule: ReadonlyArray<number>,
  neighbors: ReadonlyArray<number>,
): ReadonlyArray<SimulatedAnnealingStep> {
  const steps: SimulatedAnnealingStep[] = [];
  let currentX = initial;

  for (let i = 0; i < schedule.length; i++) {
    const temperature = schedule[i]!;
    const nextX = neighbors[i]!;
    const currentValue = values[currentX]!;
    const nextValue = values[nextX]!;
    const deltaE = nextValue - currentValue;
    const probability = deltaE > 0 ? 1.0 : Math.exp(deltaE / temperature);
    const accepted = deltaE > 0 ? true : probability > 0.5;

    steps.push({
      iteration: i,
      currentX,
      currentValue,
      nextX,
      nextValue,
      deltaE,
      temperature,
      probability,
      accepted,
      action: accepted
        ? `Accepted move to x=${nextX} (ΔE=${deltaE.toFixed(2)}, T=${temperature.toFixed(2)})`
        : `Rejected move to x=${nextX} (ΔE=${deltaE.toFixed(2)}, T=${temperature.toFixed(2)}, p=${probability.toFixed(4)})`,
    });

    if (accepted) {
      currentX = nextX;
    }
  }

  return steps;
}

// ─── Genetic Algorithm ───────────────────────────────────────────────────────

export interface Individual {
  readonly genes: ReadonlyArray<number>;
  readonly fitness: number;
}

export interface GeneticAlgorithmStep {
  readonly generation: number;
  readonly population: ReadonlyArray<Individual>;
  readonly bestIndividual: Individual;
  readonly action: string;
}

function bestOf(population: ReadonlyArray<Individual>): Individual {
  return population.reduce((best, ind) => (ind.fitness > best.fitness ? ind : best));
}

/**
 * Genetic Algorithm — population-based search (AIMA Algorithm 4.8).
 * crossoverPoints and mutationMask are pre-generated for determinism.
 * Selection: top ceil(popSize/2) individuals by fitness.
 * Crossover: single-point; child = parent1[:cp] + parent2[cp:].
 * Mutation: flip gene where mutationMask[g][i % maskLen] === 1.
 *
 * @param initialPopulation - Array of gene arrays; each gene is 0 or 1.
 * @param fitnessFunction - Maps gene array to a fitness score (pure).
 * @param crossoverPoints - One crossover point per generation (index into genes).
 * @param mutationMask - One mutation mask per generation; mask[i]=1 means flip gene i.
 * @param generations - Number of generations to run.
 * @returns Immutable array of steps (including initial generation as step 0).
 * @complexity O(generations * popSize * geneLength)
 */
export function geneticAlgorithm(
  initialPopulation: ReadonlyArray<ReadonlyArray<number>>,
  fitnessFunction: (genes: ReadonlyArray<number>) => number,
  crossoverPoints: ReadonlyArray<number>,
  mutationMask: ReadonlyArray<ReadonlyArray<number>>,
  generations: number,
): ReadonlyArray<GeneticAlgorithmStep> {
  const steps: GeneticAlgorithmStep[] = [];
  const popSize = initialPopulation.length;

  let population: Individual[] = initialPopulation.map(genes => ({
    genes,
    fitness: fitnessFunction(genes),
  }));

  steps.push({
    generation: 0,
    population,
    bestIndividual: bestOf(population),
    action: 'Initial population',
  });

  for (let g = 1; g <= generations; g++) {
    const numParents = Math.ceil(popSize / 2);
    const parents = [...population]
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, numParents);

    const cp = crossoverPoints[g - 1]!;
    const mask = mutationMask[g - 1]!;
    const children: Individual[] = [];

    for (let i = 0; i < parents.length; i += 2) {
      const p1 = parents[i]!;
      const p2 = i + 1 < parents.length ? parents[i + 1]! : parents[i]!;
      const childGenes = [
        ...p1.genes.slice(0, cp),
        ...p2.genes.slice(cp),
      ].map((gene, idx) =>
        mask[idx % mask.length]! === 1 ? 1 - gene : gene,
      );
      children.push({ genes: childGenes, fitness: fitnessFunction(childGenes) });
    }

    // Pad new population to original size with copies of the best child
    const best = bestOf(children);
    while (children.length < popSize) {
      children.push(best);
    }

    population = children;
    steps.push({
      generation: g,
      population,
      bestIndividual: bestOf(population),
      action: `Generation ${g}: crossover at ${cp}, population size ${population.length}`,
    });
  }

  return steps;
}
