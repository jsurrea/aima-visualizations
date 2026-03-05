/**
 * Chapter 17 — Multiagent Decision Making
 * Pure algorithm implementations covering normal-form games, Nash equilibria,
 * cooperative game theory (Shapley value, core), and mechanism design
 * (auctions, voting, bargaining).
 *
 * @module algorithms
 */

// ─── EXPORTED TYPES ─────────────────────────────────────────────────────────

/**
 * Payoff matrix for a 2-player normal-form game.
 * `payoffs[i][j]` = [rowPlayerPayoff, colPlayerPayoff] when row plays i, col plays j.
 */
export type PayoffMatrix = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;

/**
 * Named FSM strategies for iterated prisoner's dilemma games.
 * - HAWK: always defect (T)
 * - DOVE: always cooperate (R)
 * - GRIM: cooperate until first defection, then defect forever
 * - TIT_FOR_TAT: start cooperate, copy opponent's previous move
 * - TAT_FOR_TIT: start defect, copy opponent's previous move
 */
export type RepeatedStrategy =
  | 'HAWK'
  | 'DOVE'
  | 'GRIM'
  | 'TIT_FOR_TAT'
  | 'TAT_FOR_TIT';

/**
 * Stage-game payoff matrix for repeated games.
 * Rows/cols indexed by action (0 = T/testify/defect, 1 = R/refuse/cooperate).
 */
export type StagePayoffs = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;

// ─── STEP / RESULT INTERFACES ───────────────────────────────────────────────

/** One round in a repeated game simulation. */
export interface RepeatedGameRound {
  readonly round: number;
  readonly agentAAction: 'T' | 'R';
  readonly agentBAction: 'T' | 'R';
  readonly payoffA: number;
  readonly payoffB: number;
}

/** A Nash equilibrium (pure or mixed) for a 2x2 game. */
export interface NashEquilibrium {
  /** Row player's mixed strategy: [prob of action 0, prob of action 1]. */
  readonly rowMixed: readonly [number, number];
  /** Col player's mixed strategy: [prob of action 0, prob of action 1]. */
  readonly colMixed: readonly [number, number];
  readonly type: 'pure' | 'mixed';
}

/** One step in an English auction. */
export interface EnglishAuctionStep {
  readonly currentPrice: number;
  /** Indices of bidders still active. */
  readonly activeBidders: ReadonlyArray<number>;
  /** Index of current highest bidder, or null if none. */
  readonly highestBidder: number | null;
  readonly action: string;
}

/** Result of a Vickrey (second-price) auction. */
export interface VickreyResult {
  readonly winner: number;
  readonly winnerPays: number;
  readonly utilities: ReadonlyArray<number>;
}

/** Result of a VCG mechanism. */
export interface VCGResult {
  readonly winners: ReadonlyArray<number>;
  readonly taxes: ReadonlyArray<number>;
  readonly utilities: ReadonlyArray<number>;
  readonly globalUtility: number;
}

/** Result of a Borda count election. */
export interface BordaResult {
  readonly scores: ReadonlyMap<number, number>;
  readonly winner: number;
  readonly ranking: ReadonlyArray<number>;
}

/** Result of a plurality election. */
export interface PluralityResult {
  readonly counts: ReadonlyMap<number, number>;
  readonly winner: number;
}

/** One round in instant-runoff voting. */
export interface IRVRound {
  /** Candidate eliminated this round (null if this is the final winner round). */
  readonly eliminated: number | null;
  /** Vote counts per candidate; -1 if the candidate was already eliminated. */
  readonly counts: ReadonlyArray<number>;
  /** Winner announced this round (null until the final round). */
  readonly winner: number | null;
}

/** Result of instant-runoff voting. */
export interface IRVResult {
  readonly rounds: ReadonlyArray<IRVRound>;
  readonly winner: number;
}

/** Rubinstein alternating-offers equilibrium. */
export interface RubinsteinResult {
  readonly agent1Gets: number;
  readonly agent2Gets: number;
  readonly acceptsAtRound: number;
}

/** One round in a Zeuthen negotiation. */
export interface ZeuthenRound {
  readonly round: number;
  /** What agent 1 demands for themselves. */
  readonly proposal1: number;
  /** What agent 2 demands for themselves. */
  readonly proposal2: number;
  readonly risk1: number;
  readonly risk2: number;
  /** Which agent concedes (null on agreement/conflict). */
  readonly conceding: 1 | 2 | null;
  readonly status: 'negotiating' | 'agreement' | 'conflict';
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

/** Generate all permutations of an array. O(n!) time and space. */
function permutations<T>(arr: readonly T[]): T[][] {
  if (arr.length === 1) return [[arr[0]!]];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i]!, ...perm]);
    }
  }
  return result;
}

/** Return all subsets of a player array as arrays (bitmask enumeration). */
function allSubsets(players: readonly number[]): number[][] {
  const n = players.length;
  const subsets: number[][] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(players[i]!);
    }
    subsets.push(subset);
  }
  return subsets;
}

/** Choose action for an FSM repeated-game strategy. */
function chooseAction(
  strategy: RepeatedStrategy,
  round: number,
  opponentHistory: ReadonlyArray<'T' | 'R'>,
  myHistory: ReadonlyArray<'T' | 'R'>,
): 'T' | 'R' {
  switch (strategy) {
    case 'HAWK':
      return 'T';
    case 'DOVE':
      return 'R';
    case 'GRIM':
      return opponentHistory.includes('T') ? 'T' : 'R';
    case 'TIT_FOR_TAT':
      if (round === 0) return 'R';
      return opponentHistory[round - 1]!;
    case 'TAT_FOR_TIT':
      if (round === 0) return 'T';
      return opponentHistory[round - 1]!;
  }
}

// ─── §17.1  MULTIAGENT PLANNING ──────────────────────────────────────────────

