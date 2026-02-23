/**
 * Centralized frontend config values.
 *
 * Replace NEXT_PUBLIC_BACKEND_URL in your environment with your real Railway backend URL.
 * Example: NEXT_PUBLIC_BACKEND_URL=https://my-backend-production.up.railway.app
 */
export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://<YOUR_BACKEND_URL>';

/**
 * Builds the backend OAuth start URL.
 */
export const GOOGLE_OAUTH_START_URL = `${BACKEND_BASE_URL}/v1/google/oauth/start`;

/**
 * Backend endpoint to verify Google Ads access after OAuth succeeds.
 */
export const GOOGLE_ADS_TEST_URL = `${BACKEND_BASE_URL}/v1/google/ads/test`;
