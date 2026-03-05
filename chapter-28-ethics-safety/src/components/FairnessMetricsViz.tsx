/**
 * FairnessMetricsViz — §28.3.3 Fairness & Bias
 *
 * Interactive demo of algorithmic fairness using a COMPAS-like recidivism scenario.
 * Students can adjust classifier thresholds and see how fairness metrics trade off.
 */
import { useState, useMemo } from 'react';
import {
  computeFairnessMetrics,
  hasDemographicParity,
  hasEqualOpportunity,
  isWellCalibrated,
  type Prediction,
} from '../algorithms/index';

const CHAPTER_COLOR = '#EF4444';

// Simulated dataset: risk score distributions for two groups
// Group A (privileged): base re-offense rate 45%, avg risk score ~4.5
// Group B (marginalized): base re-offense rate 65%, avg risk score ~5.8
// This creates the calibration/equal-opportunity tension documented in COMPAS
function generateDataset(seed: number): Prediction[] {
  const lcg = (s: number) => ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
  let rng = seed;
  const rand = () => { rng = lcg(rng); return rng / 0xffffffff; };

  const predictions: Prediction[] = [];

  // Group A: 200 individuals, re-offense rate 45%
  for (let i = 0; i < 200; i++) {
    const actual = rand() < 0.45;
    // Risk score: bimodal — high for actual positives
    const riskScore = actual ? 4 + rand() * 4 : 2 + rand() * 5;
    predictions.push({ actual, predicted: false, group: 'Group A' });
    (predictions[predictions.length - 1] as unknown as { score: number }).score = riskScore;
  }

  // Group B: 200 individuals, re-offense rate 65%
  for (let i = 0; i < 200; i++) {
    const actual = rand() < 0.65;
    const riskScore = actual ? 5 + rand() * 4 : 3 + rand() * 5;
    predictions.push({ actual, predicted: false, group: 'Group B' });
    (predictions[predictions.length - 1] as unknown as { score: number }).score = riskScore;
  }

  return predictions;
}

const BASE_DATASET = generateDataset(42);

function applyThreshold(dataset: Prediction[], thresholdA: number, thresholdB: number): Prediction[] {
  return dataset.map((p, i) => {
    const score = ((BASE_DATASET[i] as unknown as { score: number }).score) ?? 5;
    const threshold = p.group === 'Group A' ? thresholdA : thresholdB;
    return { ...p, predicted: score >= threshold };
  });
}

const FAIRNESS_CONCEPTS = [
  {
    id: 'demographic',
    label: 'Demographic Parity',
    formula: '|PR_A - PR_B| ≤ ε',
    description: 'Both groups get the same positive prediction rate (fraction classified as high-risk).',
    tension: 'May force approving unqualified or denying qualified individuals to hit a quota.',
  },
  {
    id: 'equalOpportunity',
    label: 'Equal Opportunity',
    formula: '|TPR_A - TPR_B| ≤ ε',
    description: 'Among those who truly re-offend, both groups have equal probability of being correctly flagged.',
    tension: 'Can produce unequal false-positive rates — more innocent people from one group jailed.',
  },
  {
    id: 'calibration',
    label: 'Calibration (COMPAS criterion)',
    formula: '|PPV_A - PPV_B| ≤ ε',
    description: 'Among those assigned the same risk score, both groups have equal re-offense rates.',
    tension: 'Kleinberg et al. (2016): If base rates differ, calibration and equal opportunity are mutually exclusive.',
  },
];

