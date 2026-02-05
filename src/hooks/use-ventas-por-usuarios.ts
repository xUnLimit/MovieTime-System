'use client';

import { useEffect, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { COLLECTIONS, queryDocuments } from '@/lib/firebase/firestore';

/**
 * Resultado agregado por usuario: monto sin consumir calculado
 * a partir de sus ventas activas.
 * `serviciosActivos` ya viene denormalizado en el doc del usuario
 * como campo `ventasActivas` — no se calcula aquí.
 */
export interface VentasUsuarioStats {
  montoSinConsumir: number;
}

// Cache a nivel de módulo: persiste entre montajes de componentes.
// Key = idsKey (IDs ordenados y concatenados), Value = { data, ts }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const ventasCache = new Map<string, { data: Record<string, VentasUsuarioStats>; ts: number }>();

/**
 * Carga solo las ventas activas de los usuarios de la página actual
 * usando una query `clienteId in [ids]`.
 * Calcula montoSinConsumir por usuario.
 *
 * @param clienteIds – IDs de los usuarios visibles en la página (máx 10)
 */
export function useVentasPorUsuarios(clienteIds: string[], { enabled = true } = {}) {
  const [stats, setStats] = useState<Record<string, VentasUsuarioStats>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Key estable para evitar re-renders por referencia
  const idsKey = clienteIds.join(',');

  useEffect(() => {
    // No disparar hasta que los datos de la página estén listos
    if (!enabled) return;

    // Sin IDs clientes → no hay nada que consultar
    if (clienteIds.length === 0) {
      setStats({});
      return;
    }

    // Cache hit: mismo set de IDs dentro del TTL
    const cached = ventasCache.get(idsKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '%c[VentasCache]%c HIT · ' + clienteIds.length + ' IDs · age ' + Math.round((Date.now() - cached.ts) / 1000) + 's',
          'background:#4CAF50;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
          'color:#4CAF50;font-weight:600'
        );
      }
      setStats(cached.data);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        // Una sola query: todas las ventas activas de estos clientes
        const ventas = await queryDocuments<Record<string, unknown>>(COLLECTIONS.VENTAS, [
          { field: 'clienteId', operator: 'in', value: clienteIds },
        ]);

        if (cancelled) return;

        const now = new Date();
        const result: Record<string, VentasUsuarioStats> = {};

        ventas.forEach((venta) => {
          const clienteId = venta.clienteId as string | undefined;
          if (!clienteId) return;

          // Solo ventas activas contribuyen al monto
          const isActivo = ((venta.estado as string) ?? 'activo') !== 'inactivo';
          if (!isActivo) return;

          const fechaInicio = venta.fechaInicio instanceof Date ? venta.fechaInicio : null;
          const fechaFin    = venta.fechaFin    instanceof Date ? venta.fechaFin    : null;
          const precioFinal = (venta.precioFinal as number) ?? (venta.precio as number) ?? 0;

          const totalDias     = fechaInicio && fechaFin ? Math.max(differenceInCalendarDays(fechaFin, fechaInicio), 0) : 0;
          const diasRestantes = fechaFin ? Math.max(differenceInCalendarDays(fechaFin, now), 0) : 0;
          const ratioRestante = totalDias > 0 ? Math.min(diasRestantes / totalDias, 1) : 0;
          const montoVenta    = totalDias > 0 ? Math.max(precioFinal * ratioRestante, 0) : 0;

          if (!result[clienteId]) {
            result[clienteId] = { montoSinConsumir: 0 };
          }
          result[clienteId].montoSinConsumir += montoVenta;
        });

        ventasCache.set(idsKey, { data: result, ts: Date.now() });
        setStats(result);
      } catch (error) {
        console.error('Error cargando ventas por usuarios:', error);
        if (!cancelled) setStats({});
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled]);

  return { stats, isLoading };
}
