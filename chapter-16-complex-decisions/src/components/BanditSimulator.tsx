import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { runUCB1, runThompsonSampling, BanditArm, BanditStep } from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

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

const ARM_COLORS = ['#6366F1', '#10B981', '#F59E0B'];
const ARM_NAMES = ['Arm 1', 'Arm 2', 'Arm 3'];
const DEFAULT_MEANS = [0.3, 0.6, 0.45];

/** Bar chart showing estimated means and UCB bonus. */
function ArmBarChart({ step, armMeans }: {
  step: BanditStep;
  armMeans: ReadonlyArray<number>;
}) {
  const W = 340;
  const H = 160;
  const PAD = { top: 20, right: 20, bottom: 32, left: 40 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = step.stats.length;
  const barW = (iW / n) * 0.6;
  const barGap = iW / n;

  // Max value for scale (UCB can be > 1 initially)
  const maxVal = Math.max(1.2, ...step.ucbValues.filter(v => isFinite(v)).map(v => v * 1.1));

  const yScale = (v: number) => PAD.top + iH - Math.min(1, v / maxVal) * iH;

  return (
    <svg width={W} height={H} role="img" aria-label="Bandit arm estimated means and UCB values" style={{ display: 'block', maxWidth: '100%' }}>
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yScale(v)} x2={PAD.left + iW} y2={yScale(v)} stroke="#1F2937" strokeWidth={1} />
          <text x={PAD.left - 4} y={yScale(v) + 4} fill="#9CA3AF" fontSize={9} textAnchor="end">{v.toFixed(2)}</text>
        </g>
      ))}
      {/* True mean dotted lines */}
      {armMeans.map((tm, i) => (
        <line
          key={i}
          x1={PAD.left + i * barGap + barGap / 2 - barW / 2 - 4}
          y1={yScale(tm)}
          x2={PAD.left + i * barGap + barGap / 2 + barW / 2 + 4}
          y2={yScale(tm)}
          stroke={ARM_COLORS[i] ?? '#9CA3AF'}
          strokeWidth={1.5}
          strokeDasharray="4,2"
          opacity={0.7}
        />
      ))}
      {step.stats.map((s, i) => {
        const cx = PAD.left + i * barGap + barGap / 2;
        const isSelected = i === step.selectedArm;
        const meanH = Math.max(0, (s.mean / maxVal) * iH);
        const ucb = step.ucbValues[i] ?? 0;
        const ucbH = isFinite(ucb) ? Math.max(0, Math.min(iH, (ucb / maxVal) * iH)) : iH;
        const color = ARM_COLORS[i] ?? '#9CA3AF';

        return (
          <g key={i}>
            {/* UCB bonus bar (taller, lighter) */}
            <rect
              x={cx - barW / 2} y={PAD.top + iH - ucbH}
              width={barW} height={ucbH}
              fill={color} opacity={0.25} rx={3}
            />
            {/* Mean bar */}
            <rect
              x={cx - barW / 2} y={PAD.top + iH - meanH}
              width={barW} height={meanH}
              fill={color} opacity={isSelected ? 1 : 0.6} rx={3}
              stroke={isSelected ? 'white' : 'none'} strokeWidth={isSelected ? 1.5 : 0}
            />
            {/* Pull count */}
            <text x={cx} y={PAD.top + iH + 18} fill={color} fontSize={10} textAnchor="middle">
              {ARM_NAMES[i]} ({s.pulls})
            </text>
            {/* UCB value label */}
            <text x={cx} y={Math.max(PAD.top + 12, PAD.top + iH - ucbH - 4)} fill={color} fontSize={9} textAnchor="middle">
              {isFinite(ucb) ? ucb.toFixed(3) : '∞'}
            </text>
          </g>
        );
      })}
      {/* Legend explanation */}
      <text x={PAD.left + iW / 2} y={H - 2} fill="#6B7280" fontSize={8} textAnchor="middle">
        Solid = mean estimate · Light = UCB bonus · Dashed = true mean
      </text>
    </svg>
  );
}

