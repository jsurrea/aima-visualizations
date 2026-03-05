import { useState, useMemo } from 'react';
import { applyConvolution2D } from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

const KERNELS: ReadonlyArray<{ name: string; k: ReadonlyArray<ReadonlyArray<number>> }> = [
  { name: 'Horizontal Edge', k: [[-1,-1,-1],[0,0,0],[1,1,1]] },
  { name: 'Vertical Edge',   k: [[-1,0,1],[-1,0,1],[-1,0,1]] },
  { name: 'Corner',          k: [[1,0,-1],[0,0,0],[-1,0,1]] },
];

function heatColor(t: number): string {
  const r = Math.round(t * 245 + (1 - t) * 67);
  const g = Math.round(t * 158 + (1 - t) * 56);
  const b = Math.round(t * 11 + (1 - t) * 130);
  return `rgb(${r},${g},${b})`;
}

export default function CNNViz() {
  const [selectedKernel, setSelectedKernel] = useState(0);
  const [rotate90, setRotate90] = useState(false);
  const [shiftRight, setShiftRight] = useState(false);

  const BASE_IMAGE = useMemo(() =>
    Array.from({ length: 64 }, (_, i) => {
      const x = i % 8, y = Math.floor(i / 8);
      return (y === 0 || x === 4) ? 200 : 30;
    }), []);

  const augmented = useMemo(() => {
    let img: number[] = [...BASE_IMAGE];
    if (shiftRight) {
      img = Array.from({ length: 64 }, (_, i) => {
        const x = i % 8, y = Math.floor(i / 8);
        const srcX = (x - 1 + 8) % 8;
        return BASE_IMAGE[y * 8 + srcX]!;
      });
    }
    if (rotate90) {
      const src = img;
      img = Array.from({ length: 64 }, (_, i) => {
        const x = i % 8, y = Math.floor(i / 8);
        return src[(8 - 1 - x) * 8 + y]!;
      });
    }
    return img;
  }, [BASE_IMAGE, rotate90, shiftRight]);

  const featureMap = useMemo(() => {
    const kernel = KERNELS[selectedKernel]!;
    const raw = applyConvolution2D(augmented, 8, 8, kernel.k);
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    return raw.map(v => max > min ? (v - min) / (max - min) : 0);
  }, [augmented, selectedKernel]);

  const maxIdx = featureMap.indexOf(Math.max(...featureMap));
  const maxX = maxIdx % 8, maxY = Math.floor(maxIdx / 8);
  const maxVal = featureMap[maxIdx]!;

  function kernelCellColor(v: number): string {
    if (v < 0) return `rgba(239,68,68,${Math.min(1, Math.abs(v))})`;
    if (v > 0) return `rgba(59,130,246,${Math.min(1, v)})`;
    return '#374151';
  }

  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Input grid */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Input (8×8)</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 30px)', gap: '1px', background: '#1A1A24' }}
            role="img" aria-label="Input image grid"
          >
            {augmented.map((v, i) => (
              <div key={i} style={{
                width: 30, height: 30,
                background: `rgb(${Math.round(v)},${Math.round(v)},${Math.round(v)})`,
              }} />
            ))}
          </div>
        </div>

        <div style={{ fontSize: '24px', alignSelf: 'center', color: '#9CA3AF' }} aria-hidden="true">→</div>

        {/* Kernel */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
            Kernel: {KERNELS[selectedKernel]!.name}
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gap: '2px', background: '#1A1A24' }}
            role="img" aria-label={`${KERNELS[selectedKernel]!.name} convolution kernel`}
          >
            {KERNELS[selectedKernel]!.k.flat().map((v, i) => (
              <div key={i} style={{
                width: 40, height: 40,
                background: kernelCellColor(v),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600, color: 'white',
              }}>{v}</div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '24px', alignSelf: 'center', color: '#9CA3AF' }} aria-hidden="true">→</div>

        {/* Feature map */}
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Feature Map (8×8)</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 30px)', gap: '1px', background: '#1A1A24' }}
            role="img" aria-label="Feature map output"
          >
            {featureMap.map((t, i) => (
              <div key={i} style={{
                width: 30, height: 30,
                background: heatColor(t),
                outline: i === maxIdx ? '2px solid #F59E0B' : 'none',
              }} />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', marginBottom: '8px' }}>Kernel</div>
          {KERNELS.map((k, i) => (
            <button key={i}
              onClick={() => setSelectedKernel(i)}
              aria-pressed={selectedKernel === i}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', marginBottom: '4px', borderRadius: '8px',
                background: selectedKernel === i ? '#F59E0B20' : 'transparent',
                border: `1px solid ${selectedKernel === i ? '#F59E0B' : 'rgba(255,255,255,0.2)'}`,
                color: selectedKernel === i ? '#F59E0B' : 'white', cursor: 'pointer', fontSize: '13px',
              }}
            >{k.name}</button>
          ))}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setRotate90(r => !r)}
              aria-pressed={rotate90}
              style={{
                padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                background: rotate90 ? '#F59E0B20' : 'transparent',
                border: `1px solid ${rotate90 ? '#F59E0B' : 'rgba(255,255,255,0.2)'}`,
                color: rotate90 ? '#F59E0B' : 'white',
              }}
            >Rotate 90°</button>
            <button
              onClick={() => setShiftRight(s => !s)}
              aria-pressed={shiftRight}
              style={{
                padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                background: shiftRight ? '#F59E0B20' : 'transparent',
                border: `1px solid ${shiftRight ? '#F59E0B' : 'rgba(255,255,255,0.2)'}`,
                color: shiftRight ? '#F59E0B' : 'white',
              }}
            >Shift Right</button>
          </div>
        </div>
      </div>

      <div
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(`h(x,y) = \\sum_{u}\\sum_{v} f(u,v) \\cdot g(x-u,\\, y-v)`) }}
        style={{ marginTop: '12px', fontSize: '13px' }}
      />

      {/* State panel */}
      <div style={{
        marginTop: '12px', background: '#0A0A0F', borderRadius: '8px',
        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#9CA3AF' }}>Kernel: </span>{KERNELS[selectedKernel]!.name}</div>
        <div><span style={{ color: '#9CA3AF' }}>Max activation: </span>({maxX},{maxY})</div>
        <div><span style={{ color: '#9CA3AF' }}>Max value: </span>{maxVal.toFixed(3)}</div>
        <div><span style={{ color: '#9CA3AF' }}>Rotate 90°: </span>{rotate90 ? 'on' : 'off'}</div>
        <div><span style={{ color: '#9CA3AF' }}>Shift Right: </span>{shiftRight ? 'on' : 'off'}</div>
      </div>
    </div>
  );
}
