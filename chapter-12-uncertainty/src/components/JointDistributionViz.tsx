import React, { useState } from 'react';
import { inferFromJoint, marginalize } from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

interface JointRow {
  key: string;
  prob: number;
  cavity: boolean;
  toothache: boolean;
  catch_: boolean;
}

const JOINT_DATA: JointRow[] = [
  { key: 'cavity,toothache,catch',    prob: 0.108, cavity: true,  toothache: true,  catch_: true  },
  { key: 'cavity,toothache,¬catch',   prob: 0.012, cavity: true,  toothache: true,  catch_: false },
  { key: 'cavity,¬toothache,catch',   prob: 0.072, cavity: true,  toothache: false, catch_: true  },
  { key: 'cavity,¬toothache,¬catch',  prob: 0.008, cavity: true,  toothache: false, catch_: false },
  { key: '¬cavity,toothache,catch',   prob: 0.016, cavity: false, toothache: true,  catch_: true  },
  { key: '¬cavity,toothache,¬catch',  prob: 0.064, cavity: false, toothache: true,  catch_: false },
  { key: '¬cavity,¬toothache,catch',  prob: 0.144, cavity: false, toothache: false, catch_: true  },
  { key: '¬cavity,¬toothache,¬catch', prob: 0.576, cavity: false, toothache: false, catch_: false },
];

const JOINT_MAP = new Map(JOINT_DATA.map(r => [r.key, r.prob]));

const EVIDENCE_OPTIONS = [
  { label: 'cavity',     varName: 'cavity' },
  { label: '¬cavity',    varName: 'cavity' },
  { label: 'toothache',  varName: 'toothache' },
  { label: '¬toothache', varName: 'toothache' },
  { label: 'catch',      varName: 'catch' },
  { label: '¬catch',     varName: 'catch' },
];

export default function JointDistributionViz() {
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [showMarginalized, setShowMarginalized] = useState(false);

  const toggleEvidence = (label: string, varName: string) => {
    setSelectedEvidence(prev => {
      const next = new Set(prev);
      // Remove both values of this variable
      const options = EVIDENCE_OPTIONS.filter(o => o.varName === varName).map(o => o.label);
      options.forEach(o => next.delete(o));
      // Toggle: add if wasn't selected
      if (!prev.has(label)) next.add(label);
      return next;
    });
  };

  const evidenceArray = Array.from(selectedEvidence);

  const matchesEvidence = (row: JointRow) => {
    return evidenceArray.every(ev => row.key.split(',').includes(ev));
  };

  const pEvidence = JOINT_DATA.filter(matchesEvidence).reduce((s, r) => s + r.prob, 0);
  const pCavityGivenEvidence = evidenceArray.length > 0
    ? inferFromJoint(JOINT_MAP, 'cavity', evidenceArray)
    : 0.2;
  const pNoCavityGivenEvidence = evidenceArray.length > 0
    ? inferFromJoint(JOINT_MAP, '¬cavity', evidenceArray)
    : 0.8;
  const alpha = pEvidence > 0 ? 1 / pEvidence : 0;

  // Marginalized: sum out catch
  const marginalizedMap = marginalize(JOINT_MAP, ['catch', '¬catch']);

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  return (
    <div role="region" aria-label="§12.3 Full Joint Distribution" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.3 Full Joint Distribution
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        P(Cavity, Toothache, Catch) — click values to condition on them
      </p>

      {/* Evidence toggles */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Evidence</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EVIDENCE_OPTIONS.map(({ label, varName }) => {
            const active = selectedEvidence.has(label);
            return (
              <button
                key={label}
                onClick={() => toggleEvidence(label, varName)}
                aria-pressed={active}
                aria-label={`Toggle evidence ${label}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `1px solid ${active ? '#EC4899' : 'var(--surface-border)'}`,
                  background: active ? 'rgba(236,72,153,0.15)' : 'var(--surface-3)',
                  color: active ? '#EC4899' : '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Joint Distribution Table */}
      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Joint Distribution Table</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '340px' }} role="table" aria-label="Full joint distribution">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              {['Cavity', 'Toothache', 'Catch', 'P'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'P' ? 'right' : 'left', color: '#9CA3AF', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {JOINT_DATA.map(row => {
              const matches = evidenceArray.length === 0 || matchesEvidence(row);
              return (
                <tr
                  key={row.key}
                  style={{
                    opacity: matches ? 1 : 0.3,
                    borderLeft: matches && evidenceArray.length > 0 ? '3px solid #EC4899' : '3px solid transparent',
                    background: matches && evidenceArray.length > 0 ? 'rgba(236,72,153,0.05)' : 'transparent',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <td style={{ padding: '7px 12px', color: row.cavity ? '#10B981' : '#6B7280' }}>{row.cavity ? 'cavity' : '¬cavity'}</td>
                  <td style={{ padding: '7px 12px', color: row.toothache ? '#10B981' : '#6B7280' }}>{row.toothache ? 'toothache' : '¬toothache'}</td>
                  <td style={{ padding: '7px 12px', color: row.catch_ ? '#10B981' : '#6B7280' }}>{row.catch_ ? 'catch' : '¬catch'}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#F9FAFB', fontVariantNumeric: 'tabular-nums' }}>{row.prob.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Results */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Inference Results</h3>
        {evidenceArray.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>P(evidence) =</span>
              <span style={{ color: '#EC4899', fontWeight: 600 }}>{pEvidence.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: '14px' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Cavity} | \\text{evidence}) =') }} />
              <span style={{ color: '#10B981', fontWeight: 600 }}>{pCavityGivenEvidence.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: '14px' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\lnot\\text{Cavity} | \\text{evidence}) =') }} />
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>{pNoCavityGivenEvidence.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\alpha = 1/P(\\text{evidence}) =') }} />
              <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{alpha.toFixed(4)}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: '14px' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Cavity}) =') }} />
              <span style={{ color: '#10B981', fontWeight: 600 }}>0.2000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\lnot\\text{Cavity}) =') }} />
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>0.8000</span>
            </div>
          </>
        )}
      </div>

      {/* KaTeX formula */}
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '8px' }}>Conditional inference formula</div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(\\text{Cavity} | \\text{evidence}) = \\alpha \\sum_{\\text{catch}} P(\\text{Cavity},\\, \\text{evidence},\\, \\text{catch})') }} />
      </div>

      {/* Marginalization */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#E5E7EB', margin: 0 }}>Marginalization</h3>
          <button
            onClick={() => setShowMarginalized(prev => !prev)}
            aria-pressed={showMarginalized}
            aria-label="Toggle marginalized distribution"
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--surface-border)',
              background: showMarginalized ? 'rgba(236,72,153,0.15)' : 'var(--surface-3)',
              color: showMarginalized ? '#EC4899' : '#9CA3AF', cursor: 'pointer', fontSize: '13px',
            }}
          >
            Show P(Cavity, Toothache)
          </button>
        </div>
        {showMarginalized && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} role="table" aria-label="Marginalized joint distribution">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase' }}>Cavity</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase' }}>Toothache</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right', color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase' }}>P</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(marginalizedMap.entries()).map(([key, prob]) => {
                  const parts = key.split(',');
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '6px 12px', color: parts[0] === 'cavity' ? '#10B981' : '#6B7280' }}>{parts[0]}</td>
                      <td style={{ padding: '6px 12px', color: parts[1] === 'toothache' ? '#10B981' : '#6B7280' }}>{parts[1]}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#F9FAFB' }}>{prob.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
