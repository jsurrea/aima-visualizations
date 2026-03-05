import { useState } from 'react';
import { computeMEU } from '../algorithms';
import type { Action } from '../algorithms';
import { renderDisplayMath } from '../utils/mathUtils';

const DEFAULT_ACTIONS: Action[] = [
  { name: 'Action A', outcomes: [{ probability: 0.8, utility: 10 }, { probability: 0.2, utility: -5 }] },
  { name: 'Action B', outcomes: [{ probability: 0.5, utility: 8 }, { probability: 0.5, utility: 2 }] },
];

const cardStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' };
const inputStyle: React.CSSProperties = { background: '#242430', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', padding: '4px 8px', width: '72px', fontSize: '13px' };
const labelStyle: React.CSSProperties = { color: '#9CA3AF', fontSize: '12px', marginRight: '4px' };

export default function MEUExplorer() {
  const [actions, setActions] = useState<Action[]>(DEFAULT_ACTIONS);
  const [result, setResult] = useState<ReturnType<typeof computeMEU> | null>(null);

  const updateName = (idx: number, value: string) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, name: value } : a));
  };

  const updateOutcome = (aIdx: number, oIdx: number, field: 'probability' | 'utility', value: number) => {
    setActions(prev => prev.map((a, i) => {
      if (i !== aIdx) return a;
      const newOutcomes = a.outcomes.map((o, j) => {
        if (j !== oIdx) return o;
        return { ...o, [field]: value };
      });
      // Auto-normalize: if changing probability[0], set probability[1] = 1 - p[0]
      if (field === 'probability' && oIdx === 0 && newOutcomes.length === 2) {
        const p0 = Math.min(1, Math.max(0, value));
        return { ...a, outcomes: [{ ...newOutcomes[0]!, probability: p0 }, { ...newOutcomes[1]!, probability: Math.round((1 - p0) * 100) / 100 }] };
      }
      return { ...a, outcomes: newOutcomes };
    }));
    setResult(null);
  };

  const addAction = () => {
    if (actions.length >= 4) return;
    const letter = String.fromCharCode(65 + actions.length);
    setActions(prev => [...prev, { name: `Action ${letter}`, outcomes: [{ probability: 0.5, utility: 5 }, { probability: 0.5, utility: -5 }] }]);
    setResult(null);
  };

  const removeAction = (idx: number) => {
    if (actions.length <= 1) return;
    setActions(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const compute = () => setResult(computeMEU(actions));

  return (
    <div style={cardStyle}>
      <h3 style={{ color: '#EC4899', fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>§15.1 Maximum Expected Utility</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Compare actions by their expected utility. The MEU principle states that a rational agent should choose the action maximizing expected utility.
      </p>
      <div style={{ marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: renderDisplayMath('EU(a) = \\sum_i P(s_i) \\cdot U(s_i)') }} />

      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
        {actions.map((action, aIdx) => (
          <div key={aIdx} style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={labelStyle}>Name:</span>
              <input
                aria-label={`Action ${aIdx + 1} name`}
                style={{ ...inputStyle, width: '100px' }}
                value={action.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateName(aIdx, e.target.value)}
              />
              {actions.length > 1 && (
                <button
                  aria-label={`Remove ${action.name}`}
                  onClick={() => removeAction(aIdx)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#9CA3AF', padding: '2px 8px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}
                >✕</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[0, 1].map(oIdx => {
                const o = action.outcomes[oIdx] ?? { probability: 0.5, utility: 0 };
                return (
                  <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#6366F1', fontSize: '12px', fontWeight: 600 }}>O{oIdx + 1}:</span>
                    <span style={labelStyle}>P=</span>
                    <input
                      type="number" min={0} max={1} step={0.01}
                      aria-label={`Action ${aIdx + 1} outcome ${oIdx + 1} probability`}
                      style={inputStyle}
                      value={o.probability}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOutcome(aIdx, oIdx, 'probability', parseFloat(e.target.value) || 0)}
                    />
                    <span style={labelStyle}>U=</span>
                    <input
                      type="number" step={1}
                      aria-label={`Action ${aIdx + 1} outcome ${oIdx + 1} utility`}
                      style={inputStyle}
                      value={o.utility}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOutcome(aIdx, oIdx, 'utility', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {actions.length < 4 && (
          <button
            aria-label="Add action"
            onClick={addAction}
            style={{ background: '#242430', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
          >+ Add Action</button>
        )}
        <button
          aria-label="Compute maximum expected utility"
          onClick={compute}
          style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
        >Compute MEU</button>
      </div>

      {result && (
        <div style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
          <div style={{ fontWeight: 600, color: '#E5E7EB', marginBottom: '8px' }}>Results</div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {result.steps.map((step, i) => {
              const isBest = step.actionName === result.bestAction;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: isBest ? 'rgba(16,185,129,0.1)' : 'transparent', border: isBest ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent' }}>
                  <span style={{ color: isBest ? '#10B981' : '#E5E7EB', fontWeight: isBest ? 700 : 400 }}>{step.actionName}</span>
                  <span style={{ color: '#9CA3AF', fontSize: '13px', fontFamily: 'monospace' }}>{step.calculation}</span>
                  <span style={{ color: isBest ? '#10B981' : '#E5E7EB', fontWeight: 700 }}>EU={step.expectedUtility.toFixed(2)}</span>
                  {isBest && <span style={{ color: '#10B981', fontSize: '12px', marginLeft: '8px' }}>★ Best</span>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', color: '#10B981', fontWeight: 600, fontSize: '14px' }}>
            Best Action: {result.bestAction} — EU = {result.bestEU.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}
