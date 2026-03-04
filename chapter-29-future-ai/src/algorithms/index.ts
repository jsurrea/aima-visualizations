/**
 * Chapter 29 — The Future of AI
 *
 * Pure algorithm functions covering:
 *   §29.1 AI Components (sensors, representation, action selection, preferences, learning)
 *   §29.2 AI Architectures (anytime algorithms, bounded optimality, architecture selection)
 *
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Includes a JSDoc comment with parameter/return types and Big-O complexity
 *   - Has 100% branch + line coverage in the corresponding test file
 *
 * @module algorithms
 */

// ─── §29.1: AI Components ────────────────────────────────────────────────────

/**
 * Technology Readiness Level (TRL) for an AI component.
 * TRL 1 = basic principles; TRL 9 = fully operational.
 */
export interface ComponentReadiness {
  /** Short name of the component (e.g. "Sensors") */
  component: string;
  /** Human-readable category (§29.1 subsection) */
  category: 'sensors' | 'representation' | 'action' | 'preferences' | 'learning';
  /** Current TRL score, 1–9 */
  currentTRL: number;
  /** Projected TRL after the given number of years */
  projectedTRL: number;
  /** Primary bottleneck limiting further progress */
  bottleneck: string;
}

/**
 * Returns an assessment of AI component readiness for a given year offset from 2025.
 * Models the book's narrative that sensors/actuators are rapidly improving,
 * while preference specification and hierarchical reasoning lag behind.
 *
 * @param yearsAhead - Number of years ahead of 2025 to project (0–20).
 * @returns Array of ComponentReadiness records, one per §29.1 subsection.
 * @complexity O(1) — fixed 5-component array
 */
export function assessComponentReadiness(yearsAhead: number): ReadonlyArray<ComponentReadiness> {
  const y = Math.max(0, Math.min(20, yearsAhead));
  // Growth rates (TRL points per year) differ by component, clipped to 9
  const grow = (base: number, rate: number) =>
    Math.min(9, Math.round((base + rate * y) * 10) / 10);

  return [
    {
      component: 'Sensors & Actuators',
      category: 'sensors',
      currentTRL: 7,
      projectedTRL: grow(7, 0.15),
      bottleneck: 'Cost reduction for high-bandwidth actuators',
    },
    {
      component: 'State Representation',
      category: 'representation',
      currentTRL: 6,
      projectedTRL: grow(6, 0.12),
      bottleneck: 'Unified probabilistic + symbolic + neural representation',
    },
    {
      component: 'Action Selection',
      category: 'action',
      currentTRL: 5,
      projectedTRL: grow(5, 0.1),
      bottleneck: 'Hierarchical planning for long time horizons (billions of steps)',
    },
    {
      component: 'Preference Specification',
      category: 'preferences',
      currentTRL: 3,
      projectedTRL: grow(3, 0.08),
      bottleneck: 'Reward engineering and inverse reinforcement learning at scale',
    },
    {
      component: 'Learning',
      category: 'learning',
      currentTRL: 7,
      projectedTRL: grow(7, 0.13),
      bottleneck: 'Transfer learning with sparse data and novel representations',
    },
  ] as const;
}

/**
 * Overall system readiness: harmonic mean of component TRLs.
 * (The weakest component limits the whole system — like Liebig's Law of the Minimum.)
 *
 * @param components - Array of component readiness records.
 * @returns Harmonic mean TRL, rounded to 2 decimal places.
 * @complexity O(n)
 */
export function systemReadiness(components: ReadonlyArray<ComponentReadiness>): number {
  if (components.length === 0) return 0;
  const sumReciprocals = components.reduce((acc, c) => acc + 1 / c.projectedTRL, 0);
  return Math.round((components.length / sumReciprocals) * 100) / 100;
}

// ─── §29.2: Anytime Algorithms ───────────────────────────────────────────────

/** A single time-step snapshot for an anytime algorithm simulation. */
export interface AnytimeStep {
  /** Iteration / computation step number (0-based). */
  iteration: number;
  /** Solution quality in [0, 1] (1 = optimal). */
  quality: number;
  /** Human-readable label of what improved at this step. */
  action: string;
}

