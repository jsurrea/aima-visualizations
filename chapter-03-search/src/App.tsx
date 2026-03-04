import manifest from '../manifest.json';
import { SearchVisualizer } from './components/SearchVisualizer';
import { ProblemFormulation } from './components/ProblemFormulation';
import { EightPuzzle } from './components/EightPuzzle';
import { SearchTreeViz } from './components/SearchTreeViz';
import { AlgorithmComparison } from './components/AlgorithmComparison';
import { HeuristicLab } from './components/HeuristicLab';
import { renderInlineMath, renderDisplayMath } from './utils/mathUtils';

// ─── Layout helpers ───────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'clamp(18px, 4vw, 26px)',
  fontWeight: 700,
  marginBottom: '8px',
  color: '#E5E7EB',
};

const subsectionStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '4px',
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9CA3AF',
  lineHeight: 1.7,
  maxWidth: '720px',
};

const cardStyle: React.CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
  overflow: 'hidden',
  background: 'var(--surface-1, #111118)',
  marginTop: '20px',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '14px 22px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sectionWrapStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '48px 24px 0',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)',
  margin: '56px auto 0',
  maxWidth: '1200px',
};

// ─── Section badge ────────────────────────────────────────────────────────────

function SectionBadge({ num, sub }: { num: string; sub: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', borderRadius: '8px',
        background: '#3B82F620', color: '#3B82F6', fontWeight: 700, fontSize: '14px',
        flexShrink: 0,
      }}>
        §{num}
      </span>
      <span style={subsectionStyle}>{sub}</span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-base, #0A0A0F)',
      color: 'white',
      fontFamily: "'Inter Variable', system-ui, sans-serif",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 24px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a
            href="/aima-visualizations/"
            style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}
            aria-label="Back to all chapters"
          >
            ← All Chapters
          </a>
          <span style={{ color: '#374151' }}>|</span>
          <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>
            Chapter {String(manifest.chapter).padStart(2, '0')} — {manifest.shortTitle}
          </span>
          {/* Section nav */}
          <nav aria-label="Section navigation" style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['3.1','3.2','3.3','3.4','3.5','3.6'].map((s, i) => (
              <a
                key={s}
                href={`#section-${i + 1}`}
                style={{
                  fontSize: '12px', fontWeight: 600, color: '#6B7280',
                  textDecoration: 'none', padding: '4px 8px', borderRadius: '6px',
                  transition: 'color 0.15s',
                }}
                aria-label={`Jump to section ${s}`}
              >
                §{s}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#3B82F620', color: '#3B82F6', fontWeight: 700, fontSize: '20px',
          }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '40px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 42px)', fontWeight: 800, marginBottom: '10px', lineHeight: 1.2 }}>
          {manifest.title}
        </h1>
        <p style={{ ...bodyTextStyle, fontSize: '16px' }}>
          An interactive suite covering all six sections of Chapter 3 — from problem formulation
          to heuristic search. Step through algorithms, explore state spaces, and build intuition
          for BFS, DFS, UCS, A*, Greedy Best-First, and IDDFS.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          §3.1  Problem-Solving Agents
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-1" style={sectionWrapStyle} aria-labelledby="s31-heading">
        <SectionBadge num="3.1" sub="Problem-Solving Agents" />
        <h2 id="s31-heading" style={sectionHeadingStyle}>Problem-Solving Agents</h2>
        <p style={bodyTextStyle}>
          A <strong style={{ color: '#E5E7EB' }}>problem-solving agent</strong> achieves its goals by
          searching through sequences of actions. It first <em>formulates</em> a goal and the problem,
          then <em>searches</em> for a solution, and finally <em>executes</em> the plan. The problem is
          formally described as a 6-tuple{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\langle S,\\, s_0,\\, A,\\, T,\\, G,\\, c \\rangle') }} />.
        </p>
        <p style={{ ...bodyTextStyle, marginTop: '10px' }}>
          Select a domain below to see how each element of the problem formulation changes.
          Use the <strong style={{ color: '#F59E0B' }}>What If</strong> panel to switch goal states and
          observe how the problem redefines{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('G(s)') }} />.
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Problem Formulation Builder</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                Choose a domain to see the 6-tuple decomposition
              </p>
            </div>
          </div>
          <ProblemFormulation />
        </div>
      </section>

      <div style={dividerStyle} />

      {/* ══════════════════════════════════════════════════════════════════════
          §3.2  Example Problems
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-2" style={sectionWrapStyle} aria-labelledby="s32-heading">
        <SectionBadge num="3.2" sub="Example Problems" />
        <h2 id="s32-heading" style={sectionHeadingStyle}>Example Problems</h2>
        <p style={bodyTextStyle}>
          AIMA distinguishes <em>toy problems</em> — small, well-defined domains used to illustrate
          search — from <em>real-world problems</em> such as route finding and scheduling.
          The <strong style={{ color: '#E5E7EB' }}>8-Puzzle</strong> has{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('9!/2 = 181{,}440') }} /> reachable
          states from any starting configuration.
        </p>
        <p style={{ ...bodyTextStyle, marginTop: '10px' }}>
          Slide tiles manually, or press <strong style={{ color: '#3B82F6' }}>BFS Solve</strong> to watch the
          algorithm find the optimal solution step by step.
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Interactive 8-Puzzle</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                Slide tiles to solve · Scramble for a new puzzle · BFS finds optimal solution
              </p>
            </div>
          </div>
          <EightPuzzle />
        </div>
      </section>

      <div style={dividerStyle} />

      {/* ══════════════════════════════════════════════════════════════════════
          §3.3  Search Algorithms (tree, node, frontier)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-3" style={sectionWrapStyle} aria-labelledby="s33-heading">
        <SectionBadge num="3.3" sub="Search Algorithms" />
        <h2 id="s33-heading" style={sectionHeadingStyle}>Search Algorithms</h2>
        <p style={bodyTextStyle}>
          A search algorithm maintains a <strong style={{ color: '#E5E7EB' }}>frontier</strong> — nodes
          generated but not yet expanded — and (for graph search) an <em>explored set</em> to avoid
          revisiting states. Each node stores its state, parent, action, and path cost:
        </p>
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <div
            style={{ fontSize: '15px', padding: '8px 0' }}
            dangerouslySetInnerHTML={{ __html: renderDisplayMath('n = \\langle state,\\; parent,\\; action,\\; path\\text{-}cost \\rangle') }}
          />
        </div>
        <p style={bodyTextStyle}>
          The visualizer below shows the <em>state space graph</em> (left), the growing{' '}
          <em>search tree</em> (middle), and the node data structure (right). Use the{' '}
          <strong style={{ color: '#F59E0B' }}>What If</strong> toggle to compare graph search
          (explored set prevents cycles) against tree search (no explored set, may loop).
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Generic Search Tree Visualizer</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                Step through BFS expansion — watch the search tree grow
              </p>
            </div>
          </div>
          <SearchTreeViz />
        </div>
      </section>

      <div style={dividerStyle} />

      {/* ══════════════════════════════════════════════════════════════════════
          §3.4  Uninformed Search Strategies
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-4" style={sectionWrapStyle} aria-labelledby="s34-heading">
        <SectionBadge num="3.4" sub="Uninformed Search Strategies" />
        <h2 id="s34-heading" style={sectionHeadingStyle}>Uninformed Search Strategies</h2>
        <p style={bodyTextStyle}>
          Uninformed (or <em>blind</em>) search strategies use only the information provided by the
          problem definition — they cannot tell which non-goal state is more promising. They differ
          only in the <em>order</em> in which nodes are expanded.
        </p>
        <p style={{ ...bodyTextStyle, marginTop: '10px' }}>
          The table below compares time/space complexity and optimality. Then use the Romania
          visualizer (with IDDFS now included) to run each algorithm and compare the paths and
          number of nodes expanded.
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Complexity Comparison</h3>
          </div>
          <AlgorithmComparison />
        </div>

        <div style={{ ...cardStyle, marginTop: '24px' }}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Romania Road Map — All Uninformed Algorithms</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                BFS · DFS · UCS · IDDFS — select start and goal cities, then step or animate
              </p>
            </div>
          </div>
          <SearchVisualizer availableAlgorithms={['bfs', 'dfs', 'ucs', 'iddfs']} />
        </div>
      </section>

      <div style={dividerStyle} />

      {/* ══════════════════════════════════════════════════════════════════════
          §3.5  Informed (Heuristic) Search
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-5" style={sectionWrapStyle} aria-labelledby="s35-heading">
        <SectionBadge num="3.5" sub="Informed (Heuristic) Search" />
        <h2 id="s35-heading" style={sectionHeadingStyle}>Informed (Heuristic) Search</h2>
        <p style={bodyTextStyle}>
          Informed search uses a <strong style={{ color: '#E5E7EB' }}>heuristic function</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n)') }} /> — an estimate of the
          cost from node{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('n') }} /> to the goal.
          <strong style={{ color: '#E5E7EB' }}> Greedy Best-First</strong> minimizes{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n)') }} /> alone (fast but
          suboptimal). <strong style={{ color: '#E5E7EB' }}>A*</strong> minimizes{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('f(n) = g(n) + h(n)') }} />, balancing
          path cost so far with the estimated cost to go.
        </p>
        <div style={{ marginTop: '14px', marginBottom: '14px' }}>
          <div
            style={{ fontSize: '15px' }}
            dangerouslySetInnerHTML={{ __html: renderDisplayMath('f(n) = \\underbrace{g(n)}_{\\text{cost so far}} + \\underbrace{h(n)}_{\\text{est. cost to goal}}') }}
          />
        </div>
        <p style={bodyTextStyle}>
          Use the visualizer below with <strong style={{ color: '#EC4899' }}>Greedy</strong> and{' '}
          <strong style={{ color: '#EC4899' }}>A*</strong> to compare their paths on the Romania map.
          Notice that Greedy can reach Bucharest faster (fewer steps) but may not find the optimal route,
          while A* guarantees the shortest path with an admissible heuristic.
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Romania Road Map — Heuristic Algorithms</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                Greedy Best-First · A* — heuristic: straight-line distance to Bucharest
              </p>
            </div>
          </div>
          <SearchVisualizer availableAlgorithms={['gbfs', 'astar']} />
        </div>
      </section>

      <div style={dividerStyle} />

      {/* ══════════════════════════════════════════════════════════════════════
          §3.6  Heuristic Functions
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-6" style={{ ...sectionWrapStyle, paddingBottom: '64px' }} aria-labelledby="s36-heading">
        <SectionBadge num="3.6" sub="Heuristic Functions" />
        <h2 id="s36-heading" style={sectionHeadingStyle}>Heuristic Functions</h2>
        <p style={bodyTextStyle}>
          A heuristic <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n)') }} /> is{' '}
          <strong style={{ color: '#E5E7EB' }}>admissible</strong> if it never overestimates the true
          cost:{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h(n) \\leq h^*(n)') }} />.
          It is <strong style={{ color: '#E5E7EB' }}>consistent</strong> (monotone) if{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath("h(n) \\leq c(n,a,n') + h(n')") }} />{' '}
          for every action <span dangerouslySetInnerHTML={{ __html: renderInlineMath('a') }} />.
          Consistency implies admissibility. A <strong style={{ color: '#E5E7EB' }}>dominant</strong>{' '}
          heuristic{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_2 \\geq h_1') }} /> leads A* to
          expand no more nodes.
        </p>
        <p style={{ ...bodyTextStyle, marginTop: '10px' }}>
          The grid below visualizes three heuristics for a goal cell you can drag anywhere.
          Use the <strong style={{ color: '#F59E0B' }}>What If</strong> toggle to switch to the
          inadmissible heuristic{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('h_{bad} = 1.5 \\cdot h_{SLD}') }} />{' '}
          — cells highlighted in red show where it overestimates, which can cause A* to miss the
          optimal path.
        </p>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Heuristic Lab — 8×8 Grid</h3>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '3px 0 0' }}>
                Click any cell to move the goal · Compare SLD, Manhattan, and inadmissible heuristics
              </p>
            </div>
          </div>
          <HeuristicLab />
        </div>
      </section>
    </div>
  );
}
