import { useState, useRef, useEffect, useCallback } from 'react';
import { autoencoderPass, type AutoencoderStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

const COLOR = '#10B981';
const DECODE_COLOR = '#6366F1';

// 8 → 4 → 2 → 4 → 8 autoencoder
const INPUT = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4];
const ENC_WEIGHTS: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
  // 8→4
  Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 8 }, (__, j) => (Math.sin(i * 2 + j) * 0.5 + 0.5) * 0.8 - 0.2)
  ),
  // 4→2
  Array.from({ length: 2 }, (_, i) =>
    Array.from({ length: 4 }, (__, j) => (Math.cos(i + j) * 0.5 + 0.5) * 0.8 - 0.2)
  ),
];
const DEC_WEIGHTS: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
  // 2→4
  Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 2 }, (__, j) => (Math.sin(i + j * 2) * 0.5 + 0.5) * 0.8 - 0.2)
  ),
  // 4→8
  Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: 4 }, (__, j) => (Math.cos(i * 2 + j) * 0.5 + 0.5) * 0.8 - 0.2)
  ),
];

function LayerBars({ values, color, label, isActive }:
  { values: ReadonlyArray<number>; color: string; label: string; isActive: boolean }) {
  const maxVal = Math.max(...values, 0.01);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '8px 6px', borderRadius: 8,
      background: isActive ? `${color}18` : 'transparent',
      border: isActive ? `1px solid ${color}40` : '1px solid transparent',
      transition: 'background 0.2s, border 0.2s' }}>
      <div style={{ fontSize: 11, color: isActive ? color : '#6B7280', marginBottom: 2, textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 60 }}>
        {values.map((v, i) => (
          <div key={i}
            aria-label={`Unit ${i}: ${v.toFixed(3)}`}
            style={{ width: Math.max(8, Math.min(20, 120 / values.length)),
              height: `${Math.round((v / maxVal) * 100)}%`,
              minHeight: 2,
              background: isActive ? color : `${color}60`,
              borderRadius: 2,
              transition: 'height 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#6B7280' }}>{values.length} units</div>
    </div>
  );
}

export default function AutoencoderViz() {
  const [steps, setSteps] = useState<ReadonlyArray<AutoencoderStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(autoencoderPass(INPUT, ENC_WEIGHTS, DEC_WEIGHTS));
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

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="Autoencoder Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans,system-ui)' }}>

      {/* Architecture diagram */}
      <div style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 20,
        overflowX: 'auto', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', minWidth: 'max-content' }}>
          {steps.map((step, i) => {
            const isActive = i === displayIdx;
            const color = step.phase === 'encode' ? COLOR : DECODE_COLOR;
            const label = i === 0 ? 'Input' : step.action.replace(/\(.*\)/, '').trim();
            return (
              <LayerBars key={i} values={step.layerValues} color={color} label={label} isActive={isActive && !prefersReduced} />
            );
          })}
        </div>
        {/* Encode/Decode labels */}
        <div style={{ display: 'flex', marginTop: 8, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLOR }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Encode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: DECODE_COLOR }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Decode</span>
          </div>
        </div>
      </div>

      {/* State panel */}
      {current && (
        <div role="region" aria-label="Autoencoder state"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
            border: '1px solid var(--surface-border,rgba(255,255,255,0.08))',
            display: 'inline-block', minWidth: 280, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Step {displayIdx + 1} / {steps.length}
          </div>
          <div style={{ color: current.phase === 'encode' ? COLOR : DECODE_COLOR,
            fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
            {current.action}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Phase: <span style={{ color: '#fff' }}>{current.phase}</span>
            &nbsp;·&nbsp; Units: <span style={{ color: '#fff' }}>{current.layerValues.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {current.layerValues.slice(0, 8).map((v, i) => (
              <span key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: '#E5E7EB',
                background: 'var(--surface-3,#242430)', padding: '2px 6px', borderRadius: 4 }}>
                [{i}]={v.toFixed(3)}
              </span>
            ))}
            {current.layerValues.length > 8 && (
              <span style={{ color: '#6B7280', fontSize: 12 }}>+{current.layerValues.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      <Controls playing={playing} onPlayPause={() => setPlaying((p) => !p)}
        onBack={() => setStepIdx((s) => Math.max(s - 1, 0))}
        onForward={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
        onReset={reset} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
