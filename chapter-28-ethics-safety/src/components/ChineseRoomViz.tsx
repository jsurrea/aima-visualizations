/**
 * ChineseRoomViz — §28.2 Can Machines Really Think?
 *
 * Animated Chinese Room simulation + consciousness / qualia explorer.
 */
import { useState, useEffect, useRef } from 'react';

const CHAPTER_COLOR = '#EF4444';

interface RoomStep {
  label: string;
  description: string;
  inputSymbol: string;
  lookupKey: string;
  outputSymbol: string;
  searleView: string;
  systemView: string;
}

const ROOM_STEPS: RoomStep[] = [
  {
    label: 'Input arrives',
    description: 'A piece of paper with Chinese symbols slides under the door.',
    inputSymbol: '你好吗',
    lookupKey: '—',
    outputSymbol: '—',
    searleView: 'A human inside sees meaningless squiggles.',
    systemView: 'The system receives an encoded message. Processing begins.',
  },
  {
    label: 'Rule book lookup',
    description: 'The human looks up the input symbols in the English rule book.',
    inputSymbol: '你好吗',
    lookupKey: 'Rule 47: "你好吗" → respond with "我很好"',
    outputSymbol: '—',
    searleView: 'Mechanical symbol matching — no understanding of "How are you?"',
    systemView: 'The system identifies the query pattern and retrieves the appropriate response.',
  },
  {
    label: 'Response generated',
    description: 'The human writes the output symbols on paper and passes it back.',
    inputSymbol: '你好吗',
    lookupKey: 'Rule 47: "你好吗" → respond with "我很好"',
    outputSymbol: '我很好',
    searleView: 'Output produced without any understanding of Chinese.',
    systemView: 'Fluent, contextually appropriate Chinese response — indistinguishable from a native speaker.',
  },
  {
    label: 'Observer perspective',
    description: "From outside, the room appears to understand Chinese. But does it?",
    inputSymbol: '你好吗',
    lookupKey: '(hidden inside)',
    outputSymbol: '我很好',
    searleView: "Searle: No part of the system understands Chinese. Neither the human, nor the rule book, nor the stacks of paper — therefore no understanding exists.",
    systemView: "Systems reply: Understanding is a property of the whole system, not individual parts. A neuron doesn't understand, yet a brain does.",
  },
];

const CONSCIOUSNESS_THEORIES = [
  {
    name: 'Global Workspace Theory',
    description: 'Consciousness arises when information is broadcast to a "global workspace" accessible to multiple brain processes simultaneously.',
    machineImplication: 'An AI with a global information bus could in principle be conscious by this criterion.',
    color: '#6366F1',
  },
  {
    name: 'Integrated Information Theory (IIT)',
    description: 'Consciousness = Φ (phi), a measure of integrated information in a system. High Φ → high consciousness.',
    machineImplication: 'Some architectures (e.g., deep feedforward nets) have low Φ; recurrent networks may have higher Φ.',
    color: '#10B981',
  },
  {
    name: 'Biological Naturalism',
    description: "Searle's view: mental states are caused by brain's physical processes. Neurons have 'it', transistors do not.",
    machineImplication: 'By this view, no silicon machine can ever be conscious — a claim many find unscientific since it relies on unspecified properties of neurons.',
    color: CHAPTER_COLOR,
  },
  {
    name: 'Polite Convention',
    description: 'Turing\'s pragmatic stance: we extend a "polite convention" that everyone thinks; we would extend it to machines if they acted intelligently.',
    machineImplication: 'Anthropomorphism: we attribute consciousness more readily to humanoid appearance and voice than to pure intelligence.',
    color: '#F59E0B',
  },
];

