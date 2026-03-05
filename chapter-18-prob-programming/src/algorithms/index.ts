/**
 * Chapter 18 — Probabilistic Programming
 *
 * Pure algorithm implementations for:
 *   §18.1 Relational Probability Models (RPMs): book recommendation grounding
 *   §18.2 Open-Universe Probability Models (OUPMs): number statements, world generation
 *   §18.3 Keeping Track of a Complex World: data association, nearest-neighbor & Hungarian
 *   §18.4 Programs as Probability Models: execution traces, rejection sampling, likelihood
 *         weighting, MCMC for generative programs
 *
 * Every exported function is pure (no side effects) with deterministic seeded PRNG
 * (where randomness is needed) so tests are reproducible.
 *
 * @module algorithms
 */

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator (Mulberry32).
 * Returns a function that produces values in [0, 1).
 *
 * @param seed - Integer seed value.
 * @returns Seeded PRNG function.
 * @complexity O(1) per call
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Samples a categorical distribution (discrete).
 *
 * @param probs - Array of probabilities summing to 1.
 * @param rng   - PRNG function returning [0, 1).
 * @returns Index of the sampled category.
 * @complexity O(K) where K = probs.length
 */
export function sampleCategorical(probs: ReadonlyArray<number>, rng: () => number): number {
  const u = rng();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i]!;
    if (u < cumulative) return i;
  }
  /* v8 ignore start */
  return probs.length - 1;
  /* v8 ignore stop */
}

/**
 * Samples a Poisson(lambda) random variable using Knuth's algorithm.
 *
 * @param lambda - Rate parameter (expected value).
 * @param rng    - PRNG function.
 * @returns Non-negative integer sample.
 * @complexity O(lambda) expected
 */
export function samplePoisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * Samples a Normal(mu, sigma^2) random variable using Box-Muller transform.
 *
 * @param mu    - Mean.
 * @param sigma - Standard deviation.
 * @param rng   - PRNG function.
 * @returns Sample from N(mu, sigma^2).
 * @complexity O(1)
 */
