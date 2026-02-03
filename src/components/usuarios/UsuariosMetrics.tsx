'use client';

import { memo, useMemo } from 'react';
import { Usuario } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { Users, Store, UserCheck, UserPlus } from 'lucide-react';
import { subDays } from 'date-fns';

interface UsuariosMetricsProps {
  usuarios: Usuario[];
}

export const UsuariosMetrics = memo(function UsuariosMetrics({ usuarios }: UsuariosMetricsProps) {
  const metrics = useMemo(() => {
    const clientes = usuarios.filter(u => u.tipo === 'cliente');
    const revendedores = usuarios.filter(u => u.tipo === 'revendedor');
    
    const totalClientes = clientes.length;
    const totalRevendedores = revendedores.length;

    const clientesActivos = clientes.filter((c) => c.active && (c.serviciosActivos ?? 0) > 0).length;

    // Usuarios nuevos en los últimos 30 días
    const thirtyDaysAgo = subDays(new Date(), 30);
    const usuariosNuevos = usuarios.filter((u) => {
      const createdDate = u.createdAt ? new Date(u.createdAt) : new Date();
      return createdDate >= thirtyDaysAgo;
    }).length;

    return {
      totalClientes,
      totalRevendedores,
      clientesActivos,
      usuariosNuevos,
    };
  }, [usuarios]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Clientes"
        value={metrics.totalClientes}
        icon={Users}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Total Revendedores"
        value={metrics.totalRevendedores}
        icon={Store}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
      <MetricCard
        title="Clientes Activos"
        value={metrics.clientesActivos}
        icon={UserCheck}
        iconColor="text-green-500"
        underlineColor="bg-green-500"
      />
      <MetricCard
        title="Usuarios Nuevos"
        value={metrics.usuariosNuevos}
        icon={UserPlus}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
    </div>
  );
});
