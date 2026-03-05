/**
 * AILimitsViz — §28.1 The Limits of AI
 *
 * Interactive exploration of the four major arguments about the limits of AI:
 * (1) Argument from informality, (2) Argument from disability,
 * (3) Mathematical objection (Gödel), (4) Turing Test.
 */
import { useState } from 'react';

const CHAPTER_COLOR = '#EF4444';

interface Argument {
  id: string;
  title: string;
  proponent: string;
  year: string;
  claim: string;
  rebuttal: string;
  verdict: 'refuted' | 'partial' | 'open';
}

const ARGUMENTS: Argument[] = [
  {
    id: 'informality',
    title: 'Argument from Informality',
    proponent: 'Dreyfus, Sayre',
    year: '1972–1993',
    claim:
      'Human behavior is too complex for any formal rules. GOFAI (logical rule-based AI) can never capture informal human knowledge — machines rely on symbols, humans on embodied experience.',
    rebuttal:
      'Modern AI goes beyond GOFAI. Probabilistic reasoning handles open-ended domains; deep learning excels at "informal" tasks. The critique attacks one style of programming (logical rules), not AI in general. Embodied robotics directly addresses the situated-agent concern.',
    verdict: 'refuted',
  },
  {
    id: 'disability',
    title: 'Argument from Disability',
    proponent: 'Turing (enumerated), others',
    year: '1950',
    claim:
      '"A machine can never do X" — where X includes: be kind, have a sense of humor, fall in love, learn from experience, be creative, do something really new.',
    rebuttal:
      'Computers have already done "really new" things: astronomical discoveries, new mathematics, art via style transfer. Metareasoning programs examine their own computations. The only thing machines clearly cannot do is be exactly human.',
    verdict: 'refuted',
  },
  {
    id: 'godel',
    title: 'Mathematical Objection (Gödel)',
    proponent: 'Lucas, Penrose',
    year: '1961–1994',
    claim:
      "Gödel's incompleteness theorem shows machines are limited: they cannot prove their own Gödel sentence, while humans have no such limitation — so machines are mentally inferior.",
    rebuttal:
      "Three problems: (1) Lucas himself cannot assert his own Gödel-like sentence; (2) Gödel's theorem applies to mathematics, not just computers — no entity can prove impossible things; (3) Turing machines are infinite, computers are finite and described by propositional logic, which is not subject to incompleteness.",
    verdict: 'refuted',
  },
  {
    id: 'turing',
    title: 'Turing Test',
    proponent: 'Turing',
    year: '1950',
    claim:
      'Instead of asking "Can machines think?", ask whether a machine can pass a behavioral test: fool a human interrogator 30% of the time in a 5-minute typed conversation.',
    rebuttal:
      "AI researchers have moved on to domain-specific benchmarks (chess, Go, image recognition) that are more rigorous than the Turing test. Eugene Goostman fooled 33% of amateur judges in 2014 by pretending to be a non-native speaker — arguably exploiting human gullibility. No well-trained judge has been fooled.",
    verdict: 'open',
  },
];

const verdictColors: Record<string, string> = {
  refuted: '#10B981',
  partial: '#F59E0B',
  open: '#6366F1',
};

const verdictLabels: Record<string, string> = {
  refuted: 'Refuted by modern AI',
  partial: 'Partially addressed',
  open: 'Still debated',
};

export default function AILimitsViz() {
  const [selected, setSelected] = useState<string>('informality');
  const [showRebuttal, setShowRebuttal] = useState(false);

  const arg = ARGUMENTS.find(a => a.id === selected)!;

  return (
    <div role="region" aria-label="AI Limits Explorer">
      {/* Explanation */}
      <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7 }}>
          Since Alan Turing first defined AI in 1950, critics have proposed four major categories of
          argument for why machines <em>cannot</em> truly be intelligent. Modern AI has largely
          addressed each one. Select an argument to see the claim and the rebuttal.
        </p>
      </div>

      {/* Argument selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }} role="tablist" aria-label="AI limitation arguments">
        {ARGUMENTS.map(a => (
          <button
            key={a.id}
            role="tab"
            aria-selected={selected === a.id}
            onClick={() => { setSelected(a.id); setShowRebuttal(false); }}
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: selected === a.id ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: selected === a.id ? CHAPTER_COLOR : '#9CA3AF',
              outline: selected === a.id ? `1px solid ${CHAPTER_COLOR}` : 'none',
            }}
          >
            {a.title}
          </button>
        ))}
      </div>

      {/* Argument card */}
      <div role="tabpanel" style={{ background: 'var(--surface-2,#1A1A24)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{arg.title}</h3>
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{arg.proponent} · {arg.year}</span>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
            background: `${verdictColors[arg.verdict]}15`,
            color: verdictColors[arg.verdict],
            border: `1px solid ${verdictColors[arg.verdict]}40`,
          }}>
            {verdictLabels[arg.verdict]}
          </span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: CHAPTER_COLOR, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>The Claim</h4>
          <p style={{ color: '#E5E7EB', fontSize: '14px', lineHeight: 1.7, padding: '12px 16px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', borderLeft: `3px solid ${CHAPTER_COLOR}` }}>
            {arg.claim}
          </p>
        </div>

        <button
          onClick={() => setShowRebuttal(r => !r)}
          aria-expanded={showRebuttal}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none',
            background: `${verdictColors[arg.verdict]}15`, color: verdictColors[arg.verdict],
            fontSize: '13px', fontWeight: 600, width: '100%', justifyContent: 'center',
            marginBottom: showRebuttal ? '16px' : '0',
            transition: 'all 0.15s',
          }}
        >
          {showRebuttal ? '▲ Hide Rebuttal' : '▼ Show Rebuttal'}
        </button>

        {showRebuttal && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: verdictColors[arg.verdict], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>The Rebuttal</h4>
            <p style={{ color: '#E5E7EB', fontSize: '14px', lineHeight: 1.7, padding: '12px 16px', background: `${verdictColors[arg.verdict]}08`, borderRadius: '8px', borderLeft: `3px solid ${verdictColors[arg.verdict]}` }}>
              {arg.rebuttal}
            </p>
          </div>
        )}
      </div>

      {/* Turing Test Timeline */}
      <div style={{ marginTop: '24px', padding: '20px', background: 'var(--surface-2,#1A1A24)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>Turing Test — Historical Timeline</h3>
        <div style={{ position: 'relative', paddingLeft: '20px' }}>
          <div style={{ position: 'absolute', left: '0', top: '8px', bottom: '8px', width: '2px', background: `${CHAPTER_COLOR}40`, borderRadius: '1px' }} />
          {[
            { year: '1950', event: 'Turing proposes the Imitation Game in "Computing Machinery and Intelligence".' },
            { year: '1966', event: 'ELIZA (Weizenbaum) fools many users despite being a simple pattern-matcher.' },
            { year: '1991', event: 'First Loebner Prize competition — annual Turing test contest begins.' },
            { year: '2008', event: 'MGONZ and NATACHATA chatbots repeatedly fool unsuspecting users online.' },
            { year: '2014', event: 'Eugene Goostman fools 33% of amateur judges by posing as a 13-year-old Ukrainian. No well-trained judge has been fooled.' },
            { year: '2016–2019', event: 'MITSUKU wins Loebner Prize 4 years in a row — but AI research focus shifts to measurable benchmark tasks.' },
          ].map(({ year, event }) => (
            <div key={year} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <span style={{ width: '40px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: CHAPTER_COLOR, marginTop: '1px' }}>{year}</span>
              <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{event}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
