import manifest from '../manifest.json';
import AIApproaches from './components/AIApproaches';
import AITimeline from './components/AITimeline';
import StandardModelLoop from './components/StandardModelLoop';

const DIVIDER = (
  <hr
    style={{
      border: 'none',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      margin: '0',
    }}
  />
);

function SectionWrapper({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-label={title}
      style={{ padding: '48px 24px', maxWidth: '900px', margin: '0 auto' }}
    >
      <h2
        style={{
          fontSize: 'clamp(18px, 3vw, 24px)',
          fontWeight: 700,
          color: '#FFFFFF',
          marginBottom: '8px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          width: '40px',
          height: '3px',
          borderRadius: '2px',
          background: manifest.color,
          marginBottom: '28px',
        }}
        aria-hidden="true"
      />
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0F',
        color: 'white',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#111118',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
        }}
      >
        <a
          href="/aima-visualizations/"
          style={{
            color: manifest.color,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      {/* Chapter hero */}
      <section
        style={{
          padding: '48px 24px 40px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}
        >
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
            fontSize: 'clamp(24px, 5vw, 40px)',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          {manifest.title}
        </h1>
        <p
          style={{
            color: '#9CA3AF',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '600px',
          }}
        >
          {manifest.description}
        </p>
      </section>

      {DIVIDER}

      <SectionWrapper id="approaches" title="The Four Approaches to AI">
        <AIApproaches />
      </SectionWrapper>

      {DIVIDER}

      <SectionWrapper id="timeline" title="AI History Timeline">
        <AITimeline />
      </SectionWrapper>

      {DIVIDER}

      <SectionWrapper id="standard-model" title="Standard Agent-Environment Loop">
        <StandardModelLoop />
      </SectionWrapper>
    </div>
  );
}
