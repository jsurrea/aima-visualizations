interface PlaceholderProps {
  title?: string;
  description?: string;
}

export default function Placeholder({ title = 'Visualization', description = 'Interactive visualization coming soon.' }: PlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${title} placeholder`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px dashed rgba(255,255,255,0.12)',
        padding: '32px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '32px' }} aria-hidden="true">🔧</span>
      <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>{description}</p>
    </div>
  );
}