/** Growth function shapes for anytime algorithm quality curves. */
export type AnytimeGrowthShape = 'linear' | 'logarithmic' | 'sigmoid';

/**
 * Simulates an anytime algorithm producing a sequence of improving solutions.
 *
 * Real anytime algorithms include iterative-deepening A* (for game trees),
 * MCMC for Bayesian networks, and anytime weighted A*.
 *
 * @param maxIterations - Total number of iterations to simulate (≥ 1).
 * @param shape - Growth function: 'linear', 'logarithmic', or 'sigmoid'.
 * @param noiseSeed - Deterministic noise seed (0–999) for reproducibility.
 * @returns Immutable array of AnytimeStep records.
 * @complexity O(maxIterations)
 */
export function simulateAnytimeAlgorithm(
  maxIterations: number,
  shape: AnytimeGrowthShape,
  noiseSeed: number = 42,
): ReadonlyArray<AnytimeStep> {
  const n = Math.max(1, Math.floor(maxIterations));
  const steps: AnytimeStep[] = [];
  // Cheap deterministic LCG pseudo-noise
  const noise = (i: number) => {
    const x = Math.sin((i + noiseSeed) * 9301.0 + 49297.0) * 233280.0;
    return (x - Math.floor(x)) * 0.05 - 0.025;
  };

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1); // [0, 1]
    let baseQuality: number;
    if (shape === 'linear') {
      baseQuality = t;
    } else if (shape === 'logarithmic') {
      baseQuality = t === 0 ? 0 : Math.log(1 + t * (Math.E - 1)) / 1;
    } else {
      // sigmoid, centred at t=0.5
      baseQuality = 1 / (1 + Math.exp(-10 * (t - 0.5)));
    }
    const quality = Math.min(1, Math.max(0, baseQuality + noise(i)));

    let action: string;
    if (i === 0) {
      action = 'Initial solution found';
    } else {
      const prevQuality = (steps[i - 1] as AnytimeStep).quality;
      if (quality > prevQuality + 0.1) {
        action = 'Major improvement discovered';
      } else if (quality > prevQuality) {
        action = 'Solution refined';
      } else {
        action = 'Exploring (no improvement)';
      }
    }

    steps.push({ iteration: i, quality, action });
  }
  return steps;
}

// ─── §29.2: Bounded Optimality ───────────────────────────────────────────────

/** Description of a candidate agent program together with its resource profile. */
export interface AgentProgram {
  /** Unique name identifier. */
  name: string;
  /** Compute budget required (abstract units). */
  computeRequired: number;
  /** Expected solution quality in [0, 1] when given sufficient compute. */
  qualityAchieved: number;
  /** Short description of the program strategy. */
  description: string;
}

/**
 * Finds the bounded-optimal agent program: the one that achieves the highest
 * quality within a given compute budget (Russell & Subramanian, 1995).
 *
 * If no program fits within the budget, returns null.
 *
 * @param programs - Candidate agent programs (non-empty).
 * @param computeBudget - Maximum allowable compute (> 0).
 * @returns The best-fitting AgentProgram, or null if none fits.
 * @complexity O(n log n) — sort by quality descending then linear scan
 */
export function findBoundedOptimalProgram(
  programs: ReadonlyArray<AgentProgram>,
  computeBudget: number,
): AgentProgram | null {
  if (programs.length === 0 || computeBudget <= 0) return null;

  const affordable = programs.filter(p => p.computeRequired <= computeBudget);
  if (affordable.length === 0) return null;

  return affordable.reduce((best, p) =>
    p.qualityAchieved > best.qualityAchieved ? p : best,
  );
}

/**
 * Returns the Pareto-optimal frontier of programs: those where no other program
 * achieves both lower compute AND higher quality.
 *
 * @param programs - Candidate agent programs.
 * @returns Programs on the Pareto frontier, sorted by computeRequired ascending.
 * @complexity O(n²)
 */
