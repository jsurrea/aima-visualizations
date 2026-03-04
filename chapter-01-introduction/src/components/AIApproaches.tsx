import { useState, useCallback, KeyboardEvent } from 'react';
import { getAIApproaches, type AIApproach } from '../algorithms/index';

const ACCENT = '#6366F1';

const CELL_COLORS: Record<string, string> = {
  'think-human': '#3B82F6',
  'think-rational': '#6366F1',
  'act-human': '#10B981',
  'act-rational': '#8B5CF6',
};

function ApproachCell({
  approach,
  isSelected,
  onSelect,
}: {
  approach: AIApproach;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const color = CELL_COLORS[approach.id] ?? ACCENT;

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(approach.id);
      }
    },
    [approach.id, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${approach.title}: ${approach.tagline}. Press to ${isSelected ? 'collapse' : 'expand'} details.`}
      onClick={() => onSelect(approach.id)}
      onKeyDown={handleKey}
      style={{
        background: isSelected ? `${color}22` : '#1A1A24',
        border: `2px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        outline: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          background: `${color}20`,
          color,
          marginBottom: '10px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {approach.row === 'think' ? 'Thinking' : 'Acting'} ×{' '}
        {approach.col === 'human' ? 'Human' : 'Rational'}
      </div>
      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>
        {approach.title}
      </h3>
      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 12px', fontStyle: 'italic' }}>
        {approach.tagline}
      </p>
      <p style={{ fontSize: '14px', color: '#E5E7EB', margin: 0, lineHeight: 1.6 }}>
        {approach.description}
      </p>

      {isSelected && (
        <div style={{ marginTop: '16px', borderTop: `1px solid ${color}40`, paddingTop: '14px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Examples
          </p>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {approach.examples.map((ex) => (
              <li key={ex} style={{ fontSize: '13px', color: '#E5E7EB', marginBottom: '4px' }}>
                {ex}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '10px', margin: '10px 0 0' }}>
            Key figure: <span style={{ color: '#E5E7EB' }}>{approach.keyFigure}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function AIApproaches() {
  const approaches = getAIApproaches();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const thinkRow = approaches.filter((a) => a.row === 'think');
  const actRow = approaches.filter((a) => a.row === 'act');

  const axisLabel = (text: string) => (
    <div
      aria-hidden="true"
      style={{
        fontSize: '12px',
        fontWeight: 600,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );

  return (
    <section aria-label="The Four Approaches to AI">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
        Russell &amp; Norvig classify AI into four quadrants based on two axes: whether the system
        mimics <strong style={{ color: '#E5E7EB' }}>human</strong> or{' '}
        <strong style={{ color: '#E5E7EB' }}>rational</strong> behaviour, and whether it focuses on{' '}
        <strong style={{ color: '#E5E7EB' }}>thinking</strong> or{' '}
        <strong style={{ color: '#E5E7EB' }}>acting</strong>. Click a cell to see examples.
      </p>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>🧑</span>
          {axisLabel('Human')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>⚖️</span>
          {axisLabel('Rational')}
        </div>
      </div>

      {/* Row: Thinking */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            🧠 Thinking
          </div>
        </div>
        {thinkRow.map((a) => (
          <ApproachCell
            key={a.id}
            approach={a}
            isSelected={selectedId === a.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Row: Acting */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            🦾 Acting
          </div>
        </div>
        {actRow.map((a) => (
          <ApproachCell
            key={a.id}
            approach={a}
            isSelected={selectedId === a.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '16px', textAlign: 'center' }}>
        AIMA 4th Ed., Chapter 1 — This book adopts the{' '}
        <span style={{ color: ACCENT }}>Acting Rationally</span> approach.
      </p>
    </section>
  );
}
