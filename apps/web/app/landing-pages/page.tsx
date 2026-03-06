'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type LandingPage = {
  id: string;
  slug: string;
  status: string;
  title: string;
  productId: string;
};

export default function LandingPagesPage() {
  const { token } = useAuth();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [productId, setProductId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const result = await api.get<LandingPage[]>('/v1/landing-pages?limit=30', token);
      setPages(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar landing pages');
    }
  }, [token]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await api.post('/v1/landing-pages/generate', token, { productId, tone: 'direct-response', audience: 'buyers' });
      setProductId('');
      await loadPages();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao gerar landing page');
    }
  };

  const publish = async (landingPageId: string) => {
    if (!token) {
      return;
    }

    try {
      await api.post(`/v1/landing-pages/${landingPageId}/publish`, token, {});
      await loadPages();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao publicar');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Landing Pages</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Gerar landing page</CardTitle></CardHeader>
          <CardContent>
            <form className="flex gap-3" onSubmit={generate}>
              <Input placeholder="Product ID" value={productId} onChange={(event) => setProductId(event.target.value)} required />
              <Button type="submit">Gerar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Páginas geradas</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {pages.map((item) => (
                <li key={item.id} className="rounded bg-zinc-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{item.title} ({item.status})</span>
                    <div className="flex gap-2">
                      <a className="underline" href={`/l/${item.slug}`} target="_blank" rel="noreferrer">Visualizar</a>
                      {item.status !== 'published' && (
                        <Button size="sm" onClick={() => publish(item.id)}>Publicar</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
