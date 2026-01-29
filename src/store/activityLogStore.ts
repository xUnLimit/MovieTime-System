import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ActivityLog, AccionLog, EntidadLog } from '@/types';
import { MOCK_ACTIVITY_LOGS } from '@/lib/mock-data';

interface ActivityLogState {
  logs: ActivityLog[];
  isLoading: boolean;

  // Actions
  fetchLogs: () => Promise<void>;
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => Promise<void>;
  getLogsByEntidad: (entidad: EntidadLog) => ActivityLog[];
  getLogsByAccion: (accion: AccionLog) => ActivityLog[];
  getRecentLogs: (limit: number) => ActivityLog[];
}

export const useActivityLogStore = create<ActivityLogState>()(
  devtools(
    (set, get) => ({
      logs: [],
      isLoading: false,

      fetchLogs: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const logs = MOCK_ACTIVITY_LOGS.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        set({
          logs,
          isLoading: false
        });
      },

      addLog: (logData) => {
        const newLog: ActivityLog = {
          ...logData,
          id: `log-${Date.now()}`,
          timestamp: new Date()
        };

        set((state) => ({
          logs: [newLog, ...state.logs]
        }));
      },

      clearLogs: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set({
          logs: [],
          isLoading: false
        });
      },

      getLogsByEntidad: (entidad) => {
        return get().logs.filter((log) => log.entidad === entidad);
      },

      getLogsByAccion: (accion) => {
        return get().logs.filter((log) => log.accion === accion);
      },

      getRecentLogs: (limit) => {
        return get().logs.slice(0, limit);
      }
    }),
    { name: 'activity-log-store' }
  )
);
