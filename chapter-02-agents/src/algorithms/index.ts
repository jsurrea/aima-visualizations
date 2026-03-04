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
    } else if (action === 'MoveRight') {
      position = 'Right';
    }
  }

  return steps;
}
