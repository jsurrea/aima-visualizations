import { describe, it, expect } from 'vitest';
import {
  normalize,
  matMul,
  matTranspose,
  matInverse2x2,
  matInverse,
  matAdd,
  matSub,
  matScale,
  matVecMul,
  outerProduct,
  identityMatrix,
  hmmForward,
  hmmBackward,
  forwardBackward,
  viterbi,
  kalmanFilter1D,
  kalmanFilter2D,
  particleFilter,
  type HMMParams,
  type KalmanParams1D,
  type KalmanParams2D,
} from '../src/algorithms/index';

// ─── Umbrella-world HMM (§14.2 example) ──────────────────────────────────────
//
//  States:  0 = Rain,  1 = No-Rain
//  T[i][j] = P(X_t=j | X_{t-1}=i)
//    T = [[0.7, 0.3],   Rain→Rain=0.7, Rain→NoRain=0.3
//         [0.3, 0.7]]   NoRain→Rain=0.3, NoRain→NoRain=0.7
//
//  observationProbs[e][s]:
//    e=0 (umbrella=T): P(U|R)=0.9, P(U|¬R)=0.2
//    e=1 (umbrella=F): P(¬U|R)=0.1, P(¬U|¬R)=0.8
//
//  prior = [0.5, 0.5]
//
const umbrellaHMM: HMMParams = {
  numStates: 2,
  transitionMatrix: [
    [0.7, 0.3],
    [0.3, 0.7],
  ],
  prior: [0.5, 0.5],
  observationProbs: [
    [0.9, 0.2], // e=0 (umbrella seen)
    [0.1, 0.8], // e=1 (umbrella not seen)
  ],
};

// Precision helper
function approx(a: number, b: number, eps = 1e-3): boolean {
  return Math.abs(a - b) < eps;
}

// ─── normalize ────────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('normalizes a normal vector', () => {
    const r = normalize([1, 1, 2]);
    expect(r[0]).toBeCloseTo(0.25);
    expect(r[1]).toBeCloseTo(0.25);
    expect(r[2]).toBeCloseTo(0.5);
  });

  it('returns uniform distribution for all-zero input', () => {
    const r = normalize([0, 0, 0]);
    expect(r).toHaveLength(3);
    r.forEach(v => expect(v).toBeCloseTo(1 / 3));
  });

  it('handles single-element vector', () => {
    expect(normalize([5])).toEqual([1]);
  });

  it('returns empty array for empty input (zero-sum path)', () => {
    expect(normalize([])).toEqual([]);
  });

  it('handles already-normalized vector', () => {
    const r = normalize([0.3, 0.7]);
    expect(r[0]).toBeCloseTo(0.3);
    expect(r[1]).toBeCloseTo(0.7);
  });
});

// ─── Matrix helpers ───────────────────────────────────────────────────────────

describe('matMul', () => {
  it('multiplies 2×2 matrices', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    const C = matMul(A, B);
    expect(C[0]).toEqual([19, 22]);
    expect(C[1]).toEqual([43, 50]);
  });

  it('multiplies non-square matrices (2×3 × 3×2)', () => {
    const A = [[1, 0, 2], [0, 3, 1]];
    const B = [[2, 0], [1, 1], [0, 3]];
    const C = matMul(A, B);
    // Row 0: [1*2+0*1+2*0, 1*0+0*1+2*3] = [2, 6]
    expect(C[0]).toEqual([2, 6]);
    // Row 1: [0*2+3*1+1*0, 0*0+3*1+1*3] = [3, 6]
    expect(C[1]).toEqual([3, 6]);
  });

  it('returns empty matrix for empty inputs', () => {
    expect(matMul([], [])).toEqual([]);
  });

  it('handles matrix with zero-length rows (k=0 case)', () => {
    // A is 1×0, B is 0×2 — product should be 1×0
    const A = [[]];
    const B: number[][] = [];
    const C = matMul(A, B);
    expect(C).toHaveLength(1);
    expect(C[0]).toEqual([]);
  });
});

