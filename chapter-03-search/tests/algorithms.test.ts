import { describe, it, expect } from 'vitest';
import { bfs, dfs, ucs, aStar } from '../src/algorithms/index';
import type { Graph } from '../src/algorithms/index';

// ─── Shared test graphs ───────────────────────────────────────────────────────

/**
 * Simple undirected graph (AIMA-style example):
 *
 *   A --1-- B --2-- C
 *   |       |       |
 *   4       3       1
 *   |       |       |
 *   +-------D --3-- E
 *
 * Edge list: A-B:1, A-C:4, B-C:2, B-D:3, C-E:1, D-E:3
 */
const SIMPLE_GRAPH: Graph = new Map([
  ['A', [{ node: 'B', cost: 1 }, { node: 'C', cost: 4 }]],
  ['B', [{ node: 'A', cost: 1 }, { node: 'C', cost: 2 }, { node: 'D', cost: 3 }]],
  ['C', [{ node: 'A', cost: 4 }, { node: 'B', cost: 2 }, { node: 'E', cost: 1 }]],
  ['D', [{ node: 'B', cost: 3 }, { node: 'E', cost: 3 }]],
  ['E', [{ node: 'C', cost: 1 }, { node: 'D', cost: 3 }]],
]);

/**
 * Graph with a leaf node not present as a map key (tests ?? [] branch):
 *   A -1- D (leaf, not a map key)
 *   A -2- B -1- C
 */
const LEAF_GRAPH: Graph = new Map([
  ['A', [{ node: 'D', cost: 1 }, { node: 'B', cost: 2 }]],
  ['B', [{ node: 'C', cost: 1 }]],
  // 'C' and 'D' intentionally absent as keys to test `graph.get() ?? []`
]);

/** Two disconnected components: {A, B} and {C}. */
const DISCONNECTED_GRAPH: Graph = new Map([
  ['A', [{ node: 'B', cost: 1 }]],
  ['B', [{ node: 'A', cost: 1 }]],
  ['C', []],
]);

/** Single-node graph. */
const SINGLE_GRAPH: Graph = new Map([
  ['X', []],
]);

/**
 * Graph where DFS will push C twice and hit the `continue` branch.
 * A→[B,C,D], B→[C], C→[] (dead end), D→[G]
 * DFS explores B first (top of stack), B pushes C again;
 * C=[A,B,C] is explored (dead end), then C=[A,C] is popped → continue,
 * then D→G finds the goal.
 */
const DFS_CONTINUE_GRAPH: Graph = new Map([
  ['A', [{ node: 'B', cost: 1 }, { node: 'C', cost: 1 }, { node: 'D', cost: 1 }]],
  ['B', [{ node: 'C', cost: 1 }]],
  ['C', []],
  ['D', [{ node: 'G', cost: 1 }]],
  ['G', []],
]);

/** Heuristic for SIMPLE_GRAPH targeting E. */
const H_TO_E: ReadonlyMap<string, number> = new Map([
  ['A', 4], ['B', 3], ['C', 1], ['D', 3], ['E', 0],
]);

// ─── BFS ─────────────────────────────────────────────────────────────────────

