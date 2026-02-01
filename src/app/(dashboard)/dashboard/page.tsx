'use client';

import { useEffect } from 'react';
import { useServiciosStore } from '@/store/serviciosStore';
import { useUsuariosStore } from '@/store/usuariosStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CrecimientoUsuarios } from '@/components/dashboard/CrecimientoUsuarios';

export default function DashboardPage() {
  const { fetchServicios } = useServiciosStore();
  const { clientes, revendedores, fetchClientes, fetchRevendedores } = useUsuariosStore();
  const { logs, fetchLogs } = useActivityLogStore();

  useEffect(() => {
    fetchServicios();
    fetchClientes();
    fetchRevendedores();
    fetchLogs();
  }, [fetchServicios, fetchClientes, fetchRevendedores, fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista general de métricas y rendimiento
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <CrecimientoUsuarios clientes={clientes} revendedores={revendedores} />
        <RecentActivity logs={logs} />
      </div>
    </div>
  );
}
