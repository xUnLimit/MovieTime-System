'use client';

import { useState } from 'react';
import { Servicio } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Copy } from 'lucide-react';
import { useServiciosStore } from '@/store/serviciosStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface ServiciosTableProps {
  servicios: Servicio[];
  onEdit: (servicio: Servicio) => void;
}

export function ServiciosTable({ servicios, onEdit }: ServiciosTableProps) {
  const { deleteServicio } = useServiciosStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);

  const handleDelete = (servicio: Servicio) => {
    setServicioToDelete(servicio);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (servicioToDelete) {
      try {
        await deleteServicio(servicioToDelete.id);
        toast.success('Servicio eliminado');
      } catch (error) {
        toast.error('Error al eliminar servicio', { description: error instanceof Error ? error.message : undefined });
      }
    }
  };

  const handleCopyCredentials = (servicio: Servicio) => {
    const text = `Correo: ${servicio.correo}\nContraseña: ${servicio.contrasena}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciales copiadas');
  };

  const columns: Column<Servicio>[] = [
    {
      key: 'nombre',
      header: 'Servicio',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.nombre}</div>
          <div className="text-sm text-muted-foreground">{item.categoriaNombre}</div>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: true,
      render: (item) => (
        <Badge variant={item.tipo === 'cuenta_completa' ? 'default' : 'secondary'}>
          {item.tipo === 'cuenta_completa' ? 'Cuenta Completa' : 'Perfiles'}
        </Badge>
      ),
    },
    {
      key: 'perfiles',
      header: 'Perfiles',
      render: (item) => (
        <div className="w-32">
          <div className="flex justify-between text-sm mb-1">
            <span>{item.perfilesOcupados}</span>
            <span className="text-muted-foreground">de {item.perfilesDisponibles}</span>
          </div>
          <Progress
            value={(item.perfilesOcupados / item.perfilesDisponibles) * 100}
            className="h-2"
          />
        </div>
      ),
    },
    {
      key: 'correo',
      header: 'Credenciales',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="text-sm">{item.correo}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyCredentials(item);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'costoServicio',
      header: 'Costo',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">${(item.costoServicio * item.perfilesDisponibles).toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">
            ${item.costoServicio.toFixed(2)}/perfil
          </div>
        </div>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item) => (
        <Badge variant={item.activo ? 'default' : 'secondary'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={servicios}
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
        title="Eliminar Servicio"
        description={`¿Estás seguro de que quieres eliminar el servicio "${servicioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
