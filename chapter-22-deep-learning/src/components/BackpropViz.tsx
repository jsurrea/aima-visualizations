import { useState, useRef, useEffect, useCallback } from 'react';
import { backpropSteps, type NetworkWeights, type BackpropStep } from '../algorithms/index';
import { Controls } from './ForwardPassViz';

type Activation = 'sigmoid' | 'relu' | 'tanh';
const COLOR = '#10B981';
const GRAD_COLOR = '#F59E0B';

const DEFAULT_WEIGHTS: NetworkWeights = {
  W1: [[0.5, -0.3], [0.4, 0.6]],
  b1: [0.1, -0.1],
  W2: [[0.7, -0.5]],
  b2: [0.2],
};
const DEFAULT_X = [1, 0];
const DEFAULT_TARGET = 1;

const NODES = {
  input: [{ x: 60, y: 70 }, { x: 60, y: 130 }],
  hidden: [{ x: 200, y: 70 }, { x: 200, y: 130 }],
  output: [{ x: 340, y: 100 }],
};

function BackpropSVG({ step }: { step: BackpropStep | null }) {
  const highlightOut = step?.layer === 'output';
  const highlightH0 = step?.layer === 'hidden_0';
  const highlightH1 = step?.layer === 'hidden_1';

  return (
    <svg width={420} height={200} role="img" aria-label="Backpropagation network diagram"
      style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12 }}>
      {/* Edges W2 (highlighted if output step) */}
      {NODES.hidden.map((src, si) => (
        <g key={`ho-${si}`}>
          <line x1={src.x} y1={src.y} x2={NODES.output[0]!.x} y2={NODES.output[0]!.y}
            stroke={highlightOut ? GRAD_COLOR : 'rgba(255,255,255,0.12)'}
            strokeWidth={highlightOut ? 2.5 : 1} strokeDasharray={highlightOut ? '6 3' : 'none'} />
          {highlightOut && step.gradients[si] !== undefined && (
            <text x={(src.x + NODES.output[0]!.x) / 2} y={(src.y + NODES.output[0]!.y) / 2 - 6}
              fill={GRAD_COLOR} fontSize={10} textAnchor="middle">
              ∇={step.gradients[si]!.toFixed(3)}
            </text>
          )}
        </g>
      ))}
      {/* Edges W1 */}
      {NODES.input.flatMap((src, si) =>
        NODES.hidden.map((dst, di) => {
          const isH0Active = highlightH0 && di === 0;
          const isH1Active = highlightH1 && di === 1;
          const active = isH0Active || isH1Active;
          return (
            <line key={`ih-${si}-${di}`} x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
              stroke={active ? GRAD_COLOR : 'rgba(255,255,255,0.12)'}
              strokeWidth={active ? 2 : 1} strokeDasharray={active ? '4 2' : 'none'} />
          );
        })
      )}
      {/* Input nodes */}
      {NODES.input.map((n, i) => (
        <g key={`in-${i}`}>
          <circle cx={n.x} cy={n.y} r={20} fill="var(--surface-3,#242430)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>x{i + 1}</text>
        </g>
      ))}
      {/* Hidden nodes */}
      {NODES.hidden.map((n, i) => {
        const active = (i === 0 && highlightH0) || (i === 1 && highlightH1);
        return (
          <g key={`h-${i}`}>
            <circle cx={n.x} cy={n.y} r={20}
              fill={active ? GRAD_COLOR : 'var(--surface-3,#242430)'}
              stroke={active ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>h{i + 1}</text>
          </g>
        );
      })}
      {/* Output node */}
      <circle cx={NODES.output[0]!.x} cy={NODES.output[0]!.y} r={20}
        fill={highlightOut ? COLOR : 'var(--surface-3,#242430)'}
        stroke={highlightOut ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />
      <text x={NODES.output[0]!.x} y={NODES.output[0]!.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>out</text>
      {/* Backprop arrow direction */}
      <text x={370} y={20} fill="#6B7280" fontSize={10}>← backprop</text>
      <text x={60} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Input</text>
      <text x={200} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Hidden</text>
      <text x={340} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Output</text>
    </svg>
  );
}

export default function BackpropViz() {
  const [activation, setActivation] = useState<Activation>('sigmoid');
  const [steps, setSteps] = useState<ReadonlyArray<BackpropStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(backpropSteps(DEFAULT_X, DEFAULT_TARGET, DEFAULT_WEIGHTS, activation));
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

  const currentStep = prefersReduced ? steps[steps.length - 1] ?? null : steps[stepIdx] ?? null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    if (e.key === 'ArrowRight') setStepIdx((s) => Math.min(s + 1, steps.length - 1));
    if (e.key === 'ArrowLeft') setStepIdx((s) => Math.max(s - 1, 0));
    if (e.key === 'r' || e.key === 'R') reset();
  };

  return (
    <div tabIndex={0} onKeyDown={handleKey} aria-label="Backpropagation Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans, system-ui)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['sigmoid', 'relu', 'tanh'] as Activation[]).map((a) => (
          <button key={a} onClick={() => setActivation(a)}
            aria-label={`Use ${a} activation`} aria-pressed={activation === a}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activation === a ? COLOR : 'var(--surface-3,#242430)',
              color: activation === a ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
            {a}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <BackpropSVG step={prefersReduced ? null : (steps[stepIdx] ?? null)} />

        <div role="region" aria-label="Backprop state"
          style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: 12, padding: 16,
            minWidth: 200, border: '1px solid var(--surface-border,rgba(255,255,255,0.08))' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Step {stepIdx + 1} / {steps.length}
          </div>
          {currentStep && (
            <>
              <div style={{ color: GRAD_COLOR, fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                {currentStep.layer}
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#9CA3AF', fontSize: 12 }}>delta: </span>
                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>
                  {currentStep.delta.toFixed(5)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Gradients:</div>
              {currentStep.gradients.map((g, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, color: '#E5E7EB' }}>
                  [{i}] = {g.toFixed(5)}
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
                {currentStep.action}
              </div>
            </>
          )}
        </div>
      </div>

      <Controls playing={playing} onPlayPause={() => setPlaying((p) => !p)}
        onBack={() => setStepIdx((s) => Math.max(s - 1, 0))}
        onForward={() => setStepIdx((s) => Math.min(s + 1, steps.length - 1))}
        onReset={reset} speed={speed} onSpeed={setSpeed} />
    </div>
  );
}
