import { useState } from 'react';
import {
  inheritProperty,
  dlClassify,
  dlConceptToString,
  type InheritanceStep,
  type DLIndividual,
  type DLConcept,
  type DLClassifyStep,
} from '../algorithms/index.js';
import { renderInlineMath } from '../utils/mathUtils.js';

// ─── Semantic Network Data ────────────────────────────────────────────────────

const PROPERTY_OWNER_SN: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ['Persons', ['Legs=2', 'Speaks']],
  ['FemalePersons', ['Gender=Female']],
  ['MalePersons', ['Gender=Male']],
  ['Mammals', ['WarmBlooded', 'HasHair']],
  ['John', ['Legs=4']],   // Override — John has 4 legs (exceptional)
]);

const PARENT_MAP_SN: ReadonlyMap<string, string> = new Map([
  ['FemalePersons', 'Persons'],
  ['MalePersons', 'Persons'],
  ['Persons', 'Mammals'],
  ['John', 'MalePersons'],
  ['Mary', 'FemalePersons'],
  ['Tom', 'MalePersons'],
]);

const SN_NODES: ReadonlyArray<{ id: string; x: number; y: number; color: string; shape: 'circle' | 'rect' }> = [
  { id: 'Mammals', x: 180, y: 20, color: '#8B5CF6', shape: 'rect' },
  { id: 'Persons', x: 180, y: 80, color: '#8B5CF6', shape: 'rect' },
  { id: 'MalePersons', x: 80, y: 140, color: '#6366F1', shape: 'rect' },
  { id: 'FemalePersons', x: 280, y: 140, color: '#EC4899', shape: 'rect' },
  { id: 'John', x: 30, y: 200, color: '#F59E0B', shape: 'circle' },
  { id: 'Tom', x: 110, y: 200, color: '#F59E0B', shape: 'circle' },
  { id: 'Mary', x: 280, y: 200, color: '#10B981', shape: 'circle' },
];

const SN_EDGES: ReadonlyArray<{ from: string; to: string; label: string }> = [
  { from: 'Persons', to: 'Mammals', label: '⊂' },
  { from: 'MalePersons', to: 'Persons', label: '⊂' },
  { from: 'FemalePersons', to: 'Persons', label: '⊂' },
  { from: 'John', to: 'MalePersons', label: '∈' },
  { from: 'Tom', to: 'MalePersons', label: '∈' },
  { from: 'Mary', to: 'FemalePersons', label: '∈' },
];

function nodePos(id: string): { x: number; y: number } {
  return SN_NODES.find(n => n.id === id) ?? { x: 0, y: 0 };
}

// ─── DL Data ──────────────────────────────────────────────────────────────────

const BACHELOR_CONCEPT: DLConcept = {
  kind: 'and',
  concepts: [
    { kind: 'name', name: 'Unmarried' },
    { kind: 'name', name: 'Adult' },
    { kind: 'name', name: 'Male' },
  ],
};

const DL_INDIVIDUALS: ReadonlyMap<string, DLIndividual> = new Map([
  ['John', { name: 'John', memberOf: ['Unmarried', 'Adult', 'Male'], roles: [], roleCounts: [] }],
  ['Mary', { name: 'Mary', memberOf: ['Adult', 'Female'], roles: [], roleCounts: [] }],
  ['Bob', { name: 'Bob', memberOf: ['Married', 'Adult', 'Male'], roles: [], roleCounts: [] }],
  ['Alice', { name: 'Alice', memberOf: ['Unmarried', 'Adult', 'Female'], roles: [], roleCounts: [] }],
]);

const DL_CONCEPT_OPTIONS: ReadonlyArray<{ label: string; concept: DLConcept }> = [
  { label: 'Bachelor', concept: BACHELOR_CONCEPT },
  {
    label: 'Adult Male',
    concept: { kind: 'and', concepts: [{ kind: 'name', name: 'Adult' }, { kind: 'name', name: 'Male' }] },
  },
  {
    label: 'Unmarried Person',
    concept: { kind: 'and', concepts: [{ kind: 'name', name: 'Unmarried' }] },
  },
];

