/**
 * Chapter 24 — Natural Language Processing
 *
 * Pure algorithm functions covering:
 *   §24.1  Language Models — n-grams, Laplace smoothing, linear interpolation
 *   §24.1  Bag-of-words Naive Bayes text classification
 *   §24.1  POS tagging via Viterbi / HMM
 *   §24.2–3 PCFG grammar and CYK probabilistic chart parser
 *   §24.4  Augmented grammars — case/number agreement checking
 *   §24.5  Ambiguity examples (lexical, syntactic, semantic, pragmatic)
 *   §24.6  NLP task catalogue
 *
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Includes a JSDoc comment with @param, @returns, and @complexity tags
 *   - Has 100% branch + line coverage in the corresponding test file
 *
 * @module algorithms
 */

// ─── §24.1: N-Gram Language Models ───────────────────────────────────────────

/**
 * An n-gram language model storing raw occurrence counts and vocabulary.
 *
 * For n=1 (unigram):
 *   - `counts` maps each word to its frequency.
 *   - `contextCounts` has exactly one entry: `""` → `totalTokens`.
 *
 * For n≥2:
 *   - `counts` maps each n-gram (words joined by a single space) to its frequency.
 *   - `contextCounts` maps each (n-1)-gram context string to the total number of
 *     times that context was observed (the MLE denominator).
 */
export interface NGramModel {
  /** Order of the model: 1=unigram, 2=bigram, 3=trigram, … */
  n: number;
  /** Map from n-gram key (words joined by " ") to raw frequency count. */
  counts: ReadonlyMap<string, number>;
  /** Map from (n-1)-gram context key to denominator count. For unigrams, "" → totalTokens. */
  contextCounts: ReadonlyMap<string, number>;
  /** Set of all distinct word types seen during training. */
  vocabulary: ReadonlySet<string>;
  /** Total number of word tokens in the training corpus. */
  totalTokens: number;
}

/**
 * One probability entry produced during n-gram step-by-step inspection.
 */
export interface NGramStep {
  /** The n-gram as a single string (words joined by " "). */
  ngram: string;
  /** Raw co-occurrence count from the training corpus. */
  count: number;
  /** Context count used as the MLE denominator. */
  contextCount: number;
  /** Maximum-likelihood probability = count / contextCount. */
  probability: number;
}

/**
 * Builds an n-gram language model from a token sequence.
 *
 * Slides a window of width `n` across `tokens` to accumulate n-gram counts.
 * For n=1 the `contextCounts` map holds the single entry `""` → `totalTokens`.
 *
 * @param tokens - Input token sequence (may be empty).
 * @param n - Order of the n-gram model (clamped to ≥1).
 * @returns An immutable NGramModel.
 * @complexity O(T) where T = tokens.length
 */
export function buildNGramModel(
  tokens: ReadonlyArray<string>,
  n: number,
): NGramModel {
  const order = Math.max(1, Math.floor(n));
  const counts = new Map<string, number>();
  const contextCounts = new Map<string, number>();
  const vocabulary = new Set<string>();

  for (const token of tokens) {
    vocabulary.add(token);
  }

  const totalTokens = tokens.length;

  if (order === 1) {
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    contextCounts.set('', totalTokens);
  } else {
    for (let i = 0; i <= tokens.length - order; i++) {
      const ngram = tokens.slice(i, i + order).join(' ');
      counts.set(ngram, (counts.get(ngram) ?? 0) + 1);
      const context = tokens.slice(i, i + order - 1).join(' ');
      contextCounts.set(context, (contextCounts.get(context) ?? 0) + 1);
    }
  }

  return { n: order, counts, contextCounts, vocabulary, totalTokens };
}

/**
 * Returns the maximum-likelihood probability P(wₙ | w₁…wₙ₋₁) for an n-gram.
 *
 * For unigrams: P(w) = count(w) / totalTokens.
 * For higher orders: P(wₙ|ctx) = count(ctx wₙ) / count(ctx).
 * Returns 0 for any unseen n-gram or context.
 *
 * @param model - The trained n-gram model.
 * @param ngram - Words of the n-gram (length must equal model.n).
 * @returns Probability in [0, 1].
 * @complexity O(1)
 */
export function ngramProbability(
  model: NGramModel,
  ngram: ReadonlyArray<string>,
): number {
  if (ngram.length !== model.n) return 0;

  const key = ngram.join(' ');
  const count = model.counts.get(key) ?? 0;
  if (count === 0) return 0;

  if (model.n === 1) {
    return model.totalTokens === 0 ? 0 : count / model.totalTokens;
  }

  const context = ngram.slice(0, model.n - 1).join(' ');
  const contextCount = model.contextCounts.get(context) ?? 0;
  return contextCount === 0 ? 0 : count / contextCount;
}

/**
 * Returns the Laplace (add-α) smoothed probability for an n-gram.
 *
 * P_smooth(wₙ | ctx) = (count(ctx wₙ) + α) / (count(ctx) + α · |V|)
 *
 * Avoids zero probabilities for n-grams unseen during training.
 *
 * @param model - The trained n-gram model.
 * @param ngram - Words of the n-gram (length must equal model.n).
 * @param alpha - Smoothing pseudo-count (default 1.0 for add-one smoothing).
 * @returns Smoothed probability in (0, 1].
 * @complexity O(1)
 */
export function laplaceSmoothedProbability(
  model: NGramModel,
  ngram: ReadonlyArray<string>,
  alpha = 1,
): number {
  if (ngram.length !== model.n) return 0;
  const V = model.vocabulary.size;
  if (V === 0) return 0;

  const key = ngram.join(' ');
  const count = model.counts.get(key) ?? 0;

  if (model.n === 1) {
    return (count + alpha) / (model.totalTokens + alpha * V);
  }

  const context = ngram.slice(0, model.n - 1).join(' ');
  const contextCount = model.contextCounts.get(context) ?? 0;
  return (count + alpha) / (contextCount + alpha * V);
}

/**
 * Computes the linearly interpolated probability of the trigram [w₀, w₁, w₂].
 *
 * P_interp = λ₃·P_tri(w₂|w₀,w₁) + λ₂·P_bi(w₂|w₁) + λ₁·P_uni(w₂)
 * with fixed weights λ₃=0.70, λ₂=0.20, λ₁=0.10 (sum to 1).
 *
 * @param unigram - Trained unigram model.
 * @param bigram  - Trained bigram model.
 * @param trigram - Trained trigram model.
 * @param words   - Exactly 3 tokens: [w₀, w₁, w₂].
 * @returns Interpolated probability in [0, 1].
 * @complexity O(1)
 */
export function linearInterpolationProbability(
  unigram: NGramModel,
  bigram: NGramModel,
  trigram: NGramModel,
  words: ReadonlyArray<string>,
): number {
  if (words.length !== 3) return 0;

  const w0 = words[0]!;
  const w1 = words[1]!;
  const w2 = words[2]!;

  const p3 = ngramProbability(trigram, [w0, w1, w2]);
  const p2 = ngramProbability(bigram, [w1, w2]);
  const p1 = ngramProbability(unigram, [w2]);

  return 0.70 * p3 + 0.20 * p2 + 0.10 * p1;
}

