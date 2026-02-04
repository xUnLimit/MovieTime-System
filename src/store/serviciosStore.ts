import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Servicio } from '@/types';
import { getAll, getById, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp, doc as firestoreDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  selectedServicio: Servicio | null;

  // Actions
  fetchServicios: () => Promise<void>;
  createServicio: (servicio: Omit<Servicio, 'id' | 'createdAt' | 'updatedAt' | 'perfilesOcupados'>) => Promise<void>;
  updateServicio: (id: string, updates: Partial<Servicio>) => Promise<void>;
  deleteServicio: (id: string) => Promise<void>;
  setSelectedServicio: (servicio: Servicio | null) => void;
  getServicio: (id: string) => Servicio | undefined;
  getServiciosByCategoria: (categoriaId: string) => Servicio[];
  getServiciosDisponibles: () => Servicio[];
  updatePerfilOcupado: (id: string, shouldIncrement: boolean) => Promise<void>;
}

export const useServiciosStore = create<ServiciosState>()(
  devtools(
    (set, get) => ({
      servicios: [],
      isLoading: false,
      selectedServicio: null,

      fetchServicios: async () => {
        set({ isLoading: true });
        try {
          const data = await getAll<any>(COLLECTIONS.SERVICIOS);
          const servicios: Servicio[] = data.map(item => {
            return {
              ...item,
              fechaInicio: item.fechaInicio ? timestampToDate(item.fechaInicio) : undefined,
              fechaVencimiento: item.fechaVencimiento ? timestampToDate(item.fechaVencimiento) : undefined,
              createdAt: timestampToDate(item.createdAt),
              updatedAt: timestampToDate(item.updatedAt)
            };
          });

          set({ servicios, isLoading: false });
        } catch (error) {
          console.error('Error fetching servicios:', error);
          set({ servicios: [], isLoading: false });
        }
      },

      createServicio: async (servicioData) => {
        try {
          const pagoInicialFechaInicio = servicioData.fechaInicio;
          const pagoInicialFechaVencimiento = servicioData.fechaVencimiento;
          const pagoInicialMonto = servicioData.costoServicio;
          const pagoInicialCicloPago = servicioData.cicloPago;
          const id = await createDoc(COLLECTIONS.SERVICIOS, {
            ...servicioData,
            perfilesOcupados: 0,
            activo: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          let moneda: string | undefined;
          if (servicioData.metodoPagoId) {
            const metodoPago = await getById<Record<string, unknown>>(COLLECTIONS.METODOS_PAGO, servicioData.metodoPagoId);
            moneda = (metodoPago?.moneda as string) ?? undefined;
          }

          await createDoc(COLLECTIONS.PAGOS_SERVICIO, {
            servicioId: id,
            metodoPagoId: servicioData.metodoPagoId,
            moneda,
            isPagoInicial: true,
            fecha: new Date(),
            descripcion: 'Pago inicial',
            cicloPago: pagoInicialCicloPago ?? undefined,
            fechaInicio: pagoInicialFechaInicio ?? new Date(),
            fechaVencimiento: pagoInicialFechaVencimiento ?? new Date(),
            monto: pagoInicialMonto ?? 0,
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
            servicios: [...state.servicios, newServicio]
          }));
        } catch (error) {
          console.error('Error creating servicio:', error);
          throw error;
        }
      },

      updateServicio: async (id, updates) => {
        try {
          const servicio = get().servicios.find((s) => s.id === id);
          if (!servicio) throw new Error('Servicio not found');

          const updated: Servicio = {
            ...servicio,
            ...updates,
            updatedAt: new Date(),
          };

          const payload: Record<string, unknown> = { ...updates, updatedAt: Timestamp.now() };

          await update(COLLECTIONS.SERVICIOS, id, payload);

          set((state) => ({
            servicios: state.servicios.map((s) =>
              s.id === id ? updated : s
            )
          }));
        } catch (error) {
          console.error('Error updating servicio:', error);
          throw error;
        }
      },

      deleteServicio: async (id) => {
        try {
          await remove(COLLECTIONS.SERVICIOS, id);

          set((state) => ({
            servicios: state.servicios.filter((servicio) => servicio.id !== id)
          }));
        } catch (error) {
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
