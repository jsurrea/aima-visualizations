import { useState, useEffect, useRef, useMemo } from 'react';
import {
  generateTruthTable,
  dpll,
  exploreWumpusWorld,
  type PropFormula,
  type CellStatus,
  type DPLLStep,
  type CNF,
} from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

// ─── Fixed inputs ─────────────────────────────────────────────────────────────

// (P ⇒ Q) ∧ (Q ⇒ R) ⇒ (P ⇒ R)
const TRUTH_FORMULA: PropFormula = {
  kind: 'compound',
  op: 'implies',
  left: {
    kind: 'compound',
    op: 'and',
    left: { kind: 'compound', op: 'implies', left: { kind: 'literal', name: 'P' }, right: { kind: 'literal', name: 'Q' } },
    right: { kind: 'compound', op: 'implies', left: { kind: 'literal', name: 'Q' }, right: { kind: 'literal', name: 'R' } },
  },
  right: {
    kind: 'compound',
    op: 'implies',
    left: { kind: 'literal', name: 'P' },
    right: { kind: 'literal', name: 'R' },
  },
};

// [[P, Q], [~P, R], [~Q, ~R], [P, ~R]]
const DPLL_CNF: CNF = [['P', 'Q'], ['~P', 'R'], ['~Q', '~R'], ['P', '~R']];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'wumpus' | 'truth-table' | 'dpll';

const CELL_STATUS_COLORS: Record<CellStatus, string> = {
  safe:    'rgba(16,185,129,0.25)',
  pit:     'rgba(239,68,68,0.35)',
  wumpus:  'rgba(139,92,246,0.35)',
  unknown: 'rgba(255,255,255,0.04)',
};

const CELL_STATUS_BORDER: Record<CellStatus, string> = {
  safe:    'rgba(16,185,129,0.6)',
  pit:     'rgba(239,68,68,0.6)',
  wumpus:  'rgba(139,92,246,0.6)',
  unknown: 'rgba(255,255,255,0.08)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ControlsProps {
  step: number;
  total: number;
  playing: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSpeedChange: (v: number) => void;
  label: string;
}

function Controls({
  step, total, playing, speed,
  onPlay, onPause, onStepBack, onStepForward, onReset, onSpeedChange, label,
}: ControlsProps) {
  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
    color: disabled ? '#4B5563' : '#E5E7EB',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background 0.15s',
  });

  return (
    <div
      role="toolbar"
      aria-label={label}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderRadius: '10px',
        border: '1px solid var(--surface-border)',
      }}
    >
      <button
        style={btnStyle(!playing)}
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-pressed={playing}
      >
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>
      <button
        style={btnStyle(step === 0)}
        onClick={onStepBack}
        disabled={step === 0}
        aria-label="Step backward"
      >
        ← Back
      </button>
      <button
        style={btnStyle(step >= total - 1)}
        onClick={onStepForward}
        disabled={step >= total - 1}
        aria-label="Step forward"
      >
        Forward →
      </button>
      <button
        style={btnStyle()}
        onClick={onReset}
        aria-label="Reset to start"
      >
        ↺ Reset
      </button>
      <span style={{ color: '#9CA3AF', fontSize: '13px', marginLeft: '4px' }}>
        Step {step + 1} / {total}
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', color: '#9CA3AF', fontSize: '13px' }}>
        Speed:
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.25}
          value={speed}
          onChange={e => onSpeedChange(parseFloat(e.target.value))}
          aria-label="Animation speed"
          style={{ width: '80px', accentColor: 'var(--chapter-color)' }}
        />
        <span style={{ minWidth: '28px' }}>{speed}×</span>
      </label>
    </div>
  );
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

function Panel({ title, children }: PanelProps) {
  return (
    <aside
      aria-label={title}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--surface-border)',
        borderRadius: '10px',
        padding: '16px',
        minWidth: '220px',
        maxWidth: '320px',
        flexShrink: 0,
      }}
    >
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--chapter-color)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        {title}
      </h3>
      {children}
    </aside>
  );
}

// ─── Wumpus World Tab ─────────────────────────────────────────────────────────

