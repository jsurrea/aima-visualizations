/**
 * EthicsPrinciplesViz — §28.3 The Ethics of AI
 *
 * Interactive taxonomy of AI ethics principles from the book,
 * plus a Future of Work automation impact explorer (§28.3.5).
 */
import { useState } from 'react';

const CHAPTER_COLOR = '#EF4444';

interface Principle {
  id: string;
  name: string;
  icon: string;
  category: 'safety' | 'fairness' | 'transparency' | 'governance';
  description: string;
  example: string;
  bookSection: string;
}

const PRINCIPLES: Principle[] = [
  {
    id: 'safety',
    name: 'Ensure Safety',
    icon: '🛡',
    category: 'safety',
    description: 'AI systems must be designed to avoid accidents, unintended side effects, and failure modes even in unforeseen circumstances.',
    example: 'A self-driving car must safely handle a punctured tyre at highway speed — not just typical driving scenarios.',
    bookSection: '§28.3.7',
  },
  {
    id: 'fairness',
    name: 'Ensure Fairness',
    icon: '⚖',
    category: 'fairness',
    description: 'AI must not perpetuate societal bias. Systems should be tested across demographic groups for demographic parity, equal opportunity, and calibration.',
    example: 'COMPAS recidivism scoring: well-calibrated but 45% false-positive rate for Black defendants vs. 23% for white defendants.',
    bookSection: '§28.3.3',
  },
  {
    id: 'privacy',
    name: 'Respect Privacy',
    icon: '🔒',
    category: 'governance',
    description: 'Data collectors must be stewards of the data they hold. k-anonymity and differential privacy are technical tools to protect individuals.',
    example: 'Sweeney (2000): 87% of U.S. population can be re-identified from date-of-birth, gender, and zip code alone.',
    bookSection: '§28.3.2',
  },
  {
    id: 'transparency',
    name: 'Provide Transparency',
    icon: '🔍',
    category: 'transparency',
    description: 'Users deserve to know they are interacting with an AI, and to understand how it reached decisions (Explainable AI / XAI).',
    example: "Walsh's Red Flag Law: an autonomous system should identify itself as such at the start of any interaction.",
    bookSection: '§28.3.4',
  },
  {
    id: 'accountability',
    name: 'Establish Accountability',
    icon: '📋',
    category: 'governance',
    description: 'A clear chain of responsibility must exist for AI decisions. Verification & Validation (V&V) processes ensure both correctness and safety.',
    example: 'IEEE P7001 standard defines ethical design requirements for autonomous systems.',
    bookSection: '§28.3.4',
  },
  {
    id: 'autonomousWeapons',
    name: 'Limit Harmful Uses',
    icon: '🚫',
    category: 'governance',
    description: 'Lethal autonomous weapons that locate, select, and engage human targets without human supervision pose profound ethical, legal, and security risks.',
    example: "Over 4,000 AI researchers (including Russell & Norvig) signed an open letter in 2015 calling for a ban on lethal autonomous weapons.",
    bookSection: '§28.3.1',
  },
  {
    id: 'humanRights',
    name: 'Uphold Human Rights',
    icon: '🤝',
    category: 'fairness',
    description: 'AI must be compatible with fundamental human rights. Mass surveillance undermines civil liberties; AI-powered targeting can enable genocide.',
    example: 'As of 2018: 350 million surveillance cameras in China, 70 million in the US — mass-scale facial recognition possible.',
    bookSection: '§28.3.2',
  },
  {
    id: 'employment',
    name: 'Contemplate Employment Impact',
    icon: '🏭',
    category: 'governance',
    description: 'Automation displaces workers. Society must provide lifelong education, retraining, and social safety nets to manage the pace of change.',
    example: "Frey & Osborne (2017): 47% of occupations are at risk from automation. McKinsey: 60% of occupations have at least 30% of tasks automatable.",
    bookSection: '§28.3.5',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  safety: '#EF4444',
  fairness: '#10B981',
  transparency: '#6366F1',
  governance: '#F59E0B',
};

const CATEGORY_LABELS: Record<string, string> = {
  safety: 'Safety',
  fairness: 'Fairness',
  transparency: 'Transparency',
  governance: 'Governance',
};

// Future of Work data
interface Occupation {
  name: string;
  automationRisk: number; // 0–1
  workers: number; // millions in US
  timeline: string;
}

const OCCUPATIONS: Occupation[] = [
  { name: 'Truck / taxi drivers',        automationRisk: 0.79, workers: 3.5, timeline: '2025–2035' },
  { name: 'Data entry clerks',           automationRisk: 0.99, workers: 0.7, timeline: '2020–2025' },
  { name: 'Medical radiologists',        automationRisk: 0.65, workers: 0.05, timeline: '2025–2030' },
  { name: 'Retail cashiers',             automationRisk: 0.97, workers: 3.3, timeline: '2020–2028' },
  { name: 'Financial analysts',          automationRisk: 0.23, workers: 0.3, timeline: '2030–2040' },
  { name: 'Software engineers',          automationRisk: 0.08, workers: 1.8, timeline: '>2040' },
  { name: 'Nurses',                      automationRisk: 0.09, workers: 2.9, timeline: '>2040' },
  { name: 'Farmers / agricultural workers', automationRisk: 0.87, workers: 2.0, timeline: '2025–2035' },
  { name: 'Teachers',                    automationRisk: 0.05, workers: 3.7, timeline: '>2045' },
  { name: 'Warehouse workers',           automationRisk: 0.92, workers: 1.0, timeline: '2022–2030' },
];

function FutureOfWorkDemo() {
  const [threshold, setThreshold] = useState(0.7);

  const atRisk = OCCUPATIONS.filter(o => o.automationRisk >= threshold);
  const totalRiskWorkers = atRisk.reduce((s, o) => s + o.workers, 0);

  return (
    <div>
      <div style={{ marginBottom: '14px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
          Frey & Osborne (2017) estimated that 47% of US occupations are at risk from automation.
          Adjust the risk threshold to see which occupations exceed it and how many workers are affected.
          Note that "at risk" means tasks can be automated — not that all jobs disappear overnight.
        </p>
      </div>

      <label style={{ display: 'block', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
          Automation risk threshold: <strong style={{ color: 'white' }}>{(threshold * 100).toFixed(0)}%</strong>
        </span>
        <input type="range" min="0.1" max="0.99" step="0.01" value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          aria-label="Automation risk threshold"
          style={{ width: '100%', maxWidth: '360px', accentColor: CHAPTER_COLOR }} />
      </label>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', padding: '12px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: `1px solid ${CHAPTER_COLOR}20`, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>At-risk occupations</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: CHAPTER_COLOR }}>{atRisk.length} / {OCCUPATIONS.length}</div>
        </div>
        <div style={{ flex: '1 1 140px', padding: '12px', background: 'var(--surface-2,#1A1A24)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>Workers at risk (M)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#F59E0B' }}>{totalRiskWorkers.toFixed(1)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {OCCUPATIONS.sort((a, b) => b.automationRisk - a.automationRisk).map(occ => {
          const atR = occ.automationRisk >= threshold;
          return (
            <div key={occ.name} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
              borderRadius: '8px', background: atR ? `${CHAPTER_COLOR}08` : 'var(--surface-2,#1A1A24)',
              border: `1px solid ${atR ? `${CHAPTER_COLOR}20` : 'rgba(255,255,255,0.04)'}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: atR ? 'white' : '#9CA3AF', fontWeight: atR ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {occ.name}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{occ.workers}M workers · {occ.timeline}</div>
              </div>
              <div style={{ width: '120px', background: 'var(--surface-3,#242430)', borderRadius: '4px', overflow: 'hidden', height: '8px', flexShrink: 0 }}>
                <div style={{ height: '100%', width: `${occ.automationRisk * 100}%`, background: atR ? CHAPTER_COLOR : '#374151', borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
              <span style={{ width: '36px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: atR ? CHAPTER_COLOR : '#6B7280', flexShrink: 0 }}>
                {(occ.automationRisk * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EthicsPrinciplesViz() {
  const [tab, setTab] = useState<'principles' | 'work'>('principles');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(null);

  const categories = ['all', 'safety', 'fairness', 'transparency', 'governance'];
  const filtered = selectedCategory === 'all'
    ? PRINCIPLES
    : PRINCIPLES.filter(p => p.category === selectedCategory);

  return (
    <div role="region" aria-label="AI Ethics Principles">
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'principles', label: 'Ethics Principles Taxonomy' },
          { id: 'work', label: 'Future of Work (§28.3.5)' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'principles' | 'work')}
            aria-pressed={tab === t.id}
            style={{
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontSize: '13px', fontWeight: 600,
              background: tab === t.id ? `${CHAPTER_COLOR}20` : 'var(--surface-3,#242430)',
              color: tab === t.id ? CHAPTER_COLOR : '#9CA3AF',
              outline: tab === t.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'principles' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--surface-2,#1A1A24)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              The book distils the most commonly cited AI ethics principles from governments, companies, and
              research organisations worldwide. Click a principle card to see its description, a real-world
              example, and the book section where it is discussed.
            </p>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }} role="group" aria-label="Category filter">
            {categories.map(cat => {
              const color = cat === 'all' ? '#9CA3AF' : CATEGORY_COLORS[cat];
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                  style={{
                    padding: '5px 14px', borderRadius: '999px', cursor: 'pointer', border: 'none',
                    fontSize: '12px', fontWeight: 600, textTransform: cat === 'all' ? 'none' : 'capitalize',
                    background: selectedCategory === cat ? `${color}20` : 'var(--surface-3,#242430)',
                    color: selectedCategory === cat ? color : '#6B7280',
                    outline: selectedCategory === cat ? `1px solid ${color}40` : 'none',
                  }}>
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>

          {/* Principle cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {filtered.map(p => {
              const color = CATEGORY_COLORS[p.category];
              const isSelected = selectedPrinciple === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPrinciple(isSelected ? null : p.id)}
                  aria-expanded={isSelected}
                  aria-label={p.name}
                  style={{
                    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                    border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.06)'}`,
                    background: isSelected ? `${color}08` : 'var(--surface-2,#1A1A24)',
                    textAlign: 'left', transition: 'all 0.15s', width: '100%',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{p.icon}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${color}15`, color, fontWeight: 600 }}>
                      {p.bookSection}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>{CATEGORY_LABELS[p.category]}</div>

                  {isSelected && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${color}20` }}>
                      <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.7, marginBottom: '10px' }}>{p.description}</p>
                      <div style={{ padding: '8px 12px', background: `${color}08`, borderRadius: '6px', borderLeft: `2px solid ${color}` }}>
                        <div style={{ fontSize: '11px', color, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-world example</div>
                        <p style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{p.example}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Asimov's Laws callout */}
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(99,102,241,0.06)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#818CF8', marginBottom: '10px' }}>Asimov's Laws of Robotics (1942)</h4>
            <ol style={{ paddingLeft: '20px', margin: 0 }}>
              {[
                'A robot may not harm humanity, or through inaction allow humanity to come to harm.',
                'A robot may not injure a human being or, through inaction, allow a human to come to harm.',
                'A robot must obey orders given by humans, except where such orders conflict with Law 1.',
                'A robot must protect its own existence, unless this conflicts with Laws 1 or 2.',
              ].map((law, i) => (
                <li key={i} style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.7, marginBottom: '4px' }}>
                  {i === 0 && <strong style={{ color: '#818CF8' }}>Law 0: </strong>}
                  {i === 1 && <strong style={{ color: '#818CF8' }}>Law 1: </strong>}
                  {i === 2 && <strong style={{ color: '#818CF8' }}>Law 2: </strong>}
                  {i === 3 && <strong style={{ color: '#818CF8' }}>Law 3: </strong>}
                  {law}
                </li>
              ))}
            </ol>
            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '10px', marginBottom: 0, fontStyle: 'italic' }}>
              These laws seem reasonable but are nearly impossible to implement — the classic tension between
              formal rules and informal human judgment. Asimov's own stories reveal these loopholes.
            </p>
          </div>
        </div>
      )}

      {tab === 'work' && <FutureOfWorkDemo />}
    </div>
  );
}
