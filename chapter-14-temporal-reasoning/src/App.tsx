import manifest from '../manifest.json';
import TemporalModelVisualizer from './components/TemporalModelVisualizer';
import HMMVisualizer from './components/HMMVisualizer';
import KalmanFilterVisualizer from './components/KalmanFilterVisualizer';
import ParticleFilterVisualizer from './components/ParticleFilterVisualizer';

const COLOR = manifest.color;

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div
      id={id}
      style={{
        padding: '32px 0 16px',
        borderBottom: `1px solid ${COLOR}30`,
        marginBottom: '24px',
      }}
    >
      <h2
        style={{
          fontSize: 'clamp(20px, 4vw, 28px)',
          fontWeight: 700,
          color: COLOR,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base, #0A0A0F)',
        color: 'white',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        ['--chapter-color' as string]: COLOR,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--surface-1, #111118)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
        }}
      >
        <a
          href="/aima-visualizations/"
          style={{
            color: COLOR,
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
      <section style={{ padding: '48px 24px 32px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${COLOR}20`,
              color: COLOR,
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
            maxWidth: '680px',
          }}
        >
          {manifest.description}
        </p>
      </section>

      {/* Visualizations */}
      <main style={{ padding: '0 24px 64px', maxWidth: '960px', margin: '0 auto' }}>
        <SectionHeader id="temporal-model" title="§14.1–14.2 Time & Inference in Temporal Models" />
        <TemporalModelVisualizer />

        <SectionHeader id="hmm" title="§14.3 Hidden Markov Models" />
        <HMMVisualizer />

        <SectionHeader id="kalman-filter" title="§14.4 Kalman Filters" />
        <KalmanFilterVisualizer />

        <SectionHeader id="particle-filter" title="§14.5 Particle Filter & Dynamic Bayesian Networks" />
        <ParticleFilterVisualizer />
      </main>
    </div>
  );
}
