'use client';

import { memo, useMemo } from 'react';
import { Suscripcion } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface SuscripcionesMetricsProps {
  suscripciones: Suscripcion[];
}

export const SuscripcionesMetrics = memo(function SuscripcionesMetrics({ suscripciones }: SuscripcionesMetricsProps) {
  const metrics = useMemo(() => {
    let suscripcionesActivas = 0;
    let suscripcionesSuspendidas = 0;
    let suscripcionesVencidas = 0;
    let ingresoMensual = 0;
    let ingresoTotal = 0;
    let montoRestante = 0;

    suscripciones.forEach((s) => {
      if (s.estado === 'activa') {
        suscripcionesActivas++;
        ingresoTotal += s.monto;
        montoRestante += s.montoRestante;
        if (s.cicloPago === 'mensual') {
          ingresoMensual += s.monto;
        }
      } else if (s.estado === 'suspendida') {
        suscripcionesSuspendidas++;
      } else if (s.estado === 'vencida') {
        suscripcionesVencidas++;
      }
    });

    return {
      suscripcionesActivas,
      suscripcionesSuspendidas,
      suscripcionesVencidas,
      ingresoMensual,
      ingresoTotal,
      montoRestante,
    };
  }, [suscripciones]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Suscripciones Activas"
        value={metrics.suscripcionesActivas}
        icon={ShoppingCart}
        description={`${metrics.suscripcionesSuspendidas} suspendidas, ${metrics.suscripcionesVencidas} vencidas`}
        borderColor="border-l-purple-500"
        iconColor="text-purple-500"
      />
      <MetricCard
        title="Ingreso Mensual"
        value={`$${metrics.ingresoMensual.toFixed(2)}`}
        icon={DollarSign}
        description="De suscripciones mensuales"
        borderColor="border-l-orange-500"
        iconColor="text-orange-500"
      />
      <MetricCard
        title="Ingreso Total"
        value={`$${metrics.ingresoTotal.toFixed(2)}`}
        icon={TrendingUp}
        description="Todas las suscripciones activas"
        borderColor="border-l-green-500"
        iconColor="text-green-500"
      />
      <MetricCard
        title="Monto Restante"
        value={`$${metrics.montoRestante.toFixed(2)}`}
        icon={AlertTriangle}
        description="Por consumir"
        borderColor="border-l-blue-500"
        iconColor="text-blue-500"
      />
    </div>
  );
});
