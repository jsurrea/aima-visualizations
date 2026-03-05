/**
 * Chapter 6 — Adversarial Search and Games
 *
 * Pure algorithm implementations: Minimax, Alpha-Beta Pruning, MCTS.
 * Each function returns an immutable array of step records for playback.
 *
 * @module algorithms
 */

// ─── Game Tree ────────────────────────────────────────────────────────────────

/** A node in a minimax/alpha-beta game tree. Leaf nodes carry a terminal `value`. */
export interface GameNode {
  readonly id: string;
  readonly children: ReadonlyArray<GameNode>;
  readonly value?: number;
}

// ─── Minimax ──────────────────────────────────────────────────────────────────

/** One step emitted by the Minimax algorithm (post-order: children before parent). */
export interface MinimaxStep {
  readonly nodeId: string;
  readonly depth: number;
  readonly isMaximizer: boolean;
  readonly value: number;
  readonly action: string;
  /** IDs of nodes on the current recursion path (root … current node). */
  readonly activeNodeIds: ReadonlyArray<string>;
}

/**
 * Minimax game-tree search.
 * Returns all evaluation steps in post-order so the UI can replay them.
 *
 * @param root             - Root of the game tree.
 * @param maximizingPlayer - Whether the root player is the maximizer.
 * @returns Immutable array of evaluation steps.
 * @complexity O(b^d) where b = branching factor, d = depth.
 */
export function minimax(
  root: GameNode,
  maximizingPlayer: boolean,
): ReadonlyArray<MinimaxStep> {
  const steps: MinimaxStep[] = [];
  const activePath: string[] = [];

  function rec(node: GameNode, depth: number, isMax: boolean): number {
    activePath.push(node.id);

    if (node.children.length === 0) {
      const val = node.value ?? 0;
      steps.push({
        nodeId: node.id,
        depth,
        isMaximizer: isMax,
        value: val,
        action: `Leaf "${node.id}" → ${val}`,
        activeNodeIds: [...activePath],
      });
      activePath.pop();
      return val;
    }

    let best = isMax ? -Infinity : Infinity;
    for (const child of node.children) {
      const childVal = rec(child, depth + 1, !isMax);
      best = isMax ? Math.max(best, childVal) : Math.min(best, childVal);
    }

    steps.push({
      nodeId: node.id,
      depth,
      isMaximizer: isMax,
      value: best,
      action: `${isMax ? 'MAX' : 'MIN'} "${node.id}" → ${best}`,
      activeNodeIds: [...activePath],
    });
    activePath.pop();
    return best;
  }

  rec(root, 0, maximizingPlayer);
  return steps;
}

// ─── Alpha-Beta Pruning ───────────────────────────────────────────────────────

/** One step emitted by the Alpha-Beta algorithm. */
export interface AlphaBetaStep {
  readonly nodeId: string;
  readonly depth: number;
  readonly isMaximizer: boolean;
  readonly alpha: number;
  readonly beta: number;
  readonly value: number;
  /** True when this step records a cutoff (some sibling subtrees were skipped). */
  readonly pruned: boolean;
  readonly action: string;
  /** IDs of all nodes in the pruned subtrees (empty when pruned=false). */
  readonly prunedNodeIds: ReadonlyArray<string>;
}

/** Recursively collects all node IDs in a subtree (inclusive). */
function collectNodeIds(node: GameNode): string[] {
  return [node.id, ...node.children.flatMap(c => collectNodeIds(c))];
}

/**
 * Alpha-Beta Pruning — Minimax with branch elimination.
 *
 * @param root             - Root of the game tree.
 * @param alpha            - Best value the maximizer can already guarantee (pass -Infinity).
 * @param beta             - Best value the minimizer can already guarantee (pass +Infinity).
 * @param maximizingPlayer - Whether the root is the maximizer.
 * @returns Evaluation steps; pruned cutoff steps have pruned=true.
 * @complexity O(b^(d/2)) best case, O(b^d) worst case.
 */
