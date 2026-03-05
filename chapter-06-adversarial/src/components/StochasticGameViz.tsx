import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { expectiminimax, type StochasticNode } from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const FORMULA = String.raw`V(n) = \begin{cases} \text{Utility}(n) & \text{if } n \text{ is terminal} \\ \max_{a} V(\text{Result}(n,a)) & \text{if } n \text{ is MAX} \\ \min_{a} V(\text{Result}(n,a)) & \text{if } n \text{ is MIN} \\ \sum_{r} P(r|n) \cdot V(\text{Result}(n,r)) & \text{if } n \text{ is CHANCE} \end{cases}`;

function buildTree(prob: number): StochasticNode {
  const lo = parseFloat((1 - prob).toFixed(4));
  const hi = parseFloat(prob.toFixed(4));
  return {
    id: 'root',
    type: 'max',
    children: [
      {
        node: {
          id: 'chanceA',
          type: 'chance',
          children: [
            {
              node: {
                id: 'minAH',
                type: 'min',
                children: [
                  { node: { id: 'leafAH1', type: 'min', children: [], value: 8 } },
                  { node: { id: 'leafAH2', type: 'min', children: [], value: 3 } },
                ],
              },
              prob: hi,
            },
            {
              node: {
                id: 'minAL',
                type: 'min',
                children: [
                  { node: { id: 'leafAL1', type: 'min', children: [], value: 5 } },
                  { node: { id: 'leafAL2', type: 'min', children: [], value: 2 } },
                ],
              },
              prob: lo,
            },
          ],
        },
      },
      {
        node: {
          id: 'chanceB',
          type: 'chance',
          children: [
            {
              node: {
                id: 'minBH',
                type: 'min',
                children: [
                  { node: { id: 'leafBH1', type: 'min', children: [], value: 6 } },
                  { node: { id: 'leafBH2', type: 'min', children: [], value: 1 } },
                ],
              },
              prob: hi,
            },
            {
              node: {
                id: 'minBL',
                type: 'min',
                children: [
                  { node: { id: 'leafBL1', type: 'min', children: [], value: 7 } },
                  { node: { id: 'leafBL2', type: 'min', children: [], value: 4 } },
                ],
              },
              prob: lo,
            },
          ],
        },
      },
    ],
  };
}

