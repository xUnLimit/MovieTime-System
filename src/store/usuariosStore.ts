import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Cliente, Revendedor } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

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
  createRevendedor: (revendedor: Omit<Revendedor, 'id' | 'createdAt' | 'updatedAt' | 'suscripcionesTotales' | 'montoSinConsumir'>) => Promise<void>;
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
        try {
          const data = await getAll<any>(COLLECTIONS.CLIENTES);
          const clientes: Cliente[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt),
            updatedAt: timestampToDate(item.updatedAt)
          }));

          set({ clientes, isLoading: false });
        } catch (error) {
          console.error('Error fetching clientes:', error);
          set({ clientes: [], isLoading: false });
        }
      },

      createCliente: async (clienteData) => {
        try {
          const id = await createDoc(COLLECTIONS.CLIENTES, {
            ...clienteData,
            montoSinConsumir: 0,
            serviciosActivos: 0,
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          const newCliente: Cliente = {
            ...clienteData,
            id,
            montoSinConsumir: 0,
            serviciosActivos: 0,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: ''
          };

          set((state) => ({
            clientes: [...state.clientes, newCliente]
          }));
        } catch (error) {
          console.error('Error creating cliente:', error);
          throw error;
        }
      },

      updateCliente: async (id, updates) => {
        try {
          await update(COLLECTIONS.CLIENTES, id, {
            ...updates,
            updatedAt: Timestamp.now()
          });

          set((state) => ({
            clientes: state.clientes.map((cliente) =>
              cliente.id === id
                ? { ...cliente, ...updates, updatedAt: new Date() }
                : cliente
            )
          }));
        } catch (error) {
          console.error('Error updating cliente:', error);
          throw error;
        }
      },

      deleteCliente: async (id) => {
        try {
          await remove(COLLECTIONS.CLIENTES, id);

          set((state) => ({
            clientes: state.clientes.filter((cliente) => cliente.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting cliente:', error);
          throw error;
        }
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
        try {
          const data = await getAll<any>(COLLECTIONS.REVENDEDORES);
          const revendedores: Revendedor[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt),
            updatedAt: timestampToDate(item.updatedAt)
          }));

          set({ revendedores, isLoading: false });
        } catch (error) {
          console.error('Error fetching revendedores:', error);
          set({ revendedores: [], isLoading: false });
        }
      },

      createRevendedor: async (revendedorData) => {
        try {
          const id = await createDoc(COLLECTIONS.REVENDEDORES, {
            ...revendedorData,
            suscripcionesTotales: 0,
            montoSinConsumir: 0,
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          const newRevendedor: Revendedor = {
            ...revendedorData,
            id,
            suscripcionesTotales: 0,
            montoSinConsumir: 0,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: ''
          };

          set((state) => ({
            revendedores: [...state.revendedores, newRevendedor]
          }));
        } catch (error) {
          console.error('Error creating revendedor:', error);
          throw error;
        }
      },

      updateRevendedor: async (id, updates) => {
        try {
          await update(COLLECTIONS.REVENDEDORES, id, {
            ...updates,
            updatedAt: Timestamp.now()
          });

          set((state) => ({
            revendedores: state.revendedores.map((revendedor) =>
              revendedor.id === id
                ? { ...revendedor, ...updates, updatedAt: new Date() }
                : revendedor
            )
          }));
        } catch (error) {
          console.error('Error updating revendedor:', error);
          throw error;
        }
      },

      deleteRevendedor: async (id) => {
        try {
          await remove(COLLECTIONS.REVENDEDORES, id);

          set((state) => ({
            revendedores: state.revendedores.filter((revendedor) => revendedor.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting revendedor:', error);
          throw error;
        }
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
