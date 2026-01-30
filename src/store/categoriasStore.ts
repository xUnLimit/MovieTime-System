import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Categoria } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface CategoriasState {
  categorias: Categoria[];
  isLoading: boolean;
  selectedCategoria: Categoria | null;

  // Actions
  fetchCategorias: () => Promise<void>;
  createCategoria: (categoria: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategoria: (id: string, updates: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  setSelectedCategoria: (categoria: Categoria | null) => void;
  getCategoria: (id: string) => Categoria | undefined;
  getCategoriasByTipo: (tipo: 'cliente' | 'revendedor' | 'ambos') => Categoria[];
}

export const useCategoriasStore = create<CategoriasState>()(
  devtools(
    (set, get) => ({
      categorias: [],
      isLoading: false,
      selectedCategoria: null,

      fetchCategorias: async () => {
        set({ isLoading: true });
        try {
          const data = await getAll<any>(COLLECTIONS.CATEGORIAS);
          const categorias: Categoria[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt),
            updatedAt: timestampToDate(item.updatedAt)
          }));

          set({ categorias, isLoading: false });
        } catch (error) {
          console.error('Error fetching categorias:', error);
          set({ categorias: [], isLoading: false });
        }
      },

      createCategoria: async (categoriaData) => {
        try {
          const id = await createDoc(COLLECTIONS.CATEGORIAS, {
            ...categoriaData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          const newCategoria: Categoria = {
            ...categoriaData,
            id,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            categorias: [...state.categorias, newCategoria]
          }));
        } catch (error) {
          console.error('Error creating categoria:', error);
          throw error;
        }
      },

      updateCategoria: async (id, updates) => {
        try {
          await update(COLLECTIONS.CATEGORIAS, id, {
            ...updates,
            updatedAt: Timestamp.now()
          });

          set((state) => ({
            categorias: state.categorias.map((cat) =>
              cat.id === id
                ? { ...cat, ...updates, updatedAt: new Date() }
                : cat
            )
          }));
        } catch (error) {
          console.error('Error updating categoria:', error);
          throw error;
        }
      },

      deleteCategoria: async (id) => {
        try {
          await remove(COLLECTIONS.CATEGORIAS, id);

          set((state) => ({
            categorias: state.categorias.filter((cat) => cat.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting categoria:', error);
          throw error;
        }
      },

      setSelectedCategoria: (categoria) => {
        set({ selectedCategoria: categoria });
      },

      getCategoria: (id) => {
        return get().categorias.find((cat) => cat.id === id);
      },

      getCategoriasByTipo: (tipo) => {
        return get().categorias.filter(
          (cat) => cat.tipo === tipo || cat.tipo === 'ambos'
        );
      }
    }),
    { name: 'categorias-store' }
  )
);
