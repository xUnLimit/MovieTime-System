import { create } from 'zustand';
import { Venta, VentaFormData, CicloPago } from '@/types';
import { addMonths, addYears } from 'date-fns';

interface VentasState {
  ventas: Venta[];
  loading: boolean;
  fetchVentas: () => Promise<void>;
  createVenta: (data: VentaFormData) => Promise<void>;
  updateVenta: (id: string, data: Partial<Venta>) => Promise<void>;
  deleteVenta: (id: string) => Promise<void>;
  renovarVenta: (id: string) => Promise<void>;
  suspenderVenta: (id: string) => Promise<void>;
  activarVenta: (id: string) => Promise<void>;
}

const calcularFechaVencimiento = (fechaInicio: Date, cicloPago: CicloPago): Date => {
  switch (cicloPago) {
    case 'mensual':
      return addMonths(fechaInicio, 1);
    case 'trimestral':
      return addMonths(fechaInicio, 3);
    case 'anual':
      return addYears(fechaInicio, 1);
    default:
      return addMonths(fechaInicio, 1);
  }
};

export const useVentasStore = create<VentasState>((set, get) => ({
  ventas: [],
  loading: false,

  fetchVentas: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ ventas: [] });
    } catch (error) {
      console.error('Error fetching ventas:', error);
    } finally {
      set({ loading: false });
    }
  },

  createVenta: async (data) => {
    try {
      const fechaVencimiento = calcularFechaVencimiento(data.fechaInicio, data.cicloPago);

      const newVenta: Venta = {
        id: Date.now().toString(),
        clienteId: data.clienteId,
        clienteNombre: '', // TODO: Get from clientes/revendedores store
        revendedorId: data.revendedorId,
        revendedorNombre: '',
        tipo: data.tipo,
        servicioId: data.servicioId,
        servicioNombre: '', // TODO: Get from servicios store
        categoriaId: '', // TODO: Get from servicios store
        categoriaNombre: '',
        correo: '', // TODO: Get from servicios store
        contrasena: '',
        monto: data.monto,
        moneda: data.moneda,
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: '',
        cicloPago: data.cicloPago,
        fechaInicio: data.fechaInicio,
        fechaVencimiento,
        renovaciones: 0,
        consumoPorcentaje: 0,
        montoRestante: data.monto,
        estado: 'activa',
        notificado: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ ventas: [...get().ventas, newVenta] });
    } catch (error) {
      console.error('Error creating venta:', error);
      throw error;
    }
  },

  updateVenta: async (id, data) => {
    try {
      set({
        ventas: get().ventas.map((v) =>
          v.id === id ? { ...v, ...data, updatedAt: new Date() } : v
        ),
      });
    } catch (error) {
      console.error('Error updating venta:', error);
      throw error;
    }
  },

  deleteVenta: async (id) => {
    try {
      set({
        ventas: get().ventas.filter((v) => v.id !== id),
      });
    } catch (error) {
      console.error('Error deleting venta:', error);
      throw error;
    }
  },

  renovarVenta: async (id) => {
    try {
      set({
        ventas: get().ventas.map((v) => {
          if (v.id === id) {
            const nuevaFechaInicio = new Date();
            const nuevaFechaVencimiento = calcularFechaVencimiento(nuevaFechaInicio, v.cicloPago);
            return {
              ...v,
              fechaInicio: nuevaFechaInicio,
              fechaVencimiento: nuevaFechaVencimiento,
              renovaciones: v.renovaciones + 1,
              estado: 'activa' as const,
              consumoPorcentaje: 0,
              montoRestante: v.monto,
              notificado: false,
              updatedAt: new Date(),
            };
          }
          return v;
        }),
      });
    } catch (error) {
      console.error('Error renovando venta:', error);
      throw error;
    }
  },

  suspenderVenta: async (id) => {
    try {
      await get().updateVenta(id, { estado: 'suspendida' });
    } catch (error) {
      console.error('Error suspendiendo venta:', error);
      throw error;
    }
  },

  activarVenta: async (id) => {
    try {
      await get().updateVenta(id, { estado: 'activa' });
    } catch (error) {
      console.error('Error activando venta:', error);
      throw error;
    }
  },
}));
