/**
 * Chapter 25 — Deep Learning for NLP
 *
 * Pure algorithm implementations covering:
 *   §25.1 Word Embeddings (softmax, sigmoid, cosine similarity, word analogies)
 *   §25.2 RNNs for NLP (forward pass, average pooling)
 *   §25.3 Sequence-to-Sequence / Attention (attention, beam search)
 *   §25.4 The Transformer (self-attention, positional encoding)
 *   §25.5 Pretraining (GloVe score, masked language model step)
 *
 * All functions are pure — no side effects, no mutation of inputs.
 *
 * @module algorithms
 */

// ---------------------------------------------------------------------------
// §25.1 Word Embeddings
// ---------------------------------------------------------------------------

/**
 * Numerically-stable softmax over a vector of logits.
 *
 * Subtracts max(logits) before exponentiation to prevent overflow.
 * Formula: softmax(z_i) = exp(z_i - max) / Σ exp(z_j - max)
 *
 * @param logits - Raw score vector.
 * @returns Probability distribution (sums to 1).
 * @complexity O(n)
 */
export function softmax(logits: number[]): number[] {
  if (logits.length === 0) return [];
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Sigmoid activation function.
 *
 * Formula: σ(x) = 1 / (1 + exp(-x))
 *
 * @param x - Input scalar.
 * @returns Value in (0, 1).
 * @complexity O(1)
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Dot product of two equal-length vectors.
 *
 * Formula: a · b = Σ a_i * b_i
 *
 * @param a - First vector.
 * @param b - Second vector (must be same length as a).
 * @returns Scalar dot product.
 * @complexity O(n)
 */
export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i]!, 0);
}

/**
 * Cosine similarity between two vectors.
 *
 * Formula: cos(a, b) = (a · b) / (‖a‖ · ‖b‖)
 * Returns 0 if either vector is the zero vector.
 *
 * @param a - First vector.
 * @param b - Second vector (must be same length as a).
 * @returns Value in [-1, 1].
 * @complexity O(n)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const normA = Math.sqrt(dotProduct(a, a));
  const normB = Math.sqrt(dotProduct(b, b));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

/**
 * Solve a word analogy: "A is to B as C is to ?"
 *
 * Computes the target embedding vector = embed(B) - embed(A) + embed(C),
 * then ranks all words in the embedding table by cosine similarity to that
 * vector (excluding wordA, wordB, wordC themselves).
 *
 * @param embeddings - Map from word to its embedding vector.
 * @param wordA - The "source" word.
 * @param wordB - The "transformed" word.
 * @param wordC - The query word.
 * @returns Candidates sorted descending by cosine similarity score.
 * @complexity O(V·d) where V = vocabulary size, d = embedding dimension
 */
