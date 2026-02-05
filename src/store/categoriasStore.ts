import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Categoria } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';

interface CategoriasState {
  categorias: Categoria[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedCategoria: Categoria | null;

  // Actions
  fetchCategorias: (force?: boolean) => Promise<void>;
  createCategoria: (categoria: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategoria: (id: string, updates: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  setSelectedCategoria: (categoria: Categoria | null) => void;
  getCategoria: (id: string) => Categoria | undefined;
  getCategoriasByTipo: (tipo: 'cliente' | 'revendedor' | 'ambos') => Categoria[];
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useCategoriasStore = create<CategoriasState>()(
  devtools(
    (set, get) => ({
      categorias: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      selectedCategoria: null,

      fetchCategorias: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.CATEGORIAS);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const categorias = await getAll<Categoria>(COLLECTIONS.CATEGORIAS);
          set({ categorias, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar categorías';
          console.error('Error fetching categorias:', error);
          set({ categorias: [], isLoading: false, error: errorMessage });
        }
      },

      createCategoria: async (categoriaData) => {
        try {
          const id = await createDoc(COLLECTIONS.CATEGORIAS, categoriaData);

          const newCategoria: Categoria = {
            ...categoriaData,
            id,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            categorias: [...state.categorias, newCategoria],
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al crear categoría';
          set({ error: errorMessage });
          console.error('Error creating categoria:', error);
          throw error;
        }
      },

      updateCategoria: async (id, updates) => {
        try {
          await update(COLLECTIONS.CATEGORIAS, id, updates);

          set((state) => ({
            categorias: state.categorias.map((cat) =>
              cat.id === id
                ? { ...cat, ...updates, updatedAt: new Date() }
                : cat
            ),
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar categoría';
          set({ error: errorMessage });
          console.error('Error updating categoria:', error);
          throw error;
        }
      },

      deleteCategoria: async (id) => {
        const currentCategorias = get().categorias;

        // Optimistic update
        set((state) => ({
          categorias: state.categorias.filter((cat) => cat.id !== id)
        }));

        try {
          await remove(COLLECTIONS.CATEGORIAS, id);
          set({ error: null });
        } catch (error) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar categoría';
          set({ categorias: currentCategorias, error: errorMessage });
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
