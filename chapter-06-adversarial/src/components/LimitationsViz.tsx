import { useState, useMemo } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const COMPLEXITY_FORMULA = String.raw`O(b^m)`;
const CHESS_FORMULA = String.raw`35^{80} \approx 10^{124}`;
const GO_FORMULA = String.raw`250^{150} \approx 10^{360}`;
const CHECKERS_FORMULA = String.raw`8^{70} \approx 10^{63}`;

interface GameStat {
  name: string;
  b: number;
  d: number;
  nodes: string;
  formula: string;
  note: string;
  color: string;
}

const GAME_STATS: GameStat[] = [
  { name: 'Chess', b: 35, d: 80, nodes: '10^{124}', formula: CHESS_FORMULA, note: 'Strongest programs beat humans', color: '#6366F1' },
  { name: 'Checkers', b: 8, d: 70, nodes: '10^{63}', formula: CHECKERS_FORMULA, note: 'Solved (Schaeffer 2007)', color: '#10B981' },
  { name: 'Go', b: 250, d: 150, nodes: '10^{360}', formula: GO_FORMULA, note: 'AlphaGo beat world champion 2016', color: '#F59E0B' },
];

// Build a simple 4-level minimax tree for depth-limited comparison
interface MiniNode {
  id: string;
  value?: number; // defined for leaves
  depth: number;
  children: MiniNode[];
  x: number;
  y: number;
}

function buildMiniTree(): MiniNode {
  const leafValues = [3, 5, 2, 9, 1, 7, 4, 8];
  let lv = 0;
  function make(depth: number, x: number, spread: number): MiniNode {
    const id = `n-${depth}-${x}`;
    if (depth === 4) {
      const val = leafValues[lv % leafValues.length]!;
      lv++;
      return { id, value: val, depth, children: [], x, y: depth * 80 + 40 };
    }
    const left = make(depth + 1, x - spread / 2, spread / 2);
    const right = make(depth + 1, x + spread / 2, spread / 2);
    return { id, depth, children: [left, right], x, y: depth * 80 + 40 };
  }
  return make(0, 240, 200);
}

// Evaluate minimax value at a given cutoff depth (heuristic = node's x position % 10)
function evalMini(node: MiniNode, cutoff: number, isMax: boolean): number {
  if (node.depth >= cutoff || node.children.length === 0) {
    // Heuristic: x-position mod 10 gives a visually varied spread of values
    // that simulates a real heuristic evaluation function for demo purposes.
    return node.value ?? (node.x % 10);
  }
  const childVals = node.children.map(c => evalMini(c, cutoff, !isMax));
  return isMax ? Math.max(...childVals) : Math.min(...childVals);
}

function renderMiniTree(
  node: MiniNode,
  cutoff: number,
  isMax: boolean,
  bombDepth: number,
): React.ReactNode {
  const isBeyondCutoff = node.depth >= cutoff && node.children.length > 0;
  const isBomb = node.depth === bombDepth && node.value !== undefined && node.value <= 1;
  const val = node.value ?? (isBeyondCutoff ? null : evalMini(node, cutoff, isMax));

  const nodeColor = node.depth >= cutoff
    ? '#4B5563'
    : isMax
      ? '#6366F1'
      : '#F59E0B';

  return (
    <g key={node.id}>
      {node.children.map(child => (
        <line
          key={`e-${node.id}-${child.id}`}
          x1={node.x} y1={node.y}
          x2={child.x} y2={child.y}
          stroke={child.depth > cutoff ? '#2D3748' : '#374151'}
          strokeWidth={1.5}
          strokeDasharray={child.depth > cutoff ? '4,3' : undefined}
        />
      ))}
      {node.children.map(child => renderMiniTree(child, cutoff, !isMax, bombDepth))}
      <circle
        cx={node.x} cy={node.y} r={16}
        fill={isBeyondCutoff ? '#1F2937' : isBomb ? '#7F1D1D' : 'var(--surface-2)'}
        stroke={isBomb ? '#EF4444' : nodeColor}
        strokeWidth={isBeyondCutoff ? 1 : 2}
        opacity={node.depth > cutoff ? 0.4 : 1}
      />
      {isBomb && <text x={node.x} y={node.y + 6} textAnchor="middle" fontSize={14}>💣</text>}
      {!isBomb && (
        <text
          x={node.x} y={node.y + 4}
          textAnchor="middle"
          fill={isBeyondCutoff ? '#6B7280' : 'white'}
          fontSize={11}
          fontWeight={700}
          opacity={node.depth > cutoff ? 0.5 : 1}
        >
          {isBeyondCutoff ? '?' : val?.toFixed(0) ?? '?'}
        </text>
      )}
    </g>
  );
}

