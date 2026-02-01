'use client';

import { memo, useMemo } from 'react';
import { Servicio } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { Monitor, Calendar } from 'lucide-react';

interface ServiciosCategoriaMetricsProps {
  servicios: Servicio[];
}

export const ServiciosCategoriaMetrics = memo(function ServiciosCategoriaMetrics({
  servicios,
}: ServiciosCategoriaMetricsProps) {
  const metrics = useMemo(() => {
    const serviciosActivos = servicios.filter(s => s.activo);
    const totalServicios = servicios.length;

    // Calcular próximos pagos en 7 días
    const hoy = new Date();
    const en7Dias = new Date();
    en7Dias.setDate(hoy.getDate() + 7);

    const proximosPagos = 0; // Sin suscripciones, esto será 0

    return {
      serviciosActivos: `${serviciosActivos.length}/${totalServicios}`,
      proximosPagos,
    };
  }, [servicios]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MetricCard
        title="Servicios Activos"
        value={metrics.serviciosActivos}
        icon={Monitor}
        underlineColor="bg-blue-500"
        iconColor="text-blue-500"
      />
      <MetricCard
        title="Próximos Pagos (7 días)"
        value={metrics.proximosPagos}
        icon={Calendar}
        underlineColor="bg-yellow-500"
        iconColor="text-yellow-500"
      />
    </div>
  );
});
