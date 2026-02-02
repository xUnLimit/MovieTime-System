'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Pencil, Trash2, RefreshCw, User, ChevronDown, DollarSign, Monitor } from 'lucide-react';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RenovarServicioDialog } from '@/components/servicios/RenovarServicioDialog';
import { EditarPagoServicioDialog } from '@/components/servicios/EditarPagoServicioDialog';
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
  const [expandedProfiles, setExpandedProfiles] = useState<Record<number, boolean>>({});
  const [pagosServicio, setPagosServicio] = useState<PagoServicio[]>([]);
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
      setPagosServicio([]);
      return [];
    } finally {
      setPagosHistorialLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
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
      toast.error('Error al eliminar servicio');
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
    fechaInicio: Date;
    fechaVencimiento: Date;
    notas?: string;
  }) => {
    if (!pagoToEdit) return;
    try {
      await update(COLLECTIONS.PAGOS_SERVICIO, pagoToEdit.id, {
        fechaInicio: dateToTimestamp(data.fechaInicio),
        fechaVencimiento: dateToTimestamp(data.fechaVencimiento),
        monto: data.costo,
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
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
      toast.error('Error al actualizar pago');
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
          });
        } else {
          await updateServicio(id, {
            fechaInicio: servicio.pagoInicialFechaInicio ?? servicio.fechaInicioInicial,
            fechaVencimiento: servicio.pagoInicialFechaVencimiento ?? servicio.fechaVencimientoInicial,
            costoServicio: servicio.pagoInicialMonto ?? servicio.costoServicioInicial ?? servicio.costoServicio,
          });
        }
      }
      toast.success('Renovación eliminada');
      setPagoToDelete(null);
    } catch (error) {
      console.error('Error al eliminar renovación:', error);
      toast.error('Error al eliminar renovación');
    }
  };

  const handleConfirmRenovacion = async (data: {
    periodoRenovacion: string;
    metodoPagoId: string;
    costo: number;
    fechaInicio: Date;
    fechaVencimiento: Date;
    notas?: string;
  }) => {
    try {
      const numeroRenovacion = pagosServicio.length + 1;
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
      toast.error('Error al registrar la renovación');
    }
  };

  const toggleProfile = (index: number) => {
    setExpandedProfiles((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
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

  const getCurrencySymbol = (moneda?: string): string => {
    if (!moneda) return '$';
    const symbols: Record<string, string> = {
      USD: '$',
      PAB: 'B/.',
      EUR: '€',
      COP: '$',
      MXN: '$',
      CRC: '₡',
      VES: 'Bs.',
      ARS: '$',
      CLP: '$',
      PEN: 'S/',
      NGN: '₦',
      TRY: '₺',
    };
    return symbols[moneda] || '$';
  };

  const currencySymbol = getCurrencySymbol(metodoPago?.moneda);

  const totalGastado = useMemo(() => {
    const inicial = servicio?.pagoInicialMonto ?? servicio?.costoServicioInicial ?? servicio?.costoServicio ?? 0;
    const renovaciones = pagosServicio.reduce((sum, p) => sum + p.monto, 0);
    return inicial + renovaciones;
  }, [servicio?.pagoInicialMonto, servicio?.costoServicioInicial, servicio?.costoServicio, pagosServicio]);

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

  // Generar perfiles dinámicamente
  const perfilesArray = Array.from({ length: servicio.perfilesDisponibles }, (_, i) => ({
    nombre: `Perfil ${i + 1}`,
    estado: i < (servicio.perfilesOcupados || 0) ? 'ocupado' : 'disponible',
    clienteId: i < (servicio.perfilesOcupados || 0) ? `cliente-${i}` : undefined,
    clienteNombre: i < (servicio.perfilesOcupados || 0) ? `Usuario ${i + 1}` : undefined,
  }));
  
  const perfilesEnUso = perfilesArray.filter((p: { estado: string }) => p.estado === 'ocupado').length;
  const perfilesDisponibles = servicio.perfilesDisponibles - perfilesEnUso;

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
                      {servicio.fechaInicio ? format(new Date(servicio.fechaInicio), "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground mt-0.5">Fecha de Vencimiento</span>
                    <Badge variant="outline" className="ml-auto font-normal text-sm bg-green-500/20 text-white border-green-500/30 [a&]:hover:bg-green-500/30 [a&]:hover:text-white">
                      {servicio.fechaVencimiento ? format(new Date(servicio.fechaVencimiento), "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
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
                  <p className="text-sm">{format(new Date(servicio.createdAt), "d 'de' MMMM 'del' yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Actualización:</p>
                  <p className="text-sm">{format(new Date(servicio.updatedAt), "d 'de' MMMM 'del' yyyy", { locale: es })}</p>
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
                {perfilesArray.map((perfil: { nombre: string; estado: string; clienteId?: string; clienteNombre?: string }, index: number) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${
                      perfil.estado === 'ocupado' ? 'bg-green-950/30 border-green-900/50' : 'bg-muted/50 border-border'
                    }`}
                  >
                    <button
                      onClick={() => toggleProfile(index)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5" />
                        <span className="font-medium">
                          {perfil.estado === 'ocupado' && perfil.clienteNombre 
                            ? perfil.clienteNombre 
                            : perfil.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {perfil.estado === 'disponible' && (
                          <Badge variant="secondary" className="bg-green-600 text-white hover:bg-green-700">
                            Disponible
                          </Badge>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedProfiles[index] ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expandedProfiles[index] && (
                      <div className="mt-4 pt-4 border-t border-border space-y-2">
                        {perfil.clienteId && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium">{perfil.clienteNombre || 'Sin asignar'}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estado:</span>
                          <span className="font-medium">{perfil.estado === 'ocupado' ? 'Ocupado' : 'Disponible'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                        {pagosOrdenados.map((pago) => (
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
                              {currencySymbol} {pago.monto.toFixed(2)}
                            </td>
                            <td className="py-3 text-center">
                              {pago.id === pagosOrdenados[0]?.id ? (
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
                        ))}
                        <tr className="border-b text-sm">
                          <td className="py-3">
                            {format(new Date(servicio.createdAt), 'd MMM yyyy', { locale: es })}
                          </td>
                          <td className="py-3">Pago inicial</td>
                          <td className="py-3">
                            {getCicloPagoLabel(servicio.pagoInicialCicloPago ?? '') || '—'}
                          </td>
                          <td className="py-3">
                            {(servicio.pagoInicialFechaInicio ?? servicio.fechaInicioInicial ?? servicio.fechaInicio)
                              ? format(new Date(servicio.pagoInicialFechaInicio ?? servicio.fechaInicioInicial ?? servicio.fechaInicio!), 'd MMM yyyy', { locale: es })
                              : '-'}
                          </td>
                          <td className="py-3">
                            {(servicio.pagoInicialFechaVencimiento ?? servicio.fechaVencimientoInicial ?? servicio.fechaVencimiento)
                              ? format(new Date(servicio.pagoInicialFechaVencimiento ?? servicio.fechaVencimientoInicial ?? servicio.fechaVencimiento!), 'd MMM yyyy', { locale: es })
                              : '-'}
                          </td>
                          <td className="py-3 text-left">
                            {currencySymbol} {(servicio.pagoInicialMonto ?? servicio.costoServicioInicial ?? servicio.costoServicio ?? 0).toFixed(2)}
                          </td>
                          <td className="py-3 text-center text-muted-foreground">—</td>
                        </tr>
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

      <RenovarServicioDialog
        open={renovarDialogOpen}
        onOpenChange={setRenovarDialogOpen}
        servicio={servicio}
        metodosPago={metodosPago}
        onConfirm={handleConfirmRenovacion}
      />

      <EditarPagoServicioDialog
        open={editarPagoDialogOpen}
        onOpenChange={(open) => {
          setEditarPagoDialogOpen(open);
          if (!open) setPagoToEdit(null);
        }}
        pago={pagoToEdit}
        servicio={servicio}
        metodosPago={metodosPago}
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
