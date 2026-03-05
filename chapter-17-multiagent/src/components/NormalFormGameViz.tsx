import React, { useState, useCallback } from 'react';
import {
  findPureNashEquilibria, findDominantStrategies, computeSocialWelfare,
  isOutcomeParetoOptimal, findNashEquilibria2x2,
  type PayoffMatrix, type NashEquilibrium
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

type Payoffs2x2 = [
  [[number, number], [number, number]],
  [[number, number], [number, number]]
];

const PRESETS: Record<string, Payoffs2x2> = {
  "Prisoner's Dilemma": [[[1, 1], [5, 0]], [[0, 5], [3, 3]]],
  "Matching Pennies": [[[1, -1], [-1, 1]], [[-1, 1], [1, -1]]],
  "Coordination Game": [[[2, 2], [0, 0]], [[0, 0], [1, 1]]],
  "Battle of Sexes": [[[3, 2], [0, 0]], [[0, 0], [2, 3]]],
};

function matrixToPayoffMatrix(m: Payoffs2x2): PayoffMatrix {
  return m.map(row => row.map(cell => [cell[0], cell[1]] as readonly [number, number]));
}

export default function NormalFormGameViz() {
  const [preset, setPreset] = useState<string>("Prisoner's Dilemma");
  const [payoffs, setPayoffs] = useState<Payoffs2x2>(PRESETS["Prisoner's Dilemma"]!);
  const [selected, setSelected] = useState<readonly [number, number] | null>(null);

  const pm: PayoffMatrix = matrixToPayoffMatrix(payoffs);
  const nashPure = findPureNashEquilibria(pm);
  const nashAll: ReadonlyArray<NashEquilibrium> = findNashEquilibria2x2(pm);
  const dominant = findDominantStrategies(pm);

  const welfare = selected != null ? computeSocialWelfare(pm, selected[0], selected[1]) : null;
  const selectedPareto = selected != null ? isOutcomeParetoOptimal(pm, selected[0], selected[1]) : null;

  const isNash = useCallback((r: number, c: number) =>
    nashPure.some(ne => ne[0] === r && ne[1] === c), [nashPure]);

  const isParetoOptimal = useCallback((r: number, c: number) =>
    isOutcomeParetoOptimal(pm, r, c), [pm]);

  const handlePreset = (name: string) => {
    setPreset(name);
    setPayoffs(PRESETS[name]!);
    setSelected(null);
  };

  const handleCellEdit = (row: number, col: number, player: 0 | 1, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const next: Payoffs2x2 = [
      [[payoffs[0]![0]![0], payoffs[0]![0]![1]], [payoffs[0]![1]![0], payoffs[0]![1]![1]]],
      [[payoffs[1]![0]![0], payoffs[1]![0]![1]], [payoffs[1]![1]![0], payoffs[1]![1]![1]]],
    ];
    next[row]![col]![player] = n;
    setPayoffs(next);
    setSelected(null);
  };

  const mixedNash = nashAll.find(ne => ne.type === 'mixed');

  const a = payoffs[0]![0]![0];
  const b = payoffs[0]![1]![0];
  const c = payoffs[1]![0]![0];
  const d = payoffs[1]![1]![0];

  return (
    <div style={cardStyle} role="region" aria-label="Normal-Form Game Visualization">
      <h3 style={sectionHeadStyle}>Normal-Form Game</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Click a cell to inspect social welfare. Highlighted cells are Nash equilibria.
      </p>

      {/* Preset selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {Object.keys(PRESETS).map(name => (
          <button
            key={name}
            style={btnStyle(preset === name)}
            onClick={() => handlePreset(name)}
            aria-pressed={preset === name}
            aria-label={`Load ${name} preset`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Matrix */}
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '300px' }} aria-label="Payoff matrix">
          <thead>
            <tr>
              <th style={{ padding: '8px 16px', color: '#9CA3AF', fontWeight: 500 }}></th>
              <th style={{ padding: '8px 16px', color: '#9CA3AF', fontWeight: 500 }}>Col 0</th>
              <th style={{ padding: '8px 16px', color: '#9CA3AF', fontWeight: 500 }}>Col 1</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1].map(r => (
              <tr key={r}>
                <td style={{ padding: '8px 16px', color: '#9CA3AF', fontWeight: 500 }}>Row {r}</td>
                {[0, 1].map(c => {
                  const nash = isNash(r, c);
                  const pareto = isParetoOptimal(r, c);
                  const sel = selected?.[0] === r && selected?.[1] === c;
                  return (
                    <td
                      key={c}
                      style={{
                        padding: '8px',
                        border: nash
                          ? `2px solid ${CHAPTER_COLOR}`
                          : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        background: sel
                          ? `${CHAPTER_COLOR}30`
                          : pareto
                            ? 'rgba(16,185,129,0.08)'
                            : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        minWidth: '100px',
                        position: 'relative',
                      }}
                      onClick={() => setSelected([r, c])}
                      role="button"
                      aria-label={`Cell Row ${r} Col ${c}: payoffs (${payoffs[r]![c]![0]}, ${payoffs[r]![c]![1]})${nash ? ' — Nash equilibrium' : ''}${pareto ? ' — Pareto optimal' : ''}`}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelected([r, c])}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                        ({payoffs[r]![c]![0]}, {payoffs[r]![c]![1]})
                      </div>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {[0, 1].map(p => (
                          <input
                            key={p}
                            type="number"
                            value={payoffs[r]![c]![p]}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              handleCellEdit(r, c, p as 0 | 1, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '40px',
                              background: '#0A0A0F',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: p === 0 ? '#60A5FA' : '#F59E0B',
                              fontSize: '12px',
                              padding: '2px 4px',
                              textAlign: 'center',
                            }}
                            aria-label={`${p === 0 ? 'Row' : 'Col'} player payoff at row ${r} col ${c}`}
                          />
                        ))}
                      </div>
                      {nash && (
                        <div style={{ fontSize: '10px', color: CHAPTER_COLOR, marginTop: '2px' }}>★ NE</div>
                      )}
                      {pareto && !nash && (
                        <div style={{ fontSize: '10px', color: '#10B981', marginTop: '2px' }}>◆ PO</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px' }}>
        <span style={{ color: CHAPTER_COLOR }}>★ Nash Equilibrium</span>
        <span style={{ color: '#10B981' }}>◆ Pareto Optimal</span>
        <span style={{ color: '#60A5FA' }}>Blue = Row payoff</span>
        <span style={{ color: '#F59E0B' }}>Amber = Col payoff</span>
      </div>

      {/* Dominant strategies */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
        <strong style={{ color: 'white' }}>Dominant Strategies: </strong>
        <span style={{ color: '#9CA3AF' }}>
          Row strictly dominant: {dominant.rowDominant !== null ? `Action ${dominant.rowDominant}` : 'none'} |{' '}
          Col strictly dominant: {dominant.colDominant !== null ? `Action ${dominant.colDominant}` : 'none'} |{' '}
          Row weakly dominant: {dominant.rowWeaklyDominant !== null ? `Action ${dominant.rowWeaklyDominant}` : 'none'} |{' '}
          Col weakly dominant: {dominant.colWeaklyDominant !== null ? `Action ${dominant.colWeaklyDominant}` : 'none'}
        </span>
      </div>

      {/* Nash info */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
        <strong style={{ color: 'white' }}>Pure Nash Equilibria: </strong>
        <span style={{ color: '#9CA3AF' }}>
          {nashPure.length === 0 ? 'None' : nashPure.map(ne => `(Row ${ne[0]}, Col ${ne[1]})`).join(', ')}
        </span>
        {mixedNash && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ color: 'white' }}>Mixed Strategy NE: </strong>
            <div
              dangerouslySetInnerHTML={{
                __html: renderDisplayMath(
                  `p^* = \\frac{d - b}{a - b - c + d} = \\frac{${d} - ${b}}{${a} - ${b} - ${c} + ${d}} \\approx ${mixedNash.rowMixed[0].toFixed(3)}`
                )
              }}
              style={{ marginTop: '4px' }}
              aria-label={`Mixed strategy Nash: p star equals ${mixedNash.rowMixed[0].toFixed(3)}`}
            />
            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Row plays action 0 with p={mixedNash.rowMixed[0].toFixed(3)},
              Col plays action 0 with q={mixedNash.colMixed[0].toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Selected cell info */}
      {selected != null && welfare != null && (
        <div style={{ background: `${CHAPTER_COLOR}10`, border: `1px solid ${CHAPTER_COLOR}40`, borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
          <strong style={{ color: CHAPTER_COLOR }}>Selected: Row {selected[0]}, Col {selected[1]}</strong>
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Utilitarian Welfare</div>
              <div style={{ color: 'white', fontWeight: 600 }}>{welfare.utilitarian.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Egalitarian Welfare</div>
              <div style={{ color: 'white', fontWeight: 600 }}>{welfare.egalitarian.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Pareto Optimal</div>
              <div style={{ color: selectedPareto ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {selectedPareto ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span
              dangerouslySetInnerHTML={{
                __html: renderInlineMath(`W_{util} = u_1 + u_2 = ${payoffs[selected[0]]![selected[1]]![0]} + ${payoffs[selected[0]]![selected[1]]![1]} = ${welfare.utilitarian}`)
              }}
              aria-label={`Utilitarian welfare equals ${welfare.utilitarian}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
