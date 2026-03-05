/**
 * Chapter 23 — Reinforcement Learning
 *
 * Pure algorithm implementations covering:
 *   §23.2 Passive RL — Direct Utility Estimation, Passive TD(0), Passive ADP
 *   §23.3 Active RL  — Q-Learning (with exploration), SARSA
 *   §23.4 Function Approximation — Linear FA, TD-FA, Q-FA
 *   §23.5 Policy Gradient — Softmax policy, REINFORCE
 *   §23.6 Inverse RL  — Feature expectations, Feature-matching IRL
 *   Grid-world helpers — canonical AIMA 4×3 world (Fig. 23.1)
 *
 * Reward convention (used throughout):
 *   reward in Transition = R(nextState) — the reward received upon *entering*
 *   nextState.  Terminal states carry their final reward (±1); all other
 *   non-terminal, non-wall states carry –0.04.
 *
 * All functions are pure — no side effects, no mutation of inputs.
 *
 * @module algorithms
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cardinal movement direction. */
export type GridAction = 'up' | 'down' | 'left' | 'right';

/**
 * Grid-world state encoded as the string `"row,col"` (0-indexed,
 * row 0 = top row, col 0 = left column).
 */
export type State = string;

/** Describes the 4×3 AIMA grid world. */
export interface GridWorld {
  readonly rows: number;
  readonly cols: number;
  /** States that are impassable walls. */
  readonly walls: ReadonlySet<State>;
  /** Terminal states mapped to their scalar reward. */
  readonly terminals: ReadonlyMap<State, number>;
  /** Reward received when entering any non-terminal, non-wall state. */
  readonly defaultReward: number;
}

/** A single (s, a, r, s′) transition inside a trial episode. */
export interface Transition {
  readonly state: State;
  readonly action: GridAction;
  /** R(nextState) — reward received upon entering nextState. */
  readonly reward: number;
  readonly nextState: State;
}

/** Ordered list of transitions constituting one episode. */
export type Trial = ReadonlyArray<Transition>;

/** Result of Direct Utility Estimation (§23.2.1). */
export interface DUEResult {
  readonly utilities: ReadonlyMap<State, number>;
  readonly visitCounts: ReadonlyMap<State, number>;
}

/** Per-trial utility snapshot from passive TD learning. */
export interface TDHistory {
  readonly trial: number;
  readonly utilities: ReadonlyMap<State, number>;
}

/** Full result from the Passive ADP learner. */
export interface ADPResult {
  /** Value-iteration utilities under the estimated model. */
  readonly utilities: ReadonlyMap<State, number>;
  /**
   * Estimated transition model.
   * Key format: `"s;a;s′"`, value: estimated probability T(s,a,s′).
   */
  readonly transitionModel: ReadonlyMap<string, number>;
  /** Estimated reward model: state → average observed reward for entering that state. */
  readonly rewardModel: ReadonlyMap<State, number>;
}

/** Q-table and policy snapshot after one Q-learning episode. */
export interface QLearningHistory {
  readonly episode: number;
  readonly qTable: ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
  readonly policy: ReadonlyMap<State, GridAction>;
  readonly totalReward: number;
  readonly explorationCounts: ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
}

/** Q-table and policy snapshot after one SARSA episode. */
export interface SARSAHistory {
  readonly episode: number;
  readonly qTable: ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
  readonly policy: ReadonlyMap<State, GridAction>;
  readonly totalReward: number;
}

/** Result of a single FA parameter-vector update. */
export interface FAUpdateResult {
  readonly theta: ReadonlyArray<number>;
  readonly tdError: number;
}

/** Discounted feature expectations µ(π) used in IRL. */
export interface FeatureExpectations {
  readonly expectations: ReadonlyArray<number>;
  readonly numTrajectories: number;
}

/** Data for one IRL projection step. */
export interface IRLIteration {
  readonly weights: ReadonlyArray<number>;
  readonly expertExpectations: ReadonlyArray<number>;
  readonly policyExpectations: ReadonlyArray<number>;
  /** ‖µ_E − µ_π‖ — the SVM margin. */
  readonly margin: number;
}

