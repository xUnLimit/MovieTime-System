'use client';

import { useState, useMemo, memo } from 'react';
import { Notificacion } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PaginationFooter } from '@/components/shared/PaginationFooter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MoreHorizontal, Bell, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificacionesTableProps {
  notificaciones: Notificacion[];
  isLoading: boolean;
  hasMore: boolean;
  hasPrevious: boolean;
  page: number;
  onNext: () => void;
  onPrevious: () => void;
}

interface NotificacionRow {
  id: string;
  clienteNombre: string;
  categoriaNombre: string;
  fechaInicio: string;
  fechaVencimiento: string;
  monto: number;
  estado: string;
  original: Notificacion;
}

export const NotificacionesTable = memo(function NotificacionesTable({
  notificaciones,
  isLoading,
  hasMore,
  hasPrevious,
  page,
  onNext,
  onPrevious,
}: NotificacionesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const { deleteNotificacion } = useNotificacionesStore();

  // Mapear notificaciones a filas de tabla
  const rows: NotificacionRow[] = useMemo(() => {
    return notificaciones.map(notif => {
      const fechaVencimiento = new Date(notif.fechaEvento || new Date());

      return {
        id: notif.id,
        clienteNombre: notif.clienteNombre || 'N/A',
        categoriaNombre: notif.titulo,
        fechaInicio: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
        fechaVencimiento: fechaVencimiento.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
        monto: 0, // Placeholder value
        estado: notif.estado,
        original: notif,
      };
    });
  }, [notificaciones]);

  // Filtrar datos
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = row.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.categoriaNombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFilter === 'todos' || row.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [rows, searchTerm, estadoFilter]);

  // Obtener días restantes desde el estado
  const getDiasRestantes = (estado: string): number => {
    if (estado === 'vencido') return 0;
    const match = estado.match(/(\d+)_dia/);
    return match ? parseInt(match[1]) : 0;
  };

  // Obtener color del estado (para badges)
  const getEstadoColor = (estado: string) => {
    const dias = getDiasRestantes(estado);
    if (dias >= 1 && dias <= 7) {
      return 'border-yellow-600 text-yellow-600';
    }
    return 'border-red-500 text-red-500';
  };

  // Obtener color del icono de campana (solo el color del texto)
  const getBellColor = (estado: string) => {
    const dias = getDiasRestantes(estado);
    if (dias >= 1 && dias <= 7) {
      return 'text-yellow-600';
    }
    return 'text-red-500';
  };

  const getEstadoLabel = (estado: string) => {
    const dias = getDiasRestantes(estado);
    if (dias >= 1 && dias <= 7) {
      return dias === 1 ? '1 día de retraso' : `${dias} días de retraso`;
    }
    return 'Vencido';
  };

  // Obtener icono del tipo con color dinámico según el estado
  const getTypeIcon = (estado: string) => {
    return <Bell className={`h-5 w-5 ${getBellColor(estado)}`} />;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificacion(id);
      toast.success('Notificación eliminada');
    } catch (error) {
      toast.error('Error al eliminar notificación', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const columns: Column<NotificacionRow>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '5%',
      render: (item) => (
        <div className="flex items-center justify-center">
          {getTypeIcon(item.estado)}
        </div>
      ),
    },
    {
      key: 'clienteNombre',
      header: 'Cliente',
      sortable: true,
      align: 'center',
      width: '20%',
      render: (item) => <span className="font-medium text-white">{item.clienteNombre}</span>,
    },
    {
      key: 'categoriaNombre',
      header: 'Categoría',
      sortable: true,
      align: 'center',
      width: '20%',
      render: (item) => <span className="text-white">{item.categoriaNombre}</span>,
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Inicio',
      sortable: true,
      align: 'center',
      width: '18%',
      render: (item) => <span className="text-white">{item.fechaInicio}</span>,
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      align: 'center',
      width: '18%',
      render: (item) => <span className="text-white">{item.fechaVencimiento}</span>,
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (item) => <span className="text-white">${item.monto.toFixed(2)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (item) => (
        <Badge variant="outline" className={`border bg-transparent ${getEstadoColor(item.estado)}`}>
          {getEstadoLabel(item.estado)}
        </Badge>
      ),
    },
  ];

  return (
    <Card className="p-4 pb-2">
      <div className="space-y-0">
        <h3 className="text-xl font-semibold">Ventas próximas a vencer</h3>
        <p className="text-sm text-muted-foreground mb-0">Listado de ventas de clientes con vencimiento próximo o ya vencidos.</p>
      </div>

      <div className="flex items-center gap-4 -mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="7_dias">1-7 días</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <DataTable
          data={filteredRows as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={isLoading}
          pagination={false}
          actions={(item) => {
            const row = item as unknown as NotificacionRow;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(row.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }}
        />

        <PaginationFooter
          page={page}
          totalPages={hasMore ? page + 1 : page}
          hasPrevious={hasPrevious}
          hasMore={hasMore}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
    </Card>
  );
});
