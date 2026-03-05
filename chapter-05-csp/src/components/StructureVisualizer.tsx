import { useState, useMemo, useEffect, useRef } from 'react';
import { treeCspSolver } from '../algorithms/index';
import type { TreeCSPStep, CSP } from '../algorithms/index';
import { AUSTRALIA_CSP, NODE_POSITIONS, AUSTRALIA_EDGES } from '../shared';

const CHAPTER_COLOR = '#3B82F6';
const NODE_RADIUS = 28;

const CHAIN_CSP: CSP = {
  variables: ['A', 'B', 'C', 'D', 'E'],
  domains: new Map([['A', ['1', '2', '3']], ['B', ['1', '2', '3']], ['C', ['1', '2', '3']], ['D', ['1', '2', '3']], ['E', ['1', '2', '3']]]),
  neighbors: new Map([['A', ['B']], ['B', ['A', 'C']], ['C', ['B', 'D']], ['D', ['C', 'E']], ['E', ['D']]]),
  constraints: (_xi: string, vi: string, _xj: string, vj: string) => vi !== vj,
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

const PHASE_COLORS: Record<string, string> = {
  backward: '#F59E0B',
  forward: '#3B82F6',
  complete: '#10B981',
  failed: '#EF4444',
};

const PHASE_LABELS: Record<string, string> = {
  backward: 'Backward Arc Consistency',
  forward: 'Forward Assignment',
  complete: 'Complete ✓',
  failed: 'Failed ✗',
};

const chainPositions: Record<string, { x: number; y: number }> = {
  A: { x: 60, y: 100 },
  B: { x: 140, y: 100 },
  C: { x: 220, y: 100 },
  D: { x: 300, y: 100 },
  E: { x: 380, y: 100 },
};

const chainEdges: ReadonlyArray<readonly [string, string]> = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'],
];

