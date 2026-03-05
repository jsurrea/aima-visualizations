import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  generateTruthTable,
  dpll,
  exploreWumpusWorld,
  ttEntails,
  plResolution,
  walkSat,
  kbAgent,
  type PropFormula,
  type CellStatus,
  type DPLLStep,
  type CNF,
  type TTEntailsStep,
  type ResolutionStep,
  type WalkSATStep,
  type KBAgentPercept,
} from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

// ─── Formula helpers ────────────────────────────────────────────

function lit(name: string): PropFormula { return { kind: 'literal', name }; }
function neg(arg: PropFormula): PropFormula { return { kind: 'neg', arg }; }
function impl(left: PropFormula, right: PropFormula): PropFormula { return { kind: 'compound', op: 'implies', left, right }; }
function and_(left: PropFormula, right: PropFormula): PropFormula { return { kind: 'compound', op: 'and', left, right }; }
function or_(left: PropFormula, right: PropFormula): PropFormula { return { kind: 'compound', op: 'or', left, right }; }

// ─── Fixed inputs ─────────────────────────────────────────────────────

const TRUTH_FORMULA: PropFormula = impl(
  and_(impl(lit('P'), lit('Q')), impl(lit('Q'), lit('R'))),
  impl(lit('P'), lit('R')),
);

const DPLL_CNF: CNF = [['P', 'Q'], ['~P', 'R'], ['~Q', '~R'], ['P', '~R']];

const KB_AGENT_PERCEPTS_BASE: KBAgentPercept[] = [
  { stench: false, breeze: false, glitter: false, bump: false, scream: false },
  { stench: true,  breeze: false, glitter: false, bump: false, scream: false },
  { stench: false, breeze: true,  glitter: false, bump: false, scream: false },
  { stench: false, breeze: false, glitter: true,  bump: false, scream: false },
  { stench: false, breeze: false, glitter: false, bump: true,  scream: false },
];

// ─── Entailment examples ────────────────────────────────────────────

interface EntailmentExample {
  label: string;
  kb: PropFormula[];
  alpha: PropFormula;
  kbMath: string;
  alphaMath: string;
}

const ENTAILMENT_EXAMPLES: EntailmentExample[] = [
  {
    label: 'Modus Ponens (proved)',
    kb: [impl(lit('P'), lit('Q')), lit('P')],
    alpha: lit('Q'),
    kbMath: 'P \\Rightarrow Q,\\; P',
    alphaMath: 'Q',
  },
  {
    label: 'Counter-example (disproved)',
    kb: [impl(lit('P'), lit('Q'))],
    alpha: lit('P'),
    kbMath: 'P \\Rightarrow Q',
    alphaMath: 'P',
  },
  {
    label: 'Tautology (always proved)',
    kb: [],
    alpha: or_(lit('P'), neg(lit('P'))),
    kbMath: '\\emptyset',
    alphaMath: 'P \\lor \\lnot P',
  },
];

// ─── Resolution examples ────────────────────────────────────────────

interface ResolutionExample {
  label: string;
  kbClauses: CNF;
  negAlphaClauses: CNF;
  kbMath: string;
  alphaMath: string;
}

const RESOLUTION_EXAMPLES: ResolutionExample[] = [
  {
    label: 'Hypothetical Syllogism (proved)',
    kbClauses: [['~P', 'Q'], ['~Q', 'R']] as CNF,
    negAlphaClauses: [['P'], ['~R']] as CNF,
    kbMath: '\\{P\\Rightarrow Q,\\; Q\\Rightarrow R\\}',
    alphaMath: 'P\\Rightarrow R',
  },
  {
    label: 'No Proof (disproved)',
    kbClauses: [['P', 'Q']] as CNF,
    negAlphaClauses: [['P', 'Q']] as CNF,
    kbMath: '\\{P\\lor Q\\}',
    alphaMath: '\\lnot P\\land\\lnot Q',
  },
];

// ─── WalkSAT formulas ────────────────────────────────────────────────

interface WalkSATFormula { label: string; clauses: CNF; }

const WALKSAT_FORMULAS: WalkSATFormula[] = [
  { label: 'Easy (3 vars, satisfiable)', clauses: [['P', 'Q'], ['~P', 'R'], ['~Q', '~R']] as CNF },
  { label: 'Hard (4 vars)', clauses: [['A', 'B'], ['~A', 'C'], ['~B', '~C'], ['A', 'D'], ['~C', '~D'], ['B', '~D']] as CNF },
];

