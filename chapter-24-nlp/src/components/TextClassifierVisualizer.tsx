import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  trainNaiveBayes,
  classifyText,
  type NaiveBayesModel,
  type LabeledDocument,
} from '../algorithms/index';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR = '#F59E0B';

const INITIAL_CORPUS: LabeledDocument[] = [
  { label: 'positive', text: 'the cave is amazing wonderful treasure gold exciting adventure' },
  { label: 'positive', text: 'i love the gold treasure exciting wonderful' },
  { label: 'positive', text: 'amazing adventure great path beautiful' },
  { label: 'positive', text: 'brilliant discovery shining treasure thrilling journey' },
  { label: 'positive', text: 'fantastic reward glorious victory brave hero wonderful quest' },
  { label: 'positive', text: 'joyful cheerful bright lovely peaceful safe magical' },
  { label: 'negative', text: 'the wumpus is terrible dangerous scary dark pit' },
  { label: 'negative', text: 'i hate the pit dark horrible dangerous wumpus' },
  { label: 'negative', text: 'terrible scary dark cave dangerous horrible' },
  { label: 'negative', text: 'dreadful gloomy miserable wumpus deadly trap awful' },
  { label: 'negative', text: 'frightening monster lethal poison foul stench pit deadly' },
  { label: 'negative', text: 'grim murky bleak painful wretched horrible failure' },
];

