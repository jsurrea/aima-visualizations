import { useState } from 'react';
import manifest from '../manifest.json';
import CSPDefinitionViz from './components/CSPDefinitionViz';
import AC3Visualizer from './components/AC3Visualizer';
import BacktrackingVisualizer from './components/BacktrackingVisualizer';
import MinConflictsVisualizer from './components/MinConflictsVisualizer';
import StructureVisualizer from './components/StructureVisualizer';
import 'katex/dist/katex.min.css';

const CHAPTER_COLOR = '#3B82F6';

const TAB_CONFIGS = [
  { id: 'csp-definition', label: '5.1 CSP Basics' },
  { id: 'ac3', label: '5.2 AC-3' },
  { id: 'backtracking', label: '5.3 Backtracking' },
  { id: 'min-conflicts', label: '5.4 Min-Conflicts' },
  { id: 'structure', label: '5.5 Structure' },
] as const;

function getTabContent(id: string): React.ReactNode {
  switch (id) {
    case 'csp-definition': return <CSPDefinitionViz />;
    case 'ac3': return <AC3Visualizer />;
    case 'backtracking': return <BacktrackingVisualizer />;
    case 'min-conflicts': return <MinConflictsVisualizer />;
    case 'structure': return <StructureVisualizer />;
    default: return null;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <a href="/aima-visualizations/" style={{ color: CHAPTER_COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} aria-label="Back to all chapters">
          ← Back to All Chapters
        </a>
      </header>

      <section style={{ padding: '48px 24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '700px' }}>{manifest.description}</p>
      </section>

      <nav role="tablist" aria-label="Chapter sections" style={{ overflowX: 'auto', display: 'flex', gap: '4px', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', maxWidth: '1100px', margin: '0 auto' }}>
        {TAB_CONFIGS.map((tab, i) => (
          <button key={tab.id} role="tab" aria-selected={i === activeTab} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`}
            onClick={() => setActiveTab(i)}
            style={{ padding: '12px 16px', background: 'none', border: 'none', color: i === activeTab ? CHAPTER_COLOR : '#9CA3AF', borderBottom: i === activeTab ? `2px solid ${CHAPTER_COLOR}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: i === activeTab ? 600 : 400 }}>
            {tab.label}
          </button>
        ))}
      </nav>

      {TAB_CONFIGS.map((tab, i) => (
        <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`}
          style={{ display: i === activeTab ? 'block' : 'none', padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
          {getTabContent(tab.id)}
        </div>
      ))}
    </div>
  );
}
