import { useState, useMemo } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const ZERO_SUM_FORMULA = String.raw`\text{UTILITY}(s, \text{MAX}) = -\text{UTILITY}(s, \text{MIN})`;

/** A simplified tic-tac-toe board state (9 cells, 'X' | 'O' | null) */
type Cell = 'X' | 'O' | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

const EMPTY_BOARD: Board = [null, null, null, null, null, null, null, null, null];

interface TreeNodeData {
  id: string;
  board: Board;
  player: 'X' | 'O';
  utilityMax: number;
  utilityMin: number;
  move?: number; // index of last move
  children: TreeNodeData[];
  x: number;
  y: number;
}

function applyMove(board: Board, idx: number, player: 'X' | 'O'): Board {
  const next = [...board] as Board;
  next[idx] = player;
  return next;
}

function buildPartialTree(): TreeNodeData {
  const root: TreeNodeData = {
    id: 'root', board: EMPTY_BOARD, player: 'X',
    utilityMax: 0, utilityMin: 0, children: [], x: 340, y: 40,
  };

  // Level 1 — X moves (3 representative moves: corners/center/edge)
  const l1Moves = [0, 4, 1];
  const l1X = [120, 340, 560];
  l1Moves.forEach((mv, i) => {
    const b1 = applyMove(EMPTY_BOARD, mv, 'X');
    const l1Node: TreeNodeData = {
      id: `l1-${i}`, board: b1, player: 'O',
      utilityMax: 0, utilityMin: 0,
      move: mv, children: [], x: l1X[i]!, y: 170,
    };
    // Level 2 — O responds (2 responses each)
    const l2Moves = [
      [4, 2],   // responses to corner
      [0, 2],   // responses to center
      [4, 6],   // responses to edge
    ];
    const responses = l2Moves[i] ?? [0, 2];
    const l2X = [-70, 70];
    responses.forEach((omv, j) => {
      const b2 = applyMove(b1, omv, 'O');
      // Assign plausible utility values
      const utilMaxMap: number[][] = [[1, -1], [0, 1], [-1, 1]];
      const utilMax = utilMaxMap[i]?.[j] ?? 0;
      const l2Node: TreeNodeData = {
        id: `l2-${i}-${j}`, board: b2, player: 'X',
        utilityMax: utilMax,
        utilityMin: -utilMax,
        move: omv, children: [], x: l1X[i]! + l2X[j]!, y: 310,
      };
      l1Node.children.push(l2Node);
    });
    root.children.push(l1Node);
  });

  return root;
}

function BoardSvg({ board, size = 54, highlightCell }: { board: Board; size?: number; highlightCell?: number }) {
  const cell = size / 3;
  return (
    <svg width={size} height={size} aria-hidden="true">
      {[1, 2].flatMap(i => [
        <line key={`h${i}`} x1={0} y1={i * cell} x2={size} y2={i * cell} stroke="#374151" strokeWidth={1} />,
        <line key={`v${i}`} x1={i * cell} y1={0} x2={i * cell} y2={size} stroke="#374151" strokeWidth={1} />,
      ])}
      {board.map((c, idx) => {
        const cx = (idx % 3) * cell + cell / 2;
        const cy = Math.floor(idx / 3) * cell + cell / 2;
        const highlight = highlightCell === idx;
        if (c === 'X') return <text key={idx} x={cx} y={cy + 5} textAnchor="middle" fill={highlight ? '#a5b4fc' : '#6366F1'} fontSize={cell * 0.6} fontWeight={700}>X</text>;
        if (c === 'O') return <text key={idx} x={cx} y={cy + 5} textAnchor="middle" fill={highlight ? '#fde68a' : '#F59E0B'} fontSize={cell * 0.6} fontWeight={700}>O</text>;
        return null;
      })}
    </svg>
  );
}

