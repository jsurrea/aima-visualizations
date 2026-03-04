import { useState, useMemo } from 'react';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Small example graph ──────────────────────────────────────────────────────

interface GraphNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly neighbors: ReadonlyArray<string>;
}

const DEMO_NODES: ReadonlyArray<GraphNode> = [
  { id: 'S', x: 60,  y: 140, neighbors: ['A', 'B'] },
  { id: 'A', x: 175, y: 60,  neighbors: ['S', 'C', 'D'] },
  { id: 'B', x: 175, y: 220, neighbors: ['S', 'D', 'E'] },
  { id: 'C', x: 300, y: 20,  neighbors: ['A'] },
  { id: 'D', x: 300, y: 140, neighbors: ['A', 'B', 'G'] },
  { id: 'E', x: 300, y: 260, neighbors: ['B'] },
  { id: 'G', x: 420, y: 140, neighbors: ['D'] },
];

const DEMO_EDGES: ReadonlyArray<readonly [string, string]> = [
  ['S', 'A'], ['S', 'B'],
  ['A', 'C'], ['A', 'D'],
  ['B', 'D'], ['B', 'E'],
  ['D', 'G'],
];

// ─── Generic search step ──────────────────────────────────────────────────────

interface TreeNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly depth: number;
  readonly path: ReadonlyArray<string>;
}

interface SearchStep {
  readonly frontier: ReadonlyArray<string>;
  readonly explored: ReadonlySet<string>;
  readonly currentNode: string;
  readonly treeNodes: ReadonlyArray<TreeNode>;
  readonly action: string;
  readonly path: ReadonlyArray<string>;
  readonly isGoal: boolean;
  readonly skipped: boolean; // true if this step was skipped due to explored check
}

// ─── BFS search producing tree steps ─────────────────────────────────────────

function computeBFSTreeSteps(
  graphSearch: boolean,
): ReadonlyArray<SearchStep> {
  const steps: SearchStep[] = [];
  const start = 'S';
  const goal = 'G';
  const nodeMap = new Map(DEMO_NODES.map(n => [n.id, n]));

  const queue: Array<{ id: string; parentId: string | null; path: string[] }> = [
    { id: start, parentId: null, path: [start] },
  ];
  const explored = new Set<string>();
  const treeNodes: TreeNode[] = [];

  // Track depth in the tree
  const depthMap = new Map<string, number>([[start, 0]]);
  // Track existing tree edges by composite key for O(1) dedup
  const treeEdgeSet = new Set<string>();

  let maxSteps = 40;
  while (queue.length > 0 && maxSteps-- > 0) {
    const { id: currentNode, parentId, path } = queue.shift()!;

    // Check if already explored (for graph search)
    if (graphSearch && explored.has(currentNode)) {
      steps.push({
        frontier: queue.map(e => e.id),
        explored: new Set(explored),
        currentNode,
        treeNodes: [...treeNodes],
        action: `Skipping "${currentNode}" — already explored (graph search)`,
        path,
        isGoal: false,
        skipped: true,
      });
      continue;
    }

    if (graphSearch) explored.add(currentNode);

    const depth = depthMap.get(currentNode) ?? 0;
    const edgeKey = `${parentId ?? ''}→${currentNode}`;
    if (!treeEdgeSet.has(edgeKey)) {
      treeEdgeSet.add(edgeKey);
      treeNodes.push({ id: currentNode, parentId, depth, path });
    }

    const isGoal = currentNode === goal;
    steps.push({
      frontier: queue.map(e => e.id),
      explored: new Set(explored),
      currentNode,
      treeNodes: [...treeNodes],
      action: isGoal
        ? `Goal "G" found! Path: ${path.join(' → ')}`
        : `Expanding "${currentNode}" (depth ${depth})`,
      path,
      isGoal,
      skipped: false,
    });

    if (isGoal) break;

    const node = nodeMap.get(currentNode);
    for (const neighbor of node?.neighbors ?? []) {
      const inExplored = explored.has(neighbor);
      if (!graphSearch || !inExplored) {
        const newDepth = depth + 1;
        depthMap.set(neighbor, newDepth);
        queue.push({ id: neighbor, parentId: currentNode, path: [...path, neighbor] });
      }
    }
  }

  return steps;
}

// ─── Layout tree nodes for display ───────────────────────────────────────────

interface TreePos { x: number; y: number }

