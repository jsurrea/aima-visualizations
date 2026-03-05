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

export interface AIFoundation {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly coreQuestion: string;
  readonly keyContributions: ReadonlyArray<string>;
  readonly keyFigures: ReadonlyArray<string>;
  readonly connectionToAI: string;
  readonly color: string;
}

export function getAIFoundations(): ReadonlyArray<AIFoundation> {
  return [
    {
      id: 'philosophy',
      name: 'Philosophy',
      emoji: '📜',
      coreQuestion: 'Can formal rules capture all of rational thought? Can a physical mind have a non-physical soul?',
      keyContributions: [
        'Formal rules of inference (Aristotle\'s syllogisms)',
        'Dualism vs. materialism — the mind–body problem',
        'Empiricism and the principle of induction (Hume)',
        'Connection from knowledge to action (Aristotle\'s practical syllogism)',
      ],
      keyFigures: ['Aristotle', 'René Descartes', 'David Hume', 'John Stuart Mill', 'Bertrand Russell'],
      connectionToAI: 'AI inherited philosophy\'s core question: can a machine reason correctly? The answer required formal logic, probability theory, and decision theory — all rooted in philosophical inquiry.',
      color: '#6366F1',
    },
    {
      id: 'mathematics',
      name: 'Mathematics',
      emoji: '∑',
      coreQuestion: 'What are the formal rules for valid inference and what can — or cannot — be computed?',
      keyContributions: [
        'Boolean algebra and formal propositional logic (Boole, Frege)',
        'Probability theory as an extension of logic (Laplace, Kolmogorov)',
        'Computability theory and the Turing machine (Turing, Church–Turing thesis)',
        'NP-completeness — tractability boundaries (Cook, 1971)',
      ],
      keyFigures: ['George Boole', 'Gottlob Frege', 'Alan Turing', 'Alonzo Church', 'Stephen Cook'],
      connectionToAI: 'Mathematics gave AI its language: logic for knowledge representation, probability for uncertainty, and complexity theory to distinguish feasible from infeasible problems.',
      color: '#3B82F6',
    },
    {
      id: 'economics',
      name: 'Economics',
      emoji: '📊',
      coreQuestion: 'How should agents make decisions to maximise utility, and how do multiple agents interact?',
      keyContributions: [
        'Utility theory and expected-value decision making (Bernoulli, von Neumann)',
        'Game theory for multi-agent strategic interaction (Nash equilibrium)',
        'Operations research and satisficing (Herbert Simon)',
        'Markov Decision Processes for sequential decisions under uncertainty',
      ],
      keyFigures: ['Daniel Bernoulli', 'John von Neumann', 'John Nash', 'Herbert Simon', 'Richard Bellman'],
      connectionToAI: 'AI agents are decision-makers. Economics provided utility theory, game theory, and MDPs — the mathematical backbone of rational agent behaviour in complex environments.',
      color: '#10B981',
    },
    {
      id: 'neuroscience',
      name: 'Neuroscience',
      emoji: '🧠',
      coreQuestion: 'How does the brain process information, and can a biological neural network inspire artificial ones?',
      keyContributions: [
        'Discovery of the neuron as the brain\'s basic processing unit (Cajal)',
        'Hebbian learning rule: neurons that fire together wire together',
        'Neural correlates of memory, vision, and language',
        'Brain–machine interfaces and neural plasticity research',
      ],
      keyFigures: ['Santiago Ramón y Cajal', 'Donald Hebb', 'David Hubel & Torsten Wiesel', 'Francis Crick'],
      connectionToAI: 'The McCulloch–Pitts neuron model (1943) launched neural networks. Modern deep learning architectures loosely mimic cortical organisation, though the brain remains far more efficient.',
      color: '#EC4899',
    },
    {
      id: 'psychology',
      name: 'Psychology',
      emoji: '🧪',
      coreQuestion: 'How do humans and animals perceive, learn, and choose actions — and can we model this computationally?',
      keyContributions: [
        'Behaviorism: learning as stimulus–response conditioning (Watson, Skinner)',
        'Cognitive psychology: the mind as an information-processing system (Craik 1943)',
        'Mental models, knowledge representations, and cognitive architecture',
        'Human–computer interaction and intelligence augmentation',
      ],
      keyFigures: ['William James', 'Kenneth Craik', 'B.F. Skinner', 'George Miller', 'Ulric Neisser'],
      connectionToAI: 'Cognitive psychology reframed the mind as a symbol-processing machine — a direct inspiration for AI\'s knowledge representation and search paradigms.',
      color: '#F59E0B',
    },
    {
      id: 'computer-engineering',
      name: 'Computer Engineering',
      emoji: '💻',
      coreQuestion: 'How do we build machines fast and capable enough to run AI algorithms at scale?',
      keyContributions: [
        'ENIAC (1945) — the first programmable electronic computer',
        'Moore\'s law: transistor density doubling every ~18 months',
        'GPU parallel architectures enabling deep learning (2012 onward)',
        'Tensor Processing Units (TPUs) and neuromorphic chips',
      ],
      keyFigures: ['John von Neumann', 'Gordon Moore', 'John Backus', 'Jensen Huang'],
      connectionToAI: 'AI algorithms are only feasible because of exponential improvements in hardware. The GPU revolution directly enabled the 2012 deep learning breakthrough and every advance since.',
      color: '#8B5CF6',
    },
    {
      id: 'control-theory',
      name: 'Control Theory',
      emoji: '⚙️',
      coreQuestion: 'How can a device regulate itself to achieve and maintain a desired state over time?',
      keyContributions: [
        'Feedback control loops and PID controllers',
        'Cybernetics: purposive machines and self-regulation (Norbert Wiener, 1948)',
        'Optimal control theory and cost-function minimisation (Pontryagin, Bellman)',
        'Stochastic optimal control bridging to reinforcement learning',
      ],
      keyFigures: ['James Watt', 'Norbert Wiener', 'Rudolf Kalman', 'Lev Pontryagin', 'Richard Bellman'],
      connectionToAI: 'Control theory and AI converged on the same objective — building goal-directed machines. Modern RL formalises this as a stochastic optimal control problem with a reward signal.',
      color: '#14B8A6',
    },
    {
      id: 'linguistics',
      name: 'Linguistics',
      emoji: '💬',
      coreQuestion: 'How is language structured and understood, and can machines process it meaningfully?',
      keyContributions: [
        'Generative grammar: language as infinite rule-governed structure (Chomsky, 1957)',
        'Computational linguistics and formal grammars (context-free, context-sensitive)',
        'Knowledge representation for language semantics',
        'Statistical and neural approaches to NLP',
      ],
      keyFigures: ['Noam Chomsky', 'Zellig Harris', 'Roger Schank', 'Eugene Charniak'],
      connectionToAI: 'Language is the richest human capability. Linguistics gave AI the tools to parse, represent, and generate text — from early parsers to today\'s large language models.',
      color: '#F97316',
    },
  ];
}

