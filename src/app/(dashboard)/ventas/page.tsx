'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { VentasMetrics, VentaDoc } from '@/components/ventas/VentasMetrics';
import { VentasTable } from '@/components/ventas/VentasTable';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { COLLECTIONS, getAll, remove, timestampToDate } from '@/lib/firebase/firestore';

function VentasPageContent() {
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { fetchServicios, updatePerfilOcupado } = useServiciosStore();

  const [activeTab, setActiveTab] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [ventas, setVentas] = useState<VentaDoc[]>([]);
  const [deleteVentaId, setDeleteVentaId] = useState<string | null>(null);
  const [deleteVentaServicioId, setDeleteVentaServicioId] = useState<string | undefined>(undefined);
  const [deleteVentaPerfilNumero, setDeleteVentaPerfilNumero] = useState<number | null | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchServicios();
  }, [fetchCategorias, fetchServicios]);

  useEffect(() => {
    const loadVentas = async () => {
      try {
        const docs = await getAll<Record<string, unknown>>(COLLECTIONS.VENTAS);
        const mapped = docs.map((doc) => ({
          id: doc.id as string,
          clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
          metodoPagoNombre: (doc.metodoPagoNombre as string) || 'Sin metodo',
          moneda: (doc.moneda as string) || 'USD',
          fechaInicio: timestampToDate(doc.fechaInicio),
          fechaFin: timestampToDate(doc.fechaFin),
          cicloPago: (doc.cicloPago as VentaDoc['cicloPago']) ?? undefined,
          categoriaId: (doc.categoriaId as string) || '',
          servicioId: (doc.servicioId as string) || '',
          servicioNombre: (doc.servicioNombre as string) || 'Sin servicio',
          servicioCorreo: (doc.servicioCorreo as string) || '',
          perfilNumero: (doc.perfilNumero as number | null | undefined) ?? undefined,
          precio: (doc.precio as number) ?? 0,
          descuento: (doc.descuento as number) ?? 0,
          precioFinal: (doc.precioFinal as number) ?? (doc.precio as number) ?? 0,
          totalVenta: (doc.totalVenta as number) ?? undefined,
        }));
        setVentas(mapped);
      } catch (error) {
        console.error('Error cargando ventas:', error);
        setVentas([]);
      }
    };

    loadVentas();
  }, []);

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
      await remove(COLLECTIONS.VENTAS, deleteVentaId);
      if (deleteVentaServicioId && deleteVentaPerfilNumero) {
        updatePerfilOcupado(deleteVentaServicioId, false);
      }
      setVentas((prev) => prev.filter((venta) => venta.id !== deleteVentaId));
      setDeleteVentaId(null);
      setDeleteVentaServicioId(undefined);
      setDeleteVentaPerfilNumero(undefined);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error eliminando venta:', error);
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
