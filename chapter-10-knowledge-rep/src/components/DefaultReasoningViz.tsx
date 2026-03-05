import { useState } from 'react';
import {
  nixonDiamond,
  computeDefaultExtension,
  jtmsAdd,
  jtmsRetract,
  circumscribe,
  type DefaultStep,
  type JTMSNode,
  type JTMSStep,
  type DefaultFact,
  type DefaultRule,
} from '../algorithms/index.js';
import { renderInlineMath } from '../utils/mathUtils.js';

// ─── Nixon Diamond Sub-viz ────────────────────────────────────────────────────

function NixonDiamondSub() {
  const diamond = nixonDiamond();
  const [stepIdx1, setStepIdx1] = useState(0);
  const [stepIdx2, setStepIdx2] = useState(0);
  const [priority, setPriority] = useState<'none' | 'quaker' | 'republican'>('none');

  const ext1 = diamond.extension1;
  const ext2 = diamond.extension2;
  const step1 = ext1[stepIdx1] ?? ext1[0]!;
  const step2 = ext2[stepIdx2] ?? ext2[0]!;

  // Priority circumscription: choose one extension based on priority
  const prioritizedFacts = priority === 'none' ? null :
    priority === 'quaker'
      ? [...ext1[ext1.length - 1]!.conclusions]
      : [...ext2[ext2.length - 1]!.conclusions];

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>
        Nixon is both Quaker (default: pacifist) and Republican (default: ¬pacifist) — two preferred models.
      </p>
      <div style={{ marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: renderInlineMath(
        '\\text{Quaker}(x) : \\text{Pacifist}(x) / \\text{Pacifist}(x) \\quad \\text{Republican}(x) : \\lnot\\text{Pacifist}(x) / \\lnot\\text{Pacifist}(x)'
      ) }} />

      {/* Two models side-by-side */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Extension 1 (Pacifist wins)', steps: ext1, stepIdx: stepIdx1, setIdx: setStepIdx1, step: step1, color: '#10B981' },
          { label: 'Extension 2 (¬Pacifist wins)', steps: ext2, stepIdx: stepIdx2, setIdx: setStepIdx2, step: step2, color: '#EF4444' },
        ].map(({ label, steps, stepIdx, setIdx, step, color }) => (
          <div key={label} style={{ flex: '1 1 220px', background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: `1px solid ${color}30` }}>
            <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Previous">◀</button>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stepIdx + 1}/{steps.length}</span>
              <button onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={smallBtnStyle} aria-label="Next">▶</button>
            </div>
            <div style={{ fontSize: 11, color: '#E5E7EB', marginBottom: 6 }}>{step.action}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {step.conclusions.map(c => (
                <span key={c} style={{
                  background: c.includes('Pacifist') ? color + '20' : 'var(--surface-3)',
                  border: `1px solid ${c.includes('Pacifist') ? color : 'var(--surface-border)'}`,
                  borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#E5E7EB',
                }}>{c}</span>
              ))}
            </div>
            {step.blocked.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>
                Blocked: {step.blocked.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Priority circumscription */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>
          What-If: Prioritized Circumscription
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['none', 'quaker', 'republican'] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)} style={{
              background: priority === p ? '#8B5CF6' : 'var(--surface-3)',
              border: 'none', borderRadius: 6, color: '#fff', padding: '4px 12px', fontSize: 12, cursor: 'pointer',
            }}>{p === 'none' ? 'No priority' : p === 'quaker' ? 'Religious > Political' : 'Political > Religious'}</button>
          ))}
        </div>
        {prioritizedFacts && (
          <div style={{ fontSize: 12, color: '#10B981' }}>
            Unique model: {prioritizedFacts.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default Logic Sub-viz ────────────────────────────────────────────────────

const TWEETY_FACTS_BASE: ReadonlyArray<DefaultFact> = [
  { id: 'f1', formula: 'Bird(Tweety)' },
  { id: 'f2', formula: 'Penguin(Tweety)' },
  { id: 'f3', formula: '¬Flies(Tweety)' },
];

const TWEETY_RULES: ReadonlyArray<DefaultRule> = [
  { id: 'r1', prerequisite: 'Penguin(Tweety)', justification: '¬Flies(Tweety)', conclusion: '¬Flies(Tweety)' },
  { id: 'r2', prerequisite: 'Bird(Tweety)', justification: 'Flies(Tweety)', conclusion: 'Flies(Tweety)' },
];

function DefaultLogicSub() {
  const [includePenguin, setIncludePenguin] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);

  const facts = includePenguin ? TWEETY_FACTS_BASE : TWEETY_FACTS_BASE.filter(f => f.id !== 'f2' && f.id !== 'f3');
  const steps = computeDefaultExtension(facts, TWEETY_RULES);
  const currentStep: DefaultStep = steps[stepIdx] ?? steps[0]!;

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>
        Reiter default logic: Bird(Tweety), Penguins don't fly. Which extension results?
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E5E7EB', marginBottom: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={includePenguin}
          onChange={e => { setIncludePenguin(e.target.checked); setStepIdx(0); }}
          aria-label="Include Penguin fact"
        />
        What-If: Tweety <strong style={{ color: includePenguin ? '#EF4444' : '#10B981' }}>
          {includePenguin ? 'IS' : 'is NOT'}
        </strong> a Penguin
      </label>

      {/* Rules display */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TWEETY_RULES.map(r => (
          <div key={r.id} style={{
            background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', flex: '1 1 180px',
            border: '1px solid var(--surface-border)',
          }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Rule {r.id}</div>
            <div dangerouslySetInnerHTML={{ __html: renderInlineMath(
              `\\frac{${r.prerequisite} : ${r.justification}}{${r.conclusion}}`
            ) }} />
          </div>
        ))}
      </div>

      {/* Step controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Previous">◀</button>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{stepIdx + 1}/{steps.length}</span>
        <button onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={smallBtnStyle} aria-label="Next">▶</button>
        <button onClick={() => setStepIdx(0)} style={smallBtnStyle} aria-label="Reset">Reset</button>
      </div>

      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: '#E5E7EB', marginBottom: 8 }}>{currentStep.action}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {currentStep.conclusions.map(c => (
            <span key={c} style={{
              background: 'var(--surface-3)', borderRadius: 4, padding: '2px 8px', fontSize: 12,
              border: '1px solid var(--surface-border)', color: '#E5E7EB',
            }}>{c}</span>
          ))}
        </div>
        {currentStep.blocked.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>
            Blocked rules: {currentStep.blocked.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JTMS Sub-viz ─────────────────────────────────────────────────────────────

function buildInitialKB(): ReadonlyMap<string, JTMSNode> {
  let kb: ReadonlyMap<string, JTMSNode> = new Map();
  kb = jtmsAdd(kb, 'P', []).newKb;
  kb = jtmsAdd(kb, 'R', []).newKb;
  kb = jtmsAdd(kb, 'Q', ['P', 'P⇒Q']).newKb;
  kb = jtmsAdd(kb, 'P⇒Q', []).newKb;
  kb = jtmsAdd(kb, 'P∨R⇒Q', []).newKb;
  kb = jtmsAdd(kb, 'Q', ['R', 'P∨R⇒Q']).newKb;
  return kb;
}

// Sentences that are user assertions (retractable ground facts)
const JTMS_RETRACTABLE = new Set(['P', 'R']);

function JTMSSub() {
  const [kb, setKb] = useState<ReadonlyMap<string, JTMSNode>>(buildInitialKB);
  const [allSteps, setAllSteps] = useState<ReadonlyArray<JTMSStep>>([]);
  const [stepIdx, setStepIdx] = useState(0);

  const doRetract = (sentence: string) => {
    const { newKb, steps } = jtmsRetract(kb, sentence);
    setKb(newKb);
    setAllSteps(prev => [...prev, ...steps]);
    setStepIdx(prev => prev + steps.length - 1 < 0 ? 0 : prev + steps.length);
  };

  const reset = () => {
    setKb(buildInitialKB());
    setAllSteps([]);
    setStepIdx(0);
  };

  const currentStep = allSteps[stepIdx] ?? null;
  const displayKB = currentStep ? currentStep.kb : [...kb.entries()].map(([s, n]) => ({ sentence: s, inKB: n.inKB }));

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>
        JTMS: retract beliefs and watch justification-based propagation update the KB.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* KB display */}
        <div style={{ flex: '1 1 180px' }}>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Belief Base</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayKB.map(({ sentence, inKB }) => (
              <div key={sentence} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px',
                border: `1px solid ${inKB ? '#10B981' : 'var(--surface-border)'}`,
                opacity: inKB ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 13 }}>{inKB ? '✓' : '✗'}</span>
                <span style={{ fontSize: 13, color: inKB ? '#E5E7EB' : '#6B7280', flex: 1 }}>{sentence}</span>
                {inKB && JTMS_RETRACTABLE.has(sentence) && (
                  <button onClick={() => doRetract(sentence)} style={{
                    background: '#EF444420', border: '1px solid #EF4444', borderRadius: 4,
                    color: '#EF4444', padding: '1px 6px', fontSize: 11, cursor: 'pointer',
                  }} aria-label={`Retract ${sentence}`}>retract</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step trace */}
        <div style={{ flex: '1 1 220px' }}>
          {allSteps.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Previous">◀</button>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stepIdx + 1}/{allSteps.length}</span>
                <button onClick={() => setStepIdx(i => Math.min(allSteps.length - 1, i + 1))} disabled={stepIdx === allSteps.length - 1} style={smallBtnStyle} aria-label="Next">▶</button>
                <button onClick={reset} style={smallBtnStyle} aria-label="Reset">Reset</button>
              </div>
              {currentStep && (
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 10, fontSize: 12, color: '#E5E7EB' }}>
                  <strong style={{ color: '#8B5CF6' }}>Step:</strong> {currentStep.action}
                </div>
              )}
            </>
          )}
          {allSteps.length === 0 && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 16, fontSize: 13, color: '#9CA3AF' }}>
              Click "retract" on P or R to see JTMS propagation. Q stays in KB as long as at least one justification holds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DefaultReasoningViz() {
  const [tab, setTab] = useState<'nixon' | 'default' | 'jtms'>('nixon');

  return (
    <div
      id="default-reasoning"
      style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}
      aria-label="Default Reasoning visualization"
    >
      <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>
        §10.6 Reasoning with Default Information
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Circumscription, Reiter default logic, and justification-based truth maintenance (JTMS).
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([['nixon', 'Nixon Diamond'], ['default', 'Default Logic'], ['jtms', 'JTMS']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#8B5CF6' : 'var(--surface-2)',
            border: `1px solid ${tab === t ? '#8B5CF6' : 'var(--surface-border)'}`,
            borderRadius: 8, color: '#fff', padding: '8px 18px', fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'nixon' && <NixonDiamondSub />}
      {tab === 'default' && <DefaultLogicSub />}
      {tab === 'jtms' && <JTMSSub />}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
  borderRadius: 6, color: '#E5E7EB', padding: '4px 12px', fontSize: 13, cursor: 'pointer',
};
