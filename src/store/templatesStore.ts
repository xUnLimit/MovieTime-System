import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TemplateMensaje, TipoTemplate } from '@/types';
import { MOCK_TEMPLATES } from '@/lib/mock-data';

interface TemplatesState {
  templates: TemplateMensaje[];
  isLoading: boolean;
  selectedTemplate: TemplateMensaje | null;

  // Actions
  fetchTemplates: () => Promise<void>;
  createTemplate: (template: Omit<TemplateMensaje, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<TemplateMensaje>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setSelectedTemplate: (template: TemplateMensaje | null) => void;
  getTemplateByTipo: (tipo: TipoTemplate) => TemplateMensaje | undefined;
}

export const useTemplatesStore = create<TemplatesState>()(
  devtools(
    persist(
      (set, get) => ({
        templates: [],
        isLoading: false,
        selectedTemplate: null,

        fetchTemplates: async () => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 300));

          const storedTemplates = get().templates;

          // Si no hay templates guardados, usar los mock
          if (storedTemplates.length === 0) {
            set({
              templates: MOCK_TEMPLATES,
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        },

        createTemplate: async (templateData) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          const newTemplate: TemplateMensaje = {
            ...templateData,
            id: `template-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            templates: [...state.templates, newTemplate],
            isLoading: false
          }));
        },

        updateTemplate: async (id, updates) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            templates: state.templates.map((template) =>
              template.id === id
                ? { ...template, ...updates, updatedAt: new Date() }
                : template
            ),
            isLoading: false
          }));
        },

        deleteTemplate: async (id) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            templates: state.templates.filter((template) => template.id !== id),
            isLoading: false
          }));
        },

        setSelectedTemplate: (template) => {
          set({ selectedTemplate: template });
        },

        getTemplateByTipo: (tipo) => {
          return get().templates.find((t) => t.tipo === tipo && t.activo);
        }
      }),
      {
        name: 'templates-storage',
        partialize: (state) => ({ templates: state.templates })
      }
    )
  )
);
