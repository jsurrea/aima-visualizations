import { useState, Suspense, lazy } from 'react';
import manifest from '../manifest.json';

const AIComponentsExplorer = lazy(() => import('./components/AIComponentsExplorer'));
const AnytimeAlgorithmViz = lazy(() => import('./components/AnytimeAlgorithmViz'));
const ArchitectureSpectrumViz = lazy(() => import('./components/ArchitectureSpectrumViz'));
const BoundedOptimalityViz = lazy(() => import('./components/BoundedOptimalityViz'));

const CHAPTER_COLOR = manifest.color; // #EF4444

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} style={{ marginBottom: '24px' }}>
      <h2
        style={{
          fontSize: 'clamp(20px, 4vw, 28px)',
          fontWeight: 700,
          color: 'white',
          marginBottom: '8px',
        }}
      >
        {title}
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '700px', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

function VizCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
        {description}
      </p>
      <Suspense
        fallback={
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading visualization…</div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}

type SectionId = 'ai-components' | 'ai-architectures';

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('ai-components');

  const sections: Array<{ id: SectionId; label: string; book: string }> = [
    { id: 'ai-components', label: '§29.1 AI Components', book: 'p.1063' },
    { id: 'ai-architectures', label: '§29.2 AI Architectures', book: 'p.1069' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base, #0A0A0F)',
        color: 'white',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--surface-1, #111118)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <a
            href="/aima-visualizations/"
            style={{ color: CHAPTER_COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            aria-label="Back to all chapters"
          >
            ← All Chapters
          </a>
          <nav aria-label="Chapter sections" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: activeSection === s.id ? `${CHAPTER_COLOR}20` : 'transparent',
                  border: `1px solid ${activeSection === s.id ? CHAPTER_COLOR : 'rgba(255,255,255,0.12)'}`,
                  color: activeSection === s.id ? CHAPTER_COLOR : '#9CA3AF',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
                <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.6 }}>{s.book}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Chapter hero */}
      <section
        style={{ padding: '48px 24px 32px', maxWidth: '1000px', margin: '0 auto' }}
        aria-label="Chapter introduction"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
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
            color: 'white',
          }}
        >
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '16px', lineHeight: 1.7, maxWidth: '680px', margin: 0 }}>
          Chapter 29 asks: where is AI headed and what remains to be done? It examines whether we have
          the right <strong style={{ color: '#E5E7EB' }}>components</strong>,{' '}
          <strong style={{ color: '#E5E7EB' }}>architectures</strong>, and{' '}
          <strong style={{ color: '#E5E7EB' }}>goals</strong> to make AI a successful technology that
          delivers genuine benefits. Most experts expect approximately human-level AI in 50–100 years,
          but many hard problems remain.
        </p>
      </section>

      {/* Main content */}
      <main style={{ padding: '0 24px 64px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* ── §29.1: AI Components ─────────────────────────────────────── */}
        {activeSection === 'ai-components' && (
          <section aria-label="AI Components section">
            <SectionHeader
              id="ai-components"
              title="§29.1 — AI Components"
              subtitle={
                'Five subsystems make up every AI agent: sensors, state representation, action selection, ' +
                'preference specification, and learning. Progress on each has been uneven — some near ' +
                'deployment-ready (TRL 7+), others still at research stage (TRL 3). ' +
                'The weakest component limits the whole system.'
              }
            />

            <VizCard
              title="Technology Readiness Explorer"
              description={
                'Each of §29.1\'s five components is scored on NASA\'s Technology Readiness Level (TRL) ' +
                'scale (1 = idea, 9 = operational). Drag the year slider to project how each component ' +
                'might mature, and click a component to see a deep-dive on its bottleneck. ' +
                'System TRL uses the harmonic mean — one weak link limits the whole chain.'
              }
            >
              <AIComponentsExplorer />
            </VizCard>

            {/* Concept explainer */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {COMPONENT_EXPLAINERS.map(({ icon, title, body }) => (
                <div
                  key={title}
                  style={{
                    background: '#1A1A24',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'white' }}>{title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>

            {/* Key insight callout */}
            <div
              style={{
                background: `${CHAPTER_COLOR}10`,
                border: `1px solid ${CHAPTER_COLOR}30`,
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
            >
              <h4 style={{ margin: '0 0 8px', color: CHAPTER_COLOR, fontSize: '14px' }}>
                🔑 Key Insight: The Preference Gap
              </h4>
              <p style={{ margin: 0, color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6 }}>
                Of the five components, <strong>preference specification</strong> is the most lagging
                (TRL ≈ 3). We are remarkably good at building agents that optimise — but remarkably
                bad at telling them <em>what</em> to optimise. Inverse reinforcement learning and
                human-feedback methods are promising, but remain fragile for complex, multi-stakeholder
                objectives. As the book notes, even recommender systems that maximise "engagement"
                may optimise for addictive content rather than genuine user wellbeing.
              </p>
            </div>
          </section>
        )}

        {/* ── §29.2: AI Architectures ───────────────────────────────────── */}
        {activeSection === 'ai-architectures' && (
          <section aria-label="AI Architectures section">
            <SectionHeader
              id="ai-architectures"
              title="§29.2 — AI Architectures"
              subtitle={
                'No single architecture fits all situations. §29.2 argues agents need all of them: ' +
                'reflex for real-time demands, planning for deliberation, learning for adaptability. ' +
                'Two key ideas unify these: anytime algorithms (any budget → a good answer) and ' +
                'bounded optimality (the best program a given architecture can support).'
              }
            />

            <VizCard
              title="Architecture Selection Guide"
              description={
                'Adjust the four task-characteristic sliders (or pick a preset scenario) and watch how ' +
                'the suitability scores for each of the five Chapter 2 agent architectures change in real time. ' +
                'This embodies §29.2\'s core message: the right architecture depends entirely on task demands.'
              }
            >
              <ArchitectureSpectrumViz />
            </VizCard>

            <VizCard
              title="Anytime Algorithm Quality vs. Time"
              description={
                'An anytime algorithm always has a valid answer ready, but it gets better the longer it runs. ' +
                'Examples include iterative-deepening A*, MCMC for Bayesian networks, and simulated annealing. ' +
                'The red dashed line shows the cut-off — when the agent must stop deliberating and act. ' +
                'Try different growth shapes and cut-offs to see the quality–time trade-off.'
              }
            >
              <AnytimeAlgorithmViz />
            </VizCard>

            <VizCard
              title="Bounded Optimality Explorer"
              description={
                'Bounded optimality (Russell & Subramanian, 1995) asks: given a fixed architecture and a ' +
                'compute budget, which agent program performs best? This is more realistic than perfect ' +
                'rationality because perfect rationality is computationally impossible for most real tasks. ' +
                'Drag the budget slider to find the bounded-optimal program. Green dots are Pareto-optimal.'
              }
            >
              <BoundedOptimalityViz />
            </VizCard>

            {/* Deep concepts panel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {ARCH_CONCEPTS.map(({ title, body, accent }) => (
                <div
                  key={title}
                  style={{
                    background: '#1A1A24',
                    border: `1px solid ${accent}30`,
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: accent }}>{title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>

            {/* Turing quote */}
            <div
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(14px, 2.5vw, 18px)',
                  color: '#E5E7EB',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}
              >
                "We can see only a short distance ahead,
                <br />
                but we can see that much remains to be done."
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                — Alan Turing, <em>Computing Machinery and Intelligence</em> (1950)
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const COMPONENT_EXPLAINERS = [
  {
    icon: '📡',
    title: 'Sensors & Actuators',
    body:
      'AI is finally gaining physical grounding. LIDAR costs fell 75×; MEMS actuators fit in flying insects. ' +
      'The state of robotics today is roughly comparable to personal computers in the early 1980s — ' +
      'available, but not yet ubiquitous.',
  },
  {
    icon: '🧠',
    title: 'State Representation',
    body:
      'Agents need atomic → factored → structured representations of the world. ' +
      'Each level adds expressiveness (objects, relations, uncertainty over time) but also computational cost. ' +
      'No unified scheme yet exists that handles all levels efficiently.',
  },
  {
    icon: '🎯',
    title: 'Action Selection',
    body:
      'Real long-term plans involve billions of primitive steps — far beyond flat search. ' +
      'Hierarchical reinforcement learning can manage this in fully observable settings, ' +
      'but extending it to POMDPs (partial observability) remains an open challenge.',
  },
  {
    icon: '❤️',
    title: 'Preference Specification',
    body:
      'The hardest component. Maximising engagement ≠ maximising wellbeing. ' +
      'Inverse RL and RLHF are promising, but complex multi-stakeholder preferences — ' +
      'including fairness, equity, and long-term human flourishing — resist simple reward functions.',
  },
  {
    icon: '📚',
    title: 'Learning',
    body:
      'Deep learning achieves superhuman performance on narrow tasks given sufficient data. ' +
      'Transfer learning and few-shot generalisation are the frontiers: learning from a handful of examples ' +
      'by drawing on prior structure, just as humans do.',
  },
];

const ARCH_CONCEPTS = [
  {
    title: '⏱ Real-Time AI',
    accent: '#F59E0B',
    body:
      'All non-trivial problems are ultimately real-time: the agent can never solve exactly ' +
      'before it must act. Anytime algorithms ensure a valid answer is always ready, and improve ' +
      'with time budget. Iterative-deepening game search and MCMC are canonical examples.',
  },
  {
    title: '🔄 Decision-Theoretic Metareasoning',
    accent: '#8B5CF6',
    body:
      'Which computation should the agent perform next? Metareasoning applies the value of information ' +
      '(Ch. 15) to individual computations: a computation is worth running if its expected improvement ' +
      'in decision quality exceeds its cost in delay.',
  },
  {
    title: '🔒 Bounded Optimality',
    accent: '#10B981',
    body:
      'Perfect rationality is physically impossible for most real tasks. Bounded optimality asks for ' +
      'the best program that a given architecture can implement — a goal that provably exists ' +
      'and is more achievable than perfect rationality.',
  },
  {
    title: '🌐 General AI',
    accent: '#3B82F6',
    body:
      'Progress has been guided by narrow benchmarks (ImageNet, Go, Jeopardy). ' +
      'General AI requires a single system that can adapt to a wide variety of tasks, ' +
      'drawing on prior knowledge and learning new skills with minimal examples.',
  },
];
