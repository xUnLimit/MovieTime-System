'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function DashboardMetrics() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Gastos Totales"
        value="$0.00"
        description="Suma del costo de servicios"
        icon={TrendingDown}
        iconColor="text-red-500"
        borderColor="border-l-red-500"
      />
      <MetricCard
        title="Ingresos Totales"
        value="$0.00"
        description="Suma de ingresos"
        icon={TrendingUp}
        iconColor="text-blue-500"
        borderColor="border-l-blue-500"
      />
      <MetricCard
        title="Ganancias Totales"
        value="$0.00"
        description="Ingresos menos gastos"
        icon={Wallet}
        iconColor="text-green-500"
        borderColor="border-l-green-500"
      />
      <MetricCard
        title="Balance Mensual"
        value="$0.00"
        description="Este mes"
        icon={DollarSign}
        iconColor="text-orange-500"
        borderColor="border-l-orange-500"
      />
    </div>
  );
}
