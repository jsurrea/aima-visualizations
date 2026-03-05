import { useState, useRef, useEffect, useCallback } from 'react';
import { forwardPassSteps, type NetworkWeights, type ForwardPassStep } from '../algorithms/index';

type Activation = 'sigmoid' | 'relu' | 'tanh';
const COLOR = '#10B981';

const DEFAULT_WEIGHTS: NetworkWeights = {
  W1: [[0.5, -0.3], [0.4, 0.6]],
  b1: [0.1, -0.1],
  W2: [[0.7, -0.5]],
  b2: [0.2],
};
const DEFAULT_X = [1, 0];

const NODES = {
  input: [{ x: 60, y: 70 }, { x: 60, y: 130 }],
  hidden: [{ x: 200, y: 70 }, { x: 200, y: 130 }],
  output: [{ x: 340, y: 100 }],
};
const ACTIVE_LAYERS: Record<string, string[]> = {
  input: ['input'],
  z1: ['input', 'hidden'],
  h1: ['hidden'],
  z2: ['hidden', 'output'],
  output: ['output'],
};

function NetworkSVG({ step }: { step: ForwardPassStep | null }) {
  const activeNodes = step ? (ACTIVE_LAYERS[step.layer] ?? []) : [];
  const outNode = NODES.output[0]!;
  return (
    <svg width={420} height={200} role="img" aria-label="Neural network diagram"
      style={{ background: 'var(--surface-2, #1A1A24)', borderRadius: 12 }}>
      {/* Edges input→hidden */}
      {NODES.input.flatMap((src, si) =>
        NODES.hidden.map((dst, di) => (
          <line key={`ih-${si}-${di}`} x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
            stroke={activeNodes.includes('input') && activeNodes.includes('hidden')
              ? COLOR : 'rgba(255,255,255,0.12)'}
            strokeWidth={activeNodes.includes('input') && activeNodes.includes('hidden') ? 2 : 1} />
        ))
      )}
      {/* Edges hidden→output */}
      {NODES.hidden.map((src, si) => (
        <line key={`ho-${si}`} x1={src.x} y1={src.y} x2={outNode.x} y2={outNode.y}
          stroke={activeNodes.includes('hidden') && activeNodes.includes('output')
            ? COLOR : 'rgba(255,255,255,0.12)'}
          strokeWidth={activeNodes.includes('hidden') && activeNodes.includes('output') ? 2 : 1} />
      ))}
      {/* Input nodes */}
      {NODES.input.map((n, i) => (
        <g key={`in-${i}`}>
          <circle cx={n.x} cy={n.y} r={20}
            fill={activeNodes.includes('input') ? COLOR : 'var(--surface-3, #242430)'}
            stroke={activeNodes.includes('input') ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>
            x{i + 1}
          </text>
        </g>
      ))}
      {/* Hidden nodes */}
      {NODES.hidden.map((n, i) => (
        <g key={`h-${i}`}>
          <circle cx={n.x} cy={n.y} r={20}
            fill={activeNodes.includes('hidden') ? COLOR : 'var(--surface-3, #242430)'}
            stroke={activeNodes.includes('hidden') ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>
            h{i + 1}
          </text>
        </g>
      ))}
      {/* Output node */}
      <circle cx={outNode.x} cy={outNode.y} r={20}
        fill={activeNodes.includes('output') ? COLOR : 'var(--surface-3, #242430)'}
        stroke={activeNodes.includes('output') ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />
      <text x={outNode.x} y={outNode.y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>out</text>
      {/* Layer labels */}
      <text x={60} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Input</text>
      <text x={200} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Hidden</text>
      <text x={340} y={180} textAnchor="middle" fill="#6B7280" fontSize={11}>Output</text>
    </svg>
  );
}

export default function ForwardPassViz() {
  const [activation, setActivation] = useState<Activation>('sigmoid');
  const [steps, setSteps] = useState<ReadonlyArray<ForwardPassStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setSteps(forwardPassSteps(DEFAULT_X, DEFAULT_WEIGHTS, 1, activation));
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
    <div tabIndex={0} onKeyDown={handleKey} aria-label="Forward Pass Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Activation selector */}
      <div role="radiogroup" aria-label="Activation function" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['sigmoid', 'relu', 'tanh'] as Activation[]).map((a) => (
          <button key={a} onClick={() => setActivation(a)}
            role="radio" aria-checked={activation === a}
            aria-label={`Use ${a} activation`}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activation === a ? COLOR : 'var(--surface-3, #242430)',
              color: activation === a ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
            {a}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <NetworkSVG step={currentStep} />

        {/* State panel */}
        <div role="region" aria-label="Forward pass state"
          style={{ background: 'var(--surface-2, #1A1A24)', borderRadius: 12, padding: 16,
            minWidth: 200, border: '1px solid var(--surface-border, rgba(255,255,255,0.08))' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Step {stepIdx + 1} / {steps.length}
          </div>
          {currentStep && (
            <>
              <div style={{ color: COLOR, fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                Layer: {currentStep.layer}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
                {currentStep.action}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                {currentStep.values.map((v, i) => (
                  <div key={i} style={{ color: '#E5E7EB' }}>[{i}] = {v.toFixed(4)}</div>
                ))}
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

function Controls({ playing, onPlayPause, onBack, onForward, onReset, speed, onSpeed }:
  { playing: boolean; onPlayPause: () => void; onBack: () => void; onForward: () => void;
    onReset: () => void; speed: number; onSpeed: (s: number) => void; }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={onPlayPause} aria-label={playing ? 'Pause' : 'Play'}
        style={btn(playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
      <button onClick={onBack} aria-label="Step backward" style={btn(false)}>← Step</button>
      <button onClick={onForward} aria-label="Step forward" style={btn(false)}>Step →</button>
      <button onClick={onReset} aria-label="Reset" style={btn(false)}>↺ Reset</button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 13 }}>
        Speed
        <input type="range" min={0.5} max={3} step={0.5} value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Speed" style={{ width: 80 }} />
        <span style={{ color: '#fff', minWidth: 28 }}>{speed}x</span>
      </label>
    </div>
  );
}

export { Controls };

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? COLOR : 'var(--surface-3, #242430)',
    color: active ? '#fff' : '#D1D5DB', fontSize: 14,
  };
}
