import React, { useState } from 'react';
import { inferHumanGoal, simulateFSM, type Point2D, type GridAction, type FSMState, type FSMTransition } from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const CC = '#F59E0B';

// §26.8 Human-Robot Interaction
const GRID_SIZE = 6;
const GOALS: Point2D[] = [
  { x: 0, y: 0 },   // Top-left
  { x: 5, y: 0 },   // Top-right
  { x: 2, y: 5 },   // Bottom-center
];
const GOAL_LABELS = ['Coffee machine', 'Exit door', 'Printer'];
const GOAL_COLORS = ['#10B981', '#6366F1', '#EC4899'];

const ACTIONS: GridAction[] = [
  { dx: 1, dy: 0, label: '→ right' },
  { dx: -1, dy: 0, label: '← left' },
  { dx: 0, dy: -1, label: '↑ up' },
  { dx: 0, dy: 1, label: '↓ down' },
];

// §26.9 FSM for hexapod gait
const HEXAPOD_STATES: FSMState[] = [
  { id: 'stance', label: 'Stance', action: 'Support body weight' },
  { id: 'swing_front', label: 'Swing Front', action: 'Lift front leg' },
  { id: 'swing_mid', label: 'Swing Middle', action: 'Lift middle leg' },
  { id: 'swing_rear', label: 'Swing Rear', action: 'Lift rear leg' },
  { id: 'obstacle', label: 'Obstacle Detected', action: 'Stop and assess' },
  { id: 'recovery', label: 'Recovery', action: 'Rebalance legs' },
];

const HEXAPOD_TRANSITIONS: FSMTransition[] = [
  { from: 'stance', to: 'swing_front', condition: 'cycle_tick' },
  { from: 'swing_front', to: 'swing_mid', condition: 'foot_contact' },
  { from: 'swing_mid', to: 'swing_rear', condition: 'foot_contact' },
  { from: 'swing_rear', to: 'stance', condition: 'foot_contact' },
  { from: 'stance', to: 'obstacle', condition: 'obstacle_detected' },
  { from: 'obstacle', to: 'recovery', condition: 'obstacle_cleared' },
  { from: 'recovery', to: 'stance', condition: 'stable' },
];

const SENSOR_SEQ = [
  'cycle_tick', 'foot_contact', 'foot_contact', 'foot_contact',
  'cycle_tick', 'foot_contact', 'obstacle_detected', 'obstacle_cleared', 'stable',
  'cycle_tick', 'foot_contact', 'foot_contact', 'foot_contact',
];

