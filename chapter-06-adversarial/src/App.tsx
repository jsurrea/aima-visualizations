import manifest from '../manifest.json';
import { GameTreeVisualizer } from './components/GameTreeVisualizer';
import { GameTheoryViz } from './components/GameTheoryViz';
import { StochasticGameViz } from './components/StochasticGameViz';
import { PartiallyObservableViz } from './components/PartiallyObservableViz';
import { LimitationsViz } from './components/LimitationsViz';
import { useState } from 'react';

type Section = 'game-theory' | 'minimax' | 'stochastic' | 'partial-obs' | 'limitations';

const SECTIONS: { id: Section; label: string; component: React.ComponentType }[] = [
  { id: 'game-theory', label: '§6.1 Game Theory', component: GameTheoryViz },
  { id: 'minimax', label: '§6.2–6.4 Minimax / Alpha-Beta / MCTS', component: GameTreeVisualizer },
  { id: 'stochastic', label: '§6.5 Stochastic Games', component: StochasticGameViz },
  { id: 'partial-obs', label: '§6.6 Partially Observable', component: PartiallyObservableViz },
  { id: 'limitations', label: '§6.7 Limitations', component: LimitationsViz },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('game-theory');
  const ActiveComponent = SECTIONS.find(s => s.id === activeSection)?.component ?? GameTheoryViz;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '16px 24px' }}>
        <a href="/aima-visualizations/" style={{ color: 'var(--chapter-color)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} aria-label="Back to all chapters">
          ← Back to All Chapters
        </a>
      </header>

      {/* Hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '640px' }}>{manifest.description}</p>
      </section>

      {/* Section nav */}
      <nav aria-label="Chapter sections" style={{ padding: '0 24px', maxWidth: '960px', margin: '0 auto 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            aria-pressed={activeSection === s.id}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid',
              borderColor: activeSection === s.id ? manifest.color : 'var(--surface-border)',
              background: activeSection === s.id ? `${manifest.color}20` : 'var(--surface-2)',
              color: activeSection === s.id ? manifest.color : '#9CA3AF',
              cursor: 'pointer', fontSize: '14px', fontWeight: activeSection === s.id ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Active section */}
      <main style={{ padding: '0 24px 48px', maxWidth: '960px', margin: '0 auto' }}>
        <ActiveComponent />
      </main>
    </div>
  );
}

