import { useState, useEffect, useCallback, useRef } from 'react';
import katex from 'katex';
import {
  unify,
  forwardChain,
  propositionalResolution,
  termToLatex,
  clauseToLatex,
  type FOLTerm,
  type HornClause,
  type CNFClause,
  type Literal,
  type UnificationStep,
  type ForwardChainStep,
  type ResolutionStep,
} from '../algorithms/index.js';

// ─── KaTeX helper ────────────────────────────────────────────────────────────

function KatexSpan({ latex, displayMode = false }: { latex: string; displayMode?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, { throwOnError: false, displayMode });
      } catch {
        /* ignore render errors */
      }
    }
  }, [latex, displayMode]);
  return <span ref={ref} aria-label={latex} />;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const v = (name: string): FOLTerm => ({ kind: 'var', name });
const c = (name: string): FOLTerm => ({ kind: 'const', name });
const fn = (name: string, args: FOLTerm[]): FOLTerm => ({ kind: 'fn', name, args });

const UNIFY_EXAMPLES: Array<{ label: string; t1: FOLTerm; t2: FOLTerm }> = [
  {
    label: 'f(x, g(y)) ≡ f(a, g(b))',
    t1: fn('f', [v('x'), fn('g', [v('y')])]),
    t2: fn('f', [c('a'), fn('g', [c('b')])]),
  },
  {
    label: 'f(x, x) ≡ f(a, b)',
    t1: fn('f', [v('x'), v('x')]),
    t2: fn('f', [c('a'), c('b')]),
  },
  {
    label: 'x ≡ f(x) (occurs check)',
    t1: v('x'),
    t2: fn('f', [v('x')]),
  },
];

const FC_CLAUSES: HornClause[] = [
  {
    head: 'Ancestor',
    headArgs: ['x', 'y'],
    body: [{ predicate: 'Parent', args: ['x', 'y'] }],
  },
  {
    head: 'Ancestor',
    headArgs: ['x', 'z'],
    body: [
      { predicate: 'Ancestor', args: ['x', 'y'] },
      { predicate: 'Parent', args: ['y', 'z'] },
    ],
  },
];
const FC_INITIAL_FACTS = ['Parent(Tom,Bob)', 'Parent(Bob,Ann)'];
const FC_QUERY = 'Ancestor(Tom,Ann)';

function makeLit(predicate: string, args: string[], negated: boolean): Literal {
  return { predicate, args, negated };
}
function makeClause(id: string, literals: Literal[], source: CNFClause['source']): CNFClause {
  return { id, literals, source };
}

const RES_KB: CNFClause[] = [
  makeClause('c1', [makeLit('P', [], false), makeLit('Q', [], false)], 'kb'),
  makeClause('c2', [makeLit('P', [], true), makeLit('R', [], false)], 'kb'),
  makeClause('c3', [makeLit('Q', [], true), makeLit('R', [], false)], 'kb'),
];
const RES_GOAL = makeClause('c4', [makeLit('R', [], true)], 'negated-goal');

// ─── Shared controls ─────────────────────────────────────────────────────────

const SPEEDS = [0.5, 1, 2, 4];

interface ControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  isPlaying: boolean;
  speed: number;
  onSpeedChange: (s: number) => void;
  stepIndex: number;
  totalSteps: number;
}

function Controls({
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  isPlaying,
  speed,
  onSpeedChange,
  stepIndex,
  totalSteps,
}: ControlsProps) {
  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)',
    border: '1px solid var(--surface-border)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '8px 14px',
  };
  const activeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'var(--chapter-color)',
    border: '1px solid var(--chapter-color)',
  };

  return (
    <div
      role="toolbar"
      aria-label="Playback controls"
      style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}
    >
      <button onClick={onReset} style={btnStyle} aria-label="Reset to first step">⏮</button>
      <button onClick={onStepBackward} disabled={stepIndex === 0} style={stepIndex === 0 ? { ...btnStyle, opacity: 0.4 } : btnStyle} aria-label="Step backward">◀</button>
      <button
        onClick={isPlaying ? onPause : onPlay}
        style={isPlaying ? activeBtnStyle : btnStyle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={onStepForward} disabled={stepIndex >= totalSteps - 1} style={stepIndex >= totalSteps - 1 ? { ...btnStyle, opacity: 0.4 } : btnStyle} aria-label="Step forward">▶</button>
      <span style={{ color: '#9CA3AF', fontSize: '13px', minWidth: '80px' }}>
        Step {stepIndex + 1} / {totalSteps}
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '13px' }}>
        Speed:
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'white', fontSize: '13px', padding: '4px 8px' }}
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ─── Unification tab ─────────────────────────────────────────────────────────

function UnificationPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const [exampleIdx, setExampleIdx] = useState(0);
  const example = UNIFY_EXAMPLES[exampleIdx] ?? UNIFY_EXAMPLES[0]!;
  const steps = unify(example.t1, example.t2);
  const [stepIndex, setStepIndex] = useState(reducedMotion ? steps.length - 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const s = unify(example.t1, example.t2);
    setStepIndex(reducedMotion ? s.length - 1 : 0);
    setIsPlaying(false);
  }, [exampleIdx, reducedMotion, example.t1, example.t2]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => {
        if (i >= steps.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, steps.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.tagName === 'BUTTON' || target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
      if (e.key === ' ' && !isInteractive) { e.preventDefault(); setIsPlaying((p) => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [steps.length]);

  const currentStep: UnificationStep = steps[stepIndex] ?? steps[0]!;
  const resultColor = currentStep.result === 'success' ? '#10B981' : currentStep.result === 'failure' ? '#EF4444' : '#9CA3AF';

  return (
    <div>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Robinson's UNIFY algorithm finds a most-general unifier (MGU) for two FOL terms,
        or reports failure if no unifier exists.
      </p>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#9CA3AF', fontSize: '13px', marginRight: '8px' }}>Example:</label>
        <select
          value={exampleIdx}
          onChange={(e) => setExampleIdx(Number(e.target.value))}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'white', fontSize: '14px', padding: '6px 12px' }}
          aria-label="Select unification example"
        >
          {UNIFY_EXAMPLES.map((ex, i) => (
            <option key={i} value={i}>{ex.label}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>T₁</span>
            <KatexSpan latex={termToLatex(example.t1)} />
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '20px', alignSelf: 'center' }}>≡</div>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>T₂</span>
            <KatexSpan latex={termToLatex(example.t2)} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ background: `${resultColor}20`, color: resultColor, borderRadius: '6px', padding: '2px 10px', fontSize: '13px', fontWeight: 600 }}>
              {currentStep.result.toUpperCase()}
            </span>
            <span style={{ color: '#E5E7EB', fontSize: '14px' }}>{currentStep.action}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Substitution θ ({currentStep.theta.size} bindings)
              </span>
              {currentStep.theta.size === 0 ? (
                <span style={{ color: '#6B7280', fontSize: '13px' }}>∅ (empty)</span>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ color: '#9CA3AF', textAlign: 'left', paddingBottom: '4px', fontWeight: 500 }}>Var</th>
                      <th style={{ color: '#9CA3AF', textAlign: 'left', paddingBottom: '4px', fontWeight: 500 }}>Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(currentStep.theta.entries()).map(([varName, term]) => (
                      <tr key={varName}>
                        <td style={{ padding: '2px 8px 2px 0', color: '#A78BFA' }}>
                          <KatexSpan latex={varName} />
                        </td>
                        <td style={{ padding: '2px 0', color: '#E5E7EB' }}>
                          <KatexSpan latex={termToLatex(term)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Remaining pairs ({currentStep.remainingPairs.length})
              </span>
              {currentStep.remainingPairs.length === 0 ? (
                <span style={{ color: '#6B7280', fontSize: '13px' }}>—</span>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {currentStep.remainingPairs.map(([a, b], i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#E5E7EB', marginBottom: '4px' }}>
                      <KatexSpan latex={`(${termToLatex(a)},\\; ${termToLatex(b)})`} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <Controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
        onStepBackward={() => setStepIndex((i) => Math.max(i - 1, 0))}
        onReset={() => { setStepIndex(0); setIsPlaying(false); }}
        isPlaying={isPlaying}
        speed={speed}
        onSpeedChange={setSpeed}
        stepIndex={stepIndex}
        totalSteps={steps.length}
      />
    </div>
  );
}

// ─── Forward Chaining tab ─────────────────────────────────────────────────────

function ForwardChainingPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const steps = forwardChain(FC_CLAUSES, FC_INITIAL_FACTS, FC_QUERY);
  const [stepIndex, setStepIndex] = useState(reducedMotion ? steps.length - 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => {
        if (i >= steps.length - 1) { setIsPlaying(false); return i; }
        return i + 1;
      });
    }, 1000 / speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, steps.length]);

  const currentStep: ForwardChainStep = steps[stepIndex] ?? steps[0]!;

  return (
    <div>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        FOL-FC-ASK propagates known facts through Horn clauses until the query is proved
        or no new facts can be derived (fixed point).
      </p>

      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Rules</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <code style={{ fontSize: '13px', color: '#A78BFA' }}>
              Parent(x,y) → Ancestor(x,y)
            </code>
            <code style={{ fontSize: '13px', color: '#A78BFA' }}>
              Ancestor(x,y) ∧ Parent(y,z) → Ancestor(x,z)
            </code>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Query: </span>
          <code style={{ color: '#F59E0B', fontSize: '13px' }}>{FC_QUERY}</code>
        </div>

        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
          <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Action</span>
            <span style={{ color: '#E5E7EB', fontSize: '14px' }}>{currentStep.action}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Known Facts ({currentStep.facts.length})
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {currentStep.facts.map((fact) => (
                  <li
                    key={fact}
                    style={{
                      fontSize: '13px',
                      padding: '3px 8px',
                      marginBottom: '4px',
                      borderRadius: '4px',
                      background: fact === currentStep.newFact ? 'rgba(139,92,246,0.2)' : 'transparent',
                      color: fact === currentStep.newFact ? '#A78BFA' : fact === FC_QUERY ? '#10B981' : '#E5E7EB',
                      border: fact === currentStep.newFact ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                    }}
                  >
                    {fact}
                    {fact === currentStep.newFact && <span style={{ marginLeft: '6px', fontSize: '11px' }}>← new</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {currentStep.firedClause && (
                <div>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Fired Rule</span>
                  <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#A78BFA' }}>
                    {currentStep.firedClause.body.length > 0
                      ? currentStep.firedClause.body.map((b) => `${b.predicate}(${b.args.join(',')})`).join(' ∧ ')
                      : '(always)'}{' '}
                    → {currentStep.firedClause.head}({currentStep.firedClause.headArgs.join(',')})
                  </div>
                </div>
              )}
              {currentStep.bindings && Object.keys(currentStep.bindings).length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Bindings</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(currentStep.bindings).map(([k, val]) => (
                      <span key={k} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '13px', color: '#10B981' }}>
                        {k} = {val}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
        onStepBackward={() => setStepIndex((i) => Math.max(i - 1, 0))}
        onReset={() => { setStepIndex(0); setIsPlaying(false); }}
        isPlaying={isPlaying}
        speed={speed}
        onSpeedChange={setSpeed}
        stepIndex={stepIndex}
        totalSteps={steps.length}
      />
    </div>
  );
}

// ─── Resolution tab ───────────────────────────────────────────────────────────

function ResolutionPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const steps = propositionalResolution(RES_KB, RES_GOAL);
  const [stepIndex, setStepIndex] = useState(reducedMotion ? steps.length - 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => {
        if (i >= steps.length - 1) { setIsPlaying(false); return i; }
        return i + 1;
      });
    }, 1000 / speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, steps.length]);

  const currentStep: ResolutionStep = steps[stepIndex] ?? steps[0]!;

  return (
    <div>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        Resolution refutation proves a goal by negating it and deriving the empty clause (contradiction)
        from the KB ∪ ¬goal using propositional resolution.
      </p>

      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>KB clauses</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {RES_KB.map((cl) => (
                <code key={cl.id} style={{ fontSize: '13px', color: '#A78BFA' }}>
                  {cl.id}: {'{'}
                  <KatexSpan latex={clauseToLatex(cl)} />
                  {'}'}
                </code>
              ))}
            </div>
          </div>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Negated goal</span>
            <code style={{ fontSize: '13px', color: '#F59E0B' }}>
              {RES_GOAL.id}: {'{'}
              <KatexSpan latex={clauseToLatex(RES_GOAL)} />
              {'}'}
            </code>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
          <div style={{ background: currentStep.resolved ? 'rgba(16,185,129,0.1)' : 'var(--surface-3)', border: `1px solid ${currentStep.resolved ? 'rgba(16,185,129,0.4)' : 'transparent'}`, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Action</span>
            <span style={{ color: currentStep.resolved ? '#10B981' : '#E5E7EB', fontSize: '14px', fontWeight: currentStep.resolved ? 600 : 400 }}>
              {currentStep.action}
            </span>
          </div>

          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              All Clauses ({currentStep.allClauses.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentStep.allClauses.map((cl) => {
                const isActive = cl.id === currentStep.clause1Id || cl.id === currentStep.clause2Id;
                const isResolvent = cl.id === currentStep.resolvent?.id;
                return (
                  <div
                    key={cl.id}
                    style={{
                      background: isResolvent ? 'rgba(139,92,246,0.15)' : isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                      border: `1px solid ${isResolvent ? 'rgba(139,92,246,0.5)' : isActive ? 'rgba(245,158,11,0.3)' : 'var(--surface-border)'}`,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#6B7280', fontSize: '12px', minWidth: '28px' }}>{cl.id}:</span>
                    <span style={{ fontSize: '13px', color: cl.literals.length === 0 ? '#EF4444' : '#E5E7EB' }}>
                      {'{'}
                      <KatexSpan latex={clauseToLatex(cl)} />
                      {'}'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: 'auto' }}>
                      {getClauseSourceLabel(cl)}
                    </span>
                    {isResolvent && <span style={{ fontSize: '11px', color: '#A78BFA' }}>← new</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
        onStepBackward={() => setStepIndex((i) => Math.max(i - 1, 0))}
        onReset={() => { setStepIndex(0); setIsPlaying(false); }}
        isPlaying={isPlaying}
        speed={speed}
        onSpeedChange={setSpeed}
        stepIndex={stepIndex}
        totalSteps={steps.length}
      />
    </div>
  );
}

function getClauseSourceLabel(cl: CNFClause): string {
  if (cl.source === 'kb') return 'KB';
  if (cl.source === 'negated-goal') return '¬goal';
  return `from ${cl.parents?.join(',') ?? '?'}`;
}



type Tab = 'unification' | 'forward-chaining' | 'resolution';

export default function FOLInferenceVisualizer() {
  const [activeTab, setActiveTab] = useState<Tab>('unification');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'unification', label: 'Unification' },
    { id: 'forward-chaining', label: 'Forward Chaining' },
    { id: 'resolution', label: 'Resolution' },
  ];

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        borderRadius: '16px',
        border: '1px solid var(--surface-border)',
        overflow: 'hidden',
      }}
      role="region"
      aria-label="FOL Inference Visualizer"
    >
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Inference algorithms"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--surface-2)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--chapter-color)' : '2px solid transparent',
              color: activeTab === tab.id ? 'white' : '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              padding: '14px 20px',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px' }}>
        {activeTab === 'unification' && (
          <div
            role="tabpanel"
            id="panel-unification"
            aria-labelledby="tab-unification"
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              Unification Step-by-Step
            </h3>
            <UnificationPanel reducedMotion={reducedMotion} />
          </div>
        )}
        {activeTab === 'forward-chaining' && (
          <div
            role="tabpanel"
            id="panel-forward-chaining"
            aria-labelledby="tab-forward-chaining"
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              Forward Chaining
            </h3>
            <ForwardChainingPanel reducedMotion={reducedMotion} />
          </div>
        )}
        {activeTab === 'resolution' && (
          <div
            role="tabpanel"
            id="panel-resolution"
            aria-labelledby="tab-resolution"
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              Resolution Refutation
            </h3>
            <ResolutionPanel reducedMotion={reducedMotion} />
          </div>
        )}
      </div>
    </div>
  );
}