describe('matTranspose', () => {
  it('transposes a 2×3 matrix', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const T = matTranspose(A);
    expect(T).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  it('transposes empty matrix', () => {
    expect(matTranspose([])).toEqual([]);
  });

  it('transposes a column vector (1×n → n×1)', () => {
    const A = [[1, 2, 3]];
    const T = matTranspose(A);
    expect(T).toEqual([[1], [2], [3]]);
  });
});

describe('matInverse2x2', () => {
  it('inverts [[2,1],[1,1]]', () => {
    const inv = matInverse2x2([[2, 1], [1, 1]]);
    // Expected: [[1,-1],[-1,2]]
    expect(inv[0]![0]).toBeCloseTo(1);
    expect(inv[0]![1]).toBeCloseTo(-1);
    expect(inv[1]![0]).toBeCloseTo(-1);
    expect(inv[1]![1]).toBeCloseTo(2);
  });

  it('inverts identity matrix', () => {
    const inv = matInverse2x2([[1, 0], [0, 1]]);
    expect(inv[0]![0]).toBeCloseTo(1);
    expect(inv[1]![1]).toBeCloseTo(1);
    expect(inv[0]![1]).toBeCloseTo(0);
    expect(inv[1]![0]).toBeCloseTo(0);
  });

  it('throws on singular matrix', () => {
    expect(() => matInverse2x2([[1, 2], [2, 4]])).toThrow('singular');
  });
});

describe('matInverse', () => {
  it('inverts a 1×1 matrix', () => {
    const inv = matInverse([[4]]);
    expect(inv[0]![0]).toBeCloseTo(0.25);
  });

  it('inverts a 2×2 matrix', () => {
    const inv = matInverse([[2, 1], [1, 1]]);
    expect(inv[0]![0]).toBeCloseTo(1);
    expect(inv[0]![1]).toBeCloseTo(-1);
    expect(inv[1]![0]).toBeCloseTo(-1);
    expect(inv[1]![1]).toBeCloseTo(2);
  });

  it('inverts a 3×3 matrix', () => {
    // A = [[1,0,0],[0,2,0],[0,0,4]]  →  inv = [[1,0,0],[0,0.5,0],[0,0,0.25]]
    const inv = matInverse([[1, 0, 0], [0, 2, 0], [0, 0, 4]]);
    expect(inv[0]![0]).toBeCloseTo(1);
    expect(inv[1]![1]).toBeCloseTo(0.5);
    expect(inv[2]![2]).toBeCloseTo(0.25);
  });

  it('inverts a 3×3 matrix requiring pivoting', () => {
    // [[0,1,0],[1,0,0],[0,0,2]] — first pivot would be 0 without pivoting
    const inv = matInverse([[0, 1, 0], [1, 0, 0], [0, 0, 2]]);
    // Check A·inv ≈ I
    const A = [[0, 1, 0], [1, 0, 0], [0, 0, 2]];
    const prod = matMul(A, inv);
    const id = identityMatrix(3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(prod[i]![j]).toBeCloseTo(id[i]![j]!);
      }
    }
  });

  it('throws on singular matrix', () => {
    expect(() => matInverse([[1, 2], [2, 4]])).toThrow('singular');
  });
});

describe('matAdd', () => {
  it('adds two 2×2 matrices', () => {
    const R = matAdd([[1, 2], [3, 4]], [[5, 6], [7, 8]]);
    expect(R).toEqual([[6, 8], [10, 12]]);
  });
});

describe('matSub', () => {
  it('subtracts two matrices', () => {
    const R = matSub([[5, 6], [7, 8]], [[1, 2], [3, 4]]);
    expect(R).toEqual([[4, 4], [4, 4]]);
  });
});