export function sampleNormal(mu: number, sigma: number, rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

/**
 * Evaluates the Poisson PMF: P(X = k | lambda) = lambda^k * e^{-lambda} / k!
 *
 * @param k      - Non-negative integer outcome.
 * @param lambda - Rate parameter.
 * @returns Probability.
 * @complexity O(k)
 */
export function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// ─── §18.1  Relational Probability Models ────────────────────────────────────

/**
 * Represents one customer in the book-recommendation domain.
 */
export interface RPMCustomer {
  readonly id: string;
  /** P(Honest(c) = true). */
  readonly honestProb: number;
  /** Prior distribution over kindness levels 1-5. */
  readonly kindnessPrior: ReadonlyArray<number>;
}

/**
 * Represents one book in the RPM.
 */
export interface RPMBook {
  readonly id: string;
  /** Prior distribution over quality levels 1-5. */
  readonly qualityPrior: ReadonlyArray<number>;
}

/**
 * A grounded random variable produced by RPM instantiation.
 */
export interface RPMVariable {
  /** Name, e.g. "Honest(C1)", "Quality(B2)", "Recommendation(C1,B2)" */
  readonly name: string;
  /** Which CPT governs this variable. */
  readonly type: 'Honest' | 'Kindness' | 'Quality' | 'Recommendation';
  /** Parent variable names (in order). */
  readonly parents: ReadonlyArray<string>;
  /** The customer id for Honest/Kindness/Recommendation. */
  readonly customerId?: string;
  /** The book id for Quality/Recommendation. */
  readonly bookId?: string;
}

/**
 * One step of the RPM grounding algorithm.
 */
export interface RPMGroundingStep {
  /** Variable being added. */
  readonly variable: RPMVariable;
  /** All variables added so far (including this one). */
  readonly groundedVariables: ReadonlyArray<RPMVariable>;
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Grounds (unrolls) an RPM into a Bayes net for C customers and B books.
 * Follows the pseudocode on AIMA p.647.
 *
 * Order: Quality(b) for each b, then Honest(c)/Kindness(c)/Recommendation(c,b) for each c.
 *
 * @param customers - Array of customer descriptors.
 * @param books     - Array of book descriptors.
 * @returns Immutable array of grounding steps (one per variable added).
 * @complexity O(C*B)
 */
export function groundRPM(
  customers: ReadonlyArray<RPMCustomer>,
  books: ReadonlyArray<RPMBook>,
): ReadonlyArray<RPMGroundingStep> {
  const steps: RPMGroundingStep[] = [];
  const grounded: RPMVariable[] = [];

  const push = (v: RPMVariable, desc: string) => {
    grounded.push(v);
    steps.push({
      variable: v,
      groundedVariables: [...grounded],
      action: desc,
    });
  };

  for (const b of books) {
    const v: RPMVariable = {
      name: `Quality(${b.id})`,
      type: 'Quality',
      parents: [],
      bookId: b.id,
    };
    push(v, `Add Quality(${b.id}) — prior [${b.qualityPrior.map((p, i) => `q${i + 1}:${(p * 100).toFixed(0)}%`).join(', ')}]`);
  }

  for (const c of customers) {
    const hv: RPMVariable = {
      name: `Honest(${c.id})`,
      type: 'Honest',
      parents: [],
      customerId: c.id,
    };
    push(hv, `Add Honest(${c.id}) — P(honest)=${(c.honestProb * 100).toFixed(0)}%`);

    const kv: RPMVariable = {
      name: `Kindness(${c.id})`,
      type: 'Kindness',
      parents: [],
      customerId: c.id,
    };
    push(kv, `Add Kindness(${c.id}) — prior [${c.kindnessPrior.map((p, i) => `k${i + 1}:${(p * 100).toFixed(0)}%`).join(', ')}]`);

    for (const b of books) {
      const rv: RPMVariable = {
        name: `Recommendation(${c.id},${b.id})`,
        type: 'Recommendation',
        parents: [`Honest(${c.id})`, `Kindness(${c.id})`, `Quality(${b.id})`],
        customerId: c.id,
        bookId: b.id,
      };
      push(rv, `Add Recommendation(${c.id},${b.id}) — parents: Honest(${c.id}), Kindness(${c.id}), Quality(${b.id})`);
    }
  }

  return steps;
}

/**
 * Honest recommendation CPT: P(rec=r | honest=true, kindness=k, quality=q).
 * An honest recommendation is Uniform in [floor((q+k)/2), ceil((q+k)/2)].
 * (AIMA Section 18.1.1)
 *
 * @param rec      - Recommendation value 1-5.
 * @param kindness - Customer kindness 1-5.
 * @param quality  - Book quality 1-5.
 * @returns Probability.
 * @complexity O(1)
 */
export function honestRecCPT(rec: number, kindness: number, quality: number): number {
  if (rec < 1 || rec > 5) return 0;
  const avg = (quality + kindness) / 2;
  const lo = Math.floor(avg);
  const hi = Math.ceil(avg);
  if (lo === hi) return rec === lo ? 1 : 0;
  return rec === lo || rec === hi ? 0.5 : 0;
}

/**
 * Dishonest recommendation distribution: [0.4, 0.1, 0.0, 0.1, 0.4] (AIMA Section 18.1.1).
 */
export const DISHONEST_REC_PROBS: ReadonlyArray<number> = [0.4, 0.1, 0.0, 0.1, 0.4];

/**
 * Full Recommendation CPT: P(rec | honest, kindness, quality).
 *
 * @param rec      - Recommendation value 1-5.
 * @param honest   - Whether the customer is honest.
 * @param kindness - Customer kindness 1-5.
 * @param quality  - Book quality 1-5.
 * @returns Probability.
 * @complexity O(1)
 */
export function recommendationCPT(
  rec: number,
  honest: boolean,
  kindness: number,
  quality: number,
): number {
  if (rec < 1 || rec > 5) return 0;
  if (honest) return honestRecCPT(rec, kindness, quality);
  return DISHONEST_REC_PROBS[rec - 1]!;
}

/**
 * A sampled world from the RPM (given grounded variables).
 */
export interface RPMWorld {
  /** Assigned values keyed by variable name. */
  readonly assignments: Readonly<Record<string, number>>;
  /** Log-probability of this world. */
  readonly logProb: number;
}

/**
 * Samples one complete world from the RPM.
 *
 * @param customers - Customer descriptors.
 * @param books     - Book descriptors.
 * @param rng       - PRNG function.
 * @returns A sampled RPM world.
 * @complexity O(C*B)
 */
export function sampleRPMWorld(
  customers: ReadonlyArray<RPMCustomer>,
  books: ReadonlyArray<RPMBook>,
  rng: () => number,
): RPMWorld {
  const assignments: Record<string, number> = {};
  let logProb = 0;

  for (const b of books) {
    const qi = sampleCategorical(b.qualityPrior, rng);
    assignments[`Quality(${b.id})`] = qi + 1;
    logProb += Math.log(b.qualityPrior[qi]!);
  }

  for (const c of customers) {
    const honest = rng() < c.honestProb;
    assignments[`Honest(${c.id})`] = honest ? 1 : 0;
    logProb += Math.log(honest ? c.honestProb : 1 - c.honestProb);

    const ki = sampleCategorical(c.kindnessPrior, rng);
    const kindness = ki + 1;
    assignments[`Kindness(${c.id})`] = kindness;
    logProb += Math.log(c.kindnessPrior[ki]!);

    for (const b of books) {
      const quality = assignments[`Quality(${b.id})`]!;
      const recProbs: number[] = [];
      for (let r = 1; r <= 5; r++) {
        recProbs.push(recommendationCPT(r, honest, kindness, quality));
      }
      const ri = sampleCategorical(recProbs, rng);
      assignments[`Recommendation(${c.id},${b.id})`] = ri + 1;
      logProb += Math.log(recProbs[ri]!);
    }
  }

  return { assignments, logProb };
}

// ─── §18.2  Open-Universe Probability Models ─────────────────────────────────

/**
 * One step of OUPM world generation (topological order, per AIMA Figure 18.4).
 */
export interface OUPMGenerationStep {
  /** Variable being generated. */
  readonly variableName: string;
  /** Its value. */
  readonly value: number | string | boolean;
  /** Probability of this particular value. */
  readonly probability: number;
  /** Running product of all probabilities so far. */
  readonly runningProb: number;
  /** Type of variable. */
  readonly kind: 'number' | 'property';
  /** Human-readable description. */
  readonly action: string;
}

/**
 * Generates one possible world for the book-recommendation OUPM
 * (AIMA Section 18.2, Figure 18.4) step by step.
 *
 * The model:
 *   #Customer ~ UniformInt(1, 3)
 *   #Book     ~ UniformInt(2, 4)
 *   Honest(c) ~ Bernoulli(0.99)
 *   Kindness(c) ~ Categorical([0.1,0.1,0.2,0.3,0.3])
 *   Quality(b)  ~ Categorical([0.05,0.2,0.4,0.2,0.15])
 *   #LoginID(Owner=c) ~ if Honest(c) then Exactly(1) else UniformInt(2, 5)
 *   Recommendation(loginID, b) ~ RecCPT(Honest(owner), Kindness(owner), Quality(b))
 *
 * @param rng - Seeded PRNG function.
 * @returns Array of generation steps in topological order.
 * @complexity O(C*B) expected
 */
export function generateOUPMWorld(rng: () => number): ReadonlyArray<OUPMGenerationStep> {
  const steps: OUPMGenerationStep[] = [];
  let runningProb = 1;

  const addStep = (
    name: string,
    value: number | string | boolean,
    prob: number,
    kind: 'number' | 'property',
    desc: string,
  ) => {
    runningProb *= prob;
    steps.push({ variableName: name, value, probability: prob, runningProb, kind, action: desc });
  };

  // #Customer ~ UniformInt(1,3)
  const numCustomers = 1 + Math.floor(rng() * 3);
  addStep('#Customer', numCustomers, 1 / 3, 'number',
    `Sample #Customer ~ UniformInt(1,3) -> ${numCustomers} customer(s)`);

  // #Book ~ UniformInt(2,4)
  const numBooks = 2 + Math.floor(rng() * 3);
  addStep('#Book', numBooks, 1 / 3, 'number',
    `Sample #Book ~ UniformInt(2,4) -> ${numBooks} book(s)`);

  const HONEST_PROB = 0.99;
  const KINDNESS_PRIOR = [0.1, 0.1, 0.2, 0.3, 0.3];
  const QUALITY_PRIOR = [0.05, 0.2, 0.4, 0.2, 0.15];

  const customerProps: Array<{ honest: boolean; kindness: number }> = [];

  // Generate customer properties
  for (let c = 1; c <= numCustomers; c++) {
    const honest = rng() < HONEST_PROB;
    const honestProb = honest ? HONEST_PROB : 1 - HONEST_PROB;
    addStep(`Honest(C${c})`, honest, honestProb, 'property',
      `Sample Honest(C${c}) ~ Bernoulli(0.99) -> ${honest}`);

    const ki = sampleCategorical(KINDNESS_PRIOR, rng);
    const kindness = ki + 1;
    addStep(`Kindness(C${c})`, kindness, KINDNESS_PRIOR[ki]!, 'property',
      `Sample Kindness(C${c}) ~ Categorical([0.1,0.1,0.2,0.3,0.3]) -> ${kindness}`);

    customerProps.push({ honest, kindness });
  }

  // Generate book qualities
  const bookQualities: number[] = [];
  for (let b = 1; b <= numBooks; b++) {
    const qi = sampleCategorical(QUALITY_PRIOR, rng);
    const quality = qi + 1;
    addStep(`Quality(B${b})`, quality, QUALITY_PRIOR[qi]!, 'property',
      `Sample Quality(B${b}) ~ Categorical([0.05,0.2,0.4,0.2,0.15]) -> ${quality}`);
    bookQualities.push(quality);
  }

  // Generate login IDs and recommendations
  for (let c = 1; c <= numCustomers; c++) {
    const cp = customerProps[c - 1]!;
    let numLogins: number;
    let loginProb: number;
    if (cp.honest) {
      numLogins = 1;
      loginProb = 1.0;
    } else {
      // UniformInt(2, 5): 4 choices
      numLogins = 2 + Math.floor(rng() * 4);
      loginProb = 0.25;
    }
    addStep(`#LoginID(Owner=C${c})`, numLogins, loginProb, 'number',
      `Sample #LoginID(Owner=C${c}) ~ ${cp.honest ? 'Exactly(1)' : 'UniformInt(2,5)'} -> ${numLogins} login(s)`);

    for (let l = 1; l <= numLogins; l++) {
      for (let b = 1; b <= numBooks; b++) {
        const quality = bookQualities[b - 1]!;
        const recProbs: number[] = [];
        for (let r = 1; r <= 5; r++) {
          recProbs.push(recommendationCPT(r, cp.honest, cp.kindness, quality));
        }
        const ri = sampleCategorical(recProbs, rng);
        const rec = ri + 1;
        addStep(
          `Rec(L${l}@C${c},B${b})`,
          rec,
          recProbs[ri]!,
          'property',
          `Sample Recommendation(Login${l} of C${c}, B${b}) -> ${rec}`,
        );
      }
    }
  }

  return steps;
}

// ─── §18.3  Data Association ──────────────────────────────────────────────────

/**
 * 2D point used in tracking.
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/**
 * One radar "blip" observation at a given time step.
 */
export interface RadarBlip {
  readonly time: number;
  readonly id: number;
  readonly position: Point2D;
}

/**
 * State of one tracked object at a time step.
 */
export interface TrackState {
  readonly objectId: number;
  readonly time: number;
  readonly truePosition: Point2D;
  readonly predictedPosition: Point2D;
}

/**
 * Result of data association at one time step.
 */
export interface NNAssociationStep {
  readonly time: number;
  /** Current blips (observations) at this time. */
  readonly blips: ReadonlyArray<RadarBlip>;
  /** Predicted positions for each object before observing blips. */
  readonly predictions: ReadonlyArray<TrackState>;
  /** Association: blip id to object id mapping. */
  readonly assignment: ReadonlyArray<{ blipId: number; objectId: number; distance: number }>;
  /** Updated track states after association. */
  readonly updatedTracks: ReadonlyArray<TrackState>;
  readonly action: string;
}

/**
 * Euclidean distance between two 2D points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Euclidean distance.
 * @complexity O(1)
 */
export function euclideanDist(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Nearest-neighbor data association filter (AIMA Section 18.3.1).
 * Greedily assigns each observation to the closest predicted object position.
 * Modifies tracks using a simple constant position prediction.
 *
 * @param observations - Blip observations at each time step (grouped by time).
 * @param initialTracks - Initial track states at t=0.
 * @returns Immutable array of association steps, one per time step.
 * @complexity O(T * N * M) where T=time steps, N=objects, M=blips per step
 */
export function nearestNeighborFilter(
  observations: ReadonlyArray<ReadonlyArray<RadarBlip>>,
  initialTracks: ReadonlyArray<TrackState>,
): ReadonlyArray<NNAssociationStep> {
  const steps: NNAssociationStep[] = [];
  let currentTracks: TrackState[] = [...initialTracks];

  for (let t = 0; t < observations.length; t++) {
    const blips = observations[t]!;
    const time = t + 1;

    // Predict next positions (simple constant-position, no velocity model)
    const predictions: TrackState[] = currentTracks.map(track => ({
      ...track,
      time,
      predictedPosition: track.truePosition,
    }));

    // Nearest-neighbor: greedily assign blips to objects by distance
    const usedObjects = new Set<number>();
    const usedBlips = new Set<number>();
    const assignment: Array<{ blipId: number; objectId: number; distance: number }> = [];

    const pairs: Array<{ blipIdx: number; objIdx: number; dist: number }> = [];
    for (let bi = 0; bi < blips.length; bi++) {
      for (let oi = 0; oi < predictions.length; oi++) {
        pairs.push({
          blipIdx: bi,
          objIdx: oi,
          dist: euclideanDist(blips[bi]!.position, predictions[oi]!.predictedPosition),
        });
      }
    }
    pairs.sort((a, b) => a.dist - b.dist);

    for (const pair of pairs) {
      if (usedBlips.has(pair.blipIdx) || usedObjects.has(pair.objIdx)) continue;
      const blip = blips[pair.blipIdx]!;
      const obj = predictions[pair.objIdx]!;
      assignment.push({ blipId: blip.id, objectId: obj.objectId, distance: pair.dist });
      usedBlips.add(pair.blipIdx);
      usedObjects.add(pair.objIdx);
    }

    // Update track positions based on assignments
    const updatedTracks: TrackState[] = predictions.map(pred => {
      const match = assignment.find(a => a.objectId === pred.objectId);
      if (!match) return pred;
      const blip = blips.find(b => b.id === match.blipId);
      /* v8 ignore start */
      if (!blip) return pred;
      /* v8 ignore stop */
      return { ...pred, truePosition: blip.position };
    });

    steps.push({
      time,
      blips,
      predictions,
      assignment,
      updatedTracks,
      action: `t=${time}: Assign ${assignment.length} blip(s) using nearest-neighbor. ` +
        assignment.map(a => `Blip#${a.blipId}->Obj#${a.objectId}(d=${a.distance.toFixed(1)})`).join(', '),
    });

    currentTracks = updatedTracks;
  }

  return steps;
}

/**
 * Hungarian algorithm for optimal assignment of N blips to N objects
 * that minimizes total distance (AIMA Section 18.3.1).
 * Implements the classic O(N^3) Munkres algorithm with augmenting paths.
 *
 * @param cost - N x N cost matrix (cost[i][j] = cost of assigning row i to col j).
 * @returns Array of length N: assignment[i] = j means row i is assigned to col j.
 * @complexity O(N^3)
 */
export function hungarianAlgorithm(cost: ReadonlyArray<ReadonlyArray<number>>): ReadonlyArray<number> {
  const n = cost.length;
  if (n === 0) return [];

  // Make a mutable copy
  const C = cost.map(row => [...row]);

  // Step 1: Subtract row minima
  for (let i = 0; i < n; i++) {
    const rowMin = Math.min(...C[i]!);
    for (let j = 0; j < n; j++) C[i]![j]! -= rowMin;
  }

  // Step 2: Subtract column minima
  for (let j = 0; j < n; j++) {
    let colMin = Infinity;
    for (let i = 0; i < n; i++) colMin = Math.min(colMin, C[i]![j]!);
    for (let i = 0; i < n; i++) C[i]![j]! -= colMin;
  }

  // Iteratively find augmenting paths and adjust the cost matrix
  const rowToCol = new Array<number>(n).fill(-1);
  const colToRow = new Array<number>(n).fill(-1);

  // Augmenting path search (Kuhn's algorithm)
  const augment = (row: number, visitedCols: boolean[]): boolean => {
    for (let j = 0; j < n; j++) {
      if (C[row]![j] === 0 && !visitedCols[j]) {
        visitedCols[j] = true;
        if (colToRow[j] === -1 || augment(colToRow[j]!, visitedCols)) {
          rowToCol[row] = j;
          colToRow[j] = row;
          return true;
        }
      }
    }
    return false;
  };

  // Main loop: adjust cost matrix until all N rows are assigned.
  // Each outer iteration either terminates (all assigned) or adds at least one zero
  // to an uncovered position, guaranteeing progress. At most N adjustment phases
  // are needed, each taking O(N²) to find the min uncovered value → O(N³) total.
  for (let mainIter = 0; mainIter < n * n + n; mainIter++) {
    // Try to augment all unassigned rows
    for (let row = 0; row < n; row++) {
      /* v8 ignore start */
      if (rowToCol[row] === -1) {
        /* v8 ignore stop */
        const visited = new Array<boolean>(n).fill(false);
        augment(row, visited);
      }
    }

    if (rowToCol.every(v => v >= 0)) break;

    // Find minimum covering lines using König's theorem, then adjust
    // Mark: unassigned rows start as marked
    const markedRows = new Array<boolean>(n).fill(false);
    const markedCols = new Array<boolean>(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (rowToCol[i] === -1) markedRows[i] = true;
    }

    // Propagate marks alternately
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (!markedRows[i]) continue;
        for (let j = 0; j < n; j++) {
          if (C[i]![j] === 0 && !markedCols[j]) {
            markedCols[j] = true;
            changed = true;
          }
        }
      }
      for (let j = 0; j < n; j++) {
        if (!markedCols[j]) continue;
        const r = colToRow[j];
        if (r !== undefined && r >= 0 && !markedRows[r]) {
          markedRows[r] = true;
          changed = true;
        }
      }
    }

    // Minimum uncovered value: rows in markedRows, cols NOT in markedCols
    let minVal = Infinity;
    for (let i = 0; i < n; i++) {
      if (!markedRows[i]) continue;
      for (let j = 0; j < n; j++) {
        if (!markedCols[j]) {
          if (C[i]![j]! < minVal) minVal = C[i]![j]!;
        }
      }
    }

    /* v8 ignore start */
    if (!isFinite(minVal) || minVal === 0) break;
    /* v8 ignore stop */

    // Adjust: subtract from uncovered, add to doubly-covered
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (markedRows[i] && !markedCols[j]) C[i]![j]! -= minVal;
        if (!markedRows[i] && markedCols[j]) C[i]![j]! += minVal;
      }
    }

    // Reset assignment and retry
    rowToCol.fill(-1);
    colToRow.fill(-1);
  }

  return rowToCol;
}

