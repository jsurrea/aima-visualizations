import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  buildNGramModel,
  ngramProbability,
  laplaceSmoothedProbability,
  linearInterpolationProbability,
  sentenceProbability,
  type NGramModel,
  type NGramStep,
} from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const COLOR = '#F59E0B';
const COLOR_MLE = '#6366F1';
const COLOR_LAP = '#10B981';

const CHART_LABEL_MAX = 14;
const CHART_LABEL_TRUNCATE = 13;
const DEFAULT_CORPUS =
  'the cat sat on the mat the cat sat on the hat the dog sat on the mat';

// ─── Small Helpers ────────────────────────────────────────────────────────────

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-2, #1A1A24)',
        border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: '16px',
        fontWeight: 700,
        color: COLOR,
        marginBottom: '12px',
        marginTop: 0,
      }}
    >
      {children}
    </h3>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: 'var(--surface-1, #111118)',
        border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: '90px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '18px', fontWeight: 700, color: COLOR }}>
        {value}
      </span>
    </div>
  );
}

function ProbRow({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number | null;
  max: number;
  color: string;
  note?: string;
}) {
  const pct = value !== null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        background: 'var(--surface-1, #111118)',
        border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
        borderRadius: '8px',
        padding: '10px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{label}</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: value === null ? '#4B5563' : color,
            fontFamily: 'monospace',
          }}
        >
          {value === null ? 'N/A' : value.toFixed(6)}
        </span>
      </div>
      <div
        style={{
          height: '5px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '3px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {note && (
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
          {note}
        </div>
      )}
    </div>
  );
}

// ─── Table sort header ────────────────────────────────────────────────────────

type SortField = 'ngram' | 'count' | 'probability';
type SortDir = 'asc' | 'desc';

