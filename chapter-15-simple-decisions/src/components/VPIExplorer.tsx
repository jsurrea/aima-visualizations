import { useState, useMemo } from 'react';
import { computeVPI, myopicInformationGathering, treasureHuntOptimalOrder } from '../algorithms';
import type { VPIAction, ObservableVariable, TreasureLocation } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

type Tab = 'vpi' | 'info' | 'treasure';

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };
const btnBase: React.CSSProperties = { border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };

const DEFAULT_VARIABLES: ObservableVariable[] = [
  { id: 'Weather', vpi: 120, cost: 20 },
  { id: 'Traffic', vpi: 80, cost: 30 },
  { id: 'Demand', vpi: 200, cost: 50 },
  { id: 'Supply', vpi: 15, cost: 25 },
  { id: 'Policy', vpi: 5, cost: 40 },
];

const DEFAULT_LOCATIONS: TreasureLocation[] = [
  { id: 'Cave', probability: 0.4, cost: 10 },
  { id: 'Forest', probability: 0.3, cost: 5 },
  { id: 'Beach', probability: 0.2, cost: 3 },
  { id: 'Mountain', probability: 0.1, cost: 8 },
];

const pcRatio = (probability: number, cost: number): string =>
  cost > 0 ? (probability / cost).toFixed(3) : '∞';

