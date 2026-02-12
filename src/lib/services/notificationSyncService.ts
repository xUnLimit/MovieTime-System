/**
 * Notification Synchronization Service
 *
 * Purpose: Keep notifications collection in sync with ventas and servicios expirations
 *
 * Optimization:
 * - One query per entity (not two): Uses single query with fechaFin/fechaVencimiento <= (today + 7 days)
 * - This single query includes both próximas AND vencidas (because vencidas are subset of próximas)
 * - No duplicate queries for vencidas (saves 50% of sync queries)
 * - Run once per day via localStorage cache
 *
 * IMPORTANT: Requires fechaInicio, fechaFin, cicloPago to be populated in VentaDoc
 * Run migration first: npm run migrate:venta-fechas
 */

import { addDays, differenceInDays } from 'date-fns';
import {
  COLLECTIONS,
  queryDocuments,
  create,
  update,
  getAll,
} from '@/lib/firebase/firestore';
import type {
  Notificacion,
  NotificacionVenta,
  NotificacionServicio,
} from '@/types/notificaciones';
import type { VentaDoc } from '@/types/ventas';
import type { Servicio } from '@/types/servicios';

/**
 * Check if we've already synchronized today
 * Uses localStorage to store last sync date (local time)
 */
function debesSincronizar(): boolean {
  if (typeof window === 'undefined') return false;

  const lastSync = localStorage.getItem('lastNotificationSync');
  const today = new Date().toDateString();

  return lastSync !== today;
}

/**
 * Mark today as synced
 */
function marcarSincronizado(): void {
  if (typeof window === 'undefined') return;

  const today = new Date().toDateString();
  localStorage.setItem('lastNotificationSync', today);
}

/**
 * Calculate priority based on days remaining
 * Matches notification thresholds
 */
function calcularPrioridad(diasRestantes: number): 'baja' | 'media' | 'alta' | 'critica' {
  if (diasRestantes < 0) return 'critica'; // Expired
  if (diasRestantes === 0) return 'critica'; // Today
  if (diasRestantes === 1) return 'critica'; // Tomorrow
  if (diasRestantes <= 2) return 'alta';
  if (diasRestantes <= 3) return 'alta';
  if (diasRestantes <= 7) return 'media';
  return 'baja';
}

/**
 * Generate notification title based on entity and days remaining
 */