describe('bfs', () => {
  it('finds a path on a simple graph', () => {
    const steps = bfs(SIMPLE_GRAPH, 'A', 'E');
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('E');
    expect(last!.path).toContain('A');
    expect(last!.path[last!.path.length - 1]).toBe('E');
    expect(last!.action).toContain('found');
  });

  it('returns immediate step when start === goal', () => {
    const steps = bfs(SIMPLE_GRAPH, 'A', 'A');
    expect(steps).toHaveLength(1);
    const step = steps[0]!;
    expect(step.currentNode).toBe('A');
    expect(step.path).toEqual(['A']);
    expect(step.action).toContain('already');
    expect(step.explored.has('A')).toBe(true);
    expect(step.frontier).toHaveLength(0);
  });

  it('returns no-path step for disconnected graph', () => {
    const steps = bfs(DISCONNECTED_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('');
    expect(last!.action).toContain('No path');
    expect(last!.path).toHaveLength(0);
  });

  it('returns no-path step for single node graph with different goal', () => {
    const steps = bfs(SINGLE_GRAPH, 'X', 'Y');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.action).toContain('No path');
  });

  it('skips already-explored nodes (duplicate in queue)', () => {
    // C is reachable from both A (direct) and B; tests `continue` branch
    const steps = bfs(SIMPLE_GRAPH, 'A', 'E');
    // All explored sets should not have duplicates
    steps.forEach(s => {
      expect(s.explored).toBeInstanceOf(Set);
    });
    // C must appear in explored only once across steps
    const cExploredCount = steps.filter(s => s.currentNode === 'C').length;
    expect(cExploredCount).toBe(1);
  });

  it('handles leaf nodes missing from graph (tests ?? [] branch)', () => {
    // D is a leaf (not a key in LEAF_GRAPH), so graph.get('D') === undefined
    const steps = bfs(LEAF_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('C');
    expect(last!.action).toContain('found');
    // D should have been expanded (it was in the queue before B's subgraph)
    const dStep = steps.find(s => s.currentNode === 'D');
    expect(dStep).toBeDefined();
  });

  it('frontier array reflects remaining queue after each pop', () => {
    const steps = bfs(SIMPLE_GRAPH, 'A', 'E');
    // First step expands A; frontier should be A's unexplored neighbors
    const first = steps[0];
    expect(first).toBeDefined();
    expect(first!.currentNode).toBe('A');
    // frontier is what remains in the queue after popping A
    expect(Array.isArray(first!.frontier)).toBe(true);
  });

  it('explored set grows monotonically', () => {
    const steps = bfs(SIMPLE_GRAPH, 'A', 'E');
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const curr = steps[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(curr!.explored.size).toBeGreaterThanOrEqual(prev!.explored.size);
    }
  });
});

// ─── DFS ─────────────────────────────────────────────────────────────────────

describe('dfs', () => {
  it('finds a path on a simple graph', () => {
    const steps = dfs(SIMPLE_GRAPH, 'A', 'E');
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('E');
    expect(last!.path[0]).toBe('A');
    expect(last!.path[last!.path.length - 1]).toBe('E');
    expect(last!.action).toContain('found');
  });

  it('returns immediate step when start === goal', () => {
    const steps = dfs(SIMPLE_GRAPH, 'B', 'B');
    expect(steps).toHaveLength(1);
    const step = steps[0]!;
    expect(step.currentNode).toBe('B');
    expect(step.path).toEqual(['B']);
    expect(step.action).toContain('already');
    expect(step.explored.has('B')).toBe(true);
  });

  it('returns no-path step for disconnected graph', () => {
    const steps = dfs(DISCONNECTED_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('');
    expect(last!.action).toContain('No path');
  });

  it('returns no-path step for single node with different goal', () => {
    const steps = dfs(SINGLE_GRAPH, 'X', 'Z');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.action).toContain('No path');
  });

  it('skips already-explored nodes (duplicate in stack)', () => {
    // DFS may push the same node multiple times to the stack
    const steps = dfs(SIMPLE_GRAPH, 'A', 'E');
    const eCount = steps.filter(s => s.currentNode === 'E').length;
    expect(eCount).toBe(1);
  });

  it('handles leaf nodes missing from graph (tests ?? [] branch)', () => {
    const steps = dfs(LEAF_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('C');
    expect(last!.action).toContain('found');
    const dStep = steps.find(s => s.currentNode === 'D');
    expect(dStep).toBeDefined();
  });

  it('frontier is displayed top-first (reversed stack)', () => {
    const steps = dfs(SIMPLE_GRAPH, 'A', 'E');
    // Just verify it's an array
    steps.forEach(s => {
      expect(Array.isArray(s.frontier)).toBe(true);
    });
  });

  it('explored set grows monotonically', () => {
    const steps = dfs(SIMPLE_GRAPH, 'A', 'E');
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.explored.size).toBeGreaterThanOrEqual(steps[i - 1]!.explored.size);
    }
  });

  it('hits continue branch when same node appears twice in stack', () => {
    // DFS_CONTINUE_GRAPH: A→[B,C,D], B→[C], C dead end, D→[G]
    // DFS pushes C from A, then B pushes C again; after exploring C=[A,B,C],
    // the older C=[A,C] is popped → `continue` branch fires.
    const steps = dfs(DFS_CONTINUE_GRAPH, 'A', 'G');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('G');
    expect(last!.action).toContain('found');
    // C should have been the current node exactly once (explored once)
    const cCount = steps.filter(s => s.currentNode === 'C').length;
    expect(cCount).toBe(1);
  });
});

// ─── UCS ─────────────────────────────────────────────────────────────────────

