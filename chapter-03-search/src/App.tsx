import manifest from '../manifest.json';
import { SearchVisualizer } from './components/SearchVisualizer';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-base, #0A0A0F)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
      }}>
        <a
          href="/aima-visualizations/"
          style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '32px 24px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: '#3B82F620', color: '#3B82F6', fontWeight: 700, fontSize: '18px',
          }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 36px)', fontWeight: 700, marginBottom: '8px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '16px', lineHeight: 1.6, maxWidth: '600px' }}>
          Step-by-step animated BFS, DFS, UCS, and A* search on the Romania road map from the AIMA textbook.
        </p>
      </section>

      {/* Main visualizer */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          background: 'var(--surface-1, #111118)',
        }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Search Algorithm Visualizer</h2>
            <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
              Select an algorithm, choose start and goal cities, then step through or animate the search.
            </p>
          </div>
          <SearchVisualizer />
        </div>
      </section>
    </div>
  );
}
