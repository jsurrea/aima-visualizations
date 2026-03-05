import React, { useState, useEffect, useRef } from 'react';
import { naiveBayesClassify } from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';

interface WordData {
  word: string;
  news: number;
  sports: number;
  business: number;
  weather: number;
}

const PRIORS = new Map<string, number>([
  ['news', 0.30],
  ['sports', 0.25],
  ['business', 0.25],
  ['weather', 0.20],
]);

const WORDS: WordData[] = [
  { word: 'election',    news: 0.80, sports: 0.05, business: 0.10, weather: 0.02 },
  { word: 'vote',        news: 0.75, sports: 0.03, business: 0.08, weather: 0.01 },
  { word: 'president',   news: 0.70, sports: 0.04, business: 0.12, weather: 0.02 },
  { word: 'goal',        news: 0.05, sports: 0.85, business: 0.03, weather: 0.02 },
  { word: 'team',        news: 0.10, sports: 0.80, business: 0.05, weather: 0.02 },
  { word: 'match',       news: 0.08, sports: 0.78, business: 0.04, weather: 0.03 },
  { word: 'stock',       news: 0.15, sports: 0.02, business: 0.82, weather: 0.03 },
  { word: 'market',      news: 0.12, sports: 0.03, business: 0.78, weather: 0.04 },
  { word: 'profit',      news: 0.10, sports: 0.04, business: 0.80, weather: 0.02 },
  { word: 'rain',        news: 0.05, sports: 0.10, business: 0.03, weather: 0.85 },
  { word: 'sunny',       news: 0.03, sports: 0.08, business: 0.02, weather: 0.80 },
  { word: 'temperature', news: 0.04, sports: 0.06, business: 0.03, weather: 0.75 },
  { word: 'policy',      news: 0.60, sports: 0.05, business: 0.35, weather: 0.05 },
  { word: 'champion',    news: 0.08, sports: 0.82, business: 0.05, weather: 0.02 },
  { word: 'forecast',    news: 0.10, sports: 0.05, business: 0.08, weather: 0.70 },
];

const CLASS_COLORS: Record<string, string> = {
  news: '#6366F1',
  sports: '#10B981',
  business: '#F59E0B',
  weather: '#3B82F6',
};

const LIKELIHOODS: ReadonlyMap<string, ReadonlyMap<string, number>> = new Map(
  ['news', 'sports', 'business', 'weather'].map(cls => [
    cls,
    new Map(WORDS.map(w => [w.word, w[cls as keyof WordData] as number])),
  ])
);

export default function NaiveBayesDemo() {
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [animatedWidths, setAnimatedWidths] = useState<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);

  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const observations: ReadonlyMap<string, boolean> = new Map(
    WORDS.map(w => [w.word, selectedWords.has(w.word)])
  );

  const posteriors = naiveBayesClassify(PRIORS, LIKELIHOODS, observations);

  const targetWidths = new Map<string, number>(
    Array.from(posteriors.entries()).map(([cls, p]) => [cls, p * 100])
  );

  useEffect(() => {
    if (prefersReduced) {
      setAnimatedWidths(new Map(targetWidths));
      return;
    }
    const start = performance.now();
    const duration = 400;
    const startWidths = new Map(animatedWidths);

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const current = new Map<string, number>();
      for (const [cls, target] of targetWidths) {
        const from = startWidths.get(cls) ?? 0;
        current.set(cls, from + (target - from) * eased);
      }
      setAnimatedWidths(current);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // selectedWords is the only real trigger; targetWidths and startWidths are
  // captured via closure at effect invocation time, avoiding a dependency loop
  // on animatedWidths (which updates on every animation frame).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWords]);

  const toggleWord = (word: string) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  const sortedClasses = Array.from(posteriors.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div role="region" aria-label="§12.6 Naive Bayes Classifier" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.6 Naive Bayes Classifier
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        Text classification using the naive Bayes assumption
      </p>

      {/* Formula */}
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(c \\mid \\mathbf{w}) = \\alpha \\cdot P(c) \\prod_{i} P(w_i \\mid c)') }} />
      </div>

      {/* Word buttons */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Select Words</h3>
          <button
            onClick={() => setSelectedWords(new Set())}
            aria-label="Reset word selection"
            style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-3)', color: '#9CA3AF', cursor: 'pointer', fontSize: '12px' }}
          >
            Reset
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {WORDS.map(({ word }) => {
            const active = selectedWords.has(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                aria-pressed={active}
                aria-label={`Toggle word "${word}"`}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  border: `1px solid ${active ? CHAPTER_COLOR : 'var(--surface-border)'}`,
                  background: active ? `rgba(236,72,153,0.15)` : 'var(--surface-3)',
                  color: active ? CHAPTER_COLOR : '#9CA3AF',
                  cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bar chart */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>Classification Results</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedClasses.map(([cls, prob]) => {
            const color = CLASS_COLORS[cls] ?? '#9CA3AF';
            const width = animatedWidths.get(cls) ?? prob * 100;
            return (
              <div key={cls}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ color: '#E5E7EB', fontWeight: 600, textTransform: 'capitalize' }}>{cls}</span>
                  <span style={{ color, fontWeight: 700 }}>{(prob * 100).toFixed(1)}%</span>
                </div>
                <div style={{ background: 'var(--surface-3)', borderRadius: '999px', height: '12px', overflow: 'hidden' }} role="meter" aria-valuenow={Math.round(prob * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${cls} probability`}>
                  <div style={{
                    height: '100%', background: color, borderRadius: '999px',
                    width: `${width}%`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Computation table */}
      {selectedWords.size > 0 && (
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Computation Table</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }} role="table" aria-label="Naive Bayes computation">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                {['Class', 'Prior', 'Likelihood Product', 'Posterior'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(PRIORS.entries()).map(([cls, prior]) => {
                let likeProd = 1;
                for (const [word, observed] of observations) {
                  const p = LIKELIHOODS.get(cls)?.get(word) ?? 1.0;
                  likeProd *= observed ? p : (1 - p);
                }
                const post = posteriors.get(cls) ?? 0;
                const color = CLASS_COLORS[cls] ?? '#9CA3AF';
                return (
                  <tr key={cls} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '6px 10px', color, fontWeight: 600, textTransform: 'capitalize' }}>{cls}</td>
                    <td style={{ padding: '6px 10px', color: '#E5E7EB', fontVariantNumeric: 'tabular-nums' }}>{prior.toFixed(2)}</td>
                    <td style={{ padding: '6px 10px', color: '#E5E7EB', fontVariantNumeric: 'tabular-nums' }}>{likeProd.toExponential(3)}</td>
                    <td style={{ padding: '6px 10px', color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(post * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
