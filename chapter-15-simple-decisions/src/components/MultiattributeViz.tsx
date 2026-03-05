import { useState, useMemo, useCallback } from 'react';
import { strictlyDominatedOptions, additiveUtility, stochasticDominance } from '../algorithms';
import type { Option } from '../algorithms';

type Tab = 'dominance' | 'additive' | 'stochastic';

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };

const SITES_2D: Option[] = [
  { name: 'A', attributes: { Safety: 8, Quietness: 7 } },
  { name: 'B', attributes: { Safety: 6, Quietness: 9 } },
  { name: 'C', attributes: { Safety: 5, Quietness: 5 } },
  { name: 'D', attributes: { Safety: 9, Quietness: 4 } },
  { name: 'E', attributes: { Safety: 7, Quietness: 7 } },
];

const SITES_3D: Option[] = [
  { name: 'A', attributes: { Safety: 8, Quietness: 7, 'Cost Efficiency': 5 } },
  { name: 'B', attributes: { Safety: 6, Quietness: 9, 'Cost Efficiency': 7 } },
  { name: 'C', attributes: { Safety: 5, Quietness: 5, 'Cost Efficiency': 9 } },
  { name: 'D', attributes: { Safety: 9, Quietness: 4, 'Cost Efficiency': 6 } },
  { name: 'E', attributes: { Safety: 7, Quietness: 7, 'Cost Efficiency': 8 } },
];

const SITE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

function boxMuller(mean: number, std: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    out.push(mean + std * z0, mean + std * z1);
  }
  return out.slice(0, n);
}

function buildHistogram(samples: number[], bins: number, lo: number, hi: number): number[] {
  const counts = new Array<number>(bins).fill(0);
  const range = hi - lo;
  for (const s of samples) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(((s - lo) / range) * bins)));
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  return counts;
}

