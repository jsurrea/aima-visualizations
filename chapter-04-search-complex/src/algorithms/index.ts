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

// ─── Local Beam Search ───────────────────────────────────────────────────────

export interface LocalBeamSearchStep {
  readonly iteration: number;
  readonly beams: ReadonlyArray<{ x: number; value: number }>;
  readonly allSuccessors: ReadonlyArray<{ x: number; value: number }>;
  readonly bestValue: number;
  readonly action: string;
}

/**
 * Local Beam Search — keeps k states, selects the best k successors each step (AIMA §4.1.3).
 * Successors are left/right neighbors (clamped at array boundaries) of all current beam positions,
 * deduplicated by x-coordinate. Stops when no improvement is found or maxIterations is reached.
 *
 * @param values - Discrete landscape; values[i] is the "height" at position i.
 * @param initialPositions - Starting indices for each beam (k = initialPositions.length).
 * @param maxIterations - Maximum number of iterations before stopping.
 * @returns Immutable array of steps for playback.
 */
export function localBeamSearch(
  values: ReadonlyArray<number>,
  initialPositions: ReadonlyArray<number>,
  maxIterations: number,
): ReadonlyArray<LocalBeamSearchStep> {
  const k = initialPositions.length;
  const n = values.length;
  const steps: LocalBeamSearchStep[] = [];

  // initialPositions are validated to be in [0, n-1] by the caller convention; the
  // non-null assertion is safe because x comes from clamped indices within values.
  let beams: Array<{ x: number; value: number }> = initialPositions.map(x => ({
    x,
    value: values[Math.max(0, Math.min(n - 1, x))]!,
  }));

  for (let iter = 0; iter <= maxIterations; iter++) {
    const bestValue = beams.reduce((max, b) => Math.max(max, b.value), -Infinity);

    // Generate successors: left/right neighbors of every beam, deduplicated by x
    const successorMap = new Map<number, number>();
    if (n > 0) {
      for (const beam of beams) {
        const leftX = Math.max(0, beam.x - 1);
        const rightX = Math.min(n - 1, beam.x + 1);
        successorMap.set(leftX, values[leftX]!);
        successorMap.set(rightX, values[rightX]!);
      }
    }

    const allSuccessors = Array.from(successorMap.entries())
      .map(([x, value]) => ({ x, value }))
      .sort((a, b) => b.value - a.value || a.x - b.x);

    const topSuccessors = allSuccessors.slice(0, k);
    const newBestValue = topSuccessors.length > 0 ? topSuccessors[0]!.value : bestValue;
    const noImprovement = newBestValue <= bestValue;
    const isMaxIter = iter === maxIterations;

    const action = isMaxIter
      ? `Max iterations (${maxIterations}) reached, best value ${bestValue}`
      : noImprovement
      ? `No improvement at iteration ${iter}, local maxima found (best value ${bestValue})`
      : `Iteration ${iter}: advancing to top-${k} successors (new best ${newBestValue})`;

    steps.push({ iteration: iter, beams, allSuccessors, bestValue, action });

    if (isMaxIter || noImprovement) break;

    beams = topSuccessors;
  }

  return steps;
}

// ─── Gradient Descent ────────────────────────────────────────────────────────

export interface GradientDescentStep {
  readonly iteration: number;
  readonly x: number;
  readonly fx: number;
  readonly gradient: number;
  readonly stepSize: number;
  readonly action: string;
}

/**
 * Gradient Descent — minimises f(x) = (x−3)² + 2·sin(5x) (AIMA §4.2).
 * f′(x) = 2(x−3) + 10·cos(5x). Update rule: x ← x − α·f′(x).
 * Stops when |f′(x)| < tolerance or maxIterations is reached.
 * Always emits at least one step (the initial state).
 *
 * @param initial - Starting x value.
 * @param stepSize - Learning rate α.
 * @param maxIterations - Maximum number of update steps.
 * @param tolerance - Convergence threshold on |gradient|.
 * @returns Immutable array of steps for playback.
 */
