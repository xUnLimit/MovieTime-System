'use client';

import { useState, useMemo } from 'react';
import { Cliente, Revendedor } from '@/types';
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
import { Search, MoreHorizontal, Edit, Trash2, MessageCircle, Monitor } from 'lucide-react';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

// Tipo unificado para mostrar ambos tipos de usuarios
interface UsuarioUnificado {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  metodoPagoNombre: string;
  tipo: 'Cliente' | 'Revendedor';
  serviciosActivos: number;
  montoSinConsumir: number;
  original: Cliente | Revendedor;
}

interface TodosUsuariosTableProps {
  clientes: Cliente[];
  revendedores: Revendedor[];
  onEditCliente: (cliente: Cliente) => void;
  onEditRevendedor: (revendedor: Revendedor) => void;
  title?: string;
}

export function TodosUsuariosTable({
  clientes,
  revendedores,
  onEditCliente,
  onEditRevendedor,
  title = 'Todos los usuarios',
}: TodosUsuariosTableProps) {
  const { deleteCliente } = useClientesStore();
  const { deleteRevendedor } = useRevendedoresStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioUnificado | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('todos');

  // Combinar clientes y revendedores en un formato unificado
  const usuariosUnificados: UsuarioUnificado[] = useMemo(() => {
    const clientesMapped: UsuarioUnificado[] = clientes.map((c) => ({
      id: `cliente-${c.id}`,
      nombre: c.nombre,
      apellido: c.apellido,
      telefono: c.telefono,
      metodoPagoNombre: c.metodoPagoNombre,
      tipo: 'Cliente' as const,
      serviciosActivos: c.serviciosActivos,
      montoSinConsumir: c.montoSinConsumir,
      original: c,
    }));

    const revendedoresMapped: UsuarioUnificado[] = revendedores.map((r) => ({
      id: `revendedor-${r.id}`,
      nombre: r.nombre,
      apellido: r.apellido,
      telefono: r.telefono,
      metodoPagoNombre: r.metodoPagoNombre,
      tipo: 'Revendedor' as const,
      serviciosActivos: r.suscripcionesTotales,
      montoSinConsumir: r.montoSinConsumir,
      original: r,
    }));

    return [...clientesMapped, ...revendedoresMapped];
  }, [clientes, revendedores]);

  // Obtener métodos de pago únicos
  const metodosPagoUnicos = useMemo(() => {
    const metodos = new Set(usuariosUnificados.map((u) => u.metodoPagoNombre));
    return Array.from(metodos).filter(Boolean);
  }, [usuariosUnificados]);

  // Filtrar usuarios
  const filteredUsuarios = useMemo(() => {
    return usuariosUnificados.filter((usuario) => {
      const matchesSearch =
        usuario.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usuario.telefono.includes(searchQuery);
      const matchesMetodo =
        metodoPagoFilter === 'todos' || usuario.metodoPagoNombre === metodoPagoFilter;
      return matchesSearch && matchesMetodo;
    });
  }, [usuariosUnificados, searchQuery, metodoPagoFilter]);

  const handleDelete = (usuario: UsuarioUnificado) => {
    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (usuarioToDelete) {
      try {
        const realId = (usuarioToDelete.original as Cliente | Revendedor).id;
        if (usuarioToDelete.tipo === 'Cliente') {
          await deleteCliente(realId);
          toast.success('Cliente eliminado');
        } else {
          await deleteRevendedor(realId);
          toast.success('Revendedor eliminado');
        }
      } catch (error) {
        toast.error(`Error al eliminar ${usuarioToDelete.tipo.toLowerCase()}`);
      }
    }
  };

  const handleEdit = (usuario: UsuarioUnificado) => {
    if (usuario.tipo === 'Cliente') {
      onEditCliente(usuario.original as Cliente);
    } else {
      onEditRevendedor(usuario.original as Revendedor);
    }
  };

  const handleWhatsApp = (usuario: UsuarioUnificado) => {
    const phone = usuario.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const columns: Column<UsuarioUnificado>[] = [
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
            data={filteredUsuarios}
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
                  <DropdownMenuItem onClick={() => handleEdit(item)}>
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
        title={`Eliminar ${usuarioToDelete?.tipo || 'Usuario'}`}
        description={`¿Estás seguro de que quieres eliminar a "${usuarioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
