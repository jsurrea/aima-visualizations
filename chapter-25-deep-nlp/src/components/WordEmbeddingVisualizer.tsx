import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cosineSimilarity } from '../algorithms/index';
import { renderDisplayMath, interpolateColor } from '../utils/mathUtils';

const WORD_EMBEDDINGS: Record<string, [number, number]> = {
  france: [1.2, 3.1], germany: [1.0, 2.8], greece: [1.5, 2.6], spain: [0.9, 3.0],
  paris: [1.1, 4.2], berlin: [0.8, 4.0], athens: [1.4, 3.8], madrid: [0.7, 4.1],
  king: [-2.0, 1.5], queen: [-1.5, 1.8], man: [-2.2, 0.5], woman: [-1.8, 0.8],
  brother: [-1.8, 1.2], sister: [-1.3, 1.4], father: [-2.1, 1.0], mother: [-1.6, 1.2],
  cat: [2.5, -1.2], dog: [2.8, -1.5], kitten: [2.4, -0.8], puppy: [2.7, -1.0],
  apple: [3.2, -2.5], banana: [3.5, -2.2], pizza: [3.0, -2.8], rice: [3.3, -3.0],
  sunny: [-0.5, -2.0], rainy: [-0.3, -2.5], snowy: [-0.7, -2.3], cloudy: [-0.4, -2.1],
};

const CATEGORIES: Record<string, string> = {
  france: 'countries', germany: 'countries', greece: 'countries', spain: 'countries',
  paris: 'capitals', berlin: 'capitals', athens: 'capitals', madrid: 'capitals',
  king: 'kinship', queen: 'kinship', man: 'kinship', woman: 'kinship',
  brother: 'kinship', sister: 'kinship', father: 'kinship', mother: 'kinship',
  cat: 'animals', dog: 'animals', kitten: 'animals', puppy: 'animals',
  apple: 'food', banana: 'food', pizza: 'food', rice: 'food',
  sunny: 'weather', rainy: 'weather', snowy: 'weather', cloudy: 'weather',
};

const CATEGORY_COLORS: Record<string, string> = {
  countries: '#6366F1', capitals: '#10B981', kinship: '#F59E0B',
  animals: '#EC4899', food: '#8B5CF6', weather: '#3B82F6',
};

const FAMOUS_ANALOGIES = [
  { a: 'king', b: 'man', c: 'queen', relationship: 'Gender' },
  { a: 'france', b: 'paris', c: 'germany', relationship: 'Capital' },
  { a: 'cat', b: 'kitten', c: 'dog', relationship: 'Young form' },
  { a: 'brother', b: 'sister', c: 'father', relationship: 'Female counterpart' },
] as const;

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function toSVG(x: number, y: number): [number, number] {
  const svgX = 40 + ((x + 4) / 8) * 520;
  const svgY = 360 - ((y + 4) / 9) * 320;
  return [svgX, svgY];
}

/** Computes D = C + (B - A) + noise and finds the nearest word in 2D embedding space. */
function computeAnalogyTarget(
  aCoords: [number, number],
  bCoords: [number, number],
  cCoords: [number, number],
  noiseOffset: [number, number],
  excludeWords: [string, string, string],
): { dX: number; dY: number; nearest: string } {
  const dX = cCoords[0] + (bCoords[0] - aCoords[0]) + noiseOffset[0];
  const dY = cCoords[1] + (bCoords[1] - aCoords[1]) + noiseOffset[1];
  let nearest = '';
  let minDist = Infinity;
  for (const [word, coords] of Object.entries(WORD_EMBEDDINGS)) {
    if (excludeWords.includes(word as never)) continue;
    const dx = coords[0] - dX;
    const dy = coords[1] - dY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) { minDist = dist; nearest = word; }
  }
  return { dX, dY, nearest };
}

