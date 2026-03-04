import { useState } from 'react';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Domain definitions ───────────────────────────────────────────────────────

type DomainId = 'romania' | 'eightpuzzle' | 'vacuum';

interface ProblemDomain {
  readonly name: string;
  readonly emoji: string;
  readonly description: string;
  readonly states: string;
  readonly initialState: string;
  readonly actions: string;
  readonly transition: string;
  readonly goalTest: string;
  readonly pathCost: string;
  readonly stateCount: string;
}

const DOMAINS: Readonly<Record<DomainId, ProblemDomain>> = {
  romania: {
    name: 'Romania Route-Finding',
    emoji: '🗺️',
    description: 'Find a route between cities in Romania.',
    states: '20 Romanian cities',
    initialState: 'Arad',
    actions: 'Drive to adjacent city',
    transition: 'RESULT(city, drive-to-x) = x',
    goalTest: 'city = Bucharest?',
    pathCost: 'Road distance in km',
    stateCount: '20',
  },
  eightpuzzle: {
    name: '8-Puzzle',
    emoji: '🎮',
    description: 'Slide tiles on a 3×3 board to reach goal configuration.',
    states: 'Arrangement of 8 tiles + blank on 3×3 grid',
    initialState: 'Any scrambled configuration',
    actions: 'Move blank: Up, Down, Left, Right',
    transition: 'RESULT(state, move) = new tile arrangement',
    goalTest: 'Tiles in order 1–8, blank at bottom-right',
    pathCost: '1 per move',
    stateCount: '9!/2 = 181,440 reachable',
  },
  vacuum: {
    name: 'Vacuum World',
    emoji: '🤖',
    description: 'Clean both rooms with a vacuum agent.',
    states: 'Agent location × dirt status of each room',
    initialState: 'Agent in room A or B, rooms dirty/clean',
    actions: 'Left, Right, Suck',
    transition: 'RESULT(state, action) = new (location, dirt) state',
    goalTest: 'Both rooms clean',
    pathCost: '1 per action',
    stateCount: '2 × 2² = 8',
  },
};

const GOALS: Readonly<Record<DomainId, string[]>> = {
  romania: ['Bucharest', 'Sibiu', 'Timisoara', 'Lugoj', 'Fagaras'],
  eightpuzzle: ['Standard goal (1-8, blank)', 'Reverse order (8-1, blank)'],
  vacuum: ['Both rooms clean', 'Only room A clean', 'Only room B clean'],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProblemFormulation(): JSX.Element {
  const [domain, setDomain] = useState<DomainId>('romania');
  const [goalIndex, setGoalIndex] = useState(0);

  const d = DOMAINS[domain];
  const goals = GOALS[domain];
  const selectedGoal = goals[goalIndex] ?? goals[0] ?? 'Goal';

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#6B7280',
    marginBottom: '4px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#E5E7EB',
    lineHeight: 1.5,
    background: '#0A0A0F',
    borderRadius: '6px',
    padding: '8px 10px',
  };

  const tupleItems: ReadonlyArray<{ label: string; value: string; latex?: string; color: string }> = [
    { label: 'States  S', value: d.states, latex: 'S', color: '#6366F1' },
    { label: 'Initial State  s₀', value: d.initialState, latex: 's_0', color: '#3B82F6' },
    { label: 'Actions  A(s)', value: d.actions, latex: 'A(s)', color: '#10B981' },
    { label: 'Transition  T(s,a)', value: d.transition, latex: 'T(s,a)', color: '#F59E0B' },
    {
      label: 'Goal Test  G(s)',
      value: `${selectedGoal}`,
      latex: 'G(s)',
      color: '#EF4444',
    },
    { label: 'Path Cost  c(s,a,s′)', value: d.pathCost, latex: "c(s,a,s')", color: '#8B5CF6' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB' }}>
      {/* Domain selector */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px',
        padding: '16px 20px',
        background: '#1A1A24',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', alignSelf: 'center', marginRight: 4 }}>
          Domain:
        </span>
        {(Object.keys(DOMAINS) as DomainId[]).map(id => (
          <button
            key={id}
            onClick={() => { setDomain(id); setGoalIndex(0); }}
            aria-pressed={domain === id}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              background: domain === id ? '#3B82F6' : '#374151',
              color: domain === id ? '#fff' : '#9CA3AF',
            }}
          >
            {DOMAINS[id].emoji} {DOMAINS[id].name}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', display: 'grid', gap: '20px', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        {/* Left: description + state count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#111118', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{d.emoji}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{d.name}</div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>{d.description}</div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
              State space size: <strong style={{ color: '#F59E0B' }}>{d.stateCount} states</strong>
            </div>
          </div>

          {/* Goal selector */}
          <div style={{ background: '#111118', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={labelStyle}>⚡ What If — Change Goal State</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {goals.map((g, i) => (
                <button
                  key={g}
                  onClick={() => setGoalIndex(i)}
                  aria-pressed={goalIndex === i}
                  style={{
                    padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                    textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                    background: goalIndex === i ? '#78350F' : '#1F2937',
                    color: goalIndex === i ? '#FDE68A' : '#9CA3AF',
                    borderColor: goalIndex === i ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {goalIndex === i ? '▶ ' : '  '}{g}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#6B7280', lineHeight: 1.5 }}>
              Changing the goal redefines <span dangerouslySetInnerHTML={{ __html: renderInlineMath('G(s)') }} /> and
              may change the search path length and cost.
            </div>
          </div>
        </div>

        {/* Right: 5-tuple */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>
            A search problem is a 6-tuple:
            <span
              style={{ marginLeft: 6 }}
              dangerouslySetInnerHTML={{ __html: renderInlineMath("\\langle S, s_0, A, T, G, c \\rangle") }}
            />
          </div>

          {tupleItems.map(item => (
            <div
              key={item.label}
              style={{
                background: '#111118',
                borderRadius: '8px',
                border: `1px solid ${item.color}30`,
                padding: '10px 14px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0 12px',
                alignItems: 'start',
              }}
            >
              <div style={{
                width: 6, height: '100%', minHeight: 36,
                background: item.color, borderRadius: '3px',
                marginTop: 2,
              }} />
              <div>
                <div style={labelStyle}>{item.label}</div>
                <div style={valueStyle}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
