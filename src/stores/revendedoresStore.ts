import { create } from 'zustand';
import { Revendedor, RevendedorFormData } from '@/types';

interface RevendedoresState {
  revendedores: Revendedor[];
  loading: boolean;
  fetchRevendedores: () => Promise<void>;
  createRevendedor: (data: RevendedorFormData) => Promise<void>;
  updateRevendedor: (id: string, data: Partial<Revendedor>) => Promise<void>;
  deleteRevendedor: (id: string) => Promise<void>;
}

export const useRevendedoresStore = create<RevendedoresState>((set, get) => ({
  revendedores: [],
  loading: false,

  fetchRevendedores: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ revendedores: [] });
    } catch (error) {
      console.error('Error fetching revendedores:', error);
    } finally {
      set({ loading: false });
    }
  },

  createRevendedor: async (data) => {
    try {
      const newRevendedor: Revendedor = {
        id: Date.now().toString(),
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: '', // TODO: Get from metodos pago store
        comisionPorcentaje: data.comisionPorcentaje,
        ventasTotales: 0,
        montoTotal: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ revendedores: [...get().revendedores, newRevendedor] });
    } catch (error) {
      console.error('Error creating revendedor:', error);
      throw error;
    }
  },

  updateRevendedor: async (id, data) => {
    try {
      set({
        revendedores: get().revendedores.map((r) =>
          r.id === id ? { ...r, ...data, updatedAt: new Date() } : r
        ),
      });
    } catch (error) {
      console.error('Error updating revendedor:', error);
      throw error;
    }
  },

  deleteRevendedor: async (id) => {
    try {
      set({
        revendedores: get().revendedores.filter((r) => r.id !== id),
      });
    } catch (error) {
      console.error('Error deleting revendedor:', error);
      throw error;
    }
  },
}));