export function LimitationsViz() {
  const [depthLimit, setDepthLimit] = useState(3);
  const miniTree = useMemo(buildMiniTree, []);

  // The "bomb" node is at depth = depthLimit+1 (always just past horizon)
  const bombDepth = depthLimit + 1;

  const rootVal = useMemo(() => evalMini(miniTree, depthLimit, true), [miniTree, depthLimit]);

  return (
    <section aria-labelledby="limitations-title" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id="limitations-title" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          §6.7 Limitations of Game Search
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
          Even with alpha-beta pruning, game trees grow exponentially. Depth-limited search uses heuristic evaluation
          but risks the <em>horizon effect</em> — threats lurking just past the search boundary.
        </p>
      </div>

      {/* Complexity */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Complexity: <span dangerouslySetInnerHTML={{ __html: renderInlineMath(COMPLEXITY_FORMULA) }} /></h3>
        <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.6 }}>
          With branching factor <span dangerouslySetInnerHTML={{ __html: renderInlineMath('b') }} /> and
          search depth <span dangerouslySetInnerHTML={{ __html: renderInlineMath('m') }} />,
          full minimax evaluates <span dangerouslySetInnerHTML={{ __html: renderInlineMath('b^m') }} /> nodes.
          Even perfect alpha-beta requires <span dangerouslySetInnerHTML={{ __html: renderInlineMath('O(b^{m/2})') }} />.
        </p>
      </div>

      {/* Game stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {GAME_STATS.map(g => (
          <div
            key={g.name}
            style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${g.color}` }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: g.color, marginBottom: '8px' }}>{g.name}</h3>
            <dl style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', margin: 0 }}>
              <dt style={{ color: '#6B7280' }}>Branching factor</dt>
              <dd style={{ margin: 0, color: 'white' }}><span dangerouslySetInnerHTML={{ __html: renderInlineMath(`b \\approx ${g.b}`) }} /></dd>
              <dt style={{ color: '#6B7280' }}>Depth</dt>
              <dd style={{ margin: 0, color: 'white' }}><span dangerouslySetInnerHTML={{ __html: renderInlineMath(`d \\approx ${g.d}`) }} /></dd>
              <dt style={{ color: '#6B7280' }}>Nodes</dt>
              <dd style={{ margin: 0, color: g.color, fontWeight: 700 }}><span dangerouslySetInnerHTML={{ __html: renderInlineMath(g.formula) }} /></dd>
            </dl>
            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>{g.note}</p>
          </div>
        ))}
      </div>

      {/* Depth-limited comparison */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Depth-Limited Minimax</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label htmlFor="depth-slider" style={{ fontWeight: 600, fontSize: '14px', minWidth: '160px' }}>
            Cutoff depth: <strong style={{ color: '#6366F1' }}>{depthLimit}</strong> ply
          </label>
          <input
            id="depth-slider"
            type="range" min={1} max={4} step={1}
            value={depthLimit}
            onChange={e => setDepthLimit(parseInt(e.target.value))}
            style={{ flex: 1, minWidth: '120px', accentColor: '#6366F1' }}
            aria-label="Adjust search depth cutoff"
          />
        </div>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '8px' }}>
          Nodes beyond depth {depthLimit} are shown faded with <strong>?</strong> (heuristic evaluation needed).
          Root value at cutoff = <strong style={{ color: '#6366F1' }}>{rootVal}</strong>.
          {depthLimit < 4 && ' 💣 marks a bad outcome just past the horizon (horizon effect).'}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox="0 20 480 380"
            style={{ width: '100%', minWidth: '400px', height: 'auto', display: 'block' }}
            aria-label="Depth-limited minimax tree"
            role="img"
          >
            {renderMiniTree(miniTree, depthLimit, true, bombDepth)}
            {/* Cutoff line */}
            {depthLimit < 4 && (
              <line
                x1={0} y1={depthLimit * 80 + 56}
                x2={480} y2={depthLimit * 80 + 56}
                stroke="#EF4444" strokeWidth={1.5} strokeDasharray="8,4"
                opacity={0.6}
              />
            )}
            {depthLimit < 4 && (
              <text x={8} y={depthLimit * 80 + 70} fill="#EF4444" fontSize={10} opacity={0.8}>← cutoff</text>
            )}
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #6366F1' }} />
            <span style={{ color: '#9CA3AF' }}>MAX node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #F59E0B' }} />
            <span style={{ color: '#9CA3AF' }}>MIN node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #4B5563', opacity: 0.5 }} />
            <span style={{ color: '#9CA3AF' }}>Beyond cutoff (heuristic)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💣</span>
            <span style={{ color: '#EF4444' }}>Horizon threat (bad outcome hidden)</span>
          </div>
        </div>
      </div>

      {/* Horizon effect explanation */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #EF4444' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444', marginBottom: '8px' }}>The Horizon Effect</h3>
        <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.6 }}>
          When a forced bad outcome (💣) lies just beyond the search depth, the algorithm can't see it and may make
          suboptimal moves to <em>delay</em> it — pushing it past the horizon while the position worsens.
          Decrease the depth slider to watch the bomb node disappear below the cutoff line.
        </p>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '8px' }}>
          Mitigation strategies: <strong>quiescence search</strong> (continue past cutoff when position is volatile),
          <strong> singular extensions</strong> (extend forced sequences), and
          <strong> futility pruning</strong>.
        </p>
      </div>
    </section>
  );
}
