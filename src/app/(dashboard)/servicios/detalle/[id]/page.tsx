'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Pencil, Trash2, RefreshCw, User, ChevronDown, DollarSign, Monitor, Calendar, Tag } from 'lucide-react';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { create, queryDocuments, remove, update, COLLECTIONS, timestampToDate, dateToTimestamp } from '@/lib/firebase/firestore';
import { PagoServicio } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrencySymbol } from '@/lib/constants';
import { formatearFecha } from '@/lib/utils/calculations';

interface PerfilVenta {
  clienteNombre?: string;
  createdAt?: Date;
  precioFinal?: number;
  descuento?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  notas?: string;
  servicioNombre?: string;
  servicioCorreo?: string;
  moneda?: string;
}

function ServicioDetallePageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { servicios, fetchServicios, deleteServicio, updateServicio } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRenovacionDialogOpen, setDeleteRenovacionDialogOpen] = useState(false);
  const [pagoToDelete, setPagoToDelete] = useState<PagoServicio | null>(null);
  const [editarPagoDialogOpen, setEditarPagoDialogOpen] = useState(false);
  const [pagoToEdit, setPagoToEdit] = useState<PagoServicio | null>(null);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [pagosServicio, setPagosServicio] = useState<PagoServicio[]>([]);
  const [ventasServicio, setVentasServicio] = useState<Array<PerfilVenta & { perfilNumero?: number | null }>>([]);
  const [expandedProfileIndex, setExpandedProfileIndex] = useState<number | null>(null);
  const [pagosHistorialLoading, setPagosHistorialLoading] = useState(true);

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
    fetchMetodosPago();
  }, [fetchServicios, fetchCategorias, fetchMetodosPago]);

  const loadPagos = async (): Promise<PagoServicio[]> => {
    if (!id) return [];
    setPagosHistorialLoading(true);
    try {
      const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.PAGOS_SERVICIO, [
        { field: 'servicioId', operator: '==', value: id },
      ]);
      const pagos: PagoServicio[] = docs.map((d) => ({
        id: d.id as string,
        servicioId: d.servicioId as string,
        metodoPagoId: d.metodoPagoId as string | undefined,
        moneda: d.moneda as string | undefined,
        isPagoInicial: d.isPagoInicial as boolean | undefined,
        fecha: timestampToDate(d.fecha),
        descripcion: d.descripcion as string,
        cicloPago: d.cicloPago as PagoServicio['cicloPago'],
        fechaInicio: timestampToDate(d.fechaInicio),
        fechaVencimiento: timestampToDate(d.fechaVencimiento),
        monto: (d.monto as number) ?? 0,
        createdAt: timestampToDate(d.createdAt),
        updatedAt: timestampToDate(d.updatedAt),
      }));
      const ordenados = pagos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setPagosServicio(ordenados);
      return ordenados;
    } catch (err) {
      console.error('Error cargando historial de pagos:', err);
      toast.error('Error cargando historial de pagos', { description: err instanceof Error ? err.message : undefined });
      setPagosServicio([]);
      return [];
    } finally {
      setPagosHistorialLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
  }, [id]);

  useEffect(() => {
    const loadVentas = async () => {
      if (!id) return;
      try {
        const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.VENTAS, [
          { field: 'servicioId', operator: '==', value: id },
        ]);
        const ventas = docs
          .filter((doc) => ((doc.estado as string | undefined) ?? 'activo') !== 'inactivo')
          .map((doc) => ({
          perfilNumero: (doc.perfilNumero as number | null | undefined) ?? null,
          clienteNombre: (doc.clienteNombre as string) || undefined,
          createdAt: timestampToDate(doc.createdAt),
          precioFinal: (doc.precioFinal as number) ?? (doc.precio as number) ?? 0,
          descuento: (doc.descuento as number) ?? 0,
          fechaInicio: timestampToDate(doc.fechaInicio),
          fechaFin: timestampToDate(doc.fechaFin),
          notas: (doc.notas as string) || '',
          servicioNombre: (doc.servicioNombre as string) || '',
          servicioCorreo: (doc.servicioCorreo as string) || '',
          moneda: (doc.moneda as string) || undefined,
        }));
        setVentasServicio(ventas);
      } catch (error) {
        console.error('Error cargando ventas del servicio:', error);
        toast.error('Error cargando ventas del servicio', { description: error instanceof Error ? error.message : undefined });
        setVentasServicio([]);
      }
    };

    loadVentas();
  }, [id]);

  const servicio = servicios.find((s) => s.id === id);
  const categoria = categorias.find((c) => c.id === servicio?.categoriaId);
  const metodoPago = metodosPago.find((m) => m.id === servicio?.metodoPagoId);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteServicio(id);
      toast.success('Servicio eliminado');
      router.push('/servicios');
    } catch (error) {
      toast.error('Error al eliminar servicio', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleEdit = () => {
    router.push(`/servicios/${id}/editar`);
  };

  const handleRenovar = () => {
    setRenovarDialogOpen(true);
  };

  const handleDeleteRenovacion = (pago: PagoServicio) => {
    setPagoToDelete(pago);
    setDeleteRenovacionDialogOpen(true);
  };

  const handleEditarPago = (pago: PagoServicio) => {
    setPagoToEdit(pago);
    setEditarPagoDialogOpen(true);
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
    if (!pagoToEdit) return;
    try {
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      await update(COLLECTIONS.PAGOS_SERVICIO, pagoToEdit.id, {
        fechaInicio: dateToTimestamp(data.fechaInicio),
        fechaVencimiento: dateToTimestamp(data.fechaVencimiento),
        monto: data.costo,
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        metodoPagoId: data.metodoPagoId,
        moneda: metodoPagoSeleccionado?.moneda,
        isPagoInicial: false,
      });
      const esUltimoPago = pagosOrdenados[0]?.id === pagoToEdit.id;
      if (esUltimoPago) {
        await updateServicio(id, {
          fechaInicio: data.fechaInicio,
          fechaVencimiento: data.fechaVencimiento,
          costoServicio: data.costo,
          metodoPagoId: data.metodoPagoId || undefined,
          cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        });
      }
      await loadPagos();
      toast.success('Pago actualizado correctamente');
      setPagoToEdit(null);
      setEditarPagoDialogOpen(false);
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      toast.error('Error al actualizar pago', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleConfirmDeleteRenovacion = async () => {
    if (!pagoToDelete || !servicio) return;
    const eraUltimaRenovacion = pagosOrdenados[0]?.id === pagoToDelete.id;
    try {
      await remove(COLLECTIONS.PAGOS_SERVICIO, pagoToDelete.id);
      const pagosActualizados = await loadPagos();
      if (eraUltimaRenovacion) {
        if (pagosActualizados.length > 0) {
          const anterior = pagosActualizados[0];
          await updateServicio(id, {
            fechaInicio: anterior.fechaInicio,
            fechaVencimiento: anterior.fechaVencimiento,
            costoServicio: anterior.monto,
            metodoPagoId: anterior.metodoPagoId || undefined,
            cicloPago: anterior.cicloPago,
          });
        }
      }
      toast.success('Renovación eliminada');
      setPagoToDelete(null);
    } catch (error) {
      console.error('Error al eliminar renovación:', error);
      toast.error('Error al eliminar renovación', { description: error instanceof Error ? error.message : undefined });
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
  }) => {
    try {
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      const numeroRenovacion = pagosServicio.filter((p) => !p.isPagoInicial && p.descripcion !== 'Pago inicial').length + 1;
      const descripcion = `Renovación #${numeroRenovacion}`;
      const fechaRegistro = new Date();

      await create(COLLECTIONS.PAGOS_SERVICIO, {
        servicioId: id,
        fecha: fechaRegistro,
        descripcion,
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        monto: data.costo,
        metodoPagoId: data.metodoPagoId,
        moneda: metodoPagoSeleccionado?.moneda,
        isPagoInicial: false,
      });

      await updateServicio(id, {
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        costoServicio: data.costo,
        metodoPagoId: data.metodoPagoId || undefined,
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
      });

      const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.PAGOS_SERVICIO, [
        { field: 'servicioId', operator: '==', value: id },
      ]);
      const pagos: PagoServicio[] = docs.map((d) => ({
        id: d.id as string,
        servicioId: d.servicioId as string,
        metodoPagoId: d.metodoPagoId as string | undefined,
        moneda: d.moneda as string | undefined,
        isPagoInicial: d.isPagoInicial as boolean | undefined,
        fecha: timestampToDate(d.fecha),
        descripcion: d.descripcion as string,
        cicloPago: d.cicloPago as PagoServicio['cicloPago'],
        fechaInicio: timestampToDate(d.fechaInicio),
        fechaVencimiento: timestampToDate(d.fechaVencimiento),
        monto: (d.monto as number) ?? 0,
        createdAt: timestampToDate(d.createdAt),
        updatedAt: timestampToDate(d.updatedAt),
      }));
      setPagosServicio(pagos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));

      // No refetch servicios: el estado ya se actualizó en updateServicio preservando _inicial
      toast.success('Renovación registrada exitosamente');
      setRenovarDialogOpen(false);
    } catch (error) {
      console.error('Error al registrar la renovación:', error);
      toast.error('Error al registrar la renovación', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const getCicloPagoLabel = (ciclo: string) => {
    const labels: Record<string, string> = {
      mensual: 'Mensual',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual',
    };
    return labels[ciclo] || ciclo;
  };


  const currencySymbol = getCurrencySymbol(metodoPago?.moneda);

  const totalGastado = useMemo(() => {
    return pagosServicio.reduce((sum, p) => sum + p.monto, 0);
  }, [pagosServicio]);

  const pagosOrdenados = useMemo(() => {
    return [...pagosServicio].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [pagosServicio]);

  if (!servicio) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Servicio no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/servicios" className="hover:text-foreground transition-colors">
              Servicios
            </Link>{' '}
            / <span className="text-foreground">Detalles</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">No se encontró el servicio con el ID proporcionado.</p>
          <Link href="/servicios" className="inline-block mt-4 text-primary hover:underline">
            Volver a Servicios
          </Link>
        </div>
      </div>
    );
  }

  const ventasPorPerfil = useMemo(() => {
    const map = new Map<number, PerfilVenta>();
    ventasServicio.forEach((venta) => {
      if (!venta.perfilNumero) return;
      const existing = map.get(venta.perfilNumero);
      if (!existing) {
        map.set(venta.perfilNumero, {
          clienteNombre: venta.clienteNombre,
          createdAt: venta.createdAt,
          precioFinal: venta.precioFinal,
          descuento: venta.descuento,
          fechaInicio: venta.fechaInicio,
          fechaFin: venta.fechaFin,
          notas: venta.notas,
          servicioNombre: venta.servicioNombre,
          servicioCorreo: venta.servicioCorreo,
          moneda: venta.moneda,
        });
        return;
      }
      const existingDate = existing.createdAt?.getTime() ?? 0;
      const nextDate = venta.createdAt?.getTime() ?? 0;
      if (nextDate >= existingDate) {
        map.set(venta.perfilNumero, {
          clienteNombre: venta.clienteNombre,
          createdAt: venta.createdAt,
          precioFinal: venta.precioFinal,
          descuento: venta.descuento,
          fechaInicio: venta.fechaInicio,
          fechaFin: venta.fechaFin,
          notas: venta.notas,
          servicioNombre: venta.servicioNombre,
          servicioCorreo: venta.servicioCorreo,
          moneda: venta.moneda,
        });
      }
    });
    return map;
  }, [ventasServicio]);

  // Generar perfiles dinamicamente
  const perfilesArray = Array.from({ length: servicio.perfilesDisponibles }, (_, i) => {
    const numero = i + 1;
    const venta = ventasPorPerfil.get(numero);
    return {
      nombre: `Perfil ${numero}`,
      estado: venta ? 'ocupado' : 'disponible',
      clienteNombre: venta?.clienteNombre,
      venta,
    };
  });

  const perfilesEnUso = perfilesArray.filter((p: { estado: string }) => p.estado === 'ocupado').length;
  const perfilesDisponibles = servicio.perfilesDisponibles - perfilesEnUso;

  const toggleProfile = (index: number) => {
    setExpandedProfileIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/servicios">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Servicio: {servicio.nombre}</h1>
              <p className="text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                {' / '}
                <Link href="/servicios" className="hover:text-foreground transition-colors">
                  Servicios
                </Link>
                {' / '}
                <Link href={`/servicios/${servicio.categoriaId}`} className="hover:text-foreground transition-colors">
                  {categoria?.nombre || 'Categoría'}
                </Link>
                {' / '}
                <span className="text-foreground">Detalles</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleRenovar} className="bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Renovar
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Eliminar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* Left Column - Service Info */}
          <div className="space-y-4">
            {/* Service Card */}
            <Card className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Service Icon */}
                <div className="w-32 h-32 flex items-center justify-center">
                  <Monitor className="h-16 w-16 text-muted-foreground" />
                </div>

                {/* Service Info */}
                <div className="w-full space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground mt-0.5">Categoría</span>
                    <span className="text-sm font-medium ml-auto text-right">{categoria?.nombre || 'Sin categoría'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm text-muted-foreground">Costo</span>
                    <span className="text-sm font-medium ml-auto text-right">{currencySymbol} {(servicio.costoServicio || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm text-muted-foreground">Ciclo de Facturación</span>
                    <span className="text-sm font-medium ml-auto text-right">{getCicloPagoLabel(servicio.cicloPago ?? '')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground mt-0.5">Fecha de Inicio</span>
                    <Badge variant="outline" className="ml-auto font-normal text-sm bg-green-500/20 text-white border-green-500/30 [a&]:hover:bg-green-500/30 [a&]:hover:text-white">
                      {servicio.fechaInicio ? formatearFecha(new Date(servicio.fechaInicio)) : '—'}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground mt-0.5">Fecha de Vencimiento</span>
                    <Badge variant="outline" className="ml-auto font-normal text-sm bg-green-500/20 text-white border-green-500/30 [a&]:hover:bg-green-500/30 [a&]:hover:text-white">
                      {servicio.fechaVencimiento ? formatearFecha(new Date(servicio.fechaVencimiento)) : '—'}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground mt-0.5">Método de Pago</span>
                    <span className="text-sm font-medium ml-auto text-right text-purple-600">{metodoPago?.nombre || 'Sin método'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Additional Info Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-0.5">Información Adicional</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {servicio.correo || 'Sin especificar'}
                    {servicio.correo && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </Button>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contraseña</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {servicio.contrasena || 'Sin especificar'}
                    {servicio.contrasena && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </Button>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Creado:</p>
                  <p className="text-sm">{formatearFecha(new Date(servicio.createdAt))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Actualización:</p>
                  <p className="text-sm">{formatearFecha(new Date(servicio.updatedAt))}</p>
                </div>
              </div>
            </Card>

            {/* Notes Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Notas</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {servicio.notas || 'Sin notas'}
              </p>
            </Card>
          </div>

          {/* Right Column - Profiles & History */}
          <div className="space-y-4">
            {/* Profiles Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Perfiles</h2>
                <p className="text-sm text-muted-foreground">{servicio.perfilesDisponibles} perfiles registrados</p>
              </div>

              <div className="space-y-2">
                {perfilesArray.map((perfil, index) => {
                  const venta = perfil.venta;
                  const ventaCurrency = getCurrencySymbol(venta?.moneda || metodoPago?.moneda);
                  const diasRestantes =
                    venta?.fechaFin ? Math.max(Math.ceil((new Date(venta.fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0) : null;
                  return (
                  <div
                    key={index}
                    className={`rounded-lg border px-4 py-3 ${
                      perfil.estado === 'ocupado' ? 'bg-green-950/30 border-green-900/50' : 'bg-muted/50 border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => perfil.estado === 'ocupado' && toggleProfile(index)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <User className={`h-5 w-5 ${perfil.estado === 'ocupado' ? 'text-green-500' : 'text-blue-500'}`} />
                        <span className="font-medium">
                          {perfil.estado === 'ocupado' && perfil.clienteNombre
                            ? perfil.clienteNombre
                            : perfil.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {perfil.estado === 'disponible' ? (
                          <Badge variant="secondary" className="bg-green-600 text-white hover:bg-green-700">
                            Disponible
                          </Badge>
                        ) : (
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedProfileIndex === index ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </button>

                    {perfil.estado === 'ocupado' && expandedProfileIndex === index && venta && (
                      <div className="mt-4 space-y-3">
                        <div className="pt-3 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-2">Detalles de la venta:</p>
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{venta.clienteNombre || 'Sin cliente'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  Inicio: {venta.fechaInicio ? format(new Date(venta.fechaInicio), 'd MMM yyyy', { locale: es }) : '—'}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{ventaCurrency} {(venta.precioFinal ?? 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  Vence: {venta.fechaFin ? format(new Date(venta.fechaFin), 'd MMM yyyy', { locale: es }) : '—'}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Desc: {(venta.descuento ?? 0).toFixed(2)}%</span>
                              </div>
                              {diasRestantes !== null && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-green-600/20 text-green-400 hover:bg-green-600/30">
                                    {diasRestantes} dias restantes
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-neutral-800 bg-black p-3">
                          <p className="text-sm text-muted-foreground mb-2">Notas de la venta:</p>
                          <div className="text-sm whitespace-pre-line">
                            {venta.notas ? venta.notas : 'Sin notas'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-muted-foreground">En uso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-muted-foreground">Disponible</span>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  {perfilesDisponibles} de {servicio.perfilesDisponibles} perfiles disponibles
                </span>
              </div>
            </Card>

            {/* Payment History Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Historial de pagos del servicio</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-3 font-medium">Fecha</th>
                      <th className="text-left py-3 font-medium">Descripción</th>
                      <th className="text-left py-3 font-medium">Ciclo de facturación</th>
                      <th className="text-left py-3 font-medium">Fecha de Inicio</th>
                      <th className="text-left py-3 font-medium">Fecha de Vencimiento</th>
                      <th className="text-left py-3 font-medium">Monto</th>
                      <th className="text-center py-3 font-medium w-[10%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosHistorialLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          Cargando historial de pagos…
                        </td>
                      </tr>
                    ) : (
                      <>
                    {pagosOrdenados.map((pago) => {
                      const esInicial = pago.isPagoInicial || pago.descripcion === 'Pago inicial';
                      const pagoMetodo = pago.metodoPagoId
                        ? metodosPago.find((m) => m.id === pago.metodoPagoId)
                        : undefined;
                      const pagoCurrency = getCurrencySymbol(pago.moneda || pagoMetodo?.moneda || metodoPago?.moneda);
                      return (
                        <tr key={pago.id} className="border-b text-sm">
                            <td className="py-3">
                              {format(new Date(pago.fecha), 'd MMM yyyy', { locale: es })}
                            </td>
                            <td className="py-3">{pago.descripcion}</td>
                            <td className="py-3">
                              {getCicloPagoLabel(pago.cicloPago ?? '') || '—'}
                            </td>
                            <td className="py-3">
                              {format(new Date(pago.fechaInicio), 'd MMM yyyy', { locale: es })}
                            </td>
                            <td className="py-3">
                              {format(new Date(pago.fechaVencimiento), 'd MMM yyyy', { locale: es })}
                            </td>
                            <td className="py-3 text-left">
                              {pagoCurrency} {pago.monto.toFixed(2)}
                            </td>
                            <td className="py-3 text-center">
                              {pago.id === pagosOrdenados[0]?.id && !esInicial ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <span className="text-lg">⋯</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center">
                                    <DropdownMenuItem onClick={() => handleEditarPago(pago)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteRenovacion(pago)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t -mx-6 px-6">
                <div className="flex justify-end items-center mt-2">
                  <span className="text-sm text-muted-foreground mr-2">Total Gastado:</span>
                  <span className="text-lg font-semibold text-purple-600">
                    {currencySymbol} {totalGastado.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar Servicio"
        description={`¿Estás seguro de que quieres eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      <ConfirmDialog
        open={deleteRenovacionDialogOpen}
        onOpenChange={(open) => {
          setDeleteRenovacionDialogOpen(open);
          if (!open) setPagoToDelete(null);
        }}
        onConfirm={handleConfirmDeleteRenovacion}
        title="Eliminar renovación"
        description={pagoToDelete ? `¿Eliminar "${pagoToDelete.descripcion}" del historial? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        variant="danger"
      />

      <PagoDialog
        context="servicio"
        mode="renew"
        open={renovarDialogOpen}
        onOpenChange={setRenovarDialogOpen}
        servicio={servicio}
        metodosPago={metodosPago}
        categoriaPlanes={categoria?.planes}
        tipoPlan={servicio?.tipo}
        onConfirm={handleConfirmRenovacion}
      />

      <PagoDialog
        context="servicio"
        mode="edit"
        open={editarPagoDialogOpen}
        onOpenChange={(open) => {
          setEditarPagoDialogOpen(open);
          if (!open) setPagoToEdit(null);
        }}
        pago={pagoToEdit}
        servicio={servicio}
        metodosPago={metodosPago}
        categoriaPlanes={categoria?.planes}
        tipoPlan={servicio?.tipo}
        onConfirm={handleConfirmEditarPago}
      />
    </>
  );
}

export default function ServicioDetallePage() {
  return (
    <ModuleErrorBoundary moduleName="Detalle de Servicio">
      <ServicioDetallePageContent />
    </ModuleErrorBoundary>
  );
}
