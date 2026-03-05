import React from 'react';
import manifest from '../manifest.json';
import WordEmbeddingVisualizer from './components/WordEmbeddingVisualizer';
import RNNVisualizer from './components/RNNVisualizer';
import AttentionVisualizer from './components/AttentionVisualizer';
import TransformerVisualizer from './components/TransformerVisualizer';
import PretrainingVisualizer from './components/PretrainingVisualizer';
import StateOfArtOverview from './components/StateOfArtOverview';

const NAV_LINKS = [
  { id: 'word-embeddings', label: 'Word Embeddings' },
  { id: 'rnn', label: 'RNNs' },
  { id: 'attention', label: 'Attention & Beam Search' },
  { id: 'transformer', label: 'Transformer' },
  { id: 'pretraining', label: 'Pretraining' },
  { id: 'state-of-art', label: 'State of the Art' },
] as const;

const SECTIONS = [
  { id: 'word-embeddings', title: '25.1 Word Embeddings', component: <WordEmbeddingVisualizer /> },
  { id: 'rnn', title: '25.2 Recurrent Neural Networks', component: <RNNVisualizer /> },
  { id: 'attention', title: '25.3 Sequence-to-Sequence and Attention', component: <AttentionVisualizer /> },
  { id: 'transformer', title: '25.4 Transformer Architecture', component: <TransformerVisualizer /> },
  { id: 'pretraining', title: '25.5 Pretraining and Transfer Learning', component: <PretrainingVisualizer /> },
  { id: 'state-of-art', title: '25.6 State of the Art', component: <StateOfArtOverview /> },
] as const;

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <a href="/aima-visualizations/" style={{ color: manifest.color, textDecoration: 'none', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }} aria-label="Back to all chapters">
            Back to All Chapters
          </a>
          <nav aria-label="Section navigation" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {NAV_LINKS.map(link => (
              <a key={link.id} href={`#${link.id}`} style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '13px', whiteSpace: 'nowrap', padding: '4px 8px', borderRadius: '4px' }}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section style={{ padding: '48px 24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>{manifest.description}</p>
      </section>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 64px' }}>
        {SECTIONS.map(section => (
          <section key={section.id} id={section.id} style={{ marginBottom: '64px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#E5E7EB', borderBottom: `2px solid ${manifest.color}40`, paddingBottom: '12px' }}>
              {section.title}
            </h2>
            {section.component}
          </section>
        ))}
      </main>
    </div>
  );
}
