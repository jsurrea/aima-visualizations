import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FOLFormula,
  FOLTerm,
  SyntaxTreeNode,
  UnificationStep,
  ScopeStep,
  buildSyntaxTree,
  formulaToLatex,
  unify,
  analyzeQuantifierScope,
} from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

// ---------------------------------------------------------------------------
// Shared demo formulas
// ---------------------------------------------------------------------------

// ∀x (Human(x) ⇒ ∃y (Loves(x, y) ∧ ¬Mortal(y)))
const DEMO_FORMULA: FOLFormula = {
  kind: 'forall',
  variable: 'x',
  body: {
    kind: 'implies',
    left: { kind: 'atom', predicate: 'Human', args: [{ kind: 'var', name: 'x' }] },
    right: {
      kind: 'exists',
      variable: 'y',
      body: {
        kind: 'and',
        left: {
          kind: 'atom',
          predicate: 'Loves',
          args: [{ kind: 'var', name: 'x' }, { kind: 'var', name: 'y' }],
        },
        right: {
          kind: 'neg',
          arg: { kind: 'atom', predicate: 'Mortal', args: [{ kind: 'var', name: 'y' }] },
        },
      },
    },
  },
};

// Unification example 1: f(x, g(y)) ~ f(a, g(b)) → success
const UNI_EXAMPLE_1: [FOLTerm, FOLTerm] = [
  { kind: 'fn', name: 'f', args: [{ kind: 'var', name: 'x' }, { kind: 'fn', name: 'g', args: [{ kind: 'var', name: 'y' }] }] },
  { kind: 'fn', name: 'f', args: [{ kind: 'const', name: 'a' }, { kind: 'fn', name: 'g', args: [{ kind: 'const', name: 'b' }] }] },
];

// Unification example 2: f(x, x) ~ f(a, b) → failure
const UNI_EXAMPLE_2: [FOLTerm, FOLTerm] = [
  { kind: 'fn', name: 'f', args: [{ kind: 'var', name: 'x' }, { kind: 'var', name: 'x' }] },
  { kind: 'fn', name: 'f', args: [{ kind: 'const', name: 'a' }, { kind: 'const', name: 'b' }] },
];

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
const KIND_COLORS: Record<string, string> = {
  forall: '#3B82F6',
  exists: '#10B981',
  implies: '#F59E0B',
  iff: '#F59E0B',
  and: '#6366F1',
  or: '#6366F1',
  neg: '#EC4899',
  atom: '#8B5CF6',
  eq: '#8B5CF6',
  fn: '#06B6D4',
  var: '#A3E635',
  const: '#FB923C',
};

function nodeColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#9CA3AF';
}

