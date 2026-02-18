'use client';

import { useState, useEffect } from 'react';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDashboardStore } from '@/store/dashboardStore';
import { CYCLE_MONTHS } from '@/lib/constants';
import type { PronosticoMensual } from '@/types/dashboard';
import { currencyService } from '@/lib/services/currencyService';

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

export function usePronosticoFinanciero(): UsePronosticoFinancieroResult {
  const { stats, isLoading: statsLoading } = useDashboardStore();
  const [meses, setMeses] = useState<MesPronostico[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calcular = async () => {
      const ventas = stats?.ventasPronostico ?? [];
      const servicios = stats?.serviciosPronostico ?? [];

      if (ventas.length === 0 && servicios.length === 0) {
        setMeses([]);
        return;
      }

      setIsCalculating(true);
      try {
        // Pre-load exchange rates once, then use sync conversion for all items
        await currencyService.ensureRatesLoaded();

        const hoy = new Date();
        const inicioMesActual = startOfMonth(hoy);

        const mesesCalculados = Array.from({ length: 4 }, (_, offset) => {
          const targetMonth = addMonths(startOfMonth(hoy), offset);
          const inicioMes = startOfMonth(targetMonth);
          const finMes = endOfMonth(targetMonth);

          const ventasDelMes = ventas.filter((v) => {
            if (!v.fechaFin || !v.cicloPago) return false;
            const fechaFin = new Date(v.fechaFin);
            // Ventas vencidas antes del mes actual → incluir siempre en el mes actual
            if (offset === 0 && fechaFin < inicioMesActual) return true;
            return caeEnMes(fechaFin, v.cicloPago as keyof typeof CYCLE_MONTHS, inicioMes, finMes);
          });

          const serviciosDelMes = servicios.filter((s) => {
            if (!s.fechaVencimiento || !s.cicloPago) return false;
            return caeEnMes(new Date(s.fechaVencimiento), s.cicloPago as keyof typeof CYCLE_MONTHS, inicioMes, finMes);
          });

          // Sync conversion — no await needed, rates are already cached
          const ingresos = ventasDelMes.reduce(
            (sum, v) => sum + currencyService.convertToUSDSync(v.precioFinal || 0, v.moneda || 'USD'),
            0
          );
          const gastos = serviciosDelMes.reduce(
            (sum, s) => sum + currencyService.convertToUSDSync(s.costoServicio || 0, s.moneda || 'USD'),
            0
          );

          const mes = format(targetMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
          const mesKey = format(targetMonth, 'yyyy-MM');

          return { mes, mesKey, ingresos, gastos, ganancias: ingresos - gastos };
        });

        setMeses(mesesCalculados);
      } catch (error) {
        console.error('[PronosticoFinanciero] Error calculando:', error);
        setMeses([]);
      } finally {
        setIsCalculating(false);
      }
    };

    calcular();
  }, [stats?.ventasPronostico, stats?.serviciosPronostico]);

  return { meses, isLoading: statsLoading || isCalculating };
}
