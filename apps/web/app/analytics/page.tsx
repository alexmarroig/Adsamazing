'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type AnalyticsData = {
  overview: {
    clicks: number;
    conversions: number;
    revenue: number;
    cpc: number;
    ctr: number;
    roi: number;
  };
  topProducts: Array<{ id: string; title: string }>;
  topKeywords: Array<{ id: string; text: string }>;
  topAds: Array<{ id: string; headline1: string }>;
};

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const result = await api.get<AnalyticsData>('/v1/analytics', token);
      setData(result);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar analytics');
    }
  }, [token]);

  const rollup = async () => {
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/analytics/rollup', token, {});
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao rodar rollup');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Analytics</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Visão geral</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded bg-zinc-800 p-3">Clicks: {data?.overview.clicks ?? 0}</div>
            <div className="rounded bg-zinc-800 p-3">Conversions: {data?.overview.conversions ?? 0}</div>
            <div className="rounded bg-zinc-800 p-3">Revenue: R$ {(data?.overview.revenue ?? 0).toFixed(2)}</div>
            <div className="rounded bg-zinc-800 p-3">CPC: {(data?.overview.cpc ?? 0).toFixed(2)}</div>
            <div className="rounded bg-zinc-800 p-3">CTR: {(data?.overview.ctr ?? 0).toFixed(4)}</div>
            <div className="rounded bg-zinc-800 p-3">ROI: {(data?.overview.roi ?? 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Consolidação</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={rollup}>Executar rollup agora</Button>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
