import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryDocumentsMock = vi.fn();
const updateMock = vi.fn();
const getAllMock = vi.fn();
const syncNotificacionesMock = vi.fn();
const fetchNotificacionesMock = vi.fn();
const fetchCountsMock = vi.fn();
const setVentasStateMock = vi.fn();

vi.mock('@/lib/firebase/firestore', () => ({
  queryDocuments: queryDocumentsMock,
  update: updateMock,
  getAll: getAllMock,
  COLLECTIONS: {
    VENTAS: 'ventas',
    SERVICIOS: 'servicios',
  },
}));

vi.mock('@/lib/services/notificationSyncService', () => ({
  sincronizarNotificacionesForzado: syncNotificacionesMock,
}));

vi.mock('@/store/notificacionesStore', () => ({
  useNotificacionesStore: {
    getState: () => ({
      fetchNotificaciones: fetchNotificacionesMock,
      fetchCounts: fetchCountsMock,
    }),
  },
}));

vi.mock('@/store/ventasStore', () => ({
  useVentasStore: {
    setState: setVentasStateMock,
  },
}));

describe('servicioSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryDocumentsMock.mockResolvedValue([]);
    updateMock.mockResolvedValue(undefined);
    getAllMock.mockResolvedValue([]);
    syncNotificacionesMock.mockResolvedValue(undefined);
    fetchNotificacionesMock.mockResolvedValue(undefined);
    fetchCountsMock.mockResolvedValue(undefined);
  });

  it('sincroniza ventas denormalizadas y refresca notificaciones al editar un servicio', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    queryDocumentsMock.mockResolvedValue([{ id: 'venta-1' }, { id: 'venta-2' }]);

    const { syncServicioDependencias } = await import('./servicioSyncService');

    await syncServicioDependencias(
      {
        id: 'servicio-1',
        nombre: 'Netflix vieja',
        correo: 'viejo@demo.com',
        contrasena: '1234',
        categoriaId: 'cat-1',
        categoriaNombre: 'Streaming',
      },
      {
        id: 'servicio-1',
        nombre: 'Netflix nueva',
        correo: 'nuevo@demo.com',
        contrasena: 'abcd',
        categoriaId: 'cat-2',
        categoriaNombre: 'Premium',
      }
    );

    expect(queryDocumentsMock).toHaveBeenCalledWith('ventas', [
      { field: 'servicioId', operator: '==', value: 'servicio-1' },
    ]);
    expect(updateMock).toHaveBeenNthCalledWith(1, 'ventas', 'venta-1', {
      servicioNombre: 'Netflix nueva',
      servicioCorreo: 'nuevo@demo.com',
      servicioContrasena: 'abcd',
      categoriaId: 'cat-2',
      categoriaNombre: 'Premium',
    });
    expect(updateMock).toHaveBeenNthCalledWith(2, 'ventas', 'venta-2', {
      servicioNombre: 'Netflix nueva',
      servicioCorreo: 'nuevo@demo.com',
      servicioContrasena: 'abcd',
      categoriaId: 'cat-2',
      categoriaNombre: 'Premium',
    });
    expect(setVentasStateMock).toHaveBeenCalledTimes(1);
    expect(syncNotificacionesMock).toHaveBeenCalledTimes(1);
    expect(fetchNotificacionesMock).toHaveBeenCalledWith(true);
    expect(fetchCountsMock).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledTimes(2);

    dispatchEventSpy.mockRestore();
  });

  it('resincroniza todos los servicios y fuerza notificaciones una sola vez al final', async () => {
    getAllMock.mockResolvedValue([
      {
        id: 'servicio-1',
        nombre: 'Netflix',
        correo: 'a@demo.com',
        contrasena: '1234',
        categoriaId: 'cat-1',
        categoriaNombre: 'Streaming',
      },
      {
        id: 'servicio-2',
        nombre: 'Disney',
        correo: 'b@demo.com',
        contrasena: '5678',
        categoriaId: 'cat-2',
        categoriaNombre: 'Kids',
      },
    ]);
    queryDocumentsMock
      .mockResolvedValueOnce([{ id: 'venta-1' }])
      .mockResolvedValueOnce([{ id: 'venta-2' }, { id: 'venta-3' }]);

    const { resyncServiciosDenormalizedData } = await import('./servicioSyncService');

    const result = await resyncServiciosDenormalizedData();

    expect(getAllMock).toHaveBeenCalledWith('servicios');
    expect(queryDocumentsMock).toHaveBeenNthCalledWith(1, 'ventas', [
      { field: 'servicioId', operator: '==', value: 'servicio-1' },
    ]);
    expect(queryDocumentsMock).toHaveBeenNthCalledWith(2, 'ventas', [
      { field: 'servicioId', operator: '==', value: 'servicio-2' },
    ]);
    expect(updateMock).toHaveBeenNthCalledWith(1, 'ventas', 'venta-1', {
      servicioNombre: 'Netflix',
      servicioCorreo: 'a@demo.com',
      servicioContrasena: '1234',
      categoriaId: 'cat-1',
      categoriaNombre: 'Streaming',
    });
    expect(updateMock).toHaveBeenNthCalledWith(2, 'ventas', 'venta-2', {
      servicioNombre: 'Disney',
      servicioCorreo: 'b@demo.com',
      servicioContrasena: '5678',
      categoriaId: 'cat-2',
      categoriaNombre: 'Kids',
    });
    expect(updateMock).toHaveBeenNthCalledWith(3, 'ventas', 'venta-3', {
      servicioNombre: 'Disney',
      servicioCorreo: 'b@demo.com',
      servicioContrasena: '5678',
      categoriaId: 'cat-2',
      categoriaNombre: 'Kids',
    });
    expect(result).toEqual({ serviciosRevisados: 2, ventasActualizadas: 3 });
    expect(syncNotificacionesMock).toHaveBeenCalledTimes(1);
    expect(fetchNotificacionesMock).toHaveBeenCalledWith(true);
    expect(fetchCountsMock).toHaveBeenCalledTimes(1);
  });
});
