import { useState } from 'react';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

interface Paradigm {
  id: string;
  name: string;
  acronym: string;
  color: string;
  background: string;
  constraints: ReadonlyArray<string>; // LaTeX strings
  description: string;
  example: string;
  keyInsight: string;
}

const PARADIGMS: Paradigm[] = [
  {
    id: 'pure',
    name: 'Pure Inductive Learning',
    acronym: 'PIL',
    color: '#9CA3AF',
    background: '#9CA3AF',
    constraints: ['\\text{Hypothesis} \\wedge \\text{Descriptions} \\models \\text{Classifications}'],
    description:
      'Find a hypothesis that agrees with the observed examples. No background knowledge — learn purely from data. Standard decision trees and neural nets work this way.',
    example:
      'You have 100 coin flips and want to learn "is this coin fair?" — purely from the data.',
    keyInsight: 'Requires many examples because you start with no prior knowledge.',
  },
  {
    id: 'ebl',
    name: 'Explanation-Based Learning',
    acronym: 'EBL',
    color: '#10B981',
    background: '#10B981',
    constraints: [
      '\\text{Hypothesis} \\wedge \\text{Descriptions} \\models \\text{Classifications}',
      '\\text{Background} \\models \\text{Hypothesis}',
    ],
    description:
      'The background knowledge is strong enough to fully explain (derive) the hypothesis. EBL does not learn new facts — it converts known principles into efficient, cached rules.',
    example:
      'A physics student "learns" that bigger engines produce more acceleration by constructing an explanation from Newton\'s laws (which they already know). One example suffices.',
    keyInsight: 'The generalized rule follows deductively from background knowledge.',
  },
  {
    id: 'rbl',
    name: 'Relevance-Based Learning',
    acronym: 'RBL',
    color: '#6366F1',
    background: '#6366F1',
    constraints: [
      '\\text{Hypothesis} \\wedge \\text{Descriptions} \\models \\text{Classifications}',
      '\\text{Background} \\wedge \\text{Descriptions} \\wedge \\text{Classifications} \\models \\text{Hypothesis}',
    ],
    description:
      'Background knowledge tells which attributes are relevant (via determinations). The learner restricts its hypothesis space to relevant features, then generalizes deductively from observations.',
    example:
      'You meet one Brazilian who speaks Portuguese. Because you know "nationality determines language" (background), you immediately generalize to all Brazilians — from a single example.',
    keyInsight: 'Determinations shrink the hypothesis space from O(2ⁿ) to O(2^d) where d ≪ n.',
  },
  {
    id: 'kbil',
    name: 'Knowledge-Based Inductive Learning',
    acronym: 'KBIL / ILP',
    color: '#EC4899',
    background: '#EC4899',
    constraints: [
      '\\text{Background} \\wedge \\text{Hypothesis} \\wedge \\text{Descriptions} \\models \\text{Classifications}',
    ],
    description:
      'The background knowledge and the new hypothesis together explain the examples. This is the most general case — the hypothesis may add genuinely new knowledge beyond what background alone provides.',
    example:
      'A medical student watches an expert prescribe antibiotic M for disease D. Using existing medical knowledge, they hypothesize the general rule "M is effective against D."',
    keyInsight: 'Most powerful: allows learning new relational knowledge in first-order logic.',
  },
];

const CHAPTER_COLOR = '#10B981';