/** Full result from feature-matching IRL. */
export interface IRLResult {
  readonly weights: ReadonlyArray<number>;
  readonly iterations: ReadonlyArray<IRLIteration>;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Multiplicative LCG seeded PRNG for reproducible stochastic experiments. */
function seededRNG(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ALL_ACTIONS: ReadonlyArray<GridAction> = ['up', 'down', 'left', 'right'];

/**
 * Moves from `state` in `action` direction and returns the resulting state.
 * Bounces back (returns original state) if the result is out-of-bounds or a wall.
 */
function applyAction(state: State, action: GridAction, gridWorld: GridWorld): State {
  const comma = state.indexOf(',');
  const r = parseInt(state.slice(0, comma), 10);
  const c = parseInt(state.slice(comma + 1), 10);
  let nr = r;
  let nc = c;
  if (action === 'up') {
    nr = r - 1;
  } else if (action === 'down') {
    nr = r + 1;
  } else if (action === 'left') {
    nc = c - 1;
  } else {
    nc = c + 1;
  }
  if (nr < 0 || nr >= gridWorld.rows || nc < 0 || nc >= gridWorld.cols) {
    return state;
  }
  const next: State = `${nr},${nc}`;
  if (gridWorld.walls.has(next)) {
    return state;
  }
  return next;
}

/**
 * Returns the two perpendicular actions for a given cardinal direction.
 * up/down → [left, right];  left/right → [up, down].
 */
function getPerpendicularActions(action: GridAction): [GridAction, GridAction] {
  if (action === 'up' || action === 'down') {
    return ['left', 'right'];
  }
  return ['up', 'down'];
}

/** Returns every valid (non-wall) state in the grid. */
function getValidStates(gridWorld: GridWorld): ReadonlyArray<State> {
  const states: State[] = [];
  for (let r = 0; r < gridWorld.rows; r++) {
    for (let c = 0; c < gridWorld.cols; c++) {
      const s: State = `${r},${c}`;
      if (!gridWorld.walls.has(s)) {
        states.push(s);
      }
    }
  }
  return states;
}

/** Derives the greedy policy from a Q-table over the given states. */
function computeGreedyPolicy(
  Q: ReadonlyMap<State, ReadonlyMap<GridAction, number>>,
  states: ReadonlyArray<State>,
): ReadonlyMap<State, GridAction> {
  const policy = new Map<State, GridAction>();
  for (const s of states) {
    const qS = Q.get(s);
    let bestAction: GridAction = 'up';
    let bestVal = -Infinity;
    for (const a of ALL_ACTIONS) {
      const v = qS?.get(a) ?? 0;
      if (v > bestVal) {
        bestVal = v;
        bestAction = a;
      }
    }
    policy.set(s, bestAction);
  }
  return policy;
}

/** Deep-copies a nested Q-table so snapshots remain immutable. */
function copyQTable(
  Q: ReadonlyMap<State, ReadonlyMap<GridAction, number>>,
): ReadonlyMap<State, ReadonlyMap<GridAction, number>> {
  const out = new Map<State, ReadonlyMap<GridAction, number>>();
  for (const [s, actions] of Q) {
    out.set(s, new Map(actions));
  }
  return out;
}

// ---------------------------------------------------------------------------
// §Grid-world helpers
// ---------------------------------------------------------------------------

/**
 * Creates the canonical AIMA 4×3 grid world (Fig. 23.1).
 *
 * Layout — row 0 = top, col 0 = left:
 * ```
 *  (0,0)  (0,1)  (0,2)  [+1 terminal  (0,3)]
 *  (1,0)  [wall] (1,2)  [−1 terminal  (1,3)]
 *  (2,0)  (2,1)  (2,2)  (2,3)
 * ```
 * Stochastic transitions: 80 % intended direction, 10 % each perpendicular.
 *
 * @returns A frozen GridWorld descriptor.
 * @complexity O(1)
 */
export function createGridWorld(): GridWorld {
  return {
    rows: 3,
    cols: 4,
    walls: new Set<State>(['1,1']) as ReadonlySet<State>,
    terminals: new Map<State, number>([
      ['0,3', 1.0],
      ['1,3', -1.0],
    ]) as ReadonlyMap<State, number>,
    defaultReward: -0.04,
  };
}

/**
 * Returns the reward received upon *entering* `state`.
 *
 * Terminal states return their configured reward.
 * Wall states return 0 (unreachable under normal operation).
 * All other states return `gridWorld.defaultReward`.
 *
 * @param state     - The state being entered.
 * @param gridWorld - The grid world definition.
 * @returns Scalar reward.
 * @complexity O(1)
 */
export function getReward(state: State, gridWorld: GridWorld): number {
  const termReward = gridWorld.terminals.get(state);
  if (termReward !== undefined) {
    return termReward;
  }
  if (gridWorld.walls.has(state)) {
    return 0;
  }
  return gridWorld.defaultReward;
}

/**
 * Samples the next state given current state and intended action.
 *
 * Probability model: 80 % intended direction, 10 % each perpendicular.
 * Bounces (stays put) on wall or out-of-bounds.
 *
 * @param state     - Current state.
 * @param action    - Intended action.
 * @param gridWorld - The grid world.
 * @param rng       - Seeded random number generator returning values in [0, 1).
 * @returns Sampled next state.
 * @complexity O(1)
 */
export function sampleTransition(
  state: State,
  action: GridAction,
  gridWorld: GridWorld,
  rng: () => number,
): State {
  const p = rng();
  const perp = getPerpendicularActions(action);
  let actualAction: GridAction;
  if (p < 0.8) {
    actualAction = action;
  } else if (p < 0.9) {
    actualAction = perp[0];
  } else {
    actualAction = perp[1];
  }
  return applyAction(state, actualAction, gridWorld);
}

// ---------------------------------------------------------------------------
// §23.2 — Passive RL
// ---------------------------------------------------------------------------

/**
 * Direct Utility Estimation (§23.2.1).
 *
 * For each state, computes the average observed discounted return across all
 * trials, starting from that state's first appearance in each trial segment.
 *
 * @param trials - Collection of episodes; each is an ordered list of Transitions.
 * @param gamma  - Discount factor γ ∈ [0, 1].
 * @returns Estimated utilities and per-state visit counts.
 * @complexity O(T × L²) where T = number of trials, L = max trial length.
 */
export function directUtilityEstimation(
  trials: ReadonlyArray<Trial>,
  gamma: number,
): DUEResult {
  const returnsMap = new Map<State, number[]>();

  for (const trial of trials) {
    for (let i = 0; i < trial.length; i++) {
      const state = trial[i]!.state;
      let g = 0;
      for (let j = i; j < trial.length; j++) {
        g += Math.pow(gamma, j - i) * trial[j]!.reward;
      }
      const existing = returnsMap.get(state);
      if (existing !== undefined) {
        existing.push(g);
      } else {
        returnsMap.set(state, [g]);
      }
    }
  }

  const utilities = new Map<State, number>();
  const visitCounts = new Map<State, number>();
  for (const [s, rets] of returnsMap) {
    utilities.set(s, rets.reduce((a, b) => a + b, 0) / rets.length);
    visitCounts.set(s, rets.length);
  }
  return { utilities, visitCounts };
}

/**
 * Passive TD(0) Learner (§23.2.3).
 *
 * Runs temporal-difference updates over a fixed set of trials produced by an
 * external policy, returning a utility snapshot after every trial.
 *
 * Update rule:
 *   U(s) ← U(s) + α [ r + γ U(s′) − U(s) ]
 *
 * @param trials - Observed episode data.
 * @param gamma  - Discount factor γ.
 * @param alpha  - Learning rate α.
 * @returns Array of TDHistory records (one per trial).
 * @complexity O(T × L) where T = #trials, L = max episode length.
 */
export function passiveTDLearner(
  trials: ReadonlyArray<Trial>,
  gamma: number,
  alpha: number,
): ReadonlyArray<TDHistory> {
  const U = new Map<State, number>();
  const history: TDHistory[] = [];

  for (let t = 0; t < trials.length; t++) {
    const trial = trials[t]!;
    for (const { state, reward, nextState } of trial) {
      const us = U.get(state) ?? 0;
      const uns = U.get(nextState) ?? 0;
      U.set(state, us + alpha * (reward + gamma * uns - us));
    }
    history.push({ trial: t, utilities: new Map(U) });
  }
  return history;
}

/**
 * Passive ADP Learner (§23.2.2).
 *
 * Learns the transition and reward models from observed trials, then solves
 * the policy-evaluation Bellman equations via value iteration.
 *
 * Bellman (policy evaluation, Convention B):
 *   U(s) = Σ_a π̂(a|s) Σ_{s′} T̂(s,a,s′) [ R̂(s′) + γ U(s′) ]
 *
 * @param trials - Observed episode data (from a fixed policy).
 * @param gamma  - Discount factor γ.
 * @returns Estimated utilities, transition model, and reward model.
 * @complexity O(iter × |S|² × |A|) for value-iteration component.
 */
export function passiveADPLearner(
  trials: ReadonlyArray<Trial>,
  gamma: number,
): ADPResult {
  // Counters
  const Ns = new Map<State, number>();           // N(s)
  const Nsa = new Map<string, number>();          // N(s,a)  key="s;a"
  const Nsas = new Map<string, number>();         // N(s,a,s') key="s;a;s'"
  const rewardSums = new Map<State, number>();    // sum of rewards for entering s
  const rewardCounts = new Map<State, number>();  // count of times s was entered

  for (const trial of trials) {
    for (const { state, action, reward, nextState } of trial) {
      Ns.set(state, (Ns.get(state) ?? 0) + 1);
      const saKey = `${state};${action}`;
      Nsa.set(saKey, (Nsa.get(saKey) ?? 0) + 1);
      const sasKey = `${state};${action};${nextState}`;
      Nsas.set(sasKey, (Nsas.get(sasKey) ?? 0) + 1);
      // Track reward for entering nextState
      rewardSums.set(nextState, (rewardSums.get(nextState) ?? 0) + reward);
      rewardCounts.set(nextState, (rewardCounts.get(nextState) ?? 0) + 1);
    }
  }

  // Estimated transition model T̂(s,a,s′)
  const transitionModel = new Map<string, number>();
  for (const [sasKey, count] of Nsas) {
    const parts = sasKey.split(';');
    const saKey = `${parts[0]};${parts[1]}`;
    const total = Nsa.get(saKey)!;
    transitionModel.set(sasKey, count / total);
  }

  // Estimated reward model R̂(s)
  const rewardModel = new Map<State, number>();
  for (const [s, sum] of rewardSums) {
    rewardModel.set(s, sum / rewardCounts.get(s)!);
  }

  // Collect all seen states
  const allStates = new Set<State>();
  for (const trial of trials) {
    for (const { state, nextState } of trial) {
      allStates.add(state);
      allStates.add(nextState);
    }
  }

  // Value iteration (policy evaluation under empirical action distribution)
  const U = new Map<State, number>();
  for (const s of allStates) {
    U.set(s, 0);
  }

  const ITER = 100;
  const EPS = 1e-6;
  for (let iter = 0; iter < ITER; iter++) {
    let delta = 0;
    for (const s of allStates) {
      const ns = Ns.get(s) ?? 0;
      if (ns === 0) continue;
      let newU = 0;
      for (const a of ALL_ACTIONS) {
        const saKey = `${s};${a}`;
        const nsa = Nsa.get(saKey) ?? 0;
        if (nsa === 0) continue;
        const piAs = nsa / ns; // empirical action probability
        // Sum over next states
        for (const [sasKey, prob] of transitionModel) {
          if (!sasKey.startsWith(`${s};${a};`)) continue;
          const sPrime = sasKey.slice(saKey.length + 1);
          const r = rewardModel.get(sPrime)!;
          newU += piAs * prob * (r + gamma * U.get(sPrime)!);
        }
      }
      const oldU = U.get(s)!;
      delta = Math.max(delta, Math.abs(newU - oldU));
      U.set(s, newU);
    }
    if (delta < EPS) break;
  }

  return { utilities: U, transitionModel, rewardModel };
}

// ---------------------------------------------------------------------------
// §23.3 — Active RL
// ---------------------------------------------------------------------------

/**
 * Single Q-learning update step with optimistic exploration (§23.3.3).
 *
 * Exploration function:  f(u, n) = R⁺  if n < Nₑ  else  u
 * Learning rate:         α = 1 / N(s, a)
 *
 * Update rule:
 *   N(s,a) ← N(s,a) + 1
 *   Q(s,a) ← Q(s,a) + α [ r + γ · max_{a′} f(Q(s′,a′), N(s′,a′)) − Q(s,a) ]
 *
 * When `isNextTerminal` is true the future term is set to 0 (no future actions).
 *
 * @param Q             - Current Q-table.
 * @param Nsa           - Exploration counts table.
 * @param state         - Current state s.
 * @param action        - Action a taken.
 * @param reward        - Reward r received (= R(s′)).
 * @param nextState     - Resulting state s′.
 * @param gamma         - Discount factor γ.
 * @param Rplus         - Optimistic reward bound R⁺.
 * @param Ne            - Exploration threshold Nₑ.
 * @param isNextTerminal - Whether s′ is a terminal state.
 * @returns Updated Q and Nsa tables (new objects; inputs unchanged).
 * @complexity O(|A|)
 */
export function qLearningStep(
  Q: ReadonlyMap<State, ReadonlyMap<GridAction, number>>,
  Nsa: ReadonlyMap<State, ReadonlyMap<GridAction, number>>,
  state: State,
  action: GridAction,
  reward: number,
  nextState: State,
  gamma: number,
  Rplus: number,
  Ne: number,
  isNextTerminal: boolean = false,
): {
  Q: ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
  Nsa: ReadonlyMap<State, ReadonlyMap<GridAction, number>>;
} {
  // Increment visit count
  const nStateOld = Nsa.get(state) ?? new Map<GridAction, number>();
  const nCurrent = (nStateOld.get(action) ?? 0) + 1;
  const alpha = 1 / nCurrent;

  // Compute max future Q-value using exploration function
  let maxNextQ = 0;
  if (!isNextTerminal) {
    const qNext = Q.get(nextState);
    const nNext = Nsa.get(nextState);
    for (const a of ALL_ACTIONS) {
      const qVal = qNext?.get(a) ?? 0;
      const nVal = nNext?.get(a) ?? 0;
      const fVal = nVal < Ne ? Rplus : qVal;
      if (fVal > maxNextQ) {
        maxNextQ = fVal;
      }
    }
  }

  // Q update
  const qStateOld = Q.get(state) ?? new Map<GridAction, number>();
  const qCurrent = qStateOld.get(action) ?? 0;
  const newQVal = qCurrent + alpha * (reward + gamma * maxNextQ - qCurrent);

  // Build new Q map (copy-on-write)
  const newQState = new Map<GridAction, number>(qStateOld);
  newQState.set(action, newQVal);
  const newQ = new Map<State, ReadonlyMap<GridAction, number>>(Q);
  newQ.set(state, newQState);

  // Build new Nsa map
  const newNState = new Map<GridAction, number>(nStateOld);
  newNState.set(action, nCurrent);
  const newNsa = new Map<State, ReadonlyMap<GridAction, number>>(Nsa);
  newNsa.set(state, newNState);

  return { Q: newQ, Nsa: newNsa };
}

/**
 * Single SARSA update step (§23.3.4, on-policy TD control).
 *
 * Update rule:
 *   Q(s,a) ← Q(s,a) + α [ r + γ Q(s′,a′) − Q(s,a) ]
 *
 * @param Q          - Current Q-table.
 * @param state      - Current state s.
 * @param action     - Action a taken.
 * @param reward     - Reward r received (= R(s′)).
 * @param nextState  - Resulting state s′.
 * @param nextAction - Action a′ chosen for s′ (by the policy).
 * @param gamma      - Discount factor γ.
 * @param alpha      - Learning rate α.
 * @returns Updated Q-table (new object; input unchanged).
 * @complexity O(1)
 */
export function sarsaStep(
  Q: ReadonlyMap<State, ReadonlyMap<GridAction, number>>,
  state: State,
  action: GridAction,
  reward: number,
  nextState: State,
  nextAction: GridAction,
  gamma: number,
  alpha: number,
): ReadonlyMap<State, ReadonlyMap<GridAction, number>> {
  const qSA = Q.get(state)?.get(action) ?? 0;
  const qNextSA = Q.get(nextState)?.get(nextAction) ?? 0;
  const newQSA = qSA + alpha * (reward + gamma * qNextSA - qSA);

  const newQState = new Map<GridAction, number>(Q.get(state) ?? new Map());
  newQState.set(action, newQSA);
  const newQ = new Map<State, ReadonlyMap<GridAction, number>>(Q);
  newQ.set(state, newQState);
  return newQ;
}

/**
 * Runs Q-learning on the 4×3 grid world for `episodes` episodes.
 *
 * Uses the optimistic-exploration function with parameters Rplus and Ne.
 * Learning rate decays as α = 1/N(s,a).
 *
 * @param gridWorld - The grid world.
 * @param episodes  - Number of training episodes.
 * @param gamma     - Discount factor γ.
 * @param Rplus     - Optimistic reward bound R⁺.
 * @param Ne        - Exploration threshold Nₑ.
 * @param seed      - PRNG seed for reproducibility.
 * @returns History of Q-table snapshots (one per episode).
 * @complexity O(episodes × maxSteps × |A|)
 */
export function runQLearning(
  gridWorld: GridWorld,
  episodes: number,
  gamma: number,
  Rplus: number,
  Ne: number,
  seed: number = 42,
): ReadonlyArray<QLearningHistory> {
  const rng = seededRNG(seed);

  const Q = new Map<State, Map<GridAction, number>>();
  const Nsa = new Map<State, Map<GridAction, number>>();

  const validStates = getValidStates(gridWorld);
  const nonTerminal = validStates.filter(s => !gridWorld.terminals.has(s));
  const history: QLearningHistory[] = [];
  const MAX_STEPS = 200;

  for (let ep = 0; ep < episodes; ep++) {
    const startIdx = Math.floor(rng() * nonTerminal.length);
    let state = nonTerminal[startIdx]!;
    let totalReward = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      if (gridWorld.terminals.has(state)) break;

      // Choose action via exploration function
      let bestAction: GridAction = 'up';
      let bestF = -Infinity;
      for (const a of ALL_ACTIONS) {
        const qVal = Q.get(state)?.get(a) ?? 0;
        const nVal = Nsa.get(state)?.get(a) ?? 0;
        const fVal = nVal < Ne ? Rplus : qVal;
        if (fVal > bestF) {
          bestF = fVal;
          bestAction = a;
        }
      }

      const nextState = sampleTransition(state, bestAction, gridWorld, rng);
      const reward = getReward(nextState, gridWorld);
      totalReward += reward;

      const isTerminal = gridWorld.terminals.has(nextState);

      // Update counts
      if (!Q.has(state)) Q.set(state, new Map());
      if (!Nsa.has(state)) Nsa.set(state, new Map());
      const nCur = (Nsa.get(state)!.get(bestAction) ?? 0) + 1;
      Nsa.get(state)!.set(bestAction, nCur);
      const alpha = 1 / nCur;

      // Compute max future Q
      let maxNextQ = 0;
      if (!isTerminal) {
        for (const a of ALL_ACTIONS) {
          const qVal = Q.get(nextState)?.get(a) ?? 0;
          const nVal = Nsa.get(nextState)?.get(a) ?? 0;
          const fVal = nVal < Ne ? Rplus : qVal;
          if (fVal > maxNextQ) maxNextQ = fVal;
        }
      }

      const qCur = Q.get(state)!.get(bestAction) ?? 0;
      Q.get(state)!.set(bestAction, qCur + alpha * (reward + gamma * maxNextQ - qCur));

      state = nextState;
    }

    const policy = computeGreedyPolicy(Q, nonTerminal);
    history.push({
      episode: ep,
      qTable: copyQTable(Q),
      policy,
      totalReward,
      explorationCounts: copyQTable(Nsa),
    });
  }
  return history;
}

/**
 * Runs SARSA on the 4×3 grid world for `episodes` episodes.
 *
 * Uses ε-greedy action selection (on-policy).
 *
 * @param gridWorld - The grid world.
 * @param episodes  - Number of training episodes.
 * @param gamma     - Discount factor γ.
 * @param alpha     - (Constant) learning rate α.
 * @param epsilon   - ε for ε-greedy exploration.
 * @param seed      - PRNG seed for reproducibility.
 * @returns History of Q-table snapshots (one per episode).
 * @complexity O(episodes × maxSteps)
 */
export function runSARSA(
  gridWorld: GridWorld,
  episodes: number,
  gamma: number,
  alpha: number,
  epsilon: number,
  seed: number = 42,
): ReadonlyArray<SARSAHistory> {
  const rng = seededRNG(seed);

  const Q = new Map<State, Map<GridAction, number>>();
  const validStates = getValidStates(gridWorld);
  const nonTerminal = validStates.filter(s => !gridWorld.terminals.has(s));
  const history: SARSAHistory[] = [];
  const MAX_STEPS = 200;

  /** ε-greedy action selection. */
  function chooseEpsilonGreedy(s: State): GridAction {
    if (rng() < epsilon) {
      return ALL_ACTIONS[Math.floor(rng() * ALL_ACTIONS.length)]!;
    }
    let best: GridAction = 'up';
    let bestV = -Infinity;
    for (const a of ALL_ACTIONS) {
      const v = Q.get(s)?.get(a) ?? 0;
      if (v > bestV) { bestV = v; best = a; }
    }
    return best;
  }

  for (let ep = 0; ep < episodes; ep++) {
    const startIdx = Math.floor(rng() * nonTerminal.length);
    let state = nonTerminal[startIdx]!;
    let action = chooseEpsilonGreedy(state);
    let totalReward = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      if (gridWorld.terminals.has(state)) break;

      const nextState = sampleTransition(state, action, gridWorld, rng);
      const reward = getReward(nextState, gridWorld);
      totalReward += reward;

      const nextAction = gridWorld.terminals.has(nextState)
        ? action
        : chooseEpsilonGreedy(nextState);

      // SARSA update
      if (!Q.has(state)) Q.set(state, new Map());
      const qSA = Q.get(state)!.get(action) ?? 0;
      const qNextSA = gridWorld.terminals.has(nextState)
        ? 0
        : (Q.get(nextState)?.get(nextAction) ?? 0);
      Q.get(state)!.set(action, qSA + alpha * (reward + gamma * qNextSA - qSA));

      state = nextState;
      action = nextAction;
    }

    const policy = computeGreedyPolicy(Q, nonTerminal);
    history.push({
      episode: ep,
      qTable: copyQTable(Q),
      policy,
      totalReward,
    });
  }
  return history;
}

