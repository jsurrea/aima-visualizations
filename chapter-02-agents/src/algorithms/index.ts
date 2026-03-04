/**
 * Chapter 2 — Intelligent Agents
 *
 * Pure algorithm functions for PEAS framework, agent architectures,
 * and the simple vacuum-cleaner world simulation.
 *
 * @module algorithms
 */

// ---------------------------------------------------------------------------
// PEAS Framework
// ---------------------------------------------------------------------------

export interface PEASEntry {
  readonly id: string;
  readonly agent: string;
  readonly performance: ReadonlyArray<string>;
  readonly environment: ReadonlyArray<string>;
  readonly actuators: ReadonlyArray<string>;
  readonly sensors: ReadonlyArray<string>;
}

/**
 * Returns PEAS framework examples for five canonical agent types from AIMA Ch. 2.
 *
 * @returns Five PEAS entries (taxi, medical, image, shopping, chess).
 * @complexity O(1)
 */
export function getPEASExamples(): ReadonlyArray<PEASEntry> {
  return [
    {
      id: 'taxi',
      agent: 'Automated Taxi Driver',
      performance: [
        'Safe trip',
        'Fast arrival',
        'Legal driving',
        'Comfortable ride',
        'Maximize profits',
      ],
      environment: [
        'Roads & traffic',
        'Passengers',
        'Pedestrians',
        'Other vehicles',
        'Weather conditions',
      ],
      actuators: [
        'Steering wheel',
        'Accelerator',
        'Brake',
        'Signal / horn',
        'Display / speech',
      ],
      sensors: [
        'Cameras',
        'Sonar / LIDAR',
        'GPS',
        'Speedometer',
        'Microphone',
      ],
    },
    {
      id: 'medical',
      agent: 'Medical Diagnosis System',
      performance: [
        'Correct diagnosis',
        'Minimise cost',
        'Avoid unnecessary tests',
        'Patient well-being',
      ],
      environment: [
        'Patients',
        'Hospital',
        'Medical staff',
        'Lab equipment',
      ],
      actuators: [
        'Display questions',
        'Order tests',
        'Print diagnosis',
        'Treatment referral',
      ],
      sensors: [
        'Keyboard input',
        'Medical records',
        'Lab results',
        'Vital-sign monitors',
      ],
    },
    {
      id: 'image',
      agent: 'Image Analysis System',
      performance: [
        'Correct object categorisation',
        'High recall & precision',
        'Speed of analysis',
      ],
      environment: [
        'Image datasets',
        'Satellite / video feeds',
        'Varied lighting',
      ],
      actuators: [
        'Labelled output',
        'Database updates',
        'Alert notifications',
      ],
      sensors: [
        'Camera arrays',
        'Pixel data',
        'Image metadata',
      ],
    },
    {
      id: 'shopping',
      agent: 'Internet Shopping Agent',
      performance: [
        'Find best price',
        'Correct item specification',
        'Delivery speed',
        'User satisfaction',
      ],
      environment: [
        'Online retailers',
        'Product databases',
        'User preferences',
        'Internet / APIs',
      ],
      actuators: [
        'Display search results',
        'Place orders',
        'Send notifications',
      ],
      sensors: [
        'Web crawlers',
        'User queries',
        'Price feeds',
        'Review scrapers',
      ],
    },
    {
      id: 'chess',
      agent: 'Chess-Playing Agent',
      performance: [
        'Win the game',
        'Minimise opponent score',
        'Legal moves only',
      ],
      environment: [
        'Chess board',
        'Opponent player',
        'Clock / time controls',
      ],
      actuators: [
        'Move selection display',
        'Physical robot arm (optional)',
      ],
      sensors: [
        'Board state input',
        'Clock readings',
        'Opponent moves',
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

export type AgentTypeId =
  | 'simple-reflex'
  | 'model-based'
  | 'goal-based'
  | 'utility-based'
  | 'learning';

export interface AgentType {
  readonly id: AgentTypeId;
  readonly title: string;
  readonly description: string;
  readonly hasModel: boolean;
  readonly hasGoals: boolean;
  readonly hasUtility: boolean;
  readonly hasLearning: boolean;
  readonly examples: ReadonlyArray<string>;
  readonly components: ReadonlyArray<string>;
}

/**
 * Returns the five agent architectures described in AIMA Chapter 2.
 *
 * @returns Five AgentType entries in order of increasing sophistication.
 * @complexity O(1)
 */
export function getAgentTypes(): ReadonlyArray<AgentType> {
  return [
    {
      id: 'simple-reflex',
      title: 'Simple Reflex Agent',
      description:
        'Selects actions based solely on the current percept, ignoring history. Uses condition-action rules.',
      hasModel: false,
      hasGoals: false,
      hasUtility: false,
      hasLearning: false,
      examples: ['Thermostat', 'Vacuum cleaner (simple)', 'Spam filter (rule-based)'],
      components: ['Sensors', 'Condition-action rules', 'Actuators'],
    },
    {
      id: 'model-based',
      title: 'Model-Based Reflex Agent',
      description:
        'Maintains an internal state to track the world. Uses a model of how the world evolves to handle partial observability.',
      hasModel: true,
      hasGoals: false,
      hasUtility: false,
      hasLearning: false,
      examples: ['Partially observable vacuum', 'Car lane-keeping system'],
      components: [
        'Sensors',
        'State (internal model)',
        'World-update model',
        'Condition-action rules',
        'Actuators',
      ],
    },
    {
      id: 'goal-based',
      title: 'Goal-Based Agent',
      description:
        'Combines world knowledge with goal information, searching or planning to find action sequences that achieve the goal.',
      hasModel: true,
      hasGoals: true,
      hasUtility: false,
      hasLearning: false,
      examples: ['GPS route planner', 'Chess engine (goal: checkmate)', 'Robotic arm planner'],
      components: [
        'Sensors',
        'State (internal model)',
        'Goal description',
        'Search / planning',
        'Actuators',
      ],
    },
    {
      id: 'utility-based',
      title: 'Utility-Based Agent',
      description:
        'Uses a utility function to measure desirability of states, choosing actions that maximise expected utility when goals conflict.',
      hasModel: true,
      hasGoals: true,
      hasUtility: true,
      hasLearning: false,
      examples: ['Automated taxi driver', 'Medical diagnosis system', 'Portfolio manager'],
      components: [
        'Sensors',
        'State (internal model)',
        'Utility function',
        'Decision-making module',
        'Actuators',
      ],
    },
    {
      id: 'learning',
      title: 'Learning Agent',
      description:
        'Has a learning element that improves the performance element over time using a critic and problem generator.',
      hasModel: true,
      hasGoals: true,
      hasUtility: true,
      hasLearning: true,
      examples: ['AlphaGo', 'Self-driving car (ML pipeline)', 'Recommendation system'],
      components: [
        'Learning element',
        'Performance element',
        'Critic',
        'Problem generator',
        'Sensors',
        'Actuators',
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Vacuum World
// ---------------------------------------------------------------------------

export type RoomStatus = 'clean' | 'dirty';
export type AgentPosition = 'Left' | 'Right';
export type VacuumAction = 'Suck' | 'MoveLeft' | 'MoveRight' | 'NoOp';

export interface VacuumWorldState {
  readonly agentPosition: AgentPosition;
  readonly leftRoom: RoomStatus;
  readonly rightRoom: RoomStatus;
}

export interface VacuumStep {
  readonly state: VacuumWorldState;
  readonly action: VacuumAction;
  readonly description: string;
  readonly score: number;
}

/**
 * Simulates the simple-reflex vacuum agent in a 2-room world.
 *
 * Rule: if current room is dirty → Suck;
 *       else if other room is dirty → move toward it;
 *       else → NoOp.
 * Stops when both rooms are clean or after 20 steps.
 *
 * Score: +1 each step a room is clean, −1 per move action.
 *
 * @param initial - Starting world state.
 * @returns All steps (including initial) for playback.
 * @complexity O(n) where n ≤ 20
 */
export function simulateVacuumWorld(
  initial: VacuumWorldState,
): ReadonlyArray<VacuumStep> {
  const MAX_STEPS = 20;
  const steps: VacuumStep[] = [];

  let position = initial.agentPosition;
  let leftRoom = initial.leftRoom;
  let rightRoom = initial.rightRoom;
  let score = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    // Score for this step: +1 per clean room
    const cleanRooms = (leftRoom === 'clean' ? 1 : 0) + (rightRoom === 'clean' ? 1 : 0);
    score += cleanRooms;

    const currentRoomStatus = position === 'Left' ? leftRoom : rightRoom;

    let action: VacuumAction;
    let description: string;

    if (currentRoomStatus === 'dirty') {
      action = 'Suck';
      description = `${position} room is dirty — Suck.`;
    } else if (leftRoom === 'dirty' || rightRoom === 'dirty') {
      action = position === 'Left' ? 'MoveRight' : 'MoveLeft';
      description = `${position} room is clean — move to ${position === 'Left' ? 'Right' : 'Left'}.`;
    } else {
      action = 'NoOp';
      description = 'Both rooms are clean — no action needed.';
    }

    const state: VacuumWorldState = { agentPosition: position, leftRoom, rightRoom };
    // Deduct score for movement
    const movePenalty = action === 'MoveLeft' || action === 'MoveRight' ? 1 : 0;
    score -= movePenalty;

    steps.push({ state, action, description, score });

    // Stop as soon as both rooms are clean and action is NoOp
    if (action === 'NoOp') break;

    // Apply action
    if (action === 'Suck') {
      if (position === 'Left') leftRoom = 'clean';
      else rightRoom = 'clean';
    } else if (action === 'MoveLeft') {
      position = 'Left';
    } else {
      // action === 'MoveRight'
      position = 'Right';
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Environment Properties (§2.3.2)
// ---------------------------------------------------------------------------

export type Observability = 'fully' | 'partially' | 'unobservable';
export type AgentCount = 'single' | 'multi';
export type Determinism = 'deterministic' | 'stochastic';
export type Episodicity = 'episodic' | 'sequential';
export type Dynamics = 'static' | 'semidynamic' | 'dynamic';
export type Continuity = 'discrete' | 'continuous';
export type KnowledgeLevel = 'known' | 'unknown';

export interface EnvironmentProperties {
  readonly observability: Observability;
  readonly agentCount: AgentCount;
  readonly determinism: Determinism;
  readonly episodicity: Episodicity;
  readonly dynamics: Dynamics;
  readonly continuity: Continuity;
  readonly knowledge: KnowledgeLevel;
}

export interface EnvironmentExample {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly properties: EnvironmentProperties;
  readonly isOriginal: boolean;
}

export interface EnvironmentDimension {
  readonly key: keyof EnvironmentProperties;
  readonly label: string;
  readonly description: string;
  readonly options: ReadonlyArray<{ value: string; label: string; harder: boolean }>;
}

/**
 * Returns the 7 environment property dimensions from AIMA §2.3.2.
 *
 * Each dimension describes a property axis along which task environments vary.
 * The `harder` flag indicates which pole makes agent design more difficult.
 *
 * @returns Seven EnvironmentDimension entries.
 * @complexity O(1)
 */
export function getEnvironmentDimensions(): ReadonlyArray<EnvironmentDimension> {
  return [
    {
      key: 'observability',
      label: 'Observability',
      description:
        'Can the agent access the complete state of the environment at each step? ' +
        'Fully observable environments eliminate the need for internal state. ' +
        'Partially observable ones require memory or estimation.',
      options: [
        { value: 'fully', label: 'Fully Observable', harder: false },
        { value: 'partially', label: 'Partially Observable', harder: true },
        { value: 'unobservable', label: 'Unobservable', harder: true },
      ],
    },
    {
      key: 'agentCount',
      label: 'Agent Count',
      description:
        'Is the environment populated by a single agent, or must the agent account for ' +
        'other agents whose behavior depends on its own? Multiagent environments may be ' +
        'competitive, cooperative, or both.',
      options: [
        { value: 'single', label: 'Single-Agent', harder: false },
        { value: 'multi', label: 'Multiagent', harder: true },
      ],
    },
    {
      key: 'determinism',
      label: 'Determinism',
      description:
        'Is the next state completely determined by the current state and the agent\'s action? ' +
        'Stochastic environments require the agent to reason about probabilities of outcomes.',
      options: [
        { value: 'deterministic', label: 'Deterministic', harder: false },
        { value: 'stochastic', label: 'Stochastic', harder: true },
      ],
    },
    {
      key: 'episodicity',
      label: 'Episode Structure',
      description:
        'In episodic environments each action is independent of past and future actions. ' +
        'Sequential environments require the agent to consider long-term consequences of actions.',
      options: [
        { value: 'episodic', label: 'Episodic', harder: false },
        { value: 'sequential', label: 'Sequential', harder: true },
      ],
    },
    {
      key: 'dynamics',
      label: 'Dynamics',
      description:
        'Does the environment change while the agent is deliberating? ' +
        'Dynamic environments place time pressure on the agent. ' +
        'Semidynamic environments change the performance score, not the environment itself.',
      options: [
        { value: 'static', label: 'Static', harder: false },
        { value: 'semidynamic', label: 'Semidynamic', harder: true },
        { value: 'dynamic', label: 'Dynamic', harder: true },
      ],
    },
    {
      key: 'continuity',
      label: 'State / Action Space',
      description:
        'Are the states and actions discrete (finite, enumerable) or continuous ' +
        '(real-valued, infinite)? Continuous environments require different algorithms ' +
        'than discrete ones.',
      options: [
        { value: 'discrete', label: 'Discrete', harder: false },
        { value: 'continuous', label: 'Continuous', harder: true },
      ],
    },
    {
      key: 'knowledge',
      label: 'Prior Knowledge',
      description:
        'Does the agent know the "laws of physics" of the environment—the outcomes of all ' +
        'actions? If the environment is unknown, the agent must explore and learn how it works ' +
        'before it can behave rationally.',
      options: [
        { value: 'known', label: 'Known', harder: false },
        { value: 'unknown', label: 'Unknown', harder: true },
      ],
    },
  ];
}

/**
 * Returns environment examples from AIMA Figure 2.6, plus original examples.
 *
 * Properties are taken directly from the book's table (p. 64).
 * The `isOriginal` flag marks examples invented for this visualization.
 *
 * @returns Twelve EnvironmentExample entries (10 from book + 2 original).
 * @complexity O(1)
 */
export function getEnvironmentExamples(): ReadonlyArray<EnvironmentExample> {
  return [
    {
      id: 'crossword',
      name: 'Crossword Puzzle',
      description: 'Solver fills in a blank crossword grid with no time limit.',
      isOriginal: false,
      properties: {
        observability: 'fully',
        agentCount: 'single',
        determinism: 'deterministic',
        episodicity: 'sequential',
        dynamics: 'static',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    {
      id: 'chess',
      name: 'Chess (with clock)',
      description: 'Two players alternate moves on a fully visible board; a clock penalises slow play.',
      isOriginal: false,
      properties: {
        observability: 'fully',
        agentCount: 'multi',
        determinism: 'deterministic',
        episodicity: 'sequential',
        dynamics: 'semidynamic',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    {
      id: 'poker',
      name: 'Poker',
      description: 'Card game with hidden opponent hands and chance-driven card draws.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'multi',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'static',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    {
      id: 'backgammon',
      name: 'Backgammon',
      description: 'Board game where dice introduce randomness into each move.',
      isOriginal: false,
      properties: {
        observability: 'fully',
        agentCount: 'multi',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'static',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    {
      id: 'taxi',
      name: 'Taxi Driving',
      description: 'Autonomous vehicle navigating real streets with traffic and pedestrians.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'multi',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'dynamic',
        continuity: 'continuous',
        knowledge: 'known',
      },
    },
    {
      id: 'medical',
      name: 'Medical Diagnosis',
      description: 'Diagnostic system selecting tests and treatments for patients.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'single',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'dynamic',
        continuity: 'continuous',
        knowledge: 'known',
      },
    },
    {
      id: 'image-analysis',
      name: 'Image Analysis',
      description: 'Computer-vision system categorising objects in satellite or video feeds.',
      isOriginal: false,
      properties: {
        observability: 'fully',
        agentCount: 'single',
        determinism: 'deterministic',
        episodicity: 'episodic',
        dynamics: 'semidynamic',
        continuity: 'continuous',
        knowledge: 'known',
      },
    },
    {
      id: 'part-picking',
      name: 'Part-Picking Robot',
      description: 'Robotic arm placing parts from a conveyor belt into bins.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'single',
        determinism: 'stochastic',
        episodicity: 'episodic',
        dynamics: 'dynamic',
        continuity: 'continuous',
        knowledge: 'known',
      },
    },
    {
      id: 'refinery',
      name: 'Refinery Controller',
      description: 'Industrial controller optimising purity, yield, and safety in a chemical plant.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'single',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'dynamic',
        continuity: 'continuous',
        knowledge: 'known',
      },
    },
    {
      id: 'english-tutor',
      name: 'English Language Tutor',
      description: 'Adaptive tutoring system delivering exercises and feedback to students.',
      isOriginal: false,
      properties: {
        observability: 'partially',
        agentCount: 'multi',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'dynamic',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    // --- Original examples (not from the book) ---
    {
      id: 'spam-filter',
      name: 'Email Spam Filter',
      description: 'Classifier deciding whether each incoming email is spam or legitimate.',
      isOriginal: true,
      properties: {
        observability: 'fully',
        agentCount: 'single',
        determinism: 'stochastic',
        episodicity: 'episodic',
        dynamics: 'static',
        continuity: 'discrete',
        knowledge: 'known',
      },
    },
    {
      id: 'stock-trader',
      name: 'Automated Stock Trader',
      description: 'Trading agent placing buy/sell orders in a financial market.',
      isOriginal: true,
      properties: {
        observability: 'partially',
        agentCount: 'multi',
        determinism: 'stochastic',
        episodicity: 'sequential',
        dynamics: 'dynamic',
        continuity: 'continuous',
        knowledge: 'unknown',
      },
    },
  ];
}

/**
 * Counts how many "harder" properties an environment has, based on the dimension axes.
 *
 * @param props - The environment properties to evaluate.
 * @returns Number of dimensions set to their harder value (0–7).
 * @complexity O(1)
 */
export function countHarderProperties(props: EnvironmentProperties): number {
  const dims = getEnvironmentDimensions();
  return dims.reduce((count, dim) => {
    const val = props[dim.key] as string;
    const match = dim.options.find((o) => o.value === val);
    return match?.harder === true ? count + 1 : count;
  }, 0);
}

/**
 * Returns a recommended agent architecture based on environment properties.
 *
 * Logic follows the AIMA text (§2.3–2.4):
 * - Unknown + sequential → Learning agent
 * - Partially observable + sequential → Model-based (or utility-based if stochastic)
 * - Goal involves multiple conflicting objectives → Utility-based
 * - Simple, fully observable → Simple reflex
 *
 * @param props - The environment properties.
 * @returns A short architectural recommendation string.
 * @complexity O(1)
 */
export function recommendArchitecture(props: EnvironmentProperties): string {
  if (props.knowledge === 'unknown') {
    return 'Learning Agent — must discover environment dynamics before it can plan.';
  }
  if (props.observability !== 'fully') {
    if (props.determinism === 'stochastic' && props.episodicity === 'sequential') {
      return 'Utility-Based Agent — uncertainty and sequential decisions demand expected-utility maximisation.';
    }
    return 'Model-Based Reflex Agent — partial observability requires an internal world model.';
  }
  if (props.episodicity === 'sequential') {
    return 'Goal-Based Agent — sequential decisions require planning ahead to achieve goals.';
  }
  return 'Simple Reflex Agent — fully observable, episodic environment suits direct condition–action rules.';
}

// ---------------------------------------------------------------------------
// Table-Driven Agent (§2.4.1, Figure 2.7)
// ---------------------------------------------------------------------------

export interface TableDrivenStep {
  readonly percept: string;
  readonly perceptSequence: ReadonlyArray<string>;
  readonly action: string;
  readonly found: boolean;
  readonly tableKey: string;
}

/**
 * Simulates the TABLE-DRIVEN-AGENT from AIMA Figure 2.7.
 *
 * The agent appends each new percept to its history and looks up the full
 * sequence in a lookup table to determine the action. This is the most
 * general (and most impractical) agent design.
 *
 * @param percepts - Sequence of percepts to feed into the agent.
 * @param table - Map from percept-sequence key → action (sequences joined by '|').
 * @returns Steps, one per percept. `found` is false when the sequence is not in the table.
 * @complexity O(n) where n = percepts.length
 */
export function simulateTableDrivenAgent(
  percepts: ReadonlyArray<string>,
  table: ReadonlyMap<string, string>,
): ReadonlyArray<TableDrivenStep> {
  const history: string[] = [];
  const steps: TableDrivenStep[] = [];

  for (const percept of percepts) {
    history.push(percept);
    const key = history.join('|');
    const found = table.has(key);
    const action = found ? (table.get(key) as string) : 'NoOp';
    steps.push({ percept, perceptSequence: [...history], action, found, tableKey: key });
  }

  return steps;
}

/**
 * Builds the table for the simple 2-room vacuum world (for demo purposes).
 *
 * Entries follow the pattern in AIMA Figure 2.3:
 * - If current room is dirty → Suck
 * - If current room is clean → move to other room
 *
 * Only sequences up to length 3 are included (illustrating the combinatorial explosion).
 *
 * @returns A Map<sequenceKey, action> for the vacuum world.
 * @complexity O(1)
 */
export function buildVacuumTable(): ReadonlyMap<string, string> {
  const table = new Map<string, string>([
    ['A,Clean', 'Right'],
    ['A,Dirty', 'Suck'],
    ['B,Clean', 'Left'],
    ['B,Dirty', 'Suck'],
    ['A,Clean|A,Clean', 'Right'],
    ['A,Clean|A,Dirty', 'Suck'],
    ['A,Dirty|A,Clean', 'Right'],
    ['A,Dirty|A,Dirty', 'Suck'],
    ['B,Clean|B,Clean', 'Left'],
    ['B,Clean|B,Dirty', 'Suck'],
    ['B,Dirty|B,Clean', 'Left'],
    ['B,Dirty|B,Dirty', 'Suck'],
    ['A,Clean|A,Clean|A,Clean', 'Right'],
    ['A,Clean|A,Clean|A,Dirty', 'Suck'],
    ['A,Clean|A,Dirty|A,Clean', 'Right'],
    ['A,Dirty|A,Clean|A,Clean', 'Right'],
  ]);
  return table;
}

// ---------------------------------------------------------------------------
// Model-Based Vacuum Agent (§2.4.3, Figure 2.12)
// ---------------------------------------------------------------------------

export type BeliefStatus = 'clean' | 'dirty' | 'unknown';

export interface ModelBasedBelief {
  readonly leftBelief: BeliefStatus;
  readonly rightBelief: BeliefStatus;
  readonly lastAction: VacuumAction | null;
}

export interface ModelBasedStep {
  readonly worldState: VacuumWorldState;
  readonly belief: ModelBasedBelief;
  readonly percept: string;
  readonly action: VacuumAction;
  readonly description: string;
  readonly score: number;
}

/**
 * Simulates the model-based reflex vacuum agent from AIMA §2.4.3.
 *
 * Unlike the simple reflex agent, this agent maintains an internal model of
 * both rooms' cleanliness status. It uses the transition model (Suck → clean,
 * Move → location changes) to update its belief state after each action.
 *
 * When both rooms are believed clean, the agent terminates rather than
 * oscillating, which is the key advantage over the simple reflex agent.
 *
 * @param initial - The actual starting world state (known to simulator, not to agent).
 * @returns Steps for playback; includes both the agent's belief and actual world state.
 * @complexity O(n) where n ≤ 20
 */
export function simulateModelBasedVacuumAgent(
  initial: VacuumWorldState,
): ReadonlyArray<ModelBasedStep> {
  const MAX_STEPS = 20;
  const steps: ModelBasedStep[] = [];

  // Actual world state
  let position = initial.agentPosition;
  let leftRoom = initial.leftRoom;
  let rightRoom = initial.rightRoom;

  // Agent's internal belief (initially unknown for rooms not yet visited)
  let leftBelief: BeliefStatus = 'unknown';
  let rightBelief: BeliefStatus = 'unknown';
  let lastAction: VacuumAction | null = null;
  let score = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    // --- SENSOR MODEL: agent perceives current location and dirt ---
    const currentDirty = position === 'Left' ? leftRoom === 'dirty' : rightRoom === 'dirty';
    const percept = `[${position}, ${currentDirty ? 'Dirty' : 'Clean'}]`;

    // --- UPDATE-STATE: update belief using percept + transition model ---
    if (position === 'Left') {
      leftBelief = currentDirty ? 'dirty' : 'clean';
    } else {
      rightBelief = currentDirty ? 'dirty' : 'clean';
    }

    // --- RULE-MATCH: select action based on belief state ---
    let action: VacuumAction;
    let description: string;

    const otherBelief = position === 'Left' ? rightBelief : leftBelief;

    if (currentDirty) {
      action = 'Suck';
      description = `Percept: ${percept}. Current room is dirty — Suck.`;
    } else if (otherBelief !== 'clean') {
      // Other room is dirty or unknown — move there to check / clean
      action = position === 'Left' ? 'MoveRight' : 'MoveLeft';
      description =
        `Percept: ${percept}. Current room is clean; ` +
        `${position === 'Left' ? 'Right' : 'Left'} room is ${otherBelief} — move to check/clean it.`;
    } else {
      // Both rooms believed clean
      action = 'NoOp';
      description = `Percept: ${percept}. Both rooms believed clean — no action needed.`;
    }

    // Score: +1 per clean room per step
    const cleanCount = (leftRoom === 'clean' ? 1 : 0) + (rightRoom === 'clean' ? 1 : 0);
    const movePenalty = action === 'MoveLeft' || action === 'MoveRight' ? 1 : 0;
    score += cleanCount - movePenalty;

    steps.push({
      worldState: { agentPosition: position, leftRoom, rightRoom },
      belief: { leftBelief, rightBelief, lastAction },
      percept,
      action,
      description,
      score,
    });

    if (action === 'NoOp') break;

    // --- TRANSITION MODEL: apply action to actual world ---
    lastAction = action;
    if (action === 'Suck') {
      if (position === 'Left') {
        leftRoom = 'clean';
        leftBelief = 'clean'; // agent knows the result of sucking
      } else {
        rightRoom = 'clean';
        rightBelief = 'clean';
      }
    } else if (action === 'MoveLeft') {
      position = 'Left';
    } else {
      // action === 'MoveRight'
      position = 'Right';
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Rationality — Performance Measure Simulation (§2.2)
// ---------------------------------------------------------------------------

export type ScoringRule = 'clean-squares' | 'dirt-cleaned' | 'actions-minimised';

export interface RationalityStep {
  readonly state: VacuumWorldState;
  readonly action: VacuumAction;
  readonly description: string;
  readonly score: number;
  readonly scoringExplain: string;
}

/**
 * Simulates the vacuum agent under different performance measures, illustrating
 * how the choice of performance measure affects (and can distort) rational behaviour.
 *
 * Three scoring rules from AIMA §2.2.1:
 * - 'clean-squares': +1 per clean room per step (the "right" measure)
 * - 'dirt-cleaned':  +10 per Suck action (rewards maximising cleaning events,
 *   leading the rational agent to suck-dirty-suck infinitely—the pathological case)
 * - 'actions-minimised': -1 per any action (favours doing nothing)
 *
 * @param initial - Starting world state.
 * @param scoring - Which performance measure to apply.
 * @returns Steps (≤20) showing the agent's behaviour under the chosen measure.
 * @complexity O(n) where n ≤ 20
 */
export function simulateWithScoringRule(
  initial: VacuumWorldState,
  scoring: ScoringRule,
): ReadonlyArray<RationalityStep> {
  const MAX_STEPS = 20;
  const steps: RationalityStep[] = [];

  let position = initial.agentPosition;
  let leftRoom = initial.leftRoom;
  let rightRoom = initial.rightRoom;
  let score = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    const currentDirty = position === 'Left' ? leftRoom === 'dirty' : rightRoom === 'dirty';

    // Agent selects action based on scoring rule (rational agent maximises its measure)
    let action: VacuumAction;
    let description: string;

    if (scoring === 'dirt-cleaned') {
      // Under this measure, the agent gets +10 for every Suck.
      // Rational behaviour: always suck, then immediately re-dirty, then suck again.
      // We simulate a "greedy" version that sucks if possible, otherwise moves.
      if (currentDirty) {
        action = 'Suck';
        description = `Room is dirty — Suck (+10 pts).`;
      } else {
        // Re-dirty the room to suck again (pathological rational behaviour)
        action = position === 'Left' ? 'MoveRight' : 'MoveLeft';
        description = `Room is clean — move to ${position === 'Left' ? 'Right' : 'Left'} to find more dirt.`;
      }
    } else if (scoring === 'actions-minimised') {
      // Under this measure, every action costs -1. Rational agent does nothing.
      action = 'NoOp';
      description = `Actions cost −1 each — doing nothing maximises score.`;
    } else {
      // 'clean-squares': default rational vacuum behaviour
      if (currentDirty) {
        action = 'Suck';
        description = `Current room is dirty — Suck.`;
      } else if (leftRoom === 'dirty' || rightRoom === 'dirty') {
        action = position === 'Left' ? 'MoveRight' : 'MoveLeft';
        description = `Current room clean — move toward dirty room.`;
      } else {
        action = 'NoOp';
        description = `Both rooms clean — no action needed.`;
      }
    }

    // Compute step score according to the chosen rule
    let stepScore: number;
    let scoringExplain: string;

    if (scoring === 'clean-squares') {
      const cleanCount = (leftRoom === 'clean' ? 1 : 0) + (rightRoom === 'clean' ? 1 : 0);
      stepScore = cleanCount;
      scoringExplain = `+${cleanCount} (${cleanCount} clean room${cleanCount !== 1 ? 's' : ''})`;
    } else if (scoring === 'dirt-cleaned') {
      stepScore = action === 'Suck' ? 10 : 0;
      scoringExplain = action === 'Suck' ? '+10 (Suck action)' : '+0 (no Suck this step)';
    } else {
      // 'actions-minimised': agent always returns NoOp, so score is always 0
      stepScore = 0;
      scoringExplain = '+0 (no action taken)';
    }

    score += stepScore;

    steps.push({
      state: { agentPosition: position, leftRoom, rightRoom },
      action,
      description,
      score,
      scoringExplain,
    });

    if (action === 'NoOp') break;

    // Apply action to world
    if (action === 'Suck') {
      if (position === 'Left') leftRoom = 'clean';
      else rightRoom = 'clean';
    } else if (action === 'MoveLeft') {
      position = 'Left';
    } else {
      position = 'Right';
    }

    // Under 'dirt-cleaned', after cleaning a room the agent immediately re-dirties it
    // to illustrate the pathological behaviour (cap at 8 steps so the demo is clear)
    if (scoring === 'dirt-cleaned' && i >= 7) break;
  }

  return steps;
}