// ─── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'kb-agent' | 'wumpus' | 'logic' | 'truth-table' | 'resolution' | 'dpll' | 'walksat';

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'kb-agent',    label: '§7.1 KB-Agent',      color: '#6366F1' },
  { id: 'wumpus',      label: '§7.2 Wumpus World',   color: '#10B981' },
  { id: 'logic',       label: '§7.3–4 Logic',   color: '#F59E0B' },
  { id: 'truth-table', label: '§7.4 Truth Table',    color: '#EC4899' },
  { id: 'resolution',  label: '§7.5 Resolution',     color: '#3B82F6' },
  { id: 'dpll',        label: '§7.6 DPLL',           color: '#8B5CF6' },
  { id: 'walksat',     label: '§7.6–7 WalkSAT', color: '#EF4444' },
];

const CELL_STATUS_COLORS: Record<CellStatus, string> = {
  safe: 'rgba(16,185,129,0.25)', pit: 'rgba(239,68,68,0.35)',
  wumpus: 'rgba(139,92,246,0.35)', unknown: 'rgba(255,255,255,0.04)',
};

const CELL_STATUS_BORDER: Record<CellStatus, string> = {
  safe: 'rgba(16,185,129,0.6)', pit: 'rgba(239,68,68,0.6)',
  wumpus: 'rgba(139,92,246,0.6)', unknown: 'rgba(255,255,255,0.08)',
};

// ─── Controls ───────────────────────────────────────────────────────────────

interface ControlsProps {
  step: number; total: number; playing: boolean; speed: number;
  onPlay: () => void; onPause: () => void; onStepBack: () => void;
  onStepForward: () => void; onReset: () => void; onSpeedChange: (v: number) => void; label: string;
}

function Controls({ step, total, playing, speed, onPlay, onPause, onStepBack, onStepForward, onReset, onSpeedChange, label }: ControlsProps) {
  const btn = (dis?: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    background: dis ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
    color: dis ? '#4B5563' : '#E5E7EB', cursor: dis ? 'not-allowed' : 'pointer',
    fontSize: '14px', fontWeight: 500, transition: 'background 0.15s',
  });
  return (
    <div role="toolbar" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      gap: '8px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
      <button style={btn(!playing)} onClick={playing ? onPause : onPlay} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>
      <button style={btn(step === 0)} onClick={onStepBack} disabled={step === 0} aria-label="Step backward">← Back</button>
      <button style={btn(step >= total - 1)} onClick={onStepForward} disabled={step >= total - 1} aria-label="Step forward">Forward →</button>
      <button style={btn()} onClick={onReset} aria-label="Reset to start">↺ Reset</button>
      <span style={{ color: '#9CA3AF', fontSize: '13px', marginLeft: '4px' }}>Step {step + 1} / {total}</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', color: '#9CA3AF', fontSize: '13px' }}>
        Speed:
        <input type="range" min={0.25} max={3} step={0.25} value={speed}
          onChange={e => onSpeedChange(parseFloat(e.target.value))} aria-label="Animation speed"
          style={{ width: '80px', accentColor: 'var(--chapter-color)' }} />
        <span style={{ minWidth: '28px' }}>{speed}×</span>
      </label>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside aria-label={title} style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
      borderRadius: '10px', padding: '16px', minWidth: '220px', maxWidth: '320px', flexShrink: 0 }}>
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--chapter-color)', textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: '12px' }}>{title}</h3>
      {children}
    </aside>
  );
}

// ─── KB-Agent Tab ────────────────────────────────────────────────────────────────

