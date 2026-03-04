/**
 * Chapter 11 — Automated Planning
 *
 * Pure algorithm implementations:
 *   - PDDL state/action manipulation (§11.1)
 *   - Forward state-space search / progression (§11.2.1)
 *   - Backward search / regression (§11.2.2)
 *   - Ignore-preconditions heuristic (§11.3)
 *   - Ignore-delete-lists heuristic (§11.3)
 *   - Hierarchical Task Network search (§11.4)
 *   - Critical Path Method for scheduling (§11.6)
 *
 * @module algorithms
 */

// ─── §11.1  PDDL Types ────────────────────────────────────────────────────────

/** A ground atomic fluent, e.g. "On(A,B)" or "At(P1,SFO)". */
export type Fluent = string;

/** A ground state is a set of fluents that are currently true. */
export type PlanningState = ReadonlySet<Fluent>;

/**
 * A ground action (instantiated from a schema) with explicit add/delete lists.
 * Corresponds to the RESULT(s, a) formula (Eq. 11.1).
 */
export interface PlanningAction {
  readonly name: string;
  /** Fluents that must be true for this action to be applicable. */
  readonly preconditions: ReadonlyArray<Fluent>;
  /** Fluents that must be false for this action to be applicable. */
  readonly negPreconditions: ReadonlyArray<Fluent>;
  /** Fluents to add to the state (ADD list). */
  readonly addList: ReadonlyArray<Fluent>;
  /** Fluents to remove from the state (DELETE list). */
  readonly deleteList: ReadonlyArray<Fluent>;
}

/** A classical planning problem. */
export interface PlanningProblem {
  readonly initialState: ReadonlyArray<Fluent>;
  /** Positive fluents that must hold in the goal state. */
  readonly goalFluents: ReadonlyArray<Fluent>;
  /** Negative fluents that must hold in the goal state. */
  readonly goalNegFluents: ReadonlyArray<Fluent>;
  readonly actions: ReadonlyArray<PlanningAction>;
}

// ─── §11.1  State Transition ──────────────────────────────────────────────────

/**
 * Checks whether a ground action is applicable in state s.
 *
 * An action a is applicable when every positive precondition is in s
 * and every negative precondition is absent from s.
 *
 * @param state   - Current planning state (set of true fluents).
 * @param action  - Ground action to test.
 * @returns `true` when the action can be executed.
 * @complexity O(|preconditions|)
 */
export function isApplicable(
  state: PlanningState,
  action: PlanningAction,
): boolean {
  for (const p of action.preconditions) {
    if (!state.has(p)) return false;
  }
  for (const np of action.negPreconditions) {
    if (state.has(np)) return false;
  }
  return true;
}

/**
 * Applies a ground action to a state, returning the successor state.
 * Implements RESULT(s, a) = (s − DEL(a)) ∪ ADD(a)  (Equation 11.1).
 *
 * Precondition: action must be applicable in state (not enforced here).
 *
 * @param state   - Current planning state.
 * @param action  - Ground action to apply.
 * @returns New state with delete-list fluents removed and add-list fluents added.
 * @complexity O(|s| + |DEL| + |ADD|)
 */
export function applyAction(
  state: PlanningState,
  action: PlanningAction,
): PlanningState {
  const next = new Set<Fluent>(state);
  for (const d of action.deleteList) next.delete(d);
  for (const a of action.addList) next.add(a);
  return next;
}

/**
 * Tests whether a state satisfies a goal description.
 *
 * @param state          - State to test.
 * @param goalFluents    - Positive fluents that must hold.
 * @param goalNegFluents - Fluents that must be absent.
 * @returns `true` when the goal is satisfied.
 * @complexity O(|goal|)
 */
export function satisfiesGoal(
  state: PlanningState,
  goalFluents: ReadonlyArray<Fluent>,
  goalNegFluents: ReadonlyArray<Fluent>,
): boolean {
  for (const g of goalFluents) {
    if (!state.has(g)) return false;
  }
  for (const ng of goalNegFluents) {
    if (state.has(ng)) return false;
  }
  return true;
}

// ─── §11.2  Forward Search ────────────────────────────────────────────────────

