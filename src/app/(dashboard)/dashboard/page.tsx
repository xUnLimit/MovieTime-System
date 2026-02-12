'use client';

import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { IngresosVsGastosChart } from '@/components/dashboard/IngresosVsGastosChart';
import { RevenueByCategory } from '@/components/dashboard/RevenueByCategory';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CrecimientoUsuarios } from '@/components/dashboard/CrecimientoUsuarios';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationBell } from '@/components/notificaciones/NotificationBell';

export default function DashboardPage() {
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
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <DashboardMetrics />

      <IngresosVsGastosChart />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <CrecimientoUsuarios />
        <RevenueByCategory />
        <RecentActivity />
      </div>
    </div>
  );
}
