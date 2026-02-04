import { addMonths, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
type CicloPago = 'mensual' | 'trimestral' | 'semestral' | 'anual';
type EstadoSuscripcion = 'activa' | 'suspendida' | 'inactiva' | 'vencida';

/**
 * Calcula la fecha de vencimiento basada en fecha de inicio y ciclo de pago
 */
export function calcularFechaVencimiento(
  fechaInicio: Date,
  cicloPago: CicloPago
): Date {
  const meses = cicloPago === 'mensual' ? 1 : cicloPago === 'trimestral' ? 3 : 12;
  return addMonths(fechaInicio, meses);
}

/**
 * Calcula el porcentaje de consumo de una suscripción basado en fechas
 */
export function calcularConsumo(
  fechaInicio: Date,
  fechaVencimiento: Date
): number {
  const hoy = new Date();
  const totalDias = differenceInDays(fechaVencimiento, fechaInicio);
  const diasTranscurridos = differenceInDays(hoy, fechaInicio);

  if (totalDias === 0) return 0;
  if (diasTranscurridos <= 0) return 0;
  if (diasTranscurridos >= totalDias) return 100;

  return Math.round((diasTranscurridos / totalDias) * 100);
}

/**
 * Calcula el monto restante de una suscripción
 */
export function calcularMontoRestante(
  montoTotal: number,
  consumoPorcentaje: number
): number {
  return montoTotal * (1 - consumoPorcentaje / 100);
}

/**
 * Determina el estado de una suscripción basado en fecha de vencimiento
 */
export function calcularEstadoSuscripcion(fechaVencimiento: Date): EstadoSuscripcion {
  const hoy = new Date();
  return hoy > fechaVencimiento ? 'vencida' : 'activa';
}

/**
 * Calcula los días de retraso de una suscripción vencida
 */
export function calcularDiasRetraso(fechaVencimiento: Date): number {
  const hoy = new Date();
  const dias = differenceInDays(hoy, fechaVencimiento);
  return Math.max(0, dias);
}

/**
 * Calcula días restantes hasta el vencimiento
 */
export function calcularDiasRestantes(fechaVencimiento: Date): number {
  const hoy = new Date();
  const dias = differenceInDays(fechaVencimiento, hoy);
  return Math.max(0, dias);
}

/**
 * Formatea un número como moneda USD
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(monto);
}

/**
 * Formatea una fecha en formato legible
 */
export function formatearFecha(fecha: Date): string {
  return format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Formatea una fecha con hora en formato legible (d de MMMM del yyyy, h:mm a)
 */
export function formatearFechaHora(fecha: Date): string {
  return format(fecha, "d 'de' MMMM 'del' yyyy, h:mm a", { locale: es });
}

/**
 * Formatea una fecha en formato corto
 */
export function formatearFechaCorta(fecha: Date): string {
  return format(fecha, 'dd/MM/yyyy');
}

/**
 * Convierte moneda usando tasa de cambio
 */
export function convertirMoneda(
  monto: number,
  monedaOrigen: string,
  monedaDestino: string,
  tasas: Record<string, number>
): number {
  if (monedaOrigen === monedaDestino) return monto;

  // Convertir primero a USD si no es USD
  let montoUSD = monto;
  if (monedaOrigen !== 'USD') {
    const tasaKey = `USD_${monedaOrigen}`;
    const tasa = tasas[tasaKey] || 1;
    montoUSD = monto / tasa;
  }

  // Convertir de USD a moneda destino
  if (monedaDestino === 'USD') return montoUSD;

  const tasaKey = `USD_${monedaDestino}`;
  const tasa = tasas[tasaKey] || 1;
  return montoUSD * tasa;
}

/**
 * Calcula el costo total de un servicio
 */
export function calcularCostoServicio(
  perfiles: number,
  costoPorPerfil: number
): number {
  return perfiles * costoPorPerfil;
}

/**
 * Calcula la comisión de un revendedor
 */
export function calcularComision(
  monto: number,
  porcentajeComision: number
): number {
  return monto * (porcentajeComision / 100);
}

/**
 * Calcula rentabilidad porcentual
 */
export function calcularRentabilidad(
  ingresos: number,
  gastos: number
): number {
  if (gastos === 0) return 0;
  return ((ingresos - gastos) / gastos) * 100;
}

/**
 * Determina el color del badge según estado de suscripción
 */
export function getColorEstado(estado: EstadoSuscripcion): string {
  const colores: Record<EstadoSuscripcion, string> = {
    activa: 'bg-green-500',
    suspendida: 'bg-yellow-500',
    inactiva: 'bg-gray-500',
    vencida: 'bg-red-500'
  };

  return colores[estado] || 'bg-gray-500';
}

/**
 * Determina el color del badge según días de retraso
 */
export function getColorDiasRetraso(dias: number): string {
  if (dias >= 100) return 'bg-red-600';
  if (dias >= 11) return 'bg-red-500';
  if (dias >= 8) return 'bg-orange-500';
  if (dias >= 7) return 'bg-orange-400';
  if (dias >= 3) return 'bg-yellow-500';
  if (dias >= 2) return 'bg-yellow-400';
  if (dias >= 1) return 'bg-yellow-300';
  return 'bg-green-500';
}

/**
 * Obtiene el texto descriptivo de días de retraso
 */
export function getTextoDiasRetraso(dias: number): string {
  if (dias >= 100) return `${dias} días vencido`;
  if (dias >= 1) return `${dias} días para vencer`;
  return 'Activo';
}
