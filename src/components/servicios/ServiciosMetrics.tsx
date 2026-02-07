'use client';

import { memo, useEffect } from 'react';
import { MetricCard } from '@/components/shared/MetricCard';
import { Tag, Monitor, CheckCircle, ShoppingBag } from 'lucide-react';
import { useServiciosStore } from '@/store/serviciosStore';

export const ServiciosMetrics = memo(function ServiciosMetrics() {
  const { totalServicios, serviciosActivos, totalCategoriasActivas, fetchCounts } = useServiciosStore();

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Categorías"
        value={totalCategoriasActivas}
        icon={Tag}
        underlineColor="bg-red-500"
        iconColor="text-red-500"
      />
      <MetricCard
        title="Total Servicios"
        value={totalServicios}
        icon={Monitor}
        underlineColor="bg-blue-500"
        iconColor="text-blue-500"
      />
      <MetricCard
        title="Servicios Activos"
        value={`${serviciosActivos}/${totalServicios}`}
        icon={CheckCircle}
        underlineColor="bg-green-500"
        iconColor="text-green-500"
      />
      <MetricCard
        title="Suscripciones Totales"
        value={0}
        icon={ShoppingBag}
        underlineColor="bg-purple-500"
        iconColor="text-purple-500"
      />
    </div>
  );
});
