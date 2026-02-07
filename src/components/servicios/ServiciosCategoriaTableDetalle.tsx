'use client';

import { memo, useState } from 'react';
import { Servicio } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PaginationFooter } from '@/components/shared/PaginationFooter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Pencil, Trash2, User, Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface ServiciosCategoriaTableDetalleProps {
  servicios: Servicio[];
  onEdit: (id: string) => void;
  onView?: (id: string) => void;
  title?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  cicloFilter: string;
  onCicloChange: (value: string) => void;
  perfilFilter: string;
  onPerfilChange: (value: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  hasPrevious?: boolean;
  page?: number;
  onNext: () => void;
  onPrevious: () => void;
  onRefresh?: () => void;
}

export const ServiciosCategoriaTableDetalle = memo(function ServiciosCategoriaTableDetalle({
  servicios,
  onEdit,
  onView,
  title = 'Todos los servicios',
  searchTerm,
  onSearchChange,
  cicloFilter,
  onCicloChange,
  perfilFilter,
  onPerfilChange,
  isLoading = false,
  hasMore = false,
  hasPrevious = false,
  page = 1,
  onNext,
  onPrevious,
  onRefresh,
}: ServiciosCategoriaTableDetalleProps) {
  const { deleteServicio, fetchCounts } = useServiciosStore();
  const { fetchCategorias } = useCategoriasStore();
  const { metodosPago } = useMetodosPagoStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);

  const getCurrencySymbol = (moneda?: string) => {
    if (!moneda) return '$';
    return CURRENCY_SYMBOLS[moneda] || '$';
  };

  const handleDelete = (servicio: Servicio) => {
    setServicioToDelete(servicio);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (servicioToDelete) {
      try {
        await deleteServicio(servicioToDelete.id);
        toast.success('Servicio eliminado');

        // Refrescar categorías y contadores de servicios para actualizar widgets
        await Promise.all([
          fetchCategorias(true),
          fetchCounts(true), // Force refresh para actualizar inmediatamente
        ]);

        setDeleteDialogOpen(false);
        setServicioToDelete(null);
      } catch (error) {
        toast.error('Error al eliminar servicio', { description: error instanceof Error ? error.message : undefined });
      }
    }
  };

  const calcularDiasRestantes = (fechaVencimiento?: Date) => {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const getBadgeColor = (dias: number) => {
    if (dias < 0) return 'text-red-600';
    if (dias <= 3) return 'text-red-500';
    if (dias <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const columns: Column<Servicio>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      width: '10%',
      render: (item) => (
        <div className="font-medium">{item.nombre}</div>
      ),
    },
    {
      key: 'correo',
      header: 'Email',
      sortable: true,
      width: '14%',
      render: (item) => (
        <div className="text-sm">{item.correo}</div>
      ),
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Inicio',
      sortable: true,
      align: 'left',
      width: '12%',
      render: (item) => (
        <div className="text-sm">
          {item.fechaInicio ? format(new Date(item.fechaInicio), 'dd \'de\' MMMM \'del\' yyyy', { locale: es }) : '-'}
        </div>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (item) => (
        <div className="text-sm">
          {item.fechaVencimiento ? format(new Date(item.fechaVencimiento), 'dd \'de\' MMMM \'del\' yyyy', { locale: es }) : '-'}
        </div>
      ),
    },
    {
      key: 'costo',
      header: 'Costo',
      sortable: true,
      align: 'center',
      width: '7%',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <span className="font-medium">{getCurrencySymbol(item.moneda)}</span>
          <span className="font-medium">{(item.costoServicio || 0).toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'diasRestantes',
      header: 'Días Restantes',
      sortable: false,
      align: 'center',
      width: '11%',
      render: (item) => {
        const dias = calcularDiasRestantes(item.fechaVencimiento);
        return (
          <Badge
            variant="outline"
            className={`${getBadgeColor(dias)} border-current`}
          >
            {dias > 0 ? `${dias} días restantes` : `${Math.abs(dias)} días vencido`}
          </Badge>
        );
      },
    },
    {
      key: 'renovaciones',
      header: 'Renovaciones',
      sortable: true,
      align: 'center',
      width: '8%',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{item.renovaciones || 0}</span>
        </div>
      ),
    },
    {
      key: 'perfiles',
      header: 'Perfiles',
      sortable: false,
      align: 'center',
      width: '12%',
      render: (item) => {
        const ocupados = item.perfilesOcupados || 0;
        const disponibles = item.perfilesDisponibles || 0;
        const libres = disponibles - ocupados;
        const icons = [];
        for (let i = 0; i < disponibles; i++) {
          icons.push(
            <User
              key={i}
              className={`h-4 w-4 ${i < ocupados ? 'text-red-500' : 'text-green-500'}`}
            />
          );
        }
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-0.5">
              {icons}
            </div>
            <span className="text-xs text-muted-foreground">
              <span className={libres === 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{libres}</span>/{disponibles} disponibles
            </span>
          </div>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '7%',
      render: (item) => (
        <Badge variant={item.activo ? 'default' : 'secondary'} className={item.activo ? 'bg-green-600' : ''}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <Card className="p-4 pb-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex items-center gap-4 -mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cicloFilter} onValueChange={onCicloChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los ciclos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los ciclos</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={perfilFilter} onValueChange={onPerfilChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los perfiles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los perfiles</SelectItem>
              <SelectItem value="con_disponibles">Con perfiles disponibles</SelectItem>
              <SelectItem value="sin_disponibles">Sin perfiles disponibles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <DataTable
            data={servicios as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            emptyMessage="No hay servicios para mostrar"
            loading={isLoading}
            pagination={false}
            actions={(item) => {
              const servicio = item as unknown as Servicio;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(servicio.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(servicio.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(servicio)}
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar Servicio"
        description={`¿Estás seguro de que quieres eliminar el servicio "${servicioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
});