/**
 * Generate all valid interleavings of two sequential plans.
 * Each interleaving preserves the relative action order within each plan.
 * The total count is C(|planA|+|planB|, |planB|).
 *
 * @param planA - First plan (ordered action sequence).
 * @param planB - Second plan (ordered action sequence).
 * @returns Immutable array of all valid interleavings.
 * @complexity O(C(m+n, n)) time and space.
 */
export function generateInterleavings(
  planA: readonly string[],
  planB: readonly string[],
): readonly (readonly string[])[] {
  if (planA.length === 0 && planB.length === 0) return [[]];
  if (planA.length === 0) return [[...planB]];
  if (planB.length === 0) return [[...planA]];

  const results: (readonly string[])[] = [];

  // Take next from planA
  for (const suffix of generateInterleavings(planA.slice(1), planB)) {
    results.push([planA[0]!, ...suffix]);
  }
  // Take next from planB
  for (const suffix of generateInterleavings(planA, planB.slice(1))) {
    results.push([planB[0]!, ...suffix]);
  }

  return results;
}

/**
 * Check whether a joint action profile satisfies concurrent-action constraints.
 * A constraint on action `a` may require certain actions to be present
 * (`mustConcurrent`) or absent (`mustNotConcurrent`) in the same profile.
 *
 * @param actionProfile - One action per agent in the joint move.
 * @param constraints   - Map from action name to its concurrency constraints.
 * @returns `{valid, violations}` where violations lists each broken constraint.
 * @complexity O(|profile| × max(|mustConcurrent|, |mustNotConcurrent|))
 */
