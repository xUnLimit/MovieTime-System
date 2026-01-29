'use client';

import { useState } from 'react';
import { Categoria } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface CategoriasTableProps {
  categorias: Categoria[];
  onEdit: (categoria: Categoria) => void;
}

export function CategoriasTable({ categorias, onEdit }: CategoriasTableProps) {
  const { updateCategoria, deleteCategoria } = useCategoriasStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);

  const handleToggleActive = async (categoria: Categoria) => {
    try {
      await updateCategoria(categoria.id, { activo: !categoria.activo });
      toast.success(`Categoría ${categoria.activo ? 'desactivada' : 'activada'}`);
    } catch (error) {
      toast.error('Error al actualizar categoría');
    }
  };

  const handleDelete = (categoria: Categoria) => {
    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoriaToDelete) {
      try {
        await deleteCategoria(categoriaToDelete.id);
        toast.success('Categoría eliminada');
      } catch (error) {
        toast.error('Error al eliminar categoría');
      }
    }
  };

  const tipoLabels: Record<string, string> = {
    cliente: 'Cliente',
    revendedor: 'Revendedor',
    ambos: 'Ambos',
  };

  const columns: Column<Categoria>[] = [
    {
      key: 'nombre',
      header: 'Categoría',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.iconUrl && (
            <span className="text-2xl" style={{ color: item.color }}>
              {item.iconUrl}
            </span>
          )}
          <span className="font-medium">{item.nombre}</span>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: true,
      render: (item) => <Badge variant="outline">{tipoLabels[item.tipo]}</Badge>,
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item) => (
        <Switch
          checked={item.activo}
          onCheckedChange={() => handleToggleActive(item)}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={categorias}
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
        title="Eliminar Categoría"
        description={`¿Estás seguro de que quieres eliminar la categoría "${categoriaToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
