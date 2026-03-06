'use client';

import { useEffect, useState } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api';

type AnalyticsOverview = {
  overview: {
    clicks: number;
    conversions: number;
    revenue: number;
    cpc: number;
    ctr: number;
    roi: number;
  };
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview['overview'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get<AnalyticsOverview>('/v1/analytics', token)
      .then((result) => setOverview(result.overview))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar dashboard'));
  }, [token]);

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400">Resumo operacional da plataforma Ads + Afiliados.</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Cliques', value: overview?.clicks ?? 0 },
            { label: 'Conversões', value: overview?.conversions ?? 0 },
            { label: 'Receita', value: `R$ ${Number(overview?.revenue ?? 0).toFixed(2)}` },
            { label: 'ROI', value: Number(overview?.roi ?? 0).toFixed(2) },
          ].map((item) => (
            <Card key={item.label} className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-400">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ConsoleShell>
  );
}
