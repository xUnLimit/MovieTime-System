'use client';

import { useState, useEffect } from 'react';
import { getAll, COLLECTIONS } from '@/lib/firebase/firestore';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';
import { sumInUSD } from '@/lib/utils/calculations';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { VentaDoc } from '@/types';

interface UseIngresoMensualEsperadoResult {
  value: number | null;
  isLoading: boolean;
}

/**
 * Hook compartido que calcula el Ingreso Mensual Esperado:
 * suma (en USD) de los precioFinal de ventas activas que vencen en el mes actual.
 *
 * Usado en: DashboardMetrics, VentasMetrics
 */
export function useIngresoMensualEsperado(): UseIngresoMensualEsperadoResult {
  const [value, setValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function calculate() {
      setIsLoading(true);
      try {
        const allVentas = await getAll<VentaDoc>(COLLECTIONS.VENTAS);
        const ventasConPago = await getVentasConUltimoPago(allVentas);

        const hoy = new Date();
        const inicio = startOfMonth(hoy);
        const fin = endOfMonth(hoy);

        const ventasDelMes = ventasConPago.filter((v) => {
          if (v.estado === 'inactivo' || !v.fechaFin) return false;
          return isWithinInterval(new Date(v.fechaFin), { start: inicio, end: fin });
        });

        const total = await sumInUSD(
          ventasDelMes.map((v) => ({ monto: v.precioFinal || 0, moneda: v.moneda }))
        );

        if (!cancelled) setValue(total);
      } catch {
        if (!cancelled) setValue(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    calculate();

    const handleVentaChange = () => {
      calculate();
    };
    window.addEventListener('venta-created', handleVentaChange);
    window.addEventListener('venta-updated', handleVentaChange);
    window.addEventListener('venta-deleted', handleVentaChange);

    return () => {
      cancelled = true;
      window.removeEventListener('venta-created', handleVentaChange);
      window.removeEventListener('venta-updated', handleVentaChange);
      window.removeEventListener('venta-deleted', handleVentaChange);
    };
  }, []);

  return { value, isLoading };
}
