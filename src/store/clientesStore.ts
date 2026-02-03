/**
 * @deprecated Usar useUsuariosStore directamente
 * Este store es un wrapper por compatibilidad
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Usuario } from '@/types';
import { useUsuariosStore } from './usuariosStore';

interface ClientesState {
  clientes: Usuario[];
  isLoading: boolean;
  selectedCliente: Usuario | null;

  fetchClientes: () => Promise<void>;
  createCliente: (cliente: Omit<Usuario, 'id' | 'tipo' | 'createdAt' | 'updatedAt' | 'montoSinConsumir' | 'serviciosActivos' | 'suscripcionesTotales'>) => Promise<void>;
  updateCliente: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  setSelectedCliente: (cliente: Usuario | null) => void;
  getCliente: (id: string) => Usuario | undefined;
}

export const useClientesStore = create<ClientesState>()(
  devtools(
    (set, get) => ({
      clientes: [],
      isLoading: false,
      selectedCliente: null,

      fetchClientes: async () => {
        const { fetchClientes, getClientes, isLoading } = useUsuariosStore.getState();
        set({ isLoading: true });
        await fetchClientes();
        set({ clientes: getClientes(), isLoading });
      },

      createCliente: async (clienteData) => {
        const { createUsuario, getClientes } = useUsuariosStore.getState();
        await createUsuario({ ...clienteData, tipo: 'cliente' });
        set({ clientes: getClientes() });
      },

      updateCliente: async (id, updates) => {
        const { updateUsuario, getClientes } = useUsuariosStore.getState();
        await updateUsuario(id, updates);
        set({ clientes: getClientes() });
      },

      deleteCliente: async (id) => {
        const { deleteUsuario, getClientes } = useUsuariosStore.getState();
        await deleteUsuario(id);
        set({ clientes: getClientes() });
      },

      setSelectedCliente: (cliente) => {
        set({ selectedCliente: cliente });
      },

      getCliente: (id) => {
        return useUsuariosStore.getState().getClientes().find((c) => c.id === id);
      }
    }),
    { name: 'clientes-store-deprecated' }
  )
);

// Suscribirse a cambios en usuariosStore
useUsuariosStore.subscribe((state) => {
  useClientesStore.setState({ 
    clientes: state.usuarios.filter(u => u.tipo === 'cliente'),
    isLoading: state.isLoading
  });
});
