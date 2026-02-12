/**
 * Notification Sync Service - v2.1
 *
 * Sincroniza notificaciones de ventas y servicios próximos a vencer.
 * - Sincronización: Una vez al día (verificación con localStorage)
 * - Ventana: 7 días de anticipación
 * - Auto-actualización: Días restantes exactos, prioridad dinámica
 * - Estado leída: Solo resetea si prioridad aumenta
 */

import { addDays, differenceInDays } from 'date-fns';
import {
  COLLECTIONS,
  queryDocuments,
  create,
  update,
} from '@/lib/firebase/firestore';
import type {
  VentaDoc,
  Servicio,
  Notificacion,
  PrioridadNotificacion,
} from '@/types';

// ==========================================
// TIPOS
// ==========================================

type TipoEntidad = 'venta' | 'servicio';

// ==========================================
// FUNCIONES HELPER
// ==========================================

/**
 * Calcula la prioridad según días restantes
 */
export function calcularPrioridad(diasRestantes: number): PrioridadNotificacion {
  if (diasRestantes <= 1) return 'critica';  // 0, 1, o negativo
  if (diasRestantes <= 3) return 'alta';      // 2, 3
  if (diasRestantes <= 6) return 'media';     // 4, 5, 6
  return 'baja';                              // 7+
}

/**
 * Detecta si la prioridad aumentó
 */
export function prioridadSubio(
  anterior: PrioridadNotificacion,
  nueva: PrioridadNotificacion
): boolean {
  const niveles: Record<PrioridadNotificacion, number> = {
    baja: 1,
    media: 2,
    alta: 3,
    critica: 4,
  };
  return niveles[nueva] > niveles[anterior];
}

/**
 * Genera título dinámico según días restantes
 */
