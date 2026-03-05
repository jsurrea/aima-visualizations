/**
 * PrivacyViz — §28.3.2 Surveillance, Security, and Privacy
 *
 * Two interactive demos:
 * 1. k-Anonymity: generalise a table and compute k-anonymity level
 * 2. Differential Privacy: see how Laplace noise protects query answers
 */
import { useState, useMemo } from 'react';
import { computeKAnonymity, generalizeField, laplaceNoise, laplaceNoiseStdDev, type DatabaseRecord } from '../algorithms/index';

const CHAPTER_COLOR = '#EF4444';

type Row = { name: string; age: string; zip: string; condition: string };

const ORIGINAL_ROWS: Row[] = [
  { name: 'Alice',   age: '31', zip: '02141', condition: 'Cancer' },
  { name: 'Bob',     age: '33', zip: '02141', condition: 'Heart disease' },
  { name: 'Carol',   age: '28', zip: '02148', condition: 'Flu' },
  { name: 'Dave',    age: '26', zip: '02148', condition: 'Arthritis' },
  { name: 'Eve',     age: '55', zip: '02133', condition: 'Flu' },
  { name: 'Frank',   age: '52', zip: '02133', condition: 'Cancer' },
  { name: 'Grace',   age: '59', zip: '02133', condition: 'Heart disease' },
  { name: 'Henry',   age: '34', zip: '02144', condition: 'Flu' },
];