export function alphaBeta(
  root: GameNode,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
): ReadonlyArray<AlphaBetaStep> {
  const steps: AlphaBetaStep[] = [];

  function rec(
    node: GameNode,
    depth: number,
    isMax: boolean,
    a: number,
    b: number,
  ): number {
    if (node.children.length === 0) {
      const val = node.value ?? 0;
      steps.push({
        nodeId: node.id,
        depth,
        isMaximizer: isMax,
        alpha: a,
        beta: b,
        value: val,
        pruned: false,
        action: `Leaf "${node.id}" → ${val}`,
        prunedNodeIds: [],
      });
      return val;
    }

    let value = isMax ? -Infinity : Infinity;
    let prunedIds: string[] = [];
    let didPrune = false;

    for (const [i, child] of node.children.entries()) {
      const childVal = rec(child, depth + 1, !isMax, a, b);
      if (isMax) {
        value = Math.max(value, childVal);
        a = Math.max(a, value);
      } else {
        value = Math.min(value, childVal);
        b = Math.min(b, value);
      }

      if (b <= a) {
        const remaining = node.children.slice(i + 1);
        const ids = remaining.flatMap(s => collectNodeIds(s));
        prunedIds = ids;
        didPrune = ids.length > 0;
        break;
      }
    }

    const fmt = (v: number) =>
      v === Infinity ? '+∞' : v === -Infinity ? '-∞' : String(v);

    steps.push({
      nodeId: node.id,
      depth,
      isMaximizer: isMax,
      alpha: a,
      beta: b,
      value,
      pruned: didPrune,
      action: didPrune
        ? `Prune at "${node.id}" (α=${fmt(a)}, β=${fmt(b)}): ${prunedIds.length} node(s) skipped`
        : `${isMax ? 'MAX' : 'MIN'} "${node.id}" → ${value}`,
      prunedNodeIds: prunedIds,
    });
    return value;
  }

  rec(root, 0, maximizingPlayer, alpha, beta);
  return steps;
}

// ─── Monte Carlo Tree Search ──────────────────────────────────────────────────

/** A node in the MCTS tree, carrying visit/win statistics. */
export interface MCTSNode {
  readonly id: string;
  readonly visits: number;
  readonly wins: number;
  readonly children: ReadonlyArray<MCTSNode>;
  readonly parent?: string;
}

/** The four phases of one MCTS iteration. */
export type MCTSPhase = 'selection' | 'expansion' | 'simulation' | 'backpropagation';

/** One step emitted by the MCTS algorithm. */
export interface MCTSStep {
  readonly phase: MCTSPhase;
  readonly nodeId: string;
  /** Simulation outcome: 0 (loss) or 1 (win). Meaningful for simulation/backprop. */
  readonly result: number;
  readonly action: string;
  /** Snapshot of the full MCTS tree after this step. */
  readonly tree: MCTSNode;
}

// Internal mutable working node (never exposed outside this module).
interface MutableMCTSNode {
  id: string;
  visits: number;
  wins: number;
  children: MutableMCTSNode[];
  parent?: string;
}

function cloneMutable(node: MCTSNode, parentId?: string): MutableMCTSNode {
  const m: MutableMCTSNode = {
    id: node.id,
    visits: node.visits,
    wins: node.wins,
    children: [],
  };
  const pid = parentId ?? node.parent;
  if (pid !== undefined) {
    m.parent = pid;
  }
  m.children = node.children.map(c => cloneMutable(c, node.id));
  return m;
}

function freezeNode(node: MutableMCTSNode): MCTSNode {
  const base: MCTSNode = {
    id: node.id,
    visits: node.visits,
    wins: node.wins,
    children: node.children.map(freezeNode),
  };
  return node.parent !== undefined ? { ...base, parent: node.parent } : base;
}

/**
 * UCB1 score for a node. Only called from selectLeaf when visits > 0
 * (guaranteed by the unvisited-children check in selectLeaf).
 */
function ucb1Score(node: MutableMCTSNode, parentVisits: number): number {
  return (
    node.wins / node.visits +
    Math.SQRT2 * Math.sqrt(Math.log(parentVisits) / node.visits)
  );
}

/** Traverses the tree using UCB1 until it finds a node to expand or simulate. */
function selectLeaf(node: MutableMCTSNode): MutableMCTSNode {
  if (node.children.length === 0) return node;
  const unvisited = node.children.filter(c => c.visits === 0);
  if (unvisited.length > 0) return node;
  const best = node.children.reduce((acc, cur) =>
    ucb1Score(cur, node.visits) > ucb1Score(acc, node.visits) ? cur : acc,
  );
  return selectLeaf(best);
}

/**
 * Monte Carlo Tree Search — best-first search guided by random simulations.
 *
 * @param initialTree - Starting tree (initial visit/win counts, typically all zero).
 * @param iterations  - Number of selection→expansion→simulation→backprop cycles.
 * @param rng         - RNG (default: Math.random). Pass a seeded function for reproducibility.
 * @returns All MCTS steps across every iteration.
 * @complexity O(iterations × depth).
 */
