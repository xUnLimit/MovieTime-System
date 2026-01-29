import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Cliente, Revendedor } from '@/types';
import { MOCK_CLIENTES, MOCK_REVENDEDORES } from '@/lib/mock-data';

interface UsuariosState {
  clientes: Cliente[];
  revendedores: Revendedor[];
  isLoading: boolean;
  selectedCliente: Cliente | null;
  selectedRevendedor: Revendedor | null;

  // Cliente Actions
  fetchClientes: () => Promise<void>;
  createCliente: (cliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'montoSinConsumir' | 'serviciosActivos'>) => Promise<void>;
  updateCliente: (id: string, updates: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  setSelectedCliente: (cliente: Cliente | null) => void;
  getCliente: (id: string) => Cliente | undefined;

  // Revendedor Actions
  fetchRevendedores: () => Promise<void>;
  createRevendedor: (revendedor: Omit<Revendedor, 'id' | 'createdAt' | 'updatedAt' | 'suscripcionesTotales' | 'montoTotal'>) => Promise<void>;
  updateRevendedor: (id: string, updates: Partial<Revendedor>) => Promise<void>;
  deleteRevendedor: (id: string) => Promise<void>;
  setSelectedRevendedor: (revendedor: Revendedor | null) => void;
  getRevendedor: (id: string) => Revendedor | undefined;
}

export const useUsuariosStore = create<UsuariosState>()(
  devtools(
    (set, get) => ({
      clientes: [],
      revendedores: [],
      isLoading: false,
      selectedCliente: null,
      selectedRevendedor: null,

      // Cliente Actions
      fetchClientes: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));
        set({
          clientes: MOCK_CLIENTES,
          isLoading: false
        });
      },

      createCliente: async (clienteData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const newCliente: Cliente = {
          ...clienteData,
          id: `cliente-${Date.now()}`,
          montoSinConsumir: 0,
          serviciosActivos: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          clientes: [...state.clientes, newCliente],
          isLoading: false
        }));
      },

      updateCliente: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          clientes: state.clientes.map((cliente) =>
            cliente.id === id
              ? { ...cliente, ...updates, updatedAt: new Date() }
              : cliente
          ),
          isLoading: false
        }));
      },

      deleteCliente: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          clientes: state.clientes.filter((cliente) => cliente.id !== id),
          isLoading: false
        }));
      },

      setSelectedCliente: (cliente) => {
        set({ selectedCliente: cliente });
      },

      getCliente: (id) => {
        return get().clientes.find((cliente) => cliente.id === id);
      },

      // Revendedor Actions
      fetchRevendedores: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));
        set({
          revendedores: MOCK_REVENDEDORES,
          isLoading: false
        });
      },

      createRevendedor: async (revendedorData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const newRevendedor: Revendedor = {
          ...revendedorData,
          id: `revendedor-${Date.now()}`,
          suscripcionesTotales: 0,
          montoTotal: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          revendedores: [...state.revendedores, newRevendedor],
          isLoading: false
        }));
      },

      updateRevendedor: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          revendedores: state.revendedores.map((revendedor) =>
            revendedor.id === id
              ? { ...revendedor, ...updates, updatedAt: new Date() }
              : revendedor
          ),
          isLoading: false
        }));
      },

      deleteRevendedor: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          revendedores: state.revendedores.filter((revendedor) => revendedor.id !== id),
          isLoading: false
        }));
      },

      setSelectedRevendedor: (revendedor) => {
        set({ selectedRevendedor: revendedor });
      },

      getRevendedor: (id) => {
        return get().revendedores.find((revendedor) => revendedor.id === id);
      }
    }),
    { name: 'usuarios-store' }
  )
);
