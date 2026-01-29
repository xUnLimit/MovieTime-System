import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notificacion, EstadoNotificacion } from '@/types';
import { MOCK_NOTIFICACIONES } from '@/lib/mock-data';

interface NotificacionesState {
  notificaciones: Notificacion[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  fetchNotificaciones: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotificacion: (id: string) => Promise<void>;
  createNotificacion: (notificacion: Omit<Notificacion, 'id' | 'createdAt' | 'leida'>) => Promise<void>;
  getNotificacionesByEstado: (estado: EstadoNotificacion) => Notificacion[];
  getNotificacionesPrioritarias: () => Notificacion[];
}

export const useNotificacionesStore = create<NotificacionesState>()(
  devtools(
    (set, get) => ({
      notificaciones: [],
      unreadCount: 0,
      isLoading: false,

      fetchNotificaciones: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const notificaciones = MOCK_NOTIFICACIONES.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        set({
          notificaciones,
          unreadCount: notificaciones.filter((n) => !n.leida).length,
          isLoading: false
        });
      },

      markAsRead: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        set((state) => {
          const notificacion = state.notificaciones.find((n) => n.id === id);
          const wasUnread = notificacion && !notificacion.leida;

          return {
            notificaciones: state.notificaciones.map((n) =>
              n.id === id ? { ...n, leida: true } : n
            ),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
            isLoading: false
          };
        });
      },

      markAllAsRead: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
          unreadCount: 0,
          isLoading: false
        }));
      },

      deleteNotificacion: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        set((state) => {
          const notificacion = state.notificaciones.find((n) => n.id === id);
          const wasUnread = notificacion && !notificacion.leida;

          return {
            notificaciones: state.notificaciones.filter((n) => n.id !== id),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
            isLoading: false
          };
        });
      },

      createNotificacion: async (notificacionData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const newNotificacion: Notificacion = {
          ...notificacionData,
          id: `notif-${Date.now()}`,
          leida: false,
          createdAt: new Date()
        };

        set((state) => ({
          notificaciones: [newNotificacion, ...state.notificaciones],
          unreadCount: state.unreadCount + 1,
          isLoading: false
        }));
      },

      getNotificacionesByEstado: (estado) => {
        return get().notificaciones.filter((n) => n.estado === estado);
      },

      getNotificacionesPrioritarias: () => {
        return get()
          .notificaciones.filter((n) => !n.leida && (n.prioridad === 'alta' || n.prioridad === 'critica'))
          .slice(0, 5);
      }
    }),
    { name: 'notificaciones-store' }
  )
);
