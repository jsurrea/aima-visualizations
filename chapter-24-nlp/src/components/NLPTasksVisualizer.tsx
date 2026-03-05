import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { getNLPTasks, type NLPTask } from '../algorithms/index';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = '#F59E0B';

const TASK_ICONS: Record<string, string> = {
  'speech-recognition':      '🎙️',
  'machine-translation':     '🌍',
  'information-extraction':  '📋',
  'question-answering':      '❓',
  'sentiment-analysis':      '💭',
  'named-entity-recognition':'🏷️',
};

const TASK_INPUT_TYPE: Record<string, string> = {
  'speech-recognition':      'Audio waveform',
  'machine-translation':     'Text (source language)',
  'information-extraction':  'Free text',
  'question-answering':      'Question + passage',
  'sentiment-analysis':      'Text',
  'named-entity-recognition':'Text',
};

const TASK_OUTPUT_TYPE: Record<string, string> = {
  'speech-recognition':      'Word sequence',
  'machine-translation':     'Text (target language)',
  'information-extraction':  'Structured relations',
  'question-answering':      'Answer string',
  'sentiment-analysis':      'Sentiment label',
  'named-entity-recognition':'Labelled spans',
};

const TASK_KEY_CHALLENGE: Record<string, string> = {
  'speech-recognition':      'Acoustic variation & language model',
  'machine-translation':     'Lexical choice & reordering',
  'information-extraction':  'Relation identification & boundary detection',
  'question-answering':      'Evidence retrieval & answer extraction',
  'sentiment-analysis':      'Negation, irony & aspect-level polarity',
  'named-entity-recognition':'Ambiguous entity types & novel names',
};

// ─── Simple NER keyword matching ─────────────────────────────────────────────

const NER_RULES: Array<{ pattern: RegExp; label: string; color: string }> = [
  { pattern: /\b(Indiana Jones|Wumpus|Alice|Bob|Mary|Jane)\b/gi,           label: 'PERSON',   color: '#6366F1' },
  { pattern: /\b(Wumpus Cave|Cave \d+|New York|London|Paris|cave \d+)\b/gi,label: 'LOCATION', color: '#10B981' },
  { pattern: /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/gi, label: 'DATE', color: '#F59E0B' },
  { pattern: /\b(gold|treasure|artifact|pit)\b/gi,                        label: 'OBJECT',   color: '#EC4899' },
];

interface NERSpan {
  start: number;
  end: number;
  label: string;
  color: string;
  text: string;
}

function runNER(text: string): NERSpan[] {
  const spans: NERSpan[] = [];
  for (const rule of NER_RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, label: rule.label, color: rule.color, text: m[0] });
    }
  }
  // Sort and remove overlapping spans (first-match wins by start position)
  spans.sort((a, b) => a.start - b.start);
  const deduped: NERSpan[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start >= cursor) {
      deduped.push(span);
      cursor = span.end;
    }
  }
  return deduped;
}

function renderNERResult(text: string, spans: NERSpan[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const span of spans) {
    if (span.start > pos) {
      parts.push(<span key={`t-${pos}`}>{text.slice(pos, span.start)}</span>);
    }
    parts.push(
      <span
        key={`s-${span.start}`}
        style={{
          background: `${span.color}33`,
          color: span.color,
          border: `1px solid ${span.color}66`,
          borderRadius: 4,
          padding: '1px 4px',
          margin: '0 1px',
          fontSize: '0.9em',
          position: 'relative',
        }}
        title={span.label}
        aria-label={`${span.text} (${span.label})`}
      >
        {span.text}
        <sub style={{ fontSize: '0.65em', opacity: 0.8, marginLeft: 3 }}>{span.label}</sub>
      </span>
    );
    pos = span.end;
  }
  if (pos < text.length) {
    parts.push(<span key={`t-end`}>{text.slice(pos)}</span>);
  }
  return parts;
}

// ─── Sentiment keyword analysis ───────────────────────────────────────────────

const POS_WORDS = ['great','good','love','excellent','amazing','fantastic','wonderful','happy','best','brilliant','enjoy','nice','perfect','impressive','helpful'];
const NEG_WORDS = ['terrible','bad','hate','awful','horrible','worst','terrible','poor','useless','disgusting','annoying','boring','broken','hard','fail','terrifying','unavoidable'];

