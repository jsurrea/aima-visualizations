/**
 * Chapter 22 — Deep Learning
 * Pure algorithm implementations.
 *
 * Note on non-null assertions (`!`): Throughout this module, array accesses
 * inside `for` loops use `arr[i]!` assertions. These are safe because loop
 * bounds (`i < arr.length`, `j < hiddenSize`, etc.) guarantee defined values.
 * This avoids uncovered `?? 0` branches under `noUncheckedIndexedAccess`.
 *
 * @module algorithms
 */

/** Small epsilon to prevent log(0) in cross-entropy loss. */
const EPSILON = 1e-15;

/** LCG PRNG constants from Numerical Recipes (Knuth). */
const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 0xffffffff;

// ---------------------------------------------------------------------------
// Activation functions
// ---------------------------------------------------------------------------

/** Sigmoid activation: 1 / (1 + e^-x). @complexity O(1) */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** ReLU activation: max(0, x). @complexity O(1) */
export function relu(x: number): number {
  return x > 0 ? x : 0;
}

/** Softplus activation: ln(1 + e^x). @complexity O(1) */
export function softplus(x: number): number {
  return Math.log1p(Math.exp(x));
}

/** Tanh activation (alias for Math.tanh). @complexity O(1) */
export function tanhActivation(x: number): number {
  return Math.tanh(x);
}

// ---------------------------------------------------------------------------
// Derivatives
// ---------------------------------------------------------------------------

/** Sigmoid derivative: sigmoid(x) * (1 - sigmoid(x)). @complexity O(1) */
export function sigmoidDerivative(x: number): number {
  const s = sigmoid(x);
  return s * (1 - s);
}

/** ReLU derivative: 1 if x > 0, else 0. @complexity O(1) */
export function reluDerivative(x: number): number {
  return x > 0 ? 1 : 0;
}

/** Softplus derivative equals sigmoid(x). @complexity O(1) */
export function softplusDerivative(x: number): number {
  return sigmoid(x);
}

/** Tanh derivative: 1 - tanh(x)^2. @complexity O(1) */
export function tanhDerivative(x: number): number {
  const t = Math.tanh(x);
  return 1 - t * t;
}

// ---------------------------------------------------------------------------
// Softmax
// ---------------------------------------------------------------------------

/**
 * Numerically stable softmax: e^(xi - max) / sum(e^(xj - max)).
 * @complexity O(n)
 */
