'use client';

import { ActivityLog } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { LogFilters } from './LogFilters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

interface LogTimelineProps {
  logs: ActivityLog[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  accionFilter: string;
  setAccionFilter: (value: string) => void;
  entidadFilter: string;
  setEntidadFilter: (value: string) => void;
  usuarioFilter: string;
  setUsuarioFilter: (value: string) => void;
}

export function LogTimeline({
  logs,
  searchTerm,
  setSearchTerm,
  accionFilter,
  setAccionFilter,
  entidadFilter,
  setEntidadFilter,
  usuarioFilter,
  setUsuarioFilter,
}: LogTimelineProps) {
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  const getActionBadgeStyle = (accion: ActivityLog['accion']) => {
    const styles = {
      creacion: 'bg-green-500/20 text-green-400 border-green-500/30',
      actualizacion: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      eliminacion: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[accion];
  };

  const getActionLabel = (accion: ActivityLog['accion']) => {
    const labels = {
      creacion: 'Creación',
      actualizacion: 'Actualización',
      eliminacion: 'Eliminación',
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
      width: '18%',
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
      width: '18%',
      render: (item) => <div className="text-sm">{item.usuarioEmail}</div>,
    },
    {
      key: 'accion',
      header: 'Acción',
      sortable: true,
      align: 'center',
      width: '18%',
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
      width: '18%',
      render: (item) => <div className="text-sm">{getEntityLabel(item.entidad)}</div>,
    },
    {
      key: 'detalles',
      header: 'Detalles',
      align: 'center',
      render: (item) => (
        <div className="text-sm text-center">{item.detalles}</div>
      ),
    },
  ];

  const handleDeleteSelected = () => {
    // Aquí se implementará la lógica de eliminación
    console.log('Eliminar logs seleccionados:', Array.from(selectedLogs));
    setSelectedLogs(new Set());
  };

  const handleDeleteByDays = (days: number) => {
    // Aquí se implementará la lógica de eliminación por días
    console.log(`Eliminar logs de +${days} días`);
  };

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

      <div>
        {logs.length === 0 ? (
          <div className="border border-border rounded-md p-12 text-center">
            <p className="text-sm text-muted-foreground">No hay actividad registrada</p>
          </div>
        ) : (
          <DataTable
            data={logs}
            columns={columns}
            pagination={true}
            itemsPerPageOptions={[20, 50, 100]}
          />
        )}
      </div>
    </Card>
  );
}
