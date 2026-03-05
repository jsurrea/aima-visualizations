/**
 * InverseRLViz — §23.6
 *
 * Demonstrates feature-matching IRL (Abbeel & Ng 2004).
 * Shows expert trajectories, inferred reward weights, and learned policy.
 */
import React, { useState } from 'react';
import katex from 'katex';
import {
  createGridWorld,
  computeFeatureExpectations,
  featureMatchingIRL,
  runQLearning,
  type State,
  type GridAction,
} from '../algorithms/index';

const CC = '#10B981';
const GW = createGridWorld();
const ROWS = 3; const COLS = 4;
const ACTIONS: GridAction[] = ['up', 'down', 'left', 'right'];
const ARROW_CHAR: Record<GridAction, string> = { up: '↑', down: '↓', left: '←', right: '→' };

// Expert trajectories — near-optimal paths toward +1 terminal
const EXPERT_TRAJECTORIES: ReadonlyArray<ReadonlyArray<State>> = [
  ['2,0','2,1','2,2','1,2','0,2','0,3'],
  ['2,0','1,0','0,0','0,1','0,2','0,3'],
  ['2,1','2,2','1,2','0,2','0,3'],
  ['2,2','1,2','0,2','0,3'],
  ['1,2','0,2','0,3'],
  ['2,0','2,1','1,1','1,2','0,2','0,3'], // 1,1 is wall → just for feature demo
];

// 5 hand-crafted features for IRL
function stateFeature(s: State): ReadonlyArray<number> {
  const comma = s.indexOf(',');
  const r = parseInt(s.slice(0, comma), 10);
  const c = parseInt(s.slice(comma + 1), 10);
  const dr = r; const dc = c - 3;
  const distGoal = Math.sqrt(dr * dr + dc * dc) || 0.01;
  const dr2 = r - 1; const dc2 = c - 3;
  const distPit = Math.sqrt(dr2 * dr2 + dc2 * dc2) || 0.01;
  return [
    1,              // constant
    c / 3,          // horizontal progress
    (2 - r) / 2,    // vertical progress
    1 / distGoal,   // proximity to goal
    1 / distPit,    // proximity to pit (penalized when negative weight)
  ];
}
const FEATURE_NAMES = ['bias', 'x-progress', 'y-progress', 'near goal', 'near pit'];

// Candidate policies: use Q-learning with different seeds as proxy
const CANDIDATE_POLICIES: ReadonlyArray<ReadonlyArray<ReadonlyArray<State>>> = (() => {
  const result: Array<Array<Array<State>>> = [];
  for (let seed = 1; seed <= 5; seed++) {
    const hist = runQLearning(GW, 50, 0.9, 2.0, 5, seed);
    const policy = hist[hist.length - 1]!.policy;
    // Generate 6 trajectories following this policy
    const trajs: Array<Array<State>> = [];
    const starts: State[] = ['2,0','2,1','2,2','1,0','1,2','0,0'];
    const deltas: Record<GridAction, [number, number]> = {
      up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
    };
    for (const start of starts) {
      const traj: State[] = [start];
      let s = start;
      for (let step = 0; step < 15; step++) {
        if (GW.terminals.has(s)) break;
        const a = policy.get(s) ?? 'right';
        const [dx, dy] = deltas[a];
        const comma = s.indexOf(',');
        const r = parseInt(s.slice(0, comma), 10);
        const c = parseInt(s.slice(comma + 1), 10);
        const ns: State = `${r + dx},${c + dy}`;
        const valid = r + dx >= 0 && r + dx < ROWS && c + dy >= 0 && c + dy < COLS
                      && !GW.walls.has(ns);
        s = valid ? ns : s;
        traj.push(s);
        if (GW.terminals.has(s)) break;
      }
      trajs.push(traj);
    }
    result.push(trajs);
  }
  return result;
})();

function latex(s: string) {
  return { __html: katex.renderToString(s, { throwOnError: false }) };
}

