import { describe, it, expect } from 'vitest';
import {
  minimax,
  alphaBeta,
  mcts,
  type GameNode,
  type MCTSNode,
} from '../src/algorithms/index';

// ─── Minimax ──────────────────────────────────────────────────────────────────

describe('minimax', () => {
  it('returns correct value for a leaf node with a defined value', () => {
    const tree: GameNode = { id: 'root', children: [], value: 7 };
    const steps = minimax(tree, true);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.value).toBe(7);
    expect(steps[0]?.nodeId).toBe('root');
    expect(steps[0]?.depth).toBe(0);
    expect(steps[0]?.isMaximizer).toBe(true);
  });

  it('returns 0 for a leaf node with undefined value', () => {
    const tree: GameNode = { id: 'leaf', children: [] };
    const steps = minimax(tree, false);
    expect(steps[0]?.value).toBe(0);
    expect(steps[0]?.isMaximizer).toBe(false);
  });

  it('maximizer picks the highest child value', () => {
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 3 },
        { id: 'b', children: [], value: 5 },
      ],
    };
    const steps = minimax(tree, true);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.value).toBe(5);
    expect(rootStep?.isMaximizer).toBe(true);
  });

  it('minimizer picks the lowest child value', () => {
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 3 },
        { id: 'b', children: [], value: 5 },
      ],
    };
    const steps = minimax(tree, false);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.value).toBe(3);
    expect(rootStep?.isMaximizer).toBe(false);
  });

  it('3-level tree: MAX→MIN→leaves produces correct result', () => {
    // A=MAX, B=MIN, C=MIN; leaves D=3,E=5,F=2,G=9
    // B=min(3,5)=3, C=min(2,9)=2, A=max(3,2)=3
    const tree: GameNode = {
      id: 'A',
      children: [
        {
          id: 'B',
          children: [
            { id: 'D', children: [], value: 3 },
            { id: 'E', children: [], value: 5 },
          ],
        },
        {
          id: 'C',
          children: [
            { id: 'F', children: [], value: 2 },
            { id: 'G', children: [], value: 9 },
          ],
        },
      ],
    };
    const steps = minimax(tree, true);
    expect(steps.find(s => s.nodeId === 'A')?.value).toBe(3);
    expect(steps.find(s => s.nodeId === 'B')?.value).toBe(3);
    expect(steps.find(s => s.nodeId === 'C')?.value).toBe(2);
  });

  it('activeNodeIds shows the recursion path', () => {
    const tree: GameNode = {
      id: 'root',
      children: [{ id: 'child', children: [], value: 1 }],
    };
    const steps = minimax(tree, true);
    const leafStep = steps.find(s => s.nodeId === 'child');
    expect(leafStep?.activeNodeIds).toEqual(['root', 'child']);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.activeNodeIds).toEqual(['root']);
  });

  it('produces steps in post-order (children before parent)', () => {
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'left', children: [], value: 1 },
        { id: 'right', children: [], value: 2 },
      ],
    };
    const steps = minimax(tree, true);
    const ids = steps.map(s => s.nodeId);
    expect(ids.indexOf('left')).toBeLessThan(ids.indexOf('root'));
    expect(ids.indexOf('right')).toBeLessThan(ids.indexOf('root'));
  });
});

// ─── Alpha-Beta Pruning ───────────────────────────────────────────────────────

