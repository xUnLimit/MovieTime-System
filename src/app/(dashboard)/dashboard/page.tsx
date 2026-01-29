'use client';

import { useEffect, useState } from 'react';
import { useSuscripcionesStore } from '@/store/suscripcionesStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useUsuariosStore } from '@/store/usuariosStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { IngresosVsGastosChart } from '@/components/dashboard/IngresosVsGastosChart';
import { RevenueByCategory } from '@/components/dashboard/RevenueByCategory';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CrecimientoUsuarios } from '@/components/dashboard/CrecimientoUsuarios';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const { suscripciones, fetchSuscripciones, isLoading: isLoadingSuscripciones } = useSuscripcionesStore();
  const { servicios, fetchServicios, isLoading: isLoadingServicios } = useServiciosStore();
  const { clientes, revendedores, fetchClientes, fetchRevendedores, isLoading: isLoadingUsuarios } = useUsuariosStore();
  const { logs, fetchLogs } = useActivityLogStore();
  const [progress, setProgress] = useState(0);

  const chartsReady = !isLoadingSuscripciones && !isLoadingServicios && !isLoadingUsuarios
    && (suscripciones.length > 0 || servicios.length > 0);

  useEffect(() => {
    fetchSuscripciones();
    fetchServicios();
    fetchClientes();
    fetchRevendedores();
    fetchLogs();
  }, [fetchSuscripciones, fetchServicios, fetchClientes, fetchRevendedores, fetchLogs]);

  // Calcular progreso real basado en los stores cargados
  useEffect(() => {
    let loadedStores = 0;
    const totalStores = 3;

    if (!isLoadingSuscripciones) loadedStores++;
    if (!isLoadingServicios) loadedStores++;
    if (!isLoadingUsuarios) loadedStores++;

    const realProgress = (loadedStores / totalStores) * 100;
    setProgress(realProgress);
  }, [isLoadingSuscripciones, isLoadingServicios, isLoadingUsuarios]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista general de métricas y rendimiento
        </p>
      </div>

      {chartsReady ? (
        <>
          {/* 5 Metric Cards */}
          <DashboardMetrics suscripciones={suscripciones} servicios={servicios} />

          <IngresosVsGastosChart suscripciones={suscripciones} servicios={servicios} />
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <CrecimientoUsuarios clientes={clientes} revendedores={revendedores} />
            <RevenueByCategory suscripciones={suscripciones} />
            <RecentActivity logs={logs} />
          </div>
        </>
      ) : (
        <div className="h-[420px] flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-white font-medium">Cargando datos...</p>
          <Progress value={progress} className="w-[300px] bg-purple-950/50" />
        </div>
      )}
    </div>
  );
}