/** One step emitted by the forward BFS planner. */
export interface ForwardSearchStep {
  /** Step index (0 = initial). */
  readonly stepIndex: number;
  /** Fluents true in the current state. */
  readonly state: ReadonlyArray<Fluent>;
  /** Action that produced this state (null for the initial state). */
  readonly appliedAction: string | null;
  /** Actions applicable in the current state. */
  readonly applicableActions: ReadonlyArray<string>;
  /** Number of nodes currently in the frontier queue. */
  readonly frontierSize: number;
  /** Number of states already explored. */
  readonly exploredCount: number;
  /** Ignore-preconditions heuristic value for this state. */
  readonly heuristic: number;
  /** True when this state satisfies the goal. */
  readonly isGoal: boolean;
  /** Human-readable description of this step. */
  readonly action: string;
  /** Plan sequence leading to this state. */
  readonly plan: ReadonlyArray<string>;
}

/** Outcome of forward search. */
export interface ForwardSearchResult {
  readonly steps: ReadonlyArray<ForwardSearchStep>;
  readonly found: boolean;
  readonly plan: ReadonlyArray<string>;
}

/**
 * Breadth-first forward state-space search (progression search, §11.2.1).
 *
 * Returns all BFS steps for replay. The search is bounded to avoid infinite
 * loops (maxSteps defaults to 500).
 *
 * @param problem  - Planning problem to solve.
 * @param maxSteps - Upper bound on expansion steps (default 500).
 * @returns All BFS steps and, if found, the solution plan.
 * @complexity O(b^d) where b = branching factor, d = solution depth.
 */
export function forwardSearch(
  problem: PlanningProblem,
  maxSteps = 500,
): ForwardSearchResult {
  const steps: ForwardSearchStep[] = [];
  const initialState = new Set<Fluent>(problem.initialState);

  // BFS frontier: each entry is [state, plan-so-far]
  type Node = { state: Set<Fluent>; plan: string[] };
  const frontier: Node[] = [{ state: initialState, plan: [] }];
  const exploredKeys = new Set<string>();

  const stateKey = (s: Set<Fluent>) =>
    [...s].sort().join(',');

  let stepIndex = 0;

  while (frontier.length > 0 && stepIndex < maxSteps) {
    const node = frontier.shift()!;
    const { state, plan } = node;
    const key = stateKey(state);

    if (exploredKeys.has(key)) continue;
    exploredKeys.add(key);

    const applicable = problem.actions.filter(a => isApplicable(state, a));
    const isGoal = satisfiesGoal(
      state,
      problem.goalFluents,
      problem.goalNegFluents,
    );
    const h = ignorePreconditionsHeuristic(state, problem.goalFluents);

    steps.push({
      stepIndex,
      state: [...state].sort(),
      appliedAction: plan.length > 0 ? plan[plan.length - 1]! : null,
      applicableActions: applicable.map(a => a.name),
      frontierSize: frontier.length,
      exploredCount: exploredKeys.size,
      heuristic: h,
      isGoal,
      action:
        plan.length === 0
          ? 'Start: initial state'
          : `Applied ${plan[plan.length - 1]!}`,
      plan: [...plan],
    });

    if (isGoal) {
      return { steps, found: true, plan };
    }

    for (const a of applicable) {
      const nextState = applyAction(state, a);
      const nextKey = stateKey(nextState);
      if (!exploredKeys.has(nextKey)) {
        frontier.push({ state: new Set(nextState), plan: [...plan, a.name] });
      }
    }

    stepIndex++;
  }

  return { steps, found: false, plan: [] };
}

// ─── §11.2  Backward Search ───────────────────────────────────────────────────

/** One step emitted by the backward (regression) search. */
export interface BackwardSearchStep {
  readonly stepIndex: number;
  /** Current goal description (positive + negative fluents to achieve). */
  readonly goalPos: ReadonlyArray<Fluent>;
  readonly goalNeg: ReadonlyArray<Fluent>;
  /** Relevant action chosen for regression. */
  readonly chosenAction: string | null;
  /** Predecessor goal description (after regression). */
  readonly regressedGoalPos: ReadonlyArray<Fluent>;
  readonly regressedGoalNeg: ReadonlyArray<Fluent>;
  /** Number of nodes currently in the frontier. */
  readonly frontierSize: number;
  readonly exploredCount: number;
  readonly isInitial: boolean;
  readonly action: string;
  /** Plan sequence (actions in forward order). */
  readonly plan: ReadonlyArray<string>;
}