export function checkConcurrentConstraints(
  actionProfile: ReadonlyArray<string>,
  constraints: ReadonlyMap<
    string,
    {
      readonly mustConcurrent?: ReadonlyArray<string>;
      readonly mustNotConcurrent?: ReadonlyArray<string>;
    }
  >,
): { readonly valid: boolean; readonly violations: ReadonlyArray<string> } {
  const profileSet = new Set(actionProfile);
  const violations: string[] = [];

  for (const action of actionProfile) {
    const c = constraints.get(action);
    if (c === undefined) continue;

    for (const required of c.mustConcurrent ?? []) {
      if (!profileSet.has(required)) {
        violations.push(
          `"${action}" requires "${required}" to be concurrent but it is absent`,
        );
      }
    }
    for (const forbidden of c.mustNotConcurrent ?? []) {
      if (profileSet.has(forbidden)) {
        violations.push(
          `"${action}" forbids "${forbidden}" from being concurrent but it is present`,
        );
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

// ─── §17.2  NON-COOPERATIVE GAME THEORY ─────────────────────────────────────

/**
 * Find all pure-strategy Nash equilibria in a 2-player normal-form game.
 * A cell (i,j) is a Nash equilibrium iff row action i is a best response
 * to col action j, and col action j is a best response to row action i.
 *
 * @param payoffs - payoffs[i][j] = [rowPayoff, colPayoff].
 * @returns Array of [rowIdx, colIdx] pairs identifying each equilibrium.
 * @complexity O(m² × n²) where m = rows, n = cols.
 */
export function findPureNashEquilibria(
  payoffs: PayoffMatrix,
): ReadonlyArray<readonly [number, number]> {
  const numRows = payoffs.length;
  if (numRows === 0) return [];
  const numCols = payoffs[0]!.length;
  const equilibria: (readonly [number, number])[] = [];

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const [rowPayoff, colPayoff] = payoffs[i]![j]!;

      // Row best response: no other row gives a higher payoff against col j
      let rowBR = true;
      for (let k = 0; k < numRows; k++) {
        if (payoffs[k]![j]![0] > rowPayoff) {
          rowBR = false;
          break;
        }
      }

      // Col best response: no other col gives a higher payoff against row i
      let colBR = true;
      for (let l = 0; l < numCols; l++) {
        if (payoffs[i]![l]![1] > colPayoff) {
          colBR = false;
          break;
        }
      }

      if (rowBR && colBR) equilibria.push([i, j]);
    }
  }

  return equilibria;
}

/**
 * Find strongly and weakly dominant strategies for each player in a
 * 2-player normal-form game.
 *
 * An action is **strongly dominant** if it strictly beats all other actions
 * regardless of the opponent's strategy.  An action is **weakly dominant** if
 * it is at least as good as every other action against every opponent strategy
 * (with strict improvement in at least one case).
 *
 * @param payoffs - payoffs[i][j] = [rowPayoff, colPayoff].
 * @returns Indices of dominant strategies (null if no dominant strategy exists).
 * @complexity O(m² × n + m × n²)
 */
export function findDominantStrategies(payoffs: PayoffMatrix): {
  readonly rowDominant: number | null;
  readonly colDominant: number | null;
  readonly rowWeaklyDominant: number | null;
  readonly colWeaklyDominant: number | null;
} {
  const numRows = payoffs.length;
  if (numRows === 0)
    return {
      rowDominant: null,
      colDominant: null,
      rowWeaklyDominant: null,
      colWeaklyDominant: null,
    };
  const numCols = payoffs[0]!.length;

  let rowDominant: number | null = null;
  let rowWeaklyDominant: number | null = null;

  for (let i = 0; i < numRows; i++) {
    let stronglyDom = true;
    let weaklyDom = true;
    let hasStrictAdvantage = false;

    for (let k = 0; k < numRows; k++) {
      if (k === i) continue;
      for (let j = 0; j < numCols; j++) {
        const diff = payoffs[i]![j]![0] - payoffs[k]![j]![0];
        if (diff <= 0) stronglyDom = false;
        if (diff < 0) weaklyDom = false;
        if (diff > 0) hasStrictAdvantage = true;
      }
    }

    if (stronglyDom) rowDominant = i;
    if (weaklyDom && hasStrictAdvantage) rowWeaklyDominant = i;
  }

  let colDominant: number | null = null;
  let colWeaklyDominant: number | null = null;

  for (let j = 0; j < numCols; j++) {
    let stronglyDom = true;
    let weaklyDom = true;
    let hasStrictAdvantage = false;

    for (let l = 0; l < numCols; l++) {
      if (l === j) continue;
      for (let i = 0; i < numRows; i++) {
        const diff = payoffs[i]![j]![1] - payoffs[i]![l]![1];
        if (diff <= 0) stronglyDom = false;
        if (diff < 0) weaklyDom = false;
        if (diff > 0) hasStrictAdvantage = true;
      }
    }

    if (stronglyDom) colDominant = j;
    if (weaklyDom && hasStrictAdvantage) colWeaklyDominant = j;
  }

  return { rowDominant, colDominant, rowWeaklyDominant, colWeaklyDominant };
}

/**
 * Compute the mixed-strategy Nash equilibrium for a 2×2 zero-sum game
 * via the maximin / minimax criterion.
 *
 * Let the row player's payoff matrix be A (col player gets −A).
 * Row player's optimal mix probability p satisfies:
 *   p·A[0][0] + (1−p)·A[1][0] = p·A[0][1] + (1−p)·A[1][1]
 *
 * @param payoffs2x2 - 2×2 matrix; payoffs2x2[i][j] = payoff to row player.
 * @returns Optimal mixed strategies and game value.  Falls back to pure
 *          strategies when the denominator is zero.
 * @complexity O(1)
 */
export function computeMaximinStrategy2x2(
  payoffs2x2: ReadonlyArray<ReadonlyArray<number>>,
): {
  readonly rowStrategy: readonly [number, number];
  readonly colStrategy: readonly [number, number];
  readonly gameValue: number;
} {
  const a00 = payoffs2x2[0]![0]!;
  const a01 = payoffs2x2[0]![1]!;
  const a10 = payoffs2x2[1]![0]!;
  const a11 = payoffs2x2[1]![1]!;

  const denom = a00 - a01 - a10 + a11;

  if (Math.abs(denom) < 1e-10) {
    // Degenerate: fall back to pure maximin
    const minRow0 = Math.min(a00, a01);
    const minRow1 = Math.min(a10, a11);
    const bestRow = minRow0 >= minRow1 ? 0 : 1;

    const maxCol0 = Math.max(a00, a10);
    const maxCol1 = Math.max(a01, a11);
    const bestCol = maxCol0 <= maxCol1 ? 0 : 1;

    const rowStrategy: readonly [number, number] =
      bestRow === 0 ? [1, 0] : [0, 1];
    const colStrategy: readonly [number, number] =
      bestCol === 0 ? [1, 0] : [0, 1];

    const gameValue = bestCol === 0
      ? (bestRow === 0 ? a00 : a10)
      : (bestRow === 0 ? a01 : a11);

    return { rowStrategy, colStrategy, gameValue };
  }

  const p = (a11 - a10) / denom;
  const q = (a11 - a01) / denom;

  const pClamped = Math.max(0, Math.min(1, p));
  const qClamped = Math.max(0, Math.min(1, q));

  const gameValue =
    pClamped * qClamped * a00 +
    pClamped * (1 - qClamped) * a01 +
    (1 - pClamped) * qClamped * a10 +
    (1 - pClamped) * (1 - qClamped) * a11;

  return {
    rowStrategy: [pClamped, 1 - pClamped],
    colStrategy: [qClamped, 1 - qClamped],
    gameValue,
  };
}

/**
 * Compute social-welfare metrics for a given outcome in a 2-player game.
 *
 * @param payoffs   - Full payoff matrix.
 * @param rowAction - Row player's chosen action index.
 * @param colAction - Col player's chosen action index.
 * @returns Utilitarian welfare (sum), egalitarian welfare (min), and Pareto optimality flag.
 * @complexity O(m × n)
 */
export function computeSocialWelfare(
  payoffs: PayoffMatrix,
  rowAction: number,
  colAction: number,
): {
  readonly utilitarian: number;
  readonly egalitarian: number;
  readonly paretoOptimal: boolean;
} {
  const [rPayoff, cPayoff] = payoffs[rowAction]![colAction]!;
  return {
    utilitarian: rPayoff + cPayoff,
    egalitarian: Math.min(rPayoff, cPayoff),
    paretoOptimal: isOutcomeParetoOptimal(payoffs, rowAction, colAction),
  };
}

/**
 * Check whether an outcome is Pareto optimal: no other outcome makes both
 * players at least as well off while making at least one strictly better off.
 *
 * @param payoffs   - Full payoff matrix.
 * @param rowAction - Row player's action index.
 * @param colAction - Col player's action index.
 * @returns `true` iff the outcome is Pareto optimal.
 * @complexity O(m × n)
 */
export function isOutcomeParetoOptimal(
  payoffs: PayoffMatrix,
  rowAction: number,
  colAction: number,
): boolean {
  const [baseRow, baseCol] = payoffs[rowAction]![colAction]!;

  for (let r = 0; r < payoffs.length; r++) {
    for (let c = 0; c < payoffs[r]!.length; c++) {
      if (r === rowAction && c === colAction) continue;
      const [altRow, altCol] = payoffs[r]![c]!;
      if (altRow >= baseRow && altCol >= baseCol) {
        // At least one must be strictly better for a Pareto improvement
        if (altRow > baseRow || altCol > baseCol) return false;
      }
    }
  }

  return true;
}

/**
 * Simulate n rounds of an iterated game between two FSM strategies.
 *
 * Action encoding: 'T' = testify/defect (index 0), 'R' = refuse/cooperate (index 1).
 *
 * @param strategyA   - FSM strategy for agent A.
 * @param strategyB   - FSM strategy for agent B.
 * @param rounds      - Number of rounds to simulate.
 * @param stagePayoffs - Stage-game payoff matrix indexed as [actA][actB].
 * @returns Immutable array of per-round records.
 * @complexity O(rounds)
 */
export function simulateRepeatedGame(
  strategyA: RepeatedStrategy,
  strategyB: RepeatedStrategy,
  rounds: number,
  stagePayoffs: StagePayoffs,
): ReadonlyArray<RepeatedGameRound> {
  const actionIndex = (a: 'T' | 'R') => (a === 'T' ? 0 : 1);
  const histA: ('T' | 'R')[] = [];
  const histB: ('T' | 'R')[] = [];
  const result: RepeatedGameRound[] = [];

  for (let round = 0; round < rounds; round++) {
    const actionA = chooseAction(strategyA, round, histB, histA);
    const actionB = chooseAction(strategyB, round, histA, histB);

    const iA = actionIndex(actionA);
    const iB = actionIndex(actionB);
    const [payoffA, payoffB] = stagePayoffs[iA]![iB]!;

    result.push({ round, agentAAction: actionA, agentBAction: actionB, payoffA, payoffB });

    histA.push(actionA);
    histB.push(actionB);
  }

  return result;
}

/**
 * Compute the limit-of-means utility: average payoff over a sequence.
 * For a finite sequence this equals the arithmetic mean (exact limit-of-means
 * equals the Cesàro mean as n → ∞, approximated here by the sample mean).
 *
 * @param payoffs - Sequence of per-round payoffs.
 * @returns Average payoff, or 0 for an empty sequence.
 * @complexity O(n)
 */
export function limitOfMeans(payoffs: ReadonlyArray<number>): number {
  if (payoffs.length === 0) return 0;
  return payoffs.reduce((s, v) => s + v, 0) / payoffs.length;
}

/**
 * Find all Nash equilibria (pure and mixed) for a 2×2 general-sum game
 * using support enumeration.
 *
 * For mixed equilibria, row must be indifferent between both actions and col
 * must be indifferent between both actions simultaneously.
 *
 * @param payoffs - 2×2 payoff matrix; payoffs[i][j] = [rowPayoff, colPayoff].
 * @returns Array of Nash equilibria (pure and/or mixed).
 * @complexity O(1) — fixed 2×2 structure.
 */
export function findNashEquilibria2x2(
  payoffs: PayoffMatrix,
): ReadonlyArray<NashEquilibrium> {
  const equilibria: NashEquilibrium[] = [];

  // ── Pure Nash equilibria ──
  for (const [r, c] of findPureNashEquilibria(payoffs)) {
    equilibria.push({
      rowMixed: r === 0 ? [1, 0] : [0, 1],
      colMixed: c === 0 ? [1, 0] : [0, 1],
      type: 'pure',
    });
  }

  // ── Mixed Nash equilibrium (both players mix) ──
  // Row indifference (col's mix makes row indifferent):
  //   q·A[0][0] + (1−q)·A[0][1] = q·A[1][0] + (1−q)·A[1][1]
  //   q = (A[1][1] − A[0][1]) / (A[0][0] − A[1][0] − A[0][1] + A[1][1])
  const A = [
    [payoffs[0]![0]![0], payoffs[0]![1]![0]],
    [payoffs[1]![0]![0], payoffs[1]![1]![0]],
  ] as const;
  const B = [
    [payoffs[0]![0]![1], payoffs[0]![1]![1]],
    [payoffs[1]![0]![1], payoffs[1]![1]![1]],
  ] as const;

  const denomQ = A[0]![0]! - A[1]![0]! - A[0]![1]! + A[1]![1]!;
  const denomP = B[0]![0]! - B[0]![1]! - B[1]![0]! + B[1]![1]!;

  if (Math.abs(denomQ) > 1e-10 && Math.abs(denomP) > 1e-10) {
    const q = (A[1]![1]! - A[0]![1]!) / denomQ;
    const p = (B[1]![1]! - B[1]![0]!) / denomP;

    if (p > 1e-10 && p < 1 - 1e-10 && q > 1e-10 && q < 1 - 1e-10) {
      // Verify this isn't already captured as a pure NE
      equilibria.push({
        rowMixed: [p, 1 - p],
        colMixed: [q, 1 - q],
        type: 'mixed',
      });
    }
  }

  return equilibria;
}

// ─── §17.3  COOPERATIVE GAME THEORY ─────────────────────────────────────────

/**
 * Compute the Shapley value for every player via the permutation formula.
 * Each player's value equals their average marginal contribution across all
 * possible orderings in which they join the grand coalition.
 *
 * @param players - Array of player IDs.
 * @param charFn  - Characteristic function v(S) → value.
 * @returns Map from player ID to Shapley value.
 * @complexity O(n! × n) where n = |players|. Practical for n ≤ 8.
 */
export function computeShapleyValue(
  players: readonly number[],
  charFn: (coalition: readonly number[]) => number,
): ReadonlyMap<number, number> {
  const n = players.length;
  const shapley = new Map<number, number>();
  if (n === 0) return shapley;

  for (const p of players) shapley.set(p, 0);

  const perms = permutations(players);

  for (const perm of perms) {
    for (let i = 0; i < perm.length; i++) {
      const player = perm[i]!;
      const before = perm.slice(0, i);
      const withPlayer = perm.slice(0, i + 1);
      const marginal = charFn(withPlayer) - charFn(before);
      shapley.set(player, shapley.get(player)! + marginal / perms.length);
    }
  }

  return shapley;
}

/**
 * Check whether an imputation lies in the core of a cooperative game.
 * An imputation is in the core iff no coalition can profitably deviate:
 * ∀S ⊆ N: Σ_{i∈S} x_i ≥ v(S).
 *
 * @param players    - All player IDs.
 * @param charFn     - Characteristic function.
 * @param imputation - Proposed allocation map (player → value).
 * @returns Core membership flag and list of blocking coalitions.
 * @complexity O(2^n × n)
 */
export function checkCore(
  players: readonly number[],
  charFn: (coalition: readonly number[]) => number,
  imputation: ReadonlyMap<number, number>,
): { readonly inCore: boolean; readonly blockingCoalitions: ReadonlyArray<ReadonlyArray<number>> } {
  const blocking: number[][] = [];

  for (const subset of allSubsets(players)) {
    if (subset.length === 0) continue;
    const coalitionValue = charFn(subset);
    const imputationSum = subset.reduce((s, p) => s + (imputation.get(p) ?? 0), 0);
    if (coalitionValue > imputationSum + 1e-10) {
      blocking.push(subset);
    }
  }

  return { inCore: blocking.length === 0, blockingCoalitions: blocking };
}

/**
 * Test whether a cooperative game is superadditive:
 * v(S ∪ T) ≥ v(S) + v(T) for all disjoint S, T ⊆ N.
 *
 * @param players - All player IDs.
 * @param charFn  - Characteristic function.
 * @returns `true` iff the game is superadditive.
 * @complexity O(3^n) — iterates over all disjoint subset pairs.
 */
export function isSuperadditive(
  players: readonly number[],
  charFn: (coalition: readonly number[]) => number,
): boolean {
  const subsets = allSubsets(players);

  for (const s of subsets) {
    for (const t of subsets) {
      // Check disjointness
      const sSet = new Set(s);
      if (t.some((p) => sSet.has(p))) continue;

      if (charFn([...s, ...t]) < charFn(s) + charFn(t) - 1e-10) return false;
    }
  }

  return true;
}

/**
 * Compute the value of a coalition under MC-Nets (Marginal Contribution Nets).
 * Each rule contributes its weight to every coalition that contains its
 * pattern as a subset: v(C) = Σ_{r: C_r ⊆ C} w_r.
 *
 * @param rules     - Array of (coalition pattern, weight) rules.
 * @param coalition - Coalition to evaluate.
 * @returns Total characteristic value.
 * @complexity O(|rules| × max|pattern|)
 */
export function mcNetsValue(
  rules: ReadonlyArray<{
    readonly coalition: ReadonlyArray<number>;
    readonly value: number;
  }>,
  coalition: ReadonlyArray<number>,
): number {
  const coalSet = new Set(coalition);
  let total = 0;
  for (const rule of rules) {
    if (rule.coalition.every((p) => coalSet.has(p))) {
      total += rule.value;
    }
  }
  return total;
}

/**
 * Compute the Shapley value from MC-Nets rules in polynomial time.
 * For each rule r = (C_r, w_r), player i ∈ C_r receives marginal credit
 * φ_i(v_r) = w_r / |C_r|  (independent of total player count).
 *
 * @param rules   - MC-Nets rules (coalition pattern, weight).
 * @param players - All player IDs in the game.
 * @returns Map from player ID to Shapley value.
 * @complexity O(|rules| × max|pattern|)
 */
export function mcNetsShapley(
  rules: ReadonlyArray<{
    readonly coalition: ReadonlyArray<number>;
    readonly value: number;
  }>,
  players: readonly number[],
): ReadonlyMap<number, number> {
  const shapley = new Map<number, number>();
  for (const p of players) shapley.set(p, 0);

  for (const rule of rules) {
    const k = rule.coalition.length;
    if (k === 0) continue;
    const share = rule.value / k;
    for (const p of rule.coalition) {
      if (shapley.has(p)) {
        shapley.set(p, shapley.get(p)! + share);
      }
    }
  }

  return shapley;
}

/**
 * Find the coalition structure (partition of players) that maximises
 * social welfare by brute-force enumeration.  Practical for n ≤ 8.
 *
 * @param players - All player IDs.
 * @param charFn  - Characteristic function.
 * @returns Optimal structure and its total welfare.
 * @complexity O(Bell(n) × n)
 */
export function findOptimalCoalitionStructure(
  players: readonly number[],
  charFn: (coalition: readonly number[]) => number,
): { readonly structure: ReadonlyArray<ReadonlyArray<number>>; readonly welfare: number } {
  const structures = allCoalitionStructures(players);
  let bestWelfare = -Infinity;
  let bestStructure: ReadonlyArray<ReadonlyArray<number>> = structures[0]!;

  for (const cs of structures) {
    const w = coalitionStructureWelfare(cs, charFn);
    if (w > bestWelfare) {
      bestWelfare = w;
      bestStructure = cs;
    }
  }

  return { structure: bestStructure, welfare: bestWelfare };
}

/**
 * Compute the total welfare of a coalition structure (partition of players).
 *
 * @param structure - Array of disjoint coalitions covering all players.
 * @param charFn    - Characteristic function.
 * @returns Sum of coalition values.
 * @complexity O(|structure| × coalitionSize)
 */
export function coalitionStructureWelfare(
  structure: ReadonlyArray<ReadonlyArray<number>>,
  charFn: (coalition: readonly number[]) => number,
): number {
  return structure.reduce((sum, coalition) => sum + charFn(coalition), 0);
}

/**
 * Generate all coalition structures (set partitions) for a player set.
 *
 * @param players - Player IDs to partition.
 * @returns All possible partitions of the player set.
 * @complexity O(Bell(n)) where Bell(n) is the Bell number.
 */
export function allCoalitionStructures(
  players: readonly number[],
): ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> {
  if (players.length === 0) return [[]];

  const first = players[0]!;
  const rest = players.slice(1);
  const subStructures = allCoalitionStructures(rest);
  const result: (readonly (readonly number[])[])[] = [];

  for (const structure of subStructures) {
    // Option 1: `first` forms a new singleton coalition
    result.push([[first], ...structure]);

    // Option 2: `first` joins each existing coalition in turn
    for (let i = 0; i < structure.length; i++) {
      result.push(
        structure.map((coalition, j) =>
          j === i ? [first, ...coalition] : coalition,
        ),
      );
    }
  }

  return result;
}

// ─── §17.4  MECHANISM DESIGN ─────────────────────────────────────────────────

/**
 * Simulate an English (ascending-bid, open-cry) auction step by step.
 * At each price level any bidder whose valuation is below the price drops out.
 * The auction ends when at most one active bidder remains.
 *
 * @param valuations   - Private valuation per bidder (index = bidder ID).
 * @param reservePrice - Minimum acceptable price.
 * @param increment    - Price increment per step.
 * @returns Ordered sequence of auction steps.
 * @complexity O((maxVal / increment) × n)
 */
export function runEnglishAuction(
  valuations: ReadonlyArray<number>,
  reservePrice: number,
  increment: number,
): ReadonlyArray<EnglishAuctionStep> {
  if (valuations.length === 0)
    return [
      {
        currentPrice: reservePrice,
        activeBidders: [],
        highestBidder: null,
        action: 'No bidders — auction failed.',
      },
    ];

  const steps: EnglishAuctionStep[] = [];
  let active = valuations
    .map((v, i) => ({ v, i }))
    .filter((b) => b.v >= reservePrice)
    .map((b) => b.i);

  if (active.length === 0) {
    return [
      {
        currentPrice: reservePrice,
        activeBidders: [],
        highestBidder: null,
        action: 'No bidders meet the reserve price — auction failed.',
      },
    ];
  }

  let price = reservePrice;

  while (active.length > 1) {
    const highestBidder = active.reduce((best, i) =>
      valuations[i]! > valuations[best]! ? i : best,
    );

    steps.push({
      currentPrice: price,
      activeBidders: [...active],
      highestBidder,
      action: `Price is ${price}. ${active.length} bidders remain.`,
    });

    price += increment;

    const newActive = active.filter((i) => valuations[i]! >= price);
    const dropped = active.filter((i) => !newActive.includes(i));

    for (const d of dropped) {
      steps.push({
        currentPrice: price,
        activeBidders: newActive,
        highestBidder:
          newActive.length > 0
            ? newActive.reduce((best, i) =>
                valuations[i]! > valuations[best]! ? i : best,
              )
            : null,
        action: `Bidder ${d} (value ${valuations[d]!}) drops out at price ${price}.`,
      });
    }

    active = newActive;
  }

  const winner = active.length === 1 ? active[0]! : null;
  steps.push({
    currentPrice: price - increment,
    activeBidders: active,
    highestBidder: winner,
    action:
      winner !== null
        ? `Bidder ${winner} wins at price ${price - increment}.`
        : 'Auction ends with no winner.',
  });

  return steps;
}

/**
 * Run a Vickrey (second-price sealed-bid) auction.
 * The highest bidder wins and pays the second-highest bid.
 * Truth-telling is a dominant strategy by the revenue-equivalence theorem.
 *
 * @param valuations - Private valuation per bidder.
 * @returns Winner index, price paid, and per-bidder utilities.
 * @complexity O(n)
 */
export function runVickreyAuction(
  valuations: ReadonlyArray<number>,
): VickreyResult {
  if (valuations.length === 0)
    return { winner: -1, winnerPays: 0, utilities: [] };

  const indexed = valuations.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);

  const winner = indexed[0]!.i;
  const winnerPays =
    indexed.length > 1 ? indexed[1]!.v : 0;

  const utilities = valuations.map((v, i) =>
    i === winner ? v - winnerPays : 0,
  );

  return { winner, winnerPays, utilities };
}

/**
 * Run the VCG (Vickrey-Clarke-Groves) mechanism for allocating
 * `numGoods` identical indivisible goods under single-unit demand.
 *
 * Each winner pays a Clarke pivot tax equal to the externality they impose
 * on other agents.  For identical goods with single-unit demand this reduces
 * to: every winner pays the (k+1)-th highest bid (best excluded bid).
 *
 * @param valuations - Private valuation per bidder.
 * @param numGoods   - Number of identical goods to allocate.
 * @returns Winners, per-agent taxes, utilities, and total welfare.
 * @complexity O(n log n)
 */
export function runVCGMechanism(
  valuations: ReadonlyArray<number>,
  numGoods: number,
): VCGResult {
  if (valuations.length === 0)
    return { winners: [], taxes: [], utilities: [], globalUtility: 0 };

  const sorted = valuations
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v);

  const k = Math.min(numGoods, sorted.length);
  const winnerSet = new Set(sorted.slice(0, k).map((x) => x.i));

  // Clarke pivot tax for each winner = value of the best excluded bidder
  const bestExcludedValue = k < sorted.length ? sorted[k]!.v : 0;

  const taxes = valuations.map((_, i) =>
    winnerSet.has(i) ? bestExcludedValue : 0,
  );
  const utilities = valuations.map((v, i) =>
    winnerSet.has(i) ? v - bestExcludedValue : 0,
  );
  const globalUtility = [...winnerSet].reduce(
    (sum, i) => sum + valuations[i]!,
    0,
  );

  return {
    winners: [...winnerSet],
    taxes,
    utilities,
    globalUtility,
  };
}

