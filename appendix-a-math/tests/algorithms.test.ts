import { describe, it, expect } from 'vitest';
import {
  growthRate,
  compareComplexities,
  isBigOValid,
  findBigOConstants,
  addVectors,
  scaleVector,
  dotProduct,
  matMul,
  transpose,
  applyTransform,
  eigenvalues2x2,
  gaussianPDF,
  gaussianCDF,
  uniformPDF,
  uniformCDF,
  bernoulliPMF,
  binomialPMF,
  poissonPMF,
  exponentialPDF,
  exponentialCDF,
  betaPDF,
  logGamma,
  sampleMean,
  sampleVariance,
} from '../src/algorithms/index';

// ─── §A.1: growthRate ─────────────────────────────────────────────────────────

describe('growthRate', () => {
  it('constant always returns 1', () => {
    expect(growthRate(0, 'constant')).toBe(1);
    expect(growthRate(100, 'constant')).toBe(1);
  });

  it('logarithmic: n=0 returns 0', () => {
    expect(growthRate(0, 'logarithmic')).toBe(0);
  });

  it('logarithmic: n=1 returns 0 (log2(1)=0)', () => {
    expect(growthRate(1, 'logarithmic')).toBe(0);
  });

  it('logarithmic: n=8 returns 3', () => {
    expect(growthRate(8, 'logarithmic')).toBe(3);
  });

  it('linear: n=0 returns 0', () => {
    expect(growthRate(0, 'linear')).toBe(0);
  });

  it('linear: n=5 returns 5', () => {
    expect(growthRate(5, 'linear')).toBe(5);
  });

  it('linearithmic: n=0 returns 0', () => {
    expect(growthRate(0, 'linearithmic')).toBe(0);
  });

  it('linearithmic: n=4 returns 4*log2(4)=8', () => {
    expect(growthRate(4, 'linearithmic')).toBeCloseTo(8, 10);
  });

  it('quadratic: n=3 returns 9', () => {
    expect(growthRate(3, 'quadratic')).toBe(9);
  });

  it('quadratic: n=0 returns 0', () => {
    expect(growthRate(0, 'quadratic')).toBe(0);
  });

  it('cubic: n=3 returns 27', () => {
    expect(growthRate(3, 'cubic')).toBe(27);
  });

  it('cubic: n=0 returns 0', () => {
    expect(growthRate(0, 'cubic')).toBe(0);
  });

  it('exponential: n=0 returns 1 (2^0=1)', () => {
    expect(growthRate(0, 'exponential')).toBe(1);
  });

  it('exponential: n=10 returns 1024', () => {
    expect(growthRate(10, 'exponential')).toBe(1024);
  });

  it('factorial: n=0 returns 1 (0!=1)', () => {
    expect(growthRate(0, 'factorial')).toBe(1);
  });

  it('factorial: n=1 returns 1', () => {
    expect(growthRate(1, 'factorial')).toBe(1);
  });

  it('factorial: n=5 returns 120', () => {
    expect(growthRate(5, 'factorial')).toBe(120);
  });

  it('factorial: n=20 returns 2432902008176640000', () => {
    expect(growthRate(20, 'factorial')).toBe(2432902008176640000);
  });

  it('factorial: n=25 is capped at 20! value', () => {
    // cap at min(25, 20) = 20, so same as n=20
    expect(growthRate(25, 'factorial')).toBe(growthRate(20, 'factorial'));
  });
});

// ─── §A.1: compareComplexities ────────────────────────────────────────────────

describe('compareComplexities', () => {
  it('returns all 8 keys at n=1', () => {
    const result = compareComplexities(1);
    const keys = Object.keys(result);
    expect(keys).toHaveLength(8);
    expect(result.constant).toBe(1);
    expect(result.linear).toBe(1);
    expect(result.quadratic).toBe(1);
  });

  it('returns correct values at n=4', () => {
    const result = compareComplexities(4);
    expect(result.constant).toBe(1);
    expect(result.logarithmic).toBe(2);
    expect(result.linear).toBe(4);
    expect(result.linearithmic).toBeCloseTo(8, 10);
    expect(result.quadratic).toBe(16);
    expect(result.cubic).toBe(64);
    expect(result.exponential).toBe(16);
    expect(result.factorial).toBe(24);
  });

  it('handles n=0 without errors', () => {
    const result = compareComplexities(0);
    expect(result.constant).toBe(1);
    expect(result.logarithmic).toBe(0);
    expect(result.linear).toBe(0);
  });
});

