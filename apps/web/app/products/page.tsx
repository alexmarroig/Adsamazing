'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Product = {
  id: string;
  title: string;
  category?: string;
  commissionPct?: number;
};

type RankedProduct = {
  title: string;
  rankingScore: number;
};

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ranked, setRanked] = useState<RankedProduct[]>([]);
  const [title, setTitle] = useState('');
  const [externalId, setExternalId] = useState('');
  const [network, setNetwork] = useState('hotmart');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get<Product[]>('/v1/products?limit=30', token);
      setProducts(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar produtos');
    }
  }, [token]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/products', token, {
        network,
        externalId,
        title,
        category: 'marketing',
        commissionPct: 40,
      });
      setTitle('');
      setExternalId('');
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao criar produto');
    }
  };

  const discoverProducts = async () => {
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/products/discover', token, { network, query });
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao disparar discovery');
    }
  };

  const rankProducts = async () => {
    if (!token) {
      return;
    }

    try {
      const result = await api.post<RankedProduct[]>('/v1/products/rank', token, { network, query });
      setRanked(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao ranquear produtos');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Produtos Afiliados</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Criar produto manual</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={createProduct}>
              <Input placeholder="Rede" value={network} onChange={(event) => setNetwork(event.target.value)} required />
              <Input placeholder="External ID" value={externalId} onChange={(event) => setExternalId(event.target.value)} required />
              <Input placeholder="Título" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <Button type="submit">Salvar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Discovery e ranking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Rede" value={network} onChange={(event) => setNetwork(event.target.value)} />
              <Input placeholder="Query" value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="flex gap-2">
                <Button onClick={discoverProducts}>Discovery</Button>
                <Button variant="outline" onClick={rankProducts}>Rankear</Button>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {ranked.map((item) => (
                <li key={item.title} className="rounded bg-zinc-800 px-3 py-2">
                  {item.title} - score {item.rankingScore.toFixed(2)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Produtos cadastrados</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {products.map((item) => (
                <li key={item.id} className="rounded bg-zinc-800 px-3 py-2">
                  {item.title} {item.commissionPct ? `(${item.commissionPct}% comissão)` : ''}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
