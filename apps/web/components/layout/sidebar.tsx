'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, Briefcase, LayoutDashboard, Link2, Rocket, Settings, Workflow } from 'lucide-react';

import { cn } from '@/lib/utils';

const routes = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/google-ads', label: 'Google Ads', icon: Rocket },
  { href: '/products', label: 'Produtos', icon: Boxes },
  { href: '/landing-pages', label: 'Landing Pages', icon: Link2 },
  { href: '/campaigns', label: 'Campanhas', icon: Briefcase },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/automation', label: 'Jobs/Worker', icon: Workflow },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Ads + Afiliados</p>
        <h1 className="mt-1 text-xl font-semibold">Control Center</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {routes.map((route) => {
          const active = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
