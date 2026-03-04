import { CHAPTERS } from '../data/chapters';
import type { ChapterData } from '../types/chapter';

/** Base URL for the site — set by Astro via import.meta.env.BASE_URL. */
const BASE: string = import.meta.env.BASE_URL ?? '/aima-visualizations/';

function ChapterCard({ chapter }: { chapter: ChapterData }) {
  const base = BASE.replace(/\/$/, '');

  return (
    <article
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      data-chapter-id={chapter.id}
    >
      {/* Color accent bar */}
      <div style={{ height: '4px', width: '100%', background: chapter.color }} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '8px',
                background: `${chapter.color}20`, color: chapter.color,
                fontSize: '14px', fontWeight: 700,
              }}
              aria-label={`Chapter ${chapter.id}`}
            >
              {String(chapter.id).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '24px' }} aria-hidden="true">{chapter.icon}</span>
          </div>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px', lineHeight: 1.3 }}>
          {chapter.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.6, flex: 1, marginBottom: '16px' }}>
          {chapter.description}
        </p>

        {/* Tech stack pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {chapter.techStack.map(tech => (
            <span
              key={tech}
              style={{
                padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', fontSize: '12px', fontWeight: 500,
              }}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{chapter.visualizationCount} visualizations</span>
          <a
            href={`${base}${chapter.urlPath}/`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              background: `${chapter.color}20`, color: chapter.color,
              textDecoration: 'none', transition: 'gap 0.2s',
            }}
            aria-label={`Explore Chapter ${chapter.id}: ${chapter.title}`}
          >
            Explore →
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * ChapterGridClient — renders all chapter cards. Each chapter always has an
 * "Explore" link since every chapter produces a page (at minimum a
 * "coming soon" / under-construction page).
 */
export default function ChapterGridClient() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
        id="chapter-grid"
      >
        {CHAPTERS.map(chapter => (
          <ChapterCard key={chapter.id} chapter={chapter} />
        ))}
      </div>
    </div>
  );
}
