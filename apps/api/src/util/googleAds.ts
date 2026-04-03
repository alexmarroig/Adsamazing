import { env } from '../plugins/env.js';

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 30_000;
const accessTokenCache = new Map<string, CachedAccessToken>();

function buildGoogleAdsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };

  const login = loginCustomerId ?? env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (login) {
    headers['login-customer-id'] = login;
  }

  return headers;
}

export async function getGoogleAdsAccessToken(refreshToken: string): Promise<string> {
  const cached = accessTokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`OAuth refresh failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  if (!tokenPayload.access_token) {
    throw new Error('OAuth refresh response missing access_token');
  }

  const expiresInMs = (tokenPayload.expires_in ?? 3600) * 1000;
  accessTokenCache.set(refreshToken, {
    accessToken: tokenPayload.access_token,
    expiresAt: Date.now() + Math.max(expiresInMs - TOKEN_EXPIRY_SAFETY_WINDOW_MS, 0),
  });

  return tokenPayload.access_token;
}

export async function listAccessibleCustomers(accessToken: string): Promise<{ resourceNames: string[] }> {
  const response = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
    method: 'GET',
    headers: buildGoogleAdsHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`List customers failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as { resourceNames: string[] };
}

export async function searchGoogleAds(accessToken: string, customerId: string, query: string, loginCustomerId?: string): Promise<any> {
  const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: buildGoogleAdsHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function mutateGoogleAds(
  accessToken: string,
  customerId: string,
  operations: unknown[],
  loginCustomerId?: string,
): Promise<any> {
  const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:mutate`, {
    method: 'POST',
    headers: buildGoogleAdsHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ mutateOperations: operations }),
  });

  if (!response.ok) {
    throw new Error(`Mutate failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Operation Builders for Google Ads v18
 */

export function buildCampaignOperation(campaign: {
  name: string;
  advertisingChannelType: string;
  status: string;
  manualCpc?: Record<string, any>;
  dailyBudgetMicros: string | number;
}) {
  return {
    campaignOperation: {
      create: {
        name: campaign.name,
        advertisingChannelType: campaign.advertisingChannelType,
        status: campaign.status,
        campaignBudget: `customers/${campaign.name}/campaignBudgets/-1`, // Temporary ID placeholder
        manualCpc: campaign.manualCpc ?? {},
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: false,
        },
      },
    },
  };
}

export function buildBudgetOperation(amountMicros: string | number) {
  return {
    campaignBudgetOperation: {
      create: {
        name: `Budget ${Date.now()}`,
        amountMicros: amountMicros.toString(),
        deliveryMethod: 'STANDARD',
      },
    },
  };
}

export function buildAdGroupOperation(campaignResourceName: string, name: string) {
  return {
    adGroupOperation: {
      create: {
        name,
        status: 'ENABLED',
        campaign: campaignResourceName,
        type: 'SEARCH_STANDARD',
      },
    },
  };
}

export function buildKeywordOperation(adGroupResourceName: string, text: string, matchType: 'EXACT' | 'PHRASE' | 'BROAD') {
  return {
    adGroupKeywordOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text,
          matchType,
        },
      },
    },
  };
}

export function buildAdOperation(adGroupResourceName: string, ad: {
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
}) {
  return {
    adGroupAdOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          finalUrls: [ad.finalUrl],
          responsiveSearchAd: {
            headlines: ad.headlines.map(text => ({ text })),
            descriptions: ad.descriptions.map(text => ({ text })),
          },
        },
      },
    },
  };
}

export function buildConversionActionOperation(name: string) {
  return {
    conversionActionOperation: {
      create: {
        name,
        type: 'WEBPAGE',
        category: 'PURCHASE',
        status: 'ENABLED',
        viewThroughLookbackWindowDays: 30,
        clickThroughLookbackWindowDays: 90,
        eventContext: 'GOOGLE_ADS_CONVERSION',
      },
    },
  };
}

export async function getCampaignMetrics(accessToken: string, customerId: string, campaignId: string, loginCustomerId?: string) {
  const query = `
    SELECT
      campaign.id,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.id = '${campaignId}'
    AND segments.date DURING LAST_30_DAYS
  `;
  return searchGoogleAds(accessToken, customerId, query, loginCustomerId);
}

export async function getKeywordMetrics(accessToken: string, customerId: string, campaignId: string, loginCustomerId?: string) {
  const query = `
    SELECT
      ad_group_keyword_view.resource_name,
      keyword_view.resource_name,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      metrics.conversions_value
    FROM keyword_view
    WHERE campaign.id = '${campaignId}'
    AND segments.date DURING LAST_30_DAYS
  `;
  return searchGoogleAds(accessToken, customerId, query, loginCustomerId);
}