/** Outcome of backward search. */
export interface BackwardSearchResult {
  readonly steps: ReadonlyArray<BackwardSearchStep>;
  readonly found: boolean;
  readonly plan: ReadonlyArray<string>;
}

/**
 * Determines whether a ground action is relevant to a goal description.
 *
 * Action a is relevant to goal g if:
 *   1. Some effect of a achieves a goal literal:
 *      - ADD(a) ∩ goalPos ≠ ∅  (adds a positive goal fluent), OR
 *      - DEL(a) ∩ goalNeg ≠ ∅  (deletes a negative-goal fluent, making ¬g true)
 *   2. No effect of a negates a goal literal:
 *      - DEL(a) ∩ goalPos = ∅  (does not undo a positive goal), AND
 *      - ADD(a) ∩ goalNeg = ∅  (does not add a negative-goal fluent)
 *
 * @complexity O(|effects| × |goal|)
 */
export function isRelevant(
  action: PlanningAction,
  goalPos: ReadonlyArray<Fluent>,
  goalNeg: ReadonlyArray<Fluent>,
): boolean {
  // Must achieve at least one goal literal
  const achievesSomePos = action.addList.some(f => goalPos.includes(f));
  const achievesSomeNeg = action.deleteList.some(f => goalNeg.includes(f));
  if (!achievesSomePos && !achievesSomeNeg) return false;
  // Must not delete a positive goal fluent
  if (action.deleteList.some(f => goalPos.includes(f))) return false;
  // Must not add a negative goal fluent
  if (action.addList.some(f => goalNeg.includes(f))) return false;
  return true;
}

/**
 * Regresses a goal description through an action (§11.2.2).
 *
 * POS(g') = (POS(g) − ADD(a)) ∪ POS(PRECOND(a))
 * NEG(g') = (NEG(g) − DEL(a)) ∪ NEG(PRECOND(a))
 *
 * @param goalPos      - Positive fluents in the current goal.
 * @param goalNeg      - Negative fluents in the current goal.
 * @param action       - Action to regress over.
 * @returns The regressed predecessor goal.
 * @complexity O(|goal| + |action|)
 */
export function regressGoal(
  goalPos: ReadonlyArray<Fluent>,
  goalNeg: ReadonlyArray<Fluent>,
  action: PlanningAction,
): { pos: ReadonlyArray<Fluent>; neg: ReadonlyArray<Fluent> } {
  const posSet = new Set<Fluent>(goalPos);
  const negSet = new Set<Fluent>(goalNeg);

  // Remove fluents established by action (no longer needed as goal)
  for (const f of action.addList) posSet.delete(f);
  for (const f of action.deleteList) negSet.delete(f);

  // Add preconditions of the action
  for (const f of action.preconditions) posSet.add(f);
  for (const f of action.negPreconditions) negSet.add(f);

  return { pos: [...posSet].sort(), neg: [...negSet].sort() };
}

/**
 * Backward state-space search (regression search, §11.2.2).
 * Bounded to maxSteps to avoid infinite loops.
 *
 * @param problem  - Planning problem.
 * @param maxSteps - Upper bound on search steps (default 200).
 * @returns All regression steps and, if found, the solution plan.
 * @complexity O(b^d)
 */
