import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TemplateMensaje, TipoTemplate } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

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
          try {
            const data = await getAll<any>(COLLECTIONS.TEMPLATES);
            const templates: TemplateMensaje[] = data.map(item => ({
              ...item,
              createdAt: timestampToDate(item.createdAt),
              updatedAt: timestampToDate(item.updatedAt)
            }));

            set({ templates, isLoading: false });
          } catch (error) {
            console.error('Error fetching templates:', error);
            set({ isLoading: false });
          }
        },

        createTemplate: async (templateData) => {
          try {
            const id = await createDoc(COLLECTIONS.TEMPLATES, {
              ...templateData,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });

            const newTemplate: TemplateMensaje = {
              ...templateData,
              id,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            set((state) => ({
              templates: [...state.templates, newTemplate]
            }));
          } catch (error) {
            console.error('Error creating template:', error);
            throw error;
          }
        },

        updateTemplate: async (id, updates) => {
          try {
            await update(COLLECTIONS.TEMPLATES, id, {
              ...updates,
              updatedAt: Timestamp.now()
            });

            set((state) => ({
              templates: state.templates.map((template) =>
                template.id === id
                  ? { ...template, ...updates, updatedAt: new Date() }
                  : template
              )
            }));
          } catch (error) {
            console.error('Error updating template:', error);
            throw error;
          }
        },

        deleteTemplate: async (id) => {
          try {
            await remove(COLLECTIONS.TEMPLATES, id);

            set((state) => ({
              templates: state.templates.filter((template) => template.id !== id)
            }));
          } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
          }
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
