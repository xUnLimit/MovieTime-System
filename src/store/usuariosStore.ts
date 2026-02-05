import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { startOfDay } from 'date-fns';
import { Usuario } from '@/types';
import { getAll, getCount, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';

interface UsuariosState {
  usuarios: Usuario[];
  totalClientes: number;
  totalRevendedores: number;
  totalNuevosHoy: number;
  totalClientesActivos: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  lastCountsFetch: number | null;
  selectedUsuario: Usuario | null;

  // Actions
  fetchUsuarios: (force?: boolean) => Promise<void>;
  fetchCounts: () => Promise<void>;
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
      totalNuevosHoy: 0,
      totalClientesActivos: 0,
      isLoading: false,
      error: null,
      lastFetch: null,
      lastCountsFetch: null,
      selectedUsuario: null,

      // Trae todos los docs — para páginas de detalle/edición
      fetchUsuarios: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.USUARIOS);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const usuarios = await getAll<Usuario>(COLLECTIONS.USUARIOS);
          set({ usuarios, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar usuarios';
          console.error('Error fetching usuarios:', error);
          set({ usuarios: [], isLoading: false, error: errorMessage });
        }
      },

      // Solo conteos — para widgets (3 lecturas totales)
      fetchCounts: async () => {
        const { lastCountsFetch } = get();
        if (lastCountsFetch && (Date.now() - lastCountsFetch) < CACHE_TIMEOUT) {
          logCacheHit('usuarios-counts');
          return;
        }

        try {
          const today = startOfDay(new Date());
          const [totalClientes, totalRevendedores, totalNuevosHoy, totalClientesActivos] = await Promise.all([
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'cliente' }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'revendedor' }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'createdAt', operator: '>=', value: today }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'cliente' }, { field: 'ventasActivas', operator: '>', value: 0 }]),
          ]);
          set({ totalClientes, totalRevendedores, totalNuevosHoy, totalClientesActivos, lastCountsFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al cargar conteos';
          set({ error: errorMessage });
          console.error('Error fetching counts:', error);
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
            totalNuevosHoy: state.totalNuevosHoy + 1,
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
