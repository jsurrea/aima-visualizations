import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  viterbiPOSTagger,
  bestTagSequence,
  type HMMModel,
  type ViterbiStep,
} from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR = '#F59E0B';
const TAGS = ['DT', 'NN', 'VB', 'JJ', 'RB'] as const;
type Tag = (typeof TAGS)[number];

const TAG_COLORS: Record<Tag, string> = {
  DT: '#6366F1',
  NN: '#10B981',
  VB: '#EC4899',
  JJ: '#3B82F6',
  RB: '#8B5CF6',
};

const PRESETS = [
  'the dog sees the cat',
  'a big dog chases the cat',
  'the cat slowly sees a small dog',
];

// ─── HMM Model ───────────────────────────────────────────────────────────────

function buildHMMModel(): HMMModel {
  const states: ReadonlyArray<string> = ['DT', 'NN', 'VB', 'JJ', 'RB'];
  const observations: ReadonlyArray<string> = [
    'the', 'dog', 'cat', 'sees', 'chases', 'a', 'big', 'small', 'quickly', 'slowly',
  ];

  const initial = new Map<string, number>([
    ['DT', 0.40],
    ['NN', 0.15],
    ['VB', 0.25],
    ['JJ', 0.10],
    ['RB', 0.10],
  ]);

  // Transition: prevTag → Map<nextTag, prob>
  const transition = new Map<string, ReadonlyMap<string, number>>([
    ['DT', new Map([['DT', 0.02], ['NN', 0.70], ['VB', 0.04], ['JJ', 0.22], ['RB', 0.02]])],
    ['NN', new Map([['DT', 0.20], ['NN', 0.05], ['VB', 0.65], ['JJ', 0.05], ['RB', 0.05]])],
    ['VB', new Map([['DT', 0.45], ['NN', 0.30], ['VB', 0.05], ['JJ', 0.05], ['RB', 0.15]])],
    ['JJ', new Map([['DT', 0.03], ['NN', 0.88], ['VB', 0.04], ['JJ', 0.03], ['RB', 0.02]])],
    ['RB', new Map([['DT', 0.10], ['NN', 0.10], ['VB', 0.75], ['JJ', 0.03], ['RB', 0.02]])],
  ]);

  // Emission: tag → Map<word, prob>
  const emission = new Map<string, ReadonlyMap<string, number>>([
    ['DT', new Map([
      ['the', 0.55], ['a', 0.40],
      ['dog', 0.01], ['cat', 0.01], ['sees', 0.01], ['chases', 0.01],
      ['big', 0.00], ['small', 0.00], ['quickly', 0.00], ['slowly', 0.01],
    ])],
    ['NN', new Map([
      ['the', 0.01], ['a', 0.01],
      ['dog', 0.42], ['cat', 0.42], ['sees', 0.04], ['chases', 0.04],
      ['big', 0.02], ['small', 0.02], ['quickly', 0.01], ['slowly', 0.01],
    ])],
    ['VB', new Map([
      ['the', 0.01], ['a', 0.01],
      ['dog', 0.04], ['cat', 0.04], ['sees', 0.42], ['chases', 0.42],
      ['big', 0.02], ['small', 0.02], ['quickly', 0.01], ['slowly', 0.01],
    ])],
    ['JJ', new Map([
      ['the', 0.01], ['a', 0.01],
      ['dog', 0.04], ['cat', 0.04], ['sees', 0.02], ['chases', 0.02],
      ['big', 0.40], ['small', 0.40], ['quickly', 0.03], ['slowly', 0.03],
    ])],
    ['RB', new Map([
      ['the', 0.01], ['a', 0.01],
      ['dog', 0.03], ['cat', 0.03], ['sees', 0.03], ['chases', 0.03],
      ['big', 0.04], ['small', 0.04], ['quickly', 0.39], ['slowly', 0.39],
    ])],
  ]);

  return { states, observations, initial, transition, emission };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#1A1A24',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '16px', fontWeight: 700, color: COLOR, marginBottom: '12px', marginTop: 0 }}>
      {children}
    </h3>
  );
}

// ─── Trellis SVG ─────────────────────────────────────────────────────────────

interface TrellisProps {
  words: string[];
  steps: ReadonlyArray<ViterbiStep>;
  revealedCols: number;
  bestPath: ReadonlyArray<{ word: string; tag: string }>;
  tags: ReadonlyArray<string>;
}

