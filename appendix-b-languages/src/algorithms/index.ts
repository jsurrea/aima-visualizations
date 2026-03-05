/**
 * src/algorithms/index.ts
 *
 * Pure algorithm functions for Appendix B — Notes on Languages and Algorithms.
 * Covers BNF grammar parsing/derivation and pseudocode tokenisation/tracing.
 *
 * All functions are pure with no side effects and no mutation of inputs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// B.1  BNF Grammar
// ─────────────────────────────────────────────────────────────────────────────

/** A BNF production rule: a non-terminal maps to an array of alternatives. */
export interface BNFRule {
  nonTerminal: string;
  /** Each alternative is a sequence of symbols (terminals or non-terminals). */
  alternatives: string[][];
}

/** A node in a parse tree. */
export interface ParseTreeNode {
  symbol: string;
  isTerminal: boolean;
  children: ParseTreeNode[];
}

/**
 * Parse a BNF grammar string into an array of {@link BNFRule} objects.
 *
 * Format: each non-blank, non-comment line is
 *   `<NonTerminal> ::= alt1 sym … | alt2 sym … | …`
 *
 * Symbols are separated by spaces.  Angle-bracket tokens like `<X>` are
 * non-terminals; everything else is a terminal.
 * Blank lines and lines whose first non-whitespace character is `#` are skipped.
 *
 * @example
 * parseBNF('<expr> ::= <term> + <expr> | <term>\n<term> ::= id | ( <expr> )')
 */
export function parseBNF(input: string): BNFRule[] {
  const rules: BNFRule[] = [];

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const sepIdx = line.indexOf('::=');
    if (sepIdx === -1) continue;

    const nonTerminal = line.slice(0, sepIdx).trim();
    const rhs = line.slice(sepIdx + 3);

    const alternatives = rhs
      .split('|')
      .map(alt => alt.trim().split(/\s+/).filter(s => s !== ''));

    rules.push({ nonTerminal, alternatives });
  }

  return rules;
}

/**
 * Return `true` if `symbol` is a non-terminal (wrapped in `<` and `>`).
 *
 * @example
 * isNonTerminal('<expr>')  // true
 * isNonTerminal('id')      // false
 */
export function isNonTerminal(symbol: string): boolean {
  return symbol.length >= 3 && symbol.startsWith('<') && symbol.endsWith('>');
}

/**
 * Return a deduplicated list of all non-terminal symbols defined as the
 * left-hand side of at least one rule.
 */
export function getNonTerminals(rules: ReadonlyArray<BNFRule>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rule of rules) {
    if (!seen.has(rule.nonTerminal)) {
      seen.add(rule.nonTerminal);
      result.push(rule.nonTerminal);
    }
  }
  return result;
}

/**
 * Return a deduplicated list of terminal symbols that appear in any alternative
 * of any rule (i.e. symbols that are NOT non-terminals as defined by
 * {@link isNonTerminal}).
 */
export function getTerminals(rules: ReadonlyArray<BNFRule>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rule of rules) {
    for (const alt of rule.alternatives) {
      for (const sym of alt) {
        if (!isNonTerminal(sym) && !seen.has(sym)) {
          seen.add(sym);
          result.push(sym);
        }
      }
    }
  }
  return result;
}

/**
 * Apply one BNF derivation step.
 *
 * Replace the symbol at `targetIndex` in `sententialForm` with
 * `rules[ruleIndex].alternatives[alternativeIndex]`.
 *
 * @throws {RangeError} if `targetIndex` is out of range.
 * @throws {TypeError} if the symbol at `targetIndex` is a terminal.
 */
export function deriveOneStep(
  rules: ReadonlyArray<BNFRule>,
  sententialForm: ReadonlyArray<string>,
  targetIndex: number,
  alternativeIndex: number,
): string[] {
  if (targetIndex < 0 || targetIndex >= sententialForm.length) {
    throw new RangeError(
      `targetIndex ${targetIndex} is out of range for sentential form of length ${sententialForm.length}`,
    );
  }

  const symbol = sententialForm[targetIndex]!;

  if (!isNonTerminal(symbol!)) {
    throw new TypeError(`Symbol "${symbol}" at index ${targetIndex} is a terminal; cannot derive.`);
  }

  const rule = rules.find(r => r.nonTerminal === symbol);
  const replacement = rule?.alternatives[alternativeIndex] ?? [];

  return [
    ...sententialForm.slice(0, targetIndex),
    ...replacement,
    ...sententialForm.slice(targetIndex + 1),
  ];
}

// ─── Linear Congruential Generator (deterministic pseudo-random) ──────────────

/** Parameters for a simple LCG (same as glibc). */
const LCG_A = 1103515245;
const LCG_C = 12345;
const LCG_M = 2 ** 31;

function lcgNext(seed: number): number {
  return (LCG_A * seed + LCG_C) % LCG_M;
}

