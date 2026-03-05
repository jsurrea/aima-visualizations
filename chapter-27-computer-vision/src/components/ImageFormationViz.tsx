import { useState, useEffect, useRef, useMemo } from 'react';
import { perspectiveProject, lambertShading } from '../algorithms';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const CUBE_VERTS: ReadonlyArray<readonly [number, number, number]> = [
  [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
  [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
];
const CUBE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]
];

export default function ImageFormationViz() {
  const [rotY, setRotY] = useState(30);
  const [focalLength, setFocalLength] = useState(150);
  const [lightAngle, setLightAngle] = useState(45);
  const [albedo, setAlbedo] = useState(0.7);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const projectedVerts = useMemo(() => {
    const angle = rotY * Math.PI / 180;
    return CUBE_VERTS.map(([x, y, z]) => {
      const xr = x * Math.cos(angle) + z * Math.sin(angle);
      const yr = y;
      const zr = -x * Math.sin(angle) + z * Math.cos(angle) + 4;
      return perspectiveProject(xr, yr, zr, focalLength);
    });
  }, [rotY, focalLength]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.createImageData(120, 120);
    const lightX = Math.cos(lightAngle * Math.PI / 180);
    const lightY = Math.sin(lightAngle * Math.PI / 180);
    const lightZ = 0.3;
    for (let py = 0; py < 120; py++) {
      for (let px = 0; px < 120; px++) {
        const nx = (px - 60) / 50;
        const ny = (py - 60) / 50;
        const dist2 = nx * nx + ny * ny;
        const idx = (py * 120 + px) * 4;
        if (dist2 <= 1) {
          const nz = Math.sqrt(Math.max(0, 1 - dist2));
          const intensity = lambertShading(nx, ny, nz, lightX, lightY, lightZ, albedo, 1.0);
          imgData.data[idx] = Math.round(intensity * 255);
          imgData.data[idx + 1] = Math.round(intensity * 200);
          imgData.data[idx + 2] = Math.round(intensity * 100);
          imgData.data[idx + 3] = 255;
        } else {
          imgData.data[idx] = 0;
          imgData.data[idx + 1] = 0;
          imgData.data[idx + 2] = 0;
          imgData.data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [lightAngle, albedo]);

  const v0 = projectedVerts[0];
  const frontNormalIntensity = lambertShading(
    0, 0, -1,
    Math.cos(lightAngle * Math.PI / 180),
    Math.sin(lightAngle * Math.PI / 180),
    0.3,
    albedo, 1.0
  );

  const sliderStyle: React.CSSProperties = {
    width: '100%', accentColor: '#F59E0B',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px',
  };

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Cube wireframe SVG */}
        <div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Perspective Projection</div>
          <svg
            width={300} height={300}
            style={{ background: '#0A0A0F', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="3D cube wireframe with perspective projection"
          >
            {CUBE_EDGES.map(([a, b], i) => {
              const pa = projectedVerts[a];
              const pb = projectedVerts[b];
              if (!pa || !pb) return null;
              return (
                <line
                  key={i}
                  x1={150 + pa.x} y1={150 + pa.y}
                  x2={150 + pb.x} y2={150 + pb.y}
                  stroke="#F59E0B" strokeWidth={1.5}
                />
              );
            })}
            {projectedVerts.map((p, i) =>
              p ? <circle key={i} cx={150 + p.x} cy={150 + p.y} r={3} fill="#F59E0B" /> : null
            )}
          </svg>
          <div
            dangerouslySetInnerHTML={{ __html: renderDisplayMath(`x = -\\frac{f \\cdot X}{Z}`) }}
            style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px' }}
          />
        </div>

        {/* Lambert sphere canvas */}
        <div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Lambertian Shading</div>
          <canvas
            ref={canvasRef}
            width={120} height={120}
            style={{ borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Lambert shading sphere visualization"
          />
          <div
            dangerouslySetInnerHTML={{ __html: renderInlineMath(`I = \\rho I_0 \\cos\\theta`) }}
            style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px' }}
          />
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#F59E0B' }}>Controls</div>

          <label style={labelStyle} htmlFor="rotY-slider">Rotation Y: {rotY}°</label>
          <input id="rotY-slider" type="range" min={0} max={360} step={1} value={rotY}
            onChange={e => setRotY(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Cube Y rotation angle" />

          <label style={{ ...labelStyle, marginTop: '12px' }} htmlFor="focal-slider">Focal Length: {focalLength}px</label>
          <input id="focal-slider" type="range" min={50} max={300} step={1} value={focalLength}
            onChange={e => setFocalLength(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Camera focal length" />

          <label style={{ ...labelStyle, marginTop: '12px' }} htmlFor="light-slider">Light Angle: {lightAngle}°</label>
          <input id="light-slider" type="range" min={0} max={180} step={1} value={lightAngle}
            onChange={e => setLightAngle(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Light source angle" />

          <label style={{ ...labelStyle, marginTop: '12px' }} htmlFor="albedo-slider">Albedo: {albedo.toFixed(2)}</label>
          <input id="albedo-slider" type="range" min={0.05} max={0.95} step={0.05} value={albedo}
            onChange={e => setAlbedo(Number((e.target as HTMLInputElement).value))}
            style={sliderStyle} aria-label="Surface albedo" />
        </div>
      </div>

      {/* State panel */}
      <div style={{
        marginTop: '16px', background: '#0A0A0F', borderRadius: '8px',
        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#9CA3AF' }}>Rotation Y: </span>{rotY}°</div>
        <div><span style={{ color: '#9CA3AF' }}>Focal Length: </span>{focalLength}px</div>
        <div><span style={{ color: '#9CA3AF' }}>Light Angle: </span>{lightAngle}°</div>
        <div><span style={{ color: '#9CA3AF' }}>Albedo: </span>{albedo.toFixed(2)}</div>
        <div><span style={{ color: '#9CA3AF' }}>Vertex 0 proj: </span>
          {v0 ? `(${v0.x.toFixed(1)}, ${v0.y.toFixed(1)})` : 'behind camera'}
        </div>
        <div><span style={{ color: '#9CA3AF' }}>Front-face I: </span>{frontNormalIntensity.toFixed(3)}</div>
      </div>
    </div>
  );
}