export function softmax(inputs: ReadonlyArray<number>): ReadonlyArray<number> {
  const max = Math.max(...inputs);
  const exps = inputs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ---------------------------------------------------------------------------
// Cross-entropy loss
// ---------------------------------------------------------------------------

/**
 * Cross-entropy loss: -sum(target * log(predicted + 1e-15)).
 * @complexity O(n)
 */
export function crossEntropyLoss(
  predicted: ReadonlyArray<number>,
  target: ReadonlyArray<number>,
): number {
  return -target.reduce((acc, t, i) => acc + t * Math.log((predicted[i] ?? 0) + EPSILON), 0);
}

// ---------------------------------------------------------------------------
// Network types
// ---------------------------------------------------------------------------

export interface NetworkWeights {
  W1: number[][];  // [hiddenSize, inputSize]
  b1: number[];    // [hiddenSize]
  W2: number[][];  // [1, hiddenSize]
  b2: number[];    // [1]
}

export interface ForwardPassStep {
  layer: string;
  values: ReadonlyArray<number>;
  action: string;
}

// ---------------------------------------------------------------------------
// Forward pass helpers
// ---------------------------------------------------------------------------

function applyActivation(z: number, activation: 'sigmoid' | 'relu' | 'tanh'): number {
  if (activation === 'relu') return relu(z);
  if (activation === 'tanh') return tanhActivation(z);
  return sigmoid(z);
}

function applyActivationDerivative(z: number, activation: 'sigmoid' | 'relu' | 'tanh'): number {
  if (activation === 'relu') return reluDerivative(z);
  if (activation === 'tanh') return tanhDerivative(z);
  return sigmoidDerivative(z);
}

/**
 * Forward pass for a 2-layer network (inputSize -> hiddenSize -> 1).
 * Returns steps: input, z1, h1, z2, output.
 * @complexity O(hiddenSize * inputSize)
 */
export function forwardPassSteps(
  x: ReadonlyArray<number>,
  weights: NetworkWeights,
  target: number,
  activation: 'sigmoid' | 'relu' | 'tanh',
): ReadonlyArray<ForwardPassStep> {
  const { W1, b1, W2, b2 } = weights;
  const hiddenSize = W1.length;

  const z1: number[] = Array(hiddenSize).fill(0) as number[];
  for (let j = 0; j < hiddenSize; j++) {
    let sum = b1[j]!;
    const row = W1[j]!;
    for (let i = 0; i < x.length; i++) {
      sum += row[i]! * x[i]!;
    }
    z1[j] = sum;
  }

  const h1 = z1.map((z) => applyActivation(z, activation));

  const w2Row = W2[0]!;
  let z2 = b2[0]!;
  for (let j = 0; j < h1.length; j++) {
    z2 += w2Row[j]! * h1[j]!;
  }

  const output = sigmoid(z2);

  return [
    { layer: 'input', values: x, action: 'Feed input to network' },
    { layer: 'z1', values: z1, action: 'Compute pre-activations z1 = W1*x + b1' },
    { layer: 'h1', values: h1, action: `Apply ${activation} activation: h1 = ${activation}(z1)` },
    { layer: 'z2', values: [z2], action: 'Compute output pre-activation z2 = W2*h1 + b2' },
    { layer: 'output', values: [output], action: `Apply sigmoid: output = ${output.toFixed(4)}, target = ${target}` },
  ];
}

// ---------------------------------------------------------------------------
// Backpropagation
// ---------------------------------------------------------------------------

export interface BackpropStep {
  layer: string;
  delta: number;
  gradients: ReadonlyArray<number>;
  action: string;
}

/**
 * Computes backpropagation steps for a 2-layer network.
 * Returns steps for output layer then each hidden unit.
 * @complexity O(hiddenSize * inputSize)
 */
export function backpropSteps(
  x: ReadonlyArray<number>,
  target: number,
  weights: NetworkWeights,
  activation: 'sigmoid' | 'relu' | 'tanh',
): ReadonlyArray<BackpropStep> {
  const { W1, b1, W2, b2 } = weights;
  const hiddenSize = W1.length;

  const z1: number[] = Array(hiddenSize).fill(0) as number[];
  for (let j = 0; j < hiddenSize; j++) {
    let sum = b1[j]!;
    const row = W1[j]!;
    for (let i = 0; i < x.length; i++) {
      sum += row[i]! * x[i]!;
    }
    z1[j] = sum;
  }
  const h1 = z1.map((z) => applyActivation(z, activation));

  const w2Row = W2[0]!;
  let z2 = b2[0]!;
  for (let j = 0; j < h1.length; j++) {
    z2 += w2Row[j]! * h1[j]!;
  }
  const output = sigmoid(z2);

  const deltaOut = (output - target) * sigmoidDerivative(z2);
  const gradW2 = h1.map((hj) => deltaOut * hj);

  const steps: BackpropStep[] = [
    {
      layer: 'output',
      delta: deltaOut,
      gradients: gradW2,
      action: `d_out = (${output.toFixed(3)} - ${target}) * s'(z2) = ${deltaOut.toFixed(4)}`,
    },
  ];

  for (let j = 0; j < hiddenSize; j++) {
    const deltaHj = deltaOut * w2Row[j]! * applyActivationDerivative(z1[j]!, activation);
    const gradW1j = x.map((xi) => deltaHj * xi);
    steps.push({
      layer: `hidden_${j}`,
      delta: deltaHj,
      gradients: gradW1j,
      action: `d_h${j} = d_out * W2[${j}] * g'(z1[${j}]) = ${deltaHj.toFixed(4)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export interface TrainingStep {
  epoch: number;
  loss: number;
  weights: NetworkWeights;
  gradNorm: number;
  action: string;
}

function deepCopyWeights(w: NetworkWeights): NetworkWeights {
  return {
    W1: w.W1.map((row) => [...row]),
    b1: [...w.b1],
    W2: w.W2.map((row) => [...row]),
    b2: [...w.b2],
  };
}

/**
 * Train a 2-layer network via online gradient descent.
 * Returns one TrainingStep per epoch.
 * @complexity O(epochs * data.length * hiddenSize * inputSize)
 */
export function trainNetwork(
  data: ReadonlyArray<{ x: ReadonlyArray<number>; y: number }>,
  weights: NetworkWeights,
  learningRate: number,
  epochs: number,
  activation: 'sigmoid' | 'relu' | 'tanh',
): ReadonlyArray<TrainingStep> {
  const w = deepCopyWeights(weights);
  const steps: TrainingStep[] = [];
  const hiddenSize = w.W1.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    let gradNormSq = 0;

    for (const sample of data) {
      const { x, y } = sample;

      const z1: number[] = Array(hiddenSize).fill(0) as number[];
      for (let j = 0; j < hiddenSize; j++) {
        let sum = w.b1[j]!;
        const row = w.W1[j]!;
        for (let i = 0; i < x.length; i++) {
          sum += row[i]! * x[i]!;
        }
        z1[j] = sum;
      }
      const h1 = z1.map((z) => applyActivation(z, activation));

      const w2Row = w.W2[0]!;
      let z2 = w.b2[0]!;
      for (let j = 0; j < h1.length; j++) {
        z2 += w2Row[j]! * h1[j]!;
      }
      const output = sigmoid(z2);

      totalLoss += crossEntropyLoss([output], [y]);

      const deltaOut = (output - y) * sigmoidDerivative(z2);

      for (let j = 0; j < hiddenSize; j++) {
        const grad = deltaOut * h1[j]!;
        gradNormSq += grad * grad;
        w2Row[j] = w2Row[j]! - learningRate * grad;
      }
      w.b2[0] = w.b2[0]! - learningRate * deltaOut;
      gradNormSq += deltaOut * deltaOut;

      for (let j = 0; j < hiddenSize; j++) {
        const row = w.W1[j]!;
        const deltaHj = deltaOut * w2Row[j]! * applyActivationDerivative(z1[j]!, activation);
        for (let i = 0; i < x.length; i++) {
          const grad1 = deltaHj * x[i]!;
          gradNormSq += grad1 * grad1;
          row[i] = row[i]! - learningRate * grad1;
        }
        w.b1[j] = w.b1[j]! - learningRate * deltaHj;
        gradNormSq += deltaHj * deltaHj;
      }
    }

    const avgLoss = data.length > 0 ? totalLoss / data.length : 0;
    const gradNorm = Math.sqrt(gradNormSq);

    steps.push({
      epoch,
      loss: avgLoss,
      weights: deepCopyWeights(w),
      gradNorm,
      action: `Epoch ${epoch + 1}: avg loss = ${avgLoss.toFixed(4)}, |grad| = ${gradNorm.toFixed(4)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// 1-D Convolution
// ---------------------------------------------------------------------------

export interface ConvolutionStep {
  inputPatch: ReadonlyArray<number>;
  kernel: ReadonlyArray<number>;
  sum: number;
  output: number;
  position: number;
  action: string;
}

/**
 * 1-D convolution with valid padding (no padding).
 * Output length = input.length - kernel.length + 1.
 * @complexity O((input.length - kernel.length + 1) * kernel.length)
 */
export function convolution1D(
  input: ReadonlyArray<number>,
  kernel: ReadonlyArray<number>,
  activation: 'relu' | 'linear',
): ReadonlyArray<ConvolutionStep> {
  const outputLen = input.length - kernel.length + 1;
  const steps: ConvolutionStep[] = [];

  for (let pos = 0; pos < outputLen; pos++) {
    const patch = input.slice(pos, pos + kernel.length);
    let sum = 0;
    for (let k = 0; k < kernel.length; k++) {
      sum += patch[k]! * kernel[k]!;
    }
    const output = activation === 'relu' ? relu(sum) : sum;
    steps.push({
      inputPatch: patch,
      kernel,
      sum,
      output,
      position: pos,
      action: `Position ${pos}: dot(patch,kernel)=${sum.toFixed(3)}, after ${activation}: ${output.toFixed(3)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Max pooling 1-D
// ---------------------------------------------------------------------------

export interface PoolingStep {
  window: ReadonlyArray<number>;
  maxValue: number;
  position: number;
  action: string;
}

/**
 * 1-D max pooling with non-overlapping windows of poolSize.
 * @complexity O(input.length)
 */
export function maxPool1D(
  input: ReadonlyArray<number>,
  poolSize: number,
): ReadonlyArray<PoolingStep> {
  const steps: PoolingStep[] = [];
  const numWindows = Math.floor(input.length / poolSize);

  for (let i = 0; i < numWindows; i++) {
    const window = input.slice(i * poolSize, (i + 1) * poolSize);
    const maxValue = Math.max(...window);
    steps.push({
      window,
      maxValue,
      position: i,
      action: `Pool window ${i} (indices ${i * poolSize}-${(i + 1) * poolSize - 1}): max=${maxValue}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// RNN
// ---------------------------------------------------------------------------

export interface RNNStep {
  t: number;
  input: number;
  hiddenPrev: number;
  hiddenNew: number;
  output: number;
  action: string;
}

/**
 * Simple RNN forward pass: h_t = tanh(Wx*x_t + Wh*h_{t-1} + bh), out = sigmoid(Wy*h_t + by).
 * @complexity O(sequence.length)
 */
export function rnnForward(
  sequence: ReadonlyArray<number>,
  Wh: number,
  Wx: number,
  Wy: number,
  bh: number,
  by: number,
  h0: number,
): ReadonlyArray<RNNStep> {
  const steps: RNNStep[] = [];
  let h = h0;

  for (let t = 0; t < sequence.length; t++) {
    const xt = sequence[t]!;
    const hiddenPrev = h;
    const hNew = Math.tanh(Wx * xt + Wh * h + bh);
    const output = sigmoid(Wy * hNew + by);
    steps.push({ t, input: xt, hiddenPrev, hiddenNew: hNew, output,
      action: `t=${t}: h=${hNew.toFixed(4)}, out=${output.toFixed(4)}` });
    h = hNew;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// LSTM
// ---------------------------------------------------------------------------

export interface LSTMGates {
  forgetGate: number;
  inputGate: number;
  outputGate: number;
  cellInput: number;
}

export interface LSTMStep {
  t: number;
  input: number;
  gates: LSTMGates;
  cellState: number;
  hiddenState: number;
  output: number;
  action: string;
}

/**
 * Simple scalar LSTM forward pass over a sequence.
 * @complexity O(sequence.length)
 */
export function lstmForward(
  sequence: ReadonlyArray<number>,
  Wf: number, Wi: number, Wo: number, Wg: number,
  bf: number, bi: number, bo: number, bg: number,
  Wy: number, by: number,
  h0: number, c0: number,
): ReadonlyArray<LSTMStep> {
  const steps: LSTMStep[] = [];
  let h = h0;
  let c = c0;

  for (let t = 0; t < sequence.length; t++) {
    const xt = sequence[t]!;
    const combined = xt + h;
    const forgetGate = sigmoid(Wf * combined + bf);
    const inputGate  = sigmoid(Wi * combined + bi);
    const outputGate = sigmoid(Wo * combined + bo);
    const cellInput  = Math.tanh(Wg * combined + bg);
    c = forgetGate * c + inputGate * cellInput;
    h = outputGate * Math.tanh(c);
    const output = sigmoid(Wy * h + by);
    steps.push({ t, input: xt,
      gates: { forgetGate, inputGate, outputGate, cellInput },
      cellState: c, hiddenState: h, output,
      action: `t=${t}: f=${forgetGate.toFixed(3)},i=${inputGate.toFixed(3)},o=${outputGate.toFixed(3)},c=${c.toFixed(3)},h=${h.toFixed(3)}` });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Dropout
// ---------------------------------------------------------------------------

export interface DropoutStep {
  unit: number;
  dropped: boolean;
  value: number;
  action: string;
}

/**
 * Apply dropout with seeded LCG-based PRNG and inverted dropout scaling.
 * rate=0 -> no drops, rate>=1 -> all dropped.
 * @complexity O(activations.length)
 */
export function applyDropout(
  activations: ReadonlyArray<number>,
  dropoutRate: number,
  seed: number,
): ReadonlyArray<DropoutStep> {
  let state = seed >>> 0;
  function nextRandom(): number {
    state = (Math.imul(state, LCG_A) + LCG_C) >>> 0;
    return state / LCG_M;
  }
  const scale = dropoutRate > 0 && dropoutRate < 1 ? 1 / (1 - dropoutRate) : 1;

  return activations.map((val, unit) => {
    if (dropoutRate >= 1) {
      return { unit, dropped: true, value: 0, action: `Unit ${unit}: dropped (rate>=1)` };
    }
    if (dropoutRate <= 0) {
      return { unit, dropped: false, value: val, action: `Unit ${unit}: kept=${val.toFixed(4)}` };
    }
    const r = nextRandom();
    const dropped = r < dropoutRate;
    const value = dropped ? 0 : val * scale;
    return { unit, dropped, value,
      action: dropped ? `Unit ${unit}: dropped` : `Unit ${unit}: kept, scaled=${value.toFixed(4)}` };
  });
}

// ---------------------------------------------------------------------------
// Autoencoder
// ---------------------------------------------------------------------------

export interface AutoencoderStep {
  phase: 'encode' | 'decode';
  layerValues: ReadonlyArray<number>;
  action: string;
}

function matVecSigmoid(
  wMatrix: ReadonlyArray<ReadonlyArray<number>>,
  input: ReadonlyArray<number>,
): number[] {
  return wMatrix.map((row) => {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += row[i]! * input[i]!;
    }
    return sigmoid(sum);
  });
}

/**
 * Autoencoder forward pass with sigmoid activations.
 * Returns steps: input + each encoder layer + each decoder layer.
 * @complexity O(total parameters)
 */
export function autoencoderPass(
  input: ReadonlyArray<number>,
  encoderWeights: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>,
  decoderWeights: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>,
): ReadonlyArray<AutoencoderStep> {
  const steps: AutoencoderStep[] = [
    { phase: 'encode', layerValues: input, action: 'Input layer' },
  ];

  let current: ReadonlyArray<number> = input;

  for (let l = 0; l < encoderWeights.length; l++) {
    current = matVecSigmoid(encoderWeights[l]!, current);
    steps.push({ phase: 'encode', layerValues: current,
      action: `Encoder layer ${l + 1} (${current.length} units)` });
  }

  for (let l = 0; l < decoderWeights.length; l++) {
    current = matVecSigmoid(decoderWeights[l]!, current);
    const isLast = l === decoderWeights.length - 1;
    steps.push({ phase: 'decode', layerValues: current,
      action: isLast ? `Output reconstruction (${current.length} units)` : `Decoder layer ${l + 1} (${current.length} units)` });
  }

  return steps;
}
