import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  POMDP, BeliefState, AlphaVector,
  runPOMDPValueIteration, beliefUpdate, maxAlpha, dotBelief,
  actionKey, transKey,
} from '../algorithms/index';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';
const SURFACE2 = '#1A1A24';
const SURFACE3 = '#242430';
const BORDER = 'rgba(255,255,255,0.08)';

const cardStyle: React.CSSProperties = {
  background: '#111118',
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
};

const btnStyle = (active?: boolean): React.CSSProperties => ({
  background: active ? CHAPTER_COLOR : SURFACE3,
  color: active ? 'white' : '#9CA3AF',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '14px',
});

const ALPHA_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#60A5FA', '#34D399', '#A78BFA', '#FB923C'];

/** Build the 2-state POMDP (A/B) given sensor accuracy. */
function buildABPomdp(sensorAccuracy: number): POMDP {
  const states = ['A', 'B'];
  const terminalStates: string[] = [];
  const actions = ['Stay', 'Go'];
  const observationSpace = ['seeA', 'seeB'];
  const gamma = 0.9;

  const transitions = new Map<string, Array<{ state: string; prob: number }>>();
  // Stay: stay in same state
  transitions.set(actionKey('A', 'Stay'), [{ state: 'A', prob: 1.0 }]);
  transitions.set(actionKey('B', 'Stay'), [{ state: 'B', prob: 1.0 }]);
  // Go: swap states
  transitions.set(actionKey('A', 'Go'), [{ state: 'B', prob: 1.0 }]);
  transitions.set(actionKey('B', 'Go'), [{ state: 'A', prob: 1.0 }]);

  const rewards = new Map<string, number>();
  // R(A, Stay, A) = 1
  rewards.set(transKey('A', 'Stay', 'A'), 1.0);
  // R(B, Stay, B) = -1
  rewards.set(transKey('B', 'Stay', 'B'), -1.0);
  // All others = 0 (Go transitions, etc.)
  rewards.set(transKey('A', 'Go', 'B'), 0.0);
  rewards.set(transKey('B', 'Go', 'A'), 0.0);

  // P(obs | s'): sensor model
  const acc = Math.min(0.99, Math.max(0.51, sensorAccuracy));
  const observations = new Map<string, number>();
  observations.set('A|seeA', acc);
  observations.set('A|seeB', 1 - acc);
  observations.set('B|seeB', acc);
  observations.set('B|seeA', 1 - acc);

  return { states, terminalStates, actions, transitions, rewards, observations, observationSpace, gamma };
}

