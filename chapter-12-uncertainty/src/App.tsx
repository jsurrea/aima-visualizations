import manifest from '../manifest.json';
import ProbabilityAxiomExplorer from './components/ProbabilityAxiomExplorer';
import JointDistributionViz from './components/JointDistributionViz';
import IndependenceExplorer from './components/IndependenceExplorer';
import BayesRuleDemo from './components/BayesRuleDemo';
import NaiveBayesDemo from './components/NaiveBayesDemo';
import WumpusWorldViz from './components/WumpusWorldViz';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '16px 24px' }}>
        <a
          href="/aima-visualizations/"
          style={{ color: manifest.color, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      {/* Chapter hero */}
      <section aria-label="Chapter overview" style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
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
        <section id="probability-axioms" role="region" aria-label="§12.1–12.2 Probability Axiom Explorer" style={{ marginBottom: '48px' }}>
          <ProbabilityAxiomExplorer />
        </section>

        <section id="joint-distribution" role="region" aria-label="§12.3 Full Joint Distribution" style={{ marginBottom: '48px' }}>
          <JointDistributionViz />
        </section>

        <section id="independence" role="region" aria-label="§12.4 Independence Explorer" style={{ marginBottom: '48px' }}>
          <IndependenceExplorer />
        </section>

        <section id="bayes-rule" role="region" aria-label="§12.5 Bayes' Rule Demo" style={{ marginBottom: '48px' }}>
          <BayesRuleDemo />
        </section>

        <section id="naive-bayes" role="region" aria-label="§12.6 Naive Bayes Classifier" style={{ marginBottom: '48px' }}>
          <NaiveBayesDemo />
        </section>

        <section id="wumpus-world" role="region" aria-label="§12.7 Wumpus World Uncertainty" style={{ marginBottom: '48px' }}>
          <WumpusWorldViz />
        </section>
      </main>
    </div>
  );
}
