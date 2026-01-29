'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ServiciosTable } from '@/components/servicios/ServiciosTable';
import { ServicioDialog } from '@/components/servicios/ServicioDialog';
import { ServiciosMetrics } from '@/components/servicios/ServiciosMetrics';
import { ServiciosFilters } from '@/components/servicios/ServiciosFilters';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Servicio } from '@/types';

function ServiciosPageContent() {
  const { servicios, fetchServicios } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos');

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, [fetchServicios, fetchCategorias]);

  const handleEdit = useCallback((servicio: Servicio) => {
    setEditingServicio(servicio);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingServicio(null);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingServicio(null);
    }
  }, []);

  const filteredServicios = useMemo(() =>
    categoriaFilter === 'todos'
      ? servicios
      : servicios.filter((s) => s.categoriaId === categoriaFilter),
    [servicios, categoriaFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona los servicios de streaming disponibles
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      <ServiciosMetrics servicios={servicios} />

      <ServiciosFilters
        categorias={categorias}
        categoriaFilter={categoriaFilter}
        onFilterChange={setCategoriaFilter}
      />

      <ServiciosTable servicios={filteredServicios} onEdit={handleEdit} />

      <ServicioDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        servicio={editingServicio}
        categorias={categorias}
      />
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <ModuleErrorBoundary moduleName="Servicios">
      <ServiciosPageContent />
    </ModuleErrorBoundary>
  );
}
