import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Suscripcion, CicloPago } from '@/types';
import { MOCK_SUSCRIPCIONES } from '@/lib/mock-data';
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
        await new Promise(resolve => setTimeout(resolve, 300));

        // Actualizar estados de suscripciones basado en fechas
        const suscripcionesActualizadas = MOCK_SUSCRIPCIONES.map(suscripcion => {
          const consumoPorcentaje = calculateConsumo(suscripcion.fechaInicio, suscripcion.fechaVencimiento);
          const estado = calculateEstado(suscripcion.fechaVencimiento);
          const montoRestante = suscripcion.monto * (1 - consumoPorcentaje / 100);
          const hoy = new Date();
          const diasRetraso = estado === 'vencida'
            ? differenceInDays(hoy, suscripcion.fechaVencimiento)
            : undefined;

          return {
            ...suscripcion,
            consumoPorcentaje,
            estado,
            montoRestante,
            diasRetraso
          };
        });

        set({
          suscripciones: suscripcionesActualizadas,
          isLoading: false
        });
      },

      createSuscripcion: async (suscripcionData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const fechaVencimiento = calculateFechaVencimiento(
          suscripcionData.fechaInicio,
          suscripcionData.cicloPago
        );

        const newSuscripcion: Suscripcion = {
          ...suscripcionData,
          id: `suscripcion-${Date.now()}`,
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
          suscripciones: [...state.suscripciones, newSuscripcion],
          isLoading: false
        }));
      },

      updateSuscripcion: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          suscripciones: state.suscripciones.map((suscripcion) => {
            if (suscripcion.id === id) {
              const updated = { ...suscripcion, ...updates, updatedAt: new Date() };

              // Recalcular consumo si cambió fecha de vencimiento
              if (updates.fechaVencimiento || updates.fechaInicio) {
                updated.consumoPorcentaje = calculateConsumo(
                  updated.fechaInicio,
                  updated.fechaVencimiento
                );
                updated.montoRestante = updated.monto * (1 - updated.consumoPorcentaje / 100);
                updated.estado = calculateEstado(updated.fechaVencimiento);
              }

              return updated;
            }
            return suscripcion;
          }),
          isLoading: false
        }));
      },

      deleteSuscripcion: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          suscripciones: state.suscripciones.filter((suscripcion) => suscripcion.id !== id),
          isLoading: false
        }));
      },

      setSelectedSuscripcion: (suscripcion) => {
        set({ selectedSuscripcion: suscripcion });
      },

      renovarSuscripcion: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          suscripciones: state.suscripciones.map((suscripcion) => {
            if (suscripcion.id === id) {
              const nuevaFechaInicio = new Date();
              const nuevaFechaVencimiento = calculateFechaVencimiento(
                nuevaFechaInicio,
                suscripcion.cicloPago
              );

              return {
                ...suscripcion,
                fechaInicio: nuevaFechaInicio,
                fechaVencimiento: nuevaFechaVencimiento,
                renovaciones: suscripcion.renovaciones + 1,
                consumoPorcentaje: 0,
                montoRestante: suscripcion.monto,
                estado: 'activa' as const,
                notificado: false,
                diasRetraso: undefined,
                updatedAt: new Date()
              };
            }
            return suscripcion;
          }),
          isLoading: false
        }));
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
