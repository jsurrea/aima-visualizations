import React, { useState } from 'react';
import { validateDistribution, inclusionExclusion, complementRule, productRule } from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

interface ProbabilityAxiomExplorerProps {}

export default function ProbabilityAxiomExplorer(_props: ProbabilityAxiomExplorerProps) {
  const [probA, setProbA] = useState(0.6);
  const [probB, setProbB] = useState(0.5);
  const [probAandB, setProbAandB] = useState(0.3);

  // When A or B changes, clamp probAandB to min(A,B)
  const handleProbAChange = (val: number) => {
    setProbA(val);
    setProbAandB(prev => Math.min(prev, val, probB));
  };
  const handleProbBChange = (val: number) => {
    setProbB(val);
    setProbAandB(prev => Math.min(prev, probA, val));
  };
  const handleAandBChange = (val: number) => {
    setProbAandB(Math.min(val, probA, probB));
  };

  const pAorB = inclusionExclusion(probA, probB, probAandB);
  const pNotA = complementRule(probA);
  const pNotB = complementRule(probB);
  // P(A∧B) via product rule: P(A|B)*P(B) = (probAandB/probB)*probB = probAandB when probB>0
  const pAandBviaProduct = probB > 0 ? productRule(probAandB / probB, probB) : 0;

  const validation = validateDistribution([['A', probA], ['¬A', pNotA]]);
  const dutchBook = pAorB > 1;

  const axiom1Valid = probA >= 0 && probA <= 1;
  const axiom1ValidB = probB >= 0 && probB <= 1;

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#E5E7EB',
  };

  const resultRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--surface-border)',
    fontSize: '14px',
  };

  return (
    <div role="region" aria-label="§12.1–12.2 Probability Axiom Explorer" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.1–12.2 Probability Axiom Explorer
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        Explore the Kolmogorov axioms and basic probability rules
      </p>

      {/* Sliders */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>Input Probabilities</h3>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(A)') }} />
            <span style={{ color: '#EC4899', fontWeight: 600 }}>{probA.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={probA}
            onChange={e => handleProbAChange(parseFloat(e.target.value))}
            aria-label="P(A) slider"
            style={{ width: '100%', accentColor: '#EC4899' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(B)') }} />
            <span style={{ color: '#EC4899', fontWeight: 600 }}>{probB.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={probB}
            onChange={e => handleProbBChange(parseFloat(e.target.value))}
            aria-label="P(B) slider"
            style={{ width: '100%', accentColor: '#EC4899' }}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={labelStyle}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(A \\cap B)') }} />
            <span style={{ color: '#EC4899', fontWeight: 600 }}>{probAandB.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0} max={Math.min(probA, probB)} step={0.01} value={probAandB}
            onChange={e => handleAandBChange(parseFloat(e.target.value))}
            aria-label="P(A and B) slider"
            style={{ width: '100%', accentColor: '#EC4899' }}
          />
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Max: min(P(A), P(B)) = {Math.min(probA, probB).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Computed Values */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Computed Values</h3>

        <div style={resultRowStyle}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(A \\lor B)') }} />
          <span style={{ color: pAorB > 1 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{pAorB.toFixed(4)}</span>
        </div>
        <div style={resultRowStyle}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\lnot A)') }} />
          <span style={{ color: '#F9FAFB', fontWeight: 600 }}>{pNotA.toFixed(4)}</span>
        </div>
        <div style={resultRowStyle}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\lnot B)') }} />
          <span style={{ color: '#F9FAFB', fontWeight: 600 }}>{pNotB.toFixed(4)}</span>
        </div>
        <div style={{ ...resultRowStyle, borderBottom: 'none' }}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(A \\land B)\\text{ (product rule)}') }} />
          <span style={{ color: '#F9FAFB', fontWeight: 600 }}>{pAandBviaProduct.toFixed(4)}</span>
        </div>
      </div>

      {/* Validation */}
      <div style={{ ...cardStyle, background: validation.valid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderColor: validation.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: validation.valid ? '#10B981' : '#EF4444' }}>
          <span>{validation.valid ? '✓' : '✗'}</span>
          <span>{validation.valid ? 'Valid distribution P(A) + P(¬A) = 1' : 'Invalid distribution'}</span>
        </div>
        {validation.violations.map((v, i) => (
          <div key={i} style={{ color: '#EF4444', fontSize: '13px', marginTop: '4px' }}>{v}</div>
        ))}
        {dutchBook && (
          <div style={{ color: '#F59E0B', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
            ⚠ Dutch Book: P(A∨B) {'>'} 1 — an agent with these beliefs can be exploited!
          </div>
        )}
      </div>

      {/* Axioms */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Kolmogorov Axioms</h3>

        <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: (axiom1Valid && axiom1ValidB) ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${(axiom1Valid && axiom1ValidB) ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          <div style={{ color: (axiom1Valid && axiom1ValidB) ? '#10B981' : '#EF4444', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Axiom 1 {(axiom1Valid && axiom1ValidB) ? '✓' : '✗'}
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('0 \\leq P(A) \\leq 1') }} />
        </div>

        <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ color: '#10B981', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Axiom 2 ✓</div>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(\\Omega) = 1') }} />
        </div>

        <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-3)', border: '1px solid var(--surface-border)' }}>
          <div style={{ color: '#9CA3AF', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Axiom 3 (Inclusion-Exclusion)</div>
          <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(A \\lor B) = P(A) + P(B) - P(A \\land B)') }} />
        </div>
      </div>
    </div>
  );
}
