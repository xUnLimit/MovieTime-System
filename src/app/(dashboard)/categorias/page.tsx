'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CategoriasTable } from '@/components/categorias/CategoriasTable';
import { CategoriaDialog } from '@/components/categorias/CategoriaDialog';
import { CategoriasFilters } from '@/components/categorias/CategoriasFilters';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Categoria } from '@/types';

function CategoriasPageContent() {
  const { categorias, fetchCategorias } = useCategoriasStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const handleEdit = useCallback((categoria: Categoria) => {
    setEditingCategoria(categoria);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingCategoria(null);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCategoria(null);
    }
  }, []);

  const filteredCategorias = useMemo(() =>
    tipoFilter === 'todos'
      ? categorias
      : categorias.filter((c) =>
          c.tipo === 'ambos' ? true : c.tipo === tipoFilter
        ),
    [categorias, tipoFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de servicios
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <CategoriasFilters tipoFilter={tipoFilter} onFilterChange={setTipoFilter} />

      <CategoriasTable categorias={filteredCategorias} onEdit={handleEdit} />

      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        categoria={editingCategoria}
      />
    </div>
  );
}

export default function CategoriasPage() {
  return (
    <ModuleErrorBoundary moduleName="Categorías">
      <CategoriasPageContent />
    </ModuleErrorBoundary>
  );
}