/**
 * Generate a terminal string from a BNF grammar using a deterministic
 * pseudo-random strategy.
 *
 * Starting from `[startSymbol]`, the generator repeatedly expands the
 * **first** non-terminal in the current sentential form.  At each step it
 * prefers an alternative whose **first symbol** is a terminal or a different
 * non-terminal (greedy non-recursive choice).  If all alternatives would
 * recurse immediately, it picks based on the LCG seed.
 *
 * Returns `null` if:
 * - `startSymbol` is not defined in `rules`, or
 * - the derivation exceeds `maxDepth` expansion steps.
 *
 * @param seed - Initial seed for the LCG (default 42).
 */
export function generateString(
  rules: ReadonlyArray<BNFRule>,
  startSymbol: string,
  maxDepth: number,
  seed = 42,
): string[] | null {
  const definedNTs = new Set(rules.map(r => r.nonTerminal));

  if (!definedNTs.has(startSymbol)) return null;

  let form: string[] = [startSymbol];
  let currentSeed = seed;
  let steps = 0;

  while (true) {
    const ntIdx = form.findIndex(s => isNonTerminal(s));
    if (ntIdx === -1) return form; // all terminals — done

    if (steps >= maxDepth) return null;
    steps++;

    const symbol = form[ntIdx]!;
    const rule = rules.find(r => r.nonTerminal === symbol);
    if (!rule) return null;

    // Prefer a non-recursive alternative (first symbol differs from `symbol`)
    const nonRecursiveAlts = rule.alternatives.filter(
      alt => alt.length === 0 || alt[0] !== symbol,
    );

    let chosen: string[];
    if (nonRecursiveAlts.length > 0) {
      const idx = currentSeed % nonRecursiveAlts.length;
      chosen = nonRecursiveAlts[idx]!;
    } else {
      const idx = currentSeed % rule.alternatives.length;
      chosen = rule.alternatives[idx]!;
    }

    currentSeed = lcgNext(currentSeed);

    form = [
      ...form.slice(0, ntIdx),
      ...chosen,
      ...form.slice(ntIdx + 1),
    ];
  }
}

/**
 * Attempt to build a parse tree for `tokens` given the grammar `rules`,
 * starting from `startSymbol`.
 *
 * Uses simple recursive descent — tries each alternative in order and
 * backtracks on failure.
 *
 * Returns `null` if no parse succeeds or if `maxDepth` is exceeded.
 *
 * @param maxDepth - Maximum recursion depth (default 50).
 */
export function buildParseTree(
  rules: ReadonlyArray<BNFRule>,
  startSymbol: string,
  tokens: string[],
  maxDepth = 50,
): ParseTreeNode | null {
  /**
   * Try to match `symbol` against `tokens[pos..]`.
   * Returns `[node, newPos]` on success, or `null` on failure.
   */
  function parse(
    symbol: string,
    pos: number,
    depth: number,
  ): [ParseTreeNode, number] | null {
    if (depth > maxDepth) return null;

    if (!isNonTerminal(symbol)) {
      // Terminal: must match the next token exactly.
      if (pos < tokens.length && tokens[pos] === symbol) {
        return [{ symbol, isTerminal: true, children: [] }, pos + 1];
      }
      return null;
    }

    // Non-terminal: find the rule and try each alternative.
    const rule = rules.find(r => r.nonTerminal === symbol);
    if (!rule) return null;

    for (const alt of rule.alternatives) {
      const children: ParseTreeNode[] = [];
      let cur = pos;
      let ok = true;

      for (const sym of alt) {
        const res = parse(sym, cur, depth + 1);
        if (!res) { ok = false; break; }
        children.push(res[0]);
        cur = res[1];
      }

      if (ok) {
        return [{ symbol, isTerminal: false, children }, cur];
      }
    }

    return null;
  }

  const result = parse(startSymbol, 0, 0);
  if (!result) return null;

  const [node, consumed] = result;
  // All tokens must be consumed for a valid parse.
  if (consumed !== tokens.length) return null;

  return node;
}

// ─────────────────────────────────────────────────────────────────────────────
// B.2  Pseudocode Conventions
// ─────────────────────────────────────────────────────────────────────────────

/** A pseudocode token with its type and annotation. */
export interface PseudocodeToken {
  text: string;
  type: 'keyword' | 'variable' | 'operator' | 'comment' | 'literal' | 'function' | 'punctuation';
}

/** A single pseudocode line with tokens. */
export interface PseudocodeLine {
  lineNumber: number;
  indent: number;
  tokens: PseudocodeToken[];
  raw: string;
}

/** AIMA pseudocode keywords (case-sensitive). */
const KEYWORDS = new Set([
  'function', 'return', 'if', 'then', 'else', 'end',
  'while', 'do', 'for', 'each', 'in', 'loop',
  'repeat', 'until', 'and', 'or', 'not',
  'true', 'false', 'null', 'new', 'local',
]);

