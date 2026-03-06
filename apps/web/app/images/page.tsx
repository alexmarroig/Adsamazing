'use client';

import { useState } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api';

export default function ImagesPage() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const generate = async () => {
    if (!token) {
      return;
    }

    try {
      const data = await api.post<Record<string, unknown>>('/v1/ai/ad-copy/generate', token, {
        niche: 'marketing',
        audience: 'buyers',
        intent: 'commercial',
        productName: prompt || 'Produto',
      });
      setResult(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao gerar copy');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Ad Copy Generator</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Gerar copy de anúncio</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Produto ou oferta" />
            <Button onClick={generate}>Gerar</Button>
            <pre className="rounded bg-zinc-950 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
