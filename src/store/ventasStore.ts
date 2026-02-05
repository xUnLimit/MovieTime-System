import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { VentaDoc } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, logCacheHit, adjustVentasActivas } from '@/lib/firebase/firestore';

interface VentasState {
  ventas: VentaDoc[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedVenta: VentaDoc | null;

  // Actions
  fetchVentas: (force?: boolean) => Promise<void>;
  createVenta: (venta: Omit<VentaDoc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVenta: (id: string, updates: Partial<VentaDoc>) => Promise<void>;
  deleteVenta: (id: string, servicioId?: string, perfilNumero?: number | null) => Promise<void>;
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

      createVenta: async (ventaData) => {
        try {
          const id = await createDoc(COLLECTIONS.VENTAS, ventaData);

          const newVenta: VentaDoc = {
            ...ventaData,
            id,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            ventas: [...state.ventas, newVenta]
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al crear venta';
          set({ error: errorMessage });
          console.error('Error creating venta:', error);
          throw error;
        }
      },

      updateVenta: async (id, updates) => {
        try {
          await update(COLLECTIONS.VENTAS, id, updates);

          set((state) => ({
            ventas: state.ventas.map((venta) =>
              venta.id === id
                ? { ...venta, ...updates, updatedAt: new Date() }
                : venta
            )
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar venta';
          set({ error: errorMessage });
          console.error('Error updating venta:', error);
          throw error;
        }
      },

      deleteVenta: async (id, servicioId?, perfilNumero?) => {
        // Save current state for rollback
        const currentVentas = get().ventas;
        const ventaEliminada = currentVentas.find(v => v.id === id);

        // Optimistic update
        set((state) => ({
          ventas: state.ventas.filter((venta) => venta.id !== id)
        }));

        try {
          await remove(COLLECTIONS.VENTAS, id);

          // Update service profile occupancy if applicable
          if (servicioId && perfilNumero) {
            const { useServiciosStore } = await import('./serviciosStore');
            await useServiciosStore.getState().updatePerfilOcupado(servicioId, false);
          }

          // Decrementar ventasActivas si la venta eliminada era activa
          if (ventaEliminada?.clienteId && (ventaEliminada.estado ?? 'activo') !== 'inactivo') {
            adjustVentasActivas(ventaEliminada.clienteId, -1);
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