// ---------------------------------------------------------------------------
// §23.4 — Function Approximation
// ---------------------------------------------------------------------------

/**
 * Evaluates the linear utility approximation Û_θ(s) = θ · f(s).
 *
 * @param theta    - Parameter vector θ (length k).
 * @param features - Feature vector f(s) (length k).
 * @returns Dot product θ · f(s).
 * @complexity O(k)
 */
export function linearFunctionApprox(
  theta: ReadonlyArray<number>,
  features: ReadonlyArray<number>,
): number {
  let sum = 0;
  const len = Math.min(theta.length, features.length);
  for (let i = 0; i < len; i++) {
    sum += theta[i]! * features[i]!;
  }
  return sum;
}

/**
 * TD(0) parameter update for linear function approximation (§23.4.2).
 *
 * Semi-gradient update rule:
 *   δ = r + γ θ·f(s′) − θ·f(s)
 *   θ ← θ + α · δ · f(s)
 *
 * @param theta           - Current parameter vector θ.
 * @param features_s      - Feature vector f(s) for current state.
 * @param features_s_prime - Feature vector f(s′) for next state.
 * @param reward          - Reward r received.
 * @param gamma           - Discount factor γ.
 * @param alpha           - Learning rate α.
 * @returns Updated θ and the TD error δ.
 * @complexity O(k)
 */