describe('matScale', () => {
  it('scales a matrix by a scalar', () => {
    const R = matScale([[1, 2], [3, 4]], 2);
    expect(R).toEqual([[2, 4], [6, 8]]);
  });
});

describe('matVecMul', () => {
  it('multiplies a 2×2 matrix by a vector', () => {
    const r = matVecMul([[1, 2], [3, 4]], [1, 1]);
    expect(r).toEqual([3, 7]);
  });

  it('handles zero vector', () => {
    expect(matVecMul([[1, 0], [0, 1]], [0, 0])).toEqual([0, 0]);
  });
});

describe('outerProduct', () => {
  it('computes outer product of [1,2] and [3,4]', () => {
    expect(outerProduct([1, 2], [3, 4])).toEqual([[3, 4], [6, 8]]);
  });

  it('returns empty for empty vectors', () => {
    expect(outerProduct([], [1, 2])).toEqual([]);
    expect(outerProduct([1, 2], [])).toEqual([[], []]);
  });
});

describe('identityMatrix', () => {
  it('creates a 3×3 identity', () => {
    const I = identityMatrix(3);
    expect(I[0]).toEqual([1, 0, 0]);
    expect(I[1]).toEqual([0, 1, 0]);
    expect(I[2]).toEqual([0, 0, 1]);
  });

  it('handles n=1', () => {
    expect(identityMatrix(1)).toEqual([[1]]);
  });

  it('handles n=0', () => {
    expect(identityMatrix(0)).toEqual([]);
  });
});

// ─── HMM Forward Filtering ────────────────────────────────────────────────────

describe('hmmForward', () => {
  it('returns empty array for empty evidence', () => {
    expect(hmmForward(umbrellaHMM, [])).toHaveLength(0);
  });

  it('P(R₁|u₁) ≈ [0.818, 0.182]', () => {
    const steps = hmmForward(umbrellaHMM, [0]);
    expect(steps).toHaveLength(1);
    const { belief, t, evidence } = steps[0]!;
    expect(t).toBe(1);
    expect(evidence).toBe(0);
    expect(belief[0]).toBeCloseTo(0.818, 2);
    expect(belief[1]).toBeCloseTo(0.182, 2);
  });

  it('P(R₂|u₁,u₂) ≈ [0.883, 0.117]', () => {
    const steps = hmmForward(umbrellaHMM, [0, 0]);
    const { belief } = steps[1]!;
    expect(belief[0]).toBeCloseTo(0.883, 2);
    expect(belief[1]).toBeCloseTo(0.117, 2);
  });

  it('predBelief sums to 1 (stochastic prediction)', () => {
    const steps = hmmForward(umbrellaHMM, [0, 0]);
    for (const step of steps) {
      const sum = step.predBelief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    }
  });

  it('handles single-state HMM', () => {
    const singleState: HMMParams = {
      numStates: 1,
      transitionMatrix: [[1]],
      prior: [1],
      observationProbs: [[1], [0]],
    };
    const steps = hmmForward(singleState, [0]);
    expect(steps[0]!.belief[0]).toBeCloseTo(1);
  });

  it('step t field matches 1-based index', () => {
    const steps = hmmForward(umbrellaHMM, [0, 1, 0]);
    expect(steps.map(s => s.t)).toEqual([1, 2, 3]);
  });
});

// ─── HMM Backward ─────────────────────────────────────────────────────────────

