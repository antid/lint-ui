export default function Pricing() {
  return (
    <div>
      <h1 className="page-title">Pricing</h1>
      
      <div className="grid grid-3">
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Free</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            $0
            <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--color-text-light)' }}>
              /month
            </span>
          </div>
          <ul style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <li>5 routes</li>
            <li>4 breakpoints</li>
            <li>Basic accessibility checks</li>
            <li>GitHub Actions integration</li>
          </ul>
          <button className="button">Get Started</button>
        </div>

        <div className="card" style={{ textAlign: 'center', border: '2px solid var(--color-primary)' }}>
          <div style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            display: 'inline-block',
            marginBottom: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            POPULAR
          </div>
          <h3 style={{ marginBottom: '1rem' }}>Pro</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            $49
            <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--color-text-light)' }}>
              /month
            </span>
          </div>
          <ul style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <li>Unlimited routes</li>
            <li>Custom breakpoints</li>
            <li>Advanced a11y audits</li>
            <li>Design system rules</li>
            <li>Priority support</li>
          </ul>
          <button className="button">Start Free Trial</button>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Enterprise</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Custom
          </div>
          <ul style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <li>Everything in Pro</li>
            <li>Custom rule engine</li>
            <li>On-premise deployment</li>
            <li>SSO & SAML</li>
            <li>Dedicated support</li>
          </ul>
          <button className="button button-secondary">Contact Sales</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Frequently Asked Questions</h2>
        <div style={{ marginTop: '1rem' }}>
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              Can I change plans later?
            </summary>
            <p style={{ marginTop: '0.5rem', color: 'var(--color-text-light)' }}>
              Yes! You can upgrade or downgrade your plan at any time.
            </p>
          </details>
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              Do you offer refunds?
            </summary>
            <p style={{ marginTop: '0.5rem', color: 'var(--color-text-light)' }}>
              We offer a 30-day money-back guarantee on all paid plans.
            </p>
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
              What payment methods do you accept?
            </summary>
            <p style={{ marginTop: '0.5rem', color: 'var(--color-text-light)' }}>
              We accept all major credit cards and PayPal.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
