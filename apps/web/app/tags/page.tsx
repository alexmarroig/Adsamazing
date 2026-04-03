'use client';

import React, { useState } from 'react';
import { ConsoleShell } from '@/components/layout/console-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, ExternalLink, Code2 } from 'lucide-react';

export default function TrackingPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const gtmHeadScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`;

  const gtmBodyScript = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

  const globalTagScript = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-CONVERSION_ID');
</script>`;

  const eventSnippet = `<!-- Event snippet for Purchase conversion page -->
<script>
  gtag('event', 'conversion', {
      'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
      'value': 1.0,
      'currency': 'BRL',
      'transaction_id': ''
  });
</script>`;

  // Explicitly cast components to any to bypass React 19 / Radix UI version mismatch in build
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = Tabs as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TL = TabsList as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TT = TabsTrigger as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TC = TabsContent as any;

  return (
    <ConsoleShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Rastreamento e Pixel</h1>
          <p className="text-zinc-400">Configure o Google Tag Manager e o Pixel do Google Ads para medir seu ROI real.</p>
        </div>

        <T defaultValue="gtm" className="w-full">
          <TL className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
            <TT value="gtm">Google Tag Manager (Recomendado)</TT>
            <TT value="pixel">Google Ads Pixel (Direto)</TT>
          </TL>

          <TC value="gtm" className="space-y-6 mt-6">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  Instalação do GTM
                </CardTitle>
                <CardDescription>Cole estes códigos em todas as páginas da sua landing page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-300">Cole no &lt;head&gt;</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(gtmHeadScript, 'gtm-head')}>
                      {copied === 'gtm-head' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-black rounded-lg border border-zinc-800 overflow-x-auto text-xs text-zinc-400 leading-relaxed font-mono">
                    {gtmHeadScript}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-300">Cole logo após a tag &lt;body&gt;</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(gtmBodyScript, 'gtm-body')}>
                      {copied === 'gtm-body' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-black rounded-lg border border-zinc-800 overflow-x-auto text-xs text-zinc-400 leading-relaxed font-mono">
                    {gtmBodyScript}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <CardTitle>Por que usar o GTM?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400 space-y-2">
                <p>• Centraliza todos os seus scripts (Google Ads, Facebook, TikTok) em um só lugar.</p>
                <p>• Facilita a configuração de eventos de conversão sem precisar mexer no código da página.</p>
                <p>• Melhora a velocidade de carregamento do site.</p>
              </CardContent>
            </Card>
          </TC>

          <TC value="pixel" className="space-y-6 mt-6">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <CardTitle>Tag Global do Site</CardTitle>
                <CardDescription>Instale esta tag em todas as páginas para permitir a medição básica.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(globalTagScript, 'gtag')}>
                      {copied === 'gtag' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-black rounded-lg border border-zinc-800 overflow-x-auto text-xs text-zinc-400 font-mono">
                    {globalTagScript}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <CardTitle>Snippet de Evento (Conversão)</CardTitle>
                <CardDescription>Instale apenas na página de &quot;Obrigado&quot; ou após o checkout com sucesso.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(eventSnippet, 'event')}>
                      {copied === 'event' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <pre className="p-4 bg-black rounded-lg border border-zinc-800 overflow-x-auto text-xs text-zinc-400 font-mono">
                    {eventSnippet}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TC>
        </T>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-blue-900/30 bg-blue-900/10">
            <CardHeader>
              <CardTitle className="text-blue-300">Criação Automática</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-400">Podemos criar as ações de conversão automaticamente na sua conta do Google Ads via API.</p>
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">Criar Conversão via API</Button>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle>Links Úteis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="https://tagmanager.google.com/" target="_blank" className="flex items-center justify-between p-2 rounded hover:bg-zinc-800 text-sm text-zinc-300" rel="noreferrer">
                Acessar Google Tag Manager <ExternalLink className="w-4 h-4" />
              </a>
              <a href="https://ads.google.com/" target="_blank" className="flex items-center justify-between p-2 rounded hover:bg-zinc-800 text-sm text-zinc-300" rel="noreferrer">
                Google Ads Console <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </ConsoleShell>
  );
}
