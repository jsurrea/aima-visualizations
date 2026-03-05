import { useState, useMemo, useEffect, useRef } from 'react';
import { ac3 } from '../algorithms/index';
import type { AC3Step, CSP } from '../algorithms/index';
import { AUSTRALIA_CSP, NODE_POSITIONS, AUSTRALIA_EDGES, colorToHex } from '../shared';
import { renderInlineMath } from '../utils/mathUtils';

const NODE_RADIUS = 28;
const CHAPTER_COLOR = '#3B82F6';

const XY_CSP: CSP = {
  variables: ['X', 'Y'],
  domains: new Map([
    ['X', ['0','1','2','3','4','5','6','7','8','9']],
    ['Y', ['0','1','2','3','4','5','6','7','8','9']],
  ]),
  neighbors: new Map([['X', ['Y']], ['Y', ['X']]]),
  constraints: (xi: string, vi: string, _xj: string, vj: string) => {
    const nvi = parseInt(vi, 10);
    const nvj = parseInt(vj, 10);
    if (xi === 'X') return nvi === nvj * nvj;
    return nvj === nvi * nvi;
  },
};

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

function AustraliaGraph({ step }: { step: AC3Step }) {
  const currentArc = step.currentArc;
  return (
    <svg viewBox="0 0 460 460" style={{ width: '100%', maxWidth: '460px', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {AUSTRALIA_EDGES.map(([a, b]) => {
        const pa = NODE_POSITIONS[a]!;
        const pb = NODE_POSITIONS[b]!;
        const isCurrentArc = currentArc !== null && ((currentArc[0] === a && currentArc[1] === b) || (currentArc[0] === b && currentArc[1] === a));
        return (
          <line key={`${a}-${b}`}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={isCurrentArc ? '#F59E0B' : '#4B5563'}
            strokeWidth={isCurrentArc ? 3 : 1.5}
          />
        );
      })}
      {AUSTRALIA_CSP.variables.map(node => {
        const pos = NODE_POSITIONS[node]!;
        const domain = step.domains.get(node) ?? [];
        const isCurrentSrc = currentArc !== null && currentArc[0] === node;
        return (
          <g key={node}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS}
              fill={isCurrentSrc ? '#1E3A5F' : '#1A1A24'}
              stroke={isCurrentSrc ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isCurrentSrc ? 2.5 : 1.5}
            />
            <text x={pos.x} y={pos.y - 2} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{node}</text>
            {domain.map((val, di) => (
              <circle key={val} cx={pos.x - 6 + di * 6} cy={pos.y + 14} r={4}
                fill={colorToHex(val)} />
            ))}
            {domain.length === 0 && (
              <text x={pos.x} y={pos.y + 18} textAnchor="middle" fill="#EF4444" fontSize="10">∅</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function XYGraph({ step }: { step: AC3Step }) {
  const currentArc = step.currentArc;
  const xDomain = step.domains.get('X') ?? [];
  const yDomain = step.domains.get('Y') ?? [];
  const isXSrc = currentArc !== null && currentArc[0] === 'X';
  const isYSrc = currentArc !== null && currentArc[0] === 'Y';
  const arcActive = currentArc !== null;

  return (
    <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <line x1={110} y1={100} x2={290} y2={100} stroke={arcActive ? '#F59E0B' : '#4B5563'} strokeWidth={arcActive ? 3 : 1.5} />
      <circle cx={80} cy={100} r={50} fill={isXSrc ? '#1E3A5F' : '#1A1A24'} stroke={isXSrc ? '#F59E0B' : 'rgba(255,255,255,0.2)'} strokeWidth={isXSrc ? 2.5 : 1.5} />
      <text x={80} y={95} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">X</text>
      <text x={80} y={112} textAnchor="middle" fill="#9CA3AF" fontSize="10">{xDomain.join(', ')}</text>
      <circle cx={320} cy={100} r={50} fill={isYSrc ? '#1E3A5F' : '#1A1A24'} stroke={isYSrc ? '#F59E0B' : 'rgba(255,255,255,0.2)'} strokeWidth={isYSrc ? 2.5 : 1.5} />
      <text x={320} y={95} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Y</text>
      <text x={320} y={112} textAnchor="middle" fill="#9CA3AF" fontSize="10">{yDomain.join(', ')}</text>
      {currentArc && (
        <text x={200} y={90} textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="bold">{currentArc[0]}→{currentArc[1]}</text>
      )}
    </svg>
  );
}

export default function AC3Visualizer() {
  const [activeTab, setActiveTab] = useState<'australia' | 'xy'>('australia');

  const australiaSteps = useMemo(() => ac3(AUSTRALIA_CSP), []);
  const xySteps = useMemo(() => ac3(XY_CSP), []);

  const steps = activeTab === 'australia' ? australiaSteps : xySteps;

  const pb = usePlayback(steps.length);

  const handleTabChange = (tab: 'australia' | 'xy') => {
    setActiveTab(tab);
    pb.reset();
  };

  const step = steps[pb.stepIndex]!;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>5.2 AC-3: Arc Consistency</h2>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.6 }}>
        AC-3 enforces arc consistency by repeatedly removing values that have no support in neighbor domains.{' '}
        Arc{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('(X_i, X_j)') }} />{' '}
        is consistent if for every value in{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('D_i') }} />,
        there exists some value in{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('D_j') }} />{' '}
        satisfying the constraint.
      </p>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['australia', 'xy'] as const).map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${CHAPTER_COLOR}` : '2px solid transparent', color: activeTab === tab ? CHAPTER_COLOR : '#9CA3AF', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab ? 600 : 400 }}
            aria-pressed={activeTab === tab}
          >
            {tab === 'australia' ? 'Australia Map' : 'X = Y²'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          {activeTab === 'australia' ? <AustraliaGraph step={step} /> : <XYGraph step={step} />}
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
          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Step {pb.stepIndex + 1} / {steps.length}</div>
            <div style={{ fontSize: '14px', color: '#E5E7EB', fontWeight: 500 }}>{step.action}</div>
            {step.currentArc !== null && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#F59E0B' }}>
                Current arc: ({step.currentArc[0]}, {step.currentArc[1]})
              </div>
            )}
            {step.deletedValue !== null && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#EF4444' }}>
                Deleted: {step.deletedValue}
              </div>
            )}
            {!step.consistent && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#EF4444', fontWeight: 600 }}>
                ⚠ Inconsistency detected!
              </div>
            )}
          </div>

          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>Queue ({step.queue.length} arcs)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
              {step.queue.slice(0, 20).map(([xi, xj], i) => (
                <span key={i} style={{ fontSize: '11px', background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', color: '#E5E7EB' }}>
                  {xi}→{xj}
                </span>
              ))}
              {step.queue.length > 20 && <span style={{ fontSize: '11px', color: '#9CA3AF' }}>+{step.queue.length - 20} more</span>}
            </div>
          </div>

          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>Domains</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from(step.domains.entries()).map(([v, dom]) => (
                <div key={v} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#9CA3AF', minWidth: '36px' }}>{v}:</span>
                  <span style={{ color: dom.length === 0 ? '#EF4444' : '#E5E7EB' }}>
                    {dom.length === 0 ? '∅ (empty!)' : `{${dom.join(', ')}}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
