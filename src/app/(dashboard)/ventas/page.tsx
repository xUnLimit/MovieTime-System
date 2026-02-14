'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteVentaDialog } from '@/components/shared/ConfirmDeleteVentaDialog';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { VentasTable } from '@/components/ventas/VentasTable';
import { VentasMetrics } from '@/components/ventas/VentasMetrics';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useVentasStore } from '@/store/ventasStore';
import { toast } from 'sonner';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { VentaDoc } from '@/types';
import { FilterOption } from '@/lib/firebase/pagination';
import { getVentasConUltimoPago, VentaConUltimoPago } from '@/lib/services/ventaSyncService';

function VentasPageContent() {
  const { deleteVenta, fetchCounts } = useVentasStore();

  const [activeTab, setActiveTab] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [pageSize, setPageSize] = useState(10);
  const [deleteVentaId, setDeleteVentaId] = useState<string | null>(null);
  const [deleteVentaServicioId, setDeleteVentaServicioId] = useState<string | undefined>(undefined);
  const [deleteVentaPerfilNumero, setDeleteVentaPerfilNumero] = useState<number | null | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Construir filtros basados en el tab activo
  const filters = useMemo((): FilterOption[] => {
    if (activeTab === 'activas') {
      return [{ field: 'estado', operator: '==', value: 'activo' }];
    } else if (activeTab === 'inactivas') {
      return [{ field: 'estado', operator: '==', value: 'inactivo' }];
    }
    return [];
  }, [activeTab]);

  // Paginación server-side
  const { data: ventasPaginadas, isLoading, hasMore, page, hasPrevious, next, previous, refresh } = useServerPagination<VentaDoc>({
    collectionName: COLLECTIONS.VENTAS,
    filters,
    pageSize,
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });

  // Cargar datos del último pago desde PagoVenta
  const [ventasConUltimoPago, setVentasConUltimoPago] = useState<VentaConUltimoPago[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(false);

  useEffect(() => {
    const cargarDatosUltimoPago = async () => {
      if (ventasPaginadas.length === 0) {
        setVentasConUltimoPago([]);
        return;
      }

      setLoadingDatos(true);
      try {
        const ventasConPagoActual = await getVentasConUltimoPago(ventasPaginadas);
        setVentasConUltimoPago(ventasConPagoActual);
      } catch (error) {
        console.error('Error cargando datos del último pago de ventas:', error);
        setVentasConUltimoPago(ventasPaginadas as VentaConUltimoPago[]);
      } finally {
        setLoadingDatos(false);
      }
    };

    cargarDatosUltimoPago();
  }, [ventasPaginadas]);

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

  const handleConfirmDeleteVenta = async (deletePagos: boolean) => {
    if (!deleteVentaId) return;
    try {
      await deleteVenta(deleteVentaId, deleteVentaServicioId, deleteVentaPerfilNumero, deletePagos);
      toast.success(deletePagos ? 'Venta y pagos eliminados correctamente' : 'Venta eliminada correctamente');
      setDeleteVentaId(null);
      setDeleteVentaServicioId(undefined);
      setDeleteVentaPerfilNumero(undefined);
      setDeleteDialogOpen(false);
      // Refrescar la lista y las métricas después de eliminar
      refresh();
      fetchCounts();
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando venta', { description: error instanceof Error ? error.message : undefined });
    }
  };

  // Escuchar eventos de cambios en ventas desde otros módulos
  useEffect(() => {
    const handleVentaChange = () => {
      refresh();
      fetchCounts();
    };

    window.addEventListener('venta-created', handleVentaChange);
    window.addEventListener('venta-updated', handleVentaChange);
    window.addEventListener('venta-deleted', handleVentaChange);

    return () => {
      window.removeEventListener('venta-created', handleVentaChange);
      window.removeEventListener('venta-updated', handleVentaChange);
      window.removeEventListener('venta-deleted', handleVentaChange);
    };
  }, [refresh, fetchCounts]);

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

      <VentasMetrics />

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
            ventas={ventasConUltimoPago}
            isLoading={isLoading || loadingDatos}
            title={tituloTab}
            onDelete={handleDeleteVenta}
            // Paginación
            hasMore={hasMore}
            hasPrevious={hasPrevious}
            page={page}
            onNext={next}
            onPrevious={previous}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); refresh(); }}
          />
        </TabsContent>
      </Tabs>
    </div>
    <ConfirmDeleteVentaDialog
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
