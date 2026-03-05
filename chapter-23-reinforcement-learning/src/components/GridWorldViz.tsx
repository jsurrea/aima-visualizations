/**
 * GridWorldViz — §23.2 / §23.3
 *
 * Interactive 4×3 AIMA grid world.  Runs Q-learning or SARSA episode-by-episode
 * and animates utility heat-map + greedy-policy arrows.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import {
  createGridWorld,
  runQLearning,
  runSARSA,
  type QLearningHistory,
  type SARSAHistory,
  type GridAction,
  type State,
} from '../algorithms/index';

const CC = '#10B981';

// ── grid geometry ─────────────────────────────────────────────────────────
const ROWS = 3;
const COLS = 4;
const CELL = 80;
const PAD = 20;
const SVG_W = COLS * CELL + PAD * 2;
const SVG_H = ROWS * CELL + PAD * 2;

const ACTIONS: GridAction[] = ['up', 'down', 'left', 'right'];
const ARROW: Record<GridAction, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx: 1,  dy:  0 },
};

function cx(col: number) { return PAD + col * CELL + CELL / 2; }
function cy(row: number) { return PAD + row * CELL + CELL / 2; }

function valToColor(v: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (v - min) / (max - min);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(255 * t);
  return `rgb(${r},${g},80)`;
}

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

type Algo = 'qlearning' | 'sarsa';

function buildHistory(algo: Algo, episodes: number, gamma: number,
                       rplus: number, ne: number, alpha: number, eps: number) {
  const gw = createGridWorld();
  if (algo === 'qlearning') return runQLearning(gw, episodes, gamma, rplus, ne, 42);
  return runSARSA(gw, episodes, gamma, alpha, eps, 42);
}

export default function GridWorldViz() {
  const [algo, setAlgo] = useState<Algo>('qlearning');
  const [episodes, setEpisodes] = useState(100);
  const [gamma, setGamma] = useState(0.9);
  const [rplus, setRplus] = useState(2.0);
  const [ne, setNe] = useState(5);
  const [alpha, setAlpha] = useState(0.3);
  const [eps, setEps] = useState(0.1);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);

  const gw = createGridWorld();
  const history = buildHistory(algo, episodes, gamma, rplus, ne, alpha, eps);
  const total = history.length;
  const current = history[Math.min(stepIdx, total - 1)]!;

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const interval = 1000 / (speed * 4);
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

  // Compute value range for heat-map
  const qTable = current.qTable;
  const allQ: number[] = [];
  for (const [, actions] of qTable) {
    for (const [, v] of actions) allQ.push(v);
  }
  const minQ = allQ.length ? Math.min(...allQ) : -1;
  const maxQ = allQ.length ? Math.max(...allQ) : 1;

  function maxQ_state(s: State): number {
    const m = qTable.get(s);
    if (!m) return 0;
    let best = -Infinity;
    for (const a of ACTIONS) { const v = m.get(a) ?? 0; if (v > best) best = v; }
    return best;
  }

  const policy = current.policy;

  const renderGrid = () => (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', maxWidth: 380 }}
         role="img" aria-label="Grid world with utility values and policy arrows">
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const s: State = `${r},${c}`;
          if (gw.walls.has(s)) {
            return (
              <rect key={s} x={PAD + c * CELL} y={PAD + r * CELL}
                    width={CELL} height={CELL} fill="#333" stroke="#555" strokeWidth={1} />
            );
          }
          const terminal = gw.terminals.get(s);
          const fillColor = terminal !== undefined
            ? (terminal > 0 ? '#065f46' : '#7f1d1d')
            : (prefersReduced ? '#242430' : valToColor(maxQ_state(s), minQ, maxQ));
          const label = terminal !== undefined ? (terminal > 0 ? '+1' : '−1') : '';
          const qVal = maxQ_state(s).toFixed(2);
          return (
            <g key={s}>
              <rect x={PAD + c * CELL} y={PAD + r * CELL}
                    width={CELL} height={CELL}
                    fill={fillColor} stroke="#444" strokeWidth={1} />
              {terminal !== undefined ? (
                <text x={cx(c)} y={cy(r) + 5} textAnchor="middle"
                      fill="white" fontSize={16} fontWeight="bold">{label}</text>
              ) : (
                <>
                  <text x={cx(c)} y={cy(r) - 6} textAnchor="middle"
                        fill="#ccc" fontSize={9}>{s}</text>
                  <text x={cx(c)} y={cy(r) + 8} textAnchor="middle"
                        fill="white" fontSize={11}>{qVal}</text>
                  {!prefersReduced && (() => {
                    const action = policy.get(s);
                    if (!action) return null;
                    const { dx, dy } = ARROW[action];
                    const ox = cx(c); const oy = cy(r);
                    const len = 18;
                    return (
                      <line x1={ox} y1={oy} x2={ox + dx * len} y2={oy + dy * len}
                            stroke={CC} strokeWidth={2.5}
                            markerEnd="url(#arrow)" />
                    );
                  })()}
                </>
              )}
            </g>
          );
        })
      )}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={CC} />
        </marker>
      </defs>
    </svg>
  );

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    background: active ? CC : 'var(--surface-3)',
    border: '1px solid var(--surface-border)',
    color: 'white',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Algorithm selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['qlearning', 'sarsa'] as Algo[]).map(a => (
          <button key={a} style={btnStyle(algo === a)}
                  onClick={() => { setAlgo(a); reset(); }}
                  aria-pressed={algo === a}>
            {a === 'qlearning' ? 'Q-Learning' : 'SARSA'}
          </button>
        ))}
      </div>

      {/* Formula */}
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        {algo === 'qlearning' ? (
          <span dangerouslySetInnerHTML={latex('Q(s,a)\\leftarrow Q(s,a)+\\alpha[r+\\gamma\\max_{a\'}Q(s\',a\')-Q(s,a)]')} />
        ) : (
          <span dangerouslySetInnerHTML={latex('Q(s,a)\\leftarrow Q(s,a)+\\alpha[r+\\gamma Q(s\',a\')-Q(s,a)]')} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Grid */}
        <div style={{ flex: '0 0 auto' }}>
          {renderGrid()}
          {/* Progress bar */}
          <div style={{ marginTop: 8, height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
            <div style={{ height: 4, background: CC, borderRadius: 2,
                          width: `${(stepIdx / Math.max(1, total - 1)) * 100}%`,
                          transition: prefersReduced ? 'none' : 'width 0.1s' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#9CA3AF' }}>
            Episode {stepIdx + 1} / {total}
          </div>
        </div>

        {/* Controls + state panel */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Playback controls */}
          <div role="group" aria-label="Playback controls"
               style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={btnStyle()} aria-label="Step backward"
                    onClick={() => setStepIdx(p => Math.max(0, p - 1))}>‹</button>
            <button style={btnStyle(playing)}
                    aria-label={playing ? 'Pause' : 'Play'}
                    onClick={() => setPlaying(p => !p)}>
              {playing ? '⏸' : '▶'}
            </button>
            <button style={btnStyle()} aria-label="Step forward"
                    onClick={() => setStepIdx(p => Math.min(total - 1, p + 1))}>›</button>
            <button style={btnStyle()} aria-label="Reset" onClick={reset}>↺</button>
          </div>

          {/* Speed */}
          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            Speed: {speed}×
            <input type="range" min={1} max={10} value={speed}
                   onChange={e => setSpeed(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }}
                   aria-label="Playback speed" />
          </label>

          {/* Episode slider */}
          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            Episodes: {episodes}
            <input type="range" min={10} max={500} step={10} value={episodes}
                   onChange={e => { setEpisodes(Number(e.target.value)); reset(); }}
                   style={{ display: 'block', width: '100%' }}
                   aria-label="Number of episodes" />
          </label>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            γ = {gamma.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={gamma}
                   onChange={e => { setGamma(Number(e.target.value)); reset(); }}
                   style={{ display: 'block', width: '100%' }} aria-label="Discount factor" />
          </label>

          {/* State inspection panel */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 12 }}
               role="region" aria-label="State inspection">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              STATE INSPECTION — ep {stepIdx + 1}
            </div>
            <div style={{ fontSize: 11, color: '#D1D5DB' }}>
              <div>Total reward: {current.totalReward.toFixed(3)}</div>
              <div>States visited: {current.qTable.size}</div>
              <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 10,
                            maxHeight: 100, overflowY: 'auto', color: '#9CA3AF' }}>
                {Array.from(current.policy.entries()).slice(0, 8).map(([s, a]) => (
                  <div key={s}>{s}: {a} (Q={maxQ_state(s).toFixed(3)})</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
