import { useState, useCallback } from 'react';
import { interpolateColor } from '../utils/mathUtils';

const CHAPTER_COLOR = '#F59E0B';

const DEPTH_MAP = Array.from({ length: 144 }, (_, i) => {
  const row = Math.floor(i / 12);
  const col = i % 12;
  return 0.5 + 0.5 * Math.sin(row * 0.8 + col * 0.6);
});

const STYLE_NAMES = ['Impressionist', 'Sketch', 'Watercolor'];

const BASE_IMAGE_DATA = Array.from({ length: 64 }, (_, i) => ({
  r: Math.round(100 + (i % 8) * 15),
  g: Math.round(80 + Math.floor(i / 8) * 10),
  b: Math.round(150 - (i % 8) * 8),
}));

interface ActionResult {
  action: string;
  conf: number;
}

const ACTION_RESULTS: ActionResult[][] = [
  [{ action: 'Standing', conf: 0.92 }, { action: 'Walking', conf: 0.05 }, { action: 'Sitting', conf: 0.03 }],
  [{ action: 'Standing', conf: 0.08 }, { action: 'Walking', conf: 0.89 }, { action: 'Sitting', conf: 0.03 }],
  [{ action: 'Standing', conf: 0.04 }, { action: 'Walking', conf: 0.07 }, { action: 'Sitting', conf: 0.89 }],
];

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface-2, #1A1A24)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      {children}
    </div>
  );
}

function CardTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ fontSize: '20px' }} aria-hidden="true">{emoji}</span>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>{title}</span>
    </div>
  );
}

