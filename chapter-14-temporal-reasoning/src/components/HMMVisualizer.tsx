import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { hmmForward, viterbi } from '../algorithms';
import type { HMMParams } from '../algorithms';
import { renderInlineMath, renderDisplayMath, interpolateColor } from '../utils/mathUtils';

const COLOR = '#EC4899';

function btnStyle(active = false): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: '8px',
    border: `1px solid ${active ? COLOR : COLOR + '40'}`,
    background: active ? COLOR + '30' : COLOR + '15',
    color: COLOR, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  };
}

// Grid layout: R=open, W=wall
// Row 0: R W W W
// Row 1: R R W W
// Row 2: W R R W
// Row 3: W W R R
const GRID_OPEN: boolean[][] = [
  [true,  false, false, false],
  [true,  true,  false, false],
  [false, true,  true,  false],
  [false, false, true,  true ],
];

// State -> (row,col) mapping
const STATE_COORDS: [number, number][] = [
  [0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3],
];

const NUM_STATES = 7;
const NUM_OBS = 16;

// True sensor readings per state (NESW bits)
const TRUE_SENSORS = [13, 3, 12, 3, 12, 3, 14];

function hamming(a: number, b: number): number {
  let x = a ^ b, count = 0;
  while (x) { count += x & 1; x >>= 1; }
  return count;
}

function buildObsProbs(epsilon: number): number[][] {
  return Array.from({ length: NUM_OBS }, (_, obs) =>
    Array.from({ length: NUM_STATES }, (_, s) => {
      const h = hamming(TRUE_SENSORS[s]!, obs);
      return Math.pow(1 - epsilon, 4 - h) * Math.pow(epsilon, h);
    })
  );
}

// Neighbors: open adjacent cells (up/down/left/right) + self
function getNeighbors(stateIdx: number): number[] {
  const [r, c] = STATE_COORDS[stateIdx]!;
  const neighbors: number[] = [];
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]] as const;
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && GRID_OPEN[nr]![nc]) {
      const nIdx = STATE_COORDS.findIndex(([er, ec]) => er === nr && ec === nc);
      if (nIdx >= 0) neighbors.push(nIdx);
    }
  }
  neighbors.push(stateIdx); // self
  return neighbors;
}

function buildTransitionMatrix(): number[][] {
  return Array.from({ length: NUM_STATES }, (_, i) => {
    const neighbors = getNeighbors(i);
    const prob = 1 / neighbors.length;
    const row = Array(NUM_STATES).fill(0) as number[];
    for (const n of neighbors) row[n]! += prob;
    return row;
  });
}

function buildHMM(epsilon: number): HMMParams {
  return {
    numStates: NUM_STATES,
    transitionMatrix: buildTransitionMatrix(),
    prior: Array(NUM_STATES).fill(1 / NUM_STATES) as number[],
    observationProbs: buildObsProbs(epsilon),
  };
}

const VALID_OBS = [13, 3, 12, 14];

function randomObs(seed: number): number[] {
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
  return Array.from({ length: 4 }, () => VALID_OBS[Math.floor(rng() * VALID_OBS.length)]!);
}