export function backwardSearch(
  problem: PlanningProblem,
  maxSteps = 200,
): BackwardSearchResult {
  const steps: BackwardSearchResult['steps'] extends ReadonlyArray<infer T>
    ? T[]
    : never = [] as BackwardSearchStep[];

  type Node = {
    goalPos: Fluent[];
    goalNeg: Fluent[];
    plan: string[]; // forward action sequence so far (in reverse)
  };

  const goalKey = (pos: Fluent[], neg: Fluent[]) =>
    pos.sort().join(',') + '|' + neg.sort().join(',');

  const frontier: Node[] = [
    {
      goalPos: [...problem.goalFluents].sort(),
      goalNeg: [...problem.goalNegFluents].sort(),
      plan: [],
    },
  ];
  const exploredKeys = new Set<string>();
  let stepIndex = 0;

  const initialState = new Set<Fluent>(problem.initialState);

  const isInitialGoal = (pos: Fluent[], neg: Fluent[]) => {
    for (const f of pos) {
      if (!initialState.has(f)) return false;
    }
    for (const f of neg) {
      if (initialState.has(f)) return false;
    }
    return true;
  };

  while (frontier.length > 0 && stepIndex < maxSteps) {
    const node = frontier.shift()!;
    const { goalPos, goalNeg, plan } = node;
    const key = goalKey([...goalPos], [...goalNeg]);

    if (exploredKeys.has(key)) continue;
    exploredKeys.add(key);

    const isInit = isInitialGoal(goalPos, goalNeg);

    steps.push({
      stepIndex,
      goalPos: [...goalPos].sort(),
      goalNeg: [...goalNeg].sort(),
      chosenAction: plan.length > 0 ? plan[0]! : null,
      regressedGoalPos: [...goalPos].sort(),
      regressedGoalNeg: [...goalNeg].sort(),
      frontierSize: frontier.length,
      exploredCount: exploredKeys.size,
      isInitial: isInit,
      action:
        plan.length === 0
          ? 'Start: goal description'
          : `Regressed through ${plan[0]!}`,
      plan: [...plan],
    });

    if (isInit) {
      return { steps, found: true, plan: [...plan] };
    }

    // Find relevant actions and add regressed goals to frontier
    for (const a of problem.actions) {
      if (!isRelevant(a, goalPos, goalNeg)) continue;
      const { pos, neg } = regressGoal(goalPos, goalNeg, a);
      const nextKey = goalKey([...pos], [...neg]);
      if (!exploredKeys.has(nextKey)) {
        frontier.push({
          goalPos: [...pos].sort(),
          goalNeg: [...neg].sort(),
          plan: [a.name, ...plan],
        });
      }
    }

    stepIndex++;
  }

  return { steps, found: false, plan: [] };
}

// ─── §11.3  Heuristics ────────────────────────────────────────────────────────

/**
 * Ignore-preconditions heuristic (§11.3).
 *
 * Counts the number of goal fluents not yet satisfied. Each unsatisfied goal
 * fluent can (optimistically) be achieved in one action.
 *
 * @param state       - Current state.
 * @param goalFluents - Positive fluents in the goal.
 * @returns Estimated cost to the goal.
 * @complexity O(|goal|)
 */
export function ignorePreconditionsHeuristic(
  state: PlanningState,
  goalFluents: ReadonlyArray<Fluent>,
): number {
  let count = 0;
  for (const g of goalFluents) {
    if (!state.has(g)) count++;
  }
  return count;
}

/**
 * Ignore-delete-lists heuristic (§11.3).
 *
 * Creates a relaxed problem by removing all delete-list effects, then
 * greedily counts actions needed to achieve all goal fluents.
 *
 * @param state       - Current state.
 * @param goalFluents - Positive fluents in the goal.
 * @param actions     - Available ground actions.
 * @returns Greedy estimate of plan length in the relaxed problem.
 * @complexity O(|goal| × |actions| × |effects|) per iteration
 */
export function ignoreDeleteListsHeuristic(
  state: PlanningState,
  goalFluents: ReadonlyArray<Fluent>,
  actions: ReadonlyArray<PlanningAction>,
): number {
  // Work with a mutable relaxed state (no delete lists)
  const relaxedState = new Set<Fluent>(state);
  const unsatisfied = new Set<Fluent>(
    goalFluents.filter(g => !relaxedState.has(g)),
  );

  let steps = 0;
  const maxIter = goalFluents.length + actions.length + 2;

  while (unsatisfied.size > 0 && steps < maxIter) {
    // Find the action that satisfies the most unsatisfied goals
    let bestAction: PlanningAction | null = null;
    let bestCount = 0;

    for (const a of actions) {
      // In relaxed problem, every action is applicable (ignore preconditions)
      let count = 0;
      for (const f of a.addList) {
        if (unsatisfied.has(f)) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestAction = a;
      }
    }

    if (bestAction === null || bestCount === 0) break;

    for (const f of bestAction.addList) {
      relaxedState.add(f);
      unsatisfied.delete(f);
    }
    steps++;
  }

  return unsatisfied.size === 0 ? steps : goalFluents.length + 1;
}

