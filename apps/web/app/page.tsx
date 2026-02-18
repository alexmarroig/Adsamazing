import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Ads Autopilot</h1>
        <p className="text-sm text-slate-600">
          Placeholder de login. Em breve: autenticação Supabase + OAuth Google Ads.
        </p>
        <div className="flex gap-3">
          <Button>Entrar (placeholder)</Button>
          <Link href="/dashboard" className="inline-flex">
            <Button variant="outline">Ir para Dashboard</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
