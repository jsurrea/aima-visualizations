import manifest from '../manifest.json';
import LocalSearchVisualizer from './components/LocalSearchVisualizer';
import LocalBeamSearchViz from './components/LocalBeamSearchViz';
import GradientDescentViz from './components/GradientDescentViz';
import AndOrSearchViz from './components/AndOrSearchViz';
import BeliefStateViz from './components/BeliefStateViz';
import OnlineSearchViz from './components/OnlineSearchViz';

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#E5E7EB',
  marginBottom: '8px',
  paddingTop: '16px',
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9CA3AF',
  lineHeight: 1.6,
  marginBottom: '0',
  maxWidth: '640px',
};

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Fixed header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--surface-1)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <a
          href="/aima-visualizations/"
          style={{ color: 'var(--chapter-color, #3B82F6)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters"
        >
          ← All Chapters
        </a>
        <span style={{ color: '#374151' }}>|</span>
        <nav aria-label="Section navigation" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { href: '#local-search', label: '§4.1 Local Search' },
            { href: '#beam-search', label: '§4.1 Beam' },
            { href: '#continuous-search', label: '§4.2 Continuous' },
            { href: '#and-or-search', label: '§4.3 AND-OR' },
            { href: '#belief-states', label: '§4.4 Belief States' },
            { href: '#online-search', label: '§4.5 Online' },
          ].map(({ href, label }) => (
            <a key={href} href={href} style={{
              color: '#6B7280', textDecoration: 'none', fontSize: '12px',
              padding: '3px 8px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
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

        {/* §4.1 Local Search & Optimization */}
        <section id="local-search" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.1–4.1.4 — Local Search &amp; Optimization</h2>
          <p style={sectionDescStyle}>
            Local search algorithms operate on a single current state and move to neighboring states.
            Unlike systematic search, they use little memory and can find good solutions in large or
            infinite state spaces where systematic search is infeasible.
          </p>
          <LocalSearchVisualizer />
        </section>

        {/* §4.1.3 Local Beam Search */}
        <section id="beam-search" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.1.3 — Local Beam Search</h2>
          <p style={sectionDescStyle}>
            Instead of one state, beam search tracks <em>k</em> states simultaneously. At each step it
            generates all successors of all k states and retains the best k — unlike parallel restarts,
            information is shared across beams so good regions attract more exploration.
          </p>
          <LocalBeamSearchViz />
        </section>

        {/* §4.2 Continuous Spaces */}
        <section id="continuous-search" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.2 — Local Search in Continuous Spaces</h2>
          <p style={sectionDescStyle}>
            In continuous spaces, the gradient gives the direction of steepest ascent (or descent).
            Gradient descent updates the current position by stepping opposite to the gradient, scaled
            by a learning rate α. The step size critically affects both speed and stability of convergence.
          </p>
          <GradientDescentViz />
        </section>

        {/* §4.3 AND-OR Search */}
        <section id="and-or-search" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.3 — Search with Nondeterministic Actions</h2>
          <p style={sectionDescStyle}>
            When actions have unpredictable outcomes, the agent must plan for every possible result.
            AND-OR trees capture this: OR nodes represent agent choices, AND nodes require solutions
            for every outcome branch. The erratic vacuum world is a classic example.
          </p>
          <AndOrSearchViz />
        </section>

        {/* §4.4 Belief States */}
        <section id="belief-states" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.4 — Partially Observable Environments</h2>
          <p style={sectionDescStyle}>
            A sensorless (conformant) agent has no observations at all and must act correctly from
            any possible initial state. It maintains a belief state — the set of all states it might
            be in — and searches for a plan that reaches the goal from every state in that set.
          </p>
          <BeliefStateViz />
        </section>

        {/* §4.5 Online Search */}
        <section id="online-search" style={{ marginBottom: '48px' }}>
          <h2 style={sectionHeadingStyle}>§4.5 — Online Search &amp; Unknown Environments</h2>
          <p style={sectionDescStyle}>
            Online search agents interleave planning and execution in an unknown environment,
            discovering the map as they go. Online DFS backtracks when stuck; LRTA* learns and
            updates heuristic values to guide future exploration more efficiently.
          </p>
          <OnlineSearchViz />
        </section>

      </main>
    </div>
  );
}
