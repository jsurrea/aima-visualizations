import { useState, useCallback } from 'react';
import {
  buildOntologyHierarchy,
  getAncestors,
  inheritProperty,
  type OntologyNode,
  type InheritanceStep,
} from '../algorithms/index.js';
import { renderInlineMath } from '../utils/mathUtils.js';

// ─── Data ────────────────────────────────────────────────────────────────────

const ASSERTIONS: Array<
  | { kind: 'subset'; parent: string; child: string }
  | { kind: 'member'; category: string; individual: string }
> = [
  { kind: 'subset', parent: 'Anything', child: 'AbstractObjects' },
  { kind: 'subset', parent: 'Anything', child: 'GeneralizedEvents' },
  { kind: 'subset', parent: 'Anything', child: 'Sets' },
  { kind: 'subset', parent: 'Anything', child: 'Numbers' },
  { kind: 'subset', parent: 'Anything', child: 'RepresentationalObjects' },
  { kind: 'subset', parent: 'GeneralizedEvents', child: 'PhysicalObjects' },
  { kind: 'subset', parent: 'GeneralizedEvents', child: 'Processes' },
  { kind: 'subset', parent: 'GeneralizedEvents', child: 'Intervals' },
  { kind: 'subset', parent: 'GeneralizedEvents', child: 'Places' },
  { kind: 'subset', parent: 'PhysicalObjects', child: 'Things' },
  { kind: 'subset', parent: 'PhysicalObjects', child: 'Stuff' },
  { kind: 'subset', parent: 'Things', child: 'Animals' },
  { kind: 'subset', parent: 'Things', child: 'Agents' },
  { kind: 'subset', parent: 'Animals', child: 'Humans' },
  { kind: 'subset', parent: 'Stuff', child: 'Solid' },
  { kind: 'subset', parent: 'Stuff', child: 'Liquid' },
  { kind: 'subset', parent: 'Stuff', child: 'Gas' },
  { kind: 'subset', parent: 'Intervals', child: 'Moments' },
  { kind: 'subset', parent: 'Intervals', child: 'Times' },
  { kind: 'subset', parent: 'RepresentationalObjects', child: 'Sentences' },
  { kind: 'subset', parent: 'RepresentationalObjects', child: 'Measurements' },
  { kind: 'subset', parent: 'RepresentationalObjects', child: 'Categories' },
  { kind: 'subset', parent: 'Numbers', child: 'Weights' },
];

const PROPERTY_OWNER: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ['Humans', ['speaks', 'thinksAbout']],
  ['Animals', ['hasLegs', 'isAlive']],
  ['PhysicalObjects', ['hasLocation', 'hasMass']],
  ['GeneralizedEvents', ['hasTime']],
  ['Anything', ['exists']],
]);

const PROPERTY_LIST = ['exists', 'hasTime', 'hasLocation', 'hasMass', 'hasLegs', 'isAlive', 'speaks', 'thinksAbout'];

// ─── Build hierarchy ──────────────────────────────────────────────────────────

function buildHierarchy(extra?: { kind: 'subset'; parent: string; child: string }) {
  const assertions = extra ? [...ASSERTIONS, extra] : ASSERTIONS;
  return buildOntologyHierarchy(assertions);
}

function buildParentMap(hierarchy: ReadonlyMap<string, OntologyNode>): ReadonlyMap<string, string> {
  const pm = new Map<string, string>();
  for (const [nodeId, node] of hierarchy) {
    for (const child of node.children) {
      if (!pm.has(child)) pm.set(child, nodeId);
    }
  }
  return pm;
}

// ─── Tree rendering ──────────────────────────────────────────────────────────

interface TreeNodeProps {
  id: string;
  hierarchy: ReadonlyMap<string, OntologyNode>;
  selected: string | null;
  highlighted: ReadonlySet<string>;
  onSelect: (id: string) => void;
  depth: number;
}

