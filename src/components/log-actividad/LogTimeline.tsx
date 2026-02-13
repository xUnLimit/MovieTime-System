'use client';

import { ActivityLog } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogFilters } from './LogFilters';
import { CambiosModal } from './CambiosModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Eye } from 'lucide-react';

interface LogTimelineProps {
  logs: ActivityLog[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  accionFilter: string;
  setAccionFilter: (value: string) => void;
  entidadFilter: string;
  setEntidadFilter: (value: string) => void;
  usuarioFilter: string;
  setUsuarioFilter: (value: string) => void;
  // Paginación
  hasMore: boolean;
  hasPrevious: boolean;
  page: number;
  onNext: () => void;
  onPrevious: () => void;
  onRefresh: () => void;
  // Delete handlers
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onDeleteByDays: (days: number) => Promise<void>;
}

export function LogTimeline({
  logs,
  isLoading,
  searchTerm,
  setSearchTerm,
  accionFilter,
  setAccionFilter,
  entidadFilter,
  setEntidadFilter,
  usuarioFilter,
  setUsuarioFilter,
  hasMore,
  hasPrevious,
  page,
  onNext,
  onPrevious,
  onRefresh,
  onDeleteSelected,
  onDeleteByDays,
}: LogTimelineProps) {
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [cambiosModalOpen, setCambiosModalOpen] = useState(false);

  const getActionBadgeStyle = (accion: ActivityLog['accion']) => {
    const styles = {
      creacion: 'bg-green-500/20 text-green-400 border-green-500/30',
      actualizacion: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      eliminacion: 'bg-red-500/20 text-red-400 border-red-500/30',
      renovacion: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return styles[accion];
  };

  const getActionLabel = (accion: ActivityLog['accion']) => {
    const labels = {
      creacion: 'Creación',
      actualizacion: 'Actualización',
      eliminacion: 'Eliminación',
      renovacion: 'Renovación',
    };
    return labels[accion];
  };

  const getEntityLabel = (entidad: ActivityLog['entidad']) => {
    const labels = {
      cliente: 'Cliente',
      revendedor: 'Revendedor',
      servicio: 'Servicio',
      usuario: 'Usuario',
      categoria: 'Categoría',
      metodo_pago: 'Método de Pago',
      gasto: 'Gasto',
      venta: 'Venta',
      template: 'Template',
    };
    return labels[entidad];
  };

  const toggleSelection = (logId: string) => {
    const newSelection = new Set(selectedLogs);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    setSelectedLogs(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      const allLogIds = new Set(logs.map(log => log.id));
      setSelectedLogs(allLogIds);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedLogs);
    await onDeleteSelected(ids);
    setSelectedLogs(new Set());
  };

  const handleDeleteByDays = async (days: number) => {
    await onDeleteByDays(days);
    setSelectedLogs(new Set());
  };

  const handleOpenCambios = (log: ActivityLog) => {
    setSelectedLog(log);
    setCambiosModalOpen(true);
  };

  const isAllSelected = logs.length > 0 && selectedLogs.size === logs.length;

  const columns: Column<ActivityLog>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '40px',
      headerRender: () => (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={toggleSelectAll}
          className="border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
        />
      ),
      render: (item) => (
        <Checkbox
          checked={selectedLogs.has(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          className="border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
        />
      ),
    },
    {
      key: 'timestamp',
      header: 'Fecha',
      sortable: true,
      width: '16%',
      render: (item) => (
        <div className="text-sm">
          {format(new Date(item.timestamp), 'dd MMM yyyy, hh:mm:ss a', { locale: es })}
        </div>
      ),
    },
    {
      key: 'usuarioEmail',
      header: 'Usuario',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (item) => <div className="text-sm">{item.usuarioEmail}</div>,
    },
    {
      key: 'accion',
      header: 'Acción',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (item) => (
        <Badge variant="outline" className={getActionBadgeStyle(item.accion)}>
          {getActionLabel(item.accion)}
        </Badge>
      ),
    },
    {
      key: 'entidad',
      header: 'Entidad',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (item) => <div className="text-sm">{getEntityLabel(item.entidad)}</div>,
    },
    {
      key: 'detalles',
      header: 'Detalles',
      align: 'left',
      width: '28%',
      render: (item) => (
        <div className="text-sm text-muted-foreground">
          {item.detalles}
        </div>
      ),
    },
    {
      key: 'cambios',
      header: 'Cambios',
      align: 'center',
      width: '12%',
      render: (item) => (
        <div className="flex items-center justify-center">
          {item.cambios && item.cambios.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCambios(item)}
              className="h-8 px-3 text-xs"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Ver ({item.cambios.length})
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card className="p-4">
      <div className="mb-4">
        <LogFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          accionFilter={accionFilter}
          setAccionFilter={setAccionFilter}
          entidadFilter={entidadFilter}
          setEntidadFilter={setEntidadFilter}
          usuarioFilter={usuarioFilter}
          setUsuarioFilter={setUsuarioFilter}
          selectedCount={selectedLogs.size}
          onDeleteSelected={handleDeleteSelected}
          onDeleteByDays={handleDeleteByDays}
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="border border-border rounded-md p-12 text-center">
            <p className="text-sm text-muted-foreground">Cargando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="border border-border rounded-md p-12 text-center">
            <p className="text-sm text-muted-foreground">No hay actividad registrada</p>
          </div>
        ) : (
          <>
            <DataTable
              data={logs as unknown as Record<string, unknown>[]}
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              pagination={false}
            />

            {/* Controles de paginación server-side */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Actualizar
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} • {logs.length} registros
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={!hasPrevious || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  disabled={!hasMore || isLoading}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de cambios */}
      {selectedLog && selectedLog.cambios && (
        <CambiosModal
          open={cambiosModalOpen}
          onOpenChange={setCambiosModalOpen}
          entidadNombre={selectedLog.entidadNombre}
          cambios={selectedLog.cambios}
        />
      )}
    </Card>
  );
}
