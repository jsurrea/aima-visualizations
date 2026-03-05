import { useState, useMemo } from 'react';
import { iouBoundingBox, nmsBoxes } from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

const CANDIDATE_BOXES: ReadonlyArray<readonly [number, number, number, number]> = [
  [20,20,80,80],[25,15,85,85],[22,22,78,78],
  [100,30,170,90],[105,25,175,95],
  [30,110,90,180],[35,105,95,185],
  [110,110,170,175],
];
const SCORES = [0.92, 0.85, 0.78, 0.88, 0.72, 0.65, 0.58, 0.45];

const STEP_LABELS = ['All Boxes', 'Sorted by Score', 'After NMS'];

export default function ObjectDetectionViz() {
  const [step, setStep] = useState(0);
  const [iouThreshold, setIouThreshold] = useState(0.5);

  const keptIndices = useMemo(() => nmsBoxes(CANDIDATE_BOXES, SCORES, iouThreshold), [iouThreshold]);
  const suppressedIndices = useMemo(() =>
    CANDIDATE_BOXES.map((_, i) => i).filter(i => !keptIndices.includes(i)),
    [keptIndices]);

  const sortedByScore = useMemo(() =>
    Array.from({ length: CANDIDATE_BOXES.length }, (_, i) => i).sort((a, b) => SCORES[b]! - SCORES[a]!),
    []);

  const sampleIou = useMemo(() => iouBoundingBox(CANDIDATE_BOXES[0]!, CANDIDATE_BOXES[1]!), []);

  function getBoxStyle(idx: number): { stroke: string; opacity: number; strokeWidth: number } {
    if (step === 2) {
      if (keptIndices.includes(idx)) return { stroke: '#10B981', opacity: 1, strokeWidth: 2 };
      return { stroke: '#EF4444', opacity: 0.4, strokeWidth: 1.5 };
    }
    return { stroke: '#3B82F6', opacity: 1, strokeWidth: 1.5 };
  }

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
          Step {step + 1}/3: {STEP_LABELS[step]}
        </span>
        <button
          onClick={() => setStep(s => Math.min(2, s + 1))}
          disabled={step === 2}
          aria-label="Next step"
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: step === 2 ? '#4B5563' : 'white', cursor: step === 2 ? 'not-allowed' : 'pointer',
          }}
        >Next →</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Detection SVG */}
        <div>
          <svg
            width={200} height={200}
            style={{ background: '#1A1A24', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label={`Object detection: ${STEP_LABELS[step]}`}
          >
            <rect width={200} height={200} fill="#1A1A24" />
            <ellipse cx={55} cy={55} rx={25} ry={20} fill="#374151" />
            <ellipse cx={140} cy={62} rx={25} ry={22} fill="#374151" />
            <ellipse cx={62} cy={147} rx={22} ry={23} fill="#374151" />
            <ellipse cx={140} cy={142} rx={25} ry={22} fill="#374151" />

            {(step === 0 ? CANDIDATE_BOXES.map((_, i) => i) : sortedByScore).map((idx) => {
              const box = CANDIDATE_BOXES[idx]!;
              const style = getBoxStyle(idx);
              return (
                <g key={idx} opacity={style.opacity}>
                  <rect
                    x={box[0]} y={box[1]}
                    width={box[2] - box[0]} height={box[3] - box[1]}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                  />
                  {(step >= 1) && (
                    <text
                      x={box[0] + 2} y={box[1] + 10}
                      fill={style.stroke} fontSize={9} fontWeight="bold"
                    >{SCORES[idx]!.toFixed(2)}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}
            htmlFor="iou-thresh">IoU Threshold: {iouThreshold.toFixed(2)}</label>
          <input id="iou-thresh" type="range" min={0.2} max={0.8} step={0.05} value={iouThreshold}
            onChange={e => setIouThreshold(Number((e.target as HTMLInputElement).value))}
            style={{ width: '100%', accentColor: '#F59E0B' }} aria-label="IoU threshold for NMS" />

          <div style={{ marginTop: '16px', fontSize: '12px', color: '#9CA3AF' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#3B82F6' }}>■</span> All candidates
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#10B981' }}>■</span> Kept after NMS
            </div>
            <div>
              <span style={{ color: '#EF4444' }}>■</span> Suppressed
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#9CA3AF' }}>
            Sample IoU (box 0 vs 1): {sampleIou.toFixed(3)}
          </div>

          <div
            dangerouslySetInnerHTML={{ __html: renderDisplayMath(`\\text{IoU}(A,B) = \\frac{|A \\cap B|}{|A \\cup B|}`) }}
            style={{ marginTop: '8px', fontSize: '12px' }}
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
        <div><span style={{ color: '#9CA3AF' }}>Total boxes: </span>8</div>
        <div><span style={{ color: '#9CA3AF' }}>Kept: </span>{keptIndices.length}</div>
        <div><span style={{ color: '#9CA3AF' }}>Suppressed: </span>{suppressedIndices.length}</div>
        <div><span style={{ color: '#9CA3AF' }}>IoU threshold: </span>{iouThreshold.toFixed(2)}</div>
      </div>
    </div>
  );
}
