import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Usuario } from '@/types';
import { getAll, getCount, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';

interface UsuariosState {
  usuarios: Usuario[];
  totalClientes: number;
  totalRevendedores: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedUsuario: Usuario | null;

  // Actions
  fetchUsuarios: (force?: boolean) => Promise<void>;
  createUsuario: (usuario: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'montoSinConsumir' | 'serviciosActivos' | 'suscripcionesTotales'>) => Promise<void>;
  updateUsuario: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteUsuario: (id: string) => Promise<void>;
  setSelectedUsuario: (usuario: Usuario | null) => void;
  getUsuario: (id: string) => Usuario | undefined;
  getClientes: () => Usuario[];
  getRevendedores: () => Usuario[];
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useUsuariosStore = create<UsuariosState>()(
  devtools(
    (set, get) => ({
      usuarios: [],
      totalClientes: 0,
      totalRevendedores: 0,
      isLoading: false,
      error: null,
      lastFetch: null,
      selectedUsuario: null,

      fetchUsuarios: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.USUARIOS);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const [usuarios, totalClientes, totalRevendedores] = await Promise.all([
            getAll<Usuario>(COLLECTIONS.USUARIOS),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'cliente' }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'revendedor' }]),
          ]);
          set({ usuarios, totalClientes, totalRevendedores, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar usuarios';
          console.error('Error fetching usuarios:', error);
          set({ usuarios: [], isLoading: false, error: errorMessage });
        }
      },

      createUsuario: async (usuarioData) => {
        try {
          const tipoFields =
            usuarioData.tipo === 'cliente'
              ? { serviciosActivos: 0 }
              : { suscripcionesTotales: 0 };

          const id = await createDoc(COLLECTIONS.USUARIOS, {
            ...usuarioData,
            montoSinConsumir: 0,
            ...tipoFields,
            active: true,
          });

          const newUsuario: Usuario = {
            ...usuarioData,
            id,
            montoSinConsumir: 0,
            ...tipoFields,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: ''
          };

          set((state) => ({
            usuarios: [...state.usuarios, newUsuario],
            totalClientes: usuarioData.tipo === 'cliente' ? state.totalClientes + 1 : state.totalClientes,
            totalRevendedores: usuarioData.tipo === 'revendedor' ? state.totalRevendedores + 1 : state.totalRevendedores,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al crear usuario';
          set({ error: errorMessage });
          console.error('Error creating usuario:', error);
          throw error;
        }
      },

      updateUsuario: async (id, updates) => {
        try {
          await update(COLLECTIONS.USUARIOS, id, updates);

          set((state) => ({
            usuarios: state.usuarios.map((usuario) =>
              usuario.id === id
                ? { ...usuario, ...updates, updatedAt: new Date() }
                : usuario
            ),
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario';
          set({ error: errorMessage });
          console.error('Error updating usuario:', error);
          throw error;
        }
      },

      deleteUsuario: async (id) => {
        const currentUsuarios = get().usuarios;
        const deletedUser = currentUsuarios.find(u => u.id === id);

        // Optimistic update
        set((state) => ({
          usuarios: state.usuarios.filter((usuario) => usuario.id !== id),
          totalClientes: deletedUser?.tipo === 'cliente' ? state.totalClientes - 1 : state.totalClientes,
          totalRevendedores: deletedUser?.tipo === 'revendedor' ? state.totalRevendedores - 1 : state.totalRevendedores,
        }));

        try {
          await remove(COLLECTIONS.USUARIOS, id);
          set({ error: null });
        } catch (error) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
          set({
            usuarios: currentUsuarios,
            totalClientes: currentUsuarios.filter(u => u.tipo === 'cliente').length,
            totalRevendedores: currentUsuarios.filter(u => u.tipo === 'revendedor').length,
            error: errorMessage,
          });
          console.error('Error deleting usuario:', error);
          throw error;
        }
      },

      setSelectedUsuario: (usuario) => {
        set({ selectedUsuario: usuario });
      },

      getUsuario: (id) => {
        return get().usuarios.find((usuario) => usuario.id === id);
      },

      getClientes: () => {
        return get().usuarios.filter(u => u.tipo === 'cliente');
      },

      getRevendedores: () => {
        return get().usuarios.filter(u => u.tipo === 'revendedor');
      }
    }),
    { name: 'usuarios-store' }
  )
);
