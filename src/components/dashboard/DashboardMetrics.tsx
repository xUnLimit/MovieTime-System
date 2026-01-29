'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { Suscripcion } from '@/types';
import { Servicio } from '@/types';
import { formatearMoneda } from '@/lib/utils/calculations';

interface DashboardMetricsProps {
  suscripciones: Suscripcion[];
  servicios: Servicio[];
}

export function DashboardMetrics({ suscripciones, servicios }: DashboardMetricsProps) {
  // Calcular gastos totales (suma de costos de servicios activos)
  const gastosTotal = servicios
    .filter((s) => s.activo)
    .reduce((sum, s) => sum + s.costoTotal, 0);

  // Calcular ingresos totales (suscripciones activas)
  const ingresosTotal = suscripciones
    .filter((s) => s.estado === 'activa')
    .reduce((sum, s) => sum + s.monto, 0);

  // Calcular ganancias
  const gananciasTotal = ingresosTotal - gastosTotal;

  // Calcular gasto mensual esperado (basado en renovaciones próximas)
  const gastoMensualEsperado = servicios
    .filter((s) => s.activo && s.renovacionAutomatica)
    .reduce((sum, s) => sum + s.costoTotal, 0);

  // Calcular ingreso mensual esperado (basado en suscripciones activas recurrentes)
  const ingresoMensualEsperado = suscripciones
    .filter((s) => s.estado === 'activa' && s.cicloPago === 'mensual')
    .reduce((sum, s) => sum + s.monto, 0);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Gastos Totales"
        value={formatearMoneda(gastosTotal)}
        description="Suma del costo de todos los servicios"
        icon={TrendingDown}
        iconColor="text-red-500"
        borderColor="border-l-red-500"
      />
      <MetricCard
        title="Ingresos Totales"
        value={formatearMoneda(ingresosTotal)}
        description="Suma de todas las suscripciones"
        icon={TrendingUp}
        iconColor="text-blue-500"
        borderColor="border-l-blue-500"
      />
      <MetricCard
        title="Ganancias Totales"
        value={formatearMoneda(gananciasTotal)}
        description="Ingresos totales menos gastos totales"
        icon={Wallet}
        iconColor="text-green-500"
        borderColor="border-l-green-500"
      />
      <MetricCard
        title="Gasto Mensual Esperado"
        value={formatearMoneda(gastoMensualEsperado)}
        description="Gastos a pagar este mes"
        icon={CreditCard}
        iconColor="text-purple-500"
        borderColor="border-l-purple-500"
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value={formatearMoneda(ingresoMensualEsperado)}
        description="Ingresos a recibir este mes"
        icon={DollarSign}
        iconColor="text-orange-500"
        borderColor="border-l-orange-500"
      />
    </div>
  );
}