/**
 * Optimal data association using the Hungarian algorithm.
 *
 * @param observations  - Blip observations at each time step.
 * @param initialTracks - Initial track states.
 * @returns Array of association steps.
 * @complexity O(T * N^3)
 */
export function hungarianFilter(
  observations: ReadonlyArray<ReadonlyArray<RadarBlip>>,
  initialTracks: ReadonlyArray<TrackState>,
): ReadonlyArray<NNAssociationStep> {
  const steps: NNAssociationStep[] = [];
  let currentTracks: TrackState[] = [...initialTracks];

  for (let t = 0; t < observations.length; t++) {
    const blips = observations[t]!;
    const time = t + 1;

    const predictions: TrackState[] = currentTracks.map(track => ({
      ...track,
      time,
      predictedPosition: track.truePosition,
    }));

    const n = Math.min(blips.length, predictions.length);
    let assignment: Array<{ blipId: number; objectId: number; distance: number }> = [];

    if (n > 0) {
      const cost: number[][] = [];
      for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
          row.push(euclideanDist(blips[i]!.position, predictions[j]!.predictedPosition));
        }
        cost.push(row);
      }
      const optAssign = hungarianAlgorithm(cost);
      assignment = Array.from({ length: n }, (_, blipIdx) => {
        const objIdx = optAssign[blipIdx]!;
        return {
          blipId: blips[blipIdx]!.id,
          objectId: predictions[objIdx]!.objectId,
          distance: euclideanDist(blips[blipIdx]!.position, predictions[objIdx]!.predictedPosition),
        };
      });
    }

    const updatedTracks: TrackState[] = predictions.map(pred => {
      const match = assignment.find(a => a.objectId === pred.objectId);
      if (!match) return pred;
      const blip = blips.find(b => b.id === match.blipId);
      /* v8 ignore start */
      if (!blip) return pred;
      /* v8 ignore stop */
      return { ...pred, truePosition: blip.position };
    });

    steps.push({
      time,
      blips,
      predictions,
      assignment,
      updatedTracks,
      action: `t=${time} [Hungarian]: Optimal assignment. ` +
        assignment.map(a => `Blip#${a.blipId}->Obj#${a.objectId}(d=${a.distance.toFixed(1)})`).join(', '),
    });

    currentTracks = updatedTracks;
  }

  return steps;
}

