import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getDashboardStats } from '@/lib/services/dashboardStatsService';
import { getCount, COLLECTIONS, logCacheHit, convertTimestamps } from '@/lib/firebase/firestore';
import type { DashboardStats, DashboardCounts } from '@/types/dashboard';
import type { ActivityLog } from '@/types';

interface DashboardState {
  stats: DashboardStats | null;
  counts: DashboardCounts;
  recentActivity: ActivityLog[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchDashboard: (force?: boolean) => Promise<void>;
}

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const EMPTY_COUNTS: DashboardCounts = {
  ventasActivas: 0,
  totalClientes: 0,
  totalRevendedores: 0,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      stats: null,
      counts: EMPTY_COUNTS,
      recentActivity: [],
      isLoading: false,
      error: null,
      lastFetch: null,

      fetchDashboard: async (force = false) => {
        const { lastFetch } = get();
        if (!force && lastFetch && Date.now() - lastFetch < CACHE_TIMEOUT) {
          logCacheHit('dashboard');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // All fetches in parallel — 7 reads total (1 doc + 6 logs + 3 free counts)
          const [stats, ventasActivas, totalClientes, totalRevendedores, recentActivity] =
            await Promise.all([
              getDashboardStats(),
              getCount(COLLECTIONS.VENTAS, [
                { field: 'estado', operator: '==', value: 'activo' },
              ]),
              getCount(COLLECTIONS.USUARIOS, [
                { field: 'tipo', operator: '==', value: 'cliente' },
              ]),
              getCount(COLLECTIONS.USUARIOS, [
                { field: 'tipo', operator: '==', value: 'revendedor' },
              ]),
              // Direct query: orderBy + limit = exactly 6 reads
              getDocs(
                query(
                  collection(db, COLLECTIONS.ACTIVITY_LOG),
                  orderBy('timestamp', 'desc'),
                  limit(6)
                )
              ).then((snap) =>
                snap.docs.map((d) => ({
                  id: d.id,
                  ...(convertTimestamps(d.data()) as Record<string, unknown>),
                } as ActivityLog))
              ),
            ]);

          set({
            stats,
            counts: { ventasActivas, totalClientes, totalRevendedores },
            recentActivity,
            isLoading: false,
            error: null,
            lastFetch: Date.now(),
          });

          // Seed inicial: si nunca se han guardado los datos fuente del pronóstico,
          // los cargamos una sola vez en background para poblar el campo en Firestore.
          // Desde ahí en adelante, los upserts incrementales los mantienen actualizados.
          if (!stats.ventasPronostico || !stats.serviciosPronostico) {
            Promise.all([
              import('./ventasStore'),
              import('./serviciosStore'),
              import('@/lib/services/dashboardStatsService'),
            ]).then(async ([{ useVentasStore }, { useServiciosStore }, ds]) => {
              await Promise.all([
                useVentasStore.getState().fetchVentas(),
                useServiciosStore.getState().fetchServicios(),
              ]);
              const ventas = useVentasStore.getState().ventas;
              const servicios = useServiciosStore.getState().servicios;

              const ventasP = ventas
                .filter((v) => v.estado !== 'inactivo' && v.fechaFin && v.cicloPago)
                .map((v) => ({
                  id: v.id,
                  fechaFin: v.fechaFin instanceof Date ? v.fechaFin.toISOString() : String(v.fechaFin),
                  cicloPago: v.cicloPago!,
                  precioFinal: v.precioFinal || 0,
                  moneda: v.moneda || 'USD',
                }));

              const serviciosP = servicios
                .filter((s) => s.activo && s.fechaVencimiento && s.cicloPago && s.costoServicio > 0)
                .map((s) => ({
                  id: s.id,
                  fechaVencimiento: s.fechaVencimiento instanceof Date
                    ? s.fechaVencimiento.toISOString()
                    : String(s.fechaVencimiento),
                  cicloPago: s.cicloPago!,
                  costoServicio: s.costoServicio,
                  moneda: s.moneda || 'USD',
                }));

              await Promise.all([
                ds.syncVentasPronostico(ventasP),
                ds.syncServiciosPronostico(serviciosP),
              ]);

              set((state) => ({
                stats: state.stats
                  ? { ...state.stats, ventasPronostico: ventasP, serviciosPronostico: serviciosP }
                  : state.stats,
              }));
            }).catch(() => {});
          }

        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Error al cargar el dashboard';
          console.error('Error fetching dashboard:', error);
          set({ isLoading: false, error: errorMessage });
        }
      },
    }),
    { name: 'dashboard-store' }
  )
);