export function tdFAUpdate(
  theta: ReadonlyArray<number>,
  features_s: ReadonlyArray<number>,
  features_s_prime: ReadonlyArray<number>,
  reward: number,
  gamma: number,
  alpha: number,
): FAUpdateResult {
  const uS = linearFunctionApprox(theta, features_s);
  const uSPrime = linearFunctionApprox(theta, features_s_prime);
  const tdError = reward + gamma * uSPrime - uS;
  const newTheta = theta.map((t, i) => t + alpha * tdError * (features_s[i] ?? 0));
  return { theta: newTheta, tdError };
}

/**
 * Q-learning parameter update for linear function approximation (§23.4.3).
 *
 * Semi-gradient update rule:
 *   δ = r + γ θ·f(s′,a*) − θ·f(s,a)
 *   θ ← θ + α · δ · f(s,a)
 *
 * where f(s′,a*) is the feature vector for the best next (state, action) pair.
 *
 * @param theta              - Current parameter vector θ.
 * @param features_s_a       - Feature vector f(s,a) for current (state, action).
 * @param features_s_prime_best - Feature vector f(s′,a*) for best next pair.
 * @param reward             - Reward r received.
 * @param gamma              - Discount factor γ.
 * @param alpha              - Learning rate α.
 * @returns Updated θ and the TD error δ.
 * @complexity O(k)
 */