export default function VPIExplorer() {
  const [tab, setTab] = useState<Tab>('vpi');

  // VPI Calculator
  const [n, setN] = useState(4);
  const [profitC, setProfitC] = useState(200);

  const vpiResult = useMemo(() => {
    const evidenceValues = Array.from({ length: n }, (_, i) => `block_${i}`);
    const evidenceProbs: Record<string, number> = {};
    evidenceValues.forEach(ev => { evidenceProbs[ev] = 1 / n; });

    const drillAction: VPIAction = {
      name: 'drill',
      outcomes: evidenceValues.map(ev => ({ evidenceValue: ev, probability: 1, utility: profitC })),
    };
    const noDrillAction: VPIAction = {
      name: "don't drill",
      outcomes: evidenceValues.map(ev => ({ evidenceValue: ev, probability: 1, utility: 0 })),
    };
    return computeVPI([drillAction, noDrillAction], evidenceProbs, 50);
  }, [n, profitC]);

  // Info gathering
  const [variables, setVariables] = useState<ObservableVariable[]>(DEFAULT_VARIABLES);
  const [gatherSteps, setGatherSteps] = useState<ReturnType<typeof myopicInformationGathering> | null>(null);

  const runGathering = () => setGatherSteps(myopicInformationGathering(variables));

  const updateVar = (idx: number, field: keyof ObservableVariable, value: string | number) => {
    setVariables(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    setGatherSteps(null);
  };

  // Treasure hunt
  const [locations, setLocations] = useState<TreasureLocation[]>(DEFAULT_LOCATIONS);
  const [orderedLocs, setOrderedLocs] = useState<ReadonlyArray<TreasureLocation> | null>(null);

  const runTreasure = () => setOrderedLocs(treasureHuntOptimalOrder(locations));

  const updateLoc = (idx: number, field: 'probability' | 'cost', value: number) => {
    setLocations(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
    setOrderedLocs(null);
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    ...btnBase, background: active ? '#6366F1' : '#242430', color: active ? 'white' : '#9CA3AF',
  });

  const inputStyle: React.CSSProperties = { background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '13px', width: '64px' };

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.6 Value of Information</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        VPI measures how much perfect information about a variable is worth. Gathering information is rational only when VPI exceeds its cost.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button aria-pressed={tab === 'vpi'} onClick={() => setTab('vpi')} style={tabBtnStyle(tab === 'vpi')}>VPI Calculator</button>
        <button aria-pressed={tab === 'info'} onClick={() => setTab('info')} style={tabBtnStyle(tab === 'info')}>Info Gathering</button>
        <button aria-pressed={tab === 'treasure'} onClick={() => setTab('treasure')} style={tabBtnStyle(tab === 'treasure')}>Treasure Hunt</button>
      </div>

      {tab === 'vpi' && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('VPI(E_j) = \\left(\\sum_j P(E_j{=}e_j) \\cdot EU(\\text{best} \\mid e_j)\\right) - EU(\\text{best})') }} />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '13px' }}>n (blocks):</span>
              <input type="range" min={2} max={8} step={1} value={n} aria-label="Number of oil blocks"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setN(parseInt(e.target.value))} style={{ width: '120px' }} />
              <span style={{ color: '#E5E7EB', fontSize: '13px' }}>{n}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Profit C ($):</span>
              <input type="range" min={50} max={500} step={50} value={profitC} aria-label="Profit from drilling"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfitC(parseInt(e.target.value))} style={{ width: '120px' }} />
              <span style={{ color: '#E5E7EB', fontSize: '13px' }}>{profitC}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Current Best EU', value: vpiResult.currentBestEU.toFixed(2), color: '#9CA3AF' },
              { label: 'EU With Info', value: vpiResult.expectedEUWithInfo.toFixed(2), color: '#6366F1' },
              { label: 'VPI', value: vpiResult.vpi.toFixed(2), color: '#F59E0B' },
              { label: 'Info Cost', value: '50.00', color: '#9CA3AF' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
                <div style={{ color, fontWeight: 700, fontSize: '20px' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: vpiResult.worthGathering ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${vpiResult.worthGathering ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: vpiResult.worthGathering ? '#10B981' : '#EF4444', fontWeight: 700 }}>
            {vpiResult.worthGathering ? '✓ Worth gathering (VPI > cost)' : '✗ Not worth gathering (VPI ≤ cost)'}
          </div>
        </div>
      )}

      {tab === 'info' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
            Myopic policy: greedily gather observations where VPI {'>'} cost, ranked by VPI/cost ratio.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '12px' }}>
              <thead>
                <tr>
                  {['Variable', 'VPI', 'Cost', 'Ratio'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variables.map((v, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', color: '#E5E7EB' }}>
                      <input style={{ ...inputStyle, width: '80px' }} value={v.id} aria-label={`Variable ${i + 1} name`}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVar(i, 'id', e.target.value)} />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="number" style={inputStyle} value={v.vpi} aria-label={`Variable ${i + 1} VPI`}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVar(i, 'vpi', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input type="number" style={inputStyle} value={v.cost} aria-label={`Variable ${i + 1} cost`}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVar(i, 'cost', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={{ padding: '4px 8px', color: '#9CA3AF' }}>{pcRatio(v.vpi, v.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button aria-label="Run information gathering agent" onClick={runGathering}
            style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}>
            Run Agent
          </button>
          {gatherSteps && (
            <div style={{ display: 'grid', gap: '6px' }}>
              {gatherSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: s.action === 'gather' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${s.action === 'gather' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                  <span style={{ fontSize: '16px' }}>{s.action === 'gather' ? '🔍' : '✅'}</span>
                  <span style={{ color: '#E5E7EB', fontWeight: 600, minWidth: '70px' }}>{s.action === 'gather' ? s.observation : 'Act Now'}</span>
                  {s.action === 'gather' && (
                    <>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>VPI={s.vpi}</span>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Cost={s.cost}</span>
                      <span style={{ color: '#F59E0B', fontSize: '12px' }}>Ratio={s.ratio.toFixed(2)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'treasure' && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\text{Rank by } \\frac{P(\\text{treasure})}{C(\\text{search})}') }} />
          </div>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
            {locations.map((loc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#E5E7EB', fontSize: '13px', minWidth: '70px' }}>{loc.id}</span>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>P=</span>
                <input type="number" min={0} max={1} step={0.05} style={{ background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '13px', width: '60px' }}
                  value={loc.probability} aria-label={`${loc.id} probability`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLoc(i, 'probability', parseFloat(e.target.value) || 0)} />
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Cost=</span>
                <input type="number" min={1} step={1} style={{ background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '13px', width: '60px' }}
                  value={loc.cost} aria-label={`${loc.id} cost`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLoc(i, 'cost', parseFloat(e.target.value) || 1)} />
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>P/C={pcRatio(loc.probability, loc.cost)}</span>
              </div>
            ))}
          </div>
          <button aria-label="Find optimal treasure search order" onClick={runTreasure}
            style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}>
            Find Optimal Order
          </button>
          {orderedLocs && (
            <div style={{ display: 'grid', gap: '6px' }}>
              {orderedLocs.map((loc, rank) => (
                <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '6px', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#F59E0B', fontWeight: 700, minWidth: '24px' }}>#{rank + 1}</span>
                  <span style={{ color: 'white', fontWeight: 600, minWidth: '70px' }}>{loc.id}</span>
                  <span style={{ color: '#9CA3AF', fontSize: '12px' }}>P={loc.probability.toFixed(2)}</span>
                  <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Cost={loc.cost}</span>
                  <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>P/C={pcRatio(loc.probability, loc.cost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
