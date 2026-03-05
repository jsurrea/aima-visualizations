import { useState } from 'react';
import {
  getEnvironmentDimensions,
  getEnvironmentExamples,
  countHarderProperties,
  recommendArchitecture,
  type EnvironmentProperties,
  type EnvironmentExample,
  type Observability,
  type AgentCount,
  type Determinism,
  type Episodicity,
  type Dynamics,
  type Continuity,
  type KnowledgeLevel,
} from '../algorithms/index';

const DIMS = getEnvironmentDimensions();
const EXAMPLES = getEnvironmentExamples();

const BOOK_EXAMPLES = EXAMPLES.filter((e) => !e.isOriginal);
const ORIGINAL_EXAMPLES = EXAMPLES.filter((e) => e.isOriginal);

const DIFFICULTY_COLOR = (count: number): string => {
  if (count <= 2) return '#10B981';
  if (count <= 4) return '#F59E0B';
  return '#EF4444';
};

const DIM_COLORS: Record<string, string> = {
  observability: '#6366F1',
  agentCount: '#3B82F6',
  determinism: '#8B5CF6',
  episodicity: '#EC4899',
  dynamics: '#F59E0B',
  continuity: '#10B981',
  knowledge: '#EF4444',
};

function PropertyBadge({
  value,
  harder,
  color,
}: {
  value: string;
  harder: boolean;
  color: string;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        background: harder ? `${color}22` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${harder ? color : 'rgba(255,255,255,0.1)'}`,
        color: harder ? color : '#9CA3AF',
      }}
    >
      {value}
    </span>
  );
}

function DifficultyBar({ count }: { count: number }) {
  return (
    <div
      aria-label={`Difficulty: ${count} of 7 dimensions are harder`}
      style={{ display: 'flex', gap: '3px', marginTop: '8px' }}
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            width: '18px',
            height: '6px',
            borderRadius: '3px',
            background: i < count ? DIFFICULTY_COLOR(count) : 'rgba(255,255,255,0.1)',
            transition: 'background 0.2s ease',
          }}
        />
      ))}
      <span
        style={{
          marginLeft: '8px',
          fontSize: '11px',
          color: DIFFICULTY_COLOR(count),
          fontWeight: 600,
          lineHeight: '6px',
          paddingTop: '0px',
        }}
      >
        {count}/7 hard
      </span>
    </div>
  );
}

function EnvironmentCard({
  env,
  isActive,
  onClick,
}: {
  env: EnvironmentExample;
  isActive: boolean;
  onClick: () => void;
}) {
  const hardCount = countHarderProperties(env.properties);
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`Select ${env.name}`}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: '10px',
        border: `1px solid ${isActive ? '#6366F1' : 'rgba(255,255,255,0.08)'}`,
        background: isActive ? 'rgba(99,102,241,0.1)' : '#111118',
        cursor: 'pointer',
        color: 'white',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '4px',
        }}
      >
        {env.isOriginal && (
          <span
            style={{
              fontSize: '10px',
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid #6366F1',
              color: '#A5B4FC',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            ORIGINAL
          </span>
        )}
        <span
          style={{
            fontWeight: 700,
            fontSize: '13px',
            color: isActive ? '#A5B4FC' : '#E5E7EB',
          }}
        >
          {env.name}
        </span>
      </div>
      <DifficultyBar count={hardCount} />
    </button>
  );
}

function CustomEnvironmentPanel() {
  const [props, setProps] = useState<EnvironmentProperties>({
    observability: 'fully',
    agentCount: 'single',
    determinism: 'deterministic',
    episodicity: 'episodic',
    dynamics: 'static',
    continuity: 'discrete',
    knowledge: 'known',
  });

  const hardCount = countHarderProperties(props);
  const recommendation = recommendArchitecture(props);

  function set<K extends keyof EnvironmentProperties>(key: K, val: EnvironmentProperties[K]) {
    setProps((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div
      style={{
        background: '#111118',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '20px',
        marginTop: '24px',
      }}
    >
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#A5B4FC',
          marginBottom: '4px',
        }}
      >
        🔧 Build Your Own Environment
      </h4>
      <p
        style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '20px',
          lineHeight: 1.5,
        }}
      >
        Toggle the 7 properties and see which agent architecture AIMA recommends.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {DIMS.map((dim) => {
          const color = DIM_COLORS[dim.key] ?? '#6366F1';
          return (
            <div key={dim.key}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                }}
              >
                {dim.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {dim.options.map((opt) => {
                  const isSelected = props[dim.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        set(
                          dim.key,
                          opt.value as EnvironmentProperties[typeof dim.key],
                        )
                      }
                      aria-pressed={isSelected}
                      aria-label={`Set ${dim.label} to ${opt.label}`}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
                        background: isSelected ? `${color}22` : 'rgba(255,255,255,0.03)',
                        color: isSelected ? color : '#6B7280',
                        fontSize: '12px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <DifficultyBar count={hardCount} />

      <div
        style={{
          marginTop: '16px',
          padding: '14px 16px',
          borderRadius: '8px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          Recommended Architecture
        </div>
        <div style={{ fontSize: '14px', color: '#E5E7EB', lineHeight: 1.6 }}>
          {recommendation}
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentExplorer() {
  const [activeId, setActiveId] = useState<string>(BOOK_EXAMPLES[0]!.id);
  const active = EXAMPLES.find((e) => e.id === activeId) ?? BOOK_EXAMPLES[0]!;
  const hardCount = countHarderProperties(active.properties);

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '8px' }}>
        Every task environment has seven properties (§2.3.2). These properties determine the
        appropriate agent design — from a simple thermostat to a full learning system.
        Select an environment to see its profile.
      </p>
      <p style={{ color: '#6B7280', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
        <span style={{ color: '#A5B4FC' }}>Harder poles</span> are highlighted in colour.
        The bar shows overall difficulty (0 = easiest, 7 = hardest).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 260px) 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Left: environment list */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '8px',
            }}
          >
            Book examples (Fig. 2.6)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {BOOK_EXAMPLES.map((env) => (
              <EnvironmentCard
                key={env.id}
                env={env}
                isActive={env.id === activeId}
                onClick={() => setActiveId(env.id)}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '8px',
            }}
          >
            Original examples
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ORIGINAL_EXAMPLES.map((env) => (
              <EnvironmentCard
                key={env.id}
                env={env}
                isActive={env.id === activeId}
                onClick={() => setActiveId(env.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail panel */}
        <div
          role="region"
          aria-label={`Environment properties for ${active.name}`}
          style={{
            background: '#111118',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#A5B4FC',
                  marginBottom: '4px',
                }}
              >
                {active.name}
                {active.isOriginal && (
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '11px',
                      background: 'rgba(99,102,241,0.2)',
                      border: '1px solid #6366F1',
                      color: '#A5B4FC',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      verticalAlign: 'middle',
                    }}
                  >
                    ORIGINAL
                  </span>
                )}
              </h3>
              <p
                style={{
                  color: '#9CA3AF',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                }}
              >
                {active.description}
              </p>
            </div>
          </div>

          <DifficultyBar count={hardCount} />

          <div
            style={{
              marginTop: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {DIMS.map((dim) => {
              const val = active.properties[dim.key];
              const opt = dim.options.find((o) => o.value === val);
              const color = DIM_COLORS[dim.key] ?? '#6366F1';
              return (
                <div
                  key={dim.key}
                  style={{
                    background: '#1A1A24',
                    borderRadius: '8px',
                    padding: '12px',
                    border: opt?.harder
                      ? `1px solid ${color}44`
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '6px',
                    }}
                  >
                    {dim.label}
                  </div>
                  <PropertyBadge
                    value={opt?.label ?? val}
                    harder={opt?.harder ?? false}
                    color={color}
                  />
                  <p
                    style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6B7280',
                      lineHeight: 1.5,
                    }}
                  >
                    {dim.description.split('.')[0]}.
                  </p>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '6px',
              }}
            >
              Recommended Architecture
            </div>
            <div style={{ fontSize: '14px', color: '#E5E7EB', lineHeight: 1.6 }}>
              {recommendArchitecture(active.properties)}
            </div>
          </div>
        </div>
      </div>

      <CustomEnvironmentPanel />
    </div>
  );
}