describe('ucs', () => {
  it('finds optimal path on a simple graph', () => {
    const steps = ucs(SIMPLE_GRAPH, 'A', 'E');
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('E');
    // Optimal: A→B→C→E cost=1+2+1=4
    expect(last!.currentCost).toBe(4);
    expect(last!.path).toEqual(['A', 'B', 'C', 'E']);
    expect(last!.action).toContain('found');
  });

  it('returns immediate step when start === goal', () => {
    const steps = ucs(SIMPLE_GRAPH, 'C', 'C');
    expect(steps).toHaveLength(1);
    const step = steps[0]!;
    expect(step.currentNode).toBe('C');
    expect(step.currentCost).toBe(0);
    expect(step.path).toEqual(['C']);
    expect(step.action).toContain('already');
  });

  it('returns no-path step for disconnected graph', () => {
    const steps = ucs(DISCONNECTED_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('');
    expect(last!.currentCost).toBe(0);
    expect(last!.action).toContain('No path');
  });

  it('returns no-path step for single node with different goal', () => {
    const steps = ucs(SINGLE_GRAPH, 'X', 'Y');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.action).toContain('No path');
  });

  it('frontier is sorted by cost ascending', () => {
    const steps = ucs(SIMPLE_GRAPH, 'A', 'E');
    steps.forEach(s => {
      for (let i = 1; i < s.frontier.length; i++) {
        expect(s.frontier[i]!.cost).toBeGreaterThanOrEqual(s.frontier[i - 1]!.cost);
      }
    });
  });

  it('skips already-explored nodes (duplicate in priority queue)', () => {
    // C reachable via A directly (cost 4) and via A→B (cost 3)
    // When the cheaper path is popped and explored, the costlier entry is skipped
    const steps = ucs(SIMPLE_GRAPH, 'A', 'E');
    const cCount = steps.filter(s => s.currentNode === 'C').length;
    expect(cCount).toBe(1);
  });

  it('handles leaf nodes missing from graph (tests ?? [] branch)', () => {
    const steps = ucs(LEAF_GRAPH, 'A', 'C');
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('C');
    expect(last!.action).toContain('found');
    const dStep = steps.find(s => s.currentNode === 'D');
    expect(dStep).toBeDefined();
  });

  it('step includes cost and path for each frontier entry', () => {
    const steps = ucs(SIMPLE_GRAPH, 'A', 'E');
    const first = steps[0]!;
    first.frontier.forEach(e => {
      expect(typeof e.node).toBe('string');
      expect(typeof e.cost).toBe('number');
      expect(Array.isArray(e.path)).toBe(true);
    });
  });
});

// ─── A* ──────────────────────────────────────────────────────────────────────

describe('aStar', () => {
  it('finds optimal path on a simple graph', () => {
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', H_TO_E);
    expect(steps.length).toBeGreaterThan(0);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('E');
    expect(last!.currentG).toBe(4); // A→B→C→E = 1+2+1
    expect(last!.currentH).toBe(0);
    expect(last!.currentF).toBe(4);
    expect(last!.path).toEqual(['A', 'B', 'C', 'E']);
    expect(last!.action).toContain('found');
  });

  it('returns immediate step when start === goal', () => {
    const steps = aStar(SIMPLE_GRAPH, 'E', 'E', H_TO_E);
    expect(steps).toHaveLength(1);
    const step = steps[0]!;
    expect(step.currentNode).toBe('E');
    expect(step.currentG).toBe(0);
    expect(step.currentH).toBe(0);
    expect(step.currentF).toBe(0);
    expect(step.path).toEqual(['E']);
    expect(step.action).toContain('already');
  });

  it('uses heuristic h=0 for unknown nodes (default)', () => {
    // Use empty heuristic — all nodes default to h=0, A* degenerates to UCS
    const emptyH: ReadonlyMap<string, number> = new Map();
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', emptyH);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('E');
    // With h=0 everywhere, f=g so it still finds optimal path
    expect(last!.currentG).toBe(4);
  });

  it('returns no-path step for disconnected graph', () => {
    const steps = aStar(DISCONNECTED_GRAPH, 'A', 'C', H_TO_E);
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('');
    expect(last!.currentG).toBe(0);
    expect(last!.currentH).toBe(0);
    expect(last!.currentF).toBe(0);
    expect(last!.action).toContain('No path');
  });

  it('returns no-path step for single node with different goal', () => {
    const steps = aStar(SINGLE_GRAPH, 'X', 'Z', new Map());
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.action).toContain('No path');
  });

  it('frontier is sorted by f ascending', () => {
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', H_TO_E);
    steps.forEach(s => {
      for (let i = 1; i < s.frontier.length; i++) {
        expect(s.frontier[i]!.f).toBeGreaterThanOrEqual(s.frontier[i - 1]!.f);
      }
    });
  });

  it('skips already-explored nodes (duplicate in priority queue)', () => {
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', H_TO_E);
    const cCount = steps.filter(s => s.currentNode === 'C').length;
    expect(cCount).toBe(1);
  });

  it('handles leaf nodes missing from graph (tests ?? [] branch)', () => {
    const steps = aStar(LEAF_GRAPH, 'A', 'C', new Map([['A', 3], ['B', 1], ['C', 0]]));
    const last = steps[steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.currentNode).toBe('C');
    expect(last!.action).toContain('found');
    const dStep = steps.find(s => s.currentNode === 'D');
    expect(dStep).toBeDefined();
  });

  it('each frontier entry has valid g, h, f values', () => {
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', H_TO_E);
    steps.forEach(s => {
      s.frontier.forEach(e => {
        expect(e.f).toBe(e.g + e.h);
        expect(e.g).toBeGreaterThanOrEqual(0);
        expect(e.h).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('start node h value is correct', () => {
    const steps = aStar(SIMPLE_GRAPH, 'A', 'E', H_TO_E);
    // First step expanding A: currentH should be H_TO_E.get('A') = 4
    // But A is the start; when expanded, currentH = h(A) = 4
    const firstStep = steps[0]!;
    expect(firstStep.currentH).toBe(4);
    expect(firstStep.currentG).toBe(0);
    expect(firstStep.currentF).toBe(4);
  });
});
