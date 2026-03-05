import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  simulateRepeatedGame, limitOfMeans,
  type RepeatedStrategy, type RepeatedGameRound, type StagePayoffs
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

const STAGE_PAYOFFS: StagePayoffs = [
  [[1, 1], [5, 0]],
  [[0, 5], [3, 3]],
] as const;

const STRATEGIES: RepeatedStrategy[] = ['HAWK', 'DOVE', 'GRIM', 'TIT_FOR_TAT', 'TAT_FOR_TIT'];

const FSM_DESCRIPTIONS: Record<RepeatedStrategy, string> = {
  HAWK: 'Always Testify (defect). Never cooperates.',
  DOVE: 'Always Refuse (cooperate). Never defects.',
  GRIM: 'Start cooperating. Defect forever after first defection.',
  TIT_FOR_TAT: "Start cooperating. Copy opponent's last action.",
  TAT_FOR_TIT: "Start defecting. Copy opponent's last action.",
};

export default function RepeatedGameViz() {
  const [stratA, setStratA] = useState<RepeatedStrategy>('TIT_FOR_TAT');
  const [stratB, setStratB] = useState<RepeatedStrategy>('GRIM');
  const [numRounds, setNumRounds] = useState<number>(20);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(600);
  const [allRounds, setAllRounds] = useState<ReadonlyArray<RepeatedGameRound>>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    const rounds = simulateRepeatedGame(stratA, stratB, numRounds, STAGE_PAYOFFS);
    setAllRounds(rounds);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [stratA, stratB, numRounds]);

  const stopPlay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || prefersReduced) {
      stopPlay();
      if (prefersReduced && isPlaying) setCurrentStep(allRounds.length);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= allRounds.length) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, allRounds.length, prefersReduced, stopPlay]);

  const handlePlayPause = () => {
    if (currentStep >= allRounds.length) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const handleStep = (dir: 1 | -1) => {
    stopPlay();
    setCurrentStep(prev => Math.max(0, Math.min(allRounds.length, prev + dir)));
  };

  const handleReset = () => {
    stopPlay();
    setCurrentStep(0);
  };

  const visibleRounds = allRounds.slice(0, currentStep);
  const totalA = visibleRounds.reduce((s, r) => s + r.payoffA, 0);
  const totalB = visibleRounds.reduce((s, r) => s + r.payoffB, 0);
  const lomA = limitOfMeans(visibleRounds.map(r => r.payoffA));
  const lomB = limitOfMeans(visibleRounds.map(r => r.payoffB));

  const actionColor = (action: 'T' | 'R') =>
    action === 'T' ? '#EF4444' : '#10B981';

  return (
    <div style={cardStyle} role="region" aria-label="Repeated Game Visualization">
      <h3 style={sectionHeadStyle}>Repeated Game Simulator</h3>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Iterated prisoner's dilemma. T = Testify (defect), R = Refuse (cooperate).
      </p>

      {/* Strategy selectors */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '20px' }}>
        <div>
          <label htmlFor="stratA" style={{ color: '#9CA3AF', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Agent A Strategy
          </label>
          <select
            id="stratA"
            value={stratA}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStratA(e.target.value as RepeatedStrategy)}
            style={{
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
            aria-label="Agent A strategy"
          >
            {STRATEGIES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="stratB" style={{ color: '#9CA3AF', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Agent B Strategy
          </label>
          <select
            id="stratB"
            value={stratB}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStratB(e.target.value as RepeatedStrategy)}
            style={{
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
            aria-label="Agent B strategy"
          >
            {STRATEGIES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="numRounds" style={{ color: '#9CA3AF', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Rounds: {numRounds}
          </label>
          <input
            id="numRounds"
            type="range"
            min={5}
            max={50}
            value={numRounds}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNumRounds(parseInt(e.target.value))}
            style={{ width: '120px', accentColor: CHAPTER_COLOR }}
            aria-label={`Number of rounds: ${numRounds}`}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <button style={btnStyle(isPlaying)} onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={btnStyle()} onClick={() => handleStep(-1)} aria-label="Step back" disabled={currentStep === 0}>
          ◀ Back
        </button>
        <button style={btnStyle()} onClick={() => handleStep(1)} aria-label="Step forward" disabled={currentStep >= allRounds.length}>
          Forward ▶
        </button>
        <button style={btnStyle()} onClick={handleReset} aria-label="Reset">↺ Reset</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
          <label style={{ color: '#9CA3AF', fontSize: '13px' }}>Speed:</label>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={speed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: CHAPTER_COLOR }}
            aria-label={`Animation speed: ${speed}ms`}
          />
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{speed}ms</span>
        </div>
        <span style={{ color: '#9CA3AF', fontSize: '13px', marginLeft: '8px' }}>
          Step {currentStep}/{allRounds.length}
        </span>
      </div>

      {/* Round table */}
      <div style={{ overflowX: 'auto', marginBottom: '16px', maxHeight: '280px', overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }} aria-label="Round history">
          <thead style={{ position: 'sticky', top: 0, background: '#111118' }}>
            <tr>
              {['Round', "A's Action", "B's Action", "A's Payoff", "B's Payoff"].map(h => (
                <th key={h} style={{ padding: '8px 12px', color: '#9CA3AF', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRounds.map(round => (
              <tr key={round.round} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '6px 12px', color: '#9CA3AF' }}>{round.round + 1}</td>
                <td style={{ padding: '6px 12px', color: actionColor(round.agentAAction), fontWeight: 600 }}>{round.agentAAction}</td>
                <td style={{ padding: '6px 12px', color: actionColor(round.agentBAction), fontWeight: 600 }}>{round.agentBAction}</td>
                <td style={{ padding: '6px 12px', color: 'white' }}>{round.payoffA}</td>
                <td style={{ padding: '6px 12px', color: 'white' }}>{round.payoffB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      {visibleRounds.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px 16px', flex: 1, minWidth: '140px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Agent A Total</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{totalA}</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Limit of means: {lomA.toFixed(3)}</div>
          </div>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px 16px', flex: 1, minWidth: '140px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Agent B Total</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{totalB}</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Limit of means: {lomB.toFixed(3)}</div>
          </div>
        </div>
      )}

      {/* Limit of means formula */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <div
          dangerouslySetInnerHTML={{
            __html: renderInlineMath(`\\text{Limit of Means} = \\lim_{T \\to \\infty} \\frac{1}{T} \\sum_{t=1}^{T} r_t`)
          }}
          aria-label="Limit of means formula"
        />
      </div>

      {/* State inspection */}
      <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
        <strong style={{ color: 'white' }}>State Inspection</strong>
        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><span style={{ color: '#9CA3AF' }}>Current Round: </span><span style={{ color: 'white' }}>{currentStep}/{allRounds.length}</span></div>
          <div><span style={{ color: '#9CA3AF' }}>A Strategy: </span><span style={{ color: CHAPTER_COLOR }}>{stratA}</span></div>
          <div><span style={{ color: '#9CA3AF' }}>B Strategy: </span><span style={{ color: CHAPTER_COLOR }}>{stratB}</span></div>
          {visibleRounds.length > 0 && (
            <>
              <div><span style={{ color: '#9CA3AF' }}>Last A Action: </span><span style={{ color: actionColor(visibleRounds[visibleRounds.length - 1]!.agentAAction) }}>{visibleRounds[visibleRounds.length - 1]!.agentAAction}</span></div>
              <div><span style={{ color: '#9CA3AF' }}>Last B Action: </span><span style={{ color: actionColor(visibleRounds[visibleRounds.length - 1]!.agentBAction) }}>{visibleRounds[visibleRounds.length - 1]!.agentBAction}</span></div>
            </>
          )}
        </div>
      </div>

      {/* FSM Descriptions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {([stratA, stratB] as const).map((strat, idx) => (
          <div key={idx} style={{ background: '#1A1A24', borderRadius: '8px', padding: '10px 14px', flex: 1, minWidth: '180px', fontSize: '13px' }}>
            <strong style={{ color: CHAPTER_COLOR }}>{idx === 0 ? 'A' : 'B'}: {strat.replace(/_/g, ' ')}</strong>
            <div style={{ color: '#9CA3AF', marginTop: '4px' }}>{FSM_DESCRIPTIONS[strat]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
