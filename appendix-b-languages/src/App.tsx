import { useState, useCallback } from 'react';
import manifest from '../manifest.json';
import {
  parseBNF,
  isNonTerminal,
  getNonTerminals,
  getTerminals,
  deriveOneStep,
  generateString,
  buildParseTree,
  parsePseudocode,
  tokenizePseudocode,
  type BNFRule,
  type ParseTreeNode,
  type PseudocodeLine,
  type PseudocodeToken,
} from './algorithms/index';

const CHAPTER_COLOR = '#64748B';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        {title}
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '700px', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#111118',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{children}</h3>
  );
}

function CardDesc({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px', margin: '0 0 20px' }}>
      {children}
    </p>
  );
}

// ─── Token coloring ───────────────────────────────────────────────────────────

const TOKEN_COLORS: Record<PseudocodeToken['type'], string> = {
  keyword:     '#C084FC',
  variable:    '#93C5FD',
  operator:    '#F9A8D4',
  comment:     '#6B7280',
  literal:     '#86EFAC',
  function:    '#FCD34D',
  punctuation: '#9CA3AF',
};

// ─── BNF Explorer ────────────────────────────────────────────────────────────

const DEFAULT_BNF = `<expr> ::= <term> + <expr> | <term>
<term> ::= <factor> * <term> | <factor>
<factor> ::= ( <expr> ) | id | num`;