/**
 * Computes the probability of a token sequence under an n-gram model.
 *
 * Uses the chain rule: P(w₁…wₘ) = ∏ P(wᵢ | context).
 * For n=1 this is the product of unigram probabilities.
 * Returns 0 if any factor is 0 (when `smoothed` is false).
 *
 * @param model    - The trained n-gram model.
 * @param tokens   - The sentence tokens.
 * @param smoothed - If true, use Laplace smoothing (α=1) to avoid zero probabilities.
 * @returns Sentence probability ≥ 0.
 * @complexity O(T) where T = tokens.length
 */
export function sentenceProbability(
  model: NGramModel,
  tokens: ReadonlyArray<string>,
  smoothed = false,
): number {
  if (tokens.length === 0) return 0;
  if (model.n > 1 && model.n > tokens.length) return 0;

  const probFn = smoothed ? laplaceSmoothedProbability : ngramProbability;
  let probability = 1;

  if (model.n === 1) {
    for (const token of tokens) {
      probability *= probFn(model, [token]);
      if (probability === 0) return 0;
    }
    return probability;
  }

  for (let i = 0; i <= tokens.length - model.n; i++) {
    const gram = tokens.slice(i, i + model.n);
    const p = probFn(model, gram);
    probability *= p;
    if (probability === 0) return 0;
  }
  return probability;
}

/**
 * Produces a per-n-gram breakdown of counts and probabilities for visualization.
 *
 * @param model  - The trained n-gram model.
 * @param tokens - Input token sequence.
 * @returns One NGramStep per n-gram window found in `tokens`.
 * @complexity O(T) where T = tokens.length
 */
export function getNGramSteps(
  model: NGramModel,
  tokens: ReadonlyArray<string>,
): ReadonlyArray<NGramStep> {
  const steps: NGramStep[] = [];

  if (model.n === 1) {
    for (const token of tokens) {
      const count = model.counts.get(token) ?? 0;
      steps.push({
        ngram: token,
        count,
        contextCount: model.totalTokens,
        probability: model.totalTokens === 0 ? 0 : count / model.totalTokens,
      });
    }
    return steps;
  }

  for (let i = 0; i <= tokens.length - model.n; i++) {
    const slice = tokens.slice(i, i + model.n);
    const ngram = slice.join(' ');
    const context = slice.slice(0, model.n - 1).join(' ');
    const count = model.counts.get(ngram) ?? 0;
    const contextCount = model.contextCounts.get(context) ?? 0;
    steps.push({
      ngram,
      count,
      contextCount,
      probability: contextCount === 0 ? 0 : count / contextCount,
    });
  }
  return steps;
}

// ─── §24.1: Naive Bayes Text Classification ──────────────────────────────────

/**
 * A trained Naive Bayes bag-of-words classifier.
 */
export interface NaiveBayesModel {
  /** Ordered list of class labels seen during training. */
  labels: ReadonlyArray<string>;
  /** Log prior probability for each label: log P(label). */
  logPriors: ReadonlyMap<string, number>;
  /** Per-label log-likelihoods (Laplace-smoothed): label → word → log P(word|label). */
  logLikelihoods: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Vocabulary of all word types seen during training. */
  vocabulary: ReadonlySet<string>;
  /** Total word token count per label (denominator before smoothing). */
  wordCounts: ReadonlyMap<string, number>;
}

/** A text document paired with a class label for supervised training. */
export interface LabeledDocument {
  /** Raw text of the document. */
  text: string;
  /** Class label. */
  label: string;
}

/**
 * Tokenizes a string to lowercase alphabetic words.
 * Non-alphabetic characters are treated as delimiters.
 *
 * @param text - Input string.
 * @returns Array of lowercase word tokens, empty strings removed.
 * @complexity O(|text|)
 */
function tokenize(text: string): ReadonlyArray<string> {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 0);
}

/**
 * Trains a Naive Bayes bag-of-words classifier on a labeled corpus.
 *
 * Uses Laplace (add-1) smoothing so every vocabulary word has a positive
 * log-likelihood under every class.
 *
 * @param corpus - Array of labeled documents (empty corpus yields an empty model).
 * @returns A trained NaiveBayesModel.
 * @complexity O(D · W) where D = |corpus|, W = average words per document
 */
export function trainNaiveBayes(
  corpus: ReadonlyArray<LabeledDocument>,
): NaiveBayesModel {
  const vocabulary = new Set<string>();
  const labelDocCounts = new Map<string, number>();
  const labelWordFreqs = new Map<string, Map<string, number>>();
  const labelWordTotals = new Map<string, number>();

  for (const doc of corpus) {
    labelDocCounts.set(doc.label, (labelDocCounts.get(doc.label) ?? 0) + 1);
    if (!labelWordFreqs.has(doc.label)) {
      labelWordFreqs.set(doc.label, new Map());
    }
    const freqs = labelWordFreqs.get(doc.label)!;
    for (const word of tokenize(doc.text)) {
      vocabulary.add(word);
      freqs.set(word, (freqs.get(word) ?? 0) + 1);
      labelWordTotals.set(doc.label, (labelWordTotals.get(doc.label) ?? 0) + 1);
    }
  }

  const totalDocs = corpus.length;
  const labels = Array.from(labelDocCounts.keys());
  const V = vocabulary.size;

  const logPriors = new Map<string, number>();
  for (const label of labels) {
    // `labels` was built from labelDocCounts.keys(), so get() is always defined.
    const docCount = labelDocCounts.get(label)!;
    logPriors.set(label, Math.log(docCount / Math.max(1, totalDocs)));
  }

  const logLikelihoods = new Map<string, ReadonlyMap<string, number>>();
  for (const label of labels) {
    // Both maps were populated for every label in the same loop above.
    const freqs = labelWordFreqs.get(label)!;
    const total = labelWordTotals.get(label)!;
    const llMap = new Map<string, number>();
    for (const word of vocabulary) {
      const count = freqs.get(word) ?? 0;
      llMap.set(word, Math.log((count + 1) / (total + V)));
    }
    logLikelihoods.set(label, llMap);
  }

  return {
    labels,
    logPriors,
    logLikelihoods,
    vocabulary,
    wordCounts: labelWordTotals,
  };
}

/**
 * Classifies a text document using a trained Naive Bayes model.
 *
 * Computes argmax_c [ log P(c) + Σ_{w∈doc} log P(w|c) ] over all labels.
 * Words absent from the training vocabulary contribute 0 to the score.
 *
 * @param model - A trained NaiveBayesModel.
 * @param text  - The document text to classify.
 * @returns The predicted class label, or "" if the model has no labels.
 * @complexity O(|labels| · |words in text|)
 */
