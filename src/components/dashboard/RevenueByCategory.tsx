'use client';

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
import { Suscripcion } from '@/types';

interface RevenueByCategoryProps {
  suscripciones: Suscripcion[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
];

export function RevenueByCategory({ suscripciones }: RevenueByCategoryProps) {
  // Agrupar suscripciones por categoría y calcular rentabilidad
  const categoryData = suscripciones.reduce((acc, suscripcion) => {
    if (suscripcion.estado === 'activa') {
      const categoria = suscripcion.categoriaNombre;
      if (!acc[categoria]) {
        acc[categoria] = {
          ingresos: 0,
          gastos: 0,
        };
      }
      acc[categoria].ingresos += suscripcion.monto;
      // Asumimos un costo aproximado de 30% del ingreso como gasto por servicio
      acc[categoria].gastos += suscripcion.monto * 0.3;
    }
    return acc;
  }, {} as Record<string, { ingresos: number; gastos: number }>);

  const data = Object.entries(categoryData)
    .map(([categoria, values]) => ({
      categoria,
      rentabilidad: Math.round(values.ingresos - values.gastos),
    }))
    .sort((a, b) => b.rentabilidad - a.rentabilidad); // Ordenar por rentabilidad descendente

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
      <CardContent className="pt-1">
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
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Rentabilidad']}
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
                formatter={(value: any) => `$${value ?? 0}`}
                fill="#ffffff"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
