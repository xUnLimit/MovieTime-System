'use client';

import { memo, useEffect } from 'react';
import { MetricCard } from '@/components/shared/MetricCard';
import { useVentasStore } from '@/store/ventasStore';
import { CreditCard, DollarSign, CalendarRange, Wallet, CheckCircle2, XCircle } from 'lucide-react';
export const VentasMetrics = memo(function VentasMetrics() {
  const { totalVentas, ventasActivas, ventasInactivas, fetchCounts } = useVentasStore();

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Ventas Totales"
        value={totalVentas}
        icon={CreditCard}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Ingreso Total"
        value="-"
        icon={DollarSign}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value="-"
        icon={CalendarRange}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Monto Sin Consumir"
        value="-"
        icon={Wallet}
        iconColor="text-emerald-500"
        underlineColor="bg-emerald-500"
      />
      <MetricCard
        title="Ventas Activas"
        value={ventasActivas}
        icon={CheckCircle2}
        iconColor="text-green-500"
        underlineColor="bg-green-500"
      />
      <MetricCard
        title="Ventas Inactivas"
        value={ventasInactivas}
        icon={XCircle}
        iconColor="text-red-500"
        underlineColor="bg-red-500"
      />
    </div>
  );
});