/** SVG alpha-vector plot. */
function AlphaVectorPlot({
  alphas,
  beliefB,
  width = 380,
  height = 220,
}: {
  alphas: ReadonlyArray<AlphaVector>;
  beliefB: number;
  width?: number;
  height?: number;
}) {
  const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
  const iW = width - PAD.left - PAD.right;
  const iH = height - PAD.top - PAD.bottom;

  // Compute value range
  let minV = Infinity;
  let maxV = -Infinity;
  for (const alpha of alphas) {
    const vA = alpha.values.get('A') ?? 0;
    const vB = alpha.values.get('B') ?? 0;
    if (vA < minV) minV = vA;
    if (vB < minV) minV = vB;
    if (vA > maxV) maxV = vA;
    if (vB > maxV) maxV = vB;
  }
  if (maxV - minV < 0.5) {
    const mid = (maxV + minV) / 2;
    minV = mid - 0.5;
    maxV = mid + 0.5;
  }

  const xScale = (b: number) => PAD.left + b * iW;
  const yScale = (v: number) => PAD.top + iH - ((v - minV) / (maxV - minV)) * iH;

  // Compute upper envelope at N points
  const N = 200;
  const envelopePoints: string[] = [];
  for (let i = 0; i <= N; i++) {
    const b = i / N;
    const belief: BeliefState = new Map([['A', 1 - b], ['B', b]]);
    const v = maxAlpha(belief, alphas);
    envelopePoints.push(`${xScale(b).toFixed(1)},${yScale(v).toFixed(1)}`);
  }

  // Current belief value
  const curBelief: BeliefState = new Map([['A', 1 - beliefB], ['B', beliefB]]);
  const curV = maxAlpha(curBelief, alphas);
  const cx = xScale(beliefB);
  const cy = yScale(curV);

  // Y tick labels
  const yTicks = [minV, minV + (maxV - minV) / 2, maxV];

  return (
    <svg
      width={width} height={height}
      role="img"
      aria-label={`Alpha vector plot at current depth. ${alphas.length} vectors. Current belief b(B)=${beliefB.toFixed(2)}, value=${curV.toFixed(3)}`}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      {/* Grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yScale(v)} x2={PAD.left + iW} y2={yScale(v)} stroke="#1F2937" strokeWidth={1} />
          <text x={PAD.left - 4} y={yScale(v) + 4} fill="#9CA3AF" fontSize={9} textAnchor="end">{v.toFixed(2)}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />

      {/* X tick labels */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(b => (
        <text key={b} x={xScale(b)} y={PAD.top + iH + 14} fill="#9CA3AF" fontSize={9} textAnchor="middle">
          {b.toFixed(2)}
        </text>
      ))}
      <text x={PAD.left + iW / 2} y={height - 4} fill="#9CA3AF" fontSize={10} textAnchor="middle">b(B)</text>
      <text x={12} y={PAD.top + iH / 2} fill="#9CA3AF" fontSize={10} textAnchor="middle"
        transform={`rotate(-90, 12, ${PAD.top + iH / 2})`}>Value</text>

      {/* Individual alpha vectors as lines from b=0 to b=1 */}
      {alphas.map((alpha, i) => {
        const vA = alpha.values.get('A') ?? 0;
        const vB = alpha.values.get('B') ?? 0;
        const color = ALPHA_COLORS[i % ALPHA_COLORS.length] ?? '#9CA3AF';
        return (
          <line
            key={i}
            x1={xScale(0)} y1={yScale(vA)}
            x2={xScale(1)} y2={yScale(vB)}
            stroke={color}
            strokeWidth={1}
            opacity={0.5}
            strokeDasharray="4,3"
          />
        );
      })}

      {/* Upper envelope */}
      <polyline
        points={envelopePoints.join(' ')}
        fill="none"
        stroke={CHAPTER_COLOR}
        strokeWidth={2.5}
      />

      {/* Current belief point */}
      <line
        x1={cx} y1={PAD.top}
        x2={cx} y2={PAD.top + iH}
        stroke="white" strokeWidth={1} strokeDasharray="3,3" opacity={0.4}
      />
      <circle cx={cx} cy={cy} r={6} fill={CHAPTER_COLOR} stroke="white" strokeWidth={2} />
      <text x={cx} y={cy - 10} fill="white" fontSize={9} textAnchor="middle">{curV.toFixed(3)}</text>
    </svg>
  );
}

