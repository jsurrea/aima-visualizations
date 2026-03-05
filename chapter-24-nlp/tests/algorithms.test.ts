import { describe, it, expect } from 'vitest';
import {
  buildNGramModel,
  ngramProbability,
  laplaceSmoothedProbability,
  linearInterpolationProbability,
  sentenceProbability,
  getNGramSteps,
  trainNaiveBayes,
  classifyText,
  viterbiPOSTagger,
  bestTagSequence,
  buildE0Grammar,
  cykParse,
  extractParseTree,
  getAugmentedNP,
  checkAgreement,
  getAmbiguityExamples,
  getNLPTasks,
  type NGramModel,
  type HMMModel,
} from '../src/algorithms/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSimpleHMM(): HMMModel {
  const initial = new Map([['NN', 0.5], ['VB', 0.5]]);
  const transition = new Map([
    ['NN', new Map([['NN', 0.3], ['VB', 0.7]])],
    ['VB', new Map([['NN', 0.8], ['VB', 0.2]])],
  ]);
  const emission = new Map([
    ['NN', new Map([['dog', 0.6], ['cat', 0.4]])],
    ['VB', new Map([['runs', 0.7], ['sleeps', 0.3]])],
  ]);
  return {
    states: ['NN', 'VB'],
    observations: ['dog', 'cat', 'runs', 'sleeps'],
    initial,
    transition,
    emission,
  };
}

// ─── §24.1 N-Gram ─────────────────────────────────────────────────────────────

describe('buildNGramModel', () => {
  it('builds a unigram model', () => {
    const tokens = ['a', 'b', 'a', 'c', 'a'];
    const m = buildNGramModel(tokens, 1);
    expect(m.n).toBe(1);
    expect(m.totalTokens).toBe(5);
    expect(m.counts.get('a')).toBe(3);
    expect(m.counts.get('b')).toBe(1);
    expect(m.vocabulary.has('c')).toBe(true);
    expect(m.contextCounts.get('')).toBe(5);
  });

  it('builds a bigram model', () => {
    const tokens = ['a', 'b', 'a', 'b'];
    const m = buildNGramModel(tokens, 2);
    expect(m.n).toBe(2);
    expect(m.counts.get('a b')).toBe(2);
    expect(m.contextCounts.get('a')).toBe(2);
  });

  it('builds a trigram model', () => {
    const tokens = ['a', 'b', 'c', 'a', 'b', 'c'];
    const m = buildNGramModel(tokens, 3);
    expect(m.n).toBe(3);
    expect(m.counts.get('a b c')).toBe(2);
    expect(m.contextCounts.get('a b')).toBe(2);
  });

  it('handles empty token array', () => {
    const m = buildNGramModel([], 2);
    expect(m.totalTokens).toBe(0);
    expect(m.counts.size).toBe(0);
    expect(m.vocabulary.size).toBe(0);
  });

  it('clamps n below 1 to 1', () => {
    const m = buildNGramModel(['a', 'b'], 0);
    expect(m.n).toBe(1);
  });

  it('clamps fractional n to floor', () => {
    const m = buildNGramModel(['a', 'b', 'c'], 2.9);
    expect(m.n).toBe(2);
  });

  it('produces no bigrams when tokens shorter than n', () => {
    const m = buildNGramModel(['a'], 2);
    expect(m.counts.size).toBe(0);
    expect(m.vocabulary.size).toBe(1);
  });
});

describe('ngramProbability', () => {
  it('returns unigram probability', () => {
    const m = buildNGramModel(['a', 'b', 'a'], 1);
    expect(ngramProbability(m, ['a'])).toBeCloseTo(2 / 3);
    expect(ngramProbability(m, ['b'])).toBeCloseTo(1 / 3);
  });

  it('returns 0 for unseen unigram', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    expect(ngramProbability(m, ['z'])).toBe(0);
  });

  it('returns 0 for empty corpus', () => {
    const m = buildNGramModel([], 1);
    expect(ngramProbability(m, ['a'])).toBe(0);
  });

  it('returns bigram probability', () => {
    const tokens = ['a', 'b', 'a', 'b', 'a', 'c'];
    const m = buildNGramModel(tokens, 2);
    // bigrams: 'a b', 'b a', 'a b', 'b a', 'a c'
    // count('a b') = 2, contextCount('a') = 3  → P = 2/3
    expect(ngramProbability(m, ['a', 'b'])).toBeCloseTo(2 / 3);
  });

  it('returns 0 for unseen bigram context', () => {
    const m = buildNGramModel(['a', 'b'], 2);
    expect(ngramProbability(m, ['z', 'b'])).toBe(0);
  });

  it('returns 0 when ngram length != model.n', () => {
    const m = buildNGramModel(['a', 'b'], 2);
    expect(ngramProbability(m, ['a'])).toBe(0);
    expect(ngramProbability(m, ['a', 'b', 'c'])).toBe(0);
  });

  it('returns 0 for unseen bigram (context exists but ngram absent)', () => {
    const tokens = ['a', 'b', 'a', 'c'];
    const m = buildNGramModel(tokens, 2);
    expect(ngramProbability(m, ['a', 'z'])).toBe(0);
  });
});

