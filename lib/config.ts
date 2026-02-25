/**
 * Shared frontend configuration.
 *
 * We keep all backend URLs in one place so pages/components
 * don't hard-code endpoints directly.
 */
export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://adsapi-production.up.railway.app';

/**
 * URL that starts the Google OAuth flow on the backend.
 */
export const GOOGLE_OAUTH_START_URL = `${BACKEND_BASE_URL}/v1/google/oauth/start`;

/**
 * URL used to test Google Ads access after OAuth.
 */
export const GOOGLE_ADS_TEST_URL = `${BACKEND_BASE_URL}/v1/google/ads/test`;
