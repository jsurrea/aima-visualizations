import manifest from '../manifest.json';
import { BayesianLearningVisualizer } from './components/BayesianLearningVisualizer';
import { MLEVisualizer } from './components/MLEVisualizer';
import { BetaPriorVisualizer } from './components/BetaPriorVisualizer';
import { EMVisualizer } from './components/EMVisualizer';

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  'mle': MLEVisualizer,
  'bayesian-learning': BetaPriorVisualizer,
  'em-algorithm': EMVisualizer,
};

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base, #0A0A0F)',
        color: 'white',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        // Chapter color CSS var for back-link
        ['--chapter-color' as string]: manifest.color,
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
            color: 'var(--chapter-color)',
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
              background: `${manifest.color}20`,
              color: manifest.color,
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
            maxWidth: '700px',
          }}
        >
          Interactive visualizations for <strong style={{ color: 'white' }}>Bayesian learning</strong>,{' '}
          <strong style={{ color: 'white' }}>Maximum Likelihood Estimation</strong>, the{' '}
          <strong style={{ color: 'white' }}>Beta conjugate prior</strong>, and the{' '}
          <strong style={{ color: 'white' }}>EM algorithm</strong> for mixture models. All algorithms
          include step-by-step playback with state inspection panels.
        </p>
      </section>

      {/* Intro: §21.1 Bayesian Learning */}
      <section
        id="statistical-learning"
        style={{ padding: '0 24px 48px', maxWidth: '960px', margin: '0 auto' }}
      >
        <SectionHeader
          number="21.1"
          title="Statistical Learning"
          color={manifest.color}
        />
        <BayesianLearningVisualizer />
      </section>

      {/* §21.2 Learning with Complete Data — MLE */}
      <section
        id="mle"
        style={{
          padding: '0 24px 48px',
          maxWidth: '960px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '48px',
        }}
      >
        <SectionHeader
          number="21.2"
          title="Learning with Complete Data"
          color={manifest.color}
        />
        <MLEVisualizer />
      </section>

      {/* §21.2.5 Bayesian Parameter Learning */}
      <section
        id="bayesian-learning"
        style={{
          padding: '48px 24px 48px',
          maxWidth: '960px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <SectionHeader
          number="21.2.5"
          title="Bayesian Parameter Learning"
          color={manifest.color}
        />
        <BetaPriorVisualizer />
      </section>

      {/* §21.3 EM Algorithm */}
      <section
        id="em-algorithm"
        style={{
          padding: '48px 24px 64px',
          maxWidth: '960px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <SectionHeader
          number="21.3"
          title="Learning with Hidden Variables: The EM Algorithm"
          color={manifest.color}
        />
        <EMVisualizer />
      </section>
    </div>
  );
}

function SectionHeader({
  number,
  title,
  color,
}: {
  number: string;
  title: string;
  color: string;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 600,
          color: color,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          borderRadius: '999px',
          padding: '3px 10px',
          marginBottom: '8px',
        }}
      >
        §{number}
      </div>
      <h2
        style={{
          fontSize: 'clamp(20px, 4vw, 28px)',
          fontWeight: 700,
          color: 'white',
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

