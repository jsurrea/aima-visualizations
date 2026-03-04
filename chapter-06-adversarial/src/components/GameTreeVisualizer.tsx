import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { renderDisplayMath } from '../utils/mathUtils';
import {
  minimax,
  alphaBeta,
  mcts,
  type GameNode,
  type MCTSNode,
  type MinimaxStep,
  type AlphaBetaStep,
  type MCTSStep,
} from '../algorithms';

// ─── Types ────────────────────────────────────────────────────────────────────

type Algorithm = 'minimax' | 'alphabeta' | 'mcts';

interface Position {
  x: number;
  y: number;
}

// ─── Default Trees ────────────────────────────────────────────────────────────

const GAME_TREE: GameNode = {
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

const MCTS_TREE: MCTSNode = {
  id: 'root',
  visits: 0,
  wins: 0,
  children: [
    { id: 'a', visits: 0, wins: 0, children: [], parent: 'root' },
    { id: 'b', visits: 0, wins: 0, children: [], parent: 'root' },
    { id: 'c', visits: 0, wins: 0, children: [], parent: 'root' },
  ],
};

// ─── Seeded RNG for deterministic MCTS demo ───────────────────────────────────

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function countGameLeaves(node: GameNode): number {
  return node.children.length === 0
    ? 1
    : node.children.reduce((sum, c) => sum + countGameLeaves(c), 0);
}

function layoutGameTree(
  node: GameNode,
  startX: number,
  cellW: number,
  y: number,
  levelH: number,
  out: Map<string, Position>,
): void {
  const leaves = countGameLeaves(node);
  out.set(node.id, { x: startX + (leaves * cellW) / 2, y });
  let x = startX;
  for (const child of node.children) {
    layoutGameTree(child, x, cellW, y + levelH, levelH, out);
    x += countGameLeaves(child) * cellW;
  }
}

function collectGameEdges(node: GameNode): ReadonlyArray<readonly [string, string]> {
  return [
    ...node.children.map(c => [node.id, c.id] as const),
    ...node.children.flatMap(c => collectGameEdges(c)),
  ];
}

function countMCTSLeaves(node: MCTSNode): number {
  return node.children.length === 0
    ? 1
    : node.children.reduce((sum, c) => sum + countMCTSLeaves(c), 0);
}

function layoutMCTSTree(
  node: MCTSNode,
  startX: number,
  cellW: number,
  y: number,
  levelH: number,
  out: Map<string, Position>,
): void {
  const leaves = countMCTSLeaves(node);
  out.set(node.id, { x: startX + (leaves * cellW) / 2, y });
  let x = startX;
  for (const child of node.children) {
    layoutMCTSTree(child, x, cellW, y + levelH, levelH, out);
    x += countMCTSLeaves(child) * cellW;
  }
}

function collectMCTSEdges(node: MCTSNode): ReadonlyArray<readonly [string, string]> {
  return [
    ...node.children.map(c => [node.id, c.id] as const),
    ...node.children.flatMap(c => collectMCTSEdges(c)),
  ];
}

function findMCTSNode(tree: MCTSNode, id: string): MCTSNode | undefined {
  if (tree.id === id) return tree;
  for (const c of tree.children) {
    const found = findMCTSNode(c, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtVal(v: number): string {
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '-∞';
  return String(v);
}

function isMaxAtDepth(depth: number, rootIsMax: boolean): boolean {
  return depth % 2 === 0 ? rootIsMax : !rootIsMax;
}

function collectAllGameNodes(node: GameNode): GameNode[] {
  return [node, ...node.children.flatMap(c => collectAllGameNodes(c))];
}

// ─── Prefers-reduced-motion hook ──────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}

// ─── Colour constants ─────────────────────────────────────────────────────────

const C = {
  nodeDefault: '#1e293b',
  nodeActive: '#6366f1',
  nodeEvaluated: '#10b981',
  nodePruned: '#ef4444',
  nodeInPath: '#3b82f6',
  edgeDefault: 'rgba(255,255,255,0.18)',
  edgePruned: '#ef444466',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  surface2: '#1a1a24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
} as const;

// MCTS phase colours
const MCTS_PHASE_COLOR: Record<string, string> = {
  selection: '#6366f1',
  expansion: '#f59e0b',
  simulation: '#a855f7',
  backpropagation: '#10b981',
};

// ─── Algorithm metadata ───────────────────────────────────────────────────────

const ALGO_META: Record<
  Algorithm,
  { label: string; formula: string; desc: string }
> = {
  minimax: {
    label: 'Minimax',
    formula:
      '\\text{MINIMAX}(n) = \\begin{cases} \\text{UTILITY}(n) & \\text{terminal} \\\\ \\max_c\\,\\text{MINIMAX}(c) & \\text{MAX node} \\\\ \\min_c\\,\\text{MINIMAX}(c) & \\text{MIN node} \\end{cases}',
    desc: 'Computes the optimal move for the maximising player, assuming perfect play from both sides.',
  },
  alphabeta: {
    label: 'Alpha-Beta',
    formula: '\\text{prune if }\\beta \\le \\alpha',
    desc: 'Minimax with α-β cutoffs — branches that cannot affect the decision are pruned without exploration.',
  },
  mcts: {
    label: 'MCTS',
    formula:
      '\\text{UCB1}(n) = \\frac{w_n}{v_n} + \\sqrt{2}\\,\\sqrt{\\frac{\\ln v_p}{v_n}}',
    desc: 'Monte Carlo Tree Search — selects nodes by UCB1, simulates random outcomes, then back-propagates results.',
  },
};

// ─── SVG dimensions ───────────────────────────────────────────────────────────

const GAME_SVG = { w: 340, h: 290, cellW: 80, levelH: 90, r: 22, topY: 50 };
const MCTS_SVG = { w: 400, h: 220, cellW: 120, levelH: 110, r: 28, topY: 55 };

// ─── Main component ───────────────────────────────────────────────────────────

export function GameTreeVisualizer() {
  const [algo, setAlgo] = useState<Algorithm>('minimax');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(900);

  const prefersReducedMotion = usePrefersReducedMotion();

  // Pre-compute all step arrays once
  const allSteps = useMemo(() => {
    const rng = makeRng(42);
    return {
      minimax: minimax(GAME_TREE, true),
      alphabeta: alphaBeta(GAME_TREE, -Infinity, Infinity, true),
      mcts: mcts(MCTS_TREE, 12, rng),
    };
  }, []);

  const steps = allSteps[algo];
  const maxStep = steps.length - 1;

  // Reset when algorithm changes
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [algo]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;
    if (stepIndex >= maxStep) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIndex(i => i + 1), speedMs);
    return () => clearTimeout(t);
  }, [isPlaying, stepIndex, maxStep, speedMs, prefersReducedMotion]);

  // Precomputed tree layouts (static positions)
  const gameLayout = useMemo(() => {
    const m = new Map<string, Position>();
    layoutGameTree(GAME_TREE, 10, GAME_SVG.cellW, GAME_SVG.topY, GAME_SVG.levelH, m);
    return m;
  }, []);

  const mctsLayout = useMemo(() => {
    const m = new Map<string, Position>();
    layoutMCTSTree(MCTS_TREE, 10, MCTS_SVG.cellW, MCTS_SVG.topY, MCTS_SVG.levelH, m);
    return m;
  }, []);

  const gameEdges = useMemo(() => collectGameEdges(GAME_TREE), []);
  const mctsEdges = useMemo(() => collectMCTSEdges(MCTS_TREE), []);
  const allGameNodes = useMemo(() => collectAllGameNodes(GAME_TREE), []);

  // ── Derived display state ──────────────────────────────────────────────────

  const displayIndex = prefersReducedMotion ? maxStep : stepIndex;
  const currentRaw = steps[displayIndex];

  // For Minimax
  const mmStep = algo === 'minimax' ? (currentRaw as MinimaxStep | undefined) : undefined;
  const mmEvaluated = useMemo(() => {
    if (algo !== 'minimax') return new Set<string>();
    return new Set(
      (allSteps.minimax as ReadonlyArray<MinimaxStep>)
        .slice(0, displayIndex)
        .map(s => s.nodeId),
    );
  }, [algo, displayIndex, allSteps.minimax]);

  // For Alpha-Beta
  const abStep = algo === 'alphabeta' ? (currentRaw as AlphaBetaStep | undefined) : undefined;
  const abPruned = useMemo(() => {
    if (algo !== 'alphabeta') return new Set<string>();
    return new Set(
      (allSteps.alphabeta as ReadonlyArray<AlphaBetaStep>)
        .slice(0, displayIndex + 1)
        .flatMap(s => [...s.prunedNodeIds]),
    );
  }, [algo, displayIndex, allSteps.alphabeta]);
  const abEvaluated = useMemo(() => {
    if (algo !== 'alphabeta') return new Set<string>();
    return new Set(
      (allSteps.alphabeta as ReadonlyArray<AlphaBetaStep>)
        .slice(0, displayIndex)
        .filter(s => !s.pruned)
        .map(s => s.nodeId),
    );
  }, [algo, displayIndex, allSteps.alphabeta]);

  // For MCTS
  const mctsStep = algo === 'mcts' ? (currentRaw as MCTSStep | undefined) : undefined;

  // ── Node colour helper ─────────────────────────────────────────────────────

  function gameNodeColor(nodeId: string): string {
    if (algo === 'minimax') {
      if (mmStep?.nodeId === nodeId) return C.nodeActive;
      if (mmStep?.activeNodeIds.includes(nodeId) === true) return C.nodeInPath;
      if (mmEvaluated.has(nodeId)) return C.nodeEvaluated;
      return C.nodeDefault;
    }
    if (algo === 'alphabeta') {
      if (abPruned.has(nodeId)) return C.nodePruned;
      if (abStep?.nodeId === nodeId) return C.nodeActive;
      if (abEvaluated.has(nodeId)) return C.nodeEvaluated;
      return C.nodeDefault;
    }
    return C.nodeDefault;
  }

  function mctsNodeColor(nodeId: string): string {
    if (mctsStep?.nodeId === nodeId) {
      return MCTS_PHASE_COLOR[mctsStep.phase] ?? C.nodeActive;
    }
    const node = mctsStep !== undefined ? findMCTSNode(mctsStep.tree, nodeId) : undefined;
    if (node !== undefined && node.visits > 0) return '#1e3a5f';
    return C.nodeDefault;
  }

  // ── SVG renderers ──────────────────────────────────────────────────────────

  function renderGameSVG() {
    const { w, h, r } = GAME_SVG;
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        aria-label="Game tree diagram"
        role="img"
        style={{ maxWidth: w, display: 'block', margin: '0 auto' }}
      >
        {/* Edges */}
        {gameEdges.map(([from, to]) => {
          const p = gameLayout.get(from);
          const q = gameLayout.get(to);
          if (!p || !q) return null;
          const isPruned = abPruned.has(to);
          return (
            <line
              key={`${from}-${to}`}
              x1={p.x} y1={p.y}
              x2={q.x} y2={q.y}
              stroke={isPruned ? C.edgePruned : C.edgeDefault}
              strokeWidth={isPruned ? 1 : 1.5}
              strokeDasharray={isPruned ? '4 3' : undefined}
            />
          );
        })}

        {/* Nodes */}
        {allGameNodes.map(node => {
          const pos = gameLayout.get(node.id);
          if (!pos) return null;
          const color = gameNodeColor(node.id);
          const nodeDepth = Math.round((pos.y - GAME_SVG.topY) / GAME_SVG.levelH);
          const isMax = isMaxAtDepth(nodeDepth, true);
          const isLeaf = node.children.length === 0;

          // Show computed value for evaluated nodes
          let displayVal: string | undefined;
          if (algo === 'minimax') {
            const evalStep = (allSteps.minimax as ReadonlyArray<MinimaxStep>)
              .slice(0, displayIndex + 1)
              .filter(s => s.nodeId === node.id)
              .at(-1);
            if (evalStep !== undefined) displayVal = String(evalStep.value);
          } else if (algo === 'alphabeta') {
            const evalStep = (allSteps.alphabeta as ReadonlyArray<AlphaBetaStep>)
              .slice(0, displayIndex + 1)
              .filter(s => s.nodeId === node.id)
              .at(-1);
            if (evalStep !== undefined) displayVal = String(evalStep.value);
          }

          return (
            <g key={node.id} aria-label={`Node ${node.id}`}>
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={color}
                stroke={color === C.nodeDefault ? C.border : color}
                strokeWidth={2}
              />
              {/* MAX/MIN indicator */}
              {!isLeaf && (
                <text
                  x={pos.x} y={pos.y - r - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill={C.textSecondary}
                >
                  {isMax ? '▲MAX' : '▽MIN'}
                </text>
              )}
              {/* Node ID */}
              <text
                x={pos.x} y={pos.y + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={C.textPrimary}
              >
                {node.id}
              </text>
              {/* Leaf value label */}
              {isLeaf && node.value !== undefined && (
                <text
                  x={pos.x} y={pos.y + r + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill={C.textSecondary}
                >
                  {node.value}
                </text>
              )}
              {/* Computed/returned value badge */}
              {displayVal !== undefined && !isLeaf && (
                <g>
                  <circle cx={pos.x + r - 4} cy={pos.y - r + 4} r={10} fill="#0f172a" stroke={color} strokeWidth={1.5} />
                  <text
                    x={pos.x + r - 4} y={pos.y - r + 8}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill={color}
                  >
                    {displayVal}
                  </text>
                </g>
              )}
              {/* Alpha-Beta α/β overlay on active node */}
              {algo === 'alphabeta' && abStep?.nodeId === node.id && (
                <text
                  x={pos.x} y={pos.y + r + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#f59e0b"
                >
                  α={fmtVal(abStep.alpha)} β={fmtVal(abStep.beta)}
                </text>
              )}
              {/* Pruned X mark */}
              {abPruned.has(node.id) && (
                <text
                  x={pos.x} y={pos.y + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#ef4444"
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  function renderMCTSSVG() {
    const { w, h, r } = MCTS_SVG;
    const treeSnapshot = mctsStep?.tree ?? MCTS_TREE;

    function collectNodes(n: MCTSNode): MCTSNode[] {
      return [n, ...n.children.flatMap(c => collectNodes(c))];
    }
    const nodes = collectNodes(treeSnapshot);
    const edges = collectMCTSEdges(treeSnapshot);

    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        aria-label="MCTS tree diagram"
        role="img"
        style={{ maxWidth: w, display: 'block', margin: '0 auto' }}
      >
        {edges.map(([from, to]) => {
          const p = mctsLayout.get(from);
          const q = mctsLayout.get(to);
          if (!p || !q) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              stroke={C.edgeDefault} strokeWidth={1.5}
            />
          );
        })}
        {nodes.map(node => {
          const pos = mctsLayout.get(node.id);
          if (!pos) return null;
          const color = mctsNodeColor(node.id);
          const pct =
            node.visits > 0 ? Math.round((node.wins / node.visits) * 100) : 0;
          return (
            <g key={node.id} aria-label={`Node ${node.id}: ${node.visits} visits, ${node.wins} wins`}>
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={color}
                stroke={color === C.nodeDefault ? C.border : color}
                strokeWidth={2}
              />
              <text
                x={pos.x} y={pos.y - 2}
                textAnchor="middle" fontSize="11" fontWeight="600"
                fill={C.textPrimary}
              >
                {node.id}
              </text>
              <text
                x={pos.x} y={pos.y + 13}
                textAnchor="middle" fontSize="9"
                fill={C.textSecondary}
              >
                {node.visits > 0 ? `${node.wins}/${node.visits} (${pct}%)` : '—'}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // ── State inspection panel ────────────────────────────────────────────────

  function renderStatePanel() {
    const row = (label: string, value: string) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.textSecondary, fontSize: 12 }}>{label}</span>
        <span style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
      </div>
    );

    if (algo === 'minimax' && mmStep) {
      return (
        <>
          {row('Node', mmStep.nodeId)}
          {row('Depth', String(mmStep.depth))}
          {row('Player', mmStep.isMaximizer ? '▲ MAX' : '▽ MIN')}
          {row('Value', String(mmStep.value))}
          {row('Active path', mmStep.activeNodeIds.join(' → '))}
        </>
      );
    }
    if (algo === 'alphabeta' && abStep) {
      return (
        <>
          {row('Node', abStep.nodeId)}
          {row('Depth', String(abStep.depth))}
          {row('Player', abStep.isMaximizer ? '▲ MAX' : '▽ MIN')}
          {row('α (alpha)', fmtVal(abStep.alpha))}
          {row('β (beta)', fmtVal(abStep.beta))}
          {row('Value', String(abStep.value))}
          {row('Pruned', abStep.pruned ? `Yes (${abStep.prunedNodeIds.join(', ')})` : 'No')}
        </>
      );
    }
    if (algo === 'mcts' && mctsStep) {
      const rootSnap = mctsStep.tree;
      const pct =
        rootSnap.visits > 0
          ? `${Math.round((rootSnap.wins / rootSnap.visits) * 100)}%`
          : '—';
      return (
        <>
          {row('Phase', mctsStep.phase)}
          {row('Node', mctsStep.nodeId)}
          {row('Result', mctsStep.phase === 'simulation' || mctsStep.phase === 'backpropagation' ? (mctsStep.result === 1 ? 'Win' : 'Loss') : '—')}
          {row('Root visits', String(rootSnap.visits))}
          {row('Root wins', String(rootSnap.wins))}
          {row('Root win rate', pct)}
        </>
      );
    }
    return <p style={{ color: C.textSecondary, fontSize: 12 }}>No step selected.</p>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const meta = ALGO_META[algo];
  const currentStep = steps[displayIndex];
  const actionText = currentStep !== undefined
    ? (currentStep as { action: string }).action
    : '—';

  return (
    <div style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)", color: C.textPrimary }}>
      {/* Algorithm tabs */}
      <div
        role="tablist"
        aria-label="Select algorithm"
        style={{ display: 'flex', gap: 8, marginBottom: 20 }}
      >
        {(['minimax', 'alphabeta', 'mcts'] as Algorithm[]).map(a => (
          <button
            key={a}
            role="tab"
            aria-selected={algo === a}
            onClick={() => setAlgo(a)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: `1.5px solid ${algo === a ? '#6366f1' : C.border}`,
              background: algo === a ? '#6366f120' : C.surface2,
              color: algo === a ? '#6366f1' : C.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {ALGO_META[a].label}
          </button>
        ))}
      </div>

      {/* Description + formula */}
      <div style={{ background: C.surface2, borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 10 }}>
          {meta.desc}
        </p>
        <div
          dangerouslySetInnerHTML={{ __html: renderDisplayMath(meta.formula) }}
          style={{ overflowX: 'auto' }}
        />
      </div>

      {/* Main layout: SVG + state panel */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Tree SVG */}
        <div
          style={{
            flex: '1 1 320px',
            background: C.surface2,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
          aria-label={`${meta.label} tree visualisation`}
        >
          {prefersReducedMotion && (
            <p role="status" style={{ fontSize: 11, color: C.textSecondary, marginBottom: 8 }}>
              ℹ️ Auto-play is disabled (prefers-reduced-motion). Use step controls below.
            </p>
          )}
          {algo !== 'mcts' ? renderGameSVG() : renderMCTSSVG()}
        </div>

        {/* State inspection */}
        <div
          style={{
            flex: '0 0 220px',
            background: C.surface3,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
          aria-live="polite"
          aria-label="Algorithm state inspector"
        >
          <h3 style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            State Inspector
          </h3>
          {renderStatePanel()}
          <div style={{ marginTop: 12, padding: '8px 10px', background: C.surface2, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, color: '#f59e0b', fontStyle: 'italic' }}>{actionText}</p>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div
        style={{
          background: C.surface2,
          borderRadius: 12,
          padding: '14px 18px',
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Step back to start */}
          <button
            aria-label="Reset to beginning"
            onClick={() => { setIsPlaying(false); setStepIndex(0); }}
            disabled={displayIndex === 0}
            style={btnStyle(displayIndex === 0)}
          >
            ⏮
          </button>
          {/* Step backward */}
          <button
            aria-label="Step backward"
            onClick={() => { setIsPlaying(false); setStepIndex(i => Math.max(0, i - 1)); }}
            disabled={displayIndex === 0}
            style={btnStyle(displayIndex === 0)}
          >
            ◀
          </button>
          {/* Play / Pause */}
          {!prefersReducedMotion && (
            <button
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={() => setIsPlaying(p => !p)}
              disabled={displayIndex >= maxStep}
              style={btnStyle(displayIndex >= maxStep, true)}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          )}
          {/* Step forward */}
          <button
            aria-label="Step forward"
            onClick={() => { setIsPlaying(false); setStepIndex(i => Math.min(maxStep, i + 1)); }}
            disabled={displayIndex >= maxStep}
            style={btnStyle(displayIndex >= maxStep)}
          >
            ▶
          </button>
          {/* Skip to end */}
          <button
            aria-label="Jump to end"
            onClick={() => { setIsPlaying(false); setStepIndex(maxStep); }}
            disabled={displayIndex >= maxStep}
            style={btnStyle(displayIndex >= maxStep)}
          >
            ⏭
          </button>

          {/* Step counter */}
          <span style={{ fontSize: 12, color: C.textSecondary, marginLeft: 'auto' }}>
            Step {prefersReducedMotion ? maxStep : stepIndex} / {maxStep}
          </span>
        </div>

        {/* Speed slider (hidden when prefers-reduced-motion) */}
        {!prefersReducedMotion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="speed-slider" style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
              Speed
            </label>
            <input
              id="speed-slider"
              type="range"
              min={200}
              max={2000}
              step={100}
              value={2200 - speedMs}
              onChange={e => setSpeedMs(2200 - Number(e.target.value))}
              style={{ flex: 1 }}
              aria-label={`Playback speed: ${Math.round(1000 / speedMs * 10) / 10} steps/sec`}
            />
            <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 60 }}>
              {(1000 / speedMs).toFixed(1)} step/s
            </span>
          </div>
        )}
      </div>

      {/* Colour legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, fontSize: 11, color: C.textSecondary }}>
        {algo !== 'mcts' ? (
          <>
            {legend(C.nodeActive, 'Current node')}
            {legend(C.nodeInPath, 'Active path')}
            {legend(C.nodeEvaluated, 'Evaluated')}
            {algo === 'alphabeta' && legend(C.nodePruned, 'Pruned')}
          </>
        ) : (
          <>
            {legend(MCTS_PHASE_COLOR['selection'] ?? C.nodeActive, 'Selection')}
            {legend(MCTS_PHASE_COLOR['expansion'] ?? C.nodeActive, 'Expansion')}
            {legend(MCTS_PHASE_COLOR['simulation'] ?? C.nodeActive, 'Simulation')}
            {legend(MCTS_PHASE_COLOR['backpropagation'] ?? C.nodeActive, 'Backpropagation')}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function btnStyle(disabled: boolean, primary = false): CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : primary ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
    background: disabled ? '#0f172a' : primary ? '#6366f118' : '#1e293b',
    color: disabled ? '#475569' : primary ? '#6366f1' : '#e2e8f0',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s',
  };
}

function legend(color: string, label: string) {
  return (
    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
