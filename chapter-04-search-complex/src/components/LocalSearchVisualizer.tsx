import { useState, useEffect, useRef, useMemo } from 'react';
import 'katex/dist/katex.min.css';
import {
  hillClimbing,
  simulatedAnnealing,
  geneticAlgorithm,
  type HillClimbingStep,
  type SimulatedAnnealingStep,
  type GeneticAlgorithmStep,
} from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

// ─── Predefined datasets ─────────────────────────────────────────────────────

const DEFAULT_LANDSCAPE = [2, 4, 3, 7, 5, 8, 6, 9, 4, 3, 6, 8, 7, 5, 2];
const INITIAL_POSITION = 0;

const SA_SCHEDULE = [10, 8, 5, 3, 2, 1, 0.8, 0.5, 0.3, 0.1, 0.05, 0.01];
const SA_NEIGHBORS = [2, 5, 8, 6, 9, 7, 11, 10, 13, 12, 14, 13];

const GA_POPULATION = [
  [1, 0, 1, 0],
  [0, 1, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 1],
  [1, 0, 0, 1],
  [0, 1, 0, 0],
];
const GA_FITNESS = (genes: ReadonlyArray<number>) =>
  genes.reduce((sum, g) => sum + g, 0);
const GA_CROSSOVER_POINTS = [2, 1, 3, 2];
const GA_MUTATION_MASKS = [
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 1],
];
const GA_GENERATIONS = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AlgorithmType = 'hill-climbing' | 'simulated-annealing' | 'genetic-algorithm';

const MAX_LANDSCAPE = Math.max(...DEFAULT_LANDSCAPE);

