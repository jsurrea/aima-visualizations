import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  nearestNeighborFilter,
  hungarianFilter,
  type RadarBlip,
  type TrackState,
  type NNAssociationStep,
} from '../algorithms';

const COLOR = '#EC4899';

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

const TRUE_POSITIONS: Array<{ a1x: number; a2x: number }> = [
  { a1x: 20, a2x: 70 },
  { a1x: 32, a2x: 58 },
  { a1x: 44, a2x: 46 },
  { a1x: 56, a2x: 34 },
  { a1x: 68, a2x: 22 },
];

const BLIP_NOISE = [[3, -4], [-2, 5], [4, -3], [-3, 2], [2, -5]];

function makeScenario(): RadarBlip[][] {
  const observations: RadarBlip[][] = [];
  for (let t = 0; t < TRUE_POSITIONS.length; t++) {
    const pos = TRUE_POSITIONS[t]!;
    const noise1 = BLIP_NOISE[t]![0]!;
    const noise2 = BLIP_NOISE[t]![1]!;
    observations.push([
      { time: t + 1, id: t * 2 + 1, position: { x: pos.a1x + noise1, y: 50 } },
      { time: t + 1, id: t * 2 + 2, position: { x: pos.a2x + noise2, y: 50 } },
    ]);
  }
  return observations;
}

const SCENARIO_OBSERVATIONS = makeScenario();

const INITIAL_TRACKS: TrackState[] = [
  {
    objectId: 1,
    time: 0,
    truePosition: { x: 20, y: 50 },
    predictedPosition: { x: 20, y: 50 },
  },
  {
    objectId: 2,
    time: 0,
    truePosition: { x: 70, y: 50 },
    predictedPosition: { x: 70, y: 50 },
  },
];

const OBJ_COLORS: Record<number, string> = { 1: '#3B82F6', 2: '#F59E0B' };
const OBJ_NAMES: Record<number, string> = { 1: 'Aircraft A1', 2: 'Aircraft A2' };

