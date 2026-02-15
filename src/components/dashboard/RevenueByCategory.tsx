'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useDashboardStore } from '@/store/dashboardStore';
import { Skeleton } from '@/components/ui/skeleton';
import type { IngresoCategoria } from '@/types/dashboard';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
];

export function RevenueByCategory() {
  const { stats, isLoading } = useDashboardStore();

  const { data, hasData } = useMemo(() => {
    const ingresosPorCategoria: IngresoCategoria[] = stats?.ingresosPorCategoria ?? [];
    const hasData = ingresosPorCategoria.length > 0 && ingresosPorCategoria.some((c) => c.total > 0);
    const data = ingresosPorCategoria
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        categoria: c.nombre,
        rentabilidad: Math.round(c.total),
      }));
    return { data, hasData };
  }, [stats]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base">Rentabilidad por Categoría</CardTitle>
          <CardDescription className="text-sm">
            Ganancia neta generada por cada categoría de servicio.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-1 h-[220px]">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-lg" />
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 50, top: 5, bottom: 5 }}>
              <XAxis
                type="number"
                stroke="#a1a1aa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                tick={{ fill: '#a1a1aa' }}
              />
              <YAxis
                type="category"
                dataKey="categoria"
                stroke="#ffffff"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={90}
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#ffffff',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)} USD`, 'Rentabilidad']}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
              />
              <Bar
                dataKey="rentabilidad"
                radius={[0, 12, 12, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
                barSize={20}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="rentabilidad"
                  position="right"
                  formatter={(value) => `$${value ?? 0}`}
                  fill="#ffffff"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