describe('hmmBackward', () => {
  it('returns single all-ones message for empty evidence', () => {
    const bwd = hmmBackward(umbrellaHMM, []);
    expect(bwd).toHaveLength(1);
    expect(bwd[0]).toEqual([1, 1]);
  });

  it('base case is all-ones vector of length S', () => {
    const bwd = hmmBackward(umbrellaHMM, [0]);
    expect(bwd[1]).toEqual([1, 1]);
  });

  it('backward message at k=1 for e₂=umbrella matches expected', () => {
    // b_{2:2}[i] = Σ_j T[i][j]*P(u|j)*1
    // b[0] = 0.7*0.9 + 0.3*0.2 = 0.69
    // b[1] = 0.3*0.9 + 0.7*0.2 = 0.41
    const bwd = hmmBackward(umbrellaHMM, [0, 0]);
    expect(bwd[1]?.[0]).toBeCloseTo(0.69);
    expect(bwd[1]?.[1]).toBeCloseTo(0.41);
  });

  it('returns T+1 messages for T observations', () => {
    const bwd = hmmBackward(umbrellaHMM, [0, 1, 0]);
    expect(bwd).toHaveLength(4);
  });

  it('handles single-state HMM', () => {
    const singleState: HMMParams = {
      numStates: 1,
      transitionMatrix: [[1]],
      prior: [1],
      observationProbs: [[1]],
    };
    const bwd = hmmBackward(singleState, [0]);
    expect(bwd[1]).toEqual([1]);
    expect(bwd[0]?.[0]).toBeCloseTo(1);
  });
});

// ─── Forward-Backward Smoothing ───────────────────────────────────────────────

describe('forwardBackward', () => {
  it('returns empty array for empty evidence', () => {
    expect(forwardBackward(umbrellaHMM, [])).toHaveLength(0);
  });

  it('smoothed[last] equals forward[last] (backward is all-ones)', () => {
    const result = forwardBackward(umbrellaHMM, [0, 0]);
    const last = result[1]!;
    last.smoothed.forEach((s, i) =>
      expect(s).toBeCloseTo(last.forward[i]!),
    );
  });

  it('P(R₁|u₁,u₂) smoothed ≈ [0.883, 0.117]', () => {
    const result = forwardBackward(umbrellaHMM, [0, 0]);
    expect(result).toHaveLength(2);
    const step1 = result[0]!;
    expect(step1.t).toBe(1);
    expect(step1.smoothed[0]).toBeCloseTo(0.883, 2);
    expect(step1.smoothed[1]).toBeCloseTo(0.117, 2);
  });

  it('smoothed probabilities sum to 1 at each step', () => {
    const result = forwardBackward(umbrellaHMM, [0, 1, 0]);
    for (const step of result) {
      const sum = step.smoothed.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    }
  });

  it('forward field matches hmmForward belief', () => {
    const fwdSteps = hmmForward(umbrellaHMM, [0, 0]);
    const smoothSteps = forwardBackward(umbrellaHMM, [0, 0]);
    for (let i = 0; i < 2; i++) {
      const fwd = fwdSteps[i]!.belief;
      const sm = smoothSteps[i]!.forward;
      fwd.forEach((v, j) => expect(v).toBeCloseTo(sm[j]!));
    }
  });
});

// ─── Viterbi ──────────────────────────────────────────────────────────────────

