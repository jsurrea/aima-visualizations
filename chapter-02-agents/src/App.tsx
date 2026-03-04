import manifest from '../manifest.json';
import Placeholder from './components/Placeholder';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <a
          href="/aima-visualizations/"
          style={{ color: 'var(--chapter-color)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px',
          }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>
          {manifest.description}
        </p>
      </section>

      {/* Sections list */}
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>
          Planned Visualizations
        </h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {manifest.sections.map((section) => (
            <Placeholder
              key={section.id}
              id={section.id}
              title={section.title}
              status={section.status}
              chapterColor={manifest.color}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
