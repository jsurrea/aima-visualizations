import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import manifest from '../manifest.json';
import { DecisionTreeVisualizer } from './components/DecisionTreeVisualizer';
import { BiasVarianceDemo } from './components/BiasVarianceDemo';
import { LinearRegressionVisualizer } from './components/LinearRegressionVisualizer';
import { KNNVisualizer } from './components/KNNVisualizer';
import { EnsembleVisualizer } from './components/EnsembleVisualizer';
import { renderDisplayMath } from './utils/mathUtils';

// ─── Section IDs ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'forms-of-learning',    label: '19.1 Forms of Learning' },
  { id: 'supervised-learning',  label: '19.2 Supervised Learning' },
  { id: 'decision-tree',        label: '19.3 Decision Trees' },
  { id: 'model-selection',      label: '19.4 Model Selection' },
  { id: 'theory-of-learning',   label: '19.5 Theory of Learning' },
  { id: 'linear-regression',    label: '19.6 Linear Regression' },
  { id: 'knn',                  label: '19.7 k-NN' },
  { id: 'ensemble',             label: '19.8 Ensemble' },
  { id: 'ml-systems',           label: '19.9 ML Systems' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// ─── Styling helpers ──────────────────────────────────────────────────────────

const CC = manifest.color; // #10B981

const surface: CSSProperties = {
  background: 'var(--surface-2, #1A1A24)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '24px',
};

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700,
      margin: '0 0 12px', color: '#E5E7EB' }}>
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '16px', maxWidth: '700px' }}>
      {children}
    </p>
  );
}

// ─── Static section components ────────────────────────────────────────────────