const LABEL_COLORS: Record<string, string> = {
  positive: '#10B981',
  negative: '#EC4899',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassStep {
  label: string;
  logPrior: number;
  wordContributions: Array<{ word: string; logLikelihood: number }>;
  totalScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
}

function computeClassSteps(
  model: NaiveBayesModel,
  text: string,
): ClassStep[] {
  const words = tokenize(text);
  return model.labels.map(label => {
    const logPrior = model.logPriors.get(label) ?? 0;
    const llMap = model.logLikelihoods.get(label);
    const contribs = words
      .filter(w => model.vocabulary.has(w))
      .map(w => ({
        word: w,
        logLikelihood: llMap?.get(w) ?? 0,
      }));
    const totalScore = logPrior + contribs.reduce((s, c) => s + c.logLikelihood, 0);
    return { label, logPrior, wordContributions: contribs, totalScore };
  });
}

// Top N words by logLikelihood for each class, relative to other classes
function topWordsForLabel(
  model: NaiveBayesModel,
  label: string,
  n = 10,
): Array<{ word: string; score: number }> {
  if (!model.logLikelihoods.has(label)) return [];
  const myMap = model.logLikelihoods.get(label)!;
  const otherLabels = model.labels.filter(l => l !== label);

  const scored: Array<{ word: string; score: number }> = [];
  for (const [word, myLL] of myMap) {
    const avgOther =
      otherLabels.length > 0
        ? otherLabels.reduce((sum, ol) => {
            const v = model.logLikelihoods.get(ol)?.get(word) ?? myLL;
            return sum + v;
          }, 0) / otherLabels.length
        : 0;
    scored.push({ word, score: myLL - avgOther });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#1A1A24',
        border: '1px solid rgba(255,255,255,0.08)',
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

// Score bar chart
function ScoreBarChart({
  steps,
  highlightLabel,
}: {
  steps: ClassStep[];
  highlightLabel: string | null;
}) {
  if (steps.length === 0) return null;

  const minScore = Math.min(...steps.map(s => s.totalScore));
  const maxScore = Math.max(...steps.map(s => s.totalScore));
  const range = maxScore - minScore || 1;
  const BAR_MAX_W = 260;

  return (
    <svg
      width="100%"
      viewBox={`0 0 400 ${steps.length * 48 + 20}`}
      aria-label="Classification scores bar chart"
      role="img"
      style={{ display: 'block', maxWidth: '420px' }}
    >
      {steps.map((s, i) => {
        const barW = ((s.totalScore - minScore) / range) * BAR_MAX_W;
        const color = LABEL_COLORS[s.label] ?? COLOR;
        const isWinner = s.label === highlightLabel;
        const y = i * 48 + 10;
        return (
          <g key={s.label}>
            <text x={0} y={y + 16} fill={color} fontSize={13} fontWeight={isWinner ? 700 : 500}>
              {s.label}
            </text>
            <rect
              x={90}
              y={y}
              width={Math.max(barW, 2)}
              height={28}
              rx={5}
              fill={color}
              fillOpacity={isWinner ? 0.85 : 0.35}
              stroke={isWinner ? color : 'transparent'}
              strokeWidth={isWinner ? 1.5 : 0}
            />
            <text
              x={96 + Math.max(barW, 2)}
              y={y + 18}
              fill={isWinner ? color : '#9CA3AF'}
              fontSize={11}
              fontWeight={isWinner ? 700 : 400}
            >
              {s.totalScore.toFixed(2)}
              {isWinner ? ' ★' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Word importance bar chart
function WordImportanceBars({
  words,
  color,
}: {
  words: Array<{ word: string; score: number }>;
  color: string;
}) {
  if (words.length === 0) return null;
  const maxScore = Math.max(...words.map(w => Math.abs(w.score)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {words.map(({ word, score }) => {
        const pct = (Math.abs(score) / (maxScore || 1)) * 100;
        return (
          <div
            key={word}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                minWidth: '80px',
                fontSize: '12px',
                color: '#D1D5DB',
                textAlign: 'right',
              }}
            >
              {word}
            </span>
            <div
              style={{
                flex: 1,
                height: '10px',
                background: '#111118',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '42px' }}>
              {score.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TextClassifierVisualizer() {
  const [corpus, setCorpus] = useState<LabeledDocument[]>(INITIAL_CORPUS);
  const [inputText, setInputText] = useState('amazing treasure adventure');
  const [newDocText, setNewDocText] = useState('');
  const [newDocLabel, setNewDocLabel] = useState('positive');

  // Playback state: which step is currently revealed
  // Steps: 0 = priors, 1..N = word contribution for word[i-1], N+1 = total shown
  const [playStep, setPlayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const model = useMemo(() => trainNaiveBayes(corpus), [corpus]);

  const classSteps = useMemo(
    () => computeClassSteps(model, inputText),
    [model, inputText],
  );

  const inputWords = useMemo(
    () => tokenize(inputText).filter(w => model.vocabulary.has(w)),
    [inputText, model],
  );

  // Total animation steps = 1 (priors) + N words + 1 (final)
  const totalPlaySteps = inputWords.length + 2;

  const predictedLabel = useMemo(() => classifyText(model, inputText), [model, inputText]);

  // Build partial steps for current playStep
  const partialSteps: ClassStep[] = useMemo(() => {
    if (playStep === 0) return [];
    return classSteps.map(s => {
      if (playStep === 1) {
        // Only prior shown
        return {
          ...s,
          wordContributions: [],
          totalScore: s.logPrior,
        };
      }
      const revealedContribs = s.wordContributions.slice(
        0,
        Math.min(playStep - 1, s.wordContributions.length),
      );
      const totalScore =
        s.logPrior + revealedContribs.reduce((sum, c) => sum + c.logLikelihood, 0);
      return { ...s, wordContributions: revealedContribs, totalScore };
    });
  }, [classSteps, playStep]);

  const displaySteps = playStep >= totalPlaySteps - 1 ? classSteps : partialSteps;
  const winner =
    playStep >= totalPlaySteps - 1
      ? predictedLabel
      : displaySteps.length > 0
        ? displaySteps.reduce((best, s) => (s.totalScore > best.totalScore ? s : best)).label
        : null;

  // Animation
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (prefersReducedMotion) {
      setPlayStep(totalPlaySteps - 1);
      setIsPlaying(false);
      return;
    }

    const interval = 1200 / speed;

    const tick = (ts: number) => {
      if (ts - lastTimeRef.current >= interval) {
        lastTimeRef.current = ts;
        setPlayStep(prev => {
          const next = prev + 1;
          if (next >= totalPlaySteps - 1) {
            stopAnimation();
            return totalPlaySteps - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, totalPlaySteps, prefersReducedMotion, stopAnimation]);

  // Reset playback when input changes
  useEffect(() => {
    setPlayStep(0);
    setIsPlaying(false);
  }, [inputText, corpus]);

  const handlePlay = () => {
    if (playStep >= totalPlaySteps - 1) setPlayStep(0);
    lastTimeRef.current = 0;
    setIsPlaying(true);
  };

  const handlePause = () => stopAnimation();
  const handleStep = () => setPlayStep(p => Math.min(p + 1, totalPlaySteps - 1));
  const handleReset = () => { stopAnimation(); setPlayStep(0); };

  const handleAddDoc = () => {
    const t = newDocText.trim();
    if (!t) return;
    setCorpus(prev => [...prev, { text: t, label: newDocLabel }]);
    setNewDocText('');
  };

  const topWordsByLabel = useMemo(
    () =>
      model.labels.reduce<Record<string, Array<{ word: string; score: number }>>>(
        (acc, label) => {
          acc[label] = topWordsForLabel(model, label, 10);
          return acc;
        },
        {},
      ),
    [model],
  );

  // Current step label
  const stepLabel =
    playStep === 0
      ? 'Press Play or Step to start'
      : playStep === 1
        ? 'Step 1: Apply log priors log P(c)'
        : playStep >= totalPlaySteps - 1
          ? `Done — predicted: ${predictedLabel}`
          : `Step ${playStep}: Adding log P("${inputWords[playStep - 2] ?? ''}" | c)`;

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', color: '#E5E7EB' }}>
      {/* Header */}
      <Card>
        <h2
          style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 700,
            color: COLOR,
            marginTop: 0,
            marginBottom: '8px',
          }}
        >
          Naive Bayes Text Classifier
        </h2>
        <p style={{ color: '#9CA3AF', lineHeight: 1.6, marginBottom: '12px' }}>
          A <strong style={{ color: '#E5E7EB' }}>bag-of-words</strong> classifier
          that applies Bayes' rule, treating each word as an independent feature.
          For each class <InlineMath latex="c" /> it computes the log-score{' '}
          <InlineMath latex="\log P(c) + \sum_w \log P(w \mid c)" /> and picks the
          highest. Laplace (add-1) smoothing ensures unseen words don't zero out the
          score.
        </p>
        <MathBlock
          latex={
            'P(c \\mid d) \\propto P(c) \\cdot \\prod_{w \\in d} P(w \\mid c)'
          }
        />
      </Card>

      {/* Classification input */}
      <Card>
        <SectionTitle>Classify a Sentence</SectionTitle>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            aria-label="Text to classify"
            placeholder="Type words to classify…"
            style={{
              flex: 1,
              minWidth: '200px',
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#E5E7EB',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            'amazing treasure adventure',
            'wumpus dark pit dangerous',
            'great wonderful journey',
            'horrible scary deadly trap',
          ].map(preset => (
            <button
              key={preset}
              onClick={() => setInputText(preset)}
              aria-label={`Use preset: ${preset}`}
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#9CA3AF',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </Card>

      {/* Playback Controls */}
      <Card>
        <SectionTitle>Step-by-step Computation</SectionTitle>
        <div
          style={{
            background: '#111118',
            border: `1px solid ${COLOR}33`,
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '13px',
            color: playStep >= totalPlaySteps - 1 ? COLOR : '#D1D5DB',
            fontWeight: playStep >= totalPlaySteps - 1 ? 700 : 400,
          }}
          aria-live="polite"
          aria-label="Current computation step"
        >
          {stepLabel}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            aria-label={isPlaying ? 'Pause computation' : 'Play computation step by step'}
            style={ctrlBtn(COLOR, isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleStep}
            disabled={playStep >= totalPlaySteps - 1}
            aria-label="Step forward"
            style={ctrlBtn('#6366F1', false, playStep >= totalPlaySteps - 1)}
          >
            ⏭ Step
          </button>
          <button
            onClick={handleReset}
            aria-label="Reset computation"
            style={ctrlBtn('#EC4899', false)}
          >
            ↺ Reset
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label
            htmlFor="nb-speed"
            style={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap' }}
          >
            Speed:
          </label>
          <input
            id="nb-speed"
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '120px', accentColor: COLOR }}
          />
          <span style={{ fontSize: '13px', color: '#D1D5DB', minWidth: 36 }}>
            {speed}×
          </span>
          <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: 8 }}>
            {playStep} / {totalPlaySteps - 1}
          </span>
        </div>
      </Card>

      {/* Score visualization */}
      {displaySteps.length > 0 && (
        <Card>
          <SectionTitle>Class Scores</SectionTitle>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <ScoreBarChart steps={displaySteps} highlightLabel={winner} />
            <div style={{ flex: 1, minWidth: '200px' }}>
              {displaySteps.map(s => (
                <div
                  key={s.label}
                  style={{
                    marginBottom: '12px',
                    background: '#111118',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    border: `1px solid ${(LABEL_COLORS[s.label] ?? COLOR) + '33'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        color: LABEL_COLORS[s.label] ?? COLOR,
                      }}
                    >
                      {s.label} {s.label === winner ? '★' : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      score: {s.totalScore.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: 4 }}>
                    log prior: {s.logPrior.toFixed(3)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {s.wordContributions.map(({ word, logLikelihood }) => {
                      const baseLL = classSteps
                        .find(cs => cs.label !== s.label)
                        ?.wordContributions.find(wc => wc.word === word)?.logLikelihood;
                      const isGood =
                        baseLL !== undefined
                          ? logLikelihood > baseLL
                          : logLikelihood > -3;
                      return (
                        <span
                          key={word}
                          title={`log P("${word}" | ${s.label}) = ${logLikelihood.toFixed(3)}`}
                          style={{
                            background: isGood
                              ? `${LABEL_COLORS[s.label] ?? COLOR}22`
                              : '#2A2A34',
                            border: `1px solid ${isGood ? (LABEL_COLORS[s.label] ?? COLOR) + '44' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            color: isGood ? '#E5E7EB' : '#6B7280',
                          }}
                        >
                          {word} ({logLikelihood.toFixed(2)})
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Result banner */}
      {playStep >= totalPlaySteps - 1 && (
        <Card
          style={{
            borderColor: `${LABEL_COLORS[predictedLabel] ?? COLOR}55`,
            background: `${LABEL_COLORS[predictedLabel] ?? COLOR}11`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '28px' }}>
              {predictedLabel === 'positive' ? '😊' : '☠️'}
            </span>
            <div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: 4 }}>
                Predicted label
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: LABEL_COLORS[predictedLabel] ?? COLOR,
                }}
              >
                {predictedLabel.toUpperCase()}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              {classSteps.map(s => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: LABEL_COLORS[s.label] ?? '#9CA3AF' }}>
                    {s.label}
                  </span>
                  <span style={{ color: '#D1D5DB' }}>{s.totalScore.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Word importance */}
      <Card>
        <SectionTitle>Top-10 Discriminative Words per Class</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {model.labels.map(label => (
            <div key={label}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: LABEL_COLORS[label] ?? COLOR,
                  marginBottom: '8px',
                }}
              >
                {label}
              </div>
              <WordImportanceBars
                words={topWordsByLabel[label] ?? []}
                color={LABEL_COLORS[label] ?? COLOR}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* "What if" — add training doc */}
      <Card>
        <SectionTitle>"What If" — Add Training Document</SectionTitle>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px', marginTop: 0 }}>
          Add a new labeled document to see how the classifier adapts.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input
            type="text"
            value={newDocText}
            onChange={e => setNewDocText(e.target.value)}
            placeholder="Enter training text…"
            aria-label="New training document text"
            style={{
              flex: 1,
              minWidth: '180px',
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#E5E7EB',
              fontSize: '14px',
              outline: 'none',
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleAddDoc(); }}
          />
          <select
            value={newDocLabel}
            onChange={e => setNewDocLabel(e.target.value)}
            aria-label="Label for new training document"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: LABEL_COLORS[newDocLabel] ?? '#E5E7EB',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {model.labels.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={handleAddDoc}
            disabled={!newDocText.trim()}
            aria-label="Add new training document"
            style={ctrlBtn(COLOR, false, !newDocText.trim())}
          >
            + Add
          </button>
        </div>
        {/* Corpus summary */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {model.labels.map(label => {
            const count = corpus.filter(d => d.label === label).length;
            return (
              <div
                key={label}
                style={{
                  background: '#111118',
                  border: `1px solid ${(LABEL_COLORS[label] ?? COLOR) + '33'}`,
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  color: LABEL_COLORS[label] ?? COLOR,
                  fontWeight: 600,
                }}
              >
                {label}: {count} doc{count !== 1 ? 's' : ''}
              </div>
            );
          })}
          <div
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              color: '#9CA3AF',
            }}
          >
            Vocabulary: {model.vocabulary.size} words
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function ctrlBtn(
  color: string,
  active: boolean,
  disabled = false,
): React.CSSProperties {
  return {
    background: active ? `${color}33` : '#111118',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : color + '66'}`,
    borderRadius: '8px',
    padding: '8px 16px',
    color: disabled ? '#4B5563' : active ? color : '#E5E7EB',
    fontSize: '14px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
}