export default function POMDPViz() {
  const [sensorAccuracy, setSensorAccuracy] = useState(0.9);
  const [beliefB, setBeliefB] = useState(0.5);
  const [depth, setDepth] = useState(4);
  const [maxDepth, setMaxDepth] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Belief update controls
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastObs, setLastObs] = useState<string | null>(null);
  const [updatedBelief, setUpdatedBelief] = useState<BeliefState | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const pomdp = useMemo(() => buildABPomdp(sensorAccuracy), [sensorAccuracy]);

  const allAlphas = useMemo<ReadonlyArray<ReadonlyArray<AlphaVector>>>(() =>
    runPOMDPValueIteration(pomdp, maxDepth),
    [pomdp, maxDepth],
  );

  const currentAlphas = allAlphas[depth] ?? allAlphas[allAlphas.length - 1] ?? [];

  // Reset belief update when pomdp changes
  useEffect(() => {
    setUpdatedBelief(null);
    setLastAction(null);
    setLastObs(null);
  }, [pomdp]);

  const play = useCallback(() => {
    if (prefersReducedMotion) { setDepth(maxDepth); return; }
    if (depth >= maxDepth) setDepth(0);
    setPlaying(true);
  }, [prefersReducedMotion, depth, maxDepth]);

  useEffect(() => {
    if (!playing) return;
    const delay = 1200 / speed;
    const tick = (time: number) => {
      if (time - lastTimeRef.current >= delay) {
        lastTimeRef.current = time;
        setDepth(prev => {
          if (prev >= maxDepth) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, maxDepth]);

  const handleBeliefUpdate = useCallback((action: string, obs: string) => {
    const b: BeliefState = new Map([['A', 1 - beliefB], ['B', beliefB]]);
    const bNext = beliefUpdate(pomdp, b, action, obs);
    setUpdatedBelief(bNext);
    setLastAction(action);
    setLastObs(obs);
    const newBeliefB = bNext.get('B') ?? 0.5;
    setBeliefB(newBeliefB);
  }, [pomdp, beliefB]);

  const curBelief: BeliefState = new Map([['A', 1 - beliefB], ['B', beliefB]]);
  const curValue = currentAlphas.length > 0 ? maxAlpha(curBelief, currentAlphas) : 0;

  // Best action at current belief
  let bestAction = '?';
  let bestV = -Infinity;
  for (const alpha of currentAlphas) {
    const v = dotBelief(curBelief, alpha);
    if (v > bestV) { bestV = v; bestAction = alpha.action; }
  }

  return (
    <div style={cardStyle} role="region" aria-label="POMDP visualization">
      <h2 style={{ color: CHAPTER_COLOR, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        POMDP Belief Updates &amp; Value Iteration (§16.4–16.5)
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '12px' }}>
        Two-state POMDP (A and B). The agent stays in A for reward +1, B for -1. Partial observability via a noisy sensor. Alpha-vectors define the value function over the belief simplex.
      </p>

      {/* POMDP update equation */}
      <div
        style={{ marginBottom: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{
          __html: renderDisplayMath(
            String.raw`\alpha_{a,\gamma}^{p}(s) = R(s,a) + \gamma \sum_{s'} P(s' \mid s,a) \sum_{o} P(o \mid s')\, \alpha_{\gamma}^{p(o)}(s')`,
          ),
        }}
        aria-label="POMDP alpha vector backup equation"
      />

      {/* Configuration sliders */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '16px' }}>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
          <span>Sensor Accuracy = {sensorAccuracy.toFixed(2)}</span>
          <input
            type="range" min={0.5} max={0.99} step={0.01} value={sensorAccuracy}
            onChange={e => setSensorAccuracy(Number(e.target.value))}
            aria-label={`Sensor accuracy = ${sensorAccuracy.toFixed(2)}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
          <span>
            Belief{' '}
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('b(B)') }} />
            {' '}= {beliefB.toFixed(2)}
          </span>
          <input
            type="range" min={0} max={1} step={0.01} value={beliefB}
            onChange={e => setBeliefB(Number(e.target.value))}
            aria-label={`Belief b(B) = ${beliefB.toFixed(2)}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
          <span>Depth = {depth} / {maxDepth}</span>
          <input
            type="range" min={0} max={maxDepth} step={1} value={depth}
            onChange={e => setDepth(Number(e.target.value))}
            aria-label={`Depth = ${depth}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
          <span>Max depth = {maxDepth}</span>
          <input
            type="range" min={1} max={12} step={1} value={maxDepth}
            onChange={e => { setMaxDepth(Number(e.target.value)); setDepth(d => Math.min(d, Number(e.target.value))); }}
            aria-label={`Max depth = ${maxDepth}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Alpha-vector plot */}
        <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', overflowX: 'auto', flexShrink: 0 }}>
          <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>
            Alpha vectors at depth {depth} ({currentAlphas.length} vectors) — pink curve = upper envelope
          </div>
          <AlphaVectorPlot alphas={currentAlphas} beliefB={beliefB} />
          {/* Individual alpha info */}
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {currentAlphas.map((alpha, i) => {
              const vA = alpha.values.get('A') ?? 0;
              const vB = alpha.values.get('B') ?? 0;
              const color = ALPHA_COLORS[i % ALPHA_COLORS.length] ?? '#9CA3AF';
              return (
                <span key={i} style={{
                  fontSize: '10px', color, background: `${color}18`,
                  border: `1px solid ${color}44`, borderRadius: '4px', padding: '2px 6px',
                }}>
                  {alpha.action}: [{vA.toFixed(2)}, {vB.toFixed(2)}]
                </span>
              );
            })}
          </div>
        </div>

        {/* Right panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '220px' }}>
          {/* State panel */}
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>State Panel</div>
            <div style={{ color: '#E5E7EB', fontSize: '12px', display: 'grid', gap: '4px' }}>
              <div>
                Belief: b(A) = {(1 - beliefB).toFixed(3)},&nbsp;
                b(B) = {beliefB.toFixed(3)}
              </div>
              <div>Depth: {depth}</div>
              <div>Alpha vectors: {currentAlphas.length}</div>
              <div>Value at belief: {curValue.toFixed(4)}</div>
              <div>Best action: <span style={{ color: CHAPTER_COLOR }}>{bestAction}</span></div>
              <div>Sensor accuracy: {sensorAccuracy.toFixed(2)}</div>
            </div>
          </div>

          {/* Belief update panel */}
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
              Belief Update Demo
            </div>
            <div style={{ color: '#E5E7EB', fontSize: '12px', marginBottom: '8px' }}>
              Current: b(A)={(1 - beliefB).toFixed(2)}, b(B)={beliefB.toFixed(2)}
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>
              Take action, receive observation:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {['Stay', 'Go'].map(a => (
                ['seeA', 'seeB'].map(o => (
                  <button
                    key={`${a}-${o}`}
                    style={{ ...btnStyle(), padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => handleBeliefUpdate(a, o)}
                    aria-label={`Take action ${a}, observe ${o}`}
                  >
                    {a}/{o}
                  </button>
                ))
              ))}
            </div>
            {updatedBelief && lastAction && lastObs && (
              <div style={{
                background: '#EC489918', border: '1px solid #EC489944',
                borderRadius: '6px', padding: '8px', fontSize: '11px',
              }}>
                <div style={{ color: CHAPTER_COLOR, fontWeight: 600, marginBottom: '4px' }}>
                  After {lastAction} / {lastObs}:
                </div>
                <div style={{ color: '#E5E7EB' }}>
                  b(A) = {(updatedBelief.get('A') ?? 0).toFixed(4)}<br />
                  b(B) = {(updatedBelief.get('B') ?? 0).toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* Belief update formula */}
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
            <div style={{ color: '#9CA3AF', fontSize: '10px', marginBottom: '4px' }}>Belief update:</div>
            <div
              dangerouslySetInnerHTML={{
                __html: renderDisplayMath(
                  String.raw`b'(s') = \frac{P(e \mid s') \sum_s P(s' \mid s,a)\, b(s)}{\sum_{s''} P(e \mid s'') \sum_s P(s'' \mid s,a)\, b(s)}`,
                ),
              }}
              aria-label="Belief update formula"
              style={{ fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* Play through depths controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Step through depths:</span>
        <button style={btnStyle(playing)} onClick={playing ? () => setPlaying(false) : play}
          aria-label={playing ? 'Pause depth animation' : 'Play depth animation'}>
          {playing ? '⏸ Pause' : '▶ Play depths'}
        </button>
        <button style={btnStyle()} onClick={() => setDepth(d => Math.max(0, d - 1))}
          disabled={depth === 0} aria-label="Previous depth">⏮ Shallower</button>
        <button style={btnStyle()} onClick={() => setDepth(d => Math.min(maxDepth, d + 1))}
          disabled={depth >= maxDepth} aria-label="Next depth">Deeper ⏭</button>
        <button style={btnStyle()} onClick={() => { setPlaying(false); setDepth(0); }}
          aria-label="Reset to depth 0">↺ Reset</button>
        <label style={{ color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Speed:
          {([1, 2, 3, 4] as const).map(s => (
            <button key={s} style={{ ...btnStyle(speed === s), padding: '4px 10px' }}
              onClick={() => setSpeed(s)} aria-label={`Speed ${s}x`} aria-pressed={speed === s}>
              {s}×
            </button>
          ))}
        </label>
      </div>
    </div>
  );
}
