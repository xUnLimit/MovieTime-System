import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Configuracion, TasasCambio } from '@/types';
import { getById, update, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface ConfigState {
  config: Configuracion | null;
  isLoading: boolean;

  // Actions
  fetchConfig: () => Promise<void>;
  updateTasasCambio: (tasas: Partial<TasasCambio>) => Promise<void>;
  updateDiasNotificacion: (dias: number[]) => Promise<void>;
  updateHoraEnvio: (hora: number) => Promise<void>;
  updatePrefijoWhatsApp: (prefijo: string) => Promise<void>;
}

const CONFIG_DOC_ID = 'global';

export const useConfigStore = create<ConfigState>()(
  devtools(
    (set, get) => ({
        config: null,
        isLoading: false,

        fetchConfig: async () => {
          set({ isLoading: true });
          try {
            const data = await getById<any>(COLLECTIONS.CONFIG, CONFIG_DOC_ID);

            if (data) {
              const config: Configuracion = {
                ...data,
                tasasCambio: {
                  ...data.tasasCambio,
                  ultimaActualizacion: timestampToDate(data.tasasCambio.ultimaActualizacion)
                },
                updatedAt: timestampToDate(data.updatedAt)
              };

              set({ config, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          } catch (error) {
            console.error('Error fetching config:', error);
            set({ isLoading: false });
          }
        },

        updateTasasCambio: async (tasasUpdates) => {
          try {
            const config = get().config;
            if (!config) throw new Error('Config not loaded');

            const updatedTasas = {
              ...config.tasasCambio,
              ...tasasUpdates,
              ultimaActualizacion: Timestamp.now()
            };

            await update(COLLECTIONS.CONFIG, CONFIG_DOC_ID, {
              tasasCambio: updatedTasas,
              updatedAt: Timestamp.now()
            });

            set((state) => ({
              config: state.config ? {
                ...state.config,
                tasasCambio: {
                  ...state.config.tasasCambio,
                  ...tasasUpdates,
                  ultimaActualizacion: new Date()
                },
                updatedAt: new Date()
              } : null
            }));
          } catch (error) {
            console.error('Error updating tasas cambio:', error);
            throw error;
          }
        },

        updateDiasNotificacion: async (dias) => {
          try {
            const config = get().config;
            if (!config) throw new Error('Config not loaded');

            await update(COLLECTIONS.CONFIG, CONFIG_DOC_ID, {
              'notificaciones.diasAntes': dias,
              updatedAt: Timestamp.now()
            });

            set((state) => ({
              config: state.config ? {
                ...state.config,
                notificaciones: {
                  ...state.config.notificaciones,
                  diasAntes: dias
                },
                updatedAt: new Date()
              } : null
            }));
          } catch (error) {
            console.error('Error updating dias notificacion:', error);
            throw error;
          }
        },

        updateHoraEnvio: async (hora) => {
          try {
            const config = get().config;
            if (!config) throw new Error('Config not loaded');

            await update(COLLECTIONS.CONFIG, CONFIG_DOC_ID, {
              'notificaciones.horaEnvio': hora,
              updatedAt: Timestamp.now()
            });

            set((state) => ({
              config: state.config ? {
                ...state.config,
                notificaciones: {
                  ...state.config.notificaciones,
                  horaEnvio: hora
                },
                updatedAt: new Date()
              } : null
            }));
          } catch (error) {
            console.error('Error updating hora envio:', error);
            throw error;
          }
        },

        updatePrefijoWhatsApp: async (prefijo) => {
          try {
            const config = get().config;
            if (!config) throw new Error('Config not loaded');

            await update(COLLECTIONS.CONFIG, CONFIG_DOC_ID, {
              'whatsapp.prefijoTelefono': prefijo,
              updatedAt: Timestamp.now()
            });

            set((state) => ({
              config: state.config ? {
                ...state.config,
                whatsapp: {
                  prefijoTelefono: prefijo
                },
                updatedAt: new Date()
              } : null
            }));
          } catch (error) {
            console.error('Error updating prefijo whatsapp:', error);
            throw error;
          }
        }
      }),
      { name: 'config-store' }
    )
  );

