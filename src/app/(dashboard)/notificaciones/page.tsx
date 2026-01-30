'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { NotificacionesTable } from '@/components/notificaciones/NotificacionesTable';
import { ServiciosProximosPagarTable } from '@/components/notificaciones/ServiciosProximosPagarTable';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { useSuscripcionesStore } from '@/store/suscripcionesStore';
import { useClientesStore } from '@/store/clientesStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function NotificacionesPageContent() {
  const { notificaciones, fetchNotificaciones } =
    useNotificacionesStore();
  const { fetchSuscripciones } = useSuscripcionesStore();
  const { fetchClientes } = useClientesStore();
  const { fetchServicios } = useServiciosStore();

  useEffect(() => {
    fetchNotificaciones();
    fetchSuscripciones();
    fetchClientes();
    fetchServicios();
  }, [fetchNotificaciones, fetchSuscripciones, fetchClientes, fetchServicios]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Notificaciones</span>
          </p>
        </div>
      </div>

      <NotificacionesTable notificaciones={notificaciones} />
      <ServiciosProximosPagarTable />
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
