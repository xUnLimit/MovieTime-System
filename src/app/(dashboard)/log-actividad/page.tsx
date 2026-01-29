'use client';

import { useEffect, useState, useMemo } from 'react';
import { LogTimeline } from '@/components/log-actividad/LogTimeline';
import { LogFilters } from '@/components/log-actividad/LogFilters';
import { useActivityLogStore } from '@/store/activityLogStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function LogActividadPageContent() {
  const { logs, fetchLogs } = useActivityLogStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [accionFilter, setAccionFilter] = useState('all');
  const [entidadFilter, setEntidadFilter] = useState('all');
  const [usuarioFilter, setUsuarioFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.entidadNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.usuarioEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detalles?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAccion = accionFilter === 'all' || log.accion === accionFilter;

      const matchesEntidad =
        entidadFilter === 'all' || log.entidad === entidadFilter;

      const matchesUsuario =
        usuarioFilter === 'all' || log.usuarioId === usuarioFilter;

      return matchesSearch && matchesAccion && matchesEntidad && matchesUsuario;
    });
  }, [logs, searchTerm, accionFilter, entidadFilter, usuarioFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log de Actividad</h1>
        <p className="text-muted-foreground">
          Historial completo de todas las acciones realizadas en el sistema
        </p>
      </div>

      <LogFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        accionFilter={accionFilter}
        setAccionFilter={setAccionFilter}
        entidadFilter={entidadFilter}
        setEntidadFilter={setEntidadFilter}
        usuarioFilter={usuarioFilter}
        setUsuarioFilter={setUsuarioFilter}
      />

      <LogTimeline logs={filteredLogs} />
    </div>
  );
}

export default function LogActividadPage() {
  return (
    <ModuleErrorBoundary moduleName="Log de Actividad">
      <LogActividadPageContent />
    </ModuleErrorBoundary>
  );
}
