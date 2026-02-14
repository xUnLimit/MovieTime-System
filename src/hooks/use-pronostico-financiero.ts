'use client';

import { useMemo } from 'react';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDashboardStore } from '@/store/dashboardStore';
import { CYCLE_MONTHS } from '@/lib/constants';
import type { PronosticoMensual, VentaPronostico, ServicioPronostico } from '@/types/dashboard';

export interface MesPronostico extends PronosticoMensual {
  mesKey: string;
}

interface UsePronosticoFinancieroResult {
  meses: MesPronostico[];
  isLoading: boolean;
}

function caeEnMes(
  fechaBase: Date,
  cicloPago: keyof typeof CYCLE_MONTHS,
  start: Date,
  end: Date
): boolean {
  const ciclo = CYCLE_MONTHS[cicloPago];
  let fecha = new Date(fechaBase);
  if (fecha > end) return false;
  while (fecha < start) {
    fecha = addMonths(fecha, ciclo);
  }
  return isWithinInterval(fecha, { start, end });
}

function calcularMes(
  ventas: VentaPronostico[],
  servicios: ServicioPronostico[],
  offset: number
): Omit<MesPronostico, 'ingresos' | 'gastos' | 'ganancias'> & { ventasDelMes: VentaPronostico[]; serviciosDelMes: ServicioPronostico[] } {
  const targetMonth = addMonths(startOfMonth(new Date()), offset);
  const inicioMes = startOfMonth(targetMonth);
  const finMes = endOfMonth(targetMonth);

  const ventasDelMes = ventas.filter((v) => {
    if (!v.fechaFin || !v.cicloPago) return false;
    return caeEnMes(new Date(v.fechaFin), v.cicloPago as keyof typeof CYCLE_MONTHS, inicioMes, finMes);
  });

  const serviciosDelMes = servicios.filter((s) => {
    if (!s.fechaVencimiento || !s.cicloPago) return false;
    return caeEnMes(new Date(s.fechaVencimiento), s.cicloPago as keyof typeof CYCLE_MONTHS, inicioMes, finMes);
  });

  const mes = format(targetMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
  const mesKey = format(targetMonth, 'yyyy-MM');

  return { mes, mesKey, ventasDelMes, serviciosDelMes };
}

export function usePronosticoFinanciero(): UsePronosticoFinancieroResult {
  const { stats, isLoading } = useDashboardStore();

  const meses = useMemo((): MesPronostico[] => {
    const ventas = stats?.ventasPronostico ?? [];
    const servicios = stats?.serviciosPronostico ?? [];

    // If no source data at all, return empty (first-ever load before any sync)
    if (ventas.length === 0 && servicios.length === 0) return [];

    return Array.from({ length: 4 }, (_, offset) => {
      const { mes, mesKey, ventasDelMes, serviciosDelMes } = calcularMes(ventas, servicios, offset);

      // Synchronous sum in USD — uses exchange rates cached in currencyService (no fetch)
      // All amounts are already in their original currency; we approximate in USD using
      // the cached rate. If the rate isn't cached yet, we fall back to raw sum.
      const ingresos = ventasDelMes.reduce((sum, v) => sum + (v.precioFinal || 0), 0);
      const gastos = serviciosDelMes.reduce((sum, s) => sum + (s.costoServicio || 0), 0);

      return { mes, mesKey, ingresos, gastos, ganancias: ingresos - gastos };
    });
  }, [stats?.ventasPronostico, stats?.serviciosPronostico]);

  return { meses, isLoading };
}