export default function HMMVisualizer(): React.ReactElement {
  const [epsilon, setEpsilon] = useState(0.1);
  const [observations, setObservations] = useState([13, 3, 12, 3]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(900);
  const [randSeed, setRandSeed] = useState(42);

  const T = observations.length;
  const maxStep = T - 1;

  const hmm = useMemo(() => buildHMM(epsilon), [epsilon]);
  const filterSteps = useMemo(() => hmmForward(hmm, observations), [hmm, observations]);
  const viterbiResult = useMemo(() => viterbi(hmm, observations), [hmm, observations]);

  useEffect(() => {
    if (!playing) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setStep(maxStep); setPlaying(false); return; }
    let lastTime = 0;
    let rafId: number;
    const loop = (ts: number) => {
      if (ts - lastTime >= delay) {
        lastTime = ts;
        setStep(prev => {
          if (prev >= maxStep) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing, delay, maxStep]);

  const handleReset = useCallback(() => { setStep(0); setPlaying(false); }, []);

  const currentFilter = filterSteps[step];
  const belief = currentFilter?.belief ?? Array(NUM_STATES).fill(1 / NUM_STATES);

  const viterbiPath = viterbiResult.mostLikelyPath;
  const viterbiState = viterbiPath[step] ?? 0;

  // Top-3 states by belief
  const sorted = useMemo(() => {
    return Array.from({ length: NUM_STATES }, (_, i) => ({ idx: i, p: belief[i] ?? 0 }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3);
  }, [belief]);

  const obsValue = observations[step] ?? 0;
  const nesw = ['N', 'E', 'S', 'W'].map((d, bit) => {
    const bitIdx = 3 - bit;
    return ((obsValue >> bitIdx) & 1) ? `${d}=wall` : `${d}=open`;
  }).join(', ');

  const CELL_SIZE = 80;
  const svgSize = 4 * CELL_SIZE;

  const handleRandomize = useCallback(() => {
    setObservations(randomObs(randSeed + Date.now()));
    setRandSeed(s => s + 1);
    handleReset();
  }, [randSeed, handleReset]);

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: '16px', padding: '24px', color: '#E2E8F0', fontFamily: 'var(--font-sans)' }}>
      <h2 style={{ color: COLOR, marginBottom: 8, fontSize: '1.4rem' }}>HMM Robot Localization — 4×4 Grid</h2>

      {/* Explanatory section */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: 8 }}>
          A robot moves on a grid, sensing walls (N/E/S/W). We track its location distribution using HMM forward filtering.
          The observation matrix <strong style={{ color: '#E2E8F0' }}>O_t</strong> is diagonal with P(e_t | X_t).
        </p>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('\\mathbf{f}_{1:t+1} = \\alpha\\, \\mathbf{O}_{t+1}\\, \\mathbf{T}^\\top\\, \\mathbf{f}_{1:t}') }} />
        <div dangerouslySetInnerHTML={{ __html: renderInlineMath('\\varepsilon') }} />
        <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 6 }}>
          = sensor error rate (each bit independently wrong with prob ε)
        </span>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: '13px', color: '#94A3B8' }}>
          ε = {epsilon.toFixed(2)}
          <input type="range" min={0} max={0.4} step={0.05} value={epsilon}
            onChange={e => { setEpsilon(parseFloat(e.target.value)); handleReset(); }}
            style={{ display: 'block', width: 140, accentColor: COLOR }} />
        </label>
        <button style={btnStyle()} onClick={handleRandomize} aria-label="Randomize observations">
          🎲 Randomize
        </button>
      </div>

      {/* Observation sequence */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {observations.map((obs, i) => {
          const bits = ['N','E','S','W'].map((d, b) => ((obs >> (3 - b)) & 1) ? d : '').filter(Boolean).join('');
          return (
            <div key={i} style={{
              padding: '6px 10px', borderRadius: 8, fontSize: '12px',
              background: i === step ? COLOR + '20' : 'var(--surface-2)',
              border: `1px solid ${i === step ? COLOR : 'var(--surface-border)'}`,
              color: i === step ? COLOR : '#94A3B8',
            }}>
              t={i + 1}: obs={obs} ({bits || 'none'})
            </div>
          );
        })}
      </div>

      {/* Grid views side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {[false, true].map(isViterbi => (
          <div key={String(isViterbi)}>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: 8, textAlign: 'center' }}>
              {isViterbi ? 'Viterbi Most-Likely Path' : 'HMM Filter'}
            </div>
            <svg
              width={svgSize} height={svgSize}
              style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
              role="grid"
              aria-label={isViterbi ? 'Viterbi path grid' : 'HMM filter probability grid'}
            >
              {Array.from({ length: 4 }, (_, row) =>
                Array.from({ length: 4 }, (_, col) => {
                  const isOpen = GRID_OPEN[row]![col]!;
                  const stateIdx = isOpen ? STATE_COORDS.findIndex(([r, c]) => r === row && c === col) : -1;
                  const prob = stateIdx >= 0 ? (belief[stateIdx] ?? 0) : 0;
                  const isViterbiActive = isViterbi && stateIdx === viterbiState;
                  const cellColor = isOpen
                    ? interpolateColor('#1E3A5F', '#EC4899', prob * 4)
                    : '#1A1A24';

                  const x = col * CELL_SIZE;
                  const y = row * CELL_SIZE;

                  return (
                    <g key={`${row}-${col}`} role="gridcell"
                      aria-label={isOpen && stateIdx >= 0
                        ? `Row ${row} Col ${col}: state ${stateIdx}, P=${prob.toFixed(3)}`
                        : `Row ${row} Col ${col}: wall`}>
                      <rect
                        x={x} y={y} width={CELL_SIZE} height={CELL_SIZE}
                        fill={cellColor}
                        stroke={isViterbiActive ? '#FBBF24' : 'var(--surface-border)'}
                        strokeWidth={isViterbiActive ? 3 : 1}
                      />
                      {!isOpen && (
                        <>
                          <line x1={x} y1={y} x2={x + CELL_SIZE} y2={y + CELL_SIZE} stroke="#3A3A4A" strokeWidth={1.5} />
                          <line x1={x + CELL_SIZE} y1={y} x2={x} y2={y + CELL_SIZE} stroke="#3A3A4A" strokeWidth={1.5} />
                        </>
                      )}
                      {isOpen && stateIdx >= 0 && (
                        <>
                          <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2 - 8}
                            textAnchor="middle" dominantBaseline="middle"
                            fill="#E2E8F0" fontSize={11} fontWeight={600}>
                            s{stateIdx}
                          </text>
                          <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2 + 8}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={prob > 0.3 ? '#FFFFFF' : '#94A3B8'} fontSize={10}>
                            {(prob * 100).toFixed(1)}%
                          </text>
                        </>
                      )}
                    </g>
                  );
                })
              )}
            </svg>
            {isViterbi && (
              <div style={{ textAlign: 'center', marginTop: 6, fontSize: '12px', color: '#FBBF24' }}>
                Most likely: state {viterbiState} (row={STATE_COORDS[viterbiState]?.[0]}, col={STATE_COORDS[viterbiState]?.[1]})
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Animation controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button style={btnStyle()} onClick={handleReset} aria-label="Reset">⏮</button>
        <button style={btnStyle()} onClick={() => setStep(p => Math.max(0, p - 1))} aria-label="Step back">◀</button>
        <button style={btnStyle(playing)} onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button style={btnStyle()} onClick={() => setStep(p => Math.min(maxStep, p + 1))} aria-label="Step forward">▶|</button>
        <label style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
          Speed
          <input type="range" min={200} max={2000} step={100} value={delay}
            onChange={e => setDelay(parseInt(e.target.value))}
            style={{ width: 80, accentColor: COLOR }} />
        </label>
        <span style={{ fontSize: '12px', color: '#64748B' }}>Step {step + 1} / {T}</span>
      </div>

      {/* State panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 8 }}>Step {step + 1} State</div>
        <div style={{ fontSize: '13px', marginBottom: 4 }}>
          Observation: {obsValue} ({nesw})
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: 6 }}>Top-3 most probable states:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sorted.map(({ idx, p }) => (
            <div key={idx} style={{
              padding: '6px 10px', borderRadius: 8,
              background: COLOR + '20', border: `1px solid ${COLOR + '60'}`,
              fontSize: '12px',
            }}>
              s{idx} @ ({STATE_COORDS[idx]?.[0]},{STATE_COORDS[idx]?.[1]}): {(p * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
