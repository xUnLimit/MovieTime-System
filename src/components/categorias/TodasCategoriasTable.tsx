'use client';

import { useState, useMemo } from 'react';
import { Categoria } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useCategoriasStore } from '@/store/categoriasStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface TodasCategoriasTableProps {
  categorias: Categoria[];
  onEdit: (categoria: Categoria) => void;
  title?: string;
}

export function TodasCategoriasTable({ categorias, onEdit, title = 'Todas las categorías' }: TodasCategoriasTableProps) {
  const { deleteCategoria } = useCategoriasStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');

  // Filtrar categorías
  const filteredCategorias = useMemo(() => {
    return categorias.filter((categoria) => {
      const matchesSearch = categoria.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTipo = tipoFilter === 'todos' || categoria.tipo === tipoFilter || categoria.tipo === 'ambos';
      return matchesSearch && matchesTipo;
    });
  }, [categorias, searchQuery, tipoFilter]);

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
    ambos: 'Cliente',
  };

  const columns: Column<Categoria>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      width: '25%',
      render: (item) => (
        <span className="font-medium">{item.nombre}</span>
      ),
    },
    {
      key: 'tipo',
      header: 'Asociado a',
      sortable: true,
      align: 'center',
      width: '20%',
      render: (item) => {
        // Para "ambos", mostrar ambos tipos
        if (item.tipo === 'ambos') {
          return <span>Cliente, Revendedor</span>;
        }
        return <span>{tipoLabels[item.tipo]}</span>;
      },
    },
    {
      key: 'categoria',
      header: 'Tipo de Categoría',
      sortable: false,
      align: 'center',
      width: '25%',
      render: () => <span>Plataforma de Streaming</span>,
    },
    {
      key: 'activo',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (item) => (
        <Badge variant={item.activo ? 'default' : 'secondary'}>
          {item.activo ? 'Activa' : 'Inactiva'}
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
              placeholder="Buscar por nombre o tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="revendedor">Revendedor</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredCategorias}
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
        title="Eliminar Categoría"
        description={`¿Estás seguro de que quieres eliminar la categoría "${categoriaToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
