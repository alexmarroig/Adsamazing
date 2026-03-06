'use client';

import { useState } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api';

export default function SeoPage() {
  const { token } = useAuth();
  const [productName, setProductName] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!token) {
      return;
    }

    try {
      const data = await api.post<Record<string, unknown>>('/v1/ai/landing/blocks', token, {
        productName,
        audience: 'buyers',
        tone: 'direct-response',
      });
      setResult(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao gerar estrutura SEO/CRO');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">SEO & Landing Structure</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Gerar blocos de landing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Nome do produto" />
            <Button onClick={run}>Gerar blocos</Button>
            <pre className="rounded bg-zinc-950 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
