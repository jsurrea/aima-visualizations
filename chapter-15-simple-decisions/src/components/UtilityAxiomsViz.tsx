import { useState } from 'react';
import { detectAllaisParadox, checkTransitivity } from '../algorithms';
import type { AllaisChoice, Preference, PreferenceEntry } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

type Tab = 'allais' | 'transitivity';

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };

const LOTTERY_BOX_STYLE: React.CSSProperties = {
  background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', textAlign: 'center' as const,
};

export default function UtilityAxiomsViz() {
  const [tab, setTab] = useState<Tab>('allais');

  // Allais state
  const [choiceAB, setChoiceAB] = useState<'A' | 'B' | null>(null);
  const [choiceCD, setChoiceCD] = useState<'C' | 'D' | null>(null);
  const [paradoxResult, setParadoxResult] = useState<boolean | null>(null);

  // Transitivity state
  const [names, setNames] = useState(['Fast Car', 'Safe Car', 'Cheap Car']);
  const [prefAB, setPrefAB] = useState<Preference>('preferred');
  const [prefBC, setPrefBC] = useState<Preference>('preferred');
  const [prefAC, setPrefAC] = useState<Preference>('preferred');
  const [violations, setViolations] = useState<ReturnType<typeof checkTransitivity> | null>(null);

  const checkParadox = () => {
    if (choiceAB && choiceCD) {
      setParadoxResult(detectAllaisParadox({ choiceAB, choiceCD } as AllaisChoice));
    }
  };

  const checkTrans = () => {
    const n0 = names[0] ?? 'A';
    const n1 = names[1] ?? 'B';
    const n2 = names[2] ?? 'C';
    const prefs: PreferenceEntry[] = [
      { optionA: n0, optionB: n1, preference: prefAB },
      { optionA: n1, optionB: n2, preference: prefBC },
      { optionA: n0, optionB: n2, preference: prefAC },
    ];
    setViolations(checkTransitivity(prefs));
  };

  const btnBase: React.CSSProperties = { border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };

  const tabBtn = (active: boolean) => ({
    ...btnBase, background: active ? '#6366F1' : '#242430', color: active ? 'white' : '#9CA3AF', border: 'none',
  });

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.2 Utility Axioms &amp; Paradoxes</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Rational preferences must satisfy orderability, transitivity, continuity, substitutability, monotonicity, and decomposability.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button aria-pressed={tab === 'allais'} onClick={() => setTab('allais')} style={tabBtn(tab === 'allais')}>Allais Paradox</button>
        <button aria-pressed={tab === 'transitivity'} onClick={() => setTab('transitivity')} style={tabBtn(tab === 'transitivity')}>Transitivity Checker</button>
      </div>

      {tab === 'allais' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '16px' }}>
            Select one option from each choice. Many people's preferences violate expected utility theory here.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={LOTTERY_BOX_STYLE}>
              <div style={{ color: '#EC4899', fontWeight: 700, marginBottom: '8px' }}>Choice 1</div>
              <button aria-label="Choose A: 80% chance of $4000" onClick={() => { setChoiceAB('A'); setParadoxResult(null); }}
                style={{ ...btnBase, display: 'block', width: '100%', marginBottom: '8px', background: choiceAB === 'A' ? '#6366F1' : '#242430', color: choiceAB === 'A' ? 'white' : '#E5E7EB', border: choiceAB === 'A' ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)' }}>
                A: 80% → $4,000
              </button>
              <button aria-label="Choose B: 100% chance of $3000" onClick={() => { setChoiceAB('B'); setParadoxResult(null); }}
                style={{ ...btnBase, display: 'block', width: '100%', background: choiceAB === 'B' ? '#6366F1' : '#242430', color: choiceAB === 'B' ? 'white' : '#E5E7EB', border: choiceAB === 'B' ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)' }}>
                B: 100% → $3,000
              </button>
            </div>
            <div style={LOTTERY_BOX_STYLE}>
              <div style={{ color: '#EC4899', fontWeight: 700, marginBottom: '8px' }}>Choice 2</div>
              <button aria-label="Choose C: 20% chance of $4000" onClick={() => { setChoiceCD('C'); setParadoxResult(null); }}
                style={{ ...btnBase, display: 'block', width: '100%', marginBottom: '8px', background: choiceCD === 'C' ? '#6366F1' : '#242430', color: choiceCD === 'C' ? 'white' : '#E5E7EB', border: choiceCD === 'C' ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)' }}>
                C: 20% → $4,000
              </button>
              <button aria-label="Choose D: 25% chance of $3000" onClick={() => { setChoiceCD('D'); setParadoxResult(null); }}
                style={{ ...btnBase, display: 'block', width: '100%', background: choiceCD === 'D' ? '#6366F1' : '#242430', color: choiceCD === 'D' ? 'white' : '#E5E7EB', border: choiceCD === 'D' ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)' }}>
                D: 25% → $3,000
              </button>
            </div>
          </div>
          <button
            aria-label="Check for Allais paradox"
            onClick={checkParadox}
            disabled={!choiceAB || !choiceCD}
            style={{ background: choiceAB && choiceCD ? '#6366F1' : '#242430', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: choiceAB && choiceCD ? 'pointer' : 'default', fontSize: '14px', marginBottom: '12px' }}
          >Check for Paradox</button>
          {paradoxResult !== null && (
            <div style={{ padding: '12px', borderRadius: '8px', background: paradoxResult ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${paradoxResult ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
              {paradoxResult ? (
                <div>
                  <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: '6px' }}>⚠ Allais Paradox Detected</div>
                  <div style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '8px' }}>Your choices violate expected utility theory. Choosing B implies U(3000) &gt; 0.8·U(4000), which requires D ≻ C — but you chose C.</div>
                  <span dangerouslySetInnerHTML={{ __html: renderInlineMath('B \\succ A \\Rightarrow U(3000) > 0.8 \\cdot U(4000) \\Rightarrow D \\succ C') }} />
                </div>
              ) : (
                <div>
                  <div style={{ color: '#10B981', fontWeight: 700, marginBottom: '6px' }}>✓ Choices are Consistent</div>
                  <div style={{ color: '#9CA3AF', fontSize: '13px' }}>Your choices are consistent with expected utility theory.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'transitivity' && (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '16px' }}>
            Enter option names and pairwise preferences. If A ≻ B and B ≻ C, transitivity requires A ≻ C.
          </p>
          <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#9CA3AF', fontSize: '13px', width: '60px' }}>Option {String.fromCharCode(65 + i)}:</span>
                <input
                  aria-label={`Option ${String.fromCharCode(65 + i)} name`}
                  style={{ background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '6px 10px', fontSize: '13px', width: '140px' }}
                  value={names[i] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: `${names[0] ?? 'A'} vs ${names[1] ?? 'B'}`, value: prefAB, set: setPrefAB },
              { label: `${names[1] ?? 'B'} vs ${names[2] ?? 'C'}`, value: prefBC, set: setPrefBC },
              { label: `${names[0] ?? 'A'} vs ${names[2] ?? 'C'}`, value: prefAC, set: setPrefAC },
            ].map(({ label, value, set }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#E5E7EB', fontSize: '13px', width: '160px' }}>{label}:</span>
                <select
                  aria-label={`Preference: ${label}`}
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { set(e.target.value as Preference); setViolations(null); }}
                  style={{ background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '6px 10px', fontSize: '13px' }}
                >
                  <option value="preferred">Preferred (A ≻ B)</option>
                  <option value="indifferent">Indifferent (A ~ B)</option>
                  <option value="dispreferred">Dispreferred (A ≺ B)</option>
                </select>
              </div>
            ))}
          </div>
          <button
            aria-label="Check transitivity"
            onClick={checkTrans}
            style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}
          >Check Transitivity</button>
          {violations !== null && (
            <div style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
              {violations.length === 0 ? (
                <div style={{ color: '#10B981', fontWeight: 600 }}>✓ No transitivity violations found</div>
              ) : (
                <div>
                  <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: '8px' }}>⚠ {violations.length} violation{violations.length > 1 ? 's' : ''} found</div>
                  {violations.map((v, i) => (
                    <div key={i} style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '6px' }}>{v.description}</div>
                  ))}
                  {violations.length > 0 && violations[0] !== undefined && (
                    <svg width="200" height="120" aria-label="Preference cycle diagram" style={{ marginTop: '12px' }}>
                      {[
                        { cx: 100, cy: 20, label: violations[0].options[0] ?? 'A' },
                        { cx: 30, cy: 100, label: violations[0].options[1] ?? 'B' },
                        { cx: 170, cy: 100, label: violations[0].options[2] ?? 'C' },
                      ].map((n, i) => (
                        <g key={i}>
                          <circle cx={n.cx} cy={n.cy} r={22} fill="#1A1A24" stroke="#EF4444" strokeWidth={2} />
                          <text x={n.cx} y={n.cy + 5} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>{String(n.label).slice(0, 8)}</text>
                        </g>
                      ))}
                      <defs>
                        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L8,3 z" fill="#EF4444" />
                        </marker>
                      </defs>
                      <line x1={85} y1={35} x2={45} y2={85} stroke="#EF4444" strokeWidth={1.5} markerEnd="url(#arr)" />
                      <line x1={50} y1={100} x2={145} y2={100} stroke="#EF4444" strokeWidth={1.5} markerEnd="url(#arr)" />
                      <line x1={155} y1={85} x2={115} y2={35} stroke="#EF4444" strokeWidth={1.5} markerEnd="url(#arr)" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
