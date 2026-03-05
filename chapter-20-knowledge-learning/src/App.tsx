import { useState } from 'react';
import manifest from '../manifest.json';
import VersionSpaceViz from './components/VersionSpaceViz';
import CurrentBestViz from './components/CurrentBestViz';
import KnowledgeTypesViz from './components/KnowledgeTypesViz';
import EBLViz from './components/EBLViz';
import DeterminationViz from './components/DeterminationViz';
import FOILViz from './components/FOILViz';

const SECTIONS = [
  {
    id: 'logical-formulation',
    title: '§20.1 Logical Formulation of Learning',
    subtitle: 'Current-Best-Hypothesis & Version Space',
    component: () => (
      <>
        <CurrentBestViz />
        <div style={{ marginTop: 40 }} />
        <VersionSpaceViz />
      </>
    ),
  },
  {
    id: 'knowledge-in-learning',
    title: '§20.2 Knowledge in Learning',
    subtitle: 'Entailment Constraints & Learning Paradigms',
    component: KnowledgeTypesViz,
  },
  {
    id: 'ebl',
    title: '§20.3 Explanation-Based Learning',
    subtitle: 'Generalizing from a Single Example via Proof',
    component: EBLViz,
  },
  {
    id: 'relevance',
    title: '§20.4 Relevance-Based Learning',
    subtitle: 'Minimal Consistent Determinations',
    component: DeterminationViz,
  },
  {
    id: 'ilp',
    title: '§20.5 Inductive Logic Programming',
    subtitle: 'FOIL Algorithm Step-by-Step',
    component: FOILViz,
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState(0);

  const Section = SECTIONS[activeSection]!.component;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--surface-1)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <a
          href="/aima-visualizations/"
          style={{
            color: 'var(--chapter-color)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
          aria-label="Back to all chapters"
        >
          ← All Chapters
        </a>
        <span style={{ color: '#374151', fontSize: '14px' }}>|</span>
        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>
          Chapter {manifest.chapter} — {manifest.title}
        </span>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: '40px 24px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${manifest.color}20`,
              color: manifest.color,
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">
            {manifest.icon}
          </span>
        </div>
        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 36px)',
            fontWeight: 700,
            marginBottom: '10px',
          }}
        >
          {manifest.title}
        </h1>
        <p
          style={{
            color: '#9CA3AF',
            fontSize: '16px',
            lineHeight: 1.6,
            maxWidth: '700px',
            marginBottom: '28px',
          }}
        >
          Prior knowledge makes learning dramatically more efficient. This chapter explores four
          complementary approaches: logical hypothesis refinement, explanation-based
          generalization, relevance-guided learning, and inductive logic programming.
        </p>

        {/* Section tabs */}
        <nav
          aria-label="Chapter sections"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          {SECTIONS.map((sec, i) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(i)}
              aria-pressed={i === activeSection}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${i === activeSection ? manifest.color : 'rgba(255,255,255,0.1)'}`,
                background:
                  i === activeSection ? `${manifest.color}20` : 'transparent',
                color: i === activeSection ? manifest.color : '#9CA3AF',
                fontSize: '13px',
                fontWeight: i === activeSection ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              {sec.title.split(' ')[0]} {sec.title.split(' ')[1]}
            </button>
          ))}
        </nav>
      </section>

      {/* Active section content */}
      <main
        style={{ padding: '0 24px 60px', maxWidth: '1100px', margin: '0 auto' }}
        role="main"
        aria-label={SECTIONS[activeSection]!.title}
      >
        <div
          style={{
            background: 'var(--surface-1)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: `${manifest.color}08`,
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: manifest.color,
                marginBottom: '4px',
              }}
            >
              {SECTIONS[activeSection]!.title}
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280' }}>
              {SECTIONS[activeSection]!.subtitle}
            </p>
          </div>
          <div style={{ padding: '24px' }}>
            <Section />
          </div>
        </div>
      </main>
    </div>
  );
}

