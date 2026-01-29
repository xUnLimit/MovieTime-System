'use client';

import { memo, useMemo } from 'react';
import { Venta } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface VentasMetricsProps {
  ventas: Venta[];
}

export const VentasMetrics = memo(function VentasMetrics({ ventas }: VentasMetricsProps) {
  const metrics = useMemo(() => {
    let ventasActivas = 0;
    let ventasSuspendidas = 0;
    let ventasVencidas = 0;
    let ingresoMensual = 0;
    let ingresoTotal = 0;
    let montoRestante = 0;

    ventas.forEach((v) => {
      if (v.estado === 'activa') {
        ventasActivas++;
        ingresoTotal += v.monto;
        montoRestante += v.montoRestante;
        if (v.cicloPago === 'mensual') {
          ingresoMensual += v.monto;
        }
      } else if (v.estado === 'suspendida') {
        ventasSuspendidas++;
      } else if (v.estado === 'vencida') {
        ventasVencidas++;
      }
    });

    return {
      ventasActivas,
      ventasSuspendidas,
      ventasVencidas,
      ingresoMensual,
      ingresoTotal,
      montoRestante,
    };
  }, [ventas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Ventas Activas"
        value={metrics.ventasActivas}
        icon={ShoppingCart}
        description={`${metrics.ventasSuspendidas} suspendidas, ${metrics.ventasVencidas} vencidas`}
        borderColor="border-l-purple-500"
        iconColor="text-purple-500"
      />
      <MetricCard
        title="Ingreso Mensual"
        value={`$${metrics.ingresoMensual.toFixed(2)}`}
        icon={DollarSign}
        description="De ventas mensuales"
        borderColor="border-l-orange-500"
        iconColor="text-orange-500"
      />
      <MetricCard
        title="Ingreso Total"
        value={`$${metrics.ingresoTotal.toFixed(2)}`}
        icon={TrendingUp}
        description="Todas las ventas activas"
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
