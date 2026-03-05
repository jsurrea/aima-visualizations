import { useState, useMemo } from 'react';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Grid configuration ───────────────────────────────────────────────────────

const GRID_SIZE = 8;

interface GridCell {
  readonly row: number;
  readonly col: number;
  /** Straight-line distance to goal (Euclidean). */
  readonly sld: number;
  /** Manhattan distance to goal. */
  readonly manhattan: number;
  /** Inadmissible heuristic (SLD * 1.5). */
  readonly inadmissible: number;
  /** True path cost (BFS hop count, approximated as max(|dr|,|dc|) for diagonal). */
  readonly trueH: number;
}

function computeGrid(goalRow: number, goalCol: number): ReadonlyArray<ReadonlyArray<GridCell>> {
  const rows: GridCell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const dr = Math.abs(r - goalRow);
      const dc = Math.abs(c - goalCol);
      const sld = Math.sqrt(dr * dr + dc * dc);
      const manhattan = dr + dc;
      row.push({
        row: r,
        col: c,
        sld: Math.round(sld * 10) / 10,
        manhattan,
        inadmissible: Math.round(sld * 1.5 * 10) / 10,
        trueH: Math.max(dr, dc), // Chebyshev distance as proxy for diagonal grid
      });
    }
    rows.push(row);
  }
  return rows;
}

// ─── Color mapping ────────────────────────────────────────────────────────────

function heatColor(value: number, maxValue: number): string {
  const t = maxValue === 0 ? 0 : Math.min(1, value / maxValue);
  // Blue (low) → Red (high)
  const r = Math.round(t * 220);
  const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 100);
  const b = Math.round((1 - t) * 220);
  return `rgb(${r},${g},${b})`;
}

type HeuristicMode = 'sld' | 'manhattan' | 'inadmissible';

const MODE_INFO: Readonly<Record<HeuristicMode, { label: string; latex: string; description: string; admissible: boolean; consistent: boolean }>> = {
  sld: {
    label: 'Straight-Line Distance',
    latex: 'h_{SLD}(n) = \\sqrt{\\Delta r^2 + \\Delta c^2}',
    description: 'Euclidean distance to goal. Admissible and consistent for grid movement.',
    admissible: true,
    consistent: true,
  },
  manhattan: {
    label: 'Manhattan Distance',
    latex: 'h_{Manhattan}(n) = |\\Delta r| + |\\Delta c|',
    description: 'Sum of row+col distances. Admissible for 4-directional grid, consistent.',
    admissible: true,
    consistent: true,
  },
  inadmissible: {
    label: 'Inadmissible (SLD × 1.5)',
    latex: 'h_{bad}(n) = 1.5 \\cdot h_{SLD}(n)',
    description: 'Overestimates the true cost — violates admissibility. A* may miss optimal path!',
    admissible: false,
    consistent: false,
  },
};

// ─── Effective Branching Factor demo ─────────────────────────────────────────

interface EBFData {
  readonly algo: string;
  readonly nodesExpanded: number;
  readonly color: string;
}

