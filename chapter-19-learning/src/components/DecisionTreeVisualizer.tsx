import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import {
  learnDecisionTreeSteps,
  type DTExample,
  type DTStep,
} from '../algorithms';

// ─── Restaurant Dataset ──────────────────────────────────────────────────────

const RESTAURANT: ReadonlyArray<DTExample> = [
  { attributes: { Alt:'Yes',Bar:'No', Fri:'No', Hun:'Yes',Pat:'Some',Price:'$$$',Rain:'No', Res:'Yes',Type:'French', Est:'0-10'  }, label: true  },
  { attributes: { Alt:'Yes',Bar:'No', Fri:'No', Hun:'Yes',Pat:'Full',Price:'$',  Rain:'No', Res:'No', Type:'Thai',   Est:'30-60' }, label: false },
  { attributes: { Alt:'No', Bar:'Yes',Fri:'No', Hun:'No', Pat:'Some',Price:'$',  Rain:'No', Res:'No', Type:'Burger', Est:'0-10'  }, label: true  },
  { attributes: { Alt:'Yes',Bar:'No', Fri:'Yes',Hun:'Yes',Pat:'Full',Price:'$',  Rain:'Yes',Res:'No', Type:'Thai',   Est:'10-30' }, label: true  },
  { attributes: { Alt:'Yes',Bar:'No', Fri:'Yes',Hun:'No', Pat:'Full',Price:'$$$',Rain:'No', Res:'Yes',Type:'French', Est:'>60'   }, label: false },
  { attributes: { Alt:'No', Bar:'Yes',Fri:'No', Hun:'Yes',Pat:'Some',Price:'$$', Rain:'Yes',Res:'Yes',Type:'Italian',Est:'0-10'  }, label: true  },
  { attributes: { Alt:'No', Bar:'Yes',Fri:'No', Hun:'No', Pat:'None',Price:'$',  Rain:'Yes',Res:'No', Type:'Burger', Est:'0-10'  }, label: false },
  { attributes: { Alt:'No', Bar:'No', Fri:'No', Hun:'Yes',Pat:'Some',Price:'$$', Rain:'Yes',Res:'Yes',Type:'Thai',   Est:'0-10'  }, label: true  },
  { attributes: { Alt:'No', Bar:'Yes',Fri:'Yes',Hun:'No', Pat:'Full',Price:'$',  Rain:'Yes',Res:'No', Type:'Burger', Est:'>60'   }, label: false },
  { attributes: { Alt:'Yes',Bar:'Yes',Fri:'Yes',Hun:'Yes',Pat:'Full',Price:'$$$',Rain:'No', Res:'Yes',Type:'Italian',Est:'10-30' }, label: false },
  { attributes: { Alt:'No', Bar:'No', Fri:'No', Hun:'No', Pat:'None',Price:'$',  Rain:'No', Res:'No', Type:'Thai',   Est:'0-10'  }, label: false },
  { attributes: { Alt:'Yes',Bar:'Yes',Fri:'Yes',Hun:'Yes',Pat:'Full',Price:'$',  Rain:'No', Res:'No', Type:'Burger', Est:'30-60' }, label: true  },
];

const ATTRIBUTES = ['Alt','Bar','Fri','Hun','Pat','Price','Rain','Res','Type','Est'];

// ─── Layout types ─────────────────────────────────────────────────────────────

interface RenderNode {
  id: string;
  parentId: string | null;
  parentValue: string | null;
  isLeaf: boolean;
  attribute: string | null;
  leafLabel: boolean | null;
  gain: number;
  entropyH: number;
  positiveCount: number;
  negativeCount: number;
  children: RenderNode[];
}

interface Pos { x: number; y: number; }

// ─── Build render tree from steps 0..currentStep ─────────────────────────────

function buildRenderTree(steps: ReadonlyArray<DTStep>, upTo: number): Map<string, RenderNode> {
  const nodes = new Map<string, RenderNode>();
  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const s = steps[i]!;
    const node: RenderNode = {
      id: s.nodeId,
      parentId: s.parentNodeId,
      parentValue: s.parentValue,
      isLeaf: s.leafLabel !== null,
      attribute: s.chosenAttribute,
      leafLabel: s.leafLabel,
      gain: s.attributeGains[0]?.gain ?? 0,
      entropyH: s.currentEntropyH,
      positiveCount: s.positiveCount,
      negativeCount: s.negativeCount,
      children: [],
    };
    nodes.set(s.nodeId, node);
    if (s.parentNodeId !== null) {
      const parent = nodes.get(s.parentNodeId);
      if (parent) parent.children.push(node);
    }
  }
  return nodes;
}

function countLeaves(nodes: Map<string, RenderNode>, id: string): number {
  const node = nodes.get(id);
  if (!node) return 1;
  if (node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(nodes, c.id), 0);
}

