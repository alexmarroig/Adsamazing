import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, MousePointer2, RefreshCw } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-zinc-400">Bem-vindo ao futuro da gestão de tráfego.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 neon-blue">
          <RefreshCw className="w-4 h-4" />
          Sincronizar Dados
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Spend', value: 'R$ 12,450.00', icon: BarChart3, trend: '+12.5%', color: 'text-blue-500' },
          { title: 'Conversions', value: '1,240', icon: TrendingUp, trend: '+8.2%', color: 'text-emerald-500' },
          { title: 'CTR', value: '4.2%', icon: MousePointer2, trend: '+2.1%', color: 'text-violet-500' },
          { title: 'Active Ads', value: '48', icon: Users, trend: '0%', color: 'text-orange-500' },
        ].map((item) => (
          <Card key={item.title} className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-zinc-400">{item.title}</CardTitle>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <p className="text-xs text-zinc-500">
                <span className="text-emerald-500">{item.trend}</span> em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Performance em Tempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart />
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Alertas de Automação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Lance ajustado automaticamente</p>
                    <p className="text-xs text-zinc-500">Campanha "Performance Max - Verão"</p>
                  </div>
                  <div className="text-xs text-zinc-500">2m atrás</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
