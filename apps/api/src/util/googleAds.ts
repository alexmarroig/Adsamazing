import { env } from '../plugins/env.js';

/**
 * Troca refresh_token por access_token para chamadas da Google Ads API.
 */
export async function getGoogleAdsAccessToken(refreshToken: string): Promise<string> {
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

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

  if (!tokenPayload.access_token) {
    throw new Error('Resposta OAuth sem access_token.');
  }

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
