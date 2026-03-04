import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import { linearRegressionGD, type LinearRegressionStep } from '../algorithms';

const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
};

const DEFAULT_DATA = [
  { x: 1, y: 2.1 }, { x: 2, y: 3.9 }, { x: 3, y: 6.2 }, { x: 4, y: 7.8 },
  { x: 5, y: 10.1 }, { x: 6, y: 12.3 }, { x: 7, y: 13.9 }, { x: 8, y: 16.1 },
];

const W = 400, H = 280;
const M = { l: 40, r: 16, t: 16, b: 36 };

export function LinearRegressionVisualizer(): JSX.Element {
  const [data, setData] = useState(DEFAULT_DATA);
  const [learningRate, setLearningRate] = useState(0.005);
  const [epochs] = useState(300);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const steps = useMemo(
    () => linearRegressionGD(data, learningRate, epochs),
    [data, learningRate, epochs],
  );
  const maxStep = steps.length - 1;

  useEffect(() => { setCurrentStep(0); setIsPlaying(false); }, [steps]);

  useEffect(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPlaying || reduced) return;
    const tick = (ts: number) => {
      if (ts - lastRef.current >= speed) {
        lastRef.current = ts;
        setCurrentStep(prev => {
          if (prev >= maxStep) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, speed, maxStep]);

  const step: LinearRegressionStep = steps[Math.min(currentStep, maxStep)]!;

  // Data bounds
  const allX = data.map(d => d.x);
  const allY = data.map(d => d.y);
  const xMin = Math.min(...allX, 0), xMax = Math.max(...allX, 10);
  const yMin = Math.min(...allY, 0), yMax = Math.max(...allY, 20);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  function toSvg(x: number, y: number) {
    return {
      sx: M.l + ((x - xMin) / xRange) * pw,
      sy: M.t + ph - ((y - yMin) / yRange) * ph,
    };
  }

  // Regression line endpoints
  const lineY0 = step.w0 + step.w1 * xMin;
  const lineY1 = step.w0 + step.w1 * xMax;
  const { sx: lx0, sy: ly0 } = toSvg(xMin, lineY0);
  const { sx: lx1, sy: ly1 } = toSvg(xMax, lineY1);

  // Loss curve data
  const lossData = steps.map((s, i) => ({ i, loss: s.loss }));
  const maxLoss = Math.max(...lossData.map(d => d.loss), 0.01);
  const lossW = 380, lossH = 70;
  const lossPts = lossData.map(d => {
    const x = 20 + (d.i / maxStep) * (lossW - 40);
    const y = 8 + (1 - d.loss / maxLoss) * (lossH - 16);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const currentLossX = 20 + (Math.min(currentStep, maxStep) / maxStep) * (lossW - 40);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = xMin + ((px - M.l) / pw) * xRange;
    const y = yMin + (1 - (py - M.t) / ph) * yRange;
    if (px < M.l || px > W - M.r || py < M.t || py > H - M.b) return;
    setData(prev => [...prev, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]);
    setIsPlaying(false);
    setCurrentStep(0);
  }, [xMin, xRange, yMin, yRange, pw, ph]);

  const btnStyle = (disabled = false) => ({
    padding: '6px 14px', borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    background: disabled ? 'transparent' : COLORS.surface3,
    color: disabled ? '#4B5563' : '#E5E7EB',
    cursor: disabled ? 'not-allowed' as const : 'pointer' as const,
    fontSize: '13px', opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ background: COLORS.surface1, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          Linear Regression (Gradient Descent)
        </h3>
        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '14px' }}>
          Click the chart to add data points. Watch gradient descent minimize MSE.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px' }}>
        {/* Left: scatter + loss */}
        <div style={{ padding: '16px' }}>
          {/* Scatter plot */}
          <svg width={W} height={H} style={{ maxWidth: '100%', cursor: 'crosshair' }}
            role="img" aria-label="Scatter plot — click to add points"
            onClick={handleSvgClick}>
            {/* Grid */}
            {[0.25, 0.5, 0.75, 1].map(t => {
              const sy = M.t + (1 - t) * ph;
              return <line key={t} x1={M.l} y1={sy} x2={M.l + pw} y2={sy}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
            })}
            {/* Regression line */}
            <line x1={lx0} y1={ly0} x2={lx1} y2={ly1}
              stroke={COLORS.primary} strokeWidth={2} />
            {/* Data points */}
            {data.map((d, i) => {
              const { sx, sy } = toSvg(d.x, d.y);
              return <circle key={i} cx={sx} cy={sy} r={5}
                fill={COLORS.secondary} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />;
            })}
            {/* Axes labels */}
            <text x={M.l + pw / 2} y={H - 4} textAnchor="middle"
              fontSize={10} fill="#9CA3AF">x</text>
            <text x={8} y={M.t + ph / 2} textAnchor="middle"
              fontSize={10} fill="#9CA3AF" transform={`rotate(-90,8,${M.t + ph / 2})`}>y</text>
          </svg>

          {/* Loss curve */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
              Loss curve (MSE over iterations)
            </div>
            <svg width={lossW} height={lossH} style={{ maxWidth: '100%' }}>
              <polyline points={lossPts} fill="none"
                stroke={`${COLORS.accent}80`} strokeWidth={1.5} />
              <line x1={currentLossX} y1={8} x2={currentLossX} y2={lossH - 8}
                stroke={COLORS.accent} strokeWidth={1.5} />
            </svg>
          </div>
        </div>

        {/* Right: controls + state */}
        <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button aria-label="Reset" style={btnStyle()}
              onClick={() => { setIsPlaying(false); setCurrentStep(0); }}>⏮</button>
            <button aria-label="Step back" style={btnStyle(currentStep === 0)}
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}>◀</button>
            <button aria-label={isPlaying ? 'Pause' : 'Play'}
              style={{ ...btnStyle(), background: COLORS.primary, border: 'none', color: 'white' }}
              onClick={() => setIsPlaying(p => !p)}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button aria-label="Step forward" style={btnStyle(currentStep >= maxStep)}
              disabled={currentStep >= maxStep}
              onClick={() => setCurrentStep(s => Math.min(maxStep, s + 1))}>▶</button>
            <button aria-label="Clear data points" style={btnStyle()}
              onClick={() => { setData(DEFAULT_DATA); setCurrentStep(0); setIsPlaying(false); }}>
              Reset Data
            </button>
          </div>

          {/* Speed */}
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
              Speed (ms/step): {speed}
            </div>
            <input type="range" min={10} max={500} step={10} value={speed}
              aria-label="Animation speed"
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          {/* Learning rate */}
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
              Learning rate η: {learningRate}
            </div>
            <input type="range" min={0.001} max={0.05} step={0.001} value={learningRate}
              aria-label="Learning rate"
              onChange={e => { setLearningRate(Number(e.target.value)); setCurrentStep(0); setIsPlaying(false); }}
              style={{ width: '100%' }} />
          </div>

          {/* State */}
          <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>
              Iteration {step.iteration} / {epochs}
            </div>
            <div style={{ fontSize: '12px', color: '#E5E7EB', lineHeight: 1.6 }}>
              <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
                `w_0 = ${step.w0.toFixed(4)}`,
              ) }} />
              <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
                `w_1 = ${step.w1.toFixed(4)}`,
              ) }} />
              <div style={{ marginTop: '6px' }} dangerouslySetInnerHTML={{ __html: renderInlineMath(
                `\\text{MSE} = ${step.loss.toFixed(6)}`,
              ) }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
          '\\mathcal{L}(w_0, w_1) = \\frac{1}{n} \\sum_{i=1}^{n} (w_0 + w_1 x_i - y_i)^2',
        ) }} />
      </div>
    </div>
  );
}
