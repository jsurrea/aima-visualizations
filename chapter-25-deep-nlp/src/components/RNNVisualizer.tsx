import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { rnnForwardPass, averagePooling } from '../algorithms/index';
import { interpolateColor, renderDisplayMath } from '../utils/mathUtils';

const TOKENS = ["The", "red", "car", "is", "big"] as const;
const INPUTS: number[][] = (TOKENS as readonly string[]).map((_, i) => [Math.sin(i), Math.cos(i), i / 5]);
const Wxh = [[0.3, -0.2, 0.1], [0.1, 0.4, -0.3], [-0.2, 0.1, 0.5], [0.4, -0.1, 0.2]];
const Whh = [[0.2, 0.1, -0.3, 0.1], [0.1, 0.3, 0.1, -0.2], [-0.1, 0.2, 0.3, 0.1], [0.2, -0.1, 0.1, 0.4]];
const Why = [[0.3, 0.2, -0.1, 0.4], [-0.2, 0.3, 0.1, -0.3]];
const INITIAL_HIDDEN = [0, 0, 0, 0];

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function RNNVisualizer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [bidirectional, setBidirectional] = useState(false);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const forwardSteps = useMemo(() => rnnForwardPass(INPUTS, INITIAL_HIDDEN, Wxh, Whh, Why), []);
  const backwardSteps = useMemo(
    () => rnnForwardPass([...INPUTS].reverse(), INITIAL_HIDDEN, Wxh, Whh, Why),
    []
  );

  const totalSteps = TOKENS.length;

  const allHiddenStates: number[][] = useMemo(
    () => forwardSteps.map(s => s.hiddenState),
    [forwardSteps]
  );

  const pool = useMemo(() => averagePooling(allHiddenStates), [allHiddenStates]);

  const score0 = Why[0]!.reduce((s, w, i) => s + w * pool[i]!, 0);
  const score1 = Why[1]!.reduce((s, w, i) => s + w * pool[i]!, 0);
  const sentiment = score0 > score1 ? 'Positive' : 'Negative';

  const step = useCallback((now: number) => {
    if (now - lastTimeRef.current >= speed) {
      lastTimeRef.current = now;
      setCurrentStep(prev => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }
    rafRef.current = requestAnimationFrame(step);
  }, [speed, totalSteps]);

  useEffect(() => {
    if (isPlaying && !prefersReduced) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, step]);

  const handleReset = () => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setCurrentStep(0);
  };

  const startX = 60;
  const spacing = 120;

  const currentHidden = forwardSteps[currentStep]?.hiddenState ?? INITIAL_HIDDEN;

  function HeatmapSection({ steps, label }: { steps: typeof forwardSteps; label: string }) {
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>{label}</div>
        <svg
          viewBox={`0 0 ${4 * 40 + 60} ${5 * 28 + 40}`}
          style={{ width: '100%', maxWidth: '300px', display: 'block', background: 'var(--surface-2)', borderRadius: '8px' }}
          aria-label={`${label} hidden state heatmap`}
        >
          {/* Col headers */}
          {[0, 1, 2, 3].map(col => (
            <text key={col} x={60 + col * 40 + 20} y={18} textAnchor="middle" fill="#9CA3AF" fontSize="11">
              d{col}
            </text>
          ))}
          {steps.map((s, row) => (
            <g key={row}>
              {/* Row label */}
              <text x={52} y={40 + row * 28 + 14} textAnchor="end" fill="#9CA3AF" fontSize="11">
                h{row}
              </text>
              {s.hiddenState.map((val, col) => {
                const color = interpolateColor('#1e3a5f', '#F59E0B', Math.max(0, Math.min(1, (val + 1) / 2)));
                return (
                  <rect key={col} x={60 + col * 40} y={40 + row * 28} width={38} height={26} fill={color} rx="2" />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Recurrent Neural Network</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Unrolled RNN processing a 5-token sentence, showing hidden state evolution and sentiment.
      </p>

      <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('h_t = \\tanh(W_{xh}x_t + W_{hh}h_{t-1})') }} />
      </div>

      {/* Unrolled RNN diagram */}
      <svg
        viewBox="0 0 700 220"
        style={{ width: '100%', maxWidth: '700px', display: 'block', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '16px' }}
        aria-label="RNN unrolled diagram"
      >
        {TOKENS.map((token, t) => {
          const cx = startX + t * spacing;
          const isActive = t === currentStep;
          const inputFill = isActive ? '#1a3a6f' : '#1e3a5f';
          const hiddenFill = isActive ? '#5d4200' : '#3d2c00';
          const outputFill = isActive ? '#0a4e2a' : '#0a2e1a';
          const strokeW = isActive ? 3 : 1.5;

          return (
            <g key={t}>
              {/* Input to hidden */}
              <line x1={cx} y1={152} x2={cx} y2={118} stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4,2" />
              {/* Prev hidden to current hidden */}
              {t > 0 && (
                <line x1={cx - spacing + 18} y1={100} x2={cx - 18} y2={100} stroke="#F59E0B" strokeWidth="1.5" />
              )}
              {/* Hidden to output */}
              <line x1={cx} y1={82} x2={cx} y2={48} stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,2" />

              {/* Input circle */}
              <circle cx={cx} cy={170} r={18} fill={inputFill} stroke="#3B82F6" strokeWidth={strokeW} />
              <text x={cx} y={174} textAnchor="middle" fill="#3B82F6" fontSize="10">x{t}</text>

              {/* Hidden circle */}
              <circle cx={cx} cy={100} r={18} fill={hiddenFill} stroke="#F59E0B" strokeWidth={strokeW} />
              <text x={cx} y={104} textAnchor="middle" fill="#F59E0B" fontSize="10">h{t}</text>

              {/* Output circle */}
              <circle cx={cx} cy={30} r={18} fill={outputFill} stroke="#10B981" strokeWidth={strokeW} />
              <text x={cx} y={34} textAnchor="middle" fill="#10B981" fontSize="10">y{t}</text>

              {/* Token label */}
              <text x={cx} y={200} textAnchor="middle" fill="#D1D5DB" fontSize="11">
                {token}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Heatmaps */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <HeatmapSection steps={forwardSteps} label="Forward Pass" />
        {bidirectional && <HeatmapSection steps={backwardSteps} label="Backward Pass" />}
      </div>

      {/* Bidirectional toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#D1D5DB', marginBottom: '16px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={bidirectional}
          onChange={e => setBidirectional(e.target.checked)}
          aria-label="Bidirectional RNN"
        />
        Bidirectional RNN
      </label>

      {/* Sentiment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '14px', color: '#D1D5DB' }}>Sentiment:</span>
        <span style={{
          padding: '4px 12px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
          background: sentiment === 'Positive' ? '#10B98120' : '#EF444420',
          color: sentiment === 'Positive' ? '#10B981' : '#EF4444',
          border: `1px solid ${sentiment === 'Positive' ? '#10B981' : '#EF4444'}`,
        }}>
          {sentiment}
        </span>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
          scores: {score0.toFixed(3)} / {score1.toFixed(3)}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={() => setIsPlaying(p => !p)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ padding: '6px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
          aria-label="Step back"
          style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Prev
        </button>
        <button
          onClick={() => setCurrentStep(p => Math.min(totalSteps - 1, p + 1))}
          aria-label="Step forward"
          style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Next
        </button>
        <button onClick={handleReset} aria-label="Reset" style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Reset
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#D1D5DB' }}>
          Speed:
          <input
            type="range" min="100" max="2000" step="100"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '100px' }}
          />
          <span>{speed}ms</span>
        </label>
      </div>

      {/* State Panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#9CA3AF' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#D1D5DB' }}>State</div>
        <div>Step: {currentStep + 1} / {totalSteps}</div>
        <div>Token: {TOKENS[currentStep]!}</div>
        <div>h_t: [{currentHidden.map(v => v.toFixed(4)).join(', ')}]</div>
        <div>Sentiment: {sentiment} ({score0.toFixed(3)} vs {score1.toFixed(3)})</div>
      </div>
    </div>
  );
}
