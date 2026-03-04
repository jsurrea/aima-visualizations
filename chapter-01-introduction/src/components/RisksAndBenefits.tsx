import { useState, useCallback, KeyboardEvent } from 'react';
import { getAIRisksAndBenefits, type AIRisk } from '../algorithms/index';

const SEVERITY_COLORS: Record<AIRisk['severity'], string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

const TIMEFRAME_LABELS: Record<AIRisk['timeframe'], string> = {
  present: 'Happening Now',
  'near-term': 'Near-Term',
  'long-term': 'Long-Term',
};

const CAPABILITY_LEVELS = ['low', 'medium', 'high'] as const;
type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

const CAPABILITY_RISK_FILTER: Record<CapabilityLevel, ReadonlyArray<AIRisk['timeframe']>> = {
  low: ['present'],
  medium: ['present', 'near-term'],
  high: ['present', 'near-term', 'long-term'],
};

function RiskBenefitCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: AIRisk;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const isBenefit = item.type === 'benefit';
  const color = isBenefit ? '#10B981' : SEVERITY_COLORS[item.severity];

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(item.id);
      }
    },
    [item.id, onToggle],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isExpanded}
      aria-label={`${item.title}. ${isBenefit ? 'Benefit' : `Risk, severity: ${item.severity}`}. Press to ${isExpanded ? 'collapse' : 'expand'}.`}
      onClick={() => onToggle(item.id)}
      onKeyDown={handleKey}
      style={{
        background: isExpanded ? `${color}12` : '#1A1A24',
        border: `2px solid ${isExpanded ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '10px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        outline: 'none',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }} aria-hidden="true">{item.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>{item.title}</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '999px',
                background: `${color}20`,
                color,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {TIMEFRAME_LABELS[item.timeframe]}
            </span>
          </div>
          {!isBenefit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {(['high', 'medium', 'low'] as const).map((s) => (
                <div
                  key={s}
                  aria-hidden="true"
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: item.severity === 'high' ? SEVERITY_COLORS['high']
                      : item.severity === 'medium' && s !== 'high' ? SEVERITY_COLORS['medium']
                      : item.severity === 'low' && s === 'low' ? SEVERITY_COLORS['low']
                      : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
              <span style={{ fontSize: '11px', color: SEVERITY_COLORS[item.severity], marginLeft: '4px', fontWeight: 600 }}>
                {item.severity} severity
              </span>
            </div>
          )}
        </div>
        <span
          aria-hidden="true"
          style={{
            color: '#6B7280',
            fontSize: '16px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </div>

      {isExpanded && (
        <p style={{ fontSize: '13px', color: '#D1D5DB', margin: '10px 0 0', lineHeight: 1.7 }}>
          {item.description}
        </p>
      )}
    </div>
  );
}

export default function RisksAndBenefits() {
  const items = getAIRisksAndBenefits();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [capabilityLevel, setCapabilityLevel] = useState<CapabilityLevel>('medium');

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSliderKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // allow default arrow key behaviour for slider
    void e;
  }, []);

  const allowedTimeframes = CAPABILITY_RISK_FILTER[capabilityLevel];
  const benefits = items.filter((i) => i.type === 'benefit');
  const risks = items.filter(
    (i) => i.type === 'risk' && allowedTimeframes.includes(i.timeframe),
  );

  const alignmentRisk = items.find((i) => i.id === 'risk-value-alignment');

  const levelIndex = CAPABILITY_LEVELS.indexOf(capabilityLevel);

  return (
    <section aria-label="Risks and Benefits of AI">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
        AIMA §1.5 examines both the transformative <strong style={{ color: '#10B981' }}>benefits</strong>{' '}
        AI can bring and the serious <strong style={{ color: '#EF4444' }}>risks</strong> it poses. The
        risks are not hypothetical — many are already materialising. The{' '}
        <strong style={{ color: '#E5E7EB' }}>value alignment problem</strong> is the deepest long-term concern.
      </p>

      {/* Capability-level slider */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <label
          htmlFor="capability-slider"
          style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', display: 'block', marginBottom: '8px' }}
        >
          🎚️ AI Capability Level: <span style={{ color: '#6366F1', textTransform: 'capitalize' }}>{capabilityLevel}</span>
        </label>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px' }}>
          Adjust to see which risks become relevant as AI systems become more capable.
        </p>
        <input
          id="capability-slider"
          type="range"
          min={0}
          max={2}
          value={levelIndex}
          onChange={(e) => setCapabilityLevel(CAPABILITY_LEVELS[Number(e.target.value)] ?? 'medium')}
          onKeyDown={handleSliderKey}
          aria-label={`AI capability level: ${capabilityLevel}`}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={levelIndex}
          aria-valuetext={capabilityLevel}
          style={{ width: '100%', maxWidth: '300px', accentColor: '#6366F1', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', marginTop: '4px' }}>
          {CAPABILITY_LEVELS.map((l) => (
            <span key={l} style={{ fontSize: '11px', color: '#6B7280', textTransform: 'capitalize' }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Benefits column */}
        <div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#10B981',
              margin: '0 0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ✅ Benefits
          </h3>
          {benefits.map((item) => (
            <RiskBenefitCard
              key={item.id}
              item={item}
              isExpanded={expandedIds.has(item.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Risks column */}
        <div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#EF4444',
              margin: '0 0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚠️ Risks
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#6B7280', marginLeft: '4px' }}>
              (showing {capabilityLevel}-capability risks)
            </span>
          </h3>
          {risks.filter((r) => r.id !== 'risk-value-alignment').map((item) => (
            <RiskBenefitCard
              key={item.id}
              item={item}
              isExpanded={expandedIds.has(item.id)}
              onToggle={handleToggle}
            />
          ))}
          {risks.filter((r) => r.id !== 'risk-value-alignment').length === 0 && (
            <p style={{ color: '#6B7280', fontSize: '13px', fontStyle: 'italic' }}>
              No additional risks visible at this capability level.
            </p>
          )}
        </div>
      </div>

      {/* Value Alignment section */}
      {alignmentRisk && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1a0f0f 0%, #111118 100%)',
            border: '1px solid #EF444440',
            borderRadius: '14px',
            padding: '24px',
          }}
          aria-label="The Value Alignment Problem"
        >
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#EF4444', margin: '0 0 12px' }}>
            🎯 The Value Alignment Problem
          </h3>
          <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.7, margin: '0 0 16px' }}>
            {alignmentRisk.description}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              {
                title: '👑 King Midas Problem',
                text: 'The king wished for everything he touched to turn to gold — achieving his stated goal perfectly, but starving as a result. An AI that optimises the wrong proxy can devastate the thing it was meant to protect.',
              },
              {
                title: '🦍 Gorilla Problem',
                text: 'Gorillas are not threatened by malice, but by humans who are simply more powerful and pursue different goals. Once a superintelligent AI exists, humanity may be in the same position as gorillas.',
              },
              {
                title: '📋 The Standard Model\'s Flaw',
                text: 'The rational agent model assumes we can fully specify the performance measure. But human values are complex, context-dependent, and partially unknowable — making complete specification impossible.',
              },
            ].map(({ title, text }) => (
              <div
                key={title}
                style={{
                  background: '#1A1A24',
                  borderRadius: '10px',
                  padding: '14px',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#F87171', margin: '0 0 6px' }}>
                  {title}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
