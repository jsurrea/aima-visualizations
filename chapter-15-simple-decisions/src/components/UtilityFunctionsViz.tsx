import { useState, useMemo } from 'react';
import { computeUtility, certaintyEquivalent, insurancePremium, optimizerCurseDistribution } from '../algorithms';
import type { UtilityCurveType } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };

const CURVE_TYPES: UtilityCurveType[] = ['logarithmic', 'linear', 'power', 'exponential'];
const OPTIMIZER_K = [1, 3, 10, 30];

export default function UtilityFunctionsViz() {
  const [curveType, setCurveType] = useState<UtilityCurveType>('logarithmic');
  const [rhoParam, setRhoParam] = useState(0.5);
  const [rParam, setRParam] = useState(1000);
  const [optimK, setOptimK] = useState(1);

  const riskParam = curveType === 'power' ? rhoParam : curveType === 'exponential' ? rParam : undefined;

  // Utility curve: x = 0..2000, 50 points
  const PADDING = 40;
  const CHART_W = 500;
  const CHART_H = 200;
  const SVG_W = 580;
  const SVG_H = 260;

  const xMax = 2000;
  const numPts = 50;

  const curvePoints = useMemo(() => {
    const pts: Array<{ x: number; u: number }> = [];
    for (let i = 0; i <= numPts; i++) {
      const x = (xMax * i) / numPts;
      pts.push({ x, u: computeUtility(x, curveType, riskParam) });
    }
    return pts;
  }, [curveType, riskParam]);

  const uValues = curvePoints.map(p => p.u);
  const uMin = Math.min(...uValues);
  const uMax = Math.max(...uValues);
  const uRange = uMax - uMin || 1;

  const toPixX = (x: number) => PADDING + (x / xMax) * CHART_W;
  const toPixY = (u: number) => PADDING + CHART_H - ((u - uMin) / uRange) * CHART_H;

  const polylinePoints = curvePoints.map(p => `${toPixX(p.x)},${toPixY(p.u)}`).join(' ');

  const EMV = 500;
  const lottery = [{ probability: 0.5, amount: 0 }, { probability: 0.5, amount: 1000 }];
  const CE = useMemo(() => certaintyEquivalent(lottery, curveType, riskParam), [curveType, riskParam]);
  const premium = useMemo(() => insurancePremium(lottery, curveType, riskParam), [curveType, riskParam]);

  const emvPx = toPixX(EMV);
  const cePx = toPixX(Math.max(0, Math.min(xMax, CE)));

  // Optimizer's curse
  const OCH = 180;
  const OCW = 460;
  const OC_PAD = 35;
  const OC_CHART_W = OCW - OC_PAD * 2;
  const OC_CHART_H = OCH - OC_PAD * 2;

  const ocPoints = useMemo(() => optimizerCurseDistribution(optimK, 60), [optimK]);
  const ocDensMax = Math.max(...ocPoints.map(p => p.density), 0.01);

  const ocToX = (x: number) => OC_PAD + ((x + 4) / 8) * OC_CHART_W;
  const ocToY = (d: number) => OC_PAD + OC_CHART_H - (d / ocDensMax) * OC_CHART_H;
  const ocPolyline = ocPoints.map(p => `${ocToX(p.x)},${ocToY(p.density)}`).join(' ');

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#6366F1' : '#242430',
    color: active ? 'white' : '#9CA3AF',
    border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  });

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.3 Utility Functions</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Utility functions encode risk attitude. Risk-averse agents have concave utility (logarithmic/power with ρ&lt;1); risk-seeking agents have convex utility.
      </p>

      {/* Curve selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {CURVE_TYPES.map(ct => (
          <button key={ct} aria-pressed={curveType === ct} onClick={() => setCurveType(ct)} style={btnStyle(curveType === ct)}>
            {ct.charAt(0).toUpperCase() + ct.slice(1)}
          </button>
        ))}
      </div>

      {/* Risk param slider */}
      {curveType === 'power' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '13px' }}>ρ (risk):</span>
          <input type="range" min={0.1} max={2.0} step={0.1} value={rhoParam} aria-label="Power risk parameter rho"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRhoParam(parseFloat(e.target.value))} style={{ width: '160px' }} />
          <span style={{ color: '#E5E7EB', fontSize: '13px', minWidth: '30px' }}>{rhoParam.toFixed(1)}</span>
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{rhoParam < 1 ? '(risk-averse)' : rhoParam > 1 ? '(risk-seeking)' : '(risk-neutral)'}</span>
        </div>
      )}
      {curveType === 'exponential' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '13px' }}>R (risk tolerance):</span>
          <input type="range" min={100} max={5000} step={100} value={rParam} aria-label="Exponential risk tolerance parameter R"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRParam(parseFloat(e.target.value))} style={{ width: '160px' }} />
          <span style={{ color: '#E5E7EB', fontSize: '13px', minWidth: '50px' }}>{rParam}</span>
        </div>
      )}

      {/* Utility curve SVG */}
      <div style={{ overflowX: 'auto' }}>
        <svg width={SVG_W} height={SVG_H} aria-label={`${curveType} utility curve`} style={{ display: 'block' }}>
          {/* Axes */}
          <line x1={PADDING} y1={PADDING} x2={PADDING} y2={PADDING + CHART_H} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={PADDING} y1={PADDING + CHART_H} x2={PADDING + CHART_W} y2={PADDING + CHART_H} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          {/* Axis labels */}
          <text x={PADDING + CHART_W / 2} y={SVG_H - 4} textAnchor="middle" fill="#9CA3AF" fontSize={11}>Amount ($)</text>
          <text x={12} y={PADDING + CHART_H / 2} textAnchor="middle" fill="#9CA3AF" fontSize={11} transform={`rotate(-90, 12, ${PADDING + CHART_H / 2})`}>Utility</text>
          {/* Grid x labels */}
          {[0, 500, 1000, 1500, 2000].map(x => (
            <text key={x} x={toPixX(x)} y={PADDING + CHART_H + 14} textAnchor="middle" fill="#9CA3AF" fontSize={10}>{x}</text>
          ))}
          {/* EMV dashed line */}
          <line x1={emvPx} y1={PADDING} x2={emvPx} y2={PADDING + CHART_H} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5,4" />
          <text x={emvPx + 4} y={PADDING + 14} fill="#F59E0B" fontSize={10}>EMV={EMV}</text>
          {/* CE dashed line */}
          <line x1={cePx} y1={PADDING} x2={cePx} y2={PADDING + CHART_H} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5,4" />
          <text x={cePx + 4} y={PADDING + 28} fill="#10B981" fontSize={10}>CE={CE.toFixed(0)}</text>
          {/* Curve */}
          <polyline points={polylinePoints} fill="none" stroke="#6366F1" strokeWidth={2.5} />
        </svg>
      </div>
      <div style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '20px', marginTop: '4px' }}>
        Insurance Premium = EMV − CE ={' '}
        <span style={{ color: premium >= 0 ? '#F59E0B' : '#EF4444', fontWeight: 700 }}>{premium.toFixed(2)}</span>
        {' '}({premium > 0 ? 'risk-averse' : premium < 0 ? 'risk-seeking' : 'risk-neutral'})
      </div>

      {/* Optimizer's Curse */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
        <h4 style={{ color: '#E5E7EB', fontWeight: 600, marginBottom: '8px' }}>Optimizer's Curse</h4>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          When selecting the best of k options, the winner regresses toward the mean. The distribution of max(X₁,…,Xₖ) shifts right but becomes harder to beat.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {OPTIMIZER_K.map(k => (
            <button key={k} aria-pressed={optimK === k} onClick={() => setOptimK(k)} style={btnStyle(optimK === k)}>k = {k}</button>
          ))}
        </div>
        <svg width={OCW} height={OCH} aria-label={`Optimizer's curse density for k=${optimK}`} style={{ display: 'block', overflowX: 'auto' }}>
          <line x1={OC_PAD} y1={OC_PAD} x2={OC_PAD} y2={OC_PAD + OC_CHART_H} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={OC_PAD} y1={OC_PAD + OC_CHART_H} x2={OC_PAD + OC_CHART_W} y2={OC_PAD + OC_CHART_H} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          {[-3, -2, -1, 0, 1, 2, 3].map(v => (
            <text key={v} x={ocToX(v)} y={OC_PAD + OC_CHART_H + 14} textAnchor="middle" fill="#9CA3AF" fontSize={10}>{v}</text>
          ))}
          <text x={OC_PAD + OC_CHART_W / 2} y={OCH - 2} textAnchor="middle" fill="#9CA3AF" fontSize={10}>Standard deviations</text>
          <polyline points={ocPolyline} fill="none" stroke="#EC4899" strokeWidth={2} />
        </svg>
        <div style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '8px' }}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('f_{\\max}(x) = k \\cdot \\phi(x) \\cdot \\Phi(x)^{k-1}') }} />
          {' '}— PDF of max of {optimK} i.i.d. N(0,1) random variables
        </div>
      </div>
    </div>
  );
}
