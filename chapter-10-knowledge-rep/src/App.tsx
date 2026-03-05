import manifest from '../manifest.json';
import OntologyViz from './components/OntologyViz';
import EventCalculusViz from './components/EventCalculusViz';
import ModalLogicViz from './components/ModalLogicViz';
import SemanticNetworkViz from './components/SemanticNetworkViz';
import DefaultReasoningViz from './components/DefaultReasoningViz';

const NAV_SECTIONS = [
  { id: 'ontological-engineering', label: 'Ontological Engineering' },
  { id: 'event-calculus', label: 'Event Calculus' },
  { id: 'modal-logic', label: 'Modal Logic' },
  { id: 'semantic-networks', label: 'Semantic Networks' },
  { id: 'default-reasoning', label: 'Default Reasoning' },
];

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="/aima-visualizations/"
            style={{ color: manifest.color, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            aria-label="Back to all chapters"
          >
            ← Back
          </a>
          <nav aria-label="Section navigation" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {NAV_SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '13px', padding: '2px 8px', borderRadius: 6, background: 'var(--surface-2)' }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
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

      {/* Visualizations */}
      <main style={{ padding: '0 24px 64px', maxWidth: '900px', margin: '0 auto' }}>
        <OntologyViz />
        <EventCalculusViz />
        <ModalLogicViz />
        <SemanticNetworkViz />
        <DefaultReasoningViz />
      </main>
    </div>
  );
}
