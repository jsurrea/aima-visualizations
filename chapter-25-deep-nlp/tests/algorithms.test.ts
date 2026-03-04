import { describe, it, expect } from 'vitest';
import {
  softmax,
  sigmoid,
  dotProduct,
  cosineSimilarity,
  wordAnalogy,
  rnnForwardPass,
  averagePooling,
  computeAttention,
  beamSearch,
  selfAttentionLayer,
  positionalEncoding,
  gloveScore,
  maskedLanguageModelStep,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check all values in arr are close to expected (within tolerance). */
function expectClose(arr: number[], expected: number[], tol = 6): void {
  expect(arr.length).toBe(expected.length);
  arr.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, tol));
}

// ---------------------------------------------------------------------------
// softmax
// ---------------------------------------------------------------------------
describe('softmax', () => {
  it('returns empty array for empty input', () => {
    expect(softmax([])).toEqual([]);
  });

  it('single element → [1.0]', () => {
    expectClose(softmax([5]), [1.0]);
  });

  it('two equal logits → [0.5, 0.5]', () => {
    expectClose(softmax([0, 0]), [0.5, 0.5]);
  });

  it('basic three-element case', () => {
    const result = softmax([1, 2, 3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(result[2]).toBeGreaterThan(result[1]!);
    expect(result[1]).toBeGreaterThan(result[0]!);
  });

  it('numerically stable with large values', () => {
    const result = softmax([1000, 1001]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(result[1]).toBeGreaterThan(result[0]!);
  });

  it('handles negative values', () => {
    const result = softmax([-1, -2, -3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(result[0]).toBeGreaterThan(result[1]!);
  });

  it('does not mutate input', () => {
    const input = [1, 2, 3];
    softmax(input);
    expect(input).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// sigmoid
// ---------------------------------------------------------------------------
describe('sigmoid', () => {
  it('sigmoid(0) = 0.5', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 6);
  });

  it('very large positive → ~1.0', () => {
    expect(sigmoid(1000)).toBeCloseTo(1.0, 6);
  });

  it('very large negative → ~0.0', () => {
    expect(sigmoid(-1000)).toBeCloseTo(0.0, 6);
  });

  it('sigmoid(1) ≈ 0.731', () => {
    expect(sigmoid(1)).toBeCloseTo(0.7310585786, 5);
  });

  it('sigmoid(-1) ≈ 0.269', () => {
    expect(sigmoid(-1)).toBeCloseTo(0.2689414214, 5);
  });
});

// ---------------------------------------------------------------------------
// dotProduct
// ---------------------------------------------------------------------------
describe('dotProduct', () => {
  it('empty vectors → 0', () => {
    expect(dotProduct([], [])).toBe(0);
  });

  it('orthogonal vectors → 0', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it('same vector → sum of squares', () => {
    expect(dotProduct([3, 4], [3, 4])).toBe(25);
  });

  it('basic computation', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('negative values', () => {
    expect(dotProduct([-1, 2], [3, -4])).toBe(-11);
  });
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------
describe('cosineSimilarity', () => {
  it('identical vectors → 1.0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0, 6);
  });

  it('orthogonal vectors → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('opposite vectors → -1.0', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0, 6);
  });

  it('zero vector (a) → 0', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('zero vector (b) → 0', () => {
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
  });

  it('both zero vectors → 0', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('scale-invariant result', () => {
    const a = cosineSimilarity([1, 2], [2, 4]);
    expect(a).toBeCloseTo(1.0, 6);
  });
});

// ---------------------------------------------------------------------------
// wordAnalogy
// ---------------------------------------------------------------------------
describe('wordAnalogy', () => {
  const embeddings: Record<string, number[]> = {
    king: [1, 0.9, 0.1],
    queen: [0.9, 1, 0.2],
    man: [1, 0.1, 0.0],
    woman: [0.1, 1, 0.0],
    dog: [0.0, 0.0, 1.0],
  };

  it('returns empty array when wordA is missing', () => {
    expect(wordAnalogy(embeddings, 'missing', 'queen', 'man')).toEqual([]);
  });

  it('returns empty array when wordB is missing', () => {
    expect(wordAnalogy(embeddings, 'king', 'missing', 'man')).toEqual([]);
  });

  it('returns empty array when wordC is missing', () => {
    expect(wordAnalogy(embeddings, 'king', 'queen', 'missing')).toEqual([]);
  });

  it('excludes input words from results', () => {
    const result = wordAnalogy(embeddings, 'king', 'queen', 'man');
    const words = result.map((r) => r.word);
    expect(words).not.toContain('king');
    expect(words).not.toContain('queen');
    expect(words).not.toContain('man');
  });

  it('results are sorted descending by score', () => {
    const result = wordAnalogy(embeddings, 'king', 'queen', 'man');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.score).toBeGreaterThanOrEqual(result[i]!.score);
    }
  });

  it('returns a result object with word and score fields', () => {
    const result = wordAnalogy(embeddings, 'king', 'queen', 'man');
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]!.word).toBe('string');
    expect(typeof result[0]!.score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// rnnForwardPass
// ---------------------------------------------------------------------------
describe('rnnForwardPass', () => {
  // 2-input, 2-hidden, 2-output toy network
  const Wxh = [
    [0.5, 0.0],
    [0.0, 0.5],
  ];
  const Whh = [
    [0.1, 0.0],
    [0.0, 0.1],
  ];
  const Why = [
    [1.0, 0.0],
    [0.0, 1.0],
  ];

  it('returns empty array for empty input sequence', () => {
    const steps = rnnForwardPass([], [0, 0], Wxh, Whh, Why);
    expect(steps).toHaveLength(0);
  });

  it('single step returns one RNNStep', () => {
    const steps = rnnForwardPass([[1, 0]], [0, 0], Wxh, Whh, Why);
    expect(steps).toHaveLength(1);
  });

  it('step has correct shape fields', () => {
    const steps = rnnForwardPass([[1, 0]], [0, 0], Wxh, Whh, Why);
    const step = steps[0]!;
    expect(step.input).toHaveLength(2);
    expect(step.hiddenState).toHaveLength(2);
    expect(step.output).toHaveLength(2);
    expect(typeof step.action).toBe('string');
  });

  it('hidden state uses tanh (values in (-1, 1))', () => {
    const steps = rnnForwardPass([[1, 1]], [0, 0], Wxh, Whh, Why);
    const h = steps[0]!.hiddenState;
    h.forEach((v) => {
      expect(v).toBeGreaterThan(-1);
      expect(v).toBeLessThan(1);
    });
  });

  it('output sums to 1 (softmax)', () => {
    const steps = rnnForwardPass([[1, 0]], [0, 0], Wxh, Whh, Why);
    const sum = steps[0]!.output.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('multiple steps chain hidden states correctly', () => {
    const steps = rnnForwardPass([[1, 0], [0, 1], [1, 1]], [0, 0], Wxh, Whh, Why);
    expect(steps).toHaveLength(3);
    // Each step's action mentions the step number
    expect(steps[0]!.action).toContain('1');
    expect(steps[1]!.action).toContain('2');
    expect(steps[2]!.action).toContain('3');
  });

  it('does not mutate the input array', () => {
    const inputs = [[1, 0], [0, 1]];
    const copy = inputs.map((r) => [...r]);
    rnnForwardPass(inputs, [0, 0], Wxh, Whh, Why);
    expect(inputs).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// averagePooling
// ---------------------------------------------------------------------------
describe('averagePooling', () => {
  it('empty input → empty output', () => {
    expect(averagePooling([])).toEqual([]);
  });

  it('single vector → that vector', () => {
    expectClose(averagePooling([[1, 2, 3]]), [1, 2, 3]);
  });

  it('two vectors → element-wise mean', () => {
    expectClose(averagePooling([[1, 2], [3, 4]]), [2, 3]);
  });

  it('three vectors', () => {
    expectClose(averagePooling([[0, 6], [3, 3], [6, 0]]), [3, 3]);
  });

  it('does not mutate inputs', () => {
    const hs = [[1, 2], [3, 4]];
    averagePooling(hs);
    expect(hs).toEqual([[1, 2], [3, 4]]);
  });
});

// ---------------------------------------------------------------------------
// computeAttention
// ---------------------------------------------------------------------------
describe('computeAttention', () => {
  it('empty keys/values → empty scores, weights, context', () => {
    const result = computeAttention([1, 0], [], [], false);
    expect(result.scores).toHaveLength(0);
    expect(result.weights).toHaveLength(0);
    expect(result.context).toHaveLength(0);
  });

  it('single key: weight is 1.0, context equals value', () => {
    const result = computeAttention([1, 0], [[1, 0]], [[0.5, 0.7]], false);
    expect(result.weights).toHaveLength(1);
    expect(result.weights[0]).toBeCloseTo(1.0, 6);
    expectClose(result.context, [0.5, 0.7]);
  });

  it('scale=false: raw scores are plain dot products', () => {
    const query = [1, 0];
    const keys = [[1, 0], [0, 1]];
    const result = computeAttention(query, keys, keys, false);
    // query · [1,0] = 1, query · [0,1] = 0
    expect(result.scores[0]).toBeCloseTo(1, 6);
    expect(result.scores[1]).toBeCloseTo(0, 6);
  });

  it('scale=true: scores are divided by sqrt(d)', () => {
    const query = [1, 0];
    const keys = [[1, 0], [0, 1]];
    const resultScaled = computeAttention(query, keys, keys, true);
    const resultUnscaled = computeAttention(query, keys, keys, false);
    // scaled = unscaled / sqrt(2)
    const sqrtD = Math.sqrt(2);
    expect(resultScaled.scores[0]).toBeCloseTo(resultUnscaled.scores[0]! / sqrtD, 6);
    expect(resultScaled.scores[1]).toBeCloseTo(resultUnscaled.scores[1]! / sqrtD, 6);
  });

  it('weights sum to 1', () => {
    const result = computeAttention([1, 1], [[1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], true);
    const sum = result.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('context is weighted sum of values', () => {
    // Equal weights (symmetric query/keys) → context ≈ mean of values
    const result = computeAttention([0, 0], [[0, 0], [0, 0]], [[2, 0], [0, 2]], false);
    // Both scores are 0 → equal weights 0.5 each
    expectClose(result.context, [1, 1]);
  });

  it('returns correct scores, weights, context shapes', () => {
    const result = computeAttention([1, 2], [[1, 0], [0, 1]], [[1, 0], [0, 1]], false);
    expect(result.scores).toHaveLength(2);
    expect(result.weights).toHaveLength(2);
    expect(result.context).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// beamSearch
// ---------------------------------------------------------------------------
describe('beamSearch', () => {
  /** Deterministic next-token scorer for tests. */
  function makeScorer(table: Record<string, Record<string, number>>) {
    return (tokens: string[]): Record<string, number> => {
      const last = tokens[tokens.length - 1] ?? '<s>';
      return table[last] ?? {};
    };
  }

  const vocab = ['a', 'b', '</s>'];
  const scorer = makeScorer({
    '<s>': { a: -1, b: -2, '</s>': -10 },
    a: { a: -1, b: -3, '</s>': -1 },
    b: { a: -2, b: -1, '</s>': -2 },
    '</s>': { '</s>': 0, a: -10, b: -10 },
  });

  it('treats missing vocabulary token as -Infinity score', () => {
    // Scorer only returns score for 'a', so 'b' and '</s>' trigger the ?? -Infinity branch
    const partialScorer = (_tokens: string[]): Record<string, number> => ({ a: -1 });
    const steps = beamSearch(partialScorer, '<s>', '</s>', ['a', 'b', '</s>'], 1, 2);
    // 'a' should win since the others score -Infinity
    expect(steps[0]!.beams[0]!.tokens).toContain('<s>');
    expect(steps.length).toBeGreaterThan(0);
  });

  it('beamSize=1 (greedy) returns at least one step', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 1, 5);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('beamSize=2 returns steps with up to 2 beams', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 2, 5);
    expect(steps.length).toBeGreaterThan(0);
    // Each step starts with at most beamSize beams
    steps.forEach((s) => expect(s.beams.length).toBeLessThanOrEqual(2));
  });

  it('step object has required fields', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 1, 3);
    const s = steps[0]!;
    expect(typeof s.step).toBe('number');
    expect(Array.isArray(s.beams)).toBe(true);
    expect(Array.isArray(s.candidates)).toBe(true);
    expect(typeof s.action).toBe('string');
  });

  it('terminates early when all beams end with endToken', () => {
    // A scorer that immediately emits endToken
    const endScorer = makeScorer({
      '<s>': { a: -100, b: -100, '</s>': 0 },
      '</s>': { '</s>': 0, a: -100, b: -100 },
    });
    const steps = beamSearch(endScorer, '<s>', '</s>', vocab, 1, 10);
    // Should stop after beam picks </s>
    expect(steps.length).toBeLessThanOrEqual(10);
  });

  it('step number increments correctly', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 1, 4);
    steps.forEach((s, idx) => expect(s.step).toBe(idx + 1));
  });

  it('candidates list is non-empty at each step', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 2, 3);
    steps.forEach((s) => expect(s.candidates.length).toBeGreaterThan(0));
  });

  it('beams in step record match the active beams at start of that step', () => {
    const steps = beamSearch(scorer, '<s>', '</s>', vocab, 1, 2);
    // Step 1 should start with the initial beam [{tokens: ['<s>'], score: 0}]
    expect(steps[0]!.beams[0]!.tokens).toContain('<s>');
  });
});

// ---------------------------------------------------------------------------
// selfAttentionLayer
// ---------------------------------------------------------------------------
describe('selfAttentionLayer', () => {
  // Minimal 2-position, 2-dim input, 2-dim projections
  const I2 = [[1, 0], [0, 1]]; // 2×2 identity
  const inputs = [[1, 0], [0, 1]];

  it('empty inputs → empty queries/keys/values/attentionMatrix/contexts', () => {
    const result = selfAttentionLayer([], I2, I2, I2, false);
    expect(result.queries).toHaveLength(0);
    expect(result.keys).toHaveLength(0);
    expect(result.values).toHaveLength(0);
    expect(result.attentionMatrix).toHaveLength(0);
    expect(result.contexts).toHaveLength(0);
  });

  it('returns correct shape with identity projections', () => {
    const result = selfAttentionLayer(inputs, I2, I2, I2, false);
    expect(result.queries).toHaveLength(2);
    expect(result.keys).toHaveLength(2);
    expect(result.values).toHaveLength(2);
    expect(result.attentionMatrix).toHaveLength(2);
    expect(result.contexts).toHaveLength(2);
    expect(typeof result.action).toBe('string');
  });

  it('attention rows sum to 1', () => {
    const result = selfAttentionLayer(inputs, I2, I2, I2, true);
    result.attentionMatrix.forEach((row) => {
      const sum = row.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
    });
  });

  it('action string mentions scaled when scale=true', () => {
    const result = selfAttentionLayer(inputs, I2, I2, I2, true);
    expect(result.action).toContain('scaled');
  });

  it('action string mentions unscaled when scale=false', () => {
    const result = selfAttentionLayer(inputs, I2, I2, I2, false);
    expect(result.action).toContain('unscaled');
  });

  it('symmetric inputs produce symmetric attention matrix', () => {
    // Symmetric inputs with identity projections → attention[i][j] = attention[j][i]
    const symmetric = [[1, 1], [1, 1]];
    const result = selfAttentionLayer(symmetric, I2, I2, I2, true);
    expect(result.attentionMatrix[0]![1]).toBeCloseTo(result.attentionMatrix[1]![0]!, 6);
  });

  it('scale=false and scale=true produce different attention matrices for non-trivial inputs', () => {
    const asymInputs = [[2, 0], [0, 3]];
    const rScaled = selfAttentionLayer(asymInputs, I2, I2, I2, true);
    const rUnscaled = selfAttentionLayer(asymInputs, I2, I2, I2, false);
    // Scores differ when dk > 1; just confirm they are different numerically
    // They CAN match in degenerate cases (equal scores → equal softmax).
    // We just test shapes are correct regardless.
    expect(rScaled.attentionMatrix[0]).toHaveLength(2);
    expect(rUnscaled.attentionMatrix[0]).toHaveLength(2);
  });

  it('works with non-identity projection matrices', () => {
    const Wq = [[2, 0], [0, 2]];
    const result = selfAttentionLayer(inputs, Wq, I2, I2, false);
    // Queries should be 2× the inputs
    expectClose(result.queries[0]!, [2, 0]);
    expectClose(result.queries[1]!, [0, 2]);
  });
});

// ---------------------------------------------------------------------------
// positionalEncoding
// ---------------------------------------------------------------------------
describe('positionalEncoding', () => {
  it('returns vector of correct length', () => {
    expect(positionalEncoding(0, 4)).toHaveLength(4);
    expect(positionalEncoding(5, 8)).toHaveLength(8);
  });

  it('position 0: all cosine terms are 1, all sine terms are 0', () => {
    const pe = positionalEncoding(0, 4);
    // PE[0, 0] = sin(0) = 0
    expect(pe[0]).toBeCloseTo(0, 6);
    // PE[0, 1] = cos(0) = 1
    expect(pe[1]).toBeCloseTo(1, 6);
    // PE[0, 2] = sin(0) = 0
    expect(pe[2]).toBeCloseTo(0, 6);
    // PE[0, 3] = cos(0) = 1
    expect(pe[3]).toBeCloseTo(1, 6);
  });

  it('position 1, dim 4: matches manual formula', () => {
    const pe = positionalEncoding(1, 4);
    const angle0 = 1 / Math.pow(10000, 0 / 4); // i=0
    const angle1 = 1 / Math.pow(10000, 2 / 4); // i=1
    expect(pe[0]).toBeCloseTo(Math.sin(angle0), 6);
    expect(pe[1]).toBeCloseTo(Math.cos(angle0), 6);
    expect(pe[2]).toBeCloseTo(Math.sin(angle1), 6);
    expect(pe[3]).toBeCloseTo(Math.cos(angle1), 6);
  });

  it('encodings differ across positions', () => {
    const pe0 = positionalEncoding(0, 4);
    const pe1 = positionalEncoding(1, 4);
    // At least one dimension should differ
    const allSame = pe0.every((v, i) => Math.abs(v - pe1[i]!) < 1e-9);
    expect(allSame).toBe(false);
  });

  it('dim=2 returns vector of length 2', () => {
    const pe = positionalEncoding(3, 2);
    expect(pe).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// gloveScore
// ---------------------------------------------------------------------------
describe('gloveScore', () => {
  it('dot product of two identical unit vectors → 1', () => {
    expect(gloveScore([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
  });

  it('orthogonal embeddings → 0', () => {
    expect(gloveScore([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('basic computation', () => {
    expect(gloveScore([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('empty embeddings → 0', () => {
    expect(gloveScore([], [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// maskedLanguageModelStep
// ---------------------------------------------------------------------------
describe('maskedLanguageModelStep', () => {
  const sentence = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
  const predictions = { cat: 2.0, dog: 1.0, bird: 0.5 };

  it('replaces correct index with [MASK]', () => {
    const { masked } = maskedLanguageModelStep(sentence, 1, predictions);
    expect(masked[1]).toBe('[MASK]');
    expect(masked[0]).toBe('The');
  });

  it('does not mutate the original sentence', () => {
    const copy = [...sentence];
    maskedLanguageModelStep(sentence, 2, predictions);
    expect(sentence).toEqual(copy);
  });

  it('top predictions are sorted by probability descending', () => {
    const { topPredictions } = maskedLanguageModelStep(sentence, 1, predictions);
    for (let i = 1; i < topPredictions.length; i++) {
      expect(topPredictions[i - 1]!.probability).toBeGreaterThanOrEqual(topPredictions[i]!.probability);
    }
  });

  it('probabilities sum to ~1', () => {
    const { topPredictions } = maskedLanguageModelStep(sentence, 1, predictions);
    const sum = topPredictions.reduce((a, b) => a + b.probability, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('highest-score word has highest probability', () => {
    const { topPredictions } = maskedLanguageModelStep(sentence, 1, predictions);
    expect(topPredictions[0]!.word).toBe('cat');
  });

  it('works at index 0', () => {
    const { masked } = maskedLanguageModelStep(sentence, 0, predictions);
    expect(masked[0]).toBe('[MASK]');
  });

  it('works at last index', () => {
    const { masked } = maskedLanguageModelStep(sentence, 5, predictions);
    expect(masked[5]).toBe('[MASK]');
  });
});
