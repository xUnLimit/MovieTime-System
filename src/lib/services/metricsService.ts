import { VentaDoc, PagoVenta } from '@/types';
import { calcularMontoSinConsumir } from '@/lib/utils/calculations';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

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
 * @param ventas - Array of VentaDoc records (con datos del último pago)
 * @param pagosVentas - Array of PagoVenta records (all payments including renewals)
 * @returns Calculated metrics
 */
export function calculateVentasMetrics(ventas: VentaDoc[], pagosVentas: PagoVenta[] = []): VentasMetrics {
  const ventasTotales = ventas.length;

  // Ingreso Total: suma TODOS los pagos recibidos (inicial + renovaciones)
  const ingresoTotal = pagosVentas.reduce((sum, p) => sum + (p.monto || 0), 0);

  const activas = ventas.filter((v) => v.estado !== 'inactivo');

  // Ingreso Mensual Esperado: suma de ventas que vencen en el mes actual
  const hoy = new Date();
  const inicioMesActual = startOfMonth(hoy);
  const finMesActual = endOfMonth(hoy);

  const ingresoMensualEsperado = activas.reduce((sum, v) => {
    // Verificar si la venta tiene fecha de vencimiento
    if (!v.fechaFin) return sum;

    const fechaVencimiento = new Date(v.fechaFin);

    // Si la fecha de vencimiento está en el mes actual, sumar el precio del último pago
    const venceEnMesActual = isWithinInterval(fechaVencimiento, {
      start: inicioMesActual,
      end: finMesActual,
    });

    if (venceEnMesActual) {
      return sum + (v.precioFinal || 0);
    }

    return sum;
  }, 0);

  const montoSinConsumir = activas.reduce((sum, v) => {
    if (!v.fechaInicio || !v.fechaFin) return sum;
    return sum + calcularMontoSinConsumir(
      new Date(v.fechaInicio),
      new Date(v.fechaFin),
      v.precioFinal || 0
    );
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
