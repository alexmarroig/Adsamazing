'use client';

import { useState } from 'react';
import { Zap, Plus, Play, Pause, Trash2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AutomationPage() {
  const [rules, setRules] = useState([
    { id: '1', name: 'Pausar se CPC > R$ 10', metric: 'CPC', operator: '>', value: 10, action: 'Pausar Anúncio', active: true },
    { id: '2', name: 'Aumentar Lance se Conversão > 5%', metric: 'Taxa de Conv.', operator: '>', value: 5, action: 'Aumentar Lance 20%', active: false },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Automações Inteligentes</h1>
          <p className="text-zinc-400">Configure regras para monitorar e agir automaticamente em suas campanhas.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 neon-blue">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      <div className="grid gap-6">
        {rules.map((rule) => (
          <Card key={rule.id} className={`bg-white/5 border-white/10 ${!rule.active && 'opacity-60'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${rule.active ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-500/20 text-zinc-500'}`}>
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{rule.name}</h3>
                    <p className="text-sm text-zinc-500">
                      Se <span className="text-zinc-300 font-medium">{rule.metric}</span> {rule.operator} <span className="text-zinc-300 font-medium">{rule.value}</span>, então <span className="text-blue-400 font-medium">{rule.action}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 text-zinc-400">
                    <Bell className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 text-zinc-400">
                    {rule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="border-white/10 hover:bg-red-500/20 hover:text-red-500 text-zinc-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/5 border-white/10 border-dashed">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-500" />
            Logs de Execução Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: '10:45', rule: 'Pausar se CPC > R$ 10', status: 'Executado', details: 'Campanha "Verão 2024" pausada (CPC: R$ 12.40)' },
              { time: '09:00', rule: 'Ajuste de Lance Diário', status: 'Verificado', details: 'Nenhuma ação necessária' },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-black/20 border border-white/5">
                <span className="text-xs text-zinc-500 mt-1 font-mono">{log.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{log.rule}</p>
                  <p className="text-xs text-zinc-500">{log.details}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  log.status === 'Executado' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
