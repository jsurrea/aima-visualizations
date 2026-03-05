import { useState, useRef, useCallback, useEffect } from 'react';
import {
  allenRelation,
  eventCalcTrace,
  type TimeInterval,
  type AllenRelation,
  type EventCalcEvent,
  type EventCalcStep,
} from '../algorithms/index.js';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils.js';

// ─── Allen Relation Definitions ───────────────────────────────────────────────

const ALLEN_RELATIONS: ReadonlyArray<{
  name: AllenRelation;
  latex: string;
  example: string;
  aRange: [number, number];
  bRange: [number, number];
}> = [
  { name: 'precedes',      latex: 'a^- < a^+ < b^- < b^+',             example: 'A ends before B starts',           aRange: [1,3], bRange: [5,8] },
  { name: 'meets',         latex: 'a^- < a^+ = b^- < b^+',             example: 'A ends exactly where B starts',     aRange: [1,4], bRange: [4,8] },
  { name: 'overlaps',      latex: 'a^- < b^- < a^+ < b^+',             example: 'A and B overlap, A starts first',   aRange: [1,5], bRange: [3,8] },
  { name: 'starts',        latex: 'a^- = b^- < a^+ < b^+',             example: 'A starts with B, A ends first',     aRange: [1,4], bRange: [1,8] },
  { name: 'during',        latex: 'b^- < a^- < a^+ < b^+',             example: 'A is entirely inside B',            aRange: [3,6], bRange: [1,8] },
  { name: 'finishes',      latex: 'b^- < a^- < a^+ = b^+',             example: 'A ends with B, B starts first',     aRange: [4,8], bRange: [1,8] },
  { name: 'equals',        latex: 'a^- = b^- \\wedge a^+ = b^+',       example: 'A and B are identical',             aRange: [2,7], bRange: [2,7] },
  { name: 'preceded-by',   latex: 'b^- < b^+ < a^- < a^+',             example: 'B ends before A starts',           aRange: [5,8], bRange: [1,3] },
  { name: 'met-by',        latex: 'b^- < b^+ = a^- < a^+',             example: 'B ends exactly where A starts',     aRange: [4,8], bRange: [1,4] },
  { name: 'overlapped-by', latex: 'b^- < a^- < b^+ < a^+',             example: 'B and A overlap, B starts first',   aRange: [3,8], bRange: [1,5] },
  { name: 'started-by',    latex: 'a^- = b^- < b^+ < a^+',             example: 'A starts with B, B ends first',     aRange: [1,8], bRange: [1,4] },
  { name: 'contains',      latex: 'a^- < b^- < b^+ < a^+',             example: 'B is entirely inside A',            aRange: [1,8], bRange: [3,6] },
  { name: 'finished-by',   latex: 'a^- < b^- < a^+ = b^+',             example: 'A ends with B, A starts first',     aRange: [1,8], bRange: [4,8] },
];

// ─── Event Calculus Scenario ──────────────────────────────────────────────────

const SHANKAR_EVENTS: ReadonlyArray<EventCalcEvent> = [
  { id: 'Depart(Shankar,SF)', start: 0, end: 1, initiates: [], terminates: ['At(Shankar,SF)'] },
  { id: 'Fly(Shankar,SF,DC)', start: 1, end: 5, initiates: ['At(Shankar,DC)'], terminates: [] },
  { id: 'Drive(Shankar,DC,Berkeley)', start: 6, end: 9, initiates: ['At(Shankar,Berkeley)'], terminates: ['At(Shankar,DC)'] },
];
const SHANKAR_INIT = ['At(Shankar,SF)'];
const SHANKAR_TIME_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FLUENT_COLORS: Record<string, string> = {
  'At(Shankar,SF)': '#6366F1',
  'At(Shankar,DC)': '#10B981',
  'At(Shankar,Berkeley)': '#F59E0B',
};

// ─── Allen Sub-viz ────────────────────────────────────────────────────────────

const TIMELINE_W = 400;
const TIMELINE_H = 80;
const TMIN = 0;
const TMAX = 10;

