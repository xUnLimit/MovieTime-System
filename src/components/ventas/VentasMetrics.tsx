'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { MetricCard } from '@/components/shared/MetricCard';
import { useVentasStore } from '@/store/ventasStore';
import { calculateVentasMetrics } from '@/lib/services/metricsService';
import { formatearMoneda } from '@/lib/utils/calculations';
import { CreditCard, DollarSign, CalendarRange, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { getAll, COLLECTIONS } from '@/lib/firebase/firestore';
import { PagoVenta, VentaDoc } from '@/types';
import { getVentasConUltimoPago, VentaConUltimoPago } from '@/lib/services/ventaSyncService';

export const VentasMetrics = memo(function VentasMetrics() {
  const { fetchVentas } = useVentasStore();
  const [pagosVentas, setPagosVentas] = useState<PagoVenta[]>([]);
  const [ventasConUltimoPago, setVentasConUltimoPago] = useState<VentaConUltimoPago[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función centralizada para cargar datos
  const loadMetrics = async () => {
    console.log('[VentasMetrics] Loading metrics...');
    await fetchVentas(true); // Force refresh
    // Load all pagos from pagosVenta collection
    const pagos = await getAll<PagoVenta>(COLLECTIONS.PAGOS_VENTA);
    setPagosVentas(pagos);

    // Load all ventas with current data from last payment
    const allVentas = await getAll<VentaDoc>(COLLECTIONS.VENTAS);
    const ventasConPagoActual = await getVentasConUltimoPago(allVentas);
    setVentasConUltimoPago(ventasConPagoActual);
  };

  // Cargar datos iniciales y cuando cambia refreshTrigger
  useEffect(() => {
    loadMetrics();

  }, [refreshTrigger]);

  // Escuchar eventos de cambios en ventas
  useEffect(() => {
    const handleVentaChange = () => {
      console.log('[VentasMetrics] Venta change event detected');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('venta-created', handleVentaChange);
    window.addEventListener('venta-updated', handleVentaChange);
    window.addEventListener('venta-deleted', handleVentaChange);

    return () => {
      window.removeEventListener('venta-created', handleVentaChange);
      window.removeEventListener('venta-updated', handleVentaChange);
      window.removeEventListener('venta-deleted', handleVentaChange);
    };
  }, []);

  const metrics = useMemo(() => {
    // Usar ventasConUltimoPago en lugar de ventas del store
    // para calcular métricas con datos del último pago desde pagosVenta
    return calculateVentasMetrics(ventasConUltimoPago, pagosVentas);
  }, [ventasConUltimoPago, pagosVentas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Ventas Totales"
        value={metrics?.ventasTotales ?? 0}
        icon={CreditCard}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Ingreso Total"
        value={metrics ? formatearMoneda(metrics.ingresoTotal) : '-'}
        icon={DollarSign}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value={metrics ? formatearMoneda(metrics.ingresoMensualEsperado) : '-'}
        icon={CalendarRange}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Monto Sin Consumir"
        value={metrics ? formatearMoneda(metrics.montoSinConsumir) : '-'}
        icon={Wallet}
        iconColor="text-emerald-500"
        underlineColor="bg-emerald-500"
      />
      <MetricCard
        title="Ventas Activas"
        value={metrics?.ventasActivas ?? 0}
        icon={CheckCircle2}
        iconColor="text-green-500"
        underlineColor="bg-green-500"
      />
      <MetricCard
        title="Ventas Inactivas"
        value={metrics?.ventasInactivas ?? 0}
        icon={XCircle}
        iconColor="text-red-500"
        underlineColor="bg-red-500"
      />
    </div>
  );
});
