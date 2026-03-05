import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  buildE0Grammar,
  cykParse,
  type CYKStep,
  type ParseTree,
} from '../algorithms/index';
import { renderInlineMath } from '../utils/mathUtils';

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT = '#F59E0B';
const SURFACE_1 = '#111118';
const SURFACE_2 = '#1A1A24';
const SURFACE_3 = '#242430';
const BORDER = 'rgba(255,255,255,0.08)';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_SENTENCES: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'the wumpus is dead', value: 'the wumpus is dead' },
  { label: 'i see the wumpus', value: 'i see the wumpus' },
  { label: 'it smells', value: 'it smells' },
  { label: 'the hunter grab the gold', value: 'the hunter grab the gold' },
  { label: 'xyz abc (no parse)', value: 'xyz abc' },
];

const SPEED_OPTIONS: ReadonlyArray<{ label: string; ms: number }> = [
  { label: '1×', ms: 800 },
  { label: '2×', ms: 400 },
  { label: '4×', ms: 200 },
];

// Non-terminal color coding
const SYMBOL_COLORS: Readonly<Record<string, string>> = {
  S: '#10B981',
  NP: ACCENT,
  VP: '#6366F1',
  PP: '#EC4899',
  RC: '#8B5CF6',
  ConjS: '#3B82F6',
};

function symbolColor(sym: string): string {
  return SYMBOL_COLORS[sym] ?? '#9CA3AF';
}

// ─── Shared button style ──────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  padding: '6px 10px',
  background: SURFACE_3,
  color: '#E5E7EB',
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1,
};

// ─── Parse tree layout ────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  symbol: string;
  word?: string;
}

interface LayoutLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LEAF_W = 68;
const LEVEL_H = 70;

function countLeaves(tree: ParseTree): number {
  if (tree.word !== undefined) return 1;
  const l = tree.left ? countLeaves(tree.left) : 0;
  const r = tree.right ? countLeaves(tree.right) : 0;
  return Math.max(l + r, 1);
}

function layoutTreeNode(
  tree: ParseTree,
  left: number,
  width: number,
  depth: number,
  nodes: LayoutNode[],
  links: LayoutLink[],
  id: string,
  parentX?: number,
  parentY?: number,
): void {
  const x = left + width / 2;
  const y = depth * LEVEL_H + 36;
  const layoutNode: LayoutNode = { id, x, y, symbol: tree.symbol };
  if (tree.word !== undefined) layoutNode.word = tree.word;
  nodes.push(layoutNode);
  if (parentX !== undefined && parentY !== undefined) {
    links.push({ x1: parentX, y1: parentY, x2: x, y2: y });
  }
  const total = countLeaves(tree);
  let cx = left;
  if (tree.left) {
    const lLeaves = countLeaves(tree.left);
    const lW = (lLeaves / total) * width;
    layoutTreeNode(tree.left, cx, lW, depth + 1, nodes, links, id + 'L', x, y);
    cx += lW;
  }
  if (tree.right) {
    const rLeaves = countLeaves(tree.right);
    const rW = (rLeaves / total) * width;
    layoutTreeNode(tree.right, cx, rW, depth + 1, nodes, links, id + 'R', x, y);
  }
}

function computeTreeLayout(
  tree: ParseTree,
): { nodes: LayoutNode[]; links: LayoutLink[]; width: number; height: number } {
  const leaves = countLeaves(tree);
  const width = Math.max(leaves * LEAF_W, 300);
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  layoutTreeNode(tree, 0, width, 0, nodes, links, '0');
  const maxY = nodes.reduce((m, nd) => Math.max(m, nd.y), 0);
  return { nodes, links, width, height: maxY + 56 };
}

// ─── CYK Table sub-component ─────────────────────────────────────────────────

interface CYKTableProps {
  n: number;
  words: ReadonlyArray<string>;
  visibleCells: ReadonlyMap<string, ReadonlyArray<{ symbol: string; probability: number }>>;
  activeStep: CYKStep | undefined;
}

