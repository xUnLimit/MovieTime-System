import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Usuario } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface UsuariosState {
  usuarios: Usuario[];
  isLoading: boolean;
  selectedUsuario: Usuario | null;

  // Actions
  fetchUsuarios: () => Promise<void>;
  createUsuario: (usuario: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'montoSinConsumir' | 'serviciosActivos' | 'suscripcionesTotales'>) => Promise<void>;
  updateUsuario: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteUsuario: (id: string) => Promise<void>;
  setSelectedUsuario: (usuario: Usuario | null) => void;
  getUsuario: (id: string) => Usuario | undefined;
  getClientes: () => Usuario[];
  getRevendedores: () => Usuario[];
}

export const useUsuariosStore = create<UsuariosState>()(
  devtools(
    (set, get) => ({
      usuarios: [],
      isLoading: false,
      selectedUsuario: null,

      // Fetch all usuarios
      fetchUsuarios: async () => {
        set({ isLoading: true });
        try {
          const data = await getAll<any>(COLLECTIONS.USUARIOS);
          const usuarios: Usuario[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt),
            updatedAt: timestampToDate(item.updatedAt)
          }));

          set({ usuarios, isLoading: false });
        } catch (error) {
          console.error('Error fetching usuarios:', error);
          set({ usuarios: [], isLoading: false });
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
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
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
            usuarios: [...state.usuarios, newUsuario]
          }));
        } catch (error) {
          console.error('Error creating usuario:', error);
          throw error;
        }
      },

      updateUsuario: async (id, updates) => {
        try {
          await update(COLLECTIONS.USUARIOS, id, {
            ...updates,
            updatedAt: Timestamp.now()
          });

          set((state) => ({
            usuarios: state.usuarios.map((usuario) =>
              usuario.id === id
                ? { ...usuario, ...updates, updatedAt: new Date() }
                : usuario
            )
          }));
        } catch (error) {
          console.error('Error updating usuario:', error);
          throw error;
        }
      },

      deleteUsuario: async (id) => {
        try {
          await remove(COLLECTIONS.USUARIOS, id);

          set((state) => ({
            usuarios: state.usuarios.filter((usuario) => usuario.id !== id)
          }));
        } catch (error) {
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

      // Helpers para filtrar por tipo
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