export function DataAssociationVisualizer() {
  const [mode, setMode] = useState<'nn' | 'hungarian'>('nn');
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const steps = useMemo<ReadonlyArray<NNAssociationStep>>(() => {
    if (mode === 'nn') return nearestNeighborFilter(SCENARIO_OBSERVATIONS, INITIAL_TRACKS);
    return hungarianFilter(SCENARIO_OBSERVATIONS, INITIAL_TRACKS);
  }, [mode]);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const tick = useCallback(
    (ts: number) => {
      const delay = 1200 / speedRef.current;
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
  }, [mode]);

  const currentS = steps[currentStep];

  const trackHistory1: Array<{ x: number; y: number }> = [{ x: 20, y: 0 }];
  const trackHistory2: Array<{ x: number; y: number }> = [{ x: 70, y: 0 }];

  for (let i = 0; i <= currentStep; i++) {
    const s = steps[i];
    if (!s) continue;
    const t1 = s.updatedTracks.find(t => t.objectId === 1);
    const t2 = s.updatedTracks.find(t => t.objectId === 2);
    if (t1) trackHistory1.push({ x: t1.truePosition.x, y: i + 1 });
    if (t2) trackHistory2.push({ x: t2.truePosition.x, y: i + 1 });
  }

  const SVG_W = 560;
  const SVG_H = 320;
  const PAD = { left: 40, right: 20, top: 20, bottom: 30 };
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top - PAD.bottom;

  function toSvgX(pos: number) {
    return PAD.left + (pos / 100) * plotW;
  }
  function toSvgY(t: number) {
    return PAD.top + (t / 5) * plotH;
  }

  const crossingAt = 2;
  const hasSwap = mode === 'nn' && currentStep >= crossingAt;

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
          §18.3 Data Association Problem
        </h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '8px' }}>
          Radar detects <strong style={{ color: '#E5E7EB' }}>blips</strong> but doesn't know which
          object caused each blip. At each time step we must decide: which blip came from which
          aircraft? This is the <em>data association</em> problem.
        </p>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
          When two aircraft have{' '}
          <strong style={{ color: '#F59E0B' }}>crossing paths</strong>, the nearest-neighbor filter
          can swap their track IDs. The{' '}
          <strong style={{ color: '#10B981' }}>Hungarian algorithm</strong> finds the globally
          optimal assignment.
        </p>
      </div>

      {/* Mode selector */}
      <div
        style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}
      >
        {(['nn', 'hungarian'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${mode === m ? COLOR : 'rgba(255,255,255,0.15)'}`,
              background: mode === m ? COLOR + '22' : 'transparent',
              color: mode === m ? COLOR : '#9CA3AF',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {m === 'nn' ? '🔴 Nearest Neighbor (greedy)' : '🟢 Hungarian (optimal)'}
          </button>
        ))}
      </div>

      {/* SVG visualization */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
        }}
      >
        <svg
          width="100%"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display: 'block', maxWidth: '100%', marginBottom: '12px' }}
          aria-label="2D plot showing aircraft tracks and blip observations over time"
          role="img"
        >
          {/* Axes */}
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.2)"
          />
          <line
            x1={PAD.left}
            y1={PAD.top + plotH}
            x2={PAD.left + plotW}
            y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.2)"
          />
          <text
            x={PAD.left + plotW / 2}
            y={SVG_H - 5}
            textAnchor="middle"
            fontSize="11"
            fill="#6B7280"
          >
            Position
          </text>
          <text
            x={12}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fontSize="11"
            fill="#6B7280"
            transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}
          >
            Time
          </text>

          {/* Time tick labels */}
          {[0, 1, 2, 3, 4, 5].map(t => (
            <text
              key={t}
              x={PAD.left - 6}
              y={toSvgY(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6B7280"
            >
              {t}
            </text>
          ))}
          {/* X axis labels */}
          {[0, 20, 40, 60, 80, 100].map(v => (
            <text
              key={v}
              x={toSvgX(v)}
              y={PAD.top + plotH + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#6B7280"
            >
              {v}
            </text>
          ))}

          {/* True paths (dashed) */}
          <polyline
            points={TRUE_POSITIONS.map((p, i) => `${toSvgX(p.a1x)},${toSvgY(i + 1)}`).join(' ')}
            fill="none"
            stroke={OBJ_COLORS[1]}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.4}
          />
          <polyline
            points={TRUE_POSITIONS.map((p, i) => `${toSvgX(p.a2x)},${toSvgY(i + 1)}`).join(' ')}
            fill="none"
            stroke={OBJ_COLORS[2]}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.4}
          />

          {/* Estimated tracks (solid, up to currentStep) */}
          {trackHistory1.length > 1 && (
            <polyline
              points={trackHistory1.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
              fill="none"
              stroke={OBJ_COLORS[1]}
              strokeWidth={2}
            />
          )}
          {trackHistory2.length > 1 && (
            <polyline
              points={trackHistory2.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
              fill="none"
              stroke={OBJ_COLORS[2]}
              strokeWidth={2}
            />
          )}

          {/* Blip observations (+ marks) up to current step */}
          {steps.slice(0, currentStep + 1).map((s, si) =>
            s.blips.map(blip => {
              const assignment = s.assignment.find(a => a.blipId === blip.id);
              const objId = assignment?.objectId ?? 0;
              const col =
                objId === 1 ? OBJ_COLORS[1]! : objId === 2 ? OBJ_COLORS[2]! : '#888';
              return (
                <g key={`blip-${si}-${blip.id}`} aria-label={`Blip at step ${si + 1}`}>
                  <line
                    x1={toSvgX(blip.position.x) - 6}
                    y1={toSvgY(si + 1)}
                    x2={toSvgX(blip.position.x) + 6}
                    y2={toSvgY(si + 1)}
                    stroke={col}
                    strokeWidth={2}
                  />
                  <line
                    x1={toSvgX(blip.position.x)}
                    y1={toSvgY(si + 1) - 6}
                    x2={toSvgX(blip.position.x)}
                    y2={toSvgY(si + 1) + 6}
                    stroke={col}
                    strokeWidth={2}
                  />
                </g>
              );
            }),
          )}

          {/* Legend */}
          <rect
            x={PAD.left + 10}
            y={PAD.top + 10}
            width={130}
            height={50}
            rx={6}
            fill="rgba(0,0,0,0.5)"
          />
          <line
            x1={PAD.left + 18}
            y1={PAD.top + 24}
            x2={PAD.left + 34}
            y2={PAD.top + 24}
            stroke={OBJ_COLORS[1]}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <text x={PAD.left + 38} y={PAD.top + 28} fontSize="11" fill={OBJ_COLORS[1]}>
            A1 true path
          </text>
          <line
            x1={PAD.left + 18}
            y1={PAD.top + 44}
            x2={PAD.left + 34}
            y2={PAD.top + 44}
            stroke={OBJ_COLORS[2]}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <text x={PAD.left + 38} y={PAD.top + 48} fontSize="11" fill={OBJ_COLORS[2]}>
            A2 true path
          </text>
        </svg>

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
          State Inspection — Time Step {currentS?.time ?? 0}
        </div>
        {currentS && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '10px',
                fontSize: '13px',
                marginBottom: '10px',
              }}
            >
              <StateField
                label="Algorithm"
                value={mode === 'nn' ? 'Nearest Neighbor' : 'Hungarian'}
                color={COLOR}
              />
              <StateField
                label="Time Step"
                value={`${currentS.time} / ${steps.length}`}
                color={COLOR}
              />
              <StateField label="Blips" value={String(currentS.blips.length)} color={COLOR} />
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
              Assignments:
            </div>
            {currentS.assignment.map(a => (
              <div
                key={`${a.blipId}-${a.objectId}`}
                style={{
                  fontSize: '12px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#6B7280' }}>Blip #{a.blipId}</span>
                <span style={{ color: 'white' }}>→</span>
                <span
                  style={{
                    color: a.objectId === 1 ? OBJ_COLORS[1] : OBJ_COLORS[2],
                    fontWeight: 600,
                  }}
                >
                  {OBJ_NAMES[a.objectId] ?? `Obj #${a.objectId}`}
                </span>
                <span style={{ color: '#6B7280' }}>d = {a.distance.toFixed(1)}</span>
              </div>
            ))}
            <div
              style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}
            >
              {currentS.action}
            </div>
          </div>
        )}
        {hasSwap && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#EF444415',
              border: '1px solid #EF444430',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#FCA5A5',
            }}
          >
            ⚠ After the crossing point, nearest-neighbor may confuse the tracks! Compare with
            Hungarian to see the difference.
          </div>
        )}
      </div>
    </div>
  );
}
