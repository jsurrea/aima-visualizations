import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  runEnglishAuction, runVickreyAuction, runVCGMechanism,
  type EnglishAuctionStep, type VickreyResult, type VCGResult
} from '../algorithms';

const CHAPTER_COLOR = '#EC4899';

const btnStyle = (active = false): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: active ? CHAPTER_COLOR : '#1A1A24',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
});

const cardStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'white',
  marginBottom: '8px',
};

const BIDDER_COLORS = [CHAPTER_COLOR, '#6366F1', '#10B981', '#F59E0B'];

export default function AuctionViz() {
  const [valuations, setValuations] = useState<number[]>([80, 60, 45, 30]);
  const [reservePrice, setReservePrice] = useState<number>(10);
  const [increment, setIncrement] = useState<number>(5);
  const [numGoods, setNumGoods] = useState<number>(1);

  const [englishStep, setEnglishStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(600);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const englishSteps = runEnglishAuction(valuations, reservePrice, increment);
  const vickreyResult: VickreyResult = runVickreyAuction(valuations);
  const vcgResult: VCGResult = runVCGMechanism(valuations, numGoods);

  const stopPlay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    setEnglishStep(0);
    stopPlay();
  }, [valuations, reservePrice, increment, stopPlay]);

  useEffect(() => {
    if (!isPlaying || prefersReduced) {
      stopPlay();
      if (prefersReduced && isPlaying) setEnglishStep(englishSteps.length);
      return;
    }
    intervalRef.current = setInterval(() => {
      setEnglishStep(prev => {
        if (prev >= englishSteps.length) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, englishSteps.length, prefersReduced, stopPlay]);

  const handlePlayPause = () => {
    if (englishStep >= englishSteps.length) {
      setEnglishStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const handleValuationChange = (i: number, val: string) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    setValuations(prev => prev.map((v, idx) => idx === i ? n : v));
  };

  const currentStep: EnglishAuctionStep | null = englishStep > 0 ? englishSteps[englishStep - 1] ?? null : null;
  const maxVal = Math.max(...valuations, reservePrice, 1);

  const englishRevenue = currentStep?.currentPrice ?? 0;
  const vickreyRevenue = vickreyResult.winnerPays;
  const vcgRevenue = vcgResult.taxes.reduce((s, t) => s + t, 0);

  return (
    <div style={cardStyle} role="region" aria-label="Auction Mechanisms Visualization">
      <h3 style={sectionHeadStyle}>Auction Mechanisms</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Compare English, Vickrey (second-price), and VCG auction formats.
      </p>

      {/* Bidder valuations */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Bidder Valuations</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px' }}>
          {valuations.map((v, i) => (
            <div key={i}>
              <label htmlFor={`val-${i}`} style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
                Bidder {i + 1}: {v}
              </label>
              <input
                id={`val-${i}`}
                type="range"
                min={0}
                max={100}
                value={v}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleValuationChange(i, e.target.value)}
                style={{ width: '100px', accentColor: BIDDER_COLORS[i] }}
                aria-label={`Bidder ${i + 1} valuation: ${v}`}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
          <div>
            <label htmlFor="reserve" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Reserve: {reservePrice}
            </label>
            <input id="reserve" type="range" min={0} max={40} value={reservePrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReservePrice(parseInt(e.target.value))}
              style={{ width: '100px', accentColor: CHAPTER_COLOR }}
              aria-label={`Reserve price: ${reservePrice}`} />
          </div>
          <div>
            <label htmlFor="increment" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Increment: {increment}
            </label>
            <input id="increment" type="range" min={1} max={20} value={increment}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncrement(parseInt(e.target.value))}
              style={{ width: '100px', accentColor: CHAPTER_COLOR }}
              aria-label={`Bid increment: ${increment}`} />
          </div>
          <div>
            <label htmlFor="numGoods" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Goods (VCG): {numGoods}
            </label>
            <input id="numGoods" type="range" min={1} max={4} value={numGoods}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumGoods(parseInt(e.target.value))}
              style={{ width: '100px', accentColor: CHAPTER_COLOR }}
              aria-label={`Number of goods for VCG: ${numGoods}`} />
          </div>
        </div>
      </div>

      {/* Valuation bar chart */}
      <div style={{ marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '13px' }}>Valuations Overview</strong>
        <svg width="100%" height={80} style={{ display: 'block', marginTop: '8px' }} aria-label="Valuation bar chart" role="img">
          {valuations.map((v, i) => {
            const barW = 40;
            const gap = 12;
            const x = i * (barW + gap) + 10;
            const h = (v / maxVal) * 60;
            const isWinner = i === vickreyResult.winner;
            return (
              <g key={i}>
                <rect x={x} y={70 - h} width={barW} height={h}
                  fill={isWinner ? CHAPTER_COLOR : BIDDER_COLORS[i] ?? '#6B7280'}
                  fillOpacity={0.8} rx={3} />
                <text x={x + barW / 2} y={70 - h - 4} textAnchor="middle" fill="white" fontSize={11}>{v}</text>
                <text x={x + barW / 2} y={78} textAnchor="middle" fill="#9CA3AF" fontSize={10}>B{i + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* English Auction */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>English Auction (Ascending Price)</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '10px', marginBottom: '10px' }}>
          <button style={btnStyle(isPlaying)} onClick={handlePlayPause} aria-label={isPlaying ? 'Pause English auction' : 'Play English auction'}>
            {isPlaying ? '⏸' : '▶'} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setEnglishStep(prev => Math.max(0, prev - 1)); }} aria-label="Step back">◀</button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setEnglishStep(prev => Math.min(englishSteps.length, prev + 1)); }} aria-label="Step forward">▶</button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setEnglishStep(0); }} aria-label="Reset English auction">↺</button>
          <input type="range" min={100} max={2000} step={100} value={speed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: CHAPTER_COLOR }}
            aria-label={`Speed: ${speed}ms`} />
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Step {englishStep}/{englishSteps.length}</span>
        </div>

        {currentStep && (
          <div style={{ fontSize: '13px', marginBottom: '10px', padding: '8px', background: '#0A0A0F', borderRadius: '6px' }}>
            <span style={{ color: '#9CA3AF' }}>Current price: </span>
            <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>{currentStep.currentPrice}</span>
            <span style={{ color: '#9CA3AF', marginLeft: '12px' }}>Action: </span>
            <span style={{ color: 'white' }}>{currentStep.action}</span>
            {currentStep.highestBidder !== null && (
              <span style={{ color: '#9CA3AF', marginLeft: '12px' }}>
                Highest bidder: <span style={{ color: CHAPTER_COLOR }}>B{currentStep.highestBidder + 1}</span>
              </span>
            )}
          </div>
        )}

        {/* Price progress bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ background: '#0A0A0F', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
            <div style={{
              width: `${(currentStep ? currentStep.currentPrice : reservePrice) / maxVal * 100}%`,
              height: '100%',
              background: CHAPTER_COLOR,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
            <span>0</span><span>{maxVal}</span>
          </div>
        </div>

        {/* Steps table */}
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }} aria-label="English auction steps">
            <thead>
              <tr>
                {['Step', 'Price', 'Active Bidders', 'Highest Bidder', 'Action'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', color: '#9CA3AF', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {englishSteps.slice(0, englishStep).map((step, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx === englishStep - 1 ? `${CHAPTER_COLOR}15` : 'transparent' }}>
                  <td style={{ padding: '4px 8px', color: '#9CA3AF' }}>{idx + 1}</td>
                  <td style={{ padding: '4px 8px', color: CHAPTER_COLOR }}>{step.currentPrice}</td>
                  <td style={{ padding: '4px 8px', color: 'white' }}>{step.activeBidders.map(b => `B${b + 1}`).join(', ')}</td>
                  <td style={{ padding: '4px 8px', color: 'white' }}>{step.highestBidder !== null ? `B${step.highestBidder + 1}` : '—'}</td>
                  <td style={{ padding: '4px 8px', color: '#9CA3AF', fontSize: '11px' }}>{step.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vickrey Auction */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Vickrey Auction (Second-Price Sealed-Bid)</strong>
        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Winner</div>
            <div style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>Bidder {vickreyResult.winner + 1}</div>
          </div>
          <div style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Price Paid</div>
            <div style={{ color: '#10B981', fontWeight: 600 }}>{vickreyResult.winnerPays}</div>
          </div>
          {vickreyResult.utilities.map((u, i) => (
            <div key={i} style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>B{i + 1} Utility</div>
              <div style={{ color: u > 0 ? '#10B981' : u < 0 ? '#EF4444' : 'white', fontWeight: 600 }}>{u}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>
          ✓ Dominant strategy: bidding true valuation is weakly dominant (truthful mechanism)
        </div>
      </div>

      {/* VCG Mechanism */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>VCG Mechanism ({numGoods} good{numGoods > 1 ? 's' : ''})</strong>
        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Winners</div>
            <div style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>{vcgResult.winners.map(w => `B${w + 1}`).join(', ')}</div>
          </div>
          <div style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px' }}>Global Utility</div>
            <div style={{ color: '#10B981', fontWeight: 600 }}>{vcgResult.globalUtility}</div>
          </div>
          {vcgResult.taxes.map((t, i) => (
            <div key={i} style={{ background: '#0A0A0F', borderRadius: '6px', padding: '8px' }}>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>B{i + 1} Tax</div>
              <div style={{ color: t > 0 ? '#F59E0B' : 'white', fontWeight: 600 }}>{t.toFixed(1)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>
          VCG taxes equal the externality each winner imposes on others — ensuring efficiency and truthfulness.
        </div>
      </div>

      {/* Revenue comparison */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Revenue Comparison</strong>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
          {[
            { label: 'English (final)', revenue: englishSteps[englishSteps.length - 1]?.currentPrice ?? 0, color: CHAPTER_COLOR },
            { label: 'Vickrey', revenue: vickreyRevenue, color: '#6366F1' },
            { label: 'VCG total tax', revenue: Math.round(vcgRevenue * 10) / 10, color: '#10B981' },
          ].map(({ label, revenue, color }) => (
            <div key={label} style={{ flex: 1, minWidth: '120px', background: '#0A0A0F', borderRadius: '6px', padding: '10px' }}>
              <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{label}</div>
              <div style={{ color, fontWeight: 700, fontSize: '20px' }}>{revenue}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