// ─── §A.1: isBigOValid ────────────────────────────────────────────────────────

describe('isBigOValid', () => {
  it('returns true when f ≤ c*g for all n ≥ n0', () => {
    // f(n)=n, g(n)=n^2, c=1, n0=1 → n ≤ n^2 for n≥1 ✓
    const f = [1, 2, 3, 4, 5];
    const g = [1, 4, 9, 16, 25];
    expect(isBigOValid(f, g, 1, 1)).toBe(true);
  });

  it('returns false when f > c*g for some n ≥ n0', () => {
    // f(n)=n^2, g(n)=n, c=1, n0=1: n^2 > n for n>1 → false
    const f = [1, 4, 9];
    const g = [1, 2, 3];
    expect(isBigOValid(f, g, 1, 1)).toBe(false);
  });

  it('ignores indices where n < n0', () => {
    // f(n)=n^2, g(n)=n, c=1, n0=2: skip n=1 (1≤1), check n=2 (4>2 false), ...
    // but c=10, n0=2: 10*2=20≥4, 10*3=30≥9 → true
    const f = [1, 4, 9];
    const g = [1, 2, 3];
    expect(isBigOValid(f, g, 10, 2)).toBe(true);
  });

  it('returns true when n0 is beyond array length', () => {
    const f = [100, 200];
    const g = [1, 1];
    expect(isBigOValid(f, g, 1, 10)).toBe(true);
  });

  it('works when arrays differ in length (uses min length)', () => {
    const f = [1, 2, 3, 4];
    const g = [2, 4];
    // min length = 2; f[0]=1≤2, f[1]=2≤4 → true
    expect(isBigOValid(f, g, 1, 1)).toBe(true);
  });
});

// ─── §A.1: findBigOConstants ──────────────────────────────────────────────────

describe('findBigOConstants', () => {
  it('finds c=1, n0=1 when f already ≤ g everywhere', () => {
    const f = [1, 2, 3];
    const g = [1, 2, 3];
    const result = findBigOConstants(f, g);
    expect(result).not.toBeNull();
    expect(result!.c).toBe(1);
    expect(result!.n0).toBe(1);
  });

  it('finds appropriate c when f > g initially but settles', () => {
    // f = [10, 11, 12], g = [1, 4, 9]; need c ≥ ceil(10/1)=10
    // with c=10: f[0]=10≤10*1 ✓, f[1]=11≤10*4 ✓, f[2]=12≤10*9 ✓ → n0=1
    const f = [10, 11, 12];
    const g = [1, 4, 9];
    const result = findBigOConstants(f, g);
    expect(result).not.toBeNull();
    expect(result!.c).toBeGreaterThanOrEqual(1);
    // Verify the result is actually valid
    expect(isBigOValid(f, g, result!.c, result!.n0)).toBe(true);
  });

  it('returns vacuously valid answer when g is all zeros (n0 past array end)', () => {
    // f=[1,2,3], g=[0,0,0]: every index is a violation for c=1,
    // so lastViolation=2 → n0=4 > array length → vacuously true
    const f = [1, 2, 3];
    const g = [0, 0, 0];
    const result = findBigOConstants(f, g);
    expect(result).not.toBeNull();
    // n0 is beyond the array, so isBigOValid is vacuously true
    expect(isBigOValid(f, g, result!.c, result!.n0)).toBe(true);
  });

  it('finds n0 > 1 when f > g at n=1 but holds after', () => {
    // f = [100, 2, 3], g = [1, 2, 3]
    // c=1: violation at i=0 (n=1), so n0=2; check n≥2: f[1]=2≤2, f[2]=3≤3 ✓
    const f = [100, 2, 3];
    const g = [1, 2, 3];
    const result = findBigOConstants(f, g);
    expect(result).not.toBeNull();
    expect(isBigOValid(f, g, result!.c, result!.n0)).toBe(true);
  });
});

// ─── §A.2: addVectors ─────────────────────────────────────────────────────────

