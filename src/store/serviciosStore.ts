import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Servicio } from '@/types';
import { MOCK_SERVICIOS } from '@/lib/mock-data';

interface ServiciosState {
  servicios: Servicio[];
  isLoading: boolean;
  selectedServicio: Servicio | null;

  // Actions
  fetchServicios: () => Promise<void>;
  createServicio: (servicio: Omit<Servicio, 'id' | 'createdAt' | 'updatedAt' | 'perfilesOcupados' | 'costoTotal'>) => Promise<void>;
  updateServicio: (id: string, updates: Partial<Servicio>) => Promise<void>;
  deleteServicio: (id: string) => Promise<void>;
  setSelectedServicio: (servicio: Servicio | null) => void;
  getServicio: (id: string) => Servicio | undefined;
  getServiciosByCategoria: (categoriaId: string) => Servicio[];
  getServiciosDisponibles: () => Servicio[];
  updatePerfilOcupado: (id: string, increment: boolean) => void;
}

export const useServiciosStore = create<ServiciosState>()(
  devtools(
    (set, get) => ({
      servicios: [],
      isLoading: false,
      selectedServicio: null,

      fetchServicios: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));
        set({
          servicios: MOCK_SERVICIOS,
          isLoading: false
        });
      },

      createServicio: async (servicioData) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const costoTotal = servicioData.perfilesDisponibles * servicioData.costoPorPerfil;

        const newServicio: Servicio = {
          ...servicioData,
          id: `servicio-${Date.now()}`,
          perfilesOcupados: 0,
          costoTotal,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          servicios: [...state.servicios, newServicio],
          isLoading: false
        }));
      },

      updateServicio: async (id, updates) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          servicios: state.servicios.map((servicio) => {
            if (servicio.id === id) {
              const updated = { ...servicio, ...updates, updatedAt: new Date() };

              // Recalcular costo total si cambiaron perfiles o costo por perfil
              if (updates.perfilesDisponibles !== undefined || updates.costoPorPerfil !== undefined) {
                updated.costoTotal = updated.perfilesDisponibles * updated.costoPorPerfil;
              }

              return updated;
            }
            return servicio;
          }),
          isLoading: false
        }));
      },

      deleteServicio: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        set((state) => ({
          servicios: state.servicios.filter((servicio) => servicio.id !== id),
          isLoading: false
        }));
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

      updatePerfilOcupado: (id, increment) => {
        set((state) => ({
          servicios: state.servicios.map((servicio) => {
            if (servicio.id === id) {
              const newOcupados = increment
                ? Math.min(servicio.perfilesOcupados + 1, servicio.perfilesDisponibles)
                : Math.max(servicio.perfilesOcupados - 1, 0);

              return {
                ...servicio,
                perfilesOcupados: newOcupados,
                updatedAt: new Date()
              };
            }
            return servicio;
          })
        }));
      }
    }),
    { name: 'servicios-store' }
  )
);
