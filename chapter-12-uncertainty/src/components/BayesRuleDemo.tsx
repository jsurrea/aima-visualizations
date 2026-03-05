import React, { useState, useEffect, useRef } from 'react';
// No algorithm imports needed — conditional independence values computed directly from joint distribution
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';

// Joint distribution values (Cavity/Toothache/Catch) from §12.3 Fig 12.3
const P_CAVITY = 0.2;
const P_CAVITY_TOOTH_CATCH = 0.108;
const P_CAVITY_TOOTH_NOCATCH = 0.012;
const P_CAVITY_NOTOOTH_CATCH = 0.072;

interface Step {
  title: string;
  latex: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: 'Prior Probability',
    latex: 'P(M) = \\dfrac{1}{50000} = 0.00002',
    description: 'Prior probability of meningitis: very rare disease',
  },
  {
    title: 'Likelihood',
    latex: 'P(S \\mid M) = 0.7',
    description: 'Probability of stiff neck given meningitis',
  },
  {
    title: 'Evidence Probability',
    latex: 'P(S) = 0.01',
    description: 'Overall probability of having a stiff neck',
  },
  {
    title: "Bayes' Formula",
    latex: "P(M \\mid S) = \\dfrac{P(S \\mid M) \\cdot P(M)}{P(S)} = \\dfrac{0.7 \\times 0.00002}{0.01}",
    description: "Applying Bayes' rule to compute the posterior",
  },
  {
    title: 'Posterior Probability',
    latex: 'P(M \\mid S) = 0.0014',
    description: 'Updated probability of meningitis given stiff neck observation',
  },
];

const KNOWN_VALUES: Array<[string, string]> = [
  ['P(M)', '0.00002'],
  ['P(S|M)', '0.7'],
  ['P(S)', '0.01'],
  ['P(M|S)', '0.0014'],
];

