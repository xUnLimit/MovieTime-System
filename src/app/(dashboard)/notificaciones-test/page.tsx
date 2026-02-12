/**
 * Notificaciones Page
 *
 * Displays notification tables with optimized queries
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { VentasProximasTableV2 } from '@/components/notificaciones/VentasProximasTableV2';
import { ServiciosProximosTableV2 } from '@/components/notificaciones/ServiciosProximosTableV2';
import { AccionesVentaDialog } from '@/components/notificaciones/AccionesVentaDialog';
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
  const { totalNotificaciones, ventasProximas, serviciosProximos, isLoading } =
    useNotificacionesStore();

  const metrics = [
    {
      label: 'Total Notificaciones',
      value: totalNotificaciones,
      description: 'Alertas pendientes',
    },
    {
      label: 'Ventas Próximas',
      value: ventasProximas,
      description: 'Vencen en 7 días',
    },
    {
      label: 'Servicios Próximos',
      value: serviciosProximos,
      description: 'Vencen en 7 días',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </h3>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metric.value}
            </div>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </div>
        </div>
      ))}
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
