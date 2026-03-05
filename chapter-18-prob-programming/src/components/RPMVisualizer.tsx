import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';
import {
  groundRPM,
  sampleRPMWorld,
  mulberry32,
  type RPMCustomer,
  type RPMBook,
  type RPMVariable,
  type RPMGroundingStep,
  type RPMWorld,
} from '../algorithms';

const COLOR = '#EC4899';

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}

interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  playing: boolean;
  speed: number;
  color: string;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function PlaybackControls({
  currentStep,
  totalSteps,
  playing,
  speed,
  color,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <button
        onClick={onReset}
        aria-label="Reset to beginning"
        title="Reset"
        style={btnStyle('#6B7280')}
      >
        ⏮
      </button>
      <button
        onClick={onStepBack}
        disabled={currentStep <= 0}
        aria-label="Step backward"
        title="Step back"
        style={btnStyle(color, currentStep <= 0)}
      >
        ◀
      </button>
      <button
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
        style={btnStyle(color)}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1}
        aria-label="Step forward"
        title="Step forward"
        style={btnStyle(color, currentStep >= totalSteps - 1)}
      >
        ▶
      </button>
      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'rgba(255,255,255,0.15)',
          margin: '0 4px',
        }}
      />
      <label
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}
      >
        Speed:
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          aria-label="Animation speed"
          style={{ accentColor: color, width: '80px' }}
        />
        <span style={{ color: 'white', minWidth: '28px' }}>{speed}x</span>
      </label>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : color + '22',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color + '44'}`,
    color: disabled ? '#4B5563' : color,
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    opacity: disabled ? 0.5 : 1,
  };
}

function StateField({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ background: '#111118', borderRadius: '8px', padding: '8px 12px' }}>
      <div
        style={{
          fontSize: '11px',
          color: '#6B7280',
          marginBottom: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: color,
          fontWeight: 600,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const CUSTOMER_HONEST_PROBS: Record<string, number> = { C1: 0.9, C2: 0.6, C3: 0.3 };

const makeCustomers = (n: number): RPMCustomer[] => {
  const names = ['C1', 'C2', 'C3'];
  return names.slice(0, n).map(id => ({
    id,
    honestProb: CUSTOMER_HONEST_PROBS[id] ?? 0.5,
    kindnessPrior: [0.05, 0.15, 0.3, 0.35, 0.15],
  }));
};

const makeBooks = (n: number): RPMBook[] => {
  const names = ['B1', 'B2'];
  return names.slice(0, n).map(id => ({
    id,
    qualityPrior: [0.05, 0.2, 0.4, 0.2, 0.15],
  }));
};

const nodeColors: Record<string, string> = {
  Quality: '#3B82F6',
  Honest: '#10B981',
  Kindness: '#F59E0B',
  Recommendation: '#EC4899',
};

export function RPMVisualizer() {
  const [numCustomers, setNumCustomers] = useState(2);
  const [numBooks, setNumBooks] = useState(2);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sampleWorld, setSampleWorld] = useState<RPMWorld | null>(null);
  const [sampleSeed, setSampleSeed] = useState(42);

  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const customers = useMemo(() => makeCustomers(numCustomers), [numCustomers]);
  const books = useMemo(() => makeBooks(numBooks), [numBooks]);
  const steps = useMemo<ReadonlyArray<RPMGroundingStep>>(
    () => groundRPM(customers, books),
    [customers, books],
  );

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const tick = useCallback(
    (ts: number) => {
      const delay = 1000 / speedRef.current;
      if (ts - lastTimeRef.current >= delay) {
        lastTimeRef.current = ts;
        setCurrentStep(s => {
          if (s >= steps.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [steps.length],
  );

  useEffect(() => {
    if (playing && !prefersReduced) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, tick, prefersReduced]);

  useEffect(() => {
    setCurrentStep(0);
    setPlaying(false);
    setSampleWorld(null);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [numCustomers, numBooks]);

  const visibleVars = steps[currentStep]?.groundedVariables ?? [];
  const currentVar = steps[currentStep]?.variable ?? null;

  function handleSampleWorld() {
    const rng = mulberry32(sampleSeed);
    setSampleWorld(sampleRPMWorld(customers, books, rng));
    setSampleSeed(s => s + 1);
  }

  function getNodePosition(v: RPMVariable): { x: number; y: number } {
    const W = 600;
    const bookSpacing = W / (numBooks + 1);
    const custSpacing = W / (numCustomers + 1);

    if (v.type === 'Quality') {
      const bIdx = books.findIndex(b => b.id === v.bookId);
      return { x: bookSpacing * (bIdx + 1), y: 40 };
    }
    if (v.type === 'Honest') {
      const cIdx = customers.findIndex(c => c.id === v.customerId);
      return { x: custSpacing * (cIdx + 1) - 20, y: 150 };
    }
    if (v.type === 'Kindness') {
      const cIdx = customers.findIndex(c => c.id === v.customerId);
      return { x: custSpacing * (cIdx + 1) + 20, y: 200 };
    }
    // Recommendation
    const cIdx = customers.findIndex(c => c.id === v.customerId);
    const bIdx = books.findIndex(b => b.id === v.bookId);
    return {
      x: (custSpacing * (cIdx + 1) + bookSpacing * (bIdx + 1)) / 2,
      y: 310,
    };
  }

  const totalVars = numCustomers * (2 + numBooks) + numBooks;

  const visibleNames = new Set(visibleVars.map(v => v.name));
  const edges: Array<{ from: RPMVariable; to: RPMVariable }> = [];
  for (const v of visibleVars) {
    for (const pName of v.parents) {
      const parent = visibleVars.find(p => p.name === pName);
      if (parent && visibleNames.has(pName)) {
        edges.push({ from: parent, to: v });
      }
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <h3
          style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}
        >
          §18.1 Relational Probability Models
        </h3>
        <p
          style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}
        >
          A Relational Probability Model (RPM) is like a template for a Bayesian network. Instead
          of specifying variables by hand, you write dependency rules with logical variables (like
          ∀c,b: Recommendation(c,b) depends on Honest(c), Kindness(c), Quality(b)). The{' '}
          <strong style={{ color: '#E5E7EB' }}>grounding process</strong> instantiates these rules
          for specific customers and books.
        </p>
        <MathBlock
          latex="Recommendation(c, b) \sim \text{RecCPT}(Honest(c),\ Kindness(c),\ Quality(b))"
        />
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}
        >
          {Object.entries(nodeColors).map(([type, color]) => (
            <span
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#9CA3AF',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                }}
              />
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Config controls */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#9CA3AF' }}
        >
          Customers (C):
          <input
            type="range"
            min={1}
            max={3}
            value={numCustomers}
            onChange={e => setNumCustomers(Number(e.target.value))}
            aria-label="Number of customers"
            style={{ accentColor: COLOR }}
          />
          <span style={{ color: 'white', minWidth: '16px' }}>{numCustomers}</span>
        </label>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#9CA3AF' }}
        >
          Books (B):
          <input
            type="range"
            min={1}
            max={2}
            value={numBooks}
            onChange={e => setNumBooks(Number(e.target.value))}
            aria-label="Number of books"
            style={{ accentColor: COLOR }}
          />
          <span style={{ color: 'white', minWidth: '16px' }}>{numBooks}</span>
        </label>
        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
          Total variables: <strong style={{ color: 'white' }}>{totalVars}</strong>
          {' = '}
          <InlineMath
            latex={`${numBooks} + ${numCustomers}(${numBooks}+2) = ${numBooks} + ${numCustomers} \\times ${numBooks + 2}`}
          />
        </span>
      </div>

      {/* Main visualization */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
        }}
      >
        <svg
          width="100%"
          viewBox="0 0 600 380"
          style={{ display: 'block', marginBottom: '12px', maxWidth: '100%' }}
          aria-label="Bayesian network graph being constructed"
          role="img"
        >
          <defs>
            <marker
              id="rpm-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const from = getNodePosition(e.from);
            const to = getNodePosition(e.to);
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.5}
                markerEnd="url(#rpm-arrow)"
              />
            );
          })}
          {visibleVars.map(v => {
            const pos = getNodePosition(v);
            const col = nodeColors[v.type] ?? '#888';
            const isNew = v.name === currentVar?.name;
            const sampleVal = sampleWorld?.assignments[v.name];
            return (
              <g
                key={v.name}
                role="img"
                aria-label={`${v.name}${sampleVal !== undefined ? ` = ${sampleVal}` : ''}`}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isNew ? 22 : 18}
                  fill={col + '33'}
                  stroke={isNew ? col : col + '88'}
                  strokeWidth={isNew ? 2.5 : 1.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight={isNew ? 700 : 400}
                >
                  {v.name.length > 12 ? v.name.slice(0, 11) + '…' : v.name}
                </text>
                {sampleVal !== undefined && (
                  <text
                    x={pos.x}
                    y={pos.y + 32}
                    textAnchor="middle"
                    fontSize="11"
                    fill={col}
                    fontWeight={700}
                  >
                    {String(sampleVal)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <PlaybackControls
          currentStep={currentStep}
          totalSteps={steps.length}
          playing={playing}
          speed={speed}
          color={COLOR}
          onPlay={() => {
            if (currentStep >= steps.length - 1) setCurrentStep(0);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onStepForward={() => setCurrentStep(s => Math.min(s + 1, steps.length - 1))}
          onStepBack={() => setCurrentStep(s => Math.max(s - 1, 0))}
          onReset={() => {
            setCurrentStep(0);
            setPlaying(false);
            setSampleWorld(null);
          }}
          onSpeedChange={setSpeed}
        />

        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleSampleWorld}
            aria-label="Sample a world from the RPM"
            style={{
              background: COLOR + '22',
              border: `1px solid ${COLOR}66`,
              color: COLOR,
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            🎲 Sample World
          </button>
          {sampleWorld && (
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Log P(world) = {sampleWorld.logProb.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* State panel */}
      <div
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#9CA3AF',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          State Inspection
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <StateField label="Step" value={`${currentStep + 1} / ${steps.length}`} color={COLOR} />
          <StateField label="Variables Added" value={String(visibleVars.length)} color={COLOR} />
          <StateField
            label="Current Variable"
            value={currentVar?.name ?? '—'}
            color={currentVar ? (nodeColors[currentVar.type] ?? COLOR) : '#666'}
          />
          <StateField label="Type" value={currentVar?.type ?? '—'} color={COLOR} />
          <StateField
            label="Parents"
            value={currentVar?.parents.join(', ') || '(none)'}
            color={COLOR}
          />
        </div>
        {steps[currentStep] && (
          <div
            style={{ marginTop: '10px', fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}
          >
            {steps[currentStep]!.action}
          </div>
        )}
      </div>
    </div>
  );
}
