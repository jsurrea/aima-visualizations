import { useState, useMemo } from 'react';
import { evaluateDecisionNetwork } from '../algorithms';
import type { DecisionNetworkNode, DecisionNetworkStep } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

const NODES: DecisionNetworkNode[] = [
  {
    id: 'AirTrafficForecast',
    type: 'chance',
    parents: [],
    cpt: { '': { high: 0.6, low: 0.4 } },
    values: ['high', 'low'],
  },
  {
    id: 'AirportSite',
    type: 'decision',
    parents: [],
    values: ['siteA', 'siteB'],
  },
  {
    id: 'Utility',
    type: 'utility',
    parents: ['AirTrafficForecast', 'AirportSite'],
    utilityTable: {
      'high,siteA': 80,
      'high,siteB': 55,
      'low,siteA': 40,
      'low,siteB': 60,
    },
    values: [],
  },
];

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };

export default function DecisionNetworkViz() {
  const result = useMemo(() => evaluateDecisionNetwork(NODES, {}, 'AirportSite', 'Utility'), []);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: ReadonlyArray<DecisionNetworkStep> = result.steps;
  const step = steps[currentStep];

  const totalSteps = steps.length;
  const allSeen = currentStep >= totalSteps - 1;

  const stepForward = () => setCurrentStep(s => Math.min(s + 1, totalSteps - 1));
  const reset = () => setCurrentStep(0);

  // SVG layout
  const SVG_W = 580;
  const SVG_H = 280;

  // Node positions
  const ATF = { cx: 150, cy: 90 };
  const AS = { cx: 290, cy: 200 };
  const UT = { cx: 430, cy: 90 };

  const isActiveNode = (nodeId: string) => {
    if (!step) return false;
    return (nodeId === 'AirportSite' && step.decisionValue !== undefined);
  };

  const activeBorder = (nodeId: string) => isActiveNode(nodeId) ? 3 : 1.5;
  const activeBorderColor = (nodeId: string) => isActiveNode(nodeId) ? 'white' : 'rgba(255,255,255,0.3)';

  const btnStyle: React.CSSProperties = { background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' };
  const secondaryBtn: React.CSSProperties = { background: '#242430', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' };

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.5 Decision Network Evaluator</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Decision networks (influence diagrams) extend Bayesian networks with decision and utility nodes.
        Evaluate by computing expected utility for each decision value.
      </p>
      <div style={{ marginBottom: '12px' }}>
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('EU(\\text{siteA}) = \\sum_{f} P(f) \\cdot U(f, \\text{siteA})') }} />
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <svg width={SVG_W} height={SVG_H} aria-label="Airport siting decision network">
          <defs>
            <marker id="dn-arrow" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.5)" />
            </marker>
          </defs>

          {/* Background legend */}
          <text x={20} y={240} fill="#9CA3AF" fontSize={10}>○ Chance node</text>
          <text x={130} y={240} fill="#9CA3AF" fontSize={10}>□ Decision node</text>
          <text x={250} y={240} fill="#9CA3AF" fontSize={10}>◇ Utility node</text>

          {/* Arrows: AirTrafficForecast → Utility */}
          <line
            x1={ATF.cx + 80} y1={ATF.cy}
            x2={UT.cx - 62} y2={UT.cy}
            stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}
            markerEnd="url(#dn-arrow)"
          />
          {/* AirportSite → Utility */}
          <line
            x1={AS.cx + 65} y1={AS.cy - 20}
            x2={UT.cx - 20} y2={UT.cy + 32}
            stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeDasharray="5,3"
            markerEnd="url(#dn-arrow)"
          />

          {/* AirTrafficForecast: ellipse (chance node) */}
          <ellipse
            cx={ATF.cx} cy={ATF.cy} rx={80} ry={30}
            fill="#1E3A5F" stroke={activeBorderColor('AirTrafficForecast')}
            strokeWidth={activeBorder('AirTrafficForecast')}
          />
          <text x={ATF.cx} y={ATF.cy - 6} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>Air Traffic</text>
          <text x={ATF.cx} y={ATF.cy + 8} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>Forecast</text>
          <text x={ATF.cx} y={ATF.cy + 22} textAnchor="middle" fill="#93C5FD" fontSize={9}>P(high)=0.6  P(low)=0.4</text>

          {/* AirportSite: rect (decision node) */}
          <rect
            x={AS.cx - 65} y={AS.cy - 25} width={130} height={50} rx={4}
            fill="#3B0764" stroke={activeBorderColor('AirportSite')}
            strokeWidth={activeBorder('AirportSite')}
          />
          <text x={AS.cx} y={AS.cy - 5} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>Airport Site</text>
          <text x={AS.cx} y={AS.cy + 10} textAnchor="middle" fill="#C4B5FD" fontSize={9}>
            {step ? `▶ ${step.decisionValue}` : 'siteA | siteB'}
          </text>

          {/* Utility: diamond */}
          <polygon
            points={`${UT.cx},${UT.cy - 38} ${UT.cx + 58},${UT.cy} ${UT.cx},${UT.cy + 38} ${UT.cx - 58},${UT.cy}`}
            fill="#451A03" stroke={activeBorderColor('Utility')}
            strokeWidth={activeBorder('Utility')}
          />
          <text x={UT.cx} y={UT.cy - 6} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>Utility</text>
          <text x={UT.cx} y={UT.cy + 10} textAnchor="middle" fill="#FDE68A" fontSize={9}>
            {step ? `EU=${step.expectedUtility.toFixed(1)}` : '?'}
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button aria-label="Step forward through decision evaluation" onClick={stepForward} disabled={currentStep >= totalSteps - 1} style={{ ...btnStyle, opacity: currentStep >= totalSteps - 1 ? 0.5 : 1 }}>
          Step Forward ▶
        </button>
        <button aria-label="Reset decision network" onClick={reset} style={secondaryBtn}>Reset</button>
        <span style={{ color: '#9CA3AF', fontSize: '13px', alignSelf: 'center' }}>Step {currentStep + 1} / {totalSteps}</span>
      </div>

      {/* State panel */}
      {step && (
        <div style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '2px' }}>Decision Value</div>
              <div style={{ color: '#8B5CF6', fontWeight: 700 }}>{step.decisionValue}</div>
            </div>
            <div>
              <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '2px' }}>Expected Utility</div>
              <div style={{ color: '#F59E0B', fontWeight: 700 }}>{step.expectedUtility.toFixed(4)}</div>
            </div>
          </div>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '4px' }}>Posterior Probabilities</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(step.posteriorProbs).map(([key, val]) => (
                <span key={key} style={{ background: '#242430', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', color: '#E5E7EB' }}>
                  {key}: {(val as number).toFixed(3)}
                </span>
              ))}
            </div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>{step.action}</div>
        </div>
      )}

      {allSeen && (
        <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontWeight: 700 }}>
          🏆 Best Decision: {result.bestDecision} — EU = {result.bestEU.toFixed(4)}
        </div>
      )}
    </div>
  );
}
