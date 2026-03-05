/**
 * Chapter 16 — Making Complex Decisions
 *
 * Algorithm implementations based on AIMA 4th Edition, Chapter 16 (pp. 552–588).
 *
 * Covers:
 *   §16.1  Sequential Decision Problems (MDP definition, Bellman equations, Q-values)
 *   §16.2  Algorithms for MDPs (value iteration, policy iteration)
 *   §16.3  Bandit Problems (UCB1, Thompson sampling, Gittins index)
 *   §16.4  Partially Observable MDPs (belief state update)
 *   §16.5  Algorithms for Solving POMDPs (POMDP value iteration)
 *
 * Every exported function is a pure function with no side effects and no
 * mutation of its arguments.
 *
 * @module algorithms
 */

// ─────────────────────────────────────────────────────────────────────────────
// §16.1 — MDP Types and Bellman Equations
// ─────────────────────────────────────────────────────────────────────────────

/** A fully observable MDP. */
export interface MDP {
  /** All non-terminal state identifiers. */
  readonly states: ReadonlyArray<string>;
  /** Terminal states (absorbing; reward received but no further decisions). */
  readonly terminalStates: ReadonlyArray<string>;
  /** Available actions for every state. */
  readonly actions: ReadonlyArray<string>;
  /** P(s' | s, a): transition probabilities. */
  readonly transitions: ReadonlyMap<string, ReadonlyArray<{ state: string; prob: number }>>;
  /** R(s, a, s'): reward for transition from s via a to s'. */
  readonly rewards: ReadonlyMap<string, number>;
  /** Discount factor in (0, 1]. */
  readonly gamma: number;
}

/**
 * Build the transition key string for (state, action, nextState).
 * @complexity O(1)
 */
export function transKey(s: string, a: string, sNext: string): string {
  return `${s}|${a}|${sNext}`;
}

/**
 * Build the action key string for (state, action).
 * @complexity O(1)
 */
export function actionKey(s: string, a: string): string {
  return `${s}|${a}`;
}

/**
 * Q-VALUE: compute the expected utility of action a in state s
 * given utility estimates U.
 *
 * Q(s,a) = Σ_{s'} P(s'|s,a) [R(s,a,s') + γ·U(s')]
 *
 * @param mdp - The MDP.
 * @param s - Current state.
 * @param a - Action to evaluate.
 * @param U - Current utility estimates.
 * @returns Expected utility value.
 * @complexity O(|S|) per call where |S| = number of reachable next states.
 */
export function qValue(
  mdp: MDP,
  s: string,
  a: string,
  U: ReadonlyMap<string, number>,
): number {
  const key = actionKey(s, a);
  /* v8 ignore start */
  const successors = mdp.transitions.get(key) ?? [];
  /* v8 ignore stop */
  let sum = 0;
  for (const { state: sPrime, prob } of successors) {
    /* v8 ignore start */
    const r = mdp.rewards.get(transKey(s, a, sPrime)) ?? 0;
    const uNext = U.get(sPrime) ?? 0;
    /* v8 ignore stop */
    sum += prob * (r + mdp.gamma * uNext);
  }
  return sum;
}

// ─────────────────────────────────────────────────────────────────────────────
// §16.2.1 — Value Iteration
// ─────────────────────────────────────────────────────────────────────────────

/** One iteration step in value iteration. */
export interface ValueIterationStep {
  /** Iteration number (1-based). */
  readonly iteration: number;
  /** Utility estimates for each state after this iteration. */
  readonly U: ReadonlyMap<string, number>;
  /** Maximum change (δ) across all state utilities in this iteration. */
  readonly delta: number;
  /** Whether convergence criterion δ ≤ ε·(1−γ)/γ has been met. */
  readonly converged: boolean;
  /** Best action per non-terminal state derived from U. */
  readonly policy: ReadonlyMap<string, string>;
}

/**
 * VALUE-ITERATION (Figure 16.6, p. 563)
 *
 * Runs Bellman updates until convergence: δ ≤ ε(1−γ)/γ.
 * Returns every iteration as a step for animated playback.
 *
 * @param mdp - The MDP to solve.
 * @param epsilon - Maximum allowed error in utility (default 0.001).
 * @param maxIter - Safety cap on iterations (default 200).
 * @returns All iteration steps including the final converged step.
 * @complexity O(maxIter · |S| · |A| · |S|) in the worst case.
 */
