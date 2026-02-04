'use client';

import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { COLLECTIONS, getAll, timestampToDate } from '@/lib/firebase/firestore';

/**
 * Resultado agregado por usuario: cantidad de servicios activos
 * y monto sin consumir calculado a partir de sus ventas.
 */
export interface VentasUsuarioStats {
  serviciosActivos: number;
  montoSinConsumir: number;
}

/**
 * Carga todas las ventas una sola vez y devuelve un map
 * { clienteId → { serviciosActivos, montoSinConsumir } }
 * que puede consumirse directamente en la tabla de usuarios.
 */
export function useVentasPorUsuarios() {
  const [ventas, setVentas] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const docs = await getAll<Record<string, unknown>>(COLLECTIONS.VENTAS);
        setVentas(docs);
      } catch (error) {
        console.error('Error cargando ventas:', error);
        setVentas([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  /** Map derivado: clienteId → stats agregados */
  const statsPorUsuario = useMemo(() => {
    const now = new Date();

    return ventas.reduce<Record<string, { serviciosActivos: number; montoSinConsumir: number; _servicioKeys: Set<string> }>>((acc, venta) => {
      const clienteId = venta.clienteId as string | undefined;
      if (!clienteId) return acc;

      // Identificador único del servicio dentro de esta venta
      const servicioKey = (venta.itemId as string) || (venta.ventaId as string) || (venta.servicioId as string) || '';

      const fechaInicio = venta.fechaInicio ? timestampToDate(venta.fechaInicio) : null;
      const fechaFin    = venta.fechaFin    ? timestampToDate(venta.fechaFin)    : null;
      const precioFinal = (venta.precioFinal as number) ?? (venta.precio as number) ?? 0;

      const totalDias      = fechaInicio && fechaFin ? Math.max(differenceInCalendarDays(fechaFin, fechaInicio), 0) : 0;
      const diasRestantes  = fechaFin ? Math.max(differenceInCalendarDays(fechaFin, now), 0) : 0;
      const ratioRestante  = totalDias > 0 ? Math.min(diasRestantes / totalDias, 1) : 0;
      const montoSinConsumir = totalDias > 0 ? Math.max(precioFinal * ratioRestante, 0) : 0;

      const isActivo = ((venta.estado as string) ?? 'activo') !== 'inactivo';

      if (!acc[clienteId]) {
        acc[clienteId] = { serviciosActivos: 0, montoSinConsumir: 0, _servicioKeys: new Set() };
      }

      if (isActivo && servicioKey) {
        acc[clienteId]._servicioKeys.add(servicioKey);
        acc[clienteId].montoSinConsumir += montoSinConsumir;
      }

      return acc;
    }, {});
  }, [ventas]);

  /** Versión pública sin el Set interno */
  const stats = useMemo(() => {
    const result: Record<string, VentasUsuarioStats> = {};
    for (const [id, data] of Object.entries(statsPorUsuario)) {
      result[id] = {
        serviciosActivos: data._servicioKeys.size,
        montoSinConsumir: data.montoSinConsumir,
      };
    }
    return result;
  }, [statsPorUsuario]);

  return { stats, isLoading };
}
