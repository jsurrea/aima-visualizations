import React, { useState } from 'react';
import {
  BURGLARY_NET,
  SPRINKLER_NET,
  BayesNet,
  markovBlanket,
  jointProbability,
  enumerationAsk,
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

type NetName = 'burglary' | 'sprinkler';

const BURGLARY_POS: Record<string, { x: number; y: number }> = {
  Burglary: { x: 100, y: 60 },
  Earthquake: { x: 300, y: 60 },
  Alarm: { x: 200, y: 160 },
  JohnCalls: { x: 100, y: 260 },
  MaryCalls: { x: 300, y: 260 },
};

const SPRINKLER_POS: Record<string, { x: number; y: number }> = {
  Cloudy: { x: 200, y: 60 },
  Sprinkler: { x: 100, y: 160 },
  Rain: { x: 300, y: 160 },
  WetGrass: { x: 200, y: 260 },
};

const NODE_RADIUS = 30;
const CHAPTER_COLOR = '#EC4899';

function shortLabel(name: string): string {
  const map: Record<string, string> = {
    Burglary: 'B',
    Earthquake: 'E',
    Alarm: 'A',
    JohnCalls: 'J',
    MaryCalls: 'M',
    Cloudy: 'C',
    Sprinkler: 'S',
    Rain: 'R',
    WetGrass: 'WG',
  };
  return map[name] ?? name.slice(0, 2);
}

interface NetSVGProps {
  net: BayesNet;
  positions: Record<string, { x: number; y: number }>;
  selectedNode: string | null;
  mb: Set<string>;
  assignment: Map<string, boolean | undefined>;
  onNodeClick: (name: string) => void;
}

function NetSVG({ net, positions, selectedNode, mb, assignment, onNodeClick }: NetSVGProps) {
  const edges: Array<{ from: string; to: string }> = [];
  net.nodes.forEach((node) => {
    node.parents.forEach((parent) => {
      edges.push({ from: parent, to: node.name });
    });
  });

  return (
    <svg
      width="400"
      height="340"
      viewBox="0 0 400 340"
      aria-label="Bayesian network diagram"
      style={{ maxWidth: '100%' }}
    >
      <defs>
        <marker
          id="arrow-bn"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
        </marker>
      </defs>

      {edges.map(({ from, to }) => {
        const p1 = positions[from];
        const p2 = positions[to];
        if (!p1 || !p2) return null;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        const x1 = p1.x + nx * NODE_RADIUS;
        const y1 = p1.y + ny * NODE_RADIUS;
        const x2 = p2.x - nx * (NODE_RADIUS + 2);
        const y2 = p2.y - ny * (NODE_RADIUS + 2);
        return (
          <line
            key={`${from}-${to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#6B7280"
            strokeWidth={1.5}
            markerEnd="url(#arrow-bn)"
          />
        );
      })}

      {net.variables.map((name) => {
        const pos = positions[name];
        if (!pos) return null;
        let fill = '#242430';
        let stroke = '#4B5563';
        if (name === selectedNode) {
          fill = CHAPTER_COLOR + '33';
          stroke = CHAPTER_COLOR;
        } else if (mb.has(name)) {
          fill = '#6366F133';
          stroke = '#6366F1';
        }
        const val = assignment.get(name);
        const valLabel = val === true ? 'T' : val === false ? 'F' : '';

        return (
          <g
            key={name}
            onClick={() => onNodeClick(name)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={`Node ${name}${val !== undefined ? `, value ${valLabel}` : ''}`}
            aria-pressed={name === selectedNode}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_RADIUS}
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y - 4}
              textAnchor="middle"
              fill="white"
              fontSize={11}
              fontWeight={600}
            >
              {shortLabel(name)}
            </text>
            {valLabel && (
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                fill={val === true ? '#10B981' : '#EF4444'}
                fontSize={11}
                fontWeight={700}
              >
                {valLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function BayesNetViz() {
  const [netName, setNetName] = useState<NetName>('burglary');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Map<string, boolean | undefined>>(new Map());
  const [dsepA, setDsepA] = useState<string | null>(null);
  const [dsepB, setDsepB] = useState<string | null>(null);

  const net = netName === 'burglary' ? BURGLARY_NET : SPRINKLER_NET;
  const positions = netName === 'burglary' ? BURGLARY_POS : SPRINKLER_POS;

  const mb = selectedNode ? new Set(markovBlanket(selectedNode, net)) : new Set<string>();

  const completeAssignment = new Map<string, boolean>();
  let allAssigned = true;
  for (const v of net.variables) {
    const val = assignment.get(v);
    if (val === undefined || val === null) {
      allAssigned = false;
      break;
    }
    completeAssignment.set(v, val);
  }
  const jointProb = allAssigned ? jointProbability(net, completeAssignment) : null;

  // Conditional P(selectedNode | assignment of others)
  const conditionalResult =
    selectedNode && allAssigned
      ? enumerationAsk(
          selectedNode,
          new Map([...completeAssignment].filter(([k]) => k !== selectedNode)),
          net,
        )
      : null;

  const handleNodeClick = (name: string) => {
    setSelectedNode((prev) => (prev === name ? null : name));
    // D-sep selection
    if (dsepA === null) {
      setDsepA(name);
    } else if (dsepA !== name && dsepB === null) {
      setDsepB(name);
    } else {
      setDsepA(name);
      setDsepB(null);
    }
  };

  const toggleAssignment = (varName: string) => {
    setAssignment((prev) => {
      const next = new Map(prev);
      const cur = prev.get(varName);
      if (cur === undefined) next.set(varName, true);
      else if (cur === true) next.set(varName, false);
      else next.delete(varName);
      return next;
    });
  };

  const selectedNodeData = selectedNode ? net.nodes.get(selectedNode) : null;

  // Simple path connectivity check between two nodes (ignoring d-separation direction)
  function isConnected(a: string, b: string, visited: Set<string> = new Set()): boolean {
    if (a === b) return true;
    visited.add(a);
    const nodeA = net.nodes.get(a);
    if (!nodeA) return false;
    const neighbors = [
      ...nodeA.parents,
      ...[...net.nodes.values()].filter((n) => n.parents.includes(a)).map((n) => n.name),
    ];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && isConnected(neighbor, b, visited)) return true;
    }
    return false;
  }

  const connected =
    dsepA && dsepB && dsepA !== dsepB ? isConnected(dsepA, dsepB) : null;

  const switchNet = (name: NetName) => {
    setNetName(name);
    setSelectedNode(null);
    setAssignment(new Map());
    setDsepA(null);
    setDsepB(null);
  };

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '16px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Network selector */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['burglary', 'sprinkler'] as NetName[]).map((n) => (
          <button
            key={n}
            onClick={() => switchNet(n)}
            aria-pressed={netName === n}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: netName === n ? CHAPTER_COLOR : 'var(--surface-border)',
              background: netName === n ? CHAPTER_COLOR + '22' : 'var(--surface-2)',
              color: netName === n ? CHAPTER_COLOR : '#9CA3AF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {n === 'burglary' ? 'Alarm Network' : 'Sprinkler Network'}
          </button>
        ))}
      </div>

      {/* Joint probability formula */}
      <div style={panelStyle}>
        <div
          dangerouslySetInnerHTML={{
            __html: renderDisplayMath(
              'P(x_1,\\ldots,x_n) = \\prod_{i=1}^{n} P(x_i \\mid \\text{parents}(X_i))',
            ),
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: '20px',
        }}
      >
        {/* SVG */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#E5E7EB' }}>
            Network Diagram
          </h3>
          <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6B7280' }}>
            Click a node to select it and highlight its Markov blanket.
          </p>
          <NetSVG
            net={net}
            positions={positions}
            selectedNode={selectedNode}
            mb={mb}
            assignment={assignment}
            onNodeClick={handleNodeClick}
          />
          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ color: CHAPTER_COLOR }}>■ Selected</span>
            <span style={{ color: '#6366F1' }}>■ Markov Blanket</span>
          </div>
        </div>

        {/* Right panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* CPT */}
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              {selectedNode ? `CPT: ${selectedNode}` : 'Select a node to see its CPT'}
            </h3>
            {selectedNodeData && (
              <div style={{ fontSize: '12px' }}>
                {selectedNodeData.parents.length === 0 ? (
                  <div style={{ color: '#D1D5DB' }}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderInlineMath(
                          `P(${selectedNode}=T) = ${selectedNodeData.cpt[0]?.toFixed(4) ?? '?'}`,
                        ),
                      }}
                    />
                  </div>
                ) : (
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        {selectedNodeData.parents.map((p) => (
                          <th
                            key={p}
                            style={{
                              padding: '4px 6px',
                              textAlign: 'left',
                              color: '#6366F1',
                              borderBottom: '1px solid var(--surface-border)',
                            }}
                          >
                            {p}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: '4px 6px',
                            textAlign: 'right',
                            color: CHAPTER_COLOR,
                            borderBottom: '1px solid var(--surface-border)',
                          }}
                        >
                          P(T|parents)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNodeData.cpt.map((val, i) => {
                        const parents = selectedNodeData.parents;
                        const parentVals = parents.map(
                          (_, j) => ((i >> j) & 1) === 1,
                        );
                        return (
                          <tr key={i}>
                            {parentVals.map((pv, j) => (
                              <td
                                key={j}
                                style={{
                                  padding: '3px 6px',
                                  color: pv ? '#10B981' : '#EF4444',
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                }}
                              >
                                {pv ? 'T' : 'F'}
                              </td>
                            ))}
                            <td
                              style={{
                                padding: '3px 6px',
                                textAlign: 'right',
                                color: '#E5E7EB',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              {val.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {mb.size > 0 && (
                  <div style={{ marginTop: '8px', color: '#9CA3AF' }}>
                    <strong style={{ color: '#6366F1' }}>MB:</strong>{' '}
                    {markovBlanket(selectedNode!, net).join(', ')}
                  </div>
                )}
                {conditionalResult && (
                  <div style={{ marginTop: '8px', color: '#D1D5DB' }}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderInlineMath(
                          `P(${selectedNode}=T|\\text{others}) = ${conditionalResult.distribution[1].toFixed(4)}`,
                        ),
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Joint probability calculator */}
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              Joint Probability
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6B7280' }}>
              Click each variable to toggle T/F/unset.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {net.variables.map((v) => {
                const val = assignment.get(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggleAssignment(v)}
                    aria-label={`Toggle ${v} assignment, current: ${val === undefined ? 'unset' : val ? 'true' : 'false'}`}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor:
                        val === true
                          ? '#10B981'
                          : val === false
                            ? '#EF4444'
                            : 'var(--surface-border)',
                      background:
                        val === true
                          ? '#10B98133'
                          : val === false
                            ? '#EF444433'
                            : 'var(--surface-3)',
                      color: val === undefined ? '#9CA3AF' : 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {shortLabel(v)}={val === true ? 'T' : val === false ? 'F' : '?'}
                  </button>
                );
              })}
            </div>
            {jointProb !== null ? (
              <div style={{ color: '#D1D5DB', fontSize: '13px' }}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMath(
                      `P(\\text{assignment}) = ${jointProb.toExponential(4)}`,
                    ),
                  }}
                />
              </div>
            ) : (
              <div style={{ color: '#6B7280', fontSize: '12px' }}>
                Set all variables to compute joint probability.
              </div>
            )}
          </div>

          {/* D-separation explorer */}
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              Path Explorer
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6B7280' }}>
              Click two nodes to check if they are path-connected.
            </p>
            <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
              Node A:{' '}
              <strong style={{ color: CHAPTER_COLOR }}>{dsepA ?? '—'}</strong> &nbsp; Node B:{' '}
              <strong style={{ color: '#6366F1' }}>{dsepB ?? '—'}</strong>
            </div>
            {connected !== null && dsepA && dsepB && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: connected ? '#10B98122' : '#EF444422',
                  color: connected ? '#10B981' : '#EF4444',
                  fontSize: '12px',
                }}
              >
                {connected
                  ? `${dsepA} and ${dsepB} are path-connected (not d-separated without evidence).`
                  : `${dsepA} and ${dsepB} are not directly connected.`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
