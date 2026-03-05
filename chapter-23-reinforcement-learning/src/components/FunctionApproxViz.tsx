/**
 * FunctionApproxViz — §23.4
 *
 * Demonstrates linear function approximation of utility.
 * Shows feature vector, θ parameters, and estimated U(s) for each grid state.
 */
import React, { useState } from 'react';
import katex from 'katex';
import {
  createGridWorld,
  linearFunctionApprox,
  tdFAUpdate,
  type State,
} from '../algorithms/index';

const CC = '#10B981';
const GW = createGridWorld();
const ROWS = 3; const COLS = 4;

// Hand-crafted features for the 4×3 grid:
// f0=1 (bias), f1=col/3 (norm x), f2=(2-row)/2 (norm y), f3=1/dist_to_goal, f4=1/dist_to_pit
function stateFeatures(s: State): ReadonlyArray<number> {
  const comma = s.indexOf(',');
  const r = parseInt(s.slice(0, comma), 10);
  const c = parseInt(s.slice(comma + 1), 10);
  const dr = r - 0; const dc = c - 3;
  const distGoal = Math.sqrt(dr * dr + dc * dc) || 0.001;
  const dr2 = r - 1; const dc2 = c - 3;
  const distPit = Math.sqrt(dr2 * dr2 + dc2 * dc2) || 0.001;
  return [
    1,              // bias
    c / 3,          // normalised col
    (2 - r) / 2,    // normalised row (higher = closer to top/goal)
    1 / distGoal,   // inverse distance to +1 terminal
    1 / distPit,    // inverse distance to –1 terminal
  ];
}

const FEATURE_NAMES = ['bias', 'col/3', '(2−r)/2', '1/dist(+1)', '1/dist(−1)'];
const NUM_FEATURES = 5;

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

// Simple fixed trajectory for TD-FA demo
const DEMO_TRANSITIONS: Array<{ state: State; reward: number; nextState: State }> = [
  { state: '2,0', reward: -0.04, nextState: '2,1' },
  { state: '2,1', reward: -0.04, nextState: '2,2' },
  { state: '2,2', reward: -0.04, nextState: '1,2' },
  { state: '1,2', reward: -0.04, nextState: '0,2' },
  { state: '0,2', reward:  1.00, nextState: '0,3' },
];

