import { useState, useMemo } from 'react';
import { renderDisplayMath } from '../utils/mathUtils';

// ─── Polynomial regression helpers ───────────────────────────────────────────

function gaussianElim(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row]![col]!) > Math.abs(aug[maxRow]![col]!)) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];
    const pivot = aug[col]![col]!;
    if (Math.abs(pivot) < 1e-12) continue;
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row]![col]! / pivot;
      for (let j = col; j <= n; j++) {
        aug[row]![j]! -= factor * aug[col]![j]!;
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let xi = aug[i]![n]!;
    for (let j = i + 1; j < n; j++) {
      xi -= aug[i]![j]! * x[j]!;
    }
    xi /= aug[i]![i]!;
    x[i] = xi;
  }
  return x;
}

function fitPolynomial(xs: number[], ys: number[], degree: number): number[] {
  const d = degree + 1;
  const n = xs.length;
  if (n < d) return new Array<number>(d).fill(0);

  const XtX: number[][] = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) =>
      xs.reduce((s, x) => s + Math.pow(x, i + j), 0),
    ),
  );
  const Xty: number[] = Array.from({ length: d }, (_, i) =>
    xs.reduce((s, x, k) => s + Math.pow(x, i) * (ys[k]!), 0),
  );
  return gaussianElim(XtX, Xty);
}

function evalPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((s, c, i) => s + c * Math.pow(x, i), 0);
}

function mse(coeffs: number[], xs: number[], ys: number[]): number {
  if (xs.length === 0) return 0;
  const sum = xs.reduce((s, x, i) => {
    const err = evalPoly(coeffs, x) - ys[i]!;
    return s + err * err;
  }, 0);
  return sum / xs.length;
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const DEGREES = [1, 2, 3, 5, 8, 12];
const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
};

const W = 560, H = 280, M = { l: 40, r: 16, t: 16, b: 36 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;

export function BiasVarianceDemo(): JSX.Element {
  const [degree, setDegree] = useState(3);
  const [noiseLevel, setNoiseLevel] = useState(0.3);

  const { trainX, trainY, testX, testY } = useMemo(() => {
    const rng = seededRng(42);
    const N = 25;
    const allX = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
    const allY = allX.map(x => Math.sin(x) + (rng() - 0.5) * 2 * noiseLevel);
    const tX = allX.slice(0, 20);
    const tY = allY.slice(0, 20);
    return { trainX: tX, trainY: tY, testX: allX.slice(20), testY: allY.slice(20) };
  }, [noiseLevel]);

  const coeffs = useMemo(() => fitPolynomial(trainX, trainY, degree), [trainX, trainY, degree]);
  const trainMSE = useMemo(() => mse(coeffs, trainX, trainY), [coeffs, trainX, trainY]);
  const testMSE = useMemo(() => mse(coeffs, testX, testY), [coeffs, testX, testY]);

  // Build curve points
  const curvePts = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * 2 * Math.PI;
      const y = evalPoly(coeffs, x);
      const sx = M.l + (x / (2 * Math.PI)) * PW;
      const sy = M.t + PH / 2 - (y / 2) * (PH / 2);
      pts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [coeffs]);

  // True curve
  const truePts = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * 2 * Math.PI;
      const y = Math.sin(x);
      const sx = M.l + (x / (2 * Math.PI)) * PW;
      const sy = M.t + PH / 2 - (y / 2) * (PH / 2);
      pts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  function toSvg(x: number, y: number): { sx: number; sy: number } {
    return {
      sx: M.l + (x / (2 * Math.PI)) * PW,
      sy: M.t + PH / 2 - (y / 2) * (PH / 2),
    };
  }

  const biasLabel = degree <= 2 ? 'High Bias (Underfitting)' :
    degree >= 8 ? 'High Variance (Overfitting)' : 'Good Fit';
  const biasColor = degree <= 2 ? '#EF4444' : degree >= 8 ? '#F59E0B' : COLORS.secondary;

  return (
    <div style={{ background: COLORS.surface1, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          Bias–Variance Tradeoff
        </h3>
        <p style={{ margin: '0', color: '#9CA3AF', fontSize: '14px' }}>
          Fit a polynomial to noisy observations of sin(x). See how degree affects bias and variance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
        {/* SVG plot */}
        <div style={{ padding: '16px' }}>
          <svg width={W} height={H} style={{ maxWidth: '100%' }}
            role="img" aria-label="Polynomial fit visualization">
            {/* Axes */}
            <line x1={M.l} y1={M.t + PH / 2} x2={M.l + PW} y2={M.t + PH / 2}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + PH}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

            {/* True function */}
            <path d={truePts} fill="none"
              stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 4" />

            {/* Fitted curve — clipped */}
            <clipPath id="plot-clip">
              <rect x={M.l} y={M.t} width={PW} height={PH} />
            </clipPath>
            <path d={curvePts} fill="none"
              stroke={COLORS.primary} strokeWidth={2}
              clipPath="url(#plot-clip)" />

            {/* Training points */}
            {trainX.map((x, i) => {
              const { sx, sy } = toSvg(x, trainY[i]!);
              return <circle key={`tr-${i}`} cx={sx} cy={sy} r={3.5}
                fill={COLORS.secondary} opacity={0.85} />;
            })}
            {/* Test points */}
            {testX.map((x, i) => {
              const { sx, sy } = toSvg(x, testY[i]!);
              return <circle key={`te-${i}`} cx={sx} cy={sy} r={3.5}
                fill={COLORS.accent} opacity={0.85} />;
            })}

            {/* Legend */}
            <circle cx={M.l + 8} cy={H - 14} r={3} fill={COLORS.secondary} />
            <text x={M.l + 16} y={H - 10} fontSize={10} fill="#9CA3AF">Train (20)</text>
            <circle cx={M.l + 80} cy={H - 14} r={3} fill={COLORS.accent} />
            <text x={M.l + 88} y={H - 10} fontSize={10} fill="#9CA3AF">Test (5)</text>
            <line x1={M.l + 156} y1={H - 14} x2={M.l + 172} y2={H - 14}
              stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" strokeWidth={1.5} />
            <text x={M.l + 176} y={H - 10} fontSize={10} fill="#9CA3AF">True sin(x)</text>
          </svg>
        </div>

        {/* Controls */}
        <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: '20px 16px',
          display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
              Polynomial Degree
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DEGREES.map(d => (
                <button key={d}
                  aria-label={`Degree ${d}`}
                  aria-pressed={degree === d}
                  onClick={() => setDegree(d)}
                  style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px',
                    border: `1px solid ${degree === d ? COLORS.primary : COLORS.border}`,
                    background: degree === d ? `${COLORS.primary}30` : COLORS.surface3,
                    color: degree === d ? '#E5E7EB' : '#9CA3AF',
                    cursor: 'pointer',
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
              Noise Level: {noiseLevel.toFixed(1)}
            </div>
            <input type="range" min={0.05} max={1.0} step={0.05} value={noiseLevel}
              aria-label="Noise level"
              onChange={e => setNoiseLevel(Number(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '12px' }}>
            <div style={{ color: biasColor, fontSize: '13px', fontWeight: 700,
              marginBottom: '8px' }}>
              {biasLabel}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
              Train MSE: {trainMSE.toFixed(4)}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Test MSE: {testMSE.toFixed(4)}
            </div>
            {testMSE > trainMSE * 3 && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: COLORS.accent }}>
                ⚠ Large train/test gap → overfitting
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
          '\\hat{y} = w_0 + w_1 x + w_2 x^2 + \\cdots + w_d x^d',
        ) }} />
      </div>
    </div>
  );
}
