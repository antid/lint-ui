export default function Home() {
  return (
    <div>
      <h1 className="page-title">Welcome to Lint UI</h1>
      
      <div className="card">
        <h2>Visual Regression Testing</h2>
        <p>
          Lint UI helps you catch visual regressions, accessibility issues, and layout breaks
          before they reach production. Test your UI across multiple breakpoints automatically
          in CI.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>🎯 Visual Diffs</h3>
          <p>Screenshot comparison across breakpoints</p>
        </div>
        <div className="card">
          <h3>♿ Accessibility</h3>
          <p>Built-in WCAG compliance checks</p>
        </div>
        <div className="card">
          <h3>📐 Layout Validation</h3>
          <p>Detect overflow and clipping issues</p>
        </div>
      </div>

      <div className="card">
        <h2>Get Started</h2>
        <p>Install Lint UI and run your first test in minutes:</p>
        <pre style={{ 
          background: '#f9fafb', 
          padding: '1rem', 
          borderRadius: '0.375rem',
          overflow: 'auto'
        }}>
          {`pnpm install lint-ui
lint-ui init
lint-ui record
lint-ui run`}
        </pre>
        <button className="button" style={{ marginTop: '1rem' }}>
          View Documentation
        </button>
      </div>
    </div>
  )
}
