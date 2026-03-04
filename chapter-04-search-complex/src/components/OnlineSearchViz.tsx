import { useState, useEffect, useRef, useMemo } from 'react';
import {
  onlineDFSAgent,
  lrtaStar,
  type OnlineDFSStep,
  type LRTAStarStep,
} from '../algorithms/index';

// ─── Graph definition ─────────────────────────────────────────────────────────

const MAZE_GRAPH_DFS: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ['1,1', ['1,2']],
  ['1,2', ['1,1', '1,3', '2,2']],
  ['1,3', ['1,2', '2,3']],
  ['2,2', ['1,2', '2,3']],
  ['2,3', ['1,3', '2,2', '3,3']],
  ['3,3', ['2,3']],
]);

const MAZE_GRAPH_LRTA: ReadonlyMap<string, ReadonlyArray<{ neighbor: string; cost: number }>> = new Map([
  ['1,1', [{ neighbor: '1,2', cost: 1 }]],
  ['1,2', [{ neighbor: '1,1', cost: 1 }, { neighbor: '1,3', cost: 1 }, { neighbor: '2,2', cost: 1 }]],
  ['1,3', [{ neighbor: '1,2', cost: 1 }, { neighbor: '2,3', cost: 1 }]],
  ['2,2', [{ neighbor: '1,2', cost: 1 }, { neighbor: '2,3', cost: 1 }]],
  ['2,3', [{ neighbor: '1,3', cost: 1 }, { neighbor: '2,2', cost: 1 }, { neighbor: '3,3', cost: 1 }]],
  ['3,3', [{ neighbor: '2,3', cost: 1 }]],
]);

// Manhattan distance heuristic to (3,3)
const HEURISTIC: ReadonlyMap<string, number> = new Map([
  ['1,1', 4],
  ['1,2', 3],
  ['1,3', 2],
  ['2,1', 3],
  ['2,2', 2],
  ['2,3', 1],
  ['3,3', 0],
]);

const START = '1,1';
const GOAL = '3,3';

// Grid cell positions: col and row (1-indexed, (1,1) = bottom-left, (3,3) = top-right)
const GRID_CELLS = ['1,1', '1,2', '1,3', '2,2', '2,3', '3,3'];

// Edges for drawing (unordered pairs)
const GRID_EDGES: ReadonlyArray<[string, string]> = [
  ['1,1', '1,2'],
  ['1,2', '1,3'],
  ['1,2', '2,2'],
  ['1,3', '2,3'],
  ['2,2', '2,3'],
  ['2,3', '3,3'],
];

const CELL_SIZE = 70;
const SVG_PAD = 24;
const SVG_W = 3 * CELL_SIZE + 2 * SVG_PAD;
const SVG_H = 3 * CELL_SIZE + 2 * SVG_PAD;

function colRow(key: string): { col: number; row: number } {
  const parts = key.split(',');
  return { col: parseInt(parts[0]!, 10), row: parseInt(parts[1]!, 10) };
}

function cellCenter(key: string): { x: number; y: number } {
  const { col, row } = colRow(key);
  return {
    x: SVG_PAD + (col - 1) * CELL_SIZE + CELL_SIZE / 2,
    y: SVG_PAD + (3 - row) * CELL_SIZE + CELL_SIZE / 2,
  };
}

type TabType = 'dfs' | 'lrta';

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