// ─── §18.4  Programs as Probability Models ───────────────────────────────────

/**
 * A single random choice in an execution trace (AIMA Section 18.4.2).
 */
export interface TraceChoice {
  /** Name of the random variable / step. */
  readonly name: string;
  /** The sampled value. */
  readonly value: number | string;
  /** Log-probability of this choice given the prior. */
  readonly logProb: number;
}

/**
 * A full execution trace of a generative program.
 */
export interface ExecutionTrace {
  /** All random choices made. */
  readonly choices: ReadonlyArray<TraceChoice>;
  /** Total log-probability: sum of all choice log-probs. */
  readonly logProb: number;
  /** Log-likelihood of the evidence given this trace. */
  readonly logLikelihood: number;
  /** The output produced by the trace (e.g., sampled letters). */
  readonly output: ReadonlyArray<string>;
}

/** Alphabet for letter generation. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUM_LETTERS = 26;

/**
 * Uniform distribution over 26 letters.
 */
export const UNIFORM_LETTER_PROBS: ReadonlyArray<number> = Array(NUM_LETTERS).fill(1 / NUM_LETTERS);

/**
 * Simple bigram-like letter probs: vowels follow consonants more often, and vice versa.
 * Returns a probability distribution over 26 letters given the previous letter index.
 *
 * @param prevLetterIdx - Index of the previous letter (0='a', ..., 25='z').
 * @returns Array of 26 transition probabilities.
 * @complexity O(1)
 */
