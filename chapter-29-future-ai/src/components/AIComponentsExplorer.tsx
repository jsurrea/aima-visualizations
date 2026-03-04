import { useState } from 'react';
import { assessComponentReadiness, systemReadiness } from '../algorithms/index';
import type { ComponentReadiness } from '../algorithms/index';

const CATEGORY_COLORS: Record<ComponentReadiness['category'], string> = {
  sensors: '#3B82F6',
  representation: '#8B5CF6',
  action: '#10B981',
  preferences: '#EC4899',
  learning: '#F59E0B',
};

const CATEGORY_ICONS: Record<ComponentReadiness['category'], string> = {
  sensors: '📡',
  representation: '🧠',
  action: '🎯',
  preferences: '❤️',
  learning: '📚',
};

function TRLBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color }}>{value.toFixed(1)} / 9</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={1}
        aria-valuemax={9}
        aria-label={`${label}: ${value.toFixed(1)} of 9`}
        style={{
          width: '100%', height: '8px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            width: `${((value - 1) / 8) * 100}%`,
            height: '100%',
            borderRadius: '4px',
            background: color,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function AIComponentsExplorer() {
  const [yearsAhead, setYearsAhead] = useState(0);
  const [selected, setSelected] = useState<ComponentReadiness['category'] | null>(null);

  const components = assessComponentReadiness(yearsAhead);
  const sysNow = systemReadiness(assessComponentReadiness(0));
  const sysFuture = systemReadiness(components);

  const selectedComp = selected ? components.find(c => c.category === selected) : null;

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <label
          htmlFor="years-slider"
          style={{ display: 'block', fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}
        >
          Years of progress from 2025:{' '}
          <strong style={{ color: 'white' }}>{yearsAhead === 0 ? 'Today' : `+${yearsAhead} years`}</strong>
        </label>
        <input
          id="years-slider"
          type="range"
          min={0}
          max={20}
          step={1}
          value={yearsAhead}
          onChange={e => setYearsAhead(Number(e.target.value))}
          aria-label="Years of AI progress to simulate"
          style={{ width: '100%', accentColor: '#EF4444' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
          <span>Today (2025)</span>
          <span>+10 years</span>
          <span>+20 years</span>
        </div>
      </div>

      {/* System Readiness Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'System TRL (now)', value: sysNow, color: '#6B7280' },
          { label: `System TRL (+${yearsAhead}y)`, value: sysFuture, color: '#EF4444' },
          { label: 'Δ Improvement', value: sysFuture - sysNow, color: '#10B981', prefix: '+' },
        ].map(({ label, value, color, prefix = '' }) => (
          <div
            key={label}
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color }}>
              {prefix}{value.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Component Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {components.map(comp => {
          const color = CATEGORY_COLORS[comp.category];
          const isSelected = selected === comp.category;
          return (
            <button
              key={comp.category}
              onClick={() => setSelected(isSelected ? null : comp.category)}
              aria-pressed={isSelected}
              aria-label={`${comp.component}: TRL ${comp.projectedTRL}. Click for details.`}
              style={{
                background: isSelected ? `${color}15` : '#111118',
                border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px' }} aria-hidden="true">
                  {CATEGORY_ICONS[comp.category]}
                </span>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>
                  {comp.component}
                </span>
              </div>
              <TRLBar label="Current" value={comp.currentTRL} color="#6B7280" />
              <TRLBar label={`Year ${yearsAhead > 0 ? '+' + yearsAhead : 'now'}`} value={comp.projectedTRL} color={color} />
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B7280' }}>
                🚧 {comp.bottleneck}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selectedComp && (
        <div
          role="region"
          aria-label={`Details for ${selectedComp.component}`}
          style={{
            background: '#1A1A24',
            border: `1px solid ${CATEGORY_COLORS[selectedComp.category]}40`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: CATEGORY_COLORS[selectedComp.category], fontSize: '16px' }}>
            {CATEGORY_ICONS[selectedComp.category]} {selectedComp.component} — Deep Dive
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                {DETAIL_TEXT[selectedComp.category]}
              </p>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>TRL Scale (1–9)</div>
              {[9, 7, 5, 3, 1].map(level => (
                <div
                  key={level}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    opacity: selectedComp.projectedTRL >= level ? 1 : 0.3,
                  }}
                >
                  <div
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: selectedComp.projectedTRL >= level
                        ? CATEGORY_COLORS[selectedComp.category]
                        : '#374151',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    TRL {level}: {TRL_LABELS[level]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '16px', textAlign: 'center' }}>
        ⚡ Harmonic mean used for System TRL — the weakest link limits overall capability (Liebig&apos;s Law)
      </p>
    </div>
  );
}

const DETAIL_TEXT: Record<ComponentReadiness['category'], string> = {
  sensors:
    'Cost has fallen dramatically: LIDAR for self-driving cars dropped from $75,000 to ~$1,000. ' +
    'MEMS technology miniaturises accelerometers and gyroscopes to insect scale. ' +
    'The challenge shifts from availability to bandwidth management and embedded processing.',
  representation:
    'Agents need unified representations: probabilistic tracking (Ch. 14), first-order logic (Ch. 10), ' +
    'and neural embeddings (Ch. 25). Current systems handle each separately. ' +
    'The prize is a single scheme that combines objects, relations, uncertainty, and time.',
  action:
    'Planning for billions of steps (a human life) requires hierarchical structure. ' +
    'Hierarchical RL has advanced this, but extending it to partially observable environments (POMDPs) ' +
    'remains an open problem. The theoretical foundations are in place; the practice lags.',
  preferences:
    'The hardest component. Specifying what we actually want — including fairness, long-term wellbeing, ' +
    'and societal goals — is challenging. Inverse RL (Ch. 23.6) helps when an expert can demonstrate, ' +
    'but we lack scalable methods for complex, multi-stakeholder reward engineering.',
  learning:
    'Deep learning (Ch. 22) has achieved superhuman performance on many narrow tasks. ' +
    'The frontier is transfer learning with sparse data, handling novel structured representations, ' +
    'and combining learning with prior symbolic knowledge without millions of labelled examples.',
};

const TRL_LABELS: Record<number, string> = {
  1: 'Basic principles observed',
  3: 'Proof of concept demonstrated',
  5: 'Technology validated in lab',
  7: 'System prototype demonstrated',
  9: 'Actual system fully operational',
};
