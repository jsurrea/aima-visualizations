/**
 * Chapter 1 — Introduction
 *
 * Pure data functions representing Chapter 1 concepts from AIMA 4th Ed.:
 *   - The four approaches to AI (2×2 matrix)
 *   - Key events in AI history
 *   - The standard agent-environment model loop
 *
 * @module algorithms
 */

export interface AIApproach {
  readonly id: string;
  readonly row: 'think' | 'act';
  readonly col: 'human' | 'rational';
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly examples: ReadonlyArray<string>;
  readonly keyFigure: string;
}

/**
 * Returns the four approaches to AI arranged in a 2×2 matrix
 * (Thinking/Acting × Human/Rational) as described in AIMA Ch. 1.
 *
 * @returns Immutable array of four AIApproach objects.
 * @complexity O(1)
 */
export function getAIApproaches(): ReadonlyArray<AIApproach> {
  return [
    {
      id: 'think-human',
      row: 'think',
      col: 'human',
      title: 'Thinking Humanly',
      tagline: 'The cognitive modelling approach',
      description:
        'Systems that think like humans must be able to model human thought processes. ' +
        'This requires understanding how humans actually reason, via cognitive science and neuroscience.',
      examples: [
        'General Problem Solver (GPS)',
        'Cognitive architectures (ACT-R)',
        'Neural network models of cognition',
      ],
      keyFigure: 'Allen Newell & Herbert Simon',
    },
    {
      id: 'think-rational',
      row: 'think',
      col: 'rational',
      title: 'Thinking Rationally',
      tagline: 'The "laws of thought" approach',
      description:
        'Uses logic and formal rules to model correct reasoning. Rooted in Aristotle\'s syllogisms ' +
        'and modern mathematical logic — if the premises are true, the conclusion must follow.',
      examples: [
        'Logic Theorist',
        'Prolog / resolution theorem proving',
        'Automated theorem provers',
      ],
      keyFigure: 'Aristotle → George Boole → John McCarthy',
    },
    {
      id: 'act-human',
      row: 'act',
      col: 'human',
      title: 'Acting Humanly',
      tagline: 'The Turing Test approach',
      description:
        'A machine passes the Turing Test if an interrogator cannot distinguish it from a human. ' +
        'Requires NLP, knowledge representation, automated reasoning, and machine learning.',
      examples: [
        'ELIZA (Weizenbaum, 1966)',
        'Chatbots / conversational agents',
        'Total Turing Test (vision + robotics)',
      ],
      keyFigure: 'Alan Turing',
    },
    {
      id: 'act-rational',
      row: 'act',
      col: 'rational',
      title: 'Acting Rationally',
      tagline: 'The rational agent approach',
      description:
        'A rational agent acts to achieve the best expected outcome given its percepts and knowledge. ' +
        'This is the approach adopted by AIMA — broader than "laws of thought" and more tractable.',
      examples: [
        'Deep Blue / AlphaGo',
        'Autonomous vehicles',
        'Recommendation systems',
      ],
      keyFigure: 'Russell & Norvig',
    },
  ];
}

export interface HistoryEvent {
  readonly year: number;
  readonly title: string;
  readonly description: string;
  readonly category: 'foundations' | 'breakthrough' | 'setback' | 'milestone';
}

/**
 * Returns key AI history events in chronological order as described in AIMA Ch. 1.
 *
 * @returns Immutable array of HistoryEvent objects sorted by year ascending.
 * @complexity O(1)
 */
