import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MetodoPago } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';

interface MetodosPagoState {
  metodosPago: MetodoPago[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedMetodo: MetodoPago | null;

  // Actions
  fetchMetodosPago: (force?: boolean) => Promise<void>;
  createMetodoPago: (metodo: Omit<MetodoPago, 'id' | 'createdAt' | 'updatedAt' | 'asociadoUsuarios' | 'asociadoServicios'>) => Promise<void>;
  updateMetodoPago: (id: string, updates: Partial<MetodoPago>) => Promise<void>;
  toggleActivo: (id: string) => Promise<void>;
  deleteMetodoPago: (id: string) => Promise<void>;
  setSelectedMetodo: (metodo: MetodoPago | null) => void;
  getMetodoPago: (id: string) => MetodoPago | undefined;
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useMetodosPagoStore = create<MetodosPagoState>()(
  devtools(
    (set, get) => ({
      metodosPago: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      selectedMetodo: null,

      fetchMetodosPago: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.METODOS_PAGO);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const metodosPago = await getAll<MetodoPago>(COLLECTIONS.METODOS_PAGO);
          set({ metodosPago, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar métodos de pago';
          console.error('Error fetching metodos pago:', error);
          set({ metodosPago: [], isLoading: false, error: errorMessage });
        }
      },

      createMetodoPago: async (metodoData) => {
        try {
          const id = await createDoc(COLLECTIONS.METODOS_PAGO, {
            ...metodoData,
            asociadoUsuarios: 0,
            asociadoServicios: 0,
          });

          const newMetodo: MetodoPago = {
            ...metodoData,
            id,
            asociadoUsuarios: 0,
            asociadoServicios: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            metodosPago: [...state.metodosPago, newMetodo]
          }));
        } catch (error) {
          console.error('Error creating metodo pago:', error);
          throw error;
        }
      },

      updateMetodoPago: async (id, updates) => {
        try {
          await update(COLLECTIONS.METODOS_PAGO, id, updates);

          set((state) => ({
            metodosPago: state.metodosPago.map((metodo) =>
              metodo.id === id
                ? { ...metodo, ...updates, updatedAt: new Date() }
                : metodo
            )
          }));
        } catch (error) {
          console.error('Error updating metodo pago:', error);
          throw error;
        }
      },

      toggleActivo: async (id) => {
        try {
          const metodo = get().metodosPago.find((m) => m.id === id);
          if (!metodo) throw new Error('Método de pago no encontrado');

          const newActivo = !metodo.activo;
          await update(COLLECTIONS.METODOS_PAGO, id, { activo: newActivo });

          set((state) => ({
            metodosPago: state.metodosPago.map((m) =>
              m.id === id
                ? { ...m, activo: newActivo, updatedAt: new Date() }
                : m
            )
          }));
        } catch (error) {
          console.error('Error toggling activo:', error);
          throw error;
        }
      },

      deleteMetodoPago: async (id) => {
        try {
          await remove(COLLECTIONS.METODOS_PAGO, id);

          set((state) => ({
            metodosPago: state.metodosPago.filter((metodo) => metodo.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting metodo pago:', error);
          throw error;
        }
      },

      setSelectedMetodo: (metodo) => {
        set({ selectedMetodo: metodo });
      },

      getMetodoPago: (id) => {
        return get().metodosPago.find((metodo) => metodo.id === id);
      }
    }),
    { name: 'metodos-pago-store' }
  )
);
