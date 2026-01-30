'use client';

import { memo, useMemo } from 'react';
import { Servicio, Suscripcion } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { Tag, Monitor, CheckCircle, ShoppingBag } from 'lucide-react';

interface ServiciosMetricsProps {
  servicios: Servicio[];
  suscripciones: Suscripcion[];
  totalCategorias: number;
}

export const ServiciosMetrics = memo(function ServiciosMetrics({
  servicios,
  suscripciones,
  totalCategorias
}: ServiciosMetricsProps) {
  const metrics = useMemo(() => {
    const totalServicios = servicios.length;
    const serviciosActivos = servicios.filter(s => s.activo).length;
    const totalSuscripciones = suscripciones.length;

    return {
      totalCategorias,
      totalServicios,
      serviciosActivos,
      totalSuscripciones,
    };
  }, [servicios, suscripciones, totalCategorias]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Categorías"
        value={metrics.totalCategorias}
        icon={Tag}
        underlineColor="bg-red-500"
        iconColor="text-red-500"
      />
      <MetricCard
        title="Total Servicios"
        value={metrics.totalServicios}
        icon={Monitor}
        underlineColor="bg-blue-500"
        iconColor="text-blue-500"
      />
      <MetricCard
        title="Servicios Activos"
        value={`${metrics.serviciosActivos}/${metrics.totalServicios}`}
        icon={CheckCircle}
        underlineColor="bg-green-500"
        iconColor="text-green-500"
      />
      <MetricCard
        title="Suscripciones Totales"
        value={metrics.totalSuscripciones}
        icon={ShoppingBag}
        underlineColor="bg-purple-500"
        iconColor="text-purple-500"
      />
    </div>
  );
});