interface SentimentResult { label: 'positive' | 'negative' | 'neutral'; confidence: number; posCount: number; negCount: number }

function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\W+/);
  const posCount = words.filter(w => POS_WORDS.includes(w)).length;
  const negCount = words.filter(w => NEG_WORDS.includes(w)).length;
  const total = posCount + negCount;
  if (total === 0) return { label: 'neutral', confidence: 0.5, posCount, negCount };
  const posFrac = posCount / total;
  if (posFrac > 0.6) return { label: 'positive', confidence: 0.5 + posFrac * 0.5, posCount, negCount };
  if (posFrac < 0.4) return { label: 'negative', confidence: 0.5 + (1 - posFrac) * 0.5, posCount, negCount };
  return { label: 'neutral', confidence: 0.55, posCount, negCount };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

// ─── Pipeline Diagram ─────────────────────────────────────────────────────────

function PipelineDiagram() {
  const stages = [
    { label: 'Speech', sub: '🎙️ Audio', color: '#6366F1' },
    { label: 'Text', sub: '📝 Tokens', color: '#3B82F6' },
    { label: 'NER / IE', sub: '🏷️ Entities', color: '#10B981' },
    { label: 'QA / MT', sub: '❓🌍 Answers', color: '#F59E0B' },
    { label: 'App', sub: '✅ Output', color: '#EC4899' },
  ];

  const boxW = 80, boxH = 50, gap = 48;
  const totalW = stages.length * boxW + (stages.length - 1) * gap + 32;
  const totalH = boxH + 40;

  return (
    <div style={{ overflowX: 'auto' }} aria-label="NLP pipeline flow diagram" role="img">
      <svg viewBox={`0 0 ${totalW} ${totalH}`} width="100%" style={{ minWidth: Math.min(totalW, 320), maxWidth: totalW }}>
        {stages.map((stage, i) => {
          const x = 16 + i * (boxW + gap);
          const y = 8;
          const hasArrow = i < stages.length - 1;
          return (
            <g key={stage.label}>
              {/* Box */}
              <rect
                x={x} y={y} width={boxW} height={boxH}
                rx="8" ry="8"
                fill={`${stage.color}22`}
                stroke={stage.color}
                strokeWidth="1.5"
              />
              <text x={x + boxW / 2} y={y + 16} textAnchor="middle" fill={stage.color} fontSize="11" fontWeight="bold">
                {stage.label}
              </text>
              <text x={x + boxW / 2} y={y + 32} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">
                {stage.sub}
              </text>
              {/* Arrow */}
              {hasArrow && (
                <>
                  <line
                    x1={x + boxW + 2} y1={y + boxH / 2}
                    x2={x + boxW + gap - 6} y2={y + boxH / 2}
                    stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"
                  />
                  <polygon
                    points={`${x + boxW + gap - 4},${y + boxH / 2 - 4} ${x + boxW + gap + 4},${y + boxH / 2} ${x + boxW + gap - 4},${y + boxH / 2 + 4}`}
                    fill="rgba(255,255,255,0.3)"
                  />
                </>
              )}
            </g>
          );
        })}
        {/* Labels below */}
        {stages.map((stage, i) => {
          const x = 16 + i * (boxW + gap);
          return (
            <text key={`lbl-${i}`} x={x + boxW / 2} y={totalH - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9">
              §24.{i + 1}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Interactive Try-It Panels ────────────────────────────────────────────────

function NERPanel({ task }: { task: NLPTask }) {
  const [text, setText] = useState(task.inputExample);
  const spans = useMemo(() => runNER(text), [text]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={`ner-input-${task.id}`} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
        Enter text to tag:
      </label>
      <input
        id={`ner-input-${task.id}`}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        aria-label="Enter text for NER tagging"
        style={{
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '7px 10px',
          color: 'white',
          fontSize: '0.85rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <div
        aria-live="polite"
        aria-label="NER tagging result"
        style={{
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: '0.88rem',
          lineHeight: 1.8,
          color: 'rgba(255,255,255,0.8)',
          minHeight: 36,
        }}
      >
        {spans.length > 0 ? renderNERResult(text, spans) : <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No entities detected</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: 'PERSON', color: '#6366F1' },
          { label: 'LOCATION', color: '#10B981' },
          { label: 'DATE', color: '#F59E0B' },
          { label: 'OBJECT', color: '#EC4899' },
        ].map(e => (
          <span key={e.label} style={{ fontSize: '0.7rem', color: e.color, background: `${e.color}22`, border: `1px solid ${e.color}44`, borderRadius: 999, padding: '1px 8px' }}>
            {e.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SentimentPanel({ task }: { task: NLPTask }) {
  const [text, setText] = useState(task.inputExample);
  const result = useMemo(() => analyzeSentiment(text), [text]);

  const labelColor = result.label === 'positive' ? '#10B981' : result.label === 'negative' ? '#EF4444' : 'rgba(255,255,255,0.5)';
  const labelEmoji = result.label === 'positive' ? '😊' : result.label === 'negative' ? '😠' : '😐';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={`sent-input-${task.id}`} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
        Enter text to classify:
      </label>
      <textarea
        id={`sent-input-${task.id}`}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        aria-label="Enter text for sentiment analysis"
        style={{
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '7px 10px',
          color: 'white',
          fontSize: '0.85rem',
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      <div
        aria-live="polite"
        aria-label={`Sentiment result: ${result.label}, confidence ${Math.round(result.confidence * 100)}%`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#0A0A0F',
          border: `1px solid ${labelColor}44`,
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <span style={{ fontSize: '1.6rem' }}>{labelEmoji}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: labelColor, textTransform: 'capitalize' }}>
            {result.label}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            Confidence: {Math.round(result.confidence * 100)}% &nbsp;|&nbsp;
            {result.posCount} positive, {result.negCount} negative keywords
          </p>
        </div>
        {/* Mini bar */}
        <div style={{ width: 60, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(result.confidence * 100)}%`, background: labelColor, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>
    </div>
  );
}

function AnimatedIOPanel({ task }: { task: NLPTask }) {
  const [step, setStep] = useState<'idle' | 'input' | 'processing' | 'output'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    setStep('input');
    timerRef.current = setTimeout(() => {
      setStep('processing');
      timerRef.current = setTimeout(() => {
        setStep('output');
      }, 900);
    }, 600);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep('idle');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={run}
          disabled={step !== 'idle' && step !== 'output'}
          aria-label={`Run ${task.name} example`}
          style={{
            padding: '6px 16px',
            borderRadius: 999,
            border: `1px solid ${COLOR}`,
            background: `${COLOR}22`,
            color: COLOR,
            fontSize: '0.8rem',
            cursor: step !== 'idle' && step !== 'output' ? 'not-allowed' : 'pointer',
            opacity: step !== 'idle' && step !== 'output' ? 0.5 : 1,
          }}
        >
          ▶ Run Example
        </button>
        <button
          onClick={reset}
          aria-label="Reset example"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Input */}
        <div
          aria-label="Input example"
          style={{
            background: '#0A0A0F',
            border: `1px solid ${step === 'input' || step === 'processing' || step === 'output' ? '#6366F1' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '0.85rem',
            color: step === 'idle' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
            transition: 'border-color 0.3s, color 0.3s',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#6366F1', fontWeight: 600, marginRight: 8 }}>INPUT</span>
          {task.inputExample}
        </div>

        {/* Arrow */}
        <div style={{ textAlign: 'center', color: step === 'processing' ? COLOR : 'rgba(255,255,255,0.2)', fontSize: '1.2rem', transition: 'color 0.3s' }}>
          {step === 'processing' ? '⚙️' : '↓'}
        </div>

        {/* Output */}
        <div
          aria-live="polite"
          aria-label="Output example"
          style={{
            background: '#0A0A0F',
            border: `1px solid ${step === 'output' ? '#10B981' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '0.85rem',
            color: step === 'output' ? '#10B981' : 'rgba(255,255,255,0.25)',
            transition: 'border-color 0.3s, color 0.3s',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600, marginRight: 8, opacity: step === 'output' ? 1 : 0.4 }}>OUTPUT</span>
          {step === 'output' ? task.outputExample : '...'}
        </div>
      </div>
    </div>
  );
}

function TryItPanel({ task }: { task: NLPTask }) {
  if (task.id === 'named-entity-recognition') return <NERPanel task={task} />;
  if (task.id === 'sentiment-analysis') return <SentimentPanel task={task} />;
  return <AnimatedIOPanel task={task} />;
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: NLPTask }) {
  const [showTryIt, setShowTryIt] = useState(false);
  const icon = TASK_ICONS[task.id] ?? '🔧';

  return (
    <article
      tabIndex={0}
      aria-label={`NLP task: ${task.name}`}
      style={{
        background: '#1A1A24',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        outline: 'none',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = COLOR; }}
      onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden="true">{icon}</span>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{task.name}</h3>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
        {task.description}
      </p>

      {/* Input → Output */}
      <div
        style={{
          background: '#242430',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: '0.82rem',
        }}
        aria-label={`Input/output example for ${task.name}`}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: '#6366F1', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>Input:</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{task.inputExample}</span>
        </div>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem' }} aria-hidden="true">↓</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: '#10B981', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>Output:</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{task.outputExample}</span>
        </div>
      </div>

      {/* Approach */}
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, fontStyle: 'italic' }}>
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Approach: </span>
        {task.approach}
      </p>

      {/* Try It toggle */}
      <button
        onClick={() => setShowTryIt(v => !v)}
        aria-expanded={showTryIt}
        style={{
          background: showTryIt ? `${COLOR}22` : 'transparent',
          border: `1px solid ${showTryIt ? COLOR : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8,
          padding: '7px 12px',
          color: showTryIt ? COLOR : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.15s',
        }}
      >
        <span>Try it interactively</span>
        <span style={{ fontSize: '0.7rem' }}>{showTryIt ? '▲' : '▼'}</span>
      </button>

      {showTryIt && (
        <div
          style={{
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '14px',
          }}
        >
          <TryItPanel task={task} />
        </div>
      )}
    </article>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({ tasks }: { tasks: ReadonlyArray<NLPTask> }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        aria-label="Comparison of NLP tasks"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.82rem',
          minWidth: 480,
        }}
      >
        <thead>
          <tr>
            {['Task', 'Input Type', 'Output Type', 'Key Challenge'].map(h => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: '#242430',
                  color: 'rgba(255,255,255,0.55)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr
              key={task.id}
              style={{ background: i % 2 === 0 ? '#1A1A24' : '#111118' }}
            >
              <td style={{ padding: '10px 14px', color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span aria-hidden="true" style={{ marginRight: 6 }}>{TASK_ICONS[task.id]}</span>
                {task.name}
              </td>
              <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.65)' }}>
                {TASK_INPUT_TYPE[task.id]}
              </td>
              <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.65)' }}>
                {TASK_OUTPUT_TYPE[task.id]}
              </td>
              <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>
                {TASK_KEY_CHALLENGE[task.id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NLPTasksVisualizer() {
  const tasks = useMemo(() => getNLPTasks(), []);

  return (
    <section
      aria-labelledby="nlp-tasks-title"
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <div>
        <h2
          id="nlp-tasks-title"
          style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: '0 0 8px 0' }}
        >
          NLP Tasks Overview
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.7, maxWidth: 720 }}>
          Natural Language Processing encompasses a diverse set of tasks — from converting speech to text,
          to translating between languages, to answering questions in natural language. §24.6 of AIMA surveys
          the major tasks, their inputs and outputs, and the dominant algorithmic approaches. Each task can
          stand alone or be chained into a processing pipeline.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        aria-label="NLP processing pipeline diagram"
      >
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          NLP Processing Pipeline
        </p>
        <PipelineDiagram />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Tasks compose: speech recognition produces text that feeds into NER / information extraction,
          enabling downstream QA or translation. The conditional probability{' '}
          <InlineMath latex="P(Y \mid X)" /> formalises each transformation.
        </p>
      </div>

      {/* Task Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
        aria-label="NLP task cards"
      >
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Comparison Table */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Side-by-Side Comparison
        </p>
        <ComparisonTable tasks={tasks} />
      </div>
    </section>
  );
}
