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
import { Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface ServiciosMetodosPagoTableProps {
  metodosPago: MetodoPago[];
  onEdit: (metodo: MetodoPago) => void;
  title?: string;
}

export function ServiciosMetodosPagoTable({ metodosPago, onEdit, title = 'Métodos de pago de Servicios' }: ServiciosMetodosPagoTableProps) {
  const { deleteMetodoPago } = useMetodosPagoStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metodoToDelete, setMetodoToDelete] = useState<MetodoPago | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paisFilter, setPaisFilter] = useState('todos');

  // Filtrar solo métodos con servicios asociados
  const metodosConServicios = useMemo(() => {
    return metodosPago.filter((m) => m.asociadoServicios > 0);
  }, [metodosPago]);

  // Obtener países únicos
  const paisesUnicos = useMemo(() => {
    const paises = new Set(metodosConServicios.map((m) => m.pais));
    return Array.from(paises).filter(Boolean);
  }, [metodosConServicios]);

  // Filtrar métodos de pago
  const filteredMetodos = useMemo(() => {
    return metodosConServicios.filter((metodo) => {
      const matchesSearch =
        metodo.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metodo.titular.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metodo.identificador.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPais = paisFilter === 'todos' || metodo.pais === paisFilter;
      return matchesSearch && matchesPais;
    });
  }, [metodosConServicios, searchQuery, paisFilter]);

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
      width: '20%',
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
      width: '25%',
    },
    {
      key: 'tipoCuenta',
      header: 'Tipo Cuenta',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (item) => <span>{item.tipoCuenta ? tipoCuentaLabels[item.tipoCuenta] : '-'}</span>,
    },
    {
      key: 'identificador',
      header: 'Identificador',
      sortable: false,
      align: 'center',
      width: '18%',
      render: (item) => <span className="text-sm">{item.identificador}</span>,
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
              placeholder="Buscar por método, titular, alias..."
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
        title="Eliminar Método de Pago"
        description={`¿Estás seguro de que quieres eliminar el método "${metodoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
