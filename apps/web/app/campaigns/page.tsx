'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Campaign = {
  id: string;
  name: string;
  status: string;
};

export default function CampaignsPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adAccountId, setAdAccountId] = useState('');
  const [productId, setProductId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const result = await api.get<Campaign[]>('/v1/campaigns?limit=30', token);
      setCampaigns(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar campanhas');
    }
  }, [token]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const buildCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/campaigns/build', token, {
        adAccountId,
        productId,
        objective: 'conversions',
      });
      setAdAccountId('');
      setProductId('');
      await loadCampaigns();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao criar campanha');
    }
  };

  const launchCampaign = async (campaignId: string) => {
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/campaigns/launch', token, { campaignId, publishToGoogle: true });
      await loadCampaigns();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao lançar campanha');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Campanhas</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Criar campanha 1-click</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={buildCampaign}>
              <Input placeholder="Ad Account ID" value={adAccountId} onChange={(event) => setAdAccountId(event.target.value)} required />
              <Input placeholder="Product ID" value={productId} onChange={(event) => setProductId(event.target.value)} required />
              <Button type="submit">Gerar campanha</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Campanhas criadas</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {campaigns.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded bg-zinc-800 px-3 py-2">
                  <span>{item.name} ({item.status})</span>
                  {item.status !== 'PUBLISHED' && (
                    <Button size="sm" onClick={() => launchCampaign(item.id)}>Lançar</Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