function TreeCSPGraph({ step }: { step: TreeCSPStep }) {
  return (
    <svg viewBox="0 0 460 200" style={{ width: '100%', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {chainEdges.map(([a, b]) => {
        const pa = chainPositions[a]!;
        const pb = chainPositions[b]!;
        const isCurrentEdge = step.currentEdge !== null && (
          (step.currentEdge[0] === a && step.currentEdge[1] === b) ||
          (step.currentEdge[0] === b && step.currentEdge[1] === a)
        );
        return (
          <line key={`${a}-${b}`}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={isCurrentEdge ? '#F59E0B' : '#4B5563'}
            strokeWidth={isCurrentEdge ? 3 : 1.5}
          />
        );
      })}
      {CHAIN_CSP.variables.map(node => {
        const pos = chainPositions[node]!;
        const assignedVal = step.assignment.get(node);
        const domain = step.domains.get(node) ?? [];
        const isCurrentEdgeSrc = step.currentEdge !== null && step.currentEdge[0] === node;
        return (
          <g key={node}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS}
              fill={assignedVal ? '#1E3A5F' : '#1A1A24'}
              stroke={isCurrentEdgeSrc ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isCurrentEdgeSrc ? 2.5 : 1.5}
            />
            <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{node}</text>
            {assignedVal ? (
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill="#60A5FA" fontSize="11">=&apos;{assignedVal}&apos;</text>
            ) : (
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill="#6B7280" fontSize="9">{domain.slice(0, 5).join(',')}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function StructureVisualizer() {
  const [cutsetRemoved, setCutsetRemoved] = useState(false);

  const steps = useMemo(() => treeCspSolver(CHAIN_CSP), []);
  const pb = usePlayback(steps.length);

  const step = steps[pb.stepIndex]!;

  const remainingNodes = AUSTRALIA_CSP.variables.filter(v => v !== 'SA');

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>5.5 Problem Structure</h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', lineHeight: 1.6 }}>
        Tree-structured CSPs can be solved in O(n·d²) time. General CSPs can often be decomposed by removing a small cutset.
      </p>

      {/* Tree CSP section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Tree CSP Solver — Chain A-B-C-D-E</h3>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{
              background: '#1A1A24', borderRadius: '8px', padding: '8px 14px', marginBottom: '12px',
              border: `1px solid ${PHASE_COLORS[step.phase] ?? '#374151'}30`,
              fontSize: '14px', color: PHASE_COLORS[step.phase] ?? '#E5E7EB', fontWeight: 600,
            }}>
              Phase: {PHASE_LABELS[step.phase] ?? step.phase}
            </div>

            <TreeCSPGraph step={step} />

            <div style={{ marginTop: '8px', background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#E5E7EB' }}>
              {step.action}
            </div>

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

          <div style={{ flex: '0 1 200px', background: '#1A1A24', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', alignSelf: 'start' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>Domains</div>
            {Array.from(step.domains.entries()).map(([v, dom]) => (
              <div key={v} style={{ display: 'flex', gap: '8px', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#9CA3AF', minWidth: '20px' }}>{v}:</span>
                <span style={{ color: dom.length === 0 ? '#EF4444' : '#E5E7EB' }}>
                  {dom.length === 0 ? '∅' : `{${dom.join(',')}}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cutset Conditioning section */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Cutset Conditioning — Australia Graph</h3>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '16px' }}>
          SA connects to 5 other variables. Removing SA (the cutset) leaves a tree structure that can be solved efficiently.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setCutsetRemoved(v => !v)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: cutsetRemoved ? '#7F1D1D' : '#1A1A24', color: 'white', cursor: 'pointer', fontSize: '14px' }}
            aria-pressed={cutsetRemoved}
          >
            {cutsetRemoved ? '↩ Restore SA' : 'Remove Cutset (SA)'}
          </button>
        </div>

        {cutsetRemoved && (
          <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '8px', padding: '12px', marginBottom: '12px', border: '1px solid rgba(16,185,129,0.3)', fontSize: '13px', color: '#10B981' }}>
            ✓ Removing SA creates a tree structure with {remainingNodes.length} remaining variables: {remainingNodes.join(', ')}.
            This can be solved in O(n·d²) time!
          </div>
        )}

        <svg viewBox="0 0 460 460" style={{ width: '100%', maxWidth: '460px', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {AUSTRALIA_EDGES.map(([a, b]) => {
            const pa = NODE_POSITIONS[a]!;
            const pb2 = NODE_POSITIONS[b]!;
            const isSAEdge = a === 'SA' || b === 'SA';
            const isRemoved = cutsetRemoved && isSAEdge;
            return (
              <line key={`${a}-${b}`}
                x1={pa.x} y1={pa.y} x2={pb2.x} y2={pb2.y}
                stroke={isRemoved ? 'rgba(255,255,255,0.05)' : isSAEdge ? '#8B5CF6' : '#4B5563'}
                strokeWidth={isRemoved ? 1 : 1.5}
                {...(isRemoved ? { strokeDasharray: '3 3' } : {})}
              />
            );
          })}
          {AUSTRALIA_CSP.variables.map(node => {
            const pos = NODE_POSITIONS[node]!;
            const isSA = node === 'SA';
            const isFaded = cutsetRemoved && isSA;
            return (
              <g key={node} opacity={isFaded ? 0.2 : 1}>
                <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS}
                  fill={isSA ? (cutsetRemoved ? '#374151' : '#8B5CF6') : '#1A1A24'}
                  stroke={isSA ? '#8B5CF6' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={1.5}
                />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{node}</text>
              </g>
            );
          })}
          {!cutsetRemoved && (
            <text x={NODE_POSITIONS['SA']!.x} y={NODE_POSITIONS['SA']!.y - 36} textAnchor="middle" fill="#8B5CF6" fontSize="10">cutset</text>
          )}
        </svg>
      </div>
    </div>
  );
}
