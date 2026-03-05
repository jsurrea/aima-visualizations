# Chapter 22 — Deep Learning

Interactive visualizations for Chapter 22 of *AI: A Modern Approach, 4th Ed.* (Russell & Norvig).

## Overview

Deep learning covers neural network architectures and training algorithms that learn hierarchical representations from data. This chapter spans feedforward networks, backpropagation, convolutional networks, recurrent networks, and unsupervised learning.

## Visualizations

### §22.1 — Simple Feedforward Networks (`ForwardPassViz`)
Step-by-step forward pass through a 2-input → 2-hidden → 1-output network. Each layer's pre-activations and post-activations are shown as the computation propagates forward. Supports sigmoid, ReLU, and tanh activations.

### §22.2 — Computation Graphs & Backpropagation (`BackpropViz`)
Visualizes the backpropagation algorithm: computes output delta, then propagates gradients backward through hidden layers via the chain rule. Shows delta values and weight gradients at each node.

### §22.3 — Convolutional Networks (`ConvolutionViz`)
1-D convolution: a kernel slides over an input sequence with valid padding, computing a dot product at each position. Highlights the active input patch, kernel, and accumulated output. Supports ReLU and linear activations.

### §22.4 — Learning Algorithms (`TrainingViz`)
Animated loss curve showing online gradient descent training on an XOR dataset over 80 epochs. Configurable learning rate (0.01, 0.1, 0.5) and activation function (sigmoid, ReLU, tanh).

### §22.5 — Generalization & Activation Functions (`ActivationFunctionViz`)
Plots all four activation functions (sigmoid, ReLU, softplus, tanh) and their derivatives over x ∈ [−4, 4]. An animated cursor moves along the curve, displaying f(x) and f′(x) in real time.

### §22.6 — Recurrent Neural Networks (`RNNViz`)
Unrolled RNN over an 8-element sequence. Shows hidden state evolution h_t = tanh(Wx·x_t + Wh·h_{t-1} + bh) and output at each time step with connecting arrows.

### §22.6.2 — Long Short-Term Memory (`LSTMViz`)
Gate-level LSTM visualization: animated bar charts for forget gate, input gate, output gate, and cell input at each time step. Cell state and hidden state history plotted as line charts.

### §22.7 — Unsupervised & Transfer Learning — Autoencoders (`AutoencoderViz`)
8→4→2→4→8 autoencoder forward pass. Each layer's activations are shown as color-coded bar charts, with the bottleneck clearly visible. Encoder layers shown in green, decoder in indigo.

## Development

```bash
npm install
npm run dev       # dev server
npm test          # run tests with coverage
npm run build     # production build
```

## Tech Stack

- React 18 + TypeScript (strict mode)
- Vite + `@originjs/vite-plugin-federation`
- Vitest + `@vitest/coverage-v8` (100% branch + line coverage)
- KaTeX for math rendering