function generarTitulo(diasRestantes: number, entidad: 'venta' | 'servicio'): string {
  if (diasRestantes < 0) {
    const diasVencidos = Math.abs(diasRestantes);
    return entidad === 'venta'
      ? `Venta vencida hace ${diasVencidos} día${diasVencidos > 1 ? 's' : ''}`
      : `Servicio vencido hace ${diasVencidos} día${diasVencidos > 1 ? 's' : ''}`;
  }

  if (diasRestantes === 0) {
    return entidad === 'venta' ? 'Venta vence hoy ⚠️' : 'Servicio vence hoy ⚠️';
  }

  return entidad === 'venta'
    ? `Venta vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`
    : `Servicio vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
}

/**
 * Check if priority increased (notification should be unmarked as read)
 */
function prioridadSubio(anterior: string, nueva: string): boolean {
  const prioridades = ['baja', 'media', 'alta', 'critica'];
  return prioridades.indexOf(nueva) > prioridades.indexOf(anterior);
}

/**
 * Process a single venta and create/update notification
 *
 * @param venta - VentaDoc with denormalized fechaFin
 * @throws Error if venta missing required denormalized fields
 */
async function procesarNotificacionVenta(venta: VentaDoc): Promise<void> {
  // Validate required denormalized fields
  if (!venta.fechaFin) {
    console.warn(
      `[NotificationSync] Venta ${venta.id} missing fechaFin (not yet migrated). Skipping.`
    );
    return;
  }

  const diasRestantes = differenceInDays(new Date(venta.fechaFin), new Date());
  const nuevaPrioridad = calcularPrioridad(diasRestantes);

  // Try to find existing notification for this venta
  let notifExistente: (Notificacion & { id: string })[] = [];
  try {
    notifExistente = (await queryDocuments(COLLECTIONS.NOTIFICACIONES, [
      { field: 'entidad', operator: '==', value: 'venta' },
      { field: 'ventaId', operator: '==', value: venta.id },
    ])) as (Notificacion & { id: string })[];
  } catch (error) {
    // Collection might not exist yet, that's fine
    notifExistente = [];
  }

  // Prepare denormalized data
  const datosNotificacion: Omit<NotificacionVenta, 'id' | 'createdAt'> = {
    entidad: 'venta',
    tipo: 'sistema',
    prioridad: nuevaPrioridad,
    titulo: generarTitulo(diasRestantes, 'venta'),
    diasRestantes,
    leida: false,
    resaltada: false,

    // References
    ventaId: venta.id,
    clienteId: venta.clienteId || '',
    servicioId: venta.servicioId,

    // Denormalized from VentaDoc
    clienteNombre: venta.clienteNombre,
    servicioNombre: venta.servicioNombre,
    categoriaNombre: venta.categoriaNombre || '',
    perfilNombre: venta.perfilNombre,
    estado: venta.estado || 'activo',

    // Denormalized from PagoVenta (denormalized en VentaDoc)
    cicloPago: venta.cicloPago,
    fechaInicio: venta.fechaInicio,
    fechaFin: venta.fechaFin,

    updatedAt: new Date(),
  };

  if (notifExistente.length > 0) {
    // Update existing notification
    const notif = notifExistente[0] as NotificacionVenta;

    // Only update if diasRestantes changed
    if (notif.diasRestantes !== diasRestantes) {
      const aumentoPrioridad = prioridadSubio(notif.prioridad, nuevaPrioridad);

      await update(COLLECTIONS.NOTIFICACIONES, notif.id, {
        ...datosNotificacion,
        leida: aumentoPrioridad ? false : notif.leida, // Mark as unread if priority increased
        resaltada: notif.resaltada, // Keep existing highlighted state
      });
    }
  } else {
    // Create new notification
    await create(COLLECTIONS.NOTIFICACIONES, datosNotificacion as any);
  }
}

/**
 * Process a single servicio and create/update notification
 *
 * @param servicio - Servicio document
 * @throws Error if servicio missing required fields
 */
async function procesarNotificacionServicio(servicio: Servicio): Promise<void> {
  if (!servicio.fechaVencimiento) {
    console.warn(
      `[NotificationSync] Servicio ${servicio.id} missing fechaVencimiento. Skipping.`
    );
    return;
  }

  const diasRestantes = differenceInDays(new Date(servicio.fechaVencimiento), new Date());
  const nuevaPrioridad = calcularPrioridad(diasRestantes);

  // Try to find existing notification
  let notifExistente: (Notificacion & { id: string })[] = [];
  try {
    notifExistente = (await queryDocuments(COLLECTIONS.NOTIFICACIONES, [
      { field: 'entidad', operator: '==', value: 'servicio' },
      { field: 'servicioId', operator: '==', value: servicio.id },
    ])) as (Notificacion & { id: string })[];
  } catch (error) {
    notifExistente = [];
  }

  // Prepare denormalized data
  const datosNotificacion: Omit<NotificacionServicio, 'id' | 'createdAt'> = {
    entidad: 'servicio',
    tipo: 'sistema',
    prioridad: nuevaPrioridad,
    titulo: generarTitulo(diasRestantes, 'servicio'),
    diasRestantes,
    leida: false,
    resaltada: false,

    // References
    servicioId: servicio.id,
    categoriaId: servicio.categoriaId,

    // Denormalized from Servicio
    servicioNombre: servicio.nombre,
    categoriaNombre: servicio.categoriaNombre || '',
    tipoServicio: servicio.tipo,
    metodoPagoNombre: servicio.metodoPagoNombre || '',
    moneda: servicio.moneda || 'USD',
    costoServicio: servicio.costoServicio,
    cicloPago: servicio.cicloPago || 'mensual',
    fechaVencimiento: servicio.fechaVencimiento,

    updatedAt: new Date(),
  };

  if (notifExistente.length > 0) {
    // Update existing
    const notif = notifExistente[0] as NotificacionServicio;

    if (notif.diasRestantes !== diasRestantes) {
      const aumentoPrioridad = prioridadSubio(notif.prioridad, nuevaPrioridad);

      await update(COLLECTIONS.NOTIFICACIONES, notif.id, {
        ...datosNotificacion,
        leida: aumentoPrioridad ? false : notif.leida,
        resaltada: notif.resaltada,
      });
    }
  } else {
    // Create new
    await create(COLLECTIONS.NOTIFICACIONES, datosNotificacion as any);
  }
}

/**
 * Main synchronization function
 * Call this once per page load (e.g., in dashboard layout useEffect)
 * Uses localStorage cache to prevent multiple syncs per day
 *
 * Performance: ~2-3 seconds for 50+ items
 * Firebase cost: 2 queries + N updates (where N = changed items)
 *
 * @example
 * useEffect(() => {
 *   sincronizarNotificaciones().catch(error => console.error(error));
 * }, []);
 */
export async function sincronizarNotificaciones(): Promise<void> {
  // Check if already synced today
  if (!debesSincronizar()) {
    console.log('[NotificationSync] Already synced today, skipping');
    return;
  }

  console.log('[NotificationSync] Starting daily synchronization...');

  try {
    // ✅ OPTIMIZED: Single query per entity (not two separate ones)
    // This query includes both próximas AND vencidas because:
    // vencidas (fechaFin < today) are a subset of próximas (fechaFin <= today + 7 days)

    const fechaLimite = addDays(new Date(), 7);

    // 1️⃣ Query ventas with single optimized query
    console.log('[NotificationSync] Fetching ventas próximas/vencidas...');
    const ventasProximas = (await queryDocuments(COLLECTIONS.VENTAS, [
      { field: 'estado', operator: '==', value: 'activo' },
      { field: 'fechaFin', operator: '<=', value: fechaLimite },
    ])) as VentaDoc[];

    console.log(`[NotificationSync] Found ${ventasProximas.length} ventas`);

    // Process each venta
    for (const venta of ventasProximas) {
      try {
        await procesarNotificacionVenta(venta);
      } catch (error) {
        console.error(`[NotificationSync] Error processing venta ${venta.id}:`, error);
      }
    }

    // 2️⃣ Query servicios with single optimized query
    console.log('[NotificationSync] Fetching servicios próximos/vencidos...');
    const serviciosProximos = (await queryDocuments(COLLECTIONS.SERVICIOS, [
      { field: 'activo', operator: '==', value: true },
      { field: 'fechaVencimiento', operator: '<=', value: fechaLimite },
    ])) as Servicio[];

    console.log(`[NotificationSync] Found ${serviciosProximos.length} servicios`);

    // Process each servicio
    for (const servicio of serviciosProximos) {
      try {
        await procesarNotificacionServicio(servicio);
      } catch (error) {
        console.error(`[NotificationSync] Error processing servicio ${servicio.id}:`, error);
      }
    }

    // Mark as synced today
    marcarSincronizado();

    console.log('[NotificationSync] ✅ Synchronization complete');
  } catch (error) {
    console.error('[NotificationSync] ❌ Error during synchronization:', error);
    throw error;
  }
}

/**
 * Force refresh notifications (bypass cache)
 * Useful for testing or manual refresh
 */
export async function sincronizarNotificacionesForzado(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lastNotificationSync');
  }
  await sincronizarNotificaciones();
}
