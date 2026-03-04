import React, { useState, useEffect, useRef, useCallback } from 'react';

const TIMELINE_EVENTS = [
  { year: 2013, name: 'Word2Vec', desc: 'Dense word vectors via skip-gram/CBOW', color: '#6366F1' },
  { year: 2014, name: 'GloVe', desc: 'Global vectors for word representation', color: '#3B82F6' },
  { year: 2015, name: 'Seq2Seq', desc: 'Sequence-to-sequence with attention', color: '#8B5CF6' },
  { year: 2017, name: 'Transformer', desc: 'Attention Is All You Need', color: '#EC4899' },
  { year: 2018, name: 'BERT / ELMo', desc: "NLP's ImageNet moment", color: '#F59E0B' },
  { year: 2019, name: 'GPT-2 / T5', desc: 'Large-scale pretraining', color: '#10B981' },
  { year: 2020, name: 'Reformer', desc: 'Efficient Transformers', color: '#EF4444' },
] as const;

const MODEL_TABLE = [
  { model: 'BERT', arch: 'Encoder-only Transformer', objective: 'Masked LM + NSP', params: '110M-340M', strength: 'Bidirectional context' },
  { model: 'GPT-2', arch: 'Decoder-only Transformer', objective: 'Causal LM', params: '117M-1.5B', strength: 'Text generation' },
  { model: 'T5', arch: 'Encoder-decoder Transformer', objective: 'Text-to-text', params: '60M-11B', strength: 'Unified framework' },
  { model: 'RoBERTa', arch: 'Encoder-only Transformer', objective: 'Masked LM (no NSP)', params: '125M-355M', strength: 'Robust BERT training' },
] as const;

const ARISTO_QUESTIONS = [
  { q: 'Which substance is needed for a fire to burn?', options: ['Water', 'Oxygen', 'Carbon dioxide', 'Nitrogen'], correct: 1 },
  { q: 'What is the main source of energy for Earth?', options: ['Moon', 'Wind', 'The Sun', 'Geothermal heat'], correct: 2 },
  { q: 'What process do plants use to make food?', options: ['Respiration', 'Fermentation', 'Photosynthesis', 'Digestion'], correct: 2 },
  { q: 'Which type of rock is formed from cooled lava?', options: ['Sedimentary', 'Metamorphic', 'Igneous', 'Limestone'], correct: 2 },
] as const;

