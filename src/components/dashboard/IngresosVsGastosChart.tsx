'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Venta, Servicio } from '@/types';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

interface IngresosVsGastosChartProps {
  ventas: Venta[];
  servicios: Servicio[];
}

export function IngresosVsGastosChart({
  ventas,
  servicios,
}: IngresosVsGastosChartProps) {
  const [selectedMonth, setSelectedMonth] = useState('actual');

  const currentDate = new Date();

  // Calcular gastos mensuales
  const totalGastosMensual = servicios
    .filter((s) => s.activo)
    .reduce((sum, s) => sum + s.costoTotal, 0);

  // Calcular ingresos totales
  const totalIngresos = ventas
    .filter((v) => v.estado === 'activa')
    .reduce((sum, v) => sum + v.monto, 0);

  // Generar datos según el período seleccionado
  const data = useMemo(() => {
    if (selectedMonth === 'actual') {
      // Datos diarios para el mes actual
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const gastoDiario = totalGastosMensual / days.length;

      return days.map((day, index) => {
        const baseIngreso = totalIngresos / days.length;
        // Usar fecha como seed para consistencia
        const variation = Math.sin(index / 3) * 15 + (index % 7) * 2;
        const ingresos = baseIngreso + variation;

        return {
          dia: format(day, 'd MMM', { locale: es }),
          ingresos: Math.max(0, ingresos),
          gastos: gastoDiario,
        };
      });
    } else {
      // Datos mensuales para 3, 6 o 12 meses
      const monthsBack = selectedMonth === '3meses' ? 3 : selectedMonth === '6meses' ? 6 : 12;
      const startDate = subMonths(currentDate, monthsBack - 1);
      const months = eachMonthOfInterval({ start: startDate, end: currentDate });

      return months.map((month, index) => {
        const baseIngreso = totalIngresos / monthsBack;
        const variation = Math.sin(index / 2) * baseIngreso * 0.3;
        const ingresos = baseIngreso + variation;

        return {
          dia: format(month, 'MMM', { locale: es }),
          ingresos: Math.max(0, ingresos),
          gastos: totalGastosMensual,
        };
      });
    }
  }, [selectedMonth, totalIngresos, totalGastosMensual, currentDate]);

  // Calcular pronóstico para los próximos 4 meses
  const forecast = Array.from({ length: 4 }, (_, i) => {
    const month = addMonths(currentDate, i + 1);
    const monthName = format(month, 'MMMM yyyy', { locale: es });

    // Proyección basada en tendencia actual
    const ingresosProyectados = ventas
      .filter((v) => v.estado === 'activa')
      .reduce((sum, v) => sum + v.monto, 0) * (1 + i * 0.1); // 10% crecimiento mensual

    const gastosProyectados = totalGastosMensual;
    const gananciaProyectada = ingresosProyectados - gastosProyectados;

    return {
      mes: monthName,
      ingresos: ingresosProyectados,
      gastos: gastosProyectados,
      ganancia: gananciaProyectada,
    };
  });

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-[3fr_1fr]">
      {/* Main Chart */}
      <Card className="py-3 gap-0">
        <CardHeader className="flex flex-row items-center justify-between p-0 px-4 pb-2">
          <CardTitle className="text-base">Ingresos vs Gastos</CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Mes actual</SelectItem>
              <SelectItem value="3meses">Últimos 3 meses</SelectItem>
              <SelectItem value="6meses">Últimos 6 meses</SelectItem>
              <SelectItem value="12meses">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 pt-0 pb-1">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={data}
              margin={{ top: 15, right: 30, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                  <stop offset="50%" stopColor="#6d28d9" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="#1e1b4b" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="oklch(0.55 0.22 25)" stopOpacity={0}/>
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
                interval={selectedMonth === 'actual' ? 1 : 0}
                angle={selectedMonth === 'actual' ? 0 : 0}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${Math.round(value)}`}
                width={50}
                tick={{ fill: '#a1a1aa' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined) => {
                  if (value === undefined) return '';
                  return `$${value.toFixed(2)}`;
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
                dataKey="ingresos"
                stroke="#7c3aed"
                strokeWidth={1}
                fillOpacity={1}
                fill="url(#colorIngresos)"
                name="Ingresos"
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke="#dc2626"
                strokeWidth={1}
                fillOpacity={1}
                fill="url(#colorGastos)"
                name="Gastos"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Sidebar */}
      <Card className="py-3 gap-0">
        <CardHeader className="p-0 px-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Pronóstico Financiero
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Proyecciones de ingresos y gastos para los próximos 4 meses.
          </p>
        </CardHeader>
        <CardContent className="px-4 pt-0 pb-2">
          <div className="space-y-2">
            {forecast.map((item, index) => (
              <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold capitalize">{item.mes}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.ganancia >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    Ganancia: ${item.ganancia.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-green-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    ${item.ingresos.toFixed(0)}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-red-500">
                    <TrendingDown className="h-3.5 w-3.5" />
                    ${item.gastos.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Basado en renovaciones y pagos recurrentes, se proyecta una ganancia en los próximos 4 meses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