export function GameTheoryViz() {
  const tree = useMemo(buildPartialTree, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zeroSum, setZeroSum] = useState(true);

  const allNodes = useMemo(() => {
    const list: TreeNodeData[] = [];
    function collect(n: TreeNodeData) { list.push(n); n.children.forEach(collect); }
    collect(tree);
    return list;
  }, [tree]);

  const selectedNode = allNodes.find(n => n.id === selectedId) ?? null;

  function getUtility(n: TreeNodeData) {
    if (zeroSum) return { max: n.utilityMax, min: -n.utilityMax };
    // Non-zero-sum: both can be positive
    return { max: n.utilityMax + 0.5, min: Math.max(0, n.utilityMin + 0.5) };
  }

  function renderEdges(node: TreeNodeData): React.ReactNode {
    return node.children.map(child => (
      <g key={`e-${node.id}-${child.id}`}>
        <line
          x1={node.x} y1={node.y + 30}
          x2={child.x} y2={child.y - 30}
          stroke="#374151" strokeWidth={1.5}
        />
        {renderEdges(child)}
      </g>
    ));
  }

  function renderNodes(node: TreeNodeData): React.ReactNode {
    const isSelected = selectedId === node.id;
    const isLeaf = node.children.length === 0;
    const util = getUtility(node);
    const playerColor = node.player === 'X' ? '#6366F1' : '#F59E0B';
    const borderColor = isSelected ? '#10B981' : playerColor;

    return (
      <g key={node.id}>
        <foreignObject
          x={node.x - 30}
          y={node.y - 30}
          width={60}
          height={60}
          style={{ cursor: 'pointer', overflow: 'visible' }}
          onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
          role="button"
          aria-label={`${node.player === 'X' ? 'MAX' : 'MIN'} node, utility MAX=${util.max}`}
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelectedId(node.id === selectedId ? null : node.id)}
        >
          <div
            style={{
              width: '60px', height: '60px', borderRadius: node.player === 'X' ? '6px' : '50%',
              border: `2px solid ${borderColor}`,
              background: isSelected ? `${borderColor}30` : 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isSelected ? `0 0 10px ${borderColor}` : 'none',
            }}
          >
            <BoardSvg board={node.board} size={48} {...(node.move !== undefined ? { highlightCell: node.move } : {})} />
          </div>
        </foreignObject>
        {isLeaf && (
          <text
            x={node.x}
            y={node.y + 40}
            textAnchor="middle"
            fill={util.max > 0 ? '#10B981' : util.max < 0 ? '#EF4444' : '#9CA3AF'}
            fontSize={11}
            fontWeight={700}
          >
            {zeroSum ? util.max : `M:${util.max.toFixed(1)}`}
          </text>
        )}
        {node.children.map(child => renderNodes(child))}
      </g>
    );
  }

  const gameDefinition = [
    { sym: 'S_0', desc: 'Initial state — empty board, X to move' },
    { sym: 'PLAYER(s)', desc: 'Returns whose turn it is: X (MAX) or O (MIN)' },
    { sym: 'ACTIONS(s)', desc: 'Legal moves: any empty cell' },
    { sym: 'RESULT(s,a)', desc: 'New state after placing the current player\'s mark' },
    { sym: 'IS\\text{-}TERMINAL(s)', desc: 'True if someone has won or no empty cells remain' },
    { sym: 'UTILITY(s,p)', desc: '+1 if p wins, −1 if p loses, 0 for draw' },
  ];

  return (
    <section aria-labelledby="game-theory-title" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id="game-theory-title" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          §6.1 Game Theory — Formal Game Definition
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
          A two-player, zero-sum game is defined by six components. Click any node in the tree below to inspect it.
        </p>
      </div>

      {/* Formal definition */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#6B7280', padding: '6px 12px 6px 0', borderBottom: '1px solid var(--surface-border)' }}>Symbol</th>
              <th style={{ textAlign: 'left', color: '#6B7280', padding: '6px 0', borderBottom: '1px solid var(--surface-border)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {gameDefinition.map(({ sym, desc }) => (
              <tr key={sym}>
                <td style={{ padding: '8px 12px 8px 0', fontFamily: 'monospace', color: '#6366F1', verticalAlign: 'top' }}
                  dangerouslySetInnerHTML={{ __html: renderInlineMath(sym) }} />
                <td style={{ padding: '8px 0', color: '#D1D5DB' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Zero-sum toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 600 }}>Game type:</span>
        <button
          onClick={() => setZeroSum(true)}
          aria-pressed={zeroSum}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
            borderColor: zeroSum ? '#6366F1' : 'var(--surface-border)',
            background: zeroSum ? '#6366F120' : 'var(--surface-2)',
            color: zeroSum ? '#6366F1' : '#9CA3AF', cursor: 'pointer', fontSize: '14px',
          }}
        >⚔️ Zero-Sum</button>
        <button
          onClick={() => setZeroSum(false)}
          aria-pressed={!zeroSum}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
            borderColor: !zeroSum ? '#10B981' : 'var(--surface-border)',
            background: !zeroSum ? '#10B98120' : 'var(--surface-2)',
            color: !zeroSum ? '#10B981' : '#9CA3AF', cursor: 'pointer', fontSize: '14px',
          }}
        >🤝 Non-Zero-Sum</button>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          {zeroSum ? 'Utilities sum to 0 — MAX\'s gain is MIN\'s loss.' : 'Both players can benefit — cooperation possible.'}
        </span>
      </div>

      {/* Formula */}
      {zeroSum && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: renderDisplayMath(ZERO_SUM_FORMULA) }} />
      )}

      {/* Partial tree */}
      <div style={{ background: 'var(--surface-1)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#6366F130', border: '1.5px solid #6366F1' }} />
            <span style={{ color: '#9CA3AF' }}>MAX (X, square)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F59E0B30', border: '1.5px solid #F59E0B' }} />
            <span style={{ color: '#9CA3AF' }}>MIN (O, circle)</span>
          </div>
        </div>
        <svg
          viewBox="0 10 680 390"
          style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block' }}
          aria-label="Partial tic-tac-toe game tree"
          role="img"
        >
          {renderEdges(tree)}
          {renderNodes(tree)}
        </svg>
        <p style={{ color: '#4B5563', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
          Click any node to inspect it. Terminal values shown below leaf nodes.
        </p>
      </div>

      {/* Selection panel */}
      {selectedNode && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #10B981' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#10B981', marginBottom: '12px' }}>Selected Node</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '14px', margin: 0 }}>
            <dt style={{ color: '#6B7280' }}>Player</dt>
            <dd style={{ color: selectedNode.player === 'X' ? '#6366F1' : '#F59E0B', margin: 0, fontWeight: 600 }}>
              {selectedNode.player === 'X' ? 'MAX (X)' : 'MIN (O)'}
            </dd>
            <dt style={{ color: '#6B7280' }}>Utility (MAX)</dt>
            <dd style={{ color: getUtility(selectedNode).max > 0 ? '#10B981' : getUtility(selectedNode).max < 0 ? '#EF4444' : '#9CA3AF', margin: 0, fontWeight: 700 }}>
              {zeroSum ? getUtility(selectedNode).max : getUtility(selectedNode).max.toFixed(1)}
            </dd>
            <dt style={{ color: '#6B7280' }}>Utility (MIN)</dt>
            <dd style={{ color: '#9CA3AF', margin: 0 }}>
              {zeroSum ? getUtility(selectedNode).min : getUtility(selectedNode).min.toFixed(1)}
            </dd>
            {selectedNode.children.length === 0 && (
              <>
                <dt style={{ color: '#6B7280' }}>Terminal?</dt>
                <dd style={{ color: '#D1D5DB', margin: 0 }}>Yes</dd>
              </>
            )}
          </dl>
          {!zeroSum && (
            <p style={{ marginTop: '10px', color: '#6B7280', fontSize: '12px' }}>
              In non-zero-sum mode, utility values are shifted so both players can achieve positive outcomes.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
