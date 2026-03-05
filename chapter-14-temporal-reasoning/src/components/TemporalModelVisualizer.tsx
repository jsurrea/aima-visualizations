import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { hmmForward, forwardBackward, viterbi } from '../algorithms';
import type { HMMParams } from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const COLOR = '#EC4899';

function btnStyle(active = false): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: '8px',
    border: `1px solid ${active ? COLOR : COLOR + '40'}`,
    background: active ? COLOR + '30' : COLOR + '15',
    color: COLOR, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  };
}

type ViewMode = 'filter' | 'smooth' | 'viterbi';

function buildHMM(pStayRain: number, pUmbrellaGivenRain: number): HMMParams {
  return {
    numStates: 2,
    transitionMatrix: [
      [pStayRain, 1 - pStayRain],
      [1 - pStayRain, pStayRain],
    ],
    prior: [0.5, 0.5],
    observationProbs: [
      [pUmbrellaGivenRain, 1 - pUmbrellaGivenRain],
      [1 - pUmbrellaGivenRain, pUmbrellaGivenRain],
    ],
  };
}

function predictFuture(posterior: readonly number[], transMatrix: ReadonlyArray<ReadonlyArray<number>>, k: number): number[] {
  let p = [...posterior];
  const result: number[] = [p[0]!];
  for (let i = 0; i < k; i++) {
    const next = [0, 0];
    for (let s = 0; s < 2; s++) {
      for (let prev = 0; prev < 2; prev++) {
        next[s]! += (p[prev] ?? 0) * (transMatrix[prev]?.[s] ?? 0);
      }
    }
    p = next;
    result.push(p[0]!);
  }
  return result;
}