export default function WordEmbeddingVisualizer() {
  const [analogyIndex, setAnalogyIndex] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const currentAnalogy = FAMOUS_ANALOGIES[analogyIndex]!;
  const wordA = currentAnalogy.a;
  const wordB = currentAnalogy.b;
  const wordC = currentAnalogy.c;

  const aCoords = WORD_EMBEDDINGS[wordA]!;
  const bCoords = WORD_EMBEDDINGS[wordB]!;
  const cCoords = WORD_EMBEDDINGS[wordC]!;

  const noiseSeed = useRef<number>(0);
  const [noiseOffset, setNoiseOffset] = useState<[number, number]>([0, 0]);

  const recomputeNoise = useCallback(() => {
    noiseSeed.current += 1;
    setNoiseOffset([
      noiseLevel * (Math.random() - 0.5) * 2,
      noiseLevel * (Math.random() - 0.5) * 2,
    ]);
  }, [noiseLevel]);

  const { dX, dY, nearest } = computeAnalogyTarget(aCoords, bCoords, cCoords, noiseOffset, [wordA, wordB, wordC]);

  const step = useCallback((now: number) => {
    if (now - lastTimeRef.current >= speed) {
      lastTimeRef.current = now;
      setAnalogyIndex(prev => (prev + 1) % FAMOUS_ANALOGIES.length);
      recomputeNoise();
    }
    rafRef.current = requestAnimationFrame(step);
  }, [speed, recomputeNoise]);

  useEffect(() => {
    if (isPlaying && !prefersReduced) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, step]);

  const handleStepForward = () => {
    setAnalogyIndex(prev => (prev + 1) % FAMOUS_ANALOGIES.length);
    recomputeNoise();
  };
  const handleStepBack = () => {
    setAnalogyIndex(prev => (prev - 1 + FAMOUS_ANALOGIES.length) % FAMOUS_ANALOGIES.length);
    recomputeNoise();
  };
  const handleReset = () => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setAnalogyIndex(0);
    setNoiseOffset([0, 0]);
    setSelectedWord(null);
  };

  const [aSvgX, aSvgY] = toSVG(aCoords[0], aCoords[1]);
  const [bSvgX, bSvgY] = toSVG(bCoords[0], bCoords[1]);
  const [cSvgX, cSvgY] = toSVG(cCoords[0], cCoords[1]);
  const [dSvgX, dSvgY] = toSVG(dX, dY);

  const neighbors: Array<{ word: string; sim: number }> = [];
  if (selectedWord !== null) {
    const selCoords = WORD_EMBEDDINGS[selectedWord];
    if (selCoords) {
      const selVec: number[] = [selCoords[0], selCoords[1]];
      for (const [word, coords] of Object.entries(WORD_EMBEDDINGS)) {
        if (word === selectedWord) continue;
        const sim = cosineSimilarity(selVec, [coords[0], coords[1]]);
        neighbors.push({ word, sim });
      }
      neighbors.sort((a, b) => b.sim - a.sim);
      neighbors.splice(5);
    }
  }

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Word Embedding Space</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Interactive 2D projection of word vectors showing semantic relationships and analogies.
      </p>

      {/* Formula */}
      <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('\\vec{D} = \\vec{C} + (\\vec{B} - \\vec{A})') }} />
      </div>

      {/* SVG Scatter Plot */}
      <svg
        viewBox="0 0 600 400"
        style={{ width: '100%', maxWidth: '600px', display: 'block', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '8px' }}
        aria-label="Word embedding scatter plot"
        role="img"
      >
        <defs>
          <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#F59E0B" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10B981" />
          </marker>
        </defs>

        {/* Analogy arrows */}
        <line
          x1={aSvgX} y1={aSvgY} x2={bSvgX} y2={bSvgY}
          stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrowAmber)"
        />
        <line
          x1={cSvgX} y1={cSvgY} x2={dSvgX} y2={dSvgY}
          stroke="#10B981" strokeWidth="2" markerEnd="url(#arrowGreen)"
        />

        {/* D target marker */}
        <circle cx={dSvgX} cy={dSvgY} r="8" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4,2" />

        {/* Word dots */}
        {Object.entries(WORD_EMBEDDINGS).map(([word, coords]) => {
          const [sx, sy] = toSVG(coords[0], coords[1]);
          const cat = CATEGORIES[word] ?? 'unknown';
          const color = CATEGORY_COLORS[cat] ?? '#9CA3AF';
          const isActive = word === wordA || word === wordB || word === wordC;
          const isSelected = word === selectedWord;
          return (
            <g key={word}>
              <circle
                cx={sx} cy={sy} r={isActive || isSelected ? 9 : 6}
                fill={color}
                opacity={isActive || isSelected ? 1 : 0.7}
                stroke={isSelected ? 'white' : isActive ? 'white' : 'none'}
                strokeWidth={isActive || isSelected ? 2 : 0}
                role="button"
                tabIndex={0}
                aria-label={`Word: ${word}, category: ${cat}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredWord(word)}
                onMouseLeave={() => setHoveredWord(null)}
                onClick={() => setSelectedWord(selectedWord === word ? null : word)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedWord(selectedWord === word ? null : word);
                  }
                }}
              />
              {(hoveredWord === word || isActive) && (
                <text x={sx + 10} y={sy - 4} fill="white" fontSize="11" style={{ pointerEvents: 'none' }}>
                  {word}
                </text>
              )}
            </g>
          );
        })}

        {/* D label */}
        <text x={dSvgX + 10} y={dSvgY - 4} fill="#10B981" fontSize="11" fontWeight="bold">
          D={nearest}
        </text>
      </svg>

      {/* Category legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#D1D5DB' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {cat}
          </span>
        ))}
      </div>

      {/* Analogy Demo */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>Analogy Demo</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>{wordA}</span>
          <span style={{ color: '#9CA3AF' }}>is to</span>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>{wordB}</span>
          <span style={{ color: '#9CA3AF' }}>as</span>
          <span style={{ color: '#10B981', fontWeight: 600 }}>{wordC}</span>
          <span style={{ color: '#9CA3AF' }}>is to</span>
          <span style={{ color: '#10B981', fontWeight: 700, fontSize: '16px' }}>{nearest}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
          Relationship: {currentAnalogy.relationship}
        </div>

        <label style={{ fontSize: '13px', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Noise:
          <input
            type="range" min="0" max="1" step="0.05"
            value={noiseLevel}
            onChange={e => { setNoiseLevel(Number(e.target.value)); recomputeNoise(); }}
            aria-label="Noise level"
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '32px', textAlign: 'right' }}>{noiseLevel.toFixed(2)}</span>
        </label>
      </div>

      {/* Similarity Explorer */}
      {selectedWord !== null && neighbors.length > 0 && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>
            Nearest neighbors of &quot;{selectedWord}&quot;
          </h4>
          {neighbors.map(({ word, sim }) => {
            const cat = CATEGORIES[word] ?? 'unknown';
            const color = CATEGORY_COLORS[cat] ?? '#9CA3AF';
            return (
              <div key={word} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ minWidth: '72px', fontSize: '13px', color }}>{word}</span>
                <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${((sim + 1) / 2) * 100}%`, height: '100%', background: color }} />
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF', minWidth: '48px', textAlign: 'right' }}>
                  {sim.toFixed(3)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={() => setIsPlaying(p => !p)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ padding: '6px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleStepBack} aria-label="Step back" style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Prev
        </button>
        <button onClick={handleStepForward} aria-label="Step forward" style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Next
        </button>
        <button onClick={handleReset} aria-label="Reset" style={{ padding: '6px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Reset
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#D1D5DB' }}>
          Speed:
          <input
            type="range" min="100" max="2000" step="100"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '100px' }}
          />
          <span>{speed}ms</span>
        </label>
      </div>

      {/* State Panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#9CA3AF' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#D1D5DB' }}>State</div>
        <div>Analogy: {wordA} - {wordB} + {wordC} = {nearest}</div>
        <div>Noise: {noiseLevel.toFixed(2)}</div>
        <div>Step {analogyIndex + 1} / {FAMOUS_ANALOGIES.length}: {currentAnalogy.relationship}</div>
        {selectedWord && <div>Selected: {selectedWord}</div>}
      </div>
    </div>
  );
}
