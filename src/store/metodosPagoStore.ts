import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MetodoPago } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface MetodosPagoState {
  metodosPago: MetodoPago[];
  isLoading: boolean;
  selectedMetodo: MetodoPago | null;

  // Actions
  fetchMetodosPago: () => Promise<void>;
  createMetodoPago: (metodo: Omit<MetodoPago, 'id' | 'createdAt' | 'updatedAt' | 'asociadoUsuarios' | 'asociadoServicios'>) => Promise<void>;
  updateMetodoPago: (id: string, updates: Partial<MetodoPago>) => Promise<void>;
  deleteMetodoPago: (id: string) => Promise<void>;
  setSelectedMetodo: (metodo: MetodoPago | null) => void;
  getMetodoPago: (id: string) => MetodoPago | undefined;
}

export const useMetodosPagoStore = create<MetodosPagoState>()(
  devtools(
    (set, get) => ({
      metodosPago: [],
      isLoading: false,
      selectedMetodo: null,

      fetchMetodosPago: async () => {
        set({ isLoading: true });
        try {
          const data = await getAll<any>(COLLECTIONS.METODOS_PAGO);
          const metodosPago: MetodoPago[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt),
            updatedAt: timestampToDate(item.updatedAt)
          }));

          set({ metodosPago, isLoading: false });
        } catch (error) {
          console.error('Error fetching metodos pago:', error);
          set({ metodosPago: [], isLoading: false });
        }
      },

      createMetodoPago: async (metodoData) => {
        try {
          const id = await createDoc(COLLECTIONS.METODOS_PAGO, {
            ...metodoData,
            asociadoUsuarios: 0,
            asociadoServicios: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
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
          await update(COLLECTIONS.METODOS_PAGO, id, {
            ...updates,
            updatedAt: Timestamp.now()
          });

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
