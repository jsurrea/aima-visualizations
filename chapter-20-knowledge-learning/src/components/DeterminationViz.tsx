import { useState } from 'react';
import { renderInlineMath } from '../utils/mathUtils';
import {
  minimalConsistentDet,
  isConsistentDetermination,
  type DetExample,
  type DetStep,
} from '../algorithms/index';

const CHAPTER_COLOR = '#10B981';

// ── Conductance dataset (book example, §20.4) ───────────────────────────────
const CONDUCTANCE_DATA: DetExample[] = [
  { attrs: { Mass: '12', Temp: '26', Material: 'Copper', Size: '3' }, target: '0.59' },
  { attrs: { Mass: '12', Temp: '100', Material: 'Copper', Size: '3' }, target: '0.57' },
  { attrs: { Mass: '24', Temp: '26', Material: 'Copper', Size: '6' }, target: '0.59' },
  { attrs: { Mass: '12', Temp: '26', Material: 'Lead', Size: '2' }, target: '0.05' },
  { attrs: { Mass: '12', Temp: '100', Material: 'Lead', Size: '2' }, target: '0.04' },
  { attrs: { Mass: '24', Temp: '26', Material: 'Lead', Size: '4' }, target: '0.05' },
];

const CONDUCTANCE_ATTRS = ['Material', 'Temp', 'Mass', 'Size'];

// ── A custom "grades" dataset ─────────────────────────────────────────────
const GRADES_DATA: DetExample[] = [
  { attrs: { Subject: 'Math', Teacher: 'Smith', Hours: '5', Difficulty: 'Hard' }, target: 'B' },
  { attrs: { Subject: 'Math', Teacher: 'Jones', Hours: '5', Difficulty: 'Hard' }, target: 'B' },
  { attrs: { Subject: 'Math', Teacher: 'Smith', Hours: '10', Difficulty: 'Hard' }, target: 'A' },
  { attrs: { Subject: 'English', Teacher: 'Brown', Hours: '5', Difficulty: 'Easy' }, target: 'A' },
  { attrs: { Subject: 'English', Teacher: 'Brown', Hours: '3', Difficulty: 'Easy' }, target: 'B' },
  { attrs: { Subject: 'Physics', Teacher: 'Smith', Hours: '10', Difficulty: 'Hard' }, target: 'A' },
];
const GRADES_ATTRS = ['Subject', 'Hours', 'Difficulty', 'Teacher'];

const DATASETS = [
  { name: 'Conductance (book)', data: CONDUCTANCE_DATA, attrs: CONDUCTANCE_ATTRS, target: 'Conductance' },
  { name: 'Grades (custom)', data: GRADES_DATA, attrs: GRADES_ATTRS, target: 'Grade' },
];