export function bigramLetterProbs(prevLetterIdx: number): ReadonlyArray<number> {
  const VOWELS = new Set([0, 4, 8, 14, 20]); // a, e, i, o, u
  const isVowel = VOWELS.has(prevLetterIdx);
  const probs = new Array<number>(NUM_LETTERS).fill(0);
  for (let i = 0; i < NUM_LETTERS; i++) {
    if (isVowel) {
      probs[i] = VOWELS.has(i) ? 0.5 / VOWELS.size : 0.5 / (NUM_LETTERS - VOWELS.size);
    } else {
      probs[i] = VOWELS.has(i) ? 0.6 / VOWELS.size : 0.4 / (NUM_LETTERS - VOWELS.size);
    }
  }
  return probs;
}

/**
 * Generative program: GENERATE-LETTERS (AIMA Figure 18.11).
 * Samples a Poisson(lambda) number of letters uniformly.
 *
 * @param lambda - Expected number of letters.
 * @param rng    - PRNG function.
 * @returns Execution trace with choices and output (letter sequence).
 * @complexity O(lambda) expected
 */
export function generateLettersTrace(lambda: number, rng: () => number): ExecutionTrace {
  const choices: TraceChoice[] = [];

  const n = samplePoisson(lambda, rng);
  choices.push({ name: 'n', value: n, logProb: Math.log(poissonPMF(n, lambda)) });

  const letters: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = sampleCategorical([...UNIFORM_LETTER_PROBS], rng);
    const letter = ALPHABET[idx]!;
    letters.push(letter);
    choices.push({ name: `letter[${i + 1}]`, value: letter, logProb: Math.log(1 / NUM_LETTERS) });
  }

  const logProb = choices.reduce((s, c) => s + c.logProb, 0);
  return { choices, logProb, logLikelihood: 0, output: letters };
}

