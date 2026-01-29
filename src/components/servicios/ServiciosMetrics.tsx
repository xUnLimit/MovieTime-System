'use client';

import { memo, useMemo } from 'react';
import { Servicio } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { Server, DollarSign, Users, AlertCircle } from 'lucide-react';

interface ServiciosMetricsProps {
  servicios: Servicio[];
}

export const ServiciosMetrics = memo(function ServiciosMetrics({ servicios }: ServiciosMetricsProps) {
  const metrics = useMemo(() => {
    let serviciosActivos = 0;
    let serviciosInactivos = 0;
    let costoTotalMensual = 0;
    let perfilesDisponibles = 0;
    let perfilesOcupados = 0;

    servicios.forEach((s) => {
      if (s.activo) {
        serviciosActivos++;
        costoTotalMensual += s.costoTotal;
        perfilesDisponibles += s.perfilesDisponibles;
        perfilesOcupados += s.perfilesOcupados;
      } else {
        serviciosInactivos++;
      }
    });

    const ocupacionPorcentaje = perfilesDisponibles > 0
      ? Math.round((perfilesOcupados / perfilesDisponibles) * 100)
      : 0;

    return {
      serviciosActivos,
      serviciosInactivos,
      costoTotalMensual,
      perfilesDisponibles,
      perfilesOcupados,
      ocupacionPorcentaje,
    };
  }, [servicios]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Servicios Activos"
        value={metrics.serviciosActivos}
        icon={Server}
        description={`${metrics.serviciosInactivos} inactivos`}
        borderColor="border-l-purple-500"
        iconColor="text-purple-500"
      />
      <MetricCard
        title="Costo Mensual"
        value={`$${metrics.costoTotalMensual.toFixed(2)}`}
        icon={DollarSign}
        description="Total mensual"
        borderColor="border-l-orange-500"
        iconColor="text-orange-500"
      />
      <MetricCard
        title="Perfiles Disponibles"
        value={metrics.perfilesDisponibles}
        icon={Users}
        description={`${metrics.perfilesOcupados} ocupados`}
        borderColor="border-l-green-500"
        iconColor="text-green-500"
      />
      <MetricCard
        title="Ocupación"
        value={`${metrics.ocupacionPorcentaje}%`}
        icon={AlertCircle}
        description="Tasa de uso"
        borderColor="border-l-blue-500"
        iconColor="text-blue-500"
      />
    </div>
  );
});