function toPx(t: number) { return (t / TMAX) * (TIMELINE_W - 40) + 20; }
function fromPx(px: number) { return Math.round(((px - 20) / (TIMELINE_W - 40)) * TMAX); }

interface DragState { bar: 'a-start' | 'a-end' | 'b-start' | 'b-end'; startX: number; origVal: number }

function AllenViz() {
  const [tab, setTab] = useState<'interactive' | 'walkthrough'>('interactive');
  const [aStart, setAStart] = useState(1);
  const [aEnd, setAEnd] = useState(4);
  const [bStart, setBStart] = useState(3);
  const [bEnd, setBEnd] = useState(8);
  const [walkIdx, setWalkIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const relation = allenRelation({ start: aStart, end: aEnd }, { start: bStart, end: bEnd });
  const relInfo = ALLEN_RELATIONS.find(r => r.name === relation) ?? ALLEN_RELATIONS[0]!;

  // Walkthrough
  const walkEntry = ALLEN_RELATIONS[walkIdx] ?? ALLEN_RELATIONS[0]!;

  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (ts - lastTickRef.current > 1500 / speed) {
        lastTickRef.current = ts;
        setWalkIdx(i => {
          if (i >= ALLEN_RELATIONS.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed]);

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent<SVGRectElement>, bar: DragState['bar'], val: number) => {
    e.preventDefault();
    dragRef.current = { bar, startX: e.clientX, origVal: val };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scale = TIMELINE_W / rect.width;
      const dx = (e.clientX - d.startX) * scale;
      const newT = Math.max(TMIN, Math.min(TMAX, Math.round(d.origVal + dx / (TIMELINE_W - 40) * TMAX)));
      if (d.bar === 'a-start') setAStart(Math.min(newT, aEnd - 1));
      if (d.bar === 'a-end') setAEnd(Math.max(aStart + 1, newT));
      if (d.bar === 'b-start') setBStart(Math.min(newT, bEnd - 1));
      if (d.bar === 'b-end') setBEnd(Math.max(bStart + 1, newT));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [aStart, aEnd, bStart, bEnd]);

  const displayA: TimeInterval = tab === 'walkthrough' ? { start: walkEntry.aRange[0], end: walkEntry.aRange[1] } : { start: aStart, end: aEnd };
  const displayB: TimeInterval = tab === 'walkthrough' ? { start: walkEntry.bRange[0], end: walkEntry.bRange[1] } : { start: bStart, end: bEnd };
  const displayRelation = tab === 'walkthrough' ? walkEntry.name : relation;
  const displayRelInfo = tab === 'walkthrough' ? walkEntry : relInfo;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['interactive', 'walkthrough'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#8B5CF6' : 'var(--surface-3)',
            border: 'none', borderRadius: 6, color: '#fff', padding: '6px 14px', fontSize: 13, cursor: 'pointer'
          }}>{t === 'interactive' ? 'Interactive' : 'Walk Through All 13'}</button>
        ))}
      </div>

      {/* SVG Timeline */}
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${TIMELINE_W} ${TIMELINE_H}`}
        aria-label="Allen interval relations timeline"
        style={{ background: 'var(--surface-3)', borderRadius: 8, marginBottom: 12, cursor: tab === 'interactive' ? 'grab' : 'default' }}
      >
        {/* Axis */}
        <line x1={20} y1={TIMELINE_H - 12} x2={TIMELINE_W - 20} y2={TIMELINE_H - 12} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        {[0,2,4,6,8,10].map(t => (
          <text key={t} x={toPx(t)} y={TIMELINE_H - 2} fill="rgba(255,255,255,0.4)" fontSize={9} textAnchor="middle">{t}</text>
        ))}

        {/* Interval A */}
        <rect
          x={toPx(displayA.start)} y={20} width={toPx(displayA.end) - toPx(displayA.start)} height={16}
          fill="#6366F1" rx={4} opacity={0.85}
        />
        <text x={(toPx(displayA.start) + toPx(displayA.end)) / 2} y={32} fill="#fff" fontSize={10} textAnchor="middle">A</text>

        {/* Interval B */}
        <rect
          x={toPx(displayB.start)} y={42} width={toPx(displayB.end) - toPx(displayB.start)} height={16}
          fill="#10B981" rx={4} opacity={0.85}
        />
        <text x={(toPx(displayB.start) + toPx(displayB.end)) / 2} y={54} fill="#fff" fontSize={10} textAnchor="middle">B</text>

        {/* Drag handles (interactive only) */}
        {tab === 'interactive' && (
          <>
            <rect x={toPx(aStart) - 5} y={16} width={10} height={24} fill="#8B5CF6" rx={3} style={{ cursor: 'ew-resize' }}
              onMouseDown={e => onMouseDown(e, 'a-start', aStart)} aria-label="Drag A start" />
            <rect x={toPx(aEnd) - 5} y={16} width={10} height={24} fill="#8B5CF6" rx={3} style={{ cursor: 'ew-resize' }}
              onMouseDown={e => onMouseDown(e, 'a-end', aEnd)} aria-label="Drag A end" />
            <rect x={toPx(bStart) - 5} y={38} width={10} height={24} fill="#10B981" rx={3} style={{ cursor: 'ew-resize' }}
              onMouseDown={e => onMouseDown(e, 'b-start', bStart)} aria-label="Drag B start" />
            <rect x={toPx(bEnd) - 5} y={38} width={10} height={24} fill="#10B981" rx={3} style={{ cursor: 'ew-resize' }}
              onMouseDown={e => onMouseDown(e, 'b-end', bEnd)} aria-label="Drag B end" />
          </>
        )}
      </svg>

      {/* Relation display */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ color: '#8B5CF6', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Relation: <span style={{ color: '#F59E0B' }}>{displayRelation}</span>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>{displayRelInfo.example}</div>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(displayRelInfo.latex) }} />
      </div>

      {/* Walkthrough controls */}
      {tab === 'walkthrough' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            setPlaying(p => !p);
          }} style={btnStyle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={() => setWalkIdx(i => Math.max(0, i - 1))} disabled={walkIdx === 0} style={smallBtnStyle} aria-label="Previous relation">◀</button>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{walkIdx + 1} / {ALLEN_RELATIONS.length}</span>
          <button onClick={() => setWalkIdx(i => Math.min(ALLEN_RELATIONS.length - 1, i + 1))} disabled={walkIdx === ALLEN_RELATIONS.length - 1} style={smallBtnStyle} aria-label="Next relation">▶</button>
          <button onClick={() => { setWalkIdx(0); setPlaying(false); }} style={smallBtnStyle} aria-label="Reset">Reset</button>
          <label style={{ fontSize: 12, color: '#9CA3AF' }}>
            Speed:
            <input type="range" min={0.5} max={3} step={0.5} value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              aria-label="Animation speed" style={{ marginLeft: 6, width: 80 }} />
            {speed}×
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Event Calculus Sub-viz ───────────────────────────────────────────────────

function EventCalcViz() {
  const steps = eventCalcTrace(SHANKAR_EVENTS, SHANKAR_INIT, SHANKAR_TIME_POINTS);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const currentStep: EventCalcStep = steps[stepIdx] ?? steps[0]!;

  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (ts - lastTickRef.current > 800 / speed) {
        lastTickRef.current = ts;
        setStepIdx(i => {
          if (i >= steps.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, steps.length]);

  const TW = 380;
  const TH = 120;
  const tMax = 10;
  const px = (t: number) => (t / tMax) * (TW - 40) + 20;

  const fluents = ['At(Shankar,SF)', 'At(Shankar,DC)', 'At(Shankar,Berkeley)'];
  const currentTime = currentStep.time;

  return (
    <div>
      {/* Timeline SVG */}
      <svg width="100%" viewBox={`0 0 ${TW} ${TH}`} aria-label="Event calculus timeline"
        style={{ background: 'var(--surface-3)', borderRadius: 8, marginBottom: 12 }}>

        {/* Time axis */}
        <line x1={20} y1={TH - 12} x2={TW - 20} y2={TH - 12} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        {SHANKAR_TIME_POINTS.map(t => (
          <text key={t} x={px(t)} y={TH - 2} fill={t === currentTime ? '#F59E0B' : 'rgba(255,255,255,0.4)'} fontSize={9} textAnchor="middle">{t}</text>
        ))}

        {/* Current time marker */}
        <line x1={px(currentTime)} y1={8} x2={px(currentTime)} y2={TH - 14}
          stroke="#F59E0B" strokeWidth={2} strokeDasharray="4,2" />

        {/* Events as bars */}
        {SHANKAR_EVENTS.map((ev, i) => (
          <rect key={ev.id}
            x={px(ev.start)} y={10 + i * 8}
            width={px(ev.end) - px(ev.start)} height={6}
            fill="rgba(255,255,255,0.15)" rx={2}
          />
        ))}

        {/* Fluent active spans */}
        {fluents.map((f, fi) => {
          const color = FLUENT_COLORS[f] ?? '#888';
          const y = 32 + fi * 22;
          return (
            <g key={f}>
              <text x={20} y={y + 10} fill={color} fontSize={8} opacity={0.8}>{f.replace('At(Shankar,', '').replace(')', '')}</text>
              {SHANKAR_TIME_POINTS.slice(0, -1).map(t => {
                const active = steps.find(s => s.time === t)?.activeFluents.includes(f) ?? false;
                return active ? (
                  <rect key={t} x={px(t)} y={y} width={px(t + 1) - px(t)} height={12}
                    fill={color} rx={2} opacity={t <= currentTime ? 0.8 : 0.2} />
                ) : null;
              })}
            </g>
          );
        })}
      </svg>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => { setStepIdx(0); setPlaying(false); }} style={smallBtnStyle} aria-label="Reset">⏮</button>
        <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0} style={smallBtnStyle} aria-label="Step back">◀</button>
        <button onClick={() => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          setPlaying(p => !p);
        }} style={btnStyle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</button>
        <button onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={smallBtnStyle} aria-label="Step forward">▶</button>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>t = {currentTime}</span>
        <label style={{ fontSize: 12, color: '#9CA3AF' }}>
          Speed:
          <input type="range" min={0.5} max={4} step={0.5} value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            aria-label="Speed" style={{ marginLeft: 6, width: 70 }} />
          {speed}×
        </label>
      </div>

      {/* State panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>State at t = {currentTime}</div>
        <div style={{ fontSize: 12, color: '#E5E7EB', marginBottom: 6 }}>{currentStep.action}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {fluents.map(f => {
            const active = currentStep.activeFluents.includes(f);
            return (
              <span key={f} style={{
                background: active ? (FLUENT_COLORS[f] ?? '#888') + '30' : 'var(--surface-3)',
                border: `1px solid ${active ? (FLUENT_COLORS[f] ?? '#888') : 'var(--surface-border)'}`,
                borderRadius: 6, padding: '3px 10px', fontSize: 12,
                color: active ? (FLUENT_COLORS[f] ?? '#888') : '#6B7280',
              }}>
                {f}
              </span>
            );
          })}
        </div>
        {currentStep.eventId && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#F59E0B' }}>
            Active event: {currentStep.eventId}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventCalculusViz() {
  const [tab, setTab] = useState<'allen' | 'calc'>('allen');

  return (
    <div
      id="event-calculus"
      style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}
      aria-label="Event Calculus visualization"
    >
      <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>
        §10.3 Events &amp; Time
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Allen's 13 interval relations and event calculus for temporal reasoning about fluents.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['allen', "Allen's Interval Relations"], ['calc', 'Event Calculus Timeline']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#8B5CF6' : 'var(--surface-2)',
            border: `1px solid ${tab === t ? '#8B5CF6' : 'var(--surface-border)'}`,
            borderRadius: 8, color: '#fff', padding: '8px 18px', fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'allen' ? <AllenViz /> : <EventCalcViz />}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  background: '#8B5CF6', border: 'none', borderRadius: 6,
  color: '#fff', padding: '6px 16px', fontSize: 13, cursor: 'pointer',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
  borderRadius: 6, color: '#E5E7EB', padding: '4px 12px', fontSize: 13, cursor: 'pointer',
};