describe('alphaBeta', () => {
  it('returns correct value for a leaf node with a defined value', () => {
    const tree: GameNode = { id: 'leaf', children: [], value: 42 };
    const steps = alphaBeta(tree, -Infinity, Infinity, true);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.value).toBe(42);
    expect(steps[0]?.pruned).toBe(false);
    expect(steps[0]?.prunedNodeIds).toHaveLength(0);
  });

  it('returns 0 for a leaf node with undefined value', () => {
    const tree: GameNode = { id: 'leaf', children: [] };
    const steps = alphaBeta(tree, -Infinity, Infinity, false);
    expect(steps[0]?.value).toBe(0);
    expect(steps[0]?.isMaximizer).toBe(false);
  });

  it('3-level tree matches the minimax result', () => {
    const tree: GameNode = {
      id: 'A',
      children: [
        {
          id: 'B',
          children: [
            { id: 'D', children: [], value: 3 },
            { id: 'E', children: [], value: 5 },
          ],
        },
        {
          id: 'C',
          children: [
            { id: 'F', children: [], value: 2 },
            { id: 'G', children: [], value: 9 },
          ],
        },
      ],
    };
    const abRoot = alphaBeta(tree, -Infinity, Infinity, true).find(s => s.nodeId === 'A');
    const mmRoot = minimax(tree, true).find(s => s.nodeId === 'A');
    expect(abRoot?.value).toBe(mmRoot?.value);
  });

  it('prunes node G in the standard 4-leaf example', () => {
    // A(max)→[B(min)→[D=3, E=5], C(min)→[F=2, G=9]]
    // After B=3, α=3. C evaluates F=2 → β=2 ≤ α=3 → G is pruned.
    const tree: GameNode = {
      id: 'A',
      children: [
        {
          id: 'B',
          children: [
            { id: 'D', children: [], value: 3 },
            { id: 'E', children: [], value: 5 },
          ],
        },
        {
          id: 'C',
          children: [
            { id: 'F', children: [], value: 2 },
            { id: 'G', children: [], value: 9 },
          ],
        },
      ],
    };
    const steps = alphaBeta(tree, -Infinity, Infinity, true);
    const prunedSteps = steps.filter(s => s.pruned);
    expect(prunedSteps.length).toBeGreaterThan(0);
    const gIsPruned = prunedSteps.some(s => s.prunedNodeIds.includes('G'));
    expect(gIsPruned).toBe(true);
    // G itself should not produce its own step (it was pruned)
    expect(steps.find(s => s.nodeId === 'G')).toBeUndefined();
  });

  it('does not prune when beta≤alpha but there are no remaining siblings', () => {
    // root(min) with 2 children, initial alpha=4 → prune fires on last child
    // but remaining = [] so didPrune stays false
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 5 },
        { id: 'b', children: [], value: 3 },
      ],
    };
    // alpha=4, beta=+∞; minimizer
    // After a=5: b_local = min(∞,5)=5, no prune (5>4)
    // After b=3: b_local = min(5,3)=3, 3 ≤ 4 → prune fires, but no siblings remain
    const steps = alphaBeta(tree, 4, Infinity, false);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.pruned).toBe(false);
    expect(rootStep?.value).toBe(3);
  });

  it('handles a single-child tree (no pruning possible)', () => {
    const tree: GameNode = {
      id: 'root',
      children: [{ id: 'child', children: [], value: 5 }],
    };
    const steps = alphaBeta(tree, -Infinity, Infinity, true);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.value).toBe(5);
    expect(rootStep?.pruned).toBe(false);
  });

  it('handles all-equal leaf values (no pruning expected for maximizer root)', () => {
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 4 },
        { id: 'b', children: [], value: 4 },
      ],
    };
    const steps = alphaBeta(tree, -Infinity, Infinity, true);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.value).toBe(4);
    // With equal values, β=4 is not ≤ α=4 for the first child check
    // (α becomes 4 after first child, β=∞ stays > α=4 → no prune)
    expect(rootStep?.pruned).toBe(false);
  });

  it('fmt branch: prune action includes "+∞" when alpha is +Infinity', () => {
    // Passing alpha=+Inf and beta=+Inf to a MAX root means prune fires on first child
    // (beta=+Inf ≤ alpha=+Inf after first child sets alpha=+Inf via value=+Inf)
    // Use alpha=+Inf so pruning fires immediately: beta(+Inf) <= alpha(+Inf)
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 1 },
        { id: 'b', children: [], value: 2 },
      ],
    };
    const steps = alphaBeta(tree, Infinity, Infinity, true);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.pruned).toBe(true);
    expect(rootStep?.action).toContain('+∞');
  });

  it('fmt branch: prune action includes "-∞" when beta is -Infinity', () => {
    // Passing beta=-Inf to a MAX root: after first child, beta=-Inf <= alpha → prune
    const tree: GameNode = {
      id: 'root',
      children: [
        { id: 'a', children: [], value: 1 },
        { id: 'b', children: [], value: 2 },
      ],
    };
    const steps = alphaBeta(tree, -Infinity, -Infinity, true);
    const rootStep = steps.find(s => s.nodeId === 'root');
    expect(rootStep?.pruned).toBe(true);
    expect(rootStep?.action).toContain('-∞');
  });

  it('prunedNodeIds includes all nodes in pruned subtrees', () => {
    // root(max)→[A(min)→[B(max)→[3,4], C(max)→[1,2]], D(min)→[...]]
    // If A returns low value and D would be pruned...
    // Simpler: use tree where first branch gives very high value to guarantee prune
    const tree: GameNode = {
      id: 'root',
      children: [
        {
          id: 'A',
          children: [
            { id: 'B', children: [], value: 10 },
          ],
        },
        {
          id: 'D',
          children: [
            { id: 'E', children: [], value: 1 },
            { id: 'F', children: [], value: 2 },
          ],
        },
      ],
    };
    // root(max), A(min)→B=10, so A=10, α=10
    // D(min): first child E=1 → β=1 ≤ α=10 → F pruned
    const steps = alphaBeta(tree, -Infinity, Infinity, true);
    const dStep = steps.find(s => s.nodeId === 'D');
    expect(dStep?.pruned).toBe(true);
    expect(dStep?.prunedNodeIds).toContain('F');
  });
});

