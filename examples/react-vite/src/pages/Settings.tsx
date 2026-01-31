export default function Settings() {
  return (
    <div>
      <h1 className="page-title">Settings</h1>
      
      <div className="card">
        <h2>Configuration</h2>
        <form>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="baseUrl" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Base URL
            </label>
            <input
              id="baseUrl"
              type="url"
              defaultValue="http://localhost:4173"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="threshold" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Diff Threshold (%)
            </label>
            <input
              id="threshold"
              type="number"
              defaultValue="10"
              min="0"
              max="100"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" defaultChecked />
              <span>Enable accessibility checks</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" defaultChecked />
              <span>Check for layout overflow</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" defaultChecked />
              <span>Disable animations during tests</span>
            </label>
          </div>

          <button type="submit" className="button">
            Save Settings
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Breakpoints</h2>
        <div className="grid">
          {[
            { name: 'Mobile', width: 375, height: 812 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1280, height: 800 },
            { name: 'Large', width: 1440, height: 900 },
          ].map((bp) => (
            <div
              key={bp.name}
              style={{
                padding: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.375rem',
              }}
            >
              <strong>{bp.name}</strong>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                {bp.width} × {bp.height}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
