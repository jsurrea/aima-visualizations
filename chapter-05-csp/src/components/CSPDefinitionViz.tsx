import { useState } from 'react';
import { renderInlineMath } from '../utils/mathUtils';
import { AUSTRALIA_CSP, NODE_POSITIONS, AUSTRALIA_EDGES, colorToHex } from '../shared';

const COLORS = ['red', 'green', 'blue'];
const NODE_RADIUS = 28;

function cycleColor(current: string | undefined): string | undefined {
  if (!current) return 'red';
  const idx = COLORS.indexOf(current);
  if (idx === COLORS.length - 1) return undefined;
  return COLORS[idx + 1];
}

export default function CSPDefinitionViz() {
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [whatIf, setWhatIf] = useState(false);

  function handleNodeClick(node: string) {
    setAssignment(prev => {
      const next = { ...prev };
      const nextColor = cycleColor(prev[node]);
      if (nextColor === undefined) {
        delete next[node];
      } else {
        next[node] = nextColor;
      }
      return next;
    });
  }

  const violations = new Set<string>();
  for (const [a, b] of AUSTRALIA_EDGES) {
    const ca = assignment[a];
    const cb = assignment[b];
    if (ca && cb) {
      const isSameColor = ca === cb;
      const isWhatIfRemoved = whatIf && ((a === 'SA' && b === 'Q') || (a === 'Q' && b === 'SA'));
      if (isSameColor && !isWhatIfRemoved) {
        violations.add(`${a}-${b}`);
        violations.add(`${b}-${a}`);
      }
    }
  }

  const conflictedNodes = new Set<string>();
  for (const edgeKey of violations) {
    const parts = edgeKey.split('-');
    if (parts[0]) conflictedNodes.add(parts[0]);
    if (parts[1]) conflictedNodes.add(parts[1]);
  }

  const assignedCount = Object.keys(assignment).length;
  const violationCount = violations.size / 2;
  const totalVars = AUSTRALIA_CSP.variables.length;
  const isComplete = assignedCount === totalVars;
  const isConsistent = violationCount === 0;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>5.1 CSP Definition: Australia Map Coloring</h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', lineHeight: 1.6 }}>
        A CSP is defined by variables X, domains D, and constraints C. Click nodes to assign colors and explore constraint satisfaction.
      </p>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <svg viewBox="0 0 460 460" style={{ width: '100%', maxWidth: '460px', background: '#111118', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {AUSTRALIA_EDGES.map(([a, b]) => {
              const pa = NODE_POSITIONS[a]!;
              const pb = NODE_POSITIONS[b]!;
              const isWhatIfEdge = whatIf && ((a === 'SA' && b === 'Q') || (a === 'Q' && b === 'SA'));
              const edgeKey = `${a}-${b}`;
              const isViolation = violations.has(edgeKey);
              const strokeColor = isWhatIfEdge ? 'rgba(255,255,255,0.1)' : isViolation ? '#EF4444' : '#4B5563';
              return (
                <line key={edgeKey}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke={strokeColor}
                  strokeWidth={isViolation ? 3 : 1.5}
                  {...(isWhatIfEdge ? { strokeDasharray: '4 4' } : {})}
                />
              );
            })}
            {AUSTRALIA_CSP.variables.map(node => {
              const pos = NODE_POSITIONS[node]!;
              const color = assignment[node];
              const fill = colorToHex(color ?? '');
              const hasConflict = conflictedNodes.has(node);
              return (
                <g key={node} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }} role="button" aria-label={`${node}: ${color ?? 'unassigned'}. Click to cycle color.`}>
                  <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} fill={fill}
                    stroke={hasConflict ? '#EF4444' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={hasConflict ? 3 : 1.5}
                  />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{node}</text>
                </g>
              );
            })}
          </svg>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', textAlign: 'center' }}>Click a node to cycle: unassigned → red → green → blue → unassigned</p>
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: '#9CA3AF' }}>Assigned:</span>
              <span style={{ color: 'white' }}>{assignedCount} / {totalVars}</span>
              <span style={{ color: '#9CA3AF' }}>Violations:</span>
              <span style={{ color: violationCount > 0 ? '#EF4444' : '#10B981' }}>{violationCount}</span>
              <span style={{ color: '#9CA3AF' }}>Complete:</span>
              <span style={{ color: isComplete ? '#10B981' : '#F59E0B' }}>{isComplete ? 'Yes' : 'No'}</span>
              <span style={{ color: '#9CA3AF' }}>Consistent:</span>
              <span style={{ color: isConsistent ? '#10B981' : '#EF4444' }}>{isConsistent ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Formal Definition</h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>Variables:</div>
                <div dangerouslySetInnerHTML={{ __html: renderInlineMath('X = \\{WA, NT, Q, NSW, V, SA, T\\}') }} />
              </div>
              <div>
                <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>Domains:</div>
                <div dangerouslySetInnerHTML={{ __html: renderInlineMath('D_i = \\{red, green, blue\\}') }} />
              </div>
              <div>
                <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>Constraints:</div>
                <div dangerouslySetInnerHTML={{ __html: renderInlineMath('C: \\text{adjacent variables must differ}') }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setAssignment({})}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: '#1A1A24', color: 'white', cursor: 'pointer', fontSize: '14px' }}
              aria-label="Reset all assignments"
            >
              Reset All
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9CA3AF', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={whatIf} onChange={e => setWhatIf(e.target.checked)} aria-label="What-if: remove SA-Q constraint" />
              What If: Remove SA–Q constraint
            </label>
          </div>

          {whatIf && (
            <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '13px', color: '#F59E0B' }}>
              ⚠️ SA–Q edge shown dashed. Removing it makes coloring easier — SA can now share a color with Q.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