export function qFAUpdate(
  theta: ReadonlyArray<number>,
  features_s_a: ReadonlyArray<number>,
  features_s_prime_best: ReadonlyArray<number>,
  reward: number,
  gamma: number,
  alpha: number,
): FAUpdateResult {
  const qSA = linearFunctionApprox(theta, features_s_a);
  const qNext = linearFunctionApprox(theta, features_s_prime_best);
  const tdError = reward + gamma * qNext - qSA;
  const newTheta = theta.map((t, i) => t + alpha * tdError * (features_s_a[i] ?? 0));
  return { theta: newTheta, tdError };
}

// ---------------------------------------------------------------------------
// §23.5 — Policy Gradient
// ---------------------------------------------------------------------------

/**
 * Computes a softmax (Boltzmann) policy over actions from Q-values (§23.5).
 *
 * π(a|s) = exp(β · Q(s,a)) / Σ_{a′} exp(β · Q(s,a′))
 *
 * Numerically stable via max subtraction.
 *
 * @param qValues - Map from GridAction to Q-value Q(s, ·).
 * @param beta    - Inverse temperature β (higher = greedier).
 * @returns Map from GridAction to probability.
 * @complexity O(|A|)
 */
export function softmaxPolicy(
  qValues: ReadonlyMap<GridAction, number>,
  beta: number,
): ReadonlyMap<GridAction, number> {
  const vals = ALL_ACTIONS.map(a => (qValues.get(a) ?? 0) * beta);
  const maxVal = Math.max(...vals);
  const exps = vals.map(v => Math.exp(v - maxVal));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = new Map<GridAction, number>();
  for (let i = 0; i < ALL_ACTIONS.length; i++) {
    probs.set(ALL_ACTIONS[i]!, exps[i]! / sumExp);
  }
  return probs;
}

