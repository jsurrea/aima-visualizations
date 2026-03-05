import { useState, useEffect, useRef, useMemo } from 'react';
import { ssdOpticalFlow } from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

function makeFrame(cx: number, cy: number): ReadonlyArray<number> {
  const sigma = 2, amplitude = 200, background = 30;
  return Array.from({ length: 16 * 16 }, (_, i) => {
    const px = i % 16, py = Math.floor(i / 16);
    return Math.round(Math.min(255,
      background + amplitude * Math.exp(-((px - cx) * (px - cx) + (py - cy) * (py - cy)) / (2 * sigma * sigma))
    ));
  });
}

/** Total pixel count in each 16×16 frame. */
const TOTAL_PIXELS = 16 * 16;

export default function OpticalFlowViz() {
  const [playing, setPlaying] = useState(false);
  const [currentPixelIdx, setCurrentPixelIdx] = useState(0);
  const [blockRadius, setBlockRadius] = useState(1);
  const [searchRadius, setSearchRadius] = useState(2);
  const [speed, setSpeed] = useState(100);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const frame1 = useMemo(() => makeFrame(8, 8), []);
  const frame2 = useMemo(() => makeFrame(10, 9), []);

  const flowVectors = useMemo(() =>
    ssdOpticalFlow(frame1, frame2, 16, 16, blockRadius, searchRadius),
    [frame1, frame2, blockRadius, searchRadius]);

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const step = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= speed) {
        lastTimeRef.current = timestamp;
        setCurrentPixelIdx(idx => {
          if (idx >= TOTAL_PIXELS - 1) {
            setPlaying(false);
            return TOTAL_PIXELS - 1;
          }
          return idx + 1;
        });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, reducedMotion]);

  const cx = currentPixelIdx % 16;
  const cy = Math.floor(currentPixelIdx / 16);
  const currentFlow = flowVectors[currentPixelIdx];

  const CELL = 18;

  function arrowPath(x: number, y: number, dx: number, dy: number): string {
    const sx = x * CELL + CELL / 2;
    const sy = y * CELL + CELL / 2;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return '';
    const scale = Math.min(len * 6, 15) / len;
    const ex = sx + dx * scale;
    const ey = sy + dy * scale;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 4;
    const a1x = ex - arrowSize * Math.cos(angle - Math.PI / 6);
    const a1y = ey - arrowSize * Math.sin(angle - Math.PI / 6);
    const a2x = ex - arrowSize * Math.cos(angle + Math.PI / 6);
    const a2y = ey - arrowSize * Math.sin(angle + Math.PI / 6);
    return `M${sx},${sy} L${ex},${ey} M${ex},${ey} L${a1x},${a1y} M${ex},${ey} L${a2x},${a2y}`;
  }

  const sliderStyle: React.CSSProperties = { width: '100%', accentColor: '#F59E0B' };

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Frame 1 */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Frame 1</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(16, ${CELL}px)`, gap: '1px', background: '#1A1A24' }}
            role="img" aria-label="Frame 1 pixel grid"
          >
            {frame1.map((v, i) => (
              <div key={i} style={{ width: CELL, height: CELL, background: `rgb(${v},${v},${v})` }} />
            ))}
          </div>
        </div>

        {/* Frame 2 with flow arrows overlay */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Frame 2 + Flow</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(16, ${CELL}px)`, gap: '1px', background: '#1A1A24' }}
            role="img" aria-label="Frame 2 with optical flow vectors"
          >
            {frame2.map((v, i) => {
              const isCurrentPixel = i === currentPixelIdx;
              return (
                <div key={i} style={{
                  width: CELL, height: CELL,
                  background: isCurrentPixel ? '#F59E0B' : `rgb(${v},${v},${v})`,
                  outline: isCurrentPixel ? '2px solid #F59E0B' : 'none',
                }} />
              );
            })}
          </div>
          {/* SVG overlay for arrows */}
          <svg
            style={{ position: 'absolute', top: '20px', left: 0, pointerEvents: 'none' }}
            width={16 * CELL} height={16 * CELL}
            aria-label="Optical flow arrows"
          >
            {flowVectors.slice(0, currentPixelIdx + 1).map((fv, i) => {
              const fx = i % 16;
              const fy = Math.floor(i / 16);
              const path = arrowPath(fx, fy, fv.dx, fv.dy);
              return path ? (
                <path key={i} d={path} stroke="#F59E0B" strokeWidth={1.5} fill="none" />
              ) : null;
            })}
          </svg>
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: '#F59E0B', border: 'none', color: '#0A0A0F',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => { setPlaying(false); setCurrentPixelIdx(0); }}
              aria-label="Reset animation"
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', cursor: 'pointer',
              }}
            >↺ Reset</button>
          </div>

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}
            htmlFor="block-radius">Block Radius: {blockRadius}</label>
          <input id="block-radius" type="range" min={1} max={3} step={1} value={blockRadius}
            onChange={e => { setBlockRadius(Number((e.target as HTMLInputElement).value)); setCurrentPixelIdx(0); }}
            style={sliderStyle} aria-label="Block matching radius" />

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px', marginTop: '8px' }}
            htmlFor="search-radius">Search Radius: {searchRadius}</label>
          <input id="search-radius" type="range" min={1} max={4} step={1} value={searchRadius}
            onChange={e => { setSearchRadius(Number((e.target as HTMLInputElement).value)); setCurrentPixelIdx(0); }}
            style={sliderStyle} aria-label="Search radius" />

          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px', marginTop: '8px' }}
            htmlFor="speed-slider">Speed: {speed}ms</label>
          <input id="speed-slider" type="range" min={50} max={500} step={10} value={speed}
            onChange={e => setSpeed(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Animation speed in milliseconds" />
        </div>
      </div>

      <div
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(`\\text{SSD}(dx,dy) = \\sum_{u,v} [I_1(x+u,y+v) - I_2(x+dx+u,y+dy+v)]^2`) }}
        style={{ marginTop: '12px', fontSize: '13px' }}
      />

      {/* State panel */}
      <div style={{
        marginTop: '12px', background: '#0A0A0F', borderRadius: '8px',
        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#9CA3AF' }}>Current pixel: </span>({cx},{cy})</div>
        <div><span style={{ color: '#9CA3AF' }}>Flow (dx,dy): </span>
          {currentFlow ? `(${currentFlow.dx},${currentFlow.dy})` : '—'}
        </div>
        <div><span style={{ color: '#9CA3AF' }}>Block Radius: </span>{blockRadius}</div>
        <div><span style={{ color: '#9CA3AF' }}>Search Radius: </span>{searchRadius}</div>
        <div><span style={{ color: '#9CA3AF' }}>Progress: </span>{currentPixelIdx}/{TOTAL_PIXELS}</div>
      </div>
    </div>
  );
}