export function gradientDescent(
  initial: number,
  stepSize: number,
  maxIterations: number,
  tolerance: number,
): ReadonlyArray<GradientDescentStep> {
  const f = (x: number): number => (x - 3) ** 2 + 2 * Math.sin(5 * x);
  const grad = (x: number): number => 2 * (x - 3) + 10 * Math.cos(5 * x);

  const steps: GradientDescentStep[] = [];
  let x = initial;

  for (let iter = 0; iter <= maxIterations; iter++) {
    const fx = f(x);
    const gradient = grad(x);
    const converged = Math.abs(gradient) < tolerance;
    const isMaxIter = iter === maxIterations;

    const action = converged
      ? `Converged at iteration ${iter}: |gradient| = ${Math.abs(gradient).toExponential(4)} < ${tolerance}`
      : isMaxIter
      ? `Max iterations (${maxIterations}) reached at x = ${x.toFixed(6)}`
      : `Iteration ${iter}: x=${x.toFixed(6)}, f(x)=${fx.toFixed(6)}, gradient=${gradient.toFixed(6)}`;

    steps.push({ iteration: iter, x, fx, gradient, stepSize, action });

    if (converged || isMaxIter) break;

    x = x - stepSize * gradient;
  }

  return steps;
}

// ─── AND-OR Search for Erratic Vacuum World ──────────────────────────────────
//
// State encoding (AIMA Figure 4.9):
//   1=[L,D,D]  2=[R,D,D]  3=[L,D,C]  4=[R,D,C]
//   5=[L,C,D]  6=[R,C,D]  7=[L,C,C]  8=[R,C,C]   ← goals
//
// Erratic Suck: on dirty cell cleans it (and sometimes the adjacent cell too);
//               on clean cell stays clean or deposits dirt.

export type VacuumAction = 'Left' | 'Right' | 'Suck';

const ERRATIC_LEFT_TRANS = new Map<number, number>([
  [1, 1], [2, 1], [3, 3], [4, 3], [5, 5], [6, 5], [7, 7], [8, 7],
]);

const ERRATIC_RIGHT_TRANS = new Map<number, number>([
  [1, 2], [2, 2], [3, 4], [4, 4], [5, 6], [6, 6], [7, 8], [8, 8],
]);

const ERRATIC_SUCK_TRANS = new Map<number, ReadonlyArray<number>>([
  [1, [5, 7]], [2, [4, 8]], [3, [7]],    [4, [2, 4]],
  [5, [1, 5]], [6, [8]],    [7, [3, 7]], [8, [6, 8]],
]);

function erraticOutcomes(state: number, action: VacuumAction): ReadonlyArray<number> {
  switch (action) {
    case 'Left':  return [ERRATIC_LEFT_TRANS.get(state)!];
    case 'Right': return [ERRATIC_RIGHT_TRANS.get(state)!];
    case 'Suck':  return ERRATIC_SUCK_TRANS.get(state)!;
  }
}

export interface AndOrNode {
  readonly state: number;
  readonly type: 'OR' | 'AND';
  readonly action?: VacuumAction;
  readonly outcomes?: ReadonlyArray<number>;
  readonly children?: ReadonlyArray<AndOrNode>;
  readonly result?: 'goal' | 'loop' | 'failure' | 'solution';
  readonly depth: number;
}

export interface AndOrSearchStep {
  readonly step: number;
  readonly visiting: number;
  readonly nodeType: 'OR' | 'AND';
  readonly path: ReadonlyArray<number>;
  readonly action: string;
}

/**
 * AND-OR Search for the erratic vacuum world (AIMA §4.3, Figure 4.10).
 * OR nodes choose an action; AND nodes must handle every nondeterministic outcome.
 * Cycle detection via the current-path set prevents infinite recursion.
 *
 * @param initialState - Starting state (1–8).
 * @returns { steps } — every node visited in exploration order;
 *          { tree }  — the resulting AND-OR solution tree.
 */
