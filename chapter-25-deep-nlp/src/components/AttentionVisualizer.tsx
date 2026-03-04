import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { computeAttention, beamSearch } from '../algorithms/index';
import type { BeamSearchStep } from '../algorithms/index';
import { interpolateColor, renderDisplayMath } from '../utils/mathUtils';

const SOURCE_WORDS = ["The", "front", "door", "is", "red"] as const;
const TARGET_WORDS = ["La", "puerta", "de", "entrada", "es", "roja"] as const;
const sourceVecs: number[][] = [
  [1.0, 0.2, -0.3, 0.5, 0.1],
  [0.3, 1.0, 0.2, -0.1, 0.4],
  [0.8, 0.5, 1.0, 0.2, -0.2],
  [0.1, 0.3, 0.4, 1.0, 0.3],
  [0.6, -0.1, 0.2, 0.3, 1.0],
];
const targetVecs: number[][] = [
  [0.9, 0.1, -0.2, 0.4, 0.2],
  [0.4, 0.9, 0.3, -0.1, 0.3],
  [0.2, 0.4, 0.8, 0.1, -0.1],
  [0.1, 0.3, 0.5, 0.9, 0.2],
  [0.3, 0.2, 0.3, 0.2, 0.8],
  [0.7, 0.0, 0.1, 0.2, 0.9],
];

const VOCAB = ["<END>", "La", "puerta", "es", "roja", "de", "entrada"] as const;

