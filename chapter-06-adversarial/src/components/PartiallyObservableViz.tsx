import { useState, useMemo } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';

const BELIEF_FORMULA = String.raw`V(b) = \sum_{s} b(s) \cdot V^*(s)`;
const EV_BET_FORMULA = String.raw`\mathbb{E}[\text{Bet}] = P(\text{Jack}) \cdot (+3) + P(\text{Ace}) \cdot (-3)`;
const EV_FOLD_FORMULA = String.raw`\mathbb{E}[\text{Fold}] = -1`;

interface Action {
  name: string;
  evFunc: (pAce: number) => number;
  formula: string;
}

const ACTIONS: Action[] = [
  {
    name: 'Bet',
    evFunc: (pAce) => (1 - pAce) * 3 + pAce * -3,
    formula: EV_BET_FORMULA,
  },
  {
    name: 'Fold',
    evFunc: () => -1,
    formula: EV_FOLD_FORMULA,
  },
];

function ProbBar({ pAce }: { pAce: number }) {
  const pJack = 1 - pAce;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', height: '28px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
        <div
          style={{
            width: `${pAce * 100}%`, background: '#EF4444', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white',
            transition: 'width 0.3s',
          }}
        >
          {pAce > 0.1 && `Ace ${(pAce * 100).toFixed(0)}%`}
        </div>
        <div
          style={{
            flex: 1, background: '#10B981', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white',
            transition: 'all 0.3s',
          }}
        >
          {pJack > 0.1 && `Jack ${(pJack * 100).toFixed(0)}%`}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
        <span>🂡 Ace (beats King) — MAX loses</span>
        <span>Jack (loses to King) — MAX wins 🂫</span>
      </div>
    </div>
  );
}

