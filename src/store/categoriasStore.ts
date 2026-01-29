import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Categoria } from '@/types';
import { MOCK_CATEGORIAS } from '@/lib/mock-data';

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

        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 300));

        set({
          categorias: MOCK_CATEGORIAS,
          isLoading: false
        });
      },

      createCategoria: async (categoriaData) => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 500));

        const newCategoria: Categoria = {
          ...categoriaData,
          id: `cat-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          categorias: [...state.categorias, newCategoria],
          isLoading: false
        }));
      },

      updateCategoria: async (id, updates) => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          categorias: state.categorias.map((cat) =>
            cat.id === id
              ? { ...cat, ...updates, updatedAt: new Date() }
              : cat
          ),
          isLoading: false
        }));
      },

      deleteCategoria: async (id) => {
        set({ isLoading: true });

        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          categorias: state.categorias.filter((cat) => cat.id !== id),
          isLoading: false
        }));
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
