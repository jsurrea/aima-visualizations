import { useState } from 'react';
import manifest from '../manifest.json';
import Placeholder from './components/Placeholder';

const CHAPTER_COLOR = '#64748B';

type SectionId = 'intro' | 'complexity' | 'linear-algebra' | 'probability';

const sections: Array<{ id: SectionId; label: string; book: string }> = [
  { id: 'intro',          label: 'Overview',       book: '§A'   },
  { id: 'complexity',     label: 'Complexity',     book: '§A.1' },
  { id: 'linear-algebra', label: 'Linear Algebra', book: '§A.2' },
  { id: 'probability',    label: 'Probability',    book: '§A.3' },
];

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
          <nav aria-label="Appendix sections" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

      {/* Appendix hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '22px',
          }}>
            {manifest.icon}
          </span>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Appendix A</span>
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
              title="Mathematical Background"
              subtitle="Appendix A provides the mathematical toolkit used throughout AIMA: Big-O complexity, linear algebra, and probability theory."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {[
                { section: '§A.1', title: 'Complexity & Big-O', icon: '📈', desc: 'Growth rates, Big-O notation, and algorithm complexity classes from O(1) to O(n!).' },
                { section: '§A.2', title: 'Linear Algebra',     icon: '🔢', desc: 'Vectors, matrices, dot products, matrix multiplication, transposition, and eigenvalues.' },
                { section: '§A.3', title: 'Probability',        icon: '🎲', desc: 'Gaussian, Uniform, Bernoulli, Binomial, Poisson, Exponential, and Beta distributions.' },
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

        {/* ── §A.1: Complexity ── */}
        {activeSection === 'complexity' && (
          <div>
            <SectionHeader
              id="complexity"
              title="§A.1 Complexity Analysis and O() Notation"
              subtitle="Big-O notation characterizes how the running time or space requirements of an algorithm scale with input size n."
            />
            <Placeholder
              id="complexity-viz"
              title="Growth Rate Comparison"
              status="complete"
              chapterColor={CHAPTER_COLOR}
            />
          </div>
        )}

        {/* ── §A.2: Linear Algebra ── */}
        {activeSection === 'linear-algebra' && (
          <div>
            <SectionHeader
              id="linear-algebra"
              title="§A.2 Vectors, Matrices, and Linear Algebra"
              subtitle="The language of machine learning and probabilistic reasoning: vector spaces, matrix operations, and eigendecomposition."
            />
            <Placeholder
              id="linear-algebra-viz"
              title="2D Linear Transformation Explorer"
              status="complete"
              chapterColor={CHAPTER_COLOR}
            />
          </div>
        )}

        {/* ── §A.3: Probability ── */}
        {activeSection === 'probability' && (
          <div>
            <SectionHeader
              id="probability"
              title="§A.3 Probability Distributions"
              subtitle="Standard distributions used in probabilistic reasoning, Bayesian networks, and machine learning."
            />
            <Placeholder
              id="probability-viz"
              title="Distribution Explorer"
              status="complete"
              chapterColor={CHAPTER_COLOR}
            />
          </div>
        )}
      </main>
    </div>
  );
}
