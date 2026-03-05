import { renderInlineMath } from '../utils/mathUtils';

// ─── Complexity data ──────────────────────────────────────────────────────────

interface AlgorithmInfo {
  readonly name: string;
  readonly fullName: string;
  readonly color: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly optimal: string;
  readonly complete: string;
  readonly dataStructure: string;
  readonly notes: string;
  readonly latexTime: string;
  readonly latexSpace: string;
}

const ALGORITHMS: ReadonlyArray<AlgorithmInfo> = [
  {
    name: 'BFS',
    fullName: 'Breadth-First Search',
    color: '#3B82F6',
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    optimal: '✅ (unit cost)',
    complete: '✅',
    dataStructure: 'Queue (FIFO)',
    notes: 'Explores all nodes at depth d before depth d+1',
    latexTime: 'O(b^d)',
    latexSpace: 'O(b^d)',
  },
  {
    name: 'DFS',
    fullName: 'Depth-First Search',
    color: '#8B5CF6',
    timeComplexity: 'O(b^m)',
    spaceComplexity: 'O(bm)',
    optimal: '❌',
    complete: '✅ (finite graphs)',
    dataStructure: 'Stack (LIFO)',
    notes: 'Can explore very deep paths; linear space is the key advantage',
    latexTime: 'O(b^m)',
    latexSpace: 'O(bm)',
  },
  {
    name: 'UCS',
    fullName: 'Uniform-Cost Search',
    color: '#10B981',
    timeComplexity: 'O(b^{1+⌊C*/ε⌋})',
    spaceComplexity: 'O(b^{1+⌊C*/ε⌋})',
    optimal: '✅',
    complete: '✅',
    dataStructure: 'Priority Queue (by g)',
    notes: 'Optimal for non-uniform costs; degenerates to BFS for uniform costs',
    latexTime: 'O(b^{1+\\lfloor C^*/\\varepsilon \\rfloor})',
    latexSpace: 'O(b^{1+\\lfloor C^*/\\varepsilon \\rfloor})',
  },
  {
    name: 'IDDFS',
    fullName: 'Iterative Deepening DFS',
    color: '#F59E0B',
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(bd)',
    optimal: '✅ (unit cost)',
    complete: '✅',
    dataStructure: 'Stack (LIFO) per iteration',
    notes: 'Best of both worlds: BFS optimality + DFS space. Preferred for large state spaces.',
    latexTime: 'O(b^d)',
    latexSpace: 'O(bd)',
  },
  {
    name: 'A*',
    fullName: 'A* Search',
    color: '#EC4899',
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    optimal: '✅ (admissible h)',
    complete: '✅',
    dataStructure: 'Priority Queue (by f=g+h)',
    notes: 'Optimal with admissible heuristic; expands fewer nodes than UCS',
    latexTime: 'O(b^d)',
    latexSpace: 'O(b^d)',
  },
];

// ─── Legend component ─────────────────────────────────────────────────────────

const VARIABLES: ReadonlyArray<{ symbol: string; meaning: string }> = [
  { symbol: 'b', meaning: 'branching factor (avg children per node)' },
  { symbol: 'd', meaning: 'depth of shallowest goal' },
  { symbol: 'm', meaning: 'maximum depth of search tree' },
  { symbol: 'C^*', meaning: 'optimal path cost' },
  { symbol: '\\varepsilon', meaning: 'minimum edge cost' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AlgorithmComparison(): JSX.Element {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB' }}>
      {/* Comparison table */}
      <div style={{ overflowX: 'auto', padding: '20px' }}>
        <table
          role="table"
          aria-label="Uninformed search algorithm comparison"
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
              {['Algorithm', 'Data Structure', 'Time', 'Space', 'Complete?', 'Optimal?'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALGORITHMS.map((algo, i) => (
              <tr
                key={algo.name}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
              >
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: algo.color, display: 'inline-block', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#E5E7EB' }}>{algo.name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{algo.fullName}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: '12px' }}>{algo.dataStructure}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{ color: algo.color, fontWeight: 600 }}
                    dangerouslySetInnerHTML={{ __html: renderInlineMath(algo.latexTime) }}
                  />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{ color: algo.color, fontWeight: 600 }}
                    dangerouslySetInnerHTML={{ __html: renderInlineMath(algo.latexSpace) }}
                  />
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{algo.complete}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px' }}>{algo.optimal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Variable legend */}
      <div style={{ margin: '0 20px 20px', background: '#111118', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '10px' }}>
          Notation
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
          {VARIABLES.map(v => (
            <span key={v.symbol} style={{ fontSize: '12px', color: '#9CA3AF' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath(v.symbol) }} />
              {' '}— {v.meaning}
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ margin: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {ALGORITHMS.map(algo => (
          <div
            key={algo.name}
            style={{
              background: '#111118',
              borderRadius: '8px',
              padding: '12px 14px',
              border: `1px solid ${algo.color}30`,
              borderLeft: `3px solid ${algo.color}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: algo.color, marginBottom: '4px' }}>{algo.name}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>{algo.notes}</div>
          </div>
        ))}
      </div>

      {/* Key insight */}
      <div style={{
        margin: '0 20px 20px', background: '#0F1F0F',
        border: '1px solid #10B98140',
        borderRadius: '10px', padding: '14px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#34D399', marginBottom: '6px' }}>
          💡 Key Insight: IDDFS = BFS optimality + DFS space
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
          IDDFS uses <span dangerouslySetInnerHTML={{ __html: renderInlineMath('O(bd)') }} /> space (linear)
          while achieving <span dangerouslySetInnerHTML={{ __html: renderInlineMath('O(b^d)') }} /> time,
          the same as BFS. The "wasted" work of re-expanding nodes costs only a factor of <span dangerouslySetInnerHTML={{ __html: renderInlineMath('b/(b-1)') }} />{' '}
          — negligible for branching factor ≥ 2.
        </div>
      </div>
    </div>
  );
}
