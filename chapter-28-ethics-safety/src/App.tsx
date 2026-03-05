import { useState, Suspense, lazy } from 'react';
import manifest from '../manifest.json';

const AILimitsViz = lazy(() => import('./components/AILimitsViz'));
const ChineseRoomViz = lazy(() => import('./components/ChineseRoomViz'));
const FairnessMetricsViz = lazy(() => import('./components/FairnessMetricsViz'));
const PrivacyViz = lazy(() => import('./components/PrivacyViz'));
const SafetyViz = lazy(() => import('./components/SafetyViz'));
const EthicsPrinciplesViz = lazy(() => import('./components/EthicsPrinciplesViz'));

const CHAPTER_COLOR = '#EF4444';

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        {title}
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '700px', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

function VizCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111118',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
        {description}
      </p>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading…</div>}>
        {children}
      </Suspense>
    </div>
  );
}

type SectionId = 'intro' | 'limits' | 'thinking' | 'ethics' | 'privacy' | 'fairness' | 'safety';

const sections: Array<{ id: SectionId; label: string; book: string }> = [
  { id: 'intro',    label: 'Overview',         book: '§28'    },
  { id: 'limits',   label: 'Limits of AI',     book: '§28.1'  },
  { id: 'thinking', label: 'Can AI Think?',    book: '§28.2'  },
  { id: 'ethics',   label: 'Ethics & Work',    book: '§28.3'  },
  { id: 'privacy',  label: 'Privacy',          book: '§28.3.2'},
  { id: 'fairness', label: 'Fairness & Bias',  book: '§28.3.3'},
  { id: 'safety',   label: 'AI Safety',        book: '§28.3.7'},
];

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('intro');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base, #0A0A0F)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <a href="/aima-visualizations/" style={{ color: CHAPTER_COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            aria-label="Back to all chapters">← All Chapters</a>
          <nav aria-label="Chapter sections" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
                style={{
                  padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: activeSection === s.id ? `${CHAPTER_COLOR}20` : 'transparent',
                  color: activeSection === s.id ? CHAPTER_COLOR : '#9CA3AF',
                  outline: activeSection === s.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
                }}>
                <span style={{ display: 'block', fontSize: '9px', color: activeSection === s.id ? `${CHAPTER_COLOR}80` : '#6B7280', marginBottom: '1px' }}>{s.book}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
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

      {/* Main content */}
      <main style={{ padding: '0 24px 80px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* ── Overview ── */}
        {activeSection === 'intro' && (
          <div>
            <SectionHeader
              id="intro"
              title="Philosophy, Ethics, and Safety of AI"
              subtitle="Chapter 28 addresses the big questions surrounding AI: its philosophical limits, whether machines can truly think, and the ethical responsibilities that come with building powerful AI systems."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {[
                { section: '§28.1', title: 'The Limits of AI', icon: '🧠', desc: 'Four arguments against AI — from informality, disability, Gödel, and the Turing test. Each has been substantially addressed by modern AI.' },
                { section: '§28.2', title: 'Can Machines Really Think?', icon: '🤔', desc: "Searle's Chinese Room, consciousness, qualia, biological naturalism, and the 'polite convention' that we extend to other minds." },
                { section: '§28.3.1', title: 'Lethal Autonomous Weapons', icon: '🚫', desc: 'The third revolution in warfare. Legal, ethical, and practical arguments for and against autonomous weapons systems.' },
                { section: '§28.3.2', title: 'Surveillance & Privacy', icon: '🔒', desc: 'k-anonymity, differential privacy, federated learning, and the tension between data utility and individual privacy.' },
                { section: '§28.3.3', title: 'Fairness & Bias', icon: '⚖', desc: 'Demographic parity, equal opportunity, calibration — and why you cannot maximise all three at once (Kleinberg et al., 2016).' },
                { section: '§28.3.4', title: 'Trust & Transparency', icon: '🔍', desc: 'Explainable AI, verification & validation, certification, and the Red Flag Law for AI identification.' },
                { section: '§28.3.5', title: 'The Future of Work', icon: '🏭', desc: 'Automation, income inequality, occupational risk, and the policy responses needed to manage technological unemployment.' },
                { section: '§28.3.7', title: 'AI Safety', icon: '🛡', desc: 'Fault tree analysis, unintended side effects, the value alignment problem, low-impact design, and the intelligence explosion.' },
              ].map(item => (
                <div key={item.section} style={{ padding: '16px', background: '#111118', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span style={{ fontSize: '11px', color: CHAPTER_COLOR, fontWeight: 600 }}>{item.section}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>{item.title}</div>
                  <p style={{ color: '#6B7280', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── §28.1: Limits of AI ── */}
        {activeSection === 'limits' && (
          <div>
            <SectionHeader
              id="limits"
              title="§28.1 The Limits of AI"
              subtitle="Four philosophical arguments claim machines can never be truly intelligent. Modern AI has largely refuted each one — but the debates shaped the field."
            />
            <VizCard
              title="Arguments Against AI — Interactive Explorer"
              description="Step through each major argument (from informality, disability, Gödel's incompleteness theorem, and the Turing Test) and reveal the modern rebuttal."
            >
              <AILimitsViz />
            </VizCard>
          </div>
        )}

        {/* ── §28.2: Can AI Think? ── */}
        {activeSection === 'thinking' && (
          <div>
            <SectionHeader
              id="thinking"
              title="§28.2 Can Machines Really Think?"
              subtitle="The Chinese Room argument, consciousness, qualia, and the hard problem of subjective experience. Does understanding require a biological brain?"
            />
            <VizCard
              title="The Chinese Room — Step-by-Step Simulation"
              description="Animate Searle's famous thought experiment. Toggle between Searle's view (no understanding) and the Systems Reply. Then explore four theories of consciousness and their implications for machine minds."
            >
              <ChineseRoomViz />
            </VizCard>
          </div>
        )}

        {/* ── §28.3: Ethics & Work ── */}
        {activeSection === 'ethics' && (
          <div>
            <SectionHeader
              id="ethics"
              title="§28.3 The Ethics of AI"
              subtitle="From Asimov's laws to lethal autonomous weapons, AI has profound ethical implications. Explore the taxonomy of AI ethics principles and the future of work."
            />
            <VizCard
              title="AI Ethics Principles Taxonomy + Future of Work"
              description="Click each principle to see its description, real-world example, and book section. Switch to 'Future of Work' to explore which occupations are at risk from automation."
            >
              <EthicsPrinciplesViz />
            </VizCard>
          </div>
        )}

        {/* ── §28.3.2: Privacy ── */}
        {activeSection === 'privacy' && (
          <div>
            <SectionHeader
              id="privacy"
              title="§28.3.2 Surveillance, Security, and Privacy"
              subtitle="Technical tools for privacy-preserving data sharing: k-anonymity and differential privacy. Adjust generalizations to raise k, or tune ε to control the privacy-utility tradeoff."
            />
            <VizCard
              title="k-Anonymity & Differential Privacy"
              description="Generalise quasi-identifiers to raise the k-anonymity level of a medical dataset. Or switch to Differential Privacy to see how Laplace noise protects individual records while allowing aggregate queries."
            >
              <PrivacyViz />
            </VizCard>
          </div>
        )}

        {/* ── §28.3.3: Fairness ── */}
        {activeSection === 'fairness' && (
          <div>
            <SectionHeader
              id="fairness"
              title="§28.3.3 Fairness and Bias"
              subtitle="Algorithmic fairness is not a single criterion — it is many, and they conflict. Adjust classification thresholds to see the Kleinberg impossibility in action."
            />
            <VizCard
              title="COMPAS-Style Fairness Demo"
              description="Set independent risk thresholds for two demographic groups. Watch as improving demographic parity breaks equal opportunity and vice versa — the core fairness impossibility theorem."
            >
              <FairnessMetricsViz />
            </VizCard>
          </div>
        )}

        {/* ── §28.3.7: Safety ── */}
        {activeSection === 'safety' && (
          <div>
            <SectionHeader
              id="safety"
              title="§28.3.7 AI Safety"
              subtitle="Safety engineering techniques adapted for AI: fault tree analysis for system failure probability, value alignment scoring, and the low-impact safety principle."
            />
            <VizCard
              title="Fault Tree Analysis & Value Alignment"
              description="Build a fault tree for an AI-powered system and compute overall failure probability. Switch to Value Alignment to see how robot utility estimates can diverge from human preferences — and how the low-impact penalty helps."
            >
              <SafetyViz />
            </VizCard>
          </div>
        )}
      </main>
    </div>
  );
}
