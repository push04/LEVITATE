export default function SiteNotFound() {
  return (
    <div
      style={{
        margin: 0,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#0a0a0a',
        color: '#e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
      }}
    >
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '5rem', fontWeight: 700, color: '#C8A96E', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
          Site not found
        </h1>
        <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '360px', lineHeight: 1.6 }}>
          This site does not exist or may have been removed.
        </p>
        <a
          href="https://levitatelabs.online"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.75rem',
            background: '#C8A96E',
            color: '#0a0a0a',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}
        >
          Back to LevitateOS
        </a>
        <p style={{ marginTop: '3rem', color: '#555', fontSize: '0.8rem' }}>
          Built with{' '}
          <a href="https://levitatelabs.online" style={{ color: '#C8A96E', textDecoration: 'none' }}>
            LevitateOS
          </a>{' '}
          Website Builder
        </p>
      </div>
    </div>
  )
}