export function andOrSearch(
  initialState: number,
): { steps: ReadonlyArray<AndOrSearchStep>; tree: AndOrNode } {
  const steps: AndOrSearchStep[] = [];
  let stepCount = 0;
  const GOAL_STATES = new Set([7, 8]);
  const VACUUM_ACTIONS: ReadonlyArray<VacuumAction> = ['Left', 'Right', 'Suck'];

  function orSearch(state: number, path: ReadonlyArray<number>, depth: number): AndOrNode {
    steps.push({
      step: stepCount++,
      visiting: state,
      nodeType: 'OR',
      path: [...path],
      action: `OR node: visiting state ${state}`,
    });

    if (GOAL_STATES.has(state)) {
      return { state, type: 'OR', result: 'goal', depth };
    }

    if (path.includes(state)) {
      return { state, type: 'OR', result: 'loop', depth };
    }

    const newPath = [...path, state];

    for (const vacAction of VACUUM_ACTIONS) {
      const outcomes = erraticOutcomes(state, vacAction);
      const andNode = andSearch(state, outcomes, vacAction, newPath, depth + 1);
      if (andNode.result === 'solution') {
        return { state, type: 'OR', action: vacAction, children: [andNode], result: 'solution', depth };
      }
    }

    // Defensive: reached only if all actions fail in the current world (unreachable in vacuum world)
    return { state, type: 'OR', result: 'failure', depth };
  }

  function andSearch(
    fromState: number,
    outcomes: ReadonlyArray<number>,
    vacAction: VacuumAction,
    path: ReadonlyArray<number>,
    depth: number,
  ): AndOrNode {
    steps.push({
      step: stepCount++,
      visiting: fromState,
      nodeType: 'AND',
      path: [...path],
      action: `AND node: action=${vacAction}, outcomes=[${outcomes.join(',')}]`,
    });

    const children: AndOrNode[] = [];

    for (const outcome of outcomes) {
      const child = orSearch(outcome, path, depth);
      if (child.result !== 'goal' && child.result !== 'solution') {
        return { state: fromState, type: 'AND', action: vacAction, outcomes, result: 'failure', depth };
      }
      children.push(child);
    }

    return { state: fromState, type: 'AND', action: vacAction, outcomes, children, result: 'solution', depth };
  }

  const tree = orSearch(initialState, [], 0);
  return { steps, tree };
}

// ─── Sensorless Belief-State Search ──────────────────────────────────────────
//
// Deterministic vacuum world (non-erratic suck). BFS over belief states.
// A belief state is a set of possible world states. Goal: all states in
// the belief set are goal states (7 or 8).

export type BeliefState = ReadonlySet<number>;

export interface BeliefStateStep {
  readonly step: number;
  readonly beliefState: ReadonlyArray<number>;
  readonly action: VacuumAction;
  readonly nextBeliefState: ReadonlyArray<number>;
  readonly description: string;
}

const DET_LEFT_TRANS = new Map<number, number>([
  [1, 1], [2, 1], [3, 3], [4, 3], [5, 5], [6, 5], [7, 7], [8, 7],
]);

const DET_RIGHT_TRANS = new Map<number, number>([
  [1, 2], [2, 2], [3, 4], [4, 4], [5, 6], [6, 6], [7, 8], [8, 8],
]);

const DET_SUCK_TRANS = new Map<number, number>([
  [1, 5], [2, 4], [3, 7], [4, 4], [5, 5], [6, 8], [7, 7], [8, 8],
]);

function applyBeliefAction(
  belief: ReadonlyArray<number>,
  action: VacuumAction,
): ReadonlyArray<number> {
  const transMap = action === 'Left' ? DET_LEFT_TRANS
    : action === 'Right' ? DET_RIGHT_TRANS
    : DET_SUCK_TRANS;
  const nextSet = new Set(belief.map(s => transMap.get(s)!));
  return Array.from(nextSet).sort((a, b) => a - b);
}

function beliefKey(belief: ReadonlyArray<number>): string {
  return belief.join(',');
}

function isGoalBelief(belief: ReadonlyArray<number>): boolean {
  return belief.length > 0 && belief.every(s => s === 7 || s === 8);
}

/**
 * Sensorless (conformant) BFS over belief states (AIMA §4.4).
 * Finds the shortest action sequence that drives ANY initial state to a goal,
 * without any observations. Uses the deterministic vacuum-world transitions.
 *
 * @param initialBelief - Possible initial world states (sorted array of 1–8).
 * @returns { steps } — belief-state transitions along the found plan;
 *          { plan }  — the action sequence.
 */