/**
 * Borda count voting.
 * A voter's top choice earns (n−1) points, second choice (n−2), …, last 0.
 *
 * @param voterPreferences - voterPreferences[v][0] = v's top choice, etc.
 * @param numCandidates    - Total number of candidates.
 * @returns Score map, overall winner, and full ranking.
 * @complexity O(|voters| × numCandidates)
 */
export function bordaCount(
  voterPreferences: ReadonlyArray<ReadonlyArray<number>>,
  numCandidates: number,
): BordaResult {
  const scores = new Map<number, number>();
  for (let c = 0; c < numCandidates; c++) scores.set(c, 0);

  for (const prefs of voterPreferences) {
    for (let rank = 0; rank < prefs.length; rank++) {
      const candidate = prefs[rank]!;
      const points = numCandidates - 1 - rank;
      scores.set(candidate, (scores.get(candidate) ?? 0) + points);
    }
  }

  const ranking = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  return { scores, winner: ranking[0]!, ranking };
}

/**
 * Plurality voting: each voter casts one vote for their top-ranked candidate.
 *
 * @param voterPreferences - voterPreferences[v][0] = v's top choice.
 * @param numCandidates    - Total number of candidates.
 * @returns Per-candidate vote counts and winner.
 * @complexity O(|voters|)
 */
