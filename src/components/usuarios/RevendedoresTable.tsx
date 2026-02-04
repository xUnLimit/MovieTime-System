'use client';

import { useState, useMemo } from 'react';
import { Usuario } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2, MessageCircle, Monitor, Eye } from 'lucide-react';
import { useUsuariosStore } from '@/store/usuariosStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface RevendedoresTableProps {
  revendedores: Usuario[];
  onEdit: (revendedor: Usuario) => void;
  onView?: (revendedor: Usuario) => void;
  title?: string;
}

export function RevendedoresTable({ revendedores, onEdit, onView, title = 'Revendedores' }: RevendedoresTableProps) {
  const { deleteUsuario } = useUsuariosStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revendedorToDelete, setRevendedorToDelete] = useState<Usuario | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('todos');

  // Obtener métodos de pago únicos
  const metodosPagoUnicos = useMemo(() => {
    const metodos = new Set(revendedores.map((r) => r.metodoPagoNombre));
    return Array.from(metodos).filter(Boolean);
  }, [revendedores]);

  // Filtrar revendedores
  const filteredRevendedores = useMemo(() => {
    return revendedores.filter((revendedor) => {
      const matchesSearch =
        revendedor.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        revendedor.telefono.includes(searchQuery);
      const matchesMetodo =
        metodoPagoFilter === 'todos' || revendedor.metodoPagoNombre === metodoPagoFilter;
      return matchesSearch && matchesMetodo;
    });
  }, [revendedores, searchQuery, metodoPagoFilter]);

  const handleDelete = (revendedor: Usuario) => {
    setRevendedorToDelete(revendedor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (revendedorToDelete) {
      try {
        await deleteUsuario(revendedorToDelete.id);
        toast.success('Revendedor eliminado');
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
      key: 'suscripcionesTotales',
      header: 'Servicios Activos',
      sortable: true,
      align: 'center',
      width: '16%',
      render: (item) => {
        const suscripcionesTotales = item.suscripcionesTotales ?? 0;
        const isActive = suscripcionesTotales > 0;
        return (
          <div className="flex items-center justify-center gap-2">
            <Monitor className={`h-4 w-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className={isActive ? '' : 'text-muted-foreground'}>{suscripcionesTotales}</span>
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
        const isActive = item.montoSinConsumir > 0;
        return (
          <div className="flex items-center justify-center gap-1">
            <span className={isActive ? 'text-green-500 font-medium' : 'text-muted-foreground'}>$</span>
            <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>{item.montoSinConsumir.toFixed(2)}</span>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={metodoPagoFilter} onValueChange={setMetodoPagoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los métodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los métodos</SelectItem>
              {metodosPagoUnicos.map((metodo) => (
                <SelectItem key={metodo} value={metodo}>
                  {metodo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
            data={filteredRevendedores}
            columns={columns}
            pagination={true}
            itemsPerPageOptions={[10, 25, 50, 100]}
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(item)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(item)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
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
