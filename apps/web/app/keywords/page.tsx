'use client';

import { useState } from 'react';
import { Search, Sparkles, Loader2, Target, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KeywordsPage() {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState('');
  const [goals, setGoals] = useState('');
  const [suggestions, setSuggestions] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/v1/ai/keywords/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, goals }),
      });
      const result = await response.json();
      setSuggestions(result.data);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pesquisa Ultra Avançada</h1>
        <p className="text-zinc-400">Use inteligência artificial para encontrar as melhores oportunidades.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Configurar Análise
            </CardTitle>
            <CardDescription>Descreva seu nicho e objetivos para a IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Nicho / Setor</label>
              <input
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="Ex: E-commerce de moda feminina"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Objetivos Principais</label>
              <textarea
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none h-32"
                placeholder="Ex: Aumentar vendas com ROI de 4x e reduzir custo por clique"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 neon-blue h-12"
              onClick={handleGenerate}
              disabled={loading || !niche}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Estratégia Avançada
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Sugestões de SEO & Palavras-Chave
            </CardTitle>
            <CardDescription>Resultados baseados em IA e dados reais.</CardDescription>
          </CardHeader>
          <CardContent>
            {!suggestions ? (
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg text-zinc-500 text-center px-4">
                Aguardando configuração... <br/>Insira os dados ao lado para começar.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Palavras-Chave Recomendadas</h4>
                  <div className="space-y-2">
                    {suggestions.keywords.map((kw: any) => (
                      <div key={kw.term} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/50 transition-all group">
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{kw.term}</p>
                          <p className="text-xs text-zinc-500">Vol: {kw.volume} | Comp: {kw.competition}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-500">{kw.cpc}</p>
                          <p className="text-xs text-zinc-500">CPC Est.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Títulos de Alta Conversão</h4>
                  <div className="grid gap-2">
                    {suggestions.titles.map((title: string) => (
                      <div key={title} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-100 italic">
                        "{title}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
