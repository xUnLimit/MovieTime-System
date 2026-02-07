import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notificacion, EstadoNotificacion } from '@/types';
import { getAll, getCount, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';
import { doc as firestoreDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface NotificacionesState {
  notificaciones: Notificacion[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Actions
  fetchNotificaciones: (force?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotificacion: (id: string) => Promise<void>;
  createNotificacion: (notificacion: Omit<Notificacion, 'id' | 'createdAt' | 'leida'>) => Promise<void>;
  getNotificacionesByEstado: (estado: EstadoNotificacion) => Notificacion[];
  getNotificacionesPrioritarias: () => Notificacion[];
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useNotificacionesStore = create<NotificacionesState>()(
  devtools(
    (set, get) => ({
      notificaciones: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      lastFetch: null,

      fetchNotificaciones: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.NOTIFICACIONES);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const notificaciones = (await getAll<Notificacion>(COLLECTIONS.NOTIFICACIONES))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          set({
            notificaciones,
            unreadCount: notificaciones.filter((n) => !n.leida).length,
            isLoading: false,
            error: null,
            lastFetch: Date.now()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar notificaciones';
          console.error('Error fetching notificaciones:', error);
          set({ notificaciones: [], unreadCount: 0, isLoading: false, error: errorMessage });
        }
      },

      fetchUnreadCount: async () => {
        try {
          const count = await getCount(COLLECTIONS.NOTIFICACIONES, [
            { field: 'leida', operator: '==', value: false }
          ]);
          set({ unreadCount: count });
        } catch (error) {
          console.error('Error fetching unread count:', error);
          set({ unreadCount: 0 });
        }
      },

      markAsRead: async (id) => {
        try {
          await update(COLLECTIONS.NOTIFICACIONES, id, { leida: true });

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