export function pluralityVoting(
  voterPreferences: ReadonlyArray<ReadonlyArray<number>>,
  numCandidates: number,
): PluralityResult {
  const counts = new Map<number, number>();
  for (let c = 0; c < numCandidates; c++) counts.set(c, 0);

  for (const prefs of voterPreferences) {
    if (prefs.length === 0) continue;
    const topChoice = prefs[0]!;
    counts.set(topChoice, (counts.get(topChoice) ?? 0) + 1);
  }

  let winner = 0;
  let maxVotes = -1;
  for (const [c, v] of counts) {
    if (v > maxVotes) {
      maxVotes = v;
      winner = c;
    }
  }

  return { counts, winner };
}

/**
 * Instant-runoff voting (alternative vote).
 * Iteratively eliminate the candidate with fewest first-choice votes among
 * active candidates until one candidate holds a strict majority.
 *
 * @param voterPreferences - voterPreferences[v] is voter v's full ranking.
 * @param numCandidates    - Total number of candidates.
 * @returns Round-by-round elimination history and winner.
 * @complexity O(numCandidates² × |voters|)
 */
export function instantRunoffVoting(
  voterPreferences: ReadonlyArray<ReadonlyArray<number>>,
  numCandidates: number,
): IRVResult {
  if (numCandidates === 0) return { rounds: [], winner: -1 };
  if (numCandidates === 1) {
    return {
      rounds: [
        {
          eliminated: null,
          counts: [voterPreferences.length],
          winner: 0,
        },
      ],
      winner: 0,
    };
  }

  const rounds: IRVRound[] = [];
  const eliminated = new Set<number>();
  let winner = -1;

  while (winner === -1 && eliminated.size < numCandidates) {
    // Count first-preference votes for each active candidate
    const counts = new Array<number>(numCandidates).fill(0);
    for (const prefs of voterPreferences) {
      for (const candidate of prefs) {
        if (!eliminated.has(candidate)) {
          counts[candidate]!++;
          break;
        }
      }
    }

    const activeCount = numCandidates - eliminated.size;
    const totalVotes = voterPreferences.length;
    const activeCounts = counts.map((c, i) =>
      eliminated.has(i) ? -1 : c,
    );

    // Check for majority winner or sole remaining candidate
    let found = -1;
    for (let c = 0; c < numCandidates; c++) {
      if (eliminated.has(c)) continue;
      if (activeCount === 1 || counts[c]! * 2 > totalVotes) {
        found = c;
        break;
      }
    }

    if (found !== -1) {
      winner = found;
      rounds.push({ eliminated: null, counts: activeCounts, winner });
      break;
    }

    // Eliminate candidate with fewest votes (tie-break: lowest index)
    let minVotes = Infinity;
    let toEliminate = -1;
    for (let c = 0; c < numCandidates; c++) {
      if (!eliminated.has(c) && counts[c]! < minVotes) {
        minVotes = counts[c]!;
        toEliminate = c;
      }
    }

    rounds.push({
      eliminated: toEliminate,
      counts: activeCounts,
      winner: null,
    });
    eliminated.add(toEliminate);
  }

  return { rounds, winner };
}