export interface AICapability {
  readonly id: string;
  readonly domain: string;
  readonly emoji: string;
  readonly title: string;
  readonly description: string;
  readonly milestone: string;
  readonly humanComparison: 'exceeds' | 'matches' | 'approaching' | 'below';
  readonly year: number;
}

export function getAICapabilities(): ReadonlyArray<AICapability> {
  return [
    {
      id: 'image-recognition',
      domain: 'Vision',
      emoji: '👁️',
      title: 'Image Recognition',
      description: 'Top-5 error on ImageNet fell from 28% (2010) to under 2% (2017), surpassing estimated human-level performance of ~5%.',
      milestone: 'AlexNet (2012) → SENet / EfficientNet (2017–2020)',
      humanComparison: 'exceeds',
      year: 2017,
    },
    {
      id: 'reading-comprehension',
      domain: 'Language',
      emoji: '📖',
      title: 'Reading Comprehension',
      description: 'On the Stanford SQuAD benchmark, machine F1 score rose from ~60 (2015) to 95+ (2019), matching and slightly exceeding human annotator scores.',
      milestone: 'BERT / XLNet surpass human F1 on SQuAD 2.0 (2019)',
      humanComparison: 'exceeds',
      year: 2019,
    },
    {
      id: 'chess',
      domain: 'Games',
      emoji: '♟️',
      title: 'Chess',
      description: 'Deep Blue defeated world champion Garry Kasparov in 1997. Today\'s engines (Stockfish, AlphaZero) are effectively unchallenged at any level of human play.',
      milestone: 'Deep Blue defeats Kasparov, 1997',
      humanComparison: 'exceeds',
      year: 1997,
    },
    {
      id: 'go',
      domain: 'Games',
      emoji: '⚫',
      title: 'Go',
      description: 'AlphaGo defeated world champion Lee Sedol 4–1 in 2016, a milestone once thought to be decades away. AlphaZero later mastered it from scratch in hours.',
      milestone: 'AlphaGo defeats Lee Sedol, 2016',
      humanComparison: 'exceeds',
      year: 2016,
    },
    {
      id: 'poker',
      domain: 'Games',
      emoji: '🃏',
      title: 'Texas Hold\'em Poker',
      description: 'Libratus (2017) and Pluribus (2019) defeated top professional players in heads-up and 6-player no-limit Texas Hold\'em, a game requiring bluffing and imperfect information reasoning.',
      milestone: 'Pluribus defeats professionals in 6-player poker, 2019',
      humanComparison: 'exceeds',
      year: 2019,
    },
    {
      id: 'speech-recognition',
      domain: 'Language',
      emoji: '🎙️',
      title: 'Speech Recognition',
      description: 'Microsoft achieved a word error rate of 5.1% on the Switchboard benchmark (2017), matching human transcriptionists. Modern systems handle diverse accents and noisy environments.',
      milestone: 'Microsoft reaches 5.1% WER, matching human parity (2017)',
      humanComparison: 'matches',
      year: 2017,
    },
    {
      id: 'machine-translation',
      domain: 'Language',
      emoji: '🌐',
      title: 'Machine Translation',
      description: 'Neural machine translation (transformer-based) now covers 100+ languages with near-professional quality for major language pairs. Google Translate serves 500M+ daily users.',
      milestone: 'Transformer architecture (2017), 100+ languages (2019)',
      humanComparison: 'approaching',
      year: 2019,
    },
    {
      id: 'skin-cancer',
      domain: 'Medicine',
      emoji: '🔬',
      title: 'Skin Cancer Diagnosis',
      description: 'A deep CNN matched board-certified dermatologists in classifying skin lesions from images, correctly identifying melanoma with sensitivity/specificity comparable to expert physicians.',
      milestone: 'Stanford CNN matches dermatologist accuracy (Esteva et al., 2017)',
      humanComparison: 'matches',
      year: 2017,
    },
    {
      id: 'autonomous-driving',
      domain: 'Robotics',
      emoji: '🚗',
      title: 'Autonomous Driving',
      description: 'Waymo began commercial robotaxi service in 2018 (Phoenix) and 2020 (fully driverless). DARPA Grand Challenge (2005) demonstrated cross-desert autonomous navigation.',
      milestone: 'Waymo commercial robotaxi launches driverless (2020)',
      humanComparison: 'approaching',
      year: 2020,
    },
    {
      id: 'starcraft',
      domain: 'Games',
      emoji: '🎮',
      title: 'StarCraft II',
      description: 'DeepMind\'s AlphaStar reached Grandmaster level in StarCraft II (top 0.2% of players) using self-play reinforcement learning on raw visual input, a complex real-time strategy game.',
      milestone: 'AlphaStar reaches Grandmaster (top 0.2%), 2019',
      humanComparison: 'exceeds',
      year: 2019,
    },
  ];
}

