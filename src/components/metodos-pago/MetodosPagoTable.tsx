'use client';

import { useState } from 'react';
import { MetodoPago } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface MetodosPagoTableProps {
  metodosPago: MetodoPago[];
  onEdit: (metodo: MetodoPago) => void;
}

export function MetodosPagoTable({ metodosPago, onEdit }: MetodosPagoTableProps) {
  const { deleteMetodoPago } = useMetodosPagoStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metodoToDelete, setMetodoToDelete] = useState<MetodoPago | null>(null);

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

  const tipoLabels: Record<string, string> = {
    banco: 'Banco',
    yappy: 'Yappy',
    binance: 'Binance',
  };

  const tipoCuentaLabels: Record<string, string> = {
    ahorros: 'Ahorros',
    corriente: 'Corriente',
    telefono: 'Teléfono',
    wallet: 'Wallet',
  };

  const maskIdentifier = (identifier: string) => {
    if (identifier.length <= 4) return identifier;
    return '****' + identifier.slice(-4);
  };

  const columns: Column<MetodoPago>[] = [
    {
      key: 'nombre',
      header: 'Nombre / Tipo',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="font-medium">{item.nombre}</div>
          <Badge variant="outline">{tipoLabels[item.tipo]}</Badge>
        </div>
      ),
    },
    {
      key: 'banco',
      header: 'Banco / País',
      render: (item) => (
        <span className="text-sm">
          {item.tipo === 'banco' ? item.banco || '-' : item.pais || '-'}
        </span>
      ),
    },
    {
      key: 'titular',
      header: 'Titular',
      sortable: true,
    },
    {
      key: 'identificador',
      header: 'Identificador',
      render: (item) => (
        <div className="space-y-1">
          <div className="text-sm font-mono">{maskIdentifier(item.identificador)}</div>
          {item.tipoCuenta && (
            <Badge variant="secondary" className="text-xs">
              {tipoCuentaLabels[item.tipoCuenta]}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'asociaciones',
      header: 'Asociaciones',
      render: (item) => {
        const count = item.asociadoUsuarios + item.asociadoServicios;
        return <span className="text-sm text-muted-foreground">{count}</span>;
      },
    },
  ];

  return (
    <>
      <DataTable
        data={metodosPago}
        columns={columns}
        actions={(item) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

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
