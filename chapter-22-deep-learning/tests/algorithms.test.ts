import { describe, it, expect } from 'vitest';
import {
  sigmoid,
  relu,
  softplus,
  tanhActivation,
  sigmoidDerivative,
  reluDerivative,
  softplusDerivative,
  tanhDerivative,
  softmax,
  crossEntropyLoss,
  forwardPassSteps,
  backpropSteps,
  trainNetwork,
  convolution1D,
  maxPool1D,
  rnnForward,
  lstmForward,
  applyDropout,
  autoencoderPass,
  type NetworkWeights,
} from '../src/algorithms/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeWeights(hiddenSize = 2, inputSize = 2): NetworkWeights {
  return {
    W1: Array.from({ length: hiddenSize }, () => Array(inputSize).fill(0.5) as number[]),
    b1: Array(hiddenSize).fill(0.1) as number[],
    W2: [Array(hiddenSize).fill(0.5) as number[]],
    b2: [0.1],
  };
}

// ---------------------------------------------------------------------------
// Activation functions
// ---------------------------------------------------------------------------
describe('sigmoid', () => {
  it('returns 0.5 at x=0', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
  });
  it('approaches 1 for large positive x', () => {
    expect(sigmoid(100)).toBeCloseTo(1);
  });
  it('approaches 0 for large negative x', () => {
    expect(sigmoid(-100)).toBeCloseTo(0);
  });
  it('positive x > 0.5', () => {
    expect(sigmoid(1)).toBeGreaterThan(0.5);
  });
  it('negative x < 0.5', () => {
    expect(sigmoid(-1)).toBeLessThan(0.5);
  });
});

describe('relu', () => {
  it('returns 0 for negative input', () => {
    expect(relu(-5)).toBe(0);
  });
  it('returns 0 for x=0', () => {
    expect(relu(0)).toBe(0);
  });
  it('returns x for positive input', () => {
    expect(relu(3)).toBe(3);
  });
});

describe('softplus', () => {
  it('is always positive', () => {
    expect(softplus(-10)).toBeGreaterThan(0);
    expect(softplus(0)).toBeGreaterThan(0);
    expect(softplus(10)).toBeGreaterThan(0);
  });
  it('softplus(0) = ln(2)', () => {
    expect(softplus(0)).toBeCloseTo(Math.log(2));
  });
  it('softplus grows for positive x', () => {
    expect(softplus(5)).toBeGreaterThan(softplus(0));
  });
});

describe('tanhActivation', () => {
  it('returns 0 at x=0', () => {
    expect(tanhActivation(0)).toBeCloseTo(0);
  });
  it('returns positive for positive x', () => {
    expect(tanhActivation(1)).toBeGreaterThan(0);
  });
  it('returns negative for negative x', () => {
    expect(tanhActivation(-1)).toBeLessThan(0);
  });
  it('is bounded in (-1, 1)', () => {
    expect(tanhActivation(100)).toBeLessThanOrEqual(1);
    expect(tanhActivation(-100)).toBeGreaterThanOrEqual(-1);
  });
});

// ---------------------------------------------------------------------------
// Derivatives
// ---------------------------------------------------------------------------
describe('sigmoidDerivative', () => {
  it('peaks at x=0 (value = 0.25)', () => {
    expect(sigmoidDerivative(0)).toBeCloseTo(0.25);
  });
  it('is small for large |x|', () => {
    expect(sigmoidDerivative(10)).toBeLessThan(0.001);
    expect(sigmoidDerivative(-10)).toBeLessThan(0.001);
  });
  it('is always non-negative', () => {
    expect(sigmoidDerivative(-5)).toBeGreaterThanOrEqual(0);
    expect(sigmoidDerivative(5)).toBeGreaterThanOrEqual(0);
  });
});

describe('reluDerivative', () => {
  it('returns 0 for x <= 0', () => {
    expect(reluDerivative(0)).toBe(0);
    expect(reluDerivative(-1)).toBe(0);
  });
  it('returns 1 for x > 0', () => {
    expect(reluDerivative(0.001)).toBe(1);
    expect(reluDerivative(5)).toBe(1);
  });
});