export function classifyText(model: NaiveBayesModel, text: string): string {
  if (model.labels.length === 0) return '';

  const words = tokenize(text);
  let bestLabel = model.labels[0]!;
  let bestScore = -Infinity;

  for (const label of model.labels) {
    // `model.labels` was built from logPriors.keys() in trainNaiveBayes.
    const logPrior = model.logPriors.get(label)!;
    // `logLikelihoods` has an entry for every label in model.labels.
    const llMap = model.logLikelihoods.get(label)!;
    let score = logPrior;

    for (const word of words) {
      const ll = llMap.get(word);
      if (ll !== undefined) {
        score += ll;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }

  return bestLabel;
}

// ─── §24.1: HMM POS Tagging with Viterbi ─────────────────────────────────────

/**
 * A Hidden Markov Model for sequence labeling (e.g., part-of-speech tagging).
 *
 * Probabilities follow the standard HMM parameterisation:
 *   - initial:    P(tag at position 1)
 *   - transition: P(tagₜ | tagₜ₋₁)
 *   - emission:   P(word | tag)
 */
export interface HMMModel {
  /** POS tag set (hidden states). */
  states: ReadonlyArray<string>;
  /** Word vocabulary (observations). */
  observations: ReadonlyArray<string>;
  /** Initial (π) probabilities: tag → P(tag as first tag). */
  initial: ReadonlyMap<string, number>;
  /** Transition probabilities: prevTag → (tag → P(tag | prevTag)). */
  transition: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Emission probabilities: tag → (word → P(word | tag)). */
  emission: ReadonlyMap<string, ReadonlyMap<string, number>>;
}

/**
 * One cell of the Viterbi trellis, representing (word position, POS tag).
 */
export interface ViterbiStep {
  /** Word at this position. */
  word: string;
  /** POS tag for this cell. */
  tag: string;
  /** Viterbi (max-product) probability of the best path ending at this cell. */
  probability: number;
  /** POS tag of the previous cell on the best path, or null at position 0. */
  backpointer: string | null;
}

/**
 * Runs the Viterbi algorithm on a sentence using an HMM and returns the full
 * trellis as a flat row-major array (one ViterbiStep per position × tag pair).
 *
 * Computes:
 *   δ[i][t] = max_{t'} δ[i-1][t'] · P(t|t') · P(wᵢ|t)
 *
 * Uses log-space arithmetic to avoid floating-point underflow.
 * Pass the result to `bestTagSequence` to recover the optimal labelling.
 *
 * @param model - The HMM model.
 * @param words - Input sentence tokens.
 * @returns Flat array of ViterbiStep (length = words.length × states.length).
 *          Returns [] if either array is empty.
 * @complexity O(T · S²) where T = words.length, S = |states|
 */
export function viterbiPOSTagger(
  model: HMMModel,
  words: ReadonlyArray<string>,
): ReadonlyArray<ViterbiStep> {
  if (words.length === 0 || model.states.length === 0) return [];

  const T = words.length;
  const states = model.states;
  const S = states.length;

  const viterbi: number[][] = Array.from({ length: T }, () =>
    new Array<number>(S).fill(-Infinity),
  );
  const bp: (number | null)[][] = Array.from({ length: T }, () =>
    new Array<number | null>(S).fill(null),
  );

  // ── Initialisation ──────────────────────────────────────────────────────
  const word0 = words[0]!;
  for (let s = 0; s < S; s++) {
    const tag = states[s]!;
    const initProb = model.initial.get(tag) ?? 0;
    const emitProb = model.emission.get(tag)?.get(word0) ?? 0;
    if (initProb > 0 && emitProb > 0) {
      viterbi[0]![s] = Math.log(initProb) + Math.log(emitProb);
    }
  }

  // ── Recursion ────────────────────────────────────────────────────────────
  for (let i = 1; i < T; i++) {
    const word = words[i]!;
    for (let s = 0; s < S; s++) {
      const tag = states[s]!;
      const emitProb = model.emission.get(tag)?.get(word) ?? 0;
      if (emitProb === 0) continue;

      const logEmit = Math.log(emitProb);
      let bestLogProb = -Infinity;
      let bestPrev: number | null = null;

      for (let p = 0; p < S; p++) {
        const prevTag = states[p]!;
        const prevV = viterbi[i - 1]![p]!;
        if (prevV === -Infinity) continue;

        const transProb = model.transition.get(prevTag)?.get(tag) ?? 0;
        if (transProb === 0) continue;

        const logProb = prevV + Math.log(transProb) + logEmit;
        if (logProb > bestLogProb) {
          bestLogProb = logProb;
          bestPrev = p;
        }
      }

      viterbi[i]![s] = bestLogProb;
      bp[i]![s] = bestPrev;
    }
  }

  // ── Assemble trellis steps ───────────────────────────────────────────────
  const steps: ViterbiStep[] = [];
  for (let i = 0; i < T; i++) {
    const word = words[i]!;
    for (let s = 0; s < S; s++) {
      const tag = states[s]!;
      const logP = viterbi[i]![s]!;
      const bpIdx = bp[i]![s];
      steps.push({
        word,
        tag,
        probability: logP === -Infinity ? 0 : Math.exp(logP),
        // bpIdx is either null (position 0) or a valid state index set by the
        // Viterbi DP — states[bpIdx] is always defined for a valid index.
        backpointer: bpIdx != null ? states[bpIdx]! : null,
      });
    }
  }
  return steps;
}

/**
 * Extracts the most-probable tag sequence via backtrace through the Viterbi trellis.
 *
 * Runs the same DP as `viterbiPOSTagger` but returns only the optimal path,
 * not the full trellis.
 *
 * @param model - The HMM model.
 * @param words - Input sentence tokens.
 * @returns Array of { word, tag } in sentence order, or [] if no valid path exists.
 * @complexity O(T · S²)
 */
export function bestTagSequence(
  model: HMMModel,
  words: ReadonlyArray<string>,
): ReadonlyArray<{ word: string; tag: string }> {
  if (words.length === 0 || model.states.length === 0) return [];

  const T = words.length;
  const states = model.states;
  const S = states.length;

  const viterbi: number[][] = Array.from({ length: T }, () =>
    new Array<number>(S).fill(-Infinity),
  );
  const bp: (number | null)[][] = Array.from({ length: T }, () =>
    new Array<number | null>(S).fill(null),
  );

  const word0 = words[0]!;
  for (let s = 0; s < S; s++) {
    const tag = states[s]!;
    const initProb = model.initial.get(tag) ?? 0;
    const emitProb = model.emission.get(tag)?.get(word0) ?? 0;
    if (initProb > 0 && emitProb > 0) {
      viterbi[0]![s] = Math.log(initProb) + Math.log(emitProb);
    }
  }

  for (let i = 1; i < T; i++) {
    const word = words[i]!;
    for (let s = 0; s < S; s++) {
      const tag = states[s]!;
      const emitProb = model.emission.get(tag)?.get(word) ?? 0;
      if (emitProb === 0) continue;
      const logEmit = Math.log(emitProb);
      let bestLogProb = -Infinity;
      let bestPrev: number | null = null;
      for (let p = 0; p < S; p++) {
        const prevTag = states[p]!;
        const prevV = viterbi[i - 1]![p]!;
        if (prevV === -Infinity) continue;
        const transProb = model.transition.get(prevTag)?.get(tag) ?? 0;
        if (transProb === 0) continue;
        const lp = prevV + Math.log(transProb) + logEmit;
        if (lp > bestLogProb) {
          bestLogProb = lp;
          bestPrev = p;
        }
      }
      viterbi[i]![s] = bestLogProb;
      bp[i]![s] = bestPrev;
    }
  }

  let bestFinal = 0;
  let bestFinalProb = -Infinity;
  for (let s = 0; s < S; s++) {
    const v = viterbi[T - 1]![s]!;
    if (v > bestFinalProb) {
      bestFinalProb = v;
      bestFinal = s;
    }
  }
  if (bestFinalProb === -Infinity) return [];

  const path: number[] = new Array<number>(T).fill(0);
  path[T - 1] = bestFinal;
  for (let i = T - 1; i > 0; i--) {
    const prevIdx = bp[i]![path[i]!];
    // All backpointers on the optimal path are non-null (guarded by the
    // bestFinalProb check above). Using ! to document the invariant.
    path[i - 1] = prevIdx!;
  }

  return path.map((stateIdx, i) => ({
    word: words[i]!,
    tag: states[stateIdx]!,
  }));
}

// ─── §24.2–3: PCFG Interfaces ────────────────────────────────────────────────

/**
 * A lexical rule: pre-terminal → terminal word.
 * Represents the emission probability P(word | pre-terminal).
 * All rules with the same `lhs` must have probabilities summing to 1.
 */
export interface LexicalRule {
  /** Pre-terminal category (e.g., "Noun", "Verb"). */
  lhs: string;
  /** Terminal word in lowercase (e.g., "wumpus"). */
  word: string;
  /** Probability P(word | lhs) ∈ (0, 1]. */
  prob: number;
}

/**
 * A phrasal rule: non-terminal → non-terminal [non-terminal].
 *
 * Binary rules (both `rhs1` and `rhs2` present) are in Chomsky Normal Form.
 * Unary rules (`rhs2` absent) model pre-terminal lifting (e.g., NP → Pronoun).
 * All rules with the same `lhs` must have probabilities summing to 1.
 */
export interface GrammarRule {
  /** Left-hand side non-terminal (e.g., "NP"). */
  lhs: string;
  /** First right-hand side symbol. */
  rhs1: string;
  /** Second right-hand side symbol; absent for unary rules. */
  rhs2?: string;
  /** Probability P(rhs… | lhs) ∈ (0, 1]. */
  prob: number;
}

/**
 * A Probabilistic Context-Free Grammar in near-CNF form.
 */
export interface PCFGrammar {
  /** Rules mapping pre-terminals to terminal words. */
  lexicalRules: ReadonlyArray<LexicalRule>;
  /** Phrasal rules (binary or unary non-terminal expansions). */
  grammarRules: ReadonlyArray<GrammarRule>;
}

/**
 * A parse tree node.
 * Internal nodes have `left` (and optionally `right`) children.
 * Leaf nodes have a `word` property.
 */
export interface ParseTree {
  /** Grammar symbol at this node. */
  symbol: string;
  /** Probability of the subtree rooted at this node. */
  probability: number;
  /** Terminal word (leaf nodes only). */
  word?: string;
  /** Left child (internal nodes). */
  left?: ParseTree;
  /** Right child (binary-branching internal nodes). */
  right?: ParseTree;
}

/**
 * One cell in the CYK DP table.
 * Map key convention: `"symbol,i,k"` (1-indexed spans: i = start, k = end).
 */
export interface CYKCell {
  /** Non-terminal symbol. */
  symbol: string;
  /** Best (maximum) Viterbi probability for this non-terminal spanning [i, k]. */
  probability: number;
  /** Span start (1-indexed). */
  i: number;
  /** Span end (1-indexed). */
  k: number;
  /** Split point j used to achieve the best binary-rule probability. */
  splitJ?: number;
  /** Left child descriptor (binary and unary rules). */
  leftChild?: { symbol: string; i: number; k: number };
  /** Right child descriptor (binary rules only). */
  rightChild?: { symbol: string; i: number; k: number };
}

/**
 * One fill step of the CYK algorithm used for step-by-step visualization.
 */
export interface CYKStep {
  /** Span start (1-indexed). */
  i: number;
  /** Span end (1-indexed). */
  j: number;
  /** Split point for syntactic phase; equals i for lexical/unary phase. */
  k: number;
  /** Non-terminal symbol placed into cell [i, j]. */
  symbol: string;
  /** Probability assigned to this cell. */
  probability: number;
  /** Human-readable rule string, e.g., "NP → Article Noun". */
  rule: string;
  /** Whether this is a lexical lookup/unit closure or a binary merge. */
  phase: 'lexical' | 'syntactic';
}

// ─── §24.2: E0 Wumpus-World Grammar ─────────────────────────────────────────

/**
 * Builds the E0 wumpus-world PCFG from AIMA Figure 24.2 / Figure 24.3.
 *
 * Rule set (per-LHS probabilities sum to 1.00):
 *
 *   S     → NP VP [0.90] | S ConjS [0.10]
 *   ConjS → Conj S [1.00]                    (binarised conjoined sentence)
 *   NP    → Article Noun [0.25] | Pronoun [0.25] | Name [0.10] | Noun [0.10]
 *           | NP PP [0.10] | NP RC [0.05] | Digit Digit [0.05] | NP NP [0.10]
 *   VP    → Verb [0.40] | VP NP [0.35] | VP Adjective [0.05]
 *           | VP PP [0.10] | VP Adverb [0.10]
 *   PP    → Prep NP [1.00]
 *   RC    → RelPro VP [0.60] | RelPro S [0.40]
 *
 * Lexical categories: Article, Noun, Verb, Pronoun, Name, Adjective,
 *   Adverb, Prep, Digit, Conj, RelPro — each with ≥5 words summing to 1.00.
 *
 * @returns An immutable PCFGrammar.
 * @complexity O(1)
 */
export function buildE0Grammar(): PCFGrammar {
  const grammarRules: GrammarRule[] = [
    // ── S  (0.90 + 0.10 = 1.00) ─────────────────────────────────────────────
    { lhs: 'S', rhs1: 'NP', rhs2: 'VP', prob: 0.90 },
    { lhs: 'S', rhs1: 'S', rhs2: 'ConjS', prob: 0.10 },

    // ── ConjS  (binarised "S Conj S"; 1.00) ─────────────────────────────────
    { lhs: 'ConjS', rhs1: 'Conj', rhs2: 'S', prob: 1.00 },

    // ── NP  (0.25+0.25+0.10+0.10+0.10+0.05+0.05+0.10 = 1.00) ───────────────
    { lhs: 'NP', rhs1: 'Article', rhs2: 'Noun', prob: 0.25 },
    { lhs: 'NP', rhs1: 'Pronoun', prob: 0.25 },   // unary lift
    { lhs: 'NP', rhs1: 'Name', prob: 0.10 },       // unary lift
    { lhs: 'NP', rhs1: 'Noun', prob: 0.10 },       // unary lift
    { lhs: 'NP', rhs1: 'NP', rhs2: 'PP', prob: 0.10 },
    { lhs: 'NP', rhs1: 'NP', rhs2: 'RC', prob: 0.05 },
    { lhs: 'NP', rhs1: 'Digit', rhs2: 'Digit', prob: 0.05 },
    { lhs: 'NP', rhs1: 'NP', rhs2: 'NP', prob: 0.10 },

    // ── VP  (0.40+0.35+0.05+0.10+0.10 = 1.00) ───────────────────────────────
    { lhs: 'VP', rhs1: 'Verb', prob: 0.40 },       // unary lift
    { lhs: 'VP', rhs1: 'VP', rhs2: 'NP', prob: 0.35 },
    { lhs: 'VP', rhs1: 'VP', rhs2: 'Adjective', prob: 0.05 },
    { lhs: 'VP', rhs1: 'VP', rhs2: 'PP', prob: 0.10 },
    { lhs: 'VP', rhs1: 'VP', rhs2: 'Adverb', prob: 0.10 },

    // ── PP  (1.00) ───────────────────────────────────────────────────────────
    { lhs: 'PP', rhs1: 'Prep', rhs2: 'NP', prob: 1.00 },

    // ── RC  (0.60 + 0.40 = 1.00) ────────────────────────────────────────────
    { lhs: 'RC', rhs1: 'RelPro', rhs2: 'VP', prob: 0.60 },
    { lhs: 'RC', rhs1: 'RelPro', rhs2: 'S', prob: 0.40 },
  ];

  const lexicalRules: LexicalRule[] = [
    // ── Article  (0.40+0.25+0.15+0.10+0.10 = 1.00) ──────────────────────────
    { lhs: 'Article', word: 'the', prob: 0.40 },
    { lhs: 'Article', word: 'a', prob: 0.25 },
    { lhs: 'Article', word: 'an', prob: 0.15 },
    { lhs: 'Article', word: 'every', prob: 0.10 },
    { lhs: 'Article', word: 'each', prob: 0.10 },

    // ── Noun  (0.14+0.14+0.13+0.13+0.13+0.12+0.11+0.10 = 1.00) ─────────────
    { lhs: 'Noun', word: 'wumpus', prob: 0.14 },
    { lhs: 'Noun', word: 'pit', prob: 0.14 },
    { lhs: 'Noun', word: 'breeze', prob: 0.13 },
    { lhs: 'Noun', word: 'stench', prob: 0.13 },
    { lhs: 'Noun', word: 'gold', prob: 0.13 },
    { lhs: 'Noun', word: 'arrow', prob: 0.12 },
    { lhs: 'Noun', word: 'hunter', prob: 0.11 },
    { lhs: 'Noun', word: 'fear', prob: 0.10 },

    // ── Verb  (0.20+0.15+0.15+0.13+0.12+0.12+0.08+0.05 = 1.00) ─────────────
    { lhs: 'Verb', word: 'is', prob: 0.20 },
    { lhs: 'Verb', word: 'smells', prob: 0.15 },
    { lhs: 'Verb', word: 'see', prob: 0.15 },
    { lhs: 'Verb', word: 'shoot', prob: 0.13 },
    { lhs: 'Verb', word: 'grab', prob: 0.12 },
    { lhs: 'Verb', word: 'move', prob: 0.12 },
    { lhs: 'Verb', word: 'feel', prob: 0.08 },
    { lhs: 'Verb', word: 'go', prob: 0.05 },

    // ── Pronoun  (0.20+0.20+0.15+0.15+0.15+0.15 = 1.00) ────────────────────
    { lhs: 'Pronoun', word: 'i', prob: 0.20 },
    { lhs: 'Pronoun', word: 'you', prob: 0.20 },
    { lhs: 'Pronoun', word: 'he', prob: 0.15 },
    { lhs: 'Pronoun', word: 'she', prob: 0.15 },
    { lhs: 'Pronoun', word: 'it', prob: 0.15 },
    { lhs: 'Pronoun', word: 'they', prob: 0.15 },

    // ── Name  (0.30+0.25+0.20+0.15+0.10 = 1.00) ─────────────────────────────
    { lhs: 'Name', word: 'wumpus', prob: 0.30 },
    { lhs: 'Name', word: 'indiana', prob: 0.25 },
    { lhs: 'Name', word: 'jones', prob: 0.20 },
    { lhs: 'Name', word: 'arthur', prob: 0.15 },
    { lhs: 'Name', word: 'alice', prob: 0.10 },

    // ── Adjective  (0.25+0.20+0.20+0.20+0.15 = 1.00) ────────────────────────
    { lhs: 'Adjective', word: 'dead', prob: 0.25 },
    { lhs: 'Adjective', word: 'stinky', prob: 0.20 },
    { lhs: 'Adjective', word: 'smelly', prob: 0.20 },
    { lhs: 'Adjective', word: 'brave', prob: 0.20 },
    { lhs: 'Adjective', word: 'golden', prob: 0.15 },

    // ── Adverb  (0.25+0.25+0.20+0.20+0.10 = 1.00) ───────────────────────────
    { lhs: 'Adverb', word: 'quickly', prob: 0.25 },
    { lhs: 'Adverb', word: 'carefully', prob: 0.25 },
    { lhs: 'Adverb', word: 'slowly', prob: 0.20 },
    { lhs: 'Adverb', word: 'bravely', prob: 0.20 },
    { lhs: 'Adverb', word: 'forward', prob: 0.10 },

    // ── Prep  (0.25+0.25+0.20+0.15+0.15 = 1.00) ─────────────────────────────
    { lhs: 'Prep', word: 'to', prob: 0.25 },
    { lhs: 'Prep', word: 'in', prob: 0.25 },
    { lhs: 'Prep', word: 'on', prob: 0.20 },
    { lhs: 'Prep', word: 'near', prob: 0.15 },
    { lhs: 'Prep', word: 'with', prob: 0.15 },

    // ── Digit  (0.20 × 5 = 1.00) ─────────────────────────────────────────────
    { lhs: 'Digit', word: '0', prob: 0.20 },
    { lhs: 'Digit', word: '1', prob: 0.20 },
    { lhs: 'Digit', word: '2', prob: 0.20 },
    { lhs: 'Digit', word: '3', prob: 0.20 },
    { lhs: 'Digit', word: '4', prob: 0.20 },

    // ── Conj  (0.50+0.30+0.20 = 1.00) ───────────────────────────────────────
    { lhs: 'Conj', word: 'and', prob: 0.50 },
    { lhs: 'Conj', word: 'or', prob: 0.30 },
    { lhs: 'Conj', word: 'but', prob: 0.20 },

    // ── RelPro  (0.50+0.30+0.20 = 1.00) ─────────────────────────────────────
    { lhs: 'RelPro', word: 'that', prob: 0.50 },
    { lhs: 'RelPro', word: 'who', prob: 0.30 },
    { lhs: 'RelPro', word: 'which', prob: 0.20 },
  ];

  return { grammarRules, lexicalRules };
}

// ─── §24.3: CYK Probabilistic Chart Parser ───────────────────────────────────

/** Canonical CYK table key: "symbol,spanStart,spanEnd" (1-indexed). */
function cellKey(symbol: string, i: number, k: number): string {
  return `${symbol},${i},${k}`;
}

/**
 * Applies unit-closure (unary-rule propagation) for one span [i, j].
 *
 * For every unary rule X → Y where Y already has an entry in the table for
 * span [i, j], adds or improves the entry for X.
 * Repeats until a fixpoint (no more improvements possible).
 * Correctly handles chains of unary rules (e.g., word → Noun → NP).
 *
 * @param grammar - The PCFG.
 * @param table   - Mutable CYK table (updated in place).
 * @param steps   - Mutable steps array (updated in place).
 * @param i       - Span start (1-indexed).
 * @param j       - Span end (1-indexed).
 */
function applyUnitClosure(
  grammar: PCFGrammar,
  table: Map<string, CYKCell>,
  steps: CYKStep[],
  i: number,
  j: number,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of grammar.grammarRules) {
      if (rule.rhs2 !== undefined) continue; // binary — skip

      const childCell = table.get(cellKey(rule.rhs1, i, j));
      if (childCell === undefined) continue;

      const newProb = rule.prob * childCell.probability;
      const parentKey = cellKey(rule.lhs, i, j);
      const existing = table.get(parentKey);

      if (existing === undefined || newProb > existing.probability) {
        table.set(parentKey, {
          symbol: rule.lhs,
          i,
          k: j,
          probability: newProb,
          leftChild: { symbol: rule.rhs1, i, k: j },
        });
        steps.push({
          i,
          j,
          k: i,
          symbol: rule.lhs,
          probability: newProb,
          rule: `${rule.lhs} \u2192 ${rule.rhs1}`,
          phase: i === j ? 'lexical' : 'syntactic',
        });
        changed = true;
      }
    }
  }
}

