import { useState } from 'react';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface World {
  id: string;
  label: string;
  facts: ReadonlyArray<string>;
  color: string;
}

interface Agent {
  id: string;
  label: string;
  accessibleWorlds: ReadonlyArray<string>;
  color: string;
}

// ─── Initial Scenario ─────────────────────────────────────────────────────────

const INITIAL_WORLDS: ReadonlyArray<World> = [
  {
    id: 'real',
    label: 'Real World',
    facts: [
      'Superman = ClarkKent',
      'CanFly(Superman)',
      'CanFly(ClarkKent)',
      'WorksAtPlanet(ClarkKent)',
      'ReporterIdentity(ClarkKent)',
    ],
    color: '#6366F1',
  },
  {
    id: 'w1',
    label: 'World W₁ (Lois accessible)',
    facts: [
      'Superman ≠ ClarkKent',
      'CanFly(Superman)',
      '¬CanFly(ClarkKent)',
      'WorksAtPlanet(ClarkKent)',
    ],
    color: '#10B981',
  },
  {
    id: 'w2',
    label: 'World W₂ (Lois accessible)',
    facts: [
      'Superman = ClarkKent',
      'CanFly(Superman)',
      'CanFly(ClarkKent)',
    ],
    color: '#F59E0B',
  },
  {
    id: 'w3',
    label: 'World W₃ (Bond accessible)',
    facts: [
      'Superman = ClarkKent',
      'CanFly(Superman)',
      'CanFly(ClarkKent)',
      '¬WorksAtPlanet(ClarkKent)',
    ],
    color: '#EC4899',
  },
];

const INITIAL_AGENTS: ReadonlyArray<Agent> = [
  { id: 'lois', label: 'Lois Lane', accessibleWorlds: ['w1', 'w2'], color: '#10B981' },
  { id: 'bond', label: 'James Bond', accessibleWorlds: ['w3'], color: '#EC4899' },
  { id: 'clark', label: 'Clark Kent', accessibleWorlds: ['real'], color: '#6366F1' },
];

const KNOWN_FACTS = [
  'CanFly(Superman)',
  'CanFly(ClarkKent)',
  'Superman = ClarkKent',
  'WorksAtPlanet(ClarkKent)',
];

// ─── Knowledge computation ────────────────────────────────────────────────────

function agentKnows(
  agentId: string,
  fact: string,
  agents: ReadonlyArray<Agent>,
  worlds: ReadonlyArray<World>
): boolean {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return false;
  // An agent knows P iff P holds in ALL accessible worlds
  return agent.accessibleWorlds.every(wId => {
    const world = worlds.find(w => w.id === wId);
    return world?.facts.includes(fact) ?? false;
  });
}

// ─── World Card ───────────────────────────────────────────────────────────────