// ─── §11.4  HTN Planning ──────────────────────────────────────────────────────

/** One possible refinement of a high-level action (HLA). */
export interface HLARefinement {
  /** Ordered list of sub-actions (may be HLA names or primitive action names). */
  readonly steps: ReadonlyArray<string>;
  /** Optional preconditions that must hold for this refinement to be chosen. */
  readonly preconditions?: ReadonlyArray<Fluent>;
}

/** Definition of a High-Level Action with its possible refinements. */
export interface HLADefinition {
  readonly name: string;
  readonly refinements: ReadonlyArray<HLARefinement>;
}

/** One step emitted by the HTN hierarchical search. */
export interface HTNSearchStep {
  readonly stepIndex: number;
  /** Current plan as a sequence of action names (may include HLAs). */
  readonly plan: ReadonlyArray<string>;
  /** The HLA that was chosen for expansion (null if plan is primitive). */
  readonly expandedHLA: string | null;
  /** The refinement steps that replaced the expanded HLA. */
  readonly refinementChosen: ReadonlyArray<string>;
  /** BFS depth (number of refinements applied so far). */
  readonly depth: number;
  /** Number of plans in the BFS frontier. */
  readonly frontierSize: number;
  /** Whether the current plan is fully primitive. */
  readonly isPrimitive: boolean;
  /** Whether the primitive plan achieves the goal. */
  readonly isGoal: boolean;
  readonly action: string;
}

/** Outcome of HTN hierarchical search. */
export interface HTNSearchResult {
  readonly steps: ReadonlyArray<HTNSearchStep>;
  readonly found: boolean;
  readonly plan: ReadonlyArray<string>;
}

/**
 * BFS Hierarchical search (HIERARCHICAL-SEARCH, Figure 11.8, §11.4.2).
 *
 * Starts with an initial plan (e.g. [Act]) and repeatedly refines HLAs
 * until a primitive plan achieving the goal is found.
 *
 * @param problem   - Planning problem (used to check goal).
 * @param hierarchy - Map of HLA name → HLADefinition.
 * @param initPlan  - Initial plan sequence (default ["Act"]).
 * @param maxSteps  - Maximum iterations (default 200).
 * @returns All steps and, if found, the solution primitive plan.
 * @complexity O(r^((d-1)/(k-1))) where r=refinements per HLA, k=steps per refinement
 */
export function htnSearch(
  problem: PlanningProblem,
  hierarchy: ReadonlyMap<string, HLADefinition>,
  initPlan: ReadonlyArray<string> = ['Act'],
  maxSteps = 200,
): HTNSearchResult {
  const steps: HTNSearchStep[] = [];

  type FrontierNode = { plan: string[]; depth: number };
  const frontier: FrontierNode[] = [
    { plan: [...initPlan], depth: 0 },
  ];

  // Evaluate a primitive plan (sequence of ground actions)
  const evalPrimitive = (plan: string[]): boolean => {
    let state = new Set<Fluent>(problem.initialState);
    for (const name of plan) {
      const a = problem.actions.find(x => x.name === name);
      if (!a || !isApplicable(state, a)) return false;
      state = new Set(applyAction(state, a));
    }
    return satisfiesGoal(state, problem.goalFluents, problem.goalNegFluents);
  };

  let stepIndex = 0;

  while (frontier.length > 0 && stepIndex < maxSteps) {
    const node = frontier.shift()!;
    const { plan, depth } = node;

    // Find the first HLA in the plan
    const hlaIndex = plan.findIndex(name => hierarchy.has(name));

    if (hlaIndex === -1) {
      // Plan is primitive — check if it achieves goal
      const isGoal = evalPrimitive(plan);
      steps.push({
        stepIndex,
        plan: [...plan],
        expandedHLA: null,
        refinementChosen: [],
        depth,
        frontierSize: frontier.length,
        isPrimitive: true,
        isGoal,
        action: isGoal
          ? `✓ Primitive plan [${plan.join(', ')}] achieves goal`
          : `Primitive plan [${plan.join(', ')}] does not achieve goal`,
      });
      if (isGoal) return { steps, found: true, plan };
    } else {
      const hlaName = plan[hlaIndex]!;
      const hla = hierarchy.get(hlaName)!;
      const prefix = plan.slice(0, hlaIndex);
      const suffix = plan.slice(hlaIndex + 1);

      // Record this expansion step
      steps.push({
        stepIndex,
        plan: [...plan],
        expandedHLA: hlaName,
        refinementChosen: [],
        depth,
        frontierSize: frontier.length,
        isPrimitive: false,
        isGoal: false,
        action: `Expanding HLA "${hlaName}" — ${hla.refinements.length} refinement(s) available`,
      });

      for (const ref of hla.refinements) {
        const newPlan = [...prefix, ...ref.steps, ...suffix];
        frontier.push({ plan: newPlan, depth: depth + 1 });
      }
    }

    stepIndex++;
  }

  return { steps, found: false, plan: [] };
}

