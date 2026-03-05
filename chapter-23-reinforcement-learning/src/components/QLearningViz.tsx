/**
 * QLearningViz — §23.3.3
 *
 * Detailed Q-table heatmap + policy arrows.
 * User can tune α, γ, R⁺, Nₑ and watch convergence.
 */
import React, { useState } from 'react';
import katex from 'katex';
import {
  createGridWorld,
  runQLearning,
  type GridAction,
  type State,
} from '../algorithms/index';

const CC = '#10B981';
const ACTIONS: GridAction[] = ['up', 'down', 'left', 'right'];
const ARROW_CHAR: Record<GridAction, string> = {
  up: '↑', down: '↓', left: '←', right: '→',
};

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

function heatColor(v: number, lo: number, hi: number): string {
  const t = hi === lo ? 0.5 : Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const r = Math.round(180 * (1 - t));
  const g = Math.round(180 * t + 40);
  const b = 80;
  return `rgba(${r},${g},${b},0.85)`;
}

export default function QLearningViz() {
  const [gamma, setGamma] = useState(0.9);
  const [rplus, setRplus] = useState(2.0);
  const [ne, setNe] = useState(5);
  const [episodes, setEpisodes] = useState(200);
  const [stepIdx, setStepIdx] = useState(199);
  const [selectedState, setSelectedState] = useState<State | null>(null);

  const gw = createGridWorld();
  const history = runQLearning(gw, episodes, gamma, rplus, ne, 42);
  const current = history[Math.min(stepIdx, history.length - 1)]!;
  const qTable = current.qTable;
  const policy = current.policy;
  const counts = current.explorationCounts;

  // Value range
  const allQ: number[] = [];
  for (const [, m] of qTable) for (const [, v] of m) allQ.push(v);
  const lo = allQ.length ? Math.min(...allQ) : -1;
  const hi = allQ.length ? Math.max(...allQ) : 1;

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ROWS = 3; const COLS = 4;
  const validStates: State[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s: State = `${r},${c}`;
      if (!gw.walls.has(s)) validStates.push(s);
    }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
    borderRadius: 8, padding: 12,
  };
  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    color: 'white', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Exploration function:&nbsp;
        <span dangerouslySetInnerHTML={latex('f(u,n)=R^+ \\text{ if } n<N_e \\text{ else } u')} />
      </div>

      {/* Parameter controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: `γ = ${gamma.toFixed(2)}`, min: 0, max: 1, step: 0.05, val: gamma, set: (v: number) => setGamma(v) },
          { label: `R⁺ = ${rplus.toFixed(1)}`, min: 0.1, max: 5, step: 0.1, val: rplus, set: (v: number) => setRplus(v) },
          { label: `Nₑ = ${ne}`, min: 0, max: 20, step: 1, val: ne, set: (v: number) => setNe(v) },
        ].map(({ label, min, max, step, val, set }) => (
          <label key={label} style={{ fontSize: 12, color: '#9CA3AF', minWidth: 140 }}>
            {label}
            <input type="range" min={min} max={max} step={step} value={val}
                   onChange={e => set(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label={label} />
          </label>
        ))}
        <label style={{ fontSize: 12, color: '#9CA3AF', minWidth: 140 }}>
          Episodes: {episodes}
          <input type="range" min={10} max={500} step={10} value={episodes}
                 onChange={e => { setEpisodes(Number(e.target.value)); setStepIdx(Number(e.target.value) - 1); }}
                 style={{ display: 'block', width: '100%' }} aria-label="Episodes" />
        </label>
        <label style={{ fontSize: 12, color: '#9CA3AF', minWidth: 140 }}>
          Show episode: {stepIdx + 1}
          <input type="range" min={0} max={history.length - 1} value={stepIdx}
                 onChange={e => setStepIdx(Number(e.target.value))}
                 style={{ display: 'block', width: '100%' }} aria-label="Episode" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Q-table grid */}
        <div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Click a cell to inspect Q-values
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 80px)`,
                        gap: 2, fontFamily: 'monospace' }}
               role="grid" aria-label="Q-value table">
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const s: State = `${r},${c}`;
                if (gw.walls.has(s)) {
                  return (
                    <div key={s} role="gridcell"
                         style={{ width: 80, height: 80, background: '#333',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, color: '#666', borderRadius: 4 }}>
                      WALL
                    </div>
                  );
                }
                const terminal = gw.terminals.get(s);
                if (terminal !== undefined) {
                  return (
                    <div key={s} role="gridcell"
                         style={{ width: 80, height: 80, background: terminal > 0 ? '#065f46' : '#7f1d1d',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 14, fontWeight: 700, color: 'white', borderRadius: 4 }}>
                      {terminal > 0 ? '+1' : '−1'}
                    </div>
                  );
                }
                const bestA = policy.get(s) ?? 'up';
                const bestQ = qTable.get(s)?.get(bestA) ?? 0;
                const bg = prefersReduced ? '#242430' : heatColor(bestQ, lo, hi);
                const isSelected = selectedState === s;
                return (
                  <button key={s} role="gridcell"
                          onClick={() => setSelectedState(isSelected ? null : s)}
                          aria-pressed={isSelected}
                          aria-label={`State ${s}, best action ${bestA}, Q=${bestQ.toFixed(3)}`}
                          style={{ width: 80, height: 80, background: bg,
                                   border: isSelected ? `2px solid ${CC}` : '1px solid #444',
                                   borderRadius: 4, cursor: 'pointer', color: 'white',
                                   display: 'flex', flexDirection: 'column',
                                   alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontSize: 9, color: '#ccc' }}>{s}</span>
                    <span style={{ fontSize: 20 }}>{ARROW_CHAR[bestA]}</span>
                    <span style={{ fontSize: 10 }}>{bestQ.toFixed(2)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedState && (
            <div style={cardStyle}>
              <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 8 }}>
                Q-VALUES — state {selectedState}
              </div>
              {ACTIONS.map(a => {
                const q = qTable.get(selectedState)?.get(a) ?? 0;
                const n = counts.get(selectedState)?.get(a) ?? 0;
                const isBest = policy.get(selectedState) === a;
                return (
                  <div key={a} style={{ display: 'flex', justifyContent: 'space-between',
                                        marginBottom: 4, color: isBest ? CC : '#9CA3AF',
                                        fontFamily: 'monospace', fontSize: 12 }}>
                    <span>{ARROW_CHAR[a]} {a}</span>
                    <span>Q={q.toFixed(3)} N={n}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={cardStyle} role="region" aria-label="Episode summary">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              EPISODE {stepIdx + 1} SUMMARY
            </div>
            <div style={{ fontSize: 11, color: '#D1D5DB' }}>
              <div>Total reward: {current.totalReward.toFixed(3)}</div>
              <div>States in Q-table: {current.qTable.size}</div>
            </div>
          </div>

          {/* Heat-map legend */}
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            <div>Heat-map: max Q per state</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
              <div style={{ width: 80, height: 10, background: 'linear-gradient(to right, #b40000, #40b440)', borderRadius: 4 }} />
              <span>{lo.toFixed(2)} → {hi.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reward history mini chart */}
      <div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
          Total reward per episode
        </div>
        <svg viewBox={`0 0 400 60`} style={{ width: '100%', maxWidth: 400 }}
             role="img" aria-label="Reward history">
          {!prefersReduced && (() => {
            const rewards = history.map(h => h.totalReward);
            const minR = Math.min(...rewards);
            const maxR = Math.max(...rewards);
            const range = maxR - minR || 1;
            const pts = rewards.map((r, i) => {
              const x = (i / Math.max(1, rewards.length - 1)) * 380 + 10;
              const y = 50 - ((r - minR) / range) * 40;
              return `${x},${y}`;
            }).join(' ');
            return (
              <>
                <polyline points={pts} fill="none" stroke={CC} strokeWidth={1} opacity={0.7} />
                <line x1={10 + (stepIdx / Math.max(1, history.length - 1)) * 380}
                      y1={5} x2={10 + (stepIdx / Math.max(1, history.length - 1)) * 380}
                      y2={55} stroke="white" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5} />
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
