import { useState, useRef, useEffect, useCallback } from 'react';
import { lstmForward, type LSTMStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

const COLOR = '#10B981';
const GATE_COLORS = {
  forgetGate: '#EF4444',
  inputGate: '#3B82F6',
  outputGate: '#8B5CF6',
  cellInput: '#F59E0B',
};

const SEQUENCE = [0.5, -0.3, 0.8, -0.5, 0.2, 0.7];

function GateBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.abs(value) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#fff' }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-3,#242430)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color,
          borderRadius: 5, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

export default function LSTMViz() {
  const [steps, setSteps] = useState<ReadonlyArray<LSTMStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(lstmForward(SEQUENCE, 0.8, 0.6, 0.7, 0.5, 0.1, -0.1, 0, 0.2, 1.0, 0, 0, 0));
    setStepIdx(0);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setPlaying(false);
  }, []);

  const reset = useCallback(() => { stop(); setStepIdx(0); }, [stop]);

  useEffect(() => {
    if (!playing || prefersReduced) return;
    const framesPerStep = Math.max(1, Math.round(60 / speed));
    const tick = () => {
      frameRef.current++;
      if (frameRef.current >= framesPerStep) {
        frameRef.current = 0;
        setStepIdx((s) => {
          if (s >= steps.length - 1) { stop(); return s; }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, steps.length, stop, prefersReduced]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    if (e.key === 'ArrowRight') setStepIdx((s) => Math.min(s + 1, steps.length - 1));
    if (e.key === 'ArrowLeft') setStepIdx((s) => Math.max(s - 1, 0));
    if (e.key === 'r' || e.key === 'R') reset();
  };

  const displayIdx = prefersReduced ? steps.length - 1 : stepIdx;
  const current = steps[displayIdx];

  // Cell state history for mini chart
  const visibleSteps = prefersReduced ? steps : steps.slice(0, displayIdx + 1);
  const maxC = Math.max(...steps.map((s) => Math.abs(s.cellState)), 0.5);

  const CHART_W = 300, CHART_H = 60;
  const MARGIN_L = 8, MARGIN_B = 8;
  const CW = CHART_W - MARGIN_L;
  const CH = CHART_H - MARGIN_B;

  const toX = (t: number) => MARGIN_L + (t / Math.max(steps.length - 1, 1)) * CW;
  const toY = (v: number) => CHART_H / 2 - (v / maxC) * (CH / 2);

  const cPath = visibleSteps.length > 1
    ? visibleSteps.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.t).toFixed(1)},${toY(s.cellState).toFixed(1)}`).join(' ')
    : '';
  const hPath = visibleSteps.length > 1
    ? visibleSteps.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.t).toFixed(1)},${toY(s.hiddenState).toFixed(1)}`).join(' ')
    : '';

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="LSTM Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans,system-ui)' }}>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Gates panel */}
        <div role="region" aria-label="LSTM gates"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
            minWidth: 220, border: '1px solid var(--surface-border,rgba(255,255,255,0.08))' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
            LSTM Gates — t = {displayIdx + 1}
          </div>
          {current ? (
            <>
              <GateBar label="Forget gate f_t" value={current.gates.forgetGate} color={GATE_COLORS.forgetGate} />
              <GateBar label="Input gate i_t" value={current.gates.inputGate} color={GATE_COLORS.inputGate} />
              <GateBar label="Output gate o_t" value={current.gates.outputGate} color={GATE_COLORS.outputGate} />
              <GateBar label="Cell input g_t" value={Math.abs(current.gates.cellInput)} color={GATE_COLORS.cellInput} />
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  ['Input x_t', current.input.toFixed(4)],
                  ['Cell state c_t', current.cellState.toFixed(4)],
                  ['Hidden state h_t', current.hiddenState.toFixed(4)],
                  ['Output y_t', current.output.toFixed(4)],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#9CA3AF', fontSize: 12 }}>{k}</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: '#6B7280' }}>No data</div>}
        </div>

        {/* Cell/hidden state chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <svg width={CHART_W} height={CHART_H + 20} role="img" aria-label="Cell and hidden state over time"
            style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12 }}>
            {/* Zero line */}
            <line x1={MARGIN_L} y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            {cPath && <path d={cPath} fill="none" stroke={COLOR} strokeWidth={2} />}
            {hPath && <path d={hPath} fill="none" stroke="#6366F1" strokeWidth={2} strokeDasharray="4 2" />}
            {current && !prefersReduced && (
              <>
                <circle cx={toX(current.t)} cy={toY(current.cellState)} r={4} fill={COLOR} />
                <circle cx={toX(current.t)} cy={toY(current.hiddenState)} r={3} fill="#6366F1" />
              </>
            )}
            {/* Legend */}
            <line x1={MARGIN_L} y1={CHART_H + 12} x2={MARGIN_L + 20} y2={CHART_H + 12} stroke={COLOR} strokeWidth={2} />
            <text x={MARGIN_L + 24} y={CHART_H + 16} fill={COLOR} fontSize={10}>c_t</text>
            <line x1={MARGIN_L + 50} y1={CHART_H + 12} x2={MARGIN_L + 70} y2={CHART_H + 12} stroke="#6366F1" strokeWidth={1.5} strokeDasharray="4 2" />
            <text x={MARGIN_L + 74} y={CHART_H + 16} fill="#6366F1" fontSize={10}>h_t</text>
          </svg>

          {/* Time step selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((s, t) => (
              <button key={t} onClick={() => { stop(); setStepIdx(t); }}
                aria-label={`Go to timestep ${t}`} aria-current={t === displayIdx}
                style={{ width: 36, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: t === displayIdx ? COLOR : 'var(--surface-3,#242430)',
                  color: '#fff', fontSize: 12 }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Controls playing={playing} onPlayPause={() => setPlaying((p) => !p)}
        onBack={() => setStepIdx((s) => Math.max(s - 1, 0))}
        onForward={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
        onReset={reset} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
