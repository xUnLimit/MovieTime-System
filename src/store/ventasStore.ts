import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Venta, CicloPago } from '@/types';
import { MOCK_VENTAS } from '@/lib/mock-data';
import { addMonths, differenceInDays } from 'date-fns';

interface VentasState {
  ventas: Venta[];
  isLoading: boolean;
  selectedVenta: Venta | null;

  // Actions
  fetchVentas: () => Promise<void>;
  createVenta: (venta: Omit<Venta, 'id' | 'createdAt' | 'updatedAt' | 'fechaVencimiento' | 'renovaciones' | 'consumoPorcentaje' | 'montoRestante' | 'estado' | 'notificado'>) => Promise<void>;
  updateVenta: (id: string, updates: Partial<Venta>) => Promise<void>;
  deleteVenta: (id: string) => Promise<void>;
  setSelectedVenta: (venta: Venta | null) => void;
  renovarVenta: (id: string) => Promise<void>;
  suspenderVenta: (id: string) => Promise<void>;
  reactivarVenta: (id: string) => Promise<void>;
  getVenta: (id: string) => Venta | undefined;
  getVentasByCliente: (clienteId: string) => Venta[];
  getVentasByRevendedor: (revendedorId: string) => Venta[];
  getVentasProximasVencer: (dias: number) => Venta[];
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

export const useVentasStore = create<VentasState>()(
  devtools(
    (set, get) => ({
      ventas: [],
      isLoading: false,
      selectedVenta: null,

      fetchVentas: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        // Actualizar estados de ventas basado en fechas
        const ventasActualizadas = MOCK_VENTAS.map(venta => {
          const consumoPorcentaje = calculateConsumo(venta.fechaInicio, venta.fechaVencimiento);
          const estado = calculateEstado(venta.fechaVencimiento);
          const montoRestante = venta.monto * (1 - consumoPorcentaje / 100);
          const hoy = new Date();
          const diasRetraso = estado === 'vencida'
            ? differenceInDays(hoy, venta.fechaVencimiento)
            : undefined;

          return {
            ...venta,
            consumoPorcentaje,
            estado,
            montoRestante,
            diasRetraso
          };
        });

        set({
          ventas: ventasActualizadas,
          isLoading: false
        });
      },

      createVenta: async (ventaData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const fechaVencimiento = calculateFechaVencimiento(
          ventaData.fechaInicio,
          ventaData.cicloPago
        );

        const newVenta: Venta = {
          ...ventaData,
          id: `venta-${Date.now()}`,
          fechaVencimiento,
          renovaciones: 0,
          consumoPorcentaje: 0,
          montoRestante: ventaData.monto,
          estado: 'activa',
          notificado: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          ventas: [...state.ventas, newVenta],
          isLoading: false
        }));
      },

      updateVenta: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          ventas: state.ventas.map((venta) => {
            if (venta.id === id) {
              const updated = { ...venta, ...updates, updatedAt: new Date() };

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
            return venta;
          }),
          isLoading: false
        }));
      },

      deleteVenta: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          ventas: state.ventas.filter((venta) => venta.id !== id),
          isLoading: false
        }));
      },

      setSelectedVenta: (venta) => {
        set({ selectedVenta: venta });
      },

      renovarVenta: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          ventas: state.ventas.map((venta) => {
            if (venta.id === id) {
              const nuevaFechaInicio = new Date();
              const nuevaFechaVencimiento = calculateFechaVencimiento(
                nuevaFechaInicio,
                venta.cicloPago
              );

              return {
                ...venta,
                fechaInicio: nuevaFechaInicio,
                fechaVencimiento: nuevaFechaVencimiento,
                renovaciones: venta.renovaciones + 1,
                consumoPorcentaje: 0,
                montoRestante: venta.monto,
                estado: 'activa' as const,
                notificado: false,
                diasRetraso: undefined,
                updatedAt: new Date()
              };
            }
            return venta;
          }),
          isLoading: false
        }));
      },

      suspenderVenta: async (id) => {
        await get().updateVenta(id, { estado: 'suspendida' });
      },

      reactivarVenta: async (id) => {
        await get().updateVenta(id, { estado: 'activa' });
      },

      getVenta: (id) => {
        return get().ventas.find((venta) => venta.id === id);
      },

      getVentasByCliente: (clienteId) => {
        return get().ventas.filter((venta) => venta.clienteId === clienteId);
      },

      getVentasByRevendedor: (revendedorId) => {
        return get().ventas.filter((venta) => venta.revendedorId === revendedorId);
      },

      getVentasProximasVencer: (dias) => {
        const hoy = new Date();
        return get().ventas.filter((venta) => {
          if (venta.estado !== 'activa') return false;
          const diasRestantes = differenceInDays(venta.fechaVencimiento, hoy);
          return diasRestantes > 0 && diasRestantes <= dias;
        });
      }
    }),
    { name: 'ventas-store' }
  )
);
