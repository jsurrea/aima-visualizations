import { useState, useRef, useEffect } from 'react';
import { getAIHistoryEvents, type HistoryEvent } from '../algorithms/index';

const CATEGORY_META: Record<
  HistoryEvent['category'],
  { label: string; color: string; bg: string }
> = {
  foundations: { label: 'Foundations', color: '#3B82F6', bg: '#3B82F620' },
  breakthrough: { label: 'Breakthrough', color: '#10B981', bg: '#10B98120' },
  setback: { label: 'Setback', color: '#EF4444', bg: '#EF444420' },
  milestone: { label: 'Milestone', color: '#F59E0B', bg: '#F59E0B20' },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function TimelineEvent({
  event,
  index,
  prefersReduced,
}: {
  event: HistoryEvent;
  index: number;
  prefersReduced: boolean;
}) {
  const meta = CATEGORY_META[event.category];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        opacity: prefersReduced ? 1 : 0,
        transform: prefersReduced ? 'none' : 'translateX(-16px)',
        transition: prefersReduced ? 'none' : 'opacity 0.4s ease, transform 0.4s ease',
        transitionDelay: prefersReduced ? '0s' : `${index * 60}ms`,
      }}
    >
      {/* Timeline dot */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: meta.color,
            border: '3px solid #0A0A0F',
            boxShadow: `0 0 0 2px ${meta.color}`,
            marginTop: '4px',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          paddingBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: meta.color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {event.year}
          </span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              background: meta.bg,
              color: meta.color,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {meta.label}
          </span>
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', margin: '0 0 6px' }}>
          {event.title}
        </h3>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: 1.65 }}>
          {event.description}
        </p>
      </div>
    </div>
  );
}

export default function AITimeline() {
  const events = getAIHistoryEvents();
  const prefersReduced = usePrefersReducedMotion();

  return (
    <section aria-label="AI History Timeline">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
        From the first neural model in 1943 to the large language model era — key moments that
        shaped the field of artificial intelligence.
      </p>

      {/* Legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}
        aria-label="Category legend"
      >
        {(Object.entries(CATEGORY_META) as Array<[HistoryEvent['category'], (typeof CATEGORY_META)[HistoryEvent['category']]]>).map(
          ([key, meta]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                aria-hidden="true"
                style={{ width: '10px', height: '10px', borderRadius: '50%', background: meta.color }}
              />
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{meta.label}</span>
            </div>
          ),
        )}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '6px',
            top: '8px',
            bottom: '0',
            width: '2px',
            background: 'linear-gradient(to bottom, #6366F1, rgba(99,102,241,0.1))',
          }}
        />
        <div style={{ paddingLeft: '34px' }}>
          {events.map((event, i) => (
            <TimelineEvent
              key={event.year}
              event={event}
              index={i}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
