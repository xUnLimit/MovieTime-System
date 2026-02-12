import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notificacion, EstadoNotificacion } from '@/types';
import {
  getAll,
  getCount,
  create as createDoc,
  update,
  remove,
  queryDocuments,
  COLLECTIONS,
  logCacheHit
} from '@/lib/firebase/firestore';
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

  // ✅ NUEVAS ACCIONES v2.1
  toggleLeida: (id: string) => Promise<void>;
  toggleResaltada: (id: string) => Promise<void>;
  deleteNotificacionesPorEntidad: (ventaId?: string, servicioId?: string) => Promise<void>;
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
      },

      // ==========================================
      // ✅ NUEVAS ACCIONES v2.1
      // ==========================================

      /**
       * Toggle estado leída/no leída de una notificación
       */
      toggleLeida: async (id: string) => {
        try {
          const notificacion = get().notificaciones.find((n) => n.id === id);
          if (!notificacion) {
            console.warn(`[NotificacionesStore] Notificación ${id} no encontrada`);
            return;
          }

          const nuevoEstado = !notificacion.leida;

          await update(COLLECTIONS.NOTIFICACIONES, id, {
            leida: nuevoEstado
          });

          set((state) => ({
            notificaciones: state.notificaciones.map((n) =>
              n.id === id ? { ...n, leida: nuevoEstado } : n
            ),
            unreadCount: nuevoEstado
              ? state.unreadCount - 1
              : state.unreadCount + 1
          }));

          console.log(`[NotificacionesStore] Toggle leída: ${id} -> ${nuevoEstado}`);
        } catch (error) {
          console.error('[NotificacionesStore] Error toggling leída:', error);
          throw error;
        }
      },

      /**
       * Toggle estado resaltada/no resaltada de una notificación
       */
      toggleResaltada: async (id: string) => {
        try {
          const notificacion = get().notificaciones.find((n) => n.id === id);
          if (!notificacion) {
            console.warn(`[NotificacionesStore] Notificación ${id} no encontrada`);
            return;
          }

          const nuevoEstado = !notificacion.resaltada;

          await update(COLLECTIONS.NOTIFICACIONES, id, {
            resaltada: nuevoEstado
          });

          set((state) => ({
            notificaciones: state.notificaciones.map((n) =>
              n.id === id ? { ...n, resaltada: nuevoEstado } : n
            )
          }));

          console.log(`[NotificacionesStore] Toggle resaltada: ${id} -> ${nuevoEstado}`);
        } catch (error) {
          console.error('[NotificacionesStore] Error toggling resaltada:', error);
          throw error;
        }
      },

      /**
       * Elimina todas las notificaciones de una venta o servicio específico
       * Se usa al renovar o cortar una venta/servicio
       */
      deleteNotificacionesPorEntidad: async (ventaId?: string, servicioId?: string) => {
        try {
          if (!ventaId && !servicioId) {
            console.warn('[NotificacionesStore] deleteNotificacionesPorEntidad: ventaId y servicioId undefined');
            return;
          }

          const filters = [];
          if (ventaId) filters.push({ field: 'ventaId', operator: '==', value: ventaId });
          if (servicioId) filters.push({ field: 'servicioId', operator: '==', value: servicioId });

          const notificaciones = await queryDocuments<Notificacion>(
            COLLECTIONS.NOTIFICACIONES,
            filters as any
          );

          if (notificaciones.length === 0) {
            console.log('[NotificacionesStore] No hay notificaciones para eliminar');
            return;
          }

          // Eliminar en batch
          const batch = writeBatch(db);
          notificaciones.forEach((n) => {
            batch.delete(firestoreDoc(db, COLLECTIONS.NOTIFICACIONES, n.id));
          });
          await batch.commit();

          // Actualizar estado local
          set((state) => {
            const notificacionesEliminadas = state.notificaciones.filter(
              (n) => n.ventaId === ventaId || n.servicioId === servicioId
            );
            const unreadEliminadas = notificacionesEliminadas.filter((n) => !n.leida && !n.resaltada);

            return {
              notificaciones: state.notificaciones.filter(
                (n) => n.ventaId !== ventaId && n.servicioId !== servicioId
              ),
              unreadCount: Math.max(0, state.unreadCount - unreadEliminadas.length)
            };
          });

          console.log(
            `[NotificacionesStore] Eliminadas ${notificaciones.length} notificaciones de entidad: ${ventaId || servicioId}`
          );
        } catch (error) {
          console.error('[NotificacionesStore] Error deleting notificaciones por entidad:', error);
          throw error;
        }
      }
    }),
    { name: 'notificaciones-store' }
  )
);