/**
 * Find the Condorcet winner: the candidate who beats every other candidate
 * in a head-to-head majority comparison.  Returns −1 if no winner exists.
 *
 * @param voterPreferences - Full preference rankings per voter.
 * @param numCandidates    - Total candidates.
 * @returns Condorcet winner index, or −1 if none.
 * @complexity O(numCandidates² × |voters|)
 */
export function findCondorcetWinner(
  voterPreferences: ReadonlyArray<ReadonlyArray<number>>,
  numCandidates: number,
): number {
  for (let c = 0; c < numCandidates; c++) {
    let beatsAll = true;
    for (let other = 0; other < numCandidates; other++) {
      if (other === c) continue;
      let prefCount = 0;
      for (const prefs of voterPreferences) {
        const ci = prefs.indexOf(c);
        const oi = prefs.indexOf(other);
        if (ci !== -1 && (oi === -1 || ci < oi)) prefCount++;
      }
      if (prefCount * 2 <= voterPreferences.length) {
        beatsAll = false;
        break;
      }
    }
    if (beatsAll) return c;
  }
  return -1;
}

/**
 * Return the classic Condorcet paradox: three voters whose majority
 * preferences over three alternatives form a cycle (A ≻ B ≻ C ≻ A),
 * violating transitivity even though each individual preference is transitive.
 *
 * Candidates: 0 = A, 1 = B, 2 = C.
 * - Voter 1: A > B > C
 * - Voter 2: B > C > A
 * - Voter 3: C > A > B
 * Majority: A beats B, B beats C, C beats A.
 *
 * @returns Preference profile and the majority-preference cycle.
 * @complexity O(1)
 */
