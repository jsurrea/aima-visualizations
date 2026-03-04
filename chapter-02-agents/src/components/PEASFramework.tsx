import { useState } from 'react';
import { getPEASExamples, type PEASEntry } from '../algorithms/index';

const EXAMPLES = getPEASExamples();
// Safety: getPEASExamples always returns 5 entries
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DEFAULT_EXAMPLE = EXAMPLES[0]!;

const HEADERS: Array<{ key: keyof PEASEntry; label: string; color: string }> = [
  { key: 'performance', label: 'Performance', color: '#6366F1' },
  { key: 'environment', label: 'Environment', color: '#3B82F6' },
  { key: 'actuators', label: 'Actuators', color: '#10B981' },
  { key: 'sensors', label: 'Sensors', color: '#F59E0B' },
];

function BulletList({ items, color }: { items: ReadonlyArray<string>; color: string }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item) => (
        <li
          key={item}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            color: '#E5E7EB',
            fontSize: '14px',
            lineHeight: 1.5,
            marginBottom: '6px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              marginTop: '6px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
            }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PEASFramework() {
  const [activeId, setActiveId] = useState<string>(DEFAULT_EXAMPLE.id);
  // find always succeeds because DEFAULT_EXAMPLE is in EXAMPLES
  const active = (EXAMPLES.find((e) => e.id === activeId) ?? DEFAULT_EXAMPLE);

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
        The <strong style={{ color: '#E5E7EB' }}>PEAS framework</strong> characterises an agent by its
        Performance measure, Environment, Actuators, and Sensors. Select an agent below to explore.
      </p>

      {/* Agent selector */}
      <div
        role="tablist"
        aria-label="Select agent"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        {EXAMPLES.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <button
              key={entry.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`peas-panel-${entry.id}`}
              id={`peas-tab-${entry.id}`}
              onClick={() => setActiveId(entry.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${isActive ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                color: isActive ? '#A5B4FC' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {entry.agent}
            </button>
          );
        })}
      </div>

      {/* PEAS table */}
      <div
        id={`peas-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`peas-tab-${active.id}`}
        style={{
          background: '#111118',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {HEADERS.map(({ key, label, color }) => (
            <div
              key={key}
              style={{
                padding: '14px 16px',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color,
                borderRight: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Table body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          {HEADERS.map(({ key, color }, idx) => (
            <div
              key={key}
              style={{
                padding: '16px',
                borderRight: idx < HEADERS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                verticalAlign: 'top',
              }}
            >
              <BulletList items={active[key] as ReadonlyArray<string>} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Agent label */}
      <p
        style={{
          marginTop: '12px',
          color: '#6B7280',
          fontSize: '13px',
          textAlign: 'center',
        }}
      >
        Agent: <span style={{ color: '#9CA3AF', fontWeight: 500 }}>{active.agent}</span>
      </p>
    </div>
  );
}
