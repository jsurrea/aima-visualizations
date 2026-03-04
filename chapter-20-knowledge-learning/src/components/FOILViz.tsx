import { useState } from 'react';
import { renderInlineMath, btnStyle } from '../utils/mathUtils';
import {
  foilGrandparentSteps,
  getFamilyData,
  clauseCoverage,
  foilGain,
  type FOILStep,
} from '../algorithms/index';

const CHAPTER_COLOR = '#10B981';

// ── Available literals to add to clauses ────────────────────────────────────
const ALL_LITERALS = [
  'Father(x,z)',
  'Father(z,y)',
  'Mother(x,z)',
  'Mother(z,y)',
  'Parent(x,z)',
  'Parent(z,y)',
];

// ── Family tree visualization ─────────────────────────────────────────────
function FamilyTree() {
  const familyData = getFamilyData();

  const people = [
    { id: 'George', gen: 0, col: 1.5 },
    { id: 'Mum', gen: 0, col: 3.5 },
    { id: 'Spencer', gen: 1, col: 0 },
    { id: 'Elizabeth', gen: 1, col: 1.5 },
    { id: 'Philip', gen: 1, col: 2.5 },
    { id: 'Margaret', gen: 1, col: 3.5 },
    { id: 'Diana', gen: 2, col: 0.5 },
    { id: 'Charles', gen: 2, col: 1.5 },
    { id: 'Anne', gen: 2, col: 2.5 },
    { id: 'William', gen: 3, col: 0.5 },
    { id: 'Harry', gen: 3, col: 1.5 },
  ];

  const GEN_HEIGHT = 60;
  const COL_WIDTH = 80;
  const W = 420;
  const H = 250;
  const nodeX = (col: number) => 20 + col * COL_WIDTH;
  const nodeY = (gen: number) => 20 + gen * GEN_HEIGHT;

  const fatherLines = familyData.father
    .filter(([p, c]) => people.some(pe => pe.id === p) && people.some(pe => pe.id === c))
    .map(([p, c], i) => {
      const parent = people.find(pe => pe.id === p)!;
      const child = people.find(pe => pe.id === c)!;
      return (
        <line
          key={`f${i}`}
          x1={nodeX(parent.col)}
          y1={nodeY(parent.gen) + 10}
          x2={nodeX(child.col)}
          y2={nodeY(child.gen) - 10}
          stroke="#6366F160"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      );
    });

  return (
    <svg
      width={W}
      height={H}
      aria-label="Family tree"
      style={{ maxWidth: '100%' }}
      viewBox={`0 0 ${W} ${H}`}
    >
      {fatherLines}
      {people.map(p => (
        <g key={p.id} transform={`translate(${nodeX(p.col)}, ${nodeY(p.gen)})`}>
          <circle
            r={18}
            fill="var(--surface-3)"
            stroke="#6366F140"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fill="#D1D5DB"
          >
            {p.id}
          </text>
        </g>
      ))}
      <text x="10" y={H - 5} fontSize="9" fill="#6B7280">
        dashed lines = Father relationship
      </text>
    </svg>
  );
}

