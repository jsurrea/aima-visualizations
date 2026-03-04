import { useState, useEffect, useRef, useMemo } from 'react';
import {
  localBeamSearch,
  type LocalBeamSearchStep,
} from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const LANDSCAPE = [2, 4, 3, 7, 5, 8, 6, 9, 4, 3, 6, 8, 7, 5, 2, 1, 4, 6, 3, 2];
const INITIAL_POSITIONS = [0, 5, 12];
const K = 3;
const MAX_ITER = 10;
const MAX_HEIGHT = Math.max(...LANDSCAPE);

const BEAM_COLORS = ['#6366F1', '#F59E0B', '#10B981'];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#1A1A24' : '#242430',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        color: disabled ? '#4B5563' : '#E5E7EB',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '16px',
        height: '36px',
        minWidth: '36px',
        padding: '0 10px',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LocalBeamSearchViz(): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const steps = useMemo(
    () => localBeamSearch(LANDSCAPE, INITIAL_POSITIONS, MAX_ITER),
    [],
  );

  const totalSteps = steps.length;
  const clampedIndex = Math.min(stepIndex, totalSteps - 1);
  const step = steps[clampedIndex] as LocalBeamSearchStep;

  // Build a Set of beam x positions and successor x positions for fast lookup
  const beamXSet = useMemo(
    () => new Set(step.beams.map(b => b.x)),
    [step],
  );
  const successorXSet = useMemo(
    () => new Set(step.allSuccessors.map(s => s.x)),
    [step],
  );

  // RAF-based playback
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = 0;
    const interval = 1000 / speed;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, speed, totalSteps, prefersReducedMotion]);

  const handleReset = () => { setIsPlaying(false); setStepIndex(0); };
  const handleStepBack = () => { setIsPlaying(false); setStepIndex(p => Math.max(0, p - 1)); };
  const handlePlayPause = () => {
    if (clampedIndex >= totalSteps - 1) { setStepIndex(0); setIsPlaying(true); }
    else setIsPlaying(p => !p);
  };
  const handleStepForward = () => { setIsPlaying(false); setStepIndex(p => Math.min(totalSteps - 1, p + 1)); };

  const formulaHtml = renderDisplayMath(
    String.raw`x \leftarrow \text{top-}k \text{ successors across all beams}`,
  );

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '780px',
    margin: '24px auto 0',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '2px',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#E5E7EB',
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
        Local Beam Search
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
        Maintains <strong style={{ color: '#E5E7EB' }}>k={K}</strong> states simultaneously, selecting the top-k successors
        from all beams each iteration — unlike independent restarts, information is shared across beams.
      </p>

      {/* KaTeX formula */}
      <div
        aria-label="Formula: x gets top-k successors across all beams"
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
        style={{ marginBottom: '20px', overflowX: 'auto' }}
      />

      {/* Bar chart landscape */}
      <div
        role="img"
        aria-label={`Landscape with ${LANDSCAPE.length} positions. Beam positions: ${step.beams.map(b => `x=${b.x}`).join(', ')}.`}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '3px',
          height: '180px',
          padding: '0 4px 8px',
          marginBottom: '16px',
        }}
      >
        {LANDSCAPE.map((value, idx) => {
          const beamIdx = step.beams.findIndex(b => b.x === idx);
          const isBeam = beamIdx !== -1;
          const isSuccessor = !isBeam && successorXSet.has(idx);

          let barColor: string;
          if (isBeam) {
            barColor = BEAM_COLORS[beamIdx % BEAM_COLORS.length]!;
          } else if (isSuccessor) {
            barColor = 'rgba(99,102,241,0.35)';
          } else {
            barColor = '#374151';
          }

          return (
            <div
              key={idx}
              title={`x=${idx}, value=${value}`}
              style={{
                flex: 1,
                height: `${(value / MAX_HEIGHT) * 100}%`,
                background: barColor,
                borderRadius: '3px 3px 0 0',
                transition: prefersReducedMotion ? 'none' : 'background 0.2s',
                minHeight: '4px',
                outline: isBeam ? '2px solid rgba(255,255,255,0.5)' : 'none',
                outlineOffset: '1px',
              }}
            />
          );
        })}
      </div>

      {/* Beam legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px' }}>
        {step.beams.map((beam, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D1D5DB' }}>
            <span style={{
              display: 'inline-block', width: '12px', height: '12px',
              borderRadius: '3px', background: BEAM_COLORS[i % BEAM_COLORS.length],
            }} />
            Beam {i + 1}: x={beam.x}, val={beam.value}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D1D5DB' }}>
          <span style={{
            display: 'inline-block', width: '12px', height: '12px',
            borderRadius: '3px', background: 'rgba(99,102,241,0.35)', border: '1px solid #6366F1',
          }} />
          Successor
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <ControlButton label="Reset" onClick={handleReset}>⏮</ControlButton>
        <ControlButton label="Step backward" onClick={handleStepBack} disabled={clampedIndex === 0}>◀</ControlButton>
        <ControlButton label={isPlaying ? 'Pause' : 'Play'} onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </ControlButton>
        <ControlButton label="Step forward" onClick={handleStepForward} disabled={clampedIndex >= totalSteps - 1}>▶|</ControlButton>
        <span style={{ color: '#6B7280', fontSize: '13px', marginLeft: '8px' }}>
          Step {clampedIndex + 1} / {totalSteps}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', marginLeft: 'auto' }}>
          Speed
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
            style={{ width: '80px' }}
          />
          {speed}×
        </label>
      </div>

      {/* State inspection panel */}
      <div
        role="region"
        aria-label="State inspection panel"
        style={{
          marginTop: '8px',
          padding: '14px 16px',
          background: '#0A0A0F',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={statLabelStyle}>Iteration</div>
          <div style={statValueStyle}>{step.iteration}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Best Value</div>
          <div style={{ ...statValueStyle, color: '#10B981' }}>{step.bestValue}</div>
        </div>
        {step.beams.map((beam, i) => (
          <div key={i}>
            <div style={statLabelStyle}>Beam {i + 1}</div>
            <div style={{ ...statValueStyle, color: BEAM_COLORS[i % BEAM_COLORS.length] }}>
              x={beam.x} ({beam.value})
            </div>
          </div>
        ))}
        <div>
          <div style={statLabelStyle}>Successors</div>
          <div style={statValueStyle}>{step.allSuccessors.length}</div>
        </div>
      </div>

      {/* Action description */}
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        background: '#0D1117',
        borderRadius: '8px',
        borderLeft: '3px solid #6366F1',
        fontSize: '13px',
        color: '#D1D5DB',
        lineHeight: 1.5,
      }}>
        {step.action}
      </div>
    </div>
  );
}
