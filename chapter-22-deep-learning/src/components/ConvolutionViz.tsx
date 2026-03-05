import { useState, useRef, useEffect, useCallback } from 'react';
import { convolution1D, type ConvolutionStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

type Act = 'relu' | 'linear';
const COLOR = '#10B981';
const ACTIVE_COLOR = '#F59E0B';
const OUT_COLOR = '#6366F1';

const DEFAULT_INPUT = [1, 2, 3, 4, 5, 4, 3, 2, 1, 2];
const DEFAULT_KERNEL = [1, 0, -1];

function numToColor(v: number, max: number): string {
  const t = Math.abs(v) / Math.max(Math.abs(max), 0.01);
  const a = Math.round(t * 200 + 30);
  return v >= 0 ? `rgba(16,185,129,${a / 255})` : `rgba(239,68,68,${a / 255})`;
}

export default function ConvolutionViz() {
  const [activation, setActivation] = useState<Act>('relu');
  const [steps, setSteps] = useState<ReadonlyArray<ConvolutionStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(convolution1D(DEFAULT_INPUT, DEFAULT_KERNEL, activation));
    setStepIdx(0);
  }, [activation]);

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
  const currentPos = current?.position ?? -1;

  const CELL_W = 36, CELL_H = 36;
  const maxInputVal = Math.max(...DEFAULT_INPUT.map(Math.abs));
  const outputUpTo = prefersReduced ? steps : steps.slice(0, displayIdx + 1);
  const maxOutVal = Math.max(...steps.map((s) => Math.abs(s.output)), 1);

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="1D Convolution Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans,system-ui)' }}>
      {/* Activation toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['relu', 'linear'] as Act[]).map((a) => (
          <button key={a} onClick={() => setActivation(a)}
            aria-label={`Use ${a} activation`} role="radio" aria-checked={activation === a}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activation === a ? COLOR : 'var(--surface-3,#242430)',
              color: activation === a ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
            {a}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 20, display: 'inline-block' }}>
        {/* Input row */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Input</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {DEFAULT_INPUT.map((v, i) => {
              const inPatch = i >= currentPos && i < currentPos + DEFAULT_KERNEL.length;
              return (
                <div key={i}
                  style={{ width: CELL_W, height: CELL_H, borderRadius: 6, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                    background: inPatch && !prefersReduced ? ACTIVE_COLOR : numToColor(v, maxInputVal),
                    color: inPatch && !prefersReduced ? '#000' : '#fff',
                    transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}
                  aria-label={`Input[${i}]=${v}`}>
                  {v}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kernel */}
        <div style={{ marginBottom: 8, marginLeft: currentPos * (CELL_W + 3) }}>
          <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Kernel</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {DEFAULT_KERNEL.map((v, i) => (
              <div key={i}
                style={{ width: CELL_W, height: CELL_H, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                  background: 'rgba(99,102,241,0.3)', color: '#fff',
                  border: '1px solid rgba(99,102,241,0.5)' }}
                aria-label={`Kernel[${i}]=${v}`}>
                {v}
              </div>
            ))}
          </div>
        </div>

        {/* Output row */}
        <div>
          <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Output ({activation})</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: steps.length }, (_, i) => {
              const outStep = outputUpTo[i];
              return (
                <div key={i}
                  style={{ width: CELL_W, height: CELL_H, borderRadius: 6, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                    background: outStep
                      ? (i === displayIdx && !prefersReduced ? OUT_COLOR : numToColor(outStep.output, maxOutVal))
                      : 'var(--surface-3,#242430)',
                    color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  aria-label={outStep ? `Output[${i}]=${outStep.output.toFixed(2)}` : `Output[${i}]=?`}>
                  {outStep ? outStep.output.toFixed(1) : '?'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* State panel */}
      {current && (
        <div role="region" aria-label="Convolution state"
          style={{ marginTop: 12, background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
            border: '1px solid var(--surface-border,rgba(255,255,255,0.08))', display: 'inline-block', minWidth: 260 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Step {displayIdx + 1} / {steps.length}
          </div>
          <div style={{ fontSize: 13, color: '#E5E7EB', lineHeight: 1.6 }}>
            {[
              ['Position', current.position],
              ['Patch', `[${current.inputPatch.join(', ')}]`],
              ['Dot product', current.sum.toFixed(3)],
              ['After ' + activation, current.output.toFixed(3)],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', gap: 12, marginBottom: 3 }}>
                <span style={{ color: '#9CA3AF', minWidth: 90 }}>{k}:</span>
                <span style={{ fontFamily: 'monospace' }}>{String(v)}</span>
              </div>
            ))}
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