// ---------------------------------------------------------------------------
// Playback hook
// ---------------------------------------------------------------------------
function usePlayback(length: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const prefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const stop = useCallback(() => {
    setPlaying(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setIndex(0);
  }, [stop]);

  useEffect(() => {
    if (!playing || prefersReduced.current) return;
    const delay = 1200 / speed;
    const tick = (ts: number) => {
      if (ts - lastRef.current >= delay) {
        lastRef.current = ts;
        setIndex(i => {
          if (i >= length - 1) {
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
  }, [playing, speed, length]);

  return {
    index, setIndex,
    playing,
    play: () => setPlaying(true),
    pause: stop,
    reset,
    stepBack: () => setIndex(i => Math.max(0, i - 1)),
    stepForward: () => setIndex(i => Math.min(length - 1, i + 1)),
    speed, setSpeed,
    prefersReduced: prefersReduced.current,
  };
}

// ---------------------------------------------------------------------------
// Controls bar
// ---------------------------------------------------------------------------
function Controls({
  pb,
  length,
}: {
  pb: ReturnType<typeof usePlayback>;
  length: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderRadius: '10px',
        marginBottom: '16px',
      }}
      role="toolbar"
      aria-label="Playback controls"
    >
      <button
        onClick={pb.playing ? pb.pause : pb.play}
        disabled={pb.index >= length - 1 && !pb.playing}
        aria-label={pb.playing ? 'Pause' : 'Play'}
        style={btnStyle('#6366F1')}
      >
        {pb.playing ? '⏸' : '▶'}
      </button>
      <button onClick={pb.stepBack} disabled={pb.index === 0} aria-label="Step back" style={btnStyle('#4B5563')}>
        ◀
      </button>
      <button onClick={pb.stepForward} disabled={pb.index >= length - 1} aria-label="Step forward" style={btnStyle('#4B5563')}>
        ▶
      </button>
      <button onClick={pb.reset} aria-label="Reset" style={btnStyle('#374151')}>
        ↺
      </button>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9CA3AF', marginLeft: '8px' }}>
        Speed:
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.5"
          value={pb.speed}
          onChange={e => pb.setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
          style={{ width: '80px', accentColor: 'var(--color-primary)' }}
        />
        <span style={{ fontSize: '12px', minWidth: '28px' }}>{pb.speed}×</span>
      </label>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
        Step {pb.index + 1} / {length}
      </span>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: bg,
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    opacity: 1,
  };
}

// ---------------------------------------------------------------------------
// SVG Syntax Tree
// ---------------------------------------------------------------------------

const NODE_W = 110;
const NODE_H = 36;
const H_GAP = 14;
const V_GAP = 60;

interface LayoutNode {
  node: SyntaxTreeNode;
  x: number;
  y: number;
  children: LayoutNode[];
}

function layoutTree(node: SyntaxTreeNode, depth = 0): LayoutNode {
  const children = node.children.map(c => layoutTree(c, depth + 1));
  return { node, x: 0, y: depth * (NODE_H + V_GAP), children };
}

function assignX(layout: LayoutNode, offset = 0): number {
  if (layout.children.length === 0) {
    layout.x = offset;
    return offset + NODE_W + H_GAP;
  }
  let cur = offset;
  for (const child of layout.children) {
    cur = assignX(child, cur);
  }
  const first = layout.children[0];
  const last = layout.children[layout.children.length - 1];
  const leftmost = first !== undefined ? first.x : offset;
  const rightmost = last !== undefined ? last.x : offset;
  layout.x = (leftmost + rightmost) / 2;
  return cur;
}

function totalWidth(layout: LayoutNode): number {
  let max = layout.x + NODE_W;
  for (const child of layout.children) {
    max = Math.max(max, totalWidth(child));
  }
  return max;
}

function totalHeight(layout: LayoutNode): number {
  let max = layout.y + NODE_H;
  for (const child of layout.children) {
    max = Math.max(max, totalHeight(child));
  }
  return max;
}

function flattenLayout(layout: LayoutNode): LayoutNode[] {
  return [layout, ...layout.children.flatMap(flattenLayout)];
}

function SyntaxTreeSVG({ root }: { root: SyntaxTreeNode }) {
  const layout = layoutTree(root);
  assignX(layout, 20);
  const svgW = totalWidth(layout) + 40;
  const svgH = totalHeight(layout) + 20;
  const all = flattenLayout(layout);

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      aria-label="Syntax tree diagram"
      role="img"
      style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}
    >
      {/* Edges */}
      {all.map(n =>
        n.children.map(child => (
          <line
            key={`${n.node.id}-${child.node.id}`}
            x1={n.x + NODE_W / 2}
            y1={n.y + NODE_H}
            x2={child.x + NODE_W / 2}
            y2={child.y}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1.5}
          />
        )),
      )}
      {/* Nodes */}
      {all.map(n => {
        const color = nodeColor(n.node.kind);
        return (
          <g key={n.node.id} transform={`translate(${n.x},${n.y})`} role="group" aria-label={n.node.label}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={`${color}22`}
              stroke={color}
              strokeWidth={1.5}
            />
            <text
              x={NODE_W / 2}
              y={NODE_H / 2 + 5}
              textAnchor="middle"
              fill={color}
              fontSize={12}
              fontWeight={600}
              fontFamily="monospace"
              style={{ userSelect: 'none' }}
            >
              {n.node.label.length > 12 ? n.node.label.slice(0, 11) + '…' : n.node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Syntax Tree Tab
// ---------------------------------------------------------------------------
function SyntaxTreeTab() {
  const root = buildSyntaxTree(DEMO_FORMULA);
  const latexStr = formulaToLatex(DEMO_FORMULA);

  const legend = Object.entries(KIND_COLORS).map(([k, c]) => ({ k, c }));

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        Parse tree for a first-order formula. Each node shows the operator or symbol; colors
        indicate the syntactic category.
      </p>
      <div
        style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px' }}
        aria-label="Formula display"
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(latexStr) }}
      />
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {legend.map(({ k, c }) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#D1D5DB' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />
            {k}
          </span>
        ))}
      </div>
      <div style={{ overflowX: 'auto', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
        <SyntaxTreeSVG root={root} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unification Tab
// ---------------------------------------------------------------------------
function UnificationTab() {
  const [exampleIdx, setExampleIdx] = useState(0);
  const examples: [FOLTerm, FOLTerm][] = [UNI_EXAMPLE_1, UNI_EXAMPLE_2];
  const exampleLabels = [
    'f(x, g(y)) ≈ f(a, g(b)) — succeeds',
    'f(x, x) ≈ f(a, b) — fails',
  ];

  const example = examples[exampleIdx] ?? examples[0]!;
  const [t1, t2] = example;
  const steps = unify(t1, t2);
  const pb = usePlayback(steps.length);

  // Reset when example changes
  useEffect(() => { pb.reset(); }, [exampleIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = steps[pb.index] ?? steps[0]!;
  const resultColor =
    step.result === 'success' ? '#10B981' : step.result === 'failure' ? '#EF4444' : '#9CA3AF';

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        Robinson's unification algorithm finds the most general unifier (MGU) of two FOL terms,
        or reports failure if none exists.
      </p>
      {/* Example toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {exampleLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setExampleIdx(i)}
            aria-pressed={exampleIdx === i}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              border: `1px solid ${exampleIdx === i ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
              background: exampleIdx === i ? 'var(--color-primary)22' : 'var(--surface-2)',
              color: exampleIdx === i ? 'var(--color-primary)' : '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Terms display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px', textAlign: 'center' }}
          dangerouslySetInnerHTML={{ __html: renderDisplayMath(formulaToLatex(t1)) }}
        />
        <span style={{ color: '#6B7280', fontSize: '18px', fontWeight: 700 }}>≈</span>
        <div
          style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px', textAlign: 'center' }}
          dangerouslySetInnerHTML={{ __html: renderDisplayMath(formulaToLatex(t2)) }}
        />
      </div>

      <Controls pb={pb} length={steps.length} />

      {/* Step card */}
      <div
        style={{
          padding: '16px',
          background: 'var(--surface-2)',
          borderRadius: '12px',
          border: `1px solid ${resultColor}40`,
          marginBottom: '16px',
        }}
        role="status"
        aria-live="polite"
      >
        <div style={{ fontSize: '13px', color: resultColor, fontWeight: 600, marginBottom: '10px' }}>
          {step.action}
        </div>
        {/* Remaining pairs */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Remaining pairs:</div>
          {step.remainingPairs.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#4B5563' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {step.remainingPairs.map(([a, b], i) => (
                <span
                  key={i}
                  style={{ padding: '2px 8px', borderRadius: '6px', background: 'var(--surface-1)', fontSize: '12px', color: '#E5E7EB' }}
                  dangerouslySetInnerHTML={{ __html: renderInlineMath(`${formulaToLatex(a)} \\approx ${formulaToLatex(b)}`) }}
                />
              ))}
            </div>
          )}
        </div>
        {/* θ bindings */}
        <div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Substitution θ:
          </div>
          {step.theta.size === 0 ? (
            <span style={{ fontSize: '12px', color: '#4B5563' }}>∅</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[...step.theta.entries()].map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    padding: '2px 8px', borderRadius: '6px',
                    background: step.result === 'failure' ? '#EF444420' : '#10B98120',
                    fontSize: '12px',
                    color: step.result === 'failure' ? '#EF4444' : '#10B981',
                    border: `1px solid ${step.result === 'failure' ? '#EF444440' : '#10B98140'}`,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderInlineMath(`${k} \\to ${formulaToLatex(v)}`) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Final result badge */}
      {step.result !== 'pending' && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: step.result === 'success' ? '#10B98118' : '#EF444418',
            border: `1px solid ${step.result === 'success' ? '#10B98140' : '#EF444440'}`,
            fontSize: '14px',
            fontWeight: 600,
            color: step.result === 'success' ? '#10B981' : '#EF4444',
            textAlign: 'center',
          }}
          role="alert"
        >
          {step.result === 'success' ? '✓ Unification succeeded' : '✗ Unification failed'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantifier Scope Tab
// ---------------------------------------------------------------------------
function QuantifierScopeTab() {
  const steps = analyzeQuantifierScope(DEMO_FORMULA);
  const pb = usePlayback(steps.length);
  const step = steps[pb.index] ?? steps[0]!;

  const quantifierColor = (q: 'forall' | 'exists') => q === 'forall' ? '#3B82F6' : '#10B981';

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        Tracks universal (∀) and existential (∃) quantifiers, their nesting depth, and which
        variables are free vs bound.
      </p>

      {/* Formula */}
      <div
        style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px' }}
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(formulaToLatex(DEMO_FORMULA)) }}
      />

      <Controls pb={pb} length={steps.length} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
        {/* Quantifier list */}
        <div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
            Quantifiers found:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {step.allQuantifiers.map((q, i) => {
              const isActive = step.activeQuantifier?.variable === q.variable &&
                step.activeQuantifier?.quantifier === q.quantifier &&
                step.activeQuantifier?.depth === q.depth;
              const color = quantifierColor(q.quantifier);
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isActive ? `${color}18` : 'var(--surface-2)',
                    border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.06)'}`,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `${color}22`, color,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700,
                      }}
                    >
                      {q.quantifier === 'forall' ? '∀' : '∃'}
                    </span>
                    <span
                      style={{ color, fontWeight: 600, fontSize: '14px' }}
                      dangerouslySetInnerHTML={{ __html: renderInlineMath(q.quantifier === 'forall' ? `\\forall ${q.variable}` : `\\exists ${q.variable}`) }}
                    />
                    <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: 'auto' }}>
                      depth {q.depth}
                    </span>
                  </div>
                  {isActive && (
                    <div
                      style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}
                      dangerouslySetInnerHTML={{ __html: renderInlineMath(q.latex) }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: variables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Active quantifier detail */}
          <div
            style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}
            role="status"
            aria-live="polite"
          >
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Current action</div>
            <div style={{ fontSize: '13px', color: '#E5E7EB', lineHeight: 1.5 }}>{step.action}</div>
          </div>

          {/* Free variables */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Free variables</div>
            {step.freeVariables.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#4B5563' }}>none</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {step.freeVariables.map(v => (
                  <span
                    key={v}
                    style={{ padding: '2px 8px', borderRadius: '6px', background: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B40', fontSize: '13px' }}
                    dangerouslySetInnerHTML={{ __html: renderInlineMath(v) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bound variables */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Bound variables</div>
            {step.boundVariables.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#4B5563' }}>none</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {step.boundVariables.map(v => (
                  <span
                    key={v}
                    style={{ padding: '2px 8px', borderRadius: '6px', background: '#8B5CF618', color: '#8B5CF6', border: '1px solid #8B5CF640', fontSize: '13px' }}
                    dangerouslySetInnerHTML={{ __html: renderInlineMath(v) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Color legend */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: '∀ Universal', color: '#3B82F6' },
                { label: '∃ Existential', color: '#10B981' },
                { label: 'Free var', color: '#F59E0B' },
                { label: 'Bound var', color: '#8B5CF6' },
              ].map(({ label, color }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#D1D5DB' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
type TabId = 'syntax-tree' | 'unification' | 'quantifier-scope';

const TABS: { id: TabId; label: string }[] = [
  { id: 'syntax-tree', label: 'Syntax Tree' },
  { id: 'unification', label: 'Unification' },
  { id: 'quantifier-scope', label: 'Quantifier Scope' },
];

export default function FirstOrderLogicVisualizer() {
  const [tab, setTab] = useState<TabId>('syntax-tree');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'white' }}>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Visualizer tabs"
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--surface-2)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            style={{
              flex: '1 1 auto',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'background 0.15s, color 0.15s',
              background: tab === t.id ? 'var(--chapter-color)' : 'transparent',
              color: tab === t.id ? 'white' : '#9CA3AF',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {TABS.map(t => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={tab !== t.id}
          style={{ display: tab === t.id ? 'block' : 'none' }}
        >
          {t.id === 'syntax-tree' && <SyntaxTreeTab />}
          {t.id === 'unification' && <UnificationTab />}
          {t.id === 'quantifier-scope' && <QuantifierScopeTab />}
        </div>
      ))}
    </div>
  );
}