// ─── §11.5  Sensorless Planning (Belief-State Update) ────────────────────────

/** A belief state in 1-CNF form (conjunction of known literals). */
export interface BeliefState {
  /** Fluents known to be true. */
  readonly trueFluents: ReadonlyArray<Fluent>;
  /** Fluents known to be false. */
  readonly falseFluents: ReadonlyArray<Fluent>;
}

/**
 * Updates a 1-CNF belief state through a sensorless action (§11.5.1).
 *
 * b' = (b − DEL(a)) ∪ ADD(a)
 *
 * Unknown fluents (neither in trueFluents nor in falseFluents) remain unknown.
 *
 * @param belief - Current belief state.
 * @param action - Action to apply.
 * @returns Updated belief state.
 * @complexity O(|belief| + |action|)
 */
export function updateBeliefState(
  belief: BeliefState,
  action: PlanningAction,
): BeliefState {
  const trueSet = new Set<Fluent>(belief.trueFluents);
  const falseSet = new Set<Fluent>(belief.falseFluents);

  for (const f of action.deleteList) {
    trueSet.delete(f);
    falseSet.add(f);
  }
  for (const f of action.addList) {
    falseSet.delete(f);
    trueSet.add(f);
  }

  return {
    trueFluents: [...trueSet].sort(),
    falseFluents: [...falseSet].sort(),
  };
}

/** One step in sensorless belief-state planning. */
export interface SensorlessStep {
  readonly stepIndex: number;
  readonly belief: BeliefState;
  readonly appliedAction: string | null;
  readonly goalSatisfied: boolean;
  readonly action: string;
}

/**
 * Executes a sequence of actions on a belief state (§11.5.1), recording each step.
 *
 * @param initial  - Initial belief state.
 * @param actions  - Sequence of ground actions to apply.
 * @param goalPos  - Positive goal fluents.
 * @param goalNeg  - Negative goal fluents.
 * @returns Recorded belief-state steps.
 * @complexity O(|actions| × |belief|)
 */
export function sensorlessExecution(
  initial: BeliefState,
  actions: ReadonlyArray<PlanningAction>,
  goalPos: ReadonlyArray<Fluent>,
  goalNeg: ReadonlyArray<Fluent>,
): ReadonlyArray<SensorlessStep> {
  const steps: SensorlessStep[] = [];
  let belief = initial;

  const checkGoal = (b: BeliefState) => {
    const trueSet = new Set(b.trueFluents);
    const falseSet = new Set(b.falseFluents);
    for (const f of goalPos) {
      if (!trueSet.has(f)) return false;
    }
    for (const f of goalNeg) {
      if (!falseSet.has(f)) return false;
    }
    return true;
  };

  steps.push({
    stepIndex: 0,
    belief,
    appliedAction: null,
    goalSatisfied: checkGoal(belief),
    action: 'Initial belief state',
  });

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    belief = updateBeliefState(belief, a);
    const goalSatisfied = checkGoal(belief);
    steps.push({
      stepIndex: i + 1,
      belief,
      appliedAction: a.name,
      goalSatisfied,
      action: `Applied: ${a.name}`,
    });
  }

  return steps;
}

