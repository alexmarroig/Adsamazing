import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Ads Autopilot',
  description: 'SaaS para automatizar sincronização de métricas de anúncios.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
