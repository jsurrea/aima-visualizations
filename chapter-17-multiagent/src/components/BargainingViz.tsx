import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  rubinsteinBargaining, zeuthenRisk, simulateZeuthenNegotiation,
  type RubinsteinResult, type ZeuthenRound
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';
const AGENT2_COLOR = '#6B21A8';
const AGENT2_LIGHT = '#A855F7';
/** Minimum share percentage (0–100) required to render a label inside the split bar. Below this threshold the label is omitted to avoid overflow. */
const MIN_LABEL_WIDTH_THRESHOLD_PERCENT = 12;

/** Returns the label to render inside a split-bar segment, or an empty string if the segment is too narrow. */
function splitBarLabel(agentName: string, pct: number): string {
  return pct > MIN_LABEL_WIDTH_THRESHOLD_PERCENT ? `${agentName}: ${pct.toFixed(1)}%` : '';
}

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

export default function BargainingViz() {
  const [gamma1, setGamma1] = useState<number>(0.7);
  const [gamma2, setGamma2] = useState<number>(0.8);
  const [proposal1, setProposal1] = useState<number>(0.9);
  const [proposal2, setProposal2] = useState<number>(0.85);

  const [zeuthenStep, setZeuthenStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(600);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const rubinstein: RubinsteinResult = rubinsteinBargaining(gamma1, gamma2);
  const zeuthenRounds: ReadonlyArray<ZeuthenRound> = simulateZeuthenNegotiation(
    proposal1, proposal2, 0, 0
  );

  const stopPlay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    setZeuthenStep(0);
    stopPlay();
  }, [proposal1, proposal2, stopPlay]);

  useEffect(() => {
    if (!isPlaying || prefersReduced) {
      stopPlay();
      if (prefersReduced && isPlaying) setZeuthenStep(zeuthenRounds.length);
      return;
    }
    intervalRef.current = setInterval(() => {
      setZeuthenStep(prev => {
        if (prev >= zeuthenRounds.length) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, zeuthenRounds.length, prefersReduced, stopPlay]);

  const handlePlayPause = () => {
    if (zeuthenStep >= zeuthenRounds.length) {
      setZeuthenStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const currentRound: ZeuthenRound | null =
    zeuthenStep > 0 ? zeuthenRounds[zeuthenStep - 1] ?? null : null;
  const visibleRounds = zeuthenRounds.slice(0, zeuthenStep);

  const finalRound = zeuthenRounds[zeuthenRounds.length - 1] ?? null;
  const isAgreement = finalRound?.status === 'agreement';

  const pctA = rubinstein.agent1Gets * 100;
  const pctB = rubinstein.agent2Gets * 100;

  return (
    <div style={cardStyle} role="region" aria-label="Bargaining Visualization">
      <h3 style={sectionHeadStyle}>Bargaining Protocols</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Rubinstein alternating-offers and Zeuthen protocol for bilateral negotiation.
      </p>

      {/* Rubinstein parameters */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Rubinstein Alternating-Offers</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '10px' }}>
          <div>
            <label htmlFor="gamma1" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Agent 1 discount γ₁: {gamma1.toFixed(2)}
            </label>
            <input id="gamma1" type="range" min={0.1} max={0.99} step={0.01} value={gamma1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGamma1(parseFloat(e.target.value))}
              style={{ width: '120px', accentColor: CHAPTER_COLOR }}
              aria-label={`Agent 1 discount factor: ${gamma1.toFixed(2)}`} />
          </div>
          <div>
            <label htmlFor="gamma2" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Agent 2 discount γ₂: {gamma2.toFixed(2)}
            </label>
            <input id="gamma2" type="range" min={0.1} max={0.99} step={0.01} value={gamma2}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGamma2(parseFloat(e.target.value))}
              style={{ width: '120px', accentColor: AGENT2_LIGHT }}
              aria-label={`Agent 2 discount factor: ${gamma2.toFixed(2)}`} />
          </div>
        </div>

        {/* Rubinstein result */}
        <div style={{ marginTop: '16px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                `x_1^* = \\frac{1 - \\gamma_2}{1 - \\gamma_1 \\gamma_2} = \\frac{1 - ${gamma2.toFixed(2)}}{1 - ${gamma1.toFixed(2)} \\cdot ${gamma2.toFixed(2)}} \\approx ${rubinstein.agent1Gets.toFixed(3)}`
              )
            }}
            aria-label={`Agent 1 gets ${(rubinstein.agent1Gets * 100).toFixed(1)} percent`}
          />
        </div>

        {/* Split visualization */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Split of surplus:</div>
          <div style={{ display: 'flex', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{
              width: `${pctA}%`,
              background: CHAPTER_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white',
              minWidth: pctA > 10 ? '0' : undefined,
            }}>
              {splitBarLabel('A', pctA)}
            </div>
            <div style={{
              width: `${pctB}%`,
              background: AGENT2_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white',
            }}>
              {splitBarLabel('B', pctB)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
            <span style={{ color: CHAPTER_COLOR }}>Agent 1: {pctA.toFixed(1)}%</span>
            <span style={{ color: AGENT2_LIGHT }}>Agent 2: {pctB.toFixed(1)}%</span>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF' }}>
          Agreement at round: <span style={{ color: 'white' }}>{rubinstein.acceptsAtRound}</span> |{' '}
          Higher patience (γ closer to 1) → larger share
        </div>
      </div>

      {/* Zeuthen parameters */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Zeuthen Protocol</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '10px' }}>
          <div>
            <label htmlFor="prop1" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Agent 1 initial demand: {proposal1.toFixed(2)}
            </label>
            <input id="prop1" type="range" min={0.5} max={0.99} step={0.01} value={proposal1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProposal1(parseFloat(e.target.value))}
              style={{ width: '140px', accentColor: CHAPTER_COLOR }}
              aria-label={`Agent 1 initial demand: ${proposal1.toFixed(2)}`} />
          </div>
          <div>
            <label htmlFor="prop2" style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '3px' }}>
              Agent 2 initial demand: {proposal2.toFixed(2)}
            </label>
            <input id="prop2" type="range" min={0.5} max={0.99} step={0.01} value={proposal2}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProposal2(parseFloat(e.target.value))}
              style={{ width: '140px', accentColor: AGENT2_LIGHT }}
              aria-label={`Agent 2 initial demand: ${proposal2.toFixed(2)}`} />
          </div>
        </div>

        {/* Zeuthen risk formula */}
        <div style={{ marginTop: '12px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: renderInlineMath(
                `\\text{Risk}_i = \\frac{u_i(\\text{own}) - u_i(\\text{other})}{u_i(\\text{own}) - u_i(\\text{conflict})}`
              )
            }}
            aria-label="Zeuthen risk formula"
          />
        </div>

        {/* Zeuthen controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
          <button style={btnStyle(isPlaying)} onClick={handlePlayPause} aria-label={isPlaying ? 'Pause Zeuthen negotiation' : 'Play Zeuthen negotiation'}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setZeuthenStep(prev => Math.max(0, prev - 1)); }} aria-label="Step back" disabled={zeuthenStep === 0}>◀</button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setZeuthenStep(prev => Math.min(zeuthenRounds.length, prev + 1)); }} aria-label="Step forward" disabled={zeuthenStep >= zeuthenRounds.length}>▶</button>
          <button style={btnStyle()} onClick={() => { stopPlay(); setZeuthenStep(0); }} aria-label="Reset Zeuthen">↺ Reset</button>
          <input type="range" min={100} max={2000} step={100} value={speed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: CHAPTER_COLOR }}
            aria-label={`Speed: ${speed}ms`} />
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Step {zeuthenStep}/{zeuthenRounds.length}</span>
        </div>

        {/* Current round bargaining bar */}
        {currentRound && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
              Current proposals (overlapping = agreement zone):
            </div>
            <div style={{ position: 'relative', height: '28px', background: '#0A0A0F', borderRadius: '6px', overflow: 'hidden' }}>
              {/* Agent 1 wants [0, prop1] */}
              <div style={{
                position: 'absolute',
                left: 0,
                width: `${currentRound.proposal1 * 100}%`,
                height: '100%',
                background: CHAPTER_COLOR,
                opacity: 0.7,
              }} />
              {/* Agent 2 wants [1-prop2, 1] which means agent1 gets at most 1-prop2 */}
              <div style={{
                position: 'absolute',
                right: 0,
                width: `${currentRound.proposal2 * 100}%`,
                height: '100%',
                background: AGENT2_COLOR,
                opacity: 0.7,
              }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: 600 }}>
                {currentRound.proposal1 + currentRound.proposal2 <= 1 + 1e-10
                  ? '✓ Agreement zone'
                  : `Gap: ${(currentRound.proposal1 + currentRound.proposal2 - 1).toFixed(3)}`}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}>
              <span style={{ color: CHAPTER_COLOR }}>A demands {(currentRound.proposal1 * 100).toFixed(1)}%</span>
              <span style={{ color: AGENT2_LIGHT }}>B demands {(currentRound.proposal2 * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Zeuthen rounds table */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '12px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }} aria-label="Zeuthen negotiation rounds">
            <thead style={{ position: 'sticky', top: 0, background: '#1A1A24' }}>
              <tr>
                {['Round', 'Demand₁', 'Demand₂', 'Risk₁', 'Risk₂', 'Concedes', 'Status'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', color: '#9CA3AF', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRounds.map((r, idx) => (
                <tr key={idx} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: r.status === 'agreement'
                    ? 'rgba(16,185,129,0.08)'
                    : r.status === 'conflict'
                      ? 'rgba(239,68,68,0.08)'
                      : idx === visibleRounds.length - 1
                        ? `${CHAPTER_COLOR}10`
                        : 'transparent'
                }}>
                  <td style={{ padding: '5px 8px', color: '#9CA3AF' }}>{r.round + 1}</td>
                  <td style={{ padding: '5px 8px', color: CHAPTER_COLOR }}>{r.proposal1.toFixed(3)}</td>
                  <td style={{ padding: '5px 8px', color: AGENT2_LIGHT }}>{r.proposal2.toFixed(3)}</td>
                  <td style={{ padding: '5px 8px', color: 'white' }}>{r.risk1.toFixed(3)}</td>
                  <td style={{ padding: '5px 8px', color: 'white' }}>{r.risk2.toFixed(3)}</td>
                  <td style={{ padding: '5px 8px', color: r.conceding === 1 ? CHAPTER_COLOR : r.conceding === 2 ? AGENT2_LIGHT : '#9CA3AF' }}>
                    {r.conceding === 1 ? 'Agent 1' : r.conceding === 2 ? 'Agent 2' : '—'}
                  </td>
                  <td style={{ padding: '5px 8px', color: r.status === 'agreement' ? '#10B981' : r.status === 'conflict' ? '#EF4444' : '#9CA3AF', fontWeight: r.status !== 'negotiating' ? 600 : 400 }}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final status */}
        {zeuthenStep >= zeuthenRounds.length && finalRound && (
          <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: isAgreement ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isAgreement ? '#10B981' : '#EF4444'}40` }}>
            {isAgreement ? (
              <>
                <div style={{ color: '#10B981', fontWeight: 600 }}>✓ Agreement reached!</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '4px' }}>
                  Agent 1 gets: {(finalRound.proposal1 * 100).toFixed(1)}% |
                  Agent 2 gets: {((1 - finalRound.proposal1) * 100).toFixed(1)}%
                </div>
              </>
            ) : (
              <div style={{ color: '#EF4444', fontWeight: 600 }}>✗ Conflict — no agreement reached</div>
            )}
          </div>
        )}
      </div>

      {/* State inspection */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
        <strong style={{ color: 'white' }}>State Inspection</strong>
        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><span style={{ color: '#9CA3AF' }}>γ₁ (Agent 1): </span><span style={{ color: CHAPTER_COLOR }}>{gamma1.toFixed(2)}</span></div>
          <div><span style={{ color: '#9CA3AF' }}>γ₂ (Agent 2): </span><span style={{ color: AGENT2_LIGHT }}>{gamma2.toFixed(2)}</span></div>
          <div><span style={{ color: '#9CA3AF' }}>Rubinstein A1: </span><span style={{ color: 'white' }}>{(rubinstein.agent1Gets * 100).toFixed(1)}%</span></div>
          <div><span style={{ color: '#9CA3AF' }}>Rubinstein A2: </span><span style={{ color: 'white' }}>{(rubinstein.agent2Gets * 100).toFixed(1)}%</span></div>
          {currentRound && (
            <>
              <div><span style={{ color: '#9CA3AF' }}>Zeuthen Round: </span><span style={{ color: 'white' }}>{currentRound.round + 1}</span></div>
              <div><span style={{ color: '#9CA3AF' }}>Status: </span><span style={{ color: currentRound.status === 'agreement' ? '#10B981' : currentRound.status === 'conflict' ? '#EF4444' : '#9CA3AF' }}>{currentRound.status}</span></div>
              <div><span style={{ color: '#9CA3AF' }}>Risk₁: </span><span style={{ color: 'white' }}>{currentRound.risk1.toFixed(4)}</span></div>
              <div><span style={{ color: '#9CA3AF' }}>Risk₂: </span><span style={{ color: 'white' }}>{currentRound.risk2.toFixed(4)}</span></div>
            </>
          )}
        </div>
        {/* Zeuthen risk formula display */}
        <div style={{ marginTop: '10px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                `\\text{Risk}(\\text{agent } i) = \\frac{u_i^{\\text{own}} - u_i^{\\text{other}}}{u_i^{\\text{own}} - u_i^{\\text{conflict}}}`
              )
            }}
            aria-label="Zeuthen risk formula: own minus other over own minus conflict"
          />
        </div>
        {/* zeuthenRisk is imported but used internally; expose calculated value */}
        {currentRound && (
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Agent with lower risk concedes first (Zeuthen's principle)
          </div>
        )}
      </div>
    </div>
  );
}
