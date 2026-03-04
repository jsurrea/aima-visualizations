import { useState, useEffect, useMemo, useRef } from 'react';
import 'katex/dist/katex.min.css';
import {
  bfs, dfs, ucs, aStar,
  type BFSStep, type DFSStep, type UCSStep, type AStarStep,
  type Graph,
} from '../algorithms/index';

// ─── Romania map data ─────────────────────────────────────────────────────────

interface NodeData {
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

const NODES: Readonly<Record<string, NodeData>> = {
  'Arad':           { x: 60,  y: 215, label: 'Arad' },
  'Zerind':         { x: 80,  y: 140, label: 'Zerind' },
  'Oradea':         { x: 125, y: 70,  label: 'Oradea' },
  'Timisoara':      { x: 90,  y: 325, label: 'Timisoara' },
  'Lugoj':          { x: 200, y: 360, label: 'Lugoj' },
  'Mehadia':        { x: 220, y: 420, label: 'Mehadia' },
  'Dobreta':        { x: 215, y: 470, label: 'Dobreta' },
  'Craiova':        { x: 315, y: 470, label: 'Craiova' },
  'Rimnicu Vilcea': { x: 345, y: 350, label: 'R.Vilcea' },
  'Sibiu':          { x: 300, y: 260, label: 'Sibiu' },
  'Fagaras':        { x: 420, y: 255, label: 'Fagaras' },
  'Pitesti':        { x: 445, y: 395, label: 'Pitesti' },
  'Bucharest':      { x: 555, y: 395, label: 'Bucharest' },
  'Giurgiu':        { x: 525, y: 470, label: 'Giurgiu' },
  'Urziceni':       { x: 640, y: 365, label: 'Urziceni' },
  'Hirsova':        { x: 730, y: 295, label: 'Hirsova' },
  'Eforie':         { x: 775, y: 380, label: 'Eforie' },
  'Vaslui':         { x: 720, y: 215, label: 'Vaslui' },
  'Iasi':           { x: 725, y: 140, label: 'Iasi' },
  'Neamt':          { x: 650, y: 90,  label: 'Neamt' },
};

interface EdgeData {
  readonly from: string;
  readonly to: string;
  readonly cost: number;
}

const EDGES: ReadonlyArray<EdgeData> = [
  { from: 'Arad',          to: 'Zerind',         cost: 75  },
  { from: 'Arad',          to: 'Sibiu',           cost: 140 },
  { from: 'Arad',          to: 'Timisoara',       cost: 118 },
  { from: 'Zerind',        to: 'Oradea',          cost: 71  },
  { from: 'Oradea',        to: 'Sibiu',           cost: 151 },
  { from: 'Sibiu',         to: 'Fagaras',         cost: 99  },
  { from: 'Sibiu',         to: 'Rimnicu Vilcea',  cost: 80  },
  { from: 'Timisoara',     to: 'Lugoj',           cost: 111 },
  { from: 'Lugoj',         to: 'Mehadia',         cost: 70  },
  { from: 'Mehadia',       to: 'Dobreta',         cost: 75  },
  { from: 'Dobreta',       to: 'Craiova',         cost: 120 },
  { from: 'Craiova',       to: 'Rimnicu Vilcea',  cost: 146 },
  { from: 'Craiova',       to: 'Pitesti',         cost: 138 },
  { from: 'Rimnicu Vilcea',to: 'Pitesti',         cost: 97  },
  { from: 'Fagaras',       to: 'Bucharest',       cost: 211 },
  { from: 'Pitesti',       to: 'Bucharest',       cost: 101 },
  { from: 'Bucharest',     to: 'Giurgiu',         cost: 90  },
  { from: 'Bucharest',     to: 'Urziceni',        cost: 85  },
  { from: 'Urziceni',      to: 'Hirsova',         cost: 98  },
  { from: 'Urziceni',      to: 'Vaslui',          cost: 142 },
  { from: 'Hirsova',       to: 'Eforie',          cost: 86  },
  { from: 'Vaslui',        to: 'Iasi',            cost: 92  },
  { from: 'Iasi',          to: 'Neamt',           cost: 87  },
];

// Build bidirectional graph
function buildGraph(): Graph {
  const map = new Map<string, Array<{ node: string; cost: number }>>();
  for (const nodeId of Object.keys(NODES)) {
    map.set(nodeId, []);
  }
  for (const edge of EDGES) {
    map.get(edge.from)!.push({ node: edge.to, cost: edge.cost });
    map.get(edge.to)!.push({ node: edge.from, cost: edge.cost });
  }
  return map;
}

const ROMANIA_GRAPH: Graph = buildGraph();

const SLD_TO_BUCHAREST: ReadonlyMap<string, number> = new Map([
  ['Arad', 366], ['Bucharest', 0], ['Craiova', 160], ['Dobreta', 242],
  ['Eforie', 161], ['Fagaras', 176], ['Giurgiu', 77], ['Hirsova', 151],
  ['Iasi', 226], ['Lugoj', 244], ['Mehadia', 241], ['Neamt', 234],
  ['Oradea', 380], ['Pitesti', 100], ['Rimnicu Vilcea', 193], ['Sibiu', 253],
  ['Timisoara', 329], ['Urziceni', 80], ['Vaslui', 199], ['Zerind', 374],
]);

const NODE_IDS = Object.keys(NODES).sort();

// ─── Algorithm types ──────────────────────────────────────────────────────────

type AlgorithmType = 'bfs' | 'dfs' | 'ucs' | 'astar';
type AnyStep = BFSStep | DFSStep | UCSStep | AStarStep;

function computeSteps(
  algo: AlgorithmType,
  start: string,
  goal: string,
): ReadonlyArray<AnyStep> {
  switch (algo) {
    case 'bfs':   return bfs(ROMANIA_GRAPH, start, goal);
    case 'dfs':   return dfs(ROMANIA_GRAPH, start, goal);
    case 'ucs':   return ucs(ROMANIA_GRAPH, start, goal);
    case 'astar': return aStar(ROMANIA_GRAPH, start, goal, SLD_TO_BUCHAREST);
  }
}

function getFrontierNodeIds(step: AnyStep, algo: AlgorithmType): ReadonlyArray<string> {
  if (algo === 'bfs' || algo === 'dfs') {
    return (step as BFSStep).frontier;
  }
  if (algo === 'ucs') {
    return (step as UCSStep).frontier.map(e => e.node);
  }
  return (step as AStarStep).frontier.map(e => e.node);
}

type NodeStatus = 'current' | 'path' | 'explored' | 'frontier' | 'unvisited';

function getNodeStatus(
  nodeId: string,
  step: AnyStep,
  algo: AlgorithmType,
): NodeStatus {
  if (nodeId === step.currentNode) return 'current';
  if (step.path.includes(nodeId)) return 'path';
  if (step.explored.has(nodeId)) return 'explored';
  if (getFrontierNodeIds(step, algo).includes(nodeId)) return 'frontier';
  return 'unvisited';
}

const STATUS_COLORS: Readonly<Record<NodeStatus, { fill: string; stroke: string; text: string }>> = {
  current:   { fill: '#064E3B', stroke: '#10B981', text: '#6EE7B7' },
  path:      { fill: '#78350F', stroke: '#F59E0B', text: '#FDE68A' },
  explored:  { fill: '#1E1B4B', stroke: '#6366F1', text: '#A5B4FC' },
  frontier:  { fill: '#451A03', stroke: '#D97706', text: '#FCD34D' },
  unvisited: { fill: '#1F2937', stroke: '#4B5563', text: '#9CA3AF' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchVisualizer(): JSX.Element {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('bfs');
  const [startNode, setStartNode] = useState('Arad');
  const [goalNode, setGoalNode] = useState('Bucharest');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const steps = useMemo(
    () => computeSteps(algorithm, startNode, goalNode),
    [algorithm, startNode, goalNode],
  );

  // Reset when inputs change
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [algorithm, startNode, goalNode]);

  // Animation timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;
    timerRef.current = setTimeout(() => {
      setStepIndex(i => {
        if (i >= steps.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, speed);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [isPlaying, stepIndex, speed, steps.length, prefersReducedMotion]);

  const currentStep: AnyStep | undefined = steps[stepIndex];
  const totalSteps = steps.length;

  const handleReset = () => {
    setStepIndex(0);
    setIsPlaying(false);
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    setStepIndex(i => Math.max(0, i - 1));
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    setStepIndex(i => Math.min(totalSteps - 1, i + 1));
  };
  const handlePlayPause = () => {
    if (stepIndex >= totalSteps - 1) {
      setStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  };
  const handleJumpEnd = () => {
    setIsPlaying(false);
    setStepIndex(totalSteps - 1);
  };

  // Render frontier for state panel
  function renderFrontierPanel(): JSX.Element {
    if (!currentStep) return <span style={{ color: '#6B7280' }}>—</span>;
    if (algorithm === 'bfs' || algorithm === 'dfs') {
      const s = currentStep as BFSStep;
      if (s.frontier.length === 0) return <span style={{ color: '#6B7280' }}>empty</span>;
      return (
        <span>
          {s.frontier.slice(0, 8).join(', ')}
          {s.frontier.length > 8 ? ` +${s.frontier.length - 8} more` : ''}
        </span>
      );
    }
    if (algorithm === 'ucs') {
      const s = currentStep as UCSStep;
      if (s.frontier.length === 0) return <span style={{ color: '#6B7280' }}>empty</span>;
      return (
        <span>
          {s.frontier.slice(0, 5).map(e => `${e.node}(${e.cost})`).join(', ')}
          {s.frontier.length > 5 ? ` +${s.frontier.length - 5} more` : ''}
        </span>
      );
    }
    // astar
    const s = currentStep as AStarStep;
    if (s.frontier.length === 0) return <span style={{ color: '#6B7280' }}>empty</span>;
    return (
      <span>
        {s.frontier.slice(0, 4).map(e => `${e.node}(f=${e.f})`).join(', ')}
        {s.frontier.length > 4 ? ` +${s.frontier.length - 4} more` : ''}
      </span>
    );
  }

  // Extra info for UCS/A*
  function renderExtraInfo(): JSX.Element | null {
    if (!currentStep || !currentStep.currentNode) return null;
    if (algorithm === 'ucs') {
      const s = currentStep as UCSStep;
      return <div style={{ color: '#D1D5DB', fontSize: '13px' }}>Cost to current: <strong style={{ color: '#F59E0B' }}>{s.currentCost}</strong></div>;
    }
    if (algorithm === 'astar') {
      const s = currentStep as AStarStep;
      return (
        <div style={{ color: '#D1D5DB', fontSize: '13px' }}>
          g=<strong style={{ color: '#60A5FA' }}>{s.currentG}</strong>{' '}
          h=<strong style={{ color: '#34D399' }}>{s.currentH}</strong>{' '}
          f=<strong style={{ color: '#F59E0B' }}>{s.currentF}</strong>
        </div>
      );
    }
    return null;
  }

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: disabled ? '#1F2937' : '#374151',
    color: disabled ? '#4B5563' : '#E5E7EB',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'background 0.15s',
  });

  const algoLabel: Record<AlgorithmType, string> = {
    bfs: 'BFS',
    dfs: 'DFS',
    ucs: 'UCS',
    astar: 'A*',
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB' }}>
      {/* Algorithm + node selectors */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
        padding: '16px 24px', background: 'var(--surface-2, #1A1A24)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div role="group" aria-label="Select algorithm" style={{ display: 'flex', gap: '6px' }}>
          {(['bfs', 'dfs', 'ucs', 'astar'] as const).map(algo => (
            <button
              key={algo}
              onClick={() => setAlgorithm(algo)}
              aria-pressed={algorithm === algo}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                background: algorithm === algo ? '#3B82F6' : '#374151',
                color: algorithm === algo ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              {algoLabel[algo]}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          Start:
          <select
            value={startNode}
            onChange={e => setStartNode(e.target.value)}
            aria-label="Start node"
            style={{ background: '#374151', color: '#E5E7EB', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }}
          >
            {NODE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          Goal:
          <select
            value={goalNode}
            onChange={e => setGoalNode(e.target.value)}
            aria-label="Goal node"
            style={{ background: '#374151', color: '#E5E7EB', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }}
          >
            {NODE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </div>

      {/* Main area: SVG graph + state panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: '0',
        minHeight: '400px',
      }}>
        {/* SVG graph */}
        <div style={{ background: 'var(--surface-1, #111118)', padding: '12px', overflow: 'auto' }}>
          <svg
            viewBox="0 0 820 520"
            width="100%"
            aria-label={`Romania road map graph for ${algoLabel[algorithm]} search`}
            role="img"
            style={{ display: 'block' }}
          >
            {/* Edges */}
            {EDGES.map(edge => {
              const from = NODES[edge.from];
              const to = NODES[edge.to];
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;

              // Highlight edge if both endpoints are on the path
              const onPath = currentStep
                ? currentStep.path.includes(edge.from) && currentStep.path.includes(edge.to)
                : false;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={onPath ? '#F59E0B' : '#374151'}
                    strokeWidth={onPath ? 3 : 1.5}
                  />
                  <text
                    x={mx} y={my - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6B7280"
                    style={{ userSelect: 'none' }}
                  >
                    {edge.cost}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {Object.entries(NODES).map(([nodeId, pos]) => {
              const status = currentStep
                ? getNodeStatus(nodeId, currentStep, algorithm)
                : 'unvisited';
              const colors = STATUS_COLORS[status];
              const isStart = nodeId === startNode;
              const isGoal = nodeId === goalNode;

              return (
                <g key={nodeId} role="img" aria-label={`${nodeId}: ${status}`}>
                  <circle
                    cx={pos.x} cy={pos.y} r={18}
                    fill={colors.fill}
                    stroke={isStart ? '#10B981' : isGoal ? '#EF4444' : colors.stroke}
                    strokeWidth={isStart || isGoal ? 3 : 2}
                  />
                  {isStart && (
                    <text x={pos.x} y={pos.y - 22} textAnchor="middle" fontSize="9" fill="#10B981">S</text>
                  )}
                  {isGoal && (
                    <text x={pos.x} y={pos.y - 22} textAnchor="middle" fontSize="9" fill="#EF4444">G</text>
                  )}
                  <text
                    x={pos.x} y={pos.y + 28}
                    textAnchor="middle"
                    fontSize="9"
                    fill={colors.text}
                    style={{ userSelect: 'none' }}
                  >
                    {pos.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px 4px', fontSize: '11px' }}>
            {(Object.entries(STATUS_COLORS) as Array<[NodeStatus, typeof STATUS_COLORS[NodeStatus]]>).map(([status, colors]) => (
              <span key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9CA3AF' }}>
                <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5"/></svg>
                {status}
              </span>
            ))}
          </div>
        </div>

        {/* State panel */}
        <div style={{
          background: 'var(--surface-2, #1A1A24)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            State Inspector
          </div>

          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#D1D5DB', background: '#111118', borderRadius: '8px', padding: '10px' }}>
            {currentStep?.action ?? 'Press play or step forward to start.'}
          </div>

          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Step <strong style={{ color: '#E5E7EB' }}>{stepIndex + 1}</strong> / {totalSteps}
          </div>

          {currentStep && currentStep.currentNode && (
            <div style={{ fontSize: '13px', color: '#D1D5DB' }}>
              Expanding: <strong style={{ color: '#10B981' }}>{currentStep.currentNode}</strong>
            </div>
          )}

          {renderExtraInfo()}

          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#D1D5DB' }}>Frontier</div>
            <div style={{ fontSize: '11px', lineHeight: 1.6 }}>{renderFrontierPanel()}</div>
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#D1D5DB' }}>Explored</div>
            <div style={{ fontSize: '11px' }}>
              {currentStep ? `${currentStep.explored.size} node${currentStep.explored.size !== 1 ? 's' : ''}` : '0 nodes'}
            </div>
          </div>

          {currentStep && currentStep.path.length > 0 && (
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#D1D5DB' }}>Current path</div>
              <div style={{ fontSize: '10px', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {currentStep.path.join(' → ')}
              </div>
            </div>
          )}

          {algorithm === 'astar' && (
            <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
              Heuristic: SLD to Bucharest
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
        padding: '12px 24px', background: 'var(--surface-2, #1A1A24)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={handleReset} disabled={stepIndex === 0} style={btnStyle(stepIndex === 0)} aria-label="Reset to start">⏮</button>
        <button onClick={handleStepBack} disabled={stepIndex === 0} style={btnStyle(stepIndex === 0)} aria-label="Step back">⏪</button>
        <button
          onClick={handlePlayPause}
          disabled={prefersReducedMotion}
          style={btnStyle(prefersReducedMotion)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={handleStepForward} disabled={stepIndex >= totalSteps - 1} style={btnStyle(stepIndex >= totalSteps - 1)} aria-label="Step forward">⏩</button>
        <button onClick={handleJumpEnd} disabled={stepIndex >= totalSteps - 1} style={btnStyle(stepIndex >= totalSteps - 1)} aria-label="Jump to end">⏭</button>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9CA3AF', marginLeft: '8px' }}>
          Speed
          <input
            type="range"
            min="100"
            max="1500"
            step="100"
            value={1600 - speed}
            onChange={e => setSpeed(1600 - Number(e.target.value))}
            aria-label="Animation speed"
            disabled={prefersReducedMotion}
            style={{ width: '80px' }}
          />
        </label>

        {prefersReducedMotion && (
          <span style={{ fontSize: '11px', color: '#6B7280' }}>
            Auto-play disabled (prefers-reduced-motion)
          </span>
        )}
      </div>
    </div>
  );
}
