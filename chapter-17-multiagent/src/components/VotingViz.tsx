import React, { useState, useCallback } from 'react';
import {
  bordaCount, pluralityVoting, instantRunoffVoting,
  findCondorcetWinner, condorcetParadox,
  type BordaResult, type PluralityResult, type IRVResult
} from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

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

const NUM_CANDIDATES = 5;
const CANDIDATE_LABELS = ['A', 'B', 'C', 'D', 'E'];

const DEFAULT_PREFS: number[][] = [
  [0, 1, 2, 3, 4],
  [1, 2, 3, 4, 0],
  [2, 3, 4, 0, 1],
  [0, 2, 4, 1, 3],
  [3, 1, 4, 0, 2],
];

export default function VotingViz() {
  const [preferences, setPreferences] = useState<number[][]>(DEFAULT_PREFS.map(r => [...r]));
  const [irvStep, setIrvStep] = useState<number>(0);
  const [strategicVoting, setStrategicVoting] = useState<boolean>(false);
  const [showParadox, setShowParadox] = useState<boolean>(false);

  const effectivePrefs = useCallback((): number[][] => {
    if (strategicVoting) {
      return preferences.map((row, i) => i === 0 ? [1, 0, 2, 3, 4] : row);
    }
    return preferences;
  }, [preferences, strategicVoting]);

  const prefs = effectivePrefs();

  const pluralityResult: PluralityResult = pluralityVoting(prefs, NUM_CANDIDATES);
  const bordaResult: BordaResult = bordaCount(prefs, NUM_CANDIDATES);
  const irvResult: IRVResult = instantRunoffVoting(prefs, NUM_CANDIDATES);
  const condorcetWinner = findCondorcetWinner(prefs, NUM_CANDIDATES);

  const paradox = condorcetParadox();

  const handlePrefChange = (voter: number, rank: number, candidate: string) => {
    const candidateIdx = parseInt(candidate);
    if (isNaN(candidateIdx)) return;
    setPreferences(prev => {
      const next = prev.map(r => [...r]);
      const row = next[voter]!;
      const oldCandidate = row[rank];
      const swapRank = row.findIndex(c => c === candidateIdx);
      if (swapRank !== -1 && oldCandidate !== undefined) {
        row[swapRank] = oldCandidate;
      }
      row[rank] = candidateIdx;
      return next;
    });
    setIrvStep(0);
  };

  const loadParadox = () => {
    const p = condorcetParadox();
    setPreferences(p.preferences.map(r => [...r]));
    setShowParadox(true);
    setIrvStep(0);
  };

  const irvRounds = irvResult.rounds;
  const visibleIRVRounds = irvRounds.slice(0, Math.max(irvStep, 1));

  const maxBorda = Math.max(...Array.from(bordaResult.scores.values()), 1);
  const maxPlurality = Math.max(...Array.from(pluralityResult.counts.values()), 1);

  return (
    <div style={cardStyle} role="region" aria-label="Voting Procedures Visualization">
      <h3 style={sectionHeadStyle}>Voting Procedures</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Compare plurality, Borda count, instant-runoff, and Condorcet voting with 5 candidates and 5 voters.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <button style={btnStyle()} onClick={loadParadox} aria-label="Load Condorcet paradox example">
          Load Condorcet Paradox
        </button>
        <button style={btnStyle()} onClick={() => { setPreferences(DEFAULT_PREFS.map(r => [...r])); setIrvStep(0); setShowParadox(false); setStrategicVoting(false); }} aria-label="Reset preferences">
          Reset
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={strategicVoting}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrategicVoting(e.target.checked)}
            style={{ accentColor: CHAPTER_COLOR }}
            aria-label="Enable strategic voting for voter 1"
          />
          Strategic voting (Voter 1: B{'>'} A{'>'} C{'>'} D{'>'} E)
        </label>
      </div>

      {/* Preference editor */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px', overflowX: 'auto' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Voter Preferences (drag-free: pick rank order)</strong>
        <div style={{ marginTop: '10px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px' }} aria-label="Voter preference matrix">
            <thead>
              <tr>
                <th style={{ padding: '6px 10px', color: '#9CA3AF', fontWeight: 500 }}>Voter</th>
                {[1, 2, 3, 4, 5].map(r => (
                  <th key={r} style={{ padding: '6px 10px', color: '#9CA3AF', fontWeight: 500 }}>Rank {r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prefs.map((row, voterIdx) => (
                <tr key={voterIdx}>
                  <td style={{ padding: '6px 10px', color: '#9CA3AF' }}>
                    Voter {voterIdx + 1}
                    {strategicVoting && voterIdx === 0 && <span style={{ color: CHAPTER_COLOR, marginLeft: '6px', fontSize: '11px' }}>★ strategic</span>}
                  </td>
                  {row.map((cand, rankIdx) => (
                    <td key={rankIdx} style={{ padding: '4px 6px' }}>
                      <select
                        value={cand}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handlePrefChange(voterIdx, rankIdx, e.target.value)}
                        disabled={strategicVoting && voterIdx === 0}
                        style={{
                          background: '#0A0A0F',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '12px',
                          width: '50px',
                        }}
                        aria-label={`Voter ${voterIdx + 1} rank ${rankIdx + 1}`}
                      >
                        {CANDIDATE_LABELS.map((label, ci) => (
                          <option key={ci} value={ci}>{label}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {/* Plurality */}
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
          <strong style={{ color: 'white', fontSize: '14px' }}>Plurality</strong>
          <div style={{ marginTop: '4px', color: '#9CA3AF', fontSize: '12px' }}>Winner: <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>{CANDIDATE_LABELS[pluralityResult.winner]}</span></div>
          <div style={{ marginTop: '8px' }}>
            {Array.from({ length: NUM_CANDIDATES }, (_, c) => {
              const count = pluralityResult.counts.get(c) ?? 0;
              return (
                <div key={c} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span style={{ color: c === pluralityResult.winner ? CHAPTER_COLOR : 'white' }}>{CANDIDATE_LABELS[c]}</span>
                    <span style={{ color: '#9CA3AF' }}>{count}</span>
                  </div>
                  <div style={{ background: '#0A0A0F', borderRadius: '3px', height: '5px' }}>
                    <div style={{ width: `${(count / maxPlurality) * 100}%`, height: '100%', background: c === pluralityResult.winner ? CHAPTER_COLOR : '#6B7280', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Borda */}
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
          <strong style={{ color: 'white', fontSize: '14px' }}>Borda Count</strong>
          <div style={{ marginTop: '4px', color: '#9CA3AF', fontSize: '12px' }}>Winner: <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>{CANDIDATE_LABELS[bordaResult.winner]}</span></div>
          <div style={{ marginTop: '8px' }}>
            {bordaResult.ranking.map((c, pos) => {
              const score = bordaResult.scores.get(c) ?? 0;
              return (
                <div key={c} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span style={{ color: pos === 0 ? CHAPTER_COLOR : 'white' }}>#{pos + 1} {CANDIDATE_LABELS[c]}</span>
                    <span style={{ color: '#9CA3AF' }}>{score}</span>
                  </div>
                  <div style={{ background: '#0A0A0F', borderRadius: '3px', height: '5px' }}>
                    <div style={{ width: `${(score / maxBorda) * 100}%`, height: '100%', background: pos === 0 ? CHAPTER_COLOR : '#6B7280', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Condorcet */}
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
          <strong style={{ color: 'white', fontSize: '14px' }}>Condorcet</strong>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>
            {condorcetWinner >= 0
              ? <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>Winner: {CANDIDATE_LABELS[condorcetWinner]}</span>
              : <span style={{ color: '#F59E0B' }}>No Condorcet winner (paradox)</span>}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '8px' }}>
            A Condorcet winner beats every other candidate in pairwise contests.
          </div>
          {condorcetWinner < 0 && (
            <div style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '4px' }}>
              Voting cycle exists (Arrow's impossibility applies)
            </div>
          )}
        </div>
      </div>

      {/* IRV */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Instant Runoff Voting (IRV)</strong>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button style={btnStyle()} onClick={() => setIrvStep(prev => Math.max(0, prev - 1))} aria-label="Previous IRV round" disabled={irvStep === 0}>◀ Prev</button>
          <button style={btnStyle()} onClick={() => setIrvStep(prev => Math.min(irvRounds.length, prev + 1))} aria-label="Next IRV round" disabled={irvStep >= irvRounds.length}>Next ▶</button>
          <button style={btnStyle()} onClick={() => setIrvStep(irvRounds.length)} aria-label="Show all IRV rounds">All Rounds</button>
          <button style={btnStyle()} onClick={() => setIrvStep(0)} aria-label="Reset IRV">↺ Reset</button>
          <span style={{ color: '#9CA3AF', fontSize: '13px', alignSelf: 'center' }}>Round {irvStep}/{irvRounds.length}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }} aria-label="IRV rounds">
            <thead>
              <tr>
                <th style={{ padding: '6px 10px', color: '#9CA3AF', fontWeight: 500, textAlign: 'left' }}>Round</th>
                {CANDIDATE_LABELS.map(l => (
                  <th key={l} style={{ padding: '6px 10px', color: '#9CA3AF', fontWeight: 500, textAlign: 'center' }}>{l}</th>
                ))}
                <th style={{ padding: '6px 10px', color: '#9CA3AF', fontWeight: 500, textAlign: 'left' }}>Eliminated</th>
              </tr>
            </thead>
            <tbody>
              {visibleIRVRounds.map((round, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx === visibleIRVRounds.length - 1 ? `${CHAPTER_COLOR}10` : 'transparent' }}>
                  <td style={{ padding: '6px 10px', color: '#9CA3AF' }}>{idx + 1}</td>
                  {round.counts.map((cnt, ci) => (
                    <td key={ci} style={{ padding: '6px 10px', textAlign: 'center', color: round.eliminated === ci ? '#EF4444' : round.winner === ci ? CHAPTER_COLOR : 'white', fontWeight: (round.winner === ci) ? 700 : 400 }}>
                      {cnt === 0 && round.eliminated !== ci ? '—' : cnt}
                    </td>
                  ))}
                  <td style={{ padding: '6px 10px', color: '#EF4444' }}>
                    {round.eliminated !== null ? CANDIDATE_LABELS[round.eliminated] : round.winner !== null ? `✓ ${CANDIDATE_LABELS[round.winner]} wins` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {irvStep >= irvRounds.length && (
          <div style={{ marginTop: '8px', color: CHAPTER_COLOR, fontWeight: 600, fontSize: '14px' }}>
            IRV Winner: {CANDIDATE_LABELS[irvResult.winner]}
          </div>
        )}
      </div>

      {/* Condorcet paradox section */}
      {showParadox && (
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: `1px solid ${CHAPTER_COLOR}40` }}>
          <strong style={{ color: CHAPTER_COLOR, fontSize: '14px' }}>Condorcet Paradox Loaded</strong>
          <div style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '8px' }}>
            Preferences: {paradox.preferences.map((row, i) =>
              `Voter ${i + 1}: ${row.map(c => CANDIDATE_LABELS[c]).join(' > ')}`
            ).join(' | ')}
          </div>
          <div style={{ marginTop: '8px', color: '#F59E0B', fontSize: '13px' }}>
            Cycle: {CANDIDATE_LABELS[paradox.cycle[0]]} ≻ {CANDIDATE_LABELS[paradox.cycle[1]]} ≻ {CANDIDATE_LABELS[paradox.cycle[2]]} ≻ {CANDIDATE_LABELS[paradox.cycle[0]]}
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>
            This demonstrates that majority preferences can be intransitive — violating a key rationality assumption.
            Arrow's Impossibility Theorem states that no voting system can satisfy all fairness criteria simultaneously.
          </div>
          <div style={{ marginTop: '6px' }}>
            <span
              dangerouslySetInnerHTML={{
                __html: renderInlineMath('A \\succ B,\\; B \\succ C,\\; C \\succ A')
              }}
              aria-label="A beats B, B beats C, C beats A"
            />
          </div>
        </div>
      )}

      {/* Winners comparison */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>Winner Comparison</strong>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
          {[
            { method: 'Plurality', winner: CANDIDATE_LABELS[pluralityResult.winner] },
            { method: 'Borda', winner: CANDIDATE_LABELS[bordaResult.winner] },
            { method: 'IRV', winner: CANDIDATE_LABELS[irvResult.winner] },
            { method: 'Condorcet', winner: condorcetWinner >= 0 ? CANDIDATE_LABELS[condorcetWinner] : 'None' },
          ].map(({ method, winner }) => (
            <div key={method} style={{ flex: 1, minWidth: '100px', background: '#0A0A0F', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: '#9CA3AF', fontSize: '11px' }}>{method}</div>
              <div style={{ color: winner !== 'None' ? CHAPTER_COLOR : '#F59E0B', fontWeight: 700, fontSize: '18px' }}>{winner}</div>
            </div>
          ))}
        </div>
        {new Set([CANDIDATE_LABELS[pluralityResult.winner], CANDIDATE_LABELS[bordaResult.winner], CANDIDATE_LABELS[irvResult.winner]]).size > 1 && (
          <div style={{ marginTop: '8px', color: '#F59E0B', fontSize: '12px' }}>
            ⚠ Different voting methods produce different winners — demonstrating the dependence on voting rules.
          </div>
        )}
      </div>
    </div>
  );
}
