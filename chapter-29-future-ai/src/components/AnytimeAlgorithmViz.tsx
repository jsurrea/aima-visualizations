import { useState, useEffect, useRef } from 'react';
import { simulateAnytimeAlgorithm } from '../algorithms/index';
import type { AnytimeGrowthShape } from '../algorithms/index';

const SHAPES: { value: AnytimeGrowthShape; label: string; description: string }[] = [
  {
    value: 'linear',
    label: 'Linear',
    description: 'Uniform improvement per step — e.g. iterative deepening with equal branching.',
  },
  {
    value: 'logarithmic',
    label: 'Logarithmic',
    description: 'Fast early gains then diminishing returns — e.g. MCMC in a Bayesian network.',
  },
  {
    value: 'sigmoid',
    label: 'Sigmoid',
    description: 'Slow start, rapid middle, then plateau — e.g. simulated annealing settling.',
  },
];

const N_STEPS = 60;
const CANVAS_HEIGHT = 200;
const CANVAS_PAD = { left: 40, right: 16, top: 12, bottom: 28 };

function drawChart(
  canvas: HTMLCanvasElement,
  steps: ReturnType<typeof simulateAnytimeAlgorithm>,
  cutoff: number,
  color: string,
  reducedMotion: boolean,
  currentIdx: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const pl = CANVAS_PAD.left;
  const pr = CANVAS_PAD.right;
  const pt = CANVAS_PAD.top;
  const pb = CANVAS_PAD.bottom;
  const drawW = W - pl - pr;
  const drawH = H - pt - pb;

  ctx.clearRect(0, 0, W, H);

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pl, pt);
  ctx.lineTo(pl, H - pb);
  ctx.lineTo(W - pr, H - pb);
  ctx.stroke();

  // Grid & y-axis labels
  ctx.fillStyle = '#6B7280';
  ctx.font = '10px system-ui, sans-serif';
  for (let i = 0; i <= 4; i++) {
    const y = pt + drawH - (i / 4) * drawH;
    ctx.fillText((i / 4).toFixed(2), 2, y + 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(pl, y);
    ctx.lineTo(W - pr, y);
    ctx.stroke();
  }

  // x-axis label
  ctx.fillStyle = '#6B7280';
  ctx.fillText('iterations →', W / 2 - 24, H - 4);

  const toX = (i: number) => pl + (i / (steps.length - 1)) * drawW;
  const toY = (q: number) => pt + drawH - q * drawH;

  // Cutoff shade
  const cutoffX = pl + (cutoff / (N_STEPS - 1)) * drawW;
  ctx.fillStyle = 'rgba(239,68,68,0.08)';
  ctx.fillRect(cutoffX, pt, W - pr - cutoffX, drawH);

  // Quality curve
  const limit = reducedMotion ? steps.length : Math.min(currentIdx + 1, steps.length);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < limit; i++) {
    const x = toX(i);
    const y = toY((steps[i] as { quality: number }).quality);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill under curve
  if (limit > 1) {
    ctx.beginPath();
    ctx.moveTo(toX(0), H - pb);
    for (let i = 0; i < limit; i++) ctx.lineTo(toX(i), toY((steps[i] as { quality: number }).quality));
    ctx.lineTo(toX(limit - 1), H - pb);
    ctx.closePath();
    ctx.fillStyle = `${color}20`;
    ctx.fill();
  }

  // Current point dot
  if (limit > 0 && !reducedMotion) {
    const ci = Math.min(currentIdx, steps.length - 1);
    ctx.beginPath();
    ctx.arc(toX(ci), toY((steps[ci] as { quality: number }).quality), 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Cutoff vertical line
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cutoffX, pt);
  ctx.lineTo(cutoffX, H - pb);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cutoff label
  ctx.fillStyle = '#EF4444';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('cut-off', cutoffX + 3, pt + 12);
}

export default function AnytimeAlgorithmViz() {
  const [shape, setShape] = useState<AnytimeGrowthShape>('logarithmic');
  const [cutoff, setCutoff] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const steps = simulateAnytimeAlgorithm(N_STEPS, shape, 42);
  // simulateAnytimeAlgorithm always returns N_STEPS items, so these are always defined
  const currentStep = steps[Math.min(currentIdx, steps.length - 1)] as (typeof steps)[number];
  const cutoffStep = steps[Math.min(cutoff, steps.length - 1)] as (typeof steps)[number];
  const color = '#EF4444';

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawChart(canvas, steps, cutoff, color, prefersReduced, currentIdx);
  });

  // Animation loop
  useEffect(() => {
    if (!playing || prefersReduced) return;
    const loop = (time: number) => {
      const msBetweenFrames = 120 / speed;
      if (time - lastTimeRef.current >= msBetweenFrames) {
        lastTimeRef.current = time;
        setCurrentIdx(prev => {
          if (prev >= N_STEPS - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, prefersReduced]);

  const reset = () => {
    setPlaying(false);
    setCurrentIdx(0);
  };

  return (
    <div>
      {/* Controls bar */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'flex-end',
        }}
      >
        {/* Shape selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Growth shape
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {SHAPES.map(s => (
              <button
                key={s.value}
                onClick={() => { setShape(s.value); reset(); }}
                aria-pressed={shape === s.value}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: shape === s.value ? `${color}20` : 'transparent',
                  border: `1px solid ${shape === s.value ? color : 'rgba(255,255,255,0.12)'}`,
                  color: shape === s.value ? color : '#9CA3AF',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cut-off slider */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label
            htmlFor="cutoff-slider"
            style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}
          >
            Cut-off at iteration <strong style={{ color: '#EF4444' }}>{cutoff}</strong>
            {' '}— quality:{' '}
            <strong style={{ color: '#10B981' }}>{cutoffStep.quality.toFixed(3)}</strong>
          </label>
          <input
            id="cutoff-slider"
            type="range"
            min={1}
            max={N_STEPS - 1}
            value={cutoff}
            onChange={e => setCutoff(Number(e.target.value))}
            aria-label="Algorithm cut-off iteration"
            style={{ width: '100%', accentColor: '#EF4444' }}
          />
        </div>

        {/* Speed slider */}
        <div>
          <label
            htmlFor="speed-slider"
            style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}
          >
            Speed: {speed}×
          </label>
          <input
            id="speed-slider"
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '80px', accentColor: '#EF4444' }}
          />
        </div>

        {/* Playback buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            aria-label="Step backward"
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '16px',
              cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', opacity: currentIdx === 0 ? 0.4 : 1,
            }}
          >
            ⏮
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '16px',
              cursor: 'pointer',
              background: `${color}20`, border: `1px solid ${color}`,
              color,
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setCurrentIdx(i => Math.min(N_STEPS - 1, i + 1))}
            disabled={currentIdx >= N_STEPS - 1}
            aria-label="Step forward"
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '16px',
              cursor: currentIdx >= N_STEPS - 1 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', opacity: currentIdx >= N_STEPS - 1 ? 0.4 : 1,
            }}
          >
            ⏭
          </button>
          <button
            onClick={reset}
            aria-label="Reset"
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#9CA3AF',
            }}
          >
            ↺
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '8px',
          marginBottom: '16px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={CANVAS_HEIGHT}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="Anytime algorithm quality over iterations chart"
        />
      </div>

      {/* State panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {[
          { label: 'Iteration', value: prefersReduced ? `0–${N_STEPS - 1}` : String(currentIdx) },
          { label: 'Current quality', value: prefersReduced ? '—' : currentStep.quality.toFixed(4) },
          { label: 'Status', value: prefersReduced ? 'Reduced motion' : currentStep.action },
          { label: 'Cut-off quality', value: cutoffStep.quality.toFixed(4) },
          { label: 'Optimal quality', value: (steps[N_STEPS - 1] as (typeof steps)[number]).quality.toFixed(4) },
          {
            label: 'Cut-off cost',
            value: `${((cutoff / (N_STEPS - 1)) * 100).toFixed(0)}% budget`,
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: 'white', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Shape description */}
      <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
        <strong style={{ color: '#EF4444' }}>
          {SHAPES.find(s => s.value === shape)?.label}:
        </strong>{' '}
        {SHAPES.find(s => s.value === shape)?.description}{' '}
        Drag the <em>cut-off</em> slider to simulate stopping early — this is how real-time AI agents
        decide when to stop deliberating and commit to an action.
      </p>
    </div>
  );
}
