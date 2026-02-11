import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { startOfDay } from 'date-fns';
import { Usuario } from '@/types';
import { getAll, getCount, getById, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';

interface UsuariosState {
  usuarios: Usuario[];
  totalClientes: number;
  totalRevendedores: number;
  totalNuevosHoy: number;
  totalUsuariosActivos: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  lastCountsFetch: number | null;
  selectedUsuario: Usuario | null;

  // Actions
  fetchUsuarios: (force?: boolean) => Promise<void>;
  fetchCounts: () => Promise<void>;
  createUsuario: (usuario: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'serviciosActivos' | 'suscripcionesTotales'>) => Promise<void>;
  updateUsuario: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteUsuario: (id: string, usuarioData?: { tipo: 'cliente' | 'revendedor'; createdAt?: Date; serviciosActivos?: number }) => Promise<void>;
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
      totalUsuariosActivos: 0,
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
          const [totalClientes, totalRevendedores, totalNuevosHoy, totalUsuariosActivos] = await Promise.all([
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'cliente' }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'tipo', operator: '==', value: 'revendedor' }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'createdAt', operator: '>=', value: today }]),
            getCount(COLLECTIONS.USUARIOS, [{ field: 'serviciosActivos', operator: '>', value: 0 }]),
          ]);
          set({ totalClientes, totalRevendedores, totalNuevosHoy, totalUsuariosActivos, lastCountsFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al cargar conteos';
          set({ error: errorMessage });
          console.error('Error fetching counts:', error);
        }
      },

      createUsuario: async (usuarioData) => {
        try {
          const id = await createDoc(COLLECTIONS.USUARIOS, {
            ...usuarioData,
            serviciosActivos: 0,
            active: true,
          });

          const newUsuario: Usuario = {
            ...usuarioData,
            id,
            serviciosActivos: 0,
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
          const oldUsuario = get().usuarios.find(u => u.id === id);
          const cambioTipo = oldUsuario && updates.tipo && oldUsuario.tipo !== updates.tipo;
          const cambioServiciosActivos = oldUsuario && updates.serviciosActivos !== undefined && oldUsuario.serviciosActivos !== updates.serviciosActivos;

          await update(COLLECTIONS.USUARIOS, id, updates);

          set((state) => {
            const updatedUsuarios = state.usuarios.map((usuario) =>
              usuario.id === id
                ? { ...usuario, ...updates, updatedAt: new Date() }
                : usuario
            );

            // Actualizar contadores si hubo cambio de tipo
            let newTotalClientes = state.totalClientes;
            let newTotalRevendedores = state.totalRevendedores;
            let newTotalUsuariosActivos = state.totalUsuariosActivos;

            if (cambioTipo && oldUsuario) {
              if (oldUsuario.tipo === 'cliente' && updates.tipo === 'revendedor') {
                newTotalClientes--;
                newTotalRevendedores++;
              } else if (oldUsuario.tipo === 'revendedor' && updates.tipo === 'cliente') {
                newTotalClientes++;
                newTotalRevendedores--;
              }
            }

            // Actualizar contador de usuarios activos si cambió serviciosActivos
            if (cambioServiciosActivos && oldUsuario) {
              const oldActivo = (oldUsuario.serviciosActivos ?? 0) > 0;
              const newActivo = (updates.serviciosActivos ?? 0) > 0;

              if (oldActivo && !newActivo) {
                newTotalUsuariosActivos--;
              } else if (!oldActivo && newActivo) {
                newTotalUsuariosActivos++;
              }
            }

            return {
              usuarios: updatedUsuarios,
              totalClientes: newTotalClientes,
              totalRevendedores: newTotalRevendedores,
              totalUsuariosActivos: newTotalUsuariosActivos,
              error: null
            };
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario';
          set({ error: errorMessage });
          console.error('Error updating usuario:', error);
          throw error;
        }
      },

      deleteUsuario: async (id, usuarioData?: { tipo: 'cliente' | 'revendedor'; createdAt?: Date; serviciosActivos?: number }) => {
        // Si se proporciona usuarioData, usarlo; de lo contrario, buscar en usuarios locales o en Firebase
        let deletedUser: Usuario | undefined;

        if (usuarioData) {
          // Crear un objeto Usuario mínimo con los datos proporcionados
          deletedUser = { ...usuarioData } as Usuario;
        } else {
          // Intentar buscar en el store local (puede estar vacío con paginación)
          const currentUsuarios = get().usuarios;
          deletedUser = currentUsuarios.find(u => u.id === id);

          if (!deletedUser) {
            // Si no está en el store local, traerlo de Firebase
            try {
              const fetchedUser = await getById<Usuario>(COLLECTIONS.USUARIOS, id);
              if (!fetchedUser) {
                throw new Error('Usuario no encontrado en Firebase');
              }
              deletedUser = fetchedUser;
            } catch (error) {
              console.error('Error fetching usuario from Firebase:', error);
              throw new Error('Usuario no encontrado');
            }
          }
        }

        if (!deletedUser) {
          throw new Error('Usuario no encontrado');
        }

        const today = startOfDay(new Date());
        const wasCreatedToday = deletedUser.createdAt && startOfDay(new Date(deletedUser.createdAt)).getTime() === today.getTime();
        const wasActive = (deletedUser.serviciosActivos ?? 0) > 0;

        // Guardar estado actual para rollback
        const currentState = {
          totalClientes: get().totalClientes,
          totalRevendedores: get().totalRevendedores,
          totalNuevosHoy: get().totalNuevosHoy,
          totalUsuariosActivos: get().totalUsuariosActivos,
          usuarios: get().usuarios,
        };

        // Optimistic update de contadores
        set((state) => ({
          usuarios: state.usuarios.filter((usuario) => usuario.id !== id), // Solo si está en memoria
          totalClientes: deletedUser!.tipo === 'cliente' ? state.totalClientes - 1 : state.totalClientes,
          totalRevendedores: deletedUser!.tipo === 'revendedor' ? state.totalRevendedores - 1 : state.totalRevendedores,
          totalNuevosHoy: wasCreatedToday ? state.totalNuevosHoy - 1 : state.totalNuevosHoy,
          totalUsuariosActivos: wasActive ? state.totalUsuariosActivos - 1 : state.totalUsuariosActivos,
        }));

        try {
          await remove(COLLECTIONS.USUARIOS, id);

          // Notificar a otras páginas que se eliminó un usuario
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('usuario-deleted', Date.now().toString());
            window.dispatchEvent(new Event('usuario-deleted'));
          }

          set({ error: null });
        } catch (error) {
          // Rollback on error - restaurar estado anterior completo
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
          set({
            usuarios: currentState.usuarios,
            totalClientes: currentState.totalClientes,
            totalRevendedores: currentState.totalRevendedores,
            totalNuevosHoy: currentState.totalNuevosHoy,
            totalUsuariosActivos: currentState.totalUsuariosActivos,
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
