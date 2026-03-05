/**
 * SafetyViz — §28.3.7 AI Safety
 *
 * Three interactive demos:
 * 1. Fault tree analysis — compute probability of top-event system failure
 * 2. Value alignment — show how robot utility diverges from human preferences
 * 3. Low-impact safety — visualise penalty for state changes
 */
import { useState, useMemo } from 'react';
import {
  faultTreeProbability,
  valueAlignmentScore,
  lowImpactUtility,
  type FaultTreeNode,
  type AlignmentScenario,
} from '../algorithms/index';

const CHAPTER_COLOR = '#EF4444';

// ─── Fault Tree ───────────────────────────────────────────────────────────────

interface LeafInput { label: string; p: number }

const LEAF_DEFAULTS: LeafInput[] = [
  { label: 'Sensor failure',    p: 0.05 },
  { label: 'Software bug',      p: 0.10 },
  { label: 'Power failure',     p: 0.03 },
  { label: 'Comm. disruption',  p: 0.08 },
];

function FaultTreeDemo() {
  const [leaves, setLeaves] = useState<LeafInput[]>(LEAF_DEFAULTS);
  const [topGate, setTopGate] = useState<'AND' | 'OR'>('OR');

  const topEvent = useMemo<FaultTreeNode>(() => ({
    type: topGate,
    children: leaves.map(l => ({ type: 'LEAF', probability: l.p })),
  }), [leaves, topGate]);

  const prob = faultTreeProbability(topEvent);

  const updateLeaf = (i: number, p: number) => {
    setLeaves(prev => prev.map((l, j) => j === i ? { ...l, p } : l));
  };

  return (
    <div>
      <div style={{ marginBottom: '14px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: 'white' }}>Fault Tree Analysis (FTA)</strong> enumerates failure modes of a system
          and assigns probabilities to each root cause. AND-gates require <em>all</em> children to fail;
          OR-gates fail when <em>any</em> child fails. Adjust component probabilities and the top gate type
          to see the overall system failure probability.
        </p>
      </div>

      {/* Gate selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ color: '#9CA3AF', fontSize: '13px', fontWeight: 600 }}>Top gate:</span>
        {(['AND', 'OR'] as const).map(g => (
          <button key={g} onClick={() => setTopGate(g)} aria-pressed={topGate === g}
            style={{
              padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontSize: '13px', fontWeight: 600,
              background: topGate === g ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: topGate === g ? CHAPTER_COLOR : '#9CA3AF',
              outline: topGate === g ? `1px solid ${CHAPTER_COLOR}40` : 'none',
            }}>
            {g}
          </button>
        ))}
        <span style={{ color: '#6B7280', fontSize: '12px', marginLeft: '8px' }}>
          {topGate === 'AND' ? 'All components must fail (redundant system)' : 'Any component failure causes top event (brittle system)'}
        </span>
      </div>

      {/* Leaf inputs */}
      <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
        {leaves.map((leaf, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ width: '140px', flexShrink: 0, color: '#E5E7EB', fontSize: '13px' }}>{leaf.label}</span>
            <input type="range" min="0.001" max="0.5" step="0.001" value={leaf.p}
              onChange={e => updateLeaf(i, Number(e.target.value))}
              aria-label={`${leaf.label} failure probability`}
              style={{ flex: 1, accentColor: CHAPTER_COLOR }} />
            <span style={{ width: '48px', textAlign: 'right', color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600 }}>
              {(leaf.p * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Result */}
      <div style={{
        padding: '16px 20px', borderRadius: '12px', textAlign: 'center',
        background: prob > 0.3 ? 'rgba(239,68,68,0.1)' : prob > 0.1 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${prob > 0.3 ? 'rgba(239,68,68,0.3)' : prob > 0.1 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
      }}>
        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>Top-Event Failure Probability</div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: prob > 0.3 ? CHAPTER_COLOR : prob > 0.1 ? '#F59E0B' : '#10B981' }}>
          {(prob * 100).toFixed(3)}%
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
          Risk level: {prob > 0.3 ? 'High — re-design required' : prob > 0.1 ? 'Medium — mitigation needed' : 'Low — acceptable'}
        </div>
      </div>
    </div>
  );
}

// ─── Value Alignment ─────────────────────────────────────────────────────────

const ACTION_LABELS = [
  'Clean floor (low impact)',
  'Open window (medium impact)',
  'Move furniture (high impact)',
  'Disable alarm (extreme impact)',
  'Call for help',
  'Turn off lights',
];

function ValueAlignmentDemo() {
  const [robotValues, setRobotValues] = useState<number[]>([9, 6, 4, 1, 7, 8]);
  const humanValues = useMemo(() => [9, 5, 2, -5, 8, 7], []);
  const [impactPenalty, setImpactPenalty] = useState(0.1);
  const stateChanges = useMemo(() => [1, 3, 8, 15, 2, 1], []);

  const updateRobot = (i: number, v: number) => {
    setRobotValues(prev => prev.map((x, j) => j === i ? v : x));
  };

  const scenarios: AlignmentScenario[] = ACTION_LABELS.map((_, i) => ({
    humanUtility: humanValues[i] ?? 0,
    robotUtility: robotValues[i] ?? 0,
  }));

  const alignment = valueAlignmentScore(scenarios);

  const adjustedValues = robotValues.map((v, i) => lowImpactUtility(v, stateChanges[i] ?? 0, impactPenalty));
  const adjustedScenarios: AlignmentScenario[] = ACTION_LABELS.map((_, i) => ({
    humanUtility: humanValues[i] ?? 0,
    robotUtility: adjustedValues[i] ?? 0,
  }));
  const adjustedAlignment = valueAlignmentScore(adjustedScenarios);

  const fmtScore = (s: number) => (s * 100).toFixed(1) + '%';
  const scoreColor = (s: number) => s > 0.8 ? '#10B981' : s > 0.5 ? '#F59E0B' : s > 0.2 ? '#F97316' : CHAPTER_COLOR;

  return (
    <div>
      <div style={{ marginBottom: '14px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
          The <strong style={{ color: 'white' }}>value alignment problem</strong> (Book §28.3.7) is the challenge
          of ensuring that what we ask AI systems to do is what we actually want them to do — the
          King Midas problem. Adjust the robot's utility estimates and see how well they correlate
          with human preferences. The <strong style={{ color: 'white' }}>low-impact penalty</strong> deducts
          a cost per state change, causing the robot to prefer less disruptive actions.
        </p>
      </div>

      {/* Alignment scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ padding: '14px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Raw Alignment Score</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(alignment) }}>{fmtScore(alignment)}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Without low-impact penalty</div>
        </div>
        <div style={{ padding: '14px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Adjusted Alignment Score</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(adjustedAlignment) }}>{fmtScore(adjustedAlignment)}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>With low-impact penalty λ={impactPenalty.toFixed(2)}</div>
        </div>
      </div>

      {/* Penalty slider */}
      <label style={{ display: 'block', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
          Impact penalty λ: <strong style={{ color: 'white' }}>{impactPenalty.toFixed(2)}</strong> per state change
        </span>
        <input type="range" min="0" max="1" step="0.01" value={impactPenalty}
          onChange={e => setImpactPenalty(Number(e.target.value))}
          aria-label="Low-impact penalty"
          style={{ width: '100%', maxWidth: '320px', accentColor: '#6366F1' }} />
      </label>

      {/* Action table */}
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {['Action', 'State Δ', 'Human util.', 'Robot util.', 'Adjusted util.', 'Misaligned?'].map(h => (
                <th key={h} style={{ padding: '7px 10px', textAlign: 'left', background: 'var(--surface-3,#242430)', color: '#9CA3AF', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTION_LABELS.map((label, i) => {
              const diff = Math.abs((robotValues[i] ?? 0) - (humanValues[i] ?? 0));
              const isMisaligned = diff > 3;
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 10px', color: '#E5E7EB' }}>{label}</td>
                  <td style={{ padding: '8px 10px', color: '#9CA3AF' }}>{stateChanges[i]}</td>
                  <td style={{ padding: '8px 10px', color: '#6366F1', fontWeight: 600 }}>{humanValues[i]}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="range" min="-10" max="10" step="1" value={robotValues[i]}
                      onChange={e => updateRobot(i, Number(e.target.value))}
                      aria-label={`Robot utility for ${label}`}
                      style={{ width: '70px', accentColor: CHAPTER_COLOR, verticalAlign: 'middle' }} />
                    <span style={{ marginLeft: '6px', color: isMisaligned ? CHAPTER_COLOR : '#E5E7EB', fontWeight: isMisaligned ? 600 : 400 }}>{robotValues[i]}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#10B981' }}>{adjustedValues[i]?.toFixed(1)}</td>
                  <td style={{ padding: '8px 10px' }}>
                    {isMisaligned
                      ? <span style={{ color: CHAPTER_COLOR, fontWeight: 600 }}>⚠ Yes</span>
                      : <span style={{ color: '#10B981' }}>✓ No</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* King Midas callout */}
      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.15)' }}>
        <p style={{ color: '#FCD34D', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
          <strong>King Midas Problem:</strong> Utility maximizers get exactly what you ask for, not what
          you want. A robot tasked with cleaning will maximise cleanliness — possibly by incapacitating
          the person who keeps making messes. The value alignment problem is the challenge of specifying
          the <em>right</em> objective so that the robot internalises acceptable background norms,
          rather than exploiting loopholes in a formal specification.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SAFETY_SUBSECTIONS = [
  { id: 'fta', label: 'Fault Tree Analysis' },
  { id: 'alignment', label: 'Value Alignment' },
];

export default function SafetyViz() {
  const [tab, setTab] = useState<'fta' | 'alignment'>('fta');

  return (
    <div role="region" aria-label="AI Safety Visualizations">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {SAFETY_SUBSECTIONS.map(s => (
          <button key={s.id} onClick={() => setTab(s.id as 'fta' | 'alignment')}
            aria-pressed={tab === s.id}
            style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontSize: '13px', fontWeight: 600,
              background: tab === s.id ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: tab === s.id ? CHAPTER_COLOR : '#9CA3AF',
              outline: tab === s.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {tab === 'fta' && <FaultTreeDemo />}
      {tab === 'alignment' && <ValueAlignmentDemo />}
    </div>
  );
}