// ─── Semantic Network Sub-viz ─────────────────────────────────────────────────

function SemanticNetworkSub() {
  const [queryNode, setQueryNode] = useState('Mary');
  const [queryProp, setQueryProp] = useState('Legs=2');
  const [overrideJohn, setOverrideJohn] = useState(true);
  const [steps, setSteps] = useState<ReadonlyArray<InheritanceStep> | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const propOwner: ReadonlyMap<string, ReadonlyArray<string>> = overrideJohn
    ? PROPERTY_OWNER_SN
    : new Map([...PROPERTY_OWNER_SN.entries()].filter(([k]) => k !== 'John'));

  const runQuery = () => {
    const result = inheritProperty(queryNode, queryProp, propOwner, PARENT_MAP_SN);
    setSteps(result);
    setStepIdx(0);
  };

  const currentStep = steps ? (steps[stepIdx] ?? null) : null;
  const highlighted = new Set<string>();
  if (steps) {
    for (let i = 0; i <= stepIdx; i++) {
      const s = steps[i];
      if (s) highlighted.add(s.node);
    }
  }

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>
        Semantic network with inheritance — query how a property propagates up the hierarchy.
      </p>

      {/* SVG Graph */}
      <svg width="100%" viewBox="0 0 380 240" aria-label="Semantic network graph"
        style={{ background: 'var(--surface-3)', borderRadius: 8, marginBottom: 12 }}>
        {/* Edges */}
        {SN_EDGES.map(edge => {
          const from = nodePos(edge.from);
          const to = nodePos(edge.to);
          const isActive = highlighted.has(edge.from) && highlighted.has(edge.to);
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={from.x + 50} y1={from.y + 15}
                x2={to.x + 50} y2={to.y + 15}
                stroke={isActive ? '#8B5CF6' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={(from.x + to.x) / 2 + 55}
                y={(from.y + to.y) / 2 + 15}
                fill={isActive ? '#8B5CF6' : '#9CA3AF'}
                fontSize={10}
              >{edge.label}</text>
            </g>
          );
        })}
        {/* Nodes */}
        {SN_NODES.map(node => {
          const isHighlighted = highlighted.has(node.id);
          const isQuery = node.id === queryNode;
          const isCurrentStep = currentStep?.node === node.id;
          return (
            <g key={node.id}>
              {node.shape === 'rect' ? (
                <rect
                  x={node.x} y={node.y} width={100} height={28}
                  rx={6}
                  fill={isCurrentStep ? '#8B5CF620' : isHighlighted ? node.color + '30' : 'var(--surface-2)'}
                  stroke={isCurrentStep ? '#8B5CF6' : isHighlighted ? node.color : 'rgba(255,255,255,0.15)'}
                  strokeWidth={isCurrentStep ? 2 : 1}
                />
              ) : (
                <ellipse
                  cx={node.x + 50} cy={node.y + 14} rx={48} ry={14}
                  fill={isQuery ? node.color + '40' : isHighlighted ? node.color + '25' : 'var(--surface-2)'}
                  stroke={isQuery ? node.color : isHighlighted ? node.color : 'rgba(255,255,255,0.15)'}
                  strokeWidth={isQuery ? 2 : 1}
                />
              )}
              <text
                x={node.x + 50} y={node.y + 18}
                fill={isCurrentStep ? '#8B5CF6' : isHighlighted ? '#E5E7EB' : '#9CA3AF'}
                fontSize={11} textAnchor="middle" fontWeight={isCurrentStep ? 700 : 400}
              >{node.id}</text>
              {PROPERTY_OWNER_SN.has(node.id) && (
                <text x={node.x + 50} y={node.y + 28}
                  fill="#F59E0B" fontSize={8} textAnchor="middle" opacity={0.8}>
                  {(propOwner.get(node.id) ?? []).join(',')}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={queryNode} onChange={e => setQueryNode(e.target.value)} style={selectStyle} aria-label="Query node">
          {['John', 'Tom', 'Mary', 'MalePersons', 'FemalePersons', 'Persons', 'Mammals'].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select value={queryProp} onChange={e => setQueryProp(e.target.value)} style={selectStyle} aria-label="Property to look up">
          {['Legs=2', 'Legs=4', 'Speaks', 'WarmBlooded', 'HasHair', 'Gender=Female', 'Gender=Male'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button onClick={runQuery} style={btnStyle} aria-label="Run inheritance query">Run Query</button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E5E7EB', marginBottom: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={overrideJohn}
          onChange={e => setOverrideJohn(e.target.checked)}
          aria-label="John has Legs=4 override"
        />
        What-If: John has <span style={{ color: '#F59E0B' }}>Legs=4</span> (overrides default)
      </label>

      {steps && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Previous">◀</button>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Step {stepIdx + 1}/{steps.length}</span>
            <button onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={smallBtnStyle} aria-label="Next">▶</button>
            <button onClick={() => { setSteps(null); }} style={smallBtnStyle} aria-label="Reset">Reset</button>
          </div>
          {currentStep && (
            <div style={{
              background: currentStep.foundProperty ? '#10B98120' : 'var(--surface-3)',
              border: `1px solid ${currentStep.foundProperty ? '#10B981' : 'var(--surface-border)'}`,
              borderRadius: 8, padding: 10, fontSize: 12, color: '#E5E7EB',
            }}>
              <strong style={{ color: '#8B5CF6' }}>{currentStep.node}:</strong> {currentStep.action}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DL Sub-viz ───────────────────────────────────────────────────────────────

function DLSub() {
  const [conceptIdx, setConceptIdx] = useState(0);
  const [individualName, setIndividualName] = useState('John');
  const [steps, setSteps] = useState<ReadonlyArray<DLClassifyStep> | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [removedProp, setRemovedProp] = useState<string | null>(null);

  const conceptEntry = DL_CONCEPT_OPTIONS[conceptIdx] ?? DL_CONCEPT_OPTIONS[0]!;
  const baseIndividual = DL_INDIVIDUALS.get(individualName) ?? DL_INDIVIDUALS.get('John')!;
  const individual: DLIndividual = removedProp
    ? { ...baseIndividual, memberOf: baseIndividual.memberOf.filter(m => m !== removedProp) }
    : baseIndividual;

  const runClassify = () => {
    const allInds = removedProp
      ? new Map([...DL_INDIVIDUALS.entries()].map(([k, v]) =>
          k === individualName ? [k, individual] : [k, v]
        ))
      : DL_INDIVIDUALS;
    const result = dlClassify(individual, conceptEntry.concept, allInds);
    setSteps(result);
    setStepIdx(0);
  };

  const currentStep = steps ? (steps[stepIdx] ?? null) : null;

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>
        Description Logic (CLASSIC-style): classify individuals against concept definitions.
      </p>

      {/* Concept definition */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>Concept Definition</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {DL_CONCEPT_OPTIONS.map((c, i) => (
            <button key={c.label} onClick={() => { setConceptIdx(i); setSteps(null); }}
              style={{
                background: conceptIdx === i ? '#8B5CF6' : 'var(--surface-3)',
                border: 'none', borderRadius: 6, color: '#fff', padding: '4px 12px', fontSize: 12, cursor: 'pointer',
              }}>{c.label}</button>
          ))}
        </div>
        <code style={{ fontSize: 12, color: '#F59E0B', display: 'block' }}>
          {conceptEntry.label} = {dlConceptToString(conceptEntry.concept)}
        </code>
      </div>

      {/* Individual selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={individualName} onChange={e => { setIndividualName(e.target.value); setSteps(null); setRemovedProp(null); }}
          style={selectStyle} aria-label="Select individual">
          {[...DL_INDIVIDUALS.keys()].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={runClassify} style={btnStyle} aria-label="Run DL classification">Classify</button>
      </div>

      {/* Individual properties */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>
          {individual.name}'s properties: {' '}
          <span style={{ color: '#E5E7EB' }}>{individual.memberOf.join(', ') || '(none)'}</span>
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>What-If: remove a property:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {baseIndividual.memberOf.map(p => (
            <button key={p} onClick={() => { setRemovedProp(removedProp === p ? null : p); setSteps(null); }}
              style={{
                background: removedProp === p ? '#EF444430' : 'var(--surface-3)',
                border: `1px solid ${removedProp === p ? '#EF4444' : 'var(--surface-border)'}`,
                borderRadius: 6, color: removedProp === p ? '#EF4444' : '#E5E7EB',
                padding: '2px 10px', fontSize: 12, cursor: 'pointer',
                textDecoration: removedProp === p ? 'line-through' : 'none',
              }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Step trace */}
      {steps && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Previous">◀</button>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Step {stepIdx + 1}/{steps.length}</span>
            <button onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={smallBtnStyle} aria-label="Next">▶</button>
          </div>
          {currentStep && (
            <div style={{
              background: currentStep.result === true ? '#10B98120' : currentStep.result === false ? '#EF444420' : 'var(--surface-3)',
              border: `1px solid ${currentStep.result === true ? '#10B981' : currentStep.result === false ? '#EF4444' : 'var(--surface-border)'}`,
              borderRadius: 8, padding: 10,
            }}>
              <div style={{ fontSize: 12, color: '#E5E7EB', marginBottom: 4 }}>{currentStep.action}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                Concept: <code style={{ color: '#F59E0B' }}>{currentStep.concept}</code>
                {' → '}
                <span style={{ color: currentStep.result === true ? '#10B981' : currentStep.result === false ? '#EF4444' : '#9CA3AF' }}>
                  {String(currentStep.result)}
                </span>
              </div>
            </div>
          )}
          {/* Final result */}
          {stepIdx === steps.length - 1 && currentStep && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 6,
              background: currentStep.result === true ? '#10B981' : '#EF4444',
              color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center',
            }}>
              {individual.name} {currentStep.result === true ? '✓ satisfies' : '✗ does not satisfy'} {conceptEntry.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SemanticNetworkViz() {
  const [tab, setTab] = useState<'sn' | 'dl'>('sn');

  return (
    <div
      id="semantic-networks"
      style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}
      aria-label="Semantic Networks and Description Logic"
    >
      <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>
        §10.5 Reasoning Systems for Categories
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Semantic networks with inheritance and Description Logic (CLASSIC-style) classification.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['sn', 'Semantic Network'], ['dl', 'Description Logic']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#8B5CF6' : 'var(--surface-2)',
            border: `1px solid ${tab === t ? '#8B5CF6' : 'var(--surface-border)'}`,
            borderRadius: 8, color: '#fff', padding: '8px 18px', fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'sn' ? <SemanticNetworkSub /> : <DLSub />}

      <div style={{ marginTop: 16 }} dangerouslySetInnerHTML={{
        __html: renderInlineMath('\\text{Bachelor} \\equiv \\text{Unmarried} \\sqcap \\text{Adult} \\sqcap \\text{Male}')
      }} />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
  borderRadius: 6, color: '#E5E7EB', padding: '4px 8px', fontSize: 13,
};

const btnStyle: React.CSSProperties = {
  background: '#8B5CF6', border: 'none', borderRadius: 6,
  color: '#fff', padding: '6px 16px', fontSize: 13, cursor: 'pointer',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
  borderRadius: 6, color: '#E5E7EB', padding: '4px 12px', fontSize: 13, cursor: 'pointer',
};