export function generarTitulo(diasRestantes: number, tipo: TipoEntidad): string {
  const entidad = tipo === 'venta' ? 'Venta' : 'Servicio';

  if (diasRestantes < 0) {
    const diasVencida = Math.abs(diasRestantes);
    return `${entidad} vencida (${diasVencida} día${diasVencida > 1 ? 's' : ''})`;
  }
  if (diasRestantes === 0) return `${entidad} vence hoy`;
  if (diasRestantes === 1) return `${entidad} vence mañana`;
  return `${entidad} vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
}

// ==========================================
// SINCRONIZACIÓN PRINCIPAL
// ==========================================

/**
 * Sincroniza notificaciones de ventas y servicios.
 * Solo ejecuta si no se ha sincronizado hoy (verificación con localStorage).
 */
export async function sincronizarNotificaciones(): Promise<void> {
  try {
    // 1. Verificar si ya sincronizó hoy
    const lastSync = localStorage.getItem('lastNotificationSync');
    const today = new Date().toDateString();

    if (lastSync === today) {
      console.log('[NotificationSync] Ya sincronizado hoy. Skip.');
      return;
    }

    console.log('[NotificationSync] Iniciando sincronización del día...');

    // 2. Sincronizar ventas
    await sincronizarVentas();

    // 3. Sincronizar servicios
    await sincronizarServicios();

    // 4. Guardar timestamp de hoy
    localStorage.setItem('lastNotificationSync', today);

    console.log('[NotificationSync] Sincronización completada exitosamente');
  } catch (error) {
    console.error('[NotificationSync] Error en sincronización:', error);
    throw error;
  }
}

// ==========================================
// SINCRONIZACIÓN DE VENTAS
// ==========================================

async function sincronizarVentas(): Promise<void> {
  // Query ventas próximas (7 días de ventana)
  const fechaLimite = addDays(new Date(), 7);

  const ventasProximas = await queryDocuments<VentaDoc>(
    COLLECTIONS.VENTAS,
    [
      { field: 'estado', operator: '==', value: 'activo' },
      { field: 'fechaFin', operator: '<=', value: fechaLimite },
    ]
  );

  // Query ventas vencidas (fechaFin < hoy)
  const ventasVencidas = await queryDocuments<VentaDoc>(
    COLLECTIONS.VENTAS,
    [
      { field: 'estado', operator: '==', value: 'activo' },
      { field: 'fechaFin', operator: '<', value: new Date() },
    ]
  );

  const todasLasVentas = [...ventasProximas, ...ventasVencidas];

  console.log(`[NotificationSync] Procesando ${todasLasVentas.length} ventas...`);

  // Procesar cada venta
  for (const venta of todasLasVentas) {
    await procesarVenta(venta);
  }
}

async function procesarVenta(venta: VentaDoc): Promise<void> {
  const diasRestantes = differenceInDays(new Date(venta.fechaFin), new Date());
  const nuevaPrioridad = calcularPrioridad(diasRestantes);

  // Buscar notificación existente
  const notifExistente = await queryDocuments<Notificacion>(
    COLLECTIONS.NOTIFICACIONES,
    [{ field: 'ventaId', operator: '==', value: venta.id }]
  );

  if (notifExistente.length > 0) {
    // Actualizar notificación existente
    const notif = notifExistente[0];

    // Solo actualizar si diasRestantes cambió
    if (notif.diasRestantes !== diasRestantes) {
      const prioridadAnterior = notif.prioridad;
      const prioridadAumento = prioridadSubio(prioridadAnterior, nuevaPrioridad);

      await update(COLLECTIONS.NOTIFICACIONES, notif.id!, {
        diasRestantes,
        prioridad: nuevaPrioridad,
        titulo: generarTitulo(diasRestantes, 'venta'),
        // ✅ CRÍTICO: Solo resetear leida si prioridad aumentó
        leida: prioridadAumento ? false : notif.leida,
        // ✅ Mantener resaltada sin cambios
        resaltada: notif.resaltada,
        updatedAt: new Date(),
      });

      console.log(
        `[NotificationSync] Venta ${venta.id} actualizada: ${diasRestantes} días (prioridad: ${nuevaPrioridad})`
      );
    }
  } else {
    // Crear nueva notificación
    await create(COLLECTIONS.NOTIFICACIONES, {
      tipo: 'sistema' as const,
      prioridad: nuevaPrioridad,
      titulo: generarTitulo(diasRestantes, 'venta'),
      mensaje: `${venta.clienteNombre} - ${venta.servicioNombre}`,
      ventaId: venta.id,
      diasRestantes,
      fechaEvento: venta.fechaFin,
      leida: false,
      resaltada: false,
    });

    console.log(
      `[NotificationSync] Venta ${venta.id} creada: ${diasRestantes} días (prioridad: ${nuevaPrioridad})`
    );
  }
}

// ==========================================
// SINCRONIZACIÓN DE SERVICIOS
// ==========================================

async function sincronizarServicios(): Promise<void> {
  // Query servicios próximos (7 días de ventana)
  const fechaLimite = addDays(new Date(), 7);

  const serviciosProximos = await queryDocuments<Servicio>(
    COLLECTIONS.SERVICIOS,
    [
      { field: 'activo', operator: '==', value: true },
      { field: 'fechaVencimiento', operator: '<=', value: fechaLimite },
    ]
  );

  // Query servicios vencidos (fechaVencimiento < hoy)
  const serviciosVencidos = await queryDocuments<Servicio>(
    COLLECTIONS.SERVICIOS,
    [
      { field: 'activo', operator: '==', value: true },
      { field: 'fechaVencimiento', operator: '<', value: new Date() },
    ]
  );

  const todosLosServicios = [...serviciosProximos, ...serviciosVencidos];

  console.log(`[NotificationSync] Procesando ${todosLosServicios.length} servicios...`);

  // Procesar cada servicio
  for (const servicio of todosLosServicios) {
    await procesarServicio(servicio);
  }
}

async function procesarServicio(servicio: Servicio): Promise<void> {
  const diasRestantes = differenceInDays(
    new Date(servicio.fechaVencimiento),
    new Date()
  );
  const nuevaPrioridad = calcularPrioridad(diasRestantes);

  // Buscar notificación existente
  const notifExistente = await queryDocuments<Notificacion>(
    COLLECTIONS.NOTIFICACIONES,
    [{ field: 'servicioId', operator: '==', value: servicio.id }]
  );

  if (notifExistente.length > 0) {
    // Actualizar notificación existente
    const notif = notifExistente[0];

    // Solo actualizar si diasRestantes cambió
    if (notif.diasRestantes !== diasRestantes) {
      const prioridadAnterior = notif.prioridad;
      const prioridadAumento = prioridadSubio(prioridadAnterior, nuevaPrioridad);

      await update(COLLECTIONS.NOTIFICACIONES, notif.id!, {
        diasRestantes,
        prioridad: nuevaPrioridad,
        titulo: generarTitulo(diasRestantes, 'servicio'),
        // ✅ CRÍTICO: Solo resetear leida si prioridad aumentó
        leida: prioridadAumento ? false : notif.leida,
        // ✅ Mantener resaltada sin cambios
        resaltada: notif.resaltada,
        updatedAt: new Date(),
      });

      console.log(
        `[NotificationSync] Servicio ${servicio.id} actualizado: ${diasRestantes} días (prioridad: ${nuevaPrioridad})`
      );
    }
  } else {
    // Crear nueva notificación
    await create(COLLECTIONS.NOTIFICACIONES, {
      tipo: 'sistema' as const,
      prioridad: nuevaPrioridad,
      titulo: generarTitulo(diasRestantes, 'servicio'),
      mensaje: `${servicio.nombre} - ${servicio.categoria || 'Sin categoría'}`,
      servicioId: servicio.id,
      diasRestantes,
      fechaEvento: servicio.fechaVencimiento,
      leida: false,
      resaltada: false,
    });

    console.log(
      `[NotificationSync] Servicio ${servicio.id} creado: ${diasRestantes} días (prioridad: ${nuevaPrioridad})`
    );
  }
}
