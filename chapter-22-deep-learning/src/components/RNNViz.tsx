import { useState, useRef, useEffect, useCallback } from 'react';
import { rnnForward, type RNNStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

const COLOR = '#10B981';
const HIDDEN_COLOR = '#6366F1';
const OUT_COLOR = '#F59E0B';

const SEQUENCE = [0.5, -0.3, 0.8, -0.5, 0.2, 0.7, -0.1, 0.4];

export default function RNNViz() {
  const [steps, setSteps] = useState<ReadonlyArray<RNNStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(rnnForward(SEQUENCE, 0.5, 0.8, 0.6, 0, 0, 0));
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
  const visibleSteps = prefersReduced ? steps : steps.slice(0, displayIdx + 1);

  const CELL_W = 52, CELL_H = 60, GAP = 12;
  const svgW = Math.max(200, steps.length * (CELL_W + GAP) + 40);
  const svgH = 140;

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="RNN Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans,system-ui)' }}>

      <div style={{ overflowX: 'auto' }}>
        <svg width={svgW} height={svgH} role="img" aria-label="RNN unrolled through time"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, display: 'block' }}>
          {steps.map((step, t) => {
            const cx = 20 + t * (CELL_W + GAP) + CELL_W / 2;
            const isActive = t === displayIdx && !prefersReduced;
            const isVisible = visibleSteps[t] !== undefined;
            const stepData = visibleSteps[t];

            return (
              <g key={t}>
                {/* Arrow from previous hidden state */}
                {t > 0 && isVisible && (
                  <line x1={cx - CELL_W - GAP + CELL_W / 2} y1={50}
                    x2={cx - GAP / 2} y2={50}
                    stroke={isActive ? COLOR : 'rgba(99,102,241,0.5)'}
                    strokeWidth={isActive ? 2 : 1}
                    markerEnd="url(#arrow)" />
                )}
                {/* RNN cell box */}
                <rect x={cx - CELL_W / 2} y={30} width={CELL_W} height={40}
                  rx={6} ry={6}
                  fill={isActive ? COLOR : (isVisible ? 'rgba(16,185,129,0.15)' : 'var(--surface-3,#242430)')}
                  stroke={isActive ? '#fff' : (isVisible ? COLOR : 'rgba(255,255,255,0.15)')}
                  strokeWidth={1.5} />
                <text x={cx} y={53} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600}>RNN</text>
                {/* Input label */}
                <text x={cx} y={20} textAnchor="middle" fill="#9CA3AF" fontSize={10}>
                  x={SEQUENCE[t]!.toFixed(2)}
                </text>
                {/* Arrow from input */}
                <line x1={cx} y1={23} x2={cx} y2={30} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                {/* Output below */}
                {stepData && (
                  <>
                    <line x1={cx} y1={70} x2={cx} y2={85} stroke={OUT_COLOR} strokeWidth={1} />
                    <text x={cx} y={98} textAnchor="middle"
                      fill={OUT_COLOR} fontSize={10}>
                      y={stepData.output.toFixed(3)}
                    </text>
                    <text x={cx} y={112} textAnchor="middle"
                      fill={HIDDEN_COLOR} fontSize={10}>
                      h={stepData.hiddenNew.toFixed(3)}
                    </text>
                  </>
                )}
                {/* t label */}
                <text x={cx} y={130} textAnchor="middle" fill="#4B5563" fontSize={9}>t={t}</text>
              </g>
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(99,102,241,0.5)" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* State panel */}
      <div role="region" aria-label="RNN state"
        style={{ marginTop: 12, background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
          border: '1px solid var(--surface-border,rgba(255,255,255,0.08))', display: 'inline-block', minWidth: 280 }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          Step {displayIdx + 1} / {steps.length}
        </div>
        {steps[displayIdx] && (() => {
          const s = steps[displayIdx]!;
          return (
            <>
              {[
                ['t', s.t],
                ['Input x_t', s.input.toFixed(4)],
                ['h_{t-1}', s.hiddenPrev.toFixed(4)],
                ['h_t (new)', s.hiddenNew.toFixed(4)],
                ['Output y_t', s.output.toFixed(4)],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                  <span style={{ color: '#9CA3AF', fontSize: 13 }}>{k}</span>
                  <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{String(v)}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, color: '#818CF8', lineHeight: 1.5 }}>
                h_t = tanh(Wx·x_t + Wh·h_prev + bh)
              </div>
            </>
          );
        })()}
      </div>

      <Controls playing={playing} onPlayPause={() => setPlaying((p) => !p)}
        onBack={() => setStepIdx((s) => Math.max(s - 1, 0))}
        onForward={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
        onReset={reset} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
