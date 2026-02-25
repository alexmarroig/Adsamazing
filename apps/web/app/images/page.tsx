'use client';

import { useState } from 'react';
import { ImageIcon, Wand2, Download, Loader2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ImagesPage() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/v1/ai/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: '1024x1024' }),
      });
      const result = await response.json();
      setGeneratedImage(result.data.url);
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Criador de Criativos AI</h1>
        <p className="text-zinc-400">Gere imagens profissionais para Display e Performance Max em segundos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-pink-500" />
              Prompt do Criativo
            </CardTitle>
            <CardDescription>Descreva a imagem que você deseja criar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:ring-2 focus:ring-pink-500 transition-all outline-none h-40 resize-none"
              placeholder="Ex: Um tênis de corrida futurista flutuando em um cenário cyberpunk com luzes neon azuis e roxas."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-2">
              {['Quadrado (1:1)', 'Retrato (9:16)', 'Paisagem (1.91:1)'].map((size) => (
                <Button key={size} variant="outline" className="text-xs border-white/10 bg-white/5 text-zinc-400 hover:text-white">
                  {size}
                </Button>
              ))}
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-700 hover:to-violet-700 text-white gap-2 neon-blue h-12 border-none"
              onClick={handleGenerate}
              disabled={loading || !prompt}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              Gerar Imagem com DALL-E 3
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-white">Preview do Criativo</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-0 relative min-h-[400px]">
            {!generatedImage && !loading ? (
              <div className="text-center p-8">
                <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 italic">Sua criação aparecerá aqui...</p>
              </div>
            ) : loading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
                <p className="text-zinc-400 animate-pulse">A IA está pintando sua ideia...</p>
              </div>
            ) : (
              <div className="group relative w-full h-full">
                <img src={generatedImage!} alt="AI Generated" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button size="icon" variant="outline" className="border-white/20 bg-white/10 text-white">
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="border-white/20 bg-white/10 text-white">
                    <Maximize2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
