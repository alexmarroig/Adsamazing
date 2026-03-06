'use client';

import { FormEvent, useState } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TrackingPage() {
  const [slug, setSlug] = useState('');
  const [sessionKey, setSessionKey] = useState(`sess-${Date.now()}`);
  const [clickId, setClickId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicApi = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const trackClick = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch(`${publicApi}/v1/tracking/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landingPageSlug: slug,
          source: 'google',
          medium: 'cpc',
          campaign: 'manual-test',
          sessionKey,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Falha no tracking');
      }
      const newClickId = body?.data?.clickId as string;
      setClickId(newClickId);
      setMessage(`Click registrado: ${newClickId}`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro no click tracking');
    }
  };

  const trackConversion = async () => {
    try {
      const response = await fetch(`${publicApi}/v1/tracking/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey,
          clickId: clickId || undefined,
          value: 97,
          currencyCode: 'BRL',
          externalOrderId: `ord-${Date.now()}`,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Falha na conversão');
      }
      setMessage(`Conversão registrada: ${body?.data?.conversionId as string}`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro na conversão');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Tracking & Attribution</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Click tracking</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={trackClick}>
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Landing slug" required />
              <Input value={sessionKey} onChange={(event) => setSessionKey(event.target.value)} placeholder="Session key" required />
              <Button type="submit">Registrar click</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Conversion tracking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={clickId} onChange={(event) => setClickId(event.target.value)} placeholder="Click ID (opcional)" />
            <Button onClick={trackConversion}>Registrar conversão</Button>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
