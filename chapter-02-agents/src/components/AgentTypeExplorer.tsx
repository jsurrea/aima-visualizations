import { useState } from 'react';
import { getAgentTypes, type AgentType } from '../algorithms/index';

const AGENT_TYPES = getAgentTypes();
// Safety: getAgentTypes always returns 5 entries
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DEFAULT_AGENT = AGENT_TYPES[0]!;

interface CapabilityProps {
  label: string;
  enabled: boolean;
}

function Capability({ label, enabled }: CapabilityProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: `2px solid ${enabled ? '#6366F1' : 'rgba(255,255,255,0.15)'}`,
          background: enabled ? 'rgba(99,102,241,0.2)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '11px',
          color: '#A5B4FC',
        }}
      >
        {enabled ? '✓' : ''}
      </span>
      <span
        style={{
          fontSize: '13px',
          color: enabled ? '#E5E7EB' : '#4B5563',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function AgentCard({
  agent,
  isActive,
  onClick,
}: {
  agent: AgentType;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`agent-panel-${agent.id}`}
      id={`agent-tab-${agent.id}`}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '16px',
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
          fontWeight: 700,
          fontSize: '14px',
          color: isActive ? '#A5B4FC' : '#E5E7EB',
          marginBottom: '4px',
        }}
      >
        {agent.title}
      </div>
      <div
        style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}
      >
        {agent.description.slice(0, 60)}…
      </div>
    </button>
  );
}

export default function AgentTypeExplorer() {
  const [activeId, setActiveId] = useState<string>(DEFAULT_AGENT.id);
  const active = AGENT_TYPES.find((a) => a.id === activeId) ?? DEFAULT_AGENT;

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
        AIMA describes five agent architectures of increasing sophistication. Select an architecture to
        see its components, capabilities, and real-world examples.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 280px) 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Left: card list */}
        <div role="tablist" aria-label="Agent architectures" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {AGENT_TYPES.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={agent.id === activeId}
              onClick={() => setActiveId(agent.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div
          id={`agent-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`agent-tab-${active.id}`}
          style={{
            background: '#111118',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#A5B4FC',
              marginBottom: '8px',
            }}
          >
            {active.title}
          </h3>
          <p style={{ color: '#E5E7EB', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
            {active.description}
          </p>

          {/* Capability diagram */}
          <div
            style={{
              background: '#1A1A24',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6B7280',
                marginBottom: '12px',
              }}
            >
              Capabilities
            </div>
            <Capability label="Internal World Model" enabled={active.hasModel} />
            <Capability label="Goal-Directed Behaviour" enabled={active.hasGoals} />
            <Capability label="Utility / Preferences" enabled={active.hasUtility} />
            <Capability label="Learning Element" enabled={active.hasLearning} />
          </div>

          {/* Components */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6B7280',
                marginBottom: '10px',
              }}
            >
              Components
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {active.components.map((c) => (
                <span
                  key={c}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: '#A5B4FC',
                    fontSize: '12px',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6B7280',
                marginBottom: '10px',
              }}
            >
              Examples
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {active.examples.map((ex) => (
                <li
                  key={ex}
                  style={{
                    color: '#E5E7EB',
                    fontSize: '14px',
                    marginBottom: '6px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: '#6366F1', flexShrink: 0 }}>›</span>
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
