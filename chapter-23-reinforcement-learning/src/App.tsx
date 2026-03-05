import React from 'react';
import manifest from '../manifest.json';
import GridWorldViz from './components/GridWorldViz';
import TDLearningViz from './components/TDLearningViz';
import QLearningViz from './components/QLearningViz';
import FunctionApproxViz from './components/FunctionApproxViz';
import PolicyGradientViz from './components/PolicyGradientViz';
import InverseRLViz from './components/InverseRLViz';

const NAV_LINKS = [
  { id: 'passive-rl',       label: 'Passive RL' },
  { id: 'td-learning',      label: 'TD Learning' },
  { id: 'q-learning',       label: 'Q-Learning' },
  { id: 'function-approx',  label: 'Func. Approx' },
  { id: 'policy-gradient',  label: 'Policy Gradient' },
  { id: 'inverse-rl',       label: 'Inverse RL' },
] as const;

const SECTIONS = [
  {
    id: 'passive-rl',
    title: '§23.2–23.3 Active & Passive RL — Grid World',
    component: <GridWorldViz />,
  },
  {
    id: 'td-learning',
    title: '§23.2.3 Passive TD(0) — Utility Convergence',
    component: <TDLearningViz />,
  },
  {
    id: 'q-learning',
    title: '§23.3.3 Q-Learning — Q-Table Heat Map',
    component: <QLearningViz />,
  },
  {
    id: 'function-approx',
    title: '§23.4 Linear Function Approximation',
    component: <FunctionApproxViz />,
  },
  {
    id: 'policy-gradient',
    title: '§23.5 Policy Gradient — Softmax Policy & REINFORCE',
    component: <PolicyGradientViz />,
  },
  {
    id: 'inverse-rl',
    title: '§23.6 Inverse Reinforcement Learning',
    component: <InverseRLViz />,
  },
] as const;

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <a href="/aima-visualizations/" style={{ color: manifest.color, textDecoration: 'none', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }} aria-label="Back to all chapters">
            ← Back
          </a>
          <nav aria-label="Section navigation" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {NAV_LINKS.map(link => (
              <a key={link.id} href={`#${link.id}`}
                 style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '13px', whiteSpace: 'nowrap', padding: '4px 8px', borderRadius: '4px' }}>
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
            <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg, 20px)', border: '1px solid var(--surface-border)', padding: '24px' }}>
              {section.component}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

