import { describe, it, expect } from 'vitest';
import {
  parseBNF,
  isNonTerminal,
  getNonTerminals,
  getTerminals,
  deriveOneStep,
  generateString,
  buildParseTree,
  tokenizePseudocode,
  parsePseudocode,
  tracePseudocode,
  type BNFRule,
} from '../src/algorithms/index';

// ─────────────────────────────────────────────────────────────────────────────
// parseBNF
// ─────────────────────────────────────────────────────────────────────────────

describe('parseBNF', () => {
  it('returns empty array for empty string', () => {
    expect(parseBNF('')).toEqual([]);
  });

  it('skips blank lines', () => {
    expect(parseBNF('\n\n\n')).toEqual([]);
  });

  it('skips comment lines starting with #', () => {
    expect(parseBNF('# this is a comment\n# another comment')).toEqual([]);
  });

  it('skips lines without ::=', () => {
    expect(parseBNF('something without separator')).toEqual([]);
  });

  it('parses a single rule with one alternative', () => {
    const rules = parseBNF('<expr> ::= id');
    expect(rules).toHaveLength(1);
    expect(rules[0]!.nonTerminal).toBe('<expr>');
    expect(rules[0]!.alternatives).toEqual([['id']]);
  });

  it('parses a single rule with multiple alternatives', () => {
    const rules = parseBNF('<expr> ::= <term> + <expr> | <term>');
    expect(rules).toHaveLength(1);
    expect(rules[0]!.nonTerminal).toBe('<expr>');
    expect(rules[0]!.alternatives).toEqual([
      ['<term>', '+', '<expr>'],
      ['<term>'],
    ]);
  });

  it('parses multiple rules', () => {
    const input = '<expr> ::= <term> + <expr> | <term>\n<term> ::= id | ( <expr> )';
    const rules = parseBNF(input);
    expect(rules).toHaveLength(2);
    expect(rules[0]!.nonTerminal).toBe('<expr>');
    expect(rules[1]!.nonTerminal).toBe('<term>');
  });

  it('handles symbols with and without angle brackets', () => {
    const rules = parseBNF('<foo> ::= bar | <baz>');
    expect(rules[0]!.alternatives[0]).toEqual(['bar']);
    expect(rules[0]!.alternatives[1]).toEqual(['<baz>']);
  });

  it('ignores blank lines and comments mixed with real rules', () => {
    const input = [
      '# Grammar',
      '',
      '<S> ::= a <S> | b',
      '',
      '# another comment',
    ].join('\n');
    const rules = parseBNF(input);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.nonTerminal).toBe('<S>');
  });

  it('trims whitespace around non-terminal and alternatives', () => {
    const rules = parseBNF('  <X>  ::=  a  |  b  ');
    expect(rules[0]!.nonTerminal).toBe('<X>');
    expect(rules[0]!.alternatives).toEqual([['a'], ['b']]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isNonTerminal
// ─────────────────────────────────────────────────────────────────────────────

describe('isNonTerminal', () => {
  it('returns true for angle-bracketed symbol', () => {
    expect(isNonTerminal('<expr>')).toBe(true);
    expect(isNonTerminal('<X>')).toBe(true);
  });

  it('returns false for plain terminal', () => {
    expect(isNonTerminal('id')).toBe(false);
    expect(isNonTerminal('+')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isNonTerminal('')).toBe(false);
  });

  it('returns false when only opening angle bracket', () => {
    expect(isNonTerminal('<X')).toBe(false);
  });

  it('returns false when only closing angle bracket', () => {
    expect(isNonTerminal('X>')).toBe(false);
  });

  it('returns false for two-character string like <>', () => {
    expect(isNonTerminal('<>')).toBe(false); // length 2, needs >= 3
  });

  it('returns true for exactly 3 characters <a>', () => {
    expect(isNonTerminal('<a>')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getNonTerminals
// ─────────────────────────────────────────────────────────────────────────────

describe('getNonTerminals', () => {
  it('returns empty array for no rules', () => {
    expect(getNonTerminals([])).toEqual([]);
  });

  it('returns unique non-terminals in definition order', () => {
    const rules: BNFRule[] = [
      { nonTerminal: '<expr>', alternatives: [['<term>']] },
      { nonTerminal: '<term>', alternatives: [['id']] },
      { nonTerminal: '<expr>', alternatives: [['num']] }, // duplicate
    ];
    expect(getNonTerminals(rules)).toEqual(['<expr>', '<term>']);
  });

  it('returns a single non-terminal for a single rule', () => {
    const rules: BNFRule[] = [{ nonTerminal: '<S>', alternatives: [['a']] }];
    expect(getNonTerminals(rules)).toEqual(['<S>']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTerminals
// ─────────────────────────────────────────────────────────────────────────────

describe('getTerminals', () => {
  it('returns empty array for rules with no terminals', () => {
    const rules: BNFRule[] = [{ nonTerminal: '<S>', alternatives: [['<A>', '<B>']] }];
    expect(getTerminals(rules)).toEqual([]);
  });

  it('returns deduplicated terminals', () => {
    const rules: BNFRule[] = [
      { nonTerminal: '<expr>', alternatives: [['<term>', '+', '<expr>'], ['<term>']] },
      { nonTerminal: '<term>', alternatives: [['id'], ['id', '+', 'id']] },
    ];
    const terminals = getTerminals(rules);
    expect(terminals).toContain('+');
    expect(terminals).toContain('id');
    expect(terminals.filter(t => t === '+').length).toBe(1);
    expect(terminals.filter(t => t === 'id').length).toBe(1);
  });

  it('excludes non-terminals from the result', () => {
    const rules: BNFRule[] = [
      { nonTerminal: '<S>', alternatives: [['a', '<A>'], ['b']] },
    ];
    expect(getTerminals(rules)).not.toContain('<A>');
    expect(getTerminals(rules)).toContain('a');
    expect(getTerminals(rules)).toContain('b');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveOneStep
// ─────────────────────────────────────────────────────────────────────────────

describe('deriveOneStep', () => {
  const rules: BNFRule[] = [
    { nonTerminal: '<expr>', alternatives: [['<term>', '+', '<expr>'], ['<term>']] },
    { nonTerminal: '<term>', alternatives: [['id']] },
  ];

  it('replaces a non-terminal at the given index with the chosen alternative', () => {
    const result = deriveOneStep(rules, ['<expr>'], 0, 0);
    expect(result).toEqual(['<term>', '+', '<expr>']);
  });

  it('replaces with the second alternative when alternativeIndex is 1', () => {
    const result = deriveOneStep(rules, ['<expr>'], 0, 1);
    expect(result).toEqual(['<term>']);
  });

  it('correctly splices in the middle of the sentential form', () => {
    const form = ['a', '<term>', 'b'];
    const result = deriveOneStep(rules, form, 1, 0);
    expect(result).toEqual(['a', 'id', 'b']);
  });

  it('throws RangeError when targetIndex is negative', () => {
    expect(() => deriveOneStep(rules, ['<expr>'], -1, 0)).toThrow(RangeError);
  });

  it('throws RangeError when targetIndex equals length', () => {
    expect(() => deriveOneStep(rules, ['<expr>'], 1, 0)).toThrow(RangeError);
  });

  it('throws TypeError when the symbol at targetIndex is a terminal', () => {
    expect(() => deriveOneStep(rules, ['id', '<term>'], 0, 0)).toThrow(TypeError);
  });

  it('uses empty replacement when no matching rule is found', () => {
    // <unknown> is a non-terminal (syntactically) but has no rule — replaces with []
    const result = deriveOneStep(rules, ['<unknown>'], 0, 0);
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateString
// ─────────────────────────────────────────────────────────────────────────────

describe('generateString', () => {
  const simpleRules: BNFRule[] = [
    { nonTerminal: '<S>', alternatives: [['a', 'b', 'c']] },
  ];

  const exprRules: BNFRule[] = [
    { nonTerminal: '<expr>', alternatives: [['<term>', '+', '<expr>'], ['<term>']] },
    { nonTerminal: '<term>', alternatives: [['id']] },
  ];

  it('generates a simple terminal string', () => {
    const result = generateString(simpleRules, '<S>', 10);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns null when startSymbol is not in rules', () => {
    expect(generateString(simpleRules, '<unknown>', 10)).toBeNull();
  });

  it('returns null when maxDepth is exceeded (left-recursive grammar)', () => {
    // Purely recursive grammar — can never terminate
    const recursive: BNFRule[] = [
      { nonTerminal: '<A>', alternatives: [['<A>', 'x']] },
    ];
    expect(generateString(recursive, '<A>', 5)).toBeNull();
  });

  it('uses the seed parameter deterministically', () => {
    const r1 = generateString(exprRules, '<expr>', 50, 0);
    const r2 = generateString(exprRules, '<expr>', 50, 0);
    expect(r1).toEqual(r2);
  });

  it('produces different results for different seeds when alternatives differ', () => {
    // Grammar with real choice between non-recursive alternatives
    const multiRules: BNFRule[] = [
      { nonTerminal: '<S>', alternatives: [['a'], ['b'], ['c']] },
    ];
    const results = new Set<string>();
    for (let s = 0; s < 10; s++) {
      const r = generateString(multiRules, '<S>', 10, s);
      if (r) results.add(r.join(''));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('uses default seed of 42 when seed parameter is omitted', () => {
    const withDefault = generateString(simpleRules, '<S>', 10);
    const withExplicit = generateString(simpleRules, '<S>', 10, 42);
    expect(withDefault).toEqual(withExplicit);
  });

  it('returns null when rule references undefined non-terminal mid-derivation', () => {
    const broken: BNFRule[] = [
      { nonTerminal: '<S>', alternatives: [['<missing>']] },
    ];
    expect(generateString(broken, '<S>', 10)).toBeNull();
  });

  it('handles grammar where all alternatives are immediately recursive and maxDepth is 0', () => {
    const rec: BNFRule[] = [
      { nonTerminal: '<A>', alternatives: [['<A>']] },
    ];
    expect(generateString(rec, '<A>', 0)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildParseTree
// ─────────────────────────────────────────────────────────────────────────────

describe('buildParseTree', () => {
  const rules: BNFRule[] = [
    { nonTerminal: '<expr>', alternatives: [['<term>', '+', '<expr>'], ['<term>']] },
    { nonTerminal: '<term>', alternatives: [['id'], ['num']] },
  ];

  it('successfully parses a simple terminal token', () => {
    const tree = buildParseTree(rules, '<term>', ['id']);
    expect(tree).not.toBeNull();
    expect(tree!.symbol).toBe('<term>');
    expect(tree!.isTerminal).toBe(false);
    expect(tree!.children[0]!.symbol).toBe('id');
    expect(tree!.children[0]!.isTerminal).toBe(true);
  });

  it('parses a compound expression', () => {
    const tree = buildParseTree(rules, '<expr>', ['id', '+', 'id']);
    expect(tree).not.toBeNull();
    expect(tree!.symbol).toBe('<expr>');
  });

  it('returns null for token string not in the language', () => {
    const tree = buildParseTree(rules, '<expr>', ['id', '+']);
    expect(tree).toBeNull();
  });

  it('returns null when start symbol has no rule', () => {
    const tree = buildParseTree(rules, '<unknown>', ['id']);
    expect(tree).toBeNull();
  });

  it('returns null when tokens are empty and grammar requires at least one', () => {
    const tree = buildParseTree(rules, '<expr>', []);
    expect(tree).toBeNull();
  });

  it('returns null when not all tokens are consumed', () => {
    const tree = buildParseTree(rules, '<term>', ['id', 'extra']);
    expect(tree).toBeNull();
  });

  it('returns null when maxDepth is exceeded', () => {
    // Grammar: <S> → a <S> | a
    // Depth counts non-terminal expansions, so maxDepth=1 allows <S> → a
    // but not <S> → a <S> → a a (which requires depth 2).
    const deep: BNFRule[] = [
      { nonTerminal: '<S>', alternatives: [['a', '<S>'], ['a']] },
    ];
    // maxDepth=1: expands <S> once, matching a single 'a' terminal
    const shallow = buildParseTree(deep, '<S>', ['a'], 1);
    expect(shallow).not.toBeNull();

    // maxDepth=1 prevents deep recursion — 5-token sequence needs depth > 1
    const tooDeep = buildParseTree(deep, '<S>', ['a', 'a', 'a', 'a', 'a'], 1);
    expect(tooDeep).toBeNull();
  });

  it('uses default maxDepth of 50 when argument is omitted', () => {
    const tree = buildParseTree(rules, '<expr>', ['id', '+', 'id']);
    expect(tree).not.toBeNull();
  });

  it('returns null for a terminal mismatch', () => {
    const tree = buildParseTree(rules, '<term>', ['xyz']);
    expect(tree).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tokenizePseudocode
// ─────────────────────────────────────────────────────────────────────────────

describe('tokenizePseudocode', () => {
  it('returns a single comment token for a comment line', () => {
    const tokens = tokenizePseudocode('// this is a comment');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.type).toBe('comment');
    expect(tokens[0]!.text).toBe('// this is a comment');
  });

  it('recognises comment after leading whitespace', () => {
    const tokens = tokenizePseudocode('// indented comment');
    expect(tokens[0]!.type).toBe('comment');
  });

  it('classifies AIMA keywords', () => {
    const keywords = ['function', 'return', 'if', 'then', 'else', 'end',
      'while', 'do', 'for', 'each', 'in', 'loop', 'repeat', 'until',
      'and', 'or', 'not', 'true', 'false', 'null', 'new', 'local'];
    for (const kw of keywords) {
      const tokens = tokenizePseudocode(kw);
      const t = tokens.find(tok => tok.text === kw);
      expect(t?.type).toBe('keyword');
    }
  });

  it('classifies ← as an operator', () => {
    const tokens = tokenizePseudocode('x ← 1');
    const op = tokens.find(t => t.text === '←');
    expect(op?.type).toBe('operator');
  });

  it('classifies := as an operator', () => {
    const tokens = tokenizePseudocode('x := 1');
    const op = tokens.find(t => t.text === ':=');
    expect(op?.type).toBe('operator');
  });

  it('classifies comparison operators', () => {
    const ops = ['=', '<', '>', '≠', '≤', '≥'];
    for (const op of ops) {
      const tokens = tokenizePseudocode(`a ${op} b`);
      const found = tokens.find(t => t.text === op);
      expect(found?.type).toBe('operator');
    }
  });

  it('classifies set operators', () => {
    const setOps = ['∈', '∉', '∪', '∩', '⊂', '⊆', '∅'];
    for (const op of setOps) {
      const tokens = tokenizePseudocode(`a ${op} b`);
      const found = tokens.find(t => t.text === op);
      expect(found?.type).toBe('operator');
    }
  });

  it('classifies arithmetic operators', () => {
    const tokens = tokenizePseudocode('a + b - c * d / e');
    const ops = tokens.filter(t => t.type === 'operator');
    expect(ops.map(t => t.text)).toEqual(['+', '-', '*', '/']);
  });

  it('classifies integer literals', () => {
    const tokens = tokenizePseudocode('x ← 42');
    const lit = tokens.find(t => t.type === 'literal');
    expect(lit?.text).toBe('42');
  });

  it('classifies decimal literals', () => {
    const tokens = tokenizePseudocode('x ← 3.14');
    const lit = tokens.find(t => t.type === 'literal');
    expect(lit?.text).toBe('3.14');
  });

  it('classifies function calls (identifier followed by opening paren)', () => {
    const tokens = tokenizePseudocode('isEmpty(frontier)');
    const fn = tokens.find(t => t.type === 'function');
    expect(fn?.text).toBe('isEmpty');
  });

  it('classifies punctuation characters', () => {
    const tokens = tokenizePseudocode('f(a, b)');
    const puncts = tokens.filter(t => t.type === 'punctuation');
    expect(puncts.map(t => t.text)).toContain('(');
    expect(puncts.map(t => t.text)).toContain(')');
    expect(puncts.map(t => t.text)).toContain(',');
  });

  it('classifies square brackets as punctuation', () => {
    const tokens = tokenizePseudocode('a[0]');
    const puncts = tokens.filter(t => t.type === 'punctuation');
    expect(puncts.map(t => t.text)).toContain('[');
    expect(puncts.map(t => t.text)).toContain(']');
  });

  it('classifies dot as punctuation', () => {
    const tokens = tokenizePseudocode('node.state');
    const puncts = tokens.filter(t => t.type === 'punctuation');
    expect(puncts.map(t => t.text)).toContain('.');
  });

  it('classifies plain identifiers as variables', () => {
    const tokens = tokenizePseudocode('frontier explored node');
    for (const tok of tokens) {
      expect(tok.type).toBe('variable');
    }
  });

  it('returns empty array for empty string', () => {
    expect(tokenizePseudocode('')).toEqual([]);
  });

  it('classifies unknown single characters as variable', () => {
    // Characters that are not operators, punctuation, letters, or digits
    const tokens = tokenizePseudocode('~');
    expect(tokens[0]!.type).toBe('variable');
  });

  it('function lookahead works when space before paren', () => {
    const tokens = tokenizePseudocode('foo (x)');
    const fn = tokens.find(t => t.text === 'foo');
    expect(fn?.type).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePseudocode
// ─────────────────────────────────────────────────────────────────────────────

describe('parsePseudocode', () => {
  it('returns empty array for empty string', () => {
    expect(parsePseudocode('')).toEqual([]);
  });

  it('parses a single line', () => {
    const lines = parsePseudocode('return x');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.lineNumber).toBe(1);
    expect(lines[0]!.indent).toBe(0);
    expect(lines[0]!.raw).toBe('return x');
  });

  it('computes indent from leading spaces', () => {
    const lines = parsePseudocode('    x ← 1');
    expect(lines[0]!.indent).toBe(4);
  });

  it('assigns 1-indexed line numbers', () => {
    const lines = parsePseudocode('a\nb\nc');
    expect(lines.map(l => l.lineNumber)).toEqual([1, 2, 3]);
  });

  it('preserves raw line before trimming', () => {
    const lines = parsePseudocode('  indented line');
    expect(lines[0]!.raw).toBe('  indented line');
  });

  it('tokenises the trimmed line', () => {
    const lines = parsePseudocode('  return x');
    expect(lines[0]!.tokens.some(t => t.type === 'keyword' && t.text === 'return')).toBe(true);
  });

  it('handles multiple lines including blank lines', () => {
    const lines = parsePseudocode('a\n\nc');
    expect(lines).toHaveLength(3);
    expect(lines[1]!.tokens).toEqual([]);
    expect(lines[1]!.indent).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tracePseudocode
// ─────────────────────────────────────────────────────────────────────────────

describe('tracePseudocode', () => {
  it('returns empty array for empty lines', () => {
    expect(tracePseudocode([], {})).toEqual([]);
  });

  it('emits one snapshot per line with correct lineNumber', () => {
    const lines = parsePseudocode('x ← 1\ny ← 2\nreturn x');
    const trace = tracePseudocode(lines, { x: 0, y: 0 });
    expect(trace).toHaveLength(3);
    expect(trace[0]!.lineNumber).toBe(1);
    expect(trace[1]!.lineNumber).toBe(2);
    expect(trace[2]!.lineNumber).toBe(3);
  });

  it('includes a shallow copy of variables at each line', () => {
    const lines = parsePseudocode('a\nb');
    const vars = { count: 5 };
    const trace = tracePseudocode(lines, vars);
    expect(trace[0]!.variableSnapshot).toEqual({ count: 5 });
    expect(trace[1]!.variableSnapshot).toEqual({ count: 5 });
    // Shallow copy — modifying original should not affect snapshots
    vars.count = 99;
    expect(trace[0]!.variableSnapshot.count).toBe(5);
  });

  it('does not mutate the input variables', () => {
    const lines = parsePseudocode('x ← 1');
    const vars: Record<string, unknown> = { x: 0 };
    tracePseudocode(lines, vars);
    expect(vars.x).toBe(0);
  });

  it('snapshots are independent copies', () => {
    const lines = parsePseudocode('a\nb\nc');
    const trace = tracePseudocode(lines, { v: 1 });
    // Mutating one snapshot should not affect another
    (trace[0]!.variableSnapshot as Record<string, unknown>).v = 999;
    expect(trace[1]!.variableSnapshot.v).toBe(1);
  });
});
