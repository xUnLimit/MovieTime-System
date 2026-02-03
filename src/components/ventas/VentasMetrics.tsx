'use client';

import { memo, useMemo } from 'react';
import { MetricCard } from '@/components/shared/MetricCard';
import { CreditCard, DollarSign, CalendarRange, Wallet, CheckCircle2, XCircle } from 'lucide-react';

export interface VentaDoc {
  id: string;
  clienteNombre: string;
  metodoPagoNombre: string;
  moneda: string;
  fechaInicio: Date;
  fechaFin: Date;
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  categoriaId: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo: string;
  perfilNumero?: number | null;
  precio: number;
  descuento: number;
  precioFinal: number;
  totalVenta?: number;
}

interface VentasMetricsProps {
  ventas: VentaDoc[];
}

export const VentasMetrics = memo(function VentasMetrics({ ventas }: VentasMetricsProps) {
  const metrics = useMemo(() => {
    const ventasTotales = ventas.length;
    const ingresoTotal = ventas.reduce((sum, v) => sum + (v.precioFinal || 0), 0);
    const ingresoMensualEsperado = 0;
    const montoSinConsumir = 0;
    const hoy = new Date();
    const ventasActivas = ventas.filter((v) => v.fechaFin && new Date(v.fechaFin) >= hoy).length;
    const ventasInactivas = 0;

    return {
      ventasTotales,
      ingresoTotal,
      ingresoMensualEsperado,
      montoSinConsumir,
      ventasActivas,
      ventasInactivas,
    };
  }, [ventas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Ventas Totales"
        value={metrics.ventasTotales}
        icon={CreditCard}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Ingreso Total"
        value={`$${metrics.ingresoTotal.toFixed(2)}`}
        icon={DollarSign}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value={`$${metrics.ingresoMensualEsperado.toFixed(2)}`}
        icon={CalendarRange}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Monto Sin Consumir"
        value={`$${metrics.montoSinConsumir.toFixed(2)}`}
        icon={Wallet}
        iconColor="text-emerald-500"
        underlineColor="bg-emerald-500"
      />
      <MetricCard
        title="Ventas Activas"
        value={metrics.ventasActivas}
        icon={CheckCircle2}
        iconColor="text-green-500"
        underlineColor="bg-green-500"
      />
      <MetricCard
        title="Ventas Inactivas"
        value={metrics.ventasInactivas}
        icon={XCircle}
        iconColor="text-red-500"
        underlineColor="bg-red-500"
      />
    </div>
  );
});
