import React, { useState, useEffect, useRef, useCallback } from 'react';
import { simulatePID, simulateMPC, type PIDStep, type MPCStep } from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const CC = '#F59E0B';

export default function ControlViz() {
  const [mode, setMode] = useState<'pid' | 'mpc'>('pid');
  const [kp, setKp] = useState(2.0);
  const [ki, setKi] = useState(0.1);
  const [kd, setKd] = useState(0.5);
  const [horizon, setHorizon] = useState(5);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);

  const pidSteps = simulatePID(kp, ki, kd, 10, 0, 60, 0.1);
  const mpcSteps = simulateMPC(10, 0, horizon, 60, 0.1, 5);

  const steps = mode === 'pid' ? pidSteps : mpcSteps;
  const totalSteps = steps.length;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const interval = 1000 / (speed * 5);
    if (now - lastTimeRef.current >= interval) {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
      lastTimeRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, totalSteps]);

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(tick);
    else if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const reset = () => { setStepIdx(0); setPlaying(false); };

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build trajectory for chart
  const allPIDSteps = pidSteps.slice(0, stepIdx + 1);
  const allMPCSteps = mpcSteps.slice(0, stepIdx + 1);

  const VW = 500;
  const VH = 160;
  const MARGIN = { left: 40, right: 10, top: 15, bottom: 30 };
  const chartW = VW - MARGIN.left - MARGIN.right;
  const chartH = VH - MARGIN.top - MARGIN.bottom;

  const allStepsForMode = mode === 'pid' ? pidSteps : mpcSteps;
  const maxT = allStepsForMode[allStepsForMode.length - 1]!.t;
  const setpoint = 10;

  const toX = (t: number) => MARGIN.left + (t / maxT) * chartW;
  const toY = (v: number) => MARGIN.top + chartH - ((v / 15) * chartH);

  const currentPID = mode === 'pid' ? (pidSteps[Math.min(stepIdx, pidSteps.length - 1)] as PIDStep) : null;
  const currentMPC = mode === 'mpc' ? (mpcSteps[Math.min(stepIdx, mpcSteps.length - 1)] as MPCStep) : null;

  const clampV = (v: number) => Math.max(-1, Math.min(16, v));
  const pidPolylinePoints = allPIDSteps.map(s => `${toX((s as PIDStep).t)},${toY(clampV((s as PIDStep).position))}`).join(' ');
  const mpcPolylinePoints = allMPCSteps.map(s => `${toX((s as MPCStep).t * 0.1)},${toY(clampV((s as MPCStep).currentPos))}`).join(' ');
  const mpcHorizonPoints = currentMPC && currentMPC.horizon.length > 0
    ? [
        `${toX(currentMPC.t * 0.1)},${toY(clampV(currentMPC.currentPos))}`,
        ...currentMPC.horizon.map((h, i) => `${toX((currentMPC.t + i + 1) * 0.1)},${toY(clampV(h))}`),
      ].join(' ')
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.5.3–§26.5.4 Trajectory Tracking Control</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Once we have a path, how do we actually make the robot follow it? Two key approaches:
          <strong style={{ color: CC }}> PID control</strong> (closed-loop feedback)
          and <strong style={{ color: '#8B5CF6' }}>Model Predictive Control (MPC)</strong> (receding horizon planning).
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['pid', 'mpc'] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); reset(); }}
              style={{
                background: mode === m ? `${m === 'pid' ? CC : '#8B5CF6'}20` : '#1A1A24',
                border: `1px solid ${mode === m ? (m === 'pid' ? CC : '#8B5CF6') : 'rgba(255,255,255,0.08)'}`,
                color: mode === m ? (m === 'pid' ? CC : '#8B5CF6') : '#9CA3AF',
                borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}
              aria-pressed={mode === m}>
              {m === 'pid' ? 'PID Controller' : 'MPC (Receding Horizon)'}
            </button>
          ))}
        </div>

        {prefersReducedMotion ? (
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
            Animation disabled. Use step controls to advance.
          </div>
        ) : (
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '8px', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', maxWidth: `${VW}px`, height: 'auto' }}
              role="img" aria-label="Control trajectory chart">
              {/* Grid */}
              {[0, 5, 10, 15].map(v => (
                <g key={v}>
                  <line x1={MARGIN.left} y1={toY(v)} x2={VW - MARGIN.right} y2={toY(v)}
                    stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  <text x={MARGIN.left - 4} y={toY(v) + 4} textAnchor="end" fill="#6B7280" fontSize={8}>{v}</text>
                </g>
              ))}

              {/* Axes */}
              <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={VH - MARGIN.bottom}
                stroke="#4B5563" strokeWidth={1} />
              <line x1={MARGIN.left} y1={VH - MARGIN.bottom} x2={VW - MARGIN.right} y2={VH - MARGIN.bottom}
                stroke="#4B5563" strokeWidth={1} />
              <text x={VW / 2} y={VH - 2} textAnchor="middle" fill="#6B7280" fontSize={8}>Time (s)</text>
              <text x={10} y={VH / 2} textAnchor="middle" fill="#6B7280" fontSize={8}
                transform={`rotate(-90, 10, ${VH / 2})`}>Position</text>

              {/* Setpoint line */}
              <line x1={MARGIN.left} y1={toY(setpoint)} x2={VW - MARGIN.right} y2={toY(setpoint)}
                stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 3" />
              <text x={VW - MARGIN.right - 5} y={toY(setpoint) - 4} textAnchor="end" fill="#10B981" fontSize={8}>
                Setpoint = {setpoint}
              </text>

              {/* Position trajectory */}
              {mode === 'pid' && allPIDSteps.length > 1 && (
                <polyline
                  points={pidPolylinePoints}
                  fill="none" stroke={CC} strokeWidth={2} />
              )}
              {mode === 'mpc' && allMPCSteps.length > 1 && (
                <>
                  <polyline
                    points={mpcPolylinePoints}
                    fill="none" stroke="#8B5CF6" strokeWidth={2} />
                  {/* Planned horizon for current step */}
                  {currentMPC && mpcHorizonPoints && (
                    <polyline
                      points={mpcHorizonPoints}
                      fill="none" stroke="#8B5CF680" strokeWidth={1.5} strokeDasharray="3 2" />
                  )}
                </>
              )}

              {/* Current position indicator */}
              {mode === 'pid' && currentPID && (
                <circle cx={toX(currentPID.t)} cy={toY(clampV(currentPID.position))}
                  r={4} fill={CC} stroke="white" strokeWidth={1} />
              )}
              {mode === 'mpc' && currentMPC && (
                <circle cx={toX(currentMPC.t * 0.1)} cy={toY(clampV(currentMPC.currentPos))}
                  r={4} fill="#8B5CF6" stroke="white" strokeWidth={1} />
              )}
            </svg>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step back">◀ Step</button>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: `${CC}20`, border: `1px solid ${CC}`, borderRadius: '6px', color: CC, padding: '6px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
            aria-label={playing ? 'Pause' : 'Play'}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button onClick={() => setStepIdx(Math.min(totalSteps - 1, stepIdx + 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step forward">Step ▶</button>
          <button onClick={reset}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Reset">↺ Reset</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '12px' }}>
            Speed
            <input type="range" min={1} max={10} value={speed} onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '70px' }} aria-label="Speed" />{speed}×
          </label>
        </div>

        {/* What-if controls */}
        <div style={{ marginTop: '14px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>🔧 What-If Controls</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {mode === 'pid' ? (
              <>
                <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  Kp: <span style={{ color: CC }}>{kp.toFixed(1)}</span>
                  <input type="range" min={0} max={10} step={0.1} value={kp}
                    onChange={e => { setKp(Number(e.target.value)); reset(); }}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Proportional gain" />
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Proportional gain</div>
                </label>
                <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  Ki: <span style={{ color: CC }}>{ki.toFixed(2)}</span>
                  <input type="range" min={0} max={2} step={0.01} value={ki}
                    onChange={e => { setKi(Number(e.target.value)); reset(); }}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Integral gain" />
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Integral gain</div>
                </label>
                <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  Kd: <span style={{ color: CC }}>{kd.toFixed(1)}</span>
                  <input type="range" min={0} max={5} step={0.1} value={kd}
                    onChange={e => { setKd(Number(e.target.value)); reset(); }}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Derivative gain" />
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Derivative gain</div>
                </label>
              </>
            ) : (
              <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                Horizon H: <span style={{ color: CC }}>{horizon}</span>
                <input type="range" min={0} max={15} step={1} value={horizon}
                  onChange={e => { setHorizon(Number(e.target.value)); reset(); }}
                  style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="MPC horizon" />
                <div style={{ fontSize: '10px', color: '#6B7280' }}>H=0: greedy; H=large: more foresight</div>
              </label>
            )}
          </div>
        </div>

        {/* State panel */}
        <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: CC, marginBottom: '8px' }}>State Inspection</div>
          {mode === 'pid' && currentPID && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {[
                { label: 'Time t', value: currentPID.t.toFixed(2) + 's' },
                { label: 'Position', value: currentPID.position.toFixed(3) },
                { label: 'Error', value: currentPID.error.toFixed(3) },
                { label: 'Integral', value: currentPID.integral.toFixed(3) },
                { label: 'Derivative', value: currentPID.derivative.toFixed(3) },
                { label: 'Control u', value: currentPID.control.toFixed(3) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          )}
          {mode === 'mpc' && currentMPC && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {[
                { label: 'Time t', value: String(currentMPC.t) },
                { label: 'Position', value: currentMPC.currentPos.toFixed(3) },
                { label: 'Applied u', value: currentMPC.appliedControl.toFixed(3) },
                { label: 'Horizon len', value: String(currentMPC.horizon.length) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PID intuition */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>PID Controller Intuition</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            {
              term: 'P — Proportional', latex: 'K_P \\cdot e(t)', color: '#F59E0B',
              desc: 'React proportionally to current error. Too high → oscillation. Too low → slow response.',
            },
            {
              term: 'I — Integral', latex: 'K_I \\int e(t)\\,dt', color: '#10B981',
              desc: 'Accumulate past errors. Eliminates steady-state error (offset). Risk: integral windup.',
            },
            {
              term: 'D — Derivative', latex: 'K_D \\cdot \\dot{e}(t)', color: '#8B5CF6',
              desc: 'React to rate of change. Acts as damping — reduces overshoot. Sensitive to noise.',
            },
          ].map(item => (
            <div key={item.term} style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px', border: `1px solid ${item.color}30` }}>
              <div style={{ fontWeight: 700, color: item.color, marginBottom: '4px' }}>{item.term}</div>
              <div style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: renderDisplayMath(item.latex) }} />
              <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '8px', padding: '12px' }}>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('u(t) = K_P \\cdot e(t) + K_I \\int e(t)\\,dt + K_D \\dot{e}(t)') }} />
        </div>
      </div>

      {/* MPC explanation */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>Model Predictive Control (MPC)</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6 }}>
          At each time step: <strong>(1)</strong> plan the optimal trajectory for the next H steps,
          <strong> (2)</strong> apply only the first action, <strong>(3)</strong> replan with new state.
          This "receding horizon" approach handles disturbances automatically because we replan at every step.
        </p>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 600, color: '#8B5CF6', marginBottom: '6px' }}>Advantages over PID</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6 }}>
              ✓ Can handle constraints explicitly (max speed, torque limits)<br />
              ✓ Looks ahead — anticipates future states<br />
              ✓ Natural framework for multi-variable control
            </div>
          </div>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 600, color: '#EF4444', marginBottom: '6px' }}>Challenges</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6 }}>
              ✗ Requires an accurate dynamics model<br />
              ✗ Computational cost grows with horizon H<br />
              ✗ Real-time feasibility can be challenging
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
