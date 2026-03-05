/**
 * TDLearningViz — §23.2.3
 *
 * Shows how Passive TD(0) utility estimates converge over trials.
 * Plots a line chart of U(s) vs trial for key states.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { passiveTDLearner, type Trial, type State } from '../algorithms/index';

const CC = '#10B981';
const CHART_W = 340;
const CHART_H = 200;

// Pre-built trials from a fixed policy (moving right/up toward +1 terminal)
const GW_TRIALS: ReadonlyArray<Trial> = (() => {
  const paths: Array<Array<{ state: State; action: 'up' | 'right'; reward: number; nextState: State }>> = [
    [
      { state: '2,0', action: 'right', reward: -0.04, nextState: '2,1' },
      { state: '2,1', action: 'right', reward: -0.04, nextState: '2,2' },
      { state: '2,2', action: 'up',    reward: -0.04, nextState: '1,2' },
      { state: '1,2', action: 'up',    reward: -0.04, nextState: '0,2' },
      { state: '0,2', action: 'right', reward:  1.00, nextState: '0,3' },
    ],
    [
      { state: '2,0', action: 'right', reward: -0.04, nextState: '2,1' },
      { state: '2,1', action: 'right', reward: -0.04, nextState: '2,2' },
      { state: '2,2', action: 'right', reward: -0.04, nextState: '2,3' },
      { state: '2,3', action: 'up',    reward: -0.04, nextState: '1,3' },
      { state: '1,3', action: 'up',    reward: -0.04, nextState: '0,3' },
      { state: '0,3', action: 'up',    reward:  1.00, nextState: '0,3' },
    ],
  ];
  // Repeat 80 times alternating paths
  const trials: Trial[] = [];
  for (let i = 0; i < 80; i++) trials.push(paths[i % 2]!);
  return trials;
})();

const TRACKED_STATES: State[] = ['2,0', '2,1', '2,2', '1,2', '0,2'];
const STATE_COLORS = ['#6366F1', '#3B82F6', CC, '#F59E0B', '#EC4899'];

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

export default function TDLearningViz() {
  const [alpha, setAlpha] = useState(0.3);
  const [gamma, setGamma] = useState(0.9);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);

  const history = passiveTDLearner(GW_TRIALS, gamma, alpha);
  const total = history.length;
  const current = history[Math.min(stepIdx, total - 1)]!;

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const interval = 1000 / (speed * 3);
    if (now - lastRef.current >= interval) {
      setStepIdx(prev => {
        if (prev >= total - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
      lastRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, total]);

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(tick);
    else if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const reset = () => { setStepIdx(0); setPlaying(false); };

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build series data
  const series = TRACKED_STATES.map(s =>
    history.slice(0, stepIdx + 1).map(h => h.utilities.get(s) ?? 0)
  );

  // Chart scaling
  const allVals = series.flat();
  const minV = allVals.length ? Math.min(...allVals) - 0.05 : -0.1;
  const maxV = allVals.length ? Math.max(...allVals) + 0.05 : 1.1;

  function toX(i: number) {
    return 30 + (i / Math.max(1, total - 1)) * (CHART_W - 40);
  }
  function toY(v: number) {
    return CHART_H - 20 - ((v - minV) / (maxV - minV)) * (CHART_H - 30);
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    color: 'white', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        TD update rule:&nbsp;
        <span dangerouslySetInnerHTML={latex('U(s)\\leftarrow U(s)+\\alpha[r+\\gamma U(s\')-U(s)]')} />
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Chart */}
        <div>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', maxWidth: CHART_W }}
               role="img" aria-label="TD utility convergence chart">
            {/* Axes */}
            <line x1={30} y1={10} x2={30} y2={CHART_H - 20} stroke="#555" strokeWidth={1} />
            <line x1={30} y1={CHART_H - 20} x2={CHART_W - 10} y2={CHART_H - 20} stroke="#555" strokeWidth={1} />
            <text x={32} y={14} fill="#9CA3AF" fontSize={9}>{maxV.toFixed(2)}</text>
            <text x={32} y={CHART_H - 22} fill="#9CA3AF" fontSize={9}>{minV.toFixed(2)}</text>
            <text x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" fill="#9CA3AF" fontSize={9}>Trial</text>
            <text x={10} y={CHART_H / 2} fill="#9CA3AF" fontSize={9} transform={`rotate(-90,10,${CHART_H/2})`}>U(s)</text>

            {!prefersReduced && series.map((vals, si) => {
              if (vals.length < 2) return null;
              const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
              return (
                <polyline key={TRACKED_STATES[si]} points={pts}
                          fill="none" stroke={STATE_COLORS[si]} strokeWidth={1.5} opacity={0.85} />
              );
            })}

            {/* Current trial marker */}
            {stepIdx > 0 && (
              <line x1={toX(stepIdx)} y1={10} x2={toX(stepIdx)} y2={CHART_H - 20}
                    stroke="white" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4} />
            )}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {TRACKED_STATES.map((s, i) => (
              <span key={s} style={{ fontSize: 11, color: STATE_COLORS[i] }}>
                ● {s}: {(current.utilities.get(s) ?? 0).toFixed(3)}
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div role="group" aria-label="Playback controls" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={btnStyle} aria-label="Step back"
                    onClick={() => setStepIdx(p => Math.max(0, p - 1))}>‹</button>
            <button style={{ ...btnStyle, background: playing ? CC : 'var(--surface-3)' }}
                    aria-label={playing ? 'Pause' : 'Play'}
                    onClick={() => setPlaying(p => !p)}>
              {playing ? '⏸' : '▶'}
            </button>
            <button style={btnStyle} aria-label="Step forward"
                    onClick={() => setStepIdx(p => Math.min(total - 1, p + 1))}>›</button>
            <button style={btnStyle} aria-label="Reset" onClick={reset}>↺</button>
          </div>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            Speed: {speed}×
            <input type="range" min={1} max={10} value={speed}
                   onChange={e => setSpeed(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Speed" />
          </label>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            α = {alpha.toFixed(2)}
            <input type="range" min={0.01} max={1} step={0.01} value={alpha}
                   onChange={e => { setAlpha(Number(e.target.value)); reset(); }}
                   style={{ display: 'block', width: '100%' }} aria-label="Learning rate" />
          </label>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            γ = {gamma.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={gamma}
                   onChange={e => { setGamma(Number(e.target.value)); reset(); }}
                   style={{ display: 'block', width: '100%' }} aria-label="Discount factor" />
          </label>

          <div style={{ background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 12 }}
               role="region" aria-label="State inspection">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              TRIAL {stepIdx + 1} UTILITIES
            </div>
            {TRACKED_STATES.map((s, i) => (
              <div key={s} style={{ fontSize: 11, color: STATE_COLORS[i], marginBottom: 2 }}>
                U({s}) = {(current.utilities.get(s) ?? 0).toFixed(4)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
