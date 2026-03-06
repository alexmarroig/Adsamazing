'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [loading, session, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage('Cadastro realizado. Confira seu email para confirmação (se habilitado no Supabase).');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw signInError;
        }
        router.replace('/dashboard');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Falha na autenticação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-zinc-100">Adsamazing Platform</CardTitle>
          <p className="text-center text-sm text-zinc-400">Login com email e senha</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <Input
                placeholder="Nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Processando...' : isSignup ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignup((current) => !current);
              setError(null);
              setMessage(null);
            }}
            className="mt-4 w-full text-sm text-zinc-300 underline underline-offset-4"
          >
            {isSignup ? 'Já tenho conta' : 'Criar nova conta'}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
