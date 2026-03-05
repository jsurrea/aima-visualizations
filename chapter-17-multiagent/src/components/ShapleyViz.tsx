import React, { useState, useCallback, useMemo } from 'react';
import {
  computeShapleyValue, checkCore, isSuperadditive,
  findOptimalCoalitionStructure, coalitionStructureWelfare
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';

const btnStyle = (active = false): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: active ? CHAPTER_COLOR : '#1A1A24',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
});

const cardStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'white',
  marginBottom: '8px',
};

function coalitionKey(coalition: readonly number[]): string {
  return [...coalition].sort((a, b) => a - b).join(',');
}

function allSubsets(players: readonly number[]): number[][] {
  const result: number[][] = [];
  for (let mask = 1; mask < (1 << players.length); mask++) {
    const subset: number[] = [];
    for (let i = 0; i < players.length; i++) {
      if (mask & (1 << i)) subset.push(players[i]!);
    }
    result.push(subset);
  }
  return result;
}

const DEFAULT_3: Record<string, number> = {
  '0': 1, '1': 2, '2': 1,
  '0,1': 4, '0,2': 3, '1,2': 4,
  '0,1,2': 6,
};
const DEFAULT_4: Record<string, number> = {
  '0': 1, '1': 2, '2': 1, '3': 1,
  '0,1': 3, '0,2': 3, '0,3': 3, '1,2': 3, '1,3': 3, '2,3': 3,
  '0,1,2': 5, '0,1,3': 5, '0,2,3': 5, '1,2,3': 5,
  '0,1,2,3': 8,
};

