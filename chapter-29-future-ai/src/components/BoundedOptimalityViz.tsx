import { useState } from 'react';
import { findBoundedOptimalProgram, paretoFrontier } from '../algorithms/index';
import type { AgentProgram } from '../algorithms/index';

const DEFAULT_PROGRAMS: AgentProgram[] = [
  {
    name: 'Simple Reflex',
    computeRequired: 1,
    qualityAchieved: 0.25,
    description: 'Pure condition-action rules; instant but brittle.',
  },
  {
    name: 'Model-Based Reflex',
    computeRequired: 4,
    qualityAchieved: 0.45,
    description: 'Maintains internal state; handles partial observability.',
  },
  {
    name: 'Goal-Based Planner',
    computeRequired: 12,
    qualityAchieved: 0.65,
    description: 'BFS/A* to reach goal; good for deterministic environments.',
  },
  {
    name: 'MCTS Agent',
    computeRequired: 30,
    qualityAchieved: 0.80,
    description: 'Monte Carlo Tree Search; excellent anytime performance.',
  },
  {
    name: 'Utility + Bayes',
    computeRequired: 50,
    qualityAchieved: 0.88,
    description: 'Full probabilistic utility maximisation.',
  },
  {
    name: 'Deep RL',
    computeRequired: 90,
    qualityAchieved: 0.95,
    description: 'Learned value function over millions of training steps.',
  },
  {
    name: 'Bounded-Optimal*',
    computeRequired: 60,
    qualityAchieved: 0.93,
    description: 'Best program for this architecture within budget constraints.',
  },
];

const MAX_BUDGET = 100;

// Local helper — clamps v to [lo, hi] for SVG coordinate calculations.
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function BoundedOptimalityViz() {
  const [budget, setBudget] = useState(50);
  const programs = DEFAULT_PROGRAMS;
  const best = findBoundedOptimalProgram(programs, budget);
  const pareto = paretoFrontier(programs);

  // SVG scatter plot dimensions
  const W = 500;
  const H = 220;
  const PAD = { left: 48, right: 16, top: 16, bottom: 36 };
  const dW = W - PAD.left - PAD.right;
  const dH = H - PAD.top - PAD.bottom;

  const toSvgX = (compute: number) =>
    PAD.left + (compute / MAX_BUDGET) * dW;
  const toSvgY = (quality: number) =>
    PAD.top + dH - quality * dH;

  const budgetX = toSvgX(budget);

  return (
    <div>
      {/* Budget slider */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
        }}
      >
        <label
          htmlFor="budget-slider"
          style={{ display: 'block', fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}
        >
          Compute budget:{' '}
          <strong style={{ color: '#EF4444', fontSize: '18px' }}>{budget}</strong>
          {' '}units
        </label>
        <input
          id="budget-slider"
          type="range"
          min={1}
          max={MAX_BUDGET}
          value={budget}
          onChange={e => setBudget(Number(e.target.value))}
          aria-label="Compute budget for bounded optimality"
          style={{ width: '100%', accentColor: '#EF4444' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
          <span>Minimal (reflex)</span>
          <span>Moderate</span>
          <span>Unlimited</span>
        </div>
      </div>

      {/* SVG scatter plot */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '8px',
          marginBottom: '16px',
          overflowX: 'auto',
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', maxWidth: W, display: 'block' }}
          role="img"
          aria-label="Compute vs quality scatter plot showing bounded optimality"
        >
          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(q => (
            <g key={q}>
              <line x1={PAD.left - 4} y1={toSvgY(q)} x2={PAD.left} y2={toSvgY(q)} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              <text x={PAD.left - 6} y={toSvgY(q) + 4} textAnchor="end" fill="#6B7280" fontSize={10}>
                {q.toFixed(2)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, 25, 50, 75, 100].map(c => (
            <text key={c} x={toSvgX(c)} y={H - PAD.bottom + 14} textAnchor="middle" fill="#6B7280" fontSize={10}>
              {c}
            </text>
          ))}
          <text x={W / 2} y={H - 4} textAnchor="middle" fill="#6B7280" fontSize={10}>
            compute required →
          </text>
          <text
            x={10}
            y={H / 2}
            textAnchor="middle"
            fill="#6B7280"
            fontSize={10}
            transform={`rotate(-90, 10, ${H / 2})`}
          >
            quality →
          </text>

          {/* Budget cutoff line */}
          <line
            x1={budgetX} y1={PAD.top}
            x2={budgetX} y2={H - PAD.bottom}
            stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3"
          />
          <text x={clamp(budgetX + 4, PAD.left + 2, W - PAD.right - 30)} y={PAD.top + 12} fill="#EF4444" fontSize={10}>
            budget
          </text>

          {/* Pareto frontier line */}
          {pareto.length > 1 && (
            <polyline
              points={pareto.map(p => `${toSvgX(p.computeRequired)},${toSvgY(p.qualityAchieved)}`).join(' ')}
              fill="none"
              stroke="#10B981"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.6}
            />
          )}

          {/* Affordable shade */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={clamp(budgetX - PAD.left, 0, dW)}
            height={dH}
            fill="rgba(239,68,68,0.06)"
          />

          {/* Program dots */}
          {programs.map(p => {
            const isBest = best?.name === p.name;
            const isPareto = pareto.some(pp => pp.name === p.name);
            const affordable = p.computeRequired <= budget;
            return (
              <g key={p.name}>
                <circle
                  cx={toSvgX(p.computeRequired)}
                  cy={toSvgY(p.qualityAchieved)}
                  r={isBest ? 9 : 6}
                  fill={isBest ? '#EF4444' : affordable ? (isPareto ? '#10B981' : '#3B82F6') : '#374151'}
                  stroke={isBest ? '#FCA5A5' : 'transparent'}
                  strokeWidth={2}
                  opacity={affordable ? 1 : 0.35}
                />
                <text
                  x={toSvgX(p.computeRequired)}
                  y={toSvgY(p.qualityAchieved) - 11}
                  textAnchor="middle"
                  fill={isBest ? '#EF4444' : affordable ? '#D1D5DB' : '#4B5563'}
                  fontSize={9}
                  fontWeight={isBest ? 700 : 400}
                >
                  {p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* State panel */}
      <div
        style={{
          background: '#111118',
          border: `1px solid ${best ? '#EF444440' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#EF4444' }}>
          🎯 Bounded-Optimal Program
        </h4>
        {best ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Program', value: best.name },
              { label: 'Compute cost', value: `${best.computeRequired} / ${budget}` },
              { label: 'Quality', value: (best.qualityAchieved * 100).toFixed(0) + '%' },
              { label: 'Budget used', value: `${((best.computeRequired / budget) * 100).toFixed(0)}%` },
              { label: 'Strategy', value: best.description },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: 'white', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>
            No program fits within budget = {budget}. Increase the budget.
          </p>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px', color: '#9CA3AF' }}>
        {[
          { color: '#EF4444', label: 'Bounded-optimal (best within budget)' },
          { color: '#10B981', label: 'Pareto frontier (non-dominated)' },
          { color: '#3B82F6', label: 'Affordable but not optimal' },
          { color: '#374151', label: 'Over budget' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
