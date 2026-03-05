import { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import {
  unify,
  forwardChain,
  backwardChain,
  universalInstantiation,
  propositionalResolution,
  termToLatex,
  clauseToLatex,
  type FOLTerm,
  type HornClause,
  type CNFClause,
  type Literal,
  type UnificationStep,
  type ForwardChainStep,
  type BackwardChainStep,
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

// ─── Backward Chaining data ───────────────────────────────────────────────────

const BC_CRIME_CLAUSES: HornClause[] = [
  {
    head: 'Sells',
    headArgs: ['West', 'x', 'Nono'],
    body: [
      { predicate: 'Missile', args: ['x'] },
      { predicate: 'Owns', args: ['Nono', 'x'] },
    ],
  },
  {
    head: 'Weapon',
    headArgs: ['x'],
    body: [{ predicate: 'Missile', args: ['x'] }],
  },
  {
    head: 'Hostile',
    headArgs: ['x'],
    body: [{ predicate: 'Enemy', args: ['x', 'America'] }],
  },
  {
    head: 'Criminal',
    headArgs: ['x'],
    body: [
      { predicate: 'American', args: ['x'] },
      { predicate: 'Weapon', args: ['y'] },
      { predicate: 'Sells', args: ['x', 'y', 'z'] },
      { predicate: 'Hostile', args: ['z'] },
    ],
  },
];
const BC_CRIME_FACTS = ['American(West)', 'Enemy(Nono,America)', 'Owns(Nono,M1)', 'Missile(M1)'];
const BC_CRIME_QUERY = 'Criminal(West)';

// Original example: Family relationships
const BC_FAMILY_CLAUSES: HornClause[] = [
  {
    head: 'GrandParent',
    headArgs: ['x', 'z'],
    body: [
      { predicate: 'Parent', args: ['x', 'y'] },
      { predicate: 'Parent', args: ['y', 'z'] },
    ],
  },
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
const BC_FAMILY_FACTS = ['Parent(Alice,Bob)', 'Parent(Bob,Carol)', 'Parent(Carol,Dave)'];
const BC_FAMILY_QUERY = 'GrandParent(Alice,Carol)';

// ─── Backward Chaining panel ──────────────────────────────────────────────────

const BC_EXAMPLES = [
  {
    label: 'Crime KB: Criminal(West)',
    clauses: BC_CRIME_CLAUSES,
    facts: BC_CRIME_FACTS,
    query: BC_CRIME_QUERY,
  },
  {
    label: 'Family KB: GrandParent(Alice,Carol)',
    clauses: BC_FAMILY_CLAUSES,
    facts: BC_FAMILY_FACTS,
    query: BC_FAMILY_QUERY,
  },
];

function BackwardChainingPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const [exampleIdx, setExampleIdx] = useState(0);
  const ex = BC_EXAMPLES[exampleIdx] ?? BC_EXAMPLES[0]!;
  const steps = backwardChain(ex.clauses, ex.facts, ex.query);
  const [stepIndex, setStepIndex] = useState(reducedMotion ? steps.length - 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const s = backwardChain(ex.clauses, ex.facts, ex.query);
    setStepIndex(reducedMotion ? s.length - 1 : 0);
    setIsPlaying(false);
  }, [exampleIdx, reducedMotion, ex.clauses, ex.facts, ex.query]);

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

  const currentStep: BackwardChainStep = steps[stepIndex] ?? steps[0]!;
  const statusColor = currentStep.succeeded ? '#10B981' : currentStep.failed ? '#EF4444' : '#9CA3AF';

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
    borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '14px', padding: '8px 14px',
  };

  return (
    <div>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        FOL-BC-ASK works backward from the goal, selecting rules whose conclusion matches,
        then recursively proving each premise. It chains backward until reaching known facts.
      </p>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#9CA3AF', fontSize: '13px' }}>Example:</label>
        <select
          value={exampleIdx}
          onChange={(e) => setExampleIdx(Number(e.target.value))}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'white', fontSize: '14px', padding: '6px 12px' }}
          aria-label="Select backward chaining example"
        >
          {BC_EXAMPLES.map((e, i) => <option key={i} value={i}>{e.label}</option>)}
        </select>
      </div>

      {/* KB summary */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Rules</span>
            {ex.clauses.map((cl, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#A78BFA', marginBottom: '3px', fontFamily: 'monospace' }}>
                {cl.body.length > 0
                  ? `${cl.body.map(b => `${b.predicate}(${b.args.join(',')})`).join(' ∧ ')} → ${cl.head}(${cl.headArgs.join(',')})`
                  : `→ ${cl.head}(${cl.headArgs.join(',')})`}
              </div>
            ))}
          </div>
          <div>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Facts</span>
            {ex.facts.map((f) => (
              <div key={f} style={{ fontSize: '12px', color: '#10B981', marginBottom: '3px', fontFamily: 'monospace' }}>{f}</div>
            ))}
            <div style={{ marginTop: '8px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Query: </span>
              <code style={{ fontSize: '12px', color: '#F59E0B' }}>{ex.query}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Step display */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        {/* Action */}
        <div style={{
          background: currentStep.succeeded ? 'rgba(16,185,129,0.1)' : currentStep.failed ? 'rgba(239,68,68,0.1)' : 'var(--surface-3)',
          border: `1px solid ${currentStep.succeeded ? 'rgba(16,185,129,0.4)' : currentStep.failed ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
          borderRadius: '8px', padding: '12px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: `${statusColor}20`, color: statusColor,
              borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
            }}>
              {currentStep.succeeded ? 'PROVED' : currentStep.failed ? 'FAILED' : 'SEARCHING'}
            </span>
            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Current: <code style={{ color: '#F59E0B' }}>{currentStep.currentGoal}</code></span>
          </div>
          <span style={{ color: '#E5E7EB', fontSize: '14px' }}>{currentStep.action}</span>
        </div>

        {/* Proof nodes */}
        <div>
          <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            Proof Search Tree ({currentStep.proofNodes.length} node{currentStep.proofNodes.length !== 1 ? 's' : ''})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
            {currentStep.proofNodes.map((node, i) => {
              const nc = node.status === 'success' ? '#10B981' : node.status === 'failure' ? '#EF4444' : '#F59E0B';
              return (
                <div
                  key={i}
                  style={{
                    background: node.status === 'pending' ? 'rgba(245,158,11,0.08)' : node.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${nc}40`,
                    borderRadius: '6px',
                    padding: '6px 10px',
                    marginLeft: `${node.depth * 16}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: nc, minWidth: '16px' }}>
                    {node.status === 'success' ? '✓' : node.status === 'failure' ? '✗' : '?'}
                  </span>
                  <code style={{ color: '#E5E7EB', flex: 1 }}>{node.goal}</code>
                  {node.rule && (
                    <span style={{ color: '#A78BFA', fontSize: '11px' }}>
                      via {node.rule.head}
                    </span>
                  )}
                  {!node.rule && node.status === 'success' && (
                    <span style={{ color: '#10B981', fontSize: '11px' }}>fact</span>
                  )}
                </div>
              );
            })}
            {currentStep.proofNodes.length === 0 && (
              <span style={{ color: '#6B7280', fontSize: '13px' }}>—</span>
            )}
          </div>
        </div>

        {/* Bindings */}
        {Object.keys(currentStep.bindings).length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <span style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Active Bindings</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(currentStep.bindings).map(([k, val]) => (
                <span key={k} style={{
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '6px', padding: '2px 8px', fontSize: '12px', color: '#A78BFA',
                }}>
                  {k} = {val}
                </span>
              ))}
            </div>
          </div>
        )}
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

// ─── §9.1 Propositional vs FOL Inference panel ───────────────────────────────

const UI_EXAMPLES = [
  {
    label: 'Evil kings',
    formula: '\\forall x\\; King(x) \\land Greedy(x) \\Rightarrow Evil(x)',
    formulaText: 'King(x) ∧ Greedy(x) ⇒ Evil(x)',
    variable: 'x',
    groundTerms: ['John', 'Richard', 'Father(John)'],
    results: [
      'King(John) ∧ Greedy(John) ⇒ Evil(John)',
      'King(Richard) ∧ Greedy(Richard) ⇒ Evil(Richard)',
      'King(Father(John)) ∧ Greedy(Father(John)) ⇒ Evil(Father(John))',
    ],
    explanation: 'Universal Instantiation replaces the universally quantified variable x with each ground term.',
  },
  {
    label: 'Mortal philosophers',
    formula: '\\forall x\\; Human(x) \\Rightarrow Mortal(x)',
    formulaText: 'Human(x) ⇒ Mortal(x)',
    variable: 'x',
    groundTerms: ['Socrates', 'Plato', 'Aristotle'],
    results: [
      'Human(Socrates) ⇒ Mortal(Socrates)',
      'Human(Plato) ⇒ Mortal(Plato)',
      'Human(Aristotle) ⇒ Mortal(Aristotle)',
    ],
    explanation: 'Each philosopher is instantiated separately, creating propositional sentences.',
  },
  {
    label: 'Animals and food',
    formula: '\\forall x\\; Animal(x) \\Rightarrow NeedsFood(x)',
    formulaText: 'Animal(x) ⇒ NeedsFood(x)',
    variable: 'x',
    groundTerms: ['Cat', 'Dog', 'Bird'],
    results: [
      'Animal(Cat) ⇒ NeedsFood(Cat)',
      'Animal(Dog) ⇒ NeedsFood(Dog)',
      'Animal(Bird) ⇒ NeedsFood(Bird)',
    ],
    explanation: 'Propositionalization creates one ground sentence per substitution.',
  },
];

function PropositionalVsFOLPanel() {
  const [exampleIdx, setExampleIdx] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  const ex = UI_EXAMPLES[exampleIdx] ?? UI_EXAMPLES[0]!;
  const steps = universalInstantiation(ex.formulaText, ex.variable, ex.groundTerms);

  useEffect(() => {
    setSelectedStep(0);
  }, [exampleIdx]);

  const currentStep = steps[selectedStep] ?? steps[0];

  return (
    <div>
      <p style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '14px' }}>
        The key insight of §9.1: FOL sentences can be reduced to propositional logic via{' '}
        <strong style={{ color: '#E5E7EB' }}>Universal Instantiation (UI)</strong> — substituting ground terms
        for universally quantified variables. However, this creates infinitely many sentences when
        function symbols are present (e.g., Father(Father(John))…).
      </p>

      {/* Concept overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(139,92,246,0.3)' }}>
          <div style={{ color: '#A78BFA', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            Universal Instantiation (UI)
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
            For any variable <em>v</em> and ground term <em>g</em>:
          </div>
          <div style={{ background: 'var(--surface-3)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
            <KatexSpan latex="\frac{\forall v \;\alpha}{\text{SUBST}(\{v/g\}, \alpha)}" displayMode />
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ color: '#10B981', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            Existential Instantiation (EI)
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
            Replace <em>∃v α</em> with a new Skolem constant <em>k</em>:
          </div>
          <div style={{ background: 'var(--surface-3)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
            <KatexSpan latex="\frac{\exists v \;\alpha}{\text{SUBST}(\{v/k\}, \alpha)}" displayMode />
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ color: '#EF4444', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            Semidecidability
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
            FOL entailment is semidecidable: algorithms can say <em>yes</em> to every entailed sentence,
            but no algorithm exists that also says <em>no</em> to every non-entailed sentence.
          </div>
        </div>
      </div>

      {/* Interactive UI demo */}
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: '#9CA3AF', fontSize: '13px' }}>Example:</label>
          <select
            value={exampleIdx}
            onChange={(e) => setExampleIdx(Number(e.target.value))}
            style={{ background: 'var(--surface-3)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'white', fontSize: '14px', padding: '6px 12px' }}
            aria-label="Select UI example"
          >
            {UI_EXAMPLES.map((e, i) => <option key={i} value={i}>{e.label}</option>)}
          </select>
        </div>

        {/* Original sentence */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '6px' }}>Original FOL sentence (universally quantified):</div>
          <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <KatexSpan latex={ex.formula} displayMode />
          </div>
        </div>

        {/* Ground term substitutions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
            Click a substitution to see the instantiated sentence:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setSelectedStep(i)}
                style={{
                  background: selectedStep === i ? 'rgba(139,92,246,0.2)' : 'var(--surface-3)',
                  border: `1px solid ${selectedStep === i ? 'rgba(139,92,246,0.6)' : 'var(--surface-border)'}`,
                  borderRadius: '8px', color: selectedStep === i ? '#A78BFA' : '#9CA3AF',
                  cursor: 'pointer', fontSize: '13px', padding: '8px 16px',
                  fontWeight: selectedStep === i ? 600 : 400,
                }}
                aria-label={`Substitution ${step.description}`}
                aria-pressed={selectedStep === i}
              >
                <KatexSpan latex={`\\{${ex.variable}/${step.groundTerm}\\}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Instantiated result */}
        {currentStep && (
          <div style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '10px', padding: '16px',
          }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
              After applying <KatexSpan latex={`\\text{SUBST}(\\{${ex.variable}/${currentStep.groundTerm}\\})`} />:
            </div>
            <div style={{ color: '#E5E7EB', fontSize: '14px', fontFamily: 'monospace', marginBottom: '8px' }}>
              {currentStep.instantiated}
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
              This is now a <strong style={{ color: '#A78BFA' }}>propositional sentence</strong> — no variables, can be evaluated directly.
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', color: '#6B7280', fontSize: '12px', fontStyle: 'italic' }}>
          {ex.explanation}
        </div>

        {/* What-if control */}
        <div style={{ marginTop: '16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            💡 What if we include function symbols?
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
            If the KB contains <code style={{ color: '#E5E7EB' }}>Father(John)</code>, then UI also generates
            instantiations for <code style={{ color: '#E5E7EB' }}>Father(Richard)</code>,{' '}
            <code style={{ color: '#E5E7EB' }}>Father(Father(John))</code>, etc.
            This creates an <strong style={{ color: '#EF4444' }}>infinite set</strong> of propositional sentences,
            making complete propositionalization infeasible for general FOL.
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = 'propositional-vs-fol' | 'unification' | 'forward-chaining' | 'backward-chaining' | 'resolution';

export default function FOLInferenceVisualizer() {
  const [activeTab, setActiveTab] = useState<Tab>('propositional-vs-fol');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'propositional-vs-fol', label: '§9.1 Prop. vs FOL' },
    { id: 'unification', label: '§9.2 Unification' },
    { id: 'forward-chaining', label: '§9.3 Forward Chain' },
    { id: 'backward-chaining', label: '§9.4 Backward Chain' },
    { id: 'resolution', label: '§9.5 Resolution' },
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
          overflowX: 'auto',
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
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              padding: '14px 16px',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px' }}>
        {activeTab === 'propositional-vs-fol' && (
          <div role="tabpanel" id="panel-propositional-vs-fol" aria-labelledby="tab-propositional-vs-fol">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              §9.1 Propositional vs. First-Order Inference
            </h3>
            <PropositionalVsFOLPanel />
          </div>
        )}
        {activeTab === 'unification' && (
          <div role="tabpanel" id="panel-unification" aria-labelledby="tab-unification">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              §9.2 Unification Step-by-Step
            </h3>
            <UnificationPanel reducedMotion={reducedMotion} />
          </div>
        )}
        {activeTab === 'forward-chaining' && (
          <div role="tabpanel" id="panel-forward-chaining" aria-labelledby="tab-forward-chaining">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              §9.3 Forward Chaining
            </h3>
            <ForwardChainingPanel reducedMotion={reducedMotion} />
          </div>
        )}
        {activeTab === 'backward-chaining' && (
          <div role="tabpanel" id="panel-backward-chaining" aria-labelledby="tab-backward-chaining">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              §9.4 Backward Chaining
            </h3>
            <BackwardChainingPanel reducedMotion={reducedMotion} />
          </div>
        )}
        {activeTab === 'resolution' && (
          <div role="tabpanel" id="panel-resolution" aria-labelledby="tab-resolution">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
              §9.5 Resolution Refutation
            </h3>
            <ResolutionPanel reducedMotion={reducedMotion} />
          </div>
        )}
      </div>
    </div>
  );
}