export default function ShapleyViz() {
  const [numPlayers, setNumPlayers] = useState<3 | 4>(3);
  const [charFnValues, setCharFnValues] = useState<Map<string, number>>(new Map(Object.entries(DEFAULT_3)));

  const players = useMemo(() =>
    Array.from({ length: numPlayers }, (_, i) => i),
    [numPlayers]);

  const subsets = useMemo(() => allSubsets(players), [players]);

  const handlePlayerCount = (n: 3 | 4) => {
    setNumPlayers(n);
    setCharFnValues(new Map(Object.entries(n === 3 ? DEFAULT_3 : DEFAULT_4)));
  };

  const charFn = useCallback((coalition: readonly number[]) => {
    const key = coalitionKey(coalition);
    return charFnValues.get(key) ?? 0;
  }, [charFnValues]);

  const shapleyValues = useMemo(() =>
    computeShapleyValue(players, charFn), [players, charFn]);

  const superadditive = useMemo(() =>
    isSuperadditive(players, charFn), [players, charFn]);

  const optStruct = useMemo(() =>
    findOptimalCoalitionStructure(players, charFn), [players, charFn]);

  const coreCheck = useMemo(() => {
    const imp = shapleyValues as ReadonlyMap<number, number>;
    return checkCore(players, charFn, imp);
  }, [players, charFn, shapleyValues]);

  const totalShapley = useMemo(() =>
    players.reduce((s, p) => s + (shapleyValues.get(p) ?? 0), 0), [players, shapleyValues]);

  const handleCharFnChange = (key: string, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    setCharFnValues(prev => {
      const next = new Map(prev);
      next.set(key, n);
      return next;
    });
  };

  const playerLabels = ['P1', 'P2', 'P3', 'P4'];
  const maxShapley = Math.max(...players.map(p => shapleyValues.get(p) ?? 0), 0.1);

  const svgPositions: readonly [number, number][] = numPlayers === 3
    ? [[100, 40], [30, 160], [170, 160]]
    : [[80, 40], [160, 40], [30, 140], [210, 140]];

  return (
    <div style={cardStyle} role="region" aria-label="Shapley Value Visualization">
      <h3 style={sectionHeadStyle}>Cooperative Games &amp; Shapley Value</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Define a characteristic function and compute the Shapley value — the fair allocation of coalition surplus.
      </p>

      {/* Player count toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button style={btnStyle(numPlayers === 3)} onClick={() => handlePlayerCount(3)} aria-pressed={numPlayers === 3} aria-label="3 players">
          3 Players
        </button>
        <button style={btnStyle(numPlayers === 4)} onClick={() => handlePlayerCount(4)} aria-pressed={numPlayers === 4} aria-label="4 players">
          4 Players
        </button>
      </div>

      {/* Characteristic function editor */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Characteristic Function v(S)</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
          {subsets.map(subset => {
            const key = coalitionKey(subset);
            const label = '{' + subset.map(p => playerLabels[p]).join(',') + '}';
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label htmlFor={`cf-${key}`} style={{ color: '#9CA3AF', fontSize: '12px', minWidth: '60px' }}>
                  v({label}):
                </label>
                <input
                  id={`cf-${key}`}
                  type="number"
                  value={charFnValues.get(key) ?? 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleCharFnChange(key, e.target.value)}
                  style={{
                    width: '52px',
                    background: '#0A0A0F',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '12px',
                    padding: '3px 6px',
                    textAlign: 'center',
                  }}
                  aria-label={`Characteristic function value for coalition ${label}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG visualization */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'flex-start' }}>
        <svg
          width={numPlayers === 3 ? 200 : 240}
          height={200}
          aria-label="Player coalition diagram"
          role="img"
          style={{ flexShrink: 0 }}
        >
          {svgPositions.map(([cx, cy], i) => {
            const shapVal = shapleyValues.get(i) ?? 0;
            const radius = 18 + 20 * (shapVal / maxShapley);
            const opacity = 0.3 + 0.5 * (shapVal / maxShapley);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={CHAPTER_COLOR}
                  fillOpacity={opacity}
                  stroke={CHAPTER_COLOR}
                  strokeWidth={2}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                >
                  {playerLabels[i]}
                </text>
                <text
                  x={cx}
                  y={cy + radius + 14}
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize="11"
                >
                  {shapVal.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Shapley values */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <strong style={{ color: 'white', fontSize: '14px' }}>Shapley Values</strong>
          <div style={{ marginTop: '8px' }}>
            {players.map(p => {
              const sv = shapleyValues.get(p) ?? 0;
              const pct = totalShapley > 0 ? sv / totalShapley : 0;
              return (
                <div key={p} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                    <span style={{ color: 'white' }}>{playerLabels[p]}</span>
                    <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>{sv.toFixed(3)}</span>
                  </div>
                  <div style={{ background: '#0A0A0F', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: CHAPTER_COLOR, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#9CA3AF' }}>
              Total: <span style={{ color: 'white' }}>{totalShapley.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shapley formula */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <div
          dangerouslySetInnerHTML={{
            __html: renderDisplayMath(
              `\\phi_i(v) = \\sum_{S \\subseteq N \\setminus \\{i\\}} \\frac{|S|!(|N|-|S|-1)!}{|N|!} [v(S \\cup \\{i\\}) - v(S)]`
            )
          }}
          aria-label="Shapley value formula"
        />
      </div>

      {/* Properties */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', flex: 1, minWidth: '160px', fontSize: '13px' }}>
          <strong style={{ color: 'white' }}>Superadditive</strong>
          <div style={{ color: superadditive ? '#10B981' : '#EF4444', marginTop: '4px', fontWeight: 600 }}>
            {superadditive ? '✓ Yes' : '✗ No'}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
            v(S∪T) ≥ v(S)+v(T) for disjoint S,T
          </div>
        </div>
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', flex: 1, minWidth: '160px', fontSize: '13px' }}>
          <strong style={{ color: 'white' }}>Core Stability</strong>
          <div style={{ color: coreCheck.inCore ? '#10B981' : '#F59E0B', marginTop: '4px', fontWeight: 600 }}>
            {coreCheck.inCore ? '✓ Shapley in core' : '⚠ Blocking coalitions exist'}
          </div>
          {!coreCheck.inCore && coreCheck.blockingCoalitions.length > 0 && (
            <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
              Blocking: {coreCheck.blockingCoalitions.map(bc =>
                '{' + bc.map(p => playerLabels[p]).join(',') + '}'
              ).join(', ')}
            </div>
          )}
        </div>
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', flex: 1, minWidth: '160px', fontSize: '13px' }}>
          <strong style={{ color: 'white' }}>Optimal Coalition Structure</strong>
          <div style={{ color: '#60A5FA', marginTop: '4px' }}>
            {optStruct.structure.map(cs =>
              '{' + cs.map(p => playerLabels[p]).join(',') + '}'
            ).join(' ∪ ')}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
            Welfare: {optStruct.welfare.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Efficiency check */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
        <span
          dangerouslySetInnerHTML={{
            __html: renderInlineMath(`\\sum_{i} \\phi_i = ${totalShapley.toFixed(3)} \\quad v(N) = ${charFnValues.get(coalitionKey(players)) ?? 0}`)
          }}
          aria-label={`Sum of Shapley values equals ${totalShapley.toFixed(3)}, grand coalition value is ${charFnValues.get(coalitionKey(players)) ?? 0}`}
        />
        <span style={{ color: '#9CA3AF', marginLeft: '12px', fontSize: '12px' }}>
          (Efficiency: Shapley sums to grand coalition value)
        </span>
      </div>
    </div>
  );
}
