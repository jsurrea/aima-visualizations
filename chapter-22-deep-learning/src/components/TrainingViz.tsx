import { useState, useRef, useEffect, useCallback } from 'react';
import { trainNetwork, type NetworkWeights, type TrainingStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

type Activation = 'sigmoid' | 'relu' | 'tanh';
const COLOR = '#10B981';
const LOSS_COLOR = '#F59E0B';

const XOR_DATA = [
  { x: [0, 0] as [number, number], y: 0 },
  { x: [0, 1] as [number, number], y: 1 },
  { x: [1, 0] as [number, number], y: 1 },
  { x: [1, 1] as [number, number], y: 0 },
];

const BASE_WEIGHTS: NetworkWeights = {
  W1: [[0.4, -0.3], [0.3, 0.5], [-0.2, 0.4], [0.1, -0.4]],
  b1: [0.1, -0.1, 0.05, -0.05],
  W2: [[0.6, -0.4, 0.3, -0.2]],
  b2: [0.1],
};

const SVG_W = 360, SVG_H = 180;
const MARGIN = { top: 16, right: 16, bottom: 36, left: 48 };
const PW = SVG_W - MARGIN.left - MARGIN.right;
const PH = SVG_H - MARGIN.top - MARGIN.bottom;

export default function TrainingViz() {
  const [activation, setActivation] = useState<Activation>('sigmoid');
  const [lr, setLr] = useState(0.1);
  const [steps, setSteps] = useState<ReadonlyArray<TrainingStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const s = trainNetwork(XOR_DATA, BASE_WEIGHTS, lr, 80, activation);
    setSteps(s);
    setStepIdx(0);
  }, [activation, lr]);

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

  const visibleSteps = prefersReduced ? steps : steps.slice(0, stepIdx + 1);
  const maxLoss = Math.max(...steps.map((s) => s.loss), 1);
  const current = steps[stepIdx];

  const toX = (epoch: number) => MARGIN.left + (epoch / Math.max(steps.length - 1, 1)) * PW;
  const toY = (loss: number) => MARGIN.top + (1 - loss / maxLoss) * PH;

  const linePath = visibleSteps.length > 1
    ? visibleSteps.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.epoch).toFixed(1)},${toY(s.loss).toFixed(1)}`).join(' ')
    : '';

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="Training Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans,system-ui)' }}>
      {/* Selectors */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['sigmoid', 'relu', 'tanh'] as Activation[]).map((a) => (
            <button key={a} onClick={() => setActivation(a)}
              aria-label={`Use ${a} activation`} aria-pressed={activation === a}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activation === a ? COLOR : 'var(--surface-3,#242430)',
                color: activation === a ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: 13 }}>
              {a}
            </button>
          ))}
        </div>
        <label style={{ color: '#9CA3AF', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
          LR:
          {[0.01, 0.1, 0.5].map((v) => (
            <button key={v} onClick={() => setLr(v)}
              aria-label={`Learning rate ${v}`} aria-pressed={lr === v}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: lr === v ? LOSS_COLOR : 'var(--surface-3,#242430)',
                color: lr === v ? '#000' : '#9CA3AF', fontSize: 13 }}>
              {v}
            </button>
          ))}
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Loss chart */}
        <svg width={SVG_W} height={SVG_H} role="img" aria-label="Loss curve"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12 }}>
          {/* Grid */}
          {[0.25, 0.5, 0.75, 1].map((frac) => (
            <line key={frac} x1={MARGIN.left} y1={MARGIN.top + (1 - frac) * PH}
              x2={SVG_W - MARGIN.right} y2={MARGIN.top + (1 - frac) * PH}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          ))}
          {/* Axes */}
          <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + PH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={MARGIN.left} y1={MARGIN.top + PH} x2={SVG_W - MARGIN.right} y2={MARGIN.top + PH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          {/* Loss curve */}
          {linePath && <path d={linePath} fill="none" stroke={LOSS_COLOR} strokeWidth={2.5} />}
          {/* Current point */}
          {current && !prefersReduced && (
            <circle cx={toX(current.epoch)} cy={toY(current.loss)} r={5}
              fill={LOSS_COLOR} stroke="#fff" strokeWidth={1.5} />
          )}
          {/* Axis labels */}
          <text x={MARGIN.left + PW / 2} y={SVG_H - 4} textAnchor="middle" fill="#6B7280" fontSize={11}>Epoch</text>
          <text x={12} y={MARGIN.top + PH / 2} textAnchor="middle" fill="#6B7280" fontSize={11}
            transform={`rotate(-90,12,${MARGIN.top + PH / 2})`}>Loss</text>
        </svg>

        {/* State panel */}
        <div role="region" aria-label="Training state"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
            minWidth: 180, border: '1px solid var(--surface-border,rgba(255,255,255,0.08))' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Training State</div>
          {current && (
            <>
              {[
                ['Epoch', `${current.epoch + 1} / ${steps.length}`],
                ['Loss', current.loss.toFixed(5)],
                ['|∇|', current.gradNorm.toFixed(4)],
                ['LR', String(lr)],
                ['Activation', activation],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: '#9CA3AF', fontSize: 13 }}>{k}</span>
                  <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>Dataset: XOR (4 samples)</div>
        </div>
      </div>

      <Controls playing={playing} onPlayPause={() => setPlaying((p) => !p)}
        onBack={() => setStepIdx((s) => Math.max(s - 1, 0))}
        onForward={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
        onReset={reset} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