function TreeNodeComp({ id, hierarchy, selected, highlighted, onSelect, depth }: TreeNodeProps) {
  const node = hierarchy.get(id);
  if (!node) return null;
  const isSelected = selected === id;
  const isHighlighted = highlighted.has(id);

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <button
        onClick={() => onSelect(id)}
        aria-pressed={isSelected}
        aria-label={`Select ontology node ${id}`}
        style={{
          background: isSelected ? '#8B5CF6' : isHighlighted ? '#8B5CF630' : 'var(--surface-2)',
          border: `1px solid ${isHighlighted || isSelected ? '#8B5CF6' : 'var(--surface-border)'}`,
          borderRadius: 8,
          color: isSelected ? '#fff' : '#E5E7EB',
          padding: '4px 12px',
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 4,
          display: 'block',
          textAlign: 'left',
          fontWeight: isSelected ? 700 : 400,
          transition: 'background 0.15s',
        }}
      >
        {id}
        {PROPERTY_OWNER.has(id) && (
          <span style={{ fontSize: 11, color: '#F59E0B', marginLeft: 6 }}>
            ({(PROPERTY_OWNER.get(id) ?? []).join(', ')})
          </span>
        )}
      </button>
      {node.children.length > 0 && (
        <div style={{ borderLeft: '1px dashed rgba(139,92,246,0.3)', marginLeft: 8, paddingLeft: 4 }}>
          {node.children.map(childId => (
            <TreeNodeComp
              key={childId}
              id={childId}
              hierarchy={hierarchy}
              selected={selected}
              highlighted={highlighted}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OntologyViz() {
  const [selected, setSelected] = useState<string | null>('Humans');
  const [queryNode, setQueryNode] = useState('Humans');
  const [queryProp, setQueryProp] = useState('hasLegs');
  const [querySteps, setQuerySteps] = useState<ReadonlyArray<InheritanceStep> | null>(null);
  const [queryStepIdx, setQueryStepIdx] = useState(0);
  const [customName, setCustomName] = useState('');
  const [customParent, setCustomParent] = useState('Animals');
  const [extraAssertion, setExtraAssertion] = useState<{ kind: 'subset'; parent: string; child: string } | undefined>(undefined);

  const hierarchy = buildHierarchy(extraAssertion);
  const parentMap = buildParentMap(hierarchy);

  const ancestors = selected ? getAncestors(selected, hierarchy) : [];

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    setQuerySteps(null);
  }, []);

  const runQuery = useCallback(() => {
    const steps = inheritProperty(queryNode, queryProp, PROPERTY_OWNER, parentMap);
    setQuerySteps(steps);
    setQueryStepIdx(0);
  }, [queryNode, queryProp, parentMap]);

  const highlighted = new Set<string>();
  if (querySteps) {
    for (let i = 0; i <= queryStepIdx; i++) {
      const s = querySteps[i];
      if (s) highlighted.add(s.node);
    }
  }

  const currentStep = querySteps ? (querySteps[queryStepIdx] ?? null) : null;
  const allNodes = [...hierarchy.keys()].sort();

  return (
    <div
      id="ontological-engineering"
      style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}
      aria-label="Ontological Engineering visualization"
    >
      <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>
        §10.1–10.2 Ontological Engineering &amp; Categories
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        The AIMA upper ontology: a hierarchy of categories covering everything in the world.
        Click any node to explore its ancestors and inherited properties.
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Tree */}
        <div style={{ flex: '1 1 300px', overflowY: 'auto', maxHeight: 480, paddingRight: 8 }}>
          <h3 style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 8 }}>Ontology Hierarchy</h3>
          <TreeNodeComp
            id="Anything"
            hierarchy={hierarchy}
            selected={selected}
            highlighted={highlighted}
            onSelect={handleSelect}
            depth={0}
          />
        </div>

        {/* State panel + controls */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selected node info */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16 }}>
            <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Selected Node</h3>
            {selected ? (
              <>
                <div style={{ color: '#8B5CF6', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{selected}</div>
                <div style={{ fontSize: 13, color: '#E5E7EB', marginBottom: 4 }}>
                  <strong>Ancestors:</strong>{' '}
                  {ancestors.length === 0 ? 'none (root)' : ancestors.join(' → ')}
                </div>
                <div style={{ fontSize: 13, color: '#E5E7EB' }}>
                  <strong>Own properties:</strong>{' '}
                  {(PROPERTY_OWNER.get(selected) ?? []).join(', ') || 'none'}
                </div>
                {ancestors.length > 0 && (
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                    <span dangerouslySetInnerHTML={{ __html: renderInlineMath(
                      [selected, ...ancestors].map(n => `\\text{${n}}`).join(' \\subset ')
                    ) }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#6B7280', fontSize: 13 }}>Click a node to select it</div>
            )}
          </div>

          {/* Inheritance query */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16 }}>
            <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Inheritance Query</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <select
                value={queryNode}
                onChange={e => setQueryNode(e.target.value)}
                aria-label="Query node"
                style={selectStyle}
              >
                {allNodes.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select
                value={queryProp}
                onChange={e => setQueryProp(e.target.value)}
                aria-label="Query property"
                style={selectStyle}
              >
                {PROPERTY_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={runQuery} style={btnStyle} aria-label="Run inheritance query">
              Run Query
            </button>

            {querySteps && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setQueryStepIdx(i => Math.max(0, i - 1))}
                    disabled={queryStepIdx === 0}
                    style={smallBtnStyle}
                    aria-label="Previous step"
                  >←</button>
                  <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center' }}>
                    Step {queryStepIdx + 1} / {querySteps.length}
                  </span>
                  <button
                    onClick={() => setQueryStepIdx(i => Math.min(querySteps.length - 1, i + 1))}
                    disabled={queryStepIdx === querySteps.length - 1}
                    style={smallBtnStyle}
                    aria-label="Next step"
                  >→</button>
                </div>
                {currentStep && (
                  <div style={{
                    background: currentStep.foundProperty ? '#10B98120' : 'var(--surface-3)',
                    borderRadius: 8, padding: 10, fontSize: 12,
                    border: `1px solid ${currentStep.foundProperty ? '#10B981' : 'var(--surface-border)'}`,
                  }}>
                    <div style={{ color: '#8B5CF6', fontWeight: 600, marginBottom: 4 }}>
                      Node: {currentStep.node}
                    </div>
                    <div style={{ color: '#E5E7EB' }}>{currentStep.action}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What-if: add custom category */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16 }}>
            <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>What-If: Add Category</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="New category name"
                aria-label="New category name"
                style={{ ...selectStyle, flex: '1 1 120px' }}
              />
              <select
                value={customParent}
                onChange={e => setCustomParent(e.target.value)}
                aria-label="Parent category"
                style={{ ...selectStyle, flex: '1 1 120px' }}
              >
                {allNodes.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  if (customName.trim()) {
                    setExtraAssertion({ kind: 'subset', parent: customParent, child: customName.trim() });
                  }
                }}
                style={btnStyle}
                aria-label="Add custom category"
              >Add</button>
              <button
                onClick={() => setExtraAssertion(undefined)}
                style={{ ...btnStyle, background: 'var(--surface-3)' }}
                aria-label="Remove custom category"
              >Remove</button>
            </div>
            {extraAssertion && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#F59E0B' }}>
                Added: {extraAssertion.child} ⊂ {extraAssertion.parent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Concepts explanation */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Member', desc: 'x ∈ C — individual belongs to category' },
          { label: 'Subset', desc: 'C₁ ⊂ C₂ — all members of C₁ are in C₂' },
          { label: 'Disjoint', desc: 'C₁ ∩ C₂ = ∅ — no shared members' },
          { label: 'Partition', desc: 'Disjoint + exhaustive cover of parent' },
        ].map(({ label, desc }) => (
          <div key={label} style={{
            background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px',
            fontSize: 12, color: '#9CA3AF', flex: '1 1 160px',
          }}>
            <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{label}:</span> {desc}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: 'var(--surface-3)',
  border: '1px solid var(--surface-border)',
  borderRadius: 6,
  color: '#E5E7EB',
  padding: '4px 8px',
  fontSize: 13,
};

const btnStyle: React.CSSProperties = {
  background: '#8B5CF6',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  padding: '6px 16px',
  fontSize: 13,
  cursor: 'pointer',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--surface-3)',
  border: '1px solid var(--surface-border)',
  borderRadius: 6,
  color: '#E5E7EB',
  padding: '2px 10px',
  fontSize: 13,
  cursor: 'pointer',
};
