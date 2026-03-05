/**
 * PolicyGradientViz — §23.5
 *
 * Shows softmax policy probabilities for each grid state and demonstrates
 * how the REINFORCE gradient update shifts action probabilities.
 */
import React, { useState } from 'react';
import katex from 'katex';
import {
  createGridWorld,
  runQLearning,
  softmaxPolicy,
  reinforceUpdate,
  type GridAction,
  type State,
} from '../algorithms/index';

const CC = '#10B981';
const ACTIONS: GridAction[] = ['up', 'down', 'left', 'right'];
const ARROW_CHAR: Record<GridAction, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const ACTION_COLORS: Record<GridAction, string> = {
  up: '#6366F1', down: '#F59E0B', left: '#EC4899', right: CC,
};

const GW = createGridWorld();
const ROWS = 3; const COLS = 4;

// Build initial Q-values from Q-learning
const QL_HISTORY = runQLearning(GW, 200, 0.9, 2.0, 5, 42);
const BASE_Q = QL_HISTORY[QL_HISTORY.length - 1]!.qTable;

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

function makeTheta(qTable: typeof BASE_Q): number[] {
  // Flatten Q-table into a parameter vector: [Q(s0,a0), Q(s0,a1), ..., Q(sN,aN)]
  const states: State[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s: State = `${r},${c}`;
      if (!GW.walls.has(s) && !GW.terminals.has(s)) states.push(s);
    }
  const theta: number[] = [];
  for (const s of states) {
    for (const a of ACTIONS) theta.push(qTable.get(s)?.get(a) ?? 0);
  }
  return theta;
}

const INIT_THETA = makeTheta(BASE_Q);