function layoutTree(treeNodes: ReadonlyArray<TreeNode>): ReadonlyMap<string, TreePos> {
  // Group by depth
  const byDepth = new Map<number, string[]>();
  for (const n of treeNodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth)!.push(n.id);
  }

  const positions = new Map<string, TreePos>();
  const maxDepth = Math.max(...Array.from(byDepth.keys()), 0);

  for (let d = 0; d <= maxDepth; d++) {
    const nodes = byDepth.get(d) ?? [];
    const total = nodes.length;
    nodes.forEach((id, i) => {
      const x = total === 1 ? 220 : 60 + (i / (total - 1)) * 320;
      const y = 30 + d * 80;
      positions.set(id, { x, y });
    });
  }

  return positions;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchTreeViz(): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [graphSearch, setGraphSearch] = useState(true);

  const steps = useMemo(() => computeBFSTreeSteps(graphSearch), [graphSearch]);
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];

  const handleReset = () => setStepIndex(0);
  const handleBack = () => setStepIndex(i => Math.max(0, i - 1));
  const handleForward = () => setStepIndex(i => Math.min(totalSteps - 1, i + 1));

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.15)', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#1F2937' : '#374151',
    color: disabled ? '#4B5563' : '#E5E7EB',
  });

  const treePositions = useMemo(
    () => currentStep ? layoutTree(currentStep.treeNodes) : new Map<string, TreePos>(),
    [currentStep],
  );

  // Node status in GRAPH
  const getGraphStatus = (nodeId: string): 'current' | 'path' | 'explored' | 'frontier' | 'unvisited' => {
    if (!currentStep) return 'unvisited';
    if (nodeId === currentStep.currentNode) return 'current';
    if (currentStep.path.includes(nodeId)) return 'path';
    if (currentStep.explored.has(nodeId)) return 'explored';
    if (currentStep.frontier.includes(nodeId)) return 'frontier';
    return 'unvisited';
  };

  const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
    current:   { fill: '#064E3B', stroke: '#10B981', text: '#6EE7B7' },
    path:      { fill: '#78350F', stroke: '#F59E0B', text: '#FDE68A' },
    explored:  { fill: '#1E1B4B', stroke: '#6366F1', text: '#A5B4FC' },
    frontier:  { fill: '#451A03', stroke: '#D97706', text: '#FCD34D' },
    unvisited: { fill: '#1F2937', stroke: '#4B5563', text: '#9CA3AF' },
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB' }}>
      {/* Controls bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
        padding: '14px 20px', background: '#1A1A24',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={handleReset} disabled={stepIndex === 0} style={btnStyle(stepIndex === 0)} aria-label="Reset">⏮</button>
        <button onClick={handleBack} disabled={stepIndex === 0} style={btnStyle(stepIndex === 0)} aria-label="Step back">⏪</button>
        <button onClick={handleForward} disabled={stepIndex >= totalSteps - 1} style={btnStyle(stepIndex >= totalSteps - 1)} aria-label="Step forward">⏩</button>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          Step <strong style={{ color: '#E5E7EB' }}>{stepIndex + 1}</strong> / {totalSteps}
        </span>

        {/* Graph vs Tree search toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>⚡ What If:</span>
          <button
            onClick={() => { setGraphSearch(true); setStepIndex(0); }}
            aria-pressed={graphSearch}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              background: graphSearch ? '#3B82F6' : '#374151',
              color: graphSearch ? '#fff' : '#9CA3AF',
            }}
          >
            Graph Search
          </button>
          <button
            onClick={() => { setGraphSearch(false); setStepIndex(0); }}
            aria-pressed={!graphSearch}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              background: !graphSearch ? '#EF4444' : '#374151',
              color: !graphSearch ? '#fff' : '#9CA3AF',
            }}
          >
            Tree Search
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '0', minHeight: '420px' }}>
        {/* State graph */}
        <div style={{ background: '#111118', padding: '12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
            State Space Graph
          </div>
          <svg viewBox="0 0 480 310" width="100%" aria-label="State space graph" role="img" style={{ display: 'block' }}>
            {/* Edges */}
            {DEMO_EDGES.map(([from, to]) => {
              const fn = DEMO_NODES.find(n => n.id === from)!;
              const tn = DEMO_NODES.find(n => n.id === to)!;
              const onPath = currentStep
                ? currentStep.path.includes(from) && currentStep.path.includes(to)
                : false;
              return (
                <line key={`${from}-${to}`}
                  x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                  stroke={onPath ? '#F59E0B' : '#374151'}
                  strokeWidth={onPath ? 2.5 : 1.5}
                />
              );
            })}
            {/* Nodes */}
            {DEMO_NODES.map(node => {
              const status = getGraphStatus(node.id);
              const colors = STATUS_COLORS[status]!;
              return (
                <g key={node.id} role="img" aria-label={`${node.id}: ${status}`}>
                  <circle cx={node.x} cy={node.y} r={20} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={colors.text}>{node.id}</text>
                  {node.id === 'S' && <text x={node.x} y={node.y - 24} textAnchor="middle" fontSize="9" fill="#10B981">start</text>}
                  {node.id === 'G' && <text x={node.x} y={node.y - 24} textAnchor="middle" fontSize="9" fill="#EF4444">goal</text>}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Search tree */}
        <div style={{ background: '#0A0A0F', padding: '12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
            Search Tree
          </div>
          <svg viewBox="0 0 440 380" width="100%" aria-label="Search tree" role="img" style={{ display: 'block' }}>
            {/* Tree edges */}
            {currentStep?.treeNodes.map(node => {
              if (!node.parentId) return null;
              const from = treePositions.get(node.parentId);
              const to = treePositions.get(node.id);
              if (!from || !to) return null;
              return (
                <line key={`tree-${node.parentId}-${node.id}`}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="#374151" strokeWidth={1.5}
                />
              );
            })}
            {/* Tree nodes */}
            {currentStep?.treeNodes.map(node => {
              const pos = treePositions.get(node.id);
              if (!pos) return null;
              const isCurrent = node.id === currentStep.currentNode;
              const isGoalNode = node.id === 'G';
              return (
                <g key={`tnode-${node.id}-${node.depth}`}>
                  <circle
                    cx={pos.x} cy={pos.y} r={16}
                    fill={isCurrent ? '#064E3B' : isGoalNode ? '#78350F' : '#1E1B4B'}
                    stroke={isCurrent ? '#10B981' : isGoalNode ? '#F59E0B' : '#6366F1'}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                  />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fontWeight="700"
                    fill={isCurrent ? '#6EE7B7' : isGoalNode ? '#FDE68A' : '#A5B4FC'}>
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* State panel */}
        <div style={{ background: '#1A1A24', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' }}>
            Node Data Structure
          </div>

          {currentStep && currentStep.currentNode && (
            <div style={{ background: '#111118', borderRadius: '8px', padding: '10px', fontSize: '11px', lineHeight: 1.8, fontFamily: 'monospace' }}>
              <div><span style={{ color: '#6B7280' }}>state:</span> <strong style={{ color: '#10B981' }}>{currentStep.currentNode}</strong></div>
              <div><span style={{ color: '#6B7280' }}>parent:</span> <span style={{ color: '#A5B4FC' }}>{currentStep.path.length > 1 ? currentStep.path[currentStep.path.length - 2] : 'null'}</span></div>
              <div><span style={{ color: '#6B7280' }}>depth:</span> <span style={{ color: '#FCD34D' }}>{currentStep.path.length - 1}</span></div>
              <div><span style={{ color: '#6B7280' }}>path:</span> <span style={{ color: '#F9A8D4', fontSize: '10px' }}>{currentStep.path.join('→')}</span></div>
            </div>
          )}

          <div style={{ background: '#111118', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#D1D5DB', lineHeight: 1.5 }}>
            {currentStep?.action ?? 'Press ⏩ to start expanding nodes.'}
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            <div style={{ fontWeight: 600, color: '#D1D5DB', marginBottom: 4 }}>Frontier</div>
            <div style={{ fontSize: '11px' }}>
              {currentStep && currentStep.frontier.length > 0
                ? `[${currentStep.frontier.join(', ')}]`
                : 'empty'}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            <div style={{ fontWeight: 600, color: '#D1D5DB', marginBottom: 4 }}>Explored</div>
            <div style={{ fontSize: '11px' }}>
              {currentStep ? `{${Array.from(currentStep.explored).join(', ')}}` : '{}'}
            </div>
          </div>

          {!graphSearch && (
            <div style={{
              background: '#2D1515', border: '1px solid #EF4444',
              borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#FCA5A5', lineHeight: 1.5,
            }}>
              ⚠️ Tree search: no explored set. Nodes can be visited multiple times → may loop!
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('g(n)') }} /> = path cost so far (BFS counts hops)
          </div>
        </div>
      </div>
    </div>
  );
}
