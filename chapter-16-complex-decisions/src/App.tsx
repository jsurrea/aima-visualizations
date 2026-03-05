import manifest from '../manifest.json';
import MDPGridWorldViz from './components/MDPGridWorldViz';
import ValueIterationViz from './components/ValueIterationViz';
import PolicyIterationViz from './components/PolicyIterationViz';
import BanditSimulator from './components/BanditSimulator';
import POMDPViz from './components/POMDPViz';

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
      <section style={{ padding: '48px 24px 32px', maxWidth: '960px', margin: '0 auto' }}>
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
      <section style={{ padding: '0 24px 48px', maxWidth: '960px', margin: '0 auto' }}>
        <MDPGridWorldViz />
        <ValueIterationViz />
        <PolicyIterationViz />
        <BanditSimulator />
        <POMDPViz />
      </section>
    </div>
  );
}
