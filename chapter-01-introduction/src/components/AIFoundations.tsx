import { useState, useCallback, KeyboardEvent } from 'react';
import { getAIFoundations, type AIFoundation } from '../algorithms/index';

const WHAT_IF_MISSING: Record<string, string> = {
  philosophy: 'Without philosophy, AI would lack the concept of rationality, formal logic, and the question of what it means to "think" — the field might never have been formulated.',
  mathematics: 'Without mathematics, there would be no formal logic, no probability theory, no computability bounds — AI would be pure speculation with no rigorous foundation.',
  economics: 'Without economics, AI agents would have no principled way to make decisions or handle multi-agent interactions — no utility functions, no game theory, no MDPs.',
  neuroscience: 'Without neuroscience, the neural network paradigm would be missing — no perceptrons, no deep learning, and a very different landscape of learning algorithms.',
  psychology: 'Without psychology, AI would lack cognitive architectures, the concept of knowledge representation, and the behavioural benchmarks used to evaluate intelligent systems.',
  'computer-engineering': 'Without computer engineering, AI algorithms would exist only on paper — no hardware to run them. The deep learning revolution depends entirely on GPU and TPU advances.',
  'control-theory': 'Without control theory, robotics and reinforcement learning would lack their mathematical foundations — no feedback loops, no optimal control, no Bellman equations.',
  linguistics: 'Without linguistics, AI would have no framework for natural language — no grammars, no parsers, no semantics. NLP and LLMs would be impossibly harder to develop.',
};

function FoundationCard({
  foundation,
  isSelected,
  onSelect,
}: {
  foundation: AIFoundation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(foundation.id);
      }
    },
    [foundation.id, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${foundation.name}: ${foundation.coreQuestion}. Press to ${isSelected ? 'collapse' : 'expand'} details.`}
      onClick={() => onSelect(foundation.id)}
      onKeyDown={handleKey}
      style={{
        background: isSelected ? `${foundation.color}18` : '#1A1A24',
        border: `2px solid ${isSelected ? foundation.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px' }} aria-hidden="true">{foundation.emoji}</span>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
          {foundation.name}
        </h3>
        <div
          style={{
            marginLeft: 'auto',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: foundation.color,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      </div>
      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
        {foundation.coreQuestion}
      </p>

      {isSelected && (
        <div
          style={{
            marginTop: '16px',
            borderTop: `1px solid ${foundation.color}40`,
            paddingTop: '14px',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: foundation.color, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Contributions
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px' }}>
            {foundation.keyContributions.map((c) => (
              <li key={c} style={{ fontSize: '13px', color: '#E5E7EB', marginBottom: '4px', lineHeight: 1.5 }}>
                {c}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 6px' }}>
            Key figures:{' '}
            <span style={{ color: '#E5E7EB' }}>{foundation.keyFigures.join(', ')}</span>
          </p>
          <p style={{ fontSize: '13px', color: '#D1D5DB', margin: 0, lineHeight: 1.6, borderLeft: `3px solid ${foundation.color}`, paddingLeft: '10px' }}>
            {foundation.connectionToAI}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AIFoundations() {
  const foundations = getAIFoundations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [whatIfId, setWhatIfId] = useState<string>('philosophy');

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const selectedFoundation = foundations.find((f) => f.id === whatIfId);

  return (
    <section aria-label="The Foundations of AI">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
        AI did not emerge from a single discipline. AIMA §1.2 identifies{' '}
        <strong style={{ color: '#E5E7EB' }}>8 foundational fields</strong> that contributed core ideas,
        tools, and insights — each answering a piece of the larger puzzle of how to build intelligent machines.
        Click any discipline to explore its contributions.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '36px',
        }}
      >
        {foundations.map((f) => (
          <FoundationCard
            key={f.id}
            foundation={f}
            isSelected={selectedId === f.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* What-if section */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px' }}>
          💡 What if this discipline hadn't contributed to AI?
        </h3>
        <label htmlFor="whatif-select" style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
          Select a discipline:
        </label>
        <select
          id="whatif-select"
          value={whatIfId}
          onChange={(e) => setWhatIfId(e.target.value)}
          aria-label="Select a discipline to explore its impact on AI"
          style={{
            background: '#1A1A24',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '8px',
            color: '#E5E7EB',
            fontSize: '14px',
            padding: '8px 12px',
            marginBottom: '14px',
            width: '100%',
            maxWidth: '320px',
            cursor: 'pointer',
          }}
        >
          {foundations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.emoji} {f.name}
            </option>
          ))}
        </select>
        {selectedFoundation && (
          <p
            style={{
              fontSize: '14px',
              color: '#D1D5DB',
              lineHeight: 1.7,
              margin: 0,
              borderLeft: `3px solid ${selectedFoundation.color}`,
              paddingLeft: '12px',
            }}
          >
            {WHAT_IF_MISSING[whatIfId]}
          </p>
        )}
      </div>
    </section>
  );
}