/**
 * REINFORCE policy-gradient update step (§23.5.1, Williams 1992).
 *
 * Update rule (log-derivative trick):
 *   ∇J(θ) ≈ G · ∇_θ log π(a|s;θ)
 *   θ_i ← θ_i + α · totalReward · (f_i(s,a) − Σ_{a′} π(a′|s) f_i(s,a′))
 *
 * Here θ are the linear weights of the softmax policy logits.
 *
 * @param theta        - Current parameter vector θ.
 * @param stateFeatures - Feature matrix: stateFeatures[a][i] = f_i(s, a).
 * @param actionTaken  - Index of the action that was taken.
 * @param actionProbs  - Current policy probabilities π(·|s).
 * @param totalReward  - Observed return G from this episode.
 * @param alpha        - Learning rate α.
 * @returns Updated parameter vector θ.
 * @complexity O(|A| × k)
 */
export function reinforceUpdate(
  theta: ReadonlyArray<number>,
  stateFeatures: ReadonlyArray<ReadonlyArray<number>>,
  actionTaken: number,
  actionProbs: ReadonlyArray<number>,
  totalReward: number,
  alpha: number,
): ReadonlyArray<number> {
  const k = theta.length;
  const newTheta = [...theta];
  for (let i = 0; i < k; i++) {
    // Baseline-free log-gradient: f_i(s,a) − E_π[f_i(s,·)]
    let baseline = 0;
    for (let a = 0; a < actionProbs.length; a++) {
      baseline += actionProbs[a]! * (stateFeatures[a]?.[i] ?? 0);
    }
    const grad = (stateFeatures[actionTaken]?.[i] ?? 0) - baseline;
    newTheta[i] = newTheta[i]! + alpha * totalReward * grad;
  }
  return newTheta;
}

