import { useState } from 'react';
import { renderInlineMath, btnStyle } from '../utils/mathUtils';
import { eblSimplificationSteps, dropAlwaysTrueConditions, type EBLStep } from '../algorithms/index';

const CHAPTER_COLOR = '#10B981';

// ── KB Rules displayed alongside the proof ──────────────────────────────────
const KB_RULES = [
  { name: 'Simplify-Rewrite', tex: '\\text{Rewrite}(u,v) \\wedge \\text{Simplify}(v,w) \\Rightarrow \\text{Simplify}(u,w)' },
  { name: 'Simplify-Prim', tex: '\\text{Primitive}(u) \\Rightarrow \\text{Simplify}(u,u)' },
  { name: 'ArithUnknown-Prim', tex: '\\text{ArithmeticUnknown}(u) \\Rightarrow \\text{Primitive}(u)' },
  { name: 'Number-Prim', tex: '\\text{Number}(u) \\Rightarrow \\text{Primitive}(u)' },
  { name: 'Rewrite-1×', tex: '\\text{Rewrite}(1 \\times u, u)' },
  { name: 'Rewrite-0+', tex: '\\text{Rewrite}(0 + u, u)' },
];

// ── Proof tree nodes (AIMA Figure 20.7) ────────────────────────────────────
interface TreeNode {
  goal: string;
  genGoal: string;
  rule: string;
  children: TreeNode[];
  isLeaf: boolean;
  binding?: string;
}

