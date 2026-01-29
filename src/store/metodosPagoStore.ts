import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MetodoPago } from '@/types';
import { MOCK_METODOS_PAGO } from '@/lib/mock-data';

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
        await new Promise(resolve => setTimeout(resolve, 300));
        set({
          metodosPago: MOCK_METODOS_PAGO,
          isLoading: false
        });
      },

      createMetodoPago: async (metodoData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const newMetodo: MetodoPago = {
          ...metodoData,
          id: `metodo-${Date.now()}`,
          asociadoUsuarios: 0,
          asociadoServicios: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          metodosPago: [...state.metodosPago, newMetodo],
          isLoading: false
        }));
      },

      updateMetodoPago: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          metodosPago: state.metodosPago.map((metodo) =>
            metodo.id === id
              ? { ...metodo, ...updates, updatedAt: new Date() }
              : metodo
          ),
          isLoading: false
        }));
      },

      deleteMetodoPago: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          metodosPago: state.metodosPago.filter((metodo) => metodo.id !== id),
          isLoading: false
        }));
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
