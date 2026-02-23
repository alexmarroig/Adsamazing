import Head from 'next/head';
import { GOOGLE_OAUTH_START_URL } from '../lib/config';

/**
 * Home page:
 * - Shows one primary CTA button to start Google OAuth on the backend.
 */
export default function HomePage() {
  // Redirect browser to the backend OAuth start endpoint.
  const handleConnectGoogleAds = () => {
    window.location.href = GOOGLE_OAUTH_START_URL;
  };

  return (
    <>
      <Head>
        <title>Google Ads OAuth Tester</title>
        <meta name="description" content="Frontend to test Google OAuth flow" />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f7f8',
          padding: '24px',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '600px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 6px 22px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Google Ads OAuth Tester</h1>
          <p style={{ color: '#444', marginBottom: '24px' }}>
            Click the button below to start Google OAuth using your backend service.
          </p>

          <button
            type="button"
            onClick={handleConnectGoogleAds}
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              padding: '16px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              background: '#2563eb',
            }}
          >
            Connect Google Ads
          </button>

          <p style={{ marginTop: '18px', color: '#666', fontSize: '0.9rem' }}>
            OAuth start URL: <code>{GOOGLE_OAUTH_START_URL}</code>
          </p>
        </section>
      </main>
    </>
  );
}