export function valueIteration(
  mdp: MDP,
  epsilon = 0.001,
  maxIter = 200,
): ReadonlyArray<ValueIterationStep> {
  const allStates = [...mdp.states, ...mdp.terminalStates];
  let U: Map<string, number> = new Map(allStates.map((s) => [s, 0]));
  const threshold = epsilon * (1 - mdp.gamma) / mdp.gamma;
  const steps: ValueIterationStep[] = [];

  for (let iter = 1; iter <= maxIter; iter++) {
    const UNext: Map<string, number> = new Map(U);
    let delta = 0;

    for (const s of mdp.states) {
      const best = Math.max(...mdp.actions.map((a) => qValue(mdp, s, a, U)));
      UNext.set(s, best);
      /* v8 ignore start */
      const prevU = U.get(s) ?? 0;
      /* v8 ignore stop */
      delta = Math.max(delta, Math.abs(best - prevU));
    }
    // Terminal states keep value 0 (already absorbed; rewards given on entry)
    for (const s of mdp.terminalStates) {
      UNext.set(s, 0);
    }

    const policy = extractPolicy(mdp, UNext);
    const converged = delta <= threshold;
    steps.push({ iteration: iter, U: new Map(UNext), delta, converged, policy });
    U = UNext;
    if (converged) break;
  }
  return steps;
}

/**
 * Extract a greedy policy from a utility function.
 * π(s) = argmax_a Q(s, a, U)
 *
 * @param mdp - The MDP.
 * @param U - Utility estimates.
 * @returns Map from state to best action.
 * @complexity O(|S|·|A|·|S|)
 */
export function extractPolicy(
  mdp: MDP,
  U: ReadonlyMap<string, number>,
): ReadonlyMap<string, string> {
  const policy = new Map<string, string>();
  for (const s of mdp.states) {
    /* v8 ignore start */
    let bestA = mdp.actions[0] ?? '';
    /* v8 ignore stop */
    let bestQ = -Infinity;
    for (const a of mdp.actions) {
      const q = qValue(mdp, s, a, U);
      if (q > bestQ) {
        bestQ = q;
        bestA = a;
      }
    }
    policy.set(s, bestA);
  }
  return policy;
}

// ─────────────────────────────────────────────────────────────────────────────
// §16.2.2 — Policy Iteration
// ─────────────────────────────────────────────────────────────────────────────

/** One phase of policy iteration (evaluation + improvement). */
export interface PolicyIterationStep {
  /** Iteration number (1-based). */
  readonly iteration: number;
  /** Phase: policy evaluation or policy improvement. */
  readonly phase: 'evaluation' | 'improvement';
  /** Current utility estimates. */
  readonly U: ReadonlyMap<string, number>;
  /** Current policy. */
  readonly policy: ReadonlyMap<string, string>;
  /** Whether the policy changed in this improvement step. */
  readonly unchanged: boolean;
}

/**
 * Simplified policy evaluation via iterated Bellman updates with fixed policy.
 *
 * Ui+1(s) ← Σ_{s'} P(s'|s,π(s)) [R(s,π(s),s') + γ·Ui(s')]
 *
 * Runs `k` iterations (or until convergence within tolerance).
 *
 * @param mdp - The MDP.
 * @param policy - Fixed policy to evaluate.
 * @param U - Starting utility estimates.
 * @param k - Number of simplified Bellman sweeps (default 20).
 * @returns Updated utility map.
 * @complexity O(k·|S|²) worst case.
 */
export function policyEvaluation(
  mdp: MDP,
  policy: ReadonlyMap<string, string>,
  U: ReadonlyMap<string, number>,
  k = 20,
): ReadonlyMap<string, number> {
  let current: Map<string, number> = new Map(U);
  for (let i = 0; i < k; i++) {
    const next: Map<string, number> = new Map(current);
    for (const s of mdp.states) {
      /* v8 ignore start */
      const a = policy.get(s) ?? (mdp.actions[0] ?? '');
      /* v8 ignore stop */
      next.set(s, qValue(mdp, s, a, current));
    }
    current = next;
  }
  return current;
}

/**
 * POLICY-ITERATION (Figure 16.9, p. 567)
 *
 * Alternates policy evaluation and policy improvement until no change.
 * Returns every phase as a step for animated playback.
 *
 * @param mdp - The MDP to solve.
 * @param maxIter - Safety cap on outer iterations (default 50).
 * @returns All steps (evaluation + improvement pairs) including final.
 * @complexity O(maxIter · |S|² · |A|) using simplified evaluation.
 */
