'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { NotificacionesList } from '@/components/notificaciones/NotificacionesList';
import { NotificacionesFilters } from '@/components/notificaciones/NotificacionesFilters';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { toast } from 'sonner';

function NotificacionesPageContent() {
  const { notificaciones, fetchNotificaciones, markAllAsRead } =
    useNotificacionesStore();

  const [tipoFilter, setTipoFilter] = useState('all');
  const [prioridadFilter, setPrioridadFilter] = useState('all');
  const [estadoFilter, setEstadoFilter] = useState('all');

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const filteredNotificaciones = useMemo(() => {
    return notificaciones.filter((notificacion) => {
      const matchesTipo =
        tipoFilter === 'all' || notificacion.tipo === tipoFilter;

      const matchesPrioridad =
        prioridadFilter === 'all' || notificacion.prioridad === prioridadFilter;

      const matchesEstado =
        estadoFilter === 'all' ||
        (estadoFilter === 'leida' && notificacion.leida) ||
        (estadoFilter === 'no_leida' && !notificacion.leida);

      return matchesTipo && matchesPrioridad && matchesEstado;
    });
  }, [notificaciones, tipoFilter, prioridadFilter, estadoFilter]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      toast.error('Error al marcar notificaciones');
    }
  }, [markAllAsRead]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground">
          Revisa las notificaciones y alertas del sistema
        </p>
      </div>

      <NotificacionesFilters
        tipoFilter={tipoFilter}
        setTipoFilter={setTipoFilter}
        prioridadFilter={prioridadFilter}
        setPrioridadFilter={setPrioridadFilter}
        estadoFilter={estadoFilter}
        setEstadoFilter={setEstadoFilter}
        onMarkAllRead={handleMarkAllRead}
      />

      <NotificacionesList notificaciones={filteredNotificaciones} />
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
