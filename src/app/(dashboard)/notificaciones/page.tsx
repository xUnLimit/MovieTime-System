'use client';

import Link from 'next/link';
import { ServiciosProximosTable } from '@/components/notificaciones/ServiciosProximosTable';
import { VentasProximasTable } from '@/components/notificaciones/VentasProximasTable';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function NotificacionesPageContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Notificaciones</span>
          </p>
        </div>
      </div>

      <VentasProximasTable />

      <ServiciosProximosTable />
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
