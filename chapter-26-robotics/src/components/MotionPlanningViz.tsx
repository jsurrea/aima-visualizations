import React, { useState, useCallback, useEffect, useRef } from 'react';
import { buildRRT, buildPRM, type RRTStep, type PRMStep, type Point2D, type Rect } from '../algorithms/index';

const CC = '#F59E0B';
const W = 340;
const H = 260;

const MAX_ITERATIONS = 200;
const GOAL_RADIUS = 15;
const PRM_MILESTONES = 40;

const DEFAULT_OBSTACLES: Rect[] = [
  { x: 80, y: 40, width: 50, height: 120 },
  { x: 200, y: 100, width: 60, height: 130 },
];

const START: Point2D = { x: 20, y: 200 };
const GOAL: Point2D = { x: 310, y: 40 };

type Algorithm = 'rrt' | 'prm';

export default function MotionPlanningViz() {
  const [algo, setAlgo] = useState<Algorithm>('rrt');
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [seed, setSeed] = useState(42);
  const [goalBias, setGoalBias] = useState(0.15);
  const [stepSize, setStepSize] = useState(20);
  const [connectRadius, setConnectRadius] = useState(80);

  const rrtSteps = buildRRT(START, GOAL, DEFAULT_OBSTACLES, W, H, MAX_ITERATIONS, stepSize, goalBias, GOAL_RADIUS, seed);
  const prmSteps = buildPRM(START, GOAL, DEFAULT_OBSTACLES, W, H, PRM_MILESTONES, connectRadius, seed);

  const steps = algo === 'rrt' ? rrtSteps : prmSteps;
  const totalSteps = steps.length;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const interval = 1000 / (speed * 4);
    if (now - lastTimeRef.current >= interval) {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
      lastTimeRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, totalSteps]);

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  const reset = () => {
    setStepIdx(0);
    setPlaying(false);
  };

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const currentStep = steps[Math.min(stepIdx, totalSteps - 1)];

  // RRT rendering
  const renderRRT = (step: RRTStep) => (
    <>
      {/* Obstacles */}
      {DEFAULT_OBSTACLES.map((obs, i) => (
        <rect key={i} x={obs.x} y={obs.y} width={obs.width} height={obs.height}
          fill="#EF444430" stroke="#EF4444" strokeWidth={1.5} />
      ))}

      {/* Tree edges */}
      {step.tree.slice(1).map(node => {
        const parent = step.tree.find(n => n.id === node.parentId);
        if (!parent) return null;
        return (
          <line key={node.id}
            x1={parent.pos.x} y1={parent.pos.y}
            x2={node.pos.x} y2={node.pos.y}
            stroke="#3B82F640" strokeWidth={1} />
        );
      })}

      {/* Solution path */}
      {step.path.length > 1 && (
        <polyline
          points={step.path.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" />
      )}

      {/* Sample point */}
      <circle cx={step.sample.x} cy={step.sample.y} r={4}
        fill="transparent" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="3 2" />

      {/* New node */}
      {step.newNode && (
        <circle cx={step.newNode.pos.x} cy={step.newNode.pos.y} r={4}
          fill={CC} opacity={0.9} />
      )}

      {/* Start & Goal */}
      <circle cx={START.x} cy={START.y} r={7} fill="#10B981" stroke="white" strokeWidth={1.5} />
      <text x={START.x} y={START.y + 18} textAnchor="middle" fill="#10B981" fontSize={9} fontWeight={700}>START</text>
      <circle cx={GOAL.x} cy={GOAL.y} r={7} fill="#6366F1" stroke="white" strokeWidth={1.5} />
      <text x={GOAL.x} y={GOAL.y + 18} textAnchor="middle" fill="#6366F1" fontSize={9} fontWeight={700}>GOAL</text>
    </>
  );

  // PRM rendering
  const renderPRM = (step: PRMStep) => (
    <>
      {/* Obstacles */}
      {DEFAULT_OBSTACLES.map((obs, i) => (
        <rect key={i} x={obs.x} y={obs.y} width={obs.width} height={obs.height}
          fill="#EF444430" stroke="#EF4444" strokeWidth={1.5} />
      ))}

      {/* Roadmap edges */}
      {step.edges.map((edge, i) => {
        const from = step.nodes.find(n => n.id === edge.from);
        const to = step.nodes.find(n => n.id === edge.to);
        if (!from || !to) return null;
        return (
          <line key={i}
            x1={from.pos.x} y1={from.pos.y}
            x2={to.pos.x} y2={to.pos.y}
            stroke="#8B5CF640" strokeWidth={1} />
        );
      })}

      {/* Solution path */}
      {step.path.length > 1 && (
        <polyline
          points={step.path.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" />
      )}

      {/* Milestones */}
      {step.nodes.slice(2).map(node => (
        <circle key={node.id} cx={node.pos.x} cy={node.pos.y} r={3}
          fill="#8B5CF6" opacity={0.8} />
      ))}

      {/* Start & Goal */}
      <circle cx={START.x} cy={START.y} r={7} fill="#10B981" stroke="white" strokeWidth={1.5} />
      <text x={START.x} y={START.y + 18} textAnchor="middle" fill="#10B981" fontSize={9} fontWeight={700}>START</text>
      <circle cx={GOAL.x} cy={GOAL.y} r={7} fill="#6366F1" stroke="white" strokeWidth={1.5} />
      <text x={GOAL.x} y={GOAL.y + 18} textAnchor="middle" fill="#6366F1" fontSize={9} fontWeight={700}>GOAL</text>
    </>
  );

  const solved = currentStep ? ('solved' in currentStep && currentStep.solved) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Concept explanation */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.5.2 Motion Planning</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
          The <strong style={{ color: CC }}>motion planning problem</strong> (also called the "piano mover's problem"):
          find a collision-free path from start configuration q_s to goal q_g.
          Exact methods (visibility graphs, cell decomposition) become intractable at high DOF — so
          we use <strong style={{ color: CC }}>randomized sampling</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 700, color: '#F59E0B', marginBottom: '6px' }}>RRT (Rapidly-exploring Random Tree)</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6 }}>
              Grows a tree from start by sampling random points and extending toward them.
              Good for <strong style={{ color: 'white' }}>single-query</strong> planning.
              Not optimal, but fast and widely used.
            </div>
          </div>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 700, color: '#8B5CF6', marginBottom: '6px' }}>PRM (Probabilistic Roadmap)</div>
            <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6 }}>
              Pre-builds a roadmap by sampling milestones and connecting nearby ones.
              Great for <strong style={{ color: 'white' }}>multi-query</strong> planning in the same environment.
              Probabilistically complete.
            </div>
          </div>
        </div>

        {/* Algorithm selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['rrt', 'prm'] as Algorithm[]).map(a => (
            <button key={a}
              onClick={() => { setAlgo(a); reset(); }}
              style={{
                background: algo === a ? `${a === 'rrt' ? CC : '#8B5CF6'}20` : '#1A1A24',
                border: `1px solid ${algo === a ? (a === 'rrt' ? CC : '#8B5CF6') : 'rgba(255,255,255,0.08)'}`,
                color: algo === a ? (a === 'rrt' ? CC : '#8B5CF6') : '#9CA3AF',
                borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}
              aria-pressed={algo === a}
            >
              {a.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Visualization */}
        {prefersReducedMotion ? (
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
            Animation disabled (prefers-reduced-motion). Use step controls below.
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: '480px', height: 'auto', background: '#1A1A24', borderRadius: '8px', display: 'block' }}
            role="img" aria-label={`${algo.toUpperCase()} motion planning visualization`}>
            {currentStep && (
              algo === 'rrt'
                ? renderRRT(currentStep as RRTStep)
                : renderPRM(currentStep as PRMStep)
            )}
          </svg>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step back">
            ◀ Step
          </button>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: `${CC}20`, border: `1px solid ${CC}`, borderRadius: '6px', color: CC, padding: '6px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
            aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={() => setStepIdx(Math.min(totalSteps - 1, stepIdx + 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step forward">
            Step ▶
          </button>
          <button onClick={reset}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Reset">
            ↺ Reset
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '12px' }}>
            Speed
            <input type="range" min={1} max={10} value={speed} onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '80px' }} aria-label="Animation speed" />
            {speed}×
          </label>
        </div>

        {/* Step counter */}
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
          Step {stepIdx + 1} / {totalSteps} {solved ? '✅ Path found!' : ''}
        </div>

        {/* Current step action */}
        {currentStep && (
          <div style={{ marginTop: '8px', background: '#0A0A0F', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#D1D5DB', fontFamily: 'monospace' }}>
            {currentStep.action}
          </div>
        )}

        {/* What-if controls */}
        <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>
            🔧 What-If Controls
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {algo === 'rrt' ? (
              <>
                <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  Goal Bias: <span style={{ color: CC }}>{(goalBias * 100).toFixed(0)}%</span>
                  <input type="range" min={0} max={0.5} step={0.05} value={goalBias}
                    onChange={e => { setGoalBias(Number(e.target.value)); reset(); }}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }}
                    aria-label="Goal bias probability" />
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Higher = faster convergence but less exploration</div>
                </label>
                <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  Step Size: <span style={{ color: CC }}>{stepSize}</span>
                  <input type="range" min={5} max={50} step={5} value={stepSize}
                    onChange={e => { setStepSize(Number(e.target.value)); reset(); }}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }}
                    aria-label="RRT step size" />
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Larger = coarser but faster exploration</div>
                </label>
              </>
            ) : (
              <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                Connection Radius: <span style={{ color: CC }}>{connectRadius}</span>
                <input type="range" min={30} max={150} step={10} value={connectRadius}
                  onChange={e => { setConnectRadius(Number(e.target.value)); reset(); }}
                  style={{ display: 'block', width: '100%', marginTop: '4px' }}
                  aria-label="PRM connection radius" />
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Larger = denser graph but more edges to check</div>
              </label>
            )}
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Random Seed: <span style={{ color: CC }}>{seed}</span>
              <input type="range" min={1} max={100} value={seed}
                onChange={e => { setSeed(Number(e.target.value)); reset(); }}
                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                aria-label="Random seed" />
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Different seeds give different random paths</div>
            </label>
          </div>
        </div>

        {/* State inspection panel */}
        <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: CC, marginBottom: '8px' }}>State Inspection</div>
          {algo === 'rrt' && currentStep && 'tree' in currentStep ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Tree Nodes', value: (currentStep as RRTStep).tree.length },
                { label: 'Sample', value: `(${(currentStep as RRTStep).sample.x.toFixed(0)}, ${(currentStep as RRTStep).sample.y.toFixed(0)})` },
                { label: 'Status', value: (currentStep as RRTStep).solved ? 'SOLVED ✅' : 'Searching...' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : algo === 'prm' && currentStep && 'nodes' in currentStep ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Milestones', value: (currentStep as PRMStep).nodes.length },
                { label: 'Edges', value: (currentStep as PRMStep).edges.length },
                { label: 'Status', value: (currentStep as PRMStep).solved ? 'SOLVED ✅' : 'Searching...' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Comparison: RRT vs RRT* concept */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>RRT vs RRT* vs Trajectory Optimization</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            {
              name: 'RRT', color: CC, optimal: false,
              desc: 'Fast but non-optimal. Solutions look random and jagged. Often post-processed with "short-cutting".',
            },
            {
              name: 'RRT*', color: '#10B981', optimal: true,
              desc: 'Asymptotically optimal: rewires tree to choose parents by cost-to-come. Converges to optimal with more samples.',
            },
            {
              name: 'Trajectory Opt.', color: '#8B5CF6', optimal: true,
              desc: 'Starts with infeasible straight-line path, pushes it out of collision via gradient descent on a cost functional.',
            },
          ].map(item => (
            <div key={item.name} style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px', border: `1px solid ${item.color}30` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: item.color }}>{item.name}</span>
                <span style={{ fontSize: '11px', color: item.optimal ? '#10B981' : '#EF4444' }}>
                  {item.optimal ? '✓ Optimal' : '✗ Non-optimal'}
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