function ActionRecognitionCard() {
  const [selectedFigure, setSelectedFigure] = useState<number | null>(null);

  const results = selectedFigure !== null ? ACTION_RESULTS[selectedFigure]! : [];

  return (
    <CardWrapper>
      <CardTitle emoji="🏃" title="Human Action Recognition" />
      <svg
        width={200} height={80}
        style={{ display: 'block', margin: '0 auto' }}
        aria-label="Stick figures: standing, walking, sitting"
      >
        {/* Figure 1: Standing */}
        <g style={{ cursor: 'pointer' }} onClick={() => setSelectedFigure(0)}
          aria-label="Standing figure" role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelectedFigure(0)}>
          <circle cx={30} cy={15} r={6} fill={selectedFigure === 0 ? CHAPTER_COLOR : '#9CA3AF'} />
          <line x1={30} y1={21} x2={30} y2={51} stroke={selectedFigure === 0 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={15} y1={31} x2={45} y2={31} stroke={selectedFigure === 0 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={30} y1={51} x2={20} y2={71} stroke={selectedFigure === 0 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={30} y1={51} x2={40} y2={71} stroke={selectedFigure === 0 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <text x={30} y={78} textAnchor="middle" fill="#9CA3AF" fontSize={9}>Stand</text>
        </g>
        {/* Figure 2: Walking */}
        <g style={{ cursor: 'pointer' }} onClick={() => setSelectedFigure(1)}
          aria-label="Walking figure" role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelectedFigure(1)}>
          <circle cx={90} cy={15} r={6} fill={selectedFigure === 1 ? CHAPTER_COLOR : '#9CA3AF'} />
          <line x1={90} y1={21} x2={90} y2={46} stroke={selectedFigure === 1 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={75} y1={26} x2={105} y2={36} stroke={selectedFigure === 1 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={90} y1={46} x2={80} y2={71} stroke={selectedFigure === 1 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={90} y1={46} x2={100} y2={66} stroke={selectedFigure === 1 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <text x={90} y={78} textAnchor="middle" fill="#9CA3AF" fontSize={9}>Walk</text>
        </g>
        {/* Figure 3: Sitting */}
        <g style={{ cursor: 'pointer' }} onClick={() => setSelectedFigure(2)}
          aria-label="Sitting figure" role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelectedFigure(2)}>
          <circle cx={155} cy={15} r={6} fill={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} />
          <line x1={155} y1={21} x2={155} y2={51} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={140} y1={31} x2={170} y2={31} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={155} y1={51} x2={140} y2={66} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={140} y1={66} x2={140} y2={71} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={155} y1={51} x2={170} y2={61} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <line x1={170} y1={61} x2={170} y2={66} stroke={selectedFigure === 2 ? CHAPTER_COLOR : '#9CA3AF'} strokeWidth={2} />
          <text x={155} y={78} textAnchor="middle" fill="#9CA3AF" fontSize={9}>Sit</text>
        </g>
      </svg>
      {results.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {results.map(r => (
            <div key={r.action} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                <span style={{ color: '#E5E7EB' }}>{r.action}</span>
                <span style={{ color: CHAPTER_COLOR }}>{(r.conf * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: '6px', background: '#374151', borderRadius: '3px' }}>
                <div style={{ width: `${r.conf * 100}%`, height: '100%', background: CHAPTER_COLOR, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedFigure === null && (
        <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
          Click a figure to classify
        </p>
      )}
    </CardWrapper>
  );
}

function ImageCaptioningCard() {
  const [caption, setCaption] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateCaption = useCallback(() => {
    if (generating) return;
    setCaption([]);
    setGenerating(true);
    const words = ['A', 'person', 'stands', 'under', 'a', 'tree.'];
    let i = 0;
    const addWord = () => {
      if (i >= words.length) { setGenerating(false); return; }
      setCaption(prev => [...prev, words[i]!]);
      i++;
      setTimeout(addWord, 300);
    };
    setTimeout(addWord, 300);
  }, [generating]);

  return (
    <CardWrapper>
      <CardTitle emoji="📝" title="Image Captioning" />
      <svg width={200} height={100} style={{ display: 'block', margin: '0 auto' }}
        aria-label="Simple scene with sun, tree, and person">
        <rect width={200} height={100} fill="#0A0A0F" rx={4} />
        <rect width={200} height={60} fill="#0F172A" />
        <rect y={60} width={200} height={40} fill="#1A2E1A" />
        <circle cx={160} cy={20} r={15} fill="#FBBF24" />
        <rect x={75} y={50} width={10} height={30} fill="#78350F" />
        <polygon points="80,15 55,60 105,60" fill="#16A34A" />
        <circle cx={35} cy={50} r={6} fill="#F9A8D4" />
        <line x1={35} y1={56} x2={35} y2={75} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={25} y1={63} x2={45} y2={63} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={35} y1={75} x2={28} y2={88} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={35} y1={75} x2={42} y2={88} stroke="#F9A8D4" strokeWidth={2} />
      </svg>
      <div style={{ marginTop: '10px', minHeight: '28px', textAlign: 'center', fontSize: '13px', color: '#E5E7EB', fontStyle: 'italic' }}>
        {caption.length > 0 ? `"${caption.join(' ')}"` : '\u00a0'}
        {generating && <span style={{ marginLeft: '4px', color: CHAPTER_COLOR }}>▊</span>}
      </div>
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <button
          onClick={generateCaption}
          disabled={generating}
          aria-label="Generate image caption"
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
            background: generating ? '#374151' : CHAPTER_COLOR,
            border: 'none', color: generating ? '#9CA3AF' : '#0A0A0F',
            cursor: generating ? 'not-allowed' : 'pointer', fontWeight: 600,
          }}
        >
          {generating ? 'Generating…' : 'Generate Caption'}
        </button>
      </div>
    </CardWrapper>
  );
}

function ReconstructionCard() {
  return (
    <CardWrapper>
      <CardTitle emoji="🏔️" title="3D Reconstruction" />
      <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', textAlign: 'center' }}>
        Depth Map (simulated)
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 18px)', gap: '1px', margin: '0 auto', width: 'fit-content' }}
        role="img" aria-label="Simulated depth map grid"
      >
        {DEPTH_MAP.map((d, i) => (
          <div key={i} style={{
            width: 18, height: 18,
            background: interpolateColor('#1A0A00', '#F59E0B', d),
          }} title={`depth: ${d.toFixed(2)}`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#9CA3AF' }}>
        <span style={{ color: '#1A0A00', textShadow: '0 0 2px #fff' }}>Far</span>
        <div style={{
          height: '6px', flex: 1, margin: '2px 8px 0',
          background: `linear-gradient(to right, #1A0A00, #F59E0B)`,
          borderRadius: '3px',
        }} />
        <span style={{ color: CHAPTER_COLOR }}>Near</span>
      </div>
    </CardWrapper>
  );
}

function StyleTransferCard() {
  const [selectedStyle, setSelectedStyle] = useState(0);

  const styledImage = BASE_IMAGE_DATA.map((pixel, i) => {
    if (selectedStyle === 0) {
      return {
        r: Math.min(255, Math.round(pixel.r * 1.2)),
        g: Math.min(255, Math.round(pixel.g * 0.8)),
        b: Math.min(255, Math.round(pixel.b * 0.6)),
      };
    } else if (selectedStyle === 1) {
      const grayscale = Math.round(0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b);
      const styled = Math.min(255, Math.max(0, Math.abs(grayscale - 128) * 2));
      return { r: styled, g: styled, b: styled };
    } else {
      return {
        r: Math.min(255, Math.round(pixel.r * 0.5 + 128)),
        g: Math.min(255, Math.round(pixel.g * 0.5 + 148)),
        b: Math.min(255, Math.round(pixel.b * 0.5 + 128)),
      };
    }
  });

  return (
    <CardWrapper>
      <CardTitle emoji="🎨" title="Style Transfer" />
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>Original</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: '1px' }}
            role="img" aria-label="Original image">
            {BASE_IMAGE_DATA.map((px, i) => (
              <div key={i} style={{ width: 22, height: 22, background: `rgb(${px.r},${px.g},${px.b})` }} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: CHAPTER_COLOR, marginBottom: '4px' }}>{STYLE_NAMES[selectedStyle]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: '1px' }}
            role="img" aria-label={`${STYLE_NAMES[selectedStyle]} styled image`}>
            {styledImage.map((px, i) => (
              <div key={i} style={{ width: 22, height: 22, background: `rgb(${px.r},${px.g},${px.b})` }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
        {STYLE_NAMES.map((name, i) => (
          <button key={i} onClick={() => setSelectedStyle(i)}
            aria-pressed={selectedStyle === i}
            style={{
              padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              background: selectedStyle === i ? `${CHAPTER_COLOR}20` : 'transparent',
              border: `1px solid ${selectedStyle === i ? CHAPTER_COLOR : 'rgba(255,255,255,0.2)'}`,
              color: selectedStyle === i ? CHAPTER_COLOR : 'white',
            }}
          >{name}</button>
        ))}
      </div>
    </CardWrapper>
  );
}

function SelfDrivingCard() {
  return (
    <CardWrapper>
      <CardTitle emoji="🚗" title="Self-Driving Perception" />
      <svg width={200} height={120} style={{ display: 'block', margin: '0 auto' }}
        aria-label="Self-driving car perception with bounding boxes">
        <rect y={40} width={200} height={80} fill="#374151" rx={0} />
        {[0,1,2,3].map(i => (
          <rect key={i} x={30 + i * 40} y={77} width={20} height={4} fill="white" />
        ))}
        <rect x={20} y={45} width={60} height={50} fill="none" stroke="#10B981" strokeWidth={2} />
        <text x={22} y={42} fill="#10B981" fontSize={9} fontWeight="bold">Car 0.95</text>
        <rect x={90} y={35} width={40} height={60} fill="none" stroke="#FBBF24" strokeWidth={2} />
        <text x={90} y={32} fill="#FBBF24" fontSize={9} fontWeight="bold">Ped 0.87</text>
        <rect x={140} y={50} width={45} height={50} fill="none" stroke="#3B82F6" strokeWidth={2} />
        <text x={140} y={47} fill="#3B82F6" fontSize={9} fontWeight="bold">Bike 0.73</text>
        <rect x={25} y={65} width={50} height={20} fill="#6B7280" rx={3} />
        <circle cx={35} cy={87} r={6} fill="#374151" stroke="#9CA3AF" strokeWidth={1} />
        <circle cx={65} cy={87} r={6} fill="#374151" stroke="#9CA3AF" strokeWidth={1} />
        <circle cx={110} cy={50} r={5} fill="#F9A8D4" />
        <line x1={110} y1={55} x2={110} y2={75} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={100} y1={62} x2={120} y2={62} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={110} y1={75} x2={103} y2={88} stroke="#F9A8D4" strokeWidth={2} />
        <line x1={110} y1={75} x2={117} y2={88} stroke="#F9A8D4" strokeWidth={2} />
      </svg>
      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', textAlign: 'center' }}>
        Real-time multi-class detection for autonomous vehicles
      </p>
    </CardWrapper>
  );
}

function MedicalImagingCard() {
  return (
    <CardWrapper>
      <CardTitle emoji="🔬" title="Medical Imaging" />
      <svg width={200} height={160} style={{ display: 'block', margin: '0 auto' }}
        aria-label="Medical scan with anomaly detection">
        <rect width={200} height={160} fill="#0A0A0F" rx={4} />
        <circle cx={100} cy={85} r={70} fill="#1F2937" />
        <circle cx={80} cy={75} r={20} fill="#2D3748" opacity={0.8} />
        <circle cx={120} cy={95} r={18} fill="#2D3748" opacity={0.8} />
        <circle cx={90} cy={105} r={15} fill="#2D3748" opacity={0.6} />
        <circle cx={115} cy={70} r={12} fill="#374151" opacity={0.7} />
        <circle cx={75} cy={65} r={15} fill="none" stroke="#EF4444" strokeWidth={2.5} />
        <circle cx={75} cy={65} r={10} fill="#7F1D1D" opacity={0.6} />
        <text x={75} y={45} textAnchor="middle" fill="#EF4444" fontSize={10} fontWeight="bold">Malignant 0.82</text>
        <circle cx={120} cy={95} r={4} fill="#10B981" />
        <text x={130} y={90} fill="#10B981" fontSize={9}>Benign</text>
        <circle cx={90} cy={105} r={4} fill="#10B981" />
        <text x={100} y={107} fill="#10B981" fontSize={9}>Benign</text>
        <circle cx={100} cy={85} r={70} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      </svg>
      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', textAlign: 'center' }}>
        AI-assisted tumor detection in medical scans
      </p>
    </CardWrapper>
  );
}

export default function CVApplicationsViz() {
  return (
    <div style={{ color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        <ActionRecognitionCard />
        <ImageCaptioningCard />
        <ReconstructionCard />
        <StyleTransferCard />
        <SelfDrivingCard />
        <MedicalImagingCard />
      </div>
    </div>
  );
}