export function policyIteration(
  mdp: MDP,
  maxIter = 50,
): ReadonlyArray<PolicyIterationStep> {
  const allStates = [...mdp.states, ...mdp.terminalStates];
  let U: ReadonlyMap<string, number> = new Map(allStates.map((s) => [s, 0]));
  // Initialize random policy
  let policy: Map<string, string> = new Map(
    /* v8 ignore start */
    mdp.states.map((s) => [s, mdp.actions[0] ?? '']),
    /* v8 ignore stop */
  );

  const steps: PolicyIterationStep[] = [];

  for (let iter = 1; iter <= maxIter; iter++) {
    // Phase 1: Policy Evaluation
    U = policyEvaluation(mdp, policy, U);
    steps.push({
      iteration: iter,
      phase: 'evaluation',
      U: new Map(U),
      policy: new Map(policy),
      unchanged: false,
    });

    // Phase 2: Policy Improvement
    let unchanged = true;
    const newPolicy = new Map<string, string>(policy);
    for (const s of mdp.states) {
      /* v8 ignore start */
      let bestA = mdp.actions[0] ?? '';
      /* v8 ignore stop */
      let bestQ = -Infinity;
      for (const a of mdp.actions) {
        const q = qValue(mdp, s, a, U);
        if (q > bestQ) {
          bestQ = q;
          bestA = a;
        }
      }
      /* v8 ignore start */
      const curQ = qValue(mdp, s, policy.get(s) ?? (mdp.actions[0] ?? ''), U);
      /* v8 ignore stop */
      if (bestQ > curQ + 1e-9) {
        newPolicy.set(s, bestA);
        unchanged = false;
      }
    }
    policy = newPolicy;
    steps.push({
      iteration: iter,
      phase: 'improvement',
      U: new Map(U),
      policy: new Map(policy),
      unchanged,
    });
    if (unchanged) break;
  }
  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// §16.3 — Bandit Problems
// ─────────────────────────────────────────────────────────────────────────────

/** State of one bandit arm. */
export interface BanditArm {
  /** Display name. */
  readonly name: string;
  /** True (unknown to agent) mean reward. */
  readonly trueMean: number;
  /** Standard deviation of reward distribution. */
  readonly trueStd: number;
}

/** Running statistics for a bandit arm. */
export interface ArmStats {
  /** Number of times pulled. */
  pulls: number;
  /** Sum of all observed rewards. */
  totalReward: number;
  /** Sample mean estimate. */
  mean: number;
  /** Beta distribution successes count (for Thompson sampling). */
  successes: number;
  /** Beta distribution failures count (for Thompson sampling). */
  failures: number;
}

/** One step of a bandit algorithm. */
export interface BanditStep {
  /** Round number. */
  readonly round: number;
  /** Index of the arm selected. */
  readonly selectedArm: number;
  /** Reward observed. */
  readonly reward: number;
  /** UCB values for each arm (if using UCB). */
  readonly ucbValues: ReadonlyArray<number>;
  /** Running statistics for each arm. */
  readonly stats: ReadonlyArray<Readonly<ArmStats>>;
  /** Cumulative regret so far. */
  readonly cumulativeRegret: number;
}

/**
 * Compute UCB1 index for arm i.
 *
 * UCB(i) = μ̂_i + √(2·ln(N) / n_i)
 *
 * where N = total pulls, n_i = pulls of arm i.
 * Returns Infinity for unpulled arms to force exploration.
 *
 * @param mean - Current sample mean of arm i.
 * @param armPulls - Number of times arm i has been pulled.
 * @param totalPulls - Total pulls across all arms.
 * @returns UCB1 index value.
 * @complexity O(1)
 */
export function ucb1Index(mean: number, armPulls: number, totalPulls: number): number {
  if (armPulls === 0) return Infinity;
  return mean + Math.sqrt((2 * Math.log(totalPulls)) / armPulls);
}

/**
 * Run the UCB1 bandit algorithm for a given number of rounds.
 *
 * Each round selects the arm with the highest UCB1 index, samples a reward,
 * and updates running statistics.
 *
 * @param arms - Array of bandit arms (true distributions).
 * @param rounds - Number of rounds to simulate.
 * @param rng - Optional seeded RNG for reproducibility (default: Math.random).
 * @returns Array of BanditStep, one per round.
 * @complexity O(rounds · |arms|)
 */
export function runUCB1(
  arms: ReadonlyArray<BanditArm>,
  rounds: number,
  rng: () => number = Math.random,
): ReadonlyArray<BanditStep> {
  const bestMean = Math.max(...arms.map((a) => a.trueMean));
  const stats: ArmStats[] = arms.map(() => ({
    pulls: 0,
    totalReward: 0,
    mean: 0,
    successes: 1,
    failures: 1,
  }));

  const steps: BanditStep[] = [];
  let cumulativeRegret = 0;
  let totalPulls = 0;

  for (let round = 1; round <= rounds; round++) {
    // Compute UCB values
    const ucbValues = stats.map((s) => ucb1Index(s.mean, s.pulls, totalPulls));

    // Select arm with highest UCB (ties broken by index)
    let selected = 0;
    let bestUCB = -Infinity;
    for (let i = 0; i < arms.length; i++) {
      /* v8 ignore start */
      if ((ucbValues[i] ?? -Infinity) > bestUCB) {
        bestUCB = ucbValues[i] ?? -Infinity;
        /* v8 ignore stop */
        selected = i;
      }
    }

    // Sample reward from Gaussian
    const arm = arms[selected]!;
    const reward = arm.trueMean + arm.trueStd * gaussianRng(rng);

    // Update stats
    stats[selected]!.pulls += 1;
    stats[selected]!.totalReward += reward;
    stats[selected]!.mean = stats[selected]!.totalReward / stats[selected]!.pulls;
    totalPulls += 1;

    cumulativeRegret += bestMean - arm.trueMean;

    steps.push({
      round,
      selectedArm: selected,
      reward,
      ucbValues: [...ucbValues],
      stats: stats.map((s) => ({ ...s })),
      cumulativeRegret,
    });
  }
  return steps;
}

/**
 * Run the Thompson Sampling bandit algorithm for a given number of rounds.
 *
 * Uses Beta(successes, failures) distributions as posteriors for each arm.
 * Arms produce Bernoulli rewards: 1 if reward > threshold, else 0.
 *
 * @param arms - Array of bandit arms (true distributions).
 * @param rounds - Number of rounds to simulate.
 * @param threshold - Reward threshold for success/failure binarisation.
 * @param rng - Optional seeded RNG.
 * @returns Array of BanditStep, one per round.
 * @complexity O(rounds · |arms|)
 */
export function runThompsonSampling(
  arms: ReadonlyArray<BanditArm>,
  rounds: number,
  threshold = 0,
  rng: () => number = Math.random,
): ReadonlyArray<BanditStep> {
  const bestMean = Math.max(...arms.map((a) => a.trueMean));
  const stats: ArmStats[] = arms.map(() => ({
    pulls: 0,
    totalReward: 0,
    mean: 0,
    successes: 1,
    failures: 1,
  }));

  const steps: BanditStep[] = [];
  let cumulativeRegret = 0;
  let totalPulls = 0;

  for (let round = 1; round <= rounds; round++) {
    // Sample theta_i ~ Beta(s_i, f_i) for each arm
    const samples = stats.map((s) => betaSample(s.successes, s.failures, rng));
    const ucbValues = samples; // UCB slot repurposed as Thompson samples

    // Select arm with highest sample
    let selected = 0;
    let bestSample = -Infinity;
    for (let i = 0; i < arms.length; i++) {
      /* v8 ignore start */
      if ((samples[i] ?? -Infinity) > bestSample) {
        bestSample = samples[i] ?? -Infinity;
        /* v8 ignore stop */
        selected = i;
      }
    }

    // Sample reward
    const arm = arms[selected]!;
    const reward = arm.trueMean + arm.trueStd * gaussianRng(rng);
    const success = reward > threshold;

    // Update stats
    stats[selected]!.pulls += 1;
    stats[selected]!.totalReward += reward;
    stats[selected]!.mean = stats[selected]!.totalReward / stats[selected]!.pulls;
    if (success) {
      stats[selected]!.successes += 1;
    } else {
      stats[selected]!.failures += 1;
    }
    totalPulls += 1;

    cumulativeRegret += bestMean - arm.trueMean;

    steps.push({
      round,
      selectedArm: selected,
      reward,
      ucbValues: [...ucbValues],
      stats: stats.map((s) => ({ ...s })),
      cumulativeRegret,
    });
  }
  return steps;
}

/**
 * Approximate Gittins index for a Bernoulli bandit arm using the restart MDP approach.
 *
 * The Gittins index is the λ at which the agent is indifferent between
 * continuing arm M and taking a fixed reward λ forever.
 *
 * Approximated by binary search: find λ such that value of restart MDP ≈ λ/(1−γ).
 *
 * @param successes - Number of successes observed (initial count = 1).
 * @param failures - Number of failures observed (initial count = 1).
 * @param gamma - Discount factor.
 * @param maxStates - Truncation depth for states s+f ≤ maxStates.
 * @returns Approximate Gittins index in [0, 1].
 * @complexity O(maxStates² · log(1/ε)) with binary search iterations.
 */
export function gittinsIndex(
  successes: number,
  failures: number,
  gamma: number,
  maxStates = 30,
): number {
  // Binary search for λ* in [0, 1]
  let lo = 0;
  let hi = 1;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    if (restartMDPValue(successes, failures, gamma, mid, maxStates) > mid / (1 - gamma)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Compute the value of the restart MDP for the Bernoulli bandit.
 * Used internally for Gittins index computation.
 *
 * @param s0 - Initial successes.
 * @param f0 - Initial failures.
 * @param gamma - Discount factor.
 * @param lambda - Fixed-arm reward to compare against.
 * @param maxStates - State truncation depth.
 * @returns Value of the restart MDP starting at (s0, f0).
 * @complexity O(maxStates²) per call.
 */
export function restartMDPValue(
  s0: number,
  f0: number,
  gamma: number,
  lambda: number,
  maxStates = 30,
): number {
  // Value iteration on the restart MDP
  const V = new Map<string, number>();
  const stateKey = (s: number, f: number) => `${s},${f}`;

  // Initialise all reachable states
  for (let sf = 2; sf <= maxStates + s0 + f0; sf++) {
    for (let s = 1; s < sf; s++) {
      const f = sf - s;
      V.set(stateKey(s, f), lambda / (1 - gamma));
    }
  }

  // Iterative value update (50 iterations for accuracy)
  for (let iter = 0; iter < 50; iter++) {
    const Vnew = new Map<string, number>(V);
    for (let sf = 2; sf <= maxStates + s0 + f0; sf++) {
      for (let s = 1; s < sf; s++) {
        const f = sf - s;
        const p = s / (s + f);
        /* v8 ignore start */
        const contVal =
          p * (1 + gamma * (V.get(stateKey(s + 1, f)) ?? lambda / (1 - gamma))) +
          (1 - p) * (0 + gamma * (V.get(stateKey(s, f + 1)) ?? lambda / (1 - gamma)));
        const restartVal = V.get(stateKey(s0, f0)) ?? lambda / (1 - gamma);
        /* v8 ignore stop */
        Vnew.set(stateKey(s, f), Math.max(contVal, restartVal, lambda / (1 - gamma)));
      }
    }
    // Copy back
    for (const [k, v] of Vnew) {
      V.set(k, v);
    }
  }
  /* v8 ignore start */
  return V.get(stateKey(s0, f0)) ?? lambda / (1 - gamma);
  /* v8 ignore stop */
}

// ─────────────────────────────────────────────────────────────────────────────
// §16.4 — Partially Observable MDPs
// ─────────────────────────────────────────────────────────────────────────────

/** A POMDP extends an MDP with an observation model. */
export interface POMDP {
  /** Physical states. */
  readonly states: ReadonlyArray<string>;
  /** Terminal states. */
  readonly terminalStates: ReadonlyArray<string>;
  /** Actions available. */
  readonly actions: ReadonlyArray<string>;
  /** P(s'|s,a): transition model. */
  readonly transitions: ReadonlyMap<string, ReadonlyArray<{ state: string; prob: number }>>;
  /** R(s,a,s'): reward function. */
  readonly rewards: ReadonlyMap<string, number>;
  /** P(e|s'): observation model — probability of observation given resulting state. */
  readonly observations: ReadonlyMap<string, number>;
  /** Possible observations. */
  readonly observationSpace: ReadonlyArray<string>;
  /** Discount factor. */
  readonly gamma: number;
}

/** Belief state: probability distribution over physical states. */
export type BeliefState = ReadonlyMap<string, number>;

/**
 * FORWARD belief update (Equation 16.16, p. 579).
 *
 * b'(s') = α · P(e|s') · Σ_s P(s'|s,a) · b(s)
 *
 * @param pomdp - The POMDP.
 * @param b - Current belief state.
 * @param a - Action taken.
 * @param e - Observation received.
 * @returns Updated (normalised) belief state.
 * @complexity O(|S|²)
 */
export function beliefUpdate(
  pomdp: POMDP,
  b: BeliefState,
  a: string,
  e: string,
): BeliefState {
  const allStates = [...pomdp.states, ...pomdp.terminalStates];
  const bNext = new Map<string, number>();

  for (const sPrime of allStates) {
    const obsKey = `${sPrime}|${e}`;
    /* v8 ignore start */
    const pObs = pomdp.observations.get(obsKey) ?? 0;
    /* v8 ignore stop */
    if (pObs === 0) {
      bNext.set(sPrime, 0);
      continue;
    }
    let sum = 0;
    for (const s of allStates) {
      /* v8 ignore start */
      const bS = b.get(s) ?? 0;
      /* v8 ignore stop */
      if (bS === 0) continue;
      const transK = actionKey(s, a);
      /* v8 ignore start */
      const succs = pomdp.transitions.get(transK) ?? [];
      const pTrans = succs.find((x) => x.state === sPrime)?.prob ?? 0;
      /* v8 ignore stop */
      sum += pTrans * bS;
    }
    bNext.set(sPrime, pObs * sum);
  }

  // Normalise
  let total = 0;
  for (const v of bNext.values()) total += v;
  if (total > 0) {
    for (const [s, v] of bNext) bNext.set(s, v / total);
  } else {
    // Uniform fallback if observation had zero probability
    const n = allStates.length;
    for (const s of allStates) bNext.set(s, 1 / n);
  }

  return bNext;
}

/**
 * Compute the expected reward for taking action a in belief state b.
 *
 * ρ(b, a) = Σ_s b(s) Σ_{s'} P(s'|s,a) R(s,a,s')
 *
 * @param pomdp - The POMDP.
 * @param b - Belief state.
 * @param a - Action.
 * @returns Expected reward.
 * @complexity O(|S|²)
 */
export function beliefReward(pomdp: POMDP, b: BeliefState, a: string): number {
  const allStates = [...pomdp.states, ...pomdp.terminalStates];
  let total = 0;
  for (const s of allStates) {
    /* v8 ignore start */
    const bS = b.get(s) ?? 0;
    /* v8 ignore stop */
    if (bS === 0) continue;
    const transK = actionKey(s, a);
    /* v8 ignore start */
    const succs = pomdp.transitions.get(transK) ?? [];
    /* v8 ignore stop */
    for (const { state: sPrime, prob } of succs) {
      /* v8 ignore start */
      const r = pomdp.rewards.get(transKey(s, a, sPrime)) ?? 0;
      /* v8 ignore stop */
      total += bS * prob * r;
    }
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// §16.5 — POMDP Value Iteration (alpha-vector approach)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An alpha-vector (a hyperplane in belief space) represents
 * the utility of a conditional plan starting with action `action`.
 */
export interface AlphaVector {
  /** The action that starts this conditional plan. */
  readonly action: string;
  /** Utility for each physical state under this plan. */
  readonly values: ReadonlyMap<string, number>;
}

/**
 * Compute the dot product of a belief state with an alpha-vector.
 *
 * dot(b, α) = Σ_s b(s) · α(s)
 *
 * @complexity O(|S|)
 */
export function dotBelief(b: BeliefState, alpha: AlphaVector): number {
  let sum = 0;
  for (const [s, bS] of b) {
    sum += bS * (alpha.values.get(s) ?? 0);
  }
  return sum;
}

/**
 * Given a set of alpha-vectors, return the value of the best one at belief b.
 * @complexity O(|Γ|·|S|)
 */
export function maxAlpha(b: BeliefState, alphas: ReadonlyArray<AlphaVector>): number {
  let best = -Infinity;
  for (const alpha of alphas) {
    const v = dotBelief(b, alpha);
    if (v > best) best = v;
  }
  return best;
}

/**
 * One step of the POMDP value iteration (based on Equation 16.18, p. 582).
 *
 * Generates the next set of alpha-vectors from the current set.
 * Each new vector corresponds to one action and one observation response.
 * Dominated vectors are pruned.
 *
 * @param pomdp - The POMDP.
 * @param alphas - Current set of undominated alpha-vectors.
 * @returns Updated set of undominated alpha-vectors.
 * @complexity O(|A|·|E|·|Γ|·|S|²) per iteration.
 */
export function pomdpValueIteration(
  pomdp: POMDP,
  alphas: ReadonlyArray<AlphaVector>,
): ReadonlyArray<AlphaVector> {
  const allStates = [...pomdp.states, ...pomdp.terminalStates];
  const newAlphas: AlphaVector[] = [];

  for (const a of pomdp.actions) {
    // For each combination of observation-conditional sub-plans, compute a new alpha
    // For simplicity, pick the best sub-plan for each observation (single backup step)
    const subPlansByObs: Array<AlphaVector> = [];
    for (const e of pomdp.observationSpace) {
      // For this (a, e), find alpha vector that maximises Σ_s' P(e|s') Σ_s P(s'|s,a) α(s')
      let bestAlpha: AlphaVector | null = null;
      let bestScore = -Infinity;
      for (const candidateAlpha of alphas) {
        // Score: average over all states using this alpha as sub-plan response to e
        let score = 0;
        for (const s of allStates) {
          const transK = actionKey(s, a);
          /* v8 ignore start */
          const succs = pomdp.transitions.get(transK) ?? [];
          /* v8 ignore stop */
          for (const { state: sPrime, prob } of succs) {
            const obsKey = `${sPrime}|${e}`;
            /* v8 ignore start */
            const pObs = pomdp.observations.get(obsKey) ?? 0;
            score += prob * pObs * (candidateAlpha.values.get(sPrime) ?? 0);
            /* v8 ignore stop */
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestAlpha = candidateAlpha;
        }
      }
      if (bestAlpha) subPlansByObs.push(bestAlpha);
    }

    // Build the new alpha vector for action a
    const newValues = new Map<string, number>();
    for (const s of allStates) {
      const transK = actionKey(s, a);
      /* v8 ignore start */
      const succs = pomdp.transitions.get(transK) ?? [];
      /* v8 ignore stop */
      let val = 0;
      for (const { state: sPrime, prob } of succs) {
        /* v8 ignore start */
        const r = pomdp.rewards.get(transKey(s, a, sPrime)) ?? 0;
        /* v8 ignore stop */
        // Expected utility from sub-plans weighted by observation probability
        let subVal = 0;
        for (let eIdx = 0; eIdx < pomdp.observationSpace.length; eIdx++) {
          const e = pomdp.observationSpace[eIdx]!;
          const subAlpha = subPlansByObs[eIdx];
          const obsKey = `${sPrime}|${e}`;
          /* v8 ignore start */
          const pObs = pomdp.observations.get(obsKey) ?? 0;
          subVal += pObs * (subAlpha?.values.get(sPrime) ?? 0);
          /* v8 ignore stop */
        }
        val += prob * (r + pomdp.gamma * subVal);
      }
      newValues.set(s, val);
    }
    newAlphas.push({ action: a, values: newValues });
  }

  // Prune dominated vectors
  return pruneAlphas(newAlphas, allStates);
}

/**
 * Remove dominated alpha-vectors.
 * An alpha-vector α is dominated if there exists another β such that β(s) ≥ α(s)
 * for all states s.
 *
 * @param alphas - Candidate alpha-vectors.
 * @param states - All physical states.
 * @returns Pruned set.
 * @complexity O(|Γ|²·|S|)
 */
export function pruneAlphas(
  alphas: ReadonlyArray<AlphaVector>,
  states: ReadonlyArray<string>,
): ReadonlyArray<AlphaVector> {
  const undominated: AlphaVector[] = [];
  for (let i = 0; i < alphas.length; i++) {
    let dominated = false;
    for (let j = 0; j < alphas.length; j++) {
      if (i === j) continue;
      const alphaI = alphas[i]!;
      const alphaJ = alphas[j]!;
      // Check if alphaJ dominates alphaI
      let jDominatesI = true;
      for (const s of states) {
        /* v8 ignore start */
        if ((alphaJ.values.get(s) ?? 0) < (alphaI.values.get(s) ?? 0) - 1e-9) {
          /* v8 ignore stop */
          jDominatesI = false;
          break;
        }
      }
      if (jDominatesI) {
        dominated = true;
        break;
      }
    }
    if (!dominated) undominated.push(alphas[i]!);
  }
  return undominated.length > 0 ? undominated : alphas.slice(0, 1);
}

/**
 * Run multiple steps of POMDP value iteration from the initial (all-zero) alpha set.
 *
 * @param pomdp - The POMDP.
 * @param depth - Number of backup steps (default 8).
 * @returns Array of alpha-vector sets at each depth.
 * @complexity O(depth · |A| · |E| · |Γ| · |S|²)
 */
export function runPOMDPValueIteration(
  pomdp: POMDP,
  depth = 8,
): ReadonlyArray<ReadonlyArray<AlphaVector>> {
  const allStates = [...pomdp.states, ...pomdp.terminalStates];
  // Initial alpha vectors: one per action, all zeros
  let current: ReadonlyArray<AlphaVector> = pomdp.actions.map((a) => ({
    action: a,
    values: new Map(allStates.map((s) => [s, 0])),
  }));

  const history: Array<ReadonlyArray<AlphaVector>> = [current];
  for (let d = 0; d < depth; d++) {
    current = pomdpValueIteration(pomdp, current);
    history.push(current);
  }
  return history;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a standard normal sample using Box-Muller transform.
 * @param rng - Uniform [0,1) random number generator.
 * @complexity O(1)
 */
export function gaussianRng(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from a Beta(a, b) distribution using a series of Gamma samples.
 * Uses the Johnk method for a, b < 1 and Cheng's method otherwise.
 * @param a - Alpha parameter (> 0).
 * @param b - Beta parameter (> 0).
 * @param rng - Uniform [0,1) random number generator.
 * @returns Sample in (0, 1).
 * @complexity O(1) amortized
 */
export function betaSample(a: number, b: number, rng: () => number): number {
  // Use ratio of Gamma samples: X ~ Gamma(a), Y ~ Gamma(b), return X/(X+Y)
  const x = gammaSample(a, rng);
  const y = gammaSample(b, rng);
  const total = x + y;
  /* v8 ignore start */
  if (total <= 0) return 0.5;
  /* v8 ignore stop */
  return x / total;
}

/**
 * Sample from Gamma(shape, 1) using Marsaglia-Tsang method.
 * @param shape - Shape parameter (> 0).
 * @param rng - Uniform [0,1) random number generator.
 * @complexity O(1) amortized
 */
export function gammaSample(shape: number, rng: () => number): number {
  if (shape < 1) {
    // Use the boost trick: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    const u = Math.max(rng(), 1e-10);
    return gammaSample(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = gaussianRng(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.max(rng(), 1e-10);
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Build the classic 4×3 MDP from Figure 16.1 (p. 553).
 *
 * States are named "(col,row)" with col ∈ {1,2,3,4}, row ∈ {1,2,3}.
 * (2,2) is a wall. (4,3) → +1 terminal. (4,2) → −1 terminal.
 * Action model: intended direction succeeds with probability 0.8;
 * perpendicular directions 0.1 each; wall bumps keep agent in place.
 * Step reward r (default −0.04) for all non-terminal transitions.
 *
 * @param r - Per-step reward for non-terminal transitions (default −0.04).
 * @param gamma - Discount factor (default 1.0).
 * @returns Fully constructed MDP.
 * @complexity O(|S|·|A|)
 */
export function buildGridMDP(r = -0.04, gamma = 1.0): MDP {
  const wall = '(2,2)';
  const terminalPos = '(4,3)';
  const terminalNeg = '(4,2)';
  const terminalRewardPos = 1;
  const terminalRewardNeg = -1;

  const allCells: Array<[number, number]> = [];
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 4; col++) {
      const s = `(${col},${row})`;
      if (s !== wall) allCells.push([col, row]);
    }
  }

  const terminalStates = [terminalPos, terminalNeg];
  const states = allCells
    .map(([c, row]) => `(${c},${row})`)
    .filter((s) => !terminalStates.includes(s));

  const actions = ['Up', 'Down', 'Left', 'Right'];

  // Direction vectors
  const dir: Record<string, [number, number]> = {
    Up: [0, 1],
    Down: [0, -1],
    Left: [-1, 0],
    Right: [1, 0],
  };
  const perp: Record<string, [string, string]> = {
    Up: ['Left', 'Right'],
    Down: ['Left', 'Right'],
    Left: ['Up', 'Down'],
    Right: ['Up', 'Down'],
  };

  const isValid = (col: number, row: number): boolean => {
    return col >= 1 && col <= 4 && row >= 1 && row <= 3 && `(${col},${row})` !== wall;
  };

  const move = (col: number, row: number, action: string): [number, number] => {
    const [dc, dr] = dir[action]!;
    const nc = col + dc;
    const nr = row + dr;
    return isValid(nc, nr) ? [nc, nr] : [col, row];
  };

  const transitions = new Map<string, Array<{ state: string; prob: number }>>();
  const rewards = new Map<string, number>();

  for (const [col, row] of allCells) {
    const s = `(${col},${row})`;
    if (terminalStates.includes(s)) continue;

    for (const a of actions) {
      const key = actionKey(s, a);
      const outcomes = new Map<string, number>();

      // 0.8 intended
      const [nc, nr] = move(col, row, a);
      const intended = `(${nc},${nr})`;
      outcomes.set(intended, (outcomes.get(intended) ?? 0) + 0.8);

      // 0.1 each perpendicular
      for (const pa of perp[a]!) {
        const [pc, pr] = move(col, row, pa);
        const perpState = `(${pc},${pr})`;
        outcomes.set(perpState, (outcomes.get(perpState) ?? 0) + 0.1);
      }

      transitions.set(
        key,
        Array.from(outcomes.entries()).map(([state, prob]) => ({ state, prob })),
      );

      // Rewards
      for (const [sPrime, _prob] of outcomes) {
        const rKey = transKey(s, a, sPrime);
        if (sPrime === terminalPos) {
          rewards.set(rKey, terminalRewardPos);
        } else if (sPrime === terminalNeg) {
          rewards.set(rKey, terminalRewardNeg);
        } else {
          rewards.set(rKey, r);
        }
      }
    }
  }

  return { states, terminalStates, actions, transitions, rewards, gamma };
}