const GPT2_EXAMPLES = [
  { prompt: 'The tower is 324 metres (1,063 ft) tall,', completion: ' about the same height as an 81-storey building, and the tallest structure in Paris.' },
  { prompt: 'Legumes containing nitrogen-fixing bacteria', completion: ' are an excellent way to return nitrogen to the soil after a crop rotation.' },
  { prompt: 'In a shocking finding, scientists discovered', completion: ' a herd of unicorns living in a remote, previously unexplored valley in the Andes mountains.' },
] as const;

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function StateOfArtOverview() {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [typingIndices, setTypingIndices] = useState<[number, number, number]>([0, 0, 0]);
  const [isTyping, setIsTyping] = useState(false);

  const rafIdsRef = useRef<number[]>([0, 0, 0]);
  const lastTimesRef = useRef<number[]>([0, 0, 0]);

  const stopTyping = useCallback(() => {
    for (const id of rafIdsRef.current) cancelAnimationFrame(id);
    setIsTyping(false);
  }, []);

  const resetTyping = useCallback(() => {
    stopTyping();
    currentIndicesRef.current = [0, 0, 0];
    setTypingIndices([0, 0, 0]);
  }, [stopTyping]);

  const currentIndicesRef = useRef<[number, number, number]>([0, 0, 0]);

  const startTyping = useCallback(() => {
    if (prefersReduced) {
      setTypingIndices([
        GPT2_EXAMPLES[0]!.completion.length,
        GPT2_EXAMPLES[1]!.completion.length,
        GPT2_EXAMPLES[2]!.completion.length,
      ]);
      return;
    }
    setIsTyping(true);
    lastTimesRef.current = [0, 0, 0];
    currentIndicesRef.current = [0, 0, 0];

    GPT2_EXAMPLES.forEach((ex, i) => {
      const maxLen = ex.completion.length;
      const animate = (now: number) => {
        const last = lastTimesRef.current[i] ?? 0;
        const cur = currentIndicesRef.current[i] ?? 0;
        if (cur >= maxLen) return;
        if (now - last >= 50) {
          lastTimesRef.current[i] = now;
          const next = cur + 1;
          currentIndicesRef.current[i] = next;
          setTypingIndices(prev => {
            const arr = [...prev] as [number, number, number];
            arr[i] = next;
            return arr;
          });
        }
        if ((currentIndicesRef.current[i] ?? 0) < maxLen) {
          rafIdsRef.current[i] = requestAnimationFrame(animate);
        }
      };
      rafIdsRef.current[i] = requestAnimationFrame(animate);
    });
  }, []);

  // Check if all done and stop
  useEffect(() => {
    const allDone = GPT2_EXAMPLES.every((ex, i) => (typingIndices[i] ?? 0) >= ex.completion.length);
    if (allDone && isTyping) {
      for (const id of rafIdsRef.current) cancelAnimationFrame(id);
      setIsTyping(false);
    }
  }, [typingIndices, isTyping]);

  useEffect(() => {
    return () => {
      for (const id of rafIdsRef.current) cancelAnimationFrame(id);
    };
  }, []);

  const handleResetAll = useCallback(() => {
    resetTyping();
    setAnswers({});
    setSelectedEvent(null);
  }, [resetTyping]);

  const svgW = 900;
  const svgH = 160;

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', padding: '24px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>State of the Art in NLP</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>
        Timeline of key NLP milestones, model comparisons, and live demos.
      </p>

      {/* Timeline */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#D1D5DB' }}>NLP Timeline</h4>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', maxWidth: `${svgW}px`, display: 'block', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '8px' }}
          aria-label="NLP timeline"
        >
          {/* Base line */}
          <line x1={40} y1={80} x2={860} y2={80} stroke="#4B5563" strokeWidth="2" />

          {TIMELINE_EVENTS.map((ev, idx) => {
            const x = 40 + ((ev.year - 2013) / (2020 - 2013)) * 820;
            const above = idx % 2 === 0;
            const connY = above ? 40 : 120;
            const labelY = above ? 20 : 140;
            const isSel = selectedEvent === idx;

            return (
              <g key={idx}>
                {/* Connector */}
                <line x1={x} y1={80} x2={x} y2={connY} stroke={ev.color} strokeWidth="1" opacity={0.6} />
                {/* Circle */}
                <circle
                  cx={x} cy={80} r={isSel ? 10 : 8}
                  fill={ev.color}
                  stroke={isSel ? 'white' : 'none'}
                  strokeWidth={isSel ? 2 : 0}
                  role="button"
                  tabIndex={0}
                  aria-label={`${ev.name} (${ev.year}): ${ev.desc}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedEvent(selectedEvent === idx ? null : idx)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEvent(selectedEvent === idx ? null : idx);
                    }
                  }}
                />
                {/* Year */}
                <text x={x} y={above ? connY - 6 : connY + 14} textAnchor="middle" fill="#9CA3AF" fontSize="10">
                  {ev.year}
                </text>
                {/* Name */}
                <text x={x} y={labelY} textAnchor="middle" fill={ev.color} fontSize="11" fontWeight="bold">
                  {ev.name}
                </text>
              </g>
            );
          })}
        </svg>

        {selectedEvent !== null && TIMELINE_EVENTS[selectedEvent] && (
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', border: `1px solid ${TIMELINE_EVENTS[selectedEvent]!.color}` }}>
            <div style={{ fontWeight: 600, color: TIMELINE_EVENTS[selectedEvent]!.color, marginBottom: '4px' }}>
              {TIMELINE_EVENTS[selectedEvent]!.name} ({TIMELINE_EVENTS[selectedEvent]!.year})
            </div>
            <div style={{ fontSize: '14px', color: '#D1D5DB' }}>{TIMELINE_EVENTS[selectedEvent]!.desc}</div>
          </div>
        )}
      </div>

      {/* Model Comparison Table */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#D1D5DB' }}>Model Comparison</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-3)' }}>
                {['Model', 'Architecture', 'Objective', 'Parameters', 'Strength'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODEL_TABLE.map((row, idx) => (
                <tr key={row.model} style={{ background: idx % 2 === 0 ? '#1A1A24' : '#242430' }}>
                  <td style={{ padding: '8px 12px', color: '#F59E0B', fontWeight: 600 }}>{row.model}</td>
                  <td style={{ padding: '8px 12px', color: '#D1D5DB' }}>{row.arch}</td>
                  <td style={{ padding: '8px 12px', color: '#D1D5DB' }}>{row.objective}</td>
                  <td style={{ padding: '8px 12px', color: '#D1D5DB' }}>{row.params}</td>
                  <td style={{ padding: '8px 12px', color: '#D1D5DB' }}>{row.strength}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ARISTO Demo */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', color: '#D1D5DB' }}>ARISTO Science QA Demo</h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>
          Click the correct answer for each science question.
        </p>
        <div style={{ display: 'grid', gap: '16px' }}>
          {ARISTO_QUESTIONS.map((item, qIdx) => (
            <div key={qIdx} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '8px' }}>{item.q}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {item.options.map((opt, optIdx) => {
                  const selected = answers[qIdx] === optIdx;
                  const isCorrect = optIdx === item.correct;
                  let border = '1px solid var(--surface-border)';
                  if (selected && isCorrect) border = '2px solid #10B981';
                  else if (selected && !isCorrect) border = '2px solid #EF4444';
                  return (
                    <button
                      key={optIdx}
                      onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                      aria-label={`Option: ${opt}`}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--surface-3)',
                        color: 'white',
                        border,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textAlign: 'left',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
          ARISTO (Allen AI) achieves over 90% on 8th-grade science questions using large language models.
        </p>
      </div>

      {/* GPT-2 Typing Demo */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#D1D5DB' }}>GPT-2 Text Completion</h4>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={startTyping}
            disabled={isTyping}
            aria-label="Play all typing animations"
            style={{ padding: '6px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isTyping ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isTyping ? 0.7 : 1 }}
          >
            Play All
          </button>
          <button
            onClick={stopTyping}
            disabled={!isTyping}
            aria-label="Stop typing animation"
            style={{ padding: '6px 14px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: !isTyping ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: !isTyping ? 0.7 : 1 }}
          >
            Stop
          </button>
          <button
            onClick={resetTyping}
            aria-label="Reset typing animation"
            style={{ padding: '6px 14px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Reset
          </button>
        </div>

        {GPT2_EXAMPLES.map((ex, i) => {
          const typed = ex.completion.slice(0, typingIndices[i] ?? 0);
          return (
            <div key={i} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.6 }}>
              <span style={{ color: '#F59E0B' }}>{ex.prompt}</span>
              <span style={{ color: 'white' }}>{typed}</span>
              {isTyping && (typingIndices[i] ?? 0) < ex.completion.length && (
                <span style={{ display: 'inline-block', width: '2px', height: '14px', background: 'white', marginLeft: '1px', verticalAlign: 'text-bottom' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* State Panel / Reset All */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#9CA3AF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontWeight: 600, color: '#D1D5DB' }}>State</div>
          <button
            onClick={handleResetAll}
            aria-label="Reset all"
            style={{ padding: '4px 12px', background: 'var(--surface-3)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Reset All
          </button>
        </div>
        <div>Selected event: {selectedEvent !== null ? `${TIMELINE_EVENTS[selectedEvent]!.name} (${TIMELINE_EVENTS[selectedEvent]!.year})` : 'none'}</div>
        <div>ARISTO answers: {Object.keys(answers).length} / {ARISTO_QUESTIONS.length}</div>
        <div>Typing: {isTyping ? 'running' : 'stopped'}</div>
      </div>
    </div>
  );
}
