export default function Dashboard() {
  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      
      <div className="grid grid-2">
        <div className="card">
          <h3>Total Tests</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>
            156
          </p>
          <p style={{ color: 'var(--color-text-light)' }}>Across all breakpoints</p>
        </div>

        <div className="card">
          <h3>Pass Rate</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-success)' }}>
            98.7%
          </p>
          <p style={{ color: 'var(--color-text-light)' }}>Last 30 days</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Test Runs</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Route</th>
              <th style={{ padding: '0.5rem' }}>Breakpoint</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {[
              { route: '/', breakpoint: 'desktop', status: '✅ Passed', time: '2m ago' },
              { route: '/dashboard', breakpoint: 'mobile', status: '✅ Passed', time: '2m ago' },
              { route: '/settings', breakpoint: 'tablet', status: '✅ Passed', time: '3m ago' },
              { route: '/pricing', breakpoint: 'desktop', status: '❌ Failed', time: '5m ago' },
            ].map((test, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.5rem' }}>{test.route}</td>
                <td style={{ padding: '0.5rem' }}>{test.breakpoint}</td>
                <td style={{ padding: '0.5rem' }}>{test.status}</td>
                <td style={{ padding: '0.5rem', color: 'var(--color-text-light)' }}>
                  {test.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