export function wordAnalogy(
  embeddings: Record<string, number[]>,
  wordA: string,
  wordB: string,
  wordC: string,
): Array<{ word: string; score: number }> {
  const eA = embeddings[wordA];
  const eB = embeddings[wordB];
  const eC = embeddings[wordC];
  if (!eA || !eB || !eC) return [];

  const dim = eA.length;
  const target = Array.from({ length: dim }, (_, i) => eB[i]! - eA[i]! + eC[i]!);

  const excluded = new Set([wordA, wordB, wordC]);
  return Object.entries(embeddings)
    .filter(([word]) => !excluded.has(word))
    .map(([word, vec]) => ({ word, score: cosineSimilarity(target, vec) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// §25.2 RNNs for NLP
// ---------------------------------------------------------------------------

/**
 * Represents a single time-step in an RNN forward pass.
 */
export interface RNNStep {
  /** Input vector at this time step. */
  input: number[];
  /** Hidden state produced at this time step. */
  hiddenState: number[];
  /** Output vector produced at this time step. */
  output: number[];
  /** Human-readable description of what happened. */
  action: string;
}

/**
 * Matrix-vector multiplication: result[i] = Σ_j M[i][j] * v[j]
 *
 * @param M - Matrix (rows × cols).
 * @param v - Column vector (length = cols).
 * @returns Result vector (length = rows).
 * @complexity O(rows * cols)
 */
function matVec(M: number[][], v: number[]): number[] {
  return M.map((row) => row.reduce((sum, mij, j) => sum + mij * v[j]!, 0));
}

/**
 * Element-wise vector addition.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns Sum vector.
 * @complexity O(n)
 */
function vecAdd(a: number[], b: number[]): number[] {
  return a.map((ai, i) => ai + b[i]!);
}

/**
 * Run a vanilla RNN forward pass over a sequence of inputs.
 *
 * At each step t:
 *   h_t = tanh(Wxh · x_t + Whh · h_{t-1})
 *   y_t = softmax(Why · h_t)
 *
 * @param inputs - Sequence of input vectors.
 * @param initialHidden - Initial hidden state h_0.
 * @param Wxh - Input-to-hidden weight matrix (hiddenSize × inputSize).
 * @param Whh - Hidden-to-hidden weight matrix (hiddenSize × hiddenSize).
 * @param Why - Hidden-to-output weight matrix (outputSize × hiddenSize).
 * @returns Immutable array of RNNStep records, one per input.
 * @complexity O(T · (hiddenSize · inputSize + hiddenSize² + outputSize · hiddenSize))
 */
export function rnnForwardPass(
  inputs: ReadonlyArray<number[]>,
  initialHidden: number[],
  Wxh: number[][],
  Whh: number[][],
  Why: number[][],
): ReadonlyArray<RNNStep> {
  const steps: RNNStep[] = [];
  let h = initialHidden;

  for (let t = 0; t < inputs.length; t++) {
    const x = inputs[t];
    const preActivation = vecAdd(matVec(Wxh, x), matVec(Whh, h));
    const newH = preActivation.map(Math.tanh);
    const output = softmax(matVec(Why, newH));
    steps.push({
      input: [...x],
      hiddenState: [...newH],
      output: [...output],
      action: `Step ${t + 1}: compute h_${t + 1} = tanh(Wxh·x + Whh·h), y_${t + 1} = softmax(Why·h)`,
    });
    h = newH;
  }

  return steps;
}

/**
 * Average-pool a sequence of hidden states into a single fixed-size vector.
 *
 * Formula: z̃ = (1/s) · Σ_{t=1}^{s} z_t
 *
 * @param hiddenStates - Sequence of hidden state vectors (all same length).
 * @returns Element-wise mean vector.
 * @complexity O(T · d)
 */
export function averagePooling(hiddenStates: ReadonlyArray<number[]>): number[] {
  if (hiddenStates.length === 0) return [];
  const dim = hiddenStates[0].length;
  const sum = Array<number>(dim).fill(0);
  for (const h of hiddenStates) {
    for (let i = 0; i < dim; i++) {
      sum[i]! += h[i]!;
    }
  }
  return sum.map((s) => s / hiddenStates.length);
}

// ---------------------------------------------------------------------------
// §25.3 Attention & Seq2Seq
// ---------------------------------------------------------------------------

/**
 * Result of an attention computation.
 */
export interface AttentionResult {
  /** Raw alignment scores: r_j = query · key_j (or scaled variant). */
  scores: number[];
  /** Normalised attention weights: a_j = softmax(scores)_j. */
  weights: number[];
  /** Context vector: c = Σ_j a_j · value_j. */
  context: number[];
}

/**
 * Compute scaled (or unscaled) dot-product attention.
 *
 * Scores:   r_j = query · key_j  [/ sqrt(d) if scale=true]
 * Weights:  a_j = softmax(r)_j
 * Context:  c   = Σ_j a_j · value_j
 *
 * @param query - Query vector of dimension d.
 * @param keys - Array of key vectors, each of dimension d.
 * @param values - Array of value vectors (same length as keys).
 * @param scale - Whether to divide scores by sqrt(d) (Transformer-style).
 * @returns AttentionResult with scores, weights, and context.
 * @complexity O(|keys| · d)
 */
export function computeAttention(
  query: number[],
  keys: ReadonlyArray<number[]>,
  values: ReadonlyArray<number[]>,
  scale: boolean,
): AttentionResult {
  const d = query.length;
  const scaleFactor = scale ? Math.sqrt(d) : 1;

  const scores = keys.map((k) => dotProduct(query, k) / scaleFactor);
  const weights = softmax(scores);

  const dim = values.length > 0 ? values[0]!.length : 0;
  const context = Array<number>(dim).fill(0);
  for (let j = 0; j < values.length; j++) {
    const v = values[j]!;
    const w = weights[j]!;
    for (let i = 0; i < dim; i++) {
      context[i]! += w * v[i]!;
    }
  }

  return { scores, weights, context };
}

/**
 * A single beam-search hypothesis (partial sequence + log-prob score).
 */
export interface BeamHypothesis {
  /** Tokens generated so far (includes start token). */
  tokens: string[];
  /** Cumulative log-probability score. */
  score: number;
}

/**
 * One step captured during beam search.
 */
export interface BeamSearchStep {
  /** Current decoding step index (1-based). */
  step: number;
  /** Active beams at the start of this step. */
  beams: BeamHypothesis[];
  /** All candidate extensions considered at this step. */
  candidates: Array<{ hypothesis: BeamHypothesis; nextToken: string; newScore: number }>;
  /** Human-readable description. */
  action: string;
}

/**
 * Beam search decoder for sequence generation.
 *
 * At each step, extends every active hypothesis with each vocabulary token,
 * scores it using log-probabilities from `getNextScores`, and keeps the top
 * `beamSize` hypotheses.  Completed hypotheses (ending with `endToken`) are
 * kept but not extended further.
 *
 * @param getNextScores - Pure function mapping current token sequence to a
 *   map of { nextToken → log-probability }.
 * @param startToken - Token that seeds all beams.
 * @param endToken - Token that marks the end of a hypothesis.
 * @param vocabulary - Complete set of tokens to expand.
 * @param beamSize - Number of beams to maintain.
 * @param maxSteps - Maximum decoding steps before stopping.
 * @returns Immutable array of BeamSearchStep records.
 * @complexity O(maxSteps · beamSize · |vocabulary|)
 */
export function beamSearch(
  getNextScores: (tokens: string[]) => Record<string, number>,
  startToken: string,
  endToken: string,
  vocabulary: string[],
  beamSize: number,
  maxSteps: number,
): ReadonlyArray<BeamSearchStep> {
  const steps: BeamSearchStep[] = [];
  let activeBeams: BeamHypothesis[] = [{ tokens: [startToken], score: 0 }];

  for (let step = 1; step <= maxSteps; step++) {
    const allCandidates: Array<{
      hypothesis: BeamHypothesis;
      nextToken: string;
      newScore: number;
    }> = [];

    for (const beam of activeBeams) {
      if (beam.tokens[beam.tokens.length - 1] === endToken) {
        // Completed hypothesis — keep as-is by re-adding itself.
        allCandidates.push({ hypothesis: beam, nextToken: endToken, newScore: beam.score });
        continue;
      }
      const nextScores = getNextScores(beam.tokens);
      for (const token of vocabulary) {
        const tokenScore = nextScores[token] ?? -Infinity;
        allCandidates.push({
          hypothesis: beam,
          nextToken: token,
          newScore: beam.score + tokenScore,
        });
      }
    }

    allCandidates.sort((a, b) => b.newScore - a.newScore);
    const top = allCandidates.slice(0, beamSize);

    const newBeams: BeamHypothesis[] = top.map((c) => ({
      tokens:
        c.nextToken === endToken && c.hypothesis.tokens[c.hypothesis.tokens.length - 1] === endToken
          ? [...c.hypothesis.tokens]
          : [...c.hypothesis.tokens, c.nextToken],
      score: c.newScore,
    }));

    steps.push({
      step,
      beams: activeBeams.map((b) => ({ ...b, tokens: [...b.tokens] })),
      candidates: allCandidates,
      action: `Step ${step}: expanded ${activeBeams.length} beam(s), kept top ${newBeams.length}`,
    });

    activeBeams = newBeams;

    // Stop early if all active beams have completed.
    if (activeBeams.every((b) => b.tokens[b.tokens.length - 1] === endToken)) break;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §25.4 The Transformer Architecture — Self-Attention
// ---------------------------------------------------------------------------

/**
 * Result of applying a single self-attention layer.
 */
export interface SelfAttentionResult {
  /** Query matrix: q_i = Wq · x_i */
  queries: number[][];
  /** Key matrix: k_i = Wk · x_i */
  keys: number[][];
  /** Value matrix: v_i = Wv · x_i */
  values: number[][];
  /** attentionMatrix[i][j] = attention weight from position i to position j */
  attentionMatrix: number[][];
  /** Context vectors: c_i = Σ_j attn[i][j] · v_j */
  contexts: number[][];
  /** Human-readable description. */
  action: string;
}

/**
 * Apply a single Transformer self-attention layer to a sequence of inputs.
 *
 * For each position i:
 *   q_i = Wq · x_i,  k_i = Wk · x_i,  v_i = Wv · x_i
 *   attn[i][j] = softmax_j( q_i · k_j / sqrt(d_k) )
 *   c_i = Σ_j attn[i][j] · v_j
 *
 * @param inputs - Sequence of input vectors, each of dimension d_model.
 * @param Wq - Query projection matrix (d_k × d_model).
 * @param Wk - Key projection matrix (d_k × d_model).
 * @param Wv - Value projection matrix (d_v × d_model).
 * @param scale - Whether to scale scores by 1/sqrt(d_k).
 * @returns SelfAttentionResult with all intermediate tensors.
 * @complexity O(n² · d_k + n · d_v)
 */
export function selfAttentionLayer(
  inputs: ReadonlyArray<number[]>,
  Wq: number[][],
  Wk: number[][],
  Wv: number[][],
  scale: boolean,
): SelfAttentionResult {
  const n = inputs.length;
  const queries = inputs.map((x) => matVec(Wq, x));
  const keys = inputs.map((x) => matVec(Wk, x));
  const values = inputs.map((x) => matVec(Wv, x));

  const dk = queries.length > 0 ? queries[0]!.length : 1;
  const scaleFactor = scale ? Math.sqrt(dk) : 1;

  const attentionMatrix: number[][] = queries.map((q) => {
    const scores = keys.map((k) => dotProduct(q, k) / scaleFactor);
    return softmax(scores);
  });

  const dv = values.length > 0 ? values[0]!.length : 0;
  const contexts: number[][] = Array.from({ length: n }, (_, i) => {
    const ctx = Array<number>(dv).fill(0);
    for (let j = 0; j < n; j++) {
      const w = attentionMatrix[i]![j]!;
      for (let d = 0; d < dv; d++) {
        ctx[d]! += w * values[j]![d]!;
      }
    }
    return ctx;
  });

  return {
    queries,
    keys,
    values,
    attentionMatrix,
    contexts,
    action: `Self-attention over ${n} position(s) with ${scale ? 'scaled' : 'unscaled'} dot product`,
  };
}

/**
 * Compute sinusoidal positional encoding for a single position.
 *
 * Formula (Vaswani et al. 2017):
 *   PE[pos, 2i]   = sin(pos / 10000^(2i / d_model))
 *   PE[pos, 2i+1] = cos(pos / 10000^(2i / d_model))
 *
 * @param position - Position index in the sequence (0-based).
 * @param dim - Dimensionality d_model of the model (must be even).
 * @returns Positional encoding vector of length `dim`.
 * @complexity O(d_model)
 */
export function positionalEncoding(position: number, dim: number): number[] {
  const pe = Array<number>(dim).fill(0);
  for (let i = 0; i < Math.floor(dim / 2); i++) {
    const angle = position / Math.pow(10000, (2 * i) / dim);
    pe[2 * i] = Math.sin(angle);
    pe[2 * i + 1] = Math.cos(angle);
  }
  return pe;
}

// ---------------------------------------------------------------------------
// §25.5 Pretraining and Transfer Learning
// ---------------------------------------------------------------------------

/**
 * Compute the GloVe compatibility score between two word embeddings.
 *
 * GloVe training objective: E_i · E'_k ≈ log P(w_i | w_k)
 * So the score is simply the dot product of the two embedding vectors.
 *
 * @param embedding1 - First word embedding vector.
 * @param embedding2 - Second word embedding vector.
 * @returns Dot-product score approximating log co-occurrence probability.
 * @complexity O(d)
 */
export function gloveScore(embedding1: number[], embedding2: number[]): number {
  return dotProduct(embedding1, embedding2);
}

/**
 * Simulate a single masked-language-model (BERT-style) prediction step.
 *
 * Replaces `sentence[maskedIndex]` with `"[MASK]"`, then ranks the provided
 * `predictions` map by probability (treating raw scores as unnormalised
 * log-probs and converting via softmax).
 *
 * @param sentence - Original token sequence.
 * @param maskedIndex - Index of the token to mask.
 * @param predictions - Map from candidate word to raw score.
 * @returns Object with the masked sentence and top predictions sorted by
 *   probability descending.
 * @complexity O(V log V) where V = vocabulary size
 */
export function maskedLanguageModelStep(
  sentence: string[],
  maskedIndex: number,
  predictions: Record<string, number>,
): { masked: string[]; topPredictions: Array<{ word: string; probability: number }> } {
  const masked = sentence.map((token, i) => (i === maskedIndex ? '[MASK]' : token));

  const entries = Object.entries(predictions);
  const scores = entries.map(([, s]) => s);
  const probs = softmax(scores);

  const topPredictions = entries
    .map(([word], idx) => ({ word, probability: probs[idx]! }))
    .sort((a, b) => b.probability - a.probability);

  return { masked, topPredictions };
}