describe('viterbi', () => {
  it('returns trivial result for empty evidence', () => {
    const r = viterbi(umbrellaHMM, []);
    expect(r.steps).toHaveLength(0);
    expect(r.mostLikelyPath).toHaveLength(0);
    expect(r.pathProb).toBe(1);
  });

  it('single observation selects most likely initial state', () => {
    // P(R)*P(u|R) = 0.5*0.9=0.45 > P(¬R)*P(u|¬R)=0.5*0.2=0.10 → state 0
    const r = viterbi(umbrellaHMM, [0]);
    expect(r.mostLikelyPath).toEqual([0]);
    expect(r.steps[0]!.backpointer).toEqual([-1, -1]);
  });

  it('umbrella sequence [T,T,F,T,T] → most likely path [R,R,¬R,R,R]', () => {
    // evidence: 0=umbrella, 1=no-umbrella
    const evidence = [0, 0, 1, 0, 0];
    const r = viterbi(umbrellaHMM, evidence);
    expect(r.mostLikelyPath).toHaveLength(5);
    // Book answer: Rain on days 1,2,4,5; NoRain on day 3
    expect(r.mostLikelyPath[0]).toBe(0); // Rain
    expect(r.mostLikelyPath[1]).toBe(0); // Rain
    expect(r.mostLikelyPath[2]).toBe(1); // NoRain
    expect(r.mostLikelyPath[3]).toBe(0); // Rain
    expect(r.mostLikelyPath[4]).toBe(0); // Rain
  });

  it('step t fields are 1-indexed', () => {
    const r = viterbi(umbrellaHMM, [0, 0, 1]);
    expect(r.steps.map(s => s.t)).toEqual([1, 2, 3]);
  });

  it('pathProb is positive', () => {
    const r = viterbi(umbrellaHMM, [0, 0]);
    expect(r.pathProb).toBeGreaterThan(0);
  });

  it('single-state HMM always returns that state', () => {
    const ss: HMMParams = {
      numStates: 1,
      transitionMatrix: [[1]],
      prior: [1],
      observationProbs: [[1]],
    };
    const r = viterbi(ss, [0, 0, 0]);
    expect(r.mostLikelyPath).toEqual([0, 0, 0]);
    expect(r.pathProb).toBeCloseTo(1);
  });
});

// ─── Kalman Filter 1D ─────────────────────────────────────────────────────────

