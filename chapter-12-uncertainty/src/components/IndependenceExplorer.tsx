import React, { useState } from 'react';
import { checkIndependence } from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

export default function IndependenceExplorer() {
  const [pSunny, setPSunny] = useState(0.7);
  const [pCavity, setPCavity] = useState(0.2);
  const [dependencyOffset, setDependencyOffset] = useState(0);

  const pJointIndependent = pSunny * pCavity;
  const pJointActual = Math.max(0, Math.min(pSunny, pCavity, pJointIndependent + dependencyOffset));
  const isIndependent = checkIndependence(pSunny, pCavity, pJointActual);

  const pSunnyNot = 1 - pSunny;
  const pCavityNot = 1 - pCavity;

  // Full 2x2 joint (independent)
  const tableIndep = {
    SC: pSunny * pCavity,
    SC_not: pSunny * pCavityNot,
    S_notC: pSunnyNot * pCavity,
    S_notC_not: pSunnyNot * pCavityNot,
  };
  // Actual joint (with dependency)
  const tableActual = {
    SC: pJointActual,
    SC_not: pSunny - pJointActual,
    S_notC: pCavity - pJointActual,
    S_notC_not: 1 - pSunny - pCavity + pJointActual,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'center', color: '#9CA3AF', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: '13px',
  };

  return (
    <div role="region" aria-label="§12.4 Independence Explorer" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.4 Independence Explorer
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        Weather and Dental health are independent — probability of one does not affect the other
      </p>

      {/* Sliders */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#E5E7EB' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Sunny})') }} />
            <span style={{ color: '#EC4899', fontWeight: 600 }}>{pSunny.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={pSunny}
            onChange={e => setPSunny(parseFloat(e.target.value))}
            aria-label="P(Sunny) slider" style={{ width: '100%', accentColor: '#EC4899' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#E5E7EB' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(\\text{Cavity})') }} />
            <span style={{ color: '#EC4899', fontWeight: 600 }}>{pCavity.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={pCavity}
            onChange={e => setPCavity(parseFloat(e.target.value))}
            aria-label="P(Cavity) slider" style={{ width: '100%', accentColor: '#EC4899' }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#E5E7EB' }}>
            <span>Dependency offset</span>
            <span style={{ color: dependencyOffset !== 0 ? '#F59E0B' : '#9CA3AF', fontWeight: 600 }}>{dependencyOffset >= 0 ? '+' : ''}{dependencyOffset.toFixed(2)}</span>
          </div>
          <input type="range" min={-0.1} max={0.1} step={0.01} value={dependencyOffset}
            onChange={e => setDependencyOffset(parseFloat(e.target.value))}
            aria-label="Dependency offset slider" style={{ width: '100%', accentColor: '#F59E0B' }} />
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Adjust to introduce/remove dependency</div>
        </div>
      </div>

      {/* Independence indicator */}
      <div style={{ ...cardStyle, background: isIndependent ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', borderColor: isIndependent ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{isIndependent ? '✓' : '✗'}</span>
          <div>
            <div style={{ fontWeight: 700, color: isIndependent ? '#10B981' : '#F59E0B', fontSize: '16px' }}>
              {isIndependent ? 'Independent ✓' : 'Dependent ✗'}
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
              P(Sunny)×P(Cavity) = {pJointIndependent.toFixed(4)}, P(Sunny∧Cavity) = {pJointActual.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* 2×2 Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#10B981' }}>Independent Joint (P(A)×P(B))</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} aria-label="Independent joint distribution">
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}> </th>
                <th style={thStyle}>Sunny</th>
                <th style={thStyle}>¬Sunny</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#E5E7EB' }}>Cavity</td>
                <td style={{ ...tdStyle, color: '#10B981' }}>{tableIndep.SC.toFixed(4)}</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableIndep.S_notC.toFixed(4)}</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#6B7280' }}>¬Cavity</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableIndep.SC_not.toFixed(4)}</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableIndep.S_notC_not.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: dependencyOffset !== 0 ? '#F59E0B' : '#10B981' }}>
            Actual Joint {dependencyOffset !== 0 ? '(with dependency)' : '(= independent)'}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} aria-label="Actual joint distribution">
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}> </th>
                <th style={thStyle}>Sunny</th>
                <th style={thStyle}>¬Sunny</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#E5E7EB' }}>Cavity</td>
                <td style={{ ...tdStyle, color: dependencyOffset !== 0 ? '#F59E0B' : '#10B981' }}>{tableActual.SC.toFixed(4)}</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableActual.S_notC.toFixed(4)}</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, textAlign: 'left', color: '#6B7280' }}>¬Cavity</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableActual.SC_not.toFixed(4)}</td>
                <td style={{ ...tdStyle, color: '#6B7280' }}>{tableActual.S_notC_not.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KaTeX formula */}
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '8px' }}>Independence condition</div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(A \\land B) = P(A) \\cdot P(B)') }} />
      </div>
    </div>
  );
}