export function sensorlessSearch(
  initialBelief: ReadonlyArray<number>,
): { steps: ReadonlyArray<BeliefStateStep>; plan: ReadonlyArray<VacuumAction> } {
  const initial = [...initialBelief].sort((a, b) => a - b);

  if (isGoalBelief(initial)) {
    return { steps: [], plan: [] };
  }

  type SearchNode = {
    belief: ReadonlyArray<number>;
    plan: ReadonlyArray<VacuumAction>;
    steps: ReadonlyArray<BeliefStateStep>;
  };

  const queue: SearchNode[] = [{ belief: initial, plan: [], steps: [] }];
  const visited = new Set<string>([beliefKey(initial)]);
  const ACTIONS: ReadonlyArray<VacuumAction> = ['Left', 'Right', 'Suck'];

  while (queue.length > 0) {
    const { belief, plan, steps } = queue.shift()!;

    for (const action of ACTIONS) {
      const nextBelief = applyBeliefAction(belief, action);
      const key = beliefKey(nextBelief);

      if (!visited.has(key)) {
        visited.add(key);

        const newStep: BeliefStateStep = {
          step: steps.length,
          beliefState: belief,
          action,
          nextBeliefState: nextBelief,
          description: `Apply ${action}: {${beliefKey(belief)}} → {${beliefKey(nextBelief)}}`,
        };

        const newSteps = [...steps, newStep];
        const newPlan = [...plan, action];

        if (isGoalBelief(nextBelief)) {
          return { steps: newSteps, plan: newPlan };
        }

        queue.push({ belief: nextBelief, plan: newPlan, steps: newSteps });
      }
    }
  }

  return { steps: [], plan: [] };
}

// ─── Online DFS Agent ─────────────────────────────────────────────────────────

export interface OnlineDFSStep {
  readonly step: number;
  readonly currentState: string;
  readonly action: string;
  readonly result: string;
  readonly visited: ReadonlyArray<string>;
  readonly untried: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly description: string;
}

function snapshotUntried(
  untried: Map<string, string[]>,
): ReadonlyMap<string, ReadonlyArray<string>> {
  return new Map(Array.from(untried.entries()).map(([k, v]) => [k, [...v]]));
}

/**
 * ONLINE-DFS-AGENT — explores an unknown graph using depth-first search with
 * backtracking (AIMA §4.5, Figure 4.21). The agent discovers successors only
 * upon visiting a state, and backtracks when all successors are exhausted.
 * In this grid-graph encoding, each "action" is the neighbour state to move to.
 *
 * @param graph - Adjacency map: state → list of neighbour states.
 * @param start - Starting state label.
 * @param goal  - Goal state label.
 * @returns Immutable array of steps recording each move.
 */
export function onlineDFSAgent(
  graph: ReadonlyMap<string, ReadonlyArray<string>>,
  start: string,
  goal: string,
): ReadonlyArray<OnlineDFSStep> {
  const steps: OnlineDFSStep[] = [];

  const resultMap = new Map<string, string>();      // `${state}|${action}` → next state
  const untried = new Map<string, string[]>();       // state → remaining untried neighbours
  const unbacktracked = new Map<string, string[]>(); // state → stack of predecessors to return to
  const visited = new Set<string>();

  let currentState = start;
  let prevState: string | null = null;
  let prevAction: string | null = null;

  const MAX_STEPS = 1000;

  for (let stepNum = 0; stepNum <= MAX_STEPS; stepNum++) {
    const s = currentState;

    // Discover new state: initialise untried actions
    if (!untried.has(s)) {
      untried.set(s, [...(graph.get(s) ?? [])]);
      visited.add(s);
    }

    // Record the outcome of the previous move (first traversal only)
    if (prevState !== null && prevAction !== null) {
      const resultKey = `${prevState}|${prevAction}`;
      if (!resultMap.has(resultKey)) {
        resultMap.set(resultKey, s);
        const unback = unbacktracked.get(s) ?? [];
        unbacktracked.set(s, [prevState, ...unback]);
      }
    }

    // Goal check
    if (s === goal) {
      steps.push({
        step: stepNum,
        currentState: s,
        action: 'Stop',
        result: s,
        visited: Array.from(visited).sort(),
        untried: snapshotUntried(untried),
        description: `Goal state ${s} reached`,
      });
      break;
    }

    const untriedForS = untried.get(s)!;
    let nextAction: string;
    let isBacktrack = false;

    if (untriedForS.length > 0) {
      // Try next unexplored neighbour
      nextAction = untriedForS.shift()!;
    } else {
      // Backtrack to the most recent unfinished predecessor
      const unback = unbacktracked.get(s) ?? [];
      if (unback.length === 0) {
        steps.push({
          step: stepNum,
          currentState: s,
          action: 'Stop',
          result: s,
          visited: Array.from(visited).sort(),
          untried: snapshotUntried(untried),
          description: `No more states to explore from ${s}`,
        });
        break;
      }
      nextAction = unback.shift()!; // In grid graphs action label = target state
      isBacktrack = true;
    }

    const nextState = nextAction;

    steps.push({
      step: stepNum,
      currentState: s,
      action: `Move to ${nextAction}`,
      result: nextState,
      visited: Array.from(visited).sort(),
      untried: snapshotUntried(untried),
      description: isBacktrack
        ? `Backtracking from ${s} to ${nextState}`
        : `Exploring ${nextAction} from ${s}`,
    });

    prevState = s;
    prevAction = nextAction;
    currentState = nextState;
  }

  return steps;
}

