'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';
import { AccountSelector } from './account-selector';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <AccountSelector />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-zinc-300 md:block">{user?.email}</span>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          onClick={async () => {
            await signOut();
            router.replace('/');
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