export default function TemporalModelVisualizer(): React.ReactElement {
  const [pStayRain, setPStayRain] = useState(0.7);
  const [pUmbrellaGivenRain, setPUmbrellaGivenRain] = useState(0.9);
  const [evidence, setEvidence] = useState<number[]>([0, 0, 1, 0, 0]);
  const [viewMode, setViewMode] = useState<ViewMode>('filter');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(800);

  const hmm = useMemo(() => buildHMM(pStayRain, pUmbrellaGivenRain), [pStayRain, pUmbrellaGivenRain]);
  const T = evidence.length;
  const maxStep = T - 1;

  const filterSteps = useMemo(() => hmmForward(hmm, evidence), [hmm, evidence]);
  const smoothSteps = useMemo(() => forwardBackward(hmm, evidence), [hmm, evidence]);
  const viterbiResult = useMemo(() => viterbi(hmm, evidence), [hmm, evidence]);

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

  const toggleDay = useCallback((dayIdx: number) => {
    setEvidence(prev => prev.map((e, i) => i === dayIdx ? (e === 0 ? 1 : 0) : e));
  }, []);

  const addDay = useCallback(() => {
    if (evidence.length < 8) setEvidence(prev => [...prev, 0]);
  }, [evidence.length]);

  const removeDay = useCallback(() => {
    if (evidence.length > 1) {
      setEvidence(prev => prev.slice(0, -1));
      setStep(prev => Math.min(prev, evidence.length - 2));
    }
  }, [evidence.length]);

  const getRainProb = useCallback((dayIdx: number): number => {
    if (viewMode === 'filter') {
      return filterSteps[dayIdx]?.belief[0] ?? 0;
    } else if (viewMode === 'smooth') {
      return smoothSteps[dayIdx]?.smoothed[0] ?? 0;
    } else {
      const path = viterbiResult.mostLikelyPath;
      return path[dayIdx] === 0 ? 1 : 0;
    }
  }, [viewMode, filterSteps, smoothSteps, viterbiResult]);

  const currentFilter = filterSteps[step];
  const currentPRain = currentFilter?.belief[0] ?? 0;
  const currentPredRain = currentFilter?.predBelief[0] ?? 0;
  const futureK = 10;
  const futurePreds = useMemo(() => {
    const posterior = currentFilter?.belief ?? [0.5, 0.5];
    return predictFuture(posterior, hmm.transitionMatrix, futureK);
  }, [currentFilter, hmm.transitionMatrix]);

  const svgW = 200, svgH = 80;
  const futurePoints = futurePreds.map((p, i) => {
    const x = (i / futureK) * (svgW - 20) + 10;
    const y = svgH - 10 - p * (svgH - 20);
    return `${x},${y}`;
  });

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: '16px', padding: '24px', color: '#E2E8F0', fontFamily: 'var(--font-sans)' }}>
      <h2 style={{ color: COLOR, marginBottom: 8, fontSize: '1.4rem' }}>Temporal Model — Umbrella World</h2>

      {/* Explanatory section */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: 12 }}>
          The <strong style={{ color: '#E2E8F0' }}>Markov assumption</strong> lets us track hidden state X (Rain/NoRain) through time using two models:
          a <em>transition model</em> P(X_t | X_t-1) and a <em>sensor model</em> P(e_t | X_t).
        </p>
        <div dangerouslySetInnerHTML={{
          __html: renderDisplayMath('P(X_{t+1} \\mid e_{1:t+1}) = \\alpha\\, P(e_{t+1}|X_{t+1}) \\sum_{x_t} P(X_{t+1}|x_t)\\,P(x_t|e_{1:t})')
        }} />
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
        <label style={{ fontSize: '13px', color: '#94A3B8' }}>
          P(Stay Rain) = {pStayRain.toFixed(2)}
          <input type="range" min={0.5} max={0.99} step={0.01} value={pStayRain}
            onChange={e => { setPStayRain(parseFloat(e.target.value)); handleReset(); }}
            style={{ display: 'block', width: 160, accentColor: COLOR }} />
        </label>
        <label style={{ fontSize: '13px', color: '#94A3B8' }}>
          P(Umbrella|Rain) = {pUmbrellaGivenRain.toFixed(2)}
          <input type="range" min={0.5} max={1.0} step={0.01} value={pUmbrellaGivenRain}
            onChange={e => { setPUmbrellaGivenRain(parseFloat(e.target.value)); handleReset(); }}
            style={{ display: 'block', width: 160, accentColor: COLOR }} />
        </label>
      </div>

      {/* View mode */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['filter', 'smooth', 'viterbi'] as const).map(m => (
          <button key={m} style={btnStyle(viewMode === m)} onClick={() => setViewMode(m)}
            aria-pressed={viewMode === m}>
            {m === 'filter' ? 'Filter' : m === 'smooth' ? 'Smooth' : 'Viterbi'}
          </button>
        ))}
        <span style={{ fontSize: '12px', color: '#64748B', alignSelf: 'center', marginLeft: 8 }}>
          {viewMode === 'filter' && 'P(X_t | e_{1:t})'}
          {viewMode === 'smooth' && 'P(X_t | e_{1:T})'}
          {viewMode === 'viterbi' && 'Most likely path'}
        </span>
      </div>

      {/* Timeline row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {evidence.map((e, dayIdx) => {
          const rainP = dayIdx <= step ? getRainProb(dayIdx) : null;
          const isActive = dayIdx === step;
          return (
            <div key={dayIdx} style={{
              background: isActive ? COLOR + '20' : 'var(--surface-2)',
              border: `1px solid ${isActive ? COLOR : 'var(--surface-border)'}`,
              borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 72,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: 4 }}>Day {dayIdx + 1}</div>
              <button
                onClick={() => toggleDay(dayIdx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}
                aria-label={`Day ${dayIdx + 1}: ${e === 0 ? 'umbrella' : 'no umbrella'}. Click to toggle.`}
              >
                {e === 0 ? '☂️' : '☀️'}
              </button>
              {rainP !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 6, borderRadius: 3, background: '#1E3A5F', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rainP * 100}%`, background: '#3B82F6', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: 2 }}>
                    {(rainP * 100).toFixed(0)}% 🌧
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {evidence.length < 8 && (
          <button onClick={addDay} style={{ ...btnStyle(), minWidth: 72 }} aria-label="Add day">+ Day</button>
        )}
        {evidence.length > 1 && (
          <button onClick={removeDay} style={{ ...btnStyle(), minWidth: 72 }} aria-label="Remove last day">- Day</button>
        )}
      </div>

      {/* Belief bars for completed days */}
      {viewMode !== 'viterbi' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 6 }}>
            Belief at each step (up to Day {step + 1}):
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: step + 1 }, (_, i) => {
              const p = getRainProb(i);
              return (
                <div key={i} style={{ width: 60 }}>
                  <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'center', marginBottom: 2 }}>D{i + 1}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1, height: 10, background: '#1E3A5F', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p * 100}%`, background: '#3B82F6' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1, height: 10, background: '#1E3A5F', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(1 - p) * 100}%`, background: '#F59E0B' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#3B82F6', textAlign: 'center' }}>{(p * 100).toFixed(0)}%🌧</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <span style={{ fontSize: '11px', color: '#3B82F6' }}>■ Rain</span>
            <span style={{ fontSize: '11px', color: '#F59E0B' }}>■ NoRain</span>
          </div>
        </div>
      )}

      {/* Viterbi path */}
      {viewMode === 'viterbi' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 6 }}>Most likely state sequence:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {viterbiResult.mostLikelyPath.map((state, i) => (
              <div key={i} style={{
                padding: '6px 12px', borderRadius: 8,
                background: state === 0 ? '#3B82F630' : '#F59E0B30',
                border: `1px solid ${state === 0 ? '#3B82F6' : '#F59E0B'}`,
                color: state === 0 ? '#3B82F6' : '#F59E0B',
                fontSize: '13px', fontWeight: 600,
              }}>
                D{i + 1}: {state === 0 ? '🌧 Rain' : '☀️ NoRain'}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: 6 }}>
            Path probability: {viterbiResult.pathProb.toExponential(3)}
          </div>
        </div>
      )}

      {/* Controls */}
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
        <span style={{ fontSize: '12px', color: '#64748B' }}>Day {step + 1} / {T}</span>
      </div>

      {/* State panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 8 }}>State at Day {step + 1}</div>
          <div style={{ fontSize: '13px', marginBottom: 4 }}>
            Evidence: {evidence[step] === 0 ? '☂️ Umbrella' : '☀️ No umbrella'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Rain}|e_{1:t})') }} />
            <span style={{ marginLeft: 6, color: '#3B82F6', fontWeight: 600 }}>{(currentPRain * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Rain}|e_{1:t-1})') }} />
            <span style={{ marginLeft: 6, color: '#94A3B8' }}>{(currentPredRain * 100).toFixed(1)}% (before update)</span>
          </div>
        </div>

        {/* Future prediction chart */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 6 }}>
            Predicted P(Rain) — next {futureK} steps
          </div>
          <svg width={svgW} height={svgH} style={{ overflow: 'visible' }} role="img" aria-label="Future prediction chart">
            <line x1={10} y1={svgH - 10} x2={svgW - 10} y2={svgH - 10} stroke="#374151" strokeWidth={1} />
            <line x1={10} y1={10} x2={10} y2={svgH - 10} stroke="#374151" strokeWidth={1} />
            {[0, 0.5, 1].map(v => (
              <text key={v} x={6} y={svgH - 10 - v * (svgH - 20)} fill="#64748B" fontSize={8} textAnchor="end" dominantBaseline="middle">{v}</text>
            ))}
            <polyline points={futurePoints.join(' ')} fill="none" stroke={COLOR} strokeWidth={2} />
            {futurePreds.map((p, i) => {
              const x = (i / futureK) * (svgW - 20) + 10;
              const y = svgH - 10 - p * (svgH - 20);
              return <circle key={i} cx={x} cy={y} r={2.5} fill={COLOR} />;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