export default function BayesRuleDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => {
    if (!playing || prefersReduced) return;
    const delay = 6000 / speed;
    timerRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        setCurrentStep(prev => {
          if (prev >= STEPS.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      });
    }, delay);
    return clearTimer;
  }, [playing, currentStep, speed, prefersReduced]);

  const handlePlay = () => setPlaying(p => !p);
  const handleNext = () => { clearTimer(); setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1)); };
  const handleBack = () => { clearTimer(); setPlaying(false); setCurrentStep(prev => Math.max(prev - 1, 0)); };
  const handleReset = () => { clearTimer(); setPlaying(false); setCurrentStep(0); };

  // Conditional independence verification using joint distribution values
  // P(T∧C|cavity) = P(cavity,T,C)/P(cavity)
  const pToothacheAndCatchGivenCavity = P_CAVITY_TOOTH_CATCH / P_CAVITY;
  const pToothacheGivenCavity = (P_CAVITY_TOOTH_CATCH + P_CAVITY_TOOTH_NOCATCH) / P_CAVITY;
  const pCatchGivenCavity = (P_CAVITY_TOOTH_CATCH + P_CAVITY_NOTOOTH_CATCH) / P_CAVITY;

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${active ? CHAPTER_COLOR : 'var(--surface-border)'}`,
    background: active ? `rgba(236,72,153,0.15)` : 'var(--surface-3)',
    color: active ? CHAPTER_COLOR : '#E5E7EB',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  });

  return (
    <div role="region" aria-label="§12.5 Bayes' Rule Demo" style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: '#F9FAFB' }}>
        §12.5 Bayes&apos; Rule Demo
      </h2>
      <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
        Step-by-step: P(Meningitis | Stiff neck) using the meningitis example from the book
      </p>

      {/* Progress bar */}
      <div style={{ background: 'var(--surface-3)', borderRadius: '999px', height: '6px', marginBottom: '20px', overflow: 'hidden' }} role="progressbar" aria-valuenow={currentStep} aria-valuemin={0} aria-valuemax={STEPS.length - 1}>
        <div style={{
          height: '100%', background: CHAPTER_COLOR, borderRadius: '999px',
          width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
          transition: prefersReduced ? 'none' : 'width 0.4s ease',
        }} />
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', overflowX: 'auto' }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => { clearTimer(); setPlaying(false); setCurrentStep(i); }}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            aria-current={i === currentStep ? 'step' : undefined}
            style={{
              flex: '0 0 auto', padding: '4px 10px', borderRadius: '20px', border: 'none',
              background: i === currentStep ? CHAPTER_COLOR : i < currentStep ? 'rgba(236,72,153,0.3)' : 'var(--surface-3)',
              color: i <= currentStep ? '#fff' : '#6B7280', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Step card */}
      <div style={{ ...cardStyle, border: `1px solid rgba(236,72,153,0.3)`, background: 'rgba(236,72,153,0.05)', minHeight: '160px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: CHAPTER_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Step {currentStep + 1} / {STEPS.length}
        </div>
        {STEPS[currentStep] !== undefined && (
          <>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F9FAFB', marginBottom: '12px' }}>
              {STEPS[currentStep].title}
            </div>
            <div dangerouslySetInnerHTML={{ __html: renderDisplayMath(STEPS[currentStep].latex) }} />
            <div style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '12px' }}>
              {STEPS[currentStep].description}
            </div>
          </>
        )}
        {currentStep === STEPS.length - 1 && (
          <div style={{ marginTop: '12px', padding: '10px 16px', background: `rgba(236,72,153,0.15)`, borderRadius: '8px', color: CHAPTER_COLOR, fontWeight: 700, fontSize: '16px', display: 'inline-block' }}>
            0.0014 ← Posterior
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button onClick={handleReset} aria-label="Reset to beginning" style={btnStyle()}>|◀ Reset</button>
        <button onClick={handleBack} aria-label="Previous step" disabled={currentStep === 0} style={{ ...btnStyle(), opacity: currentStep === 0 ? 0.5 : 1 }}>◀ Back</button>
        <button onClick={handlePlay} aria-label={playing ? 'Pause animation' : 'Play animation'} style={btnStyle(playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button onClick={handleNext} aria-label="Next step" disabled={currentStep === STEPS.length - 1} style={{ ...btnStyle(), opacity: currentStep === STEPS.length - 1 ? 0.5 : 1 }}>▶ Next</button>
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => setSpeed(s)} aria-label={`Set speed ${s}x`} aria-pressed={speed === s}
              style={{ ...btnStyle(speed === s), padding: '8px 10px', fontSize: '12px' }}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Known values panel */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Known Values</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
          {KNOWN_VALUES.slice(0, Math.min(currentStep + 1, 4)).map(([label, val]) => (
            <div key={label} style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }} dangerouslySetInnerHTML={{ __html: renderInlineMath(label.replace(/\|/g, '\\mid ')) }} />
              <div style={{ fontSize: '18px', fontWeight: 700, color: CHAPTER_COLOR, marginTop: '2px' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditional independence */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
          Conditional Independence: Toothache ⊥ Catch | Cavity
        </h3>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('P(\\text{toothache} \\land \\text{catch} \\mid \\text{cavity}) = P(\\text{toothache}\\mid\\text{cavity}) \\cdot P(\\text{catch}\\mid\\text{cavity})') }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
          <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>P(toothache∧catch|cavity)</div>
            <div style={{ color: '#10B981', fontWeight: 700 }}>{pToothacheAndCatchGivenCavity.toFixed(4)} = 0.5400</div>
          </div>
          <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>P(T|C) × P(catch|C)</div>
            <div style={{ color: '#10B981', fontWeight: 700 }}>{(pToothacheGivenCavity * pCatchGivenCavity).toFixed(4)} = 0.5400</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: '#9CA3AF', marginBottom: '4px' }}>Bayes verification</div>
            <div style={{ color: '#10B981', fontWeight: 700 }}>P(T∧C|cav) ≈ {pToothacheAndCatchGivenCavity.toFixed(4)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
