import { useState, useMemo } from 'react';
import { offSwitchGame, computeEUWithUncertainUtility } from '../algorithms';
import type { UncertainUtilityAction } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

type Tab = 'uncertain' | 'offswitch';

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };

export default function UnknownPreferencesViz() {
  const [tab, setTab] = useState<Tab>('uncertain');

  // Uncertain utility tab
  const [pLikeDurian, setPLikeDurian] = useState(0.3);

  const euValues = useMemo(() => {
    const p = pLikeDurian;
    const durianAction: UncertainUtilityAction = {
      name: 'Buy Durian',
      outcomes: [
        { state: 'like', probability: p, possibleUtilities: [{ utility: 100, probability: 1 }] },
        { state: 'dislike', probability: 1 - p, possibleUtilities: [{ utility: -80, probability: 1 }] },
      ],
    };
    const vanillaAction: UncertainUtilityAction = {
      name: 'Buy Vanilla',
      outcomes: [{ state: 'eat', probability: 1, possibleUtilities: [{ utility: 20, probability: 1 }] }],
    };
    const skipAction: UncertainUtilityAction = {
      name: "Don't Buy",
      outcomes: [{ state: 'skip', probability: 1, possibleUtilities: [{ utility: 0, probability: 1 }] }],
    };
    return [
      { name: durianAction.name, eu: computeEUWithUncertainUtility(durianAction) },
      { name: vanillaAction.name, eu: computeEUWithUncertainUtility(vanillaAction) },
      { name: skipAction.name, eu: computeEUWithUncertainUtility(skipAction) },
    ];
  }, [pLikeDurian]);

  const maxEU = Math.max(...euValues.map(e => e.eu));

  // Off-switch tab
  const [actionValueMin, setActionValueMin] = useState(-50);
  const [actionValueMax, setActionValueMax] = useState(100);
  const [humanErrorProbability, setHumanErrorProbability] = useState(0.1);

  const offSwitchResult = useMemo(() =>
    offSwitchGame({ actionValueMin, actionValueMax, humanErrorProbability }),
    [actionValueMin, actionValueMax, humanErrorProbability]
  );

  const euBoxes = [
    { label: 'EU(Act)', value: offSwitchResult.euAct },
    { label: 'EU(Switch Off)', value: offSwitchResult.euSwitchOff },
    { label: 'EU(Defer)', value: offSwitchResult.euDefer },
  ];
  const maxOffEU = Math.max(...euBoxes.map(b => b.value));

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#6366F1' : '#242430', color: active ? 'white' : '#9CA3AF',
    border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  });

  const sliderRow = (label: string, value: number, min: number, max: number, step: number, ariaLabel: string, onChange: (v: number) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ color: '#9CA3AF', fontSize: '13px', minWidth: '160px' }}>{label}:</span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={ariaLabel}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
        style={{ width: '160px' }} />
      <span style={{ color: '#E5E7EB', fontSize: '13px', minWidth: '50px' }}>{value}</span>
    </div>
  );

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.7 Unknown Preferences &amp; Off-Switch</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        When utility functions are uncertain, agents should defer to humans. The off-switch game shows why corrigible AI is rational.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button aria-pressed={tab === 'uncertain'} onClick={() => setTab('uncertain')} style={tabBtnStyle(tab === 'uncertain')}>Uncertain Utility</button>
        <button aria-pressed={tab === 'offswitch'} onClick={() => setTab('offswitch')} style={tabBtnStyle(tab === 'offswitch')}>Off-Switch Game</button>
      </div>

      {tab === 'uncertain' && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('EU(\\text{durian}) = p \\cdot 100 + (1-p) \\cdot (-80)') }} />
          </div>
          {sliderRow('P(like durian)', pLikeDurian, 0, 1, 0.01, 'Probability of liking durian', setPLikeDurian)}
          <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
            {euValues.map(({ name, eu }) => {
              const isBest = eu === maxEU;
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: isBest ? 'rgba(16,185,129,0.1)' : '#1A1A24', border: `1px solid ${isBest ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  <span style={{ color: isBest ? '#10B981' : 'white', fontWeight: isBest ? 700 : 400, flex: 1 }}>{name}</span>
                  <div style={{ flex: 2, background: '#242430', borderRadius: '4px', height: '8px', position: 'relative' as const }}>
                    <div style={{
                      width: `${Math.max(0, Math.min(100, (eu + 80) / 180 * 100))}%`,
                      height: '8px', borderRadius: '4px',
                      background: isBest ? '#10B981' : eu < 0 ? '#EF4444' : '#6366F1',
                    }} />
                  </div>
                  <span style={{ color: isBest ? '#10B981' : eu < 0 ? '#EF4444' : '#E5E7EB', fontWeight: 700, minWidth: '60px', textAlign: 'right' as const }}>
                    EU = {eu.toFixed(1)}
                  </span>
                  {isBest && <span style={{ color: '#10B981', fontSize: '12px' }}>★ Best</span>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', color: '#9CA3AF', fontSize: '13px' }}>
            Break-even: p = 0.44 (where EU(Durian) = EU(Vanilla))
          </div>
        </div>
      )}

      {tab === 'offswitch' && (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('EU(\\text{defer}) = \\int P(u) \\cdot u \\, du') }} />
          </div>
          {sliderRow('Action value min', actionValueMin, -100, 0, 1, 'Minimum action value', setActionValueMin)}
          {sliderRow('Action value max', actionValueMax, 0, 200, 1, 'Maximum action value', setActionValueMax)}
          {sliderRow('Human error prob', humanErrorProbability, 0, 0.5, 0.01, 'Human error probability', setHumanErrorProbability)}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px', marginBottom: '12px' }}>
            {euBoxes.map(({ label, value }) => {
              const isBest = value === maxOffEU;
              return (
                <div key={label} style={{ background: '#1A1A24', border: `2px solid ${isBest ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
                  <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>{label}</div>
                  <div style={{ color: isBest ? '#F59E0B' : value < 0 ? '#EF4444' : '#E5E7EB', fontWeight: 700, fontSize: '22px' }}>{value.toFixed(2)}</div>
                  {isBest && <div style={{ color: '#F59E0B', fontSize: '11px', marginTop: '4px' }}>★ Best</div>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ padding: '8px 14px', borderRadius: '20px', background: offSwitchResult.shouldDefer ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: offSwitchResult.shouldDefer ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: '13px' }}>
              {offSwitchResult.shouldDefer ? '✓ Should Defer' : '✗ Should Act Directly'}
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '20px', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '13px' }}>
              Deference margin: <span style={{ color: '#E5E7EB', fontWeight: 700 }}>{offSwitchResult.deferenceMargin.toFixed(2)}</span>
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '20px', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '13px' }}>
              P(human switches off): <span style={{ color: '#E5E7EB', fontWeight: 700 }}>{offSwitchResult.pHumanSwitchesOff.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
