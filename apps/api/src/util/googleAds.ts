import { env } from '../plugins/env.js';

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 30_000;
const accessTokenCache = new Map<string, CachedAccessToken>();

/**
 * Troca refresh_token por access_token para chamadas da Google Ads API.
 */
export async function getGoogleAdsAccessToken(refreshToken: string): Promise<string> {
  const cachedToken = accessTokenCache.get(refreshToken);
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Falha ao obter access_token: ${tokenResponse.status} - ${errorBody}`);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };

  if (!tokenPayload.access_token) {
    throw new Error('Resposta OAuth sem access_token.');
  }

  const expiresInMs = (tokenPayload.expires_in ?? 3600) * 1000;
  const expiresAt = Date.now() + Math.max(expiresInMs - TOKEN_EXPIRY_SAFETY_WINDOW_MS, 0);

  accessTokenCache.set(refreshToken, {
    accessToken: tokenPayload.access_token,
    expiresAt,
  });

  return tokenPayload.access_token;
}

/**
 * Lista customer resources acessíveis pelo usuário autenticado no Google Ads.
 */
export async function listAccessibleCustomers(accessToken: string): Promise<unknown> {
  const response = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': env.GOOGLE_DEVELOPER_TOKEN,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao listar customers: ${response.status} - ${errorBody}`);
  }

  return response.json();
}
