import React, { useState, useMemo, useCallback } from 'react';
import { getAmbiguityExamples, type AmbiguityExample } from '../algorithms/index';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = '#F59E0B';

const TYPE_COLORS: Record<AmbiguityExample['type'], string> = {
  lexical:    '#3B82F6',
  syntactic:  '#F59E0B',
  semantic:   '#8B5CF6',
  pragmatic:  '#EC4899',
  referential:'#10B981',
};

const TYPE_LABELS: Record<AmbiguityExample['type'], string> = {
  lexical:    'Lexical',
  syntactic:  'Syntactic',
  semantic:   'Semantic',
  pragmatic:  'Pragmatic',
  referential:'Referential',
};

type FilterType = 'all' | AmbiguityExample['type'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

function TypeBadge({ type }: { type: AmbiguityExample['type'] }) {
  const color = TYPE_COLORS[type];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

// ─── PP-Attachment Tree Diagram ───────────────────────────────────────────────

function PPAttachmentTree({ reading }: { reading: 0 | 1 }) {
  // Reading 0: VP-attachment (I [shot elephant] [in pajamas])
  // Reading 1: NP-attachment (I shot [elephant [in pajamas]])
  const vpColor = reading === 0 ? COLOR : 'rgba(255,255,255,0.3)';
  const npColor = reading === 1 ? '#10B981' : 'rgba(255,255,255,0.3)';
  const activeLabel = reading === 0
    ? '"in my pajamas" modifies the verb phrase (VP) — I was wearing pajamas'
    : '"in my pajamas" modifies the noun phrase (NP) — the elephant was wearing pajamas';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        viewBox="0 0 480 240"
        width="100%"
        style={{ maxWidth: 480, fontFamily: 'inherit' }}
        aria-label={`Parse tree diagram for PP-attachment reading ${reading + 1}`}
        role="img"
      >
        {/* S node */}
        <text x="240" y="24" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>

        {/* NP: "I" */}
        <line x1="240" y1="30" x2="100" y2="65" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
        <text x="100" y="78" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="13">NP</text>
        <line x1="100" y1="85" x2="100" y2="110" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
        <text x="100" y="124" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12">I</text>

        {/* VP */}
        <line x1="240" y1="30" x2="310" y2="65" stroke={vpColor} strokeWidth="2"/>
        <text x="310" y="78" textAnchor="middle" fill={vpColor} fontSize="13" fontWeight={reading === 0 ? 'bold' : 'normal'}>VP</text>

        {/* V: "shot" */}
        <line x1="310" y1="85" x2="220" y2="120" stroke={vpColor} strokeWidth="1.5"/>
        <text x="220" y="134" textAnchor="middle" fill={vpColor} fontSize="12">V</text>
        <line x1="220" y1="140" x2="220" y2="165" stroke={vpColor} strokeWidth="1.5"/>
        <text x="220" y="178" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">shot</text>

        {/* NP: "an elephant" + optional PP */}
        <line x1="310" y1="85" x2="340" y2="120" stroke={npColor} strokeWidth={reading === 1 ? 2 : 1.5}/>
        <text x="340" y="134" textAnchor="middle" fill={npColor} fontSize="13" fontWeight={reading === 1 ? 'bold' : 'normal'}>NP</text>

        {reading === 0 ? (
          <>
            {/* NP-only: "an elephant" as leaf */}
            <line x1="340" y1="140" x2="340" y2="165" stroke={npColor} strokeWidth="1.5"/>
            <text x="340" y="178" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">an elephant</text>
            {/* PP hangs off VP */}
            <line x1="310" y1="85" x2="420" y2="120" stroke={vpColor} strokeWidth="2"/>
            <text x="420" y="134" textAnchor="middle" fill={vpColor} fontSize="13" fontWeight="bold">PP</text>
            <line x1="420" y1="140" x2="420" y2="165" stroke={vpColor} strokeWidth="1.5"/>
            <text x="420" y="178" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">in my pajamas</text>
          </>
        ) : (
          <>
            {/* NP: "an elephant" + PP */}
            <line x1="340" y1="140" x2="300" y2="175" stroke={npColor} strokeWidth="1.5"/>
            <text x="300" y="190" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">an elephant</text>
            <line x1="340" y1="140" x2="410" y2="175" stroke={npColor} strokeWidth="2"/>
            <text x="410" y="190" textAnchor="middle" fill={npColor} fontSize="13" fontWeight="bold">PP</text>
            <line x1="410" y1="196" x2="410" y2="218" stroke={npColor} strokeWidth="1.5"/>
            <text x="410" y="232" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">in my pajamas</text>
          </>
        )}
      </svg>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', margin: 0 }}>
        {activeLabel}
      </p>
    </div>
  );
}

// ─── Statistics Donut Chart ───────────────────────────────────────────────────

function DonutChart({ examples }: { examples: ReadonlyArray<AmbiguityExample> }) {
  const counts = useMemo(() => {
    const map: Partial<Record<AmbiguityExample['type'], number>> = {};
    for (const ex of examples) {
      map[ex.type] = (map[ex.type] ?? 0) + 1;
    }
    return map;
  }, [examples]);

  const types = Object.keys(TYPE_COLORS) as Array<AmbiguityExample['type']>;
  const total = examples.length;
  const cx = 80, cy = 80, r = 55, inner = 30;

  let cumulativeAngle = -Math.PI / 2;
  const slices = types.map(type => {
    const count = counts[type] ?? 0;
    const fraction = total > 0 ? count / total : 0;
    const angle = fraction * 2 * Math.PI;
    const start = cumulativeAngle;
    cumulativeAngle += angle;
    return { type, count, fraction, startAngle: start, endAngle: cumulativeAngle };
  }).filter(s => s.count > 0);

  function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number): string {
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${outerR},${outerR},0,${large},1,${x2},${y2} L${x3},${y3} A${innerR},${innerR},0,${large},0,${x4},${y4} Z`;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" width="140" height="140" aria-label="Donut chart of ambiguity type distribution" role="img">
        {slices.map(s => (
          <path
            key={s.type}
            d={arcPath(s.startAngle, s.endAngle, r, inner)}
            fill={TYPE_COLORS[s.type]}
            opacity={0.85}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">examples</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map(s => (
          <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[s.type], flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{TYPE_LABELS[s.type]}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>({s.count})</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{Math.round(s.fraction * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pronoun Reference Demo ───────────────────────────────────────────────────

const PRONOUN_PATTERN = /\b(she|he|they|her|him|them)\b/gi;

function PronounDemo() {
  const [sentence, setSentence] = useState('Alice told Bob she forgot the key');
  const [selectedRef, setSelectedRef] = useState<string>('');

  const names = useMemo(() => {
    const words = sentence.split(/\s+/);
    const found: string[] = [];
    // Collect capitalised words that are not at the start of sentence (simple heuristic)
    words.forEach((w, i) => {
      const clean = w.replace(/[^a-zA-Z]/g, '');
      const first = clean[0];
      if (first === undefined) return;
      const isCapitalized = first === first.toUpperCase();
      if (i > 0 && clean.length > 0 && isCapitalized) {
        if (!found.includes(clean)) found.push(clean);
      } else if (i === 0 && clean.length > 1 && isCapitalized) {
        if (!found.includes(clean)) found.push(clean);
      }
    });
    return found;
  }, [sentence]);

  const pronouns = useMemo(() => {
    const found: string[] = [];
    let m: RegExpExecArray | null;
    const re = /\b(she|he|they|her|him|them)\b/gi;
    while ((m = re.exec(sentence)) !== null) {
      const pronoun = m[1];
      if (pronoun !== undefined && !found.includes(pronoun.toLowerCase())) found.push(pronoun.toLowerCase());
    }
    return found;
  }, [sentence]);

  const resolvedSentence = useMemo(() => {
    if (!selectedRef) return sentence;
    return sentence.replace(PRONOUN_PATTERN, `[${selectedRef}]`);
  }, [sentence, selectedRef]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSentence(e.target.value);
    setSelectedRef('');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }} htmlFor="pronoun-input">
        Type a sentence containing a pronoun (she/he/they/her/him/them):
      </label>
      <input
        id="pronoun-input"
        type="text"
        value={sentence}
        onChange={handleInput}
        aria-label="Enter sentence with pronoun for referential ambiguity demo"
        style={{
          background: '#242430',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'white',
          fontSize: '0.95rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      {pronouns.length > 0 && names.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            The pronoun <strong style={{ color: COLOR }}>{pronouns.join(', ')}</strong> could refer to:
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedRef('')}
              aria-pressed={selectedRef === ''}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                border: `1px solid ${selectedRef === '' ? COLOR : 'rgba(255,255,255,0.15)'}`,
                background: selectedRef === '' ? `${COLOR}22` : 'transparent',
                color: selectedRef === '' ? COLOR : 'rgba(255,255,255,0.6)',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Ambiguous
            </button>
            {names.map(name => (
              <button
                key={name}
                onClick={() => setSelectedRef(name)}
                aria-pressed={selectedRef === name}
                style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  border: `1px solid ${selectedRef === name ? '#10B981' : 'rgba(255,255,255,0.15)'}`,
                  background: selectedRef === name ? '#10B98122' : 'transparent',
                  color: selectedRef === name ? '#10B981' : 'rgba(255,255,255,0.6)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <div
            aria-live="polite"
            style={{
              background: '#242430',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '1rem',
              color: selectedRef ? '#10B981' : 'rgba(255,255,255,0.8)',
              fontStyle: selectedRef ? 'normal' : 'italic',
            }}
          >
            {selectedRef
              ? resolvedSentence
              : `"${sentence}" — pronoun reference is unresolved`}
          </div>
        </div>
      )}

      {pronouns.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>
          No pronouns detected. Try adding "she", "he", "they", "her", "him", or "them".
        </p>
      )}
      {pronouns.length > 0 && names.length <= 1 && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>
          Only one potential referent found. Add more proper names to create ambiguity.
        </p>
      )}
    </div>
  );
}

// ─── Expandable Card ──────────────────────────────────────────────────────────

function AmbiguityCard({ example }: { example: AmbiguityExample }) {
  const [showReadings, setShowReadings] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [ppReading, setPpReading] = useState<0 | 1>(0);
  const color = TYPE_COLORS[example.type];
  const isPP = example.id === 'pp-attachment';

  return (
    <article
      tabIndex={0}
      aria-label={`${TYPE_LABELS[example.type]} ambiguity: ${example.sentence}`}
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
      onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
      onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <TypeBadge type={example.type} />
      </div>

      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.5 }}>
        &ldquo;{example.sentence}&rdquo;
      </p>

      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
        {example.ambiguity}
      </p>

      {/* PP-Attachment tree demo */}
      {isPP && (
        <div style={{ background: '#242430', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Interactive Parse Tree
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['VP attachment', 'NP attachment'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => setPpReading(i as 0 | 1)}
                aria-pressed={ppReading === i}
                style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  border: `1px solid ${ppReading === i ? color : 'rgba(255,255,255,0.15)'}`,
                  background: ppReading === i ? `${color}22` : 'transparent',
                  color: ppReading === i ? color : 'rgba(255,255,255,0.6)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Reading {i + 1}: {label}
              </button>
            ))}
          </div>
          <PPAttachmentTree reading={ppReading} />
        </div>
      )}

      {/* Readings toggle */}
      <button
        onClick={() => setShowReadings(v => !v)}
        aria-expanded={showReadings}
        style={{
          background: 'transparent',
          border: `1px solid ${showReadings ? color : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8,
          padding: '7px 12px',
          color: showReadings ? color : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Show {example.readings.length} readings</span>
        <span style={{ fontSize: '0.7rem' }}>{showReadings ? '▲' : '▼'}</span>
      </button>

      {showReadings && (
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {example.readings.map((reading, i) => (
            <li key={i} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
              {reading}
            </li>
          ))}
        </ol>
      )}

      {/* Explanation toggle */}
      <button
        onClick={() => setShowExplanation(v => !v)}
        aria-expanded={showExplanation}
        style={{
          background: 'transparent',
          border: `1px solid ${showExplanation ? color : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8,
          padding: '7px 12px',
          color: showExplanation ? color : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Linguistic explanation</span>
        <span style={{ fontSize: '0.7rem' }}>{showExplanation ? '▲' : '▼'}</span>
      </button>

      {showExplanation && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, padding: '8px 12px', background: '#242430', borderRadius: 8 }}>
          {example.explanation}
        </p>
      )}
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AmbiguityVisualizer() {
  const examples = useMemo(() => getAmbiguityExamples(), []);
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = useMemo(
    () => filter === 'all' ? examples : examples.filter(e => e.type === filter),
    [examples, filter],
  );

  const allTypes: FilterType[] = ['all', 'lexical', 'syntactic', 'semantic', 'pragmatic', 'referential'];

  return (
    <section
      aria-labelledby="ambiguity-title"
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <div>
        <h2
          id="ambiguity-title"
          style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: '0 0 8px 0' }}
        >
          Ambiguity in Natural Language
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.7, maxWidth: 720 }}>
          Natural language is pervasively ambiguous. A sentence that has one clear meaning to a human
          speaker can map to dozens of distinct logical forms. Understanding why — and how NLP systems
          cope — is central to §24.5 of AIMA. The five major ambiguity types are illustrated below,
          each with alternative readings and a linguistic explanation.
        </p>
      </div>

      {/* Stats panel */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        aria-label="Statistics: distribution of ambiguity types"
      >
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Type Distribution
        </p>
        <DonutChart examples={examples} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
          The examples use{' '}
          <InlineMath latex="P(\text{reading} \mid \text{context})" />{' '}
          to formally describe how ambiguity resolution relies on prior probability over interpretations.
        </p>
      </div>

      {/* Type filter bar */}
      <div
        role="group"
        aria-label="Filter ambiguity examples by type"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {allTypes.map(t => {
          const active = filter === t;
          const color = t === 'all' ? COLOR : TYPE_COLORS[t as AmbiguityExample['type']];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              aria-pressed={active}
              style={{
                padding: '6px 16px',
                borderRadius: 999,
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
                background: active ? `${color}22` : 'transparent',
                color: active ? color : 'rgba(255,255,255,0.55)',
                fontSize: '0.82rem',
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t === 'all' ? 'All' : TYPE_LABELS[t as AmbiguityExample['type']]}
            </button>
          );
        })}
      </div>

      {/* Example cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}
        aria-label={`Showing ${filtered.length} ambiguity example${filtered.length !== 1 ? 's' : ''}`}
      >
        {filtered.map(ex => (
          <AmbiguityCard key={ex.id} example={ex} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
          No examples for this type.
        </p>
      )}

      {/* Interactive pronoun demo */}
      <div
        style={{
          background: '#1A1A24',
          border: `1px solid ${COLOR}44`,
          borderRadius: 12,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        aria-label="Interactive referential ambiguity demo"
      >
        <div>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Interactive Demo
          </p>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>
            Referential Ambiguity: Pronoun Resolution
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            See how choosing different antecedents for a pronoun changes the meaning of a sentence.
            This illustrates the coreference resolution problem that NLP systems must solve.
          </p>
        </div>
        <PronounDemo />
      </div>
    </section>
  );
}