// ─── MCTS ─────────────────────────────────────────────────────────────────────

describe('mcts', () => {
  it('returns an empty array for 0 iterations', () => {
    const tree: MCTSNode = { id: 'root', visits: 0, wins: 0, children: [] };
    expect(mcts(tree, 0)).toHaveLength(0);
    expect(mcts(tree, -1)).toHaveLength(0);
  });

  it('emits exactly one backpropagation step per iteration', () => {
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'b', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const steps = mcts(tree, 5, () => 0.7);
    const bpSteps = steps.filter(s => s.phase === 'backpropagation');
    expect(bpSteps).toHaveLength(5);
  });

  it('expansion phase appears for the first unvisited children', () => {
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'b', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const steps = mcts(tree, 3, () => 0.7);
    const expansionSteps = steps.filter(s => s.phase === 'expansion');
    expect(expansionSteps.length).toBeGreaterThan(0);
  });

  it('simulation result is 0 when rng() ≤ 0.5', () => {
    const tree: MCTSNode = { id: 'root', visits: 0, wins: 0, children: [] };
    const steps = mcts(tree, 1, () => 0.3);
    const simStep = steps.find(s => s.phase === 'simulation');
    expect(simStep?.result).toBe(0);
  });

  it('simulation result is 1 when rng() > 0.5', () => {
    const tree: MCTSNode = { id: 'root', visits: 0, wins: 0, children: [] };
    const steps = mcts(tree, 1, () => 0.9);
    const simStep = steps.find(s => s.phase === 'simulation');
    expect(simStep?.result).toBe(1);
  });

  it('leaf root skips the expansion phase entirely', () => {
    // Root has no children → selectLeaf returns root immediately → no expansion
    const tree: MCTSNode = { id: 'root', visits: 0, wins: 0, children: [] };
    const steps = mcts(tree, 2, () => 0.3);
    const expansionSteps = steps.filter(s => s.phase === 'expansion');
    expect(expansionSteps).toHaveLength(0);
    // 3 steps per iteration (selection, simulation, backprop)
    expect(steps).toHaveLength(6);
  });

  it('uses UCB1 after all immediate children are visited', () => {
    // First 2 iterations expand a and b; iterations 3+ use UCB1 and select leaf directly
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'b', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const steps = mcts(tree, 4, () => 0.3);
    // After 2 expansions, iterations 3 and 4 select a leaf via UCB1
    const selectionSteps = steps.filter(s => s.phase === 'selection');
    expect(selectionSteps).toHaveLength(4);
    // At least one selection should target a leaf (not root)
    const leafSelections = selectionSteps.filter(s => s.nodeId !== 'root');
    expect(leafSelections.length).toBeGreaterThan(0);
  });

  it('is fully deterministic when given a seeded rng', () => {
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'x', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'y', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const rng = () => 0.6;
    const steps1 = mcts(tree, 5, rng);
    const steps2 = mcts(tree, 5, rng);
    expect(steps1.map(s => s.phase)).toEqual(steps2.map(s => s.phase));
    expect(steps1.map(s => s.nodeId)).toEqual(steps2.map(s => s.nodeId));
    expect(steps1.map(s => s.result)).toEqual(steps2.map(s => s.result));
  });

  it('tree snapshots in steps reflect updated visit counts', () => {
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const steps = mcts(tree, 2, () => 0.7);
    // After first backprop, the snapshot should show visits > 0
    const lastBP = steps.filter(s => s.phase === 'backpropagation').pop();
    expect(lastBP?.tree.visits).toBeGreaterThan(0);
  });

  it('all four MCTS phases appear given sufficient iterations', () => {
    const tree: MCTSNode = {
      id: 'root',
      visits: 0,
      wins: 0,
      children: [
        { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'b', visits: 0, wins: 0, children: [], parent: 'root' },
        { id: 'c', visits: 0, wins: 0, children: [], parent: 'root' },
      ],
    };
    const steps = mcts(tree, 6, () => 0.7);
    const phases = new Set(steps.map(s => s.phase));
    expect(phases.has('selection')).toBe(true);
    expect(phases.has('expansion')).toBe(true);
    expect(phases.has('simulation')).toBe(true);
    expect(phases.has('backpropagation')).toBe(true);
  });
});