describe('addVectors', () => {
  it('adds two vectors element-wise', () => {
    expect(addVectors([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it('works with empty vectors', () => {
    expect(addVectors([], [])).toEqual([]);
  });

  it('works with negative values', () => {
    expect(addVectors([-1, -2], [1, 2])).toEqual([0, 0]);
  });
});

// ─── §A.2: scaleVector ────────────────────────────────────────────────────────

describe('scaleVector', () => {
  it('multiplies every element by scalar', () => {
    expect(scaleVector([1, 2, 3], 3)).toEqual([3, 6, 9]);
  });

  it('scalar=0 gives zero vector', () => {
    expect(scaleVector([5, 10], 0)).toEqual([0, 0]);
  });

  it('scalar=-1 negates the vector', () => {
    expect(scaleVector([1, -2], -1)).toEqual([-1, 2]);
  });
});

// ─── §A.2: dotProduct ─────────────────────────────────────────────────────────

describe('dotProduct', () => {
  it('computes dot product correctly', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('orthogonal vectors have dot product 0', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it('empty vectors have dot product 0', () => {
    expect(dotProduct([], [])).toBe(0);
  });
});

// ─── §A.2: matMul ─────────────────────────────────────────────────────────────

describe('matMul', () => {
  it('multiplies two 2x2 matrices', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(matMul(A, B)).toEqual([[19, 22], [43, 50]]);
  });

  it('multiplies identity by matrix', () => {
    const I = [[1, 0], [0, 1]];
    const M = [[3, 4], [5, 6]];
    expect(matMul(I, M)).toEqual(M);
  });

  it('multiplies non-square matrices (2x3 * 3x2)', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const B = [[7, 8], [9, 10], [11, 12]];
    const C = matMul(A, B);
    // Row 0: [1*7+2*9+3*11, 1*8+2*10+3*12] = [58, 64]
    // Row 1: [4*7+5*9+6*11, 4*8+5*10+6*12] = [139, 154]
    expect(C).toEqual([[58, 64], [139, 154]]);
  });
});

// ─── §A.2: transpose ──────────────────────────────────────────────────────────

describe('transpose', () => {
  it('transposes a 2x3 matrix to 3x2', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(transpose(A)).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  it('transposes a square matrix', () => {
    const A = [[1, 2], [3, 4]];
    expect(transpose(A)).toEqual([[1, 3], [2, 4]]);
  });

  it('returns empty array for empty input', () => {
    expect(transpose([])).toEqual([]);
  });

  it('double transpose is identity', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(transpose(transpose(A))).toEqual(A);
  });
});

// ─── §A.2: applyTransform ─────────────────────────────────────────────────────

describe('applyTransform', () => {
  it('applies identity transform', () => {
    const I: [[number, number], [number, number]] = [[1, 0], [0, 1]];
    expect(applyTransform(I, [3, 4])).toEqual([3, 4]);
  });

  it('applies scaling transform', () => {
    const S: [[number, number], [number, number]] = [[2, 0], [0, 3]];
    expect(applyTransform(S, [1, 1])).toEqual([2, 3]);
  });

  it('applies rotation-like transform', () => {
    const R: [[number, number], [number, number]] = [[0, -1], [1, 0]];
    // Rotates [1, 0] → [0, 1]
    expect(applyTransform(R, [1, 0])).toEqual([0, 1]);
  });
});

// ─── §A.2: eigenvalues2x2 ─────────────────────────────────────────────────────

describe('eigenvalues2x2', () => {
  it('computes real distinct eigenvalues', () => {
    // [[2,0],[0,3]] → eigenvalues 3, 2
    const m: [[number, number], [number, number]] = [[2, 0], [0, 3]];
    const evs = eigenvalues2x2(m);
    expect(evs).toHaveLength(2);
    const reals = evs.map(e => e.real).sort((a, b) => b - a);
    expect(reals[0]).toBeCloseTo(3, 10);
    expect(reals[1]).toBeCloseTo(2, 10);
    expect(evs[0]!.imag).toBe(0);
    expect(evs[1]!.imag).toBe(0);
  });

  it('computes real equal eigenvalues', () => {
    // [[2,0],[0,2]] → eigenvalue 2 (double)
    const m: [[number, number], [number, number]] = [[2, 0], [0, 2]];
    const evs = eigenvalues2x2(m);
    expect(evs[0]!.real).toBeCloseTo(2, 10);
    expect(evs[1]!.real).toBeCloseTo(2, 10);
    expect(evs[0]!.imag).toBe(0);
    expect(evs[1]!.imag).toBe(0);
  });

  it('computes complex conjugate eigenvalues for negative discriminant', () => {
    // [[0,-1],[1,0]] → trace=0, det=1, discriminant=0-4=-4
    // eigenvalues = ±i
    const m: [[number, number], [number, number]] = [[0, -1], [1, 0]];
    const evs = eigenvalues2x2(m);
    expect(evs[0]!.real).toBeCloseTo(0, 10);
    expect(evs[0]!.imag).toBeCloseTo(1, 10);
    expect(evs[1]!.real).toBeCloseTo(0, 10);
    expect(evs[1]!.imag).toBeCloseTo(-1, 10);
  });

  it('computes eigenvalues for non-diagonal matrix with real roots', () => {
    // [[3,1],[1,3]] → trace=6, det=8, disc=36-32=4 → λ = (6±2)/2 = 4, 2
    const m: [[number, number], [number, number]] = [[3, 1], [1, 3]];
    const evs = eigenvalues2x2(m);
    const reals = evs.map(e => e.real).sort((a, b) => b - a);
    expect(reals[0]).toBeCloseTo(4, 10);
    expect(reals[1]).toBeCloseTo(2, 10);
  });
});

// ─── §A.3: gaussianPDF ────────────────────────────────────────────────────────

describe('gaussianPDF', () => {
  it('peak at mean is 1/(σ√(2π))', () => {
    const std = 1;
    const expected = 1 / (std * Math.sqrt(2 * Math.PI));
    expect(gaussianPDF(0, 0, std)).toBeCloseTo(expected, 10);
  });

  it('symmetric around mean', () => {
    expect(gaussianPDF(1, 0, 1)).toBeCloseTo(gaussianPDF(-1, 0, 1), 10);
  });

  it('non-zero std=2 and mean=5', () => {
    const val = gaussianPDF(5, 5, 2);
    expect(val).toBeCloseTo(1 / (2 * Math.sqrt(2 * Math.PI)), 10);
  });
});

// ─── §A.3: gaussianCDF ────────────────────────────────────────────────────────

describe('gaussianCDF', () => {
  it('CDF at mean is 0.5', () => {
    expect(gaussianCDF(0, 0, 1)).toBeCloseTo(0.5, 5);
  });

  it('CDF at mean+2σ is ~0.9772', () => {
    expect(gaussianCDF(2, 0, 1)).toBeCloseTo(0.9772, 3);
  });

  it('CDF at mean-2σ is ~0.0228', () => {
    expect(gaussianCDF(-2, 0, 1)).toBeCloseTo(0.0228, 3);
  });

  it('CDF is monotonically non-decreasing', () => {
    const v1 = gaussianCDF(0, 0, 1);
    const v2 = gaussianCDF(1, 0, 1);
    expect(v2).toBeGreaterThan(v1);
  });
});

// ─── §A.3: uniformPDF ─────────────────────────────────────────────────────────

describe('uniformPDF', () => {
  it('returns 1/(b-a) inside [a,b]', () => {
    expect(uniformPDF(0.5, 0, 1)).toBeCloseTo(1, 10);
    expect(uniformPDF(2, 0, 4)).toBeCloseTo(0.25, 10);
  });

  it('returns 0 outside [a,b]', () => {
    expect(uniformPDF(-0.1, 0, 1)).toBe(0);
    expect(uniformPDF(1.1, 0, 1)).toBe(0);
  });

  it('returns correct value at boundary points', () => {
    expect(uniformPDF(0, 0, 1)).toBeCloseTo(1, 10);
    expect(uniformPDF(1, 0, 1)).toBeCloseTo(1, 10);
  });
});

// ─── §A.3: uniformCDF ─────────────────────────────────────────────────────────

describe('uniformCDF', () => {
  it('returns 0 below a', () => {
    expect(uniformCDF(-1, 0, 1)).toBe(0);
  });

  it('returns 1 above b', () => {
    expect(uniformCDF(2, 0, 1)).toBe(1);
  });

  it('returns (x-a)/(b-a) inside [a,b]', () => {
    expect(uniformCDF(0.5, 0, 1)).toBeCloseTo(0.5, 10);
    expect(uniformCDF(1, 0, 4)).toBeCloseTo(0.25, 10);
  });

  it('CDF at a returns 0, at b returns 1', () => {
    expect(uniformCDF(0, 0, 1)).toBeCloseTo(0, 10);
    expect(uniformCDF(1, 0, 1)).toBeCloseTo(1, 10);
  });
});

// ─── §A.3: bernoulliPMF ───────────────────────────────────────────────────────

describe('bernoulliPMF', () => {
  it('P(1) = p', () => {
    expect(bernoulliPMF(1, 0.7)).toBeCloseTo(0.7, 10);
  });

  it('P(0) = 1-p', () => {
    expect(bernoulliPMF(0, 0.7)).toBeCloseTo(0.3, 10);
  });

  it('fair coin: P(1)=P(0)=0.5', () => {
    expect(bernoulliPMF(1, 0.5)).toBeCloseTo(0.5, 10);
    expect(bernoulliPMF(0, 0.5)).toBeCloseTo(0.5, 10);
  });
});

// ─── §A.3: binomialPMF ────────────────────────────────────────────────────────

describe('binomialPMF', () => {
  it('P(0; n=1, p=0.5) = 0.5', () => {
    expect(binomialPMF(0, 1, 0.5)).toBeCloseTo(0.5, 10);
  });

  it('P(1; n=1, p=0.5) = 0.5', () => {
    expect(binomialPMF(1, 1, 0.5)).toBeCloseTo(0.5, 10);
  });

  it('sums to 1 for n=10, p=0.3', () => {
    let total = 0;
    for (let k = 0; k <= 10; k++) total += binomialPMF(k, 10, 0.3);
    expect(total).toBeCloseTo(1, 6);
  });

  it('returns 0 for k < 0', () => {
    expect(binomialPMF(-1, 5, 0.5)).toBe(0);
  });

  it('returns 0 for k > n', () => {
    expect(binomialPMF(6, 5, 0.5)).toBe(0);
  });

  it('p=0: only k=0 has probability 1', () => {
    expect(binomialPMF(0, 5, 0)).toBe(1);
    expect(binomialPMF(1, 5, 0)).toBe(0);
  });

  it('p=1: only k=n has probability 1', () => {
    expect(binomialPMF(5, 5, 1)).toBe(1);
    expect(binomialPMF(4, 5, 1)).toBe(0);
  });

  it('handles large n without overflow', () => {
    const v = binomialPMF(50, 100, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

// ─── §A.3: poissonPMF ─────────────────────────────────────────────────────────

describe('poissonPMF', () => {
  it('P(0; λ=1) = e^-1', () => {
    expect(poissonPMF(0, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  it('sums to ≈1 for λ=3, k=0..30', () => {
    let total = 0;
    for (let k = 0; k <= 30; k++) total += poissonPMF(k, 3);
    expect(total).toBeCloseTo(1, 5);
  });

  it('returns 0 for k < 0', () => {
    expect(poissonPMF(-1, 2)).toBe(0);
  });

  it('lambda=0: P(0)=1, P(k>0)=0', () => {
    expect(poissonPMF(0, 0)).toBe(1);
    expect(poissonPMF(1, 0)).toBe(0);
  });
});

// ─── §A.3: exponentialPDF ─────────────────────────────────────────────────────

describe('exponentialPDF', () => {
  it('f(0; λ=1) = 1', () => {
    expect(exponentialPDF(0, 1)).toBeCloseTo(1, 10);
  });

  it('f(1; λ=1) = e^-1', () => {
    expect(exponentialPDF(1, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  it('returns 0 for x < 0', () => {
    expect(exponentialPDF(-1, 1)).toBe(0);
  });
});

// ─── §A.3: exponentialCDF ─────────────────────────────────────────────────────

describe('exponentialCDF', () => {
  it('F(0) = 0', () => {
    expect(exponentialCDF(0, 1)).toBeCloseTo(0, 10);
  });

  it('F(x) = 1 - e^(-λx)', () => {
    expect(exponentialCDF(2, 0.5)).toBeCloseTo(1 - Math.exp(-1), 10);
  });

  it('returns 0 for x < 0', () => {
    expect(exponentialCDF(-1, 1)).toBe(0);
  });

  it('F approaches 1 for large x', () => {
    expect(exponentialCDF(100, 1)).toBeCloseTo(1, 5);
  });
});

// ─── §A.3: betaPDF ────────────────────────────────────────────────────────────

describe('betaPDF', () => {
  it('Uniform on [0,1] when α=β=1', () => {
    // Beta(1,1) = Uniform(0,1), PDF = 1
    expect(betaPDF(0.5, 1, 1)).toBeCloseTo(1, 5);
  });

  it('integrates to ≈1 for α=2, β=3', () => {
    // Numerical integration via trapezoidal rule
    let sum = 0;
    const n = 10000;
    const dx = 1 / n;
    for (let i = 0; i <= n; i++) {
      const x = i * dx;
      const w = i === 0 || i === n ? 0.5 : 1;
      sum += w * betaPDF(x, 2, 3) * dx;
    }
    expect(sum).toBeCloseTo(1, 3);
  });

  it('returns 0 for x outside [0,1]', () => {
    expect(betaPDF(-0.1, 2, 2)).toBe(0);
    expect(betaPDF(1.1, 2, 2)).toBe(0);
  });

  it('x=0, α<1: returns Infinity', () => {
    expect(betaPDF(0, 0.5, 2)).toBe(Infinity);
  });

  it('x=0, α>1: returns 0', () => {
    expect(betaPDF(0, 2, 2)).toBe(0);
  });

  it('x=0, α=1: returns finite positive value', () => {
    const val = betaPDF(0, 1, 2);
    expect(val).toBeGreaterThan(0);
    expect(isFinite(val)).toBe(true);
  });

  it('x=1, β<1: returns Infinity', () => {
    expect(betaPDF(1, 2, 0.5)).toBe(Infinity);
  });

  it('x=1, β>1: returns 0', () => {
    expect(betaPDF(1, 2, 2)).toBe(0);
  });

  it('x=1, β=1: returns finite positive value', () => {
    const val = betaPDF(1, 2, 1);
    expect(val).toBeGreaterThan(0);
    expect(isFinite(val)).toBe(true);
  });
});

// ─── §A.3: logGamma ───────────────────────────────────────────────────────────

describe('logGamma', () => {
  it('logGamma(1) ≈ 0 (Γ(1)=1)', () => {
    expect(logGamma(1)).toBeCloseTo(0, 8);
  });

  it('logGamma(2) ≈ 0 (Γ(2)=1!=1)', () => {
    expect(logGamma(2)).toBeCloseTo(0, 8);
  });

  it('logGamma(3) ≈ ln(2) (Γ(3)=2!=2)', () => {
    expect(logGamma(3)).toBeCloseTo(Math.log(2), 8);
  });

  it('logGamma(0.5) ≈ ln(√π) (Γ(0.5)=√π)', () => {
    expect(logGamma(0.5)).toBeCloseTo(0.5 * Math.log(Math.PI), 6);
  });

  it('uses reflection formula for x < 0.5', () => {
    // logGamma(0.25) should be finite and match known value
    const val = logGamma(0.25);
    expect(isFinite(val)).toBe(true);
    expect(val).toBeGreaterThan(0);
  });
});

// ─── §A.3: sampleMean ─────────────────────────────────────────────────────────

describe('sampleMean', () => {
  it('returns 0 for empty array', () => {
    expect(sampleMean([])).toBe(0);
  });

  it('returns value itself for single element', () => {
    expect(sampleMean([7])).toBe(7);
  });

  it('computes mean correctly', () => {
    expect(sampleMean([1, 2, 3, 4, 5])).toBeCloseTo(3, 10);
  });

  it('works with negative values', () => {
    expect(sampleMean([-2, -1, 0, 1, 2])).toBeCloseTo(0, 10);
  });
});

// ─── §A.3: sampleVariance ─────────────────────────────────────────────────────

describe('sampleVariance', () => {
  it('returns 0 for empty array', () => {
    expect(sampleVariance([])).toBe(0);
  });

  it('returns 0 for single element (n<2)', () => {
    expect(sampleVariance([42])).toBe(0);
  });

  it('computes variance for [1,2,3] → 1', () => {
    // mean=2, deviations: -1, 0, 1, sum of sq = 2, / (3-1) = 1
    expect(sampleVariance([1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('returns 0 for constant array', () => {
    expect(sampleVariance([5, 5, 5, 5])).toBeCloseTo(0, 10);
  });

  it('computes larger variance correctly', () => {
    // mean=0, values=[-3,3], sum of sq = 18, / 1 = 18
    expect(sampleVariance([-3, 3])).toBeCloseTo(18, 10);
  });
});