export function getAIHistoryEvents(): ReadonlyArray<HistoryEvent> {
  return [
    {
      year: 1943,
      title: 'McCulloch & Pitts Neural Model',
      description:
        'Warren McCulloch and Walter Pitts propose the first mathematical model of a neuron, ' +
        'laying groundwork for neural networks.',
      category: 'foundations',
    },
    {
      year: 1950,
      title: 'Turing\'s "Computing Machinery and Intelligence"',
      description:
        'Alan Turing proposes the imitation game (Turing Test) and discusses machine learning, ' +
        'genetic algorithms, and reinforcement learning.',
      category: 'foundations',
    },
    {
      year: 1956,
      title: 'Dartmouth Workshop — Birth of AI',
      description:
        'John McCarthy coins the term "artificial intelligence" at a Dartmouth summer workshop, ' +
        'marking the official founding of the field.',
      category: 'milestone',
    },
    {
      year: 1958,
      title: 'Lisp & the Logic Theorist',
      description:
        'McCarthy develops Lisp, which becomes the dominant AI programming language. ' +
        'Newell, Shaw, and Simon\'s Logic Theorist proves mathematical theorems.',
      category: 'foundations',
    },
    {
      year: 1966,
      title: 'ELIZA',
      description:
        'Joseph Weizenbaum creates ELIZA, an early NLP program that simulates a psychotherapist, ' +
        'demonstrating superficial human-computer conversation.',
      category: 'milestone',
    },
    {
      year: 1969,
      title: 'First AI Winter Begins',
      description:
        'Minsky & Papert\'s "Perceptrons" exposes limitations of single-layer networks. ' +
        'DARPA cuts funding; progress slows dramatically.',
      category: 'setback',
    },
    {
      year: 1980,
      title: 'Expert Systems Boom',
      description:
        'XCON and other expert systems demonstrate commercial AI value. ' +
        'The AI industry grows to over a billion dollars.',
      category: 'breakthrough',
    },
    {
      year: 1987,
      title: 'Second AI Winter',
      description:
        'Expert system maintenance costs mount, hardware becomes obsolete, and the Lisp machine market collapses, ' +
        'triggering the second major funding collapse.',
      category: 'setback',
    },
    {
      year: 1997,
      title: 'Deep Blue Defeats Kasparov',
      description:
        'IBM\'s Deep Blue becomes the first computer system to defeat a reigning world chess champion ' +
        'under standard tournament conditions.',
      category: 'breakthrough',
    },
    {
      year: 2012,
      title: 'Deep Learning Revolution',
      description:
        'AlexNet wins ImageNet by a large margin using deep convolutional networks trained on GPUs, ' +
        'triggering the modern deep learning era.',
      category: 'breakthrough',
    },
    {
      year: 2016,
      title: 'AlphaGo Defeats Lee Sedol',
      description:
        'DeepMind\'s AlphaGo defeats world Go champion Lee Sedol 4–1, a milestone once thought decades away, ' +
        'using deep RL and Monte Carlo tree search.',
      category: 'breakthrough',
    },
    {
      year: 2022,
      title: 'Large Language Models',
      description:
        'ChatGPT (GPT-4 family) demonstrates unprecedented language capabilities, ' +
        'bringing generative AI into mainstream use and reigniting societal discussion about AI\'s future.',
      category: 'milestone',
    },
  ];
}

export interface StandardModelStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly direction: 'env-to-agent' | 'agent-internal' | 'agent-to-env' | 'env-internal';
}

/**
 * Returns the four steps of the standard agent-environment model loop from AIMA Ch. 1.
 *
 * @returns Immutable array of four StandardModelStep objects.
 * @complexity O(1)
 */
export function getStandardModelSteps(): ReadonlyArray<StandardModelStep> {
  return [
    {
      id: 'percept',
      label: 'Perceive',
      description:
        'The agent receives a percept from the environment through its sensors — ' +
        'everything the agent can observe at any given moment.',
      direction: 'env-to-agent',
    },
    {
      id: 'decide',
      label: 'Decide',
      description:
        'The agent\'s program maps the percept sequence to an action using its internal state, ' +
        'knowledge base, and performance measure.',
      direction: 'agent-internal',
    },
    {
      id: 'act',
      label: 'Act',
      description:
        'The agent executes the chosen action through its actuators, ' +
        'influencing the state of the environment.',
      direction: 'agent-to-env',
    },
    {
      id: 'env-update',
      label: 'Environment Updates',
      description:
        'The environment transitions to a new state in response to the agent\'s action ' +
        'and its own internal dynamics, ready for the next percept.',
      direction: 'env-internal',
    },
  ];
}