function computePositions(
  nodes: Map<string, RenderNode>,
  id: string,
  left: number,
  width: number,
  depth: number,
  positions: Map<string, Pos>,
  levelH: number,
): void {
  positions.set(id, { x: left + width / 2, y: depth * levelH + 48 });
  const node = nodes.get(id);
  if (!node) return;
  let cx = left;
  const total = countLeaves(nodes, id);
  for (const child of node.children) {
    const childLeaves = countLeaves(nodes, child.id);
    const cw = (childLeaves / total) * width;
    computePositions(nodes, child.id, cx, cw, depth + 1, positions, levelH);
    cx += cw;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
  yes: '#10B981',
  no: '#EF4444',
};

export function DecisionTreeVisualizer(): JSX.Element {
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const activeExamples = useMemo(
    () => RESTAURANT.filter((_, i) => !excluded.has(i)),
    [excluded],
  );

  const steps = useMemo(
    () => learnDecisionTreeSteps(activeExamples, ATTRIBUTES),
    [activeExamples],
  );

  const maxStep = steps.length - 1;
  const currentStepClamped = Math.min(currentStep, maxStep);

  // Reset step when examples change
  useEffect(() => { setCurrentStep(0); setIsPlaying(false); }, [steps]);

  // RAF-based autoplay
  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPlaying || reduced) return;

    const tick = (ts: number) => {
      if (ts - lastRef.current >= speed) {
        lastRef.current = ts;
        setCurrentStep(prev => {
          if (prev >= maxStep) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, speed, maxStep]);

  // Build tree layout
  const { nodes, positions, rootId, svgWidth } = useMemo(() => {
    const ns = buildRenderTree(steps, currentStepClamped);
    const rootId = steps[0]?.nodeId ?? '';
    const leafCount = Math.max(countLeaves(ns, rootId), 1);
    const NODE_W = 110;
    const LEVEL_H = 85;
    const w = Math.max(leafCount * NODE_W, 500);
    const pos = new Map<string, Pos>();
    if (rootId) computePositions(ns, rootId, 0, w, 0, pos, LEVEL_H);
    return { nodes: ns, positions: pos, rootId, svgWidth: w };
  }, [steps, currentStepClamped]);

  const step = steps[currentStepClamped];
  const svgHeight = useMemo(() => {
    let maxDepth = 0;
    positions.forEach(p => { maxDepth = Math.max(maxDepth, p.y); });
    return maxDepth + 70;
  }, [positions]);

  function toggleExample(i: number) {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  // Render a single tree node as SVG
  function renderNodes(): JSX.Element[] {
    const elements: JSX.Element[] = [];
    nodes.forEach((node, id) => {
      const pos = positions.get(id);
      if (!pos) return;
      const isCurrentStep = id === step?.nodeId;
      const isCurrent = isCurrentStep;

      // Draw edges to children first
      for (const child of node.children) {
        const cpos = positions.get(child.id);
        if (!cpos) continue;
        elements.push(
          <line key={`edge-${id}-${child.id}`}
            x1={pos.x} y1={pos.y + 18}
            x2={cpos.x} y2={cpos.y - 18}
            stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}
          />,
          <text key={`elabel-${id}-${child.id}`}
            x={(pos.x + cpos.x) / 2 + 4} y={(pos.y + cpos.y) / 2}
            fill="rgba(255,255,255,0.55)" fontSize={10} textAnchor="middle">
            {child.parentValue ?? ''}
          </text>,
        );
      }

      if (node.isLeaf) {
        const leafColor = node.leafLabel ? COLORS.yes : COLORS.no;
        elements.push(
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={18}
              fill={`${leafColor}30`}
              stroke={isCurrent ? leafColor : `${leafColor}80`}
              strokeWidth={isCurrent ? 2.5 : 1.5}
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle"
              fontSize={12} fontWeight={700} fill={leafColor}>
              {node.leafLabel ? 'Yes' : 'No'}
            </text>
          </g>,
        );
      } else {
        elements.push(
          <g key={id}>
            <rect x={pos.x - 46} y={pos.y - 17}
              width={92} height={34} rx={6}
              fill={isCurrent ? `${COLORS.primary}30` : `${COLORS.surface2}`}
              stroke={isCurrent ? COLORS.primary : COLORS.border}
              strokeWidth={isCurrent ? 2 : 1}
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle"
              fontSize={11} fontWeight={600}
              fill={isCurrent ? '#E5E7EB' : '#9CA3AF'}>
              {node.attribute ?? '?'}
            </text>
          </g>,
        );
      }
    });
    return elements;
  }

  const btnStyle = (disabled = false): CSSProperties => ({
    padding: '6px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`,
    background: disabled ? 'transparent' : COLORS.surface3,
    color: disabled ? '#4B5563' : '#E5E7EB',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ background: COLORS.surface1, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${COLORS.border}` }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${COLORS.border}` }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          Decision Tree Learner (ID3)
        </h3>
        <p style={{ margin: '0 0 16px', color: '#9CA3AF', fontSize: '14px' }}>
          Step-by-step ID3 on the restaurant dataset (12 examples, 10 attributes).
        </p>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '16px' }}>
          <button aria-label="Reset to beginning" style={btnStyle()}
            onClick={() => { setIsPlaying(false); setCurrentStep(0); }}>⏮ Reset</button>
          <button aria-label="Step back" style={btnStyle(currentStepClamped === 0)}
            disabled={currentStepClamped === 0}
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}>◀ Back</button>
          <button aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ ...btnStyle(), background: COLORS.primary, border: 'none', color: 'white' }}
            onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button aria-label="Step forward" style={btnStyle(currentStepClamped >= maxStep)}
            disabled={currentStepClamped >= maxStep}
            onClick={() => setCurrentStep(s => Math.min(maxStep, s + 1))}>Next ▶</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Speed</span>
            <input type="range" min={200} max={2000} step={100} value={speed}
              aria-label="Playback speed"
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '80px' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#9CA3AF', alignSelf: 'center' }}>
            Step {currentStepClamped + 1} / {maxStep + 1}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
        {/* SVG Tree */}
        <div style={{ overflowX: 'auto', padding: '16px' }}>
          <svg width={svgWidth} height={Math.max(svgHeight, 80)}
            role="img" aria-label="Decision tree visualization">
            {renderNodes()}
          </svg>
        </div>

        {/* State Panel */}
        <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: '16px',
          overflowY: 'auto', maxHeight: '420px' }}>
          {step && (
            <>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                Depth {step.depth} · {step.positiveCount}+ {step.negativeCount}−
              </div>
              <div style={{ fontSize: '13px', color: '#E5E7EB', marginBottom: '12px',
                lineHeight: 1.5 }}>
                {step.action}
              </div>

              {/* Entropy */}
              <div style={{ background: COLORS.surface2, borderRadius: '8px',
                padding: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                  Entropy H
                </div>
                <div
                  dangerouslySetInnerHTML={{ __html: renderInlineMath(
                    `H = ${step.currentEntropyH.toFixed(4)}`,
                  ) }}
                />
              </div>

              {/* Attribute gains */}
              {step.attributeGains.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
                    Information Gains
                  </div>
                  {step.attributeGains.slice(0, 5).map(ag => (
                    <div key={ag.attribute} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '3px 0',
                      borderBottom: `1px solid ${COLORS.border}` }}>
                      <span style={{ fontSize: '12px',
                        color: ag.attribute === step.chosenAttribute ? COLORS.primary : '#9CA3AF',
                        fontWeight: ag.attribute === step.chosenAttribute ? 700 : 400 }}>
                        {ag.attribute}{ag.attribute === step.chosenAttribute ? ' ✓' : ''}
                      </span>
                      <span style={{ fontSize: '12px', color: '#E5E7EB' }}>
                        {ag.gain.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dataset table */}
      <details style={{ padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <summary style={{ cursor: 'pointer', color: '#9CA3AF', fontSize: '13px',
          userSelect: 'none' }}>
          ▸ What-If: Toggle examples ({activeExamples.length}/12 active)
        </summary>
        <div style={{ marginTop: '12px', overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <th style={{ padding: '4px 6px', color: '#9CA3AF', textAlign: 'left' }}>✓</th>
                {['Ex','Alt','Bar','Fri','Hun','Pat','Price','Rain','Res','Type','Est','WillWait'].map(h => (
                  <th key={h} style={{ padding: '4px 6px', color: '#9CA3AF', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESTAURANT.map((ex, i) => {
                const isExcluded = excluded.has(i);
                return (
                  <tr key={i} style={{ opacity: isExcluded ? 0.4 : 1,
                    borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="checkbox" checked={!isExcluded}
                        aria-label={`Include example ${i + 1}`}
                        onChange={() => toggleExample(i)} />
                    </td>
                    <td style={{ padding: '4px 6px', color: '#9CA3AF' }}>{i + 1}</td>
                    {ATTRIBUTES.map(attr => (
                      <td key={attr} style={{ padding: '4px 6px', color: '#E5E7EB' }}>
                        {ex.attributes[attr] ?? '-'}
                      </td>
                    ))}
                    <td style={{ padding: '4px 6px',
                      color: ex.label ? COLORS.yes : COLORS.no, fontWeight: 700 }}>
                      {ex.label ? 'Yes' : 'No'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Formula */}
      <div style={{ padding: '12px 24px', borderTop: `1px solid ${COLORS.border}`,
        display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
            Binary Entropy
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
            'H(p_+, p_-) = -p_+ \\log_2 p_+ - p_- \\log_2 p_-',
          ) }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
            Information Gain
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
            '\\text{Gain}(A) = H(\\mathbf{p}) - \\sum_v \\tfrac{|\\mathbf{p}_v|}{|\\mathbf{p}|} H(\\mathbf{p}_v)',
          ) }} />
        </div>
      </div>
    </div>
  );
}