/**
 * Generative program: GENERATE-MARKOV-LETTERS (AIMA Figure 18.15).
 * Samples letters according to a bigram Markov model.
 *
 * @param lambda - Expected number of letters.
 * @param rng    - PRNG function.
 * @returns Execution trace.
 * @complexity O(lambda) expected
 */
export function generateMarkovLettersTrace(lambda: number, rng: () => number): ExecutionTrace {
  const choices: TraceChoice[] = [];

  const n = samplePoisson(lambda, rng);
  choices.push({ name: 'n', value: n, logProb: Math.log(poissonPMF(n, lambda)) });

  const letters: string[] = [];
  let prevIdx = -1;
  for (let i = 0; i < n; i++) {
    const probs = prevIdx < 0 ? [...UNIFORM_LETTER_PROBS] : [...bigramLetterProbs(prevIdx)];
    const idx = sampleCategorical(probs, rng);
    const letter = ALPHABET[idx]!;
    letters.push(letter);
    choices.push({ name: `letter[${i + 1}]`, value: letter, logProb: Math.log(probs[idx]!) });
    prevIdx = idx;
  }

  const logProb = choices.reduce((s, c) => s + c.logProb, 0);
  return { choices, logProb, logLikelihood: 0, output: letters };
}

/**
 * Computes the log-likelihood of observed letters given a noisy observation model.
 * Each observed letter matches the true letter with probability (1 - noiseRate),
 * and is any other letter with probability noiseRate / (NUM_LETTERS - 1).
 *
 * @param observed   - Observed (possibly noisy) letter sequence.
 * @param generated  - Generated letter sequence from the program.
 * @param noiseRate  - Probability of a single letter being corrupted.
 * @returns Log-likelihood of the evidence.
 * @complexity O(min(|observed|, |generated|))
 */
