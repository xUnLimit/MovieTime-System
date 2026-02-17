'use client';

import { useEffect } from 'react';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { IngresosVsGastosChart } from '@/components/dashboard/IngresosVsGastosChart';
import { RevenueByCategory } from '@/components/dashboard/RevenueByCategory';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CrecimientoUsuarios } from '@/components/dashboard/CrecimientoUsuarios';
import { PronosticoFinanciero } from '@/components/dashboard/PronosticoFinanciero';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { fetchDashboard, recalculateDashboard, isRecalculating } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRecalculate = async () => {
    const toastId = toast.loading('Recalculando métricas desde Firestore...');
    try {
      await recalculateDashboard();
      toast.success('Métricas actualizadas correctamente', { id: toastId });
    } catch {
      toast.error('Error al recalcular las métricas', { id: toastId });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Vista general de métricas y rendimiento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculando...' : 'Recalcular métricas'}
          </Button>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <DashboardMetrics />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <IngresosVsGastosChart />
        </div>
        <PronosticoFinanciero />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <CrecimientoUsuarios />
        <RevenueByCategory />
        <RecentActivity />
      </div>
    </div>
  );
}