export default function OnlineSearchViz(): JSX.Element {
  const [tab, setTab] = useState<TabType>('dfs');
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

  const dfsSteps = useMemo(
    () => onlineDFSAgent(MAZE_GRAPH_DFS, START, GOAL),
    [],
  );

  const lrtaSteps = useMemo(
    () => lrtaStar(MAZE_GRAPH_LRTA, HEURISTIC, START, GOAL, 40),
    [],
  );

  const steps = tab === 'dfs' ? dfsSteps : lrtaSteps;
  const totalSteps = steps.length;

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [tab]);

  const clampedIndex = Math.min(stepIndex, totalSteps - 1);
  const dfsStep = tab === 'dfs' ? (dfsSteps[clampedIndex] as OnlineDFSStep) : null;
  const lrtaStep = tab === 'lrta' ? (lrtaSteps[clampedIndex] as LRTAStarStep) : null;

  const currentState = dfsStep?.currentState ?? lrtaStep?.currentState ?? START;

  const visitedSet = useMemo(() => {
    if (dfsStep) return new Set(dfsStep.visited);
    if (lrtaStep) {
      // For LRTA*, collect all states visited so far
      const v = new Set<string>();
      for (let i = 0; i <= clampedIndex; i++) {
        v.add((lrtaSteps[i] as LRTAStarStep).currentState);
      }
      return v;
    }
    return new Set<string>();
  }, [dfsStep, lrtaStep, clampedIndex, lrtaSteps]);

  const hValues = useMemo(
    () => lrtaStep?.hValues ?? new Map<string, number>(),
    [lrtaStep],
  );

  // RAF-based playback
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    lastTimeRef.current = 0;
    const interval = 1000 / speed;
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [isPlaying, speed, totalSteps, prefersReducedMotion]);

  const handleReset = () => { setIsPlaying(false); setStepIndex(0); };
  const handleStepBack = () => { setIsPlaying(false); setStepIndex(p => Math.max(0, p - 1)); };
  const handlePlayPause = () => {
    if (clampedIndex >= totalSteps - 1) { setStepIndex(0); setIsPlaying(true); }
    else setIsPlaying(p => !p);
  };
  const handleStepForward = () => { setIsPlaying(false); setStepIndex(p => Math.min(totalSteps - 1, p + 1)); };

  function cellColor(key: string): string {
    if (key === GOAL) return '#065F46';
    if (key === currentState) return '#1D3A6D';
    if (visitedSet.has(key)) return '#134E4A';
    return '#1A1A24';
  }

  function cellBorder(key: string): string {
    if (key === currentState) return '2px solid #3B82F6';
    if (key === GOAL) return '2px solid #10B981';
    if (key === START) return '1px solid #6366F1';
    return '1px solid rgba(255,255,255,0.12)';
  }

  const statLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6B7280', marginBottom: '2px' };
  const statValueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#E5E7EB' };

  return (
    <div style={{
      background: '#111118',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '780px',
      margin: '24px auto 0',
    }}>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
        Online Search — Unknown Environments
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
        The agent discovers the maze incrementally — it can only observe the current cell's neighbors.
        Compare <strong style={{ color: '#E5E7EB' }}>Online DFS</strong> (explores depth-first with backtracking) and{' '}
        <strong style={{ color: '#E5E7EB' }}>LRTA*</strong> (learns heuristic values to guide search).
      </p>

      {/* Algorithm tabs */}
      <div role="tablist" aria-label="Algorithm selector" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['dfs', 'lrta'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: tab === t ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.10)',
              background: tab === t ? '#1D3A6D' : 'transparent',
              color: tab === t ? '#93C5FD' : '#9CA3AF',
              fontSize: '13px',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t === 'dfs' ? 'Online DFS' : 'LRTA*'}
          </button>
        ))}
      </div>

      {/* SVG maze grid */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={Math.min(SVG_W, 320)}
          role="img"
          aria-label={`Maze grid. Current position: ${currentState}. Goal: ${GOAL}.`}
          style={{ display: 'block' }}
        >
          {/* Edges */}
          {GRID_EDGES.map(([a, b], i) => {
            const ca = cellCenter(a);
            const cb = cellCenter(b);
            const bothVisited = visitedSet.has(a) && visitedSet.has(b);
            return (
              <line
                key={i}
                x1={ca.x} y1={ca.y}
                x2={cb.x} y2={cb.y}
                stroke={bothVisited ? 'rgba(20,184,166,0.5)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={bothVisited ? 2 : 1}
              />
            );
          })}

          {/* Cells */}
          {GRID_CELLS.map(key => {
            const { x, y } = cellCenter(key);
            const r = CELL_SIZE / 2 - 6;
            const bg = cellColor(key);
            const border = cellBorder(key);
            const borderWidth = border.startsWith('2') ? 2 : 1;
            const borderColor = border.split('solid ')[1] ?? 'rgba(255,255,255,0.12)';
            const hVal = hValues.get(key);
            const isGoalCell = key === GOAL;
            const isStart = key === START;
            const isCurrent = key === currentState;
            return (
              <g key={key}>
                <rect
                  x={x - r} y={y - r}
                  width={r * 2} height={r * 2}
                  rx={6}
                  fill={bg}
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                />
                {/* State label */}
                <text x={x} y={y - 4} textAnchor="middle"
                  fill={isCurrent ? '#93C5FD' : isGoalCell ? '#6EE7B7' : '#9CA3AF'}
                  fontSize={10} fontWeight={isCurrent ? 700 : 400}>
                  {key}
                </text>
                {/* Icon */}
                <text x={x} y={y + 12} textAnchor="middle" fontSize={14}>
                  {isCurrent ? '🤖' : isGoalCell ? '🏁' : isStart ? 'S' : ''}
                </text>
                {/* H value for LRTA* */}
                {tab === 'lrta' && hVal !== undefined && (
                  <text x={x} y={y + 24} textAnchor="middle" fill="#F59E0B" fontSize={9}>
                    H={hVal.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
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
            type="range" min={0.5} max={4} step={0.5} value={speed}
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
          padding: '14px 16px',
          background: '#0A0A0F',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={statLabelStyle}>Step</div>
          <div style={statValueStyle}>{clampedIndex + 1}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Current State</div>
          <div style={{ ...statValueStyle, color: '#3B82F6' }}>{currentState}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Visited States</div>
          <div style={statValueStyle}>{visitedSet.size} / {GRID_CELLS.length}</div>
        </div>
        {dfsStep && (
          <div>
            <div style={statLabelStyle}>Action</div>
            <div style={{ ...statValueStyle, fontSize: '12px' }}>{dfsStep.action}</div>
          </div>
        )}
        {lrtaStep && (
          <>
            <div>
              <div style={statLabelStyle}>Action</div>
              <div style={{ ...statValueStyle, fontSize: '12px' }}>{lrtaStep.action}</div>
            </div>
            <div>
              <div style={statLabelStyle}>H updated to</div>
              <div style={{ ...statValueStyle, color: '#F59E0B' }}>{lrtaStep.updatedH.toFixed(2)}</div>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        background: '#0D1117',
        borderRadius: '8px',
        borderLeft: '3px solid #3B82F6',
        fontSize: '13px',
        color: '#D1D5DB',
        lineHeight: 1.5,
      }}>
        {dfsStep?.description ?? lrtaStep?.description ?? 'Ready to start.'}
      </div>

      {/* Legend */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#6B7280' }}>
        <span>🤖 Current position</span>
        <span style={{ color: '#6EE7B7' }}>🏁 Goal (3,3)</span>
        <span style={{ color: '#6366F1' }}>S Start (1,1)</span>
        <span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#134E4A', borderRadius: '2px', marginRight: '4px' }} />
          Visited
        </span>
        {tab === 'lrta' && <span style={{ color: '#F59E0B' }}>H = learned heuristic value</span>}
      </div>
    </div>
  );
}
