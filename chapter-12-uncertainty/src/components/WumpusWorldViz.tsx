import React, { useState, useMemo } from 'react';
import { wumpusPitProbability } from '../algorithms/index';
import { renderInlineMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';
const GRID_SIZE = 4;
const PIT_PRIOR = 0.2;

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parseCellKey(key: string): [number, number] {
  const parts = key.split(',');
  return [Number(parts[0] ?? '0'), Number(parts[1] ?? '0')];
}

export default function WumpusWorldViz() {
  const [breezySquares, setBreezySquares] = useState<Set<string>>(new Set());
  const [safeSquares, setSafeSquares] = useState<Set<string>>(new Set(['1,1']));
  const [showProbs, setShowProbs] = useState(false);

  const allCells: Array<[number, number]> = [];
  for (let y = GRID_SIZE; y >= 1; y--) {
    for (let x = 1; x <= GRID_SIZE; x++) {
      allCells.push([x, y]);
    }
  }

  const querySquares = useMemo(() => {
    const qs: Array<readonly [number, number]> = [];
    for (let x = 1; x <= GRID_SIZE; x++) {
      for (let y = 1; y <= GRID_SIZE; y++) {
        if (!safeSquares.has(cellKey(x, y))) {
          qs.push([x, y] as const);
        }
      }
    }
    return qs;
  }, [safeSquares]);

  const knownSafe = useMemo(() =>
    Array.from(safeSquares).map(k => parseCellKey(k) as readonly [number, number]),
    [safeSquares]
  );

  const breezyArray = useMemo(() =>
    Array.from(breezySquares).map(k => parseCellKey(k) as readonly [number, number]),
    [breezySquares]
  );

  const pitProbs = useMemo(() =>
    wumpusPitProbability(GRID_SIZE, PIT_PRIOR, querySquares, knownSafe, breezyArray),
    [querySquares, knownSafe, breezyArray]
  );

  const handleCellClick = (x: number, y: number, shiftKey: boolean) => {
    const key = cellKey(x, y);
    if (key === '1,1') return; // Always safe, can't modify

    if (shiftKey) {
      setSafeSquares(prev => {
        const next = new Set(prev);
        if (next.has(key)) { next.delete(key); } else { next.add(key); }
        return next;
      });
      // Remove from breezy if making safe
      setBreezySquares(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      if (safeSquares.has(key)) return; // Can't mark safe cell as breezy
      setBreezySquares(prev => {
        const next = new Set(prev);
        if (next.has(key)) { next.delete(key); } else { next.add(key); }
        return next;
      });
    }
  };

  const handleBookExample = () => {
    setSafeSquares(new Set(['1,1', '1,2', '2,1']));
    setBreezySquares(new Set(['1,2', '2,1']));
  };

  const handleReset = () => {
    setSafeSquares(new Set(['1,1']));
    setBreezySquares(new Set());
  };

  const getCellBackground = (x: number, y: number): string => {
    const key = cellKey(x, y);
    if (safeSquares.has(key)) return 'rgba(16,185,129,0.2)';
    if (breezySquares.has(key)) return 'rgba(59,130,246,0.2)';
    const prob = pitProbs.get(key) ?? PIT_PRIOR;
    if (showProbs) {
      // Color interpolation: surface-2 → red based on probability
      const r = Math.round(36 + (239 - 36) * prob);
      const g = Math.round(36 + (68 - 36) * prob);
      const b = Math.round(48 + (68 - 48) * prob);
      return `rgb(${r},${g},${b})`;
    }
    return 'var(--surface-2)';
  };

  const getCellBorder = (x: number, y: number): string => {
    const key = cellKey(x, y);
    if (safeSquares.has(key)) return '1px solid rgba(16,185,129,0.5)';
    if (breezySquares.has(key)) return '1px solid rgba(59,130,246,0.5)';
    return '1px solid var(--surface-border)';
  };

  const getCellStatus = (x: number, y: number): string => {
    const key = cellKey(x, y);
    if (safeSquares.has(key)) return 'Safe';
    if (breezySquares.has(key)) return 'Breezy';
    const prob = pitProbs.get(key);
    return prob !== undefined ? `${(prob * 100).toFixed(0)}% pit` : 'Unknown';
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  return (
    <div role="region" aria-label="§12.7 Wumpus World Uncertainty" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.7 Wumpus World Uncertainty
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        Click cells to mark breeze, Shift+click to mark safe. See pit probabilities update.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={() => setShowProbs(p => !p)}
          aria-pressed={showProbs}
          aria-label="Toggle probability overlay"
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: `1px solid ${showProbs ? CHAPTER_COLOR : 'var(--surface-border)'}`,
            background: showProbs ? `rgba(236,72,153,0.15)` : 'var(--surface-3)',
            color: showProbs ? CHAPTER_COLOR : '#9CA3AF', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
          }}
        >
          {showProbs ? '🎯 Hide Probabilities' : '🎯 Show Probabilities'}
        </button>
        <button
          onClick={handleBookExample}
          aria-label="Load book example"
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-3)', color: '#E5E7EB', cursor: 'pointer', fontSize: '13px' }}
        >
          📖 Book Example
        </button>
        <button
          onClick={handleReset}
          aria-label="Reset grid"
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-3)', color: '#E5E7EB', cursor: 'pointer', fontSize: '13px' }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Grid */}
      <div style={cardStyle}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: '6px',
          maxWidth: '400px',
          margin: '0 auto',
        }} role="grid" aria-label="4x4 Wumpus World grid">
          {allCells.map(([x, y]) => {
            const key = cellKey(x, y);
            const isSafe = safeSquares.has(key);
            const isBreezy = breezySquares.has(key);
            const prob = pitProbs.get(key);
            const isStart = key === '1,1';

            return (
              <div
                key={key}
                role="gridcell"
                tabIndex={0}
                aria-label={`Square [${x},${y}]: ${getCellStatus(x, y)}`}
                onClick={e => handleCellClick(x, y, e.shiftKey)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') handleCellClick(x, y, e.shiftKey);
                }}
                style={{
                  aspectRatio: '1',
                  borderRadius: '8px',
                  background: getCellBackground(x, y),
                  border: getCellBorder(x, y),
                  cursor: key === '1,1' ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  transition: 'background 0.2s',
                  userSelect: 'none',
                  minHeight: '70px',
                }}
              >
                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>[{x},{y}]</div>
                {isStart && <div style={{ fontSize: '14px' }}>🤖</div>}
                {isSafe && !isStart && <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>✓ Safe</div>}
                {isBreezy && <div style={{ fontSize: '13px' }}>💨</div>}
                {showProbs && !isSafe && prob !== undefined && (
                  <div style={{ fontSize: '11px', color: prob > 0.5 ? '#EF4444' : prob > 0.2 ? '#F59E0B' : '#9CA3AF', fontWeight: 700 }}>
                    {(prob * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', justifyContent: 'center', fontSize: '12px', color: '#9CA3AF' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', display: 'inline-block' }} />
            Safe
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.5)', display: 'inline-block' }} />
            Breezy
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(239,68,68,0.4)', display: 'inline-block' }} />
            High P(pit)
          </span>
          <span>Click: breeze | Shift+click: safe</span>
        </div>
      </div>

      {/* Probability color scale */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Probability Color Scale</h3>
        <div style={{ height: '16px', borderRadius: '8px', background: 'linear-gradient(to right, #1a1a24, #ef4444)', marginBottom: '6px' }} aria-hidden="true" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
          {['0%', '25%', '50%', '75%', '100%'].map(v => <span key={v}>{v}</span>)}
        </div>
      </div>

      {/* Info panel */}
      <div style={{ ...cardStyle, background: 'var(--surface-3)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#E5E7EB' }}>About the Wumpus World</h3>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
          Cells adjacent to a pit show a breeze. P(pit) is computed by frontier enumeration: all configurations
          of pits on frontier squares consistent with breeze observations are enumerated, weighted by their prior
          probability, and normalized to give posterior pit probabilities.
        </p>
        <div style={{ marginTop: '10px', fontSize: '13px' }}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\text{Prior: } P(\\text{pit}) = 0.2 \\text{ per non-start cell}') }} />
        </div>
      </div>
    </div>
  );
}
