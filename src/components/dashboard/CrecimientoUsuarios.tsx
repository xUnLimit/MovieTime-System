'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Cliente, Revendedor } from '@/types';
import { useMemo } from 'react';
import { subMonths, format, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface CrecimientoUsuariosProps {
  clientes: Cliente[];
  revendedores: Revendedor[];
}

export function CrecimientoUsuarios({ clientes, revendedores }: CrecimientoUsuariosProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('actual');

  const currentDate = new Date();

  const data = useMemo(() => {
    if (selectedPeriod === 'actual') {
      // Datos diarios para el mes actual - total acumulado hasta cada día
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      return days.map((day) => {
        const dayNum = day.getDate();

        // Contar total de clientes hasta ese día
        const totalClientes = clientes.filter((c) => {
          const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
          return createdDate <= day;
        }).length;

        // Contar total de revendedores hasta ese día
        const totalRevendedores = revendedores.filter((r) => {
          const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
          return createdDate <= day;
        }).length;

        return {
          dia: dayNum.toString(),
          clientes: totalClientes,
          revendedores: totalRevendedores,
        };
      });
    } else {
      // Datos mensuales - total acumulado hasta cada mes
      const monthsBack = selectedPeriod === '3meses' ? 3 : selectedPeriod === '6meses' ? 6 : 12;
      const startDate = subMonths(currentDate, monthsBack - 1);
      const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: currentDate });

      return months.map((month) => {
        const monthEnd = endOfMonth(month);

        // Contar clientes hasta ese mes
        const totalClientes = clientes.filter((c) => {
          const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
          return createdDate <= monthEnd;
        }).length;

        // Contar revendedores hasta ese mes
        const totalRevendedores = revendedores.filter((r) => {
          const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
          return createdDate <= monthEnd;
        }).length;

        return {
          dia: format(month, 'MMM', { locale: es }),
          clientes: totalClientes,
          revendedores: totalRevendedores,
        };
      });
    }
  }, [selectedPeriod, clientes, revendedores, currentDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Crecimiento de Usuarios</CardTitle>
          <CardDescription className="text-sm">
            Nuevos clientes y revendedores adquiridos por mes.
          </CardDescription>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="actual">Mes actual</SelectItem>
            <SelectItem value="3meses">Últimos 3 meses</SelectItem>
            <SelectItem value="6meses">Últimos 6 meses</SelectItem>
            <SelectItem value="12meses">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-1">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95}/>
                <stop offset="50%" stopColor="#1e40af" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.4}/>
              </linearGradient>
              <linearGradient id="colorRevendedores" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9}/>
                <stop offset="50%" stopColor="#be185d" stopOpacity={0.5}/>
                <stop offset="100%" stopColor="#4a0d25" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
            <XAxis
              dataKey="dia"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
              tick={{ fill: '#a1a1aa' }}
              interval={selectedPeriod === 'actual' ? 1 : 0}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, 'auto']}
              width={30}
              tick={{ fill: '#a1a1aa' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const displayValue = value ?? 0;
                const displayName = name ?? '';
                if (name === 'clientes') return [displayValue, 'Clientes'];
                if (name === 'revendedores') return [displayValue, 'Revendedores'];
                return [displayValue, displayName];
              }}
              labelStyle={{ color: '#ffffff' }}
              animationDuration={0}
            />
            <Legend
              verticalAlign="bottom"
              height={20}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
            <Area
              type="monotone"
              dataKey="clientes"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClientes)"
              name="Clientes"
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="revendedores"
              stroke="#ec4899"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevendedores)"
              name="Revendedores"
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