function getNextScores(tokens: string[]): Record<string, number> {
  const last = tokens[tokens.length - 1] ?? '<START>';
  const tables: Record<string, Record<string, number>> = {
    '<START>': { 'La': -0.3, 'puerta': -1.5, 'es': -2.0, 'roja': -2.5, 'de': -2.2, '<END>': -3.0, 'entrada': -3.0 },
    'La': { 'puerta': -0.4, 'La': -2.0, 'es': -1.8, 'roja': -2.5, 'de': -1.5, '<END>': -3.0, 'entrada': -2.8 },
    'puerta': { 'es': -0.5, 'de': -0.8, 'La': -2.5, 'roja': -1.8, 'puerta': -3.0, '<END>': -2.0, 'entrada': -2.5 },
    'de': { 'entrada': -0.3, 'La': -2.0, 'es': -1.5, 'roja': -2.5, 'puerta': -2.0, '<END>': -2.8, 'de': -3.0 },
    'entrada': { 'es': -0.4, 'La': -2.5, 'roja': -1.8, 'de': -2.0, 'puerta': -2.5, '<END>': -1.5, 'entrada': -3.0 },
    'es': { 'roja': -0.3, 'La': -2.8, 'de': -1.8, 'puerta': -2.5, 'es': -3.0, '<END>': -1.0, 'entrada': -2.5 },
    'roja': { '<END>': -0.2, 'La': -2.5, 'es': -2.0, 'de': -2.2, 'puerta': -3.0, 'roja': -3.0, 'entrada': -3.0 },
    '<END>': { '<END>': 0, 'La': -5.0, 'es': -5.0, 'roja': -5.0, 'de': -5.0, 'puerta': -5.0, 'entrada': -5.0 },
  };
  return tables[last] ?? { '<END>': 0 };
}

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function AttentionVisualizer() {
  const [attentionStep, setAttentionStep] = useState(0);
  const [beamStep, setBeamStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [beamSize, setBeamSize] = useState(2);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const allAttention = useMemo(() =>
    TARGET_WORDS.map((_, j) =>
      computeAttention(targetVecs[j]!, sourceVecs, sourceVecs, false)
    ), []);

  const beamSearchSteps: ReadonlyArray<BeamSearchStep> = useMemo(() =>
    beamSearch(getNextScores, '<START>', '<END>', [...VOCAB], beamSize, 6),
    [beamSize]);

  const maxBeamStep = beamSearchSteps.length - 1;
  const maxAttentionStep = TARGET_WORDS.length - 1;

  const animate = useCallback((now: number) => {
    if (now - lastTimeRef.current >= speed) {
      lastTimeRef.current = now;
      setAttentionStep(prev => Math.min(prev + 1, maxAttentionStep));
      setBeamStep(prev => Math.min(prev + 1, maxBeamStep));
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [speed, maxAttentionStep, maxBeamStep]);

  useEffect(() => {
    if (isPlaying && !prefersReduced) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, animate]);

  const handleReset = () => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setAttentionStep(0);
    setBeamStep(0);
  };

  const cellW = 60;
  const cellH = 44;
  const svgWidth = SOURCE_WORDS.length * cellW + 80;
  const svgHeight = TARGET_WORDS.length * cellH + 50;

  const currentBeamData = beamSearchSteps[beamStep];

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Attention and Beam Search</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Attention weights for translation (left) and beam search decoding (right).
      </p>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        {/* Section A: Attention Heatmap */}
        <div style={{ flex: '1 1 320px' }}>
          <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>Attention Heatmap</h4>
          <div style={{ marginBottom: '8px', overflowX: 'auto' }}>
            <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('\\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_k \\exp(e_{ik})}') }} />
          </div>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', maxWidth: `${svgWidth}px`, display: 'block', background: 'var(--surface-2)', borderRadius: '8px' }}
            aria-label="Attention heatmap"
          >
            {/* Source word labels on top */}
            {SOURCE_WORDS.map((word, col) => (
              <text
                key={col}
                x={40 + col * cellW + cellW / 2}
                y={18}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="11"
              >
                {word}
              </text>
            ))}
            {/* Target rows */}
            {TARGET_WORDS.map((tWord, row) => {
              if (row > attentionStep) return null;
              const attnResult = allAttention[row];
              return (
                <g key={row}>
                  {/* Target label */}
                  <text
                    x={35}
                    y={30 + row * cellH + cellH / 2}
                    textAnchor="end"
                    fill="#9CA3AF"
                    fontSize="11"
                  >
                    {tWord}
                  </text>
                  {SOURCE_WORDS.map((_, col) => {
                    const weight = attnResult?.weights[col] ?? 0;
                    const color = interpolateColor('#111118', '#F59E0B', weight);
                    return (
                      <g key={col}>
                        <rect
                          x={40 + col * cellW}
                          y={30 + row * cellH}
                          width={cellW - 2}
                          height={cellH - 2}
                          fill={color}
                          rx="2"
                        />
                        <text
                          x={40 + col * cellW + cellW / 2}
                          y={30 + row * cellH + cellH / 2 + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          opacity={0.8}
                        >
                          {weight.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Section B: Beam Search */}
        <div style={{ flex: '1 1 320px' }}>
          <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>Beam Search Decoding</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', color: '#D1D5DB' }}>
              Beam size:
              <select
                value={beamSize}
                onChange={e => { setBeamSize(Number(e.target.value)); setBeamStep(0); }}
                aria-label="Beam size"
                style={{ marginLeft: '8px', background: 'var(--surface-3)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '2px 6px' }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {beamSearchSteps.map((stepData, stepIdx) => {
              const isCurrentStep = stepIdx === beamStep;
              const isLastStep = stepIdx === beamSearchSteps.length - 1;
              return (
                <div key={stepIdx} style={{ minWidth: '120px' }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', textAlign: 'center' }}>
                    Step {stepData.step}
                  </div>
                  {stepData.beams.map((beam, bi) => {
                    const isWinner = isLastStep && bi === 0;
                    return (
                      <div
                        key={bi}
                        style={{
                          padding: '6px 8px',
                          marginBottom: '4px',
                          background: 'var(--surface-2)',
                          borderRadius: '6px',
                          border: isWinner
                            ? '2px solid #F59E0B'
                            : isCurrentStep
                              ? '2px solid white'
                              : '1px solid var(--surface-border)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ color: '#D1D5DB', wordBreak: 'break-all' }}>
                          {beam.tokens.slice(1).join(' ')}
                        </div>
                        <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '2px' }}>
                          {beam.score.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '16px', marginBottom: '16px' }}>
        <button
          onClick={() => setIsPlaying(p => !p)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ padding: '6px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => { setAttentionStep(p => Math.max(0, p - 1)); setBeamStep(p => Math.max(0, p - 1)); }}
          aria-label="Step back"
          style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Prev
        </button>
        <button
          onClick={() => { setAttentionStep(p => Math.min(maxAttentionStep, p + 1)); setBeamStep(p => Math.min(maxBeamStep, p + 1)); }}
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
        <div>Attention step: {attentionStep + 1} / {TARGET_WORDS.length} (target: {TARGET_WORDS[attentionStep]!})</div>
        <div>Beam step: {beamStep + 1} / {beamSearchSteps.length}</div>
        {currentBeamData && (
          <div>Active beams: {currentBeamData.beams.map(b => b.tokens.slice(1).join(' ') || '(empty)').join(' | ')}</div>
        )}
      </div>
    </div>
  );
}
