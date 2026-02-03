/**
 * @deprecated Usar useUsuariosStore directamente
 * Este store es un wrapper por compatibilidad
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Usuario } from '@/types';
import { useUsuariosStore } from './usuariosStore';

interface RevendedoresState {
  revendedores: Usuario[];
  isLoading: boolean;
  selectedRevendedor: Usuario | null;

  fetchRevendedores: () => Promise<void>;
  createRevendedor: (revendedor: Omit<Usuario, 'id' | 'tipo' | 'createdAt' | 'updatedAt' | 'montoSinConsumir' | 'serviciosActivos' | 'suscripcionesTotales'>) => Promise<void>;
  updateRevendedor: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteRevendedor: (id: string) => Promise<void>;
  setSelectedRevendedor: (revendedor: Usuario | null) => void;
  getRevendedor: (id: string) => Usuario | undefined;
}

export const useRevendedoresStore = create<RevendedoresState>()(
  devtools(
    (set, get) => ({
      revendedores: [],
      isLoading: false,
      selectedRevendedor: null,

      fetchRevendedores: async () => {
        const { fetchRevendedores, getRevendedores, isLoading } = useUsuariosStore.getState();
        set({ isLoading: true });
        await fetchRevendedores();
        set({ revendedores: getRevendedores(), isLoading });
      },

      createRevendedor: async (revendedorData) => {
        const { createUsuario, getRevendedores } = useUsuariosStore.getState();
        await createUsuario({ ...revendedorData, tipo: 'revendedor' });
        set({ revendedores: getRevendedores() });
      },

      updateRevendedor: async (id, updates) => {
        const { updateUsuario, getRevendedores } = useUsuariosStore.getState();
        await updateUsuario(id, updates);
        set({ revendedores: getRevendedores() });
      },

      deleteRevendedor: async (id) => {
        const { deleteUsuario, getRevendedores } = useUsuariosStore.getState();
        await deleteUsuario(id);
        set({ revendedores: getRevendedores() });
      },

      setSelectedRevendedor: (revendedor) => {
        set({ selectedRevendedor: revendedor });
      },

      getRevendedor: (id) => {
        return useUsuariosStore.getState().getRevendedores().find((r) => r.id === id);
      }
    }),
    { name: 'revendedores-store-deprecated' }
  )
);

// Suscribirse a cambios en usuariosStore
useUsuariosStore.subscribe((state) => {
  useRevendedoresStore.setState({ 
    revendedores: state.usuarios.filter(u => u.tipo === 'revendedor'),
    isLoading: state.isLoading
  });
});
