import React, { useState, useMemo, useCallback } from 'react';
import { gloveScore, maskedLanguageModelStep } from '../algorithms/index';
import { interpolateColor, renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const CORPUS = ["The cat sat", "The cat ate", "The dog ran", "The dog barked"] as const;
const VOCAB_WORDS = ['the', 'cat', 'sat', 'ate', 'dog', 'ran', 'barked'] as const;
type VocabWord = (typeof VOCAB_WORDS)[number];
const GLOVE_EMBEDDINGS: Record<string, number[]> = {
  the: [1.0, 0.5, 0.2], cat: [0.8, 1.0, 0.3], sat: [0.2, 0.7, 0.9],
  ate: [0.3, 0.8, 0.8], dog: [0.7, 0.9, 0.4], ran: [0.1, 0.6, 1.0],
  barked: [0.2, 0.5, 0.9],
};

const MLM_SENTENCE = ["The", "river", "rose", "five", "feet"] as const;
const PREDICTION_SCORES: Record<number, Record<string, number>> = {
  0: { 'The': 3.5, 'A': 2.1, 'That': 1.8, 'This': 1.5, 'One': 0.9 },
  1: { 'river': 3.2, 'water': 2.8, 'stream': 2.1, 'flood': 1.7, 'lake': 1.2 },
  2: { 'rose': 2.9, 'fell': 2.4, 'dropped': 1.9, 'reached': 1.8, 'exceeded': 1.5 },
  3: { 'five': 3.1, 'six': 2.3, 'four': 2.1, 'three': 1.8, 'ten': 1.4 },
  4: { 'feet': 3.4, 'meters': 2.6, 'inches': 1.9, 'centimeters': 1.5, 'yards': 1.2 },
};

export default function PretrainingVisualizer() {
  const [selectedWordI, setSelectedWordI] = useState<string>('cat');
  const [selectedWordJ, setSelectedWordJ] = useState<string>('dog');
  const [maskedIndex, setMaskedIndex] = useState<number | null>(null);

  const coOccurrence = useMemo(() => {
    const matrix: number[][] = Array.from({ length: VOCAB_WORDS.length }, () =>
      Array(VOCAB_WORDS.length).fill(0) as number[]
    );
    for (const sentence of CORPUS) {
      const words = sentence.toLowerCase().split(' ');
      for (let i = 0; i < words.length; i++) {
        const wi = VOCAB_WORDS.indexOf(words[i]! as VocabWord);
        if (wi === -1) continue;
        for (let d = 1; d <= 2; d++) {
          if (i + d < words.length) {
            const wj = VOCAB_WORDS.indexOf(words[i + d]! as VocabWord);
            if (wj !== -1) {
              matrix[wi]![wj]! += 1;
              matrix[wj]![wi]! += 1;
            }
          }
        }
      }
    }
    return matrix;
  }, []);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const row of coOccurrence) {
      for (const v of row) m = Math.max(m, v);
    }
    return m;
  }, [coOccurrence]);

  const gloveEmbI = GLOVE_EMBEDDINGS[selectedWordI];
  const gloveEmbJ = GLOVE_EMBEDDINGS[selectedWordJ];
  const gScore = (gloveEmbI && gloveEmbJ) ? gloveScore(gloveEmbI, gloveEmbJ) : 0;

  const predScores = maskedIndex !== null ? (PREDICTION_SCORES[maskedIndex] ?? {}) : {};
  const mlmResult = maskedIndex !== null
    ? maskedLanguageModelStep([...MLM_SENTENCE], maskedIndex, predScores)
    : null;

  const topPrediction = mlmResult?.topPredictions[0];

  const handleReset = useCallback(() => {
    setMaskedIndex(null);
    setSelectedWordI('cat');
    setSelectedWordJ('dog');
  }, []);

  const cellW = 50;
  const cellH = 36;
  const svgW = VOCAB_WORDS.length * cellW + 60;
  const svgH = VOCAB_WORDS.length * cellH + 50;

  // Unidirectional probabilities
  const uniProbs: Array<{ word: string; uniProb: number; prob: number }> = [];
  if (mlmResult !== null && maskedIndex !== null) {
    const rawUni = mlmResult.topPredictions.map((p, idx) => ({
      word: p.word,
      prob: p.probability,
      uniProb: p.probability * (idx <= maskedIndex ? 1.0 : 0.3),
    }));
    const uniSum = rawUni.reduce((s, p) => s + p.uniProb, 0);
    for (const item of rawUni) {
      uniProbs.push({ ...item, uniProb: uniSum > 0 ? item.uniProb / uniSum : 0 });
    }
  }

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Pretraining and Transfer Learning</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>
        GloVe co-occurrence, masked language modeling (BERT-style), and the transfer learning pipeline.
      </p>

      {/* Section A: GloVe */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#D1D5DB' }}>GloVe Co-occurrence Matrix</h4>
        <div style={{ marginBottom: '8px', overflowX: 'auto' }}>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('J = \\sum_{i,j} f(X_{ij})(w_i \\cdot \\tilde{w}_j + b_i + \\tilde{b}_j - \\log X_{ij})^2') }} />
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', maxWidth: `${svgW}px`, display: 'block', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '12px' }}
          aria-label="GloVe co-occurrence matrix"
        >
          {/* Col headers */}
          {VOCAB_WORDS.map((w, col) => (
            <text key={col} x={60 + col * cellW + cellW / 2} y={18} textAnchor="middle" fill="#9CA3AF" fontSize="11">
              {w}
            </text>
          ))}
          {VOCAB_WORDS.map((rowWord, row) => {
            const isSelRow = rowWord === selectedWordI || rowWord === selectedWordJ;
            return (
              <g key={row}>
                <text x={55} y={30 + row * cellH + cellH / 2 + 4} textAnchor="end" fill="#9CA3AF" fontSize="11">
                  {rowWord}
                </text>
                {VOCAB_WORDS.map((colWord, col) => {
                  const count = coOccurrence[row]![col]!;
                  const color = count > 0
                    ? interpolateColor('#111118', '#F59E0B', count / maxCount)
                    : '#111118';
                  const isSelPair = (
                    (rowWord === selectedWordI && colWord === selectedWordJ) ||
                    (rowWord === selectedWordJ && colWord === selectedWordI)
                  );
                  return (
                    <g key={col}>
                      <rect
                        x={60 + col * cellW}
                        y={30 + row * cellH}
                        width={cellW - 2}
                        height={cellH - 2}
                        fill={color}
                        rx="2"
                        stroke={isSelPair ? '#6366F1' : 'none'}
                        strokeWidth={isSelPair ? 2 : 0}
                      />
                      {count > 0 && (
                        <text
                          x={60 + col * cellW + cellW / 2}
                          y={30 + row * cellH + cellH / 2 + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="11"
                          style={{ pointerEvents: 'none' }}
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Word pair selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Word 1:
            <select
              value={selectedWordI}
              onChange={e => setSelectedWordI(e.target.value)}
              aria-label="Select first word"
              style={{ background: 'var(--surface-3)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '2px 6px' }}
            >
              {VOCAB_WORDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '13px', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Word 2:
            <select
              value={selectedWordJ}
              onChange={e => setSelectedWordJ(e.target.value)}
              aria-label="Select second word"
              style={{ background: 'var(--surface-3)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '2px 6px' }}
            >
              {VOCAB_WORDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
          <span style={{ fontSize: '14px', color: '#D1D5DB' }}>
            GloVe score:{' '}
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>{gScore.toFixed(3)}</span>
          </span>
        </div>
      </div>

      {/* Section B: MLM */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#D1D5DB' }}>Masked Language Model</h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px' }}>
          Click a word to mask it and see BERT-style bidirectional predictions vs unidirectional (causal).
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {MLM_SENTENCE.map((token, idx) => {
            const isMasked = maskedIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setMaskedIndex(maskedIndex === idx ? null : idx)}
                aria-label={isMasked ? `Unmask ${token}` : `Mask ${token}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isMasked ? 600 : 400,
                  background: isMasked ? '#F59E0B20' : 'var(--surface-3)',
                  color: isMasked ? '#F59E0B' : 'white',
                  border: isMasked ? '1px solid #F59E0B' : '1px solid var(--surface-border)',
                }}
              >
                {isMasked ? '[MASK]' : token}
              </button>
            );
          })}
        </div>

        {mlmResult !== null && maskedIndex !== null && (
          <div>
            <div style={{ marginBottom: '8px', fontSize: '13px', color: '#9CA3AF' }}>
              Top predictions for position {maskedIndex}:
            </div>
            {mlmResult.topPredictions.slice(0, 5).map((pred, idx) => {
              const uniItem = uniProbs[idx];
              const uniProb = uniItem?.uniProb ?? 0;
              return (
                <div key={pred.word} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ minWidth: '80px', fontSize: '13px', color: '#D1D5DB' }}>{pred.word}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: `${pred.probability * 200}px`, height: '10px', background: '#6366F1', borderRadius: '2px', minWidth: '2px' }} />
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        Bi: {(pred.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: `${uniProb * 200}px`, height: '10px', background: '#EC4899', borderRadius: '2px', minWidth: '2px' }} />
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        Uni: {(uniProb * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section C: Transfer Learning Pipeline */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px', color: '#D1D5DB' }}>Transfer Learning Pipeline</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {[
            { label: 'Large Corpus', sub: 'Wikipedia, BookCorpus...', amber: true },
            null,
            { label: 'Pretraining', sub: 'Masked LM + NSP', amber: true },
            null,
            { label: 'Base Model', sub: 'BERT / GPT / T5', amber: true },
            null,
            { label: 'Fine-tuning', sub: 'Task-specific data', amber: false },
            null,
            { label: 'Task Model', sub: 'Classification, NER...', amber: false },
          ].map((item, idx) => {
            if (item === null) {
              return (
                <span key={idx} style={{ color: '#9CA3AF', fontSize: '20px', flexShrink: 0 }}>
                  ---&gt;
                </span>
              );
            }
            return (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  minWidth: '120px',
                  textAlign: 'center',
                  background: 'var(--surface-2)',
                  border: `1px solid ${item.amber ? '#F59E0B' : '#6366F1'}`,
                  flexShrink: 0,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', color: item.amber ? '#F59E0B' : '#6366F1', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={handleReset}
          aria-label="Reset"
          style={{ padding: '6px 14px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Reset
        </button>
      </div>

      {/* State Panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#9CA3AF' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#D1D5DB' }}>State</div>
        <div>Masked position: {maskedIndex !== null ? maskedIndex : 'none'}</div>
        <div>Top prediction: {topPrediction ? `${topPrediction.word} (${(topPrediction.probability * 100).toFixed(1)}%)` : 'none'}</div>
        <div>GloVe score ({selectedWordI}, {selectedWordJ}): {gScore.toFixed(3)}</div>
      </div>
    </div>
  );
}
