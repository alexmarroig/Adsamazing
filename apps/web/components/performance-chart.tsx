'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const data = [
  { name: 'Seg', total: 1400 },
  { name: 'Ter', total: 2100 },
  { name: 'Qua', total: 1800 },
  { name: 'Qui', total: 2400 },
  { name: 'Sex', total: 2800 },
  { name: 'Sab', total: 2200 },
  { name: 'Dom', total: 3100 },
];

export function PerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          stroke="#52525b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#52525b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }}
          itemStyle={{ color: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#007AFF"
          fillOpacity={1}
          fill="url(#colorTotal)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