function getEBFData(hMode: HeuristicMode): ReadonlyArray<EBFData> {
  // Approximate nodes expanded for 8x8 grid, start at (0,0), goal at (7,7), d=7
  const base: Readonly<Record<HeuristicMode, number>> = {
    sld: 22,
    manhattan: 28,
    inadmissible: 14, // finds a path quickly but it may not be optimal
  };
  return [
    { algo: 'BFS (no heuristic)', nodesExpanded: 64, color: '#6B7280' },
    { algo: 'A* with this h', nodesExpanded: base[hMode], color: '#3B82F6' },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeuristicLab(): JSX.Element {
  const [goalRow, setGoalRow] = useState(7);
  const [goalCol, setGoalCol] = useState(7);
  const [hMode, setHMode] = useState<HeuristicMode>('sld');
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);

  const grid = useMemo(() => computeGrid(goalRow, goalCol), [goalRow, goalCol]);
  const info = MODE_INFO[hMode];
  const ebfData = useMemo(() => getEBFData(hMode), [hMode]);

  const maxSLD = Math.sqrt(2) * (GRID_SIZE - 1);
  const maxManhattan = 2 * (GRID_SIZE - 1);
  const maxVal = hMode === 'manhattan' ? maxManhattan : hMode === 'inadmissible' ? maxSLD * 1.5 : maxSLD;

  function getDisplayValue(cell: GridCell): number {
    if (hMode === 'sld') return cell.sld;
    if (hMode === 'manhattan') return cell.manhattan;
    return cell.inadmissible;
  }

  const CELL = 44;
  const GAP = 2;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB', padding: '20px' }}>
      {/* Heuristic selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Heuristic:</span>
        {(Object.keys(MODE_INFO) as HeuristicMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setHMode(mode)}
            aria-pressed={hMode === mode}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              background: hMode === mode
                ? mode === 'inadmissible' ? '#7F1D1D' : '#1E3A5F'
                : '#374151',
              color: hMode === mode
                ? mode === 'inadmissible' ? '#FCA5A5' : '#93C5FD'
                : '#9CA3AF',
              borderColor: hMode === mode
                ? mode === 'inadmissible' ? '#EF4444' : '#3B82F6'
                : 'rgba(255,255,255,0.15)',
            }}
          >
            {MODE_INFO[mode].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
        {/* Grid */}
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
            Click a cell to move the goal 🎯
          </div>
          <div
            role="grid"
            aria-label="Heuristic value grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL}px)`,
              gap: `${GAP}px`,
            }}
          >
            {grid.flat().map(cell => {
              const isGoal = cell.row === goalRow && cell.col === goalCol;
              const isHovered = hoveredCell?.r === cell.row && hoveredCell?.c === cell.col;
              const val = getDisplayValue(cell);
              const bg = isGoal ? '#064E3B' : heatColor(val, maxVal);
              const admissible = val <= cell.trueH + 0.1; // h(n) <= h*(n) approximately

              return (
                <button
                  key={`${cell.row}-${cell.col}`}
                  role="gridcell"
                  aria-label={`Row ${cell.row}, Col ${cell.col}: h=${val}${isGoal ? ' (goal)' : ''}`}
                  onClick={() => { setGoalRow(cell.row); setGoalCol(cell.col); }}
                  onMouseEnter={() => setHoveredCell({ r: cell.row, c: cell.col })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    width: `${CELL}px`, height: `${CELL}px`,
                    borderRadius: '4px',
                    border: isGoal ? '2px solid #10B981' : isHovered ? '2px solid #F59E0B' : '1px solid rgba(0,0,0,0.3)',
                    background: bg,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: isGoal ? '#6EE7B7' : '#fff',
                    fontSize: '10px',
                    fontWeight: isGoal ? 700 : 400,
                    padding: 0,
                    outline: hMode === 'inadmissible' && !admissible && !isGoal
                      ? '1px solid rgba(239,68,68,0.6)'
                      : 'none',
                  }}
                >
                  {isGoal ? '🎯' : val}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#6B7280' }}>
            Goal: ({goalRow},{goalCol}) &nbsp;|&nbsp; Start cell assumed at (0,0)
          </div>
          {hMode === 'inadmissible' && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#EF4444' }}>
              ⚠️ Red borders = inadmissible cells where h(n) {'>'} h*(n)
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Formula */}
          <div style={{ background: '#111118', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
              Heuristic Formula
            </div>
            <div
              style={{ fontSize: '14px', color: '#E5E7EB', marginBottom: '8px' }}
              dangerouslySetInnerHTML={{ __html: renderInlineMath(info.latex) }}
            />
            <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>{info.description}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px' }}>
                Admissible: <strong style={{ color: info.admissible ? '#10B981' : '#EF4444' }}>
                  {info.admissible ? '✅ Yes' : '❌ No'}
                </strong>
              </span>
              <span style={{ fontSize: '12px' }}>
                Consistent: <strong style={{ color: info.consistent ? '#10B981' : '#EF4444' }}>
                  {info.consistent ? '✅ Yes' : '❌ No'}
                </strong>
              </span>
            </div>
          </div>

          {/* Hovered cell info */}
          {hoveredCell && (
            <div style={{ background: '#111118', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
                Cell ({hoveredCell.r},{hoveredCell.c})
              </div>
              {(() => {
                const cell = grid[hoveredCell.r]?.[hoveredCell.c];
                if (!cell) return null;
                const val = getDisplayValue(cell);
                const isAdmissible = val <= cell.trueH + 0.01;
                return (
                  <div style={{ fontSize: '12px', lineHeight: 1.8, fontFamily: 'monospace' }}>
                    <div>h(n) = <strong style={{ color: '#F59E0B' }}>{val}</strong></div>
                    <div>h*(n) ≈ <strong style={{ color: '#10B981' }}>{cell.trueH}</strong> (Chebyshev)</div>
                    <div>SLD = <strong style={{ color: '#A5B4FC' }}>{cell.sld}</strong></div>
                    <div>Manhattan = <strong style={{ color: '#F9A8D4' }}>{cell.manhattan}</strong></div>
                    <div style={{ marginTop: '4px' }}>
                      Admissible? <strong style={{ color: isAdmissible ? '#10B981' : '#EF4444' }}>
                        {isAdmissible ? 'Yes' : 'No (overestimates!)'}
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Admissibility / Consistency definitions */}
          <div style={{ background: '#111118', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '10px' }}>
              Key Properties
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.8, color: '#D1D5DB' }}>
              <div>
                <strong style={{ color: '#10B981' }}>Admissible:</strong>{' '}
                <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n) \\leq h^*(n)') }} />
                {' '}— never overestimates
              </div>
              <div>
                <strong style={{ color: '#3B82F6' }}>Consistent:</strong>{' '}
                <span dangerouslySetInnerHTML={{ __html: renderInlineMath("h(n) \\leq c(n,a,n') + h(n')") }} />
                {' '}— triangle inequality
              </div>
              <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '11px' }}>
                Consistent ⟹ Admissible (but not vice versa)
              </div>
            </div>
          </div>

          {/* Effective branching factor visualization */}
          <div style={{ background: '#111118', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '10px' }}>
              Nodes Expanded (8×8 grid, approx.)
            </div>
            {ebfData.map(d => (
              <div key={d.algo} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '3px' }}>
                  {d.algo}: <strong style={{ color: '#E5E7EB' }}>{d.nodesExpanded}</strong>
                </div>
                <div style={{ height: '8px', background: '#1F2937', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px', background: d.color,
                    width: `${(d.nodesExpanded / 64) * 100}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B7280', lineHeight: 1.5 }}>
              Better heuristics reduce nodes expanded via higher{' '}
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n)') }} /> accuracy.
              {hMode === 'inadmissible' && (
                <span style={{ color: '#FCA5A5' }}>{' '}⚠️ Inadmissible h may expand fewer nodes but miss the optimal path!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dominance note */}
      <div style={{
        marginTop: '16px', background: '#0F172A',
        border: '1px solid #3B82F640',
        borderRadius: '10px', padding: '14px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#93C5FD', marginBottom: '6px' }}>
          💡 Heuristic Dominance
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
          If{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_2(n) \\geq h_1(n)') }} />
          {' '}for all n, then{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_2') }} />
          {' '}dominates{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_1') }} />.
          A* with{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_2') }} />
          {' '}will expand no more nodes than with{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_1') }} />
          {' '}(both admissible). Manhattan distance dominates SLD for 4-directional grids since{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_{Manhattan}(n) \\geq h_{SLD}(n)') }} />.
        </div>
      </div>
    </div>
  );
}
