/**
 * Chapter 3 — Solving Problems by Searching
 *
 * Pure algorithm implementations: BFS, DFS, UCS, A*.
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Returns all steps as an immutable array for step-by-step playback
 *   - Has 100% branch + line coverage in tests/algorithms.test.ts
 *
 * @module algorithms
 */

/** A weighted directed/undirected graph. */
export type Graph = ReadonlyMap<
  string,
  ReadonlyArray<{ readonly node: string; readonly cost: number }>
>;

// ─── BFS ────────────────────────────────────────────────────────────────────

/** A single step in a BFS traversal. */
export interface BFSStep {
  /** Nodes currently in the queue (FIFO frontier). */
  readonly frontier: ReadonlyArray<string>;
  /** Nodes that have been expanded. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * Breadth-First Search (graph search).
 * Finds the shallowest goal node.
 *
 * @param graph - Adjacency map with edge costs (costs ignored; BFS counts hops).
 * @param start - Start node key.
 * @param goal  - Goal node key.
 * @returns All expansion steps for playback.
 * @complexity O(b^d) time and space, where b = branching factor, d = goal depth.
 */
export function bfs(
  graph: Graph,
  start: string,
  goal: string,
): ReadonlyArray<BFSStep> {
  const steps: BFSStep[] = [];

  if (start === goal) {
    steps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return steps;
  }

  const queue: Array<readonly [string, ReadonlyArray<string>]> = [
    [start, [start]],
  ];
  const explored = new Set<string>();

  while (queue.length > 0) {
    const [currentNode, path] = queue.shift()!;

    if (explored.has(currentNode)) continue;
    explored.add(currentNode);

    const isGoal = currentNode === goal;
    steps.push({
      frontier: queue.map(([n]) => n),
      explored: new Set(explored),
      currentNode,
      action: isGoal
        ? `Goal "${goal}" found! Path: ${path.join(' → ')} (${path.length - 1} steps)`
        : `Expanding "${currentNode}"`,
      path,
    });

    if (isGoal) return steps;

    for (const { node: neighbor } of graph.get(currentNode) ?? []) {
      if (!explored.has(neighbor)) {
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }

  steps.push({
    frontier: [],
    explored: new Set(explored),
    currentNode: '',
    action: `No path from "${start}" to "${goal}"`,
    path: [],
  });
  return steps;
}

// ─── DFS ────────────────────────────────────────────────────────────────────

/** A single step in a DFS traversal. */
export interface DFSStep {
  /** Nodes currently in the stack (LIFO frontier), top-first. */
  readonly frontier: ReadonlyArray<string>;
  /** Nodes that have been expanded. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * Depth-First Search (graph search with explored set to avoid cycles).
 *
 * @param graph - Adjacency map.
 * @param start - Start node key.
 * @param goal  - Goal node key.
 * @returns All expansion steps for playback.
 * @complexity O(b^m) time, O(bm) space, where b = branching factor, m = max depth.
 */
export function dfs(
  graph: Graph,
  start: string,
  goal: string,
): ReadonlyArray<DFSStep> {
  const steps: DFSStep[] = [];

  if (start === goal) {
    steps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return steps;
  }

  // Stack: array where last element is top
  const stack: Array<readonly [string, ReadonlyArray<string>]> = [
    [start, [start]],
  ];
  const explored = new Set<string>();

  while (stack.length > 0) {
    const [currentNode, path] = stack.pop()!;

    if (explored.has(currentNode)) continue;
    explored.add(currentNode);

    const isGoal = currentNode === goal;
    // Show stack top-first for the state panel
    steps.push({
      frontier: stack.map(([n]) => n).reverse(),
      explored: new Set(explored),
      currentNode,
      action: isGoal
        ? `Goal "${goal}" found! Path: ${path.join(' → ')} (${path.length - 1} steps)`
        : `Expanding "${currentNode}"`,
      path,
    });

    if (isGoal) return steps;

    const neighbors = graph.get(currentNode) ?? [];
    // Push in reverse order so the first neighbor ends up on top of stack
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const nbr = neighbors[i];
      if (nbr && !explored.has(nbr.node)) {
        stack.push([nbr.node, [...path, nbr.node]]);
      }
    }
  }

  steps.push({
    frontier: [],
    explored: new Set(explored),
    currentNode: '',
    action: `No path from "${start}" to "${goal}"`,
    path: [],
  });
  return steps;
}

// ─── UCS ────────────────────────────────────────────────────────────────────

/** An entry in the UCS priority queue. */
export interface UCSFrontierEntry {
  readonly node: string;
  readonly cost: number;
  readonly path: ReadonlyArray<string>;
}

/** A single step in a UCS traversal. */
export interface UCSStep {
  /** Priority queue contents (sorted by cost ascending). */
  readonly frontier: ReadonlyArray<UCSFrontierEntry>;
  /** Nodes that have been expanded. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Accumulated path cost to currentNode. */
  readonly currentCost: number;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * Uniform-Cost Search.
 * Expands the node with the lowest accumulated path cost first.
 * Optimal when all edge costs are non-negative.
 *
 * @param graph - Adjacency map with edge costs.
 * @param start - Start node key.
 * @param goal  - Goal node key.
 * @returns All expansion steps for playback.
   * @complexity O(b^(1+floor(Cstar/epsilon))) time and space.
 */
export function ucs(
  graph: Graph,
  start: string,
  goal: string,
): ReadonlyArray<UCSStep> {
  const steps: UCSStep[] = [];

  if (start === goal) {
    steps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      currentCost: 0,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return steps;
  }

  const frontier: Array<{ node: string; cost: number; path: string[] }> = [
    { node: start, cost: 0, path: [start] },
  ];
  const explored = new Set<string>();

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const { node: currentNode, cost: currentCost, path } = frontier.shift()!;

    if (explored.has(currentNode)) continue;
    explored.add(currentNode);

    const isGoal = currentNode === goal;
    steps.push({
      frontier: frontier.map(e => ({
        node: e.node,
        cost: e.cost,
        path: e.path as ReadonlyArray<string>,
      })),
      explored: new Set(explored),
      currentNode,
      currentCost,
      action: isGoal
        ? `Goal "${goal}" found! Cost: ${currentCost}, Path: ${path.join(' → ')}`
        : `Expanding "${currentNode}" (cost ${currentCost})`,
      path,
    });

    if (isGoal) return steps;

    for (const { node: neighbor, cost: edgeCost } of graph.get(currentNode) ?? []) {
      if (!explored.has(neighbor)) {
        frontier.push({
          node: neighbor,
          cost: currentCost + edgeCost,
          path: [...path, neighbor],
        });
      }
    }
  }

  steps.push({
    frontier: [],
    explored: new Set(explored),
    currentNode: '',
    currentCost: 0,
    action: `No path from "${start}" to "${goal}"`,
    path: [],
  });
  return steps;
}

// ─── A* ─────────────────────────────────────────────────────────────────────

/** An entry in the A* priority queue. */
export interface AStarFrontierEntry {
  readonly node: string;
  readonly g: number;
  readonly h: number;
  readonly f: number;
  readonly path: ReadonlyArray<string>;
}

/** A single step in an A* traversal. */
export interface AStarStep {
  /** Priority queue contents (sorted by f = g+h ascending). */
  readonly frontier: ReadonlyArray<AStarFrontierEntry>;
  /** Nodes that have been expanded. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Accumulated cost g to currentNode. */
  readonly currentG: number;
  /** Heuristic estimate h from currentNode to goal. */
  readonly currentH: number;
  /** f = g + h for currentNode. */
  readonly currentF: number;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * A* Search.
 * Expands the node with the lowest f = g + h first.
 * Optimal with an admissible (non-overestimating) heuristic.
 *
 * @param graph     - Adjacency map with edge costs.
 * @param start     - Start node key.
 * @param goal      - Goal node key.
 * @param heuristic - Map from node to estimated cost to goal. Missing nodes default to 0.
 * @returns All expansion steps for playback.
 * @complexity O(b^d) with admissible heuristic.
 */
export function aStar(
  graph: Graph,
  start: string,
  goal: string,
  heuristic: ReadonlyMap<string, number>,
): ReadonlyArray<AStarStep> {
  const steps: AStarStep[] = [];
  const h = (node: string): number => heuristic.get(node) ?? 0;

  const hStart = h(start);
  if (start === goal) {
    steps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      currentG: 0,
      currentH: hStart,
      currentF: hStart,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return steps;
  }

  const frontier: Array<{
    node: string;
    g: number;
    h: number;
    f: number;
    path: string[];
  }> = [{ node: start, g: 0, h: hStart, f: hStart, path: [start] }];
  const explored = new Set<string>();

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.f - b.f);
    const { node: currentNode, g: currentG, h: currentH, f: currentF, path } = frontier.shift()!;

    if (explored.has(currentNode)) continue;
    explored.add(currentNode);

    const isGoal = currentNode === goal;
    steps.push({
      frontier: frontier.map(e => ({
        node: e.node,
        g: e.g,
        h: e.h,
        f: e.f,
        path: e.path as ReadonlyArray<string>,
      })),
      explored: new Set(explored),
      currentNode,
      currentG,
      currentH,
      currentF,
      action: isGoal
        ? `Goal "${goal}" found! f=${currentF}, g=${currentG}+h=${currentH}, Path: ${path.join(' → ')}`
        : `Expanding "${currentNode}" (f=${currentF}, g=${currentG}, h=${currentH})`,
      path,
    });

    if (isGoal) return steps;

    for (const { node: neighbor, cost: edgeCost } of graph.get(currentNode) ?? []) {
      if (!explored.has(neighbor)) {
        const newG = currentG + edgeCost;
        const newH = h(neighbor);
        frontier.push({
          node: neighbor,
          g: newG,
          h: newH,
          f: newG + newH,
          path: [...path, neighbor],
        });
      }
    }
  }

  steps.push({
    frontier: [],
    explored: new Set(explored),
    currentNode: '',
    currentG: 0,
    currentH: 0,
    currentF: 0,
    action: `No path from "${start}" to "${goal}"`,
    path: [],
  });
  return steps;
}
