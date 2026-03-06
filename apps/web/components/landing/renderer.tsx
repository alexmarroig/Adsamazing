import type { ReactNode } from 'react';

type LandingBlock = {
  headline?: string;
  hero?: string;
  benefits?: string[];
  testimonials?: Array<{ author: string; quote: string }>;
  cta?: string;
  faq?: Array<{ question: string; answer: string }>;
  comparisonTable?: Array<{ item: string; value: string }>;
};

function toArrayString(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === 'string');
}

function toFaq(input: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const question = typeof (item as { question?: unknown }).question === 'string' ? (item as { question: string }).question : '';
      const answer = typeof (item as { answer?: unknown }).answer === 'string' ? (item as { answer: string }).answer : '';
      if (!question || !answer) {
        return null;
      }

      return { question, answer };
    })
    .filter((item): item is { question: string; answer: string } => item !== null);
}

function toComparison(input: unknown): Array<{ item: string; value: string }> {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return null;
      }
      const item = typeof (entry as { item?: unknown }).item === 'string' ? (entry as { item: string }).item : '';
      const value = typeof (entry as { value?: unknown }).value === 'string' ? (entry as { value: string }).value : '';
      if (!item || !value) {
        return null;
      }
      return { item, value };
    })
    .filter((entry): entry is { item: string; value: string } => entry !== null);
}

export function LandingRenderer({ blocks }: { blocks: unknown }): ReactNode {
  const data = (typeof blocks === 'object' && blocks !== null ? blocks : {}) as LandingBlock;
  const benefits = toArrayString(data.benefits);
  const testimonials = Array.isArray(data.testimonials) ? data.testimonials : [];
  const faq = toFaq(data.faq);
  const comparison = toComparison(data.comparisonTable);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100">
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{data.headline ?? 'Oferta Exclusiva'}</h1>
        <p className="mt-4 text-zinc-300 text-lg">{data.hero ?? 'Landing page gerada automaticamente para maximizar conversões.'}</p>
        <button className="mt-8 rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">{data.cta ?? 'Quero começar agora'}</button>
      </section>

      {benefits.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-2xl font-semibold mb-4">Benefícios</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-2xl font-semibold mb-4">Depoimentos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <article key={`${testimonial.author}-${index}`} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <p className="text-zinc-200">\"{testimonial.quote}\"</p>
                <p className="mt-2 text-sm text-zinc-400">{testimonial.author}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {comparison.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-2xl font-semibold mb-4">Comparação</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-700">
            {comparison.map((row) => (
              <div key={`${row.item}-${row.value}`} className="grid grid-cols-2 border-b border-zinc-800 px-4 py-3 last:border-b-0">
                <span>{row.item}</span>
                <span className="text-zinc-300">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10 pb-20">
          <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <div key={item.question} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-2 text-zinc-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}