/** Generic step record for algorithm playback. */
export interface AlgorithmStep {
  /** Human-readable description of the action taken at this step. */
  action: string;
  /** Arbitrary state snapshot for the state inspection panel. */
  state: Readonly<Record<string, unknown>>;
}

/** Manifest section descriptor. */
export interface ManifestSection {
  id: string;
  title: string;
  status: 'planned' | 'in-progress' | 'complete';
}

/** Complexity class identifiers for Big-O analysis (Appendix A.1). */
export type ComplexityClass =
  | 'constant'
  | 'logarithmic'
  | 'linear'
  | 'linearithmic'
  | 'quadratic'
  | 'cubic'
  | 'exponential'
  | 'factorial';

/** Result of a Big-O constant search. */
export interface BigOConstants {
  c: number;
  n0: number;
}

/** A 2×2 matrix represented as a nested tuple. */
export type Matrix2x2 = [[number, number], [number, number]];

/** A 2D point represented as a 2-element tuple. */
export type Point2D = [number, number];

/** A complex number with real and imaginary parts. */
export interface ComplexNumber {
  real: number;
  imag: number;
}
