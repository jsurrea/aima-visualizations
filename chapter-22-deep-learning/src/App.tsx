import manifest from '../manifest.json';
import ActivationFunctionViz from './components/ActivationFunctionViz';
import ForwardPassViz from './components/ForwardPassViz';
import BackpropViz from './components/BackpropViz';
import TrainingViz from './components/TrainingViz';
import ConvolutionViz from './components/ConvolutionViz';
import RNNViz from './components/RNNViz';
import LSTMViz from './components/LSTMViz';
import AutoencoderViz from './components/AutoencoderViz';

const COLOR = manifest.color;

interface SectionHeaderProps {
  id: string;
  title: string;
  description: string;
}

function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 id={id} style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>
        {description}
      </p>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section aria-labelledby={id} style={{
      padding: '40px 24px',
      maxWidth: '960px',
      margin: '0 auto',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <SectionHeader id={id} title={title} description={description} />
      <div style={{ background: 'var(--surface-1, #111118)', borderRadius: 'var(--radius-lg, 20px)',
        padding: '24px', border: '1px solid var(--surface-border, rgba(255,255,255,0.08))' }}>
        {children}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base, #0A0A0F)', color: 'white',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <header style={{ background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <a href="/aima-visualizations/"
          style={{ color: COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters">
          ← Back to All Chapters
        </a>
      </header>

      <section style={{ padding: '48px 24px 32px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${COLOR}20`, color: COLOR, fontWeight: 700, fontSize: '18px',
          }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '640px' }}>
          {manifest.description}
        </p>
      </section>

      <Section id="feedforward" title="§22.1 Simple Feedforward Networks"
        description="A feedforward network computes a function of the inputs by composing layers of linear transformations and nonlinear activations. Watch each layer activate step-by-step.">
        <ForwardPassViz />
      </Section>

      <Section id="computation-graphs" title="§22.2 Computation Graphs & Backpropagation"
        description="Backpropagation uses the chain rule to compute gradients layer by layer from output back to input. Observe delta and gradient values at each layer.">
        <BackpropViz />
      </Section>

      <Section id="cnn" title="§22.3 Convolutional Networks"
        description="A 1-D convolution slides a kernel over an input sequence, computing a weighted dot product at each position. This operation detects local patterns in data.">
        <ConvolutionViz />
      </Section>

      <Section id="learning-algorithms" title="§22.4 Learning Algorithms"
        description="Gradient descent updates weights to minimize loss over a training set. Watch the loss curve decrease as the network trains on XOR data across epochs.">
        <TrainingViz />
      </Section>

      <Section id="generalization" title="§22.5 Generalization & Activation Functions"
        description="Activation functions introduce nonlinearity essential for learning complex functions. Different choices (sigmoid, ReLU, tanh, softplus) affect gradient flow and generalization.">
        <ActivationFunctionViz />
      </Section>

      <Section id="rnn" title="§22.6 Recurrent Neural Networks"
        description="An RNN processes sequences by maintaining a hidden state updated at each time step: h_t = tanh(Wx·x_t + Wh·h_{t-1} + b). The network is unrolled through time.">
        <RNNViz />
      </Section>

      <Section id="lstm" title="§22.6.2 Long Short-Term Memory (LSTM)"
        description="LSTMs add gating mechanisms (forget, input, output) to control information flow through a cell state, enabling learning of long-range dependencies in sequences.">
        <LSTMViz />
      </Section>

      <Section id="unsupervised" title="§22.7 Unsupervised & Transfer Learning — Autoencoders"
        description="An autoencoder learns a compressed representation by encoding input to a lower-dimensional bottleneck, then decoding back to reconstruct the original input.">
        <AutoencoderViz />
      </Section>

      <section aria-labelledby="applications" style={{
        padding: '40px 24px',
        maxWidth: '960px',
        margin: '0 auto',
      }}>
        <SectionHeader
          id="applications"
          title="§22.8 Applications"
          description="Deep learning is applied across image classification (CNNs), sequence-to-sequence translation (encoder-decoder RNNs/LSTMs), and language modelling. The interactive visualizations above demonstrate all key building blocks: convolutional feature extraction, recurrent sequence processing, and autoencoding for representation learning."
        />
        <div style={{
          background: 'var(--surface-1, #111118)',
          borderRadius: 'var(--radius-lg, 20px)',
          padding: '24px',
          border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {[
            { icon: '🖼️', title: 'Image Classification', detail: 'CNNs (§22.3) extract hierarchical spatial features via convolution + pooling, enabling recognition of objects in images.' },
            { icon: '🔄', title: 'Sequence-to-Sequence', detail: 'Encoder–decoder RNNs/LSTMs (§22.6) map variable-length input sequences to variable-length outputs for translation and summarisation.' },
            { icon: '📝', title: 'Language Models', detail: 'Recurrent networks and transformers model conditional word probabilities P(wt | w1…wt-1) for text generation and speech recognition.' },
          ].map(app => (
            <div key={app.title} style={{
              background: 'var(--surface-2, #1A1A24)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid var(--surface-border, rgba(255,255,255,0.08))',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }} aria-hidden="true">{app.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F9FAFB', marginBottom: 8 }}>{app.title}</h3>
              <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>{app.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
