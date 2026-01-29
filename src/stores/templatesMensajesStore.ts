import { create } from 'zustand';
import { TemplateMensaje } from '@/types';

interface TemplatesMensajesState {
  templates: TemplateMensaje[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Partial<TemplateMensaje>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<TemplateMensaje>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useTemplatesMensajesStore = create<TemplatesMensajesState>((set, get) => ({
  templates: [],
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ templates: [] });
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      set({ loading: false });
    }
  },

  createTemplate: async (data) => {
    try {
      const newTemplate: TemplateMensaje = {
        id: Date.now().toString(),
        nombre: data.nombre || '',
        tipo: data.tipo || 'notificacion_regular',
        contenido: data.contenido || '',
        placeholders: data.placeholders || [],
        activo: data.activo ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set({ templates: [...get().templates, newTemplate] });
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  updateTemplate: async (id, data) => {
    try {
      set({
        templates: get().templates.map((t) =>
          t.id === id ? { ...t, ...data, updatedAt: new Date() } : t
        ),
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    try {
      set({
        templates: get().templates.filter((t) => t.id !== id),
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },
}));