export function condorcetParadox(): {
  readonly preferences: ReadonlyArray<ReadonlyArray<number>>;
  readonly cycle: readonly [number, number, number];
} {
  return {
    preferences: [
      [0, 1, 2], // Voter 1: A > B > C
      [1, 2, 0], // Voter 2: B > C > A
      [2, 0, 1], // Voter 3: C > A > B
    ],
    cycle: [0, 1, 2], // A ≻_maj B ≻_maj C ≻_maj A
  };
}

/**
 * Compute the Rubinstein alternating-offers bargaining equilibrium.
 * In the unique subgame-perfect equilibrium, agent 1 proposes immediately
 * and agent 2 accepts.
 *
 * Equilibrium shares (total pie = 1):
 *   agent1Gets = (1 − δ_B) / (1 − δ_A · δ_B)
 *   agent2Gets = δ_B · (1 − δ_A) / (1 − δ_A · δ_B)
 *
 * @param discountA - Per-round discount factor for agent 1 (0 < δ_A < 1).
 * @param discountB - Per-round discount factor for agent 2 (0 < δ_B < 1).
 * @returns Equilibrium shares and the round of agreement (always 1).
 * @complexity O(1)
 */
export function rubinsteinBargaining(
  discountA: number,
  discountB: number,
): RubinsteinResult {
  const denom = 1 - discountA * discountB;

  if (Math.abs(denom) < 1e-10) {
    // Both discount factors are ~1: limit is the Nash bargaining solution (50/50)
    return { agent1Gets: 0.5, agent2Gets: 0.5, acceptsAtRound: 1 };
  }

  const agent1Gets = (1 - discountB) / denom;
  const agent2Gets = (discountB * (1 - discountA)) / denom;

  return {
    agent1Gets: Math.max(0, Math.min(1, agent1Gets)),
    agent2Gets: Math.max(0, Math.min(1, agent2Gets)),
    acceptsAtRound: 1,
  };
}

