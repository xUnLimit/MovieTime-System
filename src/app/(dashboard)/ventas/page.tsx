'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { VentasMetrics } from '@/components/ventas/VentasMetrics';
import { VentasFilters } from '@/components/ventas/VentasFilters';
import { VentasTable } from '@/components/ventas/VentasTable';
import { VentaDialog } from '@/components/ventas/VentaDialog';
import { useVentasStore } from '@/store/ventasStore';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Venta } from '@/types';

function VentasPageContent() {
  const { ventas, fetchVentas } = useVentasStore();
  const { clientes, fetchClientes } = useClientesStore();
  const { revendedores, fetchRevendedores } = useRevendedoresStore();
  const { servicios, fetchServicios } = useServiciosStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const { categorias, fetchCategorias } = useCategoriasStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [cicloFilter, setCicloFilter] = useState('all');

  useEffect(() => {
    fetchVentas();
    fetchClientes();
    fetchRevendedores();
    fetchServicios();
    fetchMetodosPago();
    fetchCategorias();
  }, [
    fetchVentas,
    fetchClientes,
    fetchRevendedores,
    fetchServicios,
    fetchMetodosPago,
    fetchCategorias,
  ]);

  const filteredVentas = useMemo(() => {
    return ventas.filter((venta) => {
      const matchesSearch =
        venta.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venta.revendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venta.servicioNombre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = tipoFilter === 'all' || venta.tipo === tipoFilter;

      const matchesCategoria =
        categoriaFilter === 'all' || venta.categoriaId === categoriaFilter;

      const matchesEstado = estadoFilter === 'all' || venta.estado === estadoFilter;

      const matchesCiclo = cicloFilter === 'all' || venta.cicloPago === cicloFilter;

      return (
        matchesSearch &&
        matchesTipo &&
        matchesCategoria &&
        matchesEstado &&
        matchesCiclo
      );
    });
  }, [ventas, searchTerm, tipoFilter, categoriaFilter, estadoFilter, cicloFilter]);

  const handleCreate = useCallback(() => {
    setSelectedVenta(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((venta: Venta) => {
    setSelectedVenta(venta);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona las ventas y suscripciones activas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      <VentasMetrics ventas={ventas} />

      <VentasFilters
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

      <VentasTable ventas={filteredVentas} onEdit={handleEdit} />

      <VentaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        venta={selectedVenta}
        clientes={clientes}
        revendedores={revendedores}
        servicios={servicios}
        metodosPago={metodosPago}
        categorias={categorias}
      />
    </div>
  );
}

export default function VentasPage() {
  return (
    <ModuleErrorBoundary moduleName="Ventas">
      <VentasPageContent />
    </ModuleErrorBoundary>
  );
}