/** Line chart for cumulative regret. */
function RegretChart({ steps, currentIdx }: {
  steps: ReadonlyArray<BanditStep>;
  currentIdx: number;
}) {
  const W = 340;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxRegret = Math.max(1, ...steps.map(s => s.cumulativeRegret));
  const visSteps = steps.slice(0, currentIdx + 1);

  const xScale = (i: number) => PAD.left + (i / Math.max(1, steps.length - 1)) * iW;
  const yScale = (v: number) => PAD.top + iH - (v / maxRegret) * iH;

  const pts = visSteps.map((s, i) => `${xScale(i)},${yScale(s.cumulativeRegret)}`).join(' ');

  return (
    <svg width={W} height={H} role="img" aria-label="Cumulative regret chart" style={{ display: 'block', maxWidth: '100%' }}>
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      {[0, maxRegret / 2, maxRegret].map((v, i) => (
        <text key={i} x={PAD.left - 4} y={yScale(v) + 4} fill="#9CA3AF" fontSize={9} textAnchor="end">
          {v.toFixed(1)}
        </text>
      ))}
      <text x={PAD.left + iW / 2} y={H - 4} fill="#9CA3AF" fontSize={9} textAnchor="middle">Round</text>
      <text x={8} y={PAD.top + iH / 2} fill="#9CA3AF" fontSize={9} textAnchor="middle"
        transform={`rotate(-90, 8, ${PAD.top + iH / 2})`}>Regret</text>
      {pts && <polyline points={pts} fill="none" stroke={CHAPTER_COLOR} strokeWidth={1.5} />}
    </svg>
  );
}

type Algorithm = 'UCB1' | 'Thompson';