/**
 * Runs the probabilistic CYK (Viterbi chart) algorithm on a word sequence.
 *
 * Algorithm (from AIMA Figure 24.5):
 *   1. Lexical phase: fill diagonal cells via lexical rules.
 *   2. Unit closure: propagate unary grammar rules upward for each span.
 *   3. For each span length l = 2…n and split point k:
 *        apply all binary rules X → Y Z.
 *   4. Apply unit closure again after each span is completed.
 *   5. Recover the best S parse tree via backtrace.
 *
 * Words should be lowercased to match E0 lexical entries.
 *
 * @param words   - Input token sequence (1-indexed internally).
 * @param grammar - PCFG to parse with.
 * @returns Object with:
 *   - `table`     — complete DP table (key = "symbol,i,k").
 *   - `steps`     — ordered fill steps for animation.
 *   - `bestParse` — highest-probability S parse tree, or null if unparseable.
 * @complexity O(n³ · |R|) where n = |words|, |R| = |binary grammar rules|
 */
export function cykParse(
  words: ReadonlyArray<string>,
  grammar: PCFGrammar,
): {
  table: ReadonlyMap<string, CYKCell>;
  steps: ReadonlyArray<CYKStep>;
  bestParse: ParseTree | null;
} {
  const n = words.length;
  if (n === 0) {
    return {
      table: new Map<string, CYKCell>(),
      steps: [],
      bestParse: null,
    };
  }

  const table = new Map<string, CYKCell>();
  const steps: CYKStep[] = [];

  // ── Step 1: Lexical phase ─────────────────────────────────────────────────
  for (let i = 1; i <= n; i++) {
    const word = words[i - 1]!;
    for (const rule of grammar.lexicalRules) {
      if (rule.word !== word) continue;
      const key = cellKey(rule.lhs, i, i);
      const existing = table.get(key);
      if (existing === undefined || rule.prob > existing.probability) {
        // Store word as leftChild.symbol so tree reconstruction can recover it.
        table.set(key, {
          symbol: rule.lhs,
          i,
          k: i,
          probability: rule.prob,
          leftChild: { symbol: rule.word, i, k: i },
        });
        steps.push({
          i,
          j: i,
          k: i,
          symbol: rule.lhs,
          probability: rule.prob,
          rule: `${rule.lhs} \u2192 ${rule.word}`,
          phase: 'lexical',
        });
      }
    }
    applyUnitClosure(grammar, table, steps, i, i);
  }

  // ── Steps 2–3: Fill spans of length >= 2 ─────────────────────────────────
  for (let length = 2; length <= n; length++) {
    for (let i = 1; i <= n - length + 1; i++) {
      const j = i + length - 1;

      for (let k = i; k < j; k++) {
        for (const rule of grammar.grammarRules) {
          if (rule.rhs2 === undefined) continue; // unary — handled by closure

          const leftCell = table.get(cellKey(rule.rhs1, i, k));
          const rightCell = table.get(cellKey(rule.rhs2, k + 1, j));
          if (leftCell === undefined || rightCell === undefined) continue;

          const prob = rule.prob * leftCell.probability * rightCell.probability;
          /* v8 ignore start */
          if (prob <= 0) continue;
          /* v8 ignore end */

          const parentKey = cellKey(rule.lhs, i, j);
          const existing = table.get(parentKey);
          if (existing === undefined || prob > existing.probability) {
            table.set(parentKey, {
              symbol: rule.lhs,
              i,
              k: j,
              probability: prob,
              splitJ: k,
              leftChild: { symbol: rule.rhs1, i, k },
              rightChild: { symbol: rule.rhs2, i: k + 1, k: j },
            });
            steps.push({
              i,
              j,
              k,
              symbol: rule.lhs,
              probability: prob,
              rule: `${rule.lhs} \u2192 ${rule.rhs1} ${rule.rhs2}`,
              phase: 'syntactic',
            });
          }
        }
      }

      applyUnitClosure(grammar, table, steps, i, j);
    }
  }

  const bestParse = extractParseTree(table, n);
  return { table, steps, bestParse };
}

