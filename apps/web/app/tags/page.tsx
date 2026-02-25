'use client';

import { useState } from 'react';
import { Code2, CheckCircle2, AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TagsPage() {
  const [step, setStep] = useState(1);
  const [verified, setVerified] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Assistente de Tag de Conversão</h1>
        <p className="text-zinc-400">Instale o rastreamento do Google Ads de forma simples e automatizada.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          {[
            { id: 1, title: 'Obter Snippet', desc: 'Gerar o código base' },
            { id: 2, title: 'Instalação no Site', desc: 'Wix, Shopify, WP ou HTML' },
            { id: 3, title: 'Verificação', desc: 'Validar instalação real-time' },
          ].map((s) => (
            <div
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                step === s.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s.id ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {s.id}
                </span>
                <div>
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="text-[10px] uppercase tracking-wider">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="md:col-span-2 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && 'Copie seu Global Site Tag (gtag.js)'}
              {step === 2 && 'Instruções de Instalação'}
              {step === 3 && 'Verificador de Tag'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Copie este código e cole na seção <code className="text-blue-400">&lt;head&gt;</code> de todas as páginas do seu site.</p>
                <div className="relative group">
                  <pre className="p-4 rounded-lg bg-black/40 border border-white/10 text-xs text-blue-300 overflow-x-auto">
{`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-123456789"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-123456789');
</script>`}
                  </pre>
                  <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-zinc-500 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-white/10 bg-white/5 text-white h-16 gap-3">
                    <img src="https://www.vectorlogo.zone/logos/wix/wix-icon.svg" className="w-6 h-6" alt="Wix" />
                    Instalar no Wix
                  </Button>
                  <Button variant="outline" className="border-white/10 bg-white/5 text-white h-16 gap-3">
                    <img src="https://www.vectorlogo.zone/logos/shopify/shopify-icon.svg" className="w-6 h-6" alt="Shopify" />
                    Instalar no Shopify
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-100 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
                  <p>Dica: No Wix, use a seção "Ferramentas de Marketing" , "Google Ads" para integração automática sem código.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${verified ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                  {verified ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> : <Code2 className="w-10 h-10 text-zinc-600" />}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white">{verified ? 'Tag Detectada!' : 'Aguardando Detecção...'}</h3>
                  <p className="text-sm text-zinc-500 mt-2">Visite seu site em uma nova aba e volte aqui.</p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white neon-blue"
                  onClick={() => setVerified(true)}
                >
                  Verificar Agora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