// ─── §11.6  Critical Path Method ─────────────────────────────────────────────

/** An action in a job-shop scheduling problem. */
export interface ScheduleAction {
  readonly id: string;
  readonly duration: number;
  /** IDs of actions that must complete before this one starts. */
  readonly predecessors: ReadonlyArray<string>;
  /** Resource type used (display only). */
  readonly resource?: string;
}

/** CPM result for a single action. */
export interface CPMResult {
  readonly id: string;
  readonly duration: number;
  readonly es: number;  // Earliest Start
  readonly ef: number;  // Earliest Finish
  readonly ls: number;  // Latest Start
  readonly lf: number;  // Latest Finish
  readonly slack: number;
  readonly onCriticalPath: boolean;
  readonly resource?: string;
}

/**
 * Critical Path Method for scheduling (§11.6.2).
 *
 * Computes ES, EF, LS, LF, and slack for each action.
 * Actions on the critical path (slack = 0) are flagged.
 *
 * Formulas:
 *   ES(Start) = 0
 *   ES(B) = max_{A ≺ B} (ES(A) + Duration(A))
 *   LS(Finish) = ES(Finish)
 *   LS(A) = min_{B ≻ A} LS(B) − Duration(A)
 *
 * @param actions - All actions with duration and predecessor constraints.
 * @returns CPM results sorted in topological order.
 * @complexity O(N × b) where N = number of actions, b = max branching factor.
 */
export function criticalPathMethod(
  actions: ReadonlyArray<ScheduleAction>,
): ReadonlyArray<CPMResult> {
  if (actions.length === 0) return [];

  const byId = new Map<string, ScheduleAction>(
    actions.map(a => [a.id, a]),
  );

  // Build successor list and in-degree map
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const a of actions) {
    inDegree.set(a.id, 0);
    successors.set(a.id, []);
  }
  for (const a of actions) {
    for (const pred of a.predecessors) {
      inDegree.set(a.id, (inDegree.get(a.id)!) + 1);
      successors.get(pred)!.push(a.id);
    }
  }

  // Topological sort (Kahn's algorithm)
  const topoOrder: string[] = [];
  const remaining = new Map(inDegree);
  const bfsQueue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) bfsQueue.push(id);
  }

  while (bfsQueue.length > 0) {
    const curr = bfsQueue.shift()!;
    topoOrder.push(curr);
    for (const succ of successors.get(curr)!) {
      const newDeg = remaining.get(succ)! - 1;
      remaining.set(succ, newDeg);
      if (newDeg === 0) bfsQueue.push(succ);
    }
  }

  // Forward pass: compute ES and EF
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of topoOrder) {
    const a = byId.get(id)!;
    let maxPredEF = 0;
    for (const pred of a.predecessors) {
      const predEF = ef.get(pred)!;
      if (predEF > maxPredEF) maxPredEF = predEF;
    }
    es.set(id, maxPredEF);
    ef.set(id, maxPredEF + a.duration);
  }

  // Makespan = maximum EF
  let makespan = 0;
  for (const val of ef.values()) {
    if (val > makespan) makespan = val;
  }

  // Backward pass: compute LS and LF
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const id of [...topoOrder].reverse()) {
    const a = byId.get(id)!;
    const succs = successors.get(id)!;
    let lfVal: number;
    if (succs.length === 0) {
      lfVal = makespan;
    } else {
      let minSuccLS = Infinity;
      for (const s of succs) {
        const sLS = ls.get(s)!;
        if (sLS < minSuccLS) minSuccLS = sLS;
      }
      lfVal = minSuccLS;
    }
    lf.set(id, lfVal);
    ls.set(id, lfVal - a.duration);
  }

  return topoOrder.map(id => {
    const a = byId.get(id)!;
    const esVal = es.get(id)!;
    const efVal = ef.get(id)!;
    const lsVal = ls.get(id)!;
    const lfVal = lf.get(id)!;
    const slackVal = lsVal - esVal;
    return {
      id: a.id,
      duration: a.duration,
      es: esVal,
      ef: efVal,
      ls: lsVal,
      lf: lfVal,
      slack: slackVal,
      onCriticalPath: slackVal === 0,
      resource: a.resource,
    };
  });
}