export default function KnowledgeTypesViz() {
  const [selected, setSelected] = useState<string>('pure');
  const [showConstraint, setShowConstraint] = useState(false);

  const paradigm = PARADIGMS.find(p => p.id === selected)!;

  return (
    <section aria-label="Knowledge-in-Learning Paradigms">
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
        Four Paradigms of Knowledge-Assisted Learning
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '20px' }}>
        The key question is: <em>how does background knowledge relate to the hypothesis and
        examples?</em> Each paradigm answers this differently via{' '}
        <strong style={{ color: '#E5E7EB' }}>entailment constraints</strong>. Select a paradigm
        below to explore its constraints and characteristics.
      </p>

      {/* Paradigm selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {PARADIGMS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            aria-pressed={selected === p.id}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: `1px solid ${selected === p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
              background: selected === p.id ? `${p.background}15` : 'var(--surface-2)',
              color: selected === p.id ? p.color : '#9CA3AF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: selected === p.id ? p.color : '#6B7280',
                marginBottom: '4px',
              }}
            >
              {p.acronym}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div
        style={{
          background: `${paradigm.background}08`,
          border: `1px solid ${paradigm.color}25`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
        role="region"
        aria-label={paradigm.name}
      >
        <h4
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: paradigm.color,
            marginBottom: '14px',
          }}
        >
          {paradigm.name} ({paradigm.acronym})
        </h4>

        {/* Entailment constraints */}
        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '12px',
              color: '#6B7280',
              fontWeight: 600,
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Entailment Constraints
          </p>
          {paradigm.constraints.map((c, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface-2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                overflowX: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: renderDisplayMath(c) }}
            />
          ))}
        </div>

        {/* Description */}
        <p
          style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.7, marginBottom: '14px' }}
        >
          {paradigm.description}
        </p>

        {/* Example */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px',
            borderLeft: `3px solid ${paradigm.color}`,
          }}
        >
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 600 }}>
            📚 Original Example
          </p>
          <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>
            {paradigm.example}
          </p>
        </div>

        {/* Key insight */}
        <div
          style={{
            background: `${paradigm.color}10`,
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p style={{ fontSize: '12px', color: paradigm.color, fontWeight: 700, marginBottom: '4px' }}>
            💡 Key Insight
          </p>
          <p style={{ fontSize: '13px', color: '#D1D5DB' }}>{paradigm.keyInsight}</p>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px' }}>
          Side-by-Side Comparison
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            }}
          >
            <thead>
              <tr>
                {['', 'Background needed?', 'New facts?', 'Examples needed', 'Hypothesis language'].map(
                  (h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        color: '#6B7280',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {[
                { acronym: 'PIL', bg: 'No', newFacts: 'Yes', examplesNeeded: 'Many', lang: 'Any' },
                { acronym: 'EBL', bg: 'Yes (complete)', newFacts: 'No', examplesNeeded: 'One', lang: 'Propositional/FOL' },
                { acronym: 'RBL', bg: 'Yes (determinations)', newFacts: 'Partly', examplesNeeded: 'Few', lang: 'Attribute-based' },
                { acronym: 'KBIL', bg: 'Yes (partial)', newFacts: 'Yes', examplesNeeded: 'Moderate', lang: 'First-Order Logic' },
              ].map((row, i) => {
                const paradigm = PARADIGMS[i]!;
                return (
                  <tr
                    key={row.acronym}
                    style={{
                      background: selected === paradigm.id ? `${paradigm.color}08` : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelected(paradigm.id)}
                  >
                    <td style={{ padding: '8px 12px', color: paradigm.color, fontWeight: 700 }}>
                      {row.acronym}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{row.bg}</td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{row.newFacts}</td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{row.examplesNeeded}</td>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{row.lang}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cumulative learning diagram */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '14px' }}>
          Cumulative Learning (Figure 20.6)
        </h4>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[
            { label: 'Observations', color: '#6366F1' },
            { arrow: true },
            {
              label: 'Knowledge-Based\nInductive Learning',
              color: CHAPTER_COLOR,
              highlight: true,
            },
            { arrow: true },
            { label: 'Hypotheses', color: '#F59E0B' },
            { arrow: true },
            { label: 'Predictions', color: '#EC4899' },
          ].map((item, i) => {
            if ('arrow' in item && item.arrow) {
              return (
                <span key={i} style={{ color: '#6B7280', fontSize: '20px' }}>
                  →
                </span>
              );
            }
            const it = item as { label: string; color: string; highlight?: boolean };
            return (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: `${it.color}15`,
                  border: `1px solid ${it.color}30`,
                  color: it.color,
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}
              >
                {it.label}
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: '14px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#F59E0B10',
            border: '1px solid #F59E0B20',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⬆</span>
          <div>
            <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600 }}>Prior Knowledge</p>
            <p style={{ fontSize: '11px', color: '#9CA3AF' }}>
              Feeds into the learning process, gets refined over time (cumulative learning).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive constraint builder */}
      <div
        style={{
          marginTop: '20px',
          background: 'var(--surface-2)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => setShowConstraint(s => !s)}
          style={{
            background: 'none',
            border: 'none',
            color: CHAPTER_COLOR,
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
          }}
          aria-expanded={showConstraint}
        >
          {showConstraint ? '▾' : '▸'} Show the formal entailment constraint for{' '}
          {paradigm.acronym}
        </button>
        {showConstraint && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
              The formal constraint that every valid hypothesis must satisfy:
            </p>
            {paradigm.constraints.map((c, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '8px',
                  overflowX: 'auto',
                  background: 'var(--surface-3)',
                  padding: '12px',
                  borderRadius: '6px',
                }}
                dangerouslySetInnerHTML={{
                  __html: renderDisplayMath(c),
                }}
              />
            ))}
            <div
              style={{
                padding: '10px',
                borderRadius: '6px',
                background: `${paradigm.color}10`,
                marginTop: '8px',
              }}
            >
              <p
                dangerouslySetInnerHTML={{
                  __html: renderInlineMath(
                    '\\models \\text{ means "logically entails" — the left-hand side makes the right-hand side true in all models}',
                  ),
                }}
                style={{ fontSize: '12px', color: '#9CA3AF' }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
