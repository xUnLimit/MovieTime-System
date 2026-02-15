'use client';

import { useDashboardStore } from '@/store/dashboardStore';
import { MetricCard } from '@/components/shared/MetricCard';
import { TrendingUp, TrendingDown, Wallet, CalendarClock, CalendarRange } from 'lucide-react';
import { usePronosticoFinanciero } from '@/hooks/use-pronostico-financiero';

function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DashboardMetrics() {
  const { stats, isLoading } = useDashboardStore();
  const { meses, isLoading: isLoadingMensual } = usePronosticoFinanciero();
  const gastoMensual = meses[0]?.gastos ?? null;
  const ingresoMensual = meses[0]?.ingresos ?? null;

  const gastosTotal = stats?.gastosTotal ?? 0;
  const ingresosTotal = stats?.ingresosTotal ?? 0;
  const gananciasTotal = ingresosTotal - gastosTotal;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Gastos Totales"
        value={isLoading ? '...' : formatUSD(gastosTotal)}
        description="Suma del costo de todos los servicios"
        icon={TrendingDown}
        iconColor="text-red-500"
        borderColor="border-l-red-500"
        loading={isLoading}
      />
      <MetricCard
        title="Ingresos Totales"
        value={isLoading ? '...' : formatUSD(ingresosTotal)}
        description="Suma de todas las ventas"
        icon={TrendingUp}
        iconColor="text-blue-500"
        borderColor="border-l-blue-500"
        loading={isLoading}
      />
      <MetricCard
        title="Ganancias Totales"
        value={isLoading ? '...' : formatUSD(gananciasTotal)}
        valueColor={isLoading ? undefined : gananciasTotal >= 0 ? 'text-green-500' : 'text-red-500'}
        description="Ingresos totales menos gastos totales"
        icon={Wallet}
        iconColor="text-green-500"
        borderColor="border-l-green-500"
        loading={isLoading}
      />
      <MetricCard
        title="Gasto Mensual Esperado"
        value={isLoadingMensual ? '...' : (gastoMensual !== null ? formatUSD(gastoMensual) : '$0.00')}
        description="Gastos a pagar este mes"
        icon={CalendarClock}
        iconColor="text-purple-500"
        borderColor="border-l-purple-500"
        loading={isLoadingMensual}
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value={isLoadingMensual ? '...' : (ingresoMensual !== null ? formatUSD(ingresoMensual) : '$0.00')}
        description="Ingresos a recibir este mes"
        icon={CalendarRange}
        iconColor="text-orange-500"
        borderColor="border-l-orange-500"
        loading={isLoadingMensual}
      />
    </div>
  );
}
