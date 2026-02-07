import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Servicio, MetodoPago } from '@/types';
import { getAll, getById, getCount, create as createDoc, update, remove, COLLECTIONS, logCacheHit } from '@/lib/firebase/firestore';
import { doc as firestoreDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  lastCountsFetch: number | null; // Cache para fetchCounts
  selectedServicio: Servicio | null;

  // Counts for metrics (free queries)
  totalServicios: number;
  serviciosActivos: number;
  totalCategoriasActivas: number;

  // Actions
  fetchServicios: (force?: boolean) => Promise<void>;
  fetchCounts: (force?: boolean) => Promise<void>;
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
      lastCountsFetch: null,
      selectedServicio: null,
      totalServicios: 0,
      serviciosActivos: 0,
      totalCategoriasActivas: 0,

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

      fetchCounts: async (force = false) => {
        const { lastCountsFetch } = get();

        // Cache de 5 minutos
        if (!force && lastCountsFetch && (Date.now() - lastCountsFetch) < CACHE_TIMEOUT) {
          logCacheHit('servicios-counts');
          return;
        }

        try {
          const [totalServicios, serviciosActivos, totalCategoriasActivas] = await Promise.all([
            getCount(COLLECTIONS.SERVICIOS, []),
            getCount(COLLECTIONS.SERVICIOS, [{ field: 'activo', operator: '==', value: true }]),
            getCount(COLLECTIONS.CATEGORIAS, [{ field: 'activo', operator: '==', value: true }]),
          ]);
          set({
            totalServicios,
            serviciosActivos,
            totalCategoriasActivas,
            lastCountsFetch: Date.now()
          });
        } catch (error) {
          console.error('Error fetching counts:', error);
          set({ totalServicios: 0, serviciosActivos: 0, totalCategoriasActivas: 0 });
        }
      },

      createServicio: async (servicioData) => {
        try {
          // Obtener método de pago completo para denormalizar
          let metodoPagoNombre: string | undefined;
          let moneda: string | undefined;
          if (servicioData.metodoPagoId) {
            const metodoPago = await getById<MetodoPago>(COLLECTIONS.METODOS_PAGO, servicioData.metodoPagoId);
            metodoPagoNombre = metodoPago?.nombre;
            moneda = metodoPago?.moneda;
          }

          const id = await createDoc(COLLECTIONS.SERVICIOS, {
            ...servicioData,
            metodoPagoNombre,  // Denormalizado
            moneda,            // Denormalizado
            perfilesOcupados: 0,
            gastosTotal: servicioData.costoServicio ?? 0,
            activo: true,
          });

          // Create initial PagoServicio record
          await createDoc(COLLECTIONS.PAGOS_SERVICIO, {
            servicioId: id,
            metodoPagoId: servicioData.metodoPagoId,
            metodoPagoNombre,  // Denormalizado
            moneda,
            isPagoInicial: true,
            fecha: new Date(),
            descripcion: 'Pago inicial',
            cicloPago: servicioData.cicloPago ?? undefined,
            fechaInicio: servicioData.fechaInicio ?? new Date(),
            fechaVencimiento: servicioData.fechaVencimiento ?? new Date(),
            monto: servicioData.costoServicio ?? 0,
          });

          // Actualizar contadores de la categoría
          const categoriaRef = firestoreDoc(db, COLLECTIONS.CATEGORIAS, servicioData.categoriaId);
          await updateDoc(categoriaRef, {
            totalServicios: increment(1),
            serviciosActivos: increment(1),
            perfilesDisponiblesTotal: increment(servicioData.perfilesDisponibles ?? 0),
            gastosTotal: increment(servicioData.costoServicio ?? 0),
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
          // Obtener el servicio directamente de Firestore (no del store local)
          const servicio = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
          if (!servicio) throw new Error('Servicio not found');

          let finalUpdates = { ...updates };

          // Si cambia metodoPagoId, actualizar campos denormalizados
          if (updates.metodoPagoId !== undefined) {
            const metodoPago = updates.metodoPagoId
              ? await getById<MetodoPago>(COLLECTIONS.METODOS_PAGO, updates.metodoPagoId)
              : null;

            finalUpdates = {
              ...finalUpdates,
              metodoPagoNombre: metodoPago?.nombre,
              moneda: metodoPago?.moneda,
            };
          }

          await update(COLLECTIONS.SERVICIOS, id, finalUpdates);

          // Si se cambia el estado activo, actualizar contador de categoría
          if (updates.activo !== undefined && updates.activo !== servicio.activo) {
            const categoriaRef = firestoreDoc(db, COLLECTIONS.CATEGORIAS, servicio.categoriaId);
            const delta = updates.activo ? 1 : -1;
            await updateDoc(categoriaRef, {
              serviciosActivos: increment(delta),
            });
          }

          set((state) => ({
            servicios: state.servicios.map((s) =>
              s.id === id
                ? { ...s, ...finalUpdates, updatedAt: new Date() }
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
        try {
          // Obtener el servicio directamente de Firestore (no del store local)
          const servicio = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
          if (!servicio) throw new Error('Servicio not found');

          // Optimistic update del store local (si existe)
          const currentServicios = get().servicios;
          set((state) => ({
            servicios: state.servicios.filter((s) => s.id !== id)
          }));

          // Eliminar de Firestore
          await remove(COLLECTIONS.SERVICIOS, id);

          // Decrementar contadores de la categoría
          const categoriaRef = firestoreDoc(db, COLLECTIONS.CATEGORIAS, servicio.categoriaId);
          const perfilesDisponibles = Math.max((servicio.perfilesDisponibles || 0) - (servicio.perfilesOcupados || 0), 0);
          await updateDoc(categoriaRef, {
            totalServicios: increment(-1),
            serviciosActivos: increment(servicio.activo ? -1 : 0),
            perfilesDisponiblesTotal: increment(-perfilesDisponibles),
            gastosTotal: increment(-(servicio.gastosTotal ?? 0)),
          });

          // Notificar a otras páginas que se eliminó un servicio
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('servicio-deleted', Date.now().toString());
            window.dispatchEvent(new Event('servicio-deleted'));
          }

          set({ error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar servicio';
          set({ error: errorMessage });
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

        try {
          // Obtener servicio de Firebase si no está en el store
          let servicio = get().servicios.find((s) => s.id === id);

          if (!servicio) {
            // Si no está en el store, obtenerlo de Firebase
            const servicioDoc = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
            if (!servicioDoc) {
              console.error('Servicio not found in Firebase for updatePerfilOcupado');
              return;
            }
            servicio = servicioDoc;
          }

          // Actualizar en el store local si existe
          if (get().servicios.find((s) => s.id === id)) {
            set((state) => ({
              servicios: state.servicios.map((s) =>
                s.id === id
                  ? { ...s, perfilesOcupados: Math.max(0, s.perfilesOcupados + delta), updatedAt: new Date() }
                  : s
              ),
            }));
          }

          // Actualizar en Firebase
          const docRef = firestoreDoc(db, COLLECTIONS.SERVICIOS, id);
          await updateDoc(docRef, {
            perfilesOcupados: increment(delta),
          });

          // Actualizar perfilesDisponiblesTotal de la categoría (inverso del delta)
          const categoriaRef = firestoreDoc(db, COLLECTIONS.CATEGORIAS, servicio.categoriaId);
          await updateDoc(categoriaRef, {
            perfilesDisponiblesTotal: increment(-delta), // Si ocupamos +1, disponibles -1
          });
        } catch (error) {
          console.error('Error updating perfil ocupado:', error);
          // Rollback local si existe en el store
          if (get().servicios.find((s) => s.id === id)) {
            set((state) => ({
              servicios: state.servicios.map((s) =>
                s.id === id ? { ...s, perfilesOcupados: Math.max(0, s.perfilesOcupados - delta) } : s
              ),
            }));
          }
        }
      }
    }),
    { name: 'servicios-store' }
  )
);
