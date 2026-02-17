'use client';

import { useState, useMemo } from 'react';
import { Usuario } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2, MessageCircle, Monitor, Eye } from 'lucide-react';
import { useUsuariosStore } from '@/store/usuariosStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PaginationFooter, PaginationFooterProps } from '@/components/shared/PaginationFooter';
import { toast } from 'sonner';
import { useVentasPorUsuarios } from '@/hooks/use-ventas-por-usuarios';

interface RevendedoresTableProps {
  revendedores: Usuario[];
  onEdit: (revendedor: Usuario) => void;
  onView?: (revendedor: Usuario) => void;
  title?: string;
  isLoading?: boolean;
  pagination?: PaginationFooterProps;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

export function RevendedoresTable({ revendedores, onEdit, onView, title = 'Revendedores', isLoading = false, pagination, searchQuery, onSearchChange, onRefresh }: RevendedoresTableProps) {
  const { deleteUsuario } = useUsuariosStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revendedorToDelete, setRevendedorToDelete] = useState<Usuario | null>(null);
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('todos');

  // IDs de revendedores de la página actual para la query de ventas
  const revendedorIds = useMemo(
    () => revendedores.map(r => r.id),
    [revendedores]
  );
  const { stats: ventasPorUsuario } = useVentasPorUsuarios(revendedorIds, { enabled: !isLoading });

  // Obtener métodos de pago únicos
  const metodosPagoUnicos = useMemo(() => {
    const metodos = new Set(revendedores.map((r) => r.metodoPagoNombre));
    return Array.from(metodos).filter(Boolean);
  }, [revendedores]);

  // Filtrar revendedores por método de pago (la búsqueda por nombre/teléfono la maneja el page)
  const filteredRevendedores = useMemo(() => {
    return revendedores.filter((revendedor) =>
      metodoPagoFilter === 'todos' || revendedor.metodoPagoNombre === metodoPagoFilter
    );
  }, [revendedores, metodoPagoFilter]);

  const handleDelete = (revendedor: Usuario) => {
    setRevendedorToDelete(revendedor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (revendedorToDelete) {
      try {
        await deleteUsuario(revendedorToDelete.id, {
          tipo: revendedorToDelete.tipo,
          createdAt: revendedorToDelete.createdAt,
          serviciosActivos: revendedorToDelete.serviciosActivos,
        });
        toast.success('Revendedor eliminado', { description: 'El revendedor ha sido eliminado correctamente del sistema.' });
        setDeleteDialogOpen(false);
        setRevendedorToDelete(null);
        onRefresh();
      } catch (error) {
        toast.error('Error al eliminar revendedor', { description: error instanceof Error ? error.message : undefined });
      }
    }
  };

  const handleWhatsApp = (revendedor: Usuario) => {
    const phone = revendedor.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const columns: Column<Usuario>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      width: '14%',
      render: (item) => (
        <div className="font-medium">{item.nombre} {item.apellido}</div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '16%',
      render: () => <span>Revendedor</span>,
    },
    {
      key: 'metodoPagoNombre',
      header: 'Método de Pago',
      sortable: false,
      align: 'center',
      width: '16%',
    },
    {
      key: 'ventasActivas',
      header: 'Servicios Activos',
      sortable: true,
      align: 'center',
      width: '16%',
      render: (item) => {
        const serviciosActivos = item.serviciosActivos ?? 0;
        const isActive = serviciosActivos > 0;
        return (
          <div className="flex items-center justify-center gap-2">
            <Monitor className={`h-4 w-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className={isActive ? '' : 'text-muted-foreground'}>{serviciosActivos}</span>
          </div>
        );
      },
    },
    {
      key: 'montoSinConsumir',
      header: 'Monto Sin Consumir',
      sortable: true,
      align: 'center',
      width: '16%',
      render: (item) => {
        const isActive = (item.serviciosActivos ?? 0) > 0;
        const monto = ventasPorUsuario[item.id]?.montoSinConsumir ?? 0;
        return (
          <div className="flex items-center justify-center gap-1">
            <span className={isActive ? 'text-green-500 font-medium' : 'text-muted-foreground'}>$</span>
            <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>{monto.toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      key: 'contacto',
      header: 'Contacto',
      align: 'center',
      width: '16%',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleWhatsApp(item);
          }}
          className="text-green-500 hover:text-green-400 p-0 h-auto"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card className="p-4 pb-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex items-center gap-4 -mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between font-normal">
                {metodoPagoFilter === 'todos' ? 'Todos los métodos' : metodoPagoFilter}
                <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {[{ value: 'todos', label: 'Todos los métodos' }, ...metodosPagoUnicos.map(m => ({ value: m, label: m }))].map(op => (
                <DropdownMenuItem
                  key={op.value}
                  onClick={() => setMetodoPagoFilter(op.value)}
                  className="flex items-center justify-between"
                >
                  {op.label}
                  {metodoPagoFilter === op.value && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <DataTable
            data={filteredRevendedores as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            loading={isLoading}
            pagination={false}
            actions={(item) => {
              const usuario = item as unknown as Usuario;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(usuario)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(usuario)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(usuario)}
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
          {pagination && <PaginationFooter {...pagination} />}
        </div>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar Revendedor"
        description={`¿Estás seguro de que quieres eliminar al revendedor "${revendedorToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
