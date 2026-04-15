import { COLLECTIONS, getAll, queryDocuments, update } from '@/lib/firebase/firestore';
import { sincronizarNotificacionesForzado } from '@/lib/services/notificationSyncService';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { useVentasStore } from '@/store/ventasStore';
import type { Servicio, VentaDoc } from '@/types';

type ServicioDenormalizedSnapshot = Pick<
  Servicio,
  'id' | 'nombre' | 'correo' | 'contrasena' | 'categoriaId' | 'categoriaNombre'
>;

interface SyncServicioDependenciasOptions {
  refreshNotifications?: boolean;
  emitEvents?: boolean;
}

export interface SyncServicioDependenciasResult {
  ventasActualizadas: number;
}

function buildServicioVentaSnapshotUpdates(
  servicio: ServicioDenormalizedSnapshot
): Partial<VentaDoc> {
  return {
    servicioNombre: servicio.nombre,
    servicioCorreo: servicio.correo,
    servicioContrasena: servicio.contrasena,
    categoriaId: servicio.categoriaId,
    categoriaNombre: servicio.categoriaNombre,
  };
}

function getServicioVentaUpdates(
  previousServicio: ServicioDenormalizedSnapshot,
  nextServicio: ServicioDenormalizedSnapshot
): Partial<VentaDoc> {
  const updates: Partial<VentaDoc> = {};

  if (previousServicio.nombre !== nextServicio.nombre) {
    updates.servicioNombre = nextServicio.nombre;
  }

  if (previousServicio.correo !== nextServicio.correo) {
    updates.servicioCorreo = nextServicio.correo;
  }

  if (previousServicio.contrasena !== nextServicio.contrasena) {
    updates.servicioContrasena = nextServicio.contrasena;
  }

  if (previousServicio.categoriaId !== nextServicio.categoriaId) {
    updates.categoriaId = nextServicio.categoriaId;
  }

  if (previousServicio.categoriaNombre !== nextServicio.categoriaNombre) {
    updates.categoriaNombre = nextServicio.categoriaNombre;
  }

  return updates;
}

function updateVentasStoreFromServicioSync(servicioId: string, ventaUpdates: Partial<VentaDoc>) {
  if (Object.keys(ventaUpdates).length === 0) {
    return;
  }

  useVentasStore.setState((state) => ({
    ventas: state.ventas.map((venta) =>
      venta.servicioId === servicioId
        ? { ...venta, ...ventaUpdates, updatedAt: new Date() }
        : venta
    ),
    selectedVenta:
      state.selectedVenta?.servicioId === servicioId
        ? { ...state.selectedVenta, ...ventaUpdates, updatedAt: new Date() }
        : state.selectedVenta,
  }));
}

function emitServicioSyncEvents(ventasWereUpdated: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  const syncTimestamp = Date.now().toString();
  window.localStorage.setItem('servicio-updated', syncTimestamp);
  window.dispatchEvent(new Event('servicio-updated'));

  if (ventasWereUpdated) {
    window.localStorage.setItem('venta-updated', syncTimestamp);
    window.dispatchEvent(new Event('venta-updated'));
  }
}

export async function syncServicioDependencias(
  previousServicio: ServicioDenormalizedSnapshot,
  nextServicio: ServicioDenormalizedSnapshot,
  options: SyncServicioDependenciasOptions = {}
): Promise<SyncServicioDependenciasResult> {
  const { refreshNotifications = true, emitEvents = true } = options;
  const ventaUpdates = getServicioVentaUpdates(previousServicio, nextServicio);
  let ventasActualizadas = 0;

  if (Object.keys(ventaUpdates).length > 0) {
    const ventasDelServicio = await queryDocuments<{ id: string }>(COLLECTIONS.VENTAS, [
      { field: 'servicioId', operator: '==', value: nextServicio.id },
    ]);

    ventasActualizadas = ventasDelServicio.length;

    await Promise.all(
      ventasDelServicio.map((venta) => update(COLLECTIONS.VENTAS, venta.id, ventaUpdates))
    );

    updateVentasStoreFromServicioSync(nextServicio.id, ventaUpdates);
  }

  if (refreshNotifications) {
    await sincronizarNotificacionesForzado();
    await Promise.all([
      useNotificacionesStore.getState().fetchNotificaciones(true),
      useNotificacionesStore.getState().fetchCounts(),
    ]);
  }

  if (emitEvents) {
    emitServicioSyncEvents(ventasActualizadas > 0);
  }

  return { ventasActualizadas };
}

export async function resyncServiciosDenormalizedData(): Promise<{
  serviciosRevisados: number;
  ventasActualizadas: number;
}> {
  const servicios = await getAll<Servicio>(COLLECTIONS.SERVICIOS);
  let ventasActualizadas = 0;

  for (const servicio of servicios) {
    const ventasDelServicio = await queryDocuments<{ id: string }>(COLLECTIONS.VENTAS, [
      { field: 'servicioId', operator: '==', value: servicio.id },
    ]);

    if (ventasDelServicio.length === 0) {
      continue;
    }

    const ventaUpdates = buildServicioVentaSnapshotUpdates(servicio);

    await Promise.all(
      ventasDelServicio.map((venta) => update(COLLECTIONS.VENTAS, venta.id, ventaUpdates))
    );

    updateVentasStoreFromServicioSync(servicio.id, ventaUpdates);
    ventasActualizadas += ventasDelServicio.length;
  }

  await sincronizarNotificacionesForzado();
  await Promise.all([
    useNotificacionesStore.getState().fetchNotificaciones(true),
    useNotificacionesStore.getState().fetchCounts(),
  ]);

  emitServicioSyncEvents(ventasActualizadas > 0);

  return {
    serviciosRevisados: servicios.length,
    ventasActualizadas,
  };
}