function BNFExplorer() {
  const [grammarText, setGrammarText] = useState(DEFAULT_BNF);
  const [rules, setRules] = useState<BNFRule[]>(() => parseBNF(DEFAULT_BNF));
  const [parseInput, setParseInput] = useState('id + num');
  const [parseTree, setParseTree] = useState<ParseTreeNode | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [generatedTokens, setGeneratedTokens] = useState<string[] | null>(null);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [derivationSteps, setDerivationSteps] = useState<string[][]>([]);
  const [seed, setSeed] = useState(42);

  const handleGrammarChange = useCallback((text: string) => {
    setGrammarText(text);
    setRules(parseBNF(text));
    setParseTree(null);
    setParseFailed(false);
    setGeneratedTokens(null);
    setGenerateFailed(false);
    setDerivationSteps([]);
  }, []);

  const nonTerminals = getNonTerminals(rules);
  const terminals = getTerminals(rules);
  const startSymbol = nonTerminals[0] ?? '';

  const handleParse = useCallback(() => {
    if (!startSymbol) return;
    const tokens = parseInput.trim().split(/\s+/).filter(Boolean);
    const tree = buildParseTree(rules, startSymbol, tokens);
    setParseTree(tree);
    setParseFailed(tree === null);
  }, [rules, startSymbol, parseInput]);

  const handleGenerate = useCallback(() => {
    if (!startSymbol) return;
    const result = generateString(rules, startSymbol, 100, seed);
    setGeneratedTokens(result);
    setGenerateFailed(result === null);
  }, [rules, startSymbol, seed]);

  const handleDerive = useCallback(() => {
    if (!startSymbol) return;
    const steps: string[][] = [[startSymbol]];
    let form: string[] = [startSymbol];
    for (let i = 0; i < 8; i++) {
      const ntIdx = form.findIndex(s => isNonTerminal(s));
      if (ntIdx === -1) break;
      const symbol = form[ntIdx];
      const rule = rules.find(r => r.nonTerminal === symbol);
      if (!rule) break;
      try {
        form = deriveOneStep(rules, form, ntIdx, 0);
        steps.push([...form]);
      } catch {
        break;
      }
    }
    setDerivationSteps(steps);
  }, [rules, startSymbol]);

  function renderTreeNode(node: ParseTreeNode, depth = 0): React.ReactNode {
    const indent = depth * 20;
    return (
      <div key={`${node.symbol}-${depth}`} style={{ marginLeft: `${indent}px` }}>
        <span style={{
          color: node.isTerminal ? '#86EFAC' : '#C084FC',
          fontFamily: 'monospace',
          fontSize: '13px',
        }}>
          {node.isTerminal ? `"${node.symbol}"` : node.symbol}
        </span>
        {node.children.map((child, i) => (
          <div key={i}>{renderTreeNode(child, depth + 1)}</div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardTitle>BNF Grammar Explorer</CardTitle>
      <CardDesc>
        Edit the grammar below. Non-terminals are wrapped in angle brackets like{' '}
        <code style={{ color: '#C084FC', fontSize: '13px' }}>&lt;expr&gt;</code>.
        Rules use <code style={{ color: '#F9A8D4', fontSize: '13px' }}>::=</code> and{' '}
        <code style={{ color: '#F9A8D4', fontSize: '13px' }}>|</code> to separate alternatives.
      </CardDesc>

      <textarea
        aria-label="BNF grammar input"
        value={grammarText}
        onChange={e => handleGrammarChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%', height: '120px', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', color: '#E5E7EB', fontFamily: 'monospace', fontSize: '13px',
          padding: '12px', resize: 'vertical', outline: 'none',
        }}
      />

      {/* Grammar summary */}
      {rules.length > 0 && (
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Non-terminals ({nonTerminals.length})
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {nonTerminals.map(nt => (
                <span key={nt} style={{ background: 'rgba(192,132,252,0.15)', color: '#C084FC', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                  {nt}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Terminals ({terminals.length})
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {terminals.map(t => (
                <span key={t} style={{ background: 'rgba(134,239,172,0.15)', color: '#86EFAC', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Derivation */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
          Step-by-step Derivation (always picks first alternative)
        </div>
        <button
          onClick={handleDerive}
          disabled={rules.length === 0}
          aria-label="Show derivation steps"
          style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: `${CHAPTER_COLOR}30`, color: '#CBD5E1', fontSize: '13px', fontWeight: 500,
          }}
        >
          Show derivation
        </button>
        {derivationSteps.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {derivationSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#6B7280', fontSize: '11px', minWidth: '20px' }}>{i === 0 ? 'start' : `⇒${i}`}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#E5E7EB' }}>
                  {step.map((s, j) => (
                    <span key={j} style={{ marginRight: '4px', color: isNonTerminal(s) ? '#C084FC' : '#86EFAC' }}>{s}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
          Generate a String
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Seed:
            <input
              type="number"
              aria-label="Random seed"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              style={{
                marginLeft: '8px', width: '70px', background: '#1A1A24',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px',
                color: '#E5E7EB', padding: '4px 8px', fontSize: '13px', outline: 'none',
              }}
            />
          </label>
          <button
            onClick={handleGenerate}
            disabled={rules.length === 0}
            aria-label="Generate string from grammar"
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: `${CHAPTER_COLOR}30`, color: '#CBD5E1', fontSize: '13px', fontWeight: 500,
            }}
          >
            Generate
          </button>
        </div>
        {generatedTokens !== null && (
          <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '14px', color: '#86EFAC' }}>
            {generatedTokens.join(' ')}
          </div>
        )}
        {generateFailed && (
          <div style={{ marginTop: '10px', color: '#F87171', fontSize: '13px' }}>
            Could not generate — grammar may be infinitely recursive or start symbol not found.
          </div>
        )}
      </div>

      {/* Parse tree */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
          Parse String
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            aria-label="Tokens to parse (space-separated)"
            value={parseInput}
            onChange={e => setParseInput(e.target.value)}
            placeholder="Space-separated tokens, e.g. id + num"
            style={{
              flex: '1', minWidth: '180px', background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
              color: '#E5E7EB', padding: '7px 12px', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={handleParse}
            disabled={rules.length === 0}
            aria-label="Parse tokens"
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: `${CHAPTER_COLOR}30`, color: '#CBD5E1', fontSize: '13px', fontWeight: 500,
            }}
          >
            Parse
          </button>
        </div>
        {parseFailed && (
          <div style={{ marginTop: '10px', color: '#F87171', fontSize: '13px' }}>
            Parse failed — the token string is not in the language of this grammar.
          </div>
        )}
        {parseTree !== null && (
          <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '10px', padding: '16px', overflowX: 'auto' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px' }}>
              Parse tree — <span style={{ color: '#C084FC' }}>non-terminals</span> /
              {' '}<span style={{ color: '#86EFAC' }}>terminals</span>
            </div>
            {renderTreeNode(parseTree)}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Pseudocode Explorer ──────────────────────────────────────────────────────

const DEFAULT_PSEUDOCODE = `function BFS(problem) returns a solution or failure
  node ← new Node(problem.initial)
  if problem.isGoal(node.state) then return node
  frontier ← new Queue()
  frontier.add(node)
  explored ← new Set()
  loop do
    if isEmpty(frontier) then return failure
    node ← frontier.pop()
    explored.add(node.state)
    for each action in problem.actions(node.state) do
      child ← childNode(problem, node, action)
      if child.state ∉ explored and child.state ∉ frontier then
        if problem.isGoal(child.state) then return child
        frontier.add(child)
  end`;

function PseudocodeExplorer() {
  const [source, setSource] = useState(DEFAULT_PSEUDOCODE);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const lines: PseudocodeLine[] = parsePseudocode(source);

  function renderToken(tok: PseudocodeToken, i: number) {
    return (
      <span key={i} style={{ color: TOKEN_COLORS[tok.type], marginRight: '4px' }}>
        {tok.text}
      </span>
    );
  }

  return (
    <Card>
      <CardTitle>Pseudocode Tokeniser</CardTitle>
      <CardDesc>
        Edit pseudocode below (AIMA convention). Each line is tokenised and colour-coded:
        {' '}<span style={{ color: TOKEN_COLORS.keyword }}>keywords</span>,
        {' '}<span style={{ color: TOKEN_COLORS.variable }}>variables</span>,
        {' '}<span style={{ color: TOKEN_COLORS.operator }}>operators</span>,
        {' '}<span style={{ color: TOKEN_COLORS.function }}>functions</span>,
        {' '}<span style={{ color: TOKEN_COLORS.literal }}>literals</span>,
        {' '}<span style={{ color: TOKEN_COLORS.comment }}>comments</span>.
        Hover a line to inspect its tokens.
      </CardDesc>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Editor */}
        <div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Source</div>
          <textarea
            aria-label="Pseudocode source"
            value={source}
            onChange={e => { setSource(e.target.value); setActiveLine(null); }}
            spellCheck={false}
            style={{
              width: '100%', height: '320px', background: '#0A0A0F',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              color: '#E5E7EB', fontFamily: 'monospace', fontSize: '12px',
              padding: '12px', resize: 'vertical', outline: 'none', lineHeight: 1.7,
            }}
          />
        </div>

        {/* Highlighted output */}
        <div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Highlighted output</div>
          <div
            role="list"
            aria-label="Tokenised pseudocode lines"
            style={{
              height: '320px', overflowY: 'auto', background: '#0A0A0F',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              padding: '12px', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.7,
            }}
          >
            {lines.map(line => (
              <div
                key={line.lineNumber}
                role="listitem"
                aria-label={`Line ${line.lineNumber}`}
                onMouseEnter={() => setActiveLine(line.lineNumber)}
                onMouseLeave={() => setActiveLine(null)}
                style={{
                  paddingLeft: `${line.indent * 1}px`,
                  background: activeLine === line.lineNumber ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderRadius: '4px',
                  cursor: 'default',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#374151', minWidth: '24px', textAlign: 'right', userSelect: 'none' }}>
                  {line.lineNumber}
                </span>
                <span style={{ paddingLeft: `${line.indent * 8}px` }}>
                  {line.tokens.map(renderToken)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Token inspector */}
      {activeLine !== null && (() => {
        const line = lines.find(l => l.lineNumber === activeLine);
        if (!line) return null;
        return (
          <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
              Line {activeLine} — {line.tokens.length} token{line.tokens.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {line.tokens.map((tok, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
                  fontFamily: 'monospace',
                  background: `${TOKEN_COLORS[tok.type]}20`,
                  color: TOKEN_COLORS[tok.type],
                  border: `1px solid ${TOKEN_COLORS[tok.type]}40`,
                }}>
                  {tok.text}
                  <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '6px' }}>{tok.type}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </Card>
  );
}

// ─── Quick reference cards ────────────────────────────────────────────────────

function QuickTokenCard({ type, examples, color }: { type: string; examples: string[]; color: string }) {
  return (
    <div style={{ padding: '14px', background: '#0A0A0F', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {type}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {examples.map(ex => (
          <code key={ex} style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: '5px', fontSize: '12px', fontFamily: 'monospace' }}>
            {ex}
          </code>
        ))}
      </div>
    </div>
  );
}

function SupplementalSection() {
  const tokenKinds = [
    { type: 'keyword',     color: TOKEN_COLORS.keyword,     examples: ['function', 'return', 'if', 'then', 'else', 'while', 'for', 'do'] },
    { type: 'operator',    color: TOKEN_COLORS.operator,    examples: ['←', ':=', '=', '≠', '≤', '≥', '∈', '∉', '+', '-'] },
    { type: 'punctuation', color: TOKEN_COLORS.punctuation, examples: ['(', ')', '[', ']', ',', '.'] },
    { type: 'literal',     color: TOKEN_COLORS.literal,     examples: ['0', '1', '3.14', '100'] },
    { type: 'function',    color: TOKEN_COLORS.function,    examples: ['isEmpty(…)', 'actions(…)', 'childNode(…)'] },
    { type: 'variable',    color: TOKEN_COLORS.variable,    examples: ['node', 'frontier', 'explored', 'state'] },
    { type: 'comment',     color: TOKEN_COLORS.comment,     examples: ['// comment text'] },
  ];

  const tokenizeLine = (line: string) => tokenizePseudocode(line);

  const sample = 'child ← childNode(problem, node, action)';
  const sampleTokens = tokenizeLine(sample);

  return (
    <div>
      <SectionHeader
        id="supplemental"
        title="Online Supplemental Material"
        subtitle="A quick-reference guide to AIMA pseudocode token types and BNF notation conventions."
      />
      <Card>
        <CardTitle>Token Type Reference</CardTitle>
        <CardDesc>
          The AIMA pseudocode uses these token categories. The tokeniser classifies
          each word or symbol to enable syntax highlighting and static analysis.
        </CardDesc>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {tokenKinds.map(k => (
            <QuickTokenCard key={k.type} type={k.type} examples={k.examples} color={k.color} />
          ))}
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px' }}>Live example — tokenise:</div>
          <code style={{ color: '#E5E7EB', fontFamily: 'monospace', fontSize: '13px' }}>{sample}</code>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sampleTokens.map((tok, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
                fontFamily: 'monospace',
                background: `${TOKEN_COLORS[tok.type]}20`,
                color: TOKEN_COLORS[tok.type],
                border: `1px solid ${TOKEN_COLORS[tok.type]}40`,
              }}>
                {tok.text}
                <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '6px' }}>{tok.type}</span>
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>BNF Notation Summary</CardTitle>
        <CardDesc>
          Backus–Naur Form (BNF) is used throughout AIMA Appendix B to define the syntax
          of languages and the structure of data types.
        </CardDesc>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {[
            { sym: '<NonTerminal>', desc: 'A syntactic category enclosed in angle brackets.' },
            { sym: 'terminal', desc: 'A literal symbol or word (not angle-bracketed).' },
            { sym: '::=', desc: 'Defines a production rule (read: "can be").' },
            { sym: '|', desc: 'Separates alternatives within a rule.' },
            { sym: '{ … }', desc: 'Zero or more repetitions (EBNF extension).' },
            { sym: '[ … ]', desc: 'Optional element — zero or one occurrence (EBNF).' },
          ].map(item => (
            <div key={item.sym} style={{ padding: '12px 16px', background: '#0A0A0F', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <code style={{ color: '#F9A8D4', fontFamily: 'monospace', fontSize: '14px', display: 'block', marginBottom: '6px' }}>{item.sym}</code>
              <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

type SectionId = 'bnf' | 'pseudocode' | 'supplemental';

const sections: Array<{ id: SectionId; label: string; book: string }> = [
  { id: 'bnf',          label: 'BNF Grammar',   book: '§B.1' },
  { id: 'pseudocode',   label: 'Pseudocode',     book: '§B.2' },
  { id: 'supplemental', label: 'Reference',      book: '§B'   },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('bnf');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base, #0A0A0F)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <a href="/aima-visualizations/" style={{ color: CHAPTER_COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            aria-label="Back to all chapters">← All Chapters</a>
          <nav aria-label="Appendix sections" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
                style={{
                  padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: activeSection === s.id ? `${CHAPTER_COLOR}20` : 'transparent',
                  color: activeSection === s.id ? '#CBD5E1' : '#9CA3AF',
                  outline: activeSection === s.id ? `1px solid ${CHAPTER_COLOR}40` : 'none',
                }}>
                <span style={{ display: 'block', fontSize: '9px', color: activeSection === s.id ? `${CHAPTER_COLOR}80` : '#6B7280', marginBottom: '1px' }}>{s.book}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '14px',
            fontFamily: 'monospace',
          }}>
            {manifest.icon}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>
          {manifest.description}
        </p>
      </section>

      {/* Main */}
      <main style={{ padding: '0 24px 80px', maxWidth: '1000px', margin: '0 auto' }}>

        {activeSection === 'bnf' && (
          <div>
            <SectionHeader
              id="bnf"
              title="§B.1 Defining Languages with BNF"
              subtitle="Backus–Naur Form (BNF) provides a concise, formal notation for context-free grammars. Every AIMA algorithm data structure is defined with BNF."
            />
            <BNFExplorer />
          </div>
        )}

        {activeSection === 'pseudocode' && (
          <div>
            <SectionHeader
              id="pseudocode"
              title="§B.2 Describing Algorithms with Pseudocode"
              subtitle="AIMA pseudocode uses a consistent set of keywords and operators. This tokeniser lets you explore the notation used throughout the book."
            />
            <PseudocodeExplorer />
          </div>
        )}

        {activeSection === 'supplemental' && <SupplementalSection />}
      </main>
    </div>
  );
}