function KBAgentTab() {
  const [breezeOnStep3, setBreezeOnStep3] = useState(true);
  const percepts = useMemo((): KBAgentPercept[] =>
    KB_AGENT_PERCEPTS_BASE.map((p, i) => i === 2 ? { ...p, breeze: breezeOnStep3 } : p),
    [breezeOnStep3]);
  const steps = useMemo(() => kbAgent(percepts), [percepts]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[step];
  useEffect(() => { setStep(0); setPlaying(false); }, [breezeOnStep3]);
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 1000 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  const handleReset = useCallback(() => { setPlaying(false); setStep(0); }, []);
  if (current === undefined) return null;
  const icons = ([
    current.percept.stench  && '👃 Stench',
    current.percept.breeze  && '💨 Breeze',
    current.percept.glitter && '✨ Glitter',
    current.percept.bump    && '💥 Bump',
    current.percept.scream  && '😱 Scream',
  ] as Array<string | false>).filter((x): x is string => Boolean(x));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
        borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>What-if:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E5E7EB', cursor: 'pointer' }}>
          <input type="checkbox" checked={breezeOnStep3} onChange={e => setBreezeOnStep3(e.target.checked)}
            aria-label="Toggle breeze on step 3" style={{ accentColor: '#6366F1', width: '16px', height: '16px' }} />
          Breeze on step 3 (t=2)
        </label>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {breezeOnStep3 ? 'Agent senses breeze → TurnLeft' : 'No breeze → MoveForward'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Time t={current.time}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {icons.length === 0
                ? <span style={{ fontSize: '14px', color: '#6B7280' }}>No percepts (all quiet)</span>
                : icons.map(ic => <span key={ic} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px',
                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>{ic}</span>)
              }
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)', fontSize: '14px', color: '#6EE7B7', fontWeight: 600, marginBottom: '12px' }}>
              ▶ Action: {current.action}
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)', fontSize: '13px', color: '#FCD34D', marginBottom: '12px' }}>
              ASK: {current.askQuery}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TELL (KB updates)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {current.tellStatements.map((s, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#D1D5DB', background: 'rgba(255,255,255,0.04)',
                    borderRadius: '5px', padding: '4px 8px', borderLeft: '3px solid rgba(99,102,241,0.4)' }}>{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[['Time', `t=${current.time}`, '#E5E7EB'], ['Action', current.action, '#6EE7B7'], ['KB facts', String(current.kbFacts.length), '#A5B4FC']].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#9CA3AF' }}>{k}</span><span style={{ color: c, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>KB (all facts)</div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {current.kbFacts.map((f, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#9CA3AF', padding: '3px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}>{f}</div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={handleReset} onSpeedChange={setSpeed} label="KB-Agent playback controls" />
    </div>
  );
}

// ─── Wumpus World Tab ──────────────────────────────────────────────────────────

function WumpusTab() {
  const steps = useMemo(() => exploreWumpusWorld(), []);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[step];
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 1200 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  if (current === undefined) return null;
  const cur = current;
  function cellIcon(r: number, c: number): string {
    const key = `${r},${c}`;
    if (cur.agentRow === r && cur.agentCol === c) return '🤖';
    const st = cur.cellStatus.get(key);
    if (st === 'wumpus') return '💀';
    if (st === 'pit') return '🕳️';
    if (r === 1 && c === 2 && cur.visitedCells.has('1,2')) return '💰';
    return '';
  }
  const CELL = 70;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div role="grid" aria-label="Wumpus World 4x4 grid" style={{ flexShrink: 0 }}>
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} role="row" style={{ display: 'flex' }}>
              {Array.from({ length: 4 }, (_, c) => {
                const key = `${r},${c}`;
                const status: CellStatus = current.cellStatus.get(key) ?? 'unknown';
                const isAgent = current.agentRow === r && current.agentCol === c;
                const visited = current.visitedCells.has(key);
                return (
                  <div key={c} role="gridcell" aria-label={`Cell (${r},${c}): ${status}${isAgent ? ', agent here' : ''}`}
                    style={{ width: CELL, height: CELL,
                      border: `2px solid ${isAgent ? 'var(--chapter-color)' : CELL_STATUS_BORDER[status]}`,
                      background: visited && status === 'unknown' ? 'rgba(16,185,129,0.1)' : CELL_STATUS_COLORS[status],
                      borderRadius: '6px', margin: '2px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '28px', position: 'relative',
                      transition: rm ? 'none' : 'background 0.3s, border-color 0.3s' }}>
                    {cellIcon(r, c)}
                    <span style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{r},{c}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <Panel title="Knowledge Base">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
            {current.kbFacts.length === 0
              ? <p style={{ color: '#6B7280', fontSize: '13px' }}>No facts yet.</p>
              : current.kbFacts.map((fact, i) => (
                  <div key={i} style={{ fontSize: '12px', color: fact.includes('GOLD') ? '#F59E0B' : '#D1D5DB',
                    background: fact.includes('GOLD') ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                    borderRadius: '6px', padding: '5px 8px',
                    borderLeft: `3px solid ${fact.includes('Wumpus!') || fact.includes('GOLD') ? 'var(--chapter-color)' : fact.includes('Pit!') ? '#EF4444' : '#4B5563'}` }}>
                    {fact}
                  </div>
                ))}
          </div>
        </Panel>
      </div>
      <div aria-live="polite" style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.1)',
        border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', color: '#C4B5FD', fontSize: '14px' }}>
        {current.action}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {(['safe', 'pit', 'wumpus', 'unknown'] as CellStatus[]).map(s => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9CA3AF' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: CELL_STATUS_COLORS[s], border: `1px solid ${CELL_STATUS_BORDER[s]}`, display: 'inline-block' }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="Wumpus World playback controls" />
    </div>
  );
}

// ─── Logic & Entailment Tab ──────────────────────────────────────────────────



function LogicEntailmentTab() {
  const [exIdx, setExIdx] = useState(0);
  const ex = ENTAILMENT_EXAMPLES[exIdx]!;
  const steps = useMemo(() => ttEntails(ex.kb, ex.alpha), [ex]);
  const vars  = useMemo(() => steps.length > 0 ? [...steps[0]!.assignment.keys()] : [], [steps]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[step];
  useEffect(() => { setStep(0); setPlaying(false); }, [exIdx]);
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 600 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  if (current === undefined) return null;
  const finalResult = steps[steps.length - 1]?.result;
  const kbMath  = renderDisplayMath(`\\text{KB} = \\{${ex.kbMath}\\}`);
  const alpMath = renderDisplayMath(`\\alpha = ${ex.alphaMath}`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
        borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>Example:</span>
        <select value={exIdx} onChange={e => setExIdx(parseInt(e.target.value))} aria-label="Select entailment example"
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'var(--surface-3)', color: '#E5E7EB', fontSize: '14px', cursor: 'pointer' }}>
          {ENTAILMENT_EXAMPLES.map((e2, i) => <option key={i} value={i}>{e2.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: '1 1 200px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: kbMath }} aria-label={`KB = ${ex.kbMath}`} />
        <div style={{ flex: '1 1 120px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: alpMath }} aria-label={`alpha = ${ex.alphaMath}`} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0, overflowX: 'auto' }}>
          <table role="table" aria-label="TT-ENTAILS truth table" style={{ borderCollapse: 'collapse', fontSize: '13px', minWidth: '240px', width: '100%' }}>
            <thead><tr>
              {vars.map(v => <th key={v} scope="col" style={{ padding: '7px 12px', borderBottom: '2px solid var(--surface-border)', color: 'var(--chapter-color)', fontWeight: 600, textAlign: 'center' }}>{v}</th>)}
              <th scope="col" style={{ padding: '7px 12px', borderBottom: '2px solid var(--surface-border)', color: '#FCD34D', fontWeight: 600, textAlign: 'center' }}>KB</th>
              <th scope="col" style={{ padding: '7px 12px', borderBottom: '2px solid var(--surface-border)', color: '#93C5FD', fontWeight: 600, textAlign: 'center' }}>α</th>
            </tr></thead>
            <tbody>
              {steps.map((s, i) => {
                const isActive = i === step;
                const bg = isActive ? (s.kbValue ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.2)') : (s.kbValue ? 'rgba(16,185,129,0.1)' : 'transparent');
                return (
                  <tr key={i} aria-current={isActive ? 'true' : undefined}
                    style={{ background: bg, outline: isActive ? '2px solid var(--chapter-color)' : 'none', transition: rm ? 'none' : 'background 0.2s' }}>
                    {[...s.assignment.entries()].map(([v, val]) => (
                      <td key={v} style={{ padding: '6px 12px', textAlign: 'center', color: val ? '#6EE7B7' : '#FCA5A5' }}>{val ? 'T' : 'F'}</td>
                    ))}
                    <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: s.kbValue ? '#6EE7B7' : '#FCA5A5' }}>{s.kbValue ? 'T' : 'F'}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: s.alphaValue ? '#6EE7B7' : '#FCA5A5' }}>{s.alphaValue ? 'T' : 'F'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>Row</span>
              <span style={{ color: '#E5E7EB', fontWeight: 600 }}>{current.rowIndex + 1} / {current.totalRows}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>KB</span>
              <span style={{ fontWeight: 600, color: current.kbValue ? '#6EE7B7' : '#FCA5A5' }}>{current.kbValue ? 'true' : 'false'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>α</span>
              <span style={{ fontWeight: 600, color: current.alphaValue ? '#6EE7B7' : '#FCA5A5' }}>{current.alphaValue ? 'true' : 'false'}</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            {step === steps.length - 1 && finalResult && finalResult !== 'pending' && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', textAlign: 'center', fontWeight: 700, fontSize: '15px',
                background: finalResult === 'proved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                border: `1px solid ${finalResult === 'proved' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                color: finalResult === 'proved' ? '#6EE7B7' : '#FCA5A5' }}>
                {finalResult === 'proved' ? 'KB ⊨ α ✓' : 'KB ⊭ α ✗'}
              </div>
            )}
            {current.result === 'pending' && <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>Checking…</div>}
          </div>
        </Panel>
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="TT-Entails playback controls" />
    </div>
  );
}

// ─── Truth Table Tab ──────────────────────────────────────────────────────────

function TruthTableTab() {
  const rows = useMemo(() => generateTruthTable(TRUTH_FORMULA), []);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = rows[step];
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < rows.length - 1) setStep(s => s + 1); else setPlaying(false); }, 700 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, rows.length, rm]);
  if (current === undefined) return null;
  const formulaHtml = renderDisplayMath('(P \\Rightarrow Q) \\land (Q \\Rightarrow R) \\Rightarrow (P \\Rightarrow R)');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }} aria-label="Formula: (P implies Q) and (Q implies R) implies (P implies R)" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ overflowX: 'auto', flex: '1 1 auto' }}>
          <table role="table" aria-label="Truth table" style={{ borderCollapse: 'collapse', fontSize: '14px', minWidth: '320px' }}>
            <thead><tr>
              {['P', 'Q', 'R', 'Formula'].map(h => (
                <th key={h} scope="col" style={{ padding: '8px 16px', borderBottom: '2px solid var(--surface-border)', color: 'var(--chapter-color)', fontWeight: 600, textAlign: 'center' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((row, i) => {
                const isActive = i === step;
                const bg = isActive ? (row.result ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : (row.result ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)');
                return (
                  <tr key={i} aria-current={isActive ? 'true' : undefined}
                    style={{ background: bg, outline: isActive ? '2px solid var(--chapter-color)' : 'none', transition: rm ? 'none' : 'background 0.2s' }}>
                    {(['P', 'Q', 'R'] as const).map(v => (
                      <td key={v} style={{ padding: '7px 16px', textAlign: 'center', color: row.assignment.get(v) ? '#6EE7B7' : '#FCA5A5' }}>{row.assignment.get(v) ? 'T' : 'F'}</td>
                    ))}
                    <td style={{ padding: '7px 16px', textAlign: 'center', fontWeight: 700, color: row.result ? '#6EE7B7' : '#FCA5A5' }}>{row.result ? 'T' : 'F'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Panel title="Current Row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['P', 'Q', 'R'] as const).map(v => (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#9CA3AF' }}>{v}</span>
                <span style={{ fontWeight: 700, color: current.assignment.get(v) ? '#6EE7B7' : '#FCA5A5' }}>{current.assignment.get(v) ? 'true' : 'false'}</span>
              </div>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>Result</span>
              <span style={{ fontWeight: 700, color: current.result ? '#6EE7B7' : '#FCA5A5' }}>{current.result ? 'TRUE' : 'FALSE'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>Row {step + 1} of {rows.length}</div>
          </div>
        </Panel>
      </div>
      <Controls step={step} total={rows.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(rows.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="Truth table playback controls" />
    </div>
  );
}

// ─── Resolution Tab ────────────────────────────────────────────────────────────────



function ResolutionTab() {
  const [exIdx, setExIdx] = useState(0);
  const ex = RESOLUTION_EXAMPLES[exIdx]!;
  const steps = useMemo(() => plResolution(ex.kbClauses, ex.negAlphaClauses), [ex]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[step];
  useEffect(() => { setStep(0); setPlaying(false); }, [exIdx]);
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 900 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  if (current === undefined) return null;
  const cStr = (c: readonly string[]) => c.length === 0 ? '⊥' : c.map(l => l.startsWith('~') ? `¬${l.slice(1)}` : l).join(' ∨ ');
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((l, i) => l === b[i]);
  const kbMath  = renderDisplayMath(`\\text{KB} = ${ex.kbMath}`);
  const alpMath = renderDisplayMath(`\\alpha = ${ex.alphaMath}`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
        borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>Example:</span>
        <select value={exIdx} onChange={e => setExIdx(parseInt(e.target.value))} aria-label="Select resolution example"
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'var(--surface-3)', color: '#E5E7EB', fontSize: '14px', cursor: 'pointer' }}>
          {RESOLUTION_EXAMPLES.map((e2, i) => <option key={i} value={i}>{e2.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: '1 1 200px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: kbMath }} aria-label={`KB = ${ex.kbMath}`} />
        <div style={{ flex: '1 1 120px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: alpMath }} aria-label={`alpha = ${ex.alphaMath}`} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h4 style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600 }}>Clause Set ({current.allClauses.length} clauses)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {current.allClauses.map((clause, i) => {
              const isEmpty = clause.length === 0;
              const isC1 = current.clause1.length > 0 && same(clause, current.clause1);
              const isC2 = current.clause2.length > 0 && same(clause, current.clause2);
              let bg = 'rgba(255,255,255,0.05)', border = '1px solid rgba(255,255,255,0.08)';
              if (isEmpty) { bg = 'rgba(16,185,129,0.2)'; border = '1px solid rgba(16,185,129,0.5)'; }
              else if (isC1 || isC2) { bg = 'rgba(59,130,246,0.25)'; border = '1px solid rgba(59,130,246,0.6)'; }
              return (
                <div key={i} aria-label={`Clause ${i + 1}: ${cStr(clause)}${isC1 ? ' (p1)' : ''}${isC2 ? ' (p2)' : ''}`}
                  style={{ padding: '7px 12px', borderRadius: '7px', background: bg, border,
                    fontSize: '13px', fontFamily: 'monospace', color: isEmpty ? '#6EE7B7' : '#E5E7EB',
                    fontWeight: isEmpty || isC1 || isC2 ? 600 : 400,
                    transition: rm ? 'none' : 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#6B7280', minWidth: '20px', fontSize: '11px' }}>{i + 1}.</span>
                  <span>[{cStr(clause)}]</span>
                  {(isC1 || isC2) && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#93C5FD' }}>resolving</span>}
                  {isEmpty && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6EE7B7' }}>✓ empty!</span>}
                </div>
              );
            })}
          </div>
          <div aria-live="polite" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
            background: current.result === 'proved' ? 'rgba(16,185,129,0.15)' : current.result === 'disproved' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${current.result === 'proved' ? 'rgba(16,185,129,0.4)' : current.result === 'disproved' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.3)'}`,
            color: current.result === 'proved' ? '#6EE7B7' : current.result === 'disproved' ? '#FCA5A5' : '#93C5FD' }}>
            {current.action}
          </div>
        </div>
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>Step</span><span style={{ color: '#E5E7EB', fontWeight: 600 }}>{step + 1} / {steps.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>Clauses</span><span style={{ color: '#A5B4FC', fontWeight: 600 }}>{current.allClauses.length}</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            {current.resolvent !== null && (
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Resolvent</div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#93C5FD' }}>[{cStr(current.resolvent)}]</div>
              </div>
            )}
            <div style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textAlign: 'center',
              background: current.result === 'proved' ? 'rgba(16,185,129,0.2)' : current.result === 'disproved' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              color: current.result === 'proved' ? '#6EE7B7' : current.result === 'disproved' ? '#FCA5A5' : '#9CA3AF' }}>
              {current.result === 'proved' ? '✓ PROVED' : current.result === 'disproved' ? '✗ DISPROVED' : '⋯ PENDING'}
            </div>
          </div>
        </Panel>
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="Resolution playback controls" />
    </div>
  );
}

// ─── DPLL Tab ────────────────────────────────────────────────────────────────────

function clauseColor(clause: readonly string[], dpllStep: DPLLStep): string {
  if (clause.length === 0) return 'rgba(239,68,68,0.3)';
  if (clause.length === 1) return 'rgba(245,158,11,0.25)';
  const sat = clause.some(ls => {
    const isNeg = ls.startsWith('~'); const v = isNeg ? ls.slice(1) : ls;
    const val = dpllStep.assignment.get(v); return val !== undefined && val === !isNeg;
  });
  return sat ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)';
}

function DPLLTab() {
  const steps = useMemo(() => dpll(DPLL_CNF), []);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[step];
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 900 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  if (current === undefined) return null;
  const cnfHtml = renderDisplayMath('(P \\lor Q) \\land (\\lnot P \\lor R) \\land (\\lnot Q \\lor \\lnot R) \\land (P \\lor \\lnot R)');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: cnfHtml }} aria-label="CNF formula: (P or Q) and (not P or R) and (not Q or not R) and (P or not R)" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h4 style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600 }}>Active Clauses</h4>
          {current.clauses.length === 0
            ? <div style={{ color: '#6EE7B7', fontSize: '14px', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>✓ All clauses satisfied</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {current.clauses.map((clause, i) => (
                  <div key={i} role="listitem" aria-label={`Clause ${i + 1}: ${clause.length === 0 ? 'empty' : clause.join(' or ')}`}
                    style={{ padding: '8px 12px', borderRadius: '8px', background: clauseColor(clause, current),
                      border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px', fontFamily: 'monospace',
                      transition: rm ? 'none' : 'background 0.2s' }}>
                    {clause.length === 0
                      ? <span style={{ color: '#FCA5A5' }}>⊥ empty clause</span>
                      : clause.map((ls, j) => (
                          <span key={j}>
                            {j > 0 && <span style={{ color: '#6B7280', margin: '0 4px' }}>∨</span>}
                            <span style={{ color: ls.startsWith('~') ? '#FCA5A5' : '#93C5FD', fontWeight: clause.length === 1 ? 700 : 400 }}>
                              {ls.startsWith('~') ? `¬${ls.slice(1)}` : ls}
                            </span>
                          </span>
                        ))
                    }
                  </div>
                ))}
              </div>
          }
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            {[{ label: 'Satisfied', color: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)' },
              { label: 'Unit', color: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.5)' },
              { label: 'Empty', color: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)' },
              { label: 'Normal', color: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9CA3AF' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, border: `1px solid ${l.border}`, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div aria-live="polite" style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '12px',
              background: current.result === 'sat' ? 'rgba(16,185,129,0.15)' : current.result === 'unsat' ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.12)',
              border: `1px solid ${current.result === 'sat' ? 'rgba(16,185,129,0.4)' : current.result === 'unsat' ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.3)'}`,
              color: current.result === 'sat' ? '#6EE7B7' : current.result === 'unsat' ? '#FCA5A5' : '#C4B5FD' }}>{current.action}</div>
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignment</div>
              {current.assignment.size === 0
                ? <div style={{ color: '#6B7280', fontSize: '13px' }}>empty</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...current.assignment.entries()].map(([v, val]) => (
                      <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#93C5FD', fontFamily: 'monospace' }}>{v}</span>
                        <span style={{ fontWeight: 600, color: val ? '#6EE7B7' : '#FCA5A5' }}>{val ? 'true' : 'false'}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
            <div style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textAlign: 'center',
              background: current.result === 'sat' ? 'rgba(16,185,129,0.2)' : current.result === 'unsat' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              color: current.result === 'sat' ? '#6EE7B7' : current.result === 'unsat' ? '#FCA5A5' : '#9CA3AF' }}>
              {current.result === 'sat' ? '✓ SATISFIABLE' : current.result === 'unsat' ? '✗ UNSATISFIABLE' : '⋯ PENDING'}
            </div>
          </div>
        </Panel>
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="DPLL playback controls" />
    </div>
  );
}

// ─── WalkSAT Tab ───────────────────────────────────────────────────────────────



function WalkSATTab() {
  const [noiseP, setNoiseP] = useState(0.3);
  const [fIdx, setFIdx] = useState(0);
  const formula = WALKSAT_FORMULAS[fIdx]!;
  const steps = useMemo(() => walkSat(formula.clauses, noiseP, 20, 42), [formula, noiseP]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useMemo(() => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);
  const current = steps[Math.min(step, steps.length - 1)];
  useEffect(() => { setStep(0); setPlaying(false); }, [fIdx, noiseP]);
  useEffect(() => {
    if (!playing || rm) return;
    timerRef.current = setTimeout(() => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false); }, 700 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, rm]);
  if (current === undefined) return null;
  const satPct = Math.round((current.satisfiedCount / current.totalClauses) * 100);
  const flipLog = steps.slice(Math.max(0, step - 7), step + 1).filter(s => s.flip !== null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
        borderRadius: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>Controls:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E5E7EB' }}>
          Noise p:
          <input type="range" min={0} max={1} step={0.1} value={noiseP} onChange={e => setNoiseP(parseFloat(e.target.value))}
            aria-label="Noise probability p" style={{ width: '100px', accentColor: '#EF4444' }} />
          <span style={{ minWidth: '30px', color: '#FCA5A5', fontWeight: 600 }}>{noiseP.toFixed(1)}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#E5E7EB' }}>
          Formula:
          <select value={fIdx} onChange={e => setFIdx(parseInt(e.target.value))} aria-label="Select WalkSAT formula"
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'var(--surface-3)', color: '#E5E7EB', fontSize: '13px', cursor: 'pointer' }}>
            {WALKSAT_FORMULAS.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
              <span>Satisfied clauses</span>
              <span style={{ fontWeight: 600, color: current.satisfiedCount === current.totalClauses ? '#6EE7B7' : '#E5E7EB' }}>
                {current.satisfiedCount} / {current.totalClauses} ({satPct}%)
              </span>
            </div>
            <div style={{ height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${satPct}%`, borderRadius: '6px',
                background: current.satisfiedCount === current.totalClauses ? '#10B981' : '#EF4444',
                transition: rm ? 'none' : 'width 0.3s ease' }} />
            </div>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flip Log (last 8)</h4>
            {flipLog.length === 0
              ? <div style={{ color: '#6B7280', fontSize: '13px' }}>No flips yet.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {flipLog.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 10px', borderRadius: '6px', fontSize: '12px',
                      background: i === flipLog.length - 1 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                      border: i === flipLog.length - 1 ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent' }}>
                      <span style={{ color: '#9CA3AF' }}>i={s.iteration}</span>
                      <span style={{ color: '#E5E7EB', fontFamily: 'monospace', fontWeight: 600 }}>flip {s.flip}</span>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px',
                        background: s.flipType === 'greedy' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                        color:      s.flipType === 'greedy' ? '#6EE7B7'               : '#FCD34D' }}>{s.flipType}</span>
                      <span style={{ color: s.satisfiedCount === s.totalClauses ? '#6EE7B7' : '#9CA3AF' }}>{s.satisfiedCount}/{s.totalClauses}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[['Iteration', String(current.iteration), '#E5E7EB'],
              ['Last flip', current.flip ?? '—', '#FCA5A5'],
              ['Flip type', current.flipType ?? '—', current.flipType === 'greedy' ? '#6EE7B7' : current.flipType === 'random' ? '#FCD34D' : '#6B7280'],
              ['Satisfied', `${current.satisfiedCount}/${current.totalClauses}`, '#A5B4FC']
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#9CA3AF' }}>{k}</span><span style={{ color: c, fontWeight: 600, fontFamily: k === 'Last flip' ? 'monospace' : undefined }}>{v}</span>
              </div>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Assignment</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[...current.assignment.entries()].map(([v, val]) => (
                <span key={v} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace',
                  background: val ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: val ? '#6EE7B7' : '#FCA5A5',
                  border: current.flip === v ? '1px solid rgba(239,68,68,0.6)' : '1px solid transparent' }}>
                  {v}={val ? 'T' : 'F'}
                </span>
              ))}
            </div>
            <div style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textAlign: 'center',
              background: current.result === 'sat' ? 'rgba(16,185,129,0.2)' : current.result === 'max_flips' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              color: current.result === 'sat' ? '#6EE7B7' : current.result === 'max_flips' ? '#FCA5A5' : '#9CA3AF' }}>
              {current.result === 'sat' ? '✓ SATISFIABLE' : current.result === 'max_flips' ? '✗ MAX FLIPS' : '⋯ SEARCHING'}
            </div>
          </div>
        </Panel>
      </div>
      <Controls step={step} total={steps.length} playing={playing} speed={speed}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }} onSpeedChange={setSpeed} label="WalkSAT playback controls" />
    </div>
  );
}

// ─── Main Visualizer ──────────────────────────────────────────────────────────────────

interface TabContent { heading: string; description: React.ReactNode; content: React.ReactNode; }

export default function LogicalAgentsVisualizer() {
  const [activeTab, setActiveTab] = useState<TabId>('kb-agent');

  const tabContent: Record<TabId, TabContent> = {
    'kb-agent':    { heading: 'KB-Agent', description: 'The Knowledge-Based Agent loop (Figure 7.1): at each time step the agent TELLs the KB what it perceived and ASKs for the best action. Watch how percepts accumulate into KB facts that drive decisions.', content: <KBAgentTab /> },
    'wumpus':      { heading: 'Wumpus World', description: 'A 4×4 grid where an agent uses a propositional Knowledge Base to infer safe cells, locate the Wumpus, and find the gold through logical deduction.', content: <WumpusTab /> },
    'logic':       { heading: 'Logic & Entailment (TT-ENTAILS)', description: 'TT-ENTAILS (Figure 7.10) checks KB ⊨ α by enumerating all 2ⁿ truth-table rows. Rows where the KB is satisfied are highlighted green; if α is false in any such row, entailment fails.', content: <LogicEntailmentTab /> },
    'truth-table': { heading: 'Truth Table', description: 'Enumerate all 2ⁿ truth assignments for the hypothetical syllogism tautology (P⇒Q) ∧ (Q⇒R) ⇒ (P⇒R). Green rows are true, red rows are false.', content: <TruthTableTab /> },
    'resolution':  { heading: 'PL-Resolution', description: 'PL-RESOLUTION (Figure 7.12) proves KB ⊨ α by showing KB ∧ ¬α is unsatisfiable. Pairs of clauses are resolved until the empty clause is derived (proved) or no new clauses can be added (disproved).', content: <ResolutionTab /> },
    'dpll':        { heading: 'DPLL Step-by-Step', description: 'The Davis-Putnam-Logemann-Loveland algorithm solves SAT via unit propagation, pure symbol elimination, and recursive branching with backtracking.', content: <DPLLTab /> },
    'walksat':     { heading: 'WalkSAT', description: 'Randomized local-search SAT solver (Figure 7.15). Each step flips one variable — greedily (maximises satisfied clauses) or by random walk (noise). Use the slider to control the noise level p.', content: <WalkSATTab /> },
  };

  const tabInfo = tabContent[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div role="tablist" aria-label="Visualization tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px',
        padding: '8px', background: 'var(--surface-1)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
        {TABS.map(tab => (
          <button key={tab.id} role="tab" id={`tab-${tab.id}`} aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: activeTab === tab.id ? tab.color : 'transparent',
              color: activeTab === tab.id ? 'white' : '#9CA3AF',
              cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap' }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>{tabInfo.heading}</h2>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>{tabInfo.description}</p>
          {tabInfo.content}
        </section>
      </div>
    </div>
  );
}
