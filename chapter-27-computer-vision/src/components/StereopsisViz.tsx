import { useState, useMemo } from 'react';
import { computeDepthFromDisparity } from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

const INITIAL_POINTS = [
  { x: 250, depth: 3.0, color: '#6366F1' },
  { x: 180, depth: 5.0, color: '#10B981' },
  { x: 320, depth: 2.0, color: '#F59E0B' },
  { x: 250, depth: 8.0, color: '#EC4899' },
];

export default function StereopsisViz() {
  const [selectedPoint, setSelectedPoint] = useState(0);
  const [depths, setDepths] = useState<number[]>(INITIAL_POINTS.map(p => p.depth));
  const [baseline, setBaseline] = useState(100);
  const [focalLength, setFocalLength] = useState(100);

  const currentDepth = depths[selectedPoint]!;
  const disparity = (baseline * focalLength) / (currentDepth * 30);
  const computedDepth = computeDepthFromDisparity(disparity, baseline, focalLength);

  const curvePoints = useMemo(() => Array.from({ length: 50 }, (_, i) => {
    const z = 1 + i * 0.18;
    const d = baseline * focalLength / (z * 30);
    return { x: (z - 1) / 9 * 190 + 5, y: 75 - Math.min(70, d * 0.5) };
  }), [baseline, focalLength]);

  const curvePathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const sliderStyle: React.CSSProperties = { width: '100%', accentColor: '#F59E0B' };

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Main stereo SVG */}
        <div>
          <svg
            width={500} height={300}
            style={{ background: '#0A0A0F', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '100%' }}
            aria-label="Stereo vision diagram showing camera positions and scene points"
          >
            {/* Image plane */}
            <line x1={80} y1={90} x2={420} y2={90} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
            <text x={80} y={105} fill="#9CA3AF" fontSize={10}>Image Plane</text>

            {/* Left camera */}
            <circle cx={80} cy={40} r={10} fill="#6366F1" />
            <text x={65} y={30} fill="#6366F1" fontSize={11} fontWeight="bold">L</text>

            {/* Right camera */}
            <circle cx={420} cy={40} r={10} fill="#10B981" />
            <text x={425} y={30} fill="#10B981" fontSize={11} fontWeight="bold">R</text>

            {/* Baseline */}
            <line x1={80} y1={40} x2={420} y2={40} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4,4" />
            <text x={230} y={35} fill="#9CA3AF" fontSize={10} textAnchor="middle">b={baseline}</text>

            {/* Scene points */}
            {INITIAL_POINTS.map((pt, i) => {
              const sceneY = 160 + (depths[i]! - 1) * 10;
              const isSelected = i === selectedPoint;
              return (
                <g key={i}>
                  {isSelected && (
                    <>
                      <line x1={80} y1={40} x2={pt.x} y2={sceneY} stroke={pt.color} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
                      <line x1={420} y1={40} x2={pt.x} y2={sceneY} stroke={pt.color} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
                      <line
                        x1={80 + (pt.x - 80) * (90 - 40) / (sceneY - 40)}
                        y1={90}
                        x2={80 + (pt.x - 80) * (90 - 40) / (sceneY - 40)}
                        y2={96}
                        stroke={pt.color} strokeWidth={2}
                      />
                      <line
                        x1={420 + (pt.x - 420) * (90 - 40) / (sceneY - 40)}
                        y1={90}
                        x2={420 + (pt.x - 420) * (90 - 40) / (sceneY - 40)}
                        y2={96}
                        stroke={pt.color} strokeWidth={2}
                      />
                    </>
                  )}
                  <circle
                    cx={pt.x} cy={sceneY} r={isSelected ? 10 : 7}
                    fill={pt.color} opacity={isSelected ? 1 : 0.5}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedPoint(i)}
                    role="button"
                    aria-label={`Scene point ${i + 1}, depth ${depths[i]!.toFixed(1)}`}
                  />
                  <text x={pt.x + 12} y={sceneY + 4} fill={pt.color} fontSize={10}>Z={depths[i]!.toFixed(1)}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', marginBottom: '8px' }}>Select Point</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {INITIAL_POINTS.map((pt, i) => (
              <button key={i}
                onClick={() => setSelectedPoint(i)}
                aria-pressed={selectedPoint === i}
                style={{
                  padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                  background: selectedPoint === i ? `${pt.color}30` : 'transparent',
                  border: `2px solid ${selectedPoint === i ? pt.color : 'rgba(255,255,255,0.2)'}`,
                  color: selectedPoint === i ? pt.color : 'white',
                }}
              >Point {i + 1}</button>
            ))}
          </div>

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}
            htmlFor="depth-slider">Depth (Z): {currentDepth.toFixed(1)}</label>
          <input id="depth-slider" type="range" min={1.0} max={10.0} step={0.1} value={currentDepth}
            onChange={e => {
              const v = Number((e.target as HTMLInputElement).value);
              setDepths(d => d.map((dv, i) => i === selectedPoint ? v : dv));
            }}
            style={sliderStyle} aria-label="Scene point depth" />

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px', marginTop: '8px' }}
            htmlFor="baseline-slider">Baseline: {baseline}</label>
          <input id="baseline-slider" type="range" min={50} max={200} step={5} value={baseline}
            onChange={e => setBaseline(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Camera baseline distance" />

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px', marginTop: '8px' }}
            htmlFor="focal-stereo">Focal Length: {focalLength}</label>
          <input id="focal-stereo" type="range" min={50} max={200} step={5} value={focalLength}
            onChange={e => setFocalLength(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Camera focal length" />

          {/* Disparity curve */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Disparity vs. Depth</div>
            <svg width={200} height={80} aria-label="Disparity-depth curve">
              <rect width={200} height={80} fill="#0A0A0F" rx={4} />
              <path d={curvePathD} stroke="#F59E0B" strokeWidth={2} fill="none" />
              <text x={5} y={78} fill="#6B7280" fontSize={9}>Z=1</text>
              <text x={180} y={78} fill="#6B7280" fontSize={9}>Z=10</text>
            </svg>
          </div>
        </div>
      </div>

      <div
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(`d = \\frac{b \\cdot f}{Z}`) }}
        style={{ marginTop: '12px', fontSize: '13px' }}
      />

      {/* State panel */}
      <div style={{
        marginTop: '12px', background: '#0A0A0F', borderRadius: '8px',
        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#9CA3AF' }}>Selected point: </span>{selectedPoint + 1}</div>
        <div><span style={{ color: '#9CA3AF' }}>Depth Z: </span>{currentDepth.toFixed(2)}</div>
        <div><span style={{ color: '#9CA3AF' }}>Disparity: </span>{disparity.toFixed(2)}px</div>
        <div><span style={{ color: '#9CA3AF' }}>Computed Z: </span>
          {computedDepth !== null ? computedDepth.toFixed(2) : 'N/A'}
        </div>
      </div>
    </div>
  );
}
