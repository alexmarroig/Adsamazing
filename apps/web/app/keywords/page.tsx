'use client';

import { useState } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api';

export default function KeywordsPage() {
  const { token } = useAuth();
  const [keywords, setKeywords] = useState('');
  const [vectors, setVectors] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);

  const runEmbedding = async () => {
    if (!token) {
      return;
    }

    try {
      const items = keywords.split(',').map((item) => item.trim()).filter(Boolean);
      const result = await api.post<{ vectors: number[][] }>('/v1/ai/keywords/embeddings', token, { keywords: items });
      setVectors(result.vectors);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao gerar embeddings');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Keyword Intelligence</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Embeddings semânticos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="kw1, kw2, kw3" />
            <Button onClick={runEmbedding}>Gerar embeddings</Button>
            <p className="text-sm text-zinc-300">Vetores retornados: {vectors.length}</p>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
