interface PlaceholderProps {
  id: string;
  title: string;
  status: string;
  chapterColor: string;
}

export default function Placeholder({ id, title, status, chapterColor }: PlaceholderProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={title}
      style={{
        padding: '20px 24px',
        borderRadius: '12px',
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: '#6B7280' }}>
          Implementation coming soon — this visualization is planned for a future contribution.
        </p>
      </div>
      <span
        style={{
          flexShrink: 0,
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 500,
          background: `${chapterColor}15`,
          color: chapterColor,
          border: `1px solid ${chapterColor}30`,
        }}
      >
        {status}
      </span>
    </div>
  );
}
