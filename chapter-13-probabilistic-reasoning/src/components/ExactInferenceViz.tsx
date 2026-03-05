import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BURGLARY_NET,
  enumerationAsk,
  eliminationAsk,
  EnumerationStep,
  EnumerationResult,
  VEStep,
  Factor,
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

type TabName = 'enumeration' | 've';

const QUERY_VARS = ['Burglary', 'Earthquake', 'Alarm', 'JohnCalls', 'MaryCalls'];
const EVIDENCE_VARS = ['Burglary', 'Earthquake', 'Alarm', 'JohnCalls', 'MaryCalls'];
const CHAPTER_COLOR = '#EC4899';
const SPEEDS = [100, 300, 600, 1000];

function FactorDisplay({ factor }: { factor: Factor }) {
  return (
    <div
      style={{
        background: 'var(--surface-3)',
        borderRadius: '6px',
        padding: '8px',
        marginTop: '6px',
        fontSize: '11px',
        overflowX: 'auto',
      }}
    >
      <div style={{ color: '#6366F1', marginBottom: '4px', fontWeight: 600 }}>
        f({factor.variables.join(', ')})
      </div>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {factor.variables.map((v) => (
              <th
                key={v}
                style={{ padding: '2px 6px', color: '#9CA3AF', fontWeight: 500 }}
              >
                {v.slice(0, 3)}
              </th>
            ))}
            <th style={{ padding: '2px 6px', color: CHAPTER_COLOR }}>val</th>
          </tr>
        </thead>
        <tbody>
          {factor.values.slice(0, 8).map((val, i) => {
            const varVals = factor.variables.map((_, j) => ((i >> j) & 1) === 1);
            return (
              <tr key={i}>
                {varVals.map((v, j) => (
                  <td
                    key={j}
                    style={{
                      padding: '2px 6px',
                      color: v ? '#10B981' : '#EF4444',
                    }}
                  >
                    {v ? 'T' : 'F'}
                  </td>
                ))}
                <td style={{ padding: '2px 6px', color: '#E5E7EB' }}>
                  {val.toFixed(5)}
                </td>
              </tr>
            );
          })}
          {factor.values.length > 8 && (
            <tr>
              <td
                colSpan={factor.variables.length + 1}
                style={{ padding: '2px 6px', color: '#6B7280' }}
              >
                …{factor.values.length - 8} more
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ExactInferenceViz() {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const [tab, setTab] = useState<TabName>('enumeration');
  const [query, setQuery] = useState('Burglary');
  const [evidence, setEvidence] = useState<Map<string, boolean>>(
    new Map([
      ['JohnCalls', true],
      ['MaryCalls', true],
    ]),
  );

  const [enumResult, setEnumResult] = useState<EnumerationResult | null>(null);
  const [veResult, setVeResult] = useState<{
    steps: VEStep[];
    distribution: [number, number];
  } | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const speed = SPEEDS[speedIdx] ?? 300;

  // Compute results when query/evidence/tab changes
  useEffect(() => {
    setCurrentIdx(0);
    setPlaying(false);
    const ev = new Map<string, boolean>(evidence);
    // Remove query from evidence if present
    ev.delete(query);
    if (tab === 'enumeration') {
      const result = enumerationAsk(query, ev, BURGLARY_NET);
      setEnumResult(result);
      setVeResult(null);
    } else {
      const result = eliminationAsk(query, ev, BURGLARY_NET);
      setVeResult(result);
      setEnumResult(null);
    }
  }, [query, evidence, tab]);

  const steps = tab === 'enumeration' ? (enumResult?.steps ?? []) : (veResult?.steps ?? []);
  const distribution =
    tab === 'enumeration' ? enumResult?.distribution : veResult?.distribution;

  // Animation
  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    if (currentIdx >= steps.length - 1) {
      setPlaying(false);
      return;
    }

    const frame = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      if (ts - lastTimeRef.current >= speed) {
        lastTimeRef.current = ts;
        setCurrentIdx((prev) => Math.min(prev + 1, steps.length - 1));
      }
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [playing, currentIdx, speed, steps.length, prefersReducedMotion]);

  useEffect(() => {
    if (playing && currentIdx >= steps.length - 1) {
      setPlaying(false);
    }
  }, [playing, currentIdx, steps.length]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setCurrentIdx(0);
    lastTimeRef.current = 0;
  }, []);

  const toggleEvidence = (varName: string, value: boolean) => {
    if (varName === query) return;
    setEvidence((prev) => {
      const next = new Map(prev);
      if (next.get(varName) === value) {
        next.delete(varName);
      } else {
        next.set(varName, value);
      }
      return next;
    });
  };

  const currentEnumStep: EnumerationStep | undefined =
    tab === 'enumeration' ? enumResult?.steps[currentIdx] : undefined;
  const currentVEStep: VEStep | undefined =
    tab === 've' ? veResult?.steps[currentIdx] : undefined;

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '16px',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid',
    borderColor: active ? CHAPTER_COLOR : 'var(--surface-border)',
    background: active ? CHAPTER_COLOR + '22' : 'var(--surface-3)',
    color: active ? CHAPTER_COLOR : '#9CA3AF',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setTab('enumeration')}
          aria-pressed={tab === 'enumeration'}
          style={btnStyle(tab === 'enumeration')}
        >
          Enumeration
        </button>
        <button
          onClick={() => setTab('ve')}
          aria-pressed={tab === 've'}
          style={btnStyle(tab === 've')}
        >
          Variable Elimination
        </button>
      </div>

      {/* Formula */}
      <div style={panelStyle}>
        {tab === 'enumeration' ? (
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                'P(X|\\mathbf{e}) = \\alpha \\sum_{\\mathbf{y}} P(X,\\mathbf{y},\\mathbf{e})',
              ),
            }}
          />
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: renderDisplayMath(
                'P(X|\\mathbf{e}) = \\alpha \\prod_i f_i(X_i)',
              ),
            }}
          />
        )}
      </div>

      {/* Config row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Query selector */}
        <div style={panelStyle}>
          <label
            htmlFor="query-select"
            style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}
          >
            Query Variable
          </label>
          <select
            id="query-select"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setEvidence((prev) => {
                const next = new Map(prev);
                next.delete(e.target.value);
                return next;
              });
            }}
            style={{
              background: 'var(--surface-3)',
              color: 'white',
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
            aria-label="Select query variable"
          >
            {QUERY_VARS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Evidence */}
        <div style={panelStyle}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
            Evidence
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EVIDENCE_VARS.filter((v) => v !== query).map((v) => {
              const ev = evidence.get(v);
              return (
                <div key={v} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{v.slice(0, 4)}:</span>
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => toggleEvidence(v, val)}
                      aria-pressed={ev === val}
                      aria-label={`Set ${v} = ${val}`}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor:
                          ev === val
                            ? val
                              ? '#10B981'
                              : '#EF4444'
                            : 'var(--surface-border)',
                        background:
                          ev === val
                            ? val
                              ? '#10B98122'
                              : '#EF444422'
                            : 'var(--surface-3)',
                        color: ev === val ? (val ? '#10B981' : '#EF4444') : '#6B7280',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {val ? 'T' : 'F'}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          aria-label="Step back"
          style={{
            ...btnStyle(false),
            opacity: currentIdx === 0 ? 0.4 : 1,
          }}
        >
          ◀
        </button>
        <button
          onClick={() => {
            lastTimeRef.current = 0;
            setPlaying((p) => !p);
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          style={btnStyle(playing)}
          disabled={prefersReducedMotion}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setCurrentIdx((p) => Math.min(p + 1, steps.length - 1))}
          disabled={currentIdx >= steps.length - 1}
          aria-label="Step forward"
          style={{
            ...btnStyle(false),
            opacity: currentIdx >= steps.length - 1 ? 0.4 : 1,
          }}
        >
          ▶
        </button>
        <button onClick={handleReset} aria-label="Reset" style={btnStyle(false)}>
          ↺ Reset
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
          <label
            htmlFor="speed-slider-ei"
            style={{ fontSize: '12px', color: '#9CA3AF' }}
          >
            Speed
          </label>
          <input
            id="speed-slider-ei"
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ accentColor: CHAPTER_COLOR, width: '80px' }}
          />
          <span style={{ fontSize: '11px', color: '#6B7280' }}>{speed}ms</span>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>
          Step {steps.length > 0 ? currentIdx + 1 : 0} / {steps.length}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: '16px',
        }}
      >
        {/* Steps list */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
            {tab === 'enumeration' ? 'Enumeration Steps' : 'Variable Elimination Steps'}
          </h3>
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {steps.slice(0, currentIdx + 1).map((step, i) => {
              const isActive = i === currentIdx;
              if (tab === 'enumeration') {
                const s = step as EnumerationStep;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isActive ? CHAPTER_COLOR + '22' : 'var(--surface-3)',
                      border: `1px solid ${isActive ? CHAPTER_COLOR : 'transparent'}`,
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: '#6B7280' }}>{'  '.repeat(s.depth)}</span>
                    <span style={{ color: '#6366F1' }}>{s.varName}</span>
                    <span style={{ color: '#D1D5DB' }}>={s.value ? 'T' : 'F'} </span>
                    <span style={{ color: '#9CA3AF' }}>{s.action}</span>
                  </div>
                );
              } else {
                const s = step as VEStep;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isActive ? CHAPTER_COLOR + '22' : 'var(--surface-3)',
                      border: `1px solid ${isActive ? CHAPTER_COLOR : 'transparent'}`,
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        color:
                          s.operation === 'make-factor'
                            ? '#10B981'
                            : s.operation === 'sum-out'
                              ? '#F59E0B'
                              : s.operation === 'normalize'
                                ? CHAPTER_COLOR
                                : '#6366F1',
                      }}
                    >
                      {s.operation}
                    </span>
                    <span style={{ color: '#9CA3AF' }}> — {s.description}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Current step details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
              Current Step
            </h3>
            {tab === 'enumeration' && currentEnumStep && (
              <div style={{ fontSize: '12px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#9CA3AF' }}>Variable: </span>
                  <span style={{ color: '#6366F1' }}>{currentEnumStep.varName}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#9CA3AF' }}>Value: </span>
                  <span
                    style={{ color: currentEnumStep.value ? '#10B981' : '#EF4444' }}
                  >
                    {currentEnumStep.value ? 'true' : 'false'}
                  </span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#9CA3AF' }}>Depth: </span>
                  <span style={{ color: '#D1D5DB' }}>{currentEnumStep.depth}</span>
                </div>
                <div>
                  <span style={{ color: '#9CA3AF' }}>Sub-result: </span>
                  <span style={{ color: CHAPTER_COLOR }}>
                    {currentEnumStep.subResult.toExponential(4)}
                  </span>
                </div>
              </div>
            )}
            {tab === 've' && currentVEStep && (
              <div style={{ fontSize: '12px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#9CA3AF' }}>Operation: </span>
                  <span style={{ color: CHAPTER_COLOR }}>{currentVEStep.operation}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#9CA3AF' }}>Description: </span>
                  <span style={{ color: '#D1D5DB' }}>{currentVEStep.description}</span>
                </div>
                {currentVEStep.variable && (
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#9CA3AF' }}>Variable: </span>
                    <span style={{ color: '#6366F1' }}>{currentVEStep.variable}</span>
                  </div>
                )}
                {currentVEStep.result && <FactorDisplay factor={currentVEStep.result} />}
              </div>
            )}
            {!currentEnumStep && !currentVEStep && (
              <div style={{ color: '#6B7280', fontSize: '12px' }}>
                Press Play or Step Forward to begin.
              </div>
            )}
          </div>

          {/* Final result */}
          {distribution && (currentIdx >= steps.length - 1 || steps.length === 0) && (
            <div
              style={{
                ...panelStyle,
                borderColor: CHAPTER_COLOR,
                background: CHAPTER_COLOR + '11',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: CHAPTER_COLOR }}>
                Result
              </h3>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderDisplayMath(
                    `P(${query}=T|\\mathbf{e}) = ${distribution[1].toFixed(4)}`,
                  ),
                }}
              />
              <div
                dangerouslySetInnerHTML={{
                  __html: renderDisplayMath(
                    `P(${query}=F|\\mathbf{e}) = ${distribution[0].toFixed(4)}`,
                  ),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
