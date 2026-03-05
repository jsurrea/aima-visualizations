import React, { useState } from 'react';

const CC = '#F59E0B';

// Simulate guarded move: robot moving toward a peg hole
// Returns whether the robot successfully enters the hole
function simulateGuardedMove(
  uncertainty: number,  // velocity cone half-angle in degrees
  strategy: 'naive' | 'guarded',
  seed: number,
): { trajectories: Array<{ x: number; y: number; success: boolean }[]>; successRate: number } {
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0x100000000;
  };
  const randNormal = () => {
    const u = Math.max(rand(), 1e-10);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const HOLE_X = 0.5;   // hole center x (normalized 0..1)
  const HOLE_W = 0.15;  // hole width
  const NUM_TRIALS = 20;
  const sigmaRad = (uncertainty / 180) * Math.PI;

  let successes = 0;
  const trajectories: Array<{ x: number; y: number; success: boolean }[]> = [];

  for (let trial = 0; trial < NUM_TRIALS; trial++) {
    const path: { x: number; y: number; success: boolean }[] = [];
    let x: number, y: number, inHole: boolean;

    if (strategy === 'naive') {
      // Move straight down from y=0 with random x perturbation
      x = HOLE_X + randNormal() * sigmaRad * 0.5;
      y = 0;
      path.push({ x, y, success: false });
      y = 1;  // bottom of workspace
      x = HOLE_X + randNormal() * sigmaRad;
      path.push({ x, y, success: false });
      inHole = Math.abs(x - HOLE_X) < HOLE_W / 2;
    } else {
      // Guarded strategy: first move left, then slide right into hole
      // Step 1: move to left of hole with uncertainty
      x = HOLE_X - HOLE_W - 0.05 + randNormal() * sigmaRad * 0.3;
      y = 0;
      path.push({ x, y, success: false });
      // Step 2: contact left wall (termination: contact)
      x = HOLE_X - HOLE_W / 2 - 0.02;
      y = 0.7 + Math.abs(randNormal()) * 0.1;
      path.push({ x, y, success: false });
      // Step 3: slide right into hole
      x = HOLE_X + randNormal() * sigmaRad * 0.1;
      y = 1.0;
      path.push({ x, y, success: false });
      inHole = Math.abs(x - HOLE_X) < HOLE_W / 2 + 0.02;
    }

    if (inHole) {
      successes++;
      path[path.length - 1]!.success = true;
    }
    trajectories.push(path);
  }

  return {
    trajectories,
    successRate: successes / NUM_TRIALS,
  };
}

