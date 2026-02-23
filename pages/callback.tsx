import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { GOOGLE_ADS_TEST_URL } from '../lib/config';

/**
 * Callback page:
 * - Reads all query params returned from backend redirect (accessToken, refreshToken, etc).
 * - Displays query params as JSON.
 * - Lets the user call the backend test endpoint and display the result.
 */
export default function CallbackPage() {
  const router = useRouter();

  // Local UI states for the test endpoint call.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<unknown>(null);

  // Convert Next.js router query object into a cleaner plain object for JSON display.
  const callbackParams = useMemo(() => {
    const entries = Object.entries(router.query).map(([key, value]) => {
      // If param is repeated in URL, Next.js gives an array; otherwise a single value.
      return [key, Array.isArray(value) ? value : value ?? ''];
    });

    return Object.fromEntries(entries);
  }, [router.query]);

  // Calls backend GET /v1/google/ads/test and prints response JSON.
  const handleListAccessibleCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(GOOGLE_ADS_TEST_URL, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Request failed (${response.status}): ${JSON.stringify(data, null, 2)}`,
        );
      }

      setApiResult(data);
    } catch (err) {
      setApiResult(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>OAuth Callback Result</title>
        <meta name="description" content="Shows OAuth callback tokens and test API results" />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          background: '#f7f7f8',
          padding: '24px',
          fontFamily: 'sans-serif',
        }}
      >
        <section
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 6px 22px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>OAuth Callback Data</h1>
          <p style={{ color: '#444' }}>
            These values are read from the URL query string (for example,
            accessToken and refreshToken).
          </p>

          <pre
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '16px',
              borderRadius: '10px',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(callbackParams, null, 2)}
          </pre>

          <button
            type="button"
            onClick={handleListAccessibleCustomers}
            disabled={loading}
            style={{
              marginTop: '16px',
              fontSize: '1rem',
              fontWeight: 700,
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#fff',
              background: loading ? '#64748b' : '#16a34a',
            }}
          >
            {loading ? 'Loading...' : 'List Accessible Customers'}
          </button>

          <p style={{ marginTop: '14px', color: '#666', fontSize: '0.9rem' }}>
            Test endpoint: <code>{GOOGLE_ADS_TEST_URL}</code>
          </p>

          {error ? (
            <pre
              style={{
                marginTop: '16px',
                background: '#7f1d1d',
                color: '#fee2e2',
                padding: '16px',
                borderRadius: '10px',
                overflowX: 'auto',
              }}
            >
              {error}
            </pre>
          ) : null}

          {apiResult ? (
            <pre
              style={{
                marginTop: '16px',
                background: '#052e16',
                color: '#dcfce7',
                padding: '16px',
                borderRadius: '10px',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          ) : null}
        </section>
      </main>
    </>
  );
}