function TrellisChart({ words, steps, revealedCols, bestPath, tags }: TrellisProps) {
  if (words.length === 0) return null;

  const T = words.length;
  const S = tags.length;

  // Layout
  const colW = 110;
  const rowH = 56;
  const padLeft = 52;
  const padTop = 44;
  const nodeR = 20;

  const svgW = padLeft + T * colW + 20;
  const svgH = padTop + S * rowH + 24;

  // Build lookup: step (col) → tag → ViterbiStep
  const stepMap = new Map<string, ViterbiStep>();
  for (const s of steps) {
    stepMap.set(`${words.indexOf(s.word)}-${s.tag}`, s);
  }
  // Find col index properly
  const colOf = (word: string, idx: number) => idx;

  // Best path set
  const bestSet = new Set<string>();
  for (let i = 0; i < bestPath.length; i++) {
    bestSet.add(`${i}-${bestPath[i]!.tag}`);
  }

  // Node centre coords
  const cx = (col: number) => padLeft + col * colW + colW / 2;
  const cy = (row: number) => padTop + row * rowH + rowH / 2;

  // Build backpointer edges
  interface Edge {
    x1: number; y1: number; x2: number; y2: number;
    isBest: boolean; alpha: number;
  }
  const edges: Edge[] = [];

  for (let col = 1; col < T; col++) {
    if (col > revealedCols) break;
    for (let si = 0; si < S; si++) {
      const tag = tags[si]!;
      const key = `${col}-${tag}`;
      const cell = stepMap.get(key);
      if (!cell || cell.backpointer == null || cell.probability === 0) continue;
      const prevTag = cell.backpointer;
      const pi = tags.indexOf(prevTag);
      if (pi < 0) continue;
      const isBest = bestSet.has(`${col}-${tag}`) && bestSet.has(`${col - 1}-${prevTag}`);
      edges.push({
        x1: cx(col - 1), y1: cy(pi),
        x2: cx(col), y2: cy(si),
        isBest,
        alpha: isBest ? 1.0 : 0.2,
      });
    }
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: 'block', overflowX: 'auto' }}
      aria-label="Viterbi trellis diagram"
      role="img"
    >
      {/* Column headers (words) */}
      {words.map((w, col) => (
        col <= revealedCols && (
          <text
            key={`word-${col}`}
            x={cx(col)}
            y={padTop - 14}
            textAnchor="middle"
            fill={col <= revealedCols ? '#E5E7EB' : '#4B5563'}
            fontSize={13}
            fontWeight={600}
          >
            {w}
          </text>
        )
      ))}

      {/* Row headers (tags) */}
      {tags.map((tag, row) => (
        <text
          key={`tag-${row}`}
          x={padLeft - 8}
          y={cy(row) + 5}
          textAnchor="end"
          fill={TAG_COLORS[tag as Tag] ?? '#9CA3AF'}
          fontSize={12}
          fontWeight={700}
        >
          {tag}
        </text>
      ))}

      {/* Backpointer edges */}
      {edges.map((e, i) => (
        <line
          key={`edge-${i}`}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={e.isBest ? COLOR : 'rgba(255,255,255,0.25)'}
          strokeWidth={e.isBest ? 2.5 : 1}
          strokeOpacity={e.alpha}
        />
      ))}

      {/* Nodes */}
      {words.map((w, col) =>
        col <= revealedCols
          ? tags.map((tag, row) => {
              const key = `${col}-${tag}`;
              const cell = stepMap.get(key);
              const prob = cell?.probability ?? 0;
              const isBest = bestSet.has(key);
              const tagColor = TAG_COLORS[tag as Tag] ?? '#9CA3AF';
              const fillOpacity = prob > 0 ? 0.85 : 0.18;
              return (
                <g key={key}>
                  <circle
                    cx={cx(col)}
                    cy={cy(row)}
                    r={nodeR}
                    fill={isBest ? COLOR : tagColor}
                    fillOpacity={fillOpacity}
                    stroke={isBest ? COLOR : tagColor}
                    strokeWidth={isBest ? 2.5 : 1}
                    strokeOpacity={0.7}
                  />
                  <text
                    x={cx(col)}
                    y={cy(row) + 4}
                    textAnchor="middle"
                    fill={prob > 0 ? '#fff' : '#4B5563'}
                    fontSize={9}
                    fontWeight={600}
                  >
                    {prob > 0
                      ? (Math.log(prob + 1e-300)).toFixed(1)
                      : '—'}
                  </text>
                </g>
              );
            })
          : null
      )}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function POSTaggerVisualizer() {
  const model = useMemo(() => buildHMMModel(), []);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealedCols, setRevealedCols] = useState(-1);
  const [speed, setSpeed] = useState(1); // steps/sec

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const words = useMemo(
    () => PRESETS[selectedPreset]!.trim().split(/\s+/),
    [selectedPreset],
  );

  const steps = useMemo(
    () => viterbiPOSTagger(model, words),
    [model, words],
  );

  const bestPath = useMemo(
    () => bestTagSequence(model, words),
    [model, words],
  );

  const totalCols = words.length;

  // Reset when sentence changes
  useEffect(() => {
    setRevealedCols(-1);
    setIsPlaying(false);
  }, [selectedPreset]);

  // Animation loop
  const rafRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (prefersReducedMotion) {
      setRevealedCols(totalCols - 1);
      setIsPlaying(false);
      return;
    }

    const interval = 1000 / speed;

    const tick = (ts: number) => {
      if (ts - lastStepTimeRef.current >= interval) {
        lastStepTimeRef.current = ts;
        setRevealedCols(prev => {
          const next = prev + 1;
          if (next >= totalCols - 1) {
            stopAnimation();
            return totalCols - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, totalCols, prefersReducedMotion, stopAnimation]);

  const handlePlay = () => {
    if (revealedCols >= totalCols - 1) {
      setRevealedCols(-1);
    }
    lastStepTimeRef.current = 0;
    setIsPlaying(true);
  };

  const handlePause = () => stopAnimation();

  const handleStep = () => {
    setRevealedCols(prev => Math.min(prev + 1, totalCols - 1));
  };

  const handleStepBack = () => {
    setRevealedCols(prev => Math.max(prev - 1, -1));
  };

  const handleReset = () => {
    stopAnimation();
    setRevealedCols(-1);
  };

  // Current state info
  const currentCol = revealedCols;
  const currentWord = currentCol >= 0 ? words[currentCol] : null;
  const currentColSteps = useMemo(() => {
    if (currentCol < 0) return [];
    return TAGS.map(tag => {
      return steps.find(s => s.word === words[currentCol] && s.tag === tag) ?? null;
    }).filter((s): s is ViterbiStep => s !== null);
  }, [steps, currentCol, words]);

  const isDone = revealedCols >= totalCols - 1;

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', color: '#E5E7EB' }}>
      {/* Header */}
      <Card>
        <h2
          style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 700,
            color: COLOR,
            marginTop: 0,
            marginBottom: '8px',
          }}
        >
          Viterbi POS Tagger
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6, marginBottom: '12px' }}>
          A Hidden Markov Model assigns part-of-speech tags to words by finding
          the most probable tag sequence. The{' '}
          <strong style={{ color: '#E5E7EB' }}>Viterbi algorithm</strong> fills
          a trellis of probabilities column by column, keeping only the best
          predecessor at each cell, then backtracks to recover the optimal path.
        </p>
        <MathBlock
          latex={
            '\\delta_i(t) = \\max_{t\'} \\bigl[\\delta_{i-1}(t\')\\cdot P(t\\mid t\')\\bigr]\\cdot P(w_i\\mid t)'
          }
        />
        <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: 0 }}>
          Scores shown in the trellis are <InlineMath latex="\\log P" /> values.
          The highlighted path (gold) is the best tag sequence via backtracking.
        </p>
      </Card>

      {/* Tag legend */}
      <Card style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#9CA3AF', fontSize: '13px', marginRight: 4 }}>Tags:</span>
          {TAGS.map(tag => (
            <span
              key={tag}
              style={{
                background: `${TAG_COLORS[tag]}22`,
                border: `1px solid ${TAG_COLORS[tag]}55`,
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '13px',
                fontWeight: 700,
                color: TAG_COLORS[tag],
              }}
            >
              {tag}
            </span>
          ))}
          <span style={{ color: '#6B7280', fontSize: '12px', marginLeft: 8 }}>
            DT=Determiner · NN=Noun · VB=Verb · JJ=Adjective · RB=Adverb
          </span>
        </div>
      </Card>

      {/* Sentence selector */}
      <Card>
        <SectionTitle>Sentence Input</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => setSelectedPreset(i)}
              aria-pressed={selectedPreset === i}
              style={{
                background:
                  selectedPreset === i ? `${COLOR}22` : '#111118',
                border: `1px solid ${selectedPreset === i ? COLOR : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '8px',
                padding: '10px 16px',
                color: selectedPreset === i ? COLOR : '#D1D5DB',
                fontWeight: selectedPreset === i ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </Card>

      {/* Controls */}
      <Card>
        <SectionTitle>Playback Controls</SectionTitle>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '14px',
          }}
        >
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            style={controlBtnStyle(COLOR, isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleStep}
            disabled={revealedCols >= totalCols - 1}
            aria-label="Step forward one word column"
            style={controlBtnStyle('#6366F1', false, revealedCols >= totalCols - 1)}
          >
            ⏭ Step
          </button>
          <button
            onClick={handleStepBack}
            disabled={revealedCols < 0}
            aria-label="Step back one word column"
            style={controlBtnStyle('#6366F1', false, revealedCols < 0)}
          >
            ⏮ Back
          </button>
          <button
            onClick={handleReset}
            aria-label="Reset trellis"
            style={controlBtnStyle('#EC4899', false)}
          >
            ↺ Reset
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label
            htmlFor="pos-speed"
            style={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap' }}
          >
            Speed:
          </label>
          <input
            id="pos-speed"
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '120px', accentColor: COLOR }}
          />
          <span style={{ fontSize: '13px', color: '#D1D5DB', minWidth: 40 }}>
            {speed}×
          </span>
          <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: 8 }}>
            Column {Math.max(0, currentCol + 1)} / {totalCols}
          </span>
        </div>
      </Card>

      {/* Trellis */}
      <Card>
        <SectionTitle>Viterbi Trellis</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <TrellisChart
            words={words}
            steps={steps}
            revealedCols={revealedCols}
            bestPath={isDone ? bestPath : []}
            tags={model.states as string[]}
          />
        </div>
        {revealedCols < 0 && (
          <p style={{ color: '#6B7280', fontSize: '13px', textAlign: 'center', marginTop: 8 }}>
            Press Play or Step to reveal the trellis column by column.
          </p>
        )}
      </Card>

      {/* State panel */}
      <Card>
        <SectionTitle>Current State</SectionTitle>
        {currentWord == null ? (
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Press Play or Step to begin.
          </p>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              <StatBadge label="Word" value={currentWord} color={COLOR} />
              <StatBadge
                label="Position"
                value={`${currentCol + 1} / ${totalCols}`}
                color="#9CA3AF"
              />
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {currentColSteps.map(s => (
                <div
                  key={s.tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#111118',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    border: `1px solid ${TAG_COLORS[s.tag as Tag] ?? '#333'}33`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: TAG_COLORS[s.tag as Tag] ?? '#9CA3AF',
                      minWidth: 28,
                    }}
                  >
                    {s.tag}
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', minWidth: 100 }}>
                    log P ={' '}
                    <strong style={{ color: '#E5E7EB' }}>
                      {s.probability > 0
                        ? Math.log(s.probability).toFixed(3)
                        : '−∞'}
                    </strong>
                  </span>
                  <span style={{ color: '#6B7280', fontSize: '12px' }}>
                    ← {s.backpointer ?? 'START'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Result */}
      {isDone && bestPath.length > 0 && (
        <Card
          style={{
            borderColor: `${COLOR}44`,
            background: `${COLOR}0D`,
          }}
        >
          <SectionTitle>Best Tag Sequence</SectionTitle>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
            aria-label="Tagged sentence result"
          >
            {bestPath.map(({ word, tag }, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span
                  style={{
                    background: `${TAG_COLORS[tag as Tag] ?? '#6B7280'}22`,
                    border: `1px solid ${TAG_COLORS[tag as Tag] ?? '#6B7280'}66`,
                    borderRadius: '6px 6px 0 0',
                    padding: '2px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: TAG_COLORS[tag as Tag] ?? '#9CA3AF',
                  }}
                >
                  {tag}
                </span>
                <span
                  style={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '0 0 6px 6px',
                    padding: '4px 10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#E5E7EB',
                  }}
                >
                  {word}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function controlBtnStyle(
  color: string,
  active: boolean,
  disabled = false,
): React.CSSProperties {
  return {
    background: active ? `${color}33` : '#111118',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : color + '66'}`,
    borderRadius: '8px',
    padding: '8px 16px',
    color: disabled ? '#4B5563' : active ? color : '#E5E7EB',
    fontSize: '14px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '6px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '80px',
      }}
    >
      <span style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