export default function PrivacyViz() {
  const [tab, setTab] = useState<'kanon' | 'dp'>('kanon');

  // k-anonymity state
  const [generalizeAge, setGeneralizeAge] = useState(false);
  const [generalizeZip, setGeneralizeZip] = useState(false);
  const [removeName, setRemoveName] = useState(false);

  // Differential privacy state
  const [epsilon, setEpsilon] = useState(1.0);
  const [trueCount, setTrueCount] = useState(42);
  const [numQueries, setNumQueries] = useState(10);

  const generalizedRows: DatabaseRecord[] = useMemo(() =>
    ORIGINAL_ROWS.map(r => ({
      name: removeName ? '***' : r.name,
      age: generalizeAge ? generalizeField(r.age, 'age') : r.age,
      zip: generalizeZip ? generalizeField(r.zip, 'zip') : r.zip,
      condition: r.condition,
    })),
    [generalizeAge, generalizeZip, removeName],
  );

  const quasiIds: string[] = useMemo(() => {
    const ids: string[] = [];
    if (!removeName) ids.push('name');
    ids.push('age', 'zip');
    return ids;
  }, [removeName]);

  const k = useMemo(() => computeKAnonymity(generalizedRows, quasiIds), [generalizedRows, quasiIds]);

  // Differential privacy simulated responses
  const dpResponses = useMemo(() => {
    const responses: number[] = [];
    for (let i = 0; i < numQueries; i++) {
      responses.push(laplaceNoise(trueCount, 1, epsilon));
    }
    return responses;
  }, [trueCount, epsilon, numQueries]);

  const stdDev = laplaceNoiseStdDev(1, epsilon);

  return (
    <div role="region" aria-label="Privacy Visualization">
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {([
          { id: 'kanon', label: 'k-Anonymity' },
          { id: 'dp', label: 'Differential Privacy' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontSize: '13px', fontWeight: 600,
              background: tab === t.id ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: tab === t.id ? CHAPTER_COLOR : '#9CA3AF',
              outline: tab === t.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kanon' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              A dataset is <strong style={{ color: 'white' }}>k-anonymous</strong> if every record is
              indistinguishable from at least k − 1 others on the <em>quasi-identifiers</em>
              (attributes that could be linked to an individual). Latanya Sweeney (2000) showed
              87% of the U.S. population can be re-identified using just date-of-birth, gender,
              and zip code. Toggle generalizations below to raise the k-anonymity level.
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Remove name', value: removeName, onChange: setRemoveName },
              { label: 'Generalize age to decade', value: generalizeAge, onChange: setGeneralizeAge },
              { label: 'Suppress zip code', value: generalizeZip, onChange: setGeneralizeZip },
            ].map(ctrl => (
              <label key={ctrl.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#E5E7EB' }}>
                <input type="checkbox" checked={ctrl.value} onChange={e => ctrl.onChange(e.target.checked)}
                  style={{ accentColor: CHAPTER_COLOR, width: '16px', height: '16px' }} />
                {ctrl.label}
              </label>
            ))}
          </div>

          {/* k-anonymity badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '8px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '15px',
              background: k >= 3 ? 'rgba(16,185,129,0.12)' : k >= 2 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
              color: k >= 3 ? '#10B981' : k >= 2 ? '#F59E0B' : CHAPTER_COLOR,
              border: `1px solid ${k >= 3 ? 'rgba(16,185,129,0.3)' : k >= 2 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              k = {k}
            </div>
            <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
              {k === 1
                ? 'Some records are unique — directly re-identifiable!'
                : k === 2
                ? 'Every record shares attributes with at least 1 other — moderate protection.'
                : `Every record shares quasi-identifiers with at least ${k - 1} others — good protection.`}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Name', 'Age', 'ZIP', 'Medical Condition'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--surface-3,#242430)', color: '#9CA3AF', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generalizedRows.map((row, i) => {
                  // Highlight unique records
                  const key = quasiIds.map(a => `${a}=${row[a] ?? ''}`).join('|');
                  const count = generalizedRows.filter(r => quasiIds.map(a => `${a}=${r[a] ?? ''}`).join('|') === key).length;
                  const isUnique = count === 1;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isUnique ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      {(['name', 'age', 'zip', 'condition'] as const).map(col => {
                        const isQI = quasiIds.includes(col);
                        const val = String(row[col] ?? '');
                        const generalized = val !== String(ORIGINAL_ROWS[i]?.[col]);
                        return (
                          <td key={col} style={{
                            padding: '8px 12px',
                            color: isUnique && isQI ? CHAPTER_COLOR : generalized ? '#F59E0B' : '#E5E7EB',
                            fontWeight: isUnique && isQI ? 600 : 400,
                          }}>
                            {val}
                            {isUnique && isQI && <span style={{ marginLeft: '4px', fontSize: '11px' }} aria-label="unique — re-identifiable">⚠</span>}
                            {generalized && !isUnique && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#F59E0B' }} aria-label="generalized">(gen)</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '8px' }}>
            Red = unique record (re-identifiable). Yellow = generalized value. Quasi-identifiers: {quasiIds.join(', ')}.
          </p>
        </div>
      )}

      {tab === 'dp' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: 'white' }}>Differential Privacy</strong> (Dwork, 2008) guarantees that
              adding or removing any single person's record changes query answers by at most a small, controlled
              amount. The <strong style={{ color: 'white' }}>Laplace mechanism</strong> adds noise drawn from
              Laplace(0, 1/ε). Smaller ε = more privacy = more noise. Adjust ε and observe how the
              noisy responses cluster around the true count.
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <label>
              <span style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '6px' }}>
                Privacy budget ε: <strong style={{ color: 'white' }}>{epsilon.toFixed(2)}</strong>
              </span>
              <input type="range" min="0.1" max="5" step="0.1" value={epsilon}
                onChange={e => setEpsilon(Number(e.target.value))}
                aria-label="Epsilon (privacy budget)"
                style={{ width: '100%', accentColor: CHAPTER_COLOR }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '6px' }}>
                True count: <strong style={{ color: 'white' }}>{trueCount}</strong>
              </span>
              <input type="range" min="0" max="100" step="1" value={trueCount}
                onChange={e => setTrueCount(Number(e.target.value))}
                aria-label="True query answer"
                style={{ width: '100%', accentColor: '#6366F1' }} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '6px' }}>
                # queries: <strong style={{ color: 'white' }}>{numQueries}</strong>
              </span>
              <input type="range" min="5" max="30" step="1" value={numQueries}
                onChange={e => setNumQueries(Number(e.target.value))}
                aria-label="Number of queries"
                style={{ width: '100%', accentColor: '#10B981' }} />
            </label>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'True count', value: trueCount.toString(), color: '#6366F1' },
              { label: 'Noise σ', value: stdDev.toFixed(2), color: '#F59E0B' },
              { label: 'Privacy ε', value: epsilon.toFixed(2), color: CHAPTER_COLOR },
              { label: 'Privacy level', value: epsilon < 0.5 ? 'High' : epsilon < 2 ? 'Medium' : 'Low', color: epsilon < 0.5 ? '#10B981' : epsilon < 2 ? '#F59E0B' : CHAPTER_COLOR },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 100px', padding: '12px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: `1px solid ${s.color}20`, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart of noisy responses */}
          <div style={{ padding: '16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Noisy Query Responses (each request adds fresh noise)</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
              {/* True count reference line */}
              <div style={{ position: 'relative', width: '100%', height: '80px' }}>
                {/* Responses */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%' }}>
                  {dpResponses.map((r, i) => {
                    const maxVal = Math.max(trueCount * 1.5, ...dpResponses, 10);
                    const h = Math.max(4, (Math.max(0, r) / maxVal) * 72);
                    const isFar = Math.abs(r - trueCount) > stdDev * 2;
                    return (
                      <div key={i} title={`Query ${i + 1}: ${r.toFixed(1)}`}
                        style={{
                          flex: 1, height: `${h}px`, borderRadius: '3px 3px 0 0',
                          background: isFar ? `${CHAPTER_COLOR}90` : '#6366F190',
                          transition: 'height 0.3s',
                        }} />
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6366F1' }}>■ Within 2σ of true count</span>
              <span style={{ fontSize: '12px', color: CHAPTER_COLOR }}>■ More than 2σ away</span>
            </div>
          </div>

          {/* Formula */}
          <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ε-Differential Privacy (Book §28.3.2)</div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#E5E7EB', lineHeight: 1.7 }}>
              |log P(Q(D) = y) − log P(Q(D + r) = y)| ≤ ε
            </div>
            <p style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6, margin: '8px 0 0' }}>
              Whether any single record r is in the database makes at most an ε difference to any
              query response — so individuals have no privacy disincentive to participate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
