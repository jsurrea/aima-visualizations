import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SPRINKLER_NET,
  gibbsSampling,
  enumerationAsk,
  markovBlanket,
  GibbsStep,
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const QUERY = 'Rain';
const EVIDENCE = new Map<string, boolean>([['Sprinkler', true]]);
const NUM_STEPS = 500;
const SEED = 42;
const CHAPTER_COLOR = '#EC4899';
const SPEEDS = [50, 150, 300, 600];
const HISTORY_LEN = 20;

const SPRINKLER_POS: Record<string, { x: number; y: number }> = {
  Cloudy: { x: 150, y: 40 },
  Sprinkler: { x: 70, y: 120 },
  Rain: { x: 230, y: 120 },
  WetGrass: { x: 150, y: 200 },
};
const NODE_R = 24;

function SmallNetSVG({
  currentVar,
  mbVars,
}: {
  currentVar: string | null;
  mbVars: Set<string>;
}) {
  const edges: Array<{ from: string; to: string }> = [];
  SPRINKLER_NET.nodes.forEach((node) => {
    node.parents.forEach((p) => edges.push({ from: p, to: node.name }));
  });

  return (
    <svg
      width="300"
      height="250"
      viewBox="0 0 300 250"
      aria-label="Sprinkler Bayesian network"
      style={{ maxWidth: '100%' }}
    >
      <defs>
        <marker
          id="arrow-gibbs"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
        </marker>
      </defs>
      {edges.map(({ from, to }) => {
        const p1 = SPRINKLER_POS[from];
        const p2 = SPRINKLER_POS[to];
        if (!p1 || !p2) return null;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        return (
          <line
            key={`${from}-${to}`}
            x1={p1.x + nx * NODE_R}
            y1={p1.y + ny * NODE_R}
            x2={p2.x - nx * (NODE_R + 2)}
            y2={p2.y - ny * (NODE_R + 2)}
            stroke="#6B7280"
            strokeWidth={1.5}
            markerEnd="url(#arrow-gibbs)"
          />
        );
      })}
      {SPRINKLER_NET.variables.map((name) => {
        const pos = SPRINKLER_POS[name];
        if (!pos) return null;
        const isEvidence = EVIDENCE.has(name);
        const isCurrent = name === currentVar;
        const isMB = mbVars.has(name);

        let fill = '#242430';
        let stroke = '#4B5563';
        if (isEvidence) {
          fill = '#F59E0B33';
          stroke = '#F59E0B';
        } else if (isCurrent) {
          fill = '#6366F133';
          stroke = '#6366F1';
        } else if (isMB) {
          fill = '#818CF822';
          stroke = '#818CF8';
        }

        const shortNames: Record<string, string> = {
          Cloudy: 'C',
          Sprinkler: 'S',
          Rain: 'R',
          WetGrass: 'WG',
        };

        return (
          <g key={name}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fill="white"
              fontSize={11}
              fontWeight={600}
            >
              {shortNames[name] ?? name.slice(0, 2)}
            </text>
            {isEvidence && (
              <text x={pos.x + NODE_R - 4} y={pos.y - NODE_R + 4} fill="#F59E0B" fontSize={9}>
                e
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MBBarChart({ dist }: { dist: readonly [number, number] }) {
  const [pFalse, pTrue] = dist;
  const maxH = 60;
  return (
    <div
      aria-label={`Markov blanket distribution: P(false)=${pFalse.toFixed(3)}, P(true)=${pTrue.toFixed(3)}`}
      style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: `${maxH + 24}px` }}
    >
      {[
        { label: 'F', value: pFalse, color: '#EF4444' },
        { label: 'T', value: pTrue, color: '#10B981' },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '11px', color, fontWeight: 700 }}>
            {value.toFixed(3)}
          </span>
          <div
            style={{
              width: '32px',
              height: `${Math.max(2, value * maxH)}px`,
              background: color,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.2s',
            }}
          />
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function GibbsViz() {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const speed = SPEEDS[speedIdx] ?? 150;

  const { steps, distribution: finalDist } = useMemo(
    () => gibbsSampling(QUERY, EVIDENCE, SPRINKLER_NET, NUM_STEPS, SEED),
    [],
  );

  const trueValue = useMemo(() => {
    const r = enumerationAsk(QUERY, EVIDENCE, SPRINKLER_NET);
    return r.distribution[1];
  }, []);

  const currentStep: GibbsStep | undefined =
    currentIdx >= 0 ? steps[currentIdx] : undefined;

  const mbVars = useMemo(
    () =>
      currentStep
        ? new Set(markovBlanket(currentStep.sampledVar, SPRINKLER_NET))
        : new Set<string>(),
    [currentStep],
  );

  // History: last HISTORY_LEN states
  const history = useMemo<Array<Readonly<Record<string, boolean>>>>(() => {
    if (currentIdx < 0) return [];
    const start = Math.max(0, currentIdx - HISTORY_LEN + 1);
    return steps.slice(start, currentIdx + 1).map((s) => s.state);
  }, [currentIdx, steps]);

  // Animation
  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    if (currentIdx >= steps.length - 1) {
      setPlaying(false);
      return;
    }

    const frame = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      if (ts - lastTimeRef.current >= speed) {
        lastTimeRef.current = ts;
        setCurrentIdx((prev) => Math.min(prev + 1, steps.length - 1));
      }
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [playing, currentIdx, speed, steps.length, prefersReducedMotion]);

  useEffect(() => {
    if (playing && currentIdx >= steps.length - 1) setPlaying(false);
  }, [playing, currentIdx, steps.length]);

  const handleReset = () => {
    setPlaying(false);
    setCurrentIdx(-1);
    lastTimeRef.current = 0;
  };

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '16px',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid',
    borderColor: active ? CHAPTER_COLOR : 'var(--surface-border)',
    background: active ? CHAPTER_COLOR + '22' : 'var(--surface-3)',
    color: active ? CHAPTER_COLOR : '#9CA3AF',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  });

  const queryVars = SPRINKLER_NET.variables.filter((v) => !EVIDENCE.has(v));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Formula */}
      <div style={panelStyle}>
        <div
          dangerouslySetInnerHTML={{
            __html: renderDisplayMath(
              'P(x_i \\mid \\text{mb}(X_i)) \\propto P(x_i \\mid \\text{parents}(X_i)) \\prod_{Y_j \\in \\text{Children}(X_i)} P(y_j \\mid \\text{parents}(Y_j))',
            ),
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setCurrentIdx((p) => Math.max(-1, p - 1))}
          disabled={currentIdx < 0}
          aria-label="Step back"
          style={{ ...btnStyle(false), opacity: currentIdx < 0 ? 0.4 : 1 }}
        >
          ◀
        </button>
        <button
          onClick={() => {
            lastTimeRef.current = 0;
            setPlaying((p) => !p);
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          style={btnStyle(playing)}
          disabled={prefersReducedMotion}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setCurrentIdx((p) => Math.min(p + 1, steps.length - 1))}
          disabled={currentIdx >= steps.length - 1}
          aria-label="Step forward"
          style={{ ...btnStyle(false), opacity: currentIdx >= steps.length - 1 ? 0.4 : 1 }}
        >
          ▶
        </button>
        <button onClick={handleReset} aria-label="Reset" style={btnStyle(false)}>
          ↺ Reset
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="speed-slider-gibbs" style={{ fontSize: '12px', color: '#9CA3AF' }}>
            Speed
          </label>
          <input
            id="speed-slider-gibbs"
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ accentColor: CHAPTER_COLOR, width: '80px' }}
          />
          <span style={{ fontSize: '11px', color: '#6B7280' }}>{speed}ms</span>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>
          Step {currentIdx >= 0 ? currentIdx + 1 : 0} / {steps.length}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)',
          gap: '16px',
        }}
      >
        {/* Left: network + current step info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              Network
            </h3>
            <SmallNetSVG
              currentVar={currentStep?.sampledVar ?? null}
              mbVars={mbVars}
            />
            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                gap: '12px',
                fontSize: '11px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: '#F59E0B' }}>■ Evidence</span>
              <span style={{ color: '#6366F1' }}>■ Resampled</span>
              <span style={{ color: '#818CF8' }}>■ Markov blanket</span>
            </div>
          </div>

          {currentStep && (
            <div style={panelStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
                Current Step
              </h3>
              <div style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.8 }}>
                <div>
                  Resampling:{' '}
                  <strong style={{ color: '#6366F1' }}>{currentStep.sampledVar}</strong>
                </div>
                <div>
                  New value:{' '}
                  <strong
                    style={{ color: currentStep.newValue ? '#10B981' : '#EF4444' }}
                  >
                    {currentStep.newValue ? 'true' : 'false'}
                  </strong>
                </div>
                <div style={{ marginTop: '8px', color: '#9CA3AF', fontSize: '11px' }}>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderInlineMath(
                        `P(${currentStep.sampledVar}=T|\\text{mb}) = ${currentStep.distribution[1].toFixed(4)}`,
                      ),
                    }}
                  />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <MBBarChart dist={currentStep.distribution} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: history + convergence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Convergence */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                ...panelStyle,
                borderColor: CHAPTER_COLOR,
                background: CHAPTER_COLOR + '11',
              }}
            >
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                Estimate
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: CHAPTER_COLOR }}>
                {currentStep ? currentStep.estimate.toFixed(4) : '—'}
              </div>
              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMath(`\\hat{P}(${QUERY}=T)`),
                  }}
                />
              </div>
            </div>
            <div
              style={{
                ...panelStyle,
                borderColor: '#10B981',
                background: '#10B98111',
              }}
            >
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                True Value
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#10B981' }}>
                {trueValue.toFixed(4)}
              </div>
              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMath(
                      `P(${QUERY}=T \\mid \\text{Sprinkler}=T)`,
                    ),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Counts */}
          {currentStep && (
            <div style={panelStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
                Tally
              </h3>
              <div style={{ fontSize: '12px', color: '#D1D5DB', lineHeight: 1.8 }}>
                <div>
                  <span style={{ color: '#10B981' }}>Rain=T: </span>
                  <strong>{currentStep.countsTrue}</strong>
                </div>
                <div>
                  <span style={{ color: '#EF4444' }}>Rain=F: </span>
                  <strong>{currentStep.countsFalse}</strong>
                </div>
                <div>
                  Total: <strong>{currentStep.countsTrue + currentStep.countsFalse}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Markov chain history */}
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              Chain History (last {HISTORY_LEN})
            </h3>
            {history.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                  <thead>
                    <tr>
                      {queryVars.map((v) => (
                        <th
                          key={v}
                          style={{
                            padding: '3px 6px',
                            color: '#9CA3AF',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--surface-border)',
                          }}
                        >
                          {v.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((state, i) => (
                      <tr
                        key={i}
                        style={{
                          background:
                            i === history.length - 1 ? CHAPTER_COLOR + '22' : undefined,
                        }}
                      >
                        {queryVars.map((v) => (
                          <td
                            key={v}
                            style={{
                              padding: '3px 6px',
                              textAlign: 'center',
                              color: state[v] ? '#10B981' : '#EF4444',
                            }}
                          >
                            {state[v] ? 'T' : 'F'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: '#6B7280', fontSize: '12px' }}>
                Press Play or Step Forward to begin sampling.
              </div>
            )}
          </div>

          {/* Final result */}
          {currentIdx >= steps.length - 1 && steps.length > 0 && (
            <div
              style={{
                ...panelStyle,
                borderColor: CHAPTER_COLOR,
                background: CHAPTER_COLOR + '11',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: CHAPTER_COLOR }}>
                Final Result ({NUM_STEPS} steps)
              </h3>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderDisplayMath(
                    `P(${QUERY}=T|\\mathbf{e}) \\approx ${finalDist[1].toFixed(4)}`,
                  ),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