describe('laplaceSmoothedProbability', () => {
  it('smooths unigram', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    const p = laplaceSmoothedProbability(m, ['a']);
    expect(p).toBeCloseTo(0.5);
  });

  it('smooths unseen unigram', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    const p = laplaceSmoothedProbability(m, ['z']);
    expect(p).toBeCloseTo(0.25);
  });

  it('smooths bigram', () => {
    const tokens = ['a', 'b', 'a', 'b'];
    const m = buildNGramModel(tokens, 2);
    const V = m.vocabulary.size;
    const contextCount = m.contextCounts.get('a') ?? 0;
    const count = m.counts.get('a b') ?? 0;
    const expected = (count + 1) / (contextCount + 1 * V);
    expect(laplaceSmoothedProbability(m, ['a', 'b'])).toBeCloseTo(expected);
  });

  it('returns 0 for empty vocabulary', () => {
    const m = buildNGramModel([], 1);
    expect(laplaceSmoothedProbability(m, ['a'])).toBe(0);
  });

  it('returns 0 for wrong length ngram', () => {
    const m = buildNGramModel(['a', 'b'], 2);
    expect(laplaceSmoothedProbability(m, ['a'])).toBe(0);
  });

  it('uses custom alpha', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    const p = laplaceSmoothedProbability(m, ['a'], 2);
    expect(p).toBeCloseTo(0.5);
  });
});

describe('linearInterpolationProbability', () => {
  const tokens = ['the', 'dog', 'runs', 'the', 'dog', 'runs'];
  const uni = buildNGramModel(tokens, 1);
  const bi = buildNGramModel(tokens, 2);
  const tri = buildNGramModel(tokens, 3);

  it('returns interpolated probability in [0,1]', () => {
    const p = linearInterpolationProbability(uni, bi, tri, ['the', 'dog', 'runs']);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('returns 0 for wrong-length words array', () => {
    expect(linearInterpolationProbability(uni, bi, tri, ['a', 'b'])).toBe(0);
    expect(linearInterpolationProbability(uni, bi, tri, [])).toBe(0);
  });

  it('uses lambda weights summing to 1', () => {
    const synCounts = new Map([['a', 1]]);
    const synCtx = new Map([['', 1]]);
    const synVocab = new Set(['a']);
    const fakeUni: NGramModel = {
      n: 1, counts: synCounts, contextCounts: synCtx,
      vocabulary: synVocab, totalTokens: 1,
    };
    const fakeBi: NGramModel = {
      n: 2, counts: new Map([['a a', 1]]), contextCounts: new Map([['a', 1]]),
      vocabulary: synVocab, totalTokens: 1,
    };
    const fakeTri: NGramModel = {
      n: 3, counts: new Map([['a a a', 1]]), contextCounts: new Map([['a a', 1]]),
      vocabulary: synVocab, totalTokens: 1,
    };
    const p = linearInterpolationProbability(fakeUni, fakeBi, fakeTri, ['a', 'a', 'a']);
    expect(p).toBeCloseTo(1.0);
  });
});

describe('sentenceProbability', () => {
  it('returns product of unigram probs', () => {
    const m = buildNGramModel(['a', 'b', 'a', 'b'], 1);
    const p = sentenceProbability(m, ['a', 'b']);
    expect(p).toBeCloseTo(0.5 * 0.5);
  });

  it('returns 0 for empty token array', () => {
    const m = buildNGramModel(['a'], 1);
    expect(sentenceProbability(m, [])).toBe(0);
  });

  it('returns 0 when tokens shorter than model.n (n>1)', () => {
    const m = buildNGramModel(['a', 'b', 'c'], 3);
    expect(sentenceProbability(m, ['a', 'b'])).toBe(0);
  });

  it('returns 0 if unseen token and unsmoothed', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    expect(sentenceProbability(m, ['z'])).toBe(0);
  });

  it('returns positive with smoothing for unseen token', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    expect(sentenceProbability(m, ['z'], true)).toBeGreaterThan(0);
  });

  it('returns 0 immediately on zero factor', () => {
    const m = buildNGramModel(['a', 'b'], 1);
    const p = sentenceProbability(m, ['a', 'z', 'b']);
    expect(p).toBe(0);
  });

  it('bigram sentence probability', () => {
    const tokens = ['a', 'b', 'a', 'b'];
    const m = buildNGramModel(tokens, 2);
    const p = sentenceProbability(m, ['a', 'b', 'a']);
    expect(p).toBeGreaterThan(0);
  });
});

describe('getNGramSteps', () => {
  it('returns unigram steps', () => {
    const m = buildNGramModel(['a', 'b', 'a'], 1);
    const steps = getNGramSteps(m, ['a', 'b']);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.ngram).toBe('a');
    expect(steps[0]!.count).toBe(2);
    expect(steps[0]!.probability).toBeCloseTo(2 / 3);
  });

  it('returns bigram steps', () => {
    const tokens = ['a', 'b', 'a', 'b'];
    const m = buildNGramModel(tokens, 2);
    const steps = getNGramSteps(m, ['a', 'b', 'a']);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.ngram).toBe('a b');
  });

  it('returns 0 probability when context absent', () => {
    const m = buildNGramModel(['a', 'b'], 2);
    const steps = getNGramSteps(m, ['z', 'b']);
    expect(steps[0]!.probability).toBe(0);
  });

  it('returns empty for token sequence shorter than n', () => {
    const m = buildNGramModel(['a', 'b', 'c'], 3);
    expect(getNGramSteps(m, ['a', 'b'])).toHaveLength(0);
  });

  it('handles zero totalTokens for unigram', () => {
    const m = buildNGramModel([], 1);
    const steps = getNGramSteps(m, []);
    expect(steps).toHaveLength(0);
  });
});

// ─── §24.1 Naive Bayes ────────────────────────────────────────────────────────

