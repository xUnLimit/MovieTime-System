'use client';

import { useCallback, useEffect, useState } from 'react';
import { COLLECTIONS, queryDocuments, remove, timestampToDate } from '@/lib/firebase/firestore';
import { useServiciosStore } from '@/store/serviciosStore';

/**
 * Venta tal como la devuelve Firestore, con timestamps
 * convertidos a Date para consumo directo en componentes.
 */
export interface VentaUsuarioDoc {
  id: string;
  clienteId: string;
  categoriaId: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo: string;
  perfilNumero: number | null | undefined;
  cicloPago: string | undefined;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  precio: number;
  precioFinal: number;
  estado: string;
  moneda: string | undefined;
  /** campos opcionales que pueden existir en el documento */
  [key: string]: unknown;
}

/**
 * Carga las ventas de un solo usuario, el historial de renovaciones
 * de los servicios asociados, y expone una función para eliminar ventas.
 *
 * @param usuarioId  – id del usuario cuyas ventas se carga
 */
export function useVentasUsuario(usuarioId: string) {
  const { updatePerfilOcupado } = useServiciosStore();

  const [ventas, setVentas]                           = useState<VentaUsuarioDoc[]>([]);
  const [renovacionesByServicio, setRenovacionesByServicio] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading]                     = useState(true);

  /* ── 1. Ventas del usuario ──────────────────────── */
  useEffect(() => {
    if (!usuarioId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.VENTAS, [
          { field: 'clienteId', operator: '==', value: usuarioId },
        ]);

        const mapped: VentaUsuarioDoc[] = docs.map((doc) => ({
          id:              doc.id as string,
          clienteId:       doc.clienteId as string,
          categoriaId:     (doc.categoriaId as string)  || '',
          servicioId:      (doc.servicioId as string)   || '',
          servicioNombre:  (doc.servicioNombre as string) || 'Servicio',
          servicioCorreo:  (doc.servicioCorreo as string) || '—',
          perfilNumero:    (doc.perfilNumero as number | null | undefined) ?? null,
          cicloPago:       doc.cicloPago as string | undefined,
          fechaInicio:     doc.fechaInicio ? timestampToDate(doc.fechaInicio) : null,
          fechaFin:        doc.fechaFin    ? timestampToDate(doc.fechaFin)    : null,
          precio:          (doc.precio as number)      ?? 0,
          precioFinal:     (doc.precioFinal as number) ?? (doc.precio as number) ?? 0,
          estado:          (doc.estado as string)      ?? 'activo',
          moneda:          doc.moneda as string | undefined,
        }));

        setVentas(mapped);
      } catch (error) {
        console.error('Error cargando ventas del usuario:', error);
        setVentas([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [usuarioId]);

  /* ── 2. Renovaciones por servicio (depende de ventas) ── */
  useEffect(() => {
    const servicioIds = Array.from(
      new Set(ventas.map((v) => v.servicioId).filter(Boolean))
    );

    if (servicioIds.length === 0) {
      setRenovacionesByServicio({});
      return;
    }

    const load = async () => {
      try {
        const entries = await Promise.all(
          servicioIds.map(async (servicioId) => {
            const pagos = await queryDocuments<Record<string, unknown>>(COLLECTIONS.PAGOS_SERVICIO, [
              { field: 'servicioId', operator: '==', value: servicioId },
            ]);
            const renovaciones = pagos.filter(
              (pago) => !pago.isPagoInicial && pago.descripcion !== 'Pago inicial'
            ).length;
            return [servicioId, renovaciones] as const;
          })
        );
        setRenovacionesByServicio(Object.fromEntries(entries));
      } catch (error) {
        console.error('Error cargando renovaciones:', error);
        setRenovacionesByServicio({});
      }
    };

    load();
  }, [ventas]);

  /* ── 3. Eliminar venta ──────────────────────────── */
  const deleteVenta = useCallback(async (ventaId: string, servicioId?: string, perfilNumero?: number | null) => {
    await remove(COLLECTIONS.VENTAS, ventaId);

    if (servicioId && perfilNumero) {
      updatePerfilOcupado(servicioId, false);
    }

    setVentas((prev) => prev.filter((v) => v.id !== ventaId));
  }, [updatePerfilOcupado]);

  return {
    ventas,
    renovacionesByServicio,
    isLoading,
    deleteVenta,
  };
}
