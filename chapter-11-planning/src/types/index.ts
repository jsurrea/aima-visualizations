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
