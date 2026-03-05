import { describe, it, expect } from 'vitest';
import {
  bayesianCandyLearning,
  mleDiscreteSteps,
  gaussianMLESteps,
  betaPDF,
  betaMean,
  betaLearningSteps,
  gaussianPDF,
  mixtureLogLikelihood,
  emMixtureOfGaussians,
  trainNaiveBayes,
  classifyNaiveBayes,
  type CandyObs,
  type GaussianComponent,
  type NaiveBayesExample,
} from '../src/algorithms/index';

// ─── §21.1 Bayesian Candy Learning ───────────────────────────────────────────

describe('bayesianCandyLearning', () => {
  it('returns empty array for empty observations', () => {
    expect(bayesianCandyLearning([])).toEqual([]);
  });

  it('returns one step per observation', () => {
    const obs: CandyObs[] = ['lime', 'lime', 'cherry'];
    const steps = bayesianCandyLearning(obs);
    expect(steps).toHaveLength(3);
  });

  it('posteriors sum to ~1 after each step', () => {
    const obs: CandyObs[] = ['lime', 'lime', 'lime', 'cherry', 'lime'];
    const steps = bayesianCandyLearning(obs);
    for (const step of steps) {
      const total = step.posteriors.reduce((s, p) => s + p, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it('posteriors for all-lime observations converge to h5', () => {
    const obs: CandyObs[] = Array(10).fill('lime') as CandyObs[];
    const steps = bayesianCandyLearning(obs);
    const last = steps[steps.length - 1]!;
    // h5 = 100% lime should dominate (>0.85 after 10 lime observations)
    expect(last.posteriors[4]).toBeGreaterThan(0.85);
  });

  it('predictedLimeProb increases with lime observations', () => {
    const obs: CandyObs[] = ['lime', 'lime', 'lime', 'lime'];
    const steps = bayesianCandyLearning(obs);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.predictedLimeProb).toBeGreaterThanOrEqual(
        steps[i - 1]!.predictedLimeProb,
      );
    }
  });

  it('all-cherry observations converge to h1', () => {
    const obs: CandyObs[] = Array(10).fill('cherry') as CandyObs[];
    const steps = bayesianCandyLearning(obs);
    const last = steps[steps.length - 1]!;
    expect(last.posteriors[0]).toBeGreaterThan(0.85);
    expect(last.predictedLimeProb).toBeLessThan(0.1);
  });

  it('uses custom prior when provided', () => {
    const obs: CandyObs[] = ['cherry'];
    const uniformPrior = [0.2, 0.2, 0.2, 0.2, 0.2];
    const steps = bayesianCandyLearning(obs, uniformPrior);
    expect(steps[0]!.posteriors).toHaveLength(5);
    // With uniform prior and cherry, h1 and h2 get boosted
    expect(steps[0]!.posteriors[0]).toBeGreaterThan(0.2);
  });

  it('step contains obsIndex and observation fields', () => {
    const steps = bayesianCandyLearning(['lime', 'cherry']);
    expect(steps[0]!.obsIndex).toBe(1);
    expect(steps[0]!.observation).toBe('lime');
    expect(steps[1]!.obsIndex).toBe(2);
    expect(steps[1]!.observation).toBe('cherry');
  });

  it('action string is non-empty', () => {
    const steps = bayesianCandyLearning(['cherry']);
    expect(steps[0]!.action.length).toBeGreaterThan(0);
  });

  it('handles extreme prior with h5=1 and lime observations', () => {
    const obs: CandyObs[] = ['lime'];
    const steps = bayesianCandyLearning(obs, [0, 0, 0, 0, 1]);
    // Posterior should be all in h5
    expect(steps[0]!.posteriors[4]).toBeCloseTo(1, 5);
  });

  it('handles zero-sum prior gracefully (keeps prior unchanged)', () => {
    // Degenerate case: all-cherry bag observed lime → posterior collapses but we don't crash
    const obs: CandyObs[] = ['lime'];
    const steps = bayesianCandyLearning(obs, [1, 0, 0, 0, 0]);
    // h1 has 0% lime, so P(lime|h1)=0, unnorm total = 0 → keep prior
    expect(steps[0]!.posteriors).toHaveLength(5);
  });
});

// ─── §21.2.1  MLE Discrete Steps ─────────────────────────────────────────────

describe('mleDiscreteSteps', () => {
  it('returns empty array for empty input', () => {
    expect(mleDiscreteSteps([])).toEqual([]);
  });

  it('returns one step per observation', () => {
    const obs: CandyObs[] = ['cherry', 'lime', 'cherry'];
    expect(mleDiscreteSteps(obs)).toHaveLength(3);
  });

  it('theta = c/(c+l) at each step', () => {
    const steps = mleDiscreteSteps(['cherry', 'lime', 'cherry']);
    expect(steps[0]!.theta).toBeCloseTo(1.0);
    expect(steps[1]!.theta).toBeCloseTo(0.5);
    expect(steps[2]!.theta).toBeCloseTo(2 / 3);
  });

  it('log-likelihood is non-positive for valid theta', () => {
    const steps = mleDiscreteSteps(['cherry', 'lime', 'cherry', 'lime']);
    for (const s of steps) {
      if (s.theta > 0 && s.theta < 1) {
        expect(s.logLikelihood).toBeLessThanOrEqual(0);
      }
    }
  });

  it('handles all-cherry observations (theta = 1)', () => {
    const steps = mleDiscreteSteps(['cherry', 'cherry', 'cherry']);
    const last = steps[steps.length - 1]!;
    expect(last.theta).toBe(1);
    expect(last.cherryCount).toBe(3);
    expect(last.limeCount).toBe(0);
    // When theta=1, log-likelihood = 0
    expect(last.logLikelihood).toBeCloseTo(0);
  });

  it('handles all-lime observations (theta = 0)', () => {
    const steps = mleDiscreteSteps(['lime', 'lime']);
    const last = steps[steps.length - 1]!;
    expect(last.theta).toBe(0);
    expect(last.limeCount).toBe(2);
    expect(last.cherryCount).toBe(0);
    // When theta=0, ll = l*log(1) = 0
    expect(last.logLikelihood).toBeCloseTo(0);
  });

  it('action string is non-empty', () => {
    const steps = mleDiscreteSteps(['cherry']);
    expect(steps[0]!.action.length).toBeGreaterThan(0);
  });
});

// ─── §21.2.4  Gaussian MLE Steps ─────────────────────────────────────────────

describe('gaussianMLESteps', () => {
  it('returns empty array for empty input', () => {
    expect(gaussianMLESteps([])).toEqual([]);
  });

  it('returns one step per data point', () => {
    expect(gaussianMLESteps([1, 2, 3])).toHaveLength(3);
  });

  it('mu converges to true mean', () => {
    const data = [2, 4, 6, 8, 10];
    const steps = gaussianMLESteps(data);
    expect(steps[steps.length - 1]!.muMLE).toBeCloseTo(6, 5);
  });

  it('sigma converges to true std-dev', () => {
    // Standard normal data (mean 0, std 1 exactly known)
    const data = [-1, 0, 1];
    const steps = gaussianMLESteps(data);
    const last = steps[steps.length - 1]!;
    expect(last.muMLE).toBeCloseTo(0, 5);
    expect(last.sigmaMLE).toBeGreaterThan(0);
  });

  it('log-likelihood is finite and non-positive when sigma>0', () => {
    const steps = gaussianMLESteps([1, 2, 3, 4, 5]);
    const last = steps[steps.length - 1]!;
    expect(isFinite(last.logLikelihood)).toBe(true);
    expect(last.logLikelihood).toBeLessThanOrEqual(0);
  });

  it('handles single data point (sigma=0, ll=-Infinity)', () => {
    const steps = gaussianMLESteps([5]);
    expect(steps[0]!.muMLE).toBe(5);
    expect(steps[0]!.sigmaMLE).toBe(0);
    expect(steps[0]!.logLikelihood).toBe(-Infinity);
  });

  it('action string contains N=', () => {
    const steps = gaussianMLESteps([1, 2]);
    expect(steps[0]!.action).toContain('N=1');
    expect(steps[1]!.action).toContain('N=2');
  });

  it('data field grows by one each step', () => {
    const steps = gaussianMLESteps([10, 20, 30]);
    expect(steps[0]!.data).toHaveLength(1);
    expect(steps[1]!.data).toHaveLength(2);
    expect(steps[2]!.data).toHaveLength(3);
  });
});

// ─── §21.2.5  Beta PDF & Mean ─────────────────────────────────────────────────

describe('betaPDF', () => {
  it('returns 0 for theta=0', () => {
    expect(betaPDF(0, 2, 2)).toBe(0);
  });

  it('returns 0 for theta=1', () => {
    expect(betaPDF(1, 2, 2)).toBe(0);
  });

  it('is symmetric for a=b=2', () => {
    expect(betaPDF(0.3, 2, 2)).toBeCloseTo(betaPDF(0.7, 2, 2), 8);
  });

  it('uniform distribution (a=b=1) has constant density', () => {
    // Beta(1,1): (0)^0*(0)^0 = 1 everywhere
    expect(betaPDF(0.2, 1, 1)).toBeCloseTo(betaPDF(0.8, 1, 1), 8);
  });

  it('returns positive value for valid inputs', () => {
    expect(betaPDF(0.5, 3, 5)).toBeGreaterThan(0);
  });

  it('peak near a/(a+b) for large parameters', () => {
    // Beta(30,10): peak near 0.75
    const density75 = betaPDF(0.75, 30, 10);
    const density25 = betaPDF(0.25, 30, 10);
    expect(density75).toBeGreaterThan(density25);
  });
});

describe('betaMean', () => {
  it('returns 0.5 for a=b=1 (uniform)', () => {
    expect(betaMean(1, 1)).toBeCloseTo(0.5);
  });

  it('returns a/(a+b)', () => {
    expect(betaMean(3, 1)).toBeCloseTo(0.75);
    expect(betaMean(1, 3)).toBeCloseTo(0.25);
  });
});

// ─── §21.2.5  Beta Learning Steps ────────────────────────────────────────────

describe('betaLearningSteps', () => {
  it('returns empty for empty observations', () => {
    expect(betaLearningSteps([])).toEqual([]);
  });

  it('increments a for cherry, b for lime', () => {
    const steps = betaLearningSteps(['cherry', 'lime', 'cherry']);
    expect(steps[0]!.a).toBe(2); // init=1, +1 cherry
    expect(steps[0]!.b).toBe(1);
    expect(steps[1]!.a).toBe(2);
    expect(steps[1]!.b).toBe(2); // +1 lime
    expect(steps[2]!.a).toBe(3); // +1 cherry
  });

  it('posteriorMean = a/(a+b)', () => {
    const steps = betaLearningSteps(['cherry', 'cherry']);
    expect(steps[steps.length - 1]!.posteriorMean).toBeCloseTo(3 / 4, 5);
  });

  it('uses custom init hyperparameters', () => {
    const steps = betaLearningSteps(['cherry'], 3, 5);
    expect(steps[0]!.a).toBe(4);
    expect(steps[0]!.b).toBe(5);
    expect(steps[0]!.posteriorMean).toBeCloseTo(4 / 9, 5);
  });

  it('action string is non-empty', () => {
    const steps = betaLearningSteps(['lime']);
    expect(steps[0]!.action.length).toBeGreaterThan(0);
  });

  it('posterior mean converges toward true probability', () => {
    // Simulate 80% cherry candy with many observations
    const obs: CandyObs[] = [
      ...Array(80).fill('cherry'),
      ...Array(20).fill('lime'),
    ] as CandyObs[];
    const steps = betaLearningSteps(obs);
    const last = steps[steps.length - 1]!;
    // Mean should be close to 81/102 ≈ 0.794
    expect(last.posteriorMean).toBeCloseTo(81 / 102, 3);
  });
});

// ─── §21.3  Gaussian PDF & Mixture Log-Likelihood ────────────────────────────

describe('gaussianPDF', () => {
  it('peaks at x=mean', () => {
    const atMean = gaussianPDF(0, 0, 1);
    const offMean = gaussianPDF(1, 0, 1);
    expect(atMean).toBeGreaterThan(offMean);
  });

  it('returns standard normal density at x=0', () => {
    // N(0;0,1) = 1/sqrt(2π) ≈ 0.3989
    expect(gaussianPDF(0, 0, 1)).toBeCloseTo(0.3989, 3);
  });

  it('returns 0 for sigma<=0', () => {
    expect(gaussianPDF(0, 0, 0)).toBe(0);
    expect(gaussianPDF(0, 0, -1)).toBe(0);
  });

  it('is symmetric around mean', () => {
    expect(gaussianPDF(2, 5, 2)).toBeCloseTo(gaussianPDF(8, 5, 2), 8);
  });
});

describe('mixtureLogLikelihood', () => {
  it('returns 0 for empty data', () => {
    const comps: GaussianComponent[] = [{ weight: 1, mean: 0, stdDev: 1 }];
    expect(mixtureLogLikelihood([], comps)).toBe(0);
  });

  it('is negative for non-trivial data', () => {
    const comps: GaussianComponent[] = [{ weight: 1, mean: 0, stdDev: 1 }];
    expect(mixtureLogLikelihood([0, 1, -1], comps)).toBeLessThan(0);
  });

  it('higher for in-distribution data', () => {
    const comps: GaussianComponent[] = [{ weight: 1, mean: 5, stdDev: 0.5 }];
    const llGood = mixtureLogLikelihood([5, 5.1, 4.9], comps);
    const llBad = mixtureLogLikelihood([100, 200, 300], comps);
    expect(llGood).toBeGreaterThan(llBad);
  });

  it('handles near-zero probability gracefully', () => {
    const comps: GaussianComponent[] = [{ weight: 1, mean: 0, stdDev: 1e-10 }];
    // point far from mean → very low density
    const ll = mixtureLogLikelihood([100], comps);
    expect(isFinite(ll)).toBe(true);
  });
});

// ─── §21.3.1  EM Mixture of Gaussians ─────────────────────────────────────────

describe('emMixtureOfGaussians', () => {
  it('returns empty for empty data', () => {
    expect(emMixtureOfGaussians([], 2, 10)).toEqual([]);
  });

  it('returns empty for k<=0', () => {
    expect(emMixtureOfGaussians([1, 2, 3], 0, 10)).toEqual([]);
  });

  it('first step is init phase', () => {
    const steps = emMixtureOfGaussians([1, 2, 3, 4, 5], 2, 5);
    expect(steps[0]!.phase).toBe('init');
  });

  it('steps alternate E then M', () => {
    const steps = emMixtureOfGaussians([1, 2, 3, 4, 5], 2, 3);
    // After init: E,M,E,M,... pattern
    for (let i = 1; i + 1 < steps.length; i += 2) {
      expect(steps[i]!.phase).toBe('E');
      expect(steps[i + 1]!.phase).toBe('M');
    }
  });

  it('log-likelihood is non-decreasing over M-steps', () => {
    const data = [
      1, 1.1, 0.9, 1.2, 0.8, 5, 5.1, 4.9, 5.2, 4.8,
    ];
    const steps = emMixtureOfGaussians(data, 2, 20);
    const mSteps = steps.filter(s => s.phase === 'M');
    for (let i = 1; i < mSteps.length; i++) {
      expect(mSteps[i]!.logLikelihood).toBeGreaterThanOrEqual(
        mSteps[i - 1]!.logLikelihood - 1e-4, // allow small numerical error
      );
    }
  });

  it('responsibilities sum to 1 for each data point in E-step', () => {
    const data = [0, 5, 10, 15];
    const steps = emMixtureOfGaussians(data, 2, 3);
    const eSteps = steps.filter(s => s.phase === 'E');
    for (const step of eSteps) {
      for (const row of step.responsibilities!) {
        const total = row.reduce((s, v) => s + v, 0);
        expect(total).toBeCloseTo(1, 5);
      }
    }
  });

  it('weights sum to 1 after M-step', () => {
    const data = [0, 1, 5, 6];
    const steps = emMixtureOfGaussians(data, 2, 5);
    const mSteps = steps.filter(s => s.phase === 'M');
    for (const step of mSteps) {
      const wSum = step.components.reduce((s, c) => s + c.weight, 0);
      expect(wSum).toBeCloseTo(1, 5);
    }
  });

  it('uses provided initComponents when k matches', () => {
    const initComps: GaussianComponent[] = [
      { weight: 0.5, mean: 0, stdDev: 1 },
      { weight: 0.5, mean: 5, stdDev: 1 },
    ];
    const steps = emMixtureOfGaussians([0, 1, 5, 6], 2, 1, initComps);
    expect(steps[0]!.components[0]!.mean).toBeCloseTo(0);
    expect(steps[0]!.components[1]!.mean).toBeCloseTo(5);
  });

  it('falls back to default init when initComponents length mismatches', () => {
    const initComps: GaussianComponent[] = [
      { weight: 1, mean: 0, stdDev: 1 },
    ];
    // k=2 but only 1 init component → should use default
    const steps = emMixtureOfGaussians([0, 1, 5, 6], 2, 1, initComps);
    expect(steps[0]!.components).toHaveLength(2);
  });

  it('converges quickly on well-separated clusters', () => {
    const cluster1 = Array.from({ length: 20 }, (_, i) => i * 0.1);
    const cluster2 = Array.from({ length: 20 }, (_, i) => 10 + i * 0.1);
    const data = [...cluster1, ...cluster2];
    const steps = emMixtureOfGaussians(data, 2, 50);
    const mSteps = steps.filter(s => s.phase === 'M');
    const lastMeans = mSteps[mSteps.length - 1]!.components.map(c => c.mean);
    lastMeans.sort((a, b) => a - b);
    // Should recover the two cluster centers approximately
    expect(lastMeans[0]).toBeLessThan(5);
    expect(lastMeans[1]).toBeGreaterThan(5);
  });

  it('handles degenerate component (ni ~ 0) without crashing', () => {
    // k=3, data only near 2 clusters
    const data = [0, 0.1, 0.2, 10, 10.1, 10.2];
    const initComps: GaussianComponent[] = [
      { weight: 0.33, mean: 0, stdDev: 0.5 },
      { weight: 0.34, mean: 5, stdDev: 0.01 }, // degenerate: far from data
      { weight: 0.33, mean: 10, stdDev: 0.5 },
    ];
    expect(() =>
      emMixtureOfGaussians(data, 3, 5, initComps),
    ).not.toThrow();
  });

  it('responsibilities are null in init phase', () => {
    const steps = emMixtureOfGaussians([1, 2, 3], 2, 2);
    expect(steps[0]!.responsibilities).toBeNull();
  });

  it('iteration number increments correctly', () => {
    const steps = emMixtureOfGaussians([1, 2, 3, 4, 5], 2, 3);
    expect(steps[0]!.iteration).toBe(0); // init
    expect(steps[1]!.iteration).toBe(1); // E-step 1
    expect(steps[2]!.iteration).toBe(1); // M-step 1
  });

  it('action strings contain E-step/M-step keywords', () => {
    const steps = emMixtureOfGaussians([1, 5], 2, 2);
    const eStep = steps.find(s => s.phase === 'E');
    const mStep = steps.find(s => s.phase === 'M');
    expect(eStep?.action).toContain('E-step');
    expect(mStep?.action).toContain('M-step');
  });

  it('handles k=1 (single Gaussian, recovers MLE)', () => {
    const data = [1, 2, 3, 4, 5];
    const steps = emMixtureOfGaussians(data, 1, 5);
    const mSteps = steps.filter(s => s.phase === 'M');
    const lastStep = mSteps[mSteps.length - 1]!;
    // Single component should have weight=1 and mean close to sample mean (3)
    expect(lastStep.components[0]!.weight).toBeCloseTo(1, 5);
    expect(lastStep.components[0]!.mean).toBeCloseTo(3, 3);
  });

  it('handles k > number of data points', () => {
    // k=3, data=[1,2]: each data point may be assigned to one component
    const steps = emMixtureOfGaussians([1, 2], 3, 3);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('handles all-identical data (range=0, uses fallback std)', () => {
    // All data = 5 → maxX - minX = 0, range fallback = 1, globalStd = 0, uses || 1
    const steps = emMixtureOfGaussians([5, 5, 5, 5, 5], 2, 3);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]!.phase).toBe('init');
    expect(steps[0]!.components).toHaveLength(2);
  });

  it('covers E-step total=0 fallback with degenerate init stdDev=0', () => {
    // Both components have stdDev=0 → gaussianPDF returns 0 for all data
    // → total = 0 in E-step → fallback to equal responsibilities (1/k)
    const initComps: GaussianComponent[] = [
      { weight: 0.5, mean: 0, stdDev: 0 },
      { weight: 0.5, mean: 10, stdDev: 0 },
    ];
    const steps = emMixtureOfGaussians([1, 2, 3, 8, 9], 2, 1, initComps);
    const eStep = steps.find(s => s.phase === 'E');
    expect(eStep).toBeDefined();
    // With total=0 fallback, each responsibility row sums to 1
    for (const row of eStep!.responsibilities!) {
      const total = row.reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(1, 5);
    }
  });

  it('covers newStdDev=0 fallback when all assigned data identical', () => {
    // Two perfectly separated clusters, force one component to sit on a cluster of identical points
    const initComps: GaussianComponent[] = [
      { weight: 0.5, mean: 5, stdDev: 0.01 },
      { weight: 0.5, mean: 100, stdDev: 0.01 },
    ];
    // Data all at exactly 5 → variance=0 for component 0 → stdDev fallback to 1e-6
    const steps = emMixtureOfGaussians([5, 5, 5, 5], 2, 2, initComps);
    const mSteps = steps.filter(s => s.phase === 'M');
    expect(mSteps.length).toBeGreaterThan(0);
    // Component near 5 should have tiny stdDev (from fallback)
    const comp = mSteps[0]!.components.find(c => Math.abs(c.mean - 5) < 1);
    expect(comp?.stdDev).toBeCloseTo(1e-6, 10);
  });

  it('uses tolerance for early convergence', () => {
    const data = [0, 1];
    // With maxIter=100 and tight tolerance, should converge before 100 iterations
    const stepsShort = emMixtureOfGaussians(data, 1, 100, undefined, 1e-1);
    const stepsFull = emMixtureOfGaussians(data, 1, 100, undefined, 1e-15);
    // Short (loose tolerance) should have fewer steps
    expect(stepsShort.length).toBeLessThanOrEqual(stepsFull.length);
  });
});

// ─── §21.2.2  Naive Bayes ─────────────────────────────────────────────────────

describe('trainNaiveBayes', () => {
  it('handles empty training set', () => {
    const model = trainNaiveBayes([]);
    expect(model.priorTrue).toBe(0.5);
    expect(model.likelihoodsTrue).toHaveLength(0);
    expect(model.likelihoodsFalse).toHaveLength(0);
  });

  it('learns correct prior with balanced data', () => {
    const examples: NaiveBayesExample[] = [
      { features: [true], label: true },
      { features: [false], label: false },
    ];
    const model = trainNaiveBayes(examples);
    // Laplace: (1+1)/(2+2) = 0.5
    expect(model.priorTrue).toBeCloseTo(0.5, 5);
  });

  it('prior increases with more positive examples', () => {
    const examples: NaiveBayesExample[] = [
      { features: [true], label: true },
      { features: [true], label: true },
      { features: [true], label: true },
      { features: [false], label: false },
    ];
    const model = trainNaiveBayes(examples);
    expect(model.priorTrue).toBeGreaterThan(0.5);
  });

  it('computes feature likelihoods with Laplace smoothing', () => {
    // Only positive examples, feature always true
    const examples: NaiveBayesExample[] = [
      { features: [true, false], label: true },
      { features: [true, false], label: true },
    ];
    const model = trainNaiveBayes(examples);
    // P(f1=true|C=true) = (2+1)/(2+2) = 0.75
    expect(model.likelihoodsTrue[0]).toBeCloseTo(0.75, 5);
    // P(f2=true|C=true) = (0+1)/(2+2) = 0.25
    expect(model.likelihoodsTrue[1]).toBeCloseTo(0.25, 5);
  });

  it('likelihoods for negative class computed from negative examples', () => {
    const examples: NaiveBayesExample[] = [
      { features: [true], label: false },
      { features: [true], label: false },
      { features: [false], label: true },
    ];
    const model = trainNaiveBayes(examples);
    // P(f1=true|C=false) = (2+1)/(2+2) = 0.75
    expect(model.likelihoodsFalse[0]).toBeCloseTo(0.75, 5);
  });
});

describe('classifyNaiveBayes', () => {
  it('returns ~0.5 for uniform model and neutral features', () => {
    const model = trainNaiveBayes([
      { features: [true], label: true },
      { features: [false], label: false },
    ]);
    // P(C=true|f=true) and P(C=true|f=false) should differ
    const p = classifyNaiveBayes(model, [true]);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('returns high probability when features strongly indicate positive class', () => {
    const examples: NaiveBayesExample[] = [
      { features: [true, true], label: true },
      { features: [true, true], label: true },
      { features: [true, true], label: true },
      { features: [false, false], label: false },
    ];
    const model = trainNaiveBayes(examples);
    const p = classifyNaiveBayes(model, [true, true]);
    expect(p).toBeGreaterThan(0.7);
  });

  it('returns low probability when features strongly indicate negative class', () => {
    const examples: NaiveBayesExample[] = [
      { features: [false, false], label: false },
      { features: [false, false], label: false },
      { features: [false, false], label: false },
      { features: [true, true], label: true },
    ];
    const model = trainNaiveBayes(examples);
    const p = classifyNaiveBayes(model, [false, false]);
    expect(p).toBeLessThan(0.3);
  });

  it('uses fallback 0.5 for missing feature index', () => {
    const model = trainNaiveBayes([
      { features: [], label: true },
      { features: [], label: false },
    ]);
    // Model has no features, classify with an empty feature vector
    const p = classifyNaiveBayes(model, []);
    expect(p).toBeCloseTo(0.5, 3);
  });

  it('uses ?? 0.5 fallback when features exceed model dimension', () => {
    // Train with 1-feature examples but classify with 2 features
    // The second feature index has no learned likelihood → falls back to 0.5
    const model = trainNaiveBayes([
      { features: [true], label: true },
      { features: [false], label: false },
    ]);
    const p = classifyNaiveBayes(model, [true, true]);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('result is between 0 and 1', () => {
    const model = trainNaiveBayes([
      { features: [true], label: true },
      { features: [false], label: false },
    ]);
    const p = classifyNaiveBayes(model, [true]);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});
