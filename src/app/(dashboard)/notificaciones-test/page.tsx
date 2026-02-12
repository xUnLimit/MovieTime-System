'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ServiciosProximosTableV2 } from '@/components/notificaciones/ServiciosProximosTableV2';
import { VentasProximasTableV2 } from '@/components/notificaciones/VentasProximasTableV2';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { sincronizarNotificaciones } from '@/lib/services/notificationSyncService';
import { toast } from 'sonner';

/**
 * Página de Notificaciones - Versión TEST v2.1
 *
 * Esta es una versión temporal para probar el nuevo sistema de notificaciones
 * antes de migrar completamente.
 *
 * NOTA: Actualmente usa los componentes de tablas actuales (VentasProximasTable,
 * ServiciosProximosTable). En futuras iteraciones se reemplazarán por las versiones V2
 * con sistema de íconos interactivos.
 */

function NotificacionesTestPageContent() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Forzar sincronización borrando el flag de localStorage
      localStorage.removeItem('lastNotificationSync');
      await sincronizarNotificaciones();
      toast.success('Notificaciones sincronizadas exitosamente');
      // Recargar la página para refrescar las tablas
      window.location.reload();
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar notificaciones');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Notificaciones Test</h1>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              TEST v2.1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Notificaciones Test</span>
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </Button>
      </div>

      {/* Información del sistema v2.1 */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-500/10 p-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">Sistema de Notificaciones v2.1 Activo</p>
            <p className="text-sm text-muted-foreground">
              El nuevo sistema está funcionando con:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
              <li>🔔 Sistema de íconos interactivos (🔔/🔕/⚠️) con click para toggle</li>
              <li>🟠 Badge con jerarquía de colores (naranja &gt; rojo &gt; amarillo)</li>
              <li>📊 Sincronización automática diaria (una vez al día)</li>
              <li>📅 Días restantes exactos en notificaciones</li>
              <li>⚡ Estado &quot;leída&quot; inteligente (solo resetea si prioridad aumenta)</li>
              <li>🔥 Resaltado manual con prioridad visual máxima</li>
              <li>⚙️ Modales dual-flow (opciones vs confirmación directa)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              <strong>Importante:</strong> Para ver las notificaciones, haz clic en el botón "Sincronizar Ahora".
              La sincronización creará las notificaciones para todas las ventas y servicios próximos a vencer (ventana de 7 días).
            </p>
          </div>
        </div>
      </div>

      {/* Tablas de notificaciones (versión V2) */}
      <VentasProximasTableV2 />

      <ServiciosProximosTableV2 />
    </div>
  );
}

export default function NotificacionesTestPage() {
  return (
    <ModuleErrorBoundary moduleName="Notificaciones Test">
      <NotificacionesTestPageContent />
    </ModuleErrorBoundary>
  );
}
