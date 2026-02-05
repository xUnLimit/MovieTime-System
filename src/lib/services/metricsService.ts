import { VentaDoc } from '@/types';
import { calcularConsumo, calcularMontoRestante } from '@/lib/utils/calculations';
import { CYCLE_MONTHS } from '@/lib/constants';

export interface VentasMetrics {
  ventasTotales: number;
  ingresoTotal: number;
  ingresoMensualEsperado: number;
  montoSinConsumir: number;
  ventasActivas: number;
  ventasInactivas: number;
}

/**
 * Calculate metrics for ventas
 * @param ventas - Array of VentaDoc records
 * @returns Calculated metrics
 */
export function calculateVentasMetrics(ventas: VentaDoc[]): VentasMetrics {
  const ventasTotales = ventas.length;
  const ingresoTotal = ventas.reduce((sum, v) => sum + (v.precioFinal || 0), 0);
  
  const activas = ventas.filter((v) => v.estado !== 'inactivo');
  
  const ingresoMensualEsperado = activas.reduce((sum, v) => {
    const meses = v.cicloPago ? CYCLE_MONTHS[v.cicloPago] : 1;
    return sum + (v.precioFinal || 0) / meses;
  }, 0);
  
  const montoSinConsumir = activas.reduce((sum, v) => {
    if (!v.fechaInicio || !v.fechaFin) return sum;
    const consumo = calcularConsumo(new Date(v.fechaInicio), new Date(v.fechaFin));
    return sum + calcularMontoRestante(v.precioFinal || 0, consumo);
  }, 0);
  
  return {
    ventasTotales,
    ingresoTotal,
    ingresoMensualEsperado,
    montoSinConsumir,
    ventasActivas: activas.length,
    ventasInactivas: ventas.filter((v) => v.estado === 'inactivo').length,
  };
}
