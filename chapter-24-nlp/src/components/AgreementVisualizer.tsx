import { useState, useMemo, useCallback } from 'react';
import {
  getAugmentedNP,
  checkAgreement,
} from '../algorithms/index';
import type { AugmentedNP } from '../algorithms/index';

// ── Types ──────────────────────────────────────────────────────────────────────

type SortField = 'word' | 'case' | 'personNumber';
type SortDir = 'asc' | 'desc';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Personal pronouns supported by getAugmentedNP (excludes 'it', possessives, reflexives). */
const SUPPORTED_PRONOUNS = ['I', 'me', 'we', 'us', 'you', 'he', 'him', 'she', 'her', 'they', 'them'];
const SUBJECT_PRONOUNS = ['I', 'we', 'you', 'he', 'she', 'they'];
const AGREEMENT_VERBS = ['am', 'is', 'are', 'was', 'were', 'has', 'have', 'does', 'do'];

/** Verbs recognised for agreement checking in the sentence builder. */
const KNOWN_VERBS = new Set([
  'am','is','are','was','were','has','have','does','do',
  'goes','go','runs','run','walks','walk','talks','talk',
  'sings','sing','eats','eat','plays','play','writes','write',
]);

const EXAMPLE_SENTENCES: ReadonlyArray<{ subject: string; verb: string; predicate: string }> = [
  { subject: 'I',   verb: 'am',  predicate: 'scared' },
  { subject: 'I',   verb: 'is',  predicate: 'scared' },
  { subject: 'She', verb: 'are', predicate: 'scared' },
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    color: '#E5E7EB',
  } as React.CSSProperties,

  sectionCard: {
    background: '#1A1A24',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#F59E0B',
    marginBottom: '16px',
    marginTop: 0,
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#9CA3AF',
    marginBottom: '6px',
  } as React.CSSProperties,

  select: {
    background: '#0A0A0F',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#E5E7EB',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    cursor: 'pointer',
  } as React.CSSProperties,

  input: {
    background: '#0A0A0F',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#E5E7EB',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  pill: (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
  }),

  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#9CA3AF',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  } as React.CSSProperties,

  gridCell: (agrees: boolean): React.CSSProperties => ({
    textAlign: 'center',
    padding: '8px 4px',
    fontSize: '16px',
    background: agrees ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
    borderRadius: '4px',
  }),
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function FeatureBadge({ np }: { np: AugmentedNP }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
      <span style={styles.pill('#6366F1')}>case: {np.case}</span>
      <span style={styles.pill('#F59E0B')}>pn: {np.personNumber}</span>
      <span style={styles.pill('#10B981')}>head: {np.head}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AgreementVisualizer() {
  // ── §1 Checker state ────────────────────────────────────────────────────────
  const [checkerSubject, setCheckerSubject] = useState<string>('I');
  const [checkerVerb, setCheckerVerb] = useState<string>('am');

  const checkerNP = useMemo(() => getAugmentedNP(checkerSubject), [checkerSubject]);
  const checkerAgrees = useMemo(() => {
    if (!checkerNP) return null;
    return checkAgreement(checkerNP, checkerVerb.trim());
  }, [checkerNP, checkerVerb]);

  // ── §2 Feature table sort state ─────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('word');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const pronounData = useMemo(
    () =>
      SUPPORTED_PRONOUNS.map((p) => getAugmentedNP(p)).filter((x): x is AugmentedNP => x !== null),
    [],
  );

  const sortedPronouns = useMemo(() => {
    return [...pronounData].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [pronounData, sortField, sortDir]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField],
  );

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';

  // ── §3 Agreement grid ───────────────────────────────────────────────────────
  const agreementGrid = useMemo(() => {
    return SUBJECT_PRONOUNS.map((subj) => {
      const np = getAugmentedNP(subj);
      return {
        subject: subj,
        np,
        agreements: AGREEMENT_VERBS.map((v) => ({
          verb: v,
          agrees: np ? checkAgreement(np, v) : false,
        })),
      };
    });
  }, []);

  // ── §4 Example sentences ────────────────────────────────────────────────────
  const [selectedExample, setSelectedExample] = useState<number>(0);

  const exampleResults = useMemo(
    () =>
      EXAMPLE_SENTENCES.map(({ subject, verb, predicate }) => {
        const np = getAugmentedNP(subject);
        const agrees = np ? checkAgreement(np, verb) : false;
        return { subject, verb, predicate, np, agrees };
      }),
    [],
  );

  // ── §5 "What if" sentence builder ───────────────────────────────────────────
  const [wiSubject, setWiSubject] = useState<string>('I');
  const [wiSentence, setWiSentence] = useState<string>('I am going to the store');

  const wiNP = useMemo(() => getAugmentedNP(wiSubject), [wiSubject]);

  /** Tokenise sentence, highlight first verb-like word that violates agreement */
  const wiAnnotated = useMemo(() => {
    const tokens = wiSentence.trim().split(/\s+/);
    if (!wiNP) return tokens.map((t) => ({ text: t, violation: false }));

    return tokens.map((raw) => {
      // Strip leading/trailing punctuation for checking
      const clean = raw.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
      if (!clean) return { text: raw, violation: false };
      // Only flag if it looks like a verb (skip subject token itself)
      if (clean === wiSubject.toLowerCase()) return { text: raw, violation: false };
      // Check: if it's one of our known verbs or looks verb-like (ends in s or base)
      const knownVerbs = KNOWN_VERBS;
      if (knownVerbs.has(clean)) {
        const agrees = checkAgreement(wiNP, clean);
        return { text: raw, violation: !agrees };
      }
      return { text: raw, violation: false };
    });
  }, [wiSentence, wiNP, wiSubject]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container} aria-label="Augmented Grammar Agreement Visualizer">

      {/* Header */}
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.7, marginTop: 0, marginBottom: '28px' }}>
        Augmented grammars extend context-free rules with <strong style={{ color: '#E5E7EB' }}>feature variables</strong> that
        must unify across a parse tree. Subject–verb agreement is enforced by requiring the
        subject NP and the finite verb to carry compatible{' '}
        <em>person–number</em> features — e.g., <code style={{ color: '#F59E0B' }}>1S</code> (first-person singular) pairs
        only with <em>am</em>, not <em>is</em> or <em>are</em>.
      </p>

      {/* ── 1. Checker ─────────────────────────────────────────────────────── */}
      <div style={styles.sectionCard} role="region" aria-label="Subject-Verb Agreement Checker">
        <h3 style={styles.sectionTitle}>Subject–Verb Agreement Checker</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label htmlFor="checker-subject" style={styles.label}>Subject</label>
            <select
              id="checker-subject"
              value={checkerSubject}
              onChange={(e) => setCheckerSubject(e.target.value)}
              style={styles.select}
              aria-label="Select subject pronoun"
            >
              {SUPPORTED_PRONOUNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {checkerNP && <FeatureBadge np={checkerNP} />}
          </div>

          <div>
            <label htmlFor="checker-verb" style={styles.label}>Verb</label>
            <input
              id="checker-verb"
              type="text"
              value={checkerVerb}
              onChange={(e) => setCheckerVerb(e.target.value)}
              style={styles.input}
              placeholder="e.g. am, is, are, goes…"
              aria-label="Type a verb to check"
              spellCheck={false}
            />
          </div>
        </div>

        {checkerVerb.trim() && checkerNP && checkerAgrees !== null && (
          <div
            style={{
              borderRadius: '10px',
              padding: '16px 20px',
              background: checkerAgrees ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${checkerAgrees ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: '28px' }} aria-hidden="true">
              {checkerAgrees ? '✅' : '❌'}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: checkerAgrees ? '#10B981' : '#EF4444' }}>
                "{checkerSubject} {checkerVerb.trim()}" is{' '}
                {checkerAgrees ? 'grammatically correct' : 'a grammatical error'}
              </div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
                {checkerNP.personNumber} subject{' '}
                {checkerAgrees
                  ? `correctly pairs with "${checkerVerb.trim()}"`
                  : `cannot pair with "${checkerVerb.trim()}" — feature unification fails`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Feature table ────────────────────────────────────────────────── */}
      <div style={styles.sectionCard} role="region" aria-label="Pronoun feature table">
        <h3 style={styles.sectionTitle}>Pronoun Feature Table</h3>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
          Click a column header to sort. Each pronoun carries two grammatical features used
          for unification during parsing.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            aria-label="Pronoun case and person-number features"
          >
            <thead>
              <tr>
                {(['word', 'case', 'personNumber'] as SortField[]).map((f) => (
                  <th
                    key={f}
                    style={styles.th}
                    onClick={() => handleSort(f)}
                    aria-sort={sortField === f ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSort(f)}
                  >
                    {f === 'personNumber' ? 'Person–Number' : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span aria-hidden="true" style={{ opacity: 0.6 }}>{sortArrow(f)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPronouns.map((np) => (
                <tr key={np.word}>
                  <td style={styles.td}>
                    <code style={{ color: '#F59E0B', fontWeight: 600 }}>{np.word}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.pill(np.case === 'subjective' ? '#6366F1' : '#EC4899')}>
                      {np.case}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.pill('#10B981')}>{np.personNumber}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Agreement grid ───────────────────────────────────────────────── */}
      <div style={styles.sectionCard} role="region" aria-label="Agreement matrix">
        <h3 style={styles.sectionTitle}>Agreement Matrix</h3>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
          Each cell shows whether the subject–verb pair is grammatical (✅) or violates
          agreement (❌).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}
            aria-label="Subject-verb agreement matrix"
          >
            <thead>
              <tr>
                <th style={{ ...styles.th, borderBottom: 'none' }} aria-label="Subject \ Verb"></th>
                {AGREEMENT_VERBS.map((v) => (
                  <th key={v} style={{ ...styles.th, textAlign: 'center', borderBottom: 'none' }}>
                    <em>{v}</em>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agreementGrid.map(({ subject, np, agreements }) => (
                <tr key={subject}>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#F59E0B' }}>
                    {subject}
                    {np && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>
                        {np.personNumber}
                      </span>
                    )}
                  </td>
                  {agreements.map(({ verb, agrees }) => (
                    <td
                      key={verb}
                      style={styles.gridCell(agrees)}
                      aria-label={`${subject} ${verb}: ${agrees ? 'correct' : 'incorrect'}`}
                    >
                      {agrees ? '✅' : '❌'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Wumpus world examples ─────────────────────────────────────────── */}
      <div style={styles.sectionCard} role="region" aria-label="Wumpus World examples">
        <h3 style={styles.sectionTitle}>Wumpus World Examples</h3>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
          From §24.4: an agent navigating the Wumpus World must produce grammatical sentences.
          Select an example to inspect its agreement features.
        </p>

        <div
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}
          role="group"
          aria-label="Example sentence selector"
        >
          {exampleResults.map(({ subject, verb, predicate }, i) => (
            <button
              key={i}
              onClick={() => setSelectedExample(i)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${selectedExample === i ? '#F59E0B' : 'rgba(255,255,255,0.12)'}`,
                background: selectedExample === i ? 'rgba(245,158,11,0.12)' : '#0A0A0F',
                color: selectedExample === i ? '#F59E0B' : '#9CA3AF',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              aria-pressed={selectedExample === i}
              aria-label={`Example: ${subject} ${verb} ${predicate}`}
            >
              "{subject} {verb} {predicate}"
            </button>
          ))}
        </div>

        {(() => {
          const ex = exampleResults[selectedExample];
          if (!ex) return null;
          return (
            <div
              style={{
                borderRadius: '10px',
                padding: '16px 20px',
                background: ex.agrees ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                border: `1px solid ${ex.agrees ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
              role="status"
              aria-live="polite"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }} aria-hidden="true">{ex.agrees ? '✅' : '❌'}</span>
                <span style={{ fontSize: '20px', fontWeight: 700, fontStyle: 'italic' }}>
                  "{ex.subject} {ex.verb} {ex.predicate}"
                </span>
              </div>
              {ex.np && (
                <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7 }}>
                  <div>
                    Subject <code style={{ color: '#F59E0B' }}>{ex.subject}</code> →
                    person–number <span style={styles.pill('#10B981')}>{ex.np.personNumber}</span>,
                    case <span style={styles.pill('#6366F1')}>{ex.np.case}</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    Verb <code style={{ color: '#F59E0B' }}>{ex.verb}</code>{' '}
                    {ex.agrees
                      ? `✔ unifies with ${ex.np.personNumber}`
                      : `✘ fails unification — requires ${
                          ex.verb === 'is' ? '3S' : ex.verb === 'are' ? '1P / 2 / 3P' : '—'
                        } but subject is ${ex.np.personNumber}`}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── 5. "What if" sentence builder ────────────────────────────────────── */}
      <div style={styles.sectionCard} role="region" aria-label="What-if sentence builder">
        <h3 style={styles.sectionTitle}>"What If" Sentence Builder</h3>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
          Choose a subject pronoun, then type a sentence. Known verbs that violate agreement
          with the selected subject are <span style={{ color: '#EF4444', fontWeight: 600 }}>underlined in red</span>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label htmlFor="wi-subject" style={styles.label}>Subject Pronoun</label>
            <select
              id="wi-subject"
              value={wiSubject}
              onChange={(e) => {
                setWiSubject(e.target.value);
                setWiSentence((prev) => {
                  const tokens = prev.trim().split(/\s+/);
                  if (tokens.length > 0) {
                    tokens[0] = e.target.value;
                    return tokens.join(' ');
                  }
                  return e.target.value;
                });
              }}
              style={styles.select}
              aria-label="Select subject pronoun for sentence builder"
            >
              {SUPPORTED_PRONOUNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wi-sentence" style={styles.label}>Sentence</label>
            <input
              id="wi-sentence"
              type="text"
              value={wiSentence}
              onChange={(e) => setWiSentence(e.target.value)}
              style={styles.input}
              aria-label="Type a sentence to check agreement"
              spellCheck={false}
            />
          </div>
        </div>

        <div
          style={{
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '14px 16px',
            fontSize: '18px',
            lineHeight: 2,
            minHeight: '52px',
            letterSpacing: '0.01em',
          }}
          aria-label="Annotated sentence with agreement violations highlighted"
          aria-live="polite"
        >
          {wiAnnotated.map((tok, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {tok.violation ? (
                <span
                  style={{
                    textDecoration: 'underline wavy #EF4444',
                    color: '#EF4444',
                    fontWeight: 600,
                  }}
                  title={`Agreement violation: "${tok.text}" does not agree with subject "${wiSubject}"`}
                  aria-label={`Agreement violation: ${tok.text}`}
                >
                  {tok.text}
                </span>
              ) : (
                <span>{tok.text}</span>
              )}
            </span>
          ))}
          {wiSentence.trim() === '' && (
            <span style={{ color: '#4B5563', fontStyle: 'italic' }}>Type a sentence above…</span>
          )}
        </div>

        {wiNP && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280' }}>
            Active subject features:
            <FeatureBadge np={wiNP} />
          </div>
        )}
      </div>
    </div>
  );
}
