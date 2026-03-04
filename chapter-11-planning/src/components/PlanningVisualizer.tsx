/**
 * Chapter 11 — Automated Planning
 * Interactive visualizations for all 7 sections of AIMA Chapter 11.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  isApplicable,
  applyAction,
  satisfiesGoal,
  forwardSearch,
  backwardSearch,
  ignorePreconditionsHeuristic,
  ignoreDeleteListsHeuristic,
  htnSearch,
  sensorlessExecution,
  criticalPathMethod,
} from '../algorithms/index';
import type {
  PlanningAction,
  PlanningProblem,
  PlanningState,
  ForwardSearchStep,
  BackwardSearchStep,
  HTNSearchStep,
  HLADefinition,
  SensorlessStep,
  CPMResult,
  ScheduleAction,
} from '../algorithms/index';

// ─── Utility: KaTeX renderer ──────────────────────────────────────────────────

function KatexSpan({ latex, displayMode = false }: { latex: string; displayMode?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try { katex.render(latex, ref.current, { throwOnError: false, displayMode }); }
      catch { /* ignore */ }
    }
  }, [latex, displayMode]);
  return <span ref={ref} aria-label={latex} />;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  surfaceBase: '#0A0A0F',
  surface1: '#111118',
  surface2: '#1A1A24',
  surface3: '#242430',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  chapterColor: '#8B5CF6',
};

const btnStyle: React.CSSProperties = {
  background: COLORS.surface3,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.textPrimary,
  borderRadius: '8px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
};

const btnPrimaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: COLORS.primary,
  border: `1px solid ${COLORS.primary}`,
};

const btnDisabledStyle: React.CSSProperties = {
  ...btnStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
};

const panelStyle: React.CSSProperties = {
  background: COLORS.surface2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  background: COLORS.surface1,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'clamp(18px, 3vw, 24px)',
  fontWeight: 700,
  color: COLORS.textPrimary,
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const tagStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  background: `${color}20`,
  color,
  border: `1px solid ${color}40`,
  marginRight: '4px',
});

// ─── Playback controls ────────────────────────────────────────────────────────

const SPEEDS = [0.5, 1, 2, 4];

interface ControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onSpeedChange: (s: number) => void;
}

function Controls({
  onPlay, onPause, onStepForward, onStepBackward, onReset,
  isPlaying, currentStep, totalSteps, speed, onSpeedChange,
}: ControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
      <button onClick={onReset} aria-label="Reset" style={btnStyle} title="Reset">↺</button>
      <button
        onClick={onStepBackward}
        disabled={currentStep === 0}
        aria-label="Step backward"
        style={currentStep === 0 ? btnDisabledStyle : btnStyle}
      >‹</button>
      <button
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={btnPrimaryStyle}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1}
        aria-label="Step forward"
        style={currentStep >= totalSteps - 1 ? btnDisabledStyle : btnStyle}
      >›</button>
      <span style={{ fontSize: '13px', color: COLORS.textSecondary, minWidth: '60px' }}>
        {currentStep + 1} / {totalSteps}
      </span>
      <label htmlFor="speed-select" style={{ fontSize: '13px', color: COLORS.textMuted }}>Speed:</label>
      <select
        id="speed-select"
        value={speed}
        onChange={e => onSpeedChange(Number(e.target.value))}
        aria-label="Playback speed"
        style={{ ...btnStyle, padding: '4px 8px' }}
      >
        {SPEEDS.map(s => <option key={s} value={s}>{s}×</option>)}
      </select>
    </div>
  );
}