function SortTh({
  field,
  label,
  currentField,
  currentDir,
  onSort,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <th
      onClick={() => onSort(field)}
      aria-sort={
        active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      style={{
        padding: '8px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '12px',
        color: active ? COLOR : '#9CA3AF',
        fontWeight: active ? 700 : 500,
        background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
      scope="col"
    >
      {label} {active ? (currentDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );
}

// ─── Tokenise helper ─────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(w => w.length > 0);
}

// ─── Table row type (NGramStep + laplaceProb) ─────────────────────────────────

type TableRow = NGramStep & { laplaceProb: number };

// ─── Main component ───────────────────────────────────────────────────────────

export function NGramVisualizer() {
  const [corpus, setCorpus] = useState(DEFAULT_CORPUS);
  const [selectedN, setSelectedN] = useState<1 | 2 | 3>(2);
  const [testInput, setTestInput] = useState('cat sat');
  const [lambda, setLambda] = useState(0.7);
  const [sentenceInput, setSentenceInput] = useState(
    'the cat sat on the mat',
  );
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tableFilter, setTableFilter] = useState('');
  const [barAnimProgress, setBarAnimProgress] = useState(0);

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
    [],
  );

  // ── Tokenise corpus ────────────────────────────────────────────────────────

  const tokens = useMemo(() => tokenize(corpus), [corpus]);

  // ── Build all three models (always, so interpolation always works) ──────────

  const model1 = useMemo(() => buildNGramModel(tokens, 1), [tokens]);
  const model2 = useMemo(() => buildNGramModel(tokens, 2), [tokens]);
  const model3 = useMemo(() => buildNGramModel(tokens, 3), [tokens]);

  const currentModel: NGramModel =
    selectedN === 1 ? model1 : selectedN === 2 ? model2 : model3;

  // ── Vocabulary list ────────────────────────────────────────────────────────

  const vocabList = useMemo(
    () => Array.from(model1.vocabulary).sort(),
    [model1],
  );

  // ── N-gram table data ──────────────────────────────────────────────────────

  const tableData = useMemo((): TableRow[] => {
    const rows: TableRow[] = [];
    for (const [ngram, count] of currentModel.counts.entries()) {
      const words = ngram.split(' ');
      let contextCount: number;
      let probability: number;
      if (currentModel.n === 1) {
        contextCount = currentModel.totalTokens;
        probability =
          currentModel.totalTokens > 0 ? count / currentModel.totalTokens : 0;
      } else {
        const context = words.slice(0, -1).join(' ');
        contextCount = currentModel.contextCounts.get(context) ?? 0;
        probability = contextCount > 0 ? count / contextCount : 0;
      }
      const laplaceProb = laplaceSmoothedProbability(currentModel, words);
      rows.push({ ngram, count, contextCount, probability, laplaceProb });
    }
    return rows;
  }, [currentModel]);

  const sortedTable = useMemo((): TableRow[] => {
    let data = tableFilter
      ? tableData.filter(r =>
          r.ngram.includes(tableFilter.toLowerCase().trim()),
        )
      : tableData;
    data = [...data].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'ngram') return dir * a.ngram.localeCompare(b.ngram);
      if (sortField === 'count') return dir * (a.count - b.count);
      return dir * (a.probability - b.probability);
    });
    return data;
  }, [tableData, sortField, sortDir, tableFilter]);

  // ── Test probability ───────────────────────────────────────────────────────

  const testTokens = useMemo(() => tokenize(testInput), [testInput]);

  const testMLE = useMemo((): number | null => {
    if (testTokens.length !== currentModel.n) return null;
    return ngramProbability(currentModel, testTokens);
  }, [testTokens, currentModel]);

  const testLaplace = useMemo((): number | null => {
    if (testTokens.length !== currentModel.n) return null;
    return laplaceSmoothedProbability(currentModel, testTokens);
  }, [testTokens, currentModel]);

  // Custom two-way interpolation controlled by lambda slider
  const testInterp = useMemo((): number | null => {
    if (selectedN === 1) return null;
    const last = testTokens[testTokens.length - 1];
    if (!last) return null;
    if (selectedN === 2 && testTokens.length >= 2) {
      const slice2 = testTokens.slice(-2);
      const pHigh = ngramProbability(model2, slice2);
      const pLow = ngramProbability(model1, [slice2[1]!]);
      return lambda * pHigh + (1 - lambda) * pLow;
    }
    if (selectedN === 3 && testTokens.length >= 3) {
      const slice3 = testTokens.slice(-3);
      const pHigh = ngramProbability(model3, slice3);
      const pLow = ngramProbability(model2, slice3.slice(-2));
      return lambda * pHigh + (1 - lambda) * pLow;
    }
    return null;
  }, [testTokens, selectedN, lambda, model1, model2, model3]);

  // Standard fixed-weight interpolation (AIMA §24.1)
  const testStdInterp = useMemo((): number | null => {
    if (testTokens.length < 3) return null;
    return linearInterpolationProbability(
      model1,
      model2,
      model3,
      testTokens.slice(-3),
    );
  }, [testTokens, model1, model2, model3]);

  const testProbMax = useMemo((): number => {
    const vals = [testMLE, testLaplace, testInterp, testStdInterp].filter(
      (v): v is number => v !== null,
    );
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [testMLE, testLaplace, testInterp, testStdInterp]);

  // ── Sentence probability ───────────────────────────────────────────────────

  const sentenceTokens = useMemo(
    () => tokenize(sentenceInput),
    [sentenceInput],
  );

  const sentProb = useMemo((): number | null => {
    if (sentenceTokens.length === 0) return null;
    if (currentModel.n > sentenceTokens.length) return null;
    return sentenceProbability(currentModel, sentenceTokens);
  }, [currentModel, sentenceTokens]);

  const sentProbSmoothed = useMemo((): number | null => {
    if (sentenceTokens.length === 0) return null;
    if (currentModel.n > sentenceTokens.length) return null;
    return sentenceProbability(currentModel, sentenceTokens, true);
  }, [currentModel, sentenceTokens]);

  const sentBreakdown = useMemo((): Array<{
    ngram: string[];
    mle: number;
    laplace: number;
  }> => {
    if (sentenceTokens.length === 0 || currentModel.n > sentenceTokens.length)
      return [];
    const items: Array<{ ngram: string[]; mle: number; laplace: number }> = [];
    if (currentModel.n === 1) {
      for (const t of sentenceTokens) {
        items.push({
          ngram: [t],
          mle: ngramProbability(currentModel, [t]),
          laplace: laplaceSmoothedProbability(currentModel, [t]),
        });
      }
    } else {
      for (let i = 0; i <= sentenceTokens.length - currentModel.n; i++) {
        const gram = sentenceTokens.slice(i, i + currentModel.n);
        items.push({
          ngram: gram,
          mle: ngramProbability(currentModel, gram),
          laplace: laplaceSmoothedProbability(currentModel, gram),
        });
      }
    }
    return items;
  }, [sentenceTokens, currentModel]);

  // Construct KaTeX formula for sentence chain rule
  const chainRuleLatex = useMemo((): string => {
    if (selectedN === 1) {
      return String.raw`P(w_1 \cdots w_m) = \prod_{i=1}^{m} P(w_i)`;
    }
    if (selectedN === 2) {
      return String.raw`P(w_1 \cdots w_m) \approx \prod_{i=2}^{m} P(w_i \mid w_{i-1})`;
    }
    return String.raw`P(w_1 \cdots w_m) \approx \prod_{i=3}^{m} P(w_i \mid w_{i-2},\, w_{i-1})`;
  }, [selectedN]);

  // ── Top-10 bigrams for comparison chart ────────────────────────────────────

  const top10Bigrams = useMemo((): Array<{
    ngram: string;
    count: number;
    mle: number;
    laplace: number;
  }> => {
    const items: Array<{
      ngram: string;
      count: number;
      mle: number;
      laplace: number;
    }> = [];
    for (const [ngram, count] of model2.counts.entries()) {
      const words = ngram.split(' ');
      items.push({
        ngram,
        count,
        mle: ngramProbability(model2, words),
        laplace: laplaceSmoothedProbability(model2, words),
      });
    }
    items.sort((a, b) => b.count - a.count || b.mle - a.mle);
    return items.slice(0, 10);
  }, [model2]);

  const maxChartProb = useMemo(
    () =>
      top10Bigrams.reduce(
        (acc, r) => Math.max(acc, r.mle, r.laplace),
        0.0001,
      ),
    [top10Bigrams],
  );

  // ── Bar chart animation ────────────────────────────────────────────────────

  const rafRef = useRef<number | null>(null);
  const animStartRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setBarAnimProgress(1);
      return;
    }
    setBarAnimProgress(0);
    animStartRef.current = 0;
    const duration = 600;

    const animate = (ts: number) => {
      if (animStartRef.current === 0) animStartRef.current = ts;
      const elapsed = ts - animStartRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out
      const eased = 1 - (1 - progress) * (1 - progress);
      setBarAnimProgress(eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [top10Bigrams, prefersReduced]);

  // ── What-if comparison ────────────────────────────────────────────────────

  const whatIfData = useMemo((): Array<{
    n: number;
    label: string;
    slice: string[];
    mle: number | null;
    laplace: number | null;
  }> => {
    const last = testTokens[testTokens.length - 1];
    if (!last) return [];
    const rows: Array<{
      n: number;
      label: string;
      slice: string[];
      mle: number | null;
      laplace: number | null;
    }> = [];
    for (const n of [1, 2, 3] as const) {
      const model = n === 1 ? model1 : n === 2 ? model2 : model3;
      const slice = testTokens.slice(Math.max(0, testTokens.length - n));
      const hasEnough = slice.length === n;
      rows.push({
        n,
        label: n === 1 ? 'Unigram' : n === 2 ? 'Bigram' : 'Trigram',
        slice,
        mle: hasEnough ? ngramProbability(model, slice) : null,
        laplace: hasEnough ? laplaceSmoothedProbability(model, slice) : null,
      });
    }
    return rows;
  }, [testTokens, model1, model2, model3]);

  // ── Sort handler ───────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  // ── MLE formula for test section ──────────────────────────────────────────

  const mleDenomLatex = useMemo((): string => {
    if (selectedN === 1)
      return String.raw`P_{\text{MLE}}(w) = \dfrac{C(w)}{N}`;
    const ctx =
      selectedN === 2
        ? String.raw`w_{n-1}`
        : String.raw`w_{n-2},\,w_{n-1}`;
    return String.raw`P_{\text{MLE}}(w_n \mid ${ctx}) = \dfrac{C(${ctx},\,w_n)}{C(${ctx})}`;
  }, [selectedN]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const sharedLabel: React.CSSProperties = {
    fontSize: '13px',
    color: '#9CA3AF',
    marginBottom: '6px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-1, #111118)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'white',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
  };

  const nLabels: Record<1 | 2 | 3, string> = {
    1: 'Unigram',
    2: 'Bigram',
    3: 'Trigram',
  };

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'white',
        maxWidth: '900px',
      }}
    >
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <SectionCard>
        <h2
          style={{
            fontSize: 'clamp(18px, 3vw, 22px)',
            fontWeight: 700,
            color: COLOR,
            margin: '0 0 10px',
          }}
        >
          §24.1 — N-gram Language Models
        </h2>
        <p
          style={{
            color: '#9CA3AF',
            lineHeight: 1.7,
            fontSize: '14px',
            margin: '0 0 14px',
          }}
        >
          An <strong style={{ color: '#E5E7EB' }}>n-gram language model</strong>{' '}
          estimates the probability of each word given the{' '}
          <InlineMath latex="n-1" /> preceding words, using the{' '}
          <strong style={{ color: '#E5E7EB' }}>Markov assumption</strong> that
          the history can be approximated by a short context window. Smoothing
          techniques (Laplace add-1, linear interpolation) avoid zero
          probabilities for unseen n-grams.
        </p>
        <MathBlock
          latex={String.raw`P(w_1,\ldots,w_m) \approx \prod_{i=1}^{m} P(w_i \mid w_{i-n+1},\ldots,w_{i-1})`}
        />
        <div
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}
        >
          {[
            { color: COLOR_MLE, label: 'MLE' },
            { color: COLOR_LAP, label: 'Laplace' },
            { color: '#EC4899', label: 'Interpolation' },
          ].map(({ color, label }) => (
            <span
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9CA3AF' }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* ── 2. Corpus editor ──────────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Training Corpus</SectionTitle>
        <label htmlFor="corpus-input" style={sharedLabel}>
          Edit the training text below. All characters are lowercased; non-letter
          characters are treated as word boundaries.
        </label>
        <textarea
          id="corpus-input"
          value={corpus}
          onChange={e => setCorpus(e.target.value)}
          aria-label="Training corpus text"
          rows={3}
          style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
        />
        <div
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}
        >
          <StatBadge label="Tokens" value={tokens.length} />
          <StatBadge label="Vocab |V|" value={vocabList.length} />
          <StatBadge label="Unique Bigrams" value={model2.counts.size} />
          <StatBadge label="Unique Trigrams" value={model3.counts.size} />
        </div>

        {/* Vocabulary display */}
        {vocabList.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', display: 'block' }}>
              Vocabulary ({vocabList.length} types):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {vocabList.map(w => (
                <span
                  key={w}
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    color: COLOR,
                    fontFamily: 'monospace',
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 3. Model Configuration ────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Model Order (n)</SectionTitle>
        <div
          style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}
          role="group"
          aria-label="Select n-gram order"
        >
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              onClick={() => setSelectedN(n)}
              aria-pressed={selectedN === n}
              aria-label={`Select ${nLabels[n]} model (n=${n})`}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: `1px solid ${selectedN === n ? COLOR : 'rgba(255,255,255,0.15)'}`,
                background: selectedN === n ? COLOR + '22' : 'transparent',
                color: selectedN === n ? COLOR : '#9CA3AF',
                fontWeight: selectedN === n ? 700 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              {nLabels[n]} (n={n})
            </button>
          ))}
        </div>

        <div
          style={{
            background: 'var(--surface-1, #111118)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            color: '#9CA3AF',
            lineHeight: 1.6,
          }}
        >
          {selectedN === 1 && (
            <>
              <strong style={{ color: '#E5E7EB' }}>Unigram model</strong> —
              treats each word independently.{' '}
              <InlineMath latex={String.raw`P(w) = C(w) / N`} /> — no context.
            </>
          )}
          {selectedN === 2 && (
            <>
              <strong style={{ color: '#E5E7EB' }}>Bigram model</strong> —
              conditions on 1 previous word.{' '}
              <InlineMath
                latex={String.raw`P(w_i \mid w_{i-1}) = C(w_{i-1},w_i) / C(w_{i-1})`}
              />
            </>
          )}
          {selectedN === 3 && (
            <>
              <strong style={{ color: '#E5E7EB' }}>Trigram model</strong> —
              conditions on 2 previous words.{' '}
              <InlineMath
                latex={String.raw`P(w_i \mid w_{i-2},w_{i-1}) = C(w_{i-2},w_{i-1},w_i) / C(w_{i-2},w_{i-1})`}
              />
            </>
          )}
          <div style={{ marginTop: '8px' }}>
            Unique {nLabels[selectedN].toLowerCase()}s:{' '}
            <strong style={{ color: COLOR }}>
              {currentModel.counts.size}
            </strong>{' '}
            | Context entries:{' '}
            <strong style={{ color: COLOR }}>
              {currentModel.contextCounts.size}
            </strong>
          </div>
        </div>
      </SectionCard>

      {/* ── 4. N-gram frequency table ──────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>
          {nLabels[selectedN]} Frequency Table ({currentModel.counts.size} entries)
        </SectionTitle>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="table-filter" style={sharedLabel}>
            Filter by n-gram:
          </label>
          <input
            id="table-filter"
            type="text"
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            placeholder="Type to filter…"
            aria-label="Filter n-grams"
            style={{ ...inputStyle, fontFamily: 'system-ui', maxWidth: '280px' }}
          />
        </div>

        {sortedTable.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            {tokens.length === 0
              ? 'Enter a corpus above to build the model.'
              : 'No n-grams match the filter.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div
              style={{ maxHeight: '320px', overflowY: 'auto', borderRadius: '8px' }}
              role="region"
              aria-label="N-gram frequency table"
            >
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}
                aria-label={`${nLabels[selectedN]} frequency table`}
              >
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'var(--surface-3, #242430)' }}>
                    <SortTh
                      field="ngram"
                      label="N-gram"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortTh
                      field="count"
                      label="C(n-gram)"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                      scope="col"
                    >
                      C(context)
                    </th>
                    <SortTh
                      field="probability"
                      label="P_MLE"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                      scope="col"
                    >
                      P_Laplace
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((row, idx) => (
                    <tr
                      key={row.ngram}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <td
                        style={{
                          padding: '7px 12px',
                          fontFamily: 'monospace',
                          color: '#E5E7EB',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.ngram}
                      </td>
                      <td
                        style={{
                          padding: '7px 12px',
                          color: COLOR,
                          fontWeight: 600,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.count}
                      </td>
                      <td
                        style={{
                          padding: '7px 12px',
                          color: '#9CA3AF',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.contextCount}
                      </td>
                      <td
                        style={{
                          padding: '7px 12px',
                          fontFamily: 'monospace',
                          color: COLOR_MLE,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.probability.toFixed(4)}
                      </td>
                      <td
                        style={{
                          padding: '7px 12px',
                          fontFamily: 'monospace',
                          color: COLOR_LAP,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {row.laplaceProb.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableFilter && (
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                Showing {sortedTable.length} of {tableData.length} n-grams
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── 5. Test Probability ───────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Test Probability</SectionTitle>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Type exactly <strong style={{ color: COLOR }}>{selectedN}</strong>{' '}
          space-separated word{selectedN > 1 ? 's' : ''} to look up their
          probability under the current {nLabels[selectedN].toLowerCase()} model.
        </p>

        <MathBlock latex={mleDenomLatex} />
        <MathBlock
          latex={String.raw`P_{\text{Lap}}(w_n \mid \text{ctx}) = \dfrac{C(\text{ctx}\,w_n) + 1}{C(\text{ctx}) + |\mathcal{V}|}`}
        />

        <label htmlFor="test-input" style={sharedLabel}>
          Test n-gram ({selectedN} word{selectedN > 1 ? 's' : ''}):
        </label>
        <input
          id="test-input"
          type="text"
          value={testInput}
          onChange={e => setTestInput(e.target.value)}
          placeholder={`Enter ${selectedN} word${selectedN > 1 ? 's' : ''}…`}
          aria-label={`Test n-gram input — enter ${selectedN} words`}
          style={{ ...inputStyle, maxWidth: '320px', marginBottom: '14px' }}
        />

        {testTokens.length !== currentModel.n && testInput.trim() !== '' && (
          <p
            style={{
              color: '#F59E0B',
              fontSize: '12px',
              marginBottom: '12px',
              fontStyle: 'italic',
            }}
            role="alert"
          >
            ⚠ Please enter exactly {currentModel.n} word
            {currentModel.n > 1 ? 's' : ''} (got {testTokens.length})
          </p>
        )}

        <div
          style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          <ProbRow
            label="MLE Probability"
            value={testMLE}
            max={testProbMax}
            color={COLOR_MLE}
            {...(testMLE === 0 ? { note: '0 — n-gram unseen in corpus' } : {})}
          />
          <ProbRow
            label="Laplace (Add-1)"
            value={testLaplace}
            max={testProbMax}
            color={COLOR_LAP}
            note={`Denom: C(ctx) + |V| = C + ${vocabList.length}`}
          />
          {testInterp !== null && (
            <ProbRow
              label={`Interpolated (λ=${lambda.toFixed(1)})`}
              value={testInterp}
              max={testProbMax}
              color="#EC4899"
              note={
                selectedN === 2
                  ? `λ·P_bigram + (1-λ)·P_unigram`
                  : `λ·P_trigram + (1-λ)·P_bigram`
              }
            />
          )}
          {testStdInterp !== null && (
            <ProbRow
              label="Std. Interpolation (fixed weights)"
              value={testStdInterp}
              max={testProbMax}
              color="#8B5CF6"
              note="0.70·P_tri + 0.20·P_bi + 0.10·P_uni (AIMA §24.1)"
            />
          )}
        </div>

        {/* Lambda slider */}
        {selectedN > 1 && (
          <div style={{ marginTop: '16px' }}>
            <label
              htmlFor="lambda-slider"
              style={{ ...sharedLabel, marginBottom: '4px' }}
            >
              Interpolation weight{' '}
              <InlineMath latex={String.raw`\lambda`} /> = {lambda.toFixed(2)}
            </label>
            <input
              id="lambda-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={lambda}
              onChange={e => setLambda(Number(e.target.value))}
              aria-label={`Lambda interpolation weight: ${lambda.toFixed(2)}`}
              style={{ accentColor: '#EC4899', width: '200px' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '200px',
                fontSize: '11px',
                color: '#6B7280',
                marginTop: '2px',
              }}
            >
              <span>0 (lower order)</span>
              <span>1 (higher order)</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 6. Sentence Probability ───────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Sentence Probability</SectionTitle>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Enter a sentence and see its probability under the{' '}
          {nLabels[selectedN].toLowerCase()} model using the chain rule.
        </p>

        <MathBlock latex={chainRuleLatex} />

        <label htmlFor="sentence-input" style={sharedLabel}>
          Test sentence:
        </label>
        <input
          id="sentence-input"
          type="text"
          value={sentenceInput}
          onChange={e => setSentenceInput(e.target.value)}
          placeholder="Type a sentence…"
          aria-label="Test sentence input"
          style={{ ...inputStyle, maxWidth: '480px', marginBottom: '14px' }}
        />

        {sentenceTokens.length > 0 && currentModel.n > sentenceTokens.length ? (
          <p style={{ color: '#F59E0B', fontSize: '13px', fontStyle: 'italic' }} role="alert">
            ⚠ Sentence needs at least {currentModel.n} tokens for{' '}
            {nLabels[selectedN].toLowerCase()} model.
          </p>
        ) : sentBreakdown.length > 0 ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  background: 'var(--surface-1, #111118)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  P_MLE (sentence)
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: sentProb === 0 ? '#EF4444' : COLOR_MLE,
                  }}
                >
                  {sentProb === null
                    ? 'N/A'
                    : sentProb === 0
                    ? '0 (unseen n-gram)'
                    : sentProb.toExponential(4)}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--surface-1, #111118)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  P_Laplace (sentence)
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: COLOR_LAP,
                  }}
                >
                  {sentProbSmoothed === null
                    ? 'N/A'
                    : sentProbSmoothed.toExponential(4)}
                </div>
              </div>
            </div>

            {/* Per-factor breakdown table */}
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '360px' }}
                aria-label="Sentence probability factor breakdown"
              >
                <thead>
                  <tr style={{ background: 'var(--surface-3, #242430)' }}>
                    <th
                      style={{
                        padding: '7px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                      scope="col"
                    >
                      Factor
                    </th>
                    <th
                      style={{
                        padding: '7px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                      scope="col"
                    >
                      P_MLE
                    </th>
                    <th
                      style={{
                        padding: '7px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                      scope="col"
                    >
                      P_Laplace
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sentBreakdown.map((item, i) => {
                    const word = item.ngram[item.ngram.length - 1] ?? '';
                    const ctx = item.ngram.slice(0, -1);
                    const factorLabel =
                      ctx.length === 0
                        ? `P(${word})`
                        : `P(${word} | ${ctx.join(' ')})`;
                    return (
                      <tr
                        key={i}
                        style={{
                          background:
                            i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <td
                          style={{
                            padding: '6px 12px',
                            fontFamily: 'monospace',
                            color: '#E5E7EB',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          {factorLabel}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            fontFamily: 'monospace',
                            color: item.mle === 0 ? '#EF4444' : COLOR_MLE,
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          {item.mle.toFixed(4)}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            fontFamily: 'monospace',
                            color: COLOR_LAP,
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          {item.laplace.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          sentenceTokens.length === 0 && (
            <p style={{ color: '#6B7280', fontSize: '14px' }}>
              Enter a sentence to see the probability breakdown.
            </p>
          )
        )}
      </SectionCard>

      {/* ── 7. Smoothing Comparison chart ─────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Smoothing Comparison — Top 10 Bigrams</SectionTitle>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          MLE assigns zero to unseen bigrams; Laplace add-1 spreads probability
          mass across the vocabulary, shrinking estimates for frequent bigrams
          but boosting unseen ones.
        </p>

        {top10Bigrams.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Enter a corpus with at least 2 tokens to see the comparison.
          </p>
        ) : (
          <>
            {/* Legend */}
            <div
              style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}
              role="list"
              aria-label="Chart legend"
            >
              {[
                { color: COLOR_MLE, label: 'MLE probability' },
                { color: COLOR_LAP, label: 'Laplace probability' },
              ].map(({ color, label }) => (
                <span
                  key={label}
                  role="listitem"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}
                >
                  <span
                    style={{ width: '14px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }}
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>

            <svg
              viewBox="0 0 580 320"
              style={{ width: '100%', display: 'block' }}
              role="img"
              aria-label="Horizontal bar chart comparing MLE and Laplace-smoothed bigram probabilities"
            >
              {/* Axis */}
              <line
                x1={130}
                y1={10}
                x2={130}
                y2={290}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />
              <line
                x1={130}
                y1={290}
                x2={560}
                y2={290}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />

              {/* X-axis ticks */}
              {[0, 0.25, 0.5, 0.75, 1.0].map(frac => {
                const x = 130 + frac * 430;
                const prob = frac * maxChartProb;
                return (
                  <g key={frac}>
                    <line
                      x1={x}
                      y1={288}
                      x2={x}
                      y2={292}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={305}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#6B7280"
                    >
                      {prob.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {top10Bigrams.map((item, i) => {
                const rowY = 12 + i * 28;
                const mleW = (item.mle / maxChartProb) * 430 * barAnimProgress;
                const lapW = (item.laplace / maxChartProb) * 430 * barAnimProgress;
                return (
                  <g key={item.ngram}>
                    {/* Label */}
                    <text
                      x={125}
                      y={rowY + 9}
                      textAnchor="end"
                      fontSize="10"
                      fill="#9CA3AF"
                      fontFamily="monospace"
                    >
                      {item.ngram.length > CHART_LABEL_MAX
                        ? item.ngram.slice(0, CHART_LABEL_TRUNCATE) + '…'
                        : item.ngram}
                    </text>

                    {/* MLE bar */}
                    <rect
                      x={130}
                      y={rowY}
                      width={Math.max(0, mleW)}
                      height={11}
                      rx={2}
                      fill={COLOR_MLE}
                      opacity={0.85}
                      aria-label={`${item.ngram} MLE: ${item.mle.toFixed(4)}`}
                    />

                    {/* Laplace bar */}
                    <rect
                      x={130}
                      y={rowY + 13}
                      width={Math.max(0, lapW)}
                      height={11}
                      rx={2}
                      fill={COLOR_LAP}
                      opacity={0.85}
                      aria-label={`${item.ngram} Laplace: ${item.laplace.toFixed(4)}`}
                    />

                    {/* Value label (MLE) */}
                    {mleW > 30 && (
                      <text
                        x={130 + mleW - 3}
                        y={rowY + 8}
                        textAnchor="end"
                        fontSize="8"
                        fill="white"
                        opacity={0.8}
                      >
                        {item.mle.toFixed(3)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* X axis label */}
              <text
                x={345}
                y={318}
                textAnchor="middle"
                fontSize="10"
                fill="#6B7280"
              >
                Probability
              </text>
            </svg>
          </>
        )}
      </SectionCard>

      {/* ── 8. What-if comparison ─────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>What-If: Probability Across Model Orders</SectionTitle>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Using the same test words from the Test Probability section, compare
          how the probability changes as we add more context (n=1→3). More
          context can sharpen predictions but increases sparsity.
        </p>

        {testTokens.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Enter words in the Test Probability section above.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '400px' }}
              aria-label="Probability comparison across n-gram model orders"
            >
              <thead>
                <tr style={{ background: 'var(--surface-3, #242430)' }}>
                  {['Model', 'Input Tokens', 'P_MLE', 'P_Laplace', 'Note'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                      scope="col"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {whatIfData.map(row => (
                  <tr
                    key={row.n}
                    style={{
                      background:
                        row.n === selectedN
                          ? 'rgba(245,158,11,0.06)'
                          : 'transparent',
                      border:
                        row.n === selectedN
                          ? `1px solid rgba(245,158,11,0.2)`
                          : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '8px 12px',
                        color: row.n === selectedN ? COLOR : '#E5E7EB',
                        fontWeight: row.n === selectedN ? 700 : 400,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {row.label} {row.n === selectedN && '←'}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        color: '#9CA3AF',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      [{row.slice.join(', ')}]
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        color:
                          row.mle === null
                            ? '#4B5563'
                            : row.mle === 0
                            ? '#EF4444'
                            : COLOR_MLE,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {row.mle === null
                        ? 'N/A'
                        : row.mle === 0
                        ? '0'
                        : row.mle.toFixed(4)}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        color: row.laplace === null ? '#4B5563' : COLOR_LAP,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {row.laplace === null ? 'N/A' : row.laplace.toFixed(4)}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#6B7280',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {row.mle === 0
                        ? '⚠ zero (data sparsity)'
                        : row.slice.length < row.n
                        ? '⚠ insufficient context'
                        : row.n === 1
                        ? 'No context — uniform-ish'
                        : row.n === 2
                        ? '1-word context'
                        : '2-word context'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {testTokens.length > 0 && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px',
              background: 'var(--surface-1, #111118)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#9CA3AF',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#E5E7EB' }}>Key insight:</strong> Moving
            from unigrams to trigrams can dramatically sharpen (or zero-out)
            probabilities. Laplace smoothing always gives a non-zero estimate,
            making it safer for downstream tasks like sentence scoring.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