export default function InverseRLViz() {
  const [gamma, setGamma] = useState(0.9);
  const [iterations, setIterations] = useState(3);
  const [showExpert, setShowExpert] = useState(true);
  const [selectedTraj, setSelectedTraj] = useState(0);

  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const irlResult = featureMatchingIRL(
    EXPERT_TRAJECTORIES, CANDIDATE_POLICIES, stateFeature, gamma, iterations
  );
  const expertFE = computeFeatureExpectations(EXPERT_TRAJECTORIES, stateFeature, gamma);
  const weights = irlResult.weights;

  const trajToShow: ReadonlyArray<State> = showExpert
    ? (EXPERT_TRAJECTORIES[selectedTraj % EXPERT_TRAJECTORIES.length] ?? [])
    : (CANDIDATE_POLICIES[Math.min(iterations - 1, CANDIDATE_POLICIES.length - 1)]?.[selectedTraj % 6] ?? []);

  // Color state based on inferred reward
  function inferredReward(s: State): number {
    const f = stateFeature(s);
    return f.reduce((sum, fi, i) => sum + (weights[i] ?? 0) * fi, 0);
  }

  const validStates: State[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s: State = `${r},${c}`;
      if (!GW.walls.has(s)) validStates.push(s);
    }

  const inferredRs = validStates.map(s => inferredReward(s));
  const minR = Math.min(...inferredRs);
  const maxR = Math.max(...inferredRs, 0.01);

  function rewardColor(v: number): string {
    const t = (v - minR) / (maxR - minR || 1);
    return `rgb(${Math.round(180 * (1 - t))},${Math.round(180 * t + 40)},80)`;
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    color: 'white', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Feature-matching IRL:&nbsp;
        <span dangerouslySetInnerHTML={latex(
          '\\mathbf{w}^{(i)}=\\hat{\\mu}(\\pi_E)-\\hat{\\mu}(\\pi^{(i-1)})'
        )} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Grid with inferred reward overlay */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button style={{ ...btnStyle, background: showExpert ? CC : 'var(--surface-3)' }}
                    aria-pressed={showExpert}
                    onClick={() => setShowExpert(true)}>Expert trajectories</button>
            <button style={{ ...btnStyle, background: !showExpert ? CC : 'var(--surface-3)' }}
                    aria-pressed={!showExpert}
                    onClick={() => setShowExpert(false)}>Candidate policy</button>
          </div>

          <svg viewBox={`0 0 ${COLS * 72 + 20} ${ROWS * 72 + 20}`}
               style={{ width: '100%', maxWidth: COLS * 72 + 20 }}
               role="img" aria-label="Grid with inferred reward heat-map and trajectories">
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const s: State = `${r},${c}`;
                const x = 10 + c * 72; const y = 10 + r * 72;
                if (GW.walls.has(s)) {
                  return <rect key={s} x={x} y={y} width={72} height={72} fill="#333" stroke="#555" rx={4} />;
                }
                const terminal = GW.terminals.get(s);
                const bg = terminal !== undefined
                  ? (terminal > 0 ? '#065f46' : '#7f1d1d')
                  : (prefersReduced ? '#242430' : rewardColor(inferredReward(s)));
                return (
                  <g key={s}>
                    <rect x={x} y={y} width={72} height={72} fill={bg} stroke="#444" rx={4} />
                    <text x={x + 36} y={y + 20} textAnchor="middle" fill="#ccc" fontSize={9}>{s}</text>
                    {terminal !== undefined ? (
                      <text x={x + 36} y={y + 46} textAnchor="middle" fill="white" fontSize={16} fontWeight="bold">
                        {terminal > 0 ? '+1' : '−1'}
                      </text>
                    ) : (
                      <text x={x + 36} y={y + 46} textAnchor="middle" fill="white" fontSize={11}>
                        {inferredReward(s).toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Trajectory overlay */}
            {!prefersReduced && trajToShow.length > 1 && (() => {
              const pts = trajToShow
                .filter(s => !GW.walls.has(s))
                .map(s => {
                  const comma = s.indexOf(',');
                  const r = parseInt(s.slice(0, comma), 10);
                  const c = parseInt(s.slice(comma + 1), 10);
                  return `${10 + c * 72 + 36},${10 + r * 72 + 36}`;
                }).join(' ');
              return (
                <polyline points={pts} fill="none" stroke="white" strokeWidth={2.5}
                          strokeDasharray="5 3" opacity={0.8} />
              );
            })()}

            {/* Start dot */}
            {!prefersReduced && trajToShow.length > 0 && (() => {
              const s = trajToShow[0]!;
              if (GW.walls.has(s)) return null;
              const comma = s.indexOf(',');
              const r = parseInt(s.slice(0, comma), 10);
              const c = parseInt(s.slice(comma + 1), 10);
              return <circle cx={10 + c * 72 + 36} cy={10 + r * 72 + 36} r={7}
                             fill="white" opacity={0.9} />;
            })()}
          </svg>

          {/* Trajectory selector */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {(showExpert ? EXPERT_TRAJECTORIES : (CANDIDATE_POLICIES[Math.min(iterations - 1, 4)] ?? [])).map((_, i) => (
              <button key={i} style={{ ...btnStyle, background: selectedTraj === i ? CC : 'var(--surface-3)' }}
                      aria-pressed={selectedTraj === i}
                      onClick={() => setSelectedTraj(i)}>
                #{i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Weight bar chart + controls */}
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
              Inferred reward weights w (IRL)
            </div>
            <svg viewBox="0 0 260 100" style={{ width: 260, height: 100 }}
                 role="img" aria-label="Reward weight bar chart">
              {(() => {
                const maxAbs = Math.max(...weights.map(Math.abs), 0.01);
                return weights.map((w, i) => {
                  const bh = Math.abs(w) / maxAbs * 38;
                  const x = 12 + i * 48;
                  return (
                    <g key={i}>
                      <rect x={x} y={w >= 0 ? 50 - bh : 50} width={38} height={bh}
                            fill={w >= 0 ? CC : '#EC4899'} rx={2} opacity={0.85} />
                      <text x={x + 19} y={92} textAnchor="middle" fill="#9CA3AF" fontSize={7}>
                        {FEATURE_NAMES[i]}
                      </text>
                      <text x={x + 19} y={w >= 0 ? 46 - bh : 66 + bh}
                            textAnchor="middle" fill="white" fontSize={8}>
                        {w.toFixed(2)}
                      </text>
                    </g>
                  );
                });
              })()}
              <line x1={8} y1={50} x2={252} y2={50} stroke="#555" strokeWidth={1} />
            </svg>
          </div>

          {/* Feature expectations comparison */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 8,
                        border: '1px solid var(--surface-border)', padding: 10 }}
               role="region" aria-label="Feature expectations comparison">
            <div style={{ fontSize: 12, fontWeight: 600, color: CC, marginBottom: 6 }}>
              µ(π_E) vs µ(π_candidate)
            </div>
            {FEATURE_NAMES.map((name, i) => {
              const expertVal = expertFE.expectations[i] ?? 0;
              const lastIter = irlResult.iterations[irlResult.iterations.length - 1];
              const policyVal = lastIter?.policyExpectations[i] ?? 0;
              return (
                <div key={i} style={{ marginBottom: 5 }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{name}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10 }}>
                    <span style={{ color: CC, width: 50 }}>E: {expertVal.toFixed(2)}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.abs(expertVal - policyVal) * 50)}%`,
                                    background: '#F59E0B', borderRadius: 3 }} />
                    </div>
                    <span style={{ color: '#9CA3AF', width: 50 }}>P: {policyVal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* IRL controls */}
          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            IRL iterations: {iterations}
            <input type="range" min={1} max={5} step={1} value={iterations}
                   onChange={e => setIterations(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="IRL iterations" />
          </label>

          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            γ = {gamma.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={gamma}
                   onChange={e => setGamma(Number(e.target.value))}
                   style={{ display: 'block', width: '100%' }} aria-label="Discount" />
          </label>

          {/* Iteration details */}
          {irlResult.iterations.map((iter, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 6,
                                  border: '1px solid var(--surface-border)', padding: 8,
                                  fontSize: 11, color: '#9CA3AF' }}>
              <span style={{ color: CC, fontWeight: 600 }}>Iter {i + 1}</span>
              &nbsp;margin ‖w‖={iter.margin.toFixed(3)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