function CYKTable({ n, words, visibleCells, activeStep }: CYKTableProps): JSX.Element {
  const CELL_W = Math.max(60, Math.min(84, Math.floor(420 / n)));
  const CELL_H = 72;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{ borderCollapse: 'separate', borderSpacing: '3px', fontSize: '11px' }}
        role="grid"
        aria-label="CYK parse chart"
      >
        <thead>
          <tr>
            {/* corner cell */}
            <th style={{ width: '44px' }} aria-hidden="true" />
            {Array.from({ length: n }, (_, colIdx) => {
              const j = colIdx + 1;
              return (
                <th
                  key={j}
                  scope="col"
                  style={{
                    width: `${CELL_W}px`,
                    padding: '2px 4px',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontWeight: 500,
                    fontSize: '11px',
                    borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{j}</span>
                  <span style={{ display: 'block', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {words[colIdx]}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, rowIdx) => {
            const i = rowIdx + 1;
            return (
              <tr key={i}>
                <th
                  scope="row"
                  style={{
                    padding: '2px 6px',
                    textAlign: 'right',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    verticalAlign: 'middle',
                    borderRight: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{i}</span>
                  <span style={{ display: 'block', maxWidth: '40px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px' }}>
                    {words[rowIdx]}
                  </span>
                </th>

                {Array.from({ length: n }, (_, colIdx) => {
                  const j = colIdx + 1;
                  const isUpperTriangle = j >= i;
                  const cellKey = `${i},${j}`;
                  const entries = visibleCells.get(cellKey) ?? [];
                  const isActive = activeStep !== undefined && activeStep.i === i && activeStep.j === j;
                  const isVisited = entries.length > 0;

                  return (
                    <td
                      key={j}
                      aria-label={
                        isUpperTriangle
                          ? `Span [${i},${j}]: ${entries.length > 0 ? entries.map(e => e.symbol).join(', ') : 'empty'}`
                          : undefined
                      }
                      style={{
                        width: `${CELL_W}px`,
                        height: `${CELL_H}px`,
                        padding: '4px',
                        verticalAlign: 'top',
                        background: !isUpperTriangle
                          ? `${SURFACE_3}50`
                          : isActive
                            ? `${ACCENT}18`
                            : isVisited
                              ? `${SURFACE_2}cc`
                              : `${SURFACE_1}80`,
                        border: isActive
                          ? `1.5px solid ${ACCENT}70`
                          : isVisited
                            ? `1px solid rgba(255,255,255,0.12)`
                            : `1px solid ${BORDER}`,
                        borderRadius: '6px',
                        opacity: !isUpperTriangle ? 0.25 : 1,
                        overflow: 'hidden',
                        transition: 'background 0.2s, border-color 0.2s',
                        boxShadow: isActive ? `0 0 8px ${ACCENT}20` : 'none',
                      }}
                    >
                      {isUpperTriangle &&
                        entries.slice(0, 4).map((entry, k) => (
                          <div
                            key={k}
                            style={{
                              marginBottom: '1px',
                              color: symbolColor(entry.symbol),
                              fontWeight: entry.symbol === 'S' ? 700 : 500,
                              fontSize: '10px',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.symbol}
                            <span style={{ color: '#4B5563', marginLeft: '2px', fontSize: '9px' }}>
                              {entry.probability < 0.001
                                ? entry.probability.toExponential(1)
                                : entry.probability.toPrecision(3)}
                            </span>
                          </div>
                        ))}
                      {isUpperTriangle && entries.length > 4 && (
                        <div style={{ color: '#4B5563', fontSize: '9px' }}>
                          +{entries.length - 4}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Parse tree SVG sub-component ─────────────────────────────────────────────

function ParseTreeSVG({ tree }: { tree: ParseTree }): JSX.Element {
  const { nodes, links, width, height } = useMemo(() => computeTreeLayout(tree), [tree]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={width + 40}
        height={height + 16}
        style={{ display: 'block' }}
        aria-label="Parse tree diagram"
        role="img"
      >
        <g transform="translate(20, 8)">
          {/* Edges */}
          {links.map((link, i) => (
            <line
              key={i}
              x1={link.x1}
              y1={link.y1 + 14}
              x2={link.x2}
              y2={link.y2 - 14}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1.5}
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => {
            const isWord = node.word !== undefined;
            const color = isWord ? ACCENT : symbolColor(node.symbol);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                aria-label={isWord ? `word: ${node.symbol}` : `symbol: ${node.symbol}`}
              >
                {isWord ? (
                  // Leaf word node — rounded rectangle
                  <>
                    <rect
                      x={-24}
                      y={-11}
                      width={48}
                      height={22}
                      rx={5}
                      fill={`${ACCENT}18`}
                      stroke={`${ACCENT}50`}
                      strokeWidth={1.5}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={ACCENT}
                      fontSize={11}
                      fontWeight={700}
                      fontFamily="system-ui, sans-serif"
                    >
                      {node.symbol}
                    </text>
                  </>
                ) : (
                  // Internal grammar node — circle
                  <>
                    <circle
                      r={15}
                      fill={SURFACE_2}
                      stroke={`${color}60`}
                      strokeWidth={1.5}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={color}
                      fontSize={10}
                      fontWeight={700}
                      fontFamily="system-ui, sans-serif"
                    >
                      {node.symbol}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ─── State row helper ──────────────────────────────────────────────────────────

function StateRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '5px',
        fontSize: '12px',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color: '#6B7280', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: accent ? ACCENT : '#E5E7EB',
          fontWeight: accent ? 700 : 400,
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main CYK Visualizer ──────────────────────────────────────────────────────

export function CYKVisualizer(): JSX.Element {
  const [sentenceInput, setSentenceInput] = useState('the wumpus is dead');
  const [committed, setCommitted] = useState('the wumpus is dead');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showTree, setShowTree] = useState(true);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const grammar = useMemo(() => buildE0Grammar(), []);

  const words = useMemo(
    () =>
      committed
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [committed],
  );

  const { table, steps, bestParse } = useMemo(() => {
    if (words.length === 0) return { table: new Map(), steps: [], bestParse: null };
    return cykParse(words, grammar);
  }, [words, grammar]);

  const maxStep = Math.max(0, steps.length - 1);
  const clampedStep = Math.min(currentStep, maxStep);

  // Reset animation when sentence changes
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [committed]);

  // RAF-based playback
  const speedMs = SPEED_OPTIONS[speedIdx]?.ms ?? 800;
  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPlaying || reduced) {
      if (reduced && isPlaying) {
        // Jump to end immediately for reduced-motion users
        setCurrentStep(maxStep);
        setIsPlaying(false);
      }
      return;
    }

    const tick = (ts: number) => {
      if (ts - lastRef.current >= speedMs) {
        lastRef.current = ts;
        setCurrentStep(prev => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speedMs, maxStep]);

  // Build partial CYK table visible up to the current step
  const visibleCells = useMemo(() => {
    const cells = new Map<string, Array<{ symbol: string; probability: number }>>();
    for (let s = 0; s <= clampedStep && s < steps.length; s++) {
      const step = steps[s];
      if (!step) continue;
      const key = `${step.i},${step.j}`;
      if (!cells.has(key)) cells.set(key, []);
      const arr = cells.get(key)!;
      const idx = arr.findIndex(e => e.symbol === step.symbol);
      if (idx >= 0) {
        arr[idx] = { symbol: step.symbol, probability: step.probability };
      } else {
        arr.push({ symbol: step.symbol, probability: step.probability });
      }
    }
    return cells as ReadonlyMap<string, ReadonlyArray<{ symbol: string; probability: number }>>;
  }, [steps, clampedStep]);

  const activeStep: CYKStep | undefined = steps[clampedStep];
  const n = words.length;
  const isComplete = clampedStep >= maxStep && steps.length > 0;

  const handleCommit = useCallback(() => {
    setCommitted(sentenceInput);
  }, [sentenceInput]);

  const handlePreset = useCallback((value: string) => {
    setSentenceInput(value);
    setCommitted(value);
  }, []);

  // Grammar display groups
  const grammarGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const rule of grammar.grammarRules) {
      if (!groups.has(rule.lhs)) groups.set(rule.lhs, []);
      const rhs = rule.rhs2 ? `${rule.rhs1} ${rule.rhs2}` : rule.rhs1;
      groups.get(rule.lhs)!.push(`${rhs} [${rule.prob.toFixed(2)}]`);
    }
    return groups;
  }, [grammar]);

  const lexGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const rule of grammar.lexicalRules) {
      if (!groups.has(rule.lhs)) groups.set(rule.lhs, []);
      groups.get(rule.lhs)!.push(`${rule.word} [${rule.prob.toFixed(2)}]`);
    }
    return groups;
  }, [grammar]);

  // KaTeX-rendered algorithm label
  const cykFormulaHtml = useMemo(
    () =>
      renderInlineMath(
        'P[X, i, j] = \\max_{k,Y,Z} P(X \\to YZ) \\cdot P[Y,i,k] \\cdot P[Z,k{+}1,j]',
      ),
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: 'clamp(12px, 3vw, 24px)',
        maxWidth: '960px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
        color: 'white',
      }}
    >
      {/* ── Title ── */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
          CYK Chart Parser
        </h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
          The{' '}
          <strong style={{ color: ACCENT }}>CYK (Cocke-Younger-Kasami)</strong> algorithm
          fills a triangular DP table bottom-up using a Probabilistic Context-Free Grammar.
          Diagonal cells come from lexical rules; wider spans are built by combining
          sub-spans via binary grammar rules, always keeping the highest-probability parse.
        </p>
        <div
          aria-label="CYK recurrence formula"
          dangerouslySetInnerHTML={{ __html: cykFormulaHtml }}
          style={{ fontSize: '13px' }}
        />
      </div>

      {/* ── Sentence input ── */}
      <div
        style={{
          marginBottom: '16px',
          background: SURFACE_1,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <label
          htmlFor="cyk-sentence-input"
          style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px' }}
        >
          Input Sentence (E0 vocabulary)
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input
            id="cyk-sentence-input"
            type="text"
            value={sentenceInput}
            onChange={e => setSentenceInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCommit(); }}
            aria-label="Sentence to parse"
            placeholder="e.g. the wumpus is dead"
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '8px 12px',
              background: SURFACE_2,
              border: `1px solid ${BORDER}`,
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCommit}
            aria-label="Parse sentence"
            style={{
              padding: '8px 18px',
              background: ACCENT,
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Parse
          </button>
        </div>

        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESET_SENTENCES.map(p => (
            <button
              key={p.value}
              onClick={() => handlePreset(p.value)}
              aria-label={`Use sentence: ${p.label}`}
              aria-pressed={committed === p.value}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                background: committed === p.value ? `${ACCENT}20` : SURFACE_3,
                color: committed === p.value ? ACCENT : '#9CA3AF',
                border: `1px solid ${committed === p.value ? ACCENT + '40' : BORDER}`,
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {n === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
          Enter a sentence above and click <strong>Parse</strong>.
        </div>
      )}

      {/* ── Controls ── */}
      {steps.length > 0 && (
        <div
          role="toolbar"
          aria-label="Playback controls"
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            background: SURFACE_1,
            border: `1px solid ${BORDER}`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
            aria-label="Reset to start"
            title="Reset"
            style={BTN}
          >
            ⟨⟨
          </button>
          <button
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            aria-label="Step backward"
            title="Step back"
            style={BTN}
          >
            ‹
          </button>
          <button
            onClick={() => setIsPlaying(p => !p)}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            style={{
              ...BTN,
              background: isPlaying ? `${ACCENT}20` : ACCENT,
              color: isPlaying ? ACCENT : '#000',
              border: isPlaying ? `1px solid ${ACCENT}50` : 'none',
              minWidth: '52px',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setCurrentStep(s => Math.min(maxStep, s + 1))}
            aria-label="Step forward"
            title="Step forward"
            style={BTN}
          >
            ›
          </button>
          <button
            onClick={() => { setCurrentStep(maxStep); setIsPlaying(false); }}
            aria-label="Jump to end"
            title="Jump to end"
            style={BTN}
          >
            ⟩⟩
          </button>

          {/* Progress */}
          <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                height: '4px',
                borderRadius: '2px',
                background: SURFACE_3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: steps.length > 1 ? `${(clampedStep / maxStep) * 100}%` : '100%',
                  background: ACCENT,
                  borderRadius: '2px',
                  transition: 'width 0.1s',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              Step {clampedStep + 1} / {steps.length}
            </span>
          </div>

          {/* Speed buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {SPEED_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setSpeedIdx(i)}
                aria-label={`Set speed to ${opt.label}`}
                aria-pressed={speedIdx === i}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: speedIdx === i ? `${ACCENT}20` : SURFACE_3,
                  color: speedIdx === i ? ACCENT : '#9CA3AF',
                  border: `1px solid ${speedIdx === i ? ACCENT + '40' : BORDER}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main grid: table + state panel ── */}
      {n > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(220px,280px)',
            gap: '16px',
            alignItems: 'start',
            marginBottom: '16px',
          }}
        >
          {/* CYK Table */}
          <div
            style={{
              background: SURFACE_1,
              border: `1px solid ${BORDER}`,
              borderRadius: '12px',
              padding: '16px',
              overflowX: 'auto',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '12px', margin: '0 0 12px' }}>
              CYK Chart — {n} word{n !== 1 ? 's' : ''}
            </h3>

            {/* Symbol legend */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {Object.entries(SYMBOL_COLORS).map(([sym, col]) => (
                <span
                  key={sym}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: col,
                    background: `${col}15`,
                    border: `1px solid ${col}30`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                  }}
                >
                  {sym}
                </span>
              ))}
              <span
                style={{
                  fontSize: '10px',
                  color: '#9CA3AF',
                  background: `${SURFACE_3}`,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '4px',
                  padding: '2px 6px',
                }}
              >
                pre-terminal
              </span>
            </div>

            <CYKTable n={n} words={words} visibleCells={visibleCells} activeStep={activeStep} />
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Active step */}
            {activeStep ? (
              <div
                style={{
                  background: SURFACE_1,
                  border: `1px solid ${ACCENT}40`,
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: ACCENT,
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {activeStep.phase === 'lexical' ? '📖 Lexical' : '🔗 Syntactic'} Phase
                </div>
                <StateRow label="Symbol" value={activeStep.symbol} accent />
                <StateRow label="Span [i, j]" value={`[${activeStep.i}, ${activeStep.j}]`} />
                {activeStep.phase === 'syntactic' && (
                  <StateRow label="Split point k" value={String(activeStep.k)} />
                )}
                <StateRow
                  label="Rule"
                  value={activeStep.rule}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '4px',
                    paddingTop: '8px',
                    borderTop: `1px solid ${BORDER}`,
                    fontSize: '12px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#6B7280' }}>Probability</span>
                  <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>
                    {activeStep.probability.toExponential(4)}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: SURFACE_1,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#6B7280',
                  fontSize: '13px',
                  textAlign: 'center',
                }}
              >
                Press <strong style={{ color: ACCENT }}>▶</strong> to step through the parse
              </div>
            )}

            {/* Word index */}
            <div
              style={{
                background: SURFACE_1,
                border: `1px solid ${BORDER}`,
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Words
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {words.map((word, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      background:
                        activeStep !== undefined && activeStep.i === i + 1 && activeStep.j === i + 1
                          ? `${ACCENT}12`
                          : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        background: SURFACE_3,
                        color: ACCENT,
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: '#E5E7EB', fontSize: '13px' }}>{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parse result badge */}
            <div
              style={{
                background: SURFACE_1,
                border: `1px solid ${bestParse ? '#10B98140' : '#EF444440'}`,
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: bestParse ? '#10B981' : '#EF4444',
                  marginBottom: '4px',
                }}
              >
                {bestParse ? '✓ Parse Found' : isComplete ? '✗ No Parse Found' : '… Parsing'}
              </div>
              {bestParse && (
                <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  P(S) = {bestParse.probability.toExponential(4)}
                </div>
              )}
              {!bestParse && isComplete && (
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  The E0 grammar cannot parse this sentence. Try a different input.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Parse Tree ── */}
      {n > 0 && (
        <div
          style={{
            marginBottom: '16px',
            background: SURFACE_1,
            border: `1px solid ${BORDER}`,
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showTree ? '12px' : 0,
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', margin: 0 }}>
              Parse Tree
            </h3>
            <button
              onClick={() => setShowTree(s => !s)}
              aria-expanded={showTree}
              aria-label={showTree ? 'Collapse parse tree' : 'Expand parse tree'}
              style={{ ...BTN, fontSize: '12px', padding: '4px 8px' }}
            >
              {showTree ? '▲ Hide' : '▼ Show'}
            </button>
          </div>

          {showTree && (
            <>
              {/* Node legend */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width={24} height={24} aria-hidden="true">
                    <circle cx={12} cy={12} r={10} fill={SURFACE_2} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
                  </svg>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Non-terminal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width={24} height={24} aria-hidden="true">
                    <rect x={2} y={6} width={20} height={12} rx={3} fill={`${ACCENT}18`} stroke={`${ACCENT}50`} strokeWidth={1.5} />
                  </svg>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Word (terminal)</span>
                </div>
              </div>

              {!bestParse ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '14px',
                    background: `${SURFACE_2}80`,
                    borderRadius: '8px',
                    border: `1px dashed ${BORDER}`,
                  }}
                >
                  {isComplete
                    ? 'No parse tree — the grammar cannot parse this sentence.'
                    : 'Complete the parse (press ⟩⟩) to reveal the best parse tree.'}
                </div>
              ) : (
                <ParseTreeSVG tree={bestParse} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Grammar display ── */}
      <div
        style={{
          background: SURFACE_1,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showGrammar ? '14px' : 0,
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', margin: 0 }}>
            E0 Wumpus-World PCFG
          </h3>
          <button
            onClick={() => setShowGrammar(s => !s)}
            aria-expanded={showGrammar}
            aria-label={showGrammar ? 'Hide grammar rules' : 'Show grammar rules'}
            style={{ ...BTN, fontSize: '12px', padding: '4px 8px' }}
          >
            {showGrammar ? '▲ Hide' : '▼ Show'}
          </button>
        </div>

        {showGrammar && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Phrase-structure rules */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#6B7280',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Phrase-Structure Rules
              </div>
              {Array.from(grammarGroups.entries()).map(([lhs, ruleList]) => (
                <div
                  key={lhs}
                  style={{
                    marginBottom: '6px',
                    padding: '5px 8px',
                    background: SURFACE_2,
                    borderRadius: '6px',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <span
                    style={{
                      color: symbolColor(lhs),
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {lhs}
                  </span>
                  <span style={{ color: '#4B5563', fontSize: '12px' }}> → </span>
                  {ruleList.map((r, i) => (
                    <span key={i} style={{ color: '#9CA3AF', fontSize: '11px' }}>
                      {i > 0 && <span style={{ color: '#4B5563' }}> | </span>}
                      {r}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {/* Lexical rules */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#6B7280',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Lexical Rules (pre-terminal → word)
              </div>
              {Array.from(lexGroups.entries()).map(([lhs, wordList]) => (
                <div
                  key={lhs}
                  style={{
                    marginBottom: '6px',
                    padding: '5px 8px',
                    background: SURFACE_2,
                    borderRadius: '6px',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '12px' }}>{lhs}</span>
                  <span style={{ color: '#4B5563', fontSize: '12px' }}> → </span>
                  {wordList.map((w, i) => (
                    <span key={i} style={{ color: '#9CA3AF', fontSize: '11px' }}>
                      {i > 0 && <span style={{ color: '#4B5563' }}> | </span>}
                      {w}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {!showGrammar && (
          <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '8px', marginBottom: 0 }}>
            The E0 grammar defines sentences for the Wumpus World domain with{' '}
            {grammar.grammarRules.length} phrase-structure rules and{' '}
            {grammar.lexicalRules.length} lexical rules.
          </p>
        )}
      </div>

    </div>
  );
}
