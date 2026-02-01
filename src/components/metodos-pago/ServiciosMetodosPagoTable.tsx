'use client';

import { useState, useMemo } from 'react';
import { MetodoPago } from '@/types';
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
import { Search, MoreHorizontal, Edit, Trash2, Eye, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ServiciosMetodosPagoTableProps {
  metodosPago: MetodoPago[];
  onEdit: (metodo: MetodoPago) => void;
  title?: string;
}

export function ServiciosMetodosPagoTable({ metodosPago, onEdit, title = 'Métodos de pago de Servicios' }: ServiciosMetodosPagoTableProps) {
  const router = useRouter();
  const { deleteMetodoPago, toggleActivo } = useMetodosPagoStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metodoToDelete, setMetodoToDelete] = useState<MetodoPago | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paisFilter, setPaisFilter] = useState('todos');

  // Filtrar solo métodos de servicio
  const metodosConServicios = useMemo(() => {
    return metodosPago.filter((m) => {
      // Si tiene asociadoA, usarlo directamente
      if (m.asociadoA) {
        return m.asociadoA === 'servicio';
      }
      // Si no tiene asociadoA, inferir por tipoCuenta (legacy)
      // Si NO tiene tipoCuenta, es servicio. Si tiene, es usuario.
      return !m.tipoCuenta;
    });
  }, [metodosPago]);

  // Obtener países únicos
  const paisesUnicos = useMemo(() => {
    const paises = new Set(metodosConServicios.map((m) => m.pais));
    return Array.from(paises).filter(Boolean);
  }, [metodosConServicios]);

  // Filtrar y ordenar métodos de pago
  const filteredMetodos = useMemo(() => {
    const filtered = metodosConServicios.filter((metodo) => {
      const matchesSearch =
        metodo.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metodo.titular.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metodo.identificador.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPais = paisFilter === 'todos' || metodo.pais === paisFilter;
      return matchesSearch && matchesPais;
    });
    // Ordenar alfabéticamente por nombre
    return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [metodosConServicios, searchQuery, paisFilter]);

  const handleViewDetails = (metodo: MetodoPago) => {
    router.push(`/metodos-pago/${metodo.id}`);
  };

  const handleToggleActivo = async (metodo: MetodoPago) => {
    try {
      await toggleActivo(metodo.id);
      toast.success(metodo.activo ? 'Método de pago desactivado' : 'Método de pago activado');
    } catch (error) {
      toast.error('Error al cambiar estado del método de pago');
    }
  };

  const handleDelete = (metodo: MetodoPago) => {
    setMetodoToDelete(metodo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (metodoToDelete) {
      try {
        await deleteMetodoPago(metodoToDelete.id);
        toast.success('Método de pago eliminado');
      } catch (error) {
        toast.error('Error al eliminar método de pago');
      }
    }
  };

  const tipoCuentaLabels: Record<string, string> = {
    ahorro: 'Ahorro',
    corriente: 'Corriente',
    wallet: 'Wallet',
    telefono: 'Teléfono',
  };

  const columns: Column<MetodoPago>[] = [
    {
      key: 'nombre',
      header: 'Método',
      sortable: true,
      width: '18%',
      render: (item) => <span className="font-medium">{item.banco || item.nombre}</span>,
    },
    {
      key: 'pais',
      header: 'País',
      sortable: true,
      align: 'center',
      width: '12%',
    },
    {
      key: 'titular',
      header: 'Titular',
      sortable: true,
      align: 'center',
      width: '20%',
    },
    {
      key: 'email',
      header: 'Email',
      sortable: false,
      align: 'center',
      width: '22%',
      render: (item) => <span className="text-sm">{item.email || item.identificador || 'N/A'}</span>,
    },
    {
      key: 'numeroTarjeta',
      header: 'Últimos Dígitos',
      sortable: false,
      align: 'center',
      width: '13%',
      render: (item) => {
        if (item.numeroTarjeta) {
          // Extraer últimos 4 dígitos del número de tarjeta
          const digitos = item.numeroTarjeta.replace(/\D/g, '').slice(-4);
          return <span className="text-sm">{digitos}</span>;
        }
        return <span className="text-sm text-muted-foreground">N/A</span>;
      },
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (item) => (
        <Badge variant={item.activo ? 'default' : 'secondary'} className="text-xs">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por método, titular, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={paisFilter} onValueChange={setPaisFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los países" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los países</SelectItem>
              {paisesUnicos.map((pais) => (
                <SelectItem key={pais} value={pais}>
                  {pais}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredMetodos.length === 0 ? (
          <div className="border border-border rounded-md p-12 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron métodos de pago</p>
          </div>
        ) : (
          <DataTable
            data={filteredMetodos}
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
                <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActivo(item)}>
                  <Power className="h-4 w-4 mr-2" />
                  {item.activo ? 'Desactivar' : 'Activar'}
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
        )}
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar Método de Pago"
        description={`¿Estás seguro de que quieres eliminar el método "${metodoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
