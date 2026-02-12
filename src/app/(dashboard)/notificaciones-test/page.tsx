/**
 * Notificaciones Page
 *
 * Displays notification tables with optimized queries
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Bell, ShoppingCart, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { VentasProximasTableV2 } from '@/components/notificaciones/VentasProximasTableV2';
import { ServiciosProximosTableV2 } from '@/components/notificaciones/ServiciosProximosTableV2';
import { AccionesVentaDialog } from '@/components/notificaciones/AccionesVentaDialog';
import { MetricCard } from '@/components/shared/MetricCard';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import {
  sincronizarNotificaciones,
  sincronizarNotificacionesForzado,
} from '@/lib/services/notificationSyncService';
import { toast } from 'sonner';
import type { NotificacionVenta } from '@/types/notificaciones';

// Metrics component matching CategoriasMetrics style
function NotificacionesMetrics() {
  const { totalNotificaciones, ventasProximas, serviciosProximos } =
    useNotificacionesStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <MetricCard
        title="Total Notificaciones"
        value={totalNotificaciones}
        icon={Bell}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Ventas Próximas"
        value={ventasProximas}
        icon={ShoppingCart}
        iconColor="text-red-500"
        underlineColor="bg-red-500"
      />
      <MetricCard
        title="Servicios Próximos"
        value={serviciosProximos}
        icon={Server}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
    </div>
  );
}

function NotificacionesPageContent() {
  const { fetchNotificaciones, fetchCounts, ventasProximas, serviciosProximos } =
    useNotificacionesStore();

  const [activeTab, setActiveTab] = useState('ventas');
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
    <div className="space-y-4">
      {/* Page Header - matching Categorías style */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            / <span className="text-foreground">Notificaciones</span>
          </p>
        </div>
        <Button onClick={handleForzarSync} disabled={isSyncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Metrics - matching CategoriasMetrics style */}
      <NotificacionesMetrics />

      {/* Tabs - matching Categorías tabs style */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="ventas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Ventas Próximas
            {ventasProximas > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {ventasProximas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="servicios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Servicios Próximos
            {serviciosProximos > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {serviciosProximos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Ventas Tab */}
        <TabsContent value="ventas" className="space-y-4">
          <VentasProximasTableV2 onOpenAccionesDialog={handleOpenAccionesDialog} />
        </TabsContent>

        {/* Servicios Tab */}
        <TabsContent value="servicios" className="space-y-4">
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

export default function NotificacionesPage() {
  return (
    <ModuleErrorBoundary moduleName="Notificaciones">
      <NotificacionesPageContent />
    </ModuleErrorBoundary>
  );
}
