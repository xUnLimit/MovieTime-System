/**
 * Notificaciones Test Page (Parallel Route)
 *
 * This is a test/temporary page for the new notification system v2.1
 * It allows testing the new implementation without breaking the existing /notificaciones page
 *
 * Features:
 * - Displays VentasProximasTableV2 (no additional queries)
 * - Displays ServiciosProximosTableV2 (no additional queries)
 * - Full integration with notificacionesStore
 * - Manual sync trigger for testing
 *
 * URL: /notificaciones-test
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VentasProximasTableV2 } from '@/components/notificaciones/VentasProximasTableV2';
import { ServiciosProximosTableV2 } from '@/components/notificaciones/ServiciosProximosTableV2';
import { AccionesVentaDialog } from '@/components/notificaciones/AccionesVentaDialog';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import {
  sincronizarNotificaciones,
  sincronizarNotificacionesForzado,
} from '@/lib/services/notificationSyncService';
import { toast } from 'sonner';
import type { NotificacionVenta } from '@/types/notificaciones';

export default function NotificacionesTestPage() {
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
        // Fetch notifications from store
        await fetchNotificaciones();
        await fetchCounts();

        // Run sync (will use cache if already synced today)
        await sincronizarNotificaciones();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        toast.error('Error loading notifications');
      }
    };

    init();
  }, [fetchNotificaciones, fetchCounts]);

  /**
   * Manual sync trigger (forces refresh, ignoring cache)
   */
  const handleForzarSync = async () => {
    setIsSyncing(true);
    try {
      await sincronizarNotificacionesForzado();
      await fetchNotificaciones(true); // Force refresh store
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
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones v2.1</h1>
        <p className="text-gray-600">
          Test page para la nueva arquitectura de notificaciones con queries optimizadas
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotificaciones}</div>
            <p className="text-xs text-gray-500">notificaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ventas Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasProximas}</div>
            <p className="text-xs text-gray-500">vencen en 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Servicios Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviciosProximos}</div>
            <p className="text-xs text-gray-500">vencen en 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Leyendo...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : '0'}</div>
            <p className="text-xs text-gray-500">firebase queries</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Información de Sincronización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Última sincronización</p>
              <p className="text-gray-600">
                {localStorage.getItem('lastNotificationSync') || 'Nunca (primera vez)'}
              </p>
            </div>
            <div>
              <p className="font-medium">Optimizaciones aplicadas</p>
              <ul className="text-gray-600 list-disc list-inside text-xs">
                <li>1 query por entidad (not 2)</li>
                <li>Campos denormalizados</li>
                <li>Sin joins al mostrar</li>
              </ul>
            </div>
          </div>

          <Button onClick={handleForzarSync} disabled={isSyncing} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Forzar Sincronización'}
          </Button>
        </CardContent>
      </Card>

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

      {/* Development Info */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Información Técnica (Dev Only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs font-mono">
          <div>Total notificaciones en store: {notificaciones.length}</div>
          <div>Ventas con prioridad critica: {notificaciones.filter(n => 'ventaId' in n && n.prioridad === 'critica').length}</div>
          <div>Servicios con prioridad critica: {notificaciones.filter(n => 'servicioId' in n && n.prioridad === 'critica').length}</div>
          <div>Notificaciones resaltadas: {notificaciones.filter(n => n.resaltada).length}</div>
          <div>Abre DevTools (F12) y ve la consola para ver los logs de Firestore</div>
        </CardContent>
      </Card>
    </div>
  );
}
