import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Suscripcion, CicloPago } from '@/types';
import { getAll, create as createDoc, update, remove, COLLECTIONS, timestampToDate } from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { addMonths, differenceInDays } from 'date-fns';

interface SuscripcionesState {
  suscripciones: Suscripcion[];
  isLoading: boolean;
  selectedSuscripcion: Suscripcion | null;

  // Actions
  fetchSuscripciones: () => Promise<void>;
  createSuscripcion: (suscripcion: Omit<Suscripcion, 'id' | 'createdAt' | 'updatedAt' | 'fechaVencimiento' | 'renovaciones' | 'consumoPorcentaje' | 'montoRestante' | 'estado' | 'notificado'>) => Promise<void>;
  updateSuscripcion: (id: string, updates: Partial<Suscripcion>) => Promise<void>;
  deleteSuscripcion: (id: string) => Promise<void>;
  setSelectedSuscripcion: (suscripcion: Suscripcion | null) => void;
  renovarSuscripcion: (id: string) => Promise<void>;
  suspenderSuscripcion: (id: string) => Promise<void>;
  reactivarSuscripcion: (id: string) => Promise<void>;
  getSuscripcion: (id: string) => Suscripcion | undefined;
  getSuscripcionesByCliente: (clienteId: string) => Suscripcion[];
  getSuscripcionesByRevendedor: (revendedorId: string) => Suscripcion[];
  getSuscripcionesProximasVencer: (dias: number) => Suscripcion[];
}

function calculateFechaVencimiento(fechaInicio: Date, cicloPago: CicloPago): Date {
  const meses = cicloPago === 'mensual' ? 1 : cicloPago === 'trimestral' ? 3 : 12;
  return addMonths(fechaInicio, meses);
}

function calculateConsumo(fechaInicio: Date, fechaVencimiento: Date): number {
  const hoy = new Date();
  const totalDias = differenceInDays(fechaVencimiento, fechaInicio);
  const diasTranscurridos = differenceInDays(hoy, fechaInicio);

  if (diasTranscurridos <= 0) return 0;
  if (diasTranscurridos >= totalDias) return 100;

  return Math.round((diasTranscurridos / totalDias) * 100);
}

function calculateEstado(fechaVencimiento: Date): 'activa' | 'vencida' {
  const hoy = new Date();
  return hoy > fechaVencimiento ? 'vencida' : 'activa';
}