interface NodePos {
  id: string;
  x: number;
  y: number;
  type: 'max' | 'min' | 'chance';
  terminalValue?: number;
  label: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

const LABELS: Record<string, string> = {
  root: 'Pick Move',
  chanceA: 'Move A\nRoll die',
  chanceB: 'Move B\nRoll die',
  minAH: 'Opp A-High',
  minAL: 'Opp A-Low',
  minBH: 'Opp B-High',
  minBL: 'Opp B-Low',
  leafAH1: '8',
  leafAH2: '3',
  leafAL1: '5',
  leafAL2: '2',
  leafBH1: '6',
  leafBH2: '1',
  leafBL1: '7',
  leafBL2: '4',
};

const TERMINAL_VALUES: Record<string, number> = {
  leafAH1: 8, leafAH2: 3, leafAL1: 5, leafAL2: 2,
  leafBH1: 6, leafBH2: 1, leafBL1: 7, leafBL2: 4,
};

function buildLayout(prob: number): { nodes: NodePos[]; edges: Edge[] } {
  const lo = parseFloat((1 - prob).toFixed(2));
  const hi = parseFloat(prob.toFixed(2));

  const nodes: NodePos[] = [
    { id: 'root', x: 480, y: 50, type: 'max', label: 'Pick Move' },
    { id: 'chanceA', x: 240, y: 160, type: 'chance', label: 'Move A\nRoll die' },
    { id: 'chanceB', x: 720, y: 160, type: 'chance', label: 'Move B\nRoll die' },
    { id: 'minAH', x: 120, y: 280, type: 'min', label: 'Opp A-High' },
    { id: 'minAL', x: 360, y: 280, type: 'min', label: 'Opp A-Low' },
    { id: 'minBH', x: 600, y: 280, type: 'min', label: 'Opp B-High' },
    { id: 'minBL', x: 840, y: 280, type: 'min', label: 'Opp B-Low' },
    { id: 'leafAH1', x: 60, y: 390, type: 'min', terminalValue: 8, label: '8' },
    { id: 'leafAH2', x: 180, y: 390, type: 'min', terminalValue: 3, label: '3' },
    { id: 'leafAL1', x: 300, y: 390, type: 'min', terminalValue: 5, label: '5' },
    { id: 'leafAL2', x: 420, y: 390, type: 'min', terminalValue: 2, label: '2' },
    { id: 'leafBH1', x: 540, y: 390, type: 'min', terminalValue: 6, label: '6' },
    { id: 'leafBH2', x: 660, y: 390, type: 'min', terminalValue: 1, label: '1' },
    { id: 'leafBL1', x: 780, y: 390, type: 'min', terminalValue: 7, label: '7' },
    { id: 'leafBL2', x: 900, y: 390, type: 'min', terminalValue: 4, label: '4' },
  ];

  const edges: Edge[] = [
    { from: 'root', to: 'chanceA' },
    { from: 'root', to: 'chanceB' },
    { from: 'chanceA', to: 'minAH', label: `p=${hi}` },
    { from: 'chanceA', to: 'minAL', label: `p=${lo}` },
    { from: 'chanceB', to: 'minBH', label: `p=${hi}` },
    { from: 'chanceB', to: 'minBL', label: `p=${lo}` },
    { from: 'minAH', to: 'leafAH1' },
    { from: 'minAH', to: 'leafAH2' },
    { from: 'minAL', to: 'leafAL1' },
    { from: 'minAL', to: 'leafAL2' },
    { from: 'minBH', to: 'leafBH1' },
    { from: 'minBH', to: 'leafBH2' },
    { from: 'minBL', to: 'leafBL1' },
    { from: 'minBL', to: 'leafBL2' },
  ];

  return { nodes, edges };
}

const NODE_COLOR = { max: '#6366F1', min: '#F59E0B', chance: '#10B981' };

function NodeShape({
  node, active, stepValue,
}: {
  node: NodePos;
  active: boolean;
  stepValue?: number;
}) {
  const color = NODE_COLOR[node.type];
  const glow = active ? `0 0 12px ${color}` : 'none';

  if (node.terminalValue !== undefined) {
    return (
      <g transform={`translate(${node.x},${node.y})`}>
        <circle r={20} fill={color} opacity={0.2} stroke={color} strokeWidth={active ? 2.5 : 1.5} style={{ filter: active ? `drop-shadow(${glow})` : undefined }} />
        <text textAnchor="middle" dominantBaseline="central" fill={color} fontSize={13} fontWeight={700}>{node.terminalValue}</text>
      </g>
    );
  }

  const displayVal = stepValue !== undefined ? stepValue.toFixed(2) : null;

  if (node.type === 'max') {
    return (
      <g transform={`translate(${node.x},${node.y})`}>
        <rect x={-28} y={-18} width={56} height={36} rx={6} fill={color} opacity={0.2} stroke={color} strokeWidth={active ? 2.5 : 1.5} style={{ filter: active ? `drop-shadow(0 0 8px ${color})` : undefined }} />
        <text textAnchor="middle" y={-4} fill={color} fontSize={10} fontWeight={600}>MAX</text>
        {displayVal && <text textAnchor="middle" y={9} fill="white" fontSize={11} fontWeight={700}>{displayVal}</text>}
      </g>
    );
  }

  if (node.type === 'min') {
    return (
      <g transform={`translate(${node.x},${node.y})`}>
        <circle r={22} fill={color} opacity={0.2} stroke={color} strokeWidth={active ? 2.5 : 1.5} style={{ filter: active ? `drop-shadow(0 0 8px ${color})` : undefined }} />
        <text textAnchor="middle" y={-4} fill={color} fontSize={10} fontWeight={600}>MIN</text>
        {displayVal && <text textAnchor="middle" y={9} fill="white" fontSize={11} fontWeight={700}>{displayVal}</text>}
      </g>
    );
  }

  // chance — diamond
  return (
    <g transform={`translate(${node.x},${node.y})`}>
      <polygon points="0,-22 26,0 0,22 -26,0" fill={color} opacity={0.2} stroke={color} strokeWidth={active ? 2.5 : 1.5} style={{ filter: active ? `drop-shadow(0 0 8px ${color})` : undefined }} />
      <text textAnchor="middle" y={-4} fill={color} fontSize={9} fontWeight={600}>CHC</text>
      {displayVal && <text textAnchor="middle" y={9} fill="white" fontSize={11} fontWeight={700}>{displayVal}</text>}
    </g>
  );
}

export function StochasticGameViz() {
  const [prob, setProb] = useState(0.5);
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const prefersReducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const steps = useMemo(() => expectiminimax(buildTree(prob)), [prob]);
  const { nodes, edges } = useMemo(() => buildLayout(prob), [prob]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const currentStep = stepIdx >= 0 && stepIdx < steps.length ? steps[stepIdx] : null;

  const activeIds = useMemo(
    () => new Set(currentStep?.activeNodeIds ?? []),
    [currentStep],
  );

  // Build map: nodeId → computed value up to current step
  const computedValues = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i <= stepIdx && i < steps.length; i++) {
      const s = steps[i];
      if (s) m.set(s.nodeId, s.value);
    }
    return m;
  }, [steps, stepIdx]);

  const reset = useCallback(() => {
    setPlaying(false);
    setStepIdx(-1);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const stepForward = useCallback(() => {
    setStepIdx(i => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const stepBack = useCallback(() => {
    setStepIdx(i => Math.max(i - 1, -1));
  }, []);

  useEffect(() => {
    if (!playing || prefersReducedMotion) {
      if (prefersReducedMotion && playing) {
        setStepIdx(steps.length - 1);
        setPlaying(false);
      }
      return;
    }
    const interval = 800 / speed;
    const tick = (now: number) => {
      if (now - lastTimeRef.current >= interval) {
        lastTimeRef.current = now;
        setStepIdx(i => {
          if (i >= steps.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, steps.length, prefersReducedMotion]);

  // reset step when prob changes
  useEffect(() => { setStepIdx(-1); setPlaying(false); }, [prob]);

  return (
    <section aria-labelledby="stochastic-title" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id="stochastic-title" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          §6.5 Stochastic Games — Expectiminimax
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
          Backgammon-like scenario: MAX picks a move, a die is rolled (CHANCE node), then MIN responds.
          The algorithm extends Minimax by computing probability-weighted averages at chance nodes.
        </p>
      </div>

      {/* Formula */}
      <div
        style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(FORMULA) }}
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
        {[
          { shape: 'rect', color: '#6366F1', label: 'MAX node (rectangle)' },
          { shape: 'circle', color: '#F59E0B', label: 'MIN node (circle)' },
          { shape: 'diamond', color: '#10B981', label: 'CHANCE node (diamond)' },
        ].map(({ shape, color, label }) => (
          <div key={shape} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width={24} height={24} aria-hidden="true">
              {shape === 'rect' && <rect x={2} y={4} width={20} height={16} rx={3} fill={color} opacity={0.8} />}
              {shape === 'circle' && <circle cx={12} cy={12} r={10} fill={color} opacity={0.8} />}
              {shape === 'diamond' && <polygon points="12,2 22,12 12,22 2,12" fill={color} opacity={0.8} />}
            </svg>
            <span style={{ color: '#D1D5DB' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* What-if control */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <label htmlFor="prob-slider" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
          🎲 Die probability — P(high outcome): <strong style={{ color: '#10B981' }}>{prob.toFixed(2)}</strong> / P(low): <strong style={{ color: '#F59E0B' }}>{(1 - prob).toFixed(2)}</strong>
        </label>
        <input
          id="prob-slider"
          type="range"
          min={0.3}
          max={0.7}
          step={0.05}
          value={prob}
          onChange={e => setProb(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#10B981' }}
          aria-label="Adjust die probability for high outcome"
        />
        <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>Drag to adjust the die probability (0.30–0.70). Tree values update automatically.</p>
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={reset}
          aria-label="Reset to start"
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-2)', color: 'white', cursor: 'pointer' }}
        >⏮ Reset</button>
        <button
          onClick={stepBack}
          disabled={stepIdx < 0}
          aria-label="Step backward"
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-2)', color: stepIdx < 0 ? '#4B5563' : 'white', cursor: stepIdx < 0 ? 'not-allowed' : 'pointer' }}
        >◀ Back</button>
        <button
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#6366F1', color: 'white', cursor: 'pointer', fontWeight: 600 }}
        >{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button
          onClick={stepForward}
          disabled={stepIdx >= steps.length - 1}
          aria-label="Step forward"
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-2)', color: stepIdx >= steps.length - 1 ? '#4B5563' : 'white', cursor: stepIdx >= steps.length - 1 ? 'not-allowed' : 'pointer' }}
        >Next ▶</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9CA3AF', marginLeft: '8px' }}>
          Speed:
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.5}
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            style={{ width: '80px', accentColor: '#6366F1' }}
            aria-label="Playback speed"
          />
          <span>{speed}×</span>
        </label>
        <span style={{ color: '#6B7280', fontSize: '13px', marginLeft: 'auto' }}>
          Step {Math.max(stepIdx, 0)}/{steps.length}
        </span>
      </div>

      {/* SVG Tree */}
      <div style={{ background: 'var(--surface-1)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}>
        <svg
          viewBox="0 0 960 430"
          style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}
          aria-label="Expectiminimax game tree visualization"
          role="img"
        >
          {/* Edges */}
          {edges.map(edge => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="#374151"
                  strokeWidth={1.5}
                />
                {edge.label && (
                  <text x={mx} y={my - 4} textAnchor="middle" fill="#10B981" fontSize={10} fontWeight={600}>{edge.label}</text>
                )}
              </g>
            );
          })}
          {/* Nodes */}
          {nodes.map(node => {
            const sv = node.terminalValue === undefined ? computedValues.get(node.id) : undefined;
            return (
              <NodeShape
                key={node.id}
                node={node}
                active={activeIds.has(node.id)}
                {...(sv !== undefined ? { stepValue: sv } : {})}
              />
            );
          })}
          {/* Node labels below terminal nodes */}
          {nodes.filter(n => n.terminalValue !== undefined).map(node => (
            <text key={`lbl-${node.id}`} x={node.x} y={node.y + 32} textAnchor="middle" fill="#6B7280" fontSize={9}>{LABELS[node.id]}</text>
          ))}
        </svg>
      </div>

      {/* State inspection panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State Inspector</h3>
        {currentStep ? (
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '14px', margin: 0 }}>
            <dt style={{ color: '#6B7280' }}>Node ID</dt>
            <dd style={{ color: 'white', margin: 0, fontFamily: 'monospace' }}>{currentStep.nodeId}</dd>
            <dt style={{ color: '#6B7280' }}>Type</dt>
            <dd style={{ color: NODE_COLOR[currentStep.nodeType], margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{currentStep.nodeType}</dd>
            <dt style={{ color: '#6B7280' }}>Value</dt>
            <dd style={{ color: '#10B981', margin: 0, fontWeight: 700 }}>{currentStep.value.toFixed(4)}</dd>
            <dt style={{ color: '#6B7280' }}>Depth</dt>
            <dd style={{ color: 'white', margin: 0 }}>{currentStep.depth}</dd>
            <dt style={{ color: '#6B7280' }}>Action</dt>
            <dd style={{ color: '#D1D5DB', margin: 0, fontStyle: 'italic' }}>{currentStep.action}</dd>
          </dl>
        ) : (
          <p style={{ color: '#4B5563', fontStyle: 'italic' }}>Press ▶ Play or Next ▶ to start the algorithm.</p>
        )}
      </div>
    </section>
  );
}
