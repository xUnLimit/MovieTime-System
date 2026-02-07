'use client';

import Link from 'next/link';
import { NotificacionesTable } from '@/components/notificaciones/NotificacionesTable';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { useServerPagination } from '@/hooks/useServerPagination';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import type { Notificacion } from '@/types';

function NotificacionesPageContent() {
  const { data: notificaciones, isLoading, hasMore, hasPrevious, page, next, previous, refresh } = useServerPagination<Notificacion>({
    collectionName: COLLECTIONS.NOTIFICACIONES,
    filters: [],
    pageSize: 50,
    orderByField: 'fechaVencimiento',
    orderDirection: 'asc',
  });

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

      <NotificacionesTable
        notificaciones={notificaciones}
        isLoading={isLoading}
        hasMore={hasMore}
        hasPrevious={hasPrevious}
        page={page}
        onNext={next}
        onPrevious={previous}
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