export function paretoFrontier(
  programs: ReadonlyArray<AgentProgram>,
): ReadonlyArray<AgentProgram> {
  const frontier: AgentProgram[] = [];
  for (const candidate of programs) {
    const dominated = programs.some(
      p =>
        p !== candidate &&
        p.computeRequired <= candidate.computeRequired &&
        p.qualityAchieved >= candidate.qualityAchieved &&
        (p.computeRequired < candidate.computeRequired ||
          p.qualityAchieved > candidate.qualityAchieved),
    );
    if (!dominated) frontier.push(candidate);
  }
  return frontier.sort((a, b) => a.computeRequired - b.computeRequired);
}

// ─── §29.2: Architecture Selection ──────────────────────────────────────────

/** Axis values that characterise a task environment. */
export interface TaskCharacteristics {
  /**
   * How much deliberation time is available.
   * 0 = must act immediately; 1 = unlimited deliberation time.
   */
  timeAvailable: number;
  /**
   * Degree of environmental uncertainty (partial observability, stochasticity).
   * 0 = fully observable, deterministic; 1 = fully non-observable, stochastic.
   */
  uncertainty: number;
  /**
   * Complexity of the goal structure.
   * 0 = single hard goal; 1 = rich utility over many competing objectives.
   */
  goalComplexity: number;
  /**
   * How frequently the environment changes relative to the agent's speed.
   * 0 = static; 1 = highly dynamic.
   */
  dynamism: number;
}

/** Supported agent architecture types (Chapter 2 taxonomy). */
export type ArchitectureType =
  | 'simple-reflex'
  | 'model-based-reflex'
  | 'goal-based'
  | 'utility-based'
  | 'learning';

/** Architecture recommendation with a numeric suitability score. */
export interface ArchitectureRecommendation {
  architecture: ArchitectureType;
  score: number; // 0–1, higher is better for this task
  rationale: string;
}

/**
 * Scores each agent architecture for the given task characteristics.
 *
 * Based on §29.2: "The answer is, 'All of them!' — depending on the task."
 *
 * @param task - Task characteristics to evaluate against.
 * @returns Array of ArchitectureRecommendation sorted by score descending.
 * @complexity O(1)
 */
export function scoreArchitectures(
  task: TaskCharacteristics,
): ReadonlyArray<ArchitectureRecommendation> {
  const { timeAvailable, uncertainty, goalComplexity, dynamism } = task;

  const scores: Array<[ArchitectureType, number, string]> = [
    [
      'simple-reflex',
      // Favoured when time is scarce and environment is simple
      0.9 * (1 - timeAvailable) * (1 - uncertainty) * (1 - goalComplexity),
      'Fast condition-action rules; fails in partially observable or multi-goal settings.',
    ],
    [
      'model-based-reflex',
      // Good with little time but handles some uncertainty
      0.85 * (1 - timeAvailable) * uncertainty * (1 - goalComplexity),
      'Maintains internal state to handle partial observability; still reactive.',
    ],
    [
      'goal-based',
      // Benefits from deliberation time; handles moderate uncertainty
      0.8 * timeAvailable * (1 - uncertainty) * (1 - goalComplexity),
      'Plans sequences of actions toward a goal; brittle with multiple objectives.',
    ],
    [
      'utility-based',
      // Needs deliberation; handles rich goals and uncertainty
      0.9 * timeAvailable * uncertainty * goalComplexity,
      'Maximises expected utility; handles multiple competing objectives naturally.',
    ],
    [
      'learning',
      // Favoured in dynamic environments where the model is unknown
      0.85 * dynamism * (uncertainty + goalComplexity) * 0.5,
      'Adapts to unknown or changing environments; requires sufficient experience.',
    ],
  ];

  return scores
    .map(([architecture, score, rationale]) => ({
      architecture,
      score: Math.min(1, Math.round(score * 1000) / 1000),
      rationale,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Returns the highest-scoring architecture for a task.
 *
 * @param task - Task characteristics.
 * @returns The recommended ArchitectureType.
 * @complexity O(1)
 */
export function recommendArchitecture(task: TaskCharacteristics): ArchitectureType {
  const recommendations = scoreArchitectures(task);
  // scoreArchitectures always returns 5 items, so index 0 always exists
  return (recommendations[0] as ArchitectureRecommendation).architecture;
}
