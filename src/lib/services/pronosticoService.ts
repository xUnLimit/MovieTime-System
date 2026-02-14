/**
 * Pronóstico Financiero — cálculo en memoria, sin reads Firebase.
 *
 * Recibe los arrays de ventas y servicios ya cargados en los stores de Zustand,
 * calcula el pronóstico de 4 meses y lo guarda en dashboard_stats via savePronostico.
 */

import { addMonths, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sumInUSD } from '@/lib/utils/calculations';
import { savePronostico } from '@/lib/services/dashboardStatsService';
import { CYCLE_MONTHS } from '@/lib/constants';
import type { VentaDoc } from '@/types';
import type { Servicio } from '@/types/servicios';
import type { PronosticoMensual } from '@/types/dashboard';

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

export async function recalcularYGuardarPronostico(
  ventas: VentaDoc[],
  servicios: Servicio[]
): Promise<PronosticoMensual[]> {
  const activeVentas = ventas.filter((v) => v.estado !== 'inactivo');
  const activeServicios = servicios.filter(
    (s) => s.activo && s.fechaVencimiento && s.cicloPago && s.costoServicio > 0
  );

  const hoy = new Date();
  const resultado: PronosticoMensual[] = [];

  for (let offset = 0; offset < 4; offset++) {
    const targetMonth = addMonths(startOfMonth(hoy), offset);
    const inicioMes = startOfMonth(targetMonth);
    const finMes = endOfMonth(targetMonth);

    const ventasDelMes = activeVentas.filter((v) => {
      if (!v.fechaFin || !v.cicloPago) return false;
      return caeEnMes(
        new Date(v.fechaFin),
        v.cicloPago as keyof typeof CYCLE_MONTHS,
        inicioMes,
        finMes
      );
    });

    const serviciosDelMes = activeServicios.filter((s) =>
      caeEnMes(
        new Date(s.fechaVencimiento!),
        s.cicloPago as keyof typeof CYCLE_MONTHS,
        inicioMes,
        finMes
      )
    );

    const [ingresos, gastos] = await Promise.all([
      sumInUSD(ventasDelMes.map((v) => ({ monto: v.precioFinal || 0, moneda: v.moneda || 'USD' }))),
      sumInUSD(serviciosDelMes.map((s) => ({ monto: s.costoServicio, moneda: s.moneda || 'USD' }))),
    ]);

    resultado.push({
      mes: format(targetMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase()),
      ingresos,
      gastos,
      ganancias: ingresos - gastos,
    });
  }

  await savePronostico(resultado);
  return resultado;
}