export default function HumanRobotViz() {
  const [tab, setTab] = useState<'human' | 'reactive'>('human');

  // §26.8 state
  const [robotPos, setRobotPos] = useState<Point2D>({ x: 3, y: 3 });
  const [humanPos, setHumanPos] = useState<Point2D>({ x: 1, y: 1 });
  const [lastAction, setLastAction] = useState<GridAction>(ACTIONS[0]!);
  const [beta, setBeta] = useState(3);
  const [priors, setPriors] = useState([1 / 3, 1 / 3, 1 / 3]);

  const posterior = inferHumanGoal(humanPos, GOALS, priors, lastAction, ACTIONS, beta);

  const moveHuman = (action: GridAction) => {
    const nx = Math.max(0, Math.min(GRID_SIZE - 1, humanPos.x + action.dx));
    const ny = Math.max(0, Math.min(GRID_SIZE - 1, humanPos.y + action.dy));
    // Update priors to be the posterior
    const newPriors = posterior.map(p => p) as number[];
    setHumanPos({ x: nx, y: ny });
    setLastAction(action);
    setPriors(newPriors);
  };

  const resetHuman = () => {
    setHumanPos({ x: 1, y: 1 });
    setLastAction(ACTIONS[0]!);
    setPriors([1 / 3, 1 / 3, 1 / 3]);
  };

  // §26.9 FSM state
  const [fsmStepIdx, setFsmStepIdx] = useState(0);
  const fsmSteps = simulateFSM(HEXAPOD_STATES, HEXAPOD_TRANSITIONS, 'stance', SENSOR_SEQ);

  const currentFsmStep = fsmSteps[fsmStepIdx];
  const currentFsmState = HEXAPOD_STATES.find(s => s.id === currentFsmStep?.stateId);

  const cellSize = 50;
  const CELL = cellSize;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['human', 'reactive'] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? `${CC}20` : '#1A1A24',
                border: `1px solid ${tab === t ? CC : 'rgba(255,255,255,0.08)'}`,
                color: tab === t ? CC : '#9CA3AF',
                borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}
              aria-pressed={tab === t}>
              {t === 'human' ? '§26.8 Human Intent Inference' : '§26.9 Reactive Controllers'}
            </button>
          ))}
        </div>

        {tab === 'human' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.8 Humans and Robots — Intent Inference</h3>
            <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              The robot observes a human's actions and infers their goal using <strong style={{ color: CC }}>Boltzmann rationality</strong>:
              humans are noisily rational — they tend to take actions that minimize cost to their goal, but with some randomness.
              The robot updates its belief about the human's goal with each observed action.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
              {/* Grid world */}
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  Click arrows to move the human 🚶. The robot 🤖 updates its belief about the human's goal.
                </div>
                <svg
                  viewBox={`0 0 ${GRID_SIZE * CELL} ${GRID_SIZE * CELL}`}
                  style={{ width: '100%', maxWidth: `${GRID_SIZE * CELL}px`, height: 'auto', background: '#1A1A24', borderRadius: '8px', display: 'block' }}
                  role="img" aria-label="Grid world for human intent inference"
                >
                  {/* Grid lines */}
                  {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
                    <g key={i}>
                      <line x1={i * CELL} y1={0} x2={i * CELL} y2={GRID_SIZE * CELL} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                      <line x1={0} y1={i * CELL} x2={GRID_SIZE * CELL} y2={i * CELL} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                    </g>
                  ))}

                  {/* Goals */}
                  {GOALS.map((g, i) => (
                    <g key={i}>
                      <rect x={g.x * CELL + 2} y={g.y * CELL + 2} width={CELL - 4} height={CELL - 4}
                        fill={`${GOAL_COLORS[i]}20`} stroke={GOAL_COLORS[i]} strokeWidth={1.5} rx={4} />
                      <text x={g.x * CELL + CELL / 2} y={g.y * CELL + CELL / 2 + 4}
                        textAnchor="middle" fill={GOAL_COLORS[i]!} fontSize={10} fontWeight={700}>
                        G{i + 1}
                      </text>
                      <text x={g.x * CELL + CELL / 2} y={g.y * CELL + CELL / 2 + 16}
                        textAnchor="middle" fill={GOAL_COLORS[i]!} fontSize={7}>
                        {(posterior[i]! * 100).toFixed(0)}%
                      </text>
                    </g>
                  ))}

                  {/* Human */}
                  <text x={humanPos.x * CELL + CELL / 2} y={humanPos.y * CELL + CELL / 2 + 6}
                    textAnchor="middle" fontSize={20}>🚶</text>

                  {/* Robot */}
                  <text x={robotPos.x * CELL + CELL / 2} y={robotPos.y * CELL + CELL / 2 + 6}
                    textAnchor="middle" fontSize={18}>🤖</text>
                </svg>

                {/* Move controls */}
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', maxWidth: '150px' }}>
                  <div />
                  <button onClick={() => moveHuman(ACTIONS[2]!)}
                    style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px', cursor: 'pointer', fontSize: '16px' }}
                    aria-label="Move human up">↑</button>
                  <div />
                  <button onClick={() => moveHuman(ACTIONS[1]!)}
                    style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px', cursor: 'pointer', fontSize: '16px' }}
                    aria-label="Move human left">←</button>
                  <button onClick={resetHuman}
                    style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '6px', cursor: 'pointer', fontSize: '11px' }}
                    aria-label="Reset human">↺</button>
                  <button onClick={() => moveHuman(ACTIONS[0]!)}
                    style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px', cursor: 'pointer', fontSize: '16px' }}
                    aria-label="Move human right">→</button>
                  <div />
                  <button onClick={() => moveHuman(ACTIONS[3]!)}
                    style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px', cursor: 'pointer', fontSize: '16px' }}
                    aria-label="Move human down">↓</button>
                  <div />
                </div>
              </div>

              {/* Belief bars */}
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '8px' }}>
                  Robot's Belief P(goal | actions)
                </div>
                {GOALS.map((g, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', color: GOAL_COLORS[i] }}>
                        G{i + 1}: {GOAL_LABELS[i]}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: GOAL_COLORS[i] }}>
                        {(posterior[i]! * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: '12px', background: '#1A1A24', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${posterior[i]! * 100}%`, height: '100%',
                        background: GOAL_COLORS[i], borderRadius: '6px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: CC, marginBottom: '6px' }}>β (rationality)</div>
                  <input type="range" min={0.5} max={10} step={0.5} value={beta}
                    onChange={e => setBeta(Number(e.target.value))}
                    style={{ width: '100%' }} aria-label="Rationality coefficient beta" />
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                    β={beta} — higher = human acts more rationally toward goal
                  </div>
                </div>
              </div>
            </div>

            {/* Key equation */}
            <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '8px', padding: '12px' }}>
              <div
                dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(a \\mid g) \\propto \\exp(-\\beta \\cdot Q(s, a; g))') }}
                style={{ marginBottom: '8px' }}
              />
              <div
                dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(g \\mid a) \\propto P(a \\mid g) \\cdot P(g)') }}
              />
            </div>
          </div>
        )}

        {tab === 'reactive' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.9 Reactive Controllers & Subsumption</h3>
            <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              Rodney Brooks proposed replacing complex deliberative reasoning with layers of simple
              <strong style={{ color: CC }}> reactive behaviors</strong>. A hexapod robot's gait can be implemented
              as a finite state machine (FSM) — no explicit world model needed!
              Lower behavior layers (walk) can be "subsumed" by higher ones (avoid obstacle).
            </p>

            {/* FSM diagram */}
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox="0 0 600 200" style={{ width: '100%', maxWidth: '600px', height: 'auto', background: '#1A1A24', borderRadius: '8px' }}
                role="img" aria-label="Hexapod FSM diagram">
                {/* States */}
                {HEXAPOD_STATES.map((state, i) => {
                  const positions = [
                    [80, 80], [200, 40], [320, 40], [440, 40],
                    [80, 150], [220, 150],
                  ] as [number, number][];
                  const [sx, sy] = positions[i]!;
                  const isActive = currentFsmStep?.stateId === state.id;
                  return (
                    <g key={state.id}>
                      <ellipse cx={sx} cy={sy} rx={45} ry={22}
                        fill={isActive ? `${CC}30` : '#242430'}
                        stroke={isActive ? CC : '#4B5563'}
                        strokeWidth={isActive ? 2 : 1} />
                      <text x={sx} y={sy + 4} textAnchor="middle"
                        fill={isActive ? CC : '#D1D5DB'} fontSize={9} fontWeight={isActive ? 700 : 400}>
                        {state.label}
                      </text>
                    </g>
                  );
                })}

                {/* Simple arrows for main gait cycle */}
                {[
                  { x1: 125, y1: 40, x2: 155, y2: 40, label: 'tick' },
                  { x1: 245, y1: 40, x2: 275, y2: 40, label: 'contact' },
                  { x1: 365, y1: 40, x2: 395, y2: 40, label: 'contact' },
                ].map((arrow, i) => (
                  <g key={i}>
                    <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2}
                      stroke="#6B7280" strokeWidth={1}
                      markerEnd="url(#arrowhead)" />
                    <text x={(arrow.x1 + arrow.x2) / 2} y={arrow.y1 - 5}
                      textAnchor="middle" fill="#6B7280" fontSize={7}>{arrow.label}</text>
                  </g>
                ))}

                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#6B7280" />
                  </marker>
                </defs>

                {/* Return arrow */}
                <path d="M 485 40 Q 560 80 80 80" fill="none" stroke="#6B7280" strokeWidth={1}
                  strokeDasharray="3 2" markerEnd="url(#arrowhead)" />
                <text x={360} y={75} fill="#6B7280" fontSize={7}>contact</text>
              </svg>
            </div>

            {/* FSM step controls */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                Sensor sequence: {SENSOR_SEQ.join(' → ')}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setFsmStepIdx(Math.max(0, fsmStepIdx - 1))}
                  style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
                  aria-label="Previous FSM step">◀ Prev</button>
                <button onClick={() => setFsmStepIdx(Math.min(fsmSteps.length - 1, fsmStepIdx + 1))}
                  style={{ background: `${CC}20`, border: `1px solid ${CC}`, borderRadius: '6px', color: CC, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                  aria-label="Next FSM step">Next ▶</button>
                <button onClick={() => setFsmStepIdx(0)}
                  style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
                  aria-label="Reset FSM">↺ Reset</button>
                <span style={{ color: '#6B7280', fontSize: '12px' }}>
                  Step {fsmStepIdx + 1} / {fsmSteps.length}
                </span>
              </div>

              {/* State inspection */}
              {currentFsmStep && (
                <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                    {[
                      { label: 'Current State', value: currentFsmState?.label ?? currentFsmStep.stateId },
                      { label: 'Sensor Input', value: currentFsmStep.sensorReading },
                      { label: 'Transition', value: currentFsmStep.triggered ? `→ ${currentFsmStep.triggered.to}` : 'None' },
                      { label: 'Action', value: currentFsmState?.action ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                        <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                        <div style={{ color: 'white', fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#111118', borderRadius: '6px', padding: '8px', fontFamily: 'monospace', color: '#D1D5DB' }}>
                    {currentFsmStep.action}
                  </div>
                </div>
              )}
            </div>

            {/* Subsumption architecture */}
            <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontWeight: 700, color: CC, marginBottom: '10px', fontSize: '13px' }}>Subsumption Architecture Layers</div>
              {[
                { level: 'Level 2 (top)', name: 'Explore', desc: 'Wander to new areas when nothing else is active', color: '#EC4899' },
                { level: 'Level 1', name: 'Avoid Objects', desc: 'Halt and turn when obstacle detected — subsumes Level 0', color: CC },
                { level: 'Level 0 (base)', name: 'Walk', desc: 'Basic cyclic walking gait FSM — runs by default', color: '#10B981' },
              ].map(layer => (
                <div key={layer.name} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  background: '#111118', borderRadius: '6px', padding: '10px', marginBottom: '6px',
                  borderLeft: `3px solid ${layer.color}`,
                }}>
                  <div style={{ minWidth: '80px', fontSize: '10px', color: layer.color, fontWeight: 600 }}>{layer.level}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{layer.name}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{layer.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