function FormsOfLearning() {
  const forms = [
    { name: 'Supervised', desc: 'Learn from labeled (input, output) pairs. Goal: predict output for new inputs.', icon: '🎯', color: '#6366F1' },
    { name: 'Unsupervised', desc: 'Find structure in unlabeled data — clustering, dimensionality reduction.', icon: '🔮', color: '#8B5CF6' },
    { name: 'Reinforcement', desc: 'Learn from rewards/penalties while interacting with an environment.', icon: '🎮', color: CC },
    { name: 'Semi-supervised', desc: 'Combine a small labeled set with a large unlabeled set.', icon: '🔬', color: '#F59E0B' },
    { name: 'Online', desc: 'Update the model incrementally as each new example arrives.', icon: '📡', color: '#EC4899' },
  ];
  return (
    <div>
      <SectionTitle>19.1 Forms of Learning</SectionTitle>
      <Prose>
        Learning is the process of improving performance with experience. AIMA Chapter 19 focuses
        on <em>supervised learning</em> — learning from labeled examples — but the broader taxonomy
        covers many paradigms.
      </Prose>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {forms.map(f => (
          <div key={f.name} style={{ ...surface, padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: f.color, marginBottom: '4px' }}>
              {f.name}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '24px', ...surface }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px' }}>
          The Supervised Learning Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          fontSize: '13px', color: '#9CA3AF' }}>
          {['Training Data', '→', 'Feature Extraction', '→', 'Learning Algorithm', '→', 'Hypothesis h', '→', 'Prediction'].map((s, i) => (
            <span key={i} style={{
              background: s === '→' ? 'transparent' : `${CC}15`,
              color: s === '→' ? '#4B5563' : '#E5E7EB',
              padding: s === '→' ? '0' : '6px 12px',
              borderRadius: '6px', fontSize: s === '→' ? '18px' : '12px',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelSelectionSection() {
  return (
    <div>
      <SectionTitle>19.4 Model Selection & Overfitting</SectionTitle>
      <Prose>
        Model selection is the task of choosing the right hypothesis space — complex enough to
        capture the true pattern, but not so complex it memorizes the training noise.
      </Prose>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {[
          { title: 'Underfitting (High Bias)', color: '#EF4444', desc: 'Model too simple to capture the true pattern. High training and test error.' },
          { title: 'Overfitting (High Variance)', color: '#F59E0B', desc: 'Model memorizes noise. Low training error but high test error.' },
        ].map(c => (
          <div key={c.title} style={{ ...surface, borderColor: `${c.color}40` }}>
            <div style={{ color: c.color, fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
              {c.title}
            </div>
            <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0 }}>{c.desc}</p>
          </div>
        ))}
      </div>
      <Prose>
        See the <strong>Bias–Variance Demo</strong> in Section 19.2 above. Use cross-validation
        to pick the regularization strength or polynomial degree that minimizes held-out error.
      </Prose>
      <div style={{ ...surface }}>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          k-Fold Cross-Validation error estimate:
        </div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
          '\\text{CV}_k = \\frac{1}{k}\\sum_{i=1}^{k} L(h_i, D_i^{\\text{val}})',
        ) }} />
      </div>
    </div>
  );
}

function TheoryOfLearning() {
  return (
    <div>
      <SectionTitle>19.5 Theory of Learning (PAC)</SectionTitle>
      <Prose>
        Probably Approximately Correct (PAC) learning asks: how many examples do we need to be
        confident our hypothesis is close to correct?
      </Prose>
      <div style={{ ...surface, marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          Sample complexity bound (finite hypothesis space |H|):
        </div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
          'm \\geq \\frac{1}{\\varepsilon}\\left(\\ln|H| + \\ln\\frac{1}{\\delta}\\right)',
        ) }} />
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
          With probability ≥ 1−δ, any consistent hypothesis has error ≤ ε.
        </div>
      </div>
      <div style={{ ...surface, marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
          VC dimension bound (infinite hypothesis space):
        </div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(
          'm \\geq \\frac{1}{\\varepsilon}\\left(4 \\log_2 \\frac{2}{\\delta} + 8 \\cdot \\text{VC}(H) \\cdot \\log_2 \\frac{13}{\\varepsilon}\\right)',
        ) }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { sym: 'ε', name: 'error tolerance', desc: 'Maximum allowable error' },
          { sym: 'δ', name: 'failure probability', desc: 'Probability our bound fails' },
          { sym: '|H|', name: 'hypothesis space size', desc: 'Number of distinct hypotheses' },
          { sym: 'VC(H)', name: 'VC dimension', desc: 'Largest set H can shatter' },
        ].map(t => (
          <div key={t.sym} style={{ ...surface, padding: '14px' }}>
            <div style={{ color: CC, fontFamily: 'serif', fontSize: '18px', marginBottom: '4px' }}>
              {t.sym}
            </div>
            <div style={{ fontSize: '12px', color: '#E5E7EB', marginBottom: '2px' }}>{t.name}</div>
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MLSystemsSection() {
  const checklist = [
    { step: 'Understand the problem', detail: 'What metric matters? What data is available? Supervised vs. unsupervised?' },
    { step: 'Collect & clean data', detail: 'Handle missing values, outliers, and class imbalance. Split into train/val/test.' },
    { step: 'Feature engineering', detail: 'Normalize inputs. Create informative features. Reduce dimensionality if needed.' },
    { step: 'Establish a baseline', detail: 'Start with a simple model (majority class, linear model). Quantify the baseline.' },
    { step: 'Model selection', detail: 'Try several hypothesis classes. Use cross-validation to compare. Regularize.' },
    { step: 'Error analysis', detail: 'Inspect misclassified examples. Is error from bias (too simple) or variance (too complex)?' },
    { step: 'Iterate & deploy', detail: 'Re-collect targeted data, tune hyperparameters, monitor for distribution shift.' },
  ];
  return (
    <div>
      <SectionTitle>19.9 Developing ML Systems</SectionTitle>
      <Prose>
        Good ML engineering is as important as knowing the algorithms. Here is a practical
        checklist from AIMA Section 19.9.
      </Prose>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {checklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '14px', ...surface, padding: '14px 18px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%',
              background: `${CC}30`, color: CC, fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>
                {item.step}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('forms-of-learning');
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject chapter color CSS variable
    document.documentElement.style.setProperty('--chapter-color', CC);
  }, []);

  function switchSection(id: SectionId) {
    setActiveSection(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const tabBtn = (id: SectionId): CSSProperties => ({
    padding: '8px 14px', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
    background: activeSection === id ? `${CC}20` : 'transparent',
    color: activeSection === id ? CC : '#9CA3AF',
    fontWeight: activeSection === id ? 700 : 400,
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base, #0A0A0F)',
      color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px', flexShrink: 0 }}>
        <a href="/aima-visualizations/"
          style={{ color: CC, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters">
          ← Back to All Chapters
        </a>
      </header>

      {/* Hero */}
      <section style={{ padding: '40px 24px 24px', maxWidth: '960px', margin: '0 auto',
        width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${CC}20`, color: CC, fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700,
          marginBottom: '12px', margin: '0 0 12px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6,
          maxWidth: '640px', margin: 0 }}>
          {manifest.description}
        </p>
      </section>

      {/* Sticky tab nav */}
      <nav aria-label="Chapter sections"
        style={{ position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--surface-1, #111118)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '4px', padding: '8px 24px',
          maxWidth: '960px', margin: '0 auto' }}>
          {SECTIONS.map(s => (
            <button key={s.id}
              aria-pressed={activeSection === s.id}
              onClick={() => switchSection(s.id)}
              style={tabBtn(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px 64px',
          boxSizing: 'border-box' }}>
          {activeSection === 'forms-of-learning'   && <FormsOfLearning />}
          {activeSection === 'supervised-learning' && (
            <div>
              <SectionTitle>19.2 Supervised Learning & Bias–Variance Tradeoff</SectionTitle>
              <Prose>
                In supervised learning we have a training set of (input, output) pairs and
                we want to learn a hypothesis that generalizes. The bias–variance tradeoff
                describes the tension between underfitting and overfitting.
              </Prose>
              <BiasVarianceDemo />
            </div>
          )}
          {activeSection === 'decision-tree' && (
            <div>
              <SectionTitle>19.3 Learning Decision Trees (ID3)</SectionTitle>
              <Prose>
                The ID3 algorithm grows a decision tree by repeatedly splitting on the attribute
                with the highest information gain. The interactive below shows each step on the
                classic restaurant dataset from the book.
              </Prose>
              <DecisionTreeVisualizer />
            </div>
          )}
          {activeSection === 'model-selection'   && <ModelSelectionSection />}
          {activeSection === 'theory-of-learning' && <TheoryOfLearning />}
          {activeSection === 'linear-regression' && (
            <div>
              <SectionTitle>19.6 Linear Regression & Gradient Descent</SectionTitle>
              <Prose>
                Batch gradient descent minimizes the mean-squared error by iteratively moving
                the weights in the direction of steepest descent.
              </Prose>
              <LinearRegressionVisualizer />
            </div>
          )}
          {activeSection === 'knn' && (
            <div>
              <SectionTitle>19.7 k-Nearest Neighbors</SectionTitle>
              <Prose>
                A nonparametric method that classifies a query point by the plurality vote of
                its k nearest training examples. The decision boundary is computed by grid sampling.
              </Prose>
              <KNNVisualizer />
            </div>
          )}
          {activeSection === 'ensemble' && (
            <div>
              <SectionTitle>19.8 Ensemble Learning — AdaBoost</SectionTitle>
              <Prose>
                AdaBoost combines weak learners (decision stumps) by re-weighting misclassified
                examples after each round. Point size reflects the current sample weight.
              </Prose>
              <EnsembleVisualizer />
            </div>
          )}
          {activeSection === 'ml-systems' && <MLSystemsSection />}
        </div>
      </main>
    </div>
  );
}

