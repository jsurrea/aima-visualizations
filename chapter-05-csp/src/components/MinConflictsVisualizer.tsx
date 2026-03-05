import { useState, useMemo, useEffect, useRef } from 'react';
import { minConflicts } from '../algorithms/index';
import { interpolateColor } from '../utils/mathUtils';

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

export default function MinConflictsVisualizer() {
  const [n, setN] = useState(6);

  const steps = useMemo(() => minConflicts(n, 1000), [n]);
  const pb = usePlayback(steps.length);

  function handleNChange(newN: number) {
    setN(newN);
    pb.reset();
  }

  const step = steps[pb.stepIndex]!;
  const cellSize = Math.min(48, Math.floor(320 / n));

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>5.4 Min-Conflicts: N-Queens</h2>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.6 }}>
        Min-Conflicts starts with a complete assignment (possibly inconsistent) and iteratively moves a conflicted variable
        to the value that minimizes total conflicts. Effective for many large CSPs.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Board size N:</span>
        {[4, 5, 6, 7, 8].map(val => (
          <button key={val} onClick={() => handleNChange(val)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: n === val ? CHAPTER_COLOR : '#1A1A24', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: n === val ? 600 : 400 }}
            aria-pressed={n === val}
          >
            {val}
          </button>
        ))}
      </div>

      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px', color: '#E5E7EB' }}>
        {step.action}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ display: 'flex', gap: '0', marginBottom: '2px', marginLeft: `${cellSize}px` }}>
            {Array.from({ length: n }, (_, col) => (
              <div key={col} style={{ width: `${cellSize}px`, textAlign: 'center', fontSize: '11px', color: step.conflictedVar === col ? '#EAB308' : '#6B7280', fontWeight: step.conflictedVar === col ? 700 : 400 }}>
                {col}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex' }}>
            <div>
              {Array.from({ length: n }, (_, row) => (
                <div key={row} style={{ width: `${cellSize}px`, height: `${cellSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#6B7280' }}>
                  {row}
                </div>
              ))}
            </div>
            <table style={{ borderCollapse: 'collapse', border: '1px solid #374151' }} aria-label={`${n}-Queens board`}>
              <tbody>
                {Array.from({ length: n }, (_, row) => (
                  <tr key={row}>
                    {Array.from({ length: n }, (_, col) => {
                      const isQueen = step.assignment[col]! === row;
                      const conflicts = step.conflictCounts[col]!;
                      const heat = interpolateColor('#10B981', '#EF4444', Math.min(conflicts / 5, 1));
                      const isConflictedCol = step.conflictedVar === col;
                      const isNewRow = isConflictedCol && step.newValue === row;
                      const isCheckerLight = (row + col) % 2 === 0;
                      const baseBg = isCheckerLight ? '#1E1E2E' : '#111118';
                      return (
                        <td key={col}
                          style={{
                            width: `${cellSize}px`, height: `${cellSize}px`,
                            textAlign: 'center', verticalAlign: 'middle',
                            fontSize: `${cellSize * 0.55}px`,
                            background: isNewRow ? 'rgba(234,179,8,0.2)' : isConflictedCol ? `${heat}30` : baseBg,
                            border: isConflictedCol ? '1px solid #EAB308' : '1px solid #374151',
                            color: isQueen ? '#FFFFFF' : 'transparent',
                          }}
                          aria-label={`Row ${row}, Col ${col}${isQueen ? ', queen' : ''}`}
                        >
                          {isQueen ? '♛' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', marginLeft: `${cellSize}px`, marginTop: '4px' }}>
            {Array.from({ length: n }, (_, col) => {
              const c = step.conflictCounts[col]!;
              return (
                <div key={col} style={{ width: `${cellSize}px`, textAlign: 'center', fontSize: '11px', color: c > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                  {c}
                </div>
              );
            })}
          </div>
          <div style={{ marginLeft: `${cellSize}px`, marginTop: '2px', fontSize: '11px', color: '#6B7280' }}>conflicts per column</div>

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

        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>State</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: '#9CA3AF' }}>Step:</span>
              <span style={{ color: 'white' }}>{pb.stepIndex + 1} / {steps.length}</span>
              <span style={{ color: '#9CA3AF' }}>Total conflicts:</span>
              <span style={{ color: step.totalConflicts === 0 ? '#10B981' : '#EF4444' }}>{step.totalConflicts}</span>
              <span style={{ color: '#9CA3AF' }}>Conflicted col:</span>
              <span style={{ color: '#EAB308' }}>{step.conflictedVar !== null ? step.conflictedVar : '—'}</span>
              <span style={{ color: '#9CA3AF' }}>New row:</span>
              <span style={{ color: '#F59E0B' }}>{step.newValue !== null ? step.newValue : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