// ── Attribute chip ───────────────────────────────────────────────────────────
function AttrChip({
  attr,
  active,
  onClick,
}: {
  attr: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '5px 12px',
        borderRadius: '20px',
        border: `1px solid ${active ? CHAPTER_COLOR : 'rgba(255,255,255,0.1)'}`,
        background: active ? `${CHAPTER_COLOR}20` : 'transparent',
        color: active ? CHAPTER_COLOR : '#9CA3AF',
        fontSize: '12px',
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
      }}
    >
      {attr}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DeterminationViz() {
  const [datasetIdx, setDatasetIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(-1);

  const ds = DATASETS[datasetIdx]!;
  const steps = minimalConsistentDet(ds.attrs, ds.data);
  const totalSteps = steps.length;

  const currentStep: DetStep | null = stepIdx >= 0 ? (steps[stepIdx] ?? null) : null;
  const foundStep = steps.find(s => s.found);

  // Manual check panel
  const [manualSubset, setManualSubset] = useState<string[]>([]);
  const manualConsistent = isConsistentDetermination(manualSubset, ds.data);

  function toggleManualAttr(attr: string) {
    setManualSubset(prev =>
      prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr],
    );
  }

  return (
    <section aria-label="Minimal Consistent Determination Visualization">
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
        Relevance-Based Learning: Minimal Consistent Determinations
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '8px' }}>
        A <strong style={{ color: '#E5E7EB' }}>determination</strong>{' '}
        <span
          dangerouslySetInnerHTML={{
            __html: renderInlineMath('P \\Rightarrow\\!\\Rightarrow Q'),
          }}
        />{' '}
        says that the value of{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P') }} /> uniquely determines
        the value of{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('Q') }} />. Formally: any two
        examples agreeing on{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P') }} /> must also agree on{' '}
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('Q') }} />.
      </p>
      <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '16px' }}>
        The <strong style={{ color: '#E5E7EB' }}>MINIMAL-CONSISTENT-DET</strong> algorithm
        (AIMA Figure 20.8) searches for the smallest subset of attributes that consistently
        determines the target, starting from subsets of size 0, 1, 2, …
      </p>

      {/* Dataset selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {DATASETS.map((d, i) => (
          <button
            key={d.name}
            onClick={() => {
              setDatasetIdx(i);
              setStepIdx(-1);
              setManualSubset([]);
            }}
            style={btnStyle(i === datasetIdx, false)}
            aria-pressed={i === datasetIdx}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Data table */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'auto',
        }}
      >
        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '10px' }}>
          Dataset: {ds.name} (target = {ds.target})
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {ds.attrs.map(a => (
                <th
                  key={a}
                  style={{
                    padding: '6px 10px',
                    textAlign: 'left',
                    color: '#9CA3AF',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontWeight: 600,
                  }}
                >
                  {a}
                </th>
              ))}
              <th
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: CHAPTER_COLOR,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  fontWeight: 600,
                }}
              >
                {ds.target}
              </th>
            </tr>
          </thead>
          <tbody>
            {ds.data.map((ex, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {ds.attrs.map(a => (
                  <td key={a} style={{ padding: '5px 10px', color: '#D1D5DB', fontFamily: 'monospace' }}>
                    {String(ex.attrs[a])}
                  </td>
                ))}
                <td
                  style={{
                    padding: '5px 10px',
                    color: CHAPTER_COLOR,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                  }}
                >
                  {String(ex.target)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual subset tester (what-if) */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '4px' }}>
          🔧 What-If: Test a Subset Manually
        </p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px', lineHeight: 1.6 }}>
          Toggle attributes to see if your chosen subset is a consistent determination. Two
          examples with the same values for your subset but different targets = inconsistent.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {ds.attrs.map(attr => (
            <AttrChip
              key={attr}
              attr={attr}
              active={manualSubset.includes(attr)}
              onClick={() => toggleManualAttr(attr)}
            />
          ))}
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: manualConsistent ? '#10B98115' : '#EF444415',
            border: `1px solid ${manualConsistent ? '#10B98130' : '#EF444430'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ fontSize: '18px' }}>{manualConsistent ? '✓' : '✗'}</span>
          <div>
            <span
              style={{
                fontSize: '13px',
                color: manualConsistent ? '#10B981' : '#EF4444',
                fontWeight: 600,
              }}
            >
              {manualSubset.length === 0
                ? 'Empty subset'
                : `{${manualSubset.join(', ')}}`}{' '}
              is {manualConsistent ? 'a consistent' : 'NOT a consistent'} determination for{' '}
              {ds.target}
            </span>
            {manualConsistent && manualSubset.length > 0 && (
              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                {manualSubset.join(' ∧ ')} ⟹⟹ {ds.target}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Algorithm steps */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', margin: 0 }}>
            MINIMAL-CONSISTENT-DET Run
          </h4>
          <button
            onClick={() => setStepIdx(0)}
            disabled={totalSteps === 0}
            style={btnStyle(false, totalSteps === 0)}
          >
            ▶ Start
          </button>
          <button
            onClick={() => setStepIdx(p => Math.min(totalSteps - 1, p + 1))}
            disabled={stepIdx >= totalSteps - 1}
            style={btnStyle(false, stepIdx >= totalSteps - 1)}
            aria-label="Next step"
          >
            Next ▶
          </button>
          <button
            onClick={() => setStepIdx(totalSteps - 1)}
            disabled={stepIdx >= totalSteps - 1}
            style={btnStyle(false, stepIdx >= totalSteps - 1)}
          >
            Skip to Answer ⏭
          </button>
          <button
            onClick={() => setStepIdx(-1)}
            disabled={stepIdx < 0}
            style={btnStyle(false, stepIdx < 0)}
          >
            ⏮ Reset
          </button>
        </div>

        {/* Steps list */}
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
          role="log"
          aria-label="Algorithm steps"
        >
          {stepIdx < 0 ? (
            <p style={{ fontSize: '13px', color: '#6B7280' }}>
              Press Start to run MINIMAL-CONSISTENT-DET.
            </p>
          ) : (
            steps.slice(0, stepIdx + 1).map((step, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${step.found ? '#10B98140' : step.consistent ? '#F59E0B20' : 'rgba(255,255,255,0.06)'}`,
                  background: step.found
                    ? '#10B98110'
                    : step.consistent
                      ? '#F59E0B08'
                      : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: step.found ? CHAPTER_COLOR : '#D1D5DB',
                      fontWeight: step.found ? 700 : 400,
                    }}
                  >
                    {`{${step.subset.join(', ') || '∅'}}`}
                  </span>
                  {step.found && (
                    <span
                      style={{
                        marginLeft: '10px',
                        fontSize: '11px',
                        color: CHAPTER_COLOR,
                        fontWeight: 600,
                      }}
                    >
                      ← MINIMAL CONSISTENT DETERMINATION
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: step.consistent ? '#10B98115' : '#EF444415',
                    color: step.consistent ? '#10B981' : '#EF4444',
                    flexShrink: 0,
                  }}
                >
                  {step.consistent ? '✓ consistent' : '✗ inconsistent'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Final answer */}
      {foundStep && (
        <div
          style={{
            background: `${CHAPTER_COLOR}12`,
            border: `1px solid ${CHAPTER_COLOR}40`,
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
            Minimal Consistent Determination:
          </p>
          <p
            style={{
              fontSize: '15px',
              fontFamily: 'monospace',
              color: CHAPTER_COLOR,
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            {foundStep.subset.length > 0
              ? `${foundStep.subset.join(' ∧ ')} ⟹⟹ ${ds.target}`
              : `∅ ⟹⟹ ${ds.target} (target is constant)`}
          </p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
            This means: knowing {foundStep.subset.join(' and ')}, the {ds.target} is fully
            determined. Once this determination is found, the learner only needs to consider
            hypotheses built from these attributes — drastically reducing the hypothesis space.
          </p>
        </div>
      )}

      {/* Learning curve insight */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px' }}>
          📊 Why Determinations Speed Up Learning (Figure 20.9 Insight)
        </h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          If the target depends on only{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('d') }} /> of{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('n') }} /> attributes:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              background: '#EF444412',
              border: '1px solid #EF444430',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, marginBottom: '4px' }}>
              Without determinations (DTL)
            </p>
            <div
              dangerouslySetInnerHTML={{
                __html: renderInlineMath('|H| = O(2^{2^n}) \\Rightarrow O(2^n) \\text{ examples needed}'),
              }}
              style={{ fontSize: '12px' }}
            />
          </div>
          <div
            style={{
              background: `${CHAPTER_COLOR}12`,
              border: `1px solid ${CHAPTER_COLOR}30`,
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: CHAPTER_COLOR,
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              With determinations (RBDTL)
            </p>
            <div
              dangerouslySetInnerHTML={{
                __html: renderInlineMath('|H| = O(2^{2^d}) \\Rightarrow O(2^d) \\text{ examples needed}'),
              }}
              style={{ fontSize: '12px' }}
            />
          </div>
        </div>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px' }}>
          Reduction:{' '}
          <span
            dangerouslySetInnerHTML={{
              __html: renderInlineMath('O(2^{n-d})'),
            }}
          />{' '}
          — exponential speedup when{' '}
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('d \\ll n') }} />.
        </p>
      </div>
    </section>
  );
}

function btnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: '7px',
    border: `1px solid ${active ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
    background: active ? '#10B98120' : 'transparent',
    color: disabled ? '#374151' : active ? '#10B981' : '#D1D5DB',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  };
}