/**
 * Recursively reconstructs a ParseTree from a CYK DP table cell.
 *
 * Internal convention established by `cykParse`:
 *   - Lexical cells: `leftChild.symbol` IS the terminal word; no table entry
 *     exists for that leftChild key.
 *   - Unary grammar cells: `leftChild` is set, `rightChild` absent; the child
 *     IS in the table.
 *   - Binary grammar cells: both `leftChild` and `rightChild` present.
 *
 * @param table - The CYK DP table.
 * @param cell  - Root cell to reconstruct from.
 * @returns ParseTree rooted at `cell`.
 */
function buildTreeFromCell(
  table: ReadonlyMap<string, CYKCell>,
  cell: CYKCell,
): ParseTree {
  const { leftChild, rightChild } = cell;

  /* v8 ignore start */
  if (leftChild === undefined) {
    // Bare leaf with no recorded child. Defensive — should not occur in
    // tables produced by cykParse.
    return { symbol: cell.symbol, probability: cell.probability };
  }
  /* v8 ignore end */

  const leftKey = cellKey(leftChild.symbol, leftChild.i, leftChild.k);
  const leftCellEntry = table.get(leftKey);

  if (rightChild === undefined) {
    // Lexical rule or unary grammar rule.
    if (leftCellEntry === undefined) {
      // leftChild.symbol is the terminal word (lexical leaf).
      return {
        symbol: cell.symbol,
        probability: cell.probability,
        left: { symbol: leftChild.symbol, probability: 1, word: leftChild.symbol },
      };
    }
    // Unary grammar rule — recurse into the pre-terminal.
    return {
      symbol: cell.symbol,
      probability: cell.probability,
      left: buildTreeFromCell(table, leftCellEntry),
    };
  }

  // Binary rule — recurse into both children.
  const rightKey = cellKey(rightChild.symbol, rightChild.i, rightChild.k);
  const rightCellEntry = table.get(rightKey);

  const leftTree =
    leftCellEntry !== undefined
      ? buildTreeFromCell(table, leftCellEntry)
      : { symbol: leftChild.symbol, probability: 1, word: leftChild.symbol };

  const rightTree =
    rightCellEntry !== undefined
      ? buildTreeFromCell(table, rightCellEntry)
      : { symbol: rightChild.symbol, probability: 1, word: rightChild.symbol };

  return {
    symbol: cell.symbol,
    probability: cell.probability,
    left: leftTree,
    right: rightTree,
  };
}

