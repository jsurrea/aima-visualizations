import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { renderDisplayMath } from '../utils/mathUtils';
import { generateOUPMWorld, mulberry32, type OUPMGenerationStep } from '../algorithms';

const COLOR = '#EC4899';
/** Honest customers have exactly 1 login; more than this indicates dishonesty. */
const HONEST_LOGIN_COUNT = 1;

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  playing: boolean;
  speed: number;
  color: string;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function PlaybackControls({
  currentStep,
  totalSteps,
  playing,
  speed,
  color,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <button
        onClick={onReset}
        aria-label="Reset to beginning"
        title="Reset"
        style={btnStyle('#6B7280')}
      >
        ⏮
      </button>
      <button
        onClick={onStepBack}
        disabled={currentStep <= 0}
        aria-label="Step backward"
        title="Step back"
        style={btnStyle(color, currentStep <= 0)}
      >
        ◀
      </button>
      <button
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
        style={btnStyle(color)}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1}
        aria-label="Step forward"
        title="Step forward"
        style={btnStyle(color, currentStep >= totalSteps - 1)}
      >
        ▶
      </button>
      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'rgba(255,255,255,0.15)',
          margin: '0 4px',
        }}
      />
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#9CA3AF',
        }}
      >
        Speed:
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          aria-label="Animation speed"
          style={{ accentColor: color, width: '80px' }}
        />
        <span style={{ color: 'white', minWidth: '28px' }}>{speed}x</span>
      </label>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : color + '22',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color + '44'}`,
    color: disabled ? '#4B5563' : color,
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    opacity: disabled ? 0.5 : 1,
  };
}

function StateField({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ background: '#111118', borderRadius: '8px', padding: '8px 12px' }}>
      <div
        style={{
          fontSize: '11px',
          color: '#6B7280',
          marginBottom: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: color,
          fontWeight: 600,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function OUPMVisualizer() {
  const [seed, setSeed] = useState(42);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const steps = useMemo<ReadonlyArray<OUPMGenerationStep>>(
    () => generateOUPMWorld(mulberry32(seed)),
    [seed],
  );

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const tick = useCallback(
    (ts: number) => {
      const delay = 1000 / speedRef.current;
      if (ts - lastTimeRef.current >= delay) {
        lastTimeRef.current = ts;
        setCurrentStep(s => {
          if (s >= steps.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [steps.length],
  );

  useEffect(() => {
    if (playing && !prefersReduced) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, tick, prefersReduced]);

  useEffect(() => {
    setCurrentStep(0);
    setPlaying(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [seed]);

  const visibleSteps = steps.slice(0, currentStep + 1);
  const currentS = steps[currentStep];

  const dishonestInfo = useMemo(() => {
    const result: string[] = [];
    for (const s of visibleSteps) {
      if (s.variableName.startsWith('#LoginID') && Number(s.value) > HONEST_LOGIN_COUNT) {
        result.push(`${s.variableName} = ${s.value} (dishonest!)`);
      }
    }
    return result;
  }, [visibleSteps]);

  function handleRegenerate() {
    setSeed(s => s + 1);
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <h3
          style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}
        >
          §18.2 Open-Universe Probability Models
        </h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          Open-Universe Probability Models extend RPMs to handle{' '}
          <strong style={{ color: '#E5E7EB' }}>uncertainty about which objects exist</strong>.
          Instead of fixing the number of customers and books, we have{' '}
          <em>number statements</em> that say how many objects of each type to create. Dishonest
          customers can create multiple fake login IDs!
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '8px',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <MathBlock latex="\#Customer \sim \text{UniformInt}(1,3)" />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <MathBlock latex="\#Book \sim \text{UniformInt}(2,4)" />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <MathBlock latex="\#LoginID(c) \sim \begin{cases} \text{Exactly}(1) & \text{if Honest}(c) \\ \text{UniformInt}(2,5) & \text{otherwise} \end{cases}" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleRegenerate}
          aria-label="Regenerate world with new random seed"
          style={{
            background: COLOR + '22',
            border: `1px solid ${COLOR}66`,
            color: COLOR,
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          🎲 Regenerate World
        </button>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Seed: {seed}</span>
      </div>

      {/* Table visualization */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                Variable
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                Kind
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                Value
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                P(value)
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  color: '#9CA3AF',
                  fontWeight: 600,
                }}
              >
                Running P
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSteps.map((s, i) => {
              const isNumber = s.kind === 'number';
              const isCurrent = i === currentStep;
              const isDishonest = s.variableName.startsWith('#LoginID') && Number(s.value) > HONEST_LOGIN_COUNT;
              return (
                <tr
                  key={i}
                  style={{
                    background: isCurrent
                      ? COLOR + '15'
                      : isDishonest
                        ? '#EF444415'
                        : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  <td
                    style={{
                      padding: '8px 12px',
                      color: isCurrent ? 'white' : '#E5E7EB',
                      fontFamily: 'monospace',
                    }}
                  >
                    {s.variableName}
                    {isDishonest && (
                      <span
                        style={{ marginLeft: '8px', color: '#EF4444', fontSize: '11px' }}
                      >
                        ⚠ fake IDs!
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        background: isNumber ? '#6366F120' : '#10B98120',
                        color: isNumber ? '#818CF8' : '#34D399',
                        border: `1px solid ${isNumber ? '#6366F130' : '#10B98130'}`,
                      }}
                    >
                      {s.kind}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      color: isNumber ? '#818CF8' : '#34D399',
                      fontWeight: 600,
                    }}
                  >
                    {String(s.value)}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: '#9CA3AF',
                      fontFamily: 'monospace',
                    }}
                  >
                    {s.probability.toFixed(4)}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: '#E5E7EB',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {s.runningProb.toExponential(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '16px' }}>
          <PlaybackControls
            currentStep={currentStep}
            totalSteps={steps.length}
            playing={playing}
            speed={speed}
            color={COLOR}
            onPlay={() => {
              if (currentStep >= steps.length - 1) setCurrentStep(0);
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onStepForward={() => setCurrentStep(s => Math.min(s + 1, steps.length - 1))}
            onStepBack={() => setCurrentStep(s => Math.max(s - 1, 0))}
            onReset={() => {
              setCurrentStep(0);
              setPlaying(false);
            }}
            onSpeedChange={setSpeed}
          />
        </div>
      </div>

      {/* State panel */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#9CA3AF',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          State Inspection
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <StateField label="Step" value={`${currentStep + 1} / ${steps.length}`} color={COLOR} />
          <StateField
            label="Variable"
            value={currentS?.variableName ?? '—'}
            color={currentS?.kind === 'number' ? '#818CF8' : '#34D399'}
          />
          <StateField label="Value" value={currentS ? String(currentS.value) : '—'} color={COLOR} />
          <StateField
            label="Probability"
            value={currentS?.probability.toFixed(4) ?? '—'}
            color={COLOR}
          />
          <StateField
            label="Running P"
            value={currentS?.runningProb.toExponential(3) ?? '—'}
            color={COLOR}
          />
        </div>
        {dishonestInfo.length > 0 && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: '#EF444415',
              border: '1px solid #EF444430',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#FCA5A5',
            }}
          >
            ⚠ Dishonest customer detected: honest customers have 1 login, but dishonest customers
            can have 2–5 fake IDs!
            <br />
            {dishonestInfo.join(', ')}
          </div>
        )}
        {currentS && (
          <div
            style={{ marginTop: '10px', fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}
          >
            {currentS.action}
          </div>
        )}
      </div>
    </div>
  );
}
