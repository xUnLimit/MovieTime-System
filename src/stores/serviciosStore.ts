import { create } from 'zustand';
import { Servicio, ServicioFormData } from '@/types';

interface ServiciosState {
  servicios: Servicio[];
  loading: boolean;
  fetchServicios: () => Promise<void>;
  createServicio: (data: ServicioFormData) => Promise<void>;
  updateServicio: (id: string, data: Partial<Servicio>) => Promise<void>;
  deleteServicio: (id: string) => Promise<void>;
}

export const useServiciosStore = create<ServiciosState>((set, get) => ({
  servicios: [],
  loading: false,

  fetchServicios: async () => {
    set({ loading: true });
    try {
      // TODO: Implement API call
      set({ servicios: [] });
    } catch (error) {
      console.error('Error fetching servicios:', error);
    } finally {
      set({ loading: false });
    }
  },

  createServicio: async (data) => {
    try {
      const costoTotal = data.tipo === 'individual'
        ? data.costoPorPerfil
        : data.costoPorPerfil * data.perfilesDisponibles;

      const newServicio: Servicio = {
        id: Date.now().toString(),
        categoriaId: data.categoriaId,
        categoriaNombre: '', // TODO: Get from categorias store
        nombre: data.nombre,
        tipo: data.tipo,
        correo: data.correo,
        contrasena: data.contrasena,
        perfilesDisponibles: data.perfilesDisponibles,
        perfilesOcupados: 0,
        costoPorPerfil: data.costoPorPerfil,
        costoTotal,
        activo: true,
        renovacionAutomatica: data.renovacionAutomatica,
        fechaRenovacion: data.fechaRenovacion,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user-id',
      };

      set({ servicios: [...get().servicios, newServicio] });
    } catch (error) {
      console.error('Error creating servicio:', error);
      throw error;
    }
  },

  updateServicio: async (id, data) => {
    try {
      set({
        servicios: get().servicios.map((s) => {
          if (s.id === id) {
            const updated = { ...s, ...data, updatedAt: new Date() };
            // Recalculate costoTotal if needed
            if (data.costoPorPerfil || data.perfilesDisponibles) {
              updated.costoTotal = updated.tipo === 'individual'
                ? updated.costoPorPerfil
                : updated.costoPorPerfil * updated.perfilesDisponibles;
            }
            return updated;
          }
          return s;
        }),
      });
    } catch (error) {
      console.error('Error updating servicio:', error);
      throw error;
    }
  },

  deleteServicio: async (id) => {
    try {
      set({
        servicios: get().servicios.filter((s) => s.id !== id),
      });
    } catch (error) {
      console.error('Error deleting servicio:', error);
      throw error;
    }
  },
}));
