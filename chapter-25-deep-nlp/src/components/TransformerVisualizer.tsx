import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { selfAttentionLayer, positionalEncoding } from '../algorithms/index';
import { interpolateColor, renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const SENTENCE = ["Yesterday", "they", "cut", "the", "rope"] as const;
const TOKEN_EMBEDDINGS: Record<string, number[]> = {
  'Yesterday': [1, 0, 0, 0],
  'they': [0, 1, 0, 0],
  'cut': [0, 0, 1, 0],
  'the': [0, 0, 0, 1],
  'rope': [1, 1, 0, 0],
};
const Wq = [[0.3, 0.1, -0.2, 0.4], [0.1, 0.4, 0.3, -0.1], [-0.2, 0.2, 0.4, 0.1], [0.4, -0.1, 0.1, 0.3]];
const Wk = [[0.2, 0.3, 0.1, -0.3], [0.4, 0.1, -0.2, 0.3], [0.1, -0.3, 0.3, 0.2], [-0.1, 0.4, 0.2, 0.1]];
const Wv = [[0.1, 0.2, 0.3, 0.4], [0.4, 0.3, 0.2, 0.1], [0.2, 0.4, 0.1, 0.3], [0.3, 0.1, 0.4, 0.2]];
const Wq2 = [[0.1, -0.3, 0.4, 0.2], [0.3, 0.1, -0.1, 0.4], [-0.1, 0.4, 0.2, 0.1], [0.2, 0.3, 0.1, -0.2]];
const Wk2 = [[0.4, 0.2, -0.1, 0.3], [-0.2, 0.3, 0.4, 0.1], [0.3, -0.1, 0.2, 0.4], [0.1, 0.4, 0.3, -0.2]];
const Wv2 = [[0.2, 0.1, 0.4, 0.3], [0.3, 0.4, 0.1, 0.2], [0.1, 0.3, 0.2, 0.4], [0.4, 0.2, 0.3, 0.1]];

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TransformerVisualizer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [useScale, setUseScale] = useState(true);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const totalSteps = 35;

  const inputEmbeddings = useMemo(() => SENTENCE.map(tok => TOKEN_EMBEDDINGS[tok]!), []);
  const result1 = useMemo(() => selfAttentionLayer(inputEmbeddings, Wq, Wk, Wv, useScale), [inputEmbeddings, useScale]);
  const result2 = useMemo(() => selfAttentionLayer(inputEmbeddings, Wq2, Wk2, Wv2, useScale), [inputEmbeddings, useScale]);

  const phase = currentStep < 5 ? 0 : currentStep < 30 ? 1 : 2;
  const tokenInPhase = phase === 0
    ? currentStep
    : phase === 2
      ? currentStep - 30
      : Math.floor((currentStep - 5) / 5);

  const phaseLabel = phase === 0
    ? 'Q/K/V Projection'
    : phase === 1
      ? 'Attention Matrix'
      : 'Context Vectors';

  const animStep = useCallback((now: number) => {
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
    rafRef.current = requestAnimationFrame(animStep);
  }, [speed]);

  useEffect(() => {
    if (isPlaying && !prefersReduced) {
      rafRef.current = requestAnimationFrame(animStep);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, animStep]);

  const handleReset = () => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setCurrentStep(0);
    setSelectedCell(null);
  };

  const cellSize = 44;
  const n = SENTENCE.length;

  // Determine filled cells during attention phase
  const filledCells: Set<string> = new Set();
  if (phase === 1) {
    const stepsIntoPhase = currentStep - 5;
    const rowsDone = Math.floor(stepsIntoPhase / 5);
    const colsDone = stepsIntoPhase % 5;
    for (let r = 0; r < rowsDone; r++) {
      for (let c = 0; c < n; c++) filledCells.add(`${r},${c}`);
    }
    for (let c = 0; c <= colsDone; c++) filledCells.add(`${rowsDone},${c}`);
  }

  function AttentionMatrix({
    result,
    headLabel,
    headColor,
  }: {
    result: typeof result1;
    headLabel: string;
    headColor: string;
  }) {
    const svgW = n * cellSize + 60;
    const svgH = n * cellSize + 50;
    return (
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: headColor, marginBottom: '4px' }}>{headLabel}</div>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', maxWidth: `${svgW}px`, display: 'block', background: 'var(--surface-2)', borderRadius: '8px' }}
          aria-label={`${headLabel} attention matrix`}
        >
          {/* Col labels */}
          {SENTENCE.map((tok, col) => (
            <text key={col} x={40 + col * cellSize + cellSize / 2} y={18} textAnchor="middle" fill="#9CA3AF" fontSize="10">
              {tok}
            </text>
          ))}
          {SENTENCE.map((tok, row) => (
            <g key={row}>
              {/* Row label */}
              <text x={35} y={30 + row * cellSize + cellSize / 2 + 4} textAnchor="end" fill="#9CA3AF" fontSize="10">
                {tok}
              </text>
              {SENTENCE.map((_, col) => {
                const key = `${row},${col}`;
                const showCell = phase !== 1 || filledCells.has(key);
                const weight = result.attentionMatrix[row]![col]!;
                const color = interpolateColor('#111118', headColor, weight);
                const isSel = selectedCell !== null && selectedCell[0] === row && selectedCell[1] === col;
                return (
                  <g key={col}>
                    <rect
                      x={40 + col * cellSize}
                      y={30 + row * cellSize}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      fill={showCell ? color : '#111118'}
                      rx="2"
                      stroke={isSel ? 'white' : 'none'}
                      strokeWidth={isSel ? 2 : 0}
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Attention from ${SENTENCE[row]} to ${SENTENCE[col]}: ${weight.toFixed(3)}`}
                      onClick={() => setSelectedCell(isSel ? null : [row, col])}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCell(isSel ? null : [row, col]);
                        }
                      }}
                    />
                    {showCell && (
                      <text
                        x={40 + col * cellSize + cellSize / 2}
                        y={30 + row * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize="9"
                        opacity={0.8}
                        style={{ pointerEvents: 'none' }}
                      >
                        {weight.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // Q/K/V bars
  const qkvCols = [
    { label: 'Q', color: '#3B82F6', data: result1.queries },
    { label: 'K', color: '#10B981', data: result1.keys },
    { label: 'V', color: '#F59E0B', data: result1.values },
  ];

  // Positional encoding heatmap
  const posEncRows = [0, 1, 2, 3, 4].map(pos => positionalEncoding(pos, 8));
  const peW = 8 * 44 + 40;
  const peH = 5 * 28 + 40;

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Transformer Self-Attention</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Multi-head self-attention showing Q/K/V projections, attention matrices, and positional encoding.
      </p>

      <div style={{ marginBottom: '12px', overflowX: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V') }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ background: 'var(--surface-3)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#D1D5DB' }}>
          Phase: {phaseLabel}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#D1D5DB', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useScale}
            onChange={e => setUseScale(e.target.checked)}
            aria-label="Scale by 1/sqrt(d_k)"
          />
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\text{Scale by } 1/\\sqrt{d_k}') }} />
        </label>
      </div>

      {/* Q/K/V Projections */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Q / K / V Projections (Head 1)</h4>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {qkvCols.map(({ label, color, data }) => (
            <div key={label} style={{ flex: '1 1 180px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color, marginBottom: '4px' }}>{label}</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {SENTENCE.map((tok, ti) => {
                  const vec = data[ti]!;
                  const opacity = phase === 0 ? (ti === tokenInPhase ? 1 : 0.4) : 1;
                  return (
                    <div key={ti} style={{ flex: 1, opacity }}>
                      <div style={{ fontSize: '9px', color: '#9CA3AF', textAlign: 'center', marginBottom: '2px' }}>
                        {tok.slice(0, 3)}
                      </div>
                      {vec.map((val, di) => {
                        const barH = Math.min(60, Math.abs(val) * 30);
                        return (
                          <div
                            key={di}
                            style={{
                              width: '100%',
                              height: `${barH}px`,
                              background: val >= 0 ? color : '#EF4444',
                              borderRadius: '2px',
                              marginBottom: '2px',
                            }}
                            title={`${label}[${ti}][${di}] = ${val.toFixed(3)}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attention matrices */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <AttentionMatrix result={result1} headLabel="Head 1" headColor="#6366F1" />
        <AttentionMatrix result={result2} headLabel="Head 2" headColor="#EC4899" />
      </div>

      {/* Positional Encoding */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Positional Encoding</h4>
        <svg
          viewBox={`0 0 ${peW} ${peH}`}
          style={{ width: '100%', maxWidth: `${peW}px`, display: 'block', background: 'var(--surface-2)', borderRadius: '8px' }}
          aria-label="Positional encoding heatmap"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map(di => (
            <text key={di} x={40 + di * 44 + 22} y={18} textAnchor="middle" fill="#9CA3AF" fontSize="10">
              d{di}
            </text>
          ))}
          {posEncRows.map((row, pos) => (
            <g key={pos}>
              <text x={35} y={30 + pos * 28 + 14} textAnchor="end" fill="#9CA3AF" fontSize="10">
                p{pos}
              </text>
              {row.map((val, di) => {
                const color = interpolateColor('#111118', '#EC4899', (val + 1) / 2);
                return (
                  <rect key={di} x={40 + di * 44} y={30 + pos * 28} width={42} height={26} fill={color} rx="2" />
                );
              })}
            </g>
          ))}
        </svg>
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
        <div>Phase: {phaseLabel}</div>
        <div>Token: {SENTENCE[Math.min(tokenInPhase, n - 1)]!}</div>
        <div>Scale: {useScale ? '1/sqrt(d_k)' : 'none'}</div>
        {selectedCell !== null && (
          <div>
            Selected: {SENTENCE[selectedCell[0]]!} attends to {SENTENCE[selectedCell[1]]!}
            {' '}(Head 1: {result1.attentionMatrix[selectedCell[0]]![selectedCell[1]]!.toFixed(3)},
            {' '}Head 2: {result2.attentionMatrix[selectedCell[0]]![selectedCell[1]]!.toFixed(3)})
          </div>
        )}
      </div>
    </div>
  );
}
