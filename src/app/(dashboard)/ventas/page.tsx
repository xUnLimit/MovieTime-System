'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { VentasMetrics } from '@/components/ventas/VentasMetrics';
import { VentasTable } from '@/components/ventas/VentasTable';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useVentasStore } from '@/store/ventasStore';
import { toast } from 'sonner';

function VentasPageContent() {
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { fetchServicios } = useServiciosStore();
  const { ventas, fetchVentas, deleteVenta } = useVentasStore();

  const [activeTab, setActiveTab] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [deleteVentaId, setDeleteVentaId] = useState<string | null>(null);
  const [deleteVentaServicioId, setDeleteVentaServicioId] = useState<string | undefined>(undefined);
  const [deleteVentaPerfilNumero, setDeleteVentaPerfilNumero] = useState<number | null | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchServicios();
    fetchVentas();
  }, [fetchCategorias, fetchServicios, fetchVentas]);

  const tituloTab = useMemo(() => {
    switch (activeTab) {
      case 'activas':
        return 'Ventas Activas';
      case 'inactivas':
        return 'Ventas Inactivas';
      default:
        return 'Todas las Ventas';
    }
  }, [activeTab]);

  const handleDeleteVenta = (ventaId: string, servicioId?: string, perfilNumero?: number | null) => {
    setDeleteVentaId(ventaId);
    setDeleteVentaServicioId(servicioId);
    setDeleteVentaPerfilNumero(perfilNumero ?? null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteVenta = async () => {
    if (!deleteVentaId) return;
    try {
      await deleteVenta(deleteVentaId, deleteVentaServicioId, deleteVentaPerfilNumero);
      toast.success('Venta eliminada correctamente');
      setDeleteVentaId(null);
      setDeleteVentaServicioId(undefined);
      setDeleteVentaPerfilNumero(undefined);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando venta', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Ventas</span>
          </p>
        </div>
        <Link href="/ventas/crear">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      <VentasMetrics ventas={ventas} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="todas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Todas
          </TabsTrigger>
          <TabsTrigger
            value="activas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Activas
          </TabsTrigger>
          <TabsTrigger
            value="inactivas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Inactivas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <VentasTable
            ventas={ventas}
            categorias={categorias}
            estadoFiltro={activeTab}
            title={tituloTab}
            onDelete={handleDeleteVenta}
          />
        </TabsContent>
      </Tabs>
    </div>
    <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteVentaId(null);
            setDeleteVentaServicioId(undefined);
            setDeleteVentaPerfilNumero(undefined);
          }
        }}
        onConfirm={handleConfirmDeleteVenta}
        title="Eliminar Venta"
        description="¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}

export default function VentasPage() {
  return (
    <ModuleErrorBoundary moduleName="Ventas">
      <VentasPageContent />
    </ModuleErrorBoundary>
  );
}
