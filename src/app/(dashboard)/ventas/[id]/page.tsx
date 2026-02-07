'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { differenceInCalendarDays } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { useServiciosStore } from '@/store/serviciosStore';
import { COLLECTIONS, getById, remove, timestampToDate, update, adjustVentasActivas, queryDocuments } from '@/lib/firebase/firestore';
import { toast } from 'sonner';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { formatearFecha } from '@/lib/utils/calculations';
import { VentaDoc, VentaPago, PagoVenta, MetodoPago } from '@/types';
import { VentaPagosTable } from '@/components/ventas/VentaPagosTable';
import { usePagosVenta } from '@/hooks/use-pagos-venta';
import { crearPagoRenovacion } from '@/lib/services/pagosVentaService';

const getCicloPagoLabel = (ciclo?: string) => {
  const labels: Record<string, string> = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };
  return ciclo ? labels[ciclo] || ciclo : '—';
};


function VentaDetallePageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { updatePerfilOcupado } = useServiciosStore();

  // Estados locales para datos específicos de esta venta
  const [venta, setVenta] = useState<VentaDoc | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]); // Para dropdown de renovación (lazy loaded)
  const [servicioContrasena, setServicioContrasena] = useState<string>(''); // Contraseña del servicio
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [editarPagoDialogOpen, setEditarPagoDialogOpen] = useState(false);
  const [deletePagoDialogOpen, setDeletePagoDialogOpen] = useState(false);
  const [pagoToEdit, setPagoToEdit] = useState<VentaPago | null>(null);
  const [pagoToDelete, setPagoToDelete] = useState<VentaPago | null>(null);

  // Cargar pagos desde la colección pagosVenta
  const { pagos: pagosVenta, isLoading: loadingPagos, renovaciones, refresh: refreshPagos } = usePagosVenta(id);

  useEffect(() => {
    const loadVenta = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // 1. Cargar la venta
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (!doc) {
          setVenta(null);
          setLoading(false);
          return;
        }

        const ventaData: VentaDoc = {
          id: doc.id as string,
          clienteId: (doc.clienteId as string) || '',
          clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
          metodoPagoId: (doc.metodoPagoId as string) || undefined,
          metodoPagoNombre: (doc.metodoPagoNombre as string) || 'Sin método',
          moneda: (doc.moneda as string) || 'USD',
          pagos: Array.isArray(doc.pagos)
            ? (doc.pagos as Array<Record<string, unknown>>).map((p) => ({
                id: (p.id as string) || crypto.randomUUID(),
                fecha: p.fecha ? timestampToDate(p.fecha) : undefined,
                descripcion: (p.descripcion as string) || 'Pago',
                precio: (p.precio as number) ?? 0,
                descuento: (p.descuento as number) ?? 0,
                total: (p.total as number) ?? 0,
                metodoPagoId: (p.metodoPagoId as string) || undefined,
                metodoPagoNombre: (p.metodoPagoNombre as string) || undefined,
                moneda: (p.moneda as string) || undefined,
                isPagoInicial: (p.isPagoInicial as boolean) || false,
                cicloPago: (p.cicloPago as VentaDoc['cicloPago']) ?? undefined,
                fechaInicio: p.fechaInicio ? timestampToDate(p.fechaInicio) : undefined,
                fechaVencimiento: p.fechaVencimiento ? timestampToDate(p.fechaVencimiento) : undefined,
                notas: (p.notas as string) || undefined,
              }))
            : [],
          fechaInicio: timestampToDate(doc.fechaInicio),
          fechaFin: timestampToDate(doc.fechaFin),
          cicloPago: (doc.cicloPago as VentaDoc['cicloPago']) ?? undefined,
          categoriaId: (doc.categoriaId as string) || '',
          categoriaNombre: (doc.categoriaNombre as string) || undefined,
          servicioId: (doc.servicioId as string) || '',
          servicioNombre: (doc.servicioNombre as string) || 'Servicio',
          servicioCorreo: (doc.servicioCorreo as string) || '',
          perfilNumero: (doc.perfilNumero as number | null | undefined) ?? null,
          perfilNombre: (doc.perfilNombre as string) || '',
          precio: (doc.precio as number) ?? 0,
          descuento: (doc.descuento as number) ?? 0,
          precioFinal: (doc.precioFinal as number) ?? (doc.precio as number) ?? 0,
          codigo: (doc.codigo as string) || '',
          notas: (doc.notas as string) || '',
          estado: (doc.estado as VentaDoc['estado']) ?? 'activo',
          createdAt: doc.createdAt ? timestampToDate(doc.createdAt) : undefined,
        };
        setVenta(ventaData);

        // Cargar la contraseña del servicio (lazy load)
        if (ventaData.servicioId) {
          try {
            const servicioDoc = await getById<Record<string, unknown>>(COLLECTIONS.SERVICIOS, ventaData.servicioId);
            if (servicioDoc && servicioDoc.contrasena) {
              setServicioContrasena(servicioDoc.contrasena as string);
            }
          } catch (error) {
            console.error('Error cargando contraseña del servicio:', error);
          }
        }

        // Nota: No cargamos todos los datos relacionados aquí.
        // Los nombres ya están denormalizados en la venta.
        // Solo cargaremos metodosPago cuando el usuario abra el diálogo de renovación.
      } catch (error) {
        console.error('Error cargando venta:', error);
        toast.error('Error cargando venta', { description: error instanceof Error ? error.message : undefined });
        setVenta(null);
      } finally {
        setLoading(false);
      }
    };

    loadVenta();
  }, [id]);

  const estadoLabel = venta?.estado === 'inactivo' ? 'Inactiva' : 'Activa';
  const estadoBadgeClass =
    venta?.estado === 'inactivo'
      ? 'bg-red-600/20 text-red-400'
      : 'bg-green-600/20 text-green-400';

  const diasRestantes = useMemo(() => {
    if (!venta?.fechaFin) return 0;
    return Math.max(differenceInCalendarDays(venta.fechaFin, new Date()), 0);
  }, [venta?.fechaFin]);

  const perfilDisplay = venta?.perfilNombre?.trim() || '—';

  // Convertir PagoVenta[] a VentaPago[] para compatibilidad con VentaPagosTable
  const paymentRows = useMemo(() => {
    if (!venta || loadingPagos) return [];

    // Usar pagos de la colección pagosVenta
    if (pagosVenta.length > 0) {
      return pagosVenta.map(p => ({
        id: p.id,
        fecha: p.fecha,
        descripcion: p.isPagoInicial ? 'Pago Inicial' : `Renovación`,
        precio: p.monto,
        descuento: 0,
        total: p.monto,
        metodoPagoNombre: p.metodoPago,
        moneda: venta.moneda,
        isPagoInicial: p.isPagoInicial,
        notas: p.notas,
        cicloPago: p.cicloPago,
        // Usar las fechas guardadas en el PagoVenta
        fechaInicio: p.fechaInicio ?? null,
        fechaVencimiento: p.fechaVencimiento ?? null,
      } as VentaPago));
    }

    // Fallback: Si no hay pagos en la colección pero hay en el array legacy
    if (venta.pagos && venta.pagos.length > 0) {
      return [...venta.pagos].sort((a, b) => {
        const aTime = a.fecha ? new Date(a.fecha).getTime() : 0;
        const bTime = b.fecha ? new Date(b.fecha).getTime() : 0;
        return bTime - aTime;
      });
    }

    // Si no hay pagos en ningún lado, crear uno sintético
    return [
      {
        id: 'synthetic-initial',
        fecha: venta.createdAt || venta.fechaInicio,
        descripcion: 'Pago Inicial',
        precio: venta.precio,
        descuento: venta.descuento,
        total: venta.precioFinal,
        metodoPagoId: venta.metodoPagoId,
        metodoPagoNombre: venta.metodoPagoNombre,
        moneda: venta.moneda,
        isPagoInicial: true,
      },
    ];
  }, [venta, pagosVenta, loadingPagos]);

  // Cargar métodos de pago solo cuando se necesite (lazy loading)
  const loadMetodosPago = async () => {
    if (metodosPago.length > 0) return; // Ya están cargados
    try {
      // Solo cargar métodos de pago asociados a usuarios/clientes
      const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
        { field: 'asociadoA', operator: '==', value: 'usuario' }
      ]);
      setMetodosPago(Array.isArray(methods) ? methods : []);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      setMetodosPago([]);
    }
  };

  const handleDelete = async () => {
    if (!venta) return;
    try {
      await remove(COLLECTIONS.VENTAS, venta.id);
      if (venta.servicioId && venta.perfilNumero) {
        updatePerfilOcupado(venta.servicioId, false);
      }
      if (venta.clienteId && (venta.estado ?? 'activo') !== 'inactivo') {
        adjustVentasActivas(venta.clienteId, -1);
      }
      router.push('/ventas');
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando venta', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleConfirmRenovacion = async (data: {
    periodoRenovacion: string;
    metodoPagoId: string;
    costo: number;
    descuento?: number;
    fechaInicio: Date;
    fechaVencimiento: Date;
    notas?: string;
    moneda?: string;
  }) => {
    if (!venta) return;
    try {
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      const descuentoNumero = Number(data.descuento) || 0;
      const monto = Math.max(data.costo * (1 - descuentoNumero / 100), 0);

      // Crear pago en la colección pagosVenta
      await crearPagoRenovacion(
        venta.id,
        venta.clienteId || '',
        venta.clienteNombre,
        monto,
        metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre,
        data.metodoPagoId,                      // Denormalizado
        data.moneda || metodoPagoSeleccionado?.moneda || venta.moneda, // Denormalizado
        data.periodoRenovacion as VentaDoc['cicloPago'],
        data.notas?.trim(),
        data.fechaInicio,
        data.fechaVencimiento
      );

      // Actualizar fechas de la venta
      await update(COLLECTIONS.VENTAS, venta.id, {
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaVencimiento,
      });

      // Actualizar estado local
      setVenta({
        ...venta,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaVencimiento,
      });

      // Recargar los pagos sin recargar la página
      refreshPagos();

      // Cerrar el diálogo
      setRenovarDialogOpen(false);

      toast.success('Venta renovada exitosamente');
    } catch (error) {
      console.error('Error renovando venta:', error);
      toast.error('Error al renovar venta');
    }
  };

  const handleEditarPago = async (pago: VentaPago) => {
    await loadMetodosPago(); // Cargar métodos de pago antes de abrir el diálogo
    setPagoToEdit(pago);
    setEditarPagoDialogOpen(true);
  };

  const handleDeletePago = (pago: VentaPago) => {
    setPagoToDelete(pago);
    setDeletePagoDialogOpen(true);
  };

  const handleConfirmEditarPago = async (data: {
    periodoRenovacion: string;
    metodoPagoId: string;
    costo: number;
    descuento?: number;
    fechaInicio: Date;
    fechaVencimiento: Date;
    notas?: string;
  }) => {
    if (!venta || !pagoToEdit || !pagoToEdit.id) {
      console.error('[EditarPago] Missing data:', { venta: !!venta, pagoToEdit: !!pagoToEdit, id: pagoToEdit?.id });
      return;
    }

    try {
      console.log('[EditarPago] Updating pago:', pagoToEdit.id);
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      const descuentoNumero = Number(data.descuento) || 0;
      const monto = Math.max(data.costo * (1 - descuentoNumero / 100), 0);

      // Actualizar el pago en la colección pagosVenta
      await update(COLLECTIONS.PAGOS_VENTA, pagoToEdit.id, {
        monto,
        metodoPago: metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre,
        cicloPago: data.periodoRenovacion as VentaDoc['cicloPago'],
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        notas: data.notas?.trim() || '',
      });

      // Verificar si este es el pago más reciente (index 0 en paymentRows)
      const pagoEditadoIndex = paymentRows.findIndex(p => p.id === pagoToEdit.id);
      const esPagoMasReciente = pagoEditadoIndex === 0;

      // Si es el pago más reciente, actualizar las fechas de la venta
      if (esPagoMasReciente) {
        await update(COLLECTIONS.VENTAS, venta.id, {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaVencimiento,
        });

        // Actualizar estado local
        setVenta({
          ...venta,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaVencimiento,
        });
      }

      console.log('[EditarPago] Successfully updated, refreshing...');

      setEditarPagoDialogOpen(false);
      setPagoToEdit(null);

      // Recargar los pagos
      refreshPagos();

      toast.success('Pago actualizado exitosamente');
    } catch (error) {
      console.error('[EditarPago] Error actualizando pago:', error);
      toast.error('Error al actualizar pago');
    }
  };

  const handleConfirmDeletePago = async () => {
    if (!venta || !pagoToDelete || !pagoToDelete.id) {
      console.error('[DeletePago] Missing data:', { venta: !!venta, pagoToDelete: !!pagoToDelete, id: pagoToDelete?.id });
      return;
    }

    try {
      console.log('[DeletePago] Deleting pago:', pagoToDelete.id);

      // Eliminar el pago de la colección pagosVenta
      await remove(COLLECTIONS.PAGOS_VENTA, pagoToDelete.id);

      // Recargar los pagos para obtener la lista actualizada
      const pagosActualizados = await queryDocuments<PagoVenta>(COLLECTIONS.PAGOS_VENTA, [
        { field: 'ventaId', operator: '==', value: venta.id }
      ]);

      // Ordenar por fecha (más reciente primero)
      const sorted = pagosActualizados.sort((a, b) => {
        const dateA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
        const dateB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
        return dateB.getTime() - dateA.getTime();
      });

      // El pago más reciente después de eliminar
      const pagoMasReciente = sorted[0];

      // Actualizar las fechas de la venta con las del pago más reciente
      if (pagoMasReciente && pagoMasReciente.fechaInicio && pagoMasReciente.fechaVencimiento) {
        await update(COLLECTIONS.VENTAS, venta.id, {
          fechaInicio: pagoMasReciente.fechaInicio,
          fechaFin: pagoMasReciente.fechaVencimiento,
        });

        // Actualizar estado local
        setVenta({
          ...venta,
          fechaInicio: pagoMasReciente.fechaInicio,
          fechaFin: pagoMasReciente.fechaVencimiento,
        });
      }

      console.log('[DeletePago] Successfully deleted, refreshing...');

      setDeletePagoDialogOpen(false);
      setPagoToDelete(null);

      // Recargar los pagos
      refreshPagos();

      toast.success('Pago eliminado exitosamente');
    } catch (error) {
      console.error('[DeletePago] Error eliminando pago:', error);
      toast.error('Error al eliminar pago');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Cargando venta...</h1>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Venta no encontrada</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            {' / '}
            <Link href="/ventas" className="hover:text-foreground transition-colors">Ventas</Link>
            {' / '}
            <span className="text-foreground">Detalles</span>
          </p>
        </div>
        <Card className="p-6">
          <p className="text-muted-foreground">No se encontró la venta solicitada.</p>
          <Link href="/ventas" className="inline-block mt-4 text-primary hover:underline">
            Volver a Ventas
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ventas">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalles de Venta: {venta.clienteNombre}</h1>
            <p className="text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
              {' / '}
              <Link href="/ventas" className="hover:text-foreground transition-colors">Ventas</Link>
              {' / '}
              <span className="text-foreground">{venta.clienteNombre}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={async () => {
              await loadMetodosPago(); // Cargar métodos de pago solo cuando se necesite
              setRenovarDialogOpen(true);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Renovar
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/ventas/${venta.id}/editar`)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_0.8fr] gap-4">
        <Card className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Información General</h2>
              <p className="text-sm text-muted-foreground">
                Resumen de la suscripción del servicio {venta.servicioNombre}.
              </p>
            </div>
            <Badge className={estadoBadgeClass}>{estadoLabel}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-y-6 md:gap-x-64">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              {venta.clienteId ? (
                <Link href={`/usuarios/${venta.clienteId}`} className="text-sm font-medium text-purple-500 hover:underline">
                  {venta.clienteNombre}
                </Link>
              ) : (
                <p className="text-sm font-medium">{venta.clienteNombre}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Método de Pago</p>
              <p className="text-sm font-medium text-purple-500">{venta.metodoPagoNombre || 'Sin método'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ciclo de pago</p>
              <p className="text-sm font-medium">{getCicloPagoLabel(venta.cicloPago)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoría</p>
              <p className="text-sm font-medium">{venta.categoriaNombre || 'Sin categoría'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Servicio</p>
              <p className="text-sm font-medium">{venta.servicioCorreo || venta.servicioNombre}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contraseña</p>
              <p className="text-sm font-medium">{servicioContrasena || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perfil</p>
              <p className="text-sm font-medium text-green-400">{perfilDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="text-sm font-medium">{venta.codigo || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renovaciones</p>
              <p className="text-sm font-medium">{renovaciones}</p>
            </div>
          </div>

          <div className="border-t pt-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-y-6 md:gap-x-64">
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {venta.fechaInicio ? formatearFecha(new Date(venta.fechaInicio)) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {venta.fechaFin ? formatearFecha(new Date(venta.fechaFin)) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días Restantes</p>
              <Badge className="mt-1 bg-green-600/20 text-green-400">
                {diasRestantes} días restantes
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                venta.estado === 'inactivo' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}
            >
              <User className={`h-7 w-7 ${venta.estado === 'inactivo' ? 'text-red-400' : 'text-green-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {venta.estado === 'inactivo' ? 'Perfil sin Asignar' : 'Perfil Asignado'}
              </h3>
              <p className="text-sm text-muted-foreground">Información del servicio en uso</p>
            </div>
            <p className={`text-sm font-medium ${venta.estado === 'inactivo' ? 'text-red-400' : 'text-green-400'}`}>
              {venta.estado === 'inactivo' ? 'No asignado' : (venta.servicioCorreo || venta.servicioNombre)}
            </p>
            <p className="text-xs text-muted-foreground">
              {venta.estado === 'inactivo' ? 'El perfil ha sido inactivado' : 'Perfil asignado correctamente'}
            </p>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Servicio:</span>
              <span className="font-medium">{venta.servicioCorreo || venta.servicioNombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Perfil:</span>
              <span className="font-medium">{venta.perfilNumero ? `Perfil ${venta.perfilNumero}` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Asignado a:</span>
              <span className="font-medium">{venta.clienteNombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado:</span>
              <Badge className={estadoBadgeClass}>{estadoLabel}</Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_0.8fr] gap-4">
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Historial de Pagos</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Registro completo de todos los pagos realizados para esta venta.
            </p>
          </div>

          <VentaPagosTable
            pagos={paymentRows}
            moneda={venta.moneda}
            canManagePagos={true}
            onEdit={handleEditarPago}
            onDelete={handleDeletePago}
          />
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Notas</h2>
          <div className="rounded-lg border bg-muted/20 p-4 text-sm whitespace-pre-line">
            {venta.notas?.trim() ? venta.notas : 'Sin notas'}
          </div>
        </Card>
      </div>

      <PagoDialog
        context="venta"
        mode="renew"
        open={renovarDialogOpen}
        onOpenChange={setRenovarDialogOpen}
        venta={venta}
        metodosPago={metodosPago}
        categoriaPlanes={undefined}
        tipoPlan={undefined}
        onConfirm={handleConfirmRenovacion}
      />

      <PagoDialog
        context="venta"
        mode="edit"
        open={editarPagoDialogOpen}
        onOpenChange={setEditarPagoDialogOpen}
        venta={venta}
        pago={pagoToEdit}
        metodosPago={metodosPago}
        categoriaPlanes={undefined}
        tipoPlan={undefined}
        onConfirm={handleConfirmEditarPago}
      />

      <ConfirmDialog
        open={deletePagoDialogOpen}
        onOpenChange={setDeletePagoDialogOpen}
        onConfirm={handleConfirmDeletePago}
        title="Eliminar pago"
        description="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Eliminar Venta"
        description={`¿Estás seguro de que quieres eliminar la venta de "${venta.clienteNombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

export default function VentaDetallePage() {
  return (
    <ModuleErrorBoundary moduleName="Detalle de Venta">
      <VentaDetallePageContent />
    </ModuleErrorBoundary>
  );
}