export function PartiallyObservableViz() {
  const [pAce, setPAce] = useState(0.5);
  const [perfectInfo, setPerfectInfo] = useState(false);
  const [knownCard, setKnownCard] = useState<'ace' | 'jack' | null>(null);

  const pJack = 1 - pAce;

  const evBet = useMemo(() => (1 - pAce) * 3 + pAce * -3, [pAce]);
  const evFold = -1;

  const imperfectOptimal = evBet > evFold ? 'Bet' : 'Fold';
  const perfectOptimalAce = 'Fold'; // Against Ace, always fold
  const perfectOptimalJack = 'Bet'; // Against Jack, always bet

  const perfectOptimal = knownCard === 'ace' ? perfectOptimalAce : knownCard === 'jack' ? perfectOptimalJack : '—';

  return (
    <section aria-labelledby="partial-obs-title" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id="partial-obs-title" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          §6.6 Partially Observable Games
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
          MAX holds a <strong style={{ color: '#6366F1' }}>King</strong>. MIN's card is hidden — it could be an Ace (beats King) or a Jack (loses to King).
          MAX must decide whether to <em>Bet</em> (wager 3 points) or <em>Fold</em> (lose 1 point), relying on a <em>belief state</em>.
        </p>
      </div>

      {/* Belief-state formula */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: renderDisplayMath(BELIEF_FORMULA) }} />

      {/* Belief state bar */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Belief State</h3>
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
            {'b = {'}Ace: {(pAce * 100).toFixed(0)}%, Jack: {(pJack * 100).toFixed(0)}%{'}'}
          </span>
        </div>
        <ProbBar pAce={pAce} />
      </div>

      {/* Probability slider */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
        <label htmlFor="pace-slider" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
          P(Ace): <strong style={{ color: '#EF4444' }}>{pAce.toFixed(2)}</strong> &nbsp;|&nbsp; P(Jack): <strong style={{ color: '#10B981' }}>{pJack.toFixed(2)}</strong>
        </label>
        <input
          id="pace-slider"
          type="range" min={0} max={1} step={0.05}
          value={pAce}
          onChange={e => setPAce(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#EF4444' }}
          aria-label="Adjust probability of opponent holding Ace"
        />
      </div>

      {/* Info mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 600 }}>Information mode:</span>
        <button
          onClick={() => { setPerfectInfo(false); setKnownCard(null); }}
          aria-pressed={!perfectInfo}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
            borderColor: !perfectInfo ? '#6366F1' : 'var(--surface-border)',
            background: !perfectInfo ? '#6366F120' : 'var(--surface-2)',
            color: !perfectInfo ? '#6366F1' : '#9CA3AF', cursor: 'pointer', fontSize: '14px',
          }}
        >🌫️ Imperfect Info</button>
        <button
          onClick={() => setPerfectInfo(true)}
          aria-pressed={perfectInfo}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid',
            borderColor: perfectInfo ? '#10B981' : 'var(--surface-border)',
            background: perfectInfo ? '#10B98120' : 'var(--surface-2)',
            color: perfectInfo ? '#10B981' : '#9CA3AF', cursor: 'pointer', fontSize: '14px',
          }}
        >👁️ Perfect Info</button>
      </div>

      {perfectInfo && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: '#9CA3AF', marginBottom: '10px', fontSize: '14px' }}>
            With <strong>perfect information</strong>, MAX can see MIN's card. Choose MIN's card to see the optimal decision:
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setKnownCard('ace')}
              aria-pressed={knownCard === 'ace'}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: '2px solid',
                borderColor: knownCard === 'ace' ? '#EF4444' : 'var(--surface-border)',
                background: knownCard === 'ace' ? '#EF444420' : 'var(--surface-3)',
                color: knownCard === 'ace' ? '#EF4444' : '#9CA3AF',
                cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              }}
            >🂡 MIN has Ace</button>
            <button
              onClick={() => setKnownCard('jack')}
              aria-pressed={knownCard === 'jack'}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: '2px solid',
                borderColor: knownCard === 'jack' ? '#10B981' : 'var(--surface-border)',
                background: knownCard === 'jack' ? '#10B98120' : 'var(--surface-3)',
                color: knownCard === 'jack' ? '#10B981' : '#9CA3AF',
                cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              }}
            >🂫 MIN has Jack</button>
          </div>
        </div>
      )}

      {/* Decision tree comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {ACTIONS.map(action => {
          const ev = action.evFunc(pAce);
          const isOptimal = !perfectInfo && action.name === imperfectOptimal;
          return (
            <div
              key={action.name}
              style={{
                background: 'var(--surface-2)', borderRadius: '12px', padding: '16px',
                border: `2px solid ${isOptimal ? '#6366F1' : 'var(--surface-border)'}`,
                boxShadow: isOptimal ? '0 0 12px #6366F140' : 'none',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', color: isOptimal ? '#6366F1' : 'white' }}>
                {action.name} {isOptimal && '✓ Optimal'}
              </h3>
              <div
                style={{ marginBottom: '10px', overflowX: 'auto', fontSize: '13px' }}
                dangerouslySetInnerHTML={{ __html: renderDisplayMath(action.formula) }}
              />
              <p style={{ fontSize: '18px', fontWeight: 700, color: ev > 0 ? '#10B981' : ev < 0 ? '#EF4444' : '#9CA3AF', margin: '4px 0' }}>
                EV = {ev.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Perfect info result */}
      {perfectInfo && knownCard && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #10B981' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#10B981', marginBottom: '6px' }}>Perfect Info — Optimal Decision</h3>
          <p style={{ color: '#D1D5DB', fontSize: '14px' }}>
            MIN holds an <strong style={{ color: knownCard === 'ace' ? '#EF4444' : '#10B981' }}>
              {knownCard === 'ace' ? 'Ace' : 'Jack'}
            </strong>.
            MAX should <strong style={{ color: '#6366F1' }}>{perfectOptimal}</strong>.
            {knownCard === 'ace'
              ? ' (Folding avoids the certain −3 loss from betting against a winning Ace.)'
              : ' (Betting wins +3 against the Jack.)'}
          </p>
          <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '8px' }}>
            Compare with imperfect info: optimal action is <strong>{imperfectOptimal}</strong> (EV = {Math.max(evBet, evFold).toFixed(2)}).
            {perfectOptimal !== imperfectOptimal && ' ⚠️ The decisions differ — hidden information changes the strategy!'}
          </p>
        </div>
      )}

      {/* Imperfect info summary */}
      {!perfectInfo && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${evBet > evFold ? '#6366F1' : '#F59E0B'}` }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: evBet > evFold ? '#6366F1' : '#F59E0B' }}>
            Imperfect Info — Optimal Decision: <strong>{imperfectOptimal}</strong>
          </h3>
          <p style={{ color: '#D1D5DB', fontSize: '14px' }}>
            Expected value of Bet = <span style={{ color: evBet > 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{evBet.toFixed(2)}</span>.
            Expected value of Fold = <span style={{ color: '#9CA3AF', fontWeight: 700 }}>−1.00</span>.
          </p>
          <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '6px' }}>
            {/* Breakeven: EV(Bet) = EV(Fold) ⟹ (1-p)·3 + p·(−3) = −1 ⟹ 3−6p = −1 ⟹ p = 4/6 ≈ 0.67, so fold wins when p(Ace) > 0.67; the 0.33 displayed is p(Jack) at that same threshold */}
            Adjust P(Ace) above. When P(Ace) {'>'} 0.67, folding becomes optimal since betting yields EV {'<'} −1.
          </p>
        </div>
      )}
    </section>
  );
}
