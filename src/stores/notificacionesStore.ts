import { create } from 'zustand';
import { Notificacion } from '@/types';

interface NotificacionesState {
  notificaciones: Notificacion[];
  loading: boolean;
  unreadCount: number;
  fetchNotificaciones: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotificacion: (id: string) => Promise<void>;
}

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  notificaciones: [],
  loading: false,
  unreadCount: 0,

  fetchNotificaciones: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ notificaciones: [] });
      set({ unreadCount: get().notificaciones.filter(n => !n.leida).length });
    } catch (error) {
      console.error('Error fetching notificaciones:', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      set({
        notificaciones: get().notificaciones.map((n) =>
          n.id === id ? { ...n, leida: true } : n
        ),
      });
      set({ unreadCount: get().notificaciones.filter(n => !n.leida).length });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      set({
        notificaciones: get().notificaciones.map((n) => ({ ...n, leida: true })),
      });
      set({ unreadCount: 0 });
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  deleteNotificacion: async (id) => {
    try {
      set({
        notificaciones: get().notificaciones.filter((n) => n.id !== id),
      });
      set({ unreadCount: get().notificaciones.filter(n => !n.leida).length });
    } catch (error) {
      console.error('Error deleting notificacion:', error);
      throw error;
    }
  },
}));