function WorldCard({ world, isReal, accessibleBySelected }: {
  world: World;
  isReal: boolean;
  accessibleBySelected: boolean;
}) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `2px solid ${accessibleBySelected ? world.color : 'var(--surface-border)'}`,
      borderRadius: 'var(--radius)',
      padding: 16,
      opacity: accessibleBySelected ? 1 : 0.5,
      transition: 'opacity 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: world.color, display: 'inline-block',
        }} />
        <span style={{ color: world.color, fontWeight: 700, fontSize: 14 }}>
          {world.label} {isReal && '⭐'}
        </span>
      </div>
      <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
        {world.facts.map(f => (
          <li key={f} style={{ color: '#E5E7EB', fontSize: 12, marginBottom: 2 }}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModalLogicViz() {
  const [selectedAgent, setSelectedAgent] = useState<string>('lois');
  const [agents, setAgents] = useState<ReadonlyArray<Agent>>(INITIAL_AGENTS);
  const [worlds, setWorlds] = useState<ReadonlyArray<World>>(INITIAL_WORLDS);
  const [newFact, setNewFact] = useState('');
  const [addedFacts, setAddedFacts] = useState<ReadonlyArray<string>>([]);

  const agent = agents.find(a => a.id === selectedAgent) ?? agents[0]!;
  const accessibleWorlds = new Set(agent.accessibleWorlds);

  const toggleWorldAccess = (worldId: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== selectedAgent) return a;
      const has = a.accessibleWorlds.includes(worldId);
      return {
        ...a,
        accessibleWorlds: has
          ? a.accessibleWorlds.filter(w => w !== worldId)
          : [...a.accessibleWorlds, worldId],
      };
    }));
  };

  const addFactToRealWorld = () => {
    const f = newFact.trim();
    if (!f) return;
    setWorlds(prev => prev.map(w =>
      w.id === 'real' ? { ...w, facts: [...w.facts, f] } : w
    ));
    setAddedFacts(prev => [...prev, f]);
    setNewFact('');
  };

  return (
    <div
      id="modal-logic"
      style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}
      aria-label="Modal Logic visualization"
    >
      <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>
        §10.4 Mental Objects &amp; Modal Logic
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 6, lineHeight: 1.6 }}>
        Possible-worlds semantics: agent <em>K</em> knows <em>P</em> iff <em>P</em> holds in all accessible worlds.
      </p>
      <div style={{ marginBottom: 20 }} dangerouslySetInnerHTML={{
        __html: renderInlineMath('K_a P \\equiv \\forall w \\in \\text{Acc}(a): w \\models P')
      }} />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* Left: Agent selector + knowledge table */}
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Select Agent</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAgent(a.id)}
                aria-pressed={selectedAgent === a.id}
                style={{
                  background: selectedAgent === a.id ? a.color : 'var(--surface-2)',
                  border: `1px solid ${a.color}`,
                  borderRadius: 8, color: '#fff', padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                }}
              >{a.label}</button>
            ))}
          </div>

          {/* Accessible worlds toggles */}
          <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Accessible Worlds</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {worlds.filter(w => w.id !== 'real').map(w => (
              <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#E5E7EB' }}>
                <input
                  type="checkbox"
                  checked={accessibleWorlds.has(w.id)}
                  onChange={() => toggleWorldAccess(w.id)}
                  aria-label={`Toggle ${w.label} accessible to ${agent.label}`}
                />
                <span style={{ color: w.color }}>{w.label}</span>
              </label>
            ))}
          </div>

          {/* Knowledge table */}
          <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Knowledge of {agent.label}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {KNOWN_FACTS.map(fact => {
              const knows = agentKnows(agent.id, fact, agents, worlds);
              return (
                <div key={fact} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px',
                  border: `1px solid ${knows ? '#10B981' : 'var(--surface-border)'}`,
                }}>
                  <span style={{ fontSize: 14 }}>{knows ? '✓' : '✗'}</span>
                  <span style={{ fontSize: 12, color: knows ? '#10B981' : '#6B7280', flex: 1 }}>{fact}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    K({agent.label.split(' ')[0]}, {fact})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nested knowledge example */}
          <div style={{ marginTop: 16, background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#F59E0B', marginBottom: 6 }}>Nested Knowledge:</div>
            <div dangerouslySetInnerHTML={{ __html: renderInlineMath('K(\\text{Clark}, \\text{Superman} = \\text{ClarkKent})') }} />
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Clark knows his own identity — his only accessible world is the real world.
            </div>
          </div>
        </div>

        {/* Right: Worlds display */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>Possible Worlds</h3>
          {worlds.map(w => (
            <WorldCard
              key={w.id}
              world={w}
              isReal={w.id === 'real'}
              accessibleBySelected={w.id === 'real' || accessibleWorlds.has(w.id)}
            />
          ))}

          {/* What-if: add fact to real world */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 14 }}>
            <h3 style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>What-If: Add Fact to Real World</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={newFact}
                onChange={e => setNewFact(e.target.value)}
                placeholder="e.g. HasCape(Superman)"
                aria-label="New fact to add"
                style={{
                  flex: 1, background: 'var(--surface-3)', border: '1px solid var(--surface-border)',
                  borderRadius: 6, color: '#E5E7EB', padding: '6px 10px', fontSize: 13,
                }}
                onKeyDown={e => e.key === 'Enter' && addFactToRealWorld()}
              />
              <button onClick={addFactToRealWorld} style={btnStyle} aria-label="Add fact">Add</button>
            </div>
            {addedFacts.length > 0 && (
              <div style={{ fontSize: 12, color: '#F59E0B' }}>
                Added: {addedFacts.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referential opacity explainer */}
      <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: 'var(--surface-2)', borderRadius: 8, padding: 12, fontSize: 12 }}>
          <div style={{ color: '#6366F1', fontWeight: 600, marginBottom: 6 }}>Referential Transparency</div>
          <div style={{ color: '#9CA3AF' }}>
            If Superman = ClarkKent, then CanFly(Superman) ↔ CanFly(ClarkKent) in the <em>real world</em>.
          </div>
        </div>
        <div style={{ flex: '1 1 200px', background: 'var(--surface-2)', borderRadius: 8, padding: 12, fontSize: 12 }}>
          <div style={{ color: '#F59E0B', fontWeight: 600, marginBottom: 6 }}>Referential Opacity</div>
          <div style={{ color: '#9CA3AF' }}>
            Lois knows CanFly(Superman) but NOT CanFly(ClarkKent) — inside modal K operator, substitution fails!
          </div>
          <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: renderInlineMath('K(\\text{Lois}, \\text{CanFly}(\\text{Superman})) \\not\\Rightarrow K(\\text{Lois}, \\text{CanFly}(\\text{Clark}))') }} />
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  background: '#8B5CF6', border: 'none', borderRadius: 6,
  color: '#fff', padding: '6px 14px', fontSize: 13, cursor: 'pointer',
};