export function letterLogLikelihood(
  observed: ReadonlyArray<string>,
  generated: ReadonlyArray<string>,
  noiseRate: number,
): number {
  if (generated.length === 0 || observed.length === 0) return -Infinity;
  if (generated.length !== observed.length) return -Infinity;
  let ll = 0;
  for (let i = 0; i < observed.length; i++) {
    const p = observed[i] === generated[i]
      ? 1 - noiseRate
      : noiseRate / (NUM_LETTERS - 1);
    ll += Math.log(Math.max(p, 1e-15));
  }
  return ll;
}

/**
 * Rejection sampling for a generative program (AIMA Section 18.4.5).
 * Generates traces until one matches the evidence exactly.
 *
 * @param lambda       - Expected number of letters.
 * @param evidence     - The observed letter sequence to match.
 * @param maxTrials    - Maximum number of rejection attempts.
 * @param useMarkov    - Whether to use the Markov model.
 * @param rng          - PRNG function.
 * @returns Accepted traces and total trials.
 * @complexity O(maxTrials * lambda) expected
 */
export function rejectionSampling(
  lambda: number,
  evidence: ReadonlyArray<string>,
  maxTrials: number,
  useMarkov: boolean,
  rng: () => number,
): { accepted: ReadonlyArray<ExecutionTrace>; totalTrials: number } {
  const accepted: ExecutionTrace[] = [];
  let trials = 0;
  for (let i = 0; i < maxTrials; i++) {
    trials++;
    const trace = useMarkov
      ? generateMarkovLettersTrace(lambda, rng)
      : generateLettersTrace(lambda, rng);
    if (trace.output.length === evidence.length &&
        trace.output.every((l, j) => l === evidence[j])) {
      accepted.push({ ...trace, logLikelihood: 0 });
    }
  }
  return { accepted, totalTrials: trials };
}

/**
 * Likelihood weighting for a generative program (AIMA Section 18.4.5).
 * Each generated trace is kept but weighted by P(evidence | trace).
 *
 * @param lambda       - Expected number of letters.
 * @param evidence     - The observed letter sequence.
 * @param numSamples   - Number of weighted samples to generate.
 * @param noiseRate    - Noise rate for the observation model.
 * @param useMarkov    - Whether to use the Markov model.
 * @param rng          - PRNG function.
 * @returns Array of (trace, log-weight) pairs.
 * @complexity O(numSamples * lambda) expected
 */
