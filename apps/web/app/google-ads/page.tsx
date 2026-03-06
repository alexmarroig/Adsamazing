'use client';

import { FormEvent, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type CustomersResponse = { resourceNames?: string[] };

type MetricsResponse = Record<string, unknown>;

export default function GoogleAdsPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    if (!token) {
      return;
    }

    try {
      setError(null);
      const data = await api.get<CustomersResponse>('/v1/google/ads/customers', token);
      const list = data.resourceNames?.map((item) => item.replace('customers/', '')) ?? [];
      setCustomers(list);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao listar customers');
    }
  };

  const selectAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      setError(null);
      const result = await api.post<{ id: string }>('/v1/google/ads/accounts/select', token, {
        customerId,
        name,
        currencyCode: 'BRL',
        timeZone: 'America/Sao_Paulo',
        isMcc: false,
      });
      setAdAccountId(result.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao salvar conta');
    }
  };

  const fetchMetrics = async () => {
    if (!token || !adAccountId) {
      return;
    }

    try {
      setError(null);
      const result = await api.get<MetricsResponse>(`/v1/google/ads/metrics?adAccountId=${adAccountId}`, token);
      setMetrics(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao buscar métricas');
    }
  };

  const openOauth = async () => {
    if (!token) {
      return;
    }

    try {
      const result = await api.get<{ url: string }>('/v1/google/oauth/start', token);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao iniciar OAuth');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Google Ads</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle>Conexão OAuth</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={openOauth}>Conectar Google Ads</Button>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle>Customers acessíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={fetchCustomers}>Listar Customers</Button>
            <ul className="space-y-2 text-sm text-zinc-200">
              {customers.map((item) => (
                <li key={item} className="rounded bg-zinc-800 px-3 py-2">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle>Selecionar conta de anúncio</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={selectAccount}>
              <Input placeholder="Customer ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required />
              <Input placeholder="Nome da conta" value={name} onChange={(event) => setName(event.target.value)} required />
              <Button type="submit">Salvar conta</Button>
            </form>
            {adAccountId && <p className="mt-3 text-sm text-emerald-400">AdAccount salvo: {adAccountId}</p>}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle>Métricas da conta selecionada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={fetchMetrics} disabled={!adAccountId}>Carregar métricas</Button>
            <pre className="overflow-auto rounded bg-zinc-950 p-3 text-xs">{JSON.stringify(metrics, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
