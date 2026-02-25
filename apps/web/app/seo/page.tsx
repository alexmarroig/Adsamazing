'use client';

import { useState } from 'react';
import { Search, ShieldCheck, Loader2, Layout, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SEOPage() {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/v1/ai/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();
      setAnalysis(result.data);
    } catch (error) {
      console.error('Erro ao analisar SEO:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Análise de SEO & Landing Page</h1>
        <p className="text-zinc-400">Otimize seu site para converter mais e pagar menos no Google Ads.</p>
      </div>

      <Card className="bg-white/5 border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-32 h-32 text-blue-500" />
        </div>
        <CardHeader>
          <CardTitle className="text-white">Analisar URL</CardTitle>
          <CardDescription>Insira o link da sua Landing Page para uma auditoria completa com IA.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              placeholder="https://seu-site.com/oferta"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 neon-blue"
              onClick={handleAnalyze}
              disabled={loading || !url}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Analisar Agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm uppercase tracking-widest text-zinc-400 font-bold">Health Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32">
                  <circle className="text-white/5" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                  <circle className="text-blue-500" strokeWidth="8" strokeDasharray={364} strokeDashoffset={364 - (364 * analysis.score) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                </svg>
                <span className="absolute text-3xl font-bold text-white">{analysis.score}</span>
              </div>
              <p className="mt-4 text-sm text-zinc-500 font-medium">Bom Desempenho</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Problemas Detectados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.issues.map((issue: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      issue.type === 'Crítico' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {issue.type}
                    </span>
                    <p className="text-sm text-zinc-200">{issue.message}</p>
                  </div>
                  <span className="text-xs text-zinc-500">Impacto: {issue.impact}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="md:col-span-3 bg-blue-600/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                Recomendações da IA para Otimização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {analysis.suggestions.map((sug: string, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-start gap-3">
                    <Layout className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                    <p className="text-sm text-white font-medium leading-relaxed">{sug}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