/**
 * Extracts the best S parse tree from a completed CYK table.
 *
 * Looks up cell `S,1,n` and reconstructs the full parse tree by following
 * backpointers stored during the CYK fill.
 *
 * @param table - Completed CYK DP table (key = "symbol,i,k").
 * @param n     - Length of the input sentence (number of words).
 * @returns Best ParseTree for the whole sentence, or null if not parseable.
 * @complexity O(n) tree-node visits in the worst case
 */
export function extractParseTree(
  table: ReadonlyMap<string, CYKCell>,
  n: number,
): ParseTree | null {
  if (n <= 0) return null;
  const sCell = table.get(cellKey('S', 1, n));
  if (sCell === undefined) return null;
  return buildTreeFromCell(table, sCell);
}

// ─── §24.4: Augmented Grammars — Agreement Checking ─────────────────────────

/** Grammatical case feature for a noun phrase. */
export type Case = 'subjective' | 'objective';

/**
 * Person-number feature for subject-verb agreement.
 * 1S = first-person singular  |  1P = first-person plural
 * 2  = second person (number-syncretistic in English)
 * 3S = third-person singular  |  3P = third-person plural
 */
export type PersonNumber = '1S' | '1P' | '2' | '3S' | '3P';

/**
 * An augmented noun phrase carrying case and agreement features.
 */
