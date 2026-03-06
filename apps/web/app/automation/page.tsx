'use client';

import { FormEvent, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const queueOptions = [
  'product_discovery',
  'product_scrape',
  'keyword_intel',
  'landing_generate',
  'campaign_build',
  'campaign_optimize',
  'analytics_rollup',
  'affiliate_reconcile',
];

export default function AutomationPage() {
  const { token } = useAuth();
  const [queueName, setQueueName] = useState(queueOptions[0]);
  const [idempotencyKey, setIdempotencyKey] = useState(`manual-${Date.now()}`);
  const [payloadJson, setPayloadJson] = useState('{"query":"marketing"}');
  const [jobResult, setJobResult] = useState<{ jobId?: string; dbJobId?: string; deduplicated?: boolean } | null>(null);
  const [jobIdLookup, setJobIdLookup] = useState('');
  const [jobStatus, setJobStatus] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enqueue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const result = await api.post<{ jobId: string; dbJobId: string; deduplicated: boolean }>('/v1/jobs', token, {
        queueName,
        idempotencyKey,
        payload,
      });

      setJobResult(result);
      setError(null);
      setJobIdLookup(result.dbJobId ?? '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao criar job');
    }
  };

  const fetchJob = async () => {
    if (!token || !jobIdLookup) {
      return;
    }

    try {
      const result = await api.get<Record<string, unknown>>(`/v1/jobs/${jobIdLookup}`, token);
      setJobStatus(result);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao buscar job');
    }
  };

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Jobs e Worker</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Enfileirar job manual</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={enqueue}>
              <select
                value={queueName}
                onChange={(event) => setQueueName(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3"
              >
                {queueOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <Input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} placeholder="Idempotency key" required />
              <textarea
                value={payloadJson}
                onChange={(event) => setPayloadJson(event.target.value)}
                className="min-h-28 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <Button type="submit">Enviar job</Button>
            </form>
            <pre className="mt-3 rounded bg-zinc-950 p-3 text-xs">{JSON.stringify(jobResult, null, 2)}</pre>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Status de job</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={jobIdLookup} onChange={(event) => setJobIdLookup(event.target.value)} placeholder="DB Job ID (UUID)" />
              <Button onClick={fetchJob}>Consultar</Button>
            </div>
            <pre className="rounded bg-zinc-950 p-3 text-xs">{JSON.stringify(jobStatus, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