/** Operator characters/strings (multi-char checked first). */
const MULTI_CHAR_OPERATORS = ['←', ':=', '≠', '≤', '≥', '∈', '∉', '∪', '∩', '⊂', '⊆', '∅'];
const SINGLE_CHAR_OPERATORS = new Set(['=', '<', '>', '+', '-', '*', '/']);

const PUNCTUATION_CHARS = new Set(['[', ']', '(', ')', ',', '.']);

/**
 * Tokenise a single pseudocode line (leading whitespace already stripped).
 *
 * Rules (applied in order):
 * 1. If the trimmed line starts with `//`, the whole line is a single `comment` token.
 * 2. Multi-character operators (`←`, `:=`, `≠`, …) → `operator`.
 * 3. Punctuation characters → `punctuation`.
 * 4. Single-character operators → `operator`.
 * 5. Numeric literals (integer or decimal) → `literal`.
 * 6. Identifiers: if the word is an AIMA keyword → `keyword`;
 *    if the next non-space character after the word is `(` → `function`;
 *    otherwise → `variable`.
 * 7. Remaining single characters → `variable`.
 */
export function tokenizePseudocode(line: string): PseudocodeToken[] {
  const trimmed = line.trimStart();

  if (trimmed.startsWith('//')) {
    return [{ text: trimmed, type: 'comment' }];
  }

  const tokens: PseudocodeToken[] = [];
  let i = 0;

  while (i < trimmed.length) {
    // Skip spaces
    if (trimmed[i] === ' ' || trimmed[i] === '\t') {
      i++;
      continue;
    }

    // Multi-char operators
    const multiOp = MULTI_CHAR_OPERATORS.find(op => trimmed.startsWith(op, i));
    if (multiOp) {
      tokens.push({ text: multiOp, type: 'operator' });
      i += multiOp.length;
      continue;
    }

    // Punctuation
    const ch = trimmed[i]!;
    if (PUNCTUATION_CHARS.has(ch)) {
      tokens.push({ text: ch, type: 'punctuation' });
      i++;
      continue;
    }

    // Single-char operators
    if (SINGLE_CHAR_OPERATORS.has(ch)) {
      tokens.push({ text: ch, type: 'operator' });
      i++;
      continue;
    }

    // Numeric literal
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < trimmed.length && /[0-9.]/.test(trimmed[i]!)) {
        num += trimmed[i]!;
        i++;
      }
      tokens.push({ text: num, type: 'literal' });
      continue;
    }

    // Identifier / keyword / function
    if (/[A-Za-z_]/.test(ch)) {
      let word = '';
      while (i < trimmed.length && /[A-Za-z0-9_]/.test(trimmed[i]!)) {
        word += trimmed[i]!;
        i++;
      }

      if (KEYWORDS.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else {
        // Look ahead past spaces for '('
        let j = i;
        while (j < trimmed.length && (trimmed[j] === ' ' || trimmed[j] === '\t')) j++;
        if (j < trimmed.length && trimmed[j] === '(') {
          tokens.push({ text: word, type: 'function' });
        } else {
          tokens.push({ text: word, type: 'variable' });
        }
      }
      continue;
    }

    // Fallback: single character as variable
    tokens.push({ text: ch, type: 'variable' });
    i++;
  }

  return tokens;
}

/**
 * Parse a full pseudocode source string into an array of {@link PseudocodeLine}.
 *
 * Lines are split on `\n`.  For each line:
 * - `indent` = number of leading spaces.
 * - `tokens` = result of {@link tokenizePseudocode} applied to the trimmed line.
 * - `lineNumber` is 1-indexed.
 * - `raw` preserves the original line (before trimming).
 */
export function parsePseudocode(source: string): PseudocodeLine[] {
  if (source === '') return [];

  return source.split('\n').map((raw, idx) => {
    const indent = raw.length - raw.trimStart().length;
    return {
      lineNumber: idx + 1,
      indent,
      tokens: tokenizePseudocode(raw.trimStart()),
      raw,
    };
  });
}

/**
 * Create a simple execution trace for a pseudocode listing.
 *
 * For each line in `lines`, emits a record with `lineNumber` and a **shallow
 * copy** of `variables`.  Does not actually execute the pseudocode.
 *
 * @param lines     - Parsed pseudocode lines.
 * @param variables - Initial variable bindings to snapshot at each line.
 */
export function tracePseudocode(
  lines: ReadonlyArray<PseudocodeLine>,
  variables: Record<string, unknown>,
): Array<{ lineNumber: number; variableSnapshot: Record<string, unknown> }> {
  return lines.map(line => ({
    lineNumber: line.lineNumber,
    variableSnapshot: { ...variables },
  }));
}