export default function UncertaintyViz() {
  const [uncertainty, setUncertainty] = useState(15);
  const [strategy, setStrategy] = useState<'naive' | 'guarded'>('naive');
  const [seed, setSeed] = useState(42);

  const result = simulateGuardedMove(uncertainty, strategy, seed);
  const naiveResult = simulateGuardedMove(uncertainty, 'naive', seed);
  const guardedResult = simulateGuardedMove(uncertainty, 'guarded', seed);

  const W = 300;
  const H = 200;
  const HOLE_X_PX = W * 0.5;
  const HOLE_W_PX = W * 0.15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.6 Planning Under Uncertainty</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          When the robot's motions are uncertain (velocity is within a cone C_v, not exact),
          a naive "move straight to goal" strategy may fail. <strong style={{ color: CC }}>Guarded moves</strong>
          deliberately use the structure of the environment: move to a known surface first, then slide into the goal.
          This guarantees success even with significant uncertainty.
        </p>

        {/* Strategy selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['naive', 'guarded'] as const).map(s => (
            <button key={s}
              onClick={() => setStrategy(s)}
              style={{
                background: strategy === s ? `${s === 'naive' ? '#EF4444' : '#10B981'}20` : '#1A1A24',
                border: `1px solid ${strategy === s ? (s === 'naive' ? '#EF4444' : '#10B981') : 'rgba(255,255,255,0.08)'}`,
                color: strategy === s ? (s === 'naive' ? '#EF4444' : '#10B981') : '#9CA3AF',
                borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}
              aria-pressed={strategy === s}>
              {s === 'naive' ? 'Naive (straight down)' : 'Guarded Move Strategy'}
            </button>
          ))}
        </div>

        {/* Visualization */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
              {result.trajectories.length} trial trajectories (green = success, red = fail)
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#1A1A24', borderRadius: '8px' }}
              role="img" aria-label="Guarded move visualization">
              {/* Surface at bottom */}
              <rect x={0} y={H - 15} width={HOLE_X_PX - HOLE_W_PX / 2} height={15} fill="#4B5563" />
              <rect x={HOLE_X_PX + HOLE_W_PX / 2} y={H - 15} width={W - (HOLE_X_PX + HOLE_W_PX / 2)} height={15} fill="#4B5563" />

              {/* Hole */}
              <rect x={HOLE_X_PX - HOLE_W_PX / 2} y={H - 15} width={HOLE_W_PX} height={15}
                fill="#0A0A0F" stroke="#6B7280" strokeWidth={1} />
              <text x={HOLE_X_PX} y={H - 4} textAnchor="middle" fill="#6B7280" fontSize={8}>hole</text>

              {/* Trajectories */}
              {result.trajectories.map((traj, i) => {
                if (traj.length < 2) return null;
                const color = traj[traj.length - 1]!.success ? '#10B981' : '#EF4444';
                return (
                  <polyline key={i}
                    points={traj.map(p => `${p.x * W},${p.y * (H - 15)}`).join(' ')}
                    fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
                );
              })}

              {/* Uncertainty cone indicator */}
              <text x={W / 2} y={20} textAnchor="middle" fill="#6B7280" fontSize={8}>
                Velocity cone: ±{uncertainty}°
              </text>
            </svg>
          </div>

          {/* Success rates */}
          <div>
            <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: strategy === 'naive' ? '#EF4444' : '#10B981', marginBottom: '4px' }}>
                {strategy === 'naive' ? 'Naive Strategy' : 'Guarded Strategy'}
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: result.successRate > 0.7 ? '#10B981' : '#EF4444' }}>
                {(result.successRate * 100).toFixed(0)}%
              </div>
              <div style={{ color: '#6B7280', fontSize: '12px' }}>success rate</div>
            </div>

            <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '8px' }}>Side-by-Side Comparison</div>
              {[
                { label: 'Naive', value: (naiveResult.successRate * 100).toFixed(0) + '%', color: '#EF4444' },
                { label: 'Guarded', value: (guardedResult.successRate * 100).toFixed(0) + '%', color: '#10B981' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ height: '8px', background: '#0A0A0F', borderRadius: '4px' }}>
                    <div style={{ width: item.value, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What-if controls */}
        <div style={{ marginTop: '14px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>🔧 What-If Controls</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Velocity Uncertainty: <span style={{ color: CC }}>{uncertainty}°</span>
              <input type="range" min={1} max={45} step={1} value={uncertainty}
                onChange={e => setUncertainty(Number(e.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Velocity uncertainty" />
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Larger cone = more uncertainty in motion direction</div>
            </label>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Seed: <span style={{ color: CC }}>{seed}</span>
              <input type="range" min={1} max={100} value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Random seed" />
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Different noise realizations</div>
            </label>
          </div>
        </div>
      </div>

      {/* MPC and uncertainty methods */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>
          Dealing with Uncertainty: A Hierarchy of Approaches
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            {
              name: 'Most Likely State + Deterministic Planning', quality: 2,
              desc: 'Use the most probable state and plan as if it were exact. Fast but ignores uncertainty structure. Can fail badly on ambiguous observations.',
            },
            {
              name: 'Online Replanning (MPC)', quality: 3,
              desc: 'Replan every step with the current belief. Handles many practical situations without fully modeling uncertainty.',
            },
            {
              name: 'Guarded Movements', quality: 4,
              desc: 'Explicitly design motions that are robust to uncertainty. Termination conditions ensure correctness regardless of exact outcome.',
            },
            {
              name: 'POMDP Solvers', quality: 5,
              desc: 'Optimal Bayesian approach: plan over belief states, maximize expected reward accounting for future information gains. Computationally expensive.',
            },
          ].map(item => (
            <div key={item.name} style={{
              background: '#1A1A24', borderRadius: '8px', padding: '12px',
              borderLeft: `3px solid ${['', '', '#EF4444', CC, '#10B981', '#6366F1'][item.quality]!}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  {'★'.repeat(item.quality)}{'☆'.repeat(5 - item.quality)}
                </span>
              </div>
              <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
