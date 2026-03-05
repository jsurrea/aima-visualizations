import React, { useState } from 'react';
import manifest from '../manifest.json';
import BayesNetViz from './components/BayesNetViz';
import ExactInferenceViz from './components/ExactInferenceViz';
import SamplingViz from './components/SamplingViz';
import GibbsViz from './components/GibbsViz';
import CausalViz from './components/CausalViz';

type TabId = 'bayes-net' | 'exact-inference' | 'sampling' | 'gibbs' | 'causal';

interface Tab {
  id: TabId;
  title: string;
  component: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'bayes-net', title: 'Bayesian Networks', component: <BayesNetViz /> },
  { id: 'exact-inference', title: 'Exact Inference', component: <ExactInferenceViz /> },
  { id: 'sampling', title: 'Approximate Sampling', component: <SamplingViz /> },
  { id: 'gibbs', title: 'Gibbs Sampling', component: <GibbsViz /> },
  { id: 'causal', title: 'Causal Networks', component: <CausalViz /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('bayes-net');

  const CHAPTER_COLOR = manifest.color;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base)',
        color: 'white',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--surface-border)',
          padding: '16px 24px',
        }}
      >
        <a
          href="/aima-visualizations/"
          style={{
            color: CHAPTER_COLOR,
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
        style={{ padding: '48px 24px 32px', maxWidth: '960px', margin: '0 auto' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${CHAPTER_COLOR}20`,
              color: CHAPTER_COLOR,
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

      {/* Tab navigation */}
      <nav
        role="tablist"
        aria-label="Chapter visualizations"
        style={{
          padding: '0 24px',
          maxWidth: '960px',
          margin: '0 auto',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? CHAPTER_COLOR : 'transparent'}`,
              color: activeTab === tab.id ? CHAPTER_COLOR : '#6B7280',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.title}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      <main style={{ padding: '32px 24px 64px', maxWidth: '960px', margin: '0 auto' }}>
        {TABS.map((tab) => (
          <section
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            style={{ display: activeTab === tab.id ? 'block' : 'none' }}
          >
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#E5E7EB',
              }}
            >
              {tab.title}
            </h2>
            {activeTab === tab.id && tab.component}
          </section>
        ))}
      </main>
    </div>
  );
}
