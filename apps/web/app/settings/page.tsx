'use client';

import { ConsoleShell } from '@/components/layout/console-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <ConsoleShell>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Configurações</h1>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader><CardTitle>Variáveis obrigatórias (Web)</CardTitle></CardHeader>
          <CardContent className="text-sm text-zinc-300 space-y-1">
            <p>NEXT_PUBLIC_SUPABASE_URL</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            <p>NEXT_PUBLIC_API_URL</p>
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}