export interface AugmentedNP {
  /** Word as it appears in text (lowercase). */
  word: string;
  /** Grammatical case. */
  case: Case;
  /** Person and number. */
  personNumber: PersonNumber;
  /** Head word of the NP. */
  head: string;
}

/**
 * Returns the augmented NP descriptor for any English personal pronoun.
 *
 * Covers: I, me, we, us, you, he, him, she, her, they, them.
 * "you" is assigned `case: 'subjective'` (it is case-syncretistic in English).
 *
 * @param word - A single word (case-insensitive).
 * @returns AugmentedNP for known pronouns; null otherwise.
 * @complexity O(1)
 */
export function getAugmentedNP(word: string): AugmentedNP | null {
  const lower = word.toLowerCase();

  const pronounMap = new Map<string, { case: Case; personNumber: PersonNumber }>([
    ['i',    { case: 'subjective', personNumber: '1S' }],
    ['me',   { case: 'objective',  personNumber: '1S' }],
    ['we',   { case: 'subjective', personNumber: '1P' }],
    ['us',   { case: 'objective',  personNumber: '1P' }],
    ['you',  { case: 'subjective', personNumber: '2'  }],
    ['he',   { case: 'subjective', personNumber: '3S' }],
    ['him',  { case: 'objective',  personNumber: '3S' }],
    ['she',  { case: 'subjective', personNumber: '3S' }],
    ['her',  { case: 'objective',  personNumber: '3S' }],
    ['they', { case: 'subjective', personNumber: '3P' }],
    ['them', { case: 'objective',  personNumber: '3P' }],
  ]);

  const info = pronounMap.get(lower);
  if (info === undefined) return null;

  return { word: lower, case: info.case, personNumber: info.personNumber, head: lower };
}

/**
 * Checks subject-verb agreement between an AugmentedNP and a present-tense verb form.
 *
 * Agreement rules:
 *   - "am"   → 1S only
 *   - "is"   → 3S only
 *   - "are"  → 1P, 2, or 3P
 *   - "was"  → 1S or 3S
 *   - "were" → 1P, 2, or 3P
 *   - "has" / "does" → 3S only
 *   - "have" / "do"  → any non-3S
 *   - Regular verbs ending in "-s": 3S form; base form (no "-s") for non-3S.
 *
 * @param subject  - The AugmentedNP acting as sentence subject.
 * @param verbForm - The verb form to check (case-insensitive).
 * @returns true if agreement holds; false otherwise.
 * @complexity O(1)
 */
export function checkAgreement(subject: AugmentedNP, verbForm: string): boolean {
  const verb = verbForm.toLowerCase();
  const pn = subject.personNumber;

  if (verb === 'am')   return pn === '1S';
  if (verb === 'is')   return pn === '3S';
  if (verb === 'are')  return pn === '1P' || pn === '2' || pn === '3P';
  if (verb === 'was')  return pn === '1S' || pn === '3S';
  if (verb === 'were') return pn === '1P' || pn === '2' || pn === '3P';
  if (verb === 'has')  return pn === '3S';
  if (verb === 'have') return pn !== '3S';
  if (verb === 'does') return pn === '3S';
  if (verb === 'do')   return pn !== '3S';

  // Regular verbs: 3S form ends in "-s" (heuristic valid for the E0 vocabulary).
  const looksLike3S = verb.endsWith('s');
  return pn === '3S' ? looksLike3S : !looksLike3S;
}

// ─── §24.5: Ambiguity Examples ───────────────────────────────────────────────

/**
 * A documented natural-language ambiguity example for §24.5.
 */
export interface AmbiguityExample {
  /** Short machine-readable identifier. */
  id: string;
  /** Category of ambiguity. */
  type: 'lexical' | 'syntactic' | 'semantic' | 'pragmatic' | 'referential';
  /** The ambiguous sentence. */
  sentence: string;
  /** One-sentence description of what is ambiguous. */
  ambiguity: string;
  /** Two or more distinct readings. */
  readings: ReadonlyArray<string>;
  /** Linguistic explanation suitable for a visualization tooltip. */
  explanation: string;
}

/**
 * Returns a catalogue of natural-language ambiguity examples spanning the
 * taxonomy from §24.5 of AIMA: lexical, syntactic, semantic, pragmatic,
 * and referential ambiguity.
 *
 * @returns Seven AmbiguityExample records.
 * @complexity O(1)
 */
