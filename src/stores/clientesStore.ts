import { create } from 'zustand';
import { Cliente, ClienteFormData } from '@/types';

interface ClientesState {
  clientes: Cliente[];
  loading: boolean;
  fetchClientes: () => Promise<void>;
  createCliente: (data: ClienteFormData) => Promise<void>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
}

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  loading: false,

  fetchClientes: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ clientes: [] });
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      set({ loading: false });
    }
  },

  createCliente: async (data) => {
    try {
      const newCliente: Cliente = {
        id: Date.now().toString(),
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: '', // TODO: Get from metodos pago store
        montoSinConsumir: 0,
        serviciosActivos: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ clientes: [...get().clientes, newCliente] });
    } catch (error) {
      console.error('Error creating cliente:', error);
      throw error;
    }
  },

  updateCliente: async (id, data) => {
    try {
      set({
        clientes: get().clientes.map((c) =>
          c.id === id ? { ...c, ...data, updatedAt: new Date() } : c
        ),
      });
    } catch (error) {
      console.error('Error updating cliente:', error);
      throw error;
    }
  },

  deleteCliente: async (id) => {
    try {
      set({
        clientes: get().clientes.filter((c) => c.id !== id),
      });
    } catch (error) {
      console.error('Error deleting cliente:', error);
      throw error;
    }
  },
}));
