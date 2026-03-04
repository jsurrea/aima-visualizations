import { useState, useMemo } from 'react';
import { renderInlineMath } from '../utils/mathUtils';
import { adaBoost, type BoostStep } from '../algorithms';

const COLORS = {
  primary: '#6366F1',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
  pos: '#10B981',
  neg: '#EF4444',
};

// Non-linearly-separable dataset (moon-like)
const BOOST_DATA = [
  { features: [1.0, 2.5], label: 1 }, { features: [1.5, 3.5], label: 1 },
  { features: [2.5, 3.8], label: 1 }, { features: [3.5, 3.2], label: 1 },
  { features: [4.0, 2.5], label: 1 }, { features: [3.0, 1.5], label: 1 },
  { features: [2.0, 1.0], label: 1 }, { features: [0.5, 1.5], label: 1 },
  { features: [4.5, 4.5], label: 0 }, { features: [5.5, 4.0], label: 0 },
  { features: [6.0, 3.0], label: 0 }, { features: [5.0, 2.0], label: 0 },
  { features: [4.0, 1.2], label: 0 }, { features: [5.5, 5.0], label: 0 },
  { features: [6.5, 4.5], label: 0 }, { features: [3.0, 5.5], label: 0 },
];

const W = 400, H = 340;
const DOM = 8;

export function EnsembleVisualizer(): JSX.Element {
  const [round, setRound] = useState(0);
  const MAX_ROUNDS = 5;

  const steps = useMemo(
    () => adaBoost(BOOST_DATA, MAX_ROUNDS),
    [],
  );

  const currentStep: BoostStep | undefined = round > 0 ? steps[round - 1] : undefined;

  const pw = W - 32, ph = H - 56;

  function toSvg(x: number, y: number): [number, number] {
    return [16 + (x / DOM) * pw, 16 + (1 - y / DOM) * ph];
  }

  // Compute weights for current round
  const weights = currentStep?.weights ?? BOOST_DATA.map(() => 1 / BOOST_DATA.length);
  const maxW = Math.max(...weights);

  // Stump boundary lines for all rounds up to current
  const stumpLines = useMemo(() => {
    return steps.slice(0, round).map((s, i) => {
      const alpha = s.alpha;
      const opacity = Math.min(0.9, 0.3 + Math.abs(alpha) * 0.4);
      if (s.stumpFeature === 0) {
        // Vertical line at x = threshold
        const [sx] = toSvg(s.stumpThreshold, 0);
        return <line key={i} x1={sx} y1={16} x2={sx} y2={16 + ph}
          stroke={`rgba(99,102,241,${opacity})`} strokeWidth={2}
          strokeDasharray={i < round - 1 ? '4 4' : undefined} />;
      } else {
        // Horizontal line at y = threshold
        const [, sy] = toSvg(0, s.stumpThreshold);
        return <line key={i} x1={16} y1={sy} x2={16 + pw} y2={sy}
          stroke={`rgba(99,102,241,${opacity})`} strokeWidth={2}
          strokeDasharray={i < round - 1 ? '4 4' : undefined} />;
      }
    });
  }, [steps, round, pw, ph]);

  return (
    <div style={{ background: COLORS.surface1, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          AdaBoost Ensemble Learning
        </h3>
        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '14px' }}>
          Step through boosting rounds. Point size shows sample weight (harder examples get more weight).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px' }}>
        <div style={{ padding: '16px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px',
            flexWrap: 'wrap', alignItems: 'center' }}>
            <button aria-label="Reset" onClick={() => setRound(0)}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
                border: `1px solid ${COLORS.border}`, background: COLORS.surface3,
                color: '#E5E7EB', cursor: 'pointer' }}>⏮ Reset</button>
            <button aria-label="Previous round" disabled={round === 0}
              onClick={() => setRound(r => Math.max(0, r - 1))}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
                border: `1px solid ${COLORS.border}`, background: COLORS.surface3,
                color: round === 0 ? '#4B5563' : '#E5E7EB', cursor: round === 0 ? 'not-allowed' : 'pointer',
                opacity: round === 0 ? 0.5 : 1 }}>◀ Prev</button>
            <button aria-label="Next round" disabled={round >= MAX_ROUNDS}
              onClick={() => setRound(r => Math.min(MAX_ROUNDS, r + 1))}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
                border: 'none', background: COLORS.primary,
                color: 'white', cursor: round >= MAX_ROUNDS ? 'not-allowed' : 'pointer',
                opacity: round >= MAX_ROUNDS ? 0.5 : 1 }}>Next ▶</button>
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
              Round {round} / {MAX_ROUNDS}
            </span>
          </div>

          <svg width={W} height={H} style={{ maxWidth: '100%' }}
            role="img" aria-label="AdaBoost visualization">
            {/* Stump boundaries */}
            {stumpLines}

            {/* Data points */}
            {BOOST_DATA.map((d, i) => {
              const w = weights[i] ?? 1 / BOOST_DATA.length;
              const r = 4 + (w / maxW) * 12;
              const [sx, sy] = toSvg(d.features[0]!, d.features[1]!);
              const color = d.label === 1 ? COLORS.pos : COLORS.neg;
              return (
                <g key={i}>
                  <circle cx={sx} cy={sy} r={r}
                    fill={`${color}40`} stroke={color} strokeWidth={1.5} />
                  <text x={sx} y={sy + 4} textAnchor="middle"
                    fontSize={8} fill={color} fontWeight={700}>
                    {d.label === 1 ? '+' : '−'}
                  </text>
                </g>
              );
            })}

            {/* Legend */}
            <circle cx={24} cy={H - 18} r={5} fill={COLORS.pos} />
            <text x={34} y={H - 14} fontSize={10} fill="#9CA3AF">Positive</text>
            <circle cx={90} cy={H - 18} r={5} fill={COLORS.neg} />
            <text x={100} y={H - 14} fontSize={10} fill="#9CA3AF">Negative</text>
            <text x={158} y={H - 14} fontSize={10} fill="#9CA3AF">
              (size ∝ sample weight)
            </text>
          </svg>
        </div>

        {/* State panel */}
        <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* All rounds summary */}
          <div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
              Rounds completed
            </div>
            {steps.slice(0, round).map((s, i) => (
              <div key={i} style={{ padding: '6px 8px', borderRadius: '6px',
                background: i === round - 1 ? `${COLORS.primary}20` : 'transparent',
                border: `1px solid ${i === round - 1 ? COLORS.primary : COLORS.border}`,
                marginBottom: '4px' }}>
                <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: i === round - 1 ? 700 : 400 }}>
                  Round {s.round}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Feature {s.stumpFeature === 0 ? 'x' : 'y'} ≥ {s.stumpThreshold.toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  err={s.error.toFixed(4)}&nbsp;&nbsp;α={s.alpha.toFixed(4)}
                </div>
              </div>
            ))}
            {round === 0 && (
              <div style={{ fontSize: '12px', color: '#4B5563' }}>
                Press Next to start boosting
              </div>
            )}
          </div>

          {currentStep && (
            <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
                Weight update formula
              </div>
              <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
                `\\alpha_t = ${currentStep.alpha.toFixed(3)}`,
              ) }} />
              <div style={{ marginTop: '6px' }} dangerouslySetInnerHTML={{ __html: renderInlineMath(
                `\\varepsilon_t = ${currentStep.error.toFixed(4)}`,
              ) }} />
            </div>
          )}

          <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
              Final prediction
            </div>
            <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
              'H(x) = \\text{sign}\\!\\left(\\sum_t \\alpha_t h_t(x)\\right)',
            ) }} />
          </div>
        </div>
      </div>
    </div>
  );
}
