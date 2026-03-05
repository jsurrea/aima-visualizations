/**
 * Chapter 26 — Robotics
 *
 * Pure algorithm implementations covering:
 *   §26.4 Robotic Perception — particle filter (Monte Carlo localization), EKF update
 *   §26.5 Planning and Control — RRT, PRM, visibility graph, PID controller
 *   §26.6 Planning Uncertain Movements — MPC horizon step, guarded move feasibility
 *   §26.7 RL in Robotics — domain randomization evaluation
 *
 * All functions are pure — no side effects, no mutation of inputs.
 *
 * @module algorithms
 */

// ---------------------------------------------------------------------------
// Shared geometry helpers
// ---------------------------------------------------------------------------

/** A 2-D point. */
export interface Point2D {
  x: number;
  y: number;
}

/** An axis-aligned rectangular obstacle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Euclidean distance between two 2-D points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Non-negative distance.
 * @complexity O(1)
 */
export function dist2D(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a value to the range [lo, hi].
 *
 * @param v   - Input value.
 * @param lo  - Lower bound.
 * @param hi  - Upper bound.
 * @returns Clamped value.
 * @complexity O(1)
 */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Test whether a point lies strictly inside (or on the boundary of) an axis-aligned rectangle.
 *
 * @param p    - The point to test.
 * @param rect - The rectangle.
 * @returns `true` if p is inside or on rect.
 * @complexity O(1)
 */
export function pointInRect(p: Point2D, rect: Rect): boolean {
  return (
    p.x >= rect.x &&
    p.x <= rect.x + rect.width &&
    p.y >= rect.y &&
    p.y <= rect.y + rect.height
  );
}

/**
 * Test whether a line segment from `a` to `b` intersects an axis-aligned rectangle.
 *
 * Uses the Liang–Barsky parametric clipping algorithm.
 *
 * @param a    - Start of segment.
 * @param b    - End of segment.
 * @param rect - Rectangle to test against.
 * @returns `true` if the segment intersects the rectangle.
 * @complexity O(1)
 */
export function segmentIntersectsRect(a: Point2D, b: Point2D, rect: Rect): boolean {
  // If either endpoint is inside the rect we have an intersection
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const xmin = rect.x;
  const xmax = rect.x + rect.width;
  const ymin = rect.y;
  const ymax = rect.y + rect.height;

  let tMin = 0;
  let tMax = 1;

  const update = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  if (!update(-dx, a.x - xmin)) return false;
  if (!update(dx, xmax - a.x)) return false;
  if (!update(-dy, a.y - ymin)) return false;
  if (!update(dy, ymax - a.y)) return false;

  return tMin <= tMax;
}

/**
 * Test whether a line segment from `a` to `b` is collision-free w.r.t. a list of rectangles.
 *
 * @param a         - Start point.
 * @param b         - End point.
 * @param obstacles - Axis-aligned rectangular obstacles.
 * @returns `true` if the segment does not intersect any obstacle.
 * @complexity O(n) where n = number of obstacles
 */
export function segmentFree(a: Point2D, b: Point2D, obstacles: readonly Rect[]): boolean {
  for (const obs of obstacles) {
    if (segmentIntersectsRect(a, b, obs)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// §26.5.2 — Rapidly-exploring Random Tree (RRT)
// ---------------------------------------------------------------------------

/** A node in an RRT tree. */
export interface RRTNode {
  /** Unique integer id. */
  id: number;
  /** Position in 2-D C-space. */
  pos: Point2D;
  /** Index of parent node (−1 for the root). */
  parentId: number;
}

/** One step of RRT construction. */
export interface RRTStep {
  /** Current tree (snapshot). */
  tree: readonly RRTNode[];
  /** The random sample drawn this step. */
  sample: Point2D;
  /** Id of the nearest node in the tree to the sample. */
  nearestId: number;
  /** The new node added (or null if extension failed due to collision). */
  newNode: RRTNode | null;
  /** Path from start to goal (populated once solution is found). */
  path: readonly Point2D[];
  /** Whether a solution has been found. */
  solved: boolean;
  /** Human-readable description. */
  action: string;
}

/**
 * Build an RRT in a 2-D configuration space, returning all steps for playback.
 *
 * The algorithm uses a fixed pseudo-random seed sequence derived from `seed`.
 * Bounds are [0, worldW] × [0, worldH].  The goal region is a circle of
 * radius `goalRadius` around `goal`.
 *
 * @param start       - Start configuration.
 * @param goal        - Goal configuration.
 * @param obstacles   - Rectangular obstacles.
 * @param worldW      - World width.
 * @param worldH      - World height.
 * @param maxIter     - Maximum number of RRT iterations.
 * @param stepSize    - Maximum extension length per iteration.
 * @param goalBias    - Probability [0,1] of sampling the goal directly.
 * @param goalRadius  - Radius of goal region.
 * @param seed        - Deterministic seed for reproducibility.
 * @returns Array of RRTStep records.
 * @complexity O(maxIter · n) where n = current tree size
 */
export function buildRRT(
  start: Point2D,
  goal: Point2D,
  obstacles: readonly Rect[],
  worldW: number,
  worldH: number,
  maxIter: number,
  stepSize: number,
  goalBias: number,
  goalRadius: number,
  seed: number,
): readonly RRTStep[] {
  // Simple LCG pseudo-random generator (deterministic)
  let rng = seed;
  const rand = (): number => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0x100000000;
  };

  const rootNode: RRTNode = { id: 0, pos: start, parentId: -1 };
  const tree: RRTNode[] = [rootNode];
  const steps: RRTStep[] = [];

  const tracePath = (node: RRTNode): Point2D[] => {
    const path: Point2D[] = [];
    let cur: RRTNode | undefined = node;
    while (cur !== undefined) {
      path.unshift(cur.pos);
      cur = cur.parentId === -1 ? undefined : tree[cur.parentId];
    }
    return path;
  };

  for (let iter = 0; iter < maxIter; iter++) {
    // Sample: with goalBias probability, use the goal
    const useGoal = rand() < goalBias;
    const sample: Point2D = useGoal
      ? { x: goal.x, y: goal.y }
      : { x: rand() * worldW, y: rand() * worldH };

    // Find nearest node
    let nearestId = 0;
    let minD = Infinity;
    for (const node of tree) {
      const d = dist2D(node.pos, sample);
      if (d < minD) {
        minD = d;
        nearestId = node.id;
      }
    }

    const nearest = tree[nearestId]!;
    const d = dist2D(nearest.pos, sample);
    const t = d < stepSize ? 1 : stepSize / d;
    const newPos: Point2D = {
      x: nearest.pos.x + (sample.x - nearest.pos.x) * t,
      y: nearest.pos.y + (sample.y - nearest.pos.y) * t,
    };

    // Collision check
    const free = segmentFree(nearest.pos, newPos, obstacles);
    let newNode: RRTNode | null = null;
    let path: Point2D[] = [];
    let solved = false;

    if (free) {
      newNode = { id: tree.length, pos: newPos, parentId: nearestId };
      tree.push(newNode);

      if (dist2D(newPos, goal) <= goalRadius) {
        solved = true;
        path = tracePath(newNode);
        path.push(goal);
      }
    }

    steps.push({
      tree: tree.map(n => ({ ...n })),
      sample,
      nearestId,
      newNode: newNode ? { ...newNode } : null,
      path,
      solved,
      action: free
        ? solved
          ? `Iter ${iter + 1}: extended to (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)}) — GOAL REACHED`
          : `Iter ${iter + 1}: extended to (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`
        : `Iter ${iter + 1}: extension blocked by obstacle`,
    });

    if (solved) break;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.5.2 — Probabilistic Roadmap (PRM)
// ---------------------------------------------------------------------------

/** A PRM graph node (milestone). */
export interface PRMNode {
  id: number;
  pos: Point2D;
}

/** A PRM graph edge. */
export interface PRMEdge {
  from: number;
  to: number;
  length: number;
}

/** One build step of the PRM construction. */
export interface PRMStep {
  nodes: readonly PRMNode[];
  edges: readonly PRMEdge[];
  path: readonly Point2D[];
  solved: boolean;
  action: string;
}

/**
 * Build a Probabilistic Roadmap and find a path from start to goal.
 *
 * @param start      - Start configuration.
 * @param goal       - Goal configuration.
 * @param obstacles  - Rectangular obstacles.
 * @param worldW     - World width.
 * @param worldH     - World height.
 * @param numMilestones - Number of random milestones to sample (M).
 * @param connectRadius - Max distance to attempt edge connection.
 * @param seed       - Deterministic seed.
 * @returns Array of PRMStep records (one per milestone added).
 * @complexity O(M²) in the worst case
 */
export function buildPRM(
  start: Point2D,
  goal: Point2D,
  obstacles: readonly Rect[],
  worldW: number,
  worldH: number,
  numMilestones: number,
  connectRadius: number,
  seed: number,
): readonly PRMStep[] {
  let rng = seed;
  const rand = (): number => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0x100000000;
  };

  const isConfigFree = (p: Point2D): boolean => {
    for (const obs of obstacles) {
      if (pointInRect(p, obs)) return false;
    }
    return true;
  };

  const nodes: PRMNode[] = [];
  const edges: PRMEdge[] = [];

  // Add start and goal
  nodes.push({ id: 0, pos: start });
  nodes.push({ id: 1, pos: goal });

  const steps: PRMStep[] = [];

  // Dijkstra's shortest path
  const findPath = (): Point2D[] => {
    const INF = Infinity;
    const dist: number[] = new Array(nodes.length).fill(INF) as number[];
    const prev: number[] = new Array(nodes.length).fill(-1) as number[];
    dist[0] = 0;

    const visited = new Set<number>();
    for (let iter = 0; iter < nodes.length; iter++) {
      let u = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (!visited.has(i) && (u === -1 || dist[i]! < dist[u]!)) u = i;
      }
      if (u === -1 || dist[u] === INF) break;
      visited.add(u);
      for (const edge of edges) {
        const v = edge.from === u ? edge.to : edge.to === u ? edge.from : -1;
        if (v === -1) continue;
        const nd = dist[u]! + edge.length;
        if (nd < dist[v]!) {
          dist[v] = nd;
          prev[v] = u;
        }
      }
    }

    if (dist[1] === INF) return [];
    const path: Point2D[] = [];
    let cur = 1;
    while (cur !== -1) {
      path.unshift(nodes[cur]!.pos);
      cur = prev[cur]!;
    }
    return path;
  };

  // Sample milestones
  for (let m = 0; m < numMilestones; m++) {
    let p: Point2D;
    let attempts = 0;
    do {
      p = { x: rand() * worldW, y: rand() * worldH };
      attempts++;
    } while (!isConfigFree(p) && attempts < 100);

    if (!isConfigFree(p)) {
      steps.push({
        nodes: nodes.map(n => ({ ...n })),
        /* v8 ignore next */
        edges: edges.map(e => ({ ...e })),
        path: [],
        solved: false,
        action: `Milestone ${m + 1}: failed to find free config after 100 attempts`,
      });
      continue;
    }

    const newNode: PRMNode = { id: nodes.length, pos: p };
    nodes.push(newNode);

    // Connect to nearby nodes
    let newEdges = 0;
    for (const other of nodes) {
      if (other.id === newNode.id) continue;
      const d = dist2D(p, other.pos);
      if (d <= connectRadius && segmentFree(p, other.pos, obstacles)) {
        edges.push({ from: newNode.id, to: other.id, length: d });
        newEdges++;
      }
    }

    const path = findPath();
    const solved = path.length > 0;

    steps.push({
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      path,
      solved,
      action: `Added milestone ${newNode.id} at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}), connected ${newEdges} edges${solved ? ' — PATH FOUND' : ''}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.4.1 — Monte Carlo Localization (Particle Filter)
// ---------------------------------------------------------------------------

/** A single particle representing a robot pose hypothesis. */
export interface Particle {
  x: number;
  y: number;
  theta: number; // heading in radians
  weight: number;
}

/** One MCL step. */
export interface MCLStep {
  particles: readonly Particle[];
  /** True robot pose (for display). */
  truePose: Readonly<{ x: number; y: number; theta: number }>;
  /** Sensor reading at this step. */
  sensorReading: number;
  action: string;
}

/**
 * Wrap angle to [−π, π].
 *
 * @param a - Angle in radians.
 * @returns Wrapped angle.
 * @complexity O(1)
 */
export function wrapAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

/**
 * Gaussian probability density (unnormalised).
 *
 * @param x     - Input value.
 * @param mu    - Mean.
 * @param sigma - Standard deviation.
 * @returns Probability density value.
 * @complexity O(1)
 */
export function gaussian(x: number, mu: number, sigma: number): number {
  const d = (x - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Run Monte Carlo Localization (particle filter) for a sequence of motion
 * and sensor steps.
 *
 * World: a 1-D corridor of length `worldLen`.  The robot knows the
 * positions of `numBeacons` evenly-spaced beacons and uses a range sensor
 * with noise `sensorSigma`.  The motion model adds Gaussian noise `motionSigma`.
 *
 * @param numParticles  - Number of particles.
 * @param worldLen      - Length of the 1-D world.
 * @param numBeacons    - Number of beacons.
 * @param moves         - Array of true motion distances (+ = forward).
 * @param sensorSigma   - Std-dev of sensor noise.
 * @param motionSigma   - Std-dev of motion noise.
 * @param seed          - Deterministic seed.
 * @returns Array of MCLStep records.
 * @complexity O(T · N) where T = number of moves, N = numParticles
 */
export function runMCL(
  numParticles: number,
  worldLen: number,
  numBeacons: number,
  moves: readonly number[],
  sensorSigma: number,
  motionSigma: number,
  seed: number,
): readonly MCLStep[] {
  let rng = seed;
  const rand = (): number => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0x100000000;
  };
  const randNormal = (): number => {
    // Box-Muller transform
    const u = Math.max(rand(), 1e-10);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // Beacon positions (evenly spaced)
  const beacons: number[] = [];
  for (let i = 0; i < numBeacons; i++) {
    beacons.push(((i + 1) / (numBeacons + 1)) * worldLen);
  }

  // Sense: return distance to nearest beacon
  const sense = (x: number): number => {
    let minD = Infinity;
    for (const b of beacons) minD = Math.min(minD, Math.abs(x - b));
    return minD;
  };

  // Initialise particles uniformly
  let particles: Particle[] = [];
  for (let i = 0; i < numParticles; i++) {
    particles.push({ x: rand() * worldLen, y: 0, theta: 0, weight: 1 / numParticles });
  }

  let trueX = worldLen * 0.1;
  const steps: MCLStep[] = [];

  // Initial observation step
  const initReading = sense(trueX) + randNormal() * sensorSigma;
  for (const p of particles) {
    const expected = sense(p.x);
    p.weight = gaussian(initReading, expected, sensorSigma);
  }
  // Normalise
  let total = particles.reduce((s, p) => s + p.weight, 0);
  /* v8 ignore start */
  if (total > 0) particles.forEach(p => { p.weight /= total; });
  /* v8 ignore stop */

  steps.push({
    particles: particles.map(p => ({ ...p })),
    truePose: { x: trueX, y: 0, theta: 0 },
    sensorReading: initReading,
    action: 'Initial observation — particles spread uniformly, weights updated',
  });

  for (let t = 0; t < moves.length; t++) {
    const move = moves[t]!;
    trueX = clamp(trueX + move, 0, worldLen);

    // 1. Motion update (propagate particles)
    particles = particles.map(p => ({
      ...p,
      x: clamp(p.x + move + randNormal() * motionSigma, 0, worldLen),
    }));

    // 2. Sensor update
    const trueReading = sense(trueX) + randNormal() * sensorSigma;
    for (const p of particles) {
      const expected = sense(p.x);
      p.weight = gaussian(trueReading, expected, sensorSigma);
    }

    // Normalise weights
    total = particles.reduce((s, p) => s + p.weight, 0);
    /* v8 ignore start */
    if (total > 0) particles.forEach(p => { p.weight /= total; });
    /* v8 ignore stop */

    // 3. Resample (systematic resampling)
    const resampled: Particle[] = [];
    const cumulative: number[] = [];
    let cum = 0;
    for (const p of particles) {
      cum += p.weight;
      cumulative.push(cum);
    }
    const step = 1 / numParticles;
    let u0 = rand() * step;
    let j = 0;
    for (let i = 0; i < numParticles; i++) {
      const target = u0 + i * step;
      while (j < cumulative.length - 1 && cumulative[j]! < target) j++;
      resampled.push({ ...particles[j]!, weight: 1 / numParticles });
    }
    particles = resampled;

    steps.push({
      particles: particles.map(p => ({ ...p })),
      truePose: { x: trueX, y: 0, theta: 0 },
      sensorReading: trueReading,
      action: `Move ${t + 1}: robot moved ${move > 0 ? '+' : ''}${move.toFixed(1)}, sensor=${trueReading.toFixed(2)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.5.3 — PID Controller
// ---------------------------------------------------------------------------

/** One step of a PID controller simulation. */
export interface PIDStep {
  t: number;
  setpoint: number;
  position: number;
  error: number;
  integral: number;
  derivative: number;
  control: number;
  action: string;
}

/**
 * Simulate a PID controller tracking a constant setpoint for `numSteps`
 * discrete time steps of size `dt`.
 *
 * Plant model: double integrator (acceleration = control).
 * Velocity and position are updated with Euler integration.
 *
 * @param kp       - Proportional gain.
 * @param ki       - Integral gain.
 * @param kd       - Derivative gain.
 * @param setpoint - Target position.
 * @param initPos  - Initial position.
 * @param numSteps - Number of simulation steps.
 * @param dt       - Time step (seconds).
 * @returns Array of PIDStep records.
 * @complexity O(numSteps)
 */
export function simulatePID(
  kp: number,
  ki: number,
  kd: number,
  setpoint: number,
  initPos: number,
  numSteps: number,
  dt: number,
): readonly PIDStep[] {
  const steps: PIDStep[] = [];
  let pos = initPos;
  let vel = 0;
  let integral = 0;
  let prevError = setpoint - initPos;

  for (let i = 0; i <= numSteps; i++) {
    const t = i * dt;
    const error = setpoint - pos;
    integral += error * dt;
    const derivative = (error - prevError) / dt;
    const control = kp * error + ki * integral + kd * derivative;
    prevError = error;

    steps.push({
      t,
      setpoint,
      position: pos,
      error,
      integral,
      derivative,
      control,
      action: `t=${t.toFixed(2)}s: pos=${pos.toFixed(3)}, err=${error.toFixed(3)}, u=${control.toFixed(3)}`,
    });

    // Euler integration of double integrator
    vel += control * dt;
    pos += vel * dt;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.4 — Extended Kalman Filter (1-D localization)
// ---------------------------------------------------------------------------

/** State of a 1-D EKF localizer. */
export interface EKFState {
  mean: number;
  variance: number;
}

/** One EKF step (predict + update). */
export interface EKFStep {
  t: number;
  priorMean: number;
  priorVariance: number;
  posteriorMean: number;
  posteriorVariance: number;
  measurement: number;
  kalmanGain: number;
  action: string;
}

/**
 * Run a 1-D EKF localizer for a sequence of (motion, measurement) pairs.
 *
 * Motion model: x_{t+1} = x_t + u_t  (linear, so EKF == KF here).
 * Sensor model: z_t = x_t  (direct measurement with noise).
 *
 * @param initMean      - Initial mean estimate.
 * @param initVariance  - Initial variance.
 * @param motionNoise   - Variance of the motion noise (R in textbook notation).
 * @param sensorNoise   - Variance of sensor noise (Q in textbook notation).
 * @param motions       - Array of control inputs (distances).
 * @param measurements  - Array of measurements (same length as motions).
 * @returns Array of EKFStep records.
 * @complexity O(T) where T = number of steps
 */
export function runEKF(
  initMean: number,
  initVariance: number,
  motionNoise: number,
  sensorNoise: number,
  motions: readonly number[],
  measurements: readonly number[],
): readonly EKFStep[] {
  const steps: EKFStep[] = [];
  let mean = initMean;
  let variance = initVariance;

  for (let t = 0; t < motions.length; t++) {
    const u = motions[t]!;
    const z = measurements[t]!;

    // Predict
    const priorMean = mean + u;
    const priorVariance = variance + motionNoise;

    // Update
    const kalmanGain = priorVariance / (priorVariance + sensorNoise);
    const posteriorMean = priorMean + kalmanGain * (z - priorMean);
    const posteriorVariance = (1 - kalmanGain) * priorVariance;

    mean = posteriorMean;
    variance = posteriorVariance;

    steps.push({
      t,
      priorMean,
      priorVariance,
      posteriorMean,
      posteriorVariance,
      measurement: z,
      kalmanGain,
      action: `Step ${t + 1}: moved ${u > 0 ? '+' : ''}${u.toFixed(2)}, measured z=${z.toFixed(2)}, K=${kalmanGain.toFixed(3)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.6 — Model Predictive Control (MPC) — 1-D horizon simulation
// ---------------------------------------------------------------------------

/** One MPC planning step. */
export interface MPCStep {
  t: number;
  currentPos: number;
  horizon: readonly number[]; // planned positions for next H steps
  plannedControl: readonly number[]; // control sequence for horizon
  appliedControl: number;
  action: string;
}

/**
 * Simulate model predictive control on a 1-D double-integrator plant.
 *
 * At each time step, the MPC planner uses a finite horizon to compute the
 * optimal control sequence and applies only the first control action.
 *
 * @param goalPos    - Target position.
 * @param initPos    - Initial position.
 * @param horizon    - Planning horizon (steps).
 * @param numSteps   - Total simulation steps.
 * @param dt         - Time step.
 * @param maxControl - Maximum allowed control magnitude.
 * @returns Array of MPCStep records.
 * @complexity O(T · H)
 */
export function simulateMPC(
  goalPos: number,
  initPos: number,
  horizon: number,
  numSteps: number,
  dt: number,
  maxControl: number,
): readonly MPCStep[] {
  const steps: MPCStep[] = [];
  let pos = initPos;
  let vel = 0;

  for (let t = 0; t < numSteps; t++) {
    // Plan: simple proportional horizon (each step aims towards goal)
    const plannedPos: number[] = [];
    const plannedCtrl: number[] = [];
    let simPos = pos;
    let simVel = vel;

    for (let h = 0; h < horizon; h++) {
      const err = goalPos - simPos;
      const ctrl = clamp(err * 2, -maxControl, maxControl);
      simVel += ctrl * dt;
      simPos += simVel * dt;
      plannedPos.push(simPos);
      plannedCtrl.push(ctrl);
    }

    const appliedCtrl = plannedCtrl[0] ?? 0;
    vel += appliedCtrl * dt;
    pos += vel * dt;

    steps.push({
      t,
      currentPos: pos,
      horizon: plannedPos,
      plannedControl: plannedCtrl,
      appliedControl: appliedCtrl,
      action: `t=${t}: pos=${pos.toFixed(3)}, vel=${vel.toFixed(3)}, u=${appliedCtrl.toFixed(3)}`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// §26.7 — Domain Randomization evaluation
// ---------------------------------------------------------------------------

/** Result of evaluating a policy in one randomized domain instance. */
export interface DomainRandomizationResult {
  instanceId: number;
  paramValue: number;
  reward: number;
  success: boolean;
}

/**
 * Evaluate a fixed "proportional" policy across a set of randomized domain
 * instances, simulating the domain randomization training paradigm from §26.7.
 *
 * The 1-D plant has friction drawn from [frictionLo, frictionHi].
 * A proportional controller tries to reach `goalPos` from `startPos`.
 *
 * @param startPos    - Initial position.
 * @param goalPos     - Target position.
 * @param frictionLo  - Minimum friction coefficient.
 * @param frictionHi  - Maximum friction coefficient.
 * @param numInstances - Number of domain instances to evaluate.
 * @param numSteps    - Steps per episode.
 * @param dt          - Time step.
 * @param kp          - Proportional gain.
 * @param seed        - Deterministic seed.
 * @returns Array of per-instance results.
 * @complexity O(numInstances · numSteps)
 */
export function evaluateDomainRandomization(
  startPos: number,
  goalPos: number,
  frictionLo: number,
  frictionHi: number,
  numInstances: number,
  numSteps: number,
  dt: number,
  kp: number,
  seed: number,
): readonly DomainRandomizationResult[] {
  let rng = seed;
  const rand = (): number => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0x100000000;
  };

  const results: DomainRandomizationResult[] = [];

  for (let i = 0; i < numInstances; i++) {
    const friction = frictionLo + rand() * (frictionHi - frictionLo);
    let pos = startPos;
    let vel = 0;
    let totalReward = 0;

    for (let t = 0; t < numSteps; t++) {
      const err = goalPos - pos;
      const ctrl = kp * err;
      vel += ctrl * dt;
      vel *= 1 - friction * dt; // friction damping
      pos += vel * dt;
      totalReward -= Math.abs(err); // negative distance = reward
    }

    const finalErr = Math.abs(goalPos - pos);
    results.push({
      instanceId: i,
      paramValue: friction,
      reward: totalReward,
      success: finalErr < 0.1,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// §26.8 — Human intent inference (Boltzmann rationality)
// ---------------------------------------------------------------------------

/** A 2-D grid action. */
export interface GridAction {
  dx: number;
  dy: number;
  label: string;
}

/**
 * Infer a human's goal given an observed action using Boltzmann rationality.
 *
 * P(goal | action) ∝ P(action | goal) * P(goal)
 * P(action | goal) ∝ exp(−β * Q(state, action; goal))
 *
 * where Q(state, action; goal) = cost-to-go estimate = distance(next_state, goal).
 *
 * @param currentPos  - Current grid position.
 * @param goals       - List of possible goal positions.
 * @param priors      - Prior probabilities over goals (must sum to 1).
 * @param observedAction - The action taken.
 * @param actions     - All possible actions.
 * @param beta        - Rationality coefficient (higher = more rational).
 * @returns Posterior probability distribution over goals.
 * @complexity O(|goals| · |actions|)
 */
export function inferHumanGoal(
  currentPos: Point2D,
  goals: readonly Point2D[],
  priors: readonly number[],
  observedAction: GridAction,
  actions: readonly GridAction[],
  beta: number,
): readonly number[] {
  const nextPos: Point2D = {
    x: currentPos.x + observedAction.dx,
    y: currentPos.y + observedAction.dy,
  };

  // Compute P(action | goal) for each goal (softmax over Q values)
  const likelihoods: number[] = goals.map((goal) => {
    // Q-value for each possible action given this goal
    const qValues: number[] = actions.map((a) => {
      const nextP: Point2D = { x: currentPos.x + a.dx, y: currentPos.y + a.dy };
      return dist2D(nextP, goal); // cost = distance to goal
    });

    // Find index of observed action
    const obsIdx = actions.findIndex(a => a.dx === observedAction.dx && a.dy === observedAction.dy);
    if (obsIdx === -1) return 0;

    // Boltzmann distribution: exp(-beta * Q(obs)) / sum_a exp(-beta * Q(a))
    const maxQ = Math.max(...qValues);
    const expVals = qValues.map(q => Math.exp(-beta * (q - maxQ)));
    const sumExp = expVals.reduce((s, e) => s + e, 0);
    /* v8 ignore start */
    return (expVals[obsIdx] ?? 0) / sumExp;
    /* v8 ignore stop */
  });

  // Posterior: likelihood * prior
  const unnorm = goals.map((_, i) => likelihoods[i]! * priors[i]!);
  const total = unnorm.reduce((s, v) => s + v, 0);
  if (total === 0) return goals.map(() => 1 / goals.length);
  return unnorm.map(v => v / total);
}

// ---------------------------------------------------------------------------
// §26.9 — Finite State Machine (reactive controller)
// ---------------------------------------------------------------------------

/** A state in a finite state machine controller. */
export interface FSMState {
  id: string;
  label: string;
  action: string;
}

/** A transition in an FSM. */
export interface FSMTransition {
  from: string;
  to: string;
  condition: string;
}

/** One FSM execution step. */
export interface FSMStep {
  stateId: string;
  sensorReading: string;
  triggered: FSMTransition | null;
  action: string;
}

/**
 * Simulate a finite-state-machine reactive controller for a legged robot.
 *
 * @param states      - FSM state definitions.
 * @param transitions - FSM transition rules.
 * @param initStateId - Starting state.
 * @param sensorSeq   - Sequence of sensor events to process.
 * @returns Array of FSMStep records.
 * @complexity O(T · |transitions|) where T = number of sensor events
 */
export function simulateFSM(
  states: readonly FSMState[],
  transitions: readonly FSMTransition[],
  initStateId: string,
  sensorSeq: readonly string[],
): readonly FSMStep[] {
  const steps: FSMStep[] = [];
  let currentId = initStateId;
  const stateMap = new Map(states.map(s => [s.id, s]));

  for (const sensor of sensorSeq) {
    const applicable = transitions.filter(
      t => t.from === currentId && t.condition === sensor,
    );
    const triggered = applicable[0] ?? null;
    const curState = stateMap.get(currentId);
    steps.push({
      stateId: currentId,
      sensorReading: sensor,
      triggered,
      action: triggered
        ? `State "${curState?.label ?? currentId}" → "${stateMap.get(triggered.to)?.label ?? triggered.to}" on "${sensor}"`
        : `State "${curState?.label ?? currentId}" — no transition for "${sensor}"`,
    });
    if (triggered) currentId = triggered.to;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Visibility graph (§26.5.2)
// ---------------------------------------------------------------------------

/**
 * Build a 2-D visibility graph from a set of polygon obstacle vertices plus
 * start and goal points, returning adjacency list.
 *
 * @param vertices   - All vertex positions (obstacle corners + start + goal).
 * @param obstacles  - Rectangular obstacles (used for collision checks).
 * @returns Adjacency list: visibilityGraph[i] = array of visible vertex indices.
 * @complexity O(n²) where n = number of vertices
 */
export function buildVisibilityGraph(
  vertices: readonly Point2D[],
  obstacles: readonly Rect[],
): readonly (readonly number[])[] {
  const adj: number[][] = vertices.map(() => []);
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (segmentFree(vertices[i]!, vertices[j]!, obstacles)) {
        adj[i]!.push(j);
        adj[j]!.push(i);
      }
    }
  }
  return adj;
}

/**
 * Run Dijkstra's algorithm on the visibility graph to find the shortest path.
 *
 * @param adj      - Adjacency list from buildVisibilityGraph.
 * @param vertices - Vertex positions.
 * @param startIdx - Index of start vertex.
 * @param goalIdx  - Index of goal vertex.
 * @returns Array of vertex indices forming the shortest path, or [] if none.
 * @complexity O(n²)
 */
export function visibilityGraphPath(
  adj: readonly (readonly number[])[],
  vertices: readonly Point2D[],
  startIdx: number,
  goalIdx: number,
): readonly number[] {
  const n = vertices.length;
  const dist: number[] = new Array(n).fill(Infinity) as number[];
  const prev: number[] = new Array(n).fill(-1) as number[];
  dist[startIdx] = 0;
  const visited = new Set<number>();

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && (u === -1 || dist[i]! < dist[u]!)) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    visited.add(u);
    for (const v of adj[u]!) {
      const d = dist[u]! + dist2D(vertices[u]!, vertices[v]!);
      if (d < dist[v]!) {
        dist[v] = d;
        prev[v] = u;
      }
    }
  }

  if (dist[goalIdx] === Infinity) return [];
  const path: number[] = [];
  let cur = goalIdx;
  while (cur !== -1) {
    path.unshift(cur);
    cur = prev[cur]!;
  }
  return path;
}
