'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-zinc-800 bg-zinc-950 lg:block">
          <Sidebar />
        </aside>
        <div className="lg:pl-72">
          <Navbar />
          <main className="px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