describe('kalmanFilter1D', () => {
  it('returns empty array for empty observations', () => {
    const params: KalmanParams1D = {
      mu0: 0, sigma0Sq: 1, sigmaXSq: 1, sigmaZSq: 1, observations: [],
    };
    expect(kalmanFilter1D(params)).toHaveLength(0);
  });

  it('single observation — known analytic result', () => {
    // mu0=0, σ²_0=1, σ²_x=1, σ²_z=1, z=1
    // predVar = 1+1 = 2
    // K = 2/3
    // posteriorMean = 0 + 2/3*(1-0) = 2/3
    // posteriorVar  = (1-2/3)*2 = 2/3
    const params: KalmanParams1D = {
      mu0: 0, sigma0Sq: 1, sigmaXSq: 1, sigmaZSq: 1, observations: [1.0],
    };
    const steps = kalmanFilter1D(params);
    expect(steps).toHaveLength(1);
    const s = steps[0]!;
    expect(s.t).toBe(1);
    expect(s.priorMean).toBeCloseTo(0);
    expect(s.priorVar).toBeCloseTo(1);
    expect(s.predMean).toBeCloseTo(0);
    expect(s.predVar).toBeCloseTo(2);
    expect(s.kalmanGain).toBeCloseTo(2 / 3);
    expect(s.posteriorMean).toBeCloseTo(2 / 3);
    expect(s.posteriorVar).toBeCloseTo(2 / 3);
    expect(s.observation).toBeCloseTo(1.0);
  });

  it('two observations — second step uses posterior from first', () => {
    // Continuing from above: mu=2/3, σ²=2/3, z=2
    // predVar = 2/3+1 = 5/3
    // K = (5/3)/(5/3+1) = 5/8 = 0.625
    // posteriorMean = 2/3 + 5/8*(2-2/3) = 2/3 + 5/8*(4/3) = 2/3 + 5/6 = 3/2
    // posteriorVar  = 3/8*(5/3) = 5/8
    const params: KalmanParams1D = {
      mu0: 0, sigma0Sq: 1, sigmaXSq: 1, sigmaZSq: 1, observations: [1.0, 2.0],
    };
    const steps = kalmanFilter1D(params);
    expect(steps).toHaveLength(2);
    const s2 = steps[1]!;
    expect(s2.priorMean).toBeCloseTo(2 / 3);
    expect(s2.priorVar).toBeCloseTo(2 / 3);
    expect(s2.predVar).toBeCloseTo(5 / 3);
    expect(s2.kalmanGain).toBeCloseTo(5 / 8);
    expect(s2.posteriorMean).toBeCloseTo(1.5);
    expect(s2.posteriorVar).toBeCloseTo(5 / 8);
  });

  it('variance decreases toward steady state', () => {
    const params: KalmanParams1D = {
      mu0: 0, sigma0Sq: 10, sigmaXSq: 0.1, sigmaZSq: 1,
      observations: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const steps = kalmanFilter1D(params);
    expect(steps[9]!.posteriorVar).toBeLessThan(steps[0]!.posteriorVar);
  });
});

// ─── Kalman Filter 2D ─────────────────────────────────────────────────────────

describe('kalmanFilter2D', () => {
  it('returns empty array for empty observations', () => {
    const params: KalmanParams2D = {
      mu0: [0], sigma0: [[1]],
      F: [[1]], sigmaX: [[1]],
      H: [[1]], sigmaZ: [[1]],
      observations: [],
    };
    expect(kalmanFilter2D(params)).toHaveLength(0);
  });

  it('1-D state matches scalar Kalman for single observation', () => {
    // Equivalent to 1D Kalman: mu0=0, σ²_0=1, σ²_x=1, σ²_z=1, z=1
    const params: KalmanParams2D = {
      mu0: [0], sigma0: [[1]],
      F: [[1]], sigmaX: [[1]],
      H: [[1]], sigmaZ: [[1]],
      observations: [[1.0]],
    };
    const steps = kalmanFilter2D(params);
    expect(steps).toHaveLength(1);
    const s = steps[0]!;
    expect(s.mu[0]).toBeCloseTo(2 / 3);
    expect(s.sigma[0]?.[0]).toBeCloseTo(2 / 3);
    expect(s.kalmanGain[0]?.[0]).toBeCloseTo(2 / 3);
  });

  it('2D constant-velocity tracking — shapes are correct', () => {
    // State [x, vx]; F = [[1,1],[0,1]]; H = [[1,0]]
    const params: KalmanParams2D = {
      mu0: [0, 0],
      sigma0: [[1, 0], [0, 1]],
      F: [[1, 1], [0, 1]],
      sigmaX: [[0.01, 0], [0, 0.01]],
      H: [[1, 0]],
      sigmaZ: [[1.0]],
      observations: [[1.0], [2.0], [3.0]],
    };
    const steps = kalmanFilter2D(params);
    expect(steps).toHaveLength(3);

    for (const step of steps) {
      expect(step.mu).toHaveLength(2);
      expect(step.sigma).toHaveLength(2);
      expect(step.sigma[0]).toHaveLength(2);
      expect(step.kalmanGain).toHaveLength(2);
      expect(step.kalmanGain[0]).toHaveLength(1);
      expect(step.predMu).toHaveLength(2);
      expect(step.predSigma).toHaveLength(2);
    }
  });

  it('1-D state: two observations accumulate information', () => {
    const params: KalmanParams2D = {
      mu0: [0], sigma0: [[1]],
      F: [[1]], sigmaX: [[1]],
      H: [[1]], sigmaZ: [[1]],
      observations: [[1.0], [2.0]],
    };
    const steps = kalmanFilter2D(params);
    const s2 = steps[1]!;
    expect(s2.mu[0]).toBeCloseTo(1.5);
    expect(s2.sigma[0]?.[0]).toBeCloseTo(5 / 8);
  });

  it('step t field is 1-based', () => {
    const params: KalmanParams2D = {
      mu0: [0], sigma0: [[1]],
      F: [[1]], sigmaX: [[1]],
      H: [[1]], sigmaZ: [[1]],
      observations: [[1.0], [2.0]],
    };
    const steps = kalmanFilter2D(params);
    expect(steps.map(s => s.t)).toEqual([1, 2]);
  });
});

// ─── Particle Filter ──────────────────────────────────────────────────────────

describe('particleFilter', () => {
  it('returns empty array for empty evidence', () => {
    expect(particleFilter(umbrellaHMM, [], 100)).toHaveLength(0);
  });

  it('beliefEstimate sums to 1 at each step', () => {
    const steps = particleFilter(umbrellaHMM, [0, 0, 1, 0], 500, 42);
    for (const step of steps) {
      const sum = step.beliefEstimate.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it('beliefEstimate has length numStates', () => {
    const steps = particleFilter(umbrellaHMM, [0], 200, 7);
    expect(steps[0]!.beliefEstimate).toHaveLength(2);
  });

  it('particles and weights arrays have length numParticles', () => {
    const N = 300;
    const steps = particleFilter(umbrellaHMM, [0, 1], N, 1);
    for (const step of steps) {
      expect(step.particles).toHaveLength(N);
      expect(step.weights).toHaveLength(N);
      expect(step.resampled).toHaveLength(N);
    }
  });

  it('step evidence field matches input', () => {
    const evidence = [0, 1, 0];
    const steps = particleFilter(umbrellaHMM, evidence, 100, 42);
    steps.forEach((step, i) => expect(step.evidence).toBe(evidence[i]));
  });

  it('step t field is 1-based', () => {
    const steps = particleFilter(umbrellaHMM, [0, 0], 50, 99);
    expect(steps.map(s => s.t)).toEqual([1, 2]);
  });

  it('seeded — same seed gives identical results', () => {
    const a = particleFilter(umbrellaHMM, [0, 0, 1], 100, 123);
    const b = particleFilter(umbrellaHMM, [0, 0, 1], 100, 123);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.beliefEstimate).toEqual(b[i]!.beliefEstimate);
    }
  });

  it('with many particles, belief for Rain > 0.5 after observing umbrella', () => {
    const steps = particleFilter(umbrellaHMM, [0, 0], 2000, 42);
    // After two umbrella observations, P(Rain) should be well above 0.5
    expect(steps[1]!.beliefEstimate[0]).toBeGreaterThan(0.6);
  });

  it('weights are non-negative', () => {
    const steps = particleFilter(umbrellaHMM, [0, 1, 0], 200, 55);
    for (const step of steps) {
      step.weights.forEach(w => expect(w).toBeGreaterThanOrEqual(0));
    }
  });

  it('all particle states are valid state indices', () => {
    const steps = particleFilter(umbrellaHMM, [0, 1, 0, 0], 300, 7);
    for (const step of steps) {
      [...step.particles, ...step.resampled].forEach(s =>
        expect(s).toBeGreaterThanOrEqual(0),
      );
      [...step.particles, ...step.resampled].forEach(s =>
        expect(s).toBeLessThan(umbrellaHMM.numStates),
      );
    }
  });
});

// ─── Integration: forward-backward consistency ────────────────────────────────

describe('integration', () => {
  it('forward-backward is consistent with standalone forward/backward', () => {
    const evidence = [0, 1, 0, 0];
    const fbSteps = forwardBackward(umbrellaHMM, evidence);
    const fwdSteps = hmmForward(umbrellaHMM, evidence);
    // Each smoothed step's forward field should match hmmForward belief
    for (let i = 0; i < fbSteps.length; i++) {
      fbSteps[i]!.forward.forEach((v, j) =>
        expect(v).toBeCloseTo(fwdSteps[i]!.belief[j]!),
      );
    }
  });

  it('matrix helpers round-trip: A · A⁻¹ ≈ I', () => {
    const A = [[3, 1], [2, 4]];
    const inv = matInverse(A);
    const prod = matMul(A, inv);
    const I = identityMatrix(2);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        expect(prod[i]![j]).toBeCloseTo(I[i]![j]!);
      }
    }
  });

  it('approxEqual helper sanity check', () => {
    expect(approx(0.818, 0.818)).toBe(true);
    expect(approx(0.818, 0.819, 0.01)).toBe(true);
    expect(approx(0, 1)).toBe(false);
  });
});

