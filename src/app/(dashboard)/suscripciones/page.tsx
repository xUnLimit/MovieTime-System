'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SuscripcionesMetrics } from '@/components/suscripciones/SuscripcionesMetrics';
import { SuscripcionesFilters } from '@/components/suscripciones/SuscripcionesFilters';
import { SuscripcionesTable } from '@/components/suscripciones/SuscripcionesTable';
import { SuscripcionDialog } from '@/components/suscripciones/SuscripcionDialog';
import { useSuscripcionesStore } from '@/store/suscripcionesStore';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Suscripcion } from '@/types';

function SuscripcionesPageContent() {
  const { suscripciones, fetchSuscripciones } = useSuscripcionesStore();
  const { clientes, fetchClientes } = useClientesStore();
  const { revendedores, fetchRevendedores } = useRevendedoresStore();
  const { servicios, fetchServicios } = useServiciosStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const { categorias, fetchCategorias } = useCategoriasStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<Suscripcion | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [cicloFilter, setCicloFilter] = useState('all');

  useEffect(() => {
    fetchSuscripciones();
    fetchClientes();
    fetchRevendedores();
    fetchServicios();
    fetchMetodosPago();
    fetchCategorias();
  }, [
    fetchSuscripciones,
    fetchClientes,
    fetchRevendedores,
    fetchServicios,
    fetchMetodosPago,
    fetchCategorias,
  ]);

  const filteredSuscripciones = useMemo(() => {
    return suscripciones.filter((suscripcion) => {
      const matchesSearch =
        suscripcion.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suscripcion.revendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suscripcion.servicioNombre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = tipoFilter === 'all' || suscripcion.tipo === tipoFilter;

      const matchesCategoria =
        categoriaFilter === 'all' || suscripcion.categoriaId === categoriaFilter;

      const matchesEstado = estadoFilter === 'all' || suscripcion.estado === estadoFilter;

      const matchesCiclo = cicloFilter === 'all' || suscripcion.cicloPago === cicloFilter;

      return (
        matchesSearch &&
        matchesTipo &&
        matchesCategoria &&
        matchesEstado &&
        matchesCiclo
      );
    });
  }, [suscripciones, searchTerm, tipoFilter, categoriaFilter, estadoFilter, cicloFilter]);

  const handleCreate = useCallback(() => {
    setSelectedSuscripcion(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((suscripcion: Suscripcion) => {
    setSelectedSuscripcion(suscripcion);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">
            Gestiona las suscripciones y suscripciones activas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Suscripcion
        </Button>
      </div>

      <SuscripcionesMetrics suscripciones={suscripciones} />

      <SuscripcionesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        tipoFilter={tipoFilter}
        setTipoFilter={setTipoFilter}
        categoriaFilter={categoriaFilter}
        setCategoriaFilter={setCategoriaFilter}
        estadoFilter={estadoFilter}
        setEstadoFilter={setEstadoFilter}
        cicloFilter={cicloFilter}
        setCicloFilter={setCicloFilter}
        categorias={categorias}
      />

      <SuscripcionesTable suscripciones={filteredSuscripciones} onEdit={handleEdit} />

      <SuscripcionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suscripcion={selectedSuscripcion}
        clientes={clientes}
        revendedores={revendedores}
        servicios={servicios}
        metodosPago={metodosPago}
        categorias={categorias}
      />
    </div>
  );
}

export default function SuscripcionesPage() {
  return (
    <ModuleErrorBoundary moduleName="Suscripciones">
      <SuscripcionesPageContent />
    </ModuleErrorBoundary>
  );
}
