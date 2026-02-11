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
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { queryDocuments, remove, update, COLLECTIONS, getById, create } from '@/lib/firebase/firestore';
import { doc as firestoreDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Servicio, Categoria, MetodoPago, VentaDoc, PagoServicio } from '@/types';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrencySymbol } from '@/lib/constants';
import { formatearFecha, sumInUSD, formatAggregateInUSD } from '@/lib/utils/calculations';
import { usePagosServicio } from '@/hooks/use-pagos-servicio';
import { crearPagoRenovacion, contarRenovacionesDeServicio } from '@/lib/services/pagosServicioService';

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

interface PagoFormData {
  periodoRenovacion: string;
  metodoPagoId: string;
  costo: number;
  descuento?: number;
  fechaInicio: Date;
  fechaVencimiento: Date;
  notas?: string;
  metodoPagoNombre?: string;
  moneda?: string;
}

function ServicioDetallePageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { deleteServicio, updateServicio, fetchCounts } = useServiciosStore();
  const { fetchCategorias } = useCategoriasStore();

  // Estados locales para los datos específicos de esta página
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRenovacionDialogOpen, setDeleteRenovacionDialogOpen] = useState(false);
  const [pagoToDelete, setPagoToDelete] = useState<PagoServicio | null>(null);
  const [editarPagoDialogOpen, setEditarPagoDialogOpen] = useState(false);
  const [pagoToEdit, setPagoToEdit] = useState<PagoServicio | null>(null);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [ventasServicio, setVentasServicio] = useState<Array<PerfilVenta & { perfilNumero?: number | null }>>([]);
  const [expandedProfileIndex, setExpandedProfileIndex] = useState<number | null>(null);

  // Usar el hook para cargar pagos (con cache)
  const { pagos: pagosServicio, isLoading: pagosHistorialLoading, renovaciones, refresh: refreshPagos } = usePagosServicio(id);

  // Cargar solo el servicio (1 lectura única)
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setIsLoadingData(true);
      try {
        // 1. Cargar el servicio (categoriaNombre ya está denormalizado)
        const servicioData = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
        if (!servicioData) {
          toast.error('Servicio no encontrado');
          setServicio(null);
          return;
        }
        setServicio(servicioData);

        // 2. Crear objeto de categoría sintético desde datos denormalizados
        setCategoria({
          id: servicioData.categoriaId,
          nombre: servicioData.categoriaNombre,
        } as Categoria);

        // 3. Crear objeto sintético de metodoPago desde datos denormalizados
        if (servicioData.metodoPagoId) {
          setMetodoPago({
            id: servicioData.metodoPagoId,
            nombre: servicioData.metodoPagoNombre || '',
            moneda: servicioData.moneda || 'USD',
          } as MetodoPago);
        }

        // Nota: metodosPago (para dropdown) se carga en lazy load al abrir diálogo de renovación
      } catch (error) {
        console.error('Error cargando datos del servicio:', error);
        toast.error('Error cargando datos del servicio');
        setServicio(null);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [id]);

  useEffect(() => {
    const loadVentas = async () => {
      if (!id) return;
      try {
        // Paso 1: Cargar ventas base (solo metadatos)
        const ventasBase = await queryDocuments<VentaDoc>(COLLECTIONS.VENTAS, [
          { field: 'servicioId', operator: '==', value: id },
        ]);

        // Paso 2: Cargar datos actuales desde PagoVenta (fuente de verdad)
        const ventasConDatos = await getVentasConUltimoPago(ventasBase);

        const ventas = ventasConDatos
          .filter((venta) => (venta.estado ?? 'activo') !== 'inactivo')
          .map((venta) => ({
          perfilNumero: venta.perfilNumero ?? null,
          clienteNombre: venta.clienteNombre || undefined,
          createdAt: venta.createdAt,
          precioFinal: venta.precioFinal ?? venta.precio ?? 0,
          descuento: venta.descuento ?? 0,
          fechaInicio: venta.fechaInicio ?? undefined,
          fechaFin: venta.fechaFin ?? undefined,
          notas: venta.notas || '',
          servicioNombre: venta.servicioNombre,
          servicioCorreo: venta.servicioCorreo || '',
          moneda: venta.moneda || undefined,
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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteServicio(id);
      toast.success('Servicio eliminado');

      // Refrescar categorías y contadores de servicios para actualizar widgets
      await Promise.all([
        fetchCategorias(true),
        fetchCounts(true),
      ]);

      router.push('/servicios');
    } catch (error) {
      toast.error('Error al eliminar servicio', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleEdit = () => {
    router.push(`/servicios/${id}/editar`);
  };

  // Lazy load de métodos de pago (solo cuando se necesita renovar)
  const loadMetodosPagoIfNeeded = async () => {
    if (metodosPago.length > 0) return; // Ya están cargados
    try {
      const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
        { field: 'asociadoA', operator: '==', value: 'servicio' }
      ]);
      setMetodosPago(methods);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      setMetodosPago([]);
    }
  };

  const handleRenovar = async () => {
    await loadMetodosPagoIfNeeded();
    setRenovarDialogOpen(true);
  };

  const handleDeleteRenovacion = (pago: PagoServicio) => {
    setPagoToDelete(pago);
    setDeleteRenovacionDialogOpen(true);
  };

  const handleEditarPago = async (pago: PagoServicio) => {
    await loadMetodosPagoIfNeeded();
    setPagoToEdit(pago);
    setEditarPagoDialogOpen(true);
  };

  const handleConfirmEditarPago = async (data: PagoFormData) => {
    if (!pagoToEdit) return;
    try {
      // Calcular diferencia entre monto viejo y nuevo
      const montoDiff = data.costo - (pagoToEdit.monto ?? 0);

      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      await update(COLLECTIONS.PAGOS_SERVICIO, pagoToEdit.id, {
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        monto: data.costo,
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: data.metodoPagoNombre || metodoPagoSeleccionado?.nombre,  // Denormalizado
        moneda: data.moneda || metodoPagoSeleccionado?.moneda,                      // Denormalizado
        notas: data.notas || '',
      });

      // Ajustar gastosTotal del servicio con la diferencia si cambió el monto
      if (montoDiff !== 0 && servicio) {
        const servicioRef = firestoreDoc(db, COLLECTIONS.SERVICIOS, id);
        await updateDoc(servicioRef, {
          gastosTotal: increment(montoDiff)
        });
      }

      // Si es el último pago, actualizar el servicio
      const esUltimoPago = pagosOrdenados[0]?.id === pagoToEdit.id;
      if (esUltimoPago) {
        await updateServicio(id, {
          fechaInicio: data.fechaInicio,
          fechaVencimiento: data.fechaVencimiento,
          costoServicio: data.costo,
          metodoPagoId: data.metodoPagoId || undefined,
          metodoPagoNombre: data.metodoPagoNombre || metodoPagoSeleccionado?.nombre,  // Denormalizado
          moneda: data.moneda || metodoPagoSeleccionado?.moneda,                      // Denormalizado
          cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        });

        // Recargar el servicio actualizado para reflejar los cambios en la UI
        const servicioActualizado = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
        if (servicioActualizado) {
          setServicio(servicioActualizado);
        }
      }

      refreshPagos();
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
    const montoToRevert = pagoToDelete.monto ?? 0;

    try {
      await remove(COLLECTIONS.PAGOS_SERVICIO, pagoToDelete.id);

      // Decrementar gastosTotal del servicio
      const servicioRef = firestoreDoc(db, COLLECTIONS.SERVICIOS, id);
      await updateDoc(servicioRef, {
        gastosTotal: increment(-montoToRevert)
      });

      refreshPagos();

      if (eraUltimaRenovacion) {
        // Recargar pagos para obtener el nuevo último
        const pagosActualizados = pagosServicio.filter(p => p.id !== pagoToDelete.id);
        if (pagosActualizados.length > 0) {
          const anterior = pagosActualizados[0];
          await updateServicio(id, {
            fechaInicio: anterior.fechaInicio,
            fechaVencimiento: anterior.fechaVencimiento,
            costoServicio: anterior.monto,
            metodoPagoId: anterior.metodoPagoId || undefined,
            cicloPago: anterior.cicloPago,
          });

          // Recargar el servicio actualizado para reflejar los cambios en la UI
          const servicioActualizado = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
          if (servicioActualizado) {
            setServicio(servicioActualizado);
          }
        }
      }
      toast.success('Renovación eliminada');
      setPagoToDelete(null);
    } catch (error) {
      console.error('Error al eliminar renovación:', error);
      toast.error('Error al eliminar renovación', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleConfirmRenovacion = async (data: PagoFormData) => {
    try {
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      const numeroRenovacion = renovaciones + 1;

      await crearPagoRenovacion(
        id,
        servicio?.categoriaId || '',
        data.costo,
        data.metodoPagoId,
        data.metodoPagoNombre || metodoPagoSeleccionado?.nombre || '',
        data.moneda || metodoPagoSeleccionado?.moneda || 'USD',
        data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        data.fechaInicio,
        data.fechaVencimiento,
        numeroRenovacion,
        data.notas
      );

      // Incrementar gastosTotal del servicio
      const servicioRef = firestoreDoc(db, COLLECTIONS.SERVICIOS, id);
      await updateDoc(servicioRef, {
        gastosTotal: increment(data.costo)
      });

      await updateServicio(id, {
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        costoServicio: data.costo,
        metodoPagoId: data.metodoPagoId || undefined,
        metodoPagoNombre: data.metodoPagoNombre || metodoPagoSeleccionado?.nombre,  // Denormalizado
        moneda: data.moneda || metodoPagoSeleccionado?.moneda,                      // Denormalizado
        cicloPago: data.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
      });

      // Recargar el servicio actualizado para reflejar los cambios en la UI
      const servicioActualizado = await getById<Servicio>(COLLECTIONS.SERVICIOS, id);
      if (servicioActualizado) {
        setServicio(servicioActualizado);
      }

      refreshPagos();

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

  const [totalGastadoUSD, setTotalGastadoUSD] = useState<number>(0);
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  useEffect(() => {
    const calculateTotal = async () => {
      setIsCalculatingTotal(true);
      try {
        const total = await sumInUSD(
          pagosServicio.map(p => ({ monto: p.monto, moneda: p.moneda || 'USD' }))
        );
        setTotalGastadoUSD(total);
      } catch (error) {
        console.error('[ServicioDetail] Error calculating total:', error);
        setTotalGastadoUSD(0);
      } finally {
        setIsCalculatingTotal(false);
      }
    };
    calculateTotal();
  }, [pagosServicio]);

  const pagosOrdenados = useMemo(() => {
    return [...pagosServicio].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [pagosServicio]);

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

  // Estado de carga
  if (isLoadingData) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Cargando servicio...</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            {' / '}
            <Link href="/servicios" className="hover:text-foreground transition-colors">Servicios</Link>
            {' / '}
            <span className="text-foreground">Detalles</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Cargando datos del servicio...</p>
        </div>
      </div>
    );
  }

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
  const perfilesArray = Array.from({ length: servicio.perfilesDisponibles }, (_, i) => {
    const numero = i + 1;
    const venta = ventasPorPerfil.get(numero);
    // Si el servicio está inactivo, todos los perfiles se muestran como inactivos
    const estado = !servicio.activo ? 'inactivo' : (venta ? 'ocupado' : 'disponible');
    return {
      nombre: `Perfil ${numero}`,
      estado,
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
                      perfil.estado === 'ocupado' ? 'bg-green-950/30 border-green-900/50' :
                      perfil.estado === 'inactivo' ? 'bg-muted/30 border-muted opacity-50' :
                      'bg-muted/50 border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => perfil.estado === 'ocupado' && toggleProfile(index)}
                      className="w-full flex items-center justify-between"
                      disabled={perfil.estado === 'inactivo'}
                    >
                      <div className="flex items-center gap-3">
                        <User className={`h-5 w-5 ${
                          perfil.estado === 'ocupado' ? 'text-green-500' :
                          perfil.estado === 'inactivo' ? 'text-gray-600' :
                          'text-blue-500'
                        }`} />
                        <span className={`font-medium ${perfil.estado === 'inactivo' ? 'text-gray-600' : ''}`}>
                          {perfil.estado === 'ocupado' && perfil.clienteNombre
                            ? perfil.clienteNombre
                            : perfil.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {perfil.estado === 'inactivo' ? (
                          <Badge variant="secondary" className="bg-gray-700 text-gray-400 hover:bg-gray-700">
                            Inactivo
                          </Badge>
                        ) : perfil.estado === 'disponible' ? (
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
                  {!servicio.activo && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                      <span className="text-muted-foreground">Inactivo</span>
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {servicio.activo ? `${perfilesDisponibles} de ${servicio.perfilesDisponibles} perfiles disponibles` : 'Servicio inactivo'}
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
                    {isCalculatingTotal ? (
                      <span className="text-xs">Calculando...</span>
                    ) : (
                      formatAggregateInUSD(totalGastadoUSD)
                    )}
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
