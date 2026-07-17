export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '2rem 1rem',
        lineHeight: 1.6,
      }}
    >
      <h1>MRcipher</h1>
      <p>
        Universal, API-first Encryption-as-a-Service. Send any JSON-serializable
        payload to the endpoints below and receive an AES-256-GCM encrypted
        container in return.
      </p>

      <h2>API Endpoints</h2>
      <ul>
        <li>
          <code>POST /api/v1/encrypt</code> — Encrypt a JSON value.
        </li>
        <li>
          <code>POST /api/v1/decrypt</code> — Decrypt an encrypted container.
        </li>
      </ul>

      <h2>Headers</h2>
      <ul>
        <li>
          <code>x-api-key</code> — Your API key (required).
        </li>
        <li>
          <code>origin</code> — Must match an allowed domain for your key.
        </li>
        <li>
          <code>content-type: application/json</code>
        </li>
      </ul>

      <h2>Example</h2>
      <pre
        style={{
          background: '#f4f4f5',
          padding: '1rem',
          borderRadius: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {`curl -X POST https://mrcipher.vercel.app/api/v1/encrypt \\
  -H "content-type: application/json" \\
  -H "x-api-key: mr_xxxxxxxx" \\
  -H "origin: https://app.example.com" \\
  -d '{"content":{"email":"user@example.com","ssn":"123-45-6789"}}'`}
      </pre>

      <p style={{ marginTop: '2rem', color: '#6b7280' }}>
        See the README for Firestore setup, key provisioning, and security
        guidance.
      </p>
    </main>
  );
}
