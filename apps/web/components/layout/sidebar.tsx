'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Search,
  Zap,
  Image as ImageIcon,
  Settings,
  BarChart3,
  Target,
  Code2
} from 'lucide-react';

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-sky-500',
  },
  {
    label: 'Palavras-Chave',
    icon: Search,
    href: '/keywords',
    color: 'text-violet-500',
  },
  {
    label: 'Automação',
    icon: Zap,
    color: 'text-pink-700',
    href: '/automation',
  },
  {
    label: 'Imagens AI',
    icon: ImageIcon,
    color: 'text-orange-700',
    href: '/images',
  },
  {
    label: 'SEO & Site',
    icon: Target,
    color: 'text-emerald-500',
    href: '/seo',
  },
  {
    label: 'Tags & Rastreio',
    icon: Code2,
    color: 'text-blue-400',
    href: '/tags',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    color: 'text-yellow-500',
    href: '/analytics',
  },
  {
    label: 'Configurações',
    icon: Settings,
    href: '/settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#09090b] text-white border-r border-white/10 glass-dark">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-4">
             <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 animate-pulse"></div>
             <div className="relative z-10 w-full h-full bg-blue-600 rounded-lg flex items-center justify-center font-bold italic">A</div>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter neon-text-blue">
            ADS AUTO
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200',
                pathname === route.href ? 'text-white bg-white/10 neon-blue' : 'text-zinc-400'
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn('h-5 w-5 mr-3', route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