function usePlayback(totalSteps: number, speed: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const prefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || prefersReduced.current) return;
    const interval = 1000 / speed;
    const tick = (time: number) => {
      if (time - lastTimeRef.current >= interval) {
        lastTimeRef.current = time;
        setCurrentStep(s => {
          if (s >= totalSteps - 1) { stop(); return s; }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, speed, totalSteps, stop]);

  const play = useCallback(() => {
    if (prefersReduced.current) return;
    if (currentStep >= totalSteps - 1) setCurrentStep(0);
    lastTimeRef.current = 0;
    setIsPlaying(true);
  }, [currentStep, totalSteps]);

  const reset = useCallback(() => { stop(); setCurrentStep(0); }, [stop]);
  const stepForward = useCallback(() => {
    stop();
    setCurrentStep(s => Math.min(s + 1, totalSteps - 1));
  }, [stop, totalSteps]);
  const stepBackward = useCallback(() => {
    stop();
    setCurrentStep(s => Math.max(s - 1, 0));
  }, [stop]);

  return { currentStep, setCurrentStep, isPlaying, play, pause: stop, reset, stepForward, stepBackward };
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <span style={{
        background: `${COLORS.chapterColor}20`, color: COLORS.chapterColor,
        borderRadius: '8px', padding: '4px 10px', fontSize: '13px', fontWeight: 700,
        border: `1px solid ${COLORS.chapterColor}40`,
      }}>§{num}</span>
      <h2 style={sectionHeadingStyle}>{title}</h2>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.1  CLASSICAL PLANNING — BLOCKS WORLD
// ════════════════════════════════════════════════════════════════════════════════

// Blocks world actions for A, B, C
const BLOCKS_ACTIONS: PlanningAction[] = [
  // Stack X onto Y (from Table)
  { name: 'Stack(A,B)', preconditions: ['On(A,Table)','Clear(A)','Clear(B)'], negPreconditions: [], addList: ['On(A,B)'], deleteList: ['On(A,Table)','Clear(B)'] },
  { name: 'Stack(A,C)', preconditions: ['On(A,Table)','Clear(A)','Clear(C)'], negPreconditions: [], addList: ['On(A,C)'], deleteList: ['On(A,Table)','Clear(C)'] },
  { name: 'Stack(B,A)', preconditions: ['On(B,Table)','Clear(B)','Clear(A)'], negPreconditions: [], addList: ['On(B,A)'], deleteList: ['On(B,Table)','Clear(A)'] },
  { name: 'Stack(B,C)', preconditions: ['On(B,Table)','Clear(B)','Clear(C)'], negPreconditions: [], addList: ['On(B,C)'], deleteList: ['On(B,Table)','Clear(C)'] },
  { name: 'Stack(C,A)', preconditions: ['On(C,Table)','Clear(C)','Clear(A)'], negPreconditions: [], addList: ['On(C,A)'], deleteList: ['On(C,Table)','Clear(A)'] },
  { name: 'Stack(C,B)', preconditions: ['On(C,Table)','Clear(C)','Clear(B)'], negPreconditions: [], addList: ['On(C,B)'], deleteList: ['On(C,Table)','Clear(B)'] },
  // Unstack X from Y (to Table)
  { name: 'Unstack(A,B)', preconditions: ['On(A,B)','Clear(A)'], negPreconditions: [], addList: ['On(A,Table)','Clear(B)'], deleteList: ['On(A,B)'] },
  { name: 'Unstack(A,C)', preconditions: ['On(A,C)','Clear(A)'], negPreconditions: [], addList: ['On(A,Table)','Clear(C)'], deleteList: ['On(A,C)'] },
  { name: 'Unstack(B,A)', preconditions: ['On(B,A)','Clear(B)'], negPreconditions: [], addList: ['On(B,Table)','Clear(A)'], deleteList: ['On(B,A)'] },
  { name: 'Unstack(B,C)', preconditions: ['On(B,C)','Clear(B)'], negPreconditions: [], addList: ['On(B,Table)','Clear(C)'], deleteList: ['On(B,C)'] },
  { name: 'Unstack(C,A)', preconditions: ['On(C,A)','Clear(C)'], negPreconditions: [], addList: ['On(C,Table)','Clear(A)'], deleteList: ['On(C,A)'] },
  { name: 'Unstack(C,B)', preconditions: ['On(C,B)','Clear(C)'], negPreconditions: [], addList: ['On(C,Table)','Clear(B)'], deleteList: ['On(C,B)'] },
];

// Initial: C on A, A on Table, B on Table; Clear(C), Clear(B)
const BLOCKS_INITIAL: string[] = ['On(C,A)','On(A,Table)','On(B,Table)','Clear(C)','Clear(B)'];
// Goal: A on B, B on Table, C on Table
const BLOCKS_GOAL: string[] = ['On(A,B)','On(B,Table)','On(C,Table)'];

const BLOCK_COLORS: Record<string, string> = { A: '#6366F1', B: '#10B981', C: '#F59E0B' };

function parseBlocksStacks(fluents: ReadonlySet<string>): Map<string, string[]> {
  // Returns stacks: each key is bottom element (or 'table'), value is array bottom→top
  const onMap = new Map<string, string>(); // block → what it's on
  for (const f of fluents) {
    const m = f.match(/^On\(([A-C]),(Table|[A-C])\)$/);
    if (m) onMap.set(m[1]!, m[2]!);
  }
  // Build columns: find blocks on Table
  const columns: Map<string, string[]> = new Map();
  for (const [block, base] of onMap) {
    if (base === 'Table') {
      // Build the stack upward from block
      const stack: string[] = [block];
      let top = block;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let found = false;
        for (const [b2, b2base] of onMap) {
          if (b2base === top) { stack.push(b2); top = b2; found = true; break; }
        }
        if (!found) break;
      }
      columns.set(block, stack);
    }
  }
  return columns;
}

function BlocksDiagram({ fluents }: { fluents: ReadonlySet<string> }) {
  const stacks = parseBlocksStacks(fluents);
  const stackArray = [...stacks.values()];
  // Pad to 3 columns
  while (stackArray.length < 3) stackArray.push([]);

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', justifyContent: 'center', padding: '16px 0' }}>
      {stackArray.map((stack, ci) => (
        <div key={ci} style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px', width: '64px', minHeight: '80px' }}>
          {stack.map(block => (
            <div key={block} style={{
              width: '64px', height: '40px',
              background: BLOCK_COLORS[block] ?? COLORS.primary,
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>{block}</div>
          ))}
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', marginTop: '4px' }} />
        </div>
      ))}
    </div>
  );
}

function Section1_ClassicalPlanning() {
  const [currentFluents, setCurrentFluents] = useState<Set<string>>(new Set(BLOCKS_INITIAL));
  const [history, setHistory] = useState<Set<string>[]>([new Set(BLOCKS_INITIAL)]);
  const [histIdx, setHistIdx] = useState(0);

  const state = history[histIdx]!;
  const applicable = BLOCKS_ACTIONS.filter(a => isApplicable(state, a));
  const goalSatisfied = satisfiesGoal(state, BLOCKS_GOAL, []);

  const applyAct = (action: PlanningAction) => {
    const next = applyAction(state, action) as Set<string>;
    const newHistory = history.slice(0, histIdx + 1);
    newHistory.push(new Set(next));
    setHistory(newHistory);
    setHistIdx(newHistory.length - 1);
    setCurrentFluents(new Set(next));
  };

  const undo = () => { if (histIdx > 0) setHistIdx(histIdx - 1); };
  const reset = () => { setHistory([new Set(BLOCKS_INITIAL)]); setHistIdx(0); setCurrentFluents(new Set(BLOCKS_INITIAL)); };

  void currentFluents; // used via state

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.1" title="Classical Planning & PDDL" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        A <em>planning problem</em> in PDDL consists of a state (set of true fluents), actions with preconditions and add/delete lists,
        and a goal. The state transition is:{' '}
        <KatexSpan latex="\text{RESULT}(s, a) = (s - \text{DEL}(a)) \cup \text{ADD}(a)" />
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Block diagram */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', fontSize: '13px' }}>
            BLOCKS WORLD STATE
          </div>
          <BlocksDiagram fluents={state} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={undo} disabled={histIdx === 0} aria-label="Undo" style={histIdx === 0 ? btnDisabledStyle : btnStyle}>
              ← Undo
            </button>
            <button onClick={reset} aria-label="Reset blocks" style={btnStyle}>↺ Reset</button>
          </div>
        </div>

        {/* Fluent list */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', fontSize: '13px' }}>
            FLUENTS (TRUE IN CURRENT STATE)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {[...state].sort().map(f => (
              <span key={f} style={{
                ...tagStyle(BLOCK_COLORS[f.charAt(3)] ?? COLORS.primary),
                fontSize: '12px', fontFamily: 'monospace',
              }}>{f}</span>
            ))}
          </div>
          <div style={{ fontWeight: 600, color: COLORS.textSecondary, marginBottom: '6px', fontSize: '13px' }}>
            GOAL FLUENTS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {BLOCKS_GOAL.map(f => {
              const satisfied = state.has(f);
              return (
                <span key={f} style={{
                  padding: '3px 8px', borderRadius: '6px', fontSize: '12px',
                  fontFamily: 'monospace', fontWeight: 600,
                  background: satisfied ? `${COLORS.secondary}20` : `${COLORS.danger}20`,
                  color: satisfied ? COLORS.secondary : COLORS.danger,
                  border: `1px solid ${satisfied ? COLORS.secondary : COLORS.danger}40`,
                }}>
                  {satisfied ? '✓' : '✗'} {f}
                </span>
              );
            })}
          </div>
          {goalSatisfied && (
            <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: `${COLORS.secondary}20`, color: COLORS.secondary, fontWeight: 600, fontSize: '14px' }}>
              🎉 Goal Achieved!
            </div>
          )}
        </div>

        {/* Applicable actions */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', fontSize: '13px' }}>
            APPLICABLE ACTIONS ({applicable.length})
          </div>
          {applicable.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: '13px' }}>No applicable actions in this state.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {applicable.map(a => (
                <button
                  key={a.name}
                  onClick={() => applyAct(a)}
                  aria-label={`Apply action ${a.name}`}
                  style={{ ...btnStyle, textAlign: 'left', fontSize: '12px', fontFamily: 'monospace' }}
                >
                  <span style={{ color: COLORS.primary, fontWeight: 700 }}>{a.name}</span>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>
                    ADD: [{a.addList.join(', ')}] &nbsp; DEL: [{a.deleteList.join(', ')}]
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDDL explanation */}
      <div style={{ marginTop: '16px', padding: '12px 16px', background: COLORS.surface3, borderRadius: '8px', fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.7 }}>
        <strong style={{ color: COLORS.textPrimary }}>How it works:</strong> Click an action to apply it to the current state.
        Each action has <em>preconditions</em> (must be true), an <em>ADD list</em> (fluents made true), and a <em>DELETE list</em> (fluents made false).
        The goal is to arrange: A on B, B on Table, C on Table.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.2  FORWARD & BACKWARD SEARCH
// ════════════════════════════════════════════════════════════════════════════════

// Spare Tire Problem
const SPARE_TIRE_ACTIONS: PlanningAction[] = [
  {
    name: 'Remove(Spare,Trunk)',
    preconditions: ['At(Spare,Trunk)'], negPreconditions: [],
    addList: ['At(Spare,Ground)'], deleteList: ['At(Spare,Trunk)'],
  },
  {
    name: 'Remove(Flat,Axle)',
    preconditions: ['At(Flat,Axle)'], negPreconditions: [],
    addList: ['At(Flat,Ground)'], deleteList: ['At(Flat,Axle)'],
  },
  {
    name: 'PutOn(Spare,Axle)',
    preconditions: ['At(Spare,Ground)', 'At(Flat,Ground)'], negPreconditions: [],
    addList: ['At(Spare,Axle)'], deleteList: ['At(Spare,Ground)'],
  },
  {
    name: 'LeaveOvernight',
    preconditions: [], negPreconditions: [],
    addList: [],
    deleteList: ['At(Spare,Ground)', 'At(Flat,Ground)', 'At(Flat,Axle)', 'At(Spare,Trunk)', 'At(Spare,Axle)'],
  },
];

const SPARE_TIRE_PROBLEM: PlanningProblem = {
  initialState: ['At(Flat,Axle)', 'At(Spare,Trunk)'],
  goalFluents: ['At(Spare,Axle)'],
  goalNegFluents: [],
  actions: SPARE_TIRE_ACTIONS,
};

function ForwardSearchViz() {
  const result = useRef(forwardSearch(SPARE_TIRE_PROBLEM)).current;
  const [speed, setSpeed] = useState(1);
  const { currentStep, isPlaying, play, pause, reset, stepForward, stepBackward } = usePlayback(result.steps.length, speed);
  const step: ForwardSearchStep = result.steps[currentStep]!;

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '14px', color: COLORS.textSecondary }}>
        BFS explores states level by level. At each step, the planner picks a state from the frontier,
        checks if it satisfies the goal, and expands it by applying all applicable actions.
      </div>
      <Controls
        onPlay={play} onPause={pause} onStepForward={stepForward} onStepBackward={stepBackward}
        onReset={reset} isPlaying={isPlaying} currentStep={currentStep}
        totalSteps={result.steps.length} speed={speed} onSpeedChange={setSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Current step info */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>CURRENT STEP</div>
          <div style={{
            padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
            background: step.isGoal ? `${COLORS.secondary}20` : COLORS.surface3,
            border: `1px solid ${step.isGoal ? COLORS.secondary : COLORS.border}`,
            fontSize: '13px', color: step.isGoal ? COLORS.secondary : COLORS.textPrimary,
          }}>
            {step.action}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
            Frontier: <strong style={{ color: COLORS.accent }}>{step.frontierSize}</strong> &nbsp;
            Explored: <strong style={{ color: COLORS.primary }}>{step.exploredCount}</strong> &nbsp;
            h = <strong style={{ color: COLORS.secondary }}>{step.heuristic}</strong>
          </div>
        </div>

        {/* State fluents */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>STATE FLUENTS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {step.state.map(f => (
              <span key={f} style={{
                ...tagStyle(SPARE_TIRE_PROBLEM.goalFluents.includes(f) ? COLORS.secondary : COLORS.primary),
                fontSize: '11px', fontFamily: 'monospace',
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Plan so far */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>PLAN SO FAR</div>
          {step.plan.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>—</div>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              {step.plan.map((a, i) => (
                <li key={i} style={{ color: COLORS.textPrimary, fontSize: '12px', fontFamily: 'monospace', marginBottom: '2px' }}>{a}</li>
              ))}
            </ol>
          )}
          {step.isGoal && (
            <div style={{ marginTop: '8px', color: COLORS.secondary, fontWeight: 600, fontSize: '13px' }}>✓ Goal reached!</div>
          )}
        </div>

        {/* Applicable actions */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>APPLICABLE ACTIONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {step.applicableActions.map(a => (
              <span key={a} style={{ ...tagStyle(COLORS.accent), fontSize: '11px', fontFamily: 'monospace' }}>{a}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackwardSearchViz() {
  const result = useRef(backwardSearch(SPARE_TIRE_PROBLEM)).current;
  const [speed, setSpeed] = useState(1);
  const { currentStep, isPlaying, play, pause, reset, stepForward, stepBackward } = usePlayback(result.steps.length, speed);
  const step: BackwardSearchStep = result.steps[currentStep]!;

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '14px', color: COLORS.textSecondary }}>
        Regression search works backwards from the goal. At each step, it finds actions <em>relevant</em> to the current goal description
        and regresses the goal through them, adding preconditions and removing achieved effects.
      </div>
      <Controls
        onPlay={play} onPause={pause} onStepForward={stepForward} onStepBackward={stepBackward}
        onReset={reset} isPlaying={isPlaying} currentStep={currentStep}
        totalSteps={result.steps.length} speed={speed} onSpeedChange={setSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>REGRESSION STEP</div>
          <div style={{
            padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
            background: step.isInitial ? `${COLORS.secondary}20` : COLORS.surface3,
            border: `1px solid ${step.isInitial ? COLORS.secondary : COLORS.border}`,
            fontSize: '13px', color: step.isInitial ? COLORS.secondary : COLORS.textPrimary,
          }}>
            {step.action}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
            Frontier: <strong style={{ color: COLORS.accent }}>{step.frontierSize}</strong> &nbsp;
            Explored: <strong style={{ color: COLORS.primary }}>{step.exploredCount}</strong>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>CURRENT GOAL DESCRIPTION</div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>POSITIVE:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {step.goalPos.map(f => (
                <span key={f} style={{ ...tagStyle(COLORS.secondary), fontSize: '11px', fontFamily: 'monospace' }}>{f}</span>
              ))}
              {step.goalPos.length === 0 && <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>none</span>}
            </div>
          </div>
          <div>
            <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>NEGATIVE:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {step.goalNeg.map(f => (
                <span key={f} style={{ ...tagStyle(COLORS.danger), fontSize: '11px', fontFamily: 'monospace' }}>¬{f}</span>
              ))}
              {step.goalNeg.length === 0 && <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>none</span>}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>PLAN (FORWARD ORDER)</div>
          {step.plan.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>—</div>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              {step.plan.map((a, i) => (
                <li key={i} style={{ color: COLORS.textPrimary, fontSize: '12px', fontFamily: 'monospace', marginBottom: '2px' }}>{a}</li>
              ))}
            </ol>
          )}
          {step.isInitial && (
            <div style={{ marginTop: '8px', color: COLORS.secondary, fontWeight: 600, fontSize: '13px' }}>✓ Reached initial state!</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section2_SearchAlgorithms() {
  const [tab, setTab] = useState<'forward' | 'backward'>('forward');

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.2" title="Algorithms for Classical Planning" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        Two BFS-based approaches on the <strong style={{ color: COLORS.textPrimary }}>Spare Tire Problem</strong>:
        forward search (progression from initial state) and backward search (regression from goal).
      </p>

      {/* Tab switch */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['forward', 'backward'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-label={`Show ${t} search`}
            style={{
              ...btnStyle,
              background: tab === t ? COLORS.primary : COLORS.surface3,
              border: `1px solid ${tab === t ? COLORS.primary : COLORS.border}`,
              fontWeight: tab === t ? 700 : 400,
            }}
          >
            {t === 'forward' ? '→ Forward (Progression)' : '← Backward (Regression)'}
          </button>
        ))}
      </div>

      {tab === 'forward' ? <ForwardSearchViz /> : <BackwardSearchViz />}

      <div style={{ marginTop: '16px', padding: '12px 16px', background: COLORS.surface3, borderRadius: '8px', fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.7 }}>
        <strong style={{ color: COLORS.textPrimary }}>Spare Tire Problem:</strong> Initial: {'{At(Flat,Axle), At(Spare,Trunk)}'}.
        Goal: {'{At(Spare,Axle)}'}.
        Actions: Remove(Spare,Trunk), Remove(Flat,Axle), PutOn(Spare,Axle), LeaveOvernight.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.3  HEURISTICS FOR PLANNING
// ════════════════════════════════════════════════════════════════════════════════

const HEURISTIC_GOAL_FLUENTS = ['At(Spare,Axle)', 'Clear(A)', 'On(A,B)', 'On(B,Table)'];
const ALL_FLUENTS = [
  'At(Flat,Axle)', 'At(Spare,Trunk)', 'At(Spare,Ground)', 'At(Flat,Ground)',
  'At(Spare,Axle)', 'Clear(A)', 'Clear(B)', 'Clear(C)', 'On(A,Table)',
  'On(B,Table)', 'On(A,B)', 'On(B,C)', 'On(C,A)',
];

const HEURISTIC_ACTIONS: PlanningAction[] = [
  ...SPARE_TIRE_ACTIONS,
  ...BLOCKS_ACTIONS,
];

function Section3_Heuristics() {
  const [satisfiedCount, setSatisfiedCount] = useState(0);

  const currentState: PlanningState = new Set(HEURISTIC_GOAL_FLUENTS.slice(0, satisfiedCount));
  const unsatisfied = HEURISTIC_GOAL_FLUENTS.filter(f => !currentState.has(f));
  const h1 = ignorePreconditionsHeuristic(currentState, HEURISTIC_GOAL_FLUENTS);
  const h2 = ignoreDeleteListsHeuristic(currentState, HEURISTIC_GOAL_FLUENTS, HEURISTIC_ACTIONS);

  const maxVal = Math.max(h1, h2, 1);

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.3" title="Heuristics for Planning" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        Two admissible heuristics estimate cost-to-goal by solving <em>relaxed</em> problems.
        <strong style={{ color: COLORS.primary }}> Ignore Preconditions</strong> counts unsatisfied goal fluents.
        <strong style={{ color: COLORS.secondary }}> Ignore Delete Lists</strong> greedily estimates steps in a relaxed problem with no deletions.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Slider control */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '12px' }}>
            WHAT-IF CONTROL: Goals Satisfied
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="range"
              min={0}
              max={HEURISTIC_GOAL_FLUENTS.length}
              value={satisfiedCount}
              onChange={e => setSatisfiedCount(Number(e.target.value))}
              aria-label="Number of satisfied goals"
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: COLORS.textMuted }}>
              <span>0 goals</span>
              <span style={{ fontWeight: 700, color: COLORS.textPrimary }}>{satisfiedCount} / {HEURISTIC_GOAL_FLUENTS.length}</span>
              <span>{HEURISTIC_GOAL_FLUENTS.length} goals</span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>Goal fluents:</div>
          {HEURISTIC_GOAL_FLUENTS.map((f, i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
              <span style={{ color: i < satisfiedCount ? COLORS.secondary : COLORS.danger }}>
                {i < satisfiedCount ? '✓' : '✗'}
              </span>
              <span style={{ color: i < satisfiedCount ? COLORS.secondary : COLORS.textSecondary }}>{f}</span>
            </div>
          ))}

          {unsatisfied.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.textMuted }}>
              Unsatisfied: {unsatisfied.join(', ')}
            </div>
          )}
        </div>

        {/* Heuristic values */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '16px' }}>
            HEURISTIC VALUES
          </div>

          {/* h1 bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.primary }}>
                h<sub>1</sub> (Ignore Preconditions)
              </span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: COLORS.primary }}>{h1}</span>
            </div>
            <div style={{ height: '16px', background: COLORS.surface3, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(h1 / maxVal) * 100}%`,
                background: COLORS.primary, borderRadius: '8px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
              = count of unsatisfied goal fluents
            </div>
          </div>

          {/* h2 bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.secondary }}>
                h<sub>2</sub> (Ignore Delete Lists)
              </span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: COLORS.secondary }}>{h2}</span>
            </div>
            <div style={{ height: '16px', background: COLORS.surface3, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(h2 / maxVal) * 100}%`,
                background: COLORS.secondary, borderRadius: '8px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
              = greedy steps in relaxed problem (no deletes)
            </div>
          </div>

          <div style={{ padding: '10px', background: COLORS.surface3, borderRadius: '8px', fontSize: '12px', color: COLORS.textSecondary }}>
            <KatexSpan latex="h_1 \leq h_2 \leq h^*" /> — both are admissible; h<sub>2</sub> dominates h<sub>1</sub>
          </div>

          {/* KaTeX formulas */}
          <div style={{ marginTop: '12px', fontSize: '12px', color: COLORS.textMuted, lineHeight: 1.8 }}>
            <div><KatexSpan latex="h_1(s) = |\{g \in \text{GOAL} : g \notin s\}|" /></div>
            <div style={{ marginTop: '4px' }}><KatexSpan latex="h_2(s) = \text{cost of relaxed plan (no } \text{DEL})" /></div>
          </div>
        </div>

        {/* Admissibility explanation */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>
            WHY THESE ARE ADMISSIBLE
          </div>
          <div style={{ fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong style={{ color: COLORS.primary }}>h₁</strong> assumes each unsatisfied goal fluent can be achieved
              in exactly one step — impossible to do better, so h₁ ≤ h*.
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong style={{ color: COLORS.secondary }}>h₂</strong> solves a relaxed problem where actions can only ADD fluents.
              Any real plan is also a solution to the relaxed problem, so h₂ ≤ h*.
            </p>
            <p>
              h₂ never underestimates as much as h₁ does (it is more informed), so it typically
              leads to fewer nodes expanded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.4  HIERARCHICAL TASK NETWORKS (HTN)
// ════════════════════════════════════════════════════════════════════════════════

// Hawaii vacation HTN
const HTN_PRIMITIVE_ACTIONS: PlanningAction[] = [
  { name: 'DriveToSFO', preconditions: [], negPreconditions: [], addList: ['At(SFO)'], deleteList: [] },
  { name: 'TakeTaxiToSFO', preconditions: [], negPreconditions: [], addList: ['At(SFO)'], deleteList: [] },
  { name: 'BoardSFOtoHNL', preconditions: ['At(SFO)'], negPreconditions: [], addList: ['At(HNL)'], deleteList: ['At(SFO)'] },
  { name: 'BoardHNLtoKOA', preconditions: ['At(HNL)'], negPreconditions: [], addList: ['At(KOA)'], deleteList: ['At(HNL)'] },
  { name: 'VisitVolcanoes', preconditions: ['At(KOA)'], negPreconditions: [], addList: ['Done(Volcanoes)'], deleteList: [] },
  { name: 'SnorkelAtKona', preconditions: ['At(KOA)'], negPreconditions: [], addList: ['Done(Snorkel)'], deleteList: [] },
];

const HTN_PROBLEM: PlanningProblem = {
  initialState: [],
  goalFluents: ['At(KOA)', 'Done(Volcanoes)'],
  goalNegFluents: [],
  actions: HTN_PRIMITIVE_ACTIONS,
};

const HTN_HIERARCHY: Map<string, HLADefinition> = new Map([
  ['GoOnVacation', {
    name: 'GoOnVacation',
    refinements: [
      { steps: ['GetToHawaii', 'DoActivities'] },
    ],
  }],
  ['GetToHawaii', {
    name: 'GetToHawaii',
    refinements: [
      { steps: ['FlyViaSFO'] },
    ],
  }],
  ['FlyViaSFO', {
    name: 'FlyViaSFO',
    refinements: [
      { steps: ['DriveToSFO', 'BoardSFOtoHNL', 'BoardHNLtoKOA'] },
      { steps: ['TakeTaxiToSFO', 'BoardSFOtoHNL', 'BoardHNLtoKOA'] },
    ],
  }],
  ['DoActivities', {
    name: 'DoActivities',
    refinements: [
      { steps: ['VisitVolcanoes', 'SnorkelAtKona'] },
      { steps: ['VisitVolcanoes'] },
    ],
  }],
]);

function Section4_HTN() {
  const result = useRef(htnSearch(HTN_PROBLEM, HTN_HIERARCHY, ['GoOnVacation'], 50)).current;
  const [speed, setSpeed] = useState(1);
  const { currentStep, isPlaying, play, pause, reset, stepForward, stepBackward } = usePlayback(result.steps.length, speed);
  const step: HTNSearchStep = result.steps[currentStep]!;

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.4" title="Hierarchical Task Networks (HTN)" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        HTN planning decomposes <em>High-Level Actions (HLAs)</em> into sequences of sub-actions until all are primitive.
        HIERARCHICAL-SEARCH does BFS over plans, expanding one HLA at a time using its refinements.
        This example plans a <strong style={{ color: COLORS.textPrimary }}>Hawaii vacation</strong>.
      </p>

      <Controls
        onPlay={play} onPause={pause} onStepForward={stepForward} onStepBackward={stepBackward}
        onReset={reset} isPlaying={isPlaying} currentStep={currentStep}
        totalSteps={result.steps.length} speed={speed} onSpeedChange={setSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {/* Current action */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>CURRENT STEP</div>
          <div style={{
            padding: '8px 12px', borderRadius: '8px', marginBottom: '10px',
            background: step.isGoal ? `${COLORS.secondary}20` : step.isPrimitive ? `${COLORS.accent}20` : COLORS.surface3,
            border: `1px solid ${step.isGoal ? COLORS.secondary : step.isPrimitive ? COLORS.accent : COLORS.border}`,
            fontSize: '13px',
            color: step.isGoal ? COLORS.secondary : step.isPrimitive ? COLORS.accent : COLORS.textPrimary,
          }}>
            {step.action}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
            Depth: <strong style={{ color: COLORS.primary }}>{step.depth}</strong> &nbsp;
            Frontier: <strong style={{ color: COLORS.accent }}>{step.frontierSize}</strong>
          </div>
          {step.expandedHLA && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: COLORS.textMuted }}>Expanding HLA: </span>
              <span style={{ ...tagStyle(COLORS.chapterColor), fontSize: '12px', fontFamily: 'monospace' }}>{step.expandedHLA}</span>
            </div>
          )}
        </div>

        {/* Plan */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>CURRENT PLAN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {step.plan.map((a, i) => {
              const isHLA = HTN_HIERARCHY.has(a);
              const isExpanded = a === step.expandedHLA;
              return (
                <div key={i} style={{
                  padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace',
                  background: isExpanded ? `${COLORS.chapterColor}30` : isHLA ? `${COLORS.primary}15` : COLORS.surface3,
                  border: `1px solid ${isExpanded ? COLORS.chapterColor : isHLA ? `${COLORS.primary}40` : COLORS.border}`,
                  color: isExpanded ? COLORS.chapterColor : isHLA ? COLORS.primary : COLORS.textPrimary,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {isHLA && <span style={{ fontSize: '10px', opacity: 0.7 }}>HLA</span>}
                  {a}
                </div>
              );
            })}
          </div>
          {step.isPrimitive && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.accent, fontWeight: 600 }}>
              All primitive!
            </div>
          )}
        </div>

        {/* HTN Hierarchy overview */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>HTN HIERARCHY</div>
          <div style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.8 }}>
            {[...HTN_HIERARCHY.entries()].map(([hlaName, def]) => (
              <div key={hlaName} style={{ marginBottom: '8px' }}>
                <span style={{ ...tagStyle(COLORS.chapterColor), fontFamily: 'monospace' }}>{hlaName}</span>
                <div style={{ paddingLeft: '12px', marginTop: '2px' }}>
                  {def.refinements.map((ref, i) => (
                    <div key={i} style={{ fontSize: '11px', color: COLORS.textMuted, fontFamily: 'monospace' }}>
                      → [{ref.steps.join(', ')}]
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.found && (
        <div style={{ marginTop: '12px', padding: '12px 16px', background: `${COLORS.secondary}15`, border: `1px solid ${COLORS.secondary}40`, borderRadius: '8px', fontSize: '13px' }}>
          <strong style={{ color: COLORS.secondary }}>Solution found! </strong>
          <span style={{ color: COLORS.textSecondary }}>Primitive plan: </span>
          <span style={{ fontFamily: 'monospace', color: COLORS.textPrimary }}>{result.plan.join(' → ')}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.5  SENSORLESS / NONDETERMINISTIC PLANNING
// ════════════════════════════════════════════════════════════════════════════════

// Painting problem: paint objects to be the same color (white)
const PAINT_ACTIONS: PlanningAction[] = [
  {
    name: 'PaintChairWhite',
    preconditions: [], negPreconditions: [],
    addList: ['Color(Chair,White)'], deleteList: ['Color(Chair,Red)', 'Color(Chair,Blue)', 'Color(Chair,Unknown)'],
  },
  {
    name: 'PaintTableWhite',
    preconditions: [], negPreconditions: [],
    addList: ['Color(Table,White)'], deleteList: ['Color(Table,Red)', 'Color(Table,Blue)', 'Color(Table,Unknown)'],
  },
  {
    name: 'PaintShelfWhite',
    preconditions: [], negPreconditions: [],
    addList: ['Color(Shelf,White)'], deleteList: ['Color(Shelf,Red)', 'Color(Shelf,Blue)', 'Color(Shelf,Unknown)'],
  },
];

const PAINT_INITIAL_BELIEF = {
  trueFluents: [],
  falseFluents: [],
};

const PAINT_GOAL_POS = ['Color(Chair,White)', 'Color(Table,White)', 'Color(Shelf,White)'];
const PAINT_GOAL_NEG: string[] = [];

function Section5_Sensorless() {
  const allSteps = useRef(
    sensorlessExecution(PAINT_INITIAL_BELIEF, PAINT_ACTIONS, PAINT_GOAL_POS, PAINT_GOAL_NEG)
  ).current;
  const [speed, setSpeed] = useState(1);
  const { currentStep, isPlaying, play, pause, reset, stepForward, stepBackward } = usePlayback(allSteps.length, speed);
  const step: SensorlessStep = allSteps[currentStep]!;

  // Derive unknown fluents (all relevant fluents minus known true/false)
  const allRelevant = ['Color(Chair,White)', 'Color(Chair,Red)', 'Color(Table,White)', 'Color(Table,Red)', 'Color(Shelf,White)', 'Color(Shelf,Red)'];
  const knownTrue = new Set(step.belief.trueFluents);
  const knownFalse = new Set(step.belief.falseFluents);
  const unknown = allRelevant.filter(f => !knownTrue.has(f) && !knownFalse.has(f));

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.5" title="Sensorless & Contingent Planning" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        In <em>sensorless planning</em>, the agent has no sensors — it maintains a <em>belief state</em> (set of possible world states).
        Actions update the belief state: known-true fluents are certain; known-false fluents are certainly absent; the rest are unknown.
        This example paints objects to make their color known.
      </p>

      <Controls
        onPlay={play} onPause={pause} onStepForward={stepForward} onStepBackward={stepBackward}
        onReset={reset} isPlaying={isPlaying} currentStep={currentStep}
        totalSteps={allSteps.length} speed={speed} onSpeedChange={setSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Action */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px' }}>STEP</div>
          <div style={{
            padding: '8px 12px', borderRadius: '8px', marginBottom: '8px',
            background: step.goalSatisfied ? `${COLORS.secondary}20` : COLORS.surface3,
            border: `1px solid ${step.goalSatisfied ? COLORS.secondary : COLORS.border}`,
            fontSize: '13px', color: step.goalSatisfied ? COLORS.secondary : COLORS.textPrimary,
          }}>
            {step.action}
          </div>
          {step.appliedAction && (
            <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
              Action applied: <span style={{ color: COLORS.accent, fontFamily: 'monospace' }}>{step.appliedAction}</span>
            </div>
          )}
        </div>

        {/* Known True */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.secondary, marginBottom: '8px' }}>
            ✓ KNOWN TRUE ({step.belief.trueFluents.length})
          </div>
          {step.belief.trueFluents.length === 0 ? (
            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>none</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {step.belief.trueFluents.map(f => (
                <span key={f} style={{ ...tagStyle(COLORS.secondary), fontSize: '12px', fontFamily: 'monospace' }}>✓ {f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Known False */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.danger, marginBottom: '8px' }}>
            ✗ KNOWN FALSE ({step.belief.falseFluents.length})
          </div>
          {step.belief.falseFluents.length === 0 ? (
            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>none</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {step.belief.falseFluents.map(f => (
                <span key={f} style={{ ...tagStyle(COLORS.danger), fontSize: '12px', fontFamily: 'monospace' }}>✗ {f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Unknown */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.accent, marginBottom: '8px' }}>
            ? UNKNOWN ({unknown.length})
          </div>
          {unknown.length === 0 ? (
            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>none</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {unknown.map(f => (
                <span key={f} style={{ ...tagStyle(COLORS.accent), fontSize: '12px', fontFamily: 'monospace' }}>? {f}</span>
              ))}
            </div>
          )}
          {step.goalSatisfied && (
            <div style={{ marginTop: '8px', color: COLORS.secondary, fontWeight: 600, fontSize: '13px' }}>🎉 Goal satisfied!</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '12px 16px', background: COLORS.surface3, borderRadius: '8px', fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.7 }}>
        <strong style={{ color: COLORS.textPrimary }}>Belief State Update:</strong> <KatexSpan latex="b' = (b - \text{DEL}(a)) \cup \text{ADD}(a)" />.
        After painting an object white, the agent <em>knows</em> its color is white — uncertainty is resolved.
        The goal is achieved when all objects are known to be white.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.6  TIME, SCHEDULES & RESOURCES (CPM)
// ════════════════════════════════════════════════════════════════════════════════

const CAR_ASSEMBLY_ACTIONS: ScheduleAction[] = [
  { id: 'Axle-F',  duration: 10, predecessors: [],            resource: 'Mechanic 1' },
  { id: 'Axle-B',  duration: 10, predecessors: [],            resource: 'Mechanic 2' },
  { id: 'Wheel-RF', duration: 1,  predecessors: ['Axle-F'],   resource: 'Mechanic 1' },
  { id: 'Wheel-LF', duration: 1,  predecessors: ['Axle-F'],   resource: 'Mechanic 2' },
  { id: 'Wheel-RB', duration: 1,  predecessors: ['Axle-B'],   resource: 'Mechanic 1' },
  { id: 'Wheel-LB', duration: 1,  predecessors: ['Axle-B'],   resource: 'Mechanic 2' },
  { id: 'Tighten-RF', duration: 2, predecessors: ['Wheel-RF'], resource: 'Mechanic 1' },
  { id: 'Tighten-LF', duration: 2, predecessors: ['Wheel-LF'], resource: 'Mechanic 2' },
  { id: 'Tighten-RB', duration: 2, predecessors: ['Wheel-RB'], resource: 'Mechanic 1' },
  { id: 'Tighten-LB', duration: 2, predecessors: ['Wheel-LB'], resource: 'Mechanic 2' },
  { id: 'Inspect',  duration: 3,  predecessors: ['Tighten-RF','Tighten-LF','Tighten-RB','Tighten-LB'], resource: 'Inspector' },
];

function Section6_Scheduling() {
  const [durations, setDurations] = useState<Record<string, number>>(
    Object.fromEntries(CAR_ASSEMBLY_ACTIONS.map(a => [a.id, a.duration]))
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const actions = CAR_ASSEMBLY_ACTIONS.map(a => ({ ...a, duration: durations[a.id] ?? a.duration }));
  const results: CPMResult[] = criticalPathMethod(actions) as CPMResult[];

  const makespan = results.reduce((m, r) => Math.max(m, r.ef), 0);
  const scale = makespan > 0 ? 100 / makespan : 1; // percent per time unit

  const RESOURCE_COLORS: Record<string, string> = {
    'Mechanic 1': COLORS.primary,
    'Mechanic 2': COLORS.secondary,
    'Inspector': COLORS.accent,
  };

  return (
    <div style={cardStyle}>
      <SectionLabel num="11.6" title="Time, Schedules & Resources (CPM)" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
        The <em>Critical Path Method</em> computes earliest/latest start times for each action and identifies
        the <strong style={{ color: COLORS.danger }}>critical path</strong> — the longest chain of dependent actions
        that determines the minimum makespan. Slack = LS − ES: zero slack means critical.
      </p>

      {/* What-if duration control */}
      <div style={{ ...panelStyle, marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '10px' }}>
          WHAT-IF: Adjust Action Duration
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {CAR_ASSEMBLY_ACTIONS.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <label htmlFor={`dur-${a.id}`} style={{ color: COLORS.textSecondary, fontFamily: 'monospace', minWidth: '90px' }}>{a.id}:</label>
              <input
                id={`dur-${a.id}`}
                type="range" min={1} max={20} value={durations[a.id] ?? a.duration}
                onChange={e => setDurations(d => ({ ...d, [a.id]: Number(e.target.value) }))}
                aria-label={`Duration for ${a.id}`}
                style={{ width: '80px' }}
              />
              <span style={{ color: COLORS.textPrimary, minWidth: '20px' }}>{durations[a.id] ?? a.duration}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.textSecondary }}>
          Makespan: <strong style={{ color: COLORS.accent, fontSize: '16px' }}>{makespan}</strong> time units
        </div>
      </div>

      {/* Gantt chart */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '500px' }}>
          {/* Time axis */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingLeft: '100px' }}>
            {Array.from({ length: makespan + 1 }, (_, t) => (
              t % Math.max(1, Math.floor(makespan / 10)) === 0 && (
                <div key={t} style={{
                  position: 'absolute',
                  left: `calc(100px + ${t * scale}%)`,
                  fontSize: '10px', color: COLORS.textMuted,
                  transform: 'translateX(-50%)',
                }}>{t}</div>
              )
            ))}
            <div style={{ position: 'relative', width: '100%', height: '16px' }}>
              {Array.from({ length: Math.floor(makespan / Math.max(1, Math.floor(makespan / 10))) + 1 }, (_, i) => {
                const t = i * Math.max(1, Math.floor(makespan / 10));
                return t <= makespan ? (
                  <div key={t} style={{
                    position: 'absolute',
                    left: `${t * scale}%`,
                    fontSize: '10px', color: COLORS.textMuted,
                    transform: 'translateX(-50%)',
                  }}>{t}</div>
                ) : null;
              })}
            </div>
          </div>

          {results.map(r => {
            const isCritical = r.onCriticalPath;
            const isHovered = hoveredId === r.id;
            const color = isCritical ? COLORS.danger : (RESOURCE_COLORS[r.resource ?? ''] ?? COLORS.primary);

            return (
              <div
                key={r.id}
                style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '8px' }}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Action label */}
                <div style={{
                  width: '90px', flexShrink: 0, fontSize: '11px', fontFamily: 'monospace',
                  color: isCritical ? COLORS.danger : COLORS.textSecondary,
                  fontWeight: isCritical ? 700 : 400,
                  textAlign: 'right', paddingRight: '8px',
                }}>{r.id}</div>

                {/* Bar area */}
                <div style={{ flex: 1, position: 'relative', height: '28px' }}>
                  {/* Slack window */}
                  {r.slack > 0 && (
                    <div style={{
                      position: 'absolute',
                      left: `${r.ls * scale}%`,
                      width: `${r.slack * scale}%`,
                      height: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      borderRadius: '4px',
                    }} />
                  )}
                  {/* Main bar (ES to EF) */}
                  <div style={{
                    position: 'absolute',
                    left: `${r.es * scale}%`,
                    width: `${r.duration * scale}%`,
                    height: '100%',
                    background: isCritical
                      ? `linear-gradient(90deg, ${COLORS.danger}, #ff6b6b)`
                      : `linear-gradient(90deg, ${color}cc, ${color})`,
                    borderRadius: '4px',
                    border: isHovered ? '2px solid white' : `1px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: 'white',
                    boxShadow: isCritical ? `0 0 8px ${COLORS.danger}60` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                    transform: isHovered ? 'scaleY(1.1)' : 'none',
                  }}>
                    {r.duration > 0 && r.duration * scale > 5 ? r.duration : ''}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', paddingLeft: '100px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '10px', background: COLORS.danger, borderRadius: '2px' }} />
              <span style={{ color: COLORS.textSecondary }}>Critical path</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '10px', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: '2px' }} />
              <span style={{ color: COLORS.textSecondary }}>Slack window</span>
            </div>
            {Object.entries(RESOURCE_COLORS).map(([res, col]) => (
              <div key={res} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '10px', background: col, borderRadius: '2px' }} />
                <span style={{ color: COLORS.textSecondary }}>{res}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table on hover */}
      {(() => {
        const r = hoveredId ? results.find(x => x.id === hoveredId) : null;
        if (!r) return null;
        return (
          <div style={{ marginTop: '12px', padding: '12px 16px', background: COLORS.surface3, borderRadius: '8px', fontSize: '13px' }}>
            <strong style={{ color: COLORS.textPrimary }}>{r.id}</strong>
            {r.onCriticalPath && <span style={{ ...tagStyle(COLORS.danger), marginLeft: '8px' }}>CRITICAL</span>}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', color: COLORS.textSecondary }}>
              <span>ES = {r.es}</span><span>EF = {r.ef}</span>
              <span>LS = {r.ls}</span><span>LF = {r.lf}</span>
              <span>Slack = {r.slack}</span><span>Duration = {r.duration}</span>
            </div>
          </div>
        );
      })()}

      {/* CPM formulas */}
      <div style={{ marginTop: '16px', padding: '12px 16px', background: COLORS.surface3, borderRadius: '8px', fontSize: '13px', color: COLORS.textSecondary, lineHeight: 1.8 }}>
        <strong style={{ color: COLORS.textPrimary }}>CPM Formulas:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
          <KatexSpan latex="\text{ES}(B) = \max_{A \prec B}(\text{EF}(A))" />
          <KatexSpan latex="\text{EF}(A) = \text{ES}(A) + \text{dur}(A)" />
          <KatexSpan latex="\text{LS}(A) = \min_{B \succ A}(\text{LS}(B)) - \text{dur}(A)" />
          <KatexSpan latex="\text{Slack}(A) = \text{LS}(A) - \text{ES}(A)" />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// §11.7  ANALYSIS OF PLANNING APPROACHES
// ════════════════════════════════════════════════════════════════════════════════

interface ApproachRow {
  name: string;
  completeness: string;
  complexity: string;
  strengths: string;
  weaknesses: string;
  bestFor: string;
  color: string;
}

const APPROACHES: ApproachRow[] = [
  {
    name: 'Forward Search',
    completeness: 'Complete (BFS)',
    complexity: 'O(b^d)',
    strengths: 'Simple, easy to implement; good heuristics available',
    weaknesses: 'May explore irrelevant states; state space can be huge',
    bestFor: 'Problems with good heuristics (FF, LAMA)',
    color: COLORS.primary,
  },
  {
    name: 'Backward Search',
    completeness: 'Complete (BFS)',
    complexity: 'O(b^d)',
    strengths: 'Focuses on goal-relevant states; regression prunes irrelevant actions',
    weaknesses: 'Goal descriptions can grow; harder to compute heuristics',
    bestFor: 'Problems with many irrelevant actions',
    color: COLORS.secondary,
  },
  {
    name: 'HTN Planning',
    completeness: 'Incomplete (depends on hierarchy)',
    complexity: 'O(r^((d-1)/(k-1)))',
    strengths: 'Captures domain knowledge; produces explainable, structured plans',
    weaknesses: 'Requires careful hierarchy design; incomplete without full refinements',
    bestFor: 'Real-world tasks with natural hierarchical decomposition',
    color: COLORS.chapterColor,
  },
  {
    name: 'SAT-based (SATPLAN)',
    completeness: 'Complete (for fixed horizon)',
    complexity: 'NP in plan length',
    strengths: 'Powerful solvers; works well for short plans',
    weaknesses: 'Encoding size grows with horizon; sequential search needed',
    bestFor: 'Optimal planning, parallel action reasoning',
    color: COLORS.accent,
  },
];

function Section7_Analysis() {
  return (
    <div style={cardStyle}>
      <SectionLabel num="11.7" title="Analysis of Planning Approaches" />
      <p style={{ color: COLORS.textSecondary, marginBottom: '20px', lineHeight: 1.6 }}>
        Different planning algorithms have different strengths depending on the problem structure.
        The key factors are completeness, computational complexity, and the quality of available heuristics.
      </p>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 'clamp(11px, 1.5vw, 13px)',
        }}>
          <thead>
            <tr>
              {['Approach', 'Completeness', 'Complexity', 'Strengths', 'Weaknesses', 'Best For'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left',
                  background: COLORS.surface3, color: COLORS.textSecondary,
                  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                  borderBottom: `2px solid ${COLORS.border}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APPROACHES.map((row, i) => (
              <tr key={row.name} style={{ background: i % 2 === 0 ? COLORS.surface2 : COLORS.surface1 }}>
                <td style={{ padding: '12px', fontWeight: 700, color: row.color, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.name}
                </td>
                <td style={{ padding: '12px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.completeness}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.complexity}
                </td>
                <td style={{ padding: '12px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.strengths}
                </td>
                <td style={{ padding: '12px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.weaknesses}
                </td>
                <td style={{ padding: '12px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                  {row.bestFor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '20px' }}>
        <div style={{ ...panelStyle, borderLeft: `3px solid ${COLORS.primary}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.primary, marginBottom: '6px' }}>
            The Planning Complexity Landscape
          </div>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Classical STRIPS planning is PSPACE-complete in general. Finding optimal plans is NP-hard.
            Practical planners work well with good heuristics and domain knowledge.
          </p>
        </div>
        <div style={{ ...panelStyle, borderLeft: `3px solid ${COLORS.secondary}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.secondary, marginBottom: '6px' }}>
            Heuristics are the Key
          </div>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Modern planners like FF and FastDownward use relaxed plan heuristics derived from the
            planning graph or delete-relaxed problems to guide search enormously effectively.
          </p>
        </div>
        <div style={{ ...panelStyle, borderLeft: `3px solid ${COLORS.chapterColor}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.chapterColor, marginBottom: '6px' }}>
            Domain Knowledge Matters
          </div>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
            HTN hierarchies encode expert knowledge about <em>how</em> to achieve goals, dramatically
            reducing search space. Used in NASA's Europa Planner and many industrial systems.
          </p>
        </div>
        <div style={{ ...panelStyle, borderLeft: `3px solid ${COLORS.accent}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.accent, marginBottom: '6px' }}>
            Beyond Classical Planning
          </div>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Nondeterministic, partially observable, and temporal planning all extend the classical
            framework. MDPs and POMDPs handle uncertainty; job-shop scheduling adds resource constraints.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Main export
// ════════════════════════════════════════════════════════════════════════════════

export default function PlanningVisualizer() {
  return (
    <div style={{
      maxWidth: '1100px', margin: '0 auto',
      padding: 'clamp(12px, 3vw, 32px)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.textPrimary,
    }}>
      <Section1_ClassicalPlanning />
      <Section2_SearchAlgorithms />
      <Section3_Heuristics />
      <Section4_HTN />
      <Section5_Sensorless />
      <Section6_Scheduling />
      <Section7_Analysis />
    </div>
  );
}
