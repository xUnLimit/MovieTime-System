'use client';

import { useEffect, useRef } from 'react';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { IngresosVsGastosChart } from '@/components/dashboard/IngresosVsGastosChart';
import { RevenueByCategory } from '@/components/dashboard/RevenueByCategory';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CrecimientoUsuarios } from '@/components/dashboard/CrecimientoUsuarios';
import { PronosticoFinanciero } from '@/components/dashboard/PronosticoFinanciero';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { useDashboardStore } from '@/store/dashboardStore';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { esNotificacionVenta, esNotificacionServicio } from '@/types/notificaciones';
import { Button } from '@/components/ui/button';
import { RefreshCw, Bell, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DashboardPage() {
  const { fetchDashboard, recalculateDashboard, isRecalculating } = useDashboardStore();
  const { fetchNotificaciones } = useNotificacionesStore();
  const { resyncPerfilesDisponiblesTotal } = useServiciosStore();
  const { fetchCategorias } = useCategoriasStore();
  const toastShown = useRef(false);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch notifications and show welcome toast on first visit
  useEffect(() => {
    const showWelcomeToast = async () => {
      await fetchNotificaciones();

      // Only show once per session
      if (toastShown.current || sessionStorage.getItem('dashboard-toast-shown')) return;
      toastShown.current = true;
      sessionStorage.setItem('dashboard-toast-shown', '1');

      const store = useNotificacionesStore.getState();
      const unread = store.notificaciones.filter((n) => !n.leida);
      if (unread.length === 0) return;

      const hasRed = unread.some((n) => n.prioridad === 'critica');
      const ventasCount = unread.filter(esNotificacionVenta).length;
      const serviciosCount = unread.filter(esNotificacionServicio).length;

      const isRed = hasRed;
      const parts: string[] = [];
      if (ventasCount > 0) parts.push(`${ventasCount} venta${ventasCount > 1 ? 's' : ''} por vencer`);
      if (serviciosCount > 0) parts.push(`${serviciosCount} servicio${serviciosCount > 1 ? 's' : ''} por pagar`);
      const description = parts.length > 0
        ? `Tienes ${parts.join(' y ')} que requieren tu atención.`
        : `Tienes ${unread.length} alerta${unread.length > 1 ? 's' : ''} importante${unread.length > 1 ? 's' : ''} que requieren tu atención.`;

      toast.custom((t) => (
        <div
          className={[
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg',
            'transition-all',
            isRed
              ? 'border-red-200 bg-background dark:border-red-500/30'
              : 'border-yellow-200 bg-background dark:border-yellow-500/30',
          ].join(' ')}
        >
          {/* Content */}
          <div className="grid gap-1">
            <div className={`text-sm font-semibold flex items-center gap-2 ${isRed ? 'text-red-500' : 'text-yellow-500'}`}>
              <Bell className="h-5 w-5" />
              ¡Notificaciones Pendientes!
            </div>
            <div className="text-sm opacity-90 text-foreground">
              {description}
            </div>
          </div>

          {/* Action button */}
          <Link
            href="/notificaciones"
            onClick={() => toast.dismiss(t)}
            className={[
              'inline-flex h-8 shrink-0 items-center justify-center self-center rounded-md border bg-transparent px-3',
              'text-sm font-medium ring-offset-background transition-colors',
              'hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isRed
                ? 'border-red-200 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900'
                : 'border-yellow-200 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-500/30 dark:text-yellow-300 dark:hover:bg-yellow-900',
            ].join(' ')}
          >
            Ver ahora
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>

          {/* Close button */}
          <button
            type="button"
            onClick={() => toast.dismiss(t)}
            className={[
              'absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity',
              'hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
              isRed
                ? 'text-red-300 hover:text-red-50 focus:ring-red-400 focus:ring-offset-red-600'
                : 'text-yellow-600 hover:text-yellow-800',
            ].join(' ')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ), {
        duration: 8000,
        unstyled: true,
        classNames: {
          toast: '!bg-transparent !border-0 !shadow-none !p-0 !rounded-none !gap-0 !flex-none w-full',
        },
      });
    };

    showWelcomeToast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecalculate = async () => {
    const toastId = toast.loading('Sincronizando sistema...');
    try {
      // 1. Resync contadores de perfiles disponibles en categorías
      await resyncPerfilesDisponiblesTotal();
      // 2. Recalcular métricas del dashboard (rebuild desde Firestore)
      await recalculateDashboard();
      // 3. Refrescar categorías para reflejar los contadores actualizados
      await fetchCategorias(true);
      toast.success('Sistema sincronizado correctamente', { id: toastId });
    } catch {
      toast.error('Error al sincronizar el sistema', { id: toastId });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Vista general de métricas y rendimiento
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRecalculating ? 'Recalculando...' : 'Recalcular métricas'}</span>
            <span className="sm:hidden">{isRecalculating ? '...' : 'Recalcular'}</span>
          </Button>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <DashboardMetrics />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-3">
          <IngresosVsGastosChart />
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <PronosticoFinanciero />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <CrecimientoUsuarios />
        <RevenueByCategory />
        <RecentActivity />
      </div>
    </div>
  );
}
