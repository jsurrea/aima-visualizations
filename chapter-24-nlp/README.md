# Chapter 24 — Natural Language Processing

**Part 6: Communicating, Perceiving, and Acting**

Interactive visualizations of N-gram models, CYK parsing, Viterbi POS tagging, Naive Bayes
classification, augmented grammar agreement, ambiguity, and NLP tasks.

---

## Visualizations

### §24.1 — N-gram Language Model (`#ngram`)
Editable corpus, unigram/bigram/trigram model building, n-gram probability table (MLE),
Laplace smoothing, linear interpolation, sentence probability (chain rule), and a side-by-side
smoothing comparison bar chart. "What-if" panel compares the same query under n=1/2/3.

### §24.1 — Text Classification: Naive Bayes (`#text-classification`)
Pre-built sentiment corpus (Wumpus-world themed), step-by-step log-prior + log-likelihood
accumulation, live SVG score bars, top-10 discriminative words per class, and a "what-if"
panel for adding new training documents and re-running classification in real time.

### §24.1 — POS Tagging: Viterbi HMM (`#pos-tagging`)
Hand-crafted HMM (DT/NN/VB/JJ/RB), SVG Viterbi trellis with backpointer edges, column-by-
column reveal with playback controls, best-path highlighting in amber, and a state panel
showing per-tag scores at each step.

### §24.2–24.3 — CYK Chart Parser (`#cyk`)
E0 PCFG grammar reference, n×n chart grid filled step-by-step (lexical → unary → binary
phases), SVG parse tree with colour-coded non-terminals and word leaves, 5 preset sentences
including a "no parse found" demo, and a KaTeX CYK recurrence formula.

### §24.4 — Augmented Grammar Agreement (`#agreement`)
Subject-verb agreement checker with live ✅/❌ feedback and feature badges (case, person-
number), pronoun feature table, full 6×9 agreement matrix, Wumpus-world error examples, and
a sentence builder that underlines agreement violations in red.

### §24.5 — Ambiguity in Natural Language (`#ambiguity`)
Seven annotated ambiguity examples (lexical, syntactic, semantic, pragmatic, referential)
with type-filter bar, expandable readings and explanations, SVG donut chart of type breakdown,
interactive PP-attachment tree toggle, and live pronoun-reference resolver.

### §24.6 — NLP Tasks Overview (`#nlp-tasks`)
SVG pipeline diagram (Speech → Text → NER/IE → QA/MT → Application), task cards for six
canonical NLP tasks with interactive "Try it" panels (live NER span highlighting, sentiment
keyword scoring, animated step-through for others), and a comparison table.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (141 tests, 100% branch+line coverage)
npm test -- --run --coverage

# Build for production (bundle well under 500 KB gzipped)
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/chapter-24/`)
- **Vitest** for unit testing (100% coverage on `src/algorithms/`)
- **KaTeX** for all mathematical notation

All algorithm logic lives in `src/algorithms/index.ts` as pure functions with zero
side effects. Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-24/viz-name`