export function mcts(
  initialTree: MCTSNode,
  iterations: number,
  rng: () => number = Math.random,
): ReadonlyArray<MCTSStep> {
  if (iterations <= 0) return [];

  const steps: MCTSStep[] = [];
  const workingTree = cloneMutable(initialTree);

  const nodeMap = new Map<string, MutableMCTSNode>();
  (function buildMap(n: MutableMCTSNode): void {
    nodeMap.set(n.id, n);
    n.children.forEach(buildMap);
  })(workingTree);

  for (let i = 0; i < iterations; i++) {
    // Phase 1 — Selection
    const selected = selectLeaf(workingTree);
    steps.push({
      phase: 'selection',
      nodeId: selected.id,
      result: 0,
      action: `Select "${selected.id}" for exploration`,
      tree: freezeNode(workingTree),
    });

    // Phase 2 — Expansion (only when selected node has unvisited children)
    let rolloutNode = selected;
    if (selected.children.length > 0) {
      // selectLeaf guarantees unvisited.length > 0 here (it stops at nodes with unvisited children)
      const unvisited = selected.children.filter(c => c.visits === 0);
      const idx = Math.floor(rng() * unvisited.length);
      rolloutNode = unvisited[idx]!;
      steps.push({
        phase: 'expansion',
        nodeId: rolloutNode.id,
        result: 0,
        action: `Expand to child "${rolloutNode.id}"`,
        tree: freezeNode(workingTree),
      });
    }

    // Phase 3 — Simulation (random rollout)
    const result: 0 | 1 = rng() > 0.5 ? 1 : 0;
    steps.push({
      phase: 'simulation',
      nodeId: rolloutNode.id,
      result,
      action: `Simulate from "${rolloutNode.id}" → ${result === 1 ? 'win' : 'loss'}`,
      tree: freezeNode(workingTree),
    });

    // Phase 4 — Backpropagation
    let cur: MutableMCTSNode | undefined = rolloutNode;
    while (cur !== undefined) {
      cur.visits += 1;
      cur.wins += result;
      const pid: string | undefined = cur.parent;
      cur = pid !== undefined ? nodeMap.get(pid) : undefined;
    }
    steps.push({
      phase: 'backpropagation',
      nodeId: rolloutNode.id,
      result,
      action: `Backpropagate ${result === 1 ? 'win' : 'loss'} from "${rolloutNode.id}"`,
      tree: freezeNode(workingTree),
    });
  }

  return steps;
}

// ─── Expectiminimax ──────────────────────────────────────────────────────────

/** Node types for stochastic game trees. */
export type StochasticNodeType = 'max' | 'min' | 'chance';

/** A node in an expectiminimax game tree. Chance nodes list probability-weighted children. */
export interface StochasticNode {
  readonly id: string;
  readonly type: StochasticNodeType;
  readonly children: ReadonlyArray<{ readonly node: StochasticNode; readonly prob?: number }>;
  readonly value?: number; // only for terminal nodes
}

/** One step emitted by the Expectiminimax algorithm. */
export interface ExpectiminimaxStep {
  readonly nodeId: string;
  readonly nodeType: StochasticNodeType;
  readonly depth: number;
  readonly value: number;
  readonly action: string;
  readonly activeNodeIds: ReadonlyArray<string>;
}

/**
 * Expectiminimax — Minimax extended for stochastic (chance) nodes.
 * MAX nodes take the maximum, MIN nodes take the minimum,
 * CHANCE nodes compute the probability-weighted average of child values.
 *
 * @param root - Root of the stochastic game tree.
 * @returns Immutable array of evaluation steps in post-order.
 */
export function expectiminimax(root: StochasticNode): ReadonlyArray<ExpectiminimaxStep> {
  const steps: ExpectiminimaxStep[] = [];
  const activePath: string[] = [];

  function rec(node: StochasticNode, depth: number): number {
    activePath.push(node.id);

    if (node.children.length === 0) {
      const val = node.value ?? 0;
      steps.push({
        nodeId: node.id,
        nodeType: node.type,
        depth,
        value: val,
        action: `Leaf "${node.id}" → ${val.toFixed(2)}`,
        activeNodeIds: [...activePath],
      });
      activePath.pop();
      return val;
    }

    let best: number;
    if (node.type === 'max') {
      best = -Infinity;
      for (const { node: child } of node.children) {
        const v = rec(child, depth + 1);
        best = Math.max(best, v);
      }
    } else if (node.type === 'min') {
      best = Infinity;
      for (const { node: child } of node.children) {
        const v = rec(child, depth + 1);
        best = Math.min(best, v);
      }
    } else {
      // chance node
      best = 0;
      for (const { node: child, prob } of node.children) {
        const p = prob ?? 1 / node.children.length;
        const v = rec(child, depth + 1);
        best += p * v;
      }
    }

    const label =
      node.type === 'max'
        ? 'MAX'
        : node.type === 'min'
          ? 'MIN'
          : 'CHANCE';

    steps.push({
      nodeId: node.id,
      nodeType: node.type,
      depth,
      value: best,
      action: `${label} "${node.id}" → ${best.toFixed(2)}`,
      activeNodeIds: [...activePath],
    });
    activePath.pop();
    return best;
  }

  rec(root, 0);
  return steps;
}