export default function BanditSimulator() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('UCB1');
  const [armMeans, setArmMeans] = useState<[number, number, number]>([...DEFAULT_MEANS] as [number, number, number]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const arms = useMemo<ReadonlyArray<BanditArm>>(() =>
    armMeans.map((mean, i) => ({ name: ARM_NAMES[i]!, trueMean: mean, trueStd: 0.1 })),
    [armMeans],
  );

  const steps = useMemo<ReadonlyArray<BanditStep>>(() => {
    // Use a simple seeded-ish RNG for reproducibility (reset on dependency change)
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0x100000000;
    };
    return algorithm === 'UCB1'
      ? runUCB1(arms, 200, rng)
      : runThompsonSampling(arms, 200, 0.5, rng);
  }, [algorithm, arms]);

  const step = steps[stepIdx] ?? steps[steps.length - 1]!;

  const reset = useCallback(() => {
    setPlaying(false);
    setStepIdx(0);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const play = useCallback(() => {
    if (prefersReducedMotion) { setStepIdx(steps.length - 1); return; }
    if (stepIdx >= steps.length - 1) setStepIdx(0);
    setPlaying(true);
  }, [prefersReducedMotion, stepIdx, steps.length]);

  useEffect(() => {
    if (!playing) return;
    const delay = 1000 / speed;
    const tick = (time: number) => {
      if (time - lastTimeRef.current >= delay) {
        lastTimeRef.current = time;
        setStepIdx(prev => {
          if (prev >= steps.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, steps.length]);

  useEffect(() => { setStepIdx(0); setPlaying(false); }, [steps]);

  return (
    <div style={cardStyle} role="region" aria-label="Multi-Armed Bandit visualization">
      <h2 style={{ color: CHAPTER_COLOR, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Multi-Armed Bandit (§16.3)
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Explore the exploration-exploitation trade-off. UCB1 and Thompson Sampling balance trying new arms vs. exploiting the best known arm.
      </p>

      {/* UCB formula */}
      <div
        style={{ marginBottom: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{
          __html: renderDisplayMath(
            String.raw`\text{UCB}(i) = \hat{\mu}_i + \sqrt{\dfrac{2\ln N}{n_i}}`,
          ),
        }}
        aria-label="UCB1 formula"
      />

      {/* Algorithm selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Algorithm:</span>
        {(['UCB1', 'Thompson'] as const).map(alg => (
          <button
            key={alg}
            style={btnStyle(algorithm === alg)}
            onClick={() => setAlgorithm(alg)}
            aria-pressed={algorithm === alg}
            aria-label={`Select ${alg} algorithm`}
          >
            {alg === 'UCB1' ? 'UCB1' : 'Thompson Sampling'}
          </button>
        ))}
      </div>

      {/* Arm configuration */}
      <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
          True arm means (unknown to agent):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {armMeans.map((mean, i) => (
            <label key={i} style={{ color: ARM_COLORS[i], fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
              {ARM_NAMES[i]}: {mean.toFixed(2)}
              <input
                type="range" min={0} max={1} step={0.01} value={mean}
                onChange={e => {
                  const next = [...armMeans] as [number, number, number];
                  next[i] = Number(e.target.value);
                  setArmMeans(next);
                }}
                aria-label={`${ARM_NAMES[i]} true mean = ${mean.toFixed(2)}`}
                style={{ accentColor: ARM_COLORS[i] ?? CHAPTER_COLOR }}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>
              Estimated means + UCB bonus (dashed = true mean)
            </div>
            <ArmBarChart step={step} armMeans={armMeans} />
          </div>
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>Cumulative regret</div>
            <RegretChart steps={steps} currentIdx={stepIdx} />
          </div>
        </div>

        {/* State panel */}
        <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', flex: 1, minWidth: '200px' }}>
          <div style={{ color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>State Panel</div>
          <div style={{ color: '#E5E7EB', fontSize: '12px', display: 'grid', gap: '6px', marginBottom: '12px' }}>
            <div>Round: {step.round} / 200</div>
            <div>
              Selected: <span style={{ color: ARM_COLORS[step.selectedArm] ?? '#9CA3AF' }}>
                {ARM_NAMES[step.selectedArm] ?? '?'}
              </span>
            </div>
            <div>Reward: {step.reward.toFixed(4)}</div>
            <div>Cumulative Regret: {step.cumulativeRegret.toFixed(4)}</div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Arm statistics:</div>
          {step.stats.map((s, i) => (
            <div key={i} style={{
              padding: '8px', borderRadius: '6px', marginBottom: '6px',
              background: i === step.selectedArm ? `${ARM_COLORS[i] ?? CHAPTER_COLOR}18` : 'transparent',
              border: `1px solid ${i === step.selectedArm ? (ARM_COLORS[i] ?? CHAPTER_COLOR) + '44' : BORDER}`,
            }}>
              <div style={{ color: ARM_COLORS[i] ?? '#9CA3AF', fontSize: '12px', fontWeight: 600 }}>{ARM_NAMES[i]}</div>
              <div style={{ color: '#E5E7EB', fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginTop: '4px' }}>
                <div>Pulls: {s.pulls}</div>
                <div>Mean: {s.mean.toFixed(4)}</div>
                <div>UCB: {isFinite(step.ucbValues[i] ?? Infinity) ? (step.ucbValues[i]?.toFixed(4) ?? '—') : '∞'}</div>
                <div>Total R: {s.totalReward.toFixed(3)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <button style={btnStyle(playing)} onClick={playing ? () => setPlaying(false) : play}
          aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.max(0, i - 1))}
          disabled={stepIdx === 0} aria-label="Step backward">⏮ Back</button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))}
          disabled={stepIdx >= steps.length - 1} aria-label="Step forward">Step ⏭</button>
        <button style={btnStyle()} onClick={reset} aria-label="Reset">↺ Reset</button>
        <label style={{ color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Speed:
          {([1, 2, 3, 4] as const).map(s => (
            <button key={s} style={{ ...btnStyle(speed === s), padding: '4px 10px' }}
              onClick={() => setSpeed(s)} aria-label={`Speed ${s}x`} aria-pressed={speed === s}>
              {s}×
            </button>
          ))}
        </label>
        <span style={{ color: '#6B7280', fontSize: '12px' }}>Round {step.round} / {steps.length}</span>
      </div>
    </div>
  );
}
