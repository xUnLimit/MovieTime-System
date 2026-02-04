import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notificacion, EstadoNotificacion } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp, doc as firestoreDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
        try {
          const data = await getAll<any>(COLLECTIONS.NOTIFICACIONES);
          const notificaciones: Notificacion[] = data.map(item => ({
            ...item,
            createdAt: timestampToDate(item.createdAt)
          })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          set({
            notificaciones,
            unreadCount: notificaciones.filter((n) => !n.leida).length,
            isLoading: false
          });
        } catch (error) {
          console.error('Error fetching notificaciones:', error);
          set({ notificaciones: [], unreadCount: 0, isLoading: false });
        }
      },

      markAsRead: async (id) => {
        try {
          await update(COLLECTIONS.NOTIFICACIONES, id, {
            leida: true
          });

          set((state) => {
            const notificacion = state.notificaciones.find((n) => n.id === id);
            const wasUnread = notificacion && !notificacion.leida;

            return {
              notificaciones: state.notificaciones.map((n) =>
                n.id === id ? { ...n, leida: true } : n
              ),
              unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount
            };
          });
        } catch (error) {
          console.error('Error marking notificacion as read:', error);
          throw error;
        }
      },

      markAllAsRead: async () => {
        try {
          const unread = get().notificaciones.filter((n) => !n.leida);
          if (unread.length > 0) {
            const batch = writeBatch(db);
            unread.forEach((n) => {
              batch.update(firestoreDoc(db, COLLECTIONS.NOTIFICACIONES, n.id), { leida: true });
            });
            await batch.commit();
          }

          set((state) => ({
            notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
            unreadCount: 0
          }));
        } catch (error) {
          console.error('Error marking all notificaciones as read:', error);
          throw error;
        }
      },

      deleteNotificacion: async (id) => {
        try {
          await remove(COLLECTIONS.NOTIFICACIONES, id);

          set((state) => {
            const notificacion = state.notificaciones.find((n) => n.id === id);
            const wasUnread = notificacion && !notificacion.leida;

            return {
              notificaciones: state.notificaciones.filter((n) => n.id !== id),
              unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount
            };
          });
        } catch (error) {
          console.error('Error deleting notificacion:', error);
          throw error;
        }
      },

      createNotificacion: async (notificacionData) => {
        try {
          const id = await createDoc(COLLECTIONS.NOTIFICACIONES, {
            ...notificacionData,
            leida: false,
            createdAt: Timestamp.now()
          });

          const newNotificacion: Notificacion = {
            ...notificacionData,
            id,
            leida: false,
            createdAt: new Date()
          };

          set((state) => ({
            notificaciones: [newNotificacion, ...state.notificaciones],
            unreadCount: state.unreadCount + 1
          }));
        } catch (error) {
          console.error('Error creating notificacion:', error);
          throw error;
        }
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
