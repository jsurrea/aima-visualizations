import { useState, useMemo, useEffect, useRef } from 'react';
import { backtracking } from '../algorithms/index';
import { AUSTRALIA_CSP, NODE_POSITIONS, AUSTRALIA_EDGES, colorToHex } from '../shared';

const NODE_RADIUS = 28;
const CHAPTER_COLOR = '#3B82F6';

const btnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
  background: '#1A1A24', color: 'white', cursor: 'pointer', fontSize: '14px',
};

function PlaybackControls({
  playing, onTogglePlay, onStepBack, onStepForward, onReset,
  speed, onSpeedChange, stepIndex, totalSteps, chapterColor,
}: {
  playing: boolean; onTogglePlay: () => void; onStepBack: () => void;
  onStepForward: () => void; onReset: () => void; speed: number;
  onSpeedChange: (s: number) => void; stepIndex: number; totalSteps: number;
  chapterColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <button onClick={onReset} aria-label="Reset to beginning" style={btnStyle}>⏮</button>
      <button onClick={onStepBack} aria-label="Step backward" style={btnStyle} disabled={stepIndex === 0}>◀</button>
      <button onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'} style={{ ...btnStyle, background: chapterColor }}>
        {playing ? '⏸' : '▶'}
      </button>
      <button onClick={onStepForward} aria-label="Step forward" style={btnStyle} disabled={stepIndex >= totalSteps - 1}>▶|</button>
      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{stepIndex + 1} / {totalSteps}</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#9CA3AF' }}>
        Speed:
        <input type="range" min="0.5" max="3" step="0.5" value={speed}
          onChange={e => onSpeedChange(parseFloat(e.target.value))}
          aria-label="Playback speed" style={{ width: '80px' }} />
        {speed}x
      </label>
    </div>
  );
}

function usePlayback(totalSteps: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const interval = 1500 / speed;
    let frame: number;
    let lastTime = 0;
    const tick = (ts: number) => {
      if (ts - lastTime >= interval) {
        lastTime = ts;
        setStepIndex(prev => {
          if (prev + 1 >= totalSteps) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, totalSteps, reducedMotion]);

  const reset = () => { setStepIndex(0); setPlaying(false); };
  const stepForward = () => setStepIndex(i => Math.min(i + 1, totalSteps - 1));
  const stepBack = () => setStepIndex(i => Math.max(i - 1, 0));
  const togglePlay = () => setPlaying(p => !p);

  return { stepIndex, playing, speed, setSpeed, reset, stepForward, stepBack, togglePlay };
}

export default function BacktrackingVisualizer() {
  const [useFC, setUseFC] = useState(true);

  const steps = useMemo(() => backtracking(AUSTRALIA_CSP, true, true, useFC), [useFC]);
  const pb = usePlayback(steps.length);

  const step = steps[pb.stepIndex]!;

  const historySteps = steps.slice(Math.max(0, pb.stepIndex - 9), pb.stepIndex + 1);

  function handleFCToggle(val: boolean) {
    setUseFC(val);
    pb.reset();
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>5.3 Backtracking Search</h2>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.6 }}>
        Backtracking search assigns values one variable at a time and backtracks when a contradiction is found.
        MRV selects the variable with fewest legal values; LCV prefers the least-constraining value.
      </p>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E5E7EB', cursor: 'pointer' }}>
          <input type="checkbox" checked={useFC} onChange={e => handleFCToggle(e.target.checked)} aria-label="Enable forward checking" />
          Forward Checking (prune neighbor domains)
        </label>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <svg viewBox="0 0 460 460" style={{ width: '100%', maxWidth: '460px', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {AUSTRALIA_EDGES.map(([a, b]) => {
              const pa = NODE_POSITIONS[a]!;
              const pb2 = NODE_POSITIONS[b]!;
              return (
                <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb2.x} y2={pb2.y}
                  stroke="#4B5563" strokeWidth={1.5} />
              );
            })}
            {AUSTRALIA_CSP.variables.map(node => {
              const pos = NODE_POSITIONS[node]!;
              const color = step.assignment.get(node);
              const fill = color
                ? colorToHex(color)
                : (step.isBacktrack && step.currentVar === node ? '#7F1D1D' : '#1A1A24');
              const isCurrentVar = step.currentVar === node;
              return (
                <g key={node}>
                  <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} fill={fill}
                    stroke={isCurrentVar ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isCurrentVar ? 3 : 1.5}
                  />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{node}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ marginTop: '12px' }}>
            <PlaybackControls
              playing={pb.playing} onTogglePlay={pb.togglePlay}
              onStepBack={pb.stepBack} onStepForward={pb.stepForward} onReset={pb.reset}
              speed={pb.speed} onSpeedChange={pb.setSpeed}
              stepIndex={pb.stepIndex} totalSteps={steps.length}
              chapterColor={CHAPTER_COLOR}
            />
          </div>
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: step.isBacktrack ? 'rgba(239,68,68,0.1)' : '#1A1A24',
            borderRadius: '12px', padding: '14px',
            border: `1px solid ${step.isBacktrack ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Step {pb.stepIndex + 1} / {steps.length}</div>
            <div style={{ fontSize: '14px', color: step.isBacktrack ? '#EF4444' : step.isComplete ? '#10B981' : '#E5E7EB', fontWeight: 500 }}>
              {step.isBacktrack ? '↩ ' : ''}{step.isComplete ? '✓ ' : ''}{step.action}
            </div>
            {step.currentVar !== null && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#F59E0B' }}>
                Variable: {step.currentVar}{step.currentValue !== null ? ` = ${step.currentValue}` : ''}
              </div>
            )}
          </div>

          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
              Current Assignment ({step.assignment.size} / {AUSTRALIA_CSP.variables.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from(step.assignment.entries()).map(([v, val]) => (
                <div key={v} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#9CA3AF', minWidth: '36px' }}>{v}:</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorToHex(val), display: 'inline-block' }} />
                    <span style={{ color: '#E5E7EB' }}>{val}</span>
                  </span>
                </div>
              ))}
              {step.assignment.size === 0 && <span style={{ color: '#6B7280', fontSize: '13px' }}>No assignments yet</span>}
            </div>
          </div>

          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>Recent Steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '150px', overflowY: 'auto' }}>
              {historySteps.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: s.isBacktrack ? '#EF4444' : s.isComplete ? '#10B981' : '#9CA3AF', textDecoration: s.isBacktrack ? 'line-through' : 'none' }}>
                  {s.isBacktrack ? '↩ ' : ''}{s.action}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