describe('trainNaiveBayes', () => {
  const corpus = [
    { text: 'spam money prize', label: 'spam' },
    { text: 'spam free money', label: 'spam' },
    { text: 'meeting agenda tomorrow', label: 'ham' },
    { text: 'project update report', label: 'ham' },
  ];

  it('trains a model with correct labels', () => {
    const m = trainNaiveBayes(corpus);
    expect(m.labels).toContain('spam');
    expect(m.labels).toContain('ham');
  });

  it('handles empty corpus', () => {
    const m = trainNaiveBayes([]);
    expect(m.labels).toHaveLength(0);
    expect(m.vocabulary.size).toBe(0);
  });

  it('stores log priors', () => {
    const m = trainNaiveBayes(corpus);
    const spamPrior = m.logPriors.get('spam') ?? -Infinity;
    expect(spamPrior).toBeCloseTo(Math.log(0.5));
  });

  it('stores log likelihoods for each label', () => {
    const m = trainNaiveBayes(corpus);
    expect(m.logLikelihoods.has('spam')).toBe(true);
    expect(m.logLikelihoods.has('ham')).toBe(true);
  });
});

describe('classifyText', () => {
  const corpus = [
    { text: 'spam money prize winner', label: 'spam' },
    { text: 'spam free money offer', label: 'spam' },
    { text: 'meeting agenda tomorrow report', label: 'ham' },
    { text: 'project update status report', label: 'ham' },
  ];
  const model = trainNaiveBayes(corpus);

  it('classifies spam correctly', () => {
    expect(classifyText(model, 'free money prize')).toBe('spam');
  });

  it('classifies ham correctly', () => {
    expect(classifyText(model, 'meeting project status')).toBe('ham');
  });

  it('returns empty string for model with no labels', () => {
    const empty = trainNaiveBayes([]);
    expect(classifyText(empty, 'anything')).toBe('');
  });

  it('skips unknown words gracefully', () => {
    const result = classifyText(model, 'xyzzy frobozz');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── §24.1 Viterbi ───────────────────────────────────────────────────────────

describe('viterbiPOSTagger', () => {
  const hmm = makeSimpleHMM();

  it('returns empty for empty words', () => {
    expect(viterbiPOSTagger(hmm, [])).toHaveLength(0);
  });

  it('returns empty for empty states', () => {
    const m: HMMModel = { ...hmm, states: [] };
    expect(viterbiPOSTagger(m, ['dog'])).toHaveLength(0);
  });

  it('returns T*S steps for single word', () => {
    const steps = viterbiPOSTagger(hmm, ['dog']);
    expect(steps).toHaveLength(2);
  });

  it('returns T*S steps for multi-word sentence', () => {
    const steps = viterbiPOSTagger(hmm, ['dog', 'runs']);
    expect(steps).toHaveLength(4);
  });

  it('sets probability=0 for unreachable cells', () => {
    const steps = viterbiPOSTagger(hmm, ['cat', 'runs']);
    const nnAtRuns = steps.find(s => s.word === 'runs' && s.tag === 'NN');
    expect(nnAtRuns?.probability).toBe(0);
  });

  it('sets backpointer null for first position', () => {
    const steps = viterbiPOSTagger(hmm, ['dog']);
    expect(steps.every(s => s.backpointer === null)).toBe(true);
  });

  it('sets non-null backpointer for reachable cells at pos > 0', () => {
    const steps = viterbiPOSTagger(hmm, ['dog', 'runs']);
    const pos1Steps = steps.filter(s => s.word === 'runs' && s.probability > 0);
    expect(pos1Steps.some(s => s.backpointer !== null)).toBe(true);
  });

  it('returns 0 probability for completely unknown word', () => {
    const steps = viterbiPOSTagger(hmm, ['unknown_word']);
    expect(steps.every(s => s.probability === 0)).toBe(true);
  });
});

describe('bestTagSequence', () => {
  const hmm = makeSimpleHMM();

  it('returns empty for empty words', () => {
    expect(bestTagSequence(hmm, [])).toHaveLength(0);
  });

  it('returns empty for empty states', () => {
    const m: HMMModel = { ...hmm, states: [] };
    expect(bestTagSequence(m, ['dog'])).toHaveLength(0);
  });

  it('returns empty when no valid path exists', () => {
    expect(bestTagSequence(hmm, ['zzz', 'yyy'])).toHaveLength(0);
  });

  it('returns sequence of length T', () => {
    const seq = bestTagSequence(hmm, ['dog', 'runs']);
    expect(seq).toHaveLength(2);
    expect(seq[0]!.word).toBe('dog');
    expect(seq[1]!.word).toBe('runs');
  });

  it('assigns plausible tags to dog+runs', () => {
    const seq = bestTagSequence(hmm, ['dog', 'runs']);
    expect(seq[0]!.tag).toBe('NN');
    expect(seq[1]!.tag).toBe('VB');
  });

  it('handles single-word sentence', () => {
    const seq = bestTagSequence(hmm, ['dog']);
    expect(seq).toHaveLength(1);
    expect(seq[0]!.tag).toBe('NN');
  });
});

// ─── §24.2 E0 Grammar ────────────────────────────────────────────────────────

describe('buildE0Grammar', () => {
  const g = buildE0Grammar();

  it('returns grammar rules and lexical rules', () => {
    expect(g.grammarRules.length).toBeGreaterThan(0);
    expect(g.lexicalRules.length).toBeGreaterThan(0);
  });

  it('S rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'S').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('NP rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'NP').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('VP rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'VP').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('PP rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'PP').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('RC rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'RC').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('ConjS rules sum to 1.0', () => {
    const sum = g.grammarRules.filter(r => r.lhs === 'ConjS').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('Noun lexical rules sum to 1.0', () => {
    const sum = g.lexicalRules.filter(r => r.lhs === 'Noun').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('Article lexical rules sum to 1.0', () => {
    const sum = g.lexicalRules.filter(r => r.lhs === 'Article').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('Verb lexical rules sum to 1.0', () => {
    const sum = g.lexicalRules.filter(r => r.lhs === 'Verb').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('Pronoun lexical rules sum to 1.0', () => {
    const sum = g.lexicalRules.filter(r => r.lhs === 'Pronoun').reduce((a, r) => a + r.prob, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('has all probabilities in (0, 1]', () => {
    for (const r of g.grammarRules) {
      expect(r.prob).toBeGreaterThan(0);
      expect(r.prob).toBeLessThanOrEqual(1);
    }
    for (const r of g.lexicalRules) {
      expect(r.prob).toBeGreaterThan(0);
      expect(r.prob).toBeLessThanOrEqual(1);
    }
  });
});

// ─── §24.3 CYK Parser ────────────────────────────────────────────────────────

function makeSimpleGrammar() {
  return {
    grammarRules: [
      { lhs: 'S', rhs1: 'NP', rhs2: 'VP', prob: 1.0 },
      { lhs: 'NP', rhs1: 'Det', rhs2: 'N', prob: 0.6 },
      { lhs: 'NP', rhs1: 'N', prob: 0.4 },
      { lhs: 'VP', rhs1: 'V', prob: 1.0 },
    ],
    lexicalRules: [
      { lhs: 'Det', word: 'the', prob: 1.0 },
      { lhs: 'N', word: 'dog', prob: 0.5 },
      { lhs: 'N', word: 'cat', prob: 0.5 },
      { lhs: 'V', word: 'runs', prob: 1.0 },
    ],
  };
}

describe('cykParse', () => {
  const g = makeSimpleGrammar();

  it('parses "the dog runs" and finds S', () => {
    const { table, bestParse } = cykParse(['the', 'dog', 'runs'], g);
    expect(table.get('S,1,3')).toBeDefined();
    expect(bestParse).not.toBeNull();
    expect(bestParse?.symbol).toBe('S');
  });

  it('returns null parse for ungrammatical input', () => {
    const { bestParse } = cykParse(['runs', 'the'], g);
    expect(bestParse).toBeNull();
  });

  it('returns empty result for empty input', () => {
    const { table, steps, bestParse } = cykParse([], g);
    expect(table.size).toBe(0);
    expect(steps).toHaveLength(0);
    expect(bestParse).toBeNull();
  });

  it('produces lexical steps', () => {
    const { steps } = cykParse(['the', 'dog', 'runs'], g);
    expect(steps.filter(s => s.phase === 'lexical').length).toBeGreaterThan(0);
  });

  it('produces syntactic steps', () => {
    const { steps } = cykParse(['the', 'dog', 'runs'], g);
    expect(steps.filter(s => s.phase === 'syntactic').length).toBeGreaterThan(0);
  });

  it('single-word input without S rule returns null', () => {
    const { bestParse } = cykParse(['dog'], g);
    expect(bestParse).toBeNull();
  });

  it('parses "dog runs" (NP -> N unary)', () => {
    const { bestParse } = cykParse(['dog', 'runs'], g);
    expect(bestParse).not.toBeNull();
    expect(bestParse?.symbol).toBe('S');
  });

  it('assigns correct probability to parse', () => {
    const { bestParse } = cykParse(['the', 'dog', 'runs'], g);
    expect(bestParse?.probability).toBeCloseTo(0.3);
  });

  it('handles unknown word gracefully', () => {
    const { bestParse } = cykParse(['xyz', 'runs'], g);
    expect(bestParse).toBeNull();
  });

  it('handles word with multiple lexical rules in E0', () => {
    const e0 = buildE0Grammar();
    const { table } = cykParse(['wumpus'], e0);
    const hasEntry = table.has('Noun,1,1') || table.has('Name,1,1');
    expect(hasEntry).toBe(true);
  });

  it('parses 2-word sentence with E0 grammar', () => {
    const e0 = buildE0Grammar();
    const { bestParse } = cykParse(['i', 'see'], e0);
    expect(bestParse).not.toBeNull();
    expect(bestParse?.symbol).toBe('S');
  });
});

describe('extractParseTree', () => {
  it('returns null for n <= 0', () => {
    expect(extractParseTree(new Map(), 0)).toBeNull();
    expect(extractParseTree(new Map(), -1)).toBeNull();
  });

  it('returns null when S not in table', () => {
    const { table } = cykParse(['runs', 'the'], makeSimpleGrammar());
    expect(extractParseTree(table, 2)).toBeNull();
  });

  it('returns parse tree when S is in table', () => {
    const { table } = cykParse(['the', 'dog', 'runs'], makeSimpleGrammar());
    const tree = extractParseTree(table, 3);
    expect(tree?.symbol).toBe('S');
  });

  it('tree leaves have word property', () => {
    const { table } = cykParse(['dog', 'runs'], makeSimpleGrammar());
    const tree = extractParseTree(table, 2);
    expect(tree).not.toBeNull();

    function collectLeaves(t: typeof tree): string[] {
      if (t === null || t === undefined) return [];
      if (t.word !== undefined) return [t.word];
      return [...collectLeaves(t.left ?? null), ...collectLeaves(t.right ?? null)];
    }

    const leaves = collectLeaves(tree);
    expect(leaves).toContain('dog');
    expect(leaves).toContain('runs');
  });
});

// ─── §24.4 Augmented Grammars ─────────────────────────────────────────────────

describe('getAugmentedNP', () => {
  it('returns 1S subjective for "I"', () => {
    const np = getAugmentedNP('I');
    expect(np?.personNumber).toBe('1S');
    expect(np?.case).toBe('subjective');
  });

  it('returns 1S objective for "me"', () => {
    const np = getAugmentedNP('me');
    expect(np?.personNumber).toBe('1S');
    expect(np?.case).toBe('objective');
  });

  it('returns 1P subjective for "we"', () => {
    const np = getAugmentedNP('We');
    expect(np?.personNumber).toBe('1P');
    expect(np?.case).toBe('subjective');
  });

  it('returns 1P objective for "us"', () => {
    const np = getAugmentedNP('us');
    expect(np?.personNumber).toBe('1P');
    expect(np?.case).toBe('objective');
  });

  it('returns 2 for "you"', () => {
    const np = getAugmentedNP('you');
    expect(np?.personNumber).toBe('2');
  });

  it('returns 3S subjective for "he"', () => {
    const np = getAugmentedNP('he');
    expect(np?.personNumber).toBe('3S');
    expect(np?.case).toBe('subjective');
  });

  it('returns 3S objective for "him"', () => {
    const np = getAugmentedNP('him');
    expect(np?.case).toBe('objective');
  });

  it('returns 3S subjective for "she"', () => {
    const np = getAugmentedNP('she');
    expect(np?.personNumber).toBe('3S');
    expect(np?.case).toBe('subjective');
  });

  it('returns 3S objective for "her"', () => {
    const np = getAugmentedNP('her');
    expect(np?.case).toBe('objective');
  });

  it('returns 3P subjective for "they"', () => {
    const np = getAugmentedNP('they');
    expect(np?.personNumber).toBe('3P');
    expect(np?.case).toBe('subjective');
  });

  it('returns 3P objective for "them"', () => {
    const np = getAugmentedNP('them');
    expect(np?.personNumber).toBe('3P');
    expect(np?.case).toBe('objective');
  });

  it('returns null for unknown word', () => {
    expect(getAugmentedNP('wumpus')).toBeNull();
    expect(getAugmentedNP('')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getAugmentedNP('I')).not.toBeNull();
    expect(getAugmentedNP('ME')).not.toBeNull();
  });
});

describe('checkAgreement', () => {
  const npI    = getAugmentedNP('i')!;
  const npWe   = getAugmentedNP('we')!;
  const npYou  = getAugmentedNP('you')!;
  const npHe   = getAugmentedNP('he')!;
  const npThey = getAugmentedNP('they')!;

  it('"am" valid only with 1S', () => {
    expect(checkAgreement(npI, 'am')).toBe(true);
    expect(checkAgreement(npHe, 'am')).toBe(false);
    expect(checkAgreement(npWe, 'am')).toBe(false);
  });

  it('"is" valid only with 3S', () => {
    expect(checkAgreement(npHe, 'is')).toBe(true);
    expect(checkAgreement(npI, 'is')).toBe(false);
  });

  it('"are" valid with 1P, 2, 3P', () => {
    expect(checkAgreement(npWe,   'are')).toBe(true);
    expect(checkAgreement(npYou,  'are')).toBe(true);
    expect(checkAgreement(npThey, 'are')).toBe(true);
    expect(checkAgreement(npI,    'are')).toBe(false);
  });

  it('"was" valid with 1S and 3S', () => {
    expect(checkAgreement(npI,  'was')).toBe(true);
    expect(checkAgreement(npHe, 'was')).toBe(true);
    expect(checkAgreement(npWe, 'was')).toBe(false);
  });

  it('"were" valid with 1P, 2, 3P', () => {
    expect(checkAgreement(npWe, 'were')).toBe(true);
    expect(checkAgreement(npI,  'were')).toBe(false);
  });

  it('"has" valid only with 3S', () => {
    expect(checkAgreement(npHe, 'has')).toBe(true);
    expect(checkAgreement(npI,  'has')).toBe(false);
  });

  it('"have" valid with non-3S', () => {
    expect(checkAgreement(npI,  'have')).toBe(true);
    expect(checkAgreement(npWe, 'have')).toBe(true);
    expect(checkAgreement(npHe, 'have')).toBe(false);
  });

  it('"does" valid only with 3S', () => {
    expect(checkAgreement(npHe, 'does')).toBe(true);
    expect(checkAgreement(npI,  'does')).toBe(false);
  });

  it('"do" valid with non-3S', () => {
    expect(checkAgreement(npI,  'do')).toBe(true);
    expect(checkAgreement(npHe, 'do')).toBe(false);
  });

  it('"sees" valid with 3S, invalid with others', () => {
    expect(checkAgreement(npHe, 'sees')).toBe(true);
    expect(checkAgreement(npI,  'sees')).toBe(false);
  });

  it('"see" valid with non-3S', () => {
    expect(checkAgreement(npI,  'see')).toBe(true);
    expect(checkAgreement(npHe, 'see')).toBe(false);
  });

  it('is case-insensitive for verb form', () => {
    expect(checkAgreement(npHe, 'IS')).toBe(true);
    expect(checkAgreement(npI,  'AM')).toBe(true);
  });
});

// ─── §24.5 Ambiguity ─────────────────────────────────────────────────────────

describe('getAmbiguityExamples', () => {
  const examples = getAmbiguityExamples();

  it('returns at least 5 examples', () => {
    expect(examples.length).toBeGreaterThanOrEqual(5);
  });

  it('each example has required fields', () => {
    for (const ex of examples) {
      expect(typeof ex.id).toBe('string');
      expect(ex.id.length).toBeGreaterThan(0);
      expect(typeof ex.sentence).toBe('string');
      expect(ex.readings.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('covers multiple ambiguity types', () => {
    const types = new Set(examples.map(e => e.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it('includes syntactic ambiguity', () => {
    expect(examples.some(e => e.type === 'syntactic')).toBe(true);
  });

  it('includes lexical ambiguity', () => {
    expect(examples.some(e => e.type === 'lexical')).toBe(true);
  });

  it('includes semantic ambiguity', () => {
    expect(examples.some(e => e.type === 'semantic')).toBe(true);
  });

  it('includes pragmatic ambiguity', () => {
    expect(examples.some(e => e.type === 'pragmatic')).toBe(true);
  });

  it('includes referential ambiguity', () => {
    expect(examples.some(e => e.type === 'referential')).toBe(true);
  });
});

// ─── §24.6 NLP Tasks ─────────────────────────────────────────────────────────

describe('getNLPTasks', () => {
  const tasks = getNLPTasks();

  it('returns at least 6 tasks', () => {
    expect(tasks.length).toBeGreaterThanOrEqual(6);
  });

  it('each task has all required fields', () => {
    for (const task of tasks) {
      expect(typeof task.id).toBe('string');
      expect(task.id.length).toBeGreaterThan(0);
      expect(typeof task.name).toBe('string');
      expect(typeof task.description).toBe('string');
      expect(typeof task.inputExample).toBe('string');
      expect(typeof task.outputExample).toBe('string');
      expect(typeof task.approach).toBe('string');
    }
  });

  it('includes speech-recognition', () => {
    expect(tasks.some(t => t.id === 'speech-recognition')).toBe(true);
  });

  it('includes machine-translation', () => {
    expect(tasks.some(t => t.id === 'machine-translation')).toBe(true);
  });

  it('includes information-extraction', () => {
    expect(tasks.some(t => t.id === 'information-extraction')).toBe(true);
  });

  it('includes question-answering', () => {
    expect(tasks.some(t => t.id === 'question-answering')).toBe(true);
  });

  it('includes sentiment-analysis', () => {
    expect(tasks.some(t => t.id === 'sentiment-analysis')).toBe(true);
  });

  it('includes named-entity-recognition', () => {
    expect(tasks.some(t => t.id === 'named-entity-recognition')).toBe(true);
  });
});

describe('bestTagSequence — branch coverage', () => {
  it('covers false branch of lp > bestLogProb (competing predecessors)', () => {
    // Both states A and B can emit 'x'. A→A transition is strong (0.7),
    // B→A transition is weak (0.3), so when computing the best predecessor
    // for state A at pos 1, the loop first sets bestLogProb from A (higher),
    // then encounters B (lower), triggering the lp <= bestLogProb false branch.
    const hmmAB: HMMModel = {
      states: ['A', 'B'],
      observations: ['x'],
      initial: new Map([['A', 0.6], ['B', 0.4]]),
      transition: new Map([
        ['A', new Map([['A', 0.7], ['B', 0.3]])],
        ['B', new Map([['A', 0.3], ['B', 0.7]])],
      ]),
      emission: new Map([
        ['A', new Map([['x', 1.0]])],
        ['B', new Map([['x', 1.0]])],
      ]),
    };
    // Both states emit 'x', so both candidates are valid predecessors.
    // For state A at pos 1: p=A gives lp=log(0.6*0.7)=log(0.42),
    //                        p=B gives lp=log(0.4*0.3)=log(0.12) — FALSE branch.
    const seq = bestTagSequence(hmmAB, ['x', 'x']);
    expect(seq).toHaveLength(2);
    // Optimal path at pos 1: state A (0.42 > 0.28 from B←B)
    expect(seq[0]!.tag).toBe('A');
  });

  it('covers optional-chain short-circuit when state absent from emission/transition', () => {
    // State 'SPARSE' is present in states[] but absent from the emission and
    // transition maps. This triggers the ?. optional-chain branches (returning
    // undefined → 0 via ??) in the initialisation and recursion loops.
    const hmmSparse: HMMModel = {
      states: ['NN', 'SPARSE'],
      observations: ['dog'],
      initial: new Map([['NN', 1.0]]),    // SPARSE not in initial map
      transition: new Map([['NN', new Map([['NN', 1.0], ['SPARSE', 0.0]])]]),
      emission: new Map([['NN', new Map([['dog', 1.0]])]]),  // SPARSE not in emission
    };
    const seq = bestTagSequence(hmmSparse, ['dog', 'dog']);
    expect(seq).toHaveLength(2);
    expect(seq.every(s => s.tag === 'NN')).toBe(true);
  });
});

describe('viterbiPOSTagger — competing predecessors branch', () => {
  it('covers false branch of logProb > bestLogProb with two valid predecessors', () => {
    const hmmAB: HMMModel = {
      states: ['A', 'B'],
      observations: ['x'],
      initial: new Map([['A', 0.6], ['B', 0.4]]),
      transition: new Map([
        ['A', new Map([['A', 0.7], ['B', 0.3]])],
        ['B', new Map([['A', 0.3], ['B', 0.7]])],
      ]),
      emission: new Map([
        ['A', new Map([['x', 1.0]])],
        ['B', new Map([['x', 1.0]])],
      ]),
    };
    const steps = viterbiPOSTagger(hmmAB, ['x', 'x']);
    expect(steps).toHaveLength(4); // 2 positions × 2 states
    // Both pos-1 cells should have non-zero probability
    expect(steps.filter(s => s.word === 'x' && s.probability > 0).length).toBeGreaterThan(0);
  });

  it('covers optional-chain short-circuit when state absent from emission/transition', () => {
    const hmmSparse: HMMModel = {
      states: ['NN', 'SPARSE'],
      observations: ['dog'],
      initial: new Map([['NN', 1.0]]),
      transition: new Map([['NN', new Map([['NN', 1.0], ['SPARSE', 0.0]])]]),
      emission: new Map([['NN', new Map([['dog', 1.0]])]]),
    };
    const steps = viterbiPOSTagger(hmmSparse, ['dog', 'dog']);
    expect(steps.length).toBeGreaterThan(0);
  });
});



describe('cykParse — branch coverage completions', () => {
  it('triggers unit-closure at non-diagonal span (syntactic phase in closure)', () => {
    // This grammar has a unary rule TOP → S that lifts a full S phrase to TOP.
    // When S[1,2] is placed in the table, applyUnitClosure fires for span [1,2]
    // and creates a TOP[1,2] step with phase='syntactic' (i != j).
    const grammar = {
      grammarRules: [
        { lhs: 'S',   rhs1: 'NP', rhs2: 'VP', prob: 1.0 },
        { lhs: 'TOP', rhs1: 'S',               prob: 1.0 }, // unary at phrase level
        { lhs: 'NP',  rhs1: 'N',               prob: 1.0 },
        { lhs: 'VP',  rhs1: 'V',               prob: 1.0 },
      ],
      lexicalRules: [
        { lhs: 'N', word: 'dog',  prob: 1.0 },
        { lhs: 'V', word: 'runs', prob: 1.0 },
      ],
    };
    const { steps, table } = cykParse(['dog', 'runs'], grammar);
    expect(table.has('TOP,1,2')).toBe(true);
    const syntheticSteps = steps.filter(s => s.phase === 'syntactic');
    expect(syntheticSteps.length).toBeGreaterThan(0);
  });

  it('rejects lower lexical rule when first rule has higher probability (branch 82)', () => {
    // First rule N→dog prob=0.7 creates N[1,1]. Second rule N→dog prob=0.3
    // is REJECTED because existing 0.7 > 0.3: triggers the false branch of
    // if (existing === undefined || rule.prob > existing.probability).
    const grammar = {
      grammarRules: [
        { lhs: 'S',  rhs1: 'NP', rhs2: 'VP', prob: 1.0 },
        { lhs: 'NP', rhs1: 'N',               prob: 1.0 },
        { lhs: 'VP', rhs1: 'V',               prob: 1.0 },
      ],
      lexicalRules: [
        { lhs: 'N', word: 'dog',  prob: 0.7 }, // higher, creates entry
        { lhs: 'N', word: 'dog',  prob: 0.3 }, // lower, REJECTED (false branch)
        { lhs: 'V', word: 'runs', prob: 1.0 },
      ],
    };
    const { table } = cykParse(['dog', 'runs'], grammar);
    expect(table.get('N,1,1')?.probability).toBeCloseTo(0.7);
  });

  it('updates lexical cell when second rule has higher probability', () => {
    // First rule prob=0.3 creates cell. Second rule prob=0.7 overwrites it.
    // Covers arm 1 (|| second operand) of the lexical update condition.
    const grammar = {
      grammarRules: [
        { lhs: 'S',  rhs1: 'NP', rhs2: 'VP', prob: 1.0 },
        { lhs: 'NP', rhs1: 'N',               prob: 1.0 },
        { lhs: 'VP', rhs1: 'V',               prob: 1.0 },
      ],
      lexicalRules: [
        { lhs: 'N', word: 'dog',  prob: 0.3 }, // lower, first
        { lhs: 'N', word: 'dog',  prob: 0.7 }, // higher, overwrites
        { lhs: 'V', word: 'runs', prob: 1.0 },
      ],
    };
    const { table } = cykParse(['dog', 'runs'], grammar);
    expect(table.get('N,1,1')?.probability).toBeCloseTo(0.7);
  });

  it('rejects lower binary rule when existing cell has higher probability (branches 88+89)', () => {
    // Grammar where two binary rules can produce S[1,2]:
    //   S → NP VP [0.9] runs first and creates S[1,2]=0.9*0.5*1.0=0.45
    //   S → NP NP [0.1] runs second, NP[2,2] exists because N→runs, so it
    //   tries to update with 0.1*0.5*0.5=0.025 < 0.45 → REJECTED.
    // This covers: branch 89 arm 1 (existing !== undefined case evaluated),
    // and branch 88 arm 1 (false branch — the update is rejected).
    const grammar = {
      grammarRules: [
        { lhs: 'S',  rhs1: 'NP', rhs2: 'VP', prob: 0.9 },
        { lhs: 'S',  rhs1: 'NP', rhs2: 'NP', prob: 0.1 },
        { lhs: 'NP', rhs1: 'N',               prob: 1.0 },
        { lhs: 'VP', rhs1: 'V',               prob: 1.0 },
      ],
      lexicalRules: [
        // N → both words so NP exists for both spans, letting S→NP NP fire
        { lhs: 'N', word: 'dog',  prob: 0.5 },
        { lhs: 'N', word: 'runs', prob: 0.5 },
        { lhs: 'V', word: 'runs', prob: 1.0 },
      ],
    };
    const { table, bestParse } = cykParse(['dog', 'runs'], grammar);
    // S[1,2] should be from S→NP VP (0.9 * 0.5 * 1.0 = 0.45)
    expect(table.get('S,1,2')?.probability).toBeCloseTo(0.45);
    expect(bestParse?.symbol).toBe('S');
  });
});

// ─── Additional edge-case tests for remaining uncovered branches ──────────────

describe('ngramProbability — manually crafted model edge cases', () => {
  it('returns 0 for unigram model with totalTokens=0 (branch 8 arm 0)', () => {
    // Manually crafted broken model: count > 0 but totalTokens = 0.
    // This is the defensive arm of the totalTokens === 0 ternary.
    const m: NGramModel = {
      n: 1,
      counts: new Map([['hello', 1]]),
      contextCounts: new Map(),
      vocabulary: new Set(['hello']),
      totalTokens: 0,
    };
    expect(ngramProbability(m, ['hello'])).toBe(0);
  });

  it('returns 0 for bigram with missing context count (branches 9+10)', () => {
    // count > 0 but context not in contextCounts map → ?? 0 fires (branch 9 arm 1)
    // then contextCount === 0 → cond-expr arm 0 fires (branch 10 arm 0)
    const m: NGramModel = {
      n: 2,
      counts: new Map([['hello world', 1]]),
      contextCounts: new Map(),  // context absent
      vocabulary: new Set(['hello', 'world']),
      totalTokens: 5,
    };
    expect(ngramProbability(m, ['hello', 'world'])).toBe(0);
  });
});

describe('laplaceSmoothedProbability — unseen context', () => {
  it('handles unseen bigram context gracefully (branch 16 arm 1)', () => {
    // Build bigram model on limited corpus, then query with an unseen first word.
    // contextCounts.get(context) is undefined → ?? 0 fires (branch 16 arm 1).
    const model = buildNGramModel(['dog', 'runs'], 2);
    // 'cat' never seen as context → contextCount = 0 → smoothed probability > 0
    const prob = laplaceSmoothedProbability(model, ['cat', 'runs']);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});

describe('sentenceProbability — early exit on zero probability', () => {
  it('returns 0 immediately when a zero-probability n-gram is encountered (branch 25)', () => {
    // Unsmoothed bigram model: 'dog runs' was seen but 'runs dog' was not.
    // sentenceProbability(['dog', 'runs', 'dog'], unsmoothed=false) hits 0 at
    // the unseen bigram 'runs dog' and returns 0 early (branch 25 arm 0).
    const model = buildNGramModel(['dog', 'runs', 'dog'], 2);
    // 'cat fish' bigram never in training → probability is 0
    const prob = sentenceProbability(model, ['cat', 'fish'], false);
    expect(prob).toBe(0);
  });
});

describe('getNGramSteps — edge cases', () => {
  it('returns 0 probability for unseen unigram token (branch 27 arm 1)', () => {
    // Token 'unknown' not in the trained unigram model → counts.get returns
    // undefined → ?? 0 fires (branch 27 arm 1).
    const model = buildNGramModel(['dog', 'runs'], 1);
    const steps = getNGramSteps(model, ['unknown']);
    expect(steps[0]!.count).toBe(0);
    expect(steps[0]!.probability).toBe(0);
  });

  it('returns 0 probability for all tokens when model has zero tokens (branch 28 arm 0)', () => {
    // Empty training corpus → totalTokens = 0 → cond-expr arm 0 fires.
    const model = buildNGramModel([], 1);
    const steps = getNGramSteps(model, ['anything']);
    expect(steps[0]!.probability).toBe(0);
  });
});

describe('viterbiPOSTagger — optional-chain coverage', () => {
  it('handles state with valid init but absent from transition map (branches 54+55)', () => {
    // State 'GHOST' has initProb > 0 and emitProb > 0, so viterbi[0][GHOST] is set.
    // At position 1, when iterating prev states, p=GHOST: prevV != -Infinity
    // → model.transition.get('GHOST') is undefined → ?. fires (branch 54 arm 1)
    // → transProb = 0 → if (transProb === 0) continue fires (branch 55 arm 0).
    const hmmGhost: HMMModel = {
      states: ['NN', 'GHOST'],
      observations: ['dog', 'runs'],
      initial: new Map([['NN', 0.8], ['GHOST', 0.2]]),
      transition: new Map([
        // NN has transitions; GHOST is deliberately absent from transition map
        ['NN', new Map([['NN', 0.5], ['GHOST', 0.5]])],
      ]),
      emission: new Map([
        ['NN', new Map([['dog', 0.6], ['runs', 0.4]])],
        ['GHOST', new Map([['dog', 1.0]])],  // GHOST can emit 'dog' at pos 0
      ]),
    };
    // 'GHOST' has viterbi[0][GHOST] != -Inf because it emits 'dog'.
    // At pos 1, for any state s, when p=GHOST: transition.get('GHOST') → undefined
    // so optional chain fires and transProb=0 → continue.
    const steps = viterbiPOSTagger(hmmGhost, ['dog', 'runs']);
    expect(steps.length).toBeGreaterThan(0);
    const pos1Steps = steps.filter(s => s.word === 'runs');
    expect(pos1Steps.some(s => s.probability > 0)).toBe(true);
  });
});

describe('bestTagSequence — optional-chain coverage', () => {
  it('handles state absent from transition map (branches 69+70)', () => {
    // Same setup as above but for bestTagSequence.
    // When prevTag='GHOST' at position > 0: transition.get('GHOST') is undefined
    // → ?. fires (branch 69 arm 1), transProb=0, continue fires (branch 70 arm 0).
    const hmmGhost: HMMModel = {
      states: ['NN', 'GHOST'],
      observations: ['dog', 'runs'],
      initial: new Map([['NN', 0.8], ['GHOST', 0.2]]),
      transition: new Map([
        ['NN', new Map([['NN', 0.5], ['GHOST', 0.5]])],
      ]),
      emission: new Map([
        ['NN', new Map([['dog', 0.6], ['runs', 0.4]])],
        ['GHOST', new Map([['dog', 1.0]])],
      ]),
    };
    const seq = bestTagSequence(hmmGhost, ['dog', 'runs']);
    expect(seq).toHaveLength(2);
    // Both positions should be resolved; GHOST has no forward transitions
    // so NN must win at pos 1
    expect(seq[1]!.tag).toBe('NN');
  });
});