export function getAmbiguityExamples(): ReadonlyArray<AmbiguityExample> {
  return [
    {
      id: 'pp-attachment',
      type: 'syntactic',
      sentence: 'I shot an elephant in my pajamas.',
      ambiguity: 'PP attachment: "in my pajamas" can modify the VP or the NP.',
      readings: [
        '[I [shot an elephant] [in my pajamas]] — I was wearing pajamas while shooting.',
        '[I shot [an elephant [in my pajamas]]] — the elephant was wearing pajamas.',
      ],
      explanation:
        'Prepositional phrases can attach to different constituents. ' +
        'The CYK parser discovers both parses; the PCFG assigns a higher ' +
        'probability to VP attachment (modifier of the action).',
    },
    {
      id: 'lexical-bank',
      type: 'lexical',
      sentence: 'I went to the bank.',
      ambiguity: '"bank" has multiple word senses.',
      readings: [
        '"bank" = financial institution — I visited a bank branch.',
        '"bank" = river bank — I went to the edge of a river.',
      ],
      explanation:
        'Lexical ambiguity arises when one word form has more than one sense. ' +
        'Context words such as "deposit" or "fishing" would disambiguate via ' +
        'a language-model prior or word-sense disambiguation classifier.',
    },
    {
      id: 'gerund-ambiguity',
      type: 'syntactic',
      sentence: 'Flying planes can be dangerous.',
      ambiguity: '"Flying planes" parses as NP (aircraft in flight) or gerund VP (act of piloting).',
      readings: [
        '[Flying planes] can be dangerous — aircraft in flight are dangerous (NP subject).',
        '[Flying [planes]] can be dangerous — piloting planes is dangerous (gerund clause).',
      ],
      explanation:
        'A gerund ("-ing" form) can head either a noun phrase or a verb phrase, ' +
        'producing a structural ambiguity. Both readings are licensed by a PCFG, ' +
        'but their probabilities differ.',
    },
    {
      id: 'quantifier-scope',
      type: 'semantic',
      sentence: 'Every student read a book.',
      ambiguity: 'Scope ambiguity between "every" and "a".',
      readings: [
        'For every student s, there exists a book b such that s read b (possibly different books).',
        'There exists a book b such that every student s read b (one specific book).',
      ],
      explanation:
        'Quantifier scope ambiguity is a semantic phenomenon: the same surface string ' +
        'maps to two logically distinct formulae depending on which quantifier takes ' +
        'wide scope.',
    },
    {
      id: 'pronoun-reference',
      type: 'referential',
      sentence: 'Mary told Jane she was late.',
      ambiguity: '"she" can refer to Mary or to Jane.',
      readings: [
        'Mary told Jane that Mary was late.',
        'Mary told Jane that Jane was late.',
      ],
      explanation:
        'Referential (anaphora) ambiguity occurs when a pronoun has more than one ' +
        'possible antecedent. Coreference resolution uses discourse structure, ' +
        'selectional preferences, and world knowledge.',
    },
    {
      id: 'pragmatic-indirect',
      type: 'pragmatic',
      sentence: 'Can you pass the salt?',
      ambiguity: 'Literal question about ability vs. indirect polite request.',
      readings: [
        'Literal: Are you physically capable of passing the salt?',
        'Indirect speech act: Please pass the salt.',
      ],
      explanation:
        'Pragmatic ambiguity concerns the speech act performed. The sentence is ' +
        'syntactically a yes/no question but conventionally functions as a request ' +
        "(Grice's Cooperative Principle, Maxim of Manner).",
    },
    {
      id: 'lexical-stalk',
      type: 'lexical',
      sentence: 'The hunter stalked the wumpus.',
      ambiguity: '"stalked" can mean to pursue stealthily or to harass persistently.',
      readings: [
        '"stalked" = moved stealthily in pursuit — the hunter crept toward the wumpus.',
        '"stalked" = harassed obsessively — the hunter repeatedly disturbed the wumpus.',
      ],
      explanation:
        'Domain knowledge (the wumpus world is a hunt) favours the first reading ' +
        'via pragmatic inference, illustrating how lexical disambiguation relies ' +
        'on extra-linguistic context.',
    },
  ] as const;
}

// ─── §24.6: NLP Task Catalogue ───────────────────────────────────────────────

/**
 * Describes one canonical NLP task as surveyed in §24.6 of AIMA.
 */
export interface NLPTask {
  /** Short machine-readable identifier. */
  id: string;
  /** Human-readable task name. */
  name: string;
  /** One-paragraph description of the task and its challenges. */
  description: string;
  /** A concrete example input. */
  inputExample: string;
  /** Expected or typical output for the example input. */
  outputExample: string;
  /** Dominant algorithmic approach(es). */
  approach: string;
}

/**
 * Returns descriptions of the major NLP tasks surveyed in §24.6 of AIMA.
 *
 * Covers: speech recognition, machine translation, information extraction,
 * question answering, sentiment analysis, and named entity recognition.
 *
 * @returns Array of six NLPTask records.
 * @complexity O(1)
 */
export function getNLPTasks(): ReadonlyArray<NLPTask> {
  return [
    {
      id: 'speech-recognition',
      name: 'Speech Recognition',
      description:
        'Converts a sequence of acoustic frames into a word sequence. ' +
        'The system must model acoustic variation (speaker, noise, dialect) ' +
        'and the prior probability of word sequences via a language model.',
      inputExample: 'Audio waveform of "Shoot the wumpus."',
      outputExample: '"Shoot the wumpus."',
      approach:
        'HMM acoustic models combined with n-gram language models; ' +
        'deep learning RNN/Transformer encoder-decoder in modern systems.',
    },
    {
      id: 'machine-translation',
      name: 'Machine Translation',
      description:
        'Translates a source-language sentence into an equivalent ' +
        'target-language sentence, preserving meaning while adapting to ' +
        'target-language syntax, morphology, and idioms.',
      inputExample: '"The wumpus is dead." (English)',
      outputExample: '"Der Wumpus ist tot." (German)',
      approach:
        'Noisy-channel model P(source|target)·P(target); neural seq2seq models ' +
        'with attention; Transformer architecture (Vaswani et al., 2017).',
    },
    {
      id: 'information-extraction',
      name: 'Information Extraction',
      description:
        'Identifies and structures specific facts — entities, relations, events — ' +
        'from free text into a relational or knowledge-graph representation.',
      inputExample: '"Indiana Jones grabbed the gold in cave 3."',
      outputExample: 'grabbed(Indiana Jones, gold, cave 3)',
      approach:
        'Rule-based pattern matching; sequence-labelling models (CRF, BERT-NER); ' +
        'relation-extraction classifiers; open information extraction.',
    },
    {
      id: 'question-answering',
      name: 'Question Answering',
      description:
        'Produces a direct answer to a natural-language question, either by ' +
        'querying a knowledge base or by extracting a text span from a passage.',
      inputExample: '"Where is the gold?" given a passage describing the cave.',
      outputExample: '"In cave 3."',
      approach:
        'Retrieval + machine reading comprehension; BERT-style extractive QA ' +
        '(SQuAD); generative seq2seq models for open-domain QA.',
    },
    {
      id: 'sentiment-analysis',
      name: 'Sentiment Analysis',
      description:
        'Classifies the emotional polarity (positive, negative, neutral) or ' +
        'fine-grained sentiment expressed in a text. Can operate at document, ' +
        'sentence, or aspect level.',
      inputExample: '"The wumpus is terrifying and the pit unavoidable. I hate this cave!"',
      outputExample: 'negative (confidence: 0.94)',
      approach:
        'Naive Bayes / logistic regression on bag-of-words features; ' +
        'fine-tuned pre-trained Transformer (BERT, RoBERTa).',
    },
    {
      id: 'named-entity-recognition',
      name: 'Named Entity Recognition (NER)',
      description:
        'Identifies and classifies named entities in text — persons, organisations, ' +
        'locations, dates, etc. — by assigning a BIO span label to each mention.',
      inputExample: '"Indiana Jones found gold near the Wumpus Cave on Tuesday."',
      outputExample:
        '[Indiana Jones](PERSON) found [gold](OBJECT) near [Wumpus Cave](LOCATION) on [Tuesday](DATE).',
      approach:
        'BIO sequence labelling with CRF over hand-crafted features; ' +
        'contextual word embeddings + linear layer (BERT-NER).',
    },
  ] as const;
}
