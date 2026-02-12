/**
 * Notificaciones Page
 *
 * Displays notification tables with optimized queries
 * - VentasProximasTableV2 (no additional queries)
 * - ServiciosProximosTableV2 (no additional queries)
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VentasProximasTableV2 } from '@/components/notificaciones/VentasProximasTableV2';
import { ServiciosProximosTableV2 } from '@/components/notificaciones/ServiciosProximosTableV2';
import { AccionesVentaDialog } from '@/components/notificaciones/AccionesVentaDialog';
import { MetricCard } from '@/components/shared/MetricCard';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import {
  sincronizarNotificaciones,
  sincronizarNotificacionesForzado,
} from '@/lib/services/notificationSyncService';
import { toast } from 'sonner';
import type { NotificacionVenta } from '@/types/notificaciones';

export default function NotificacionesPage() {
  const {
    notificaciones,
    fetchNotificaciones,
    fetchCounts,
    totalNotificaciones,
    ventasProximas,
    serviciosProximos,
    isLoading,
  } = useNotificacionesStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<(NotificacionVenta & { id: string }) | null>(
    null
  );
  const [accionesDialogOpen, setAccionesDialogOpen] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await fetchNotificaciones();
        await fetchCounts();
        await sincronizarNotificaciones();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        toast.error('Error cargando notificaciones');
      }
    };

    init();
  }, [fetchNotificaciones, fetchCounts]);

  /**
   * Manual sync trigger
   */
  const handleForzarSync = async () => {
    setIsSyncing(true);
    try {
      await sincronizarNotificacionesForzado();
      await fetchNotificaciones(true);
      await fetchCounts();
      toast.success('Sincronización completada');
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Error durante sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Open actions dialog for a venta notification
   */
  const handleOpenAccionesDialog = (notif: NotificacionVenta & { id: string }) => {
    setSelectedVenta(notif);
    setAccionesDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona alertas de ventas y servicios próximos a vencer
          </p>
        </div>
        <Button onClick={handleForzarSync} disabled={isSyncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Notificaciones"
          value={totalNotificaciones.toString()}
          description="Alertas pendientes"
          loading={isLoading}
        />
        <MetricCard
          title="Ventas Próximas"
          value={ventasProximas.toString()}
          description="Vencen en 7 días"
          loading={isLoading}
        />
        <MetricCard
          title="Servicios Próximos"
          value={serviciosProximos.toString()}
          description="Vencen en 7 días"
          loading={isLoading}
        />
      </div>

      {/* Tabs for Ventas / Servicios */}
      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ventas">
            Ventas Próximas
            {ventasProximas > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {ventasProximas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="servicios">
            Servicios Próximos
            {serviciosProximos > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {serviciosProximos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Ventas Tab */}
        <TabsContent value="ventas">
          <VentasProximasTableV2 onOpenAccionesDialog={handleOpenAccionesDialog} />
        </TabsContent>

        {/* Servicios Tab */}
        <TabsContent value="servicios">
          <ServiciosProximosTableV2 />
        </TabsContent>
      </Tabs>

      {/* Actions Dialog for Ventas */}
      <AccionesVentaDialog
        notificacion={selectedVenta}
        isOpen={accionesDialogOpen}
        onOpenChange={setAccionesDialogOpen}
      />
    </div>
  );
}
