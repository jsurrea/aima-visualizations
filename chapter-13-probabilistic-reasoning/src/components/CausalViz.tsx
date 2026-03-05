import React, { useMemo } from 'react';
import { doCalc, SPRINKLER_NET, BayesNet } from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';

const SPRINKLER_POS: Record<string, { x: number; y: number }> = {
  Cloudy: { x: 150, y: 40 },
  Sprinkler: { x: 70, y: 120 },
  Rain: { x: 230, y: 120 },
  WetGrass: { x: 150, y: 200 },
};
const NODE_R = 24;

function CausalSVG({
  net,
  highlightNode,
  highlightColor,
  label,
  strikeEdge,
}: {
  net: BayesNet;
  highlightNode: string;
  highlightColor: string;
  label: string;
  strikeEdge: { from: string; to: string } | null;
}) {
  const edges: Array<{ from: string; to: string; struck: boolean }> = [];
  net.nodes.forEach((node) => {
    node.parents.forEach((p) => {
      const struck =
        strikeEdge !== null && strikeEdge.from === p && strikeEdge.to === node.name;
      edges.push({ from: p, to: node.name, struck });
    });
  });

  const markerId = `arrow-causal-${label.replace(/\s+/g, '-')}`;

  return (
    <div>
      <div
        style={{
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: '#E5E7EB',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <svg
        width="300"
        height="250"
        viewBox="0 0 300 250"
        aria-label={`${label} network`}
        style={{ maxWidth: '100%' }}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
          </marker>
        </defs>
        {edges.map(({ from, to, struck }) => {
          const p1 = SPRINKLER_POS[from];
          const p2 = SPRINKLER_POS[to];
          if (!p1 || !p2) return null;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return null;
          const nx = dx / dist;
          const ny = dy / dist;
          const x1 = p1.x + nx * NODE_R;
          const y1 = p1.y + ny * NODE_R;
          const x2 = p2.x - nx * (NODE_R + 2);
          const y2 = p2.y - ny * (NODE_R + 2);
          return (
            <line
              key={`${from}-${to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={struck ? '#EF4444' : '#6B7280'}
              strokeWidth={1.5}
              strokeDasharray={struck ? '4 3' : undefined}
              markerEnd={struck ? undefined : `url(#${markerId})`}
              opacity={struck ? 0.5 : 1}
            />
          );
        })}
        {SPRINKLER_NET.variables.map((name) => {
          const pos = SPRINKLER_POS[name];
          if (!pos) return null;
          const isHighlight = name === highlightNode;
          const fill = isHighlight ? highlightColor + '33' : '#242430';
          const stroke = isHighlight ? highlightColor : '#4B5563';

          const shortNames: Record<string, string> = {
            Cloudy: 'C',
            Sprinkler: 'S',
            Rain: 'R',
            WetGrass: 'WG',
          };

          return (
            <g key={name}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={11}
                fontWeight={600}
              >
                {shortNames[name] ?? name.slice(0, 2)}
              </text>
              {name === highlightNode && (
                <text
                  x={pos.x + NODE_R - 4}
                  y={pos.y - NODE_R + 4}
                  fill={highlightColor}
                  fontSize={10}
                  fontWeight={700}
                >
                  {label === 'Observe' ? '👁' : '⚡'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CausalViz() {
  const result = useMemo(
    () => doCalc('Sprinkler', true, 'WetGrass', SPRINKLER_NET),
    [],
  );

  const pObs = result.original[1];
  const pDo = result.intervened[1];

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '16px',
  };

  const centeredPanelStyle: React.CSSProperties = { ...panelStyle, textAlign: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Intro */}
      <div style={{ ...panelStyle, background: 'var(--surface-3)', fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6 }}>
        <strong style={{ color: CHAPTER_COLOR }}>Causal Inference:</strong> The do-operator{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('do(X=x)') }} /> removes all
        edges <em>into</em> X, isolating X from its causes. This separates{' '}
        <em>correlation</em> (observing X=x) from <em>causation</em>{' '}
        (forcing X=x via intervention).
      </div>

      {/* Side-by-side networks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={centeredPanelStyle}>
          <CausalSVG
            net={SPRINKLER_NET}
            highlightNode="Sprinkler"
            highlightColor="#10B981"
            label="Observe"
            strikeEdge={null}
          />
          <div style={{ marginTop: '12px' }}>
            <div
              dangerouslySetInnerHTML={{
                __html: renderDisplayMath('P(WG=T \\mid S=T)'),
              }}
            />
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#10B981',
                marginTop: '8px',
              }}
            >
              {pObs.toFixed(4)}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Includes back-door path via Cloudy
            </div>
          </div>
        </div>

        <div style={centeredPanelStyle}>
          <CausalSVG
            net={result.mutilatedNet}
            highlightNode="Sprinkler"
            highlightColor="#6366F1"
            label="Intervene"
            strikeEdge={{ from: 'Cloudy', to: 'Sprinkler' }}
          />
          <div style={{ marginTop: '12px' }}>
            <div
              dangerouslySetInnerHTML={{
                __html: renderDisplayMath('P(WG=T \\mid do(S=T))'),
              }}
            />
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#6366F1',
                marginTop: '8px',
              }}
            >
              {pDo.toFixed(4)}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Back-door path blocked; true causal effect
            </div>
          </div>
        </div>
      </div>

      {/* Comparison bar */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#E5E7EB' }}>
          Comparison
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Observational P(WG=T | S=T)', value: pObs, color: '#10B981' },
            { label: 'Interventional P(WG=T | do(S=T))', value: pDo, color: '#6366F1' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#D1D5DB' }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{value.toFixed(4)}</span>
              </div>
              <div
                style={{
                  height: '10px',
                  background: 'var(--surface-3)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${value * 100}%`,
                    background: color,
                    borderRadius: '5px',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            background: 'var(--surface-3)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#9CA3AF',
          }}
        >
          Δ = {Math.abs(pObs - pDo).toFixed(4)} — difference between observational and causal
          probability
        </div>
      </div>

      {/* Formulas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#10B981' }}>
            Observation Formula
          </h3>
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                'P(WG=T \\mid S=T) = \\frac{P(WG=T, S=T)}{P(S=T)}',
              ),
            }}
          />
        </div>
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#6366F1' }}>
            Intervention Formula (Back-door)
          </h3>
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                'P(WG=T \\mid do(S=T)) = \\sum_c P(WG=T \\mid S=T, C=c)\\, P(C=c)',
              ),
            }}
          />
        </div>
      </div>

      {/* Back-door criterion */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#E5E7EB' }}>
          Back-Door Criterion
        </h3>
        <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6, margin: '0 0 12px' }}>
          The back-door path{' '}
          <span
            dangerouslySetInnerHTML={{
              __html: renderInlineMath('S \\leftarrow C \\rightarrow R \\rightarrow WG'),
            }}
          />{' '}
          creates a spurious correlation between Sprinkler and WetGrass beyond the direct causal
          effect. The do-operator blocks this path by removing{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('C \\rightarrow S') }} />.
          Adjusting for C (the confounder) gives the true causal effect:
        </p>
        <div
          dangerouslySetInnerHTML={{
            __html: renderDisplayMath(
              'P(WG \\mid do(S=T)) = \\sum_{c} P(WG \\mid S=T, C=c)\\, P(C=c)',
            ),
          }}
        />
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[false, true].map((cVal) => {
            const pC = cVal ? 0.5 : 0.5;
            const pWGgivenSC = cVal
              ? SPRINKLER_NET.nodes.get('WetGrass')!.cpt[3]!
              : SPRINKLER_NET.nodes.get('WetGrass')!.cpt[1]!;
            return (
              <div
                key={String(cVal)}
                style={{ fontSize: '12px', color: '#D1D5DB', display: 'flex', gap: '8px' }}
              >
                <span style={{ color: '#9CA3AF' }}>C={cVal ? 'T' : 'F'}:</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMath(
                      `P(WG=T|S=T,C=${cVal ? 'T' : 'F'}) \\times P(C=${cVal ? 'T' : 'F'}) = ${pWGgivenSC.toFixed(3)} \\times ${pC.toFixed(2)} = ${(pWGgivenSC * pC).toFixed(4)}`,
                    ),
                  }}
                />
              </div>
            );
          })}
          <div
            style={{
              fontSize: '12px',
              color: '#6366F1',
              fontWeight: 600,
              borderTop: '1px solid var(--surface-border)',
              paddingTop: '6px',
            }}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: renderInlineMath(
                  `\\text{Sum} = ${pDo.toFixed(4)}`,
                ),
              }}
            />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div
        style={{
          ...panelStyle,
          borderColor: CHAPTER_COLOR,
          background: CHAPTER_COLOR + '11',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: CHAPTER_COLOR }}>
          Explanation
        </h3>
        <p style={{ fontSize: '13px', color: '#D1D5DB', margin: 0, lineHeight: 1.6 }}>
          {result.explanation}
        </p>
      </div>
    </div>
  );
}
