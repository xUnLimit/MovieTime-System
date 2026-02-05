import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Servicio } from '@/types';
import { getAll, getById, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';
import { doc as firestoreDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  selectedServicio: Servicio | null;

  // Actions
  fetchServicios: (force?: boolean) => Promise<void>;
  createServicio: (servicio: Omit<Servicio, 'id' | 'createdAt' | 'updatedAt' | 'perfilesOcupados'>) => Promise<void>;
  updateServicio: (id: string, updates: Partial<Servicio>) => Promise<void>;
  deleteServicio: (id: string) => Promise<void>;
  setSelectedServicio: (servicio: Servicio | null) => void;
  getServicio: (id: string) => Servicio | undefined;
  getServiciosByCategoria: (categoriaId: string) => Servicio[];
  getServiciosDisponibles: () => Servicio[];
  updatePerfilOcupado: (id: string, shouldIncrement: boolean) => Promise<void>;
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

export const useServiciosStore = create<ServiciosState>()(
  devtools(
    (set, get) => ({
      servicios: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      selectedServicio: null,

      fetchServicios: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && (Date.now() - lastFetch) < CACHE_TIMEOUT) {
          logCacheHit(COLLECTIONS.SERVICIOS);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const servicios = await getAll<Servicio>(COLLECTIONS.SERVICIOS);
          set({ servicios, isLoading: false, error: null, lastFetch: Date.now() });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar servicios';
          console.error('Error fetching servicios:', error);
          set({ servicios: [], isLoading: false, error: errorMessage });
        }
      },

      createServicio: async (servicioData) => {
        try {
          const id = await createDoc(COLLECTIONS.SERVICIOS, {
            ...servicioData,
            perfilesOcupados: 0,
            activo: true,
          });

          let moneda: string | undefined;
          if (servicioData.metodoPagoId) {
            const metodoPago = await getById<Record<string, unknown>>(COLLECTIONS.METODOS_PAGO, servicioData.metodoPagoId);
            moneda = (metodoPago?.moneda as string) ?? undefined;
          }

          // Create initial PagoServicio record
          await createDoc(COLLECTIONS.PAGOS_SERVICIO, {
            servicioId: id,
            metodoPagoId: servicioData.metodoPagoId,
            moneda,
            isPagoInicial: true,
            fecha: new Date(),
            descripcion: 'Pago inicial',
            cicloPago: servicioData.cicloPago ?? undefined,
            fechaInicio: servicioData.fechaInicio ?? new Date(),
            fechaVencimiento: servicioData.fechaVencimiento ?? new Date(),
            monto: servicioData.costoServicio ?? 0,
          });

          const newServicio: Servicio = {
            ...servicioData,
            id,
            perfilesOcupados: 0,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Servicio;

          set((state) => ({
            servicios: [...state.servicios, newServicio],
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al crear servicio';
          set({ error: errorMessage });
          console.error('Error creating servicio:', error);
          throw error;
        }
      },

      updateServicio: async (id, updates) => {
        try {
          const servicio = get().servicios.find((s) => s.id === id);
          if (!servicio) throw new Error('Servicio not found');

          await update(COLLECTIONS.SERVICIOS, id, updates);

          set((state) => ({
            servicios: state.servicios.map((s) =>
              s.id === id
                ? { ...s, ...updates, updatedAt: new Date() }
                : s
            ),
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al actualizar servicio';
          set({ error: errorMessage });
          console.error('Error updating servicio:', error);
          throw error;
        }
      },

      deleteServicio: async (id) => {
        const currentServicios = get().servicios;

        // Optimistic update
        set((state) => ({
          servicios: state.servicios.filter((servicio) => servicio.id !== id)
        }));

        try {
          await remove(COLLECTIONS.SERVICIOS, id);
          set({ error: null });
        } catch (error) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar servicio';
          set({ servicios: currentServicios, error: errorMessage });
          console.error('Error deleting servicio:', error);
          throw error;
        }
      },

      setSelectedServicio: (servicio) => {
        set({ selectedServicio: servicio });
      },

      getServicio: (id) => {
        return get().servicios.find((servicio) => servicio.id === id);
      },

      getServiciosByCategoria: (categoriaId) => {
        return get().servicios.filter(
          (servicio) => servicio.categoriaId === categoriaId && servicio.activo
        );
      },

      getServiciosDisponibles: () => {
        return get().servicios.filter(
          (servicio) =>
            servicio.activo &&
            servicio.perfilesOcupados < servicio.perfilesDisponibles
        );
      },

      updatePerfilOcupado: async (id, shouldIncrement) => {
        const delta = shouldIncrement ? 1 : -1;
        const prevOcupados = get().servicios.find((s) => s.id === id)?.perfilesOcupados ?? 0;

        set((state) => ({
          servicios: state.servicios.map((s) =>
            s.id === id
              ? { ...s, perfilesOcupados: Math.max(0, s.perfilesOcupados + delta), updatedAt: new Date() }
              : s
          ),
        }));

        try {
          const docRef = firestoreDoc(db, COLLECTIONS.SERVICIOS, id);
          await updateDoc(docRef, {
            perfilesOcupados: increment(delta),
          });
        } catch (error) {
          console.error('Error updating perfil ocupado:', error);
          set((state) => ({
            servicios: state.servicios.map((s) =>
              s.id === id ? { ...s, perfilesOcupados: prevOcupados } : s
            ),
          }));
        }
      }
    }),
    { name: 'servicios-store' }
  )
);
