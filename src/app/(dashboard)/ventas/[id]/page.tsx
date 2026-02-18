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
import { COLLECTIONS, getById, remove, timestampToDate, update, adjustVentasActivas, queryDocuments, adjustCategoriaSuscripciones } from '@/lib/firebase/firestore';
import { toast } from 'sonner';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { formatearFecha } from '@/lib/utils/calculations';
import { VentaDoc, VentaPago, PagoVenta, MetodoPago } from '@/types';
import { Plan } from '@/types/categorias';
import { VentaPagosTable } from '@/components/ventas/VentaPagosTable';
import { usePagosVenta } from '@/hooks/use-pagos-venta';
import { crearPagoRenovacion } from '@/lib/services/pagosVentaService';
import { getVentaConUltimoPago } from '@/lib/services/ventaSyncService';
import { CYCLE_MONTHS } from '@/lib/constants';
import { useNotificacionesStore } from '@/store/notificacionesStore';

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
  const { deleteNotificacionesPorVenta, fetchNotificaciones } = useNotificacionesStore();

  // Estados locales para datos específicos de esta venta
  const [venta, setVenta] = useState<VentaDoc | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]); // Para dropdown de renovación (lazy loaded)
  const [categoriaPlanes, setCategoriaPlanes] = useState<Plan[]>([]); // Planes de la categoría (lazy loaded)
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

  // Función para cargar/recargar la venta con datos del último pago
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

      // Crear VentaDoc base (sin datos de pago)
      const ventaBase: VentaDoc = {
        id: doc.id as string,
        clienteId: (doc.clienteId as string) || '',
        clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
        categoriaId: (doc.categoriaId as string) || '',
        categoriaNombre: (doc.categoriaNombre as string) || undefined,
        servicioId: (doc.servicioId as string) || '',
        servicioNombre: (doc.servicioNombre as string) || 'Servicio',
        servicioCorreo: (doc.servicioCorreo as string) || '',
        perfilNumero: (doc.perfilNumero as number | null | undefined) ?? null,
        perfilNombre: (doc.perfilNombre as string) || '',
        codigo: (doc.codigo as string) || '',
        notas: (doc.notas as string) || '',
        estado: (doc.estado as VentaDoc['estado']) ?? 'activo',
        createdAt: doc.createdAt ? timestampToDate(doc.createdAt) : undefined,
        // Denormalized fields (required) - will be populated from PagoVenta
        fechaInicio: (doc.fechaInicio as Date) || new Date(),
        fechaFin: (doc.fechaFin as Date) || new Date(),
        cicloPago: (doc.cicloPago as 'mensual' | 'trimestral' | 'semestral' | 'anual') || 'mensual',
      };

      // Obtener datos actuales desde PagoVenta (fuente de verdad)
      const ventaConDatos = await getVentaConUltimoPago(ventaBase);
      setVenta(ventaConDatos);

      // Cargar la contraseña del servicio (lazy load)
      if (ventaConDatos.servicioId) {
        try {
          const servicioDoc = await getById<Record<string, unknown>>(COLLECTIONS.SERVICIOS, ventaConDatos.servicioId);
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

  useEffect(() => {
    loadVenta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return pagosVenta.map((p, index) => {
        // Si este pago no tiene fechas guardadas (legacy data), calcularlas a partir del anterior
        let fechaInicio = p.fechaInicio;
        let fechaVencimiento = p.fechaVencimiento;

        if (!fechaInicio || !fechaVencimiento) {
          // Para el pago inicial, usar las fechas de la venta
          if (p.isPagoInicial) {
            fechaInicio = venta.fechaInicio ?? p.fecha;
            fechaVencimiento = venta.fechaFin ?? p.fecha;
          } else {
            // Para renovaciones, buscar el pago anterior (en el array ya ordenado)
            const pagoAnterior = pagosVenta[index + 1]; // Array ya está ordenado desc
            if (pagoAnterior?.fechaVencimiento) {
              fechaInicio = pagoAnterior.fechaVencimiento;
              // Calcular vencimiento basado en el ciclo
              const mesesCiclo = p.cicloPago ? CYCLE_MONTHS[p.cicloPago as keyof typeof CYCLE_MONTHS] : 1;
              const fechaVenc = new Date(fechaInicio);
              fechaVenc.setMonth(fechaVenc.getMonth() + mesesCiclo);
              fechaVencimiento = fechaVenc;
            } else {
              // Fallback: usar fecha del pago
              fechaInicio = p.fecha;
              fechaVencimiento = p.fecha;
            }
          }
        }

        return {
          id: p.id,
          fecha: p.fecha,
          descripcion: p.isPagoInicial ? 'Pago Inicial' : `Renovación`,
          precio: p.precio ?? p.monto,           // Precio original (fallback a monto si no existe)
          descuento: p.descuento ?? 0,           // Porcentaje de descuento
          total: p.monto,                        // Monto final
          metodoPagoNombre: p.metodoPago,
          moneda: venta.moneda,
          isPagoInicial: p.isPagoInicial,
          notas: p.notas,
          cicloPago: p.cicloPago,
          metodoPagoId: p.metodoPagoId,
          // Usar las fechas calculadas
          fechaInicio,
          fechaVencimiento,
        } as VentaPago;
      });
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
        fecha: venta.createdAt || venta.fechaInicio || new Date(),
        descripcion: 'Pago Inicial',
        precio: venta.precio ?? 0,
        descuento: venta.descuento ?? 0,
        total: venta.precioFinal ?? 0,
        metodoPagoId: venta.metodoPagoId ?? null,
        metodoPagoNombre: venta.metodoPagoNombre,
        moneda: venta.moneda,
        isPagoInicial: true,
      },
    ];
  }, [venta, pagosVenta, loadingPagos]);

  // Cargar métodos de pago y planes solo cuando se necesite (lazy loading)
  const loadMetodosPagoYPlanes = async () => {
    if (metodosPago.length > 0 && categoriaPlanes.length > 0) return; // Ya están cargados
    try {
      // Cargar métodos de pago asociados a usuarios/clientes
      if (metodosPago.length === 0) {
        const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
          { field: 'asociadoA', operator: '==', value: 'usuario' }
        ]);
        setMetodosPago(Array.isArray(methods) ? methods : []);
      }

      // Cargar planes de la categoría
      if (categoriaPlanes.length === 0 && venta?.categoriaId) {
        const categoriaDoc = await getById<Record<string, unknown>>(COLLECTIONS.CATEGORIAS, venta.categoriaId);
        if (categoriaDoc && Array.isArray(categoriaDoc.planes)) {
          setCategoriaPlanes(categoriaDoc.planes as Plan[]);
        }
      }
    } catch (error) {
      console.error('Error cargando métodos de pago y planes:', error);
      setMetodosPago([]);
      setCategoriaPlanes([]);
    }
  };

  const handleDelete = async () => {
    if (!venta) return;
    try {
      // Eliminar todos los pagos asociados primero
      const pagosToDelete = await queryDocuments<PagoVenta>(COLLECTIONS.PAGOS_VENTA, [
        { field: 'ventaId', operator: '==', value: venta.id }
      ]);

      await Promise.all(
        pagosToDelete.map(pago => remove(COLLECTIONS.PAGOS_VENTA, pago.id))
      );

      // Eliminar la venta
      await remove(COLLECTIONS.VENTAS, venta.id);

      // Actualizar perfil ocupado del servicio
      if (venta.servicioId && venta.perfilNumero) {
        updatePerfilOcupado(venta.servicioId, false);
      }

      // Decrementar contador de servicios activos del cliente
      if (venta.clienteId && (venta.estado ?? 'activo') !== 'inactivo') {
        adjustVentasActivas(venta.clienteId, -1);
      }

      // Decrementar contadores de la categoría
      if (venta.categoriaId && venta.precioFinal) {
        await adjustCategoriaSuscripciones(
          venta.categoriaId,
          -1,
          -venta.precioFinal
        );
      }

      toast.success('Venta eliminada correctamente');
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
        venta.categoriaId,                      // Denormalizado para queries
        monto,
        metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre || '',
        data.metodoPagoId,                      // Denormalizado
        data.moneda || metodoPagoSeleccionado?.moneda || venta.moneda, // Denormalizado
        data.periodoRenovacion as VentaDoc['cicloPago'],
        data.notas?.trim(),
        data.fechaInicio,
        data.fechaVencimiento,
        data.costo,                             // Precio original
        descuentoNumero                         // Porcentaje de descuento
      );

      // Actualizar fechaFin y fechaInicio en VentaDoc para que el sync de notificaciones
      // vea la nueva fecha y no vuelva a crear la notificación
      await update(COLLECTIONS.VENTAS, id, {
        fechaFin: data.fechaVencimiento,
        fechaInicio: data.fechaInicio,
        cicloPago: data.periodoRenovacion,
      });

      // Recargar la venta actualizada (sin loading screen)
      if (id && venta) {
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (doc) {
          const ventaBase: VentaDoc = {
            id: doc.id as string,
            clienteId: (doc.clienteId as string) || '',
            clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
            categoriaId: (doc.categoriaId as string) || '',
            categoriaNombre: (doc.categoriaNombre as string) || undefined,
            servicioId: (doc.servicioId as string) || '',
            servicioNombre: (doc.servicioNombre as string) || 'Servicio',
            servicioCorreo: (doc.servicioCorreo as string) || undefined,
            servicioContrasena: (doc.servicioContrasena as string) || undefined,
            estado: (doc.estado as VentaDoc['estado']) ?? 'activo',
            perfilNumero: (doc.perfilNumero as number) ?? null,
            perfilNombre: (doc.perfilNombre as string) || undefined,
            codigo: (doc.codigo as string) || undefined,
            notas: (doc.notas as string) || undefined,
            createdAt: (doc.createdAt as Date) || undefined,
            updatedAt: (doc.updatedAt as Date) || undefined,
            // Denormalized fields
            fechaInicio: (doc.fechaInicio as Date) || new Date(),
            fechaFin: (doc.fechaFin as Date) || new Date(),
            cicloPago: (doc.cicloPago as 'mensual' | 'trimestral' | 'semestral' | 'anual') || 'mensual',
          };
          const ventaActualizada = await getVentaConUltimoPago(ventaBase);
          setVenta(ventaActualizada);
        }
      }

      // Recargar los pagos
      refreshPagos();

      // Eliminar notificación asociada a esta venta y refrescar el store
      await deleteNotificacionesPorVenta(id);
      fetchNotificaciones(true);

      // Cerrar el diálogo
      setRenovarDialogOpen(false);

      toast.success('Venta renovada exitosamente');
    } catch (error) {
      console.error('Error renovando venta:', error);
      toast.error('Error al renovar venta');
    }
  };

  const handleEditarPago = async (pago: VentaPago) => {
    await loadMetodosPagoYPlanes(); // Cargar métodos de pago y planes antes de abrir el diálogo
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
    metodoPagoNombre?: string;
    moneda?: string;
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
      const metodoPagoSeleccionado = metodosPago.find((m) => m.id === data.metodoPagoId);
      const descuentoNumero = Number(data.descuento) || 0;
      const monto = Math.max(data.costo * (1 - descuentoNumero / 100), 0);

      // Actualizar el pago en la colección pagosVenta (fuente de verdad)
      await update(COLLECTIONS.PAGOS_VENTA, pagoToEdit.id, {
        precio: data.costo,                         // Precio original
        descuento: descuentoNumero,                 // Porcentaje de descuento
        monto,                                      // Monto final
        metodoPagoId: data.metodoPagoId,            // Denormalizado
        metodoPago: data.metodoPagoNombre || metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre,
        moneda: data.moneda || metodoPagoSeleccionado?.moneda || venta.moneda,  // Denormalizado
        cicloPago: data.periodoRenovacion as VentaDoc['cicloPago'],
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        notas: data.notas?.trim() || '',
      });

      // ✅ NO sincronizar con VentaDoc - PagoVenta es la fuente de verdad

      setEditarPagoDialogOpen(false);
      setPagoToEdit(null);

      // Recargar la venta actualizada (sin loading screen)
      if (id && venta) {
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (doc) {
          const ventaBase: VentaDoc = {
            id: doc.id as string,
            clienteId: (doc.clienteId as string) || '',
            clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
            categoriaId: (doc.categoriaId as string) || '',
            categoriaNombre: (doc.categoriaNombre as string) || undefined,
            servicioId: (doc.servicioId as string) || '',
            servicioNombre: (doc.servicioNombre as string) || 'Servicio',
            servicioCorreo: (doc.servicioCorreo as string) || undefined,
            servicioContrasena: (doc.servicioContrasena as string) || undefined,
            estado: (doc.estado as VentaDoc['estado']) ?? 'activo',
            perfilNumero: (doc.perfilNumero as number) ?? null,
            perfilNombre: (doc.perfilNombre as string) || undefined,
            codigo: (doc.codigo as string) || undefined,
            notas: (doc.notas as string) || undefined,
            createdAt: (doc.createdAt as Date) || undefined,
            updatedAt: (doc.updatedAt as Date) || undefined,
            // Denormalized fields
            fechaInicio: (doc.fechaInicio as Date) || new Date(),
            fechaFin: (doc.fechaFin as Date) || new Date(),
            cicloPago: (doc.cicloPago as 'mensual' | 'trimestral' | 'semestral' | 'anual') || 'mensual',
          };
          const ventaActualizada = await getVentaConUltimoPago(ventaBase);
          setVenta(ventaActualizada);
        }
      }

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
      // Eliminar el pago de la colección pagosVenta (fuente de verdad)
      await remove(COLLECTIONS.PAGOS_VENTA, pagoToDelete.id);

      // ✅ NO sincronizar con VentaDoc - PagoVenta es la fuente de verdad
      // El pago más reciente que quede seguirá siendo la fuente de verdad

      setDeletePagoDialogOpen(false);
      setPagoToDelete(null);

      // Recargar la venta actualizada (sin loading screen)
      if (id && venta) {
        const doc = await getById<Record<string, unknown>>(COLLECTIONS.VENTAS, id);
        if (doc) {
          const ventaBase: VentaDoc = {
            id: doc.id as string,
            clienteId: (doc.clienteId as string) || '',
            clienteNombre: (doc.clienteNombre as string) || 'Sin cliente',
            categoriaId: (doc.categoriaId as string) || '',
            categoriaNombre: (doc.categoriaNombre as string) || undefined,
            servicioId: (doc.servicioId as string) || '',
            servicioNombre: (doc.servicioNombre as string) || 'Servicio',
            servicioCorreo: (doc.servicioCorreo as string) || undefined,
            servicioContrasena: (doc.servicioContrasena as string) || undefined,
            estado: (doc.estado as VentaDoc['estado']) ?? 'activo',
            perfilNumero: (doc.perfilNumero as number) ?? null,
            perfilNombre: (doc.perfilNombre as string) || undefined,
            codigo: (doc.codigo as string) || undefined,
            notas: (doc.notas as string) || undefined,
            createdAt: (doc.createdAt as Date) || undefined,
            updatedAt: (doc.updatedAt as Date) || undefined,
            // Denormalized fields
            fechaInicio: (doc.fechaInicio as Date) || new Date(),
            fechaFin: (doc.fechaFin as Date) || new Date(),
            cicloPago: (doc.cicloPago as 'mensual' | 'trimestral' | 'semestral' | 'anual') || 'mensual',
          };
          const ventaActualizada = await getVentaConUltimoPago(ventaBase);
          setVenta(ventaActualizada);
        }
      }

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cargando venta...</h1>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Venta no encontrada</h1>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ventas">
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Detalles de Venta: {venta.clienteNombre}</h1>
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
              await loadMetodosPagoYPlanes(); // Cargar métodos de pago y planes solo cuando se necesite
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 md:gap-x-8">
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

          <div className="border-t pt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 md:gap-x-8">
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
            moneda={venta.moneda || 'USD'}
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
        venta={{
          clienteNombre: venta.clienteNombre,
          metodoPagoId: venta.metodoPagoId,
          precioFinal: venta.precioFinal ?? 0,
          fechaFin: venta.fechaFin ?? new Date(),
        }}
        metodosPago={metodosPago}
        categoriaPlanes={categoriaPlanes}
        tipoPlan={undefined}
        onConfirm={handleConfirmRenovacion}
      />

      <PagoDialog
        context="venta"
        mode="edit"
        open={editarPagoDialogOpen}
        onOpenChange={setEditarPagoDialogOpen}
        venta={{
          clienteNombre: venta.clienteNombre,
          metodoPagoId: venta.metodoPagoId,
          precioFinal: venta.precioFinal ?? 0,
          fechaFin: venta.fechaFin ?? new Date(),
        }}
        pago={pagoToEdit}
        metodosPago={metodosPago}
        categoriaPlanes={categoriaPlanes}
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