export const useSuscripcionesStore = create<SuscripcionesState>()(
  devtools(
    (set, get) => ({
      suscripciones: [],
      isLoading: false,
      selectedSuscripcion: null,

      fetchSuscripciones: async () => {
        set({ isLoading: true });
        try {
          const data = await getAll<any>(COLLECTIONS.SUSCRIPCIONES);

          // Convertir timestamps y actualizar estados basado en fechas
          const suscripcionesActualizadas = data.map(item => {
            const fechaInicio = timestampToDate(item.fechaInicio);
            const fechaVencimiento = timestampToDate(item.fechaVencimiento);
            const createdAt = timestampToDate(item.createdAt);
            const updatedAt = timestampToDate(item.updatedAt);

            const consumoPorcentaje = calculateConsumo(fechaInicio, fechaVencimiento);
            const estado = calculateEstado(fechaVencimiento);
            const montoRestante = item.monto * (1 - consumoPorcentaje / 100);
            const hoy = new Date();
            const diasRetraso = estado === 'vencida'
              ? differenceInDays(hoy, fechaVencimiento)
              : undefined;

            return {
              ...item,
              fechaInicio,
              fechaVencimiento,
              createdAt,
              updatedAt,
              consumoPorcentaje,
              estado,
              montoRestante,
              diasRetraso
            };
          });

          set({ suscripciones: suscripcionesActualizadas, isLoading: false });
        } catch (error) {
          console.error('Error fetching suscripciones:', error);
          set({ suscripciones: [], isLoading: false });
        }
      },

      createSuscripcion: async (suscripcionData) => {
        try {
          const fechaVencimiento = calculateFechaVencimiento(
            suscripcionData.fechaInicio,
            suscripcionData.cicloPago
          );

          const id = await createDoc(COLLECTIONS.SUSCRIPCIONES, {
            ...suscripcionData,
            fechaInicio: Timestamp.fromDate(suscripcionData.fechaInicio),
            fechaVencimiento: Timestamp.fromDate(fechaVencimiento),
            renovaciones: 0,
            consumoPorcentaje: 0,
            montoRestante: suscripcionData.monto,
            estado: 'activa',
            notificado: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          const newSuscripcion: Suscripcion = {
            ...suscripcionData,
            id,
            fechaVencimiento,
            renovaciones: 0,
            consumoPorcentaje: 0,
            montoRestante: suscripcionData.monto,
            estado: 'activa',
            notificado: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state) => ({
            suscripciones: [...state.suscripciones, newSuscripcion]
          }));
        } catch (error) {
          console.error('Error creating suscripcion:', error);
          throw error;
        }
      },

      updateSuscripcion: async (id, updates) => {
        try {
          const suscripcion = get().suscripciones.find((s) => s.id === id);
          if (!suscripcion) throw new Error('Suscripcion not found');

          const updated = { ...suscripcion, ...updates };

          // Recalcular consumo si cambió fecha de vencimiento
          if (updates.fechaVencimiento || updates.fechaInicio) {
            updated.consumoPorcentaje = calculateConsumo(
              updated.fechaInicio,
              updated.fechaVencimiento
            );
            updated.montoRestante = updated.monto * (1 - updated.consumoPorcentaje / 100);
            updated.estado = calculateEstado(updated.fechaVencimiento);
          }

          // Preparar datos para Firebase (convertir fechas a Timestamps si existen)
          const firebaseUpdates: any = { ...updates, updatedAt: Timestamp.now() };
          if (updates.fechaInicio) {
            firebaseUpdates.fechaInicio = Timestamp.fromDate(updates.fechaInicio);
          }
          if (updates.fechaVencimiento) {
            firebaseUpdates.fechaVencimiento = Timestamp.fromDate(updates.fechaVencimiento);
          }
          // Incluir campos recalculados
          firebaseUpdates.consumoPorcentaje = updated.consumoPorcentaje;
          firebaseUpdates.montoRestante = updated.montoRestante;
          firebaseUpdates.estado = updated.estado;

          await update(COLLECTIONS.SUSCRIPCIONES, id, firebaseUpdates);

          set((state) => ({
            suscripciones: state.suscripciones.map((s) =>
              s.id === id ? { ...updated, updatedAt: new Date() } : s
            )
          }));
        } catch (error) {
          console.error('Error updating suscripcion:', error);
          throw error;
        }
      },

      deleteSuscripcion: async (id) => {
        try {
          await remove(COLLECTIONS.SUSCRIPCIONES, id);

          set((state) => ({
            suscripciones: state.suscripciones.filter((suscripcion) => suscripcion.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting suscripcion:', error);
          throw error;
        }
      },

      setSelectedSuscripcion: (suscripcion) => {
        set({ selectedSuscripcion: suscripcion });
      },

      renovarSuscripcion: async (id) => {
        try {
          const suscripcion = get().suscripciones.find((s) => s.id === id);
          if (!suscripcion) throw new Error('Suscripcion not found');

          const nuevaFechaInicio = new Date();
          const nuevaFechaVencimiento = calculateFechaVencimiento(
            nuevaFechaInicio,
            suscripcion.cicloPago
          );

          await update(COLLECTIONS.SUSCRIPCIONES, id, {
            fechaInicio: Timestamp.fromDate(nuevaFechaInicio),
            fechaVencimiento: Timestamp.fromDate(nuevaFechaVencimiento),
            renovaciones: suscripcion.renovaciones + 1,
            consumoPorcentaje: 0,
            montoRestante: suscripcion.monto,
            estado: 'activa',
            notificado: false,
            diasRetraso: null,
            updatedAt: Timestamp.now()
          });

          set((state) => ({
            suscripciones: state.suscripciones.map((s) => {
              if (s.id === id) {
                return {
                  ...s,
                  fechaInicio: nuevaFechaInicio,
                  fechaVencimiento: nuevaFechaVencimiento,
                  renovaciones: s.renovaciones + 1,
                  consumoPorcentaje: 0,
                  montoRestante: s.monto,
                  estado: 'activa' as const,
                  notificado: false,
                  diasRetraso: undefined,
                  updatedAt: new Date()
                };
              }
              return s;
            })
          }));
        } catch (error) {
          console.error('Error renovating suscripcion:', error);
          throw error;
        }
      },

      suspenderSuscripcion: async (id) => {
        await get().updateSuscripcion(id, { estado: 'suspendida' });
      },

      reactivarSuscripcion: async (id) => {
        await get().updateSuscripcion(id, { estado: 'activa' });
      },

      getSuscripcion: (id) => {
        return get().suscripciones.find((suscripcion) => suscripcion.id === id);
      },

      getSuscripcionesByCliente: (clienteId) => {
        return get().suscripciones.filter((suscripcion) => suscripcion.clienteId === clienteId);
      },

      getSuscripcionesByRevendedor: (revendedorId) => {
        return get().suscripciones.filter((suscripcion) => suscripcion.revendedorId === revendedorId);
      },

      getSuscripcionesProximasVencer: (dias) => {
        const hoy = new Date();
        return get().suscripciones.filter((suscripcion) => {
          if (suscripcion.estado !== 'activa') return false;
          const diasRestantes = differenceInDays(suscripcion.fechaVencimiento, hoy);
          return diasRestantes > 0 && diasRestantes <= dias;
        });
      }
    }),
    { name: 'suscripciones-store' }
  )
);