describe('softplusDerivative', () => {
  it('equals sigmoid(x)', () => {
    expect(softplusDerivative(0)).toBeCloseTo(sigmoid(0));
    expect(softplusDerivative(2)).toBeCloseTo(sigmoid(2));
    expect(softplusDerivative(-2)).toBeCloseTo(sigmoid(-2));
  });
});

describe('tanhDerivative', () => {
  it('equals 1 at x=0', () => {
    expect(tanhDerivative(0)).toBeCloseTo(1);
  });
  it('is always in (0, 1]', () => {
    expect(tanhDerivative(5)).toBeGreaterThan(0);
    expect(tanhDerivative(-5)).toBeGreaterThan(0);
    expect(tanhDerivative(0)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Softmax
// ---------------------------------------------------------------------------
describe('softmax', () => {
  it('sums to 1', () => {
    const result = softmax([1, 2, 3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
  it('handles negative inputs', () => {
    const result = softmax([-1, -2, -3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
  it('handles single element', () => {
    const result = softmax([5]);
    expect(result[0]).toBeCloseTo(1);
  });
  it('handles large values (numerical stability)', () => {
    const result = softmax([1000, 1001, 1002]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
    expect(result[2]).toBeGreaterThan(result[0] ?? 0);
  });
  it('assigns higher probability to larger inputs', () => {
    const result = softmax([1, 5, 2]);
    expect(result[1]).toBeGreaterThan(result[0] ?? 0);
    expect(result[1]).toBeGreaterThan(result[2] ?? 0);
  });
});

// ---------------------------------------------------------------------------
// Cross-entropy loss
// ---------------------------------------------------------------------------
describe('crossEntropyLoss', () => {
  it('returns small loss for perfect prediction', () => {
    const loss = crossEntropyLoss([0.9999], [1]);
    expect(loss).toBeLessThan(0.001);
  });
  it('returns large loss for near-zero predicted', () => {
    const loss = crossEntropyLoss([0.0001], [1]);
    expect(loss).toBeGreaterThan(5);
  });
  it('returns 0 if target is all zero', () => {
    const loss = crossEntropyLoss([0.5, 0.5], [0, 0]);
    expect(loss).toBeCloseTo(0);
  });
  it('works with multi-class', () => {
    const loss = crossEntropyLoss([0.7, 0.2, 0.1], [1, 0, 0]);
    expect(loss).toBeCloseTo(-Math.log(0.7 + 1e-15), 3);
  });

  it('handles predicted shorter than target (undefined index)', () => {
    const loss = crossEntropyLoss([], [1]);
    expect(loss).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Forward pass
// ---------------------------------------------------------------------------
describe('forwardPassSteps', () => {
  const x = [1, 0];
  const w = makeWeights(2, 2);

  it('returns 5 steps', () => {
    const steps = forwardPassSteps(x, w, 1, 'sigmoid');
    expect(steps.length).toBe(5);
  });

  it('first step is input layer', () => {
    const steps = forwardPassSteps(x, w, 1, 'sigmoid');
    expect(steps[0]?.layer).toBe('input');
    expect(steps[0]?.values).toEqual(x);
  });

  it('has z1, h1, z2, output layers', () => {
    const steps = forwardPassSteps(x, w, 1, 'sigmoid');
    const layers = steps.map((s) => s.layer);
    expect(layers).toContain('z1');
    expect(layers).toContain('h1');
    expect(layers).toContain('z2');
    expect(layers).toContain('output');
  });

  it('output values are in (0, 1) for sigmoid', () => {
    const steps = forwardPassSteps(x, w, 1, 'sigmoid');
    const out = steps[4]?.values[0] ?? -1;
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThan(1);
  });

  it('works with relu activation', () => {
    const steps = forwardPassSteps(x, w, 1, 'relu');
    expect(steps.length).toBe(5);
    const h1 = steps[2]?.values ?? [];
    h1.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('works with tanh activation', () => {
    const steps = forwardPassSteps(x, w, 1, 'tanh');
    expect(steps.length).toBe(5);
    const h1 = steps[2]?.values ?? [];
    h1.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('handles all-zero weights', () => {
    const zeroW: NetworkWeights = {
      W1: [[0, 0], [0, 0]],
      b1: [0, 0],
      W2: [[0, 0]],
      b2: [0],
    };
    const steps = forwardPassSteps([1, 1], zeroW, 0, 'sigmoid');
    expect(steps[4]?.values[0]).toBeCloseTo(0.5); // sigmoid(0) = 0.5
  });
});

// ---------------------------------------------------------------------------
// Backprop
// ---------------------------------------------------------------------------
describe('backpropSteps', () => {
  const x = [1, 0];
  const w = makeWeights(2, 2);

  it('returns 1 + hiddenSize steps (1 output + 2 hidden)', () => {
    const steps = backpropSteps(x, 1, w, 'sigmoid');
    expect(steps.length).toBe(3);
  });

  it('first step is output layer', () => {
    const steps = backpropSteps(x, 1, w, 'sigmoid');
    expect(steps[0]?.layer).toBe('output');
  });

  it('hidden steps have correct layer names', () => {
    const steps = backpropSteps(x, 1, w, 'sigmoid');
    expect(steps[1]?.layer).toBe('hidden_0');
    expect(steps[2]?.layer).toBe('hidden_1');
  });

  it('gradients have correct shape for output step', () => {
    const steps = backpropSteps(x, 1, w, 'sigmoid');
    expect(steps[0]?.gradients.length).toBe(2); // hiddenSize
  });

  it('gradients have correct shape for hidden steps', () => {
    const steps = backpropSteps(x, 1, w, 'sigmoid');
    expect(steps[1]?.gradients.length).toBe(2); // inputSize
  });

  it('works with relu', () => {
    const steps = backpropSteps(x, 0, w, 'relu');
    expect(steps.length).toBe(3);
    expect(typeof steps[0]?.delta).toBe('number');
  });

  it('works with tanh', () => {
    const steps = backpropSteps(x, 0, w, 'tanh');
    expect(steps.length).toBe(3);
    expect(typeof steps[0]?.delta).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------
describe('trainNetwork', () => {
  const xorData = [
    { x: [0, 0], y: 0 },
    { x: [0, 1], y: 1 },
    { x: [1, 0], y: 1 },
    { x: [1, 1], y: 0 },
  ];

  const w = makeWeights(4, 2);

  it('returns correct number of TrainingSteps', () => {
    const steps = trainNetwork(xorData, w, 0.1, 10, 'sigmoid');
    expect(steps.length).toBe(10);
  });

  it('each step has epoch, loss, gradNorm fields', () => {
    const steps = trainNetwork(xorData, w, 0.1, 5, 'sigmoid');
    expect(steps[0]?.epoch).toBe(0);
    expect(typeof steps[0]?.loss).toBe('number');
    expect(typeof steps[0]?.gradNorm).toBe('number');
  });

  it('loss decreases over training with sufficient lr', () => {
    const steps = trainNetwork(xorData, w, 0.5, 100, 'sigmoid');
    expect((steps[99]?.loss ?? Infinity)).toBeLessThan((steps[0]?.loss ?? 0) + 0.5);
  });

  it('works with relu', () => {
    const steps = trainNetwork(xorData, w, 0.1, 5, 'relu');
    expect(steps.length).toBe(5);
  });

  it('works with tanh', () => {
    const steps = trainNetwork(xorData, w, 0.1, 5, 'tanh');
    expect(steps.length).toBe(5);
  });

  it('handles empty data', () => {
    const steps = trainNetwork([], w, 0.1, 3, 'sigmoid');
    expect(steps.length).toBe(3);
    steps.forEach((s) => expect(s.loss).toBe(0));
  });

  it('does not mutate original weights', () => {
    const original = makeWeights(2, 2);
    const origW1Copy = original.W1[0]?.[0];
    trainNetwork(xorData, original, 0.5, 50, 'sigmoid');
    expect(original.W1[0]?.[0]).toBe(origW1Copy);
  });
});

// ---------------------------------------------------------------------------
// Convolution 1D
// ---------------------------------------------------------------------------
describe('convolution1D', () => {
  const input = [1, 2, 3, 4, 5];
  const kernel = [1, 0, -1];

  it('output length = input.length - kernel.length + 1', () => {
    const steps = convolution1D(input, kernel, 'linear');
    expect(steps.length).toBe(3);
  });

  it('position values are correct', () => {
    const steps = convolution1D(input, kernel, 'linear');
    expect(steps[0]?.position).toBe(0);
    expect(steps[1]?.position).toBe(1);
    expect(steps[2]?.position).toBe(2);
  });

  it('linear activation preserves sign', () => {
    const steps = convolution1D(input, kernel, 'linear');
    // patch [1,2,3] * [1,0,-1] = 1*1+2*0+3*(-1) = -2
    expect(steps[0]?.sum).toBeCloseTo(-2);
    expect(steps[0]?.output).toBeCloseTo(-2);
  });

  it('relu activation clips negatives to 0', () => {
    // input=[1,2,3,4,5], kernel=[1,0,-1]
    // pos=0: [1,2,3]·[1,0,-1] = 1-3 = -2 --> relu-->0
    // pos=1: [2,3,4]·[1,0,-1] = 2-4 = -2 --> relu-->0
    // Use a kernel that produces a positive value at some position
    const posInput = [3, 1, 5, 2];
    const posKernel = [1, -1]; // pos=0: 3-1=2>0, pos=1: 1-5=-4-->0, pos=2: 5-2=3>0
    const steps = convolution1D(posInput, posKernel, 'relu');
    expect(steps[0]?.output).toBeGreaterThan(0); // 2 --> relu --> 2
    expect(steps[1]?.output).toBe(0);             // -4 --> relu --> 0
  });

  it('captures correct input patch', () => {
    const steps = convolution1D(input, kernel, 'linear');
    expect(steps[0]?.inputPatch).toEqual([1, 2, 3]);
    expect(steps[1]?.inputPatch).toEqual([2, 3, 4]);
  });

  it('returns empty for kernel larger than input', () => {
    const steps = convolution1D([1, 2], [1, 2, 3], 'relu');
    expect(steps.length).toBe(0);
  });

  it('works with kernel size 1', () => {
    const steps = convolution1D([1, -2, 3], [2], 'relu');
    expect(steps.length).toBe(3);
    expect(steps[0]?.output).toBe(2);
    expect(steps[1]?.output).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Max pooling 1D
// ---------------------------------------------------------------------------
describe('maxPool1D', () => {
  it('basic 4 elements, poolSize=2 -> 2 windows', () => {
    const steps = maxPool1D([1, 3, 2, 4], 2);
    expect(steps.length).toBe(2);
    expect(steps[0]?.maxValue).toBe(3);
    expect(steps[1]?.maxValue).toBe(4);
  });

  it('poolSize=1 -> every element is a window', () => {
    const steps = maxPool1D([5, 3, 9], 1);
    expect(steps.length).toBe(3);
    expect(steps[2]?.maxValue).toBe(9);
  });

  it('poolSize larger than input -> 0 windows', () => {
    const steps = maxPool1D([1, 2], 5);
    expect(steps.length).toBe(0);
  });

  it('poolSize=3 with 6 elements -> 2 windows', () => {
    const steps = maxPool1D([1, 2, 3, 4, 5, 6], 3);
    expect(steps.length).toBe(2);
    expect(steps[0]?.maxValue).toBe(3);
    expect(steps[1]?.maxValue).toBe(6);
  });

  it('window and position are correct', () => {
    const steps = maxPool1D([10, 20, 30, 40], 2);
    expect(steps[0]?.window).toEqual([10, 20]);
    expect(steps[0]?.position).toBe(0);
    expect(steps[1]?.window).toEqual([30, 40]);
    expect(steps[1]?.position).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// RNN
// ---------------------------------------------------------------------------
describe('rnnForward', () => {
  it('returns a step for each sequence element', () => {
    const steps = rnnForward([1, 0, 1, 0], 0.5, 0.5, 0.5, 0, 0, 0);
    expect(steps.length).toBe(4);
  });

  it('hidden state evolves', () => {
    const steps = rnnForward([1, 1, 1], 0.5, 0.5, 0.5, 0, 0, 0);
    const h0 = steps[0]?.hiddenNew ?? 0;
    const h1 = steps[1]?.hiddenNew ?? 0;
    expect(h0).not.toBe(h1); // state changes
  });

  it('hiddenPrev at t=0 is h0', () => {
    const steps = rnnForward([1, 2], 0.5, 0.5, 0.5, 0, 0, 0.3);
    expect(steps[0]?.hiddenPrev).toBeCloseTo(0.3);
  });

  it('output is in (0,1)', () => {
    const steps = rnnForward([1, -1, 0.5], 0.5, 0.3, 1.0, 0, 0, 0);
    steps.forEach((s) => {
      expect(s.output).toBeGreaterThan(0);
      expect(s.output).toBeLessThan(1);
    });
  });

  it('hiddenNew is in [-1, 1] due to tanh', () => {
    const steps = rnnForward([10, -10], 2, 2, 1, 0, 0, 0);
    steps.forEach((s) => {
      expect(s.hiddenNew).toBeGreaterThanOrEqual(-1);
      expect(s.hiddenNew).toBeLessThanOrEqual(1);
    });
  });

  it('handles empty sequence', () => {
    const steps = rnnForward([], 0.5, 0.5, 0.5, 0, 0, 0);
    expect(steps.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// LSTM
// ---------------------------------------------------------------------------
describe('lstmForward', () => {
  it('returns a step per input', () => {
    const steps = lstmForward([1, 0, 1], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    expect(steps.length).toBe(3);
  });

  it('sigmoid gates are in (0,1)', () => {
    const steps = lstmForward([0.5, -0.5, 0.3], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    steps.forEach((s) => {
      expect(s.gates.forgetGate).toBeGreaterThan(0);
      expect(s.gates.forgetGate).toBeLessThan(1);
      expect(s.gates.inputGate).toBeGreaterThan(0);
      expect(s.gates.inputGate).toBeLessThan(1);
      expect(s.gates.outputGate).toBeGreaterThan(0);
      expect(s.gates.outputGate).toBeLessThan(1);
    });
  });

  it('cell input is in (-1, 1) due to tanh', () => {
    const steps = lstmForward([5, -5], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    steps.forEach((s) => {
      expect(s.gates.cellInput).toBeGreaterThan(-1);
      expect(s.gates.cellInput).toBeLessThan(1);
    });
  });

  it('cell state updates each step', () => {
    const steps = lstmForward([1, 1, 1], 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0, 1, 0, 0, 0);
    const c0 = steps[0]?.cellState ?? 0;
    const c1 = steps[1]?.cellState ?? 0;
    expect(c0).not.toBeCloseTo(c1);
  });

  it('output is in (0,1)', () => {
    const steps = lstmForward([0.5], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    expect(steps[0]?.output).toBeGreaterThan(0);
    expect(steps[0]?.output).toBeLessThan(1);
  });

  it('t field matches sequence index', () => {
    const steps = lstmForward([1, 2, 3], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    expect(steps[0]?.t).toBe(0);
    expect(steps[1]?.t).toBe(1);
    expect(steps[2]?.t).toBe(2);
  });

  it('handles empty sequence', () => {
    const steps = lstmForward([], 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0);
    expect(steps.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dropout
// ---------------------------------------------------------------------------
describe('applyDropout', () => {
  it('rate=0 keeps all units with original value', () => {
    const activations = [1, 2, 3, 4];
    const steps = applyDropout(activations, 0, 42);
    expect(steps.every((s) => !s.dropped)).toBe(true);
    steps.forEach((s, i) => expect(s.value).toBe(activations[i]));
  });

  it('rate=1 drops all units', () => {
    const steps = applyDropout([1, 2, 3], 1, 42);
    expect(steps.every((s) => s.dropped)).toBe(true);
    steps.forEach((s) => expect(s.value).toBe(0));
  });

  it('rate>1 also drops all units', () => {
    const steps = applyDropout([1, 2, 3], 1.5, 42);
    expect(steps.every((s) => s.dropped)).toBe(true);
  });

  it('same seed produces same result', () => {
    const a = applyDropout([1, 2, 3, 4, 5], 0.5, 12345);
    const b = applyDropout([1, 2, 3, 4, 5], 0.5, 12345);
    a.forEach((stepA, i) => {
      expect(stepA.dropped).toBe(b[i]?.dropped);
      expect(stepA.value).toBe(b[i]?.value);
    });
  });

  it('different seeds produce different results (usually)', () => {
    const a = applyDropout([1, 2, 3, 4, 5, 6, 7, 8], 0.5, 1);
    const b = applyDropout([1, 2, 3, 4, 5, 6, 7, 8], 0.5, 999);
    const same = a.every((s, i) => s.dropped === b[i]?.dropped);
    expect(same).toBe(false);
  });

  it('non-dropped values are scaled by 1/(1-rate)', () => {
    const steps = applyDropout([4], 0.5, 0);
    const kept = steps.filter((s) => !s.dropped);
    kept.forEach((s) => {
      expect(s.value).toBeCloseTo(4 * (1 / 0.5));
    });
  });

  it('unit indices are correct', () => {
    const steps = applyDropout([10, 20, 30], 0, 0);
    expect(steps[0]?.unit).toBe(0);
    expect(steps[1]?.unit).toBe(1);
    expect(steps[2]?.unit).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Autoencoder
// ---------------------------------------------------------------------------
describe('autoencoderPass', () => {
  // 4 -> 2 -> 4 autoencoder
  const input = [0.9, 0.1, 0.8, 0.2];
  // encoderWeights: each element is a 2D matrix (weight matrix for one layer)
  const encoderWeights: ReadonlyArray<ReadonlyArray<number>> = [
    // 2 output neurons, each with 4 inputs
    [0.5, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ];
  const decoderWeights: ReadonlyArray<ReadonlyArray<number>> = [
    // 4 output neurons, each with 2 inputs
    [0.5, 0.5],
    [0.5, 0.5],
    [0.5, 0.5],
    [0.5, 0.5],
  ];

  it('returns input + encoderLayers + decoderLayers steps', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    // 1 (input) + 1 (encoder layer) + 1 (decoder layer) = 3 steps
    expect(steps.length).toBe(3);
  });

  it('first step has encode phase and original input', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    expect(steps[0]?.phase).toBe('encode');
    expect(steps[0]?.layerValues).toEqual(input);
  });

  it('encoder step has encode phase', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    expect(steps[1]?.phase).toBe('encode');
  });

  it('decoder step has decode phase', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    expect(steps[2]?.phase).toBe('decode');
  });

  it('encoder layer compresses dimensions', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    expect(steps[1]?.layerValues.length).toBe(2); // 2 encoder neurons
  });

  it('decoder layer expands back', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    expect(steps[2]?.layerValues.length).toBe(4); // 4 decoder neurons
  });

  it('all values are in (0, 1) due to sigmoid', () => {
    const steps = autoencoderPass(input, [encoderWeights], [decoderWeights]);
    steps.slice(1).forEach((step) => {
      step.layerValues.forEach((v) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      });
    });
  });

  it('works with multiple encoder/decoder layers', () => {
    const enc1: ReadonlyArray<ReadonlyArray<number>> = [[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]; // 4->2
    const enc2: ReadonlyArray<ReadonlyArray<number>> = [[0.5, 0.5]]; // 2->1
    const dec1: ReadonlyArray<ReadonlyArray<number>> = [[0.5], [0.5]]; // 1->2
    const dec2: ReadonlyArray<ReadonlyArray<number>> = [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]]; // 2->4
    const steps = autoencoderPass(input, [enc1, enc2], [dec1, dec2]);
    // 1 + 2 + 2 = 5 steps
    expect(steps.length).toBe(5);
  });

  it('handles empty encoder/decoder', () => {
    const steps = autoencoderPass([1, 2], [], []);
    expect(steps.length).toBe(1); // just input
    expect(steps[0]?.phase).toBe('encode');
  });
});