export default function FairnessMetricsViz() {
  const [thresholdA, setThresholdA] = useState(5.0);
  const [thresholdB, setThresholdB] = useState(5.0);
  const [tolerance, setTolerance] = useState(0.05);
  const [selectedConcept, setSelectedConcept] = useState('demographic');

  const predictions = useMemo(
    () => applyThreshold(BASE_DATASET, thresholdA, thresholdB),
    [thresholdA, thresholdB],
  );

  const metrics = useMemo(() => computeFairnessMetrics(predictions), [predictions]);
  const metricA = metrics.find(m => m.group === 'Group A');
  const metricB = metrics.find(m => m.group === 'Group B');

  const dpSatisfied = hasDemographicParity(metrics, 'Group A', 'Group B', tolerance);
  const eoSatisfied = hasEqualOpportunity(metrics, 'Group A', 'Group B', tolerance);
  const calSatisfied = isWellCalibrated(metrics, 'Group A', 'Group B', tolerance);

  const fmt = (v: number) => (v * 100).toFixed(1) + '%';

  return (
    <div role="region" aria-label="Algorithmic Fairness Demo">
      {/* Intro */}
      <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7, marginBottom: '0' }}>
          <strong style={{ color: 'white' }}>COMPAS</strong> is a commercial recidivism scoring system used by judges.
          It was found to be well-calibrated (similar precision across groups) but <em>not</em> equal opportunity
          (Group B had a 45% false-positive rate vs. 23% for Group A). Below you can adjust classification
          thresholds independently per group and watch how the three fairness criteria trade off.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
            Group A threshold: <strong style={{ color: 'white' }}>{thresholdA.toFixed(1)}</strong>
          </span>
          <input type="range" min="1" max="9" step="0.5" value={thresholdA}
            onChange={e => setThresholdA(Number(e.target.value))}
            aria-label="Group A risk threshold"
            style={{ width: '100%', accentColor: '#6366F1' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
            Group B threshold: <strong style={{ color: 'white' }}>{thresholdB.toFixed(1)}</strong>
          </span>
          <input type="range" min="1" max="9" step="0.5" value={thresholdB}
            onChange={e => setThresholdB(Number(e.target.value))}
            aria-label="Group B risk threshold"
            style={{ width: '100%', accentColor: CHAPTER_COLOR }} />
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: '20px' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
          Tolerance ε: <strong style={{ color: 'white' }}>{(tolerance * 100).toFixed(0)}%</strong>
        </span>
        <input type="range" min="0.01" max="0.2" step="0.01" value={tolerance}
          onChange={e => setTolerance(Number(e.target.value))}
          aria-label="Fairness tolerance"
          style={{ width: '100%', maxWidth: '320px', accentColor: '#F59E0B' }} />
      </label>

      {/* Metrics table */}
      {metricA && metricB && (
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Metric', 'Group A', 'Group B', 'Difference', 'Satisfied?'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--surface-3,#242430)', color: '#9CA3AF', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Positive Rate (Demographic Parity)', a: metricA.positiveRate, b: metricB.positiveRate, ok: dpSatisfied },
                { label: 'TPR (Equal Opportunity)', a: metricA.tpr, b: metricB.tpr, ok: eoSatisfied },
                { label: 'PPV (Calibration)', a: metricA.ppv, b: metricB.ppv, ok: calSatisfied },
                { label: 'FPR (False Positive Rate)', a: metricA.fpr, b: metricB.fpr, ok: Math.abs(metricA.fpr - metricB.fpr) <= tolerance },
              ].map(row => {
                const diff = Math.abs(row.a - row.b);
                return (
                  <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: '#E5E7EB' }}>{row.label}</td>
                    <td style={{ padding: '10px 12px', color: '#6366F1', fontWeight: 600 }}>{fmt(row.a)}</td>
                    <td style={{ padding: '10px 12px', color: CHAPTER_COLOR, fontWeight: 600 }}>{fmt(row.b)}</td>
                    <td style={{ padding: '10px 12px', color: diff > tolerance ? '#F59E0B' : '#10B981', fontWeight: 600 }}>{fmt(diff)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                        background: row.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: row.ok ? '#10B981' : CHAPTER_COLOR,
                      }}>
                        {row.ok ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Impossibility theorem callout */}
      {!calSatisfied || !eoSatisfied ? (
        <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '20px' }}>
          <p style={{ color: '#FCD34D', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            <strong>Impossibility Theorem (Kleinberg et al., 2016):</strong> When the base re-offense rates
            differ across groups, <em>no algorithm can simultaneously satisfy both calibration and equal opportunity.</em>
            {' '}Try to make both green — you'll find it requires equal base rates (equal thresholds with similar risk distributions), which aren't available in this dataset.
          </p>
        </div>
      ) : null}

      {/* Confusion matrix for each group */}
      {metricA && metricB && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[metricA, metricB].map(m => (
            <div key={m.group} style={{ padding: '16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>{m.group} — Confusion Matrix</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { label: 'TP', value: m.confusion.tp, color: '#10B981', title: 'True Positive: high-risk & did re-offend' },
                  { label: 'FP', value: m.confusion.fp, color: CHAPTER_COLOR, title: 'False Positive: high-risk & did NOT re-offend' },
                  { label: 'FN', value: m.confusion.fn, color: '#F59E0B', title: 'False Negative: low-risk & did re-offend' },
                  { label: 'TN', value: m.confusion.tn, color: '#6366F1', title: 'True Negative: low-risk & did NOT re-offend' },
                ].map(cell => (
                  <div key={cell.label} title={cell.title} style={{ padding: '10px', background: `${cell.color}10`, borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: cell.color, fontWeight: 600 }}>{cell.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>{cell.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fairness concepts guide */}
      <div style={{ padding: '20px', background: 'var(--surface-2,#1A1A24)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Fairness Concepts (Book §28.3.3)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {FAIRNESS_CONCEPTS.map(c => (
            <button key={c.id} onClick={() => setSelectedConcept(c.id)}
              aria-pressed={selectedConcept === c.id}
              style={{
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                fontSize: '12px', fontWeight: 500,
                background: selectedConcept === c.id ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
                color: selectedConcept === c.id ? CHAPTER_COLOR : '#9CA3AF',
                outline: selectedConcept === c.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
              }}>
              {c.label}
            </button>
          ))}
        </div>
        {FAIRNESS_CONCEPTS.filter(c => c.id === selectedConcept).map(c => (
          <div key={c.id}>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#F59E0B', marginBottom: '8px', padding: '8px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: '6px' }}>
              {c.formula}
            </div>
            <p style={{ color: '#E5E7EB', fontSize: '13px', lineHeight: 1.7, marginBottom: '8px' }}>{c.description}</p>
            <p style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
              <strong style={{ color: '#F59E0B' }}>Tension:</strong> {c.tension}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
