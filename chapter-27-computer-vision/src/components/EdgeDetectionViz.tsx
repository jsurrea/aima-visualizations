import { useState, useMemo } from 'react';
import {
  gaussianKernel2D, applyConvolution2D, sobelGradient,
  nonMaxSuppression1D, applyThreshold
} from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

const STEP_NAMES = ['Original', 'Gaussian Blurred', 'Sobel Magnitude', 'Non-Max Suppression', 'Edge Map'];
const STEP_FORMULAS = [
  `I_{orig}(x,y)`,
  `G(x,y) = e^{-(x^2+y^2)/(2\\sigma^2)}`,
  `|\\nabla I| = \\sqrt{G_x^2 + G_y^2}`,
  `\\text{NMS: keep if local max along } \\nabla`,
  `E(x,y) = \\begin{cases}1 & |\\nabla I| \\geq T \\\\ 0 & \\text{otherwise}\\end{cases}`,
];

export default function EdgeDetectionViz() {
  const [step, setStep] = useState(0);
  const [sigma, setSigma] = useState(1.0);
  const [threshold, setThreshold] = useState(40);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number; value: number } | null>(null);

  const originalImage = useMemo(() =>
    Array.from({ length: 16 * 16 }, (_, i) => {
      const x = i % 16;
      return x < 8 ? 20 : 200;
    }), []);

  const blurred = useMemo(() => {
    const radius = Math.ceil(sigma * 2);
    const kernel = gaussianKernel2D(sigma, radius);
    return applyConvolution2D(originalImage, 16, 16, kernel);
  }, [originalImage, sigma]);

  const sobelResult = useMemo(() => sobelGradient(blurred, 16, 16), [blurred]);
  const magnitude = sobelResult.magnitude;
  const direction = sobelResult.direction;

  const nmsResult = useMemo(() => nonMaxSuppression1D(magnitude, direction, 16, 16), [magnitude, direction]);

  const edgeMap = useMemo(() => applyThreshold(nmsResult, threshold), [nmsResult, threshold]);

  const steps: ReadonlyArray<ReadonlyArray<number>> = [originalImage, blurred, magnitude, nmsResult, edgeMap];
  const currentData = steps[step]!;

  function normalizeForDisplay(data: ReadonlyArray<number>, isEdge: boolean): ReadonlyArray<{ r: number; g: number; b: number }> {
    if (isEdge) {
      return data.map(v => v === 1 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 });
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(v => {
      const normalized = max > min ? Math.round(((v - min) / (max - min)) * 255) : 0;
      return { r: normalized, g: normalized, b: normalized };
    });
  }

  const displayPixels = normalizeForDisplay(currentData, step === 4);

  const sliderStyle: React.CSSProperties = { width: '100%', accentColor: '#F59E0B' };

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Step navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="Previous step"
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: step === 0 ? '#4B5563' : 'white', cursor: step === 0 ? 'not-allowed' : 'pointer',
          }}
        >← Prev</button>
        <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: '14px' }}>
          Step {step + 1}/5: {STEP_NAMES[step]}
        </span>
        <button
          onClick={() => setStep(s => Math.min(4, s + 1))}
          disabled={step === 4}
          aria-label="Next step"
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: step === 4 ? '#4B5563' : 'white', cursor: step === 4 ? 'not-allowed' : 'pointer',
          }}
        >Next →</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Pixel grid */}
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(16, 20px)',
              gap: '1px',
              background: '#1A1A24',
              padding: '4px',
              borderRadius: '8px',
            }}
            role="img"
            aria-label={`${STEP_NAMES[step]} pixel grid`}
          >
            {displayPixels.map((pixel, i) => {
              const x = i % 16;
              const y = Math.floor(i / 16);
              return (
                <div
                  key={i}
                  style={{
                    width: '20px', height: '20px',
                    background: `rgb(${pixel.r},${pixel.g},${pixel.b})`,
                    cursor: 'crosshair',
                  }}
                  onMouseEnter={() => setHoveredPixel({ x, y, value: currentData[i]! })}
                  onMouseLeave={() => setHoveredPixel(null)}
                  title={`(${x},${y}): ${currentData[i]!.toFixed(1)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Controls + formula */}
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}
            htmlFor="sigma-edge">σ (Gaussian): {sigma.toFixed(1)}</label>
          <input id="sigma-edge" type="range" min={0.5} max={3.0} step={0.1} value={sigma}
            onChange={e => setSigma(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Gaussian sigma" />

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px', marginTop: '12px' }}
            htmlFor="thresh-edge">Threshold: {threshold}</label>
          <input id="thresh-edge" type="range" min={10} max={100} step={5} value={threshold}
            onChange={e => setThreshold(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Edge detection threshold" />

          <div
            dangerouslySetInnerHTML={{ __html: renderDisplayMath(STEP_FORMULAS[step]!) }}
            style={{ marginTop: '16px', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* State panel */}
      <div style={{
        marginTop: '16px', background: '#0A0A0F', borderRadius: '8px',
        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#9CA3AF' }}>Step: </span>{STEP_NAMES[step]}</div>
        <div><span style={{ color: '#9CA3AF' }}>σ: </span>{sigma.toFixed(1)}</div>
        <div><span style={{ color: '#9CA3AF' }}>Threshold: </span>{threshold}</div>
        <div><span style={{ color: '#9CA3AF' }}>Hovered: </span>
          {hoveredPixel ? `(${hoveredPixel.x},${hoveredPixel.y})=${hoveredPixel.value.toFixed(1)}` : '—'}
        </div>
      </div>
    </div>
  );
}
