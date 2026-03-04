import { useEffect, useState } from 'react';
import { CHAPTERS, type ChapterData } from '../data/chapters';

interface ManifestPayload {
  status?: 'planned' | 'in-progress' | 'complete';
  sections?: Array<{ id: string; title: string; status: string }>;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  complete:    { bg: 'rgba(16,185,129,0.1)',  text: '#34d399', border: 'rgba(16,185,129,0.2)',  label: '✓ Complete'    },
  'in-progress': { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)', label: '⟳ In Progress' },
  planned:     { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af', border: 'rgba(107,114,128,0.2)', label: '◷ Planned'     },
};

const BASE = import.meta.env.BASE_URL ?? '/aima-visualizations/';

/** Fetch a single chapter manifest and return the status, or null on failure. */
async function fetchManifest(chapterPath: string): Promise<ManifestPayload | null> {
  try {
    const url = `${BASE}${chapterPath.replace(/^\//, '')}/manifest.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as ManifestPayload;
  } catch {
    return null;
  }
}

function ChapterCard({ chapter }: { chapter: ChapterData }) {
  const st = STATUS_STYLES[chapter.status] ?? STATUS_STYLES.planned;
  const isAvailable = chapter.status !== 'planned';
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
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
          <span
            style={{
              padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
              background: st.bg, color: st.text, border: `1px solid ${st.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {st.label}
          </span>
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
          {isAvailable ? (
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
          ) : (
            <button
              disabled
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', color: '#6B7280',
                border: 'none', cursor: 'not-allowed',
              }}
              title="Coming soon"
              aria-label={`Chapter ${chapter.id} is planned — coming soon`}
              aria-disabled="true"
            >
              Coming Soon
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * ChapterGridClient — renders all chapter cards and fetches each chapter's
 * manifest.json at runtime so status updates (planned → complete) are
 * reflected without rebuilding the landing page.
 */
export default function ChapterGridClient() {
  const [chapters, setChapters] = useState<ChapterData[]>([...CHAPTERS]);

  useEffect(() => {
    let cancelled = false;

    async function loadManifests() {
      const updates = await Promise.all(
        CHAPTERS.map(async (ch) => {
          const manifest = await fetchManifest(ch.urlPath);
          if (!manifest) return null;
          return { id: ch.id, status: manifest.status ?? ch.status };
        }),
      );

      if (cancelled) return;

      setChapters(prev =>
        prev.map(ch => {
          const update = updates.find(u => u?.id === ch.id);
          if (!update) return ch;
          return { ...ch, status: update.status };
        }),
      );
    }

    void loadManifests();
    return () => { cancelled = true; };
  }, []);

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
        {chapters.map(chapter => (
          <ChapterCard key={chapter.id} chapter={chapter} />
        ))}
      </div>
    </div>
  );
}
