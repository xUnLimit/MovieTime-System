'use client';

import { memo, useEffect, useState } from 'react';
import { MetricCard } from '@/components/shared/MetricCard';
import { useVentasStore } from '@/store/ventasStore';
import { calculateVentasMetrics, VentasMetrics as VentasMetricsType } from '@/lib/services/metricsService';
import { CreditCard, DollarSign, CalendarRange, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { getAll, COLLECTIONS } from '@/lib/firebase/firestore';
import { PagoVenta, VentaDoc } from '@/types';
import { getVentasConUltimoPago, VentaConUltimoPago } from '@/lib/services/ventaSyncService';
import { useIngresoMensualEsperado } from '@/hooks/use-ingreso-mensual-esperado';

export const VentasMetrics = memo(function VentasMetrics() {
  const { fetchCounts, totalVentas, ventasActivas, ventasInactivas } = useVentasStore();
  const { value: ingresoMensual, isLoading: isLoadingMensual } = useIngresoMensualEsperado();
  const [pagosVentas, setPagosVentas] = useState<PagoVenta[]>([]);
  const [ventasConUltimoPago, setVentasConUltimoPago] = useState<VentaConUltimoPago[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función centralizada para cargar datos
  const loadMetrics = async () => {
    // Counts son gratuitos (no leen documentos)
    await fetchCounts();

    // Cargar pagos y ventas en paralelo para métricas financieras
    const [pagos, allVentas] = await Promise.all([
      getAll<PagoVenta>(COLLECTIONS.PAGOS_VENTA),
      getAll<VentaDoc>(COLLECTIONS.VENTAS),
    ]);
    setPagosVentas(pagos);

    const ventasConPagoActual = await getVentasConUltimoPago(allVentas);
    setVentasConUltimoPago(ventasConPagoActual);
  };

  // Cargar datos iniciales y cuando cambia refreshTrigger
  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Escuchar eventos de cambios en ventas
  useEffect(() => {
    const handleVentaChange = () => {
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

  const [metrics, setMetrics] = useState<VentasMetricsType | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calcular métricas de forma asíncrona con conversión de moneda
  useEffect(() => {
    const calculate = async () => {
      setIsCalculating(true);
      try {
        const result = await calculateVentasMetrics(ventasConUltimoPago, pagosVentas);
        setMetrics(result);
      } catch (error) {
        console.error('[VentasMetrics] Error calculating metrics:', error);
        // Fallback a métricas en cero en caso de error
        setMetrics({
          ventasTotales: 0,
          ingresoTotal: 0,
          ingresoMensualEsperado: 0,
          montoSinConsumir: 0,
          ventasActivas: 0,
          ventasInactivas: 0
        });
      } finally {
        setIsCalculating(false);
      }
    };
    calculate();
  }, [ventasConUltimoPago, pagosVentas]);

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
        value={isCalculating ? 'Calculando...' : (metrics ? `$${metrics.ingresoTotal.toFixed(2)}` : '-')}
        icon={DollarSign}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
      <MetricCard
        title="Ingreso Mensual Esperado"
        value={(isCalculating || isLoadingMensual) ? 'Calculando...' : (ingresoMensual !== null ? `$${ingresoMensual.toFixed(2)}` : '-')}
        icon={CalendarRange}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Monto Sin Consumir"
        value={isCalculating ? 'Calculando...' : (metrics ? `$${metrics.montoSinConsumir.toFixed(2)}` : '-')}
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
