import { create } from 'zustand';
import { Categoria } from '@/types';

interface CategoriasState {
  categorias: Categoria[];
  loading: boolean;
  fetchCategorias: () => Promise<void>;
  createCategoria: (data: Partial<Categoria>) => Promise<void>;
  updateCategoria: (id: string, data: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
}

export const useCategoriasStore = create<CategoriasState>((set, get) => ({
  categorias: [],
  loading: false,

  fetchCategorias: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      // const response = await fetch('/api/categorias');
      // const data = await response.json();
      // set({ categorias: data });

      // Mock data for now
      set({ categorias: [] });
    } catch (error) {
      console.error('Error fetching categorias:', error);
    } finally {
      set({ loading: false });
    }
  },

  createCategoria: async (data) => {
    try {
      // TODO: Implement API call
      // const response = await fetch('/api/categorias', {
      //   method: 'POST',
      //   body: JSON.stringify(data),
      // });
      // const newCategoria = await response.json();

      const newCategoria: Categoria = {
        id: Date.now().toString(),
        nombre: data.nombre || '',
        tipo: data.tipo || 'ambos',
        iconUrl: data.iconUrl,
        color: data.color,
        activo: data.activo ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ categorias: [...get().categorias, newCategoria] });
    } catch (error) {
      console.error('Error creating categoria:', error);
      throw error;
    }
  },

  updateCategoria: async (id, data) => {
    try {
      // TODO: Implement API call
      set({
        categorias: get().categorias.map((c) =>
          c.id === id ? { ...c, ...data, updatedAt: new Date() } : c
        ),
      });
    } catch (error) {
      console.error('Error updating categoria:', error);
      throw error;
    }
  },

  deleteCategoria: async (id) => {
    try {
      // TODO: Implement API call
      set({
        categorias: get().categorias.filter((c) => c.id !== id),
      });
    } catch (error) {
      console.error('Error deleting categoria:', error);
      throw error;
    }
  },
}));
