import { useState, useCallback, KeyboardEvent } from 'react';
import { getAICapabilities, type AICapability } from '../algorithms/index';

const COMPARISON_COLORS: Record<AICapability['humanComparison'], string> = {
  exceeds: '#10B981',
  matches: '#6366F1',
  approaching: '#F59E0B',
  below: '#EF4444',
};

const COMPARISON_LABELS: Record<AICapability['humanComparison'], string> = {
  exceeds: 'Exceeds Human',
  matches: 'Matches Human',
  approaching: 'Approaching Human',
  below: 'Below Human',
};

const ALL_DOMAINS = ['All', 'Vision', 'Language', 'Games', 'Medicine', 'Robotics'];

function CapabilityCard({ capability }: { capability: AICapability }) {
  const [expanded, setExpanded] = useState(false);
  const color = COMPARISON_COLORS[capability.humanComparison];
  const label = COMPARISON_LABELS[capability.humanComparison];

  const handleKey = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded((prev) => !prev);
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={expanded}
      aria-label={`${capability.title} in ${capability.domain}: ${label}. Press to ${expanded ? 'collapse' : 'expand'} details.`}
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={handleKey}
      style={{
        background: expanded ? `${color}12` : '#1A1A24',
        border: `2px solid ${expanded ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }} aria-hidden="true">{capability.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              {capability.title}
            </h3>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: `${color}20`,
                color,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#6B7280',
                background: '#242430',
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              {capability.domain}
            </span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>{capability.year}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', borderTop: `1px solid ${color}30`, paddingTop: '12px' }}>
          <p style={{ fontSize: '13px', color: '#D1D5DB', margin: '0 0 8px', lineHeight: 1.6 }}>
            {capability.description}
          </p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
            🏆 <span style={{ color: '#E5E7EB' }}>{capability.milestone}</span>
          </p>
        </div>
      )}
    </div>
  );
}

type SortKey = 'year' | 'domain' | 'humanComparison';

export default function AICapabilities() {
  const capabilities = getAICapabilities();
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [compFilter, setCompFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('domain');

  const handleDomainKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, domain: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setDomainFilter(domain);
      }
    },
    [],
  );

  const handleCompKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, comp: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setCompFilter(comp);
      }
    },
    [],
  );

  const compValues: Array<'All' | AICapability['humanComparison']> = [
    'All',
    'exceeds',
    'matches',
    'approaching',
    'below',
  ];

  const filtered = capabilities
    .filter((c) => domainFilter === 'All' || c.domain === domainFilter)
    .filter((c) => compFilter === 'All' || c.humanComparison === compFilter)
    .slice()
    .sort((a, b) => {
      if (sortKey === 'year') return a.year - b.year;
      if (sortKey === 'domain') return a.domain.localeCompare(b.domain);
      const order: Record<AICapability['humanComparison'], number> = {
        exceeds: 0,
        matches: 1,
        approaching: 2,
        below: 3,
      };
      return order[a.humanComparison] - order[b.humanComparison];
    });

  const filterBtnStyle = (active: boolean, color?: string) => ({
    padding: '5px 12px',
    borderRadius: '999px',
    border: `1px solid ${active ? (color ?? '#6366F1') : 'rgba(255,255,255,0.12)'}`,
    background: active ? `${color ?? '#6366F1'}20` : 'transparent',
    color: active ? (color ?? '#6366F1') : '#9CA3AF',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  });

  return (
    <section aria-label="The State of the Art in AI">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
        AIMA §1.4 surveys what AI systems can actually do. Many tasks once thought to require human-level
        intelligence are now routinely handled by machines — and several{' '}
        <strong style={{ color: '#10B981' }}>exceed human performance</strong>. Use the filters below to
        explore specific domains and milestones.
      </p>

      {/* Filters */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Domain
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }} role="group" aria-label="Filter by domain">
          {ALL_DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              onKeyDown={(e) => handleDomainKey(e, d)}
              aria-pressed={domainFilter === d}
              style={filterBtnStyle(domainFilter === d)}
            >
              {d}
            </button>
          ))}
        </div>

        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Performance vs Humans
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }} role="group" aria-label="Filter by human comparison">
          {compValues.map((c) => {
            const color = c === 'All' ? '#6366F1' : COMPARISON_COLORS[c];
            const label = c === 'All' ? 'All' : COMPARISON_LABELS[c];
            return (
              <button
                key={c}
                onClick={() => setCompFilter(c)}
                onKeyDown={(e) => handleCompKey(e, c)}
                aria-pressed={compFilter === c}
                style={filterBtnStyle(compFilter === c, color)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="sort-select" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort capabilities"
            style={{
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#E5E7EB',
              fontSize: '13px',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            <option value="domain">Domain</option>
            <option value="year">Year</option>
            <option value="humanComparison">Performance</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          No capabilities match the selected filters.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px',
          }}
          aria-live="polite"
          aria-label={`Showing ${filtered.length} AI capabilities`}
        >
          {filtered.map((c) => (
            <CapabilityCard key={c.id} capability={c} />
          ))}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '20px', textAlign: 'center' }}>
        Data reflects AIMA 4th Ed. §1.4 (2019 era). Performance continues to advance rapidly.
      </p>
    </section>
  );
}
