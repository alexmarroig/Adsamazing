import { notFound } from 'next/navigation';

import { LandingRenderer } from '@/components/landing/renderer';

async function getLanding(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/v1/landing-pages/${slug}`, {
    method: 'GET',
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { data?: { jsonBlocks?: unknown } };
  return body.data ?? null;
}

export default async function LandingSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const landing = await getLanding(slug);

  if (!landing) {
    notFound();
  }

  return <LandingRenderer blocks={landing.jsonBlocks} />;
}