export default function ChineseRoomViz() {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [perspective, setPerspective] = useState<'searle' | 'system'>('searle');
  const [theoryIndex, setTheoryIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  useEffect(() => {
    if (playing && !prefersReduced) {
      intervalRef.current = setInterval(() => {
        setStepIndex(i => {
          if (i >= ROOM_STEPS.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, prefersReduced]);

  const step = ROOM_STEPS[stepIndex]!;
  const theory = CONSCIOUSNESS_THEORIES[theoryIndex]!;

  return (
    <div role="region" aria-label="Chinese Room Simulation">
      {/* Intro */}
      <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7 }}>
          Philosopher John Searle's <strong style={{ color: 'white' }}>Chinese Room</strong> (1980) argues that
          manipulating symbols according to rules does not constitute understanding. An English-only speaker
          inside a room follows rules to produce fluent Chinese responses — but understands nothing.
          Explore the simulation step by step, then compare Searle's view against the Systems Reply.
        </p>
      </div>

      {/* Perspective toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['searle', 'system'] as const).map(p => (
          <button key={p} onClick={() => setPerspective(p)}
            aria-pressed={perspective === p}
            style={{
              padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontSize: '13px', fontWeight: 600,
              background: perspective === p ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: perspective === p ? CHAPTER_COLOR : '#9CA3AF',
              outline: perspective === p ? `1px solid ${CHAPTER_COLOR}40` : 'none',
            }}>
            {p === 'searle' ? "Searle's View" : "Systems Reply"}
          </button>
        ))}
      </div>

      {/* Chinese Room Simulation */}
      <div style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Step {stepIndex + 1} / {ROOM_STEPS.length}: {step.label}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setPlaying(false); setStepIndex(s => Math.max(0, s - 1)); }}
              disabled={stepIndex === 0}
              aria-label="Step back"
              style={{ padding: '6px 12px', borderRadius: '6px', cursor: stepIndex === 0 ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--surface-3,#242430)', color: stepIndex === 0 ? '#4B5563' : '#E5E7EB', fontSize: '14px' }}>
              ◀
            </button>
            <button onClick={() => setPlaying(p => !p)}
              disabled={prefersReduced}
              aria-label={playing ? 'Pause' : 'Play'}
              style={{ padding: '6px 14px', borderRadius: '6px', cursor: prefersReduced ? 'not-allowed' : 'pointer', border: 'none', background: `${CHAPTER_COLOR}20`, color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600 }}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={() => { setPlaying(false); setStepIndex(s => Math.min(ROOM_STEPS.length - 1, s + 1)); }}
              disabled={stepIndex === ROOM_STEPS.length - 1}
              aria-label="Step forward"
              style={{ padding: '6px 12px', borderRadius: '6px', cursor: stepIndex === ROOM_STEPS.length - 1 ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--surface-3,#242430)', color: stepIndex === ROOM_STEPS.length - 1 ? '#4B5563' : '#E5E7EB', fontSize: '14px' }}>
              ▶
            </button>
            <button onClick={() => { setPlaying(false); setStepIndex(0); }}
              aria-label="Reset"
              style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'var(--surface-3,#242430)', color: '#9CA3AF', fontSize: '13px' }}>
              ↺
            </button>
          </div>
        </div>

        {/* Room diagram */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          {/* Outside */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outside</div>
            <div style={{ padding: '12px', background: 'var(--surface-3,#242430)', borderRadius: '8px', fontSize: '22px', minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {step.inputSymbol}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Input</div>
          </div>

          {/* Room */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🚪</div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Room</div>
          </div>

          {/* Inside */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inside</div>
            <div style={{ padding: '12px', background: 'var(--surface-3,#242430)', borderRadius: '8px', fontSize: '12px', color: '#9CA3AF', minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              {step.lookupKey}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Rule book</div>
          </div>
        </div>

        {/* Output */}
        {step.outputSymbol !== '—' && (
          <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, marginBottom: '4px' }}>Output</div>
            <div style={{ fontSize: '22px' }}>{step.outputSymbol}</div>
          </div>
        )}

        {/* Perspective annotation */}
        <div style={{ padding: '12px 16px', background: perspective === 'searle' ? `${CHAPTER_COLOR}08` : 'rgba(99,102,241,0.08)', borderRadius: '8px', borderLeft: `3px solid ${perspective === 'searle' ? CHAPTER_COLOR : '#6366F1'}` }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: perspective === 'searle' ? CHAPTER_COLOR : '#6366F1', marginBottom: '4px' }}>
            {perspective === 'searle' ? "Searle's Interpretation" : "Systems Reply"}
          </div>
          <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            {perspective === 'searle' ? step.searleView : step.systemView}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          {ROOM_STEPS.map((_, i) => (
            <button key={i} onClick={() => { setPlaying(false); setStepIndex(i); }}
              aria-label={`Go to step ${i + 1}`}
              style={{ width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === stepIndex ? CHAPTER_COLOR : '#374151' }} />
          ))}
        </div>
      </div>

      {/* Consciousness Theories */}
      <div style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>Theories of Consciousness & Machine Minds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {CONSCIOUSNESS_THEORIES.map((t, i) => (
            <button key={t.name} onClick={() => setTheoryIndex(i)}
              aria-pressed={theoryIndex === i}
              style={{
                padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                fontSize: '12px', fontWeight: 500,
                background: theoryIndex === i ? `${t.color}20` : 'var(--surface-3,#242430)',
                color: theoryIndex === i ? t.color : '#9CA3AF',
                outline: theoryIndex === i ? `1px solid ${t.color}40` : 'none',
              }}>
              {t.name}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px', background: `${theory.color}08`, borderRadius: '12px', border: `1px solid ${theory.color}20` }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: theory.color, marginBottom: '8px' }}>{theory.name}</h4>
          <p style={{ color: '#E5E7EB', fontSize: '13px', lineHeight: 1.7, marginBottom: '12px' }}>{theory.description}</p>
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Machine implication: </span>
            <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{theory.machineImplication}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
