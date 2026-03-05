import { useState, useMemo, useCallback } from 'react';
import { renderInlineMath } from '../utils/mathUtils';
import { knnClassify, type KNNPoint } from '../algorithms';

const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
  classA: '#6366F1',
  classB: '#EC4899',
};

const DEFAULT_TRAINING: KNNPoint[] = [
  { features: [1.5, 1.5], label: 'A' }, { features: [2.0, 2.5], label: 'A' },
  { features: [1.2, 3.0], label: 'A' }, { features: [2.5, 1.8], label: 'A' },
  { features: [3.0, 2.0], label: 'A' }, { features: [2.2, 3.5], label: 'A' },
  { features: [1.0, 2.0], label: 'A' }, { features: [3.5, 3.0], label: 'A' },
  { features: [6.0, 6.0], label: 'B' }, { features: [7.0, 5.5], label: 'B' },
  { features: [5.5, 7.0], label: 'B' }, { features: [6.5, 7.5], label: 'B' },
  { features: [7.5, 6.0], label: 'B' }, { features: [6.0, 5.0], label: 'B' },
  { features: [5.0, 6.5], label: 'B' }, { features: [7.0, 7.0], label: 'B' },
  // Some overlap
  { features: [4.0, 4.0], label: 'A' }, { features: [4.5, 4.5], label: 'B' },
  { features: [3.5, 4.5], label: 'A' }, { features: [4.5, 3.5], label: 'B' },
];

const W = 400, H = 380;
const DOM = 9; // domain [0, 9]
const GRID_RES = 30;

export function KNNVisualizer(): JSX.Element {
  const [k, setK] = useState(3);
  const [query, setQuery] = useState<[number, number] | null>([4.2, 3.8]);
  const [training] = useState<KNNPoint[]>(DEFAULT_TRAINING);

  const pw = W - 32, ph = H - 60;

  function toSvg(x: number, y: number): [number, number] {
    return [16 + (x / DOM) * pw, 16 + (1 - y / DOM) * ph];
  }
  function fromSvg(sx: number, sy: number): [number, number] {
    return [(sx - 16) / pw * DOM, (1 - (sy - 16) / ph) * DOM];
  }

  // Compute decision boundary grid
  const boundary = useMemo(() => {
    const cells: JSX.Element[] = [];
    const step = DOM / GRID_RES;
    for (let r = 0; r < GRID_RES; r++) {
      for (let c = 0; c < GRID_RES; c++) {
        const x = step * c + step / 2;
        const y = step * r + step / 2;
        const result = knnClassify(training, [x, y], k);
        const color = result.prediction === 'A' ? COLORS.classA : COLORS.classB;
        const [sx, sy] = toSvg(x, y);
        const cellW = pw / GRID_RES;
        const cellH = ph / GRID_RES;
        cells.push(
          <rect key={`${r}-${c}`} x={sx - cellW / 2} y={sy - cellH / 2}
            width={cellW} height={cellH} fill={color} opacity={0.18} />,
        );
      }
    }
    return cells;
  }, [training, k, pw, ph]);

  // Compute kNN result for query
  const knnResult = useMemo(() => {
    if (!query) return null;
    return knnClassify(training, query, k);
  }, [training, query, k]);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [x, y] = fromSvg(sx, sy);
    if (x < 0 || x > DOM || y < 0 || y > DOM) return;
    setQuery([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }, [pw, ph]);

  const [qx, qy] = query ?? [0, 0];
  const [qsx, qsy] = toSvg(qx, qy);
  const predColor = knnResult?.prediction === 'A' ? COLORS.classA : COLORS.classB;

  return (
    <div style={{ background: COLORS.surface1, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          k-Nearest Neighbors Classifier
        </h3>
        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '14px' }}>
          Click the plot to place a query point. Shading shows the decision boundary.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px' }}>
        <div style={{ padding: '16px' }}>
          <svg width={W} height={H} style={{ maxWidth: '100%', cursor: 'crosshair' }}
            role="img" aria-label="k-NN visualization — click to set query point"
            onClick={handleClick}>
            {/* Decision boundary */}
            {boundary}

            {/* Neighbor lines */}
            {query && knnResult?.neighbors.map(({ point }, i) => {
              const [nx, ny] = toSvg(point.features[0]!, point.features[1]!);
              return <line key={i} x1={qsx} y1={qsy} x2={nx} y2={ny}
                stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4 2" />;
            })}

            {/* Training points */}
            {training.map((pt, i) => {
              const [sx, sy] = toSvg(pt.features[0]!, pt.features[1]!);
              const isNeighbor = knnResult?.neighbors.some(n => n.point === pt) ?? false;
              const color = pt.label === 'A' ? COLORS.classA : COLORS.classB;
              return (
                <g key={i}>
                  {isNeighbor && <circle cx={sx} cy={sy} r={11}
                    fill="none" stroke="white" strokeWidth={1.5} opacity={0.7} />}
                  <circle cx={sx} cy={sy} r={7} fill={color}
                    stroke={isNeighbor ? 'white' : 'rgba(0,0,0,0.3)'}
                    strokeWidth={isNeighbor ? 1.5 : 1} />
                  <text x={sx} y={sy + 4} textAnchor="middle"
                    fontSize={8} fill="white" fontWeight={700}>{pt.label}</text>
                </g>
              );
            })}

            {/* Query point */}
            {query && (
              <g>
                <circle cx={qsx} cy={qsy} r={10}
                  fill={`${predColor}40`}
                  stroke={predColor} strokeWidth={2.5} />
                <text x={qsx} y={qsy + 4} textAnchor="middle"
                  fontSize={9} fill="white" fontWeight={700}>?</text>
              </g>
            )}

            {/* Legend */}
            <circle cx={24} cy={H - 18} r={6} fill={COLORS.classA} />
            <text x={34} y={H - 14} fontSize={10} fill="#9CA3AF">Class A</text>
            <circle cx={90} cy={H - 18} r={6} fill={COLORS.classB} />
            <text x={100} y={H - 14} fontSize={10} fill="#9CA3AF">Class B</text>
          </svg>
        </div>

        {/* Controls + state */}
        <div style={{ borderLeft: `1px solid ${COLORS.border}`, padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
              k = {k} neighbors
            </div>
            <input type="range" min={1} max={10} step={1} value={k}
              aria-label="Number of neighbors k"
              onChange={e => setK(Number(e.target.value))}
              style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: '10px', color: '#4B5563', marginTop: '2px' }}>
              <span>1 (flexible)</span><span>10 (smooth)</span>
            </div>
          </div>

          {knnResult && query && (
            <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                Query: ({qx.toFixed(1)}, {qy.toFixed(1)})
              </div>
              <div style={{ color: predColor, fontSize: '14px', fontWeight: 700,
                marginBottom: '8px' }}>
                → Class {knnResult.prediction}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                {k} nearest neighbors:
              </div>
              {knnResult.neighbors.map(({ point, distance }, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: '11px', padding: '2px 0',
                  borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: point.label === 'A' ? COLORS.classA : COLORS.classB }}>
                    {point.label} ({point.features[0]?.toFixed(1)}, {point.features[1]?.toFixed(1)})
                  </span>
                  <span style={{ color: '#9CA3AF' }}>d={distance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: COLORS.surface2, borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
              Distance metric
            </div>
            <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
              'd(x,x\') = \\sqrt{\\sum_j (x_j - x\'_j)^2}',
            ) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

