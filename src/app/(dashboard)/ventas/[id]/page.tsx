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
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useUsuariosStore } from '@/store/usuariosStore';
import { COLLECTIONS, getById, remove, timestampToDate, update, adjustVentasActivas } from '@/lib/firebase/firestore';
import { toast } from 'sonner';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { formatearFecha, deriveTopLevelFromPagos } from '@/lib/utils/calculations';
import { VentaDoc, VentaPago } from '@/types';
import { VentaPagosTable } from '@/components/ventas/VentaPagosTable';

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

  const { categorias, fetchCategorias } = useCategoriasStore();
  const { servicios, fetchServicios, updatePerfilOcupado } = useServiciosStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const { usuarios, fetchUsuarios } = useUsuariosStore();

  const [venta, setVenta] = useState<VentaDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [editarPagoDialogOpen, setEditarPagoDialogOpen] = useState(false);
  const [deletePagoDialogOpen, setDeletePagoDialogOpen] = useState(false);
  const [pagoToEdit, setPagoToEdit] = useState<VentaPago | null>(null);
  const [pagoToDelete, setPagoToDelete] = useState<VentaPago | null>(null);

  useEffect(() => {
    fetchCategorias();
    fetchServicios();
    fetchMetodosPago();
    fetchUsuarios();
  }, [fetchCategorias, fetchServicios, fetchMetodosPago, fetchUsuarios]);

  useEffect(() => {
    const loadVenta = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (!doc) {
          setVenta(null);
          return;
        }
        setVenta({
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
        });
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

  const servicio = servicios.find((s) => s.id === venta?.servicioId);
  const categoria = categorias.find((c) => c.id === venta?.categoriaId);
  const metodoPago = metodosPago.find((m) => m.id === venta?.metodoPagoId);
  const cliente = usuarios.find((u) => u.id === venta?.clienteId);

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

  const paymentRows = useMemo(() => {
    if (!venta) return [];
    if (venta.pagos && venta.pagos.length > 0) {
      return [...venta.pagos].sort((a, b) => {
        const aTime = a.fecha ? new Date(a.fecha).getTime() : 0;
        const bTime = b.fecha ? new Date(b.fecha).getTime() : 0;
        return bTime - aTime;
      });
    }
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
  }, [venta]);

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

  const sanitizePago = (pago: VentaPago) => ({
    id: pago.id || crypto.randomUUID(),
    fecha: pago.fecha ?? null,
    descripcion: pago.descripcion ?? 'Pago',
    precio: pago.precio ?? 0,
    descuento: pago.descuento ?? 0,
    total: pago.total ?? 0,
    metodoPagoId: pago.metodoPagoId ?? null,
    metodoPagoNombre: pago.metodoPagoNombre ?? 'Sin método',
    moneda: pago.moneda ?? 'USD',
    isPagoInicial: pago.isPagoInicial ?? false,
    cicloPago: pago.cicloPago ?? null,
    fechaInicio: pago.fechaInicio ?? null,
    fechaVencimiento: pago.fechaVencimiento ?? null,
    notas: pago.notas ?? '',
  });

  const handleConfirmRenovacion = async (data: {
    periodoRenovacion: string;
    metodoPagoId: string;
    costo: number;
    descuento?: number;
    fechaInicio: Date;
    fechaVencimiento: Date;
    notas?: string;
  }) => {
    if (!venta) return;
    const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
    const pagosActuales = venta.pagos ?? [];
    const numeroRenovacion =
      pagosActuales.filter((p) => !p.isPagoInicial && p.descripcion !== 'Pago inicial').length + 1;
    const descuentoNumero = Number(data.descuento) || 0;
    const total = Math.max(data.costo * (1 - descuentoNumero / 100), 0);
    const nuevoPago: VentaPago = {
      id: crypto.randomUUID(),
      fecha: new Date(),
      descripcion: `Renovación #${numeroRenovacion}`,
      precio: data.costo,
      descuento: descuentoNumero,
      total,
      metodoPagoId: data.metodoPagoId,
      metodoPagoNombre: metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre || 'Sin método',
      moneda: metodoPagoSeleccionado?.moneda || venta.moneda || 'USD',
      isPagoInicial: false,
      cicloPago: data.periodoRenovacion as VentaDoc['cicloPago'],
      fechaInicio: data.fechaInicio,
      fechaVencimiento: data.fechaVencimiento,
      notas: data.notas?.trim() || '',
    };
    const sanitized = [nuevoPago, ...pagosActuales].map(sanitizePago);
    const updatePayload: Record<string, unknown> = { pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) };
    await update(COLLECTIONS.VENTAS, venta.id, updatePayload);
    setVenta({ ...venta, pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) } as VentaDoc);
  };

  const handleEditarPago = (pago: VentaPago) => {
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
    if (!venta || !pagoToEdit) return;
    const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
    const pagos = venta.pagos ?? [];
    const idx = pagos.findIndex((p) => p.id != null && p.id === pagoToEdit?.id);
    if (idx < 0) {
      setEditarPagoDialogOpen(false);
      setPagoToEdit(null);
      return;
    }
    const descuentoNumero = Number(data.descuento) || 0;
    const total = Math.max(data.costo * (1 - descuentoNumero / 100), 0);
    const edited: VentaPago = {
      ...pagos[idx],
      precio: data.costo,
      descuento: descuentoNumero,
      total,
      metodoPagoId: data.metodoPagoId,
      metodoPagoNombre: metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre || 'Sin método',
      moneda: metodoPagoSeleccionado?.moneda || venta.moneda || 'USD',
      cicloPago: data.periodoRenovacion as VentaDoc['cicloPago'],
      fechaInicio: data.fechaInicio,
      fechaVencimiento: data.fechaVencimiento,
      notas: data.notas?.trim() || '',
    };
    const nuevosPagos = [...pagos];
    nuevosPagos[idx] = edited;

    const sanitized = nuevosPagos.map(sanitizePago);
    const updatePayload: Record<string, unknown> = { pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) };
    await update(COLLECTIONS.VENTAS, venta.id, updatePayload);
    setVenta({ ...venta, pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) } as VentaDoc);
    setEditarPagoDialogOpen(false);
    setPagoToEdit(null);
  };

  const handleConfirmDeletePago = async () => {
    if (!venta || !pagoToDelete) return;
    const pagos = venta.pagos ?? [];
    const idx = pagos.findIndex((p) => p.id != null && p.id === pagoToDelete?.id);
    if (idx < 0) {
      setDeletePagoDialogOpen(false);
      setPagoToDelete(null);
      return;
    }
    const nuevosPagos = [...pagos];
    nuevosPagos.splice(idx, 1);

    const sanitized = nuevosPagos.map(sanitizePago);
    const updatePayload: Record<string, unknown> = { pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) };
    await update(COLLECTIONS.VENTAS, venta.id, updatePayload);
    setVenta({ ...venta, pagos: sanitized, ...deriveTopLevelFromPagos(sanitized) } as VentaDoc);
    setDeletePagoDialogOpen(false);
    setPagoToDelete(null);
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
            onClick={() => setRenovarDialogOpen(true)}
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
              {cliente ? (
                <Link href={`/usuarios/${cliente.id}`} className="text-sm font-medium text-purple-500 hover:underline">
                  {venta.clienteNombre}
                </Link>
              ) : (
                <p className="text-sm font-medium">{venta.clienteNombre}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Método de Pago</p>
              <p className="text-sm font-medium text-purple-500">{metodoPago?.nombre || venta.metodoPagoNombre || 'Sin método'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ciclo de pago</p>
              <p className="text-sm font-medium">{getCicloPagoLabel(venta.cicloPago)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoría</p>
              <p className="text-sm font-medium">{categoria?.nombre || 'Sin categoría'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Servicio</p>
              <p className="text-sm font-medium">{venta.servicioCorreo || venta.servicioNombre}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contraseña</p>
              <p className="text-sm font-medium">{servicio?.contrasena || '—'}</p>
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
              <p className="text-sm font-medium">0</p>
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
            canManagePagos={!!venta.pagos?.length}
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
        categoriaPlanes={categoria?.planes}
        tipoPlan={servicio?.tipo}
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
        categoriaPlanes={categoria?.planes}
        tipoPlan={servicio?.tipo}
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