function WumpusTab() {
  const steps = useMemo(() => exploreWumpusWorld(), []);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = useMemo(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);

  const current = steps[step];

  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    timerRef.current = setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(s => s + 1);
      } else {
        setPlaying(false);
      }
    }, 1200 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, prefersReducedMotion]);

  if (current === undefined) return null;

  const cur = current;

  function cellIcon(r: number, c: number): string {
    const key = `${r},${c}`;
    const isAgent = cur.agentRow === r && cur.agentCol === c;
    if (isAgent) return '🤖';
    const status = cur.cellStatus.get(key);
    if (status === 'wumpus') return '💀';
    if (status === 'pit') return '🕳️';
    if (r === 1 && c === 2 && cur.visitedCells.has('1,2')) return '💰';
    return '';
  }

  const CELL = 70;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        {/* Grid */}
        <div role="grid" aria-label="Wumpus World 4×4 grid" style={{ flexShrink: 0 }}>
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} role="row" style={{ display: 'flex' }}>
              {Array.from({ length: 4 }, (_, c) => {
                const key = `${r},${c}`;
                const status: CellStatus = current.cellStatus.get(key) ?? 'unknown';
                const isAgent = current.agentRow === r && current.agentCol === c;
                const visited = current.visitedCells.has(key);
                return (
                  <div
                    key={c}
                    role="gridcell"
                    aria-label={`Cell (${r},${c}): ${status}${isAgent ? ', agent here' : ''}`}
                    style={{
                      width: CELL,
                      height: CELL,
                      border: `2px solid ${isAgent ? 'var(--chapter-color)' : CELL_STATUS_BORDER[status]}`,
                      background: visited && status === 'unknown' ? 'rgba(16,185,129,0.1)' : CELL_STATUS_COLORS[status],
                      borderRadius: '6px',
                      margin: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      position: 'relative',
                      transition: prefersReducedMotion ? 'none' : 'background 0.3s, border-color 0.3s',
                    }}
                  >
                    {cellIcon(r, c)}
                    <span style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '4px',
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.3)',
                    }}>
                      {r},{c}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* KB panel */}
        <Panel title="Knowledge Base">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
            {current.kbFacts.length === 0
              ? <p style={{ color: '#6B7280', fontSize: '13px' }}>No facts yet.</p>
              : current.kbFacts.map((fact, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12px',
                      color: fact.includes('GOLD') ? '#F59E0B' : '#D1D5DB',
                      background: fact.includes('GOLD') ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      borderLeft: `3px solid ${
                        fact.includes('Wumpus!') || fact.includes('GOLD') ? 'var(--chapter-color)' :
                        fact.includes('Pit!') ? '#EF4444' :
                        '#4B5563'
                      }`,
                    }}
                  >
                    {fact}
                  </div>
                ))
            }
          </div>
        </Panel>
      </div>

      {/* Action label */}
      <div
        aria-live="polite"
        style={{
          padding: '10px 14px',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '8px',
          color: '#C4B5FD',
          fontSize: '14px',
        }}
      >
        {current.action}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {(['safe', 'pit', 'wumpus', 'unknown'] as CellStatus[]).map(s => (
          <span key={s} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '12px', color: '#9CA3AF',
          }}>
            <span style={{
              width: '12px', height: '12px', borderRadius: '3px',
              background: CELL_STATUS_COLORS[s],
              border: `1px solid ${CELL_STATUS_BORDER[s]}`,
              display: 'inline-block',
            }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>

      <Controls
        step={step}
        total={steps.length}
        playing={playing}
        speed={speed}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }}
        onSpeedChange={setSpeed}
        label="Wumpus World playback controls"
      />
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

  const prefersReducedMotion = useMemo(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);

  const current = rows[step];

  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    timerRef.current = setTimeout(() => {
      if (step < rows.length - 1) {
        setStep(s => s + 1);
      } else {
        setPlaying(false);
      }
    }, 700 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, rows.length, prefersReducedMotion]);

  if (current === undefined) return null;

  const formulaHtml = renderDisplayMath('(P \\Rightarrow Q) \\land (Q \\Rightarrow R) \\Rightarrow (P \\Rightarrow R)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Formula */}
      <div
        style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
        aria-label="Formula: (P implies Q) and (Q implies R) implies (P implies R)"
      />

      {/* Table */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ overflowX: 'auto', flex: '1 1 auto' }}>
          <table
            role="table"
            aria-label="Truth table"
            style={{ borderCollapse: 'collapse', fontSize: '14px', minWidth: '320px' }}
          >
            <thead>
              <tr>
                {['P', 'Q', 'R', 'Formula'].map(h => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      padding: '8px 16px',
                      borderBottom: '2px solid var(--surface-border)',
                      color: 'var(--chapter-color)',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isActive = i === step;
                const bg = isActive
                  ? (row.result ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')
                  : (row.result ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)');
                return (
                  <tr
                    key={i}
                    aria-current={isActive ? 'true' : undefined}
                    style={{
                      background: bg,
                      outline: isActive ? '2px solid var(--chapter-color)' : 'none',
                      transition: prefersReducedMotion ? 'none' : 'background 0.2s',
                    }}
                  >
                    {(['P', 'Q', 'R'] as const).map(v => (
                      <td key={v} style={{ padding: '7px 16px', textAlign: 'center', color: row.assignment.get(v) ? '#6EE7B7' : '#FCA5A5' }}>
                        {row.assignment.get(v) ? 'T' : 'F'}
                      </td>
                    ))}
                    <td style={{ padding: '7px 16px', textAlign: 'center', fontWeight: 700, color: row.result ? '#6EE7B7' : '#FCA5A5' }}>
                      {row.result ? 'T' : 'F'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* State panel */}
        <Panel title="Current Row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['P', 'Q', 'R'] as const).map(v => (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#9CA3AF' }}>{v}</span>
                <span style={{
                  fontWeight: 700,
                  color: current.assignment.get(v) ? '#6EE7B7' : '#FCA5A5',
                }}>
                  {current.assignment.get(v) ? 'true' : 'false'}
                </span>
              </div>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9CA3AF' }}>Result</span>
              <span style={{ fontWeight: 700, color: current.result ? '#6EE7B7' : '#FCA5A5' }}>
                {current.result ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
              Row {step + 1} of {rows.length}
            </div>
          </div>
        </Panel>
      </div>

      <Controls
        step={step}
        total={rows.length}
        playing={playing}
        speed={speed}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(rows.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }}
        onSpeedChange={setSpeed}
        label="Truth table playback controls"
      />
    </div>
  );
}

// ─── DPLL Tab ─────────────────────────────────────────────────────────────────

function clauseColor(clause: readonly string[], step: DPLLStep): string {
  if (clause.length === 0) return 'rgba(239,68,68,0.3)';      // empty — red
  if (clause.length === 1) return 'rgba(245,158,11,0.25)';    // unit — yellow
  // Check if satisfied by current assignment
  const sat = clause.some(lit => {
    const neg = lit.startsWith('~');
    const v = neg ? lit.slice(1) : lit;
    const val = step.assignment.get(v);
    return val !== undefined && val === !neg;
  });
  if (sat) return 'rgba(16,185,129,0.2)';
  return 'rgba(255,255,255,0.05)';
}

function DPLLTab() {
  const steps = useMemo(() => dpll(DPLL_CNF), []);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = useMemo(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false, []);

  const current = steps[step];

  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    timerRef.current = setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(s => s + 1);
      } else {
        setPlaying(false);
      }
    }, 900 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, speed, steps.length, prefersReducedMotion]);

  if (current === undefined) return null;

  const cnfHtml = renderDisplayMath('(P \\lor Q) \\land (\\lnot P \\lor R) \\land (\\lnot Q \\lor \\lnot R) \\land (P \\lor \\lnot R)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Formula */}
      <div
        style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: cnfHtml }}
        aria-label="CNF formula: (P or Q) and (not P or R) and (not Q or not R) and (P or not R)"
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        {/* Clauses */}
        <div style={{ flex: '1 1 280px' }}>
          <h4 style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600 }}>
            Active Clauses
          </h4>
          {current.clauses.length === 0 ? (
            <div style={{ color: '#6EE7B7', fontSize: '14px', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
              ✓ All clauses satisfied
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {current.clauses.map((clause, i) => (
                <div
                  key={i}
                  role="listitem"
                  aria-label={`Clause ${i + 1}: ${clause.length === 0 ? 'empty' : clause.join(' ∨ ')}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: clauseColor(clause, current),
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    transition: prefersReducedMotion ? 'none' : 'background 0.2s',
                  }}
                >
                  {clause.length === 0
                    ? <span style={{ color: '#FCA5A5' }}>⊥ empty clause</span>
                    : clause.map((lit, j) => (
                        <span key={j}>
                          {j > 0 && <span style={{ color: '#6B7280', margin: '0 4px' }}>∨</span>}
                          <span style={{
                            color: lit.startsWith('~') ? '#FCA5A5' : '#93C5FD',
                            fontWeight: clause.length === 1 ? 700 : 400,
                          }}>
                            {lit.startsWith('~') ? `¬${lit.slice(1)}` : lit}
                          </span>
                        </span>
                      ))
                  }
                </div>
              ))}
            </div>
          )}

          {/* Color legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            {[
              { label: 'Satisfied', color: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)' },
              { label: 'Unit', color: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.5)' },
              { label: 'Empty', color: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)' },
              { label: 'Normal', color: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
            ].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9CA3AF' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, border: `1px solid ${l.border}`, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* State panel */}
        <Panel title="State Inspector">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Action */}
            <div
              aria-live="polite"
              style={{
                padding: '8px 10px',
                background: current.result === 'sat' ? 'rgba(16,185,129,0.15)' :
                             current.result === 'unsat' ? 'rgba(239,68,68,0.15)' :
                             'rgba(139,92,246,0.12)',
                border: `1px solid ${current.result === 'sat' ? 'rgba(16,185,129,0.4)' : current.result === 'unsat' ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.3)'}`,
                borderRadius: '6px',
                fontSize: '12px',
                color: current.result === 'sat' ? '#6EE7B7' : current.result === 'unsat' ? '#FCA5A5' : '#C4B5FD',
              }}
            >
              {current.action}
            </div>

            {/* Assignment */}
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assignment
              </div>
              {current.assignment.size === 0 ? (
                <div style={{ color: '#6B7280', fontSize: '13px' }}>{ '{}' }</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[...current.assignment.entries()].map(([v, val]) => (
                    <div key={v} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#93C5FD', fontFamily: 'monospace' }}>{v}</span>
                      <span style={{ fontWeight: 600, color: val ? '#6EE7B7' : '#FCA5A5' }}>{val ? 'true' : 'false'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Result badge */}
            <div style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              background: current.result === 'sat' ? 'rgba(16,185,129,0.2)' :
                           current.result === 'unsat' ? 'rgba(239,68,68,0.2)' :
                           'rgba(255,255,255,0.05)',
              color: current.result === 'sat' ? '#6EE7B7' : current.result === 'unsat' ? '#FCA5A5' : '#9CA3AF',
            }}>
              {current.result === 'sat' ? '✓ SATISFIABLE' : current.result === 'unsat' ? '✗ UNSATISFIABLE' : '⋯ PENDING'}
            </div>
          </div>
        </Panel>
      </div>

      <Controls
        step={step}
        total={steps.length}
        playing={playing}
        speed={speed}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onStepBack={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}
        onStepForward={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
        onReset={() => { setPlaying(false); setStep(0); }}
        onSpeedChange={setSpeed}
        label="DPLL playback controls"
      />
    </div>
  );
}

// ─── Main Visualizer ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'wumpus',      label: 'Wumpus World',   icon: '🗺️' },
  { id: 'truth-table', label: 'Truth Table',     icon: '📋' },
  { id: 'dpll',        label: 'DPLL',            icon: '🔍' },
];

export default function LogicalAgentsVisualizer() {
  const [activeTab, setActiveTab] = useState<Tab>('wumpus');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Visualization tabs"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px',
          background: 'var(--surface-1)',
          borderRadius: '12px',
          border: '1px solid var(--surface-border)',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--chapter-color)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {TABS.map(tab => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          style={{ display: activeTab === tab.id ? 'block' : 'none' }}
        >
          {activeTab === tab.id && (
            <>
              {tab.id === 'wumpus' && (
                <section>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Wumpus World</h2>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
                    A 4×4 grid where an agent uses a propositional Knowledge Base to infer safe cells,
                    locate the Wumpus, and find the gold through logical deduction.
                  </p>
                  <WumpusTab />
                </section>
              )}
              {tab.id === 'truth-table' && (
                <section>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Truth Table</h2>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
                    Enumerate all 2<sup>n</sup> truth assignments for the hypothetical syllogism tautology.
                    Green rows are true, red rows are false.
                  </p>
                  <TruthTableTab />
                </section>
              )}
              {tab.id === 'dpll' && (
                <section>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>DPLL Step-by-Step</h2>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
                    The Davis-Putnam-Logemann-Loveland algorithm solves SAT via unit propagation,
                    pure symbol elimination, and recursive branching with backtracking.
                  </p>
                  <DPLLTab />
                </section>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