export function likelihoodWeighting(
  lambda: number,
  evidence: ReadonlyArray<string>,
  numSamples: number,
  noiseRate: number,
  useMarkov: boolean,
  rng: () => number,
): ReadonlyArray<{ trace: ExecutionTrace; logWeight: number }> {
  const results: Array<{ trace: ExecutionTrace; logWeight: number }> = [];
  for (let i = 0; i < numSamples; i++) {
    const trace = useMarkov
      ? generateMarkovLettersTrace(lambda, rng)
      : generateLettersTrace(lambda, rng);
    const ll = letterLogLikelihood(evidence, trace.output, noiseRate);
    results.push({ trace: { ...trace, logLikelihood: ll }, logWeight: ll });
  }
  return results;
}

/**
 * A single MCMC step on execution traces (Metropolis-Hastings).
 * Proposal: regenerate a fresh trace from the prior.
 *
 * @param current   - Current execution trace.
 * @param evidence  - Observed letters.
 * @param noiseRate - Observation noise rate.
 * @param lambda    - Expected number of letters.
 * @param useMarkov - Whether to use the Markov model.
 * @param rng       - PRNG function.
 * @returns The next trace (accepted proposal or same current) and acceptance flag.
 * @complexity O(lambda) expected
 */
export function mcmcStep(
  current: ExecutionTrace,
  evidence: ReadonlyArray<string>,
  noiseRate: number,
  lambda: number,
  useMarkov: boolean,
  rng: () => number,
): { next: ExecutionTrace; accepted: boolean } {
  const proposed = useMarkov
    ? generateMarkovLettersTrace(lambda, rng)
    : generateLettersTrace(lambda, rng);

  const currentLL = letterLogLikelihood(evidence, current.output, noiseRate);
  const proposedLL = letterLogLikelihood(evidence, proposed.output, noiseRate);

  // Metropolis-Hastings acceptance ratio (log space)
  const logAlpha = (proposedLL + proposed.logProb) - (currentLL + current.logProb);
  const accepted = Math.log(rng()) < logAlpha;

  const nextTrace = accepted
    ? { ...proposed, logLikelihood: proposedLL }
    : { ...current, logLikelihood: currentLL };

  return { next: nextTrace, accepted };
}

/**
 * Runs MCMC for a generative program over a number of iterations (AIMA Section 18.4.5).
 *
 * @param lambda     - Expected number of letters.
 * @param evidence   - Observed letter sequence.
 * @param numIter    - Number of MCMC iterations.
 * @param noiseRate  - Observation noise rate.
 * @param useMarkov  - Whether to use the Markov model.
 * @param rng        - PRNG function.
 * @returns Array of {trace, accepted} records per iteration.
 * @complexity O(numIter * lambda) expected
 */
export function runMCMC(
  lambda: number,
  evidence: ReadonlyArray<string>,
  numIter: number,
  noiseRate: number,
  useMarkov: boolean,
  rng: () => number,
): ReadonlyArray<{ trace: ExecutionTrace; accepted: boolean; iteration: number }> {
  const results: Array<{ trace: ExecutionTrace; accepted: boolean; iteration: number }> = [];

  let current = useMarkov
    ? generateMarkovLettersTrace(lambda, rng)
    : generateLettersTrace(lambda, rng);
  const initLL = letterLogLikelihood(evidence, current.output, noiseRate);
  current = { ...current, logLikelihood: initLL };
  results.push({ trace: current, accepted: true, iteration: 0 });

  for (let i = 1; i <= numIter; i++) {
    const { next, accepted } = mcmcStep(current, evidence, noiseRate, lambda, useMarkov, rng);
    results.push({ trace: next, accepted, iteration: i });
    current = next;
  }

  return results;
}

/**
 * Computes a frequency histogram of output lengths from a set of traces.
 *
 * @param traces - Array of execution traces.
 * @returns Map from output length to count.
 * @complexity O(N)
 */
export function outputLengthHistogram(
  traces: ReadonlyArray<ExecutionTrace>,
): ReadonlyMap<number, number> {
  const hist = new Map<number, number>();
  for (const t of traces) {
    const len = t.output.length;
    hist.set(len, (hist.get(len) ?? 0) + 1);
  }
  return hist;
}

/**
 * Normalizes an array of log-weights to a proper probability distribution.
 *
 * @param logWeights - Array of log-weight values.
 * @returns Normalized probability array.
 * @complexity O(N)
 */
export function normalizeLogWeights(logWeights: ReadonlyArray<number>): ReadonlyArray<number> {
  const valid = logWeights.filter(w => isFinite(w));
  if (valid.length === 0) return logWeights.map(() => 0);
  const maxW = Math.max(...valid);
  const expW = logWeights.map(w => (isFinite(w) ? Math.exp(w - maxW) : 0));
  const sum = expW.reduce((a, b) => a + b, 0);
  /* v8 ignore start */
  if (sum === 0) return expW;
  /* v8 ignore stop */
  return expW.map(w => w / sum);
}