// ─── LRTA* Agent ─────────────────────────────────────────────────────────────

export interface LRTAStarStep {
  readonly step: number;
  readonly currentState: string;
  readonly action: string;
  readonly nextState: string;
  readonly hValues: ReadonlyMap<string, number>;
  readonly updatedH: number;
  readonly description: string;
}

/**
 * LRTA* (Learning Real-Time A*) Agent — online search with heuristic learning
 * (AIMA §4.5, Figure 4.24). At each step the agent moves to the neighbour
 * minimising LRTA*-cost = c(s, a, s′) + H[s′], then raises H[s] to that cost.
 * This guarantees H values are monotonically non-decreasing.
 *
 * @param graph     - Adjacency map: state → [{neighbour, cost}].
 * @param heuristic - Initial H estimates for all states.
 * @param start     - Starting state label.
 * @param goal      - Goal state label.
 * @param maxSteps  - Maximum number of move steps before stopping.
 * @returns Immutable array of steps for playback.
 */
export function lrtaStar(
  graph: ReadonlyMap<string, ReadonlyArray<{ neighbor: string; cost: number }>>,
  heuristic: ReadonlyMap<string, number>,
  start: string,
  goal: string,
  maxSteps: number,
): ReadonlyArray<LRTAStarStep> {
  const h = new Map(heuristic);
  const steps: LRTAStarStep[] = [];
  let currentState = start;

  for (let step = 0; step < maxSteps; step++) {
    if (currentState === goal) {
      steps.push({
        step,
        currentState,
        action: 'Stop',
        nextState: currentState,
        hValues: new Map(h),
        updatedH: h.get(currentState) ?? 0,
        description: `Goal ${goal} reached`,
      });
      break;
    }

    const neighbors = graph.get(currentState) ?? [];
    if (neighbors.length === 0) break; // dead-end (non-goal state with no exits)

    // Choose action minimising LRTA*-cost = c(s,a,s′) + H[s′]
    let bestEdge = neighbors[0]!;
    let bestCost = bestEdge.cost + (h.get(bestEdge.neighbor) ?? Infinity);

    for (let i = 1; i < neighbors.length; i++) {
      const edge = neighbors[i]!;
      const cost = edge.cost + (h.get(edge.neighbor) ?? Infinity);
      if (cost < bestCost) {
        bestCost = cost;
        bestEdge = edge;
      }
    }

    // Update H[currentState] ← max(H[currentState], bestCost)
    const prevH = h.get(currentState) ?? 0;
    const newH = Math.max(prevH, bestCost);
    h.set(currentState, newH);

    steps.push({
      step,
      currentState,
      action: `Move to ${bestEdge.neighbor}`,
      nextState: bestEdge.neighbor,
      hValues: new Map(h),
      updatedH: newH,
      description: `At ${currentState}: H ${prevH}→${newH}, moving to ${bestEdge.neighbor}`,
    });

    currentState = bestEdge.neighbor;
  }

  return steps;
}
