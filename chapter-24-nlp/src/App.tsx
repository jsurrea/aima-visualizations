import manifest from '../manifest.json';
import { NGramVisualizer } from './components/NGramVisualizer';
import { CYKVisualizer } from './components/CYKVisualizer';
import { POSTaggerVisualizer } from './components/POSTaggerVisualizer';
import { TextClassifierVisualizer } from './components/TextClassifierVisualizer';
import { AmbiguityVisualizer } from './components/AmbiguityVisualizer';
import { NLPTasksVisualizer } from './components/NLPTasksVisualizer';
import { AgreementVisualizer } from './components/AgreementVisualizer';

const CHAPTER_COLOR = '#F59E0B';

const TOC: ReadonlyArray<{ id: string; section: string; title: string }> = [
  { id: 'ngram',             section: '§24.1', title: 'N-gram Language Models' },
  { id: 'text-classification', section: '§24.1', title: 'Naive Bayes Text Classification' },
  { id: 'pos-tagging',       section: '§24.1', title: 'POS Tagging (Viterbi)' },
  { id: 'cyk',               section: '§24.2–24.3', title: 'CYK Chart Parser' },
  { id: 'agreement',         section: '§24.4', title: 'Augmented Grammars' },
  { id: 'ambiguity',         section: '§24.5', title: 'Ambiguity' },
  { id: 'nlp-tasks',         section: '§24.6', title: 'NLP Tasks' },
];

const sectionTitles = Object.fromEntries(TOC.map((t) => [t.id, t.title]));

export default function App() {
  return (
    <div
      style={{
        '--chapter-color': CHAPTER_COLOR,
        minHeight: '100vh',
        background: '#0A0A0F',
        color: '#E5E7EB',
        fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
        scrollBehavior: 'smooth',
      } as React.CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        role="banner"
        style={{
          background: '#111118',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <a
          href="/aima-visualizations/"
          style={{
            color: CHAPTER_COLOR,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── Chapter hero ───────────────────────────────────────────────────── */}
        <section aria-labelledby="chapter-title" style={{ padding: '48px 0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '52px', height: '52px', borderRadius: '14px',
                background: `${CHAPTER_COLOR}22`, color: CHAPTER_COLOR,
                fontWeight: 700, fontSize: '18px', flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {String(manifest.chapter).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '36px' }} aria-hidden="true">{manifest.icon}</span>
          </div>
          <h1
            id="chapter-title"
            style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, margin: '0 0 14px' }}
          >
            {manifest.title}
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '17px', lineHeight: 1.7, maxWidth: '680px', margin: 0 }}>
            {manifest.description}
          </p>
        </section>

        {/* ── Table of Contents ──────────────────────────────────────────────── */}
        <nav
          aria-label="Chapter sections"
          style={{
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '40px',
          }}
        >
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Contents
          </h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TOC.map(({ id, section, title }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    color: '#9CA3AF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    padding: '4px 0',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = CHAPTER_COLOR; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9CA3AF'; }}
                >
                  <span style={{ fontSize: '12px', color: CHAPTER_COLOR, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {section}
                  </span>
                  <span>{title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── Visualizer Sections ────────────────────────────────────────────── */}
        <main role="main">

          <section id="ngram" aria-labelledby="h-ngram" style={{ marginBottom: '64px' }}>
            <h2 id="h-ngram" style={sectionHeading}>{sectionTitles['ngram']}</h2>
            <NGramVisualizer />
          </section>

          <section id="text-classification" aria-labelledby="h-text-classification" style={{ marginBottom: '64px' }}>
            <h2 id="h-text-classification" style={sectionHeading}>{sectionTitles['text-classification']}</h2>
            <TextClassifierVisualizer />
          </section>

          <section id="pos-tagging" aria-labelledby="h-pos-tagging" style={{ marginBottom: '64px' }}>
            <h2 id="h-pos-tagging" style={sectionHeading}>{sectionTitles['pos-tagging']}</h2>
            <POSTaggerVisualizer />
          </section>

          <section id="cyk" aria-labelledby="h-cyk" style={{ marginBottom: '64px' }}>
            <h2 id="h-cyk" style={sectionHeading}>{sectionTitles['cyk']}</h2>
            <CYKVisualizer />
          </section>

          <section id="agreement" aria-labelledby="h-agreement" style={{ marginBottom: '64px' }}>
            <h2 id="h-agreement" style={sectionHeading}>{sectionTitles['agreement']}</h2>
            <AgreementVisualizer />
          </section>

          <section id="ambiguity" aria-labelledby="h-ambiguity" style={{ marginBottom: '64px' }}>
            <h2 id="h-ambiguity" style={sectionHeading}>{sectionTitles['ambiguity']}</h2>
            <AmbiguityVisualizer />
          </section>

          <section id="nlp-tasks" aria-labelledby="h-nlp-tasks" style={{ marginBottom: '80px' }}>
            <h2 id="h-nlp-tasks" style={sectionHeading}>{sectionTitles['nlp-tasks']}</h2>
            <NLPTasksVisualizer />
          </section>

        </main>
      </div>
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 'clamp(18px, 3vw, 24px)',
  fontWeight: 700,
  color: '#F3F4F6',
  borderLeft: `4px solid ${CHAPTER_COLOR}`,
  paddingLeft: '14px',
  margin: '0 0 24px',
};