// ── Clause builder (what-if) ────────────────────────────────────────────────
function ClauseBuilder() {
  const [selected, setSelected] = useState<string[]>([]);
  const data = getFamilyData();

  const cov = clauseCoverage(selected, data.grandparentPos, data.grandparentNeg, data);
  const totalPos = data.grandparentPos.length;
  const totalNeg = data.grandparentNeg.length;

  function toggle(lit: string) {
    setSelected(prev =>
      prev.includes(lit) ? prev.filter(l => l !== lit) : [...prev, lit],
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '4px' }}>
        🔧 What-If: Build Your Own Clause
      </p>
      <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px', lineHeight: 1.6 }}>
        Toggle literals to add to the body of{' '}
        <code>Grandfather(x,y) :- ...</code>. Watch how coverage
        (pos / neg examples covered) changes.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {ALL_LITERALS.map(lit => (
          <button
            key={lit}
            onClick={() => toggle(lit)}
            aria-pressed={selected.includes(lit)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: `1px solid ${selected.includes(lit) ? CHAPTER_COLOR : 'rgba(255,255,255,0.1)'}`,
              background: selected.includes(lit) ? `${CHAPTER_COLOR}20` : 'transparent',
              color: selected.includes(lit) ? CHAPTER_COLOR : '#9CA3AF',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {lit}
          </button>
        ))}
      </div>

      {/* Current clause display */}
      <div
        style={{
          padding: '10px',
          borderRadius: '6px',
          background: 'var(--surface-3)',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: CHAPTER_COLOR,
          marginBottom: '12px',
        }}
      >
        Grandfather(x,y) :-{' '}
        {selected.length === 0 ? <span style={{ color: '#6B7280' }}>⊤ (empty body)</span> : selected.join(' ∧ ')}
      </div>

      {/* Coverage bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <CoverageBar
          label="Positive covered"
          covered={cov.pos}
          total={totalPos}
          color="#10B981"
          goal={true}
        />
        <CoverageBar
          label="Negative covered"
          covered={cov.neg}
          total={totalNeg}
          color="#EF4444"
          goal={false}
        />
      </div>

      {cov.pos === totalPos && cov.neg === 0 && selected.length > 0 && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: '#10B98115',
            border: '1px solid #10B98130',
            fontSize: '12px',
            color: '#10B981',
            fontWeight: 600,
          }}
        >
          🎉 Perfect clause! Covers all positives, no negatives.
        </div>
      )}
    </div>
  );
}

function CoverageBar({
  label,
  covered,
  total,
  color,
  goal,
}: {
  label: string;
  covered: number;
  total: number;
  color: string;
  goal: boolean;
}) {
  const pct = total === 0 ? 0 : (covered / total) * 100;
  const isGood = goal ? covered === total : covered === 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9CA3AF',
          marginBottom: '4px',
        }}
      >
        <span>{label}</span>
        <span style={{ color: isGood ? '#10B981' : color, fontWeight: 600 }}>
          {covered}/{total}
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={covered}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '3px',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FOILViz() {
  const [stepIdx, setStepIdx] = useState(0);
  const [showTree, setShowTree] = useState(false);

  const steps: ReadonlyArray<FOILStep> = foilGrandparentSteps();
  const currentStep = steps[stepIdx]!;
  const totalSteps = steps.length;

  const data = getFamilyData();
  const gain01 = foilGain(4, 12, 4, 8);
  const gain12 = foilGain(4, 8, 4, 0);

  return (
    <section aria-label="FOIL ILP Algorithm Visualization">
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
        Inductive Logic Programming: The FOIL Algorithm
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '8px' }}>
        <strong style={{ color: '#E5E7EB' }}>FOIL</strong> (First-Order Inductive Learner,
        Quinlan 1990) learns Horn clause definitions from positive and negative examples.
        It works top-down: start with a maximally general clause and{' '}
        <strong style={{ color: '#E5E7EB' }}>specialize</strong> it by adding literals one at
        a time, using an information-gain heuristic to choose the best literal.
      </p>
      <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '20px' }}>
        <strong>Key advantage over attribute-based learning:</strong> FOIL can learn{' '}
        <em>relational</em> predicates that reference relationships between objects, not just
        properties of individual objects.
      </p>

      {/* Family tree */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
            Domain: Family relationships (learning Grandfather)
          </p>
          <button
            onClick={() => setShowTree(s => !s)}
            style={btnStyle(showTree, false)}
            aria-expanded={showTree}
          >
            {showTree ? 'Hide' : 'Show'} Family Tree
          </button>
        </div>
        {showTree && <FamilyTree />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              background: '#10B98110',
              border: '1px solid #10B98120',
            }}
          >
            <p style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, marginBottom: '4px' }}>
              Positive examples (+)
            </p>
            {data.grandparentPos.map(([x, y], i) => (
              <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: '#D1D5DB' }}>
                Grandfather({x}, {y})
              </div>
            ))}
          </div>
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              background: '#EF444410',
              border: '1px solid #EF444420',
            }}
          >
            <p style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginBottom: '4px' }}>
              Negative examples (−) [sample]
            </p>
            {data.grandparentNeg.slice(0, 4).map(([x, y], i) => (
              <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4B5563' }}>
                ¬Grandfather({x}, {y})
              </div>
            ))}
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              … and {data.grandparentNeg.length - 4} more
            </div>
          </div>
        </div>
      </div>

      {/* FOIL gain explanation */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
          FOIL-Gain Heuristic
        </p>
        <div
          dangerouslySetInnerHTML={{
            __html: renderInlineMath(
              '\\text{FOIL-Gain}(L) = t \\cdot \\left[\\log_2\\frac{p_1}{p_1+n_1} - \\log_2\\frac{p_0}{p_0+n_0}\\right]',
            ),
          }}
          style={{ marginBottom: '10px', overflowX: 'auto' }}
        />
        <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
          where{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('p_0, n_0') }} /> = pos/neg
          before adding literal,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('p_1, n_1') }} /> = after, and{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('t = p_1') }} /> = positive
          bindings after. Higher gain = better literal.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              background: 'var(--surface-3)',
              fontSize: '12px',
            }}
          >
            <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>
              Adding <code style={{ color: CHAPTER_COLOR }}>Father(x,z)</code>:
            </p>
            <p style={{ fontFamily: 'monospace', color: CHAPTER_COLOR }}>
              Gain = {gain01.toFixed(3)}
            </p>
            <p style={{ color: '#6B7280', fontSize: '11px' }}>
              (4 pos, 12→8 neg)
            </p>
          </div>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              background: 'var(--surface-3)',
              fontSize: '12px',
            }}
          >
            <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>
              Adding <code style={{ color: CHAPTER_COLOR }}>Parent(z,y)</code>:
            </p>
            <p style={{ fontFamily: 'monospace', color: CHAPTER_COLOR }}>
              Gain = {gain12.toFixed(3)}
            </p>
            <p style={{ color: '#6B7280', fontSize: '11px' }}>
              (4 pos, 8→0 neg)
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-step FOIL */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', margin: 0 }}>
            FOIL Step-by-Step
          </h4>
          <button
            onClick={() => setStepIdx(0)}
            disabled={stepIdx === 0}
            style={btnStyle(false, stepIdx === 0)}
            aria-label="First step"
          >
            ⏮ First
          </button>
          <button
            onClick={() => setStepIdx(p => Math.max(0, p - 1))}
            disabled={stepIdx === 0}
            style={btnStyle(false, stepIdx === 0)}
            aria-label="Previous"
          >
            ◀
          </button>
          <button
            onClick={() => setStepIdx(p => Math.min(totalSteps - 1, p + 1))}
            disabled={stepIdx >= totalSteps - 1}
            style={btnStyle(false, stepIdx >= totalSteps - 1)}
            aria-label="Next"
          >
            ▶
          </button>
          <button
            onClick={() => setStepIdx(totalSteps - 1)}
            disabled={stepIdx >= totalSteps - 1}
            style={btnStyle(false, stepIdx >= totalSteps - 1)}
            aria-label="Last step"
          >
            Last ⏭
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: `1px solid ${i === stepIdx ? CHAPTER_COLOR : 'rgba(255,255,255,0.1)'}`,
                background: i === stepIdx ? `${CHAPTER_COLOR}20` : 'transparent',
                color: i === stepIdx ? CHAPTER_COLOR : '#6B7280',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: i === stepIdx ? 700 : 400,
              }}
              aria-label={`Step ${i + 1}`}
              aria-current={i === stepIdx ? 'step' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current step */}
        <div
          style={{
            background: `${CHAPTER_COLOR}08`,
            border: `1px solid ${CHAPTER_COLOR}20`,
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '14px',
          }}
          role="status"
          aria-live="polite"
        >
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 600 }}>
            Action
          </p>
          <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6 }}>
            {currentStep.action}
          </p>
        </div>

        {/* Clause progress */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
            Current Clause:
          </p>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              color: CHAPTER_COLOR,
              fontWeight: 600,
              padding: '10px',
              background: `${CHAPTER_COLOR}08`,
              borderRadius: '6px',
            }}
          >
            Grandfather(x,y) :-{' '}
            {currentStep.clauseBody.length === 0 ? (
              <span style={{ color: '#6B7280' }}>⊤ (empty)</span>
            ) : (
              currentStep.clauseBody.join(' ∧ ')
            )}
          </div>

          {/* Coverage and gain */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            <StatBox label="Pos. covered" value={`${currentStep.posCovers} / ${data.grandparentPos.length}`} color="#10B981" />
            <StatBox label="Neg. covered" value={`${currentStep.negCovers} / ${data.grandparentNeg.length}`} color={currentStep.negCovers === 0 ? '#10B981' : '#EF4444'} />
            <StatBox
              label="FOIL-Gain"
              value={currentStep.foilGain === 0 ? '—' : currentStep.foilGain.toFixed(3)}
              color={CHAPTER_COLOR}
            />
          </div>
        </div>

        {/* Added literal */}
        {currentStep.addedLiteral && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#F59E0B10',
              border: '1px solid #F59E0B30',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '18px' }}>➕</span>
            <div>
              <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600, marginBottom: '2px' }}>
                Adding literal:
              </p>
              <code style={{ fontSize: '14px', color: '#F59E0B', fontFamily: 'monospace' }}>
                {currentStep.addedLiteral}
              </code>
              <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                (FOIL-Gain = {currentStep.foilGain.toFixed(3)})
              </span>
            </div>
          </div>
        )}

        {/* Final clause */}
        {stepIdx === totalSteps - 1 && (
          <div
            style={{
              background: '#10B98115',
              border: '1px solid #10B98140',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', fontWeight: 600 }}>
              ✓ Learned Clause:
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                color: CHAPTER_COLOR,
                fontWeight: 700,
              }}
            >
              Father(x,z) ∧ Parent(z,y) ⇒ Grandfather(x,y)
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.6 }}>
              Interpretation: "x is a grandfather of y if x is the father of z and z is a parent
              of y." This is a{' '}
              <strong style={{ color: '#E5E7EB' }}>relational rule</strong> — it cannot be
              expressed as attribute-based classification.
            </p>
          </div>
        )}
      </div>

      {/* What-if clause builder */}
      <ClauseBuilder />

      {/* Inverse resolution teaser */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h4
          style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '8px' }}
        >
          §20.5.3 The Other Approach: Inverse Resolution
        </h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7 }}>
          While FOIL works <em>top-down</em> (starting general, specializing), inverse resolution
          works <em>bottom-up</em>: it "runs a proof backward." If{' '}
          <span
            dangerouslySetInnerHTML={{
              __html: renderInlineMath(
                '\\text{Background} \\wedge H \\wedge \\text{Descriptions} \\models \\text{Classifications}',
              ),
            }}
          />
          , there must be a resolution proof. Inverting that proof yields candidate hypotheses.
          This approach can even <strong style={{ color: '#E5E7EB' }}>invent new predicates</strong>{' '}
          — something FOIL cannot do — enabling discoveries like the{' '}
          <code style={{ color: CHAPTER_COLOR }}>Parent</code> predicate from{' '}
          <code style={{ color: CHAPTER_COLOR }}>Father</code> and{' '}
          <code style={{ color: CHAPTER_COLOR }}>Mother</code>.
        </p>

        {/* Inverse resolution diagram */}
        <div
          style={{
            marginTop: '14px',
            overflowX: 'auto',
            padding: '12px',
            background: 'var(--surface-3)',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
            Figure 20.13 (simplified): Inverse resolution for Grandparent(George, Anne)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
            {[
              {
                text: 'Goal: Grandparent(George, Anne) ← ⊥',
                color: CHAPTER_COLOR,
              },
              { text: '↑ inverse step 1', color: '#6B7280' },
              {
                text: '¬Parent(Elizabeth,y) ∨ Grandparent(George,y)  +  Parent(Elizabeth,Anne)',
                color: '#D1D5DB',
              },
              { text: '↑ inverse step 2', color: '#6B7280' },
              {
                text: 'Parent(x,z) ∧ Parent(z,y) ⇒ Grandparent(x,y)  [HYPOTHESIS]',
                color: '#F59E0B',
              },
            ].map((line, i) => (
              <div key={i} style={{ color: line.color }}>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: '8px',
        borderRadius: '6px',
        background: 'var(--surface-3)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontFamily: 'monospace', color, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}