// ---------------------------------------------------------------------------
// §23.6 — Inverse RL
// ---------------------------------------------------------------------------

/**
 * Computes discounted feature expectations µ(π) for a set of trajectories.
 *
 * µ(π)_k = (1/|traj|) Σ_τ Σ_t γ^t · f_k(s_t)
 *
 * @param trajectories     - Array of state sequences (each is an ordered list of states).
 * @param featureExtractor - Maps a state to its feature vector f(s).
 * @param gamma            - Discount factor γ.
 * @returns Feature expectations and trajectory count.
 * @complexity O(|traj| × L × k) where L = max trajectory length, k = #features.
 */
export function computeFeatureExpectations(
  trajectories: ReadonlyArray<ReadonlyArray<State>>,
  featureExtractor: (state: State) => ReadonlyArray<number>,
  gamma: number,
): FeatureExpectations {
  if (trajectories.length === 0) {
    return { expectations: [], numTrajectories: 0 };
  }

  const numFeatures = featureExtractor(trajectories[0]![0]!).length;
  const expectations = new Array<number>(numFeatures).fill(0);

  for (const traj of trajectories) {
    for (let t = 0; t < traj.length; t++) {
      const feats = featureExtractor(traj[t]!);
      const disc = Math.pow(gamma, t);
      for (let k = 0; k < numFeatures; k++) {
        expectations[k] = expectations[k]! + disc * (feats[k] ?? 0);
      }
    }
  }
  for (let k = 0; k < numFeatures; k++) {
    expectations[k] = expectations[k]! / trajectories.length;
  }
  return { expectations, numTrajectories: trajectories.length };
}

