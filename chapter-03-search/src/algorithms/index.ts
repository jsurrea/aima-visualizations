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
   * @complexity O(b^(1+floor(C_star/epsilon))) where C_star = optimal cost, epsilon = min edge cost.
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

// ─── Greedy Best-First Search ────────────────────────────────────────────────

/** An entry in the GBFS priority queue. */
export interface GBFSFrontierEntry {
  readonly node: string;
  readonly h: number;
  readonly path: ReadonlyArray<string>;
}

/** A single step in a Greedy Best-First Search traversal. */
export interface GBFSStep {
  /** Priority queue sorted by h ascending. */
  readonly frontier: ReadonlyArray<GBFSFrontierEntry>;
  /** Nodes that have been expanded. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Heuristic value h of currentNode. */
  readonly currentH: number;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * Greedy Best-First Search.
 * Expands the node with the lowest heuristic value h(n) first.
 * Not guaranteed to be optimal.
 *
 * @param graph     - Adjacency map with edge costs (costs ignored; only h used for ordering).
 * @param start     - Start node key.
 * @param goal      - Goal node key.
 * @param heuristic - Map from node to estimated cost to goal. Missing nodes default to 0.
 * @returns All expansion steps for playback.
 */
export function greedyBestFirst(
  graph: Graph,
  start: string,
  goal: string,
  heuristic: ReadonlyMap<string, number>,
): ReadonlyArray<GBFSStep> {
  const steps: GBFSStep[] = [];
  const h = (node: string): number => heuristic.get(node) ?? 0;

  const hStart = h(start);
  if (start === goal) {
    steps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      currentH: hStart,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return steps;
  }

  const frontier: Array<{ node: string; h: number; path: string[] }> = [
    { node: start, h: hStart, path: [start] },
  ];
  const explored = new Set<string>();

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.h - b.h);
    const { node: currentNode, h: currentH, path } = frontier.shift()!;

    if (explored.has(currentNode)) continue;
    explored.add(currentNode);

    const isGoal = currentNode === goal;
    steps.push({
      frontier: frontier.map(e => ({
        node: e.node,
        h: e.h,
        path: e.path as ReadonlyArray<string>,
      })),
      explored: new Set(explored),
      currentNode,
      currentH,
      action: isGoal
        ? `Goal "${goal}" found! Path: ${path.join(' → ')}`
        : `Expanding "${currentNode}" (h=${currentH})`,
      path,
    });

    if (isGoal) return steps;

    for (const { node: neighbor } of graph.get(currentNode) ?? []) {
      if (!explored.has(neighbor)) {
        frontier.push({ node: neighbor, h: h(neighbor), path: [...path, neighbor] });
      }
    }
  }

  steps.push({
    frontier: [],
    explored: new Set(explored),
    currentNode: '',
    currentH: 0,
    action: `No path from "${start}" to "${goal}"`,
    path: [],
  });
  return steps;
}

// ─── Iterative Deepening DFS ─────────────────────────────────────────────────

/** A single step in an IDDFS traversal. */
export interface IDDFSStep {
  /** Nodes currently in the stack (LIFO), top-first. */
  readonly frontier: ReadonlyArray<string>;
  /** Nodes expanded in the current iteration. */
  readonly explored: ReadonlySet<string>;
  /** Node currently being expanded. */
  readonly currentNode: string;
  /** Depth of currentNode from start. */
  readonly currentDepth: number;
  /** Current depth limit for this iteration. */
  readonly depthLimit: number;
  /** Iteration number (0-based, equals the depth limit used). */
  readonly iteration: number;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Path from start to currentNode. */
  readonly path: ReadonlyArray<string>;
}

/**
 * Iterative Deepening Depth-First Search.
 * Runs depth-limited DFS from depth 0 up to maxDepth, stopping when the goal is found.
 * Combines BFS's optimality (in unweighted graphs) with DFS's space efficiency.
 *
 * @param graph    - Adjacency map.
 * @param start    - Start node key.
 * @param goal     - Goal node key.
 * @param maxDepth - Maximum depth limit to try (default 10).
 * @returns All expansion steps across all iterations for playback.
 * @complexity O(b^d) time, O(bd) space.
 */
export function iddfs(
  graph: Graph,
  start: string,
  goal: string,
  maxDepth = 10,
): ReadonlyArray<IDDFSStep> {
  const allSteps: IDDFSStep[] = [];

  if (start === goal) {
    allSteps.push({
      frontier: [],
      explored: new Set<string>([start]),
      currentNode: start,
      currentDepth: 0,
      depthLimit: 0,
      iteration: 0,
      action: `"${start}" is already the goal!`,
      path: [start],
    });
    return allSteps;
  }

  for (let limit = 0; limit <= maxDepth; limit++) {
    const stack: Array<{ node: string; path: string[]; depth: number }> = [
      { node: start, path: [start], depth: 0 },
    ];
    const explored = new Set<string>();

    while (stack.length > 0) {
      const entry = stack.pop()!;
      const { node: currentNode, path, depth } = entry;

      if (explored.has(currentNode)) continue;
      explored.add(currentNode);

      const isGoal = currentNode === goal;
      allSteps.push({
        frontier: stack.map(e => e.node).reverse(),
        explored: new Set(explored),
        currentNode,
        currentDepth: depth,
        depthLimit: limit,
        iteration: limit,
        action: isGoal
          ? `Goal "${goal}" found! Depth: ${depth}, Path: ${path.join(' → ')}`
          : `[Iter ${limit}] Expanding "${currentNode}" (depth=${depth}/${limit})`,
        path,
      });

      if (isGoal) return allSteps;

      if (depth < limit) {
        const neighbors = graph.get(currentNode) ?? [];
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const nbr = neighbors[i];
          if (nbr && !explored.has(nbr.node)) {
            stack.push({ node: nbr.node, path: [...path, nbr.node], depth: depth + 1 });
          }
        }
      }
    }
  }

  allSteps.push({
    frontier: [],
    explored: new Set<string>(),
    currentNode: '',
    currentDepth: 0,
    depthLimit: maxDepth,
    iteration: maxDepth,
    action: `No path from "${start}" to "${goal}" within depth ${maxDepth}`,
    path: [],
  });
  return allSteps;
}