const PROOF_TREE: TreeNode = {
  goal: 'Simplify(1×(0+X), X)',
  genGoal: 'Simplify(1×(0+z), z)',
  rule: 'Simplify-Rewrite',
  isLeaf: false,
  children: [
    {
      goal: 'Rewrite(1×(0+X), 0+X)',
      genGoal: 'Rewrite(1×(0+z), 0+z)',
      rule: 'Rewrite-1×',
      isLeaf: true,
      binding: '{x=1, v=0+z}',
      children: [],
    },
    {
      goal: 'Simplify(0+X, X)',
      genGoal: 'Simplify(0+z, z)',
      rule: 'Simplify-Rewrite',
      isLeaf: false,
      children: [
        {
          goal: 'Rewrite(0+X, X)',
          genGoal: 'Rewrite(0+z, z)',
          rule: 'Rewrite-0+',
          isLeaf: true,
          binding: '{y=0, v\'=z}',
          children: [],
        },
        {
          goal: 'Simplify(X, X)',
          genGoal: 'Simplify(z, z)',
          rule: 'Simplify-Prim',
          isLeaf: false,
          children: [
            {
              goal: 'Primitive(X)',
              genGoal: 'Primitive(z)',
              rule: 'ArithUnknown-Prim',
              isLeaf: false,
              children: [
                {
                  goal: 'ArithmeticUnknown(X)',
                  genGoal: 'ArithmeticUnknown(z)',
                  rule: 'given',
                  isLeaf: true,
                  binding: '{}',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ── Proof Tree Renderer ──────────────────────────────────────────────────────
function ProofNode({
  node,
  showGeneralized,
  depth = 0,
}: {
  node: TreeNode;
  showGeneralized: boolean;
  depth?: number;
}) {
  const isLeaf = node.isLeaf;
  const borderColor = isLeaf ? '#F59E0B' : CHAPTER_COLOR;
  const goalText = showGeneralized ? node.genGoal : node.goal;

  return (
    <div
      style={{
        marginLeft: depth > 0 ? '24px' : '0',
        marginTop: depth > 0 ? '8px' : '0',
        position: 'relative',
      }}
    >
      {/* Vertical line to parent */}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '-14px',
            top: '14px',
            width: '14px',
            height: '1px',
            background: 'rgba(255,255,255,0.12)',
          }}
        />
      )}

      <div
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: `1px solid ${borderColor}40`,
          background: `${borderColor}08`,
          display: 'inline-block',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            color: isLeaf ? '#F59E0B' : '#D1D5DB',
            fontWeight: isLeaf ? 600 : 400,
          }}
        >
          {goalText}
        </div>
        {node.rule !== '' && (
          <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
            ← {node.rule}
            {node.binding ? (
              <span style={{ color: '#9CA3AF' }}> {node.binding}</span>
            ) : null}
          </div>
        )}
        {isLeaf && (
          <div
            style={{
              fontSize: '10px',
              color: '#F59E0B',
              marginTop: '2px',
              fontWeight: 600,
            }}
          >
            ✓ leaf condition
          </div>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div style={{ marginLeft: '14px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '0' }}>
          {node.children.map((child, i) => (
            <ProofNode
              key={i}
              node={child}
              showGeneralized={showGeneralized}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EBLViz() {
  const [stepIdx, setStepIdx] = useState(0);
  const [showGeneralized, setShowGeneralized] = useState(false);
  const [showKB, setShowKB] = useState(false);
  const [customGoal, setCustomGoal] = useState('1*(0+X)');

  const steps = eblSimplificationSteps();
  const currentStep: EBLStep = steps[stepIdx]!;

  // Compute the final rule for custom goal
  const customRule = customGoal.includes('X')
    ? `ArithmeticUnknown(z) ⇒ Simplify(${customGoal.replace(/X/g, 'z')}, z)`
    : `Number(z) ⇒ Simplify(${customGoal.replace(/n/gi, 'z')}, z)`;

  const remainingConditions = dropAlwaysTrueConditions(
    currentStep.leafConditions,
    currentStep.droppedConditions,
  );

  return (
    <section aria-label="Explanation-Based Learning Visualization">
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
        Explanation-Based Learning (EBL)
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '16px' }}>
        EBL generalizes from a <strong style={{ color: '#E5E7EB' }}>single example</strong> by
        constructing a proof of why the example holds, then extracting a general rule from the
        proof structure. The key insight: the rule follows{' '}
        <em>deductively</em> from background knowledge — EBL is{' '}
        <strong style={{ color: '#E5E7EB' }}>
          compiling knowledge, not acquiring new facts
        </strong>
        .
      </p>

      {/* The canonical example */}
      <div
        style={{
          background: `${CHAPTER_COLOR}10`,
          border: `1px solid ${CHAPTER_COLOR}30`,
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', fontWeight: 600 }}>
          Canonical example (AIMA §20.3):
        </p>
        <p
          style={{ fontSize: '13px', color: '#D1D5DB', marginBottom: '8px', lineHeight: 1.6 }}
        >
          Given the goal{' '}
          <code
            style={{
              background: 'var(--surface-3)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: CHAPTER_COLOR,
            }}
          >
            Simplify(1×(0+X), X)
          </code>
          , EBL uses the background knowledge (rules for simplification) to prove this goal,
          then extracts the general rule:
        </p>
        <div
          style={{ overflowX: 'auto' }}
          dangerouslySetInnerHTML={{
            __html: renderInlineMath(
              '\\text{ArithmeticUnknown}(z) \\Rightarrow \\text{Simplify}(1 \\times (0 + z),\\, z)',
            ),
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <button
          onClick={() => setStepIdx(0)}
          disabled={stepIdx === 0}
          style={btnStyle(false, stepIdx === 0)}
          aria-label="Go to first step"
        >
          ⏮ First
        </button>
        <button
          onClick={() => setStepIdx(p => Math.max(0, p - 1))}
          disabled={stepIdx === 0}
          style={btnStyle(false, stepIdx === 0)}
          aria-label="Previous step"
        >
          ◀ Prev
        </button>
        <button
          onClick={() => setStepIdx(p => Math.min(steps.length - 1, p + 1))}
          disabled={stepIdx >= steps.length - 1}
          style={btnStyle(false, stepIdx >= steps.length - 1)}
          aria-label="Next step"
        >
          Next ▶
        </button>
        <button
          onClick={() => setStepIdx(steps.length - 1)}
          disabled={stepIdx >= steps.length - 1}
          style={btnStyle(false, stepIdx >= steps.length - 1)}
          aria-label="Go to last step"
        >
          Last ⏭
        </button>
        <button
          onClick={() => setShowGeneralized(s => !s)}
          style={btnStyle(showGeneralized, false)}
          aria-pressed={showGeneralized}
        >
          {showGeneralized ? '↩ Specific' : '↗ Generalized'} Tree
        </button>
        <button
          onClick={() => setShowKB(s => !s)}
          style={btnStyle(showKB, false)}
          aria-pressed={showKB}
        >
          📖 Show KB Rules
        </button>
      </div>

      {/* KB Rules (collapsible) */}
      {showKB && (
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB', marginBottom: '10px' }}>
            Background Knowledge (KB Rules):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {KB_RULES.map(r => (
              <div key={r.name} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    minWidth: '120px',
                    fontFamily: 'monospace',
                  }}
                >
                  [{r.name}]
                </span>
                <span
                  dangerouslySetInnerHTML={{ __html: renderInlineMath(r.tex) }}
                  style={{ fontSize: '12px', color: '#D1D5DB' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step progress */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

      {/* Current step description */}
      <div
        style={{
          background: `${CHAPTER_COLOR}08`,
          border: `1px solid ${CHAPTER_COLOR}20`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}
        role="status"
        aria-live="polite"
      >
        <p style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6 }}>
          <strong style={{ color: CHAPTER_COLOR }}>Step {stepIdx + 1}:</strong>{' '}
          {currentStep.action}
        </p>
      </div>

      {/* Two-column layout: specific goal + generalized goal */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: 600 }}>
            Specific goal (instance)
          </p>
          <code style={{ fontSize: '12px', color: '#D1D5DB', fontFamily: 'monospace' }}>
            {currentStep.specificGoal}
          </code>
        </div>
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '8px',
            padding: '12px',
            border: `1px solid ${CHAPTER_COLOR}30`,
          }}
        >
          <p
            style={{
              fontSize: '11px',
              color: CHAPTER_COLOR,
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Generalized goal (variabilized)
          </p>
          <code style={{ fontSize: '12px', color: CHAPTER_COLOR, fontFamily: 'monospace' }}>
            {currentStep.generalGoal}
          </code>
        </div>
      </div>

      {/* Proof tree */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'auto',
        }}
        aria-label="Proof tree"
      >
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', fontWeight: 600 }}>
          Proof Tree {showGeneralized ? '(generalized — variables highlighted)' : '(specific)'}:
        </p>
        <ProofNode node={PROOF_TREE} showGeneralized={showGeneralized} />
      </div>

      {/* Leaf conditions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: '#F59E0B10',
            border: '1px solid #F59E0B30',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600, marginBottom: '8px' }}>
            Leaf Conditions (LHS candidates)
          </p>
          {currentStep.leafConditions.map((c, i) => (
            <div
              key={i}
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#D1D5DB',
                padding: '3px 0',
              }}
            >
              • {c}
            </div>
          ))}
        </div>
        <div
          style={{
            background: `${CHAPTER_COLOR}10`,
            border: `1px solid ${CHAPTER_COLOR}30`,
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p style={{ fontSize: '11px', color: CHAPTER_COLOR, fontWeight: 600, marginBottom: '8px' }}>
            After Dropping Always-True Conditions
          </p>
          {currentStep.droppedConditions.length > 0 ? (
            <>
              <p style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
                Dropped (always true):
              </p>
              {currentStep.droppedConditions.map((c, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#4B5563',
                    textDecoration: 'line-through',
                    padding: '2px 0',
                  }}
                >
                  • {c}
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '6px 0' }} />
            </>
          ) : null}
          {remainingConditions.length > 0 ? (
            remainingConditions.map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: CHAPTER_COLOR,
                  fontWeight: 600,
                  padding: '2px 0',
                }}
              >
                ✓ {c}
              </div>
            ))
          ) : (
            <div style={{ fontSize: '11px', color: '#6B7280' }}>No conditions remain</div>
          )}
        </div>
      </div>

      {/* Extracted rule */}
      <div
        style={{
          background: `${CHAPTER_COLOR}12`,
          border: `1px solid ${CHAPTER_COLOR}40`,
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
        }}
      >
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', fontWeight: 600 }}>
          Extracted Rule:
        </p>
        <code
          style={{
            fontSize: '14px',
            color: CHAPTER_COLOR,
            fontFamily: 'monospace',
            fontWeight: 700,
          }}
        >
          {currentStep.extractedRule}
        </code>
      </div>

      {/* What-if: new goal */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '8px' }}>
          💡 What-If: Change the Expression
        </p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px', lineHeight: 1.6 }}>
          In the book example, EBL learns from{' '}
          <code>Simplify(1×(0+X), X)</code>. What rule would EBL
          extract if the goal were a different expression? Try changing the expression below:
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Simplify(</span>
          <input
            type="text"
            value={customGoal}
            onChange={e => setCustomGoal(e.target.value)}
            style={{
              background: 'var(--surface-3)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontFamily: 'monospace',
              width: '160px',
            }}
            aria-label="Expression to simplify"
          />
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>, X) where X is ArithmeticUnknown</span>
        </div>
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: `${CHAPTER_COLOR}08`,
            borderRadius: '6px',
            border: `1px solid ${CHAPTER_COLOR}20`,
          }}
        >
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            EBL would extract:
          </p>
          <code style={{ fontSize: '13px', color: CHAPTER_COLOR, fontFamily: 'monospace' }}>
            {customRule}
          </code>
        </div>
        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>
          Notice: EBL always produces a rule whose LHS conditions are the minimal set needed
          to ensure the proof goes through. The structure of the proof determines the rule.
        </p>
      </div>
    </section>
  );
}


