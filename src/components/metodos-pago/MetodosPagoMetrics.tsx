'use client';

import { memo, useMemo } from 'react';
import { MetodoPago } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { CreditCard, Users, Package } from 'lucide-react';

interface MetodosPagoMetricsProps {
  metodosPago: MetodoPago[];
}

export const MetodosPagoMetrics = memo(function MetodosPagoMetrics({ metodosPago }: MetodosPagoMetricsProps) {
  const metrics = useMemo(() => {
    const total = metodosPago.length;

    // Contar métodos por tipo
    const asociadosUsuarios = metodosPago.filter(m => {
      if (m.asociadoA) return m.asociadoA === 'usuario';
      // Legacy: si tiene tipoCuenta es usuario, si no tiene es servicio
      return !!m.tipoCuenta;
    }).length;

    const asociadosServicios = metodosPago.filter(m => {
      if (m.asociadoA) return m.asociadoA === 'servicio';
      // Legacy: si NO tiene tipoCuenta es servicio
      return !m.tipoCuenta;
    }).length;

    return { total, asociadosUsuarios, asociadosServicios };
  }, [metodosPago]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <MetricCard
        title="Total Métodos"
        value={metrics.total}
        icon={CreditCard}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Asociados a Usuarios"
        value={metrics.asociadosUsuarios}
        icon={Users}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Asociados a Servicios"
        value={metrics.asociadosServicios}
        icon={Package}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
    </div>
  );
});
