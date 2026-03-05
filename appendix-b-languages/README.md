# Appendix B — Notes on Languages and Algorithms

Interactive visualizations for **Appendix B** of *AI: A Modern Approach, 4th Ed.* (Russell & Norvig), covering the BNF grammar notation and pseudocode conventions used throughout the textbook.

**URL:** `/appendix-b`

---

## Sections

### §B.1 — Defining Languages with BNF

An interactive BNF grammar explorer:

- **Grammar editor** — edit any BNF grammar; non-terminals and terminals are automatically extracted and colour-coded.
- **Step-by-step derivation** — watch how a sentential form is derived by repeatedly replacing non-terminals.
- **String generator** — generate a terminal string from the grammar using a deterministic LCG-seeded strategy.
- **Parse tree builder** — enter a space-separated token string and see a full recursive-descent parse tree.

### §B.2 — Describing Algorithms with Pseudocode

A live pseudocode tokeniser and highlighter:

- **Source editor** — paste any AIMA-style pseudocode.
- **Highlighted output** — each token is colour-coded: keywords, variables, operators, functions, literals, comments.
- **Token inspector** — hover a line to see every token with its type label.

### Reference

- Token type quick-reference card with live examples.
- BNF notation summary table.

---

## Algorithm Functions (`src/algorithms/index.ts`)

| Function | Description |
|---|---|
| `parseBNF(input)` | Parse a BNF grammar string into `BNFRule[]` |
| `isNonTerminal(symbol)` | True if symbol is angle-bracketed |
| `getNonTerminals(rules)` | Deduplicated list of LHS non-terminals |
| `getTerminals(rules)` | Deduplicated list of terminal symbols |
| `deriveOneStep(rules, form, idx, altIdx)` | Apply one derivation step |
| `generateString(rules, start, maxDepth, seed?)` | Generate a terminal string with LCG seeding |
| `buildParseTree(rules, start, tokens, maxDepth?)` | Recursive-descent parse tree |
| `tokenizePseudocode(line)` | Tokenise one pseudocode line |
| `parsePseudocode(source)` | Parse full pseudocode source into lines |
| `tracePseudocode(lines, variables)` | Emit per-line variable snapshots |

---

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # run Vitest tests
npm run build     # production build
```

Test coverage is enforced at **100% branch + line** for all algorithm functions.