/**
 * Feature-matching Inverse Reinforcement Learning (Abbeel & Ng 2004, §23.6).
 *
 * Iteratively finds reward weights w such that expert feature expectations
 * match those of the induced policy via a max-margin projection:
 *   w^(i) = µ_E − µ(π^(i-1))   (then L2-normalised)
 *
 * @param expertTrajectories   - State-sequence trajectories from the expert policy.
 * @param candidatePolicies    - Per-iteration candidate trajectory sets.
 * @param featureExtractor     - Maps a state to its feature vector.
 * @param gamma                - Discount factor γ.
 * @param iterations           - Number of IRL projection steps.
 * @returns Final reward weights and per-iteration diagnostics.
 * @complexity O(iterations × |traj| × L × k)
 */
export function featureMatchingIRL(
  expertTrajectories: ReadonlyArray<ReadonlyArray<State>>,
  candidatePolicies: ReadonlyArray<ReadonlyArray<ReadonlyArray<State>>>,
  featureExtractor: (state: State) => ReadonlyArray<number>,
  gamma: number,
  iterations: number,
): IRLResult {
  const expertFE = computeFeatureExpectations(expertTrajectories, featureExtractor, gamma);
  const expertExp = expertFE.expectations;
  const numFeatures = expertExp.length;
  const iterResults: IRLIteration[] = [];
  let weights = new Array<number>(numFeatures).fill(0);

  for (let i = 0; i < iterations && i < candidatePolicies.length; i++) {
    const policyFE = computeFeatureExpectations(candidatePolicies[i]!, featureExtractor, gamma);
    const policyExp = policyFE.expectations;

    // Projection step: w = µ_E − µ_π
    const raw = expertExp.map((e, k) => e - (policyExp[k] ?? 0));
    const margin = Math.sqrt(raw.reduce((s, w) => s + w * w, 0));

    if (margin > 0) {
      weights = raw.map(w => w / margin);
    } else {
      weights = raw;
    }

    iterResults.push({
      weights: [...weights],
      expertExpectations: [...expertExp],
      policyExpectations: [...policyExp],
      margin,
    });
  }

  return { weights, iterations: iterResults };
}
