'use client';

import { useMemo, useState } from 'react';
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
import { PaginationFooter, PaginationFooterProps } from '@/components/shared/PaginationFooter';
import { toast } from 'sonner';
import { useVentasPorUsuarios } from '@/hooks/use-ventas-por-usuarios';

// Tipo para display en la tabla
interface UsuarioDisplay {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  metodoPagoNombre: string;
  tipo: 'Cliente' | 'Revendedor';
  serviciosActivos: number;
  montoSinConsumir: number;
  original: Usuario;
}

interface TodosUsuariosTableProps {
  usuarios: Usuario[];
  onEdit: (usuario: Usuario) => void;
  onView?: (usuario: Usuario) => void;
  title?: string;
  isLoading?: boolean;
  pagination: PaginationFooterProps;
  onRefresh: () => void;
}

export function TodosUsuariosTable({
  usuarios,
  onEdit,
  onView,
  title = 'Todos los usuarios',
  isLoading = false,
  pagination,
  onRefresh,
}: TodosUsuariosTableProps) {
  const { deleteUsuario } = useUsuariosStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioDisplay | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('todos');
  // IDs de todos los usuarios (clientes Y revendedores) de la página actual (máx 10) para la query de ventas
  const usuarioIds = useMemo(
    () => usuarios.map(u => u.id),
    [usuarios]
  );
  const { stats: ventasPorUsuario } = useVentasPorUsuarios(usuarioIds, { enabled: !isLoading });

  // Mapear usuarios a formato display
  const usuariosDisplay: UsuarioDisplay[] = useMemo(() => {
    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      telefono: u.telefono,
      metodoPagoNombre: u.metodoPagoNombre,
      tipo: u.tipo === 'cliente' ? 'Cliente' : 'Revendedor',
      serviciosActivos: u.serviciosActivos ?? 0,
      montoSinConsumir: ventasPorUsuario[u.id]?.montoSinConsumir ?? 0,
      original: u,
    }));
  }, [usuarios, ventasPorUsuario]);

  // Obtener métodos de pago únicos
  const metodosPagoUnicos = useMemo(() => {
    const metodos = new Set(usuariosDisplay.map((u) => u.metodoPagoNombre));
    return Array.from(metodos).filter(Boolean);
  }, [usuariosDisplay]);

  // Filtrar usuarios
  const filteredUsuarios = useMemo(() => {
    return usuariosDisplay.filter((usuario) => {
      const matchesSearch =
        usuario.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usuario.telefono.includes(searchQuery);
      const matchesMetodo =
        metodoPagoFilter === 'todos' || usuario.metodoPagoNombre === metodoPagoFilter;
      return matchesSearch && matchesMetodo;
    });
  }, [usuariosDisplay, searchQuery, metodoPagoFilter]);

  const handleDelete = (usuario: UsuarioDisplay) => {
    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (usuarioToDelete) {
      try {
        await deleteUsuario(usuarioToDelete.original.id, {
          tipo: usuarioToDelete.original.tipo,
          createdAt: usuarioToDelete.original.createdAt,
          serviciosActivos: usuarioToDelete.original.serviciosActivos,
        });
        toast.success(`${usuarioToDelete.tipo} eliminado`);
        setDeleteDialogOpen(false);
        setUsuarioToDelete(null);
        onRefresh();
      } catch (error) {
        toast.error(`Error al eliminar ${usuarioToDelete.tipo.toLowerCase()}`, { description: error instanceof Error ? error.message : undefined });
      }
    }
  };

  const handleEdit = (usuario: UsuarioDisplay) => {
    onEdit(usuario.original);
  };

  const handleView = (usuario: UsuarioDisplay) => {
    if (onView) {
      onView(usuario.original);
    }
  };

  const handleWhatsApp = (usuario: UsuarioDisplay) => {
    const phone = usuario.telefono.replace(/\D/g, '');
    window.open(`https://web.whatsapp.com/send?phone=${phone}`, '_blank');
  };

  const columns: Column<UsuarioDisplay>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      width: '14%',
      render: (item) => <div className="font-medium">{item.nombre} {item.apellido}</div>,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '16%',
      render: (item) => <span>{item.tipo}</span>,
    },
    {
      key: 'metodoPagoNombre',
      header: 'Método de Pago',
      sortable: false,
      align: 'center',
      width: '16%',
    },
    {
      key: 'serviciosActivos',
      header: 'Servicios Activos',
      sortable: true,
      align: 'center',
      width: '16%',
      render: (item) => {
        const isActive = item.serviciosActivos > 0;
        return (
          <div className="flex items-center justify-center gap-2">
            <Monitor
              className={`h-4 w-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}
            />
            <span className={isActive ? '' : 'text-muted-foreground'}>
              {item.serviciosActivos}
            </span>
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
        const isActive = item.serviciosActivos > 0;
        return (
          <div className="flex items-center justify-center gap-1">
            <span className={isActive ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
              $
            </span>
            <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>
              {item.montoSinConsumir.toFixed(2)}
            </span>
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
          data={filteredUsuarios as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={isLoading}
          pagination={false}
          actions={(item) => {
            const usuario = item as unknown as UsuarioDisplay;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => handleView(usuario)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleEdit(usuario)}>
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
        <PaginationFooter {...pagination} />
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Eliminar ${usuarioToDelete?.tipo || 'Usuario'}`}
        description={`¿Estás seguro de que quieres eliminar a "${usuarioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
