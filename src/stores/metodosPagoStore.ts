import { create } from 'zustand';
import { MetodoPago } from '@/types';

interface MetodosPagoState {
  metodosPago: MetodoPago[];
  loading: boolean;
  fetchMetodosPago: () => Promise<void>;
  createMetodoPago: (data: Partial<MetodoPago>) => Promise<void>;
  updateMetodoPago: (id: string, data: Partial<MetodoPago>) => Promise<void>;
  deleteMetodoPago: (id: string) => Promise<void>;
}

export const useMetodosPagoStore = create<MetodosPagoState>((set, get) => ({
  metodosPago: [],
  loading: false,

  fetchMetodosPago: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ metodosPago: [] });
    } catch (error) {
      console.error('Error fetching metodos pago:', error);
    } finally {
      set({ loading: false });
    }
  },

  createMetodoPago: async (data) => {
    try {
      const newMetodo: MetodoPago = {
        id: Date.now().toString(),
        nombre: data.nombre || '',
        tipo: data.tipo || 'banco',
        banco: data.banco,
        pais: data.pais || 'Panamá',
        titular: data.titular || '',
        tipoCuenta: data.tipoCuenta,
        identificador: data.identificador || '',
        activo: true,
        asociadoUsuarios: 0,
        asociadoServicios: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ metodosPago: [...get().metodosPago, newMetodo] });
    } catch (error) {
      console.error('Error creating metodo pago:', error);
      throw error;
    }
  },

  updateMetodoPago: async (id, data) => {
    try {
      set({
        metodosPago: get().metodosPago.map((m) =>
          m.id === id ? { ...m, ...data, updatedAt: new Date() } : m
        ),
      });
    } catch (error) {
      console.error('Error updating metodo pago:', error);
      throw error;
    }
  },

  deleteMetodoPago: async (id) => {
    try {
      set({
        metodosPago: get().metodosPago.filter((m) => m.id !== id),
      });
    } catch (error) {
      console.error('Error deleting metodo pago:', error);
      throw error;
    }
  },
}));