export default function PolicyGradientViz() {
  const [beta, setBeta] = useState(3.0);
  const [alpha, setAlpha] = useState(0.01);
  const [selectedState, setSelectedState] = useState<State>('2,0');
  const [theta, setTheta] = useState(INIT_THETA);
  const [reinHistory, setReinHistory] = useState<string[]>([]);

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const validNonTerminal: State[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s: State = `${r},${c}`;
      if (!GW.walls.has(s) && !GW.terminals.has(s)) validNonTerminal.push(s);
    }

  function getQForState(s: State): ReadonlyMap<GridAction, number> {
    const idx = validNonTerminal.indexOf(s);
    if (idx < 0) return new Map();
    const offset = idx * ACTIONS.length;
    const m = new Map<GridAction, number>();
    ACTIONS.forEach((a, i) => m.set(a, theta[offset + i] ?? 0));
    return m;
  }

  const selQVals = getQForState(selectedState);
  const selProbs = softmaxPolicy(selQVals, beta);

  // REINFORCE: simulate one-step trajectory from selectedState → right
  function doReinforce(actionTaken: GridAction) {
    const idx = validNonTerminal.indexOf(selectedState);
    if (idx < 0) return;
    const offset = idx * ACTIONS.length;
    // Feature matrix for this state: each action has a one-hot feature + Q-value
    const feats = ACTIONS.map((a, ai) => {
      const f = new Array(ACTIONS.length * 2).fill(0);
      f[ai] = 1;                           // one-hot action
      f[ACTIONS.length + ai] = theta[offset + ai] ?? 0; // Q-value feature
      return f;
    });
    const actionIdx = ACTIONS.indexOf(actionTaken);
    const probs = ACTIONS.map(a => selProbs.get(a) ?? 0);
    // Simulated return: positive if heading toward +1 terminal
    const totalReward = actionTaken === 'right' || actionTaken === 'up' ? 0.5 : -0.5;
    const sliceTheta = Array.from({ length: feats[0]!.length }, (_, i) =>
      theta[offset + (i % ACTIONS.length)] ?? 0
    );
    const newSlice = reinforceUpdate(sliceTheta, feats, actionIdx, probs, totalReward, alpha);
    const newTheta = [...theta];
    for (let i = 0; i < ACTIONS.length; i++) {
      newTheta[offset + i] = newSlice[i % ACTIONS.length] ?? theta[offset + i]!;
    }
    setTheta(newTheta);
    setReinHistory(h => [
      ...h.slice(-4),
      `REINFORCE: s=${selectedState} a=${actionTaken} G=${totalReward > 0 ? '+' : ''}${totalReward}`,
    ]);
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    color: 'white', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Softmax policy:&nbsp;
        <span dangerouslySetInnerHTML={latex('\\pi(a|s)=\\frac{\\exp(\\beta Q(s,a))}{\\sum_{a\'} \\exp(\\beta Q(s,a\'))}')} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* State selector grid */}
        <div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
            Select state to inspect
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 64px)`, gap: 2 }}>
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const s: State = `${r},${c}`;
                if (GW.walls.has(s)) {
                  return <div key={s} style={{ width: 64, height: 50, background: '#333',
                                               borderRadius: 4, display: 'flex', alignItems: 'center',
                                               justifyContent: 'center', fontSize: 9, color: '#555' }}>WALL</div>;
                }
                if (GW.terminals.has(s)) {
                  const v = GW.terminals.get(s)!;
                  return <div key={s} style={{ width: 64, height: 50, borderRadius: 4,
                                               background: v > 0 ? '#065f46' : '#7f1d1d',
                                               display: 'flex', alignItems: 'center',
                                               justifyContent: 'center', fontSize: 14,
                                               fontWeight: 700, color: 'white' }}>
                    {v > 0 ? '+1' : '−1'}
                  </div>;
                }
                const probs = softmaxPolicy(getQForState(s), beta);
                const bestA = ACTIONS.reduce((b, a) =>
                  (probs.get(a) ?? 0) > (probs.get(b) ?? 0) ? a : b, 'up' as GridAction);
                const isSelected = selectedState === s;
                return (
                  <button key={s} onClick={() => setSelectedState(s)}
                          aria-pressed={isSelected} aria-label={`Select state ${s}`}
                          style={{ width: 64, height: 50, borderRadius: 4, cursor: 'pointer',
                                   border: isSelected ? `2px solid ${CC}` : '1px solid #444',
                                   background: isSelected ? '#1a2e27' : 'var(--surface-3)',
                                   color: 'white', display: 'flex', flexDirection: 'column',
                                   alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <span style={{ fontSize: 8, color: '#9CA3AF' }}>{s}</span>
                    <span style={{ fontSize: 18, color: ACTION_COLORS[bestA] }}>{ARROW_CHAR[bestA]}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Probability bar chart for selected state */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            π(·|{selectedState}) with β={beta.toFixed(1)}
          </div>
          {ACTIONS.map(a => {
            const p = selProbs.get(a) ?? 0;
            return (
              <div key={a} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: ACTION_COLORS[a] }}>{ARROW_CHAR[a]} {a}</span>
                  <span style={{ color: '#D1D5DB' }}>{(p * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: 14, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  {!prefersReduced && (
                    <div style={{ height: '100%', width: `${p * 100}%`,
                                  background: ACTION_COLORS[a], borderRadius: 4,
                                  transition: 'width 0.3s ease' }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button style={btnStyle}
                          aria-label={`Apply REINFORCE update taking action ${a}`}
                          onClick={() => doReinforce(a)}>
                    REINFORCE with {ARROW_CHAR[a]}
                  </button>
                </div>
              </div>
            );
          })}

          <label style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, display: 'block' }}>
            β (temperature): {beta.toFixed(1)}
            <input type="range" min={0.1} max={20} step={0.1} value={beta}
                   onChange={e => setBeta(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Temperature" />
          </label>
          <label style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, display: 'block' }}>
            α (step size): {alpha.toFixed(3)}
            <input type="range" min={0.001} max={0.1} step={0.001} value={alpha}
                   onChange={e => setAlpha(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Step size" />
          </label>
        </div>

        {/* State inspection */}
        <div style={{ minWidth: 200 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 12 }}
               role="region" aria-label="Policy gradient updates">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              REINFORCE LOG
            </div>
            {reinHistory.length === 0 ? (
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>No updates yet.<br />Click a button above.</div>
            ) : (
              reinHistory.map((msg, i) => (
                <div key={i} style={{ fontSize: 10, color: '#D1D5DB', marginBottom: 4, fontFamily: 'monospace' }}>
                  {msg}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 12, background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 12 }}
               role="region" aria-label="Q-values for selected state">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              Q-VALUES — {selectedState}
            </div>
            {ACTIONS.map(a => (
              <div key={a} style={{ fontSize: 11, color: ACTION_COLORS[a], marginBottom: 2, fontFamily: 'monospace' }}>
                {ARROW_CHAR[a]} {(selQVals.get(a) ?? 0).toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
