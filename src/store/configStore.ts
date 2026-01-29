import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Configuracion, TasasCambio } from '@/types';
import { MOCK_CONFIGURACION } from '@/lib/mock-data';

interface ConfigState {
  config: Configuracion;
  isLoading: boolean;

  // Actions
  fetchConfig: () => Promise<void>;
  updateTasasCambio: (tasas: Partial<TasasCambio>) => Promise<void>;
  updateDiasNotificacion: (dias: number[]) => Promise<void>;
  updateHoraEnvio: (hora: number) => Promise<void>;
  updatePrefijoWhatsApp: (prefijo: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        config: MOCK_CONFIGURACION,
        isLoading: false,

        fetchConfig: async () => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 300));

          const storedConfig = get().config;

          // Si no hay config guardada, usar mock
          if (!storedConfig || storedConfig.id !== 'global') {
            set({
              config: MOCK_CONFIGURACION,
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        },

        updateTasasCambio: async (tasasUpdates) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            config: {
              ...state.config,
              tasasCambio: {
                ...state.config.tasasCambio,
                ...tasasUpdates,
                ultimaActualizacion: new Date()
              },
              updatedAt: new Date()
            },
            isLoading: false
          }));
        },

        updateDiasNotificacion: async (dias) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            config: {
              ...state.config,
              notificaciones: {
                ...state.config.notificaciones,
                diasAntes: dias
              },
              updatedAt: new Date()
            },
            isLoading: false
          }));
        },

        updateHoraEnvio: async (hora) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            config: {
              ...state.config,
              notificaciones: {
                ...state.config.notificaciones,
                horaEnvio: hora
              },
              updatedAt: new Date()
            },
            isLoading: false
          }));
        },

        updatePrefijoWhatsApp: async (prefijo) => {
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            config: {
              ...state.config,
              whatsapp: {
                prefijoTelefono: prefijo
              },
              updatedAt: new Date()
            },
            isLoading: false
          }));
        }
      }),
      {
        name: 'config-storage',
        partialize: (state) => ({ config: state.config })
      }
    )
  )
);