export interface AIRisk {
  readonly id: string;
  readonly type: 'risk' | 'benefit';
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
  readonly severity: 'high' | 'medium' | 'low';
  readonly timeframe: 'near-term' | 'long-term' | 'present';
}

export function getAIRisksAndBenefits(): ReadonlyArray<AIRisk> {
  return [
    // Benefits
    {
      id: 'benefit-menial-work',
      type: 'benefit',
      title: 'Freedom from Menial Work',
      description: 'AI can automate repetitive, dangerous, or tedious tasks — freeing humans for creative, social, and high-level cognitive work.',
      emoji: '🤖',
      severity: 'low',
      timeframe: 'present',
    },
    {
      id: 'benefit-science',
      type: 'benefit',
      title: 'Accelerate Scientific Discovery',
      description: 'AI systems like AlphaFold have already transformed structural biology. AI assists drug discovery, materials science, climate modelling, and mathematics.',
      emoji: '🔬',
      severity: 'low',
      timeframe: 'present',
    },
    {
      id: 'benefit-medicine',
      type: 'benefit',
      title: 'Cure Diseases',
      description: 'AI diagnostic systems match or exceed specialist physicians in radiology, pathology, and dermatology. Personalised medicine and accelerated drug development could save millions of lives.',
      emoji: '💊',
      severity: 'low',
      timeframe: 'near-term',
    },
    {
      id: 'benefit-climate',
      type: 'benefit',
      title: 'Combat Climate Change',
      description: 'AI optimises energy grids, improves weather forecasting, accelerates clean energy research, and can reduce emissions in logistics, manufacturing, and agriculture.',
      emoji: '🌍',
      severity: 'low',
      timeframe: 'near-term',
    },
    // Risks
    {
      id: 'risk-autonomous-weapons',
      type: 'risk',
      title: 'Lethal Autonomous Weapons',
      description: 'AI-enabled weapons can select and engage targets without human oversight. Their scalability (millions of autonomous drones at low cost) creates unprecedented asymmetric warfare risks. A UN Group of Governmental Experts reached formal stage in 2017.',
      emoji: '⚔️',
      severity: 'high',
      timeframe: 'near-term',
    },
    {
      id: 'risk-surveillance',
      type: 'risk',
      title: 'Mass Surveillance & Manipulation',
      description: 'AI-powered facial recognition enables authoritarian mass surveillance. Algorithmic recommender systems can amplify political polarisation, spread disinformation, and enable micro-targeted propaganda.',
      emoji: '👁️',
      severity: 'high',
      timeframe: 'present',
    },
    {
      id: 'risk-bias',
      type: 'risk',
      title: 'Biased Decision Making',
      description: 'AI systems trained on historical data inherit and can amplify societal biases. Documented cases include discriminatory parole risk scores (COMPAS), biased loan approval systems, and facial recognition errors on darker skin tones.',
      emoji: '⚖️',
      severity: 'high',
      timeframe: 'present',
    },
    {
      id: 'risk-employment',
      type: 'risk',
      title: 'Impact on Employment',
      description: 'Automation displaces routine cognitive and manual jobs. While new jobs may emerge, the transition could deepen inequality if the benefits of AI accrue primarily to capital owners and highly skilled workers.',
      emoji: '🏭',
      severity: 'medium',
      timeframe: 'near-term',
    },
    {
      id: 'risk-safety-critical',
      type: 'risk',
      title: 'Safety-Critical Failures',
      description: 'AI systems deployed in high-stakes domains (self-driving cars, medical diagnosis, aircraft) can fail catastrophically. The 2018 Uber and 2018 Tesla fatal accidents highlighted challenges in edge-case handling.',
      emoji: '🚨',
      severity: 'high',
      timeframe: 'present',
    },
    {
      id: 'risk-cybersecurity',
      type: 'risk',
      title: 'AI-Powered Cybersecurity Threats',
      description: 'AI lowers the barrier for sophisticated cyberattacks: automated vulnerability discovery, AI-generated phishing, deepfake fraud, and AI-powered malware that evades traditional defences.',
      emoji: '🔓',
      severity: 'medium',
      timeframe: 'present',
    },
    {
      id: 'risk-value-alignment',
      type: 'risk',
      title: 'The Value Alignment Problem',
      description: 'The "King Midas problem": an AI optimising the wrong objective can cause catastrophic harm even with good intentions. The "gorilla problem": once a more intelligent system exists, the less intelligent species (us) may lose control. The standard model\'s core flaw: we cannot fully specify what we actually want.',
      emoji: '🎯',
      severity: 'high',
      timeframe: 'long-term',
    },
  ];
}
