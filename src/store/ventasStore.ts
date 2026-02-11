import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { VentaDoc, MetodoPago, PagoVenta } from '@/types';
import { getAll, getById, getCount, create as createDoc, update, remove, COLLECTIONS, logCacheHit, adjustVentasActivas, queryDocuments, adjustCategoriaSuscripciones } from '@/lib/firebase/firestore';

interface VentasState {
  ventas: VentaDoc[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedVenta: VentaDoc | null;

  // Counts for metrics (free queries)
  totalVentas: number;
  ventasActivas: number;
  ventasInactivas: number;

  // Actions
  fetchVentas: (force?: boolean) => Promise<void>;
  fetchCounts: () => Promise<void>;
  createVenta: (venta: Omit<VentaDoc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVenta: (id: string, updates: Partial<VentaDoc>) => Promise<void>;
  deleteVenta: (id: string, servicioId?: string, perfilNumero?: number | null, deletePagos?: boolean) => Promise<void>;
  setSelectedVenta: (venta: VentaDoc | null) => void;
  getVenta: (id: string) => VentaDoc | undefined;
  getVentasByEstado: (estado: 'activo' | 'inactivo') => VentaDoc[];
}

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useVentasStore = create<VentasState>()(
  devtools(
    (set, get) => ({
      ventas: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      selectedVenta: null,
      totalVentas: 0,
      ventasActivas: 0,
      ventasInactivas: 0,

      fetchVentas: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.VENTAS);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const ventas = await getAll<VentaDoc>(COLLECTIONS.VENTAS);
          set({ ventas, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar ventas';
          console.error('Error fetching ventas:', error);
          set({ ventas: [], isLoading: false, error: errorMessage });
        }
      },

      fetchCounts: async () => {
        try {
          const [totalVentas, ventasActivas, ventasInactivas] = await Promise.all([
            getCount(COLLECTIONS.VENTAS, []),
            getCount(COLLECTIONS.VENTAS, [{ field: 'estado', operator: '==', value: 'activo' }]),
            getCount(COLLECTIONS.VENTAS, [{ field: 'estado', operator: '==', value: 'inactivo' }]),
          ]);
          set({ totalVentas, ventasActivas, ventasInactivas });
        } catch (error) {
          console.error('Error fetching counts:', error);
          set({ totalVentas: 0, ventasActivas: 0, ventasInactivas: 0 });
        }
      },

      createVenta: async (ventaData) => {
        try {
          // Extraer campos que NO van en VentaDoc (van solo en PagoVenta)
          const {
            pagos,
            precio,
            descuento,
            precioFinal,
            metodoPagoId,
            metodoPagoNombre,
            moneda,
            cicloPago,
            fechaInicio,
            fechaFin,
            ...ventaDataLimpia
          } = ventaData;

          // Paso 1: Crear la venta (SOLO con metadatos, sin datos de pago)
          const ventaId = await createDoc(COLLECTIONS.VENTAS, ventaDataLimpia);

          // Paso 2: Crear el pago inicial en la colección separada (fuente de verdad)
          if (pagos && pagos.length > 0) {
            const pagoInicial = pagos[0];
            await createDoc(COLLECTIONS.PAGOS_VENTA, {
              ventaId,
              clienteId: ventaData.clienteId || '',
              clienteNombre: ventaData.clienteNombre,
              fecha: pagoInicial.fecha || new Date(),
              monto: pagoInicial.total || precioFinal,
              precio,                         // Precio original
              descuento,                      // Porcentaje de descuento
              metodoPagoId,                   // Denormalizado
              metodoPago: metodoPagoNombre,
              moneda,                         // Denormalizado
              notas: pagoInicial.notas || 'Pago inicial',
              isPagoInicial: true,
              cicloPago,
              fechaInicio,
              fechaVencimiento: fechaFin,
            });
          }

          const newVenta: VentaDoc = {
            ...ventaDataLimpia,
            id: ventaId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            ventas: [...state.ventas, newVenta]
          }));

          // Actualizar contadores de la categoría
          if (ventaDataLimpia.categoriaId && precioFinal) {
            await adjustCategoriaSuscripciones(ventaDataLimpia.categoriaId, 1, precioFinal);
          }

          // Dispatch event for cross-component updates
          window.dispatchEvent(new Event('venta-created'));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al crear venta';
          set({ error: errorMessage });
          console.error('Error creating venta:', error);
          throw error;
        }
      },

      updateVenta: async (id, updates) => {
        try {
          // Obtener la venta actual para comparar valores
          const ventaActual = get().ventas.find(v => v.id === id);
          if (!ventaActual) {
            const ventaDoc = await getById<VentaDoc>(COLLECTIONS.VENTAS, id);
            if (!ventaDoc) throw new Error('Venta no encontrada');
          }

          let finalUpdates = { ...updates };

          // Si cambia metodoPagoId, actualizar campos denormalizados
          if (updates.metodoPagoId !== undefined) {
            const metodoPago = updates.metodoPagoId
              ? await getById<MetodoPago>(COLLECTIONS.METODOS_PAGO, updates.metodoPagoId)
              : null;

            finalUpdates = {
              ...finalUpdates,
              metodoPagoNombre: metodoPago?.nombre,
              moneda: metodoPago?.moneda,
            };
          }

          await update(COLLECTIONS.VENTAS, id, finalUpdates);

          // Actualizar contadores de categoría si cambió el precio o la categoría
          const ventaAnterior = ventaActual || await getById<VentaDoc>(COLLECTIONS.VENTAS, id);
          if (ventaAnterior) {
            const precioAnterior = ventaAnterior.precioFinal || 0;
            const precioNuevo = updates.precioFinal !== undefined ? updates.precioFinal : precioAnterior;
            const categoriaAnterior = ventaAnterior.categoriaId;
            const categoriaNueva = updates.categoriaId || categoriaAnterior;

            // Si cambió la categoría
            if (updates.categoriaId && categoriaAnterior !== categoriaNueva) {
              // Restar de la categoría anterior
              if (categoriaAnterior) {
                await adjustCategoriaSuscripciones(categoriaAnterior, -1, -precioAnterior);
              }
              // Sumar a la nueva categoría
              if (categoriaNueva) {
                await adjustCategoriaSuscripciones(categoriaNueva, 1, precioNuevo);
              }
            }
            // Si solo cambió el precio (misma categoría)
            else if (updates.precioFinal !== undefined && precioAnterior !== precioNuevo) {
              const diferencia = precioNuevo - precioAnterior;
              if (categoriaAnterior && diferencia !== 0) {
                await adjustCategoriaSuscripciones(categoriaAnterior, 0, diferencia);
              }
            }
          }

          set((state) => ({
            ventas: state.ventas.map((venta) =>
              venta.id === id
                ? { ...venta, ...finalUpdates, updatedAt: new Date() }
                : venta
            )
          }));

          // Dispatch event for cross-component updates
          window.dispatchEvent(new Event('venta-updated'));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar venta';
          set({ error: errorMessage });
          console.error('Error updating venta:', error);
          throw error;
        }
      },

      deleteVenta: async (id, servicioId?, perfilNumero?, deletePagos = false) => {
        // Save current state for rollback
        const currentVentas = get().ventas;

        // Buscar la venta en memoria primero, si no está, buscar en Firestore
        let ventaEliminada = currentVentas.find(v => v.id === id);
        if (!ventaEliminada) {
          // La página de ventas usa paginación, el store puede no tener la venta cargada
          const ventaDoc = await getById<VentaDoc>(COLLECTIONS.VENTAS, id);
          if (ventaDoc) {
            ventaEliminada = ventaDoc;
          }
        }

        // Optimistic update
        set((state) => ({
          ventas: state.ventas.filter((venta) => venta.id !== id)
        }));

        try {
          // Si se solicita eliminar pagos, eliminar primero todos los PagoVenta asociados
          if (deletePagos) {
            const pagos = await queryDocuments<PagoVenta>(COLLECTIONS.PAGOS_VENTA, [
              { field: 'ventaId', operator: '==', value: id }
            ]);

            // Eliminar todos los pagos en paralelo
            await Promise.all(
              pagos.map(pago => remove(COLLECTIONS.PAGOS_VENTA, pago.id))
            );
          }

          // Eliminar la venta
          await remove(COLLECTIONS.VENTAS, id);

          // Update service profile occupancy if applicable
          if (servicioId && perfilNumero) {
            const { useServiciosStore } = await import('./serviciosStore');
            await useServiciosStore.getState().updatePerfilOcupado(servicioId, false);
          }

          // Decrementar serviciosActivos si la venta eliminada era activa
          if (ventaEliminada?.clienteId && (ventaEliminada.estado ?? 'activo') !== 'inactivo') {
            await adjustVentasActivas(ventaEliminada.clienteId, -1);
          }

          // Decrementar contadores de la categoría
          if (ventaEliminada?.categoriaId && ventaEliminada?.precioFinal) {
            await adjustCategoriaSuscripciones(
              ventaEliminada.categoriaId,
              -1,
              -ventaEliminada.precioFinal
            );
          }

          // Notificar que se eliminó una venta
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('venta-deleted', Date.now().toString());
            window.dispatchEvent(new Event('venta-deleted'));
          }
        } catch (error) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar venta';
          set({ ventas: currentVentas, error: errorMessage });
          console.error('Error deleting venta:', error);
          throw error;
        }
      },

      setSelectedVenta: (venta) => {
        set({ selectedVenta: venta });
      },

      getVenta: (id) => {
        return get().ventas.find((venta) => venta.id === id);
      },

      getVentasByEstado: (estado) => {
        return get().ventas.filter((venta) => 
          estado === 'activo' ? venta.estado !== 'inactivo' : venta.estado === 'inactivo'
        );
      }
    }),
    { name: 'ventas-store' }
  )
);