export default function FunctionApproxViz() {
  const [theta, setTheta] = useState<number[]>(Array(NUM_FEATURES).fill(0));
  const [alpha, setAlpha] = useState(0.1);
  const [gamma, setGamma] = useState(0.9);
  const [stepIdx, setStepIdx] = useState(0);
  const [history, setHistory] = useState<number[][]>([Array(NUM_FEATURES).fill(0)]);
  const [errors, setErrors] = useState<number[]>([]);

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function doStep() {
    const trans = DEMO_TRANSITIONS[stepIdx % DEMO_TRANSITIONS.length]!;
    const fs = stateFeatures(trans.state);
    const fsp = stateFeatures(trans.nextState);
    const result = tdFAUpdate(theta, fs, fsp, trans.reward, gamma, alpha);
    const newTheta = [...result.theta] as number[];
    setTheta(newTheta);
    setHistory(h => [...h, newTheta]);
    setErrors(e => [...e, result.tdError]);
    setStepIdx(i => i + 1);
  }

  function doReset() {
    const init = Array(NUM_FEATURES).fill(0);
    setTheta(init);
    setHistory([init]);
    setErrors([]);
    setStepIdx(0);
  }

  // Compute estimated utilities for all states
  const validStates: State[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s: State = `${r},${c}`;
      if (!GW.walls.has(s)) validStates.push(s);
    }

  const estimates = validStates.map(s => ({
    state: s,
    u: linearFunctionApprox(theta, stateFeatures(s)),
    terminal: GW.terminals.get(s),
  }));

  const uVals = estimates.map(e => e.u);
  const minU = Math.min(...uVals, -1);
  const maxU = Math.max(...uVals, 1);

  function uColor(u: number): string {
    const t = (u - minU) / (maxU - minU || 1);
    return `rgb(${Math.round(180 * (1 - t))},${Math.round(180 * t + 40)},80)`;
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    color: 'white', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
  };

  const CHART_W = 300; const CHART_H = 80;
  const maxAbs = Math.max(...history.flat().map(Math.abs), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Linear approximation:&nbsp;
        <span dangerouslySetInnerHTML={latex('\\hat{U}_\\theta(s)=\\theta\\cdot\\mathbf{f}(s)')} />
        &nbsp; TD update:&nbsp;
        <span dangerouslySetInnerHTML={latex('\\theta\\leftarrow\\theta+\\alpha\\delta\\,\\mathbf{f}(s)')} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* θ bar chart */}
        <div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>θ parameters</div>
          <svg viewBox={`0 0 260 120`} style={{ width: 260, height: 120 }}
               role="img" aria-label="Theta parameter values">
            {theta.map((v, i) => {
              const barH = Math.abs(v) / (maxAbs || 1) * 45;
              const x = 20 + i * 46;
              return (
                <g key={i}>
                  <rect x={x} y={v >= 0 ? 60 - barH : 60}
                        width={36} height={barH}
                        fill={v >= 0 ? CC : '#EC4899'} opacity={0.85} rx={2} />
                  <text x={x + 18} y={110} textAnchor="middle"
                        fill="#9CA3AF" fontSize={8}>{FEATURE_NAMES[i]}</text>
                  <text x={x + 18} y={v >= 0 ? 56 - barH : 74 + barH}
                        textAnchor="middle" fill="white" fontSize={8}>{v.toFixed(2)}</text>
                </g>
              );
            })}
            <line x1={10} y1={60} x2={250} y2={60} stroke="#555" strokeWidth={1} />
          </svg>
        </div>

        {/* Grid heat-map */}
        <div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
            Estimated Û_θ(s)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 68px)`, gap: 2 }}>
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const s: State = `${r},${c}`;
                if (GW.walls.has(s)) {
                  return <div key={s} style={{ width: 68, height: 68, background: '#333',
                                               borderRadius: 4, display: 'flex',
                                               alignItems: 'center', justifyContent: 'center',
                                               fontSize: 10, color: '#555' }}>WALL</div>;
                }
                const terminal = GW.terminals.get(s);
                const u = linearFunctionApprox(theta, stateFeatures(s));
                const bg = terminal !== undefined
                  ? (terminal > 0 ? '#065f46' : '#7f1d1d')
                  : (prefersReduced ? '#242430' : uColor(u));
                return (
                  <div key={s} style={{ width: 68, height: 68, background: bg, borderRadius: 4,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid #444' }}>
                    <span style={{ fontSize: 8, color: '#ccc' }}>{s}</span>
                    <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>
                      {terminal !== undefined ? (terminal > 0 ? '+1' : '−1') : u.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Controls + step info */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
               role="group" aria-label="Algorithm controls">
            <button style={btnStyle} onClick={doStep} aria-label="Step TD update">
              Step TD Update
            </button>
            <button style={btnStyle} onClick={() => { for (let i = 0; i < 20; i++) doStep(); }}
                    aria-label="Run 20 steps">
              ×20
            </button>
            <button style={btnStyle} onClick={doReset} aria-label="Reset">↺ Reset</button>
          </div>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            α = {alpha.toFixed(2)}
            <input type="range" min={0.01} max={1} step={0.01} value={alpha}
                   onChange={e => setAlpha(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Learning rate" />
          </label>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            γ = {gamma.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={gamma}
                   onChange={e => setGamma(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Discount" />
          </label>

          <div style={{ background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 12 }}
               role="region" aria-label="State inspection">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              STEP {stepIdx}
            </div>
            <div style={{ fontSize: 11, color: '#D1D5DB' }}>
              <div>Current transition:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9CA3AF' }}>
                {(() => {
                  const t = DEMO_TRANSITIONS[(stepIdx - 1 + DEMO_TRANSITIONS.length) % DEMO_TRANSITIONS.length]!;
                  return `${t.state} → ${t.nextState} (r=${t.reward})`;
                })()}
              </div>
              {errors.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  Last δ = {errors[errors.length - 1]!.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          {/* TD error mini chart */}
          {errors.length > 1 && (
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>TD error history</div>
              <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', maxWidth: CHART_W }}
                   role="img" aria-label="TD error history">
                {!prefersReduced && (() => {
                  const minE = Math.min(...errors);
                  const maxE = Math.max(...errors);
                  const range = maxE - minE || 1;
                  const pts = errors.map((e, i) => {
                    const x = (i / Math.max(1, errors.length - 1)) * (CHART_W - 20) + 10;
                    const y = CHART_H - 10 - ((e - minE) / range) * (CHART_H - 20);
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={pts} fill="none" stroke="#F59E0B" strokeWidth={1.5} />;
                })()}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