/**
 * Compute an agent's Zeuthen risk in a bilateral negotiation.
 * Risk = probability of conflict the agent is willing to accept before
 * conceding.  An agent concedes when its risk is lower than the opponent's.
 *
 * risk = (myUtility − otherProposalUtility) / (myUtility − conflictUtility)
 *
 * @param myUtility           - Utility from the agent's own current proposal.
 * @param conflictUtility     - Utility if negotiations break down.
 * @param otherProposalUtility - Utility the agent would receive from the other's proposal.
 * @returns Risk value in [0, 1].  Returns 0 if the denominator is ≤ 0.
 * @complexity O(1)
 */
export function zeuthenRisk(
  myUtility: number,
  conflictUtility: number,
  otherProposalUtility: number,
): number {
  const denom = myUtility - conflictUtility;
  if (denom <= 1e-10) return 0;
  return Math.max(0, Math.min(1, (myUtility - otherProposalUtility) / denom));
}

/**
 * Simulate the Zeuthen monotonic-concession protocol for two agents
 * negotiating over the division of a unit surplus.
 *
 * Both agents start with their initial demands.  At each round the agent
 * with strictly lower Zeuthen risk concedes by reducing their demand so that
 * their new risk equals the opponent's current risk.  The protocol terminates
 * on agreement (demands become compatible) or conflict (both risks reach 0
 * with incompatible proposals).
 *
 * @param agent1Utility    - Agent 1's initial demand (share of surplus).
 * @param agent2Utility    - Agent 2's initial demand (share of surplus).
 * @param conflictUtility1 - Agent 1's payoff on breakdown.
 * @param conflictUtility2 - Agent 2's payoff on breakdown.
 * @returns Round-by-round negotiation trace.
 * @complexity O(rounds until convergence)
 */
export function simulateZeuthenNegotiation(
  agent1Utility: number,
  agent2Utility: number,
  conflictUtility1: number,
  conflictUtility2: number,
): ReadonlyArray<ZeuthenRound> {
  const MAX_ROUNDS = 200;
  const rounds: ZeuthenRound[] = [];

  let prop1 = agent1Utility; // what agent 1 is demanding for themselves
  let prop2 = agent2Utility; // what agent 2 is demanding for themselves

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Agent 1's utility from agent 2's proposal = 1 - prop2
    // Agent 2's utility from agent 1's proposal = 1 - prop1
    const u1from2 = 1 - prop2;
    const u2from1 = 1 - prop1;

    const risk1 = zeuthenRisk(prop1, conflictUtility1, u1from2);
    const risk2 = zeuthenRisk(prop2, conflictUtility2, u2from1);

    // Check for agreement: proposals are compatible
    if (prop1 + prop2 <= 1 + 1e-10) {
      rounds.push({
        round,
        proposal1: prop1,
        proposal2: prop2,
        risk1,
        risk2,
        conceding: null,
        status: 'agreement',
      });
      break;
    }

    // Conflict: neither agent is willing to concede further
    if (risk1 <= 1e-10 && risk2 <= 1e-10) {
      rounds.push({
        round,
        proposal1: prop1,
        proposal2: prop2,
        risk1,
        risk2,
        conceding: null,
        status: 'conflict',
      });
      break;
    }

    // Determine who concedes (lower risk concedes; agent 1 breaks ties)
    if (risk1 <= risk2 && risk1 > 1e-10) {
      // Agent 1 concedes: compute new prop1 so that new risk1 = risk2
      rounds.push({
        round,
        proposal1: prop1,
        proposal2: prop2,
        risk1,
        risk2,
        conceding: 1,
        status: 'negotiating',
      });

      const denomNew = 1 - risk2;
      if (Math.abs(denomNew) < 1e-10) {
        // risk2 = 1 means agent 2 accepts conflict as baseline; agent 1 must fully concede
        prop1 = conflictUtility1;
      } else {
        prop1 = (u1from2 - risk2 * conflictUtility1) / denomNew;
      }
    } else if (risk2 < risk1 && risk2 > 1e-10) {
      // Agent 2 concedes
      rounds.push({
        round,
        proposal1: prop1,
        proposal2: prop2,
        risk1,
        risk2,
        conceding: 2,
        status: 'negotiating',
      });

      const denomNew = 1 - risk1;
      if (Math.abs(denomNew) < 1e-10) {
        prop2 = conflictUtility2;
      } else {
        prop2 = (u2from1 - risk1 * conflictUtility2) / denomNew;
      }
    } else {
      // Both risks equal and positive but proposals incompatible — treat as conflict
      rounds.push({
        round,
        proposal1: prop1,
        proposal2: prop2,
        risk1,
        risk2,
        conceding: null,
        status: 'conflict',
      });
      break;
    }
  }

  return rounds;
}
