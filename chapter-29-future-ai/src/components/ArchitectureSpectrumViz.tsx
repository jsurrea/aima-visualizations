import { useState } from 'react';
import { scoreArchitectures } from '../algorithms/index';
import type { TaskCharacteristics, ArchitectureType } from '../algorithms/index';

const ARCH_LABELS: Record<ArchitectureType, string> = {
  'simple-reflex': 'Simple Reflex',
  'model-based-reflex': 'Model-Based Reflex',
  'goal-based': 'Goal-Based',
  'utility-based': 'Utility-Based',
  'learning': 'Learning Agent',
};

const ARCH_ICONS: Record<ArchitectureType, string> = {
  'simple-reflex': '⚡',
  'model-based-reflex': '🗺️',
  'goal-based': '🎯',
  'utility-based': '⚖️',
  'learning': '🧠',
};

const ARCH_COLORS: Record<ArchitectureType, string> = {
  'simple-reflex': '#F59E0B',
  'model-based-reflex': '#3B82F6',
  'goal-based': '#10B981',
  'utility-based': '#8B5CF6',
  'learning': '#EC4899',
};

const PRESET_TASKS: Array<{ label: string; description: string; task: TaskCharacteristics }> = [
  {
    label: 'Emergency Braking',
    description: 'Milliseconds to respond; environment fully visible; single objective.',
    task: { timeAvailable: 0.05, uncertainty: 0.1, goalComplexity: 0.05, dynamism: 0.9 },
  },
  {
    label: 'Chess Engine',
    description: 'Minutes per move; fully observable; single win/loss goal.',
    task: { timeAvailable: 0.85, uncertainty: 0.0, goalComplexity: 0.1, dynamism: 0.0 },
  },
  {
    label: 'Office Assistant',
    description: 'Flexible timing; many competing preferences; dynamic social environment.',
    task: { timeAvailable: 0.7, uncertainty: 0.7, goalComplexity: 0.9, dynamism: 0.6 },
  },
  {
    label: 'Self-Driving Car',
    description: 'Real-time + planning mix; partial observability; many objectives.',
    task: { timeAvailable: 0.4, uncertainty: 0.75, goalComplexity: 0.7, dynamism: 0.85 },
  },
  {
    label: 'Medical Diagnosis',
    description: 'Long deliberation; highly uncertain; life-critical utility.',
    task: { timeAvailable: 0.95, uncertainty: 0.9, goalComplexity: 0.8, dynamism: 0.2 },
  },
];

interface SliderProps {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
}

function Slider({ id, label, leftLabel, rightLabel, value, onChange }: SliderProps) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
        {label}: <strong style={{ color: 'white' }}>{(value * 100).toFixed(0)}%</strong>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#EF4444' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280' }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function ArchitectureSpectrumViz() {
  const [task, setTask] = useState<TaskCharacteristics>((PRESET_TASKS[2] as (typeof PRESET_TASKS)[number]).task);
  const [preset, setPreset] = useState<string>('Office Assistant');

  const recommendations = scoreArchitectures(task);
  // scoreArchitectures always returns 5 items, index 0 is always defined
  const topArch = (recommendations[0] as (typeof recommendations)[number]).architecture;

  const updateTask = (patch: Partial<TaskCharacteristics>) => {
    setTask(t => ({ ...t, ...patch }));
    setPreset('Custom');
  };

  return (
    <div>
      {/* Preset buttons */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>Quick presets:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PRESET_TASKS.map(p => (
            <button
              key={p.label}
              onClick={() => { setTask(p.task); setPreset(p.label); }}
              aria-pressed={preset === p.label}
              title={p.description}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                background: preset === p.label ? '#EF444420' : 'transparent',
                border: `1px solid ${preset === p.label ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                color: preset === p.label ? '#EF4444' : '#9CA3AF',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            aria-pressed={preset === 'Custom'}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
              cursor: 'default',
              background: preset === 'Custom' ? '#EF444420' : 'transparent',
              border: `1px solid ${preset === 'Custom' ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
              color: preset === 'Custom' ? '#EF4444' : '#6B7280',
            }}
          >
            Custom
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Task sliders */}
        <div
          style={{
            background: '#1A1A24',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#E5E7EB' }}>Task characteristics</h4>
          <Slider
            id="time-slider"
            label="Deliberation time"
            leftLabel="Real-time (ms)"
            rightLabel="Unlimited"
            value={task.timeAvailable}
            onChange={v => updateTask({ timeAvailable: v })}
          />
          <Slider
            id="uncertainty-slider"
            label="Uncertainty"
            leftLabel="Fully observable"
            rightLabel="Fully stochastic"
            value={task.uncertainty}
            onChange={v => updateTask({ uncertainty: v })}
          />
          <Slider
            id="goal-slider"
            label="Goal complexity"
            leftLabel="Single hard goal"
            rightLabel="Rich utility"
            value={task.goalComplexity}
            onChange={v => updateTask({ goalComplexity: v })}
          />
          <Slider
            id="dynamism-slider"
            label="Environment dynamism"
            leftLabel="Static"
            rightLabel="Highly dynamic"
            value={task.dynamism}
            onChange={v => updateTask({ dynamism: v })}
          />
        </div>

        {/* Architecture scores */}
        <div
          style={{
            background: '#1A1A24',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#E5E7EB' }}>Architecture suitability scores</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendations.map(rec => {
              const color = ARCH_COLORS[rec.architecture];
              const isTop = rec.architecture === topArch;
              return (
                <div key={rec.architecture}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px' }}>{ARCH_ICONS[rec.architecture]}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: isTop ? 700 : 400,
                      color: isTop ? color : '#9CA3AF',
                    }}>
                      {ARCH_LABELS[rec.architecture]}
                      {isTop && ' ← recommended'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color, fontWeight: 600 }}>
                      {(rec.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={rec.score}
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-label={`${ARCH_LABELS[rec.architecture]} suitability: ${(rec.score * 100).toFixed(0)}%`}
                    style={{
                      height: '6px', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: `${rec.score * 100}%`,
                        height: '100%',
                        borderRadius: '3px',
                        background: color,
                        opacity: isTop ? 1 : 0.5,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendation detail */}
      {recommendations[0] && (
        <div
          style={{
            background: `${ARCH_COLORS[topArch]}10`,
            border: `1px solid ${ARCH_COLORS[topArch]}40`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <h4 style={{ margin: '0 0 8px', color: ARCH_COLORS[topArch], fontSize: '15px' }}>
            {ARCH_ICONS[topArch]} Recommended: {ARCH_LABELS[topArch]}
          </h4>
          <p style={{ margin: 0, color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6 }}>
            {recommendations[0].rationale}
          </p>
        </div>
      )}

      {/* Quote from book */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>
          "It is natural to ask, 'Which of the agent architectures should an agent use?' The answer is,
          <strong style={{ color: 'white' }}> 'All of them!'</strong>
          Reflex responses are needed for situations in which time is of the essence, whereas
          knowledge-based deliberation allows the agent to plan ahead."
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#6B7280' }}>
          — Russell &amp; Norvig, AIMA 4e, §29.2
        </p>
      </div>
    </div>
  );
}