export default function MultiattributeViz() {
  const [tab, setTab] = useState<Tab>('dominance');
  const [dominated, setDominated] = useState<ReadonlyArray<string> | null>(null);

  // Additive weights
  const [weights, setWeights] = useState([5, 5, 5]);
  const totalW = weights.reduce((s, w) => s + w, 1e-9);

  // Stochastic
  const [meanA, setMeanA] = useState(5);
  const [stdA, setStdA] = useState(2);
  const [meanB, setMeanB] = useState(4);
  const [stdB, setStdB] = useState(1.5);
  const [domResult, setDomResult] = useState<string | null>(null);
  const [samplesA, setSamplesA] = useState<number[]>([]);
  const [samplesB, setSamplesB] = useState<number[]>([]);

  const computeDominance = () => setDominated(strictlyDominatedOptions(SITES_2D));

  const normWeights = weights.map(w => w / totalW);
  const attrKeys = ['Safety', 'Quietness', 'Cost Efficiency'];

  const scores = useMemo(() => SITES_3D.map(site => ({
    name: site.name,
    score: additiveUtility(site, attrKeys.map((a, i) => ({ attribute: a, weight: normWeights[i] ?? 0 }))),
  })), [normWeights]);

  const maxScore = Math.max(...scores.map(s => s.score));

  const runStochastic = useCallback(() => {
    const sA = boxMuller(meanA, stdA, 100);
    const sB = boxMuller(meanB, stdB, 100);
    setSamplesA(sA);
    setSamplesB(sB);
    const aDomB = stochasticDominance(sA, sB);
    const bDomA = stochasticDominance(sB, sA);
    setDomResult(aDomB ? 'A dominates B' : bDomA ? 'B dominates A' : 'No dominance');
  }, [meanA, stdA, meanB, stdB]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#6366F1' : '#242430', color: active ? 'white' : '#9CA3AF',
    border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  });

  // Scatter chart
  const PAD = 40;
  const CW = 300;
  const CH = 180;
  const toX = (v: number) => PAD + (v / 10) * CW;
  const toY = (v: number) => PAD + CH - (v / 10) * CH;

  // Histogram
  const BINS = 8;
  const histA = buildHistogram(samplesA, BINS, 0, 10);
  const histB = buildHistogram(samplesB, BINS, 0, 10);
  const maxHist = Math.max(...histA, ...histB, 1);
  const HW = 340;
  const HH = 120;
  const HP = 30;
  const barW = (HW - HP * 2) / (BINS * 2 + BINS);

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.4 Multiattribute Utility</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        When choices have multiple attributes, use dominance, additive value functions, or stochastic dominance to compare options.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button aria-pressed={tab === 'dominance'} onClick={() => setTab('dominance')} style={btnStyle(tab === 'dominance')}>Dominance</button>
        <button aria-pressed={tab === 'additive'} onClick={() => setTab('additive')} style={btnStyle(tab === 'additive')}>Additive Value</button>
        <button aria-pressed={tab === 'stochastic'} onClick={() => setTab('stochastic')} style={btnStyle(tab === 'stochastic')}>Stochastic Dominance</button>
      </div>

      {tab === 'dominance' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>Site A strictly dominates B if A ≥ B on every attribute and A &gt; B on at least one.</p>
          <svg width={380} height={260} aria-label="Airport site scatter plot - Safety vs Quietness">
            <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + CH + 10} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
            <line x1={PAD - 10} y1={PAD + CH} x2={PAD + CW} y2={PAD + CH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
            {[0, 2, 4, 6, 8, 10].map(v => (
              <g key={v}>
                <text x={toX(v)} y={PAD + CH + 14} textAnchor="middle" fill="#9CA3AF" fontSize={10}>{v}</text>
                <text x={PAD - 14} y={toY(v) + 4} textAnchor="middle" fill="#9CA3AF" fontSize={10}>{v}</text>
              </g>
            ))}
            <text x={PAD + CW / 2} y={PAD + CH + 28} textAnchor="middle" fill="#9CA3AF" fontSize={11}>Safety</text>
            <text x={10} y={PAD + CH / 2} textAnchor="middle" fill="#9CA3AF" fontSize={11} transform={`rotate(-90, 10, ${PAD + CH / 2})`}>Quietness</text>
            {SITES_2D.map((site, i) => {
              const isDom = dominated !== null && dominated.includes(site.name);
              const cx = toX(site.attributes['Safety'] ?? 0);
              const cy = toY(site.attributes['Quietness'] ?? 0);
              return (
                <g key={site.name}>
                  {isDom && <circle cx={cx} cy={cy} r={16} fill="none" stroke="#EF4444" strokeWidth={2.5} />}
                  {isDom && (
                    <>
                      <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke="#EF4444" strokeWidth={2} />
                      <line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} stroke="#EF4444" strokeWidth={2} />
                    </>
                  )}
                  <circle cx={cx} cy={cy} r={9} fill={SITE_COLORS[i] ?? '#6366F1'} stroke="#111118" strokeWidth={1.5} />
                  <text x={cx + 12} y={cy + 4} fill="white" fontSize={12} fontWeight={600}>{site.name}</text>
                </g>
              );
            })}
          </svg>
          <button
            aria-label="Compute strictly dominated options"
            onClick={computeDominance}
            style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginTop: '12px' }}
          >Compute Dominance</button>
          {dominated !== null && (
            <div style={{ marginTop: '10px', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
              {dominated.length === 0
                ? <span style={{ color: '#10B981' }}>No strictly dominated options found.</span>
                : <span style={{ color: '#EF4444' }}>Dominated: {dominated.join(', ')}</span>}
            </div>
          )}
        </div>
      )}

      {tab === 'additive' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>Adjust attribute weights to see how rankings change.</p>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
            {attrKeys.map((attr, i) => (
              <div key={attr} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#E5E7EB', fontSize: '13px', width: '120px' }}>{attr}:</span>
                <input type="range" min={0} max={10} step={1} value={weights[i] ?? 5}
                  aria-label={`Weight for ${attr}`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeights(prev => prev.map((w, j) => j === i ? parseInt(e.target.value) : w))}
                  style={{ width: '140px' }} />
                <span style={{ color: '#E5E7EB', fontSize: '13px', minWidth: '30px' }}>{(normWeights[i] ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {[...scores].sort((a, b) => b.score - a.score).map((s, rank) => {
              const isBest = s.score === maxScore;
              return (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', background: isBest ? 'rgba(16,185,129,0.1)' : '#1A1A24', border: `1px solid ${isBest ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  <span style={{ color: '#9CA3AF', fontSize: '13px', minWidth: '20px' }}>#{rank + 1}</span>
                  <span style={{ color: isBest ? '#10B981' : 'white', fontWeight: isBest ? 700 : 400, minWidth: '20px' }}>{s.name}</span>
                  <div style={{ flex: 1, background: '#242430', borderRadius: '4px', height: '8px' }}>
                    <div style={{ width: `${(s.score / (maxScore || 1)) * 100}%`, height: '8px', borderRadius: '4px', background: isBest ? '#10B981' : '#6366F1' }} />
                  </div>
                  <span style={{ color: isBest ? '#10B981' : '#E5E7EB', fontWeight: 700, minWidth: '50px', textAlign: 'right' }}>{s.score.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'stochastic' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
            Distribution A first-order stochastically dominates B if F_A(x) ≤ F_B(x) for all x.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {[
              { label: 'Distribution A', mean: meanA, std: stdA, setMean: setMeanA, setStd: setStdA, color: '#6366F1' },
              { label: 'Distribution B', mean: meanB, std: stdB, setMean: setMeanB, setStd: setStdB, color: '#EC4899' },
            ].map(({ label, mean, std, setMean, setStd, color }) => (
              <div key={label} style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ color, fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', width: '36px' }}>Mean:</span>
                  <input type="range" min={1} max={9} step={1} value={mean} aria-label={`${label} mean`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setMean(parseFloat(e.target.value)); setDomResult(null); }} style={{ width: '100px' }} />
                  <span style={{ color: '#E5E7EB', fontSize: '12px' }}>{mean}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', width: '36px' }}>Std:</span>
                  <input type="range" min={0.5} max={4} step={0.5} value={std} aria-label={`${label} std deviation`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setStd(parseFloat(e.target.value)); setDomResult(null); }} style={{ width: '100px' }} />
                  <span style={{ color: '#E5E7EB', fontSize: '12px' }}>{std}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            aria-label="Check stochastic dominance"
            onClick={runStochastic}
            style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}
          >Check Stochastic Dominance</button>
          {domResult && (
            <div style={{ marginBottom: '12px', display: 'inline-block', padding: '6px 14px', borderRadius: '20px', background: domResult === 'No dominance' ? 'rgba(156,163,175,0.2)' : 'rgba(16,185,129,0.15)', color: domResult === 'No dominance' ? '#9CA3AF' : '#10B981', fontWeight: 700, fontSize: '13px' }}>
              {domResult}
            </div>
          )}
          {samplesA.length > 0 && (
            <svg width={HW} height={HH} aria-label="Sample distributions histogram">
              {histA.map((count, i) => {
                const x = HP + i * (barW * 3);
                const h = (count / maxHist) * (HH - HP - 10);
                return <rect key={`a${i}`} x={x} y={HH - HP - h} width={barW} height={h} fill="#6366F1" opacity={0.8} />;
              })}
              {histB.map((count, i) => {
                const x = HP + i * (barW * 3) + barW + 2;
                const h = (count / maxHist) * (HH - HP - 10);
                return <rect key={`b${i}`} x={x} y={HH - HP - h} width={barW} height={h} fill="#EC4899" opacity={0.8} />;
              })}
              <line x1={HP} y1={HH - HP} x2={HW - HP} y2={HH - HP} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              {[0, 2, 4, 6, 8, 10].map(v => (
                <text key={v} x={HP + (v / 10) * (HW - HP * 2)} y={HH - HP + 12} textAnchor="middle" fill="#9CA3AF" fontSize={9}>{v}</text>
              ))}
              <rect x={HW - 70} y={4} width={10} height={10} fill="#6366F1" />
              <text x={HW - 56} y={13} fill="#9CA3AF" fontSize={10}>Dist A</text>
              <rect x={HW - 70} y={18} width={10} height={10} fill="#EC4899" />
              <text x={HW - 56} y={27} fill="#9CA3AF" fontSize={10}>Dist B</text>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