const ALGO_TABS: { id: AlgorithmType; label: string }[] = [
  { id: 'hill-climbing', label: 'Hill Climbing' },
  { id: 'simulated-annealing', label: 'Simulated Annealing' },
  { id: 'genetic-algorithm', label: 'Genetic Algorithm' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#1A1A24' : '#242430',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        color: disabled ? '#4B5563' : '#E5E7EB',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '16px',
        height: '36px',
        minWidth: '36px',
        padding: '0 10px',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function LandscapeChart({
  landscape,
  currentX,
  isMax,
}: {
  landscape: ReadonlyArray<number>;
  currentX: number;
  isMax: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Discrete landscape with ${landscape.length} positions. Current position is index ${currentX} with value ${landscape[currentX]}.`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '3px',
        height: '180px',
        padding: '0 4px 8px',
      }}
    >
      {landscape.map((value, idx) => {
        const isActive = idx === currentX;
        const barColor = isActive ? (isMax ? '#10B981' : '#3B82F6') : '#4B5563';
        return (
          <div
            key={idx}
            title={`x=${idx}, value=${value}`}
            style={{
              flex: 1,
              height: `${(value / MAX_LANDSCAPE) * 100}%`,
              background: barColor,
              borderRadius: '3px 3px 0 0',
              transition: 'background 0.2s',
              minHeight: '4px',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LocalSearchVisualizer(): JSX.Element {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>('hill-climbing');
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5); // steps per second

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Pre-compute all steps
  const hcSteps = useMemo(
    () => hillClimbing(DEFAULT_LANDSCAPE, INITIAL_POSITION),
    [],
  );
  const saSteps = useMemo(
    () => simulatedAnnealing(DEFAULT_LANDSCAPE, INITIAL_POSITION, SA_SCHEDULE, SA_NEIGHBORS),
    [],
  );
  const gaSteps = useMemo(
    () =>
      geneticAlgorithm(GA_POPULATION, GA_FITNESS, GA_CROSSOVER_POINTS, GA_MUTATION_MASKS, GA_GENERATIONS),
    [],
  );

  const steps =
    selectedAlgo === 'hill-climbing'
      ? hcSteps
      : selectedAlgo === 'simulated-annealing'
        ? saSteps
        : gaSteps;

  const totalSteps = steps.length;
  const clampedIndex = Math.min(stepIndex, totalSteps - 1);

  // Reset step index when switching algorithms
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [selectedAlgo]);

  // RAF-based animation loop
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = 0;
    const interval = 1000 / speed;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, speed, totalSteps, prefersReducedMotion]);

  // Controls
  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    setStepIndex(prev => Math.max(0, prev - 1));
  };
  const handlePlayPause = () => {
    if (clampedIndex >= totalSteps - 1) {
      setStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    setStepIndex(prev => Math.min(totalSteps - 1, prev + 1));
  };

  // Current step data per algorithm
  const hcStep = hcSteps[clampedIndex] as HillClimbingStep | undefined;
  const saStep = saSteps[clampedIndex] as SimulatedAnnealingStep | undefined;
  const gaStep = gaSteps[clampedIndex] as GeneticAlgorithmStep | undefined;

  const landscapeX =
    selectedAlgo === 'hill-climbing'
      ? (hcStep?.currentX ?? 0)
      : selectedAlgo === 'simulated-annealing'
        ? (saStep?.currentX ?? 0)
        : 0;

  const isLocalMax =
    selectedAlgo === 'hill-climbing'
      ? hcStep?.moved === 'none'
      : selectedAlgo === 'simulated-annealing'
        ? clampedIndex === totalSteps - 1
        : false;

  // Helper: color and formatted text for a deltaE value
  function deltaEDisplay(deltaE: number): { color: string; text: string } {
    const color = deltaE > 0 ? '#10B981' : deltaE < 0 ? '#EF4444' : '#9CA3AF';
    const text = `${deltaE > 0 ? '+' : ''}${deltaE.toFixed(2)}`;
    return { color, text };
  }

  // Derived status label
  function getStatusLabel(): string {
    if (selectedAlgo === 'hill-climbing') {
      if (!hcStep) return '';
      if (hcStep.moved === 'none') return 'Local maximum reached';
      if (hcStep.moved === 'left') return 'Moving left';
      return 'Moving right';
    }
    if (selectedAlgo === 'simulated-annealing') {
      if (!saStep) return '';
      const deltaStr = `ΔE = ${saStep.deltaE.toFixed(2)}`;
      return saStep.accepted ? `Accepted (${deltaStr})` : `Rejected (${deltaStr})`;
    }
    if (!gaStep) return '';
    return gaStep.generation === 0 ? 'Initial population' : `Generation ${gaStep.generation}`;
  }

  const formulaHtml = renderDisplayMath(
    String.raw`x \leftarrow \arg\max_{x' \in \text{neighbors}(x)} f(x')`,
  );

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '780px',
    margin: '0 auto',
  };

  const controlBtnRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '2px',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#E5E7EB',
  };

  return (
    <div style={cardStyle}>
      {/* Title */}
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
        Local Search Visualizer
      </h2>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '20px', lineHeight: 1.5 }}>
        Explore hill climbing, simulated annealing, and genetic algorithms — each navigating a discrete landscape without a fixed goal state.
      </p>

      {/* Algorithm tabs */}
      <div
        role="tablist"
        aria-label="Algorithm selector"
        style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}
      >
        {ALGO_TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selectedAlgo === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setSelectedAlgo(tab.id)}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: selectedAlgo === tab.id
                ? '1px solid #3B82F6'
                : '1px solid rgba(255,255,255,0.10)',
              background: selectedAlgo === tab.id ? '#1D3A6D' : 'transparent',
              color: selectedAlgo === tab.id ? '#93C5FD' : '#9CA3AF',
              fontSize: '13px',
              fontWeight: selectedAlgo === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Landscape bar chart (HC + SA) */}
      {selectedAlgo !== 'genetic-algorithm' && (
        <div
          id={`panel-${selectedAlgo}`}
          role="tabpanel"
          aria-label={`${selectedAlgo} visualization`}
          style={{
            background: '#0A0A0F',
            borderRadius: '10px',
            padding: '12px 12px 0',
            marginBottom: '16px',
          }}
        >
          <LandscapeChart
            landscape={DEFAULT_LANDSCAPE}
            currentX={landscapeX}
            isMax={isLocalMax}
          />
        </div>
      )}

      {/* GA Population grid */}
      {selectedAlgo === 'genetic-algorithm' && gaStep && (
        <div
          id="panel-genetic-algorithm"
          role="tabpanel"
          aria-label="Genetic algorithm population"
          style={{
            background: '#0A0A0F',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6B7280' }}>
            Generation {gaStep.generation} — Population
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {gaStep.population.map((ind, i) => {
              const isBest = ind.fitness === gaStep.bestIndividual.fitness;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {ind.genes.map((g, j) => (
                      <span
                        key={j}
                        style={{
                          display: 'inline-block',
                          width: '22px',
                          height: '22px',
                          lineHeight: '22px',
                          textAlign: 'center',
                          borderRadius: '4px',
                          background: g === 1 ? '#3B82F6' : '#1A1A24',
                          color: g === 1 ? 'white' : '#4B5563',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    fitness: {ind.fitness}
                  </span>
                  {isBest && (
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                      ★ best
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={controlBtnRowStyle}>
        <ControlButton label="Reset" onClick={handleReset} disabled={clampedIndex === 0 && !isPlaying}>
          ⏮
        </ControlButton>
        <ControlButton label="Step backward" onClick={handleStepBack} disabled={clampedIndex === 0}>
          ◀
        </ControlButton>
        <ControlButton
          label={isPlaying ? 'Pause' : 'Play'}
          onClick={handlePlayPause}
          disabled={prefersReducedMotion}
        >
          {isPlaying ? '⏸' : '▶'}
        </ControlButton>
        <ControlButton
          label="Step forward"
          onClick={handleStepForward}
          disabled={clampedIndex >= totalSteps - 1}
        >
          ⏩
        </ControlButton>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#9CA3AF',
            marginLeft: '4px',
          }}
        >
          Speed
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={speed}
            aria-label="Playback speed"
            onChange={e => setSpeed(Number(e.target.value))}
            style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', minWidth: '32px' }}>{speed}×</span>
        </label>

        {prefersReducedMotion && (
          <span style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
            (auto-play disabled: reduced motion)
          </span>
        )}
      </div>

      {/* State inspection panel */}
      <div
        style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: '#0A0A0F',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Step counter always shown */}
        <div>
          <div style={statLabelStyle}>Step</div>
          <div style={statValueStyle}>
            {clampedIndex + 1} / {totalSteps}
          </div>
        </div>

        {/* HC state */}
        {selectedAlgo === 'hill-climbing' && hcStep && (
          <>
            <div>
              <div style={statLabelStyle}>Position (x)</div>
              <div style={statValueStyle}>{hcStep.currentX}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Value f(x)</div>
              <div style={statValueStyle}>{hcStep.currentValue}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Status</div>
              <div style={{ ...statValueStyle, color: isLocalMax ? '#10B981' : '#93C5FD', fontSize: '13px' }}>
                {getStatusLabel()}
              </div>
            </div>
          </>
        )}

        {/* SA state */}
        {selectedAlgo === 'simulated-annealing' && saStep && (
          <>
            <div>
              <div style={statLabelStyle}>Position (x)</div>
              <div style={statValueStyle}>{saStep.currentX}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Temperature</div>
              <div style={statValueStyle}>{saStep.temperature.toFixed(2)}</div>
            </div>
            <div>
              <div style={statLabelStyle}>ΔE</div>
              <div style={{ ...statValueStyle, color: deltaEDisplay(saStep.deltaE).color }}>
                {deltaEDisplay(saStep.deltaE).text}
              </div>
            </div>
            <div>
              <div style={statLabelStyle}>Probability</div>
              <div style={statValueStyle}>{saStep.probability.toFixed(3)}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Decision</div>
              <div style={{ ...statValueStyle, color: saStep.accepted ? '#10B981' : '#EF4444', fontSize: '13px' }}>
                {saStep.accepted ? 'Accepted' : 'Rejected'}
              </div>
            </div>
          </>
        )}

        {/* GA state */}
        {selectedAlgo === 'genetic-algorithm' && gaStep && (
          <>
            <div>
              <div style={statLabelStyle}>Generation</div>
              <div style={statValueStyle}>{gaStep.generation}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Pop size</div>
              <div style={statValueStyle}>{gaStep.population.length}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Best fitness</div>
              <div style={{ ...statValueStyle, color: '#10B981' }}>
                {gaStep.bestIndividual.fitness}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action description */}
      <div style={{
        marginTop: '10px',
        fontSize: '13px',
        color: '#6B7280',
        minHeight: '20px',
        fontStyle: 'italic',
      }}>
        {steps[clampedIndex]?.action}
      </div>

      {/* KaTeX formula (HC only) */}
      {selectedAlgo === 'hill-climbing' && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
            Update rule:
          </div>
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
            style={{ color: '#D1D5DB', overflowX: 'auto' }}
          />
        </div>
      )}
    </div>
  );
}
