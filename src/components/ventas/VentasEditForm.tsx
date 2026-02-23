'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLLECTIONS, queryDocuments, update, adjustServiciosActivos } from '@/lib/firebase/firestore';
import { upsertVentaPronostico } from '@/lib/services/dashboardStatsService';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useUsuariosStore } from '@/store/usuariosStore';
import { MetodoPago, PagoVenta, Servicio } from '@/types';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/lib/constants';
import { formatearFecha } from '@/lib/utils/calculations';

const ventaEditSchema = z.object({
  clienteId: z.string().min(1, 'Seleccione un cliente'),
  metodoPagoId: z.string().min(1, 'Seleccione un método de pago'),
  categoriaId: z.string().min(1, 'Seleccione una categoría'),
  servicioId: z.string().min(1, 'Seleccione un servicio'),
  planId: z.string().min(1, 'Seleccione un plan'),
  perfilNumero: z.string().optional(),
  perfilNombre: z.string().optional(),
  precio: z.string().min(1, 'Ingrese un precio válido'),
  descuento: z.string().optional(),
  fechaInicio: z.date(),
  fechaFin: z.date(),
  codigo: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']),
  notas: z.string().optional(),
});

type VentaEditFormData = z.infer<typeof ventaEditSchema>;

const MESES_POR_CICLO: Record<string, number> = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export interface VentaEditData {
  id: string;
  clienteId: string;
  clienteNombre: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  moneda: string;
  categoriaId: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo: string;
  perfilNumero?: number | null;
  perfilNombre?: string;
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio: Date;
  fechaFin: Date;
  codigo?: string;
  estado?: 'activo' | 'inactivo';
  precio: number;
  descuento: number;
  precioFinal: number;
  notas?: string;
}


const getCicloPagoLabel = (ciclo?: string) => {
  const labels: Record<string, string> = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };
  return ciclo ? labels[ciclo] || ciclo : '—';
};

interface VentasEditFormProps {
  venta: VentaEditData;
}

export function VentasEditForm({ venta }: VentasEditFormProps) {
  const router = useRouter();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { fetchMetodosPagoUsuarios } = useMetodosPagoStore();
  const { updatePerfilOcupado } = useServiciosStore();
  const { usuarios, fetchUsuarios } = useUsuariosStore();

  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  // Estado local para servicios (cargados solo cuando se selecciona categoría)
  const [serviciosCategoria, setServiciosCategoria] = useState<Servicio[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);

  const [activeTab, setActiveTab] = useState<'datos' | 'preview'>('datos');
  const [isDatosTabComplete, setIsDatosTabComplete] = useState(false);
  const [fechaInicioOpen, setFechaInicioOpen] = useState(false);
  const [fechaFinOpen, setFechaFinOpen] = useState(false);
  const [perfilesOcupadosVenta, setPerfilesOcupadosVenta] = useState<Record<string, Set<number>>>({});
  const [fechasInicializadas, setFechasInicializadas] = useState(false);

  // Efecto inicial: solo cargar datos que no dependen de selección
  useEffect(() => {
    const loadData = async () => {
      fetchCategorias();
      fetchUsuarios();

      // Cargar solo métodos de pago de usuarios
      const metodos = await fetchMetodosPagoUsuarios();
      setMetodosPago(metodos);
    };
    loadData();
  }, [fetchCategorias, fetchMetodosPagoUsuarios, fetchUsuarios]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VentaEditFormData>({
    resolver: zodResolver(ventaEditSchema),
    defaultValues: {
      clienteId: venta.clienteId,
      metodoPagoId: venta.metodoPagoId,
      categoriaId: venta.categoriaId,
      servicioId: venta.servicioId,
      planId: '',
      perfilNumero: venta.perfilNumero ? String(venta.perfilNumero) : '',
      perfilNombre: venta.perfilNombre || '',
      precio: venta.precio.toFixed(2),
      descuento: venta.descuento?.toFixed(2) ?? '',
      fechaInicio: venta.fechaInicio,
      fechaFin: venta.fechaFin,
      codigo: venta.codigo || '',
      estado: venta.estado || 'activo',
      notas: venta.notas || '',
    },
  });

  const clienteIdValue = watch('clienteId');
  const metodoPagoIdValue = watch('metodoPagoId');
  const categoriaIdValue = watch('categoriaId');
  const servicioIdValue = watch('servicioId');
  const planIdValue = watch('planId');
  const perfilNumeroValue = watch('perfilNumero');
  const perfilNombreValue = watch('perfilNombre');
  const fechaInicioValue = watch('fechaInicio');
  const fechaFinValue = watch('fechaFin');
  const precioValue = watch('precio');
  const descuentoValue = watch('descuento');
  const codigoValue = watch('codigo');
  const estadoValue = watch('estado');
  const notasValue = watch('notas');

  const clientes = useMemo(() => usuarios.filter((u) => u.tipo === 'cliente'), [usuarios]);
  const clienteSeleccionado = clientes.find((c) => c.id === clienteIdValue);
  const metodoPagoSeleccionado = metodosPago.find((m) => m.id === metodoPagoIdValue);

  // Efecto para cargar servicios cuando se selecciona una categoría
  useEffect(() => {
    if (!categoriaIdValue) {
      setServiciosCategoria([]);
      return;
    }

    const loadServiciosCategoria = async () => {
      setLoadingServicios(true);
      try {
        const servicios = await queryDocuments<Servicio>(COLLECTIONS.SERVICIOS, [
          { field: 'categoriaId', operator: '==', value: categoriaIdValue },
        ]);
        setServiciosCategoria(servicios);
      } catch (error) {
        console.error('Error cargando servicios:', error);
        setServiciosCategoria([]);
      } finally {
        setLoadingServicios(false);
      }
    };
    loadServiciosCategoria();
  }, [categoriaIdValue]);

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === categoriaIdValue),
    [categorias, categoriaIdValue]
  );

  const serviciosOrdenados = useMemo(() => {
    return [...serviciosCategoria]
      .filter((servicio) => {
        // Siempre mostrar el servicio actual de la venta (aunque esté lleno o inactivo)
        if (servicio.id === venta.servicioId) return true;
        // Solo mostrar servicios activos con perfiles disponibles
        if (!servicio.activo) return false;
        const disponibles = (servicio.perfilesDisponibles || 0) - (servicio.perfilesOcupados || 0);
        return disponibles > 0;
      })
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }, [serviciosCategoria, venta.servicioId]);

  const servicioSeleccionado = serviciosCategoria.find((s) => s.id === servicioIdValue);

  const tipoItem = useMemo<'cuenta' | 'perfil' | null>(() => {
    if (!servicioSeleccionado?.tipo) return null;
    return servicioSeleccionado.tipo === 'cuenta_completa' ? 'cuenta' : 'perfil';
  }, [servicioSeleccionado?.tipo]);

  const planesDisponibles = useMemo(() => {
    if (!categoriaSeleccionada?.planes || !servicioSeleccionado?.tipo) return [];
    return categoriaSeleccionada.planes.filter((plan) =>
      servicioSeleccionado.tipo === 'cuenta_completa'
        ? plan.tipoPlan === 'cuenta_completa'
        : plan.tipoPlan === 'perfiles'
    );
  }, [categoriaSeleccionada, servicioSeleccionado?.tipo]);

  const planSeleccionado = useMemo(
    () => planesDisponibles.find((plan) => plan.id === planIdValue),
    [planesDisponibles, planIdValue]
  );

  // Track if the form has been manually initialized to avoid overwriting custom prices
  const [precioInicializado, setPrecioInicializado] = useState(false);

  // Track if plan was manually initialized to avoid overwriting manual changes
  const [planInicializado, setPlanInicializado] = useState(false);

  // Track the last plan ID to detect manual changes
  const [lastPlanId, setLastPlanId] = useState<string | null>(null);

  // Inicializar el precio desde la venta una sola vez
  useEffect(() => {
    if (!precioInicializado && venta.precio > 0) {
      setValue('precio', venta.precio.toFixed(2));
      setPrecioInicializado(true);
    }
  }, [venta.precio, precioInicializado, setValue]);

  // Auto-calcular precio cuando el usuario cambia manualmente el plan
  useEffect(() => {
    // Si no hay plan seleccionado, no hacer nada
    if (!planSeleccionado) return;

    // Detectar si el plan cambió manualmente
    const planCambio = lastPlanId !== null && lastPlanId !== planIdValue;

    // Si el plan cambió manualmente, actualizar el precio
    // Si aún no está inicializado, también actualizar (primera vez)
    if (planCambio || !precioInicializado) {
      setValue('precio', planSeleccionado.precio.toFixed(2));
    }
  }, [planSeleccionado, setValue, precioInicializado, planIdValue, lastPlanId]);

  // Track last fechaInicio to detect manual changes
  const [lastFechaInicioTime, setLastFechaInicioTime] = useState<number | null>(null);

  // Marcar las fechas como inicializadas una vez que se cargan desde la venta
  useEffect(() => {
    if (fechaInicioValue && fechaFinValue && !fechasInicializadas) {
      setLastFechaInicioTime(fechaInicioValue.getTime());
      setFechasInicializadas(true);
    }
  }, [fechaInicioValue, fechaFinValue, fechasInicializadas]);

  useEffect(() => {
    // Solo calcular si hay un plan seleccionado, una fecha de inicio, y ya se inicializó
    if (!planSeleccionado || !fechaInicioValue || !fechasInicializadas) return;

    // Detectar si el plan cambió manualmente
    const planCambio = lastPlanId !== null && lastPlanId !== planIdValue;
    // Detectar si la fecha de inicio cambió manualmente
    const fechaInicioCambio = lastFechaInicioTime !== null && lastFechaInicioTime !== fechaInicioValue.getTime();

    // Si el plan o la fecha de inicio cambiaron, recalcular
    if (planCambio || fechaInicioCambio) {
      const meses = MESES_POR_CICLO[planSeleccionado.cicloPago] ?? 1;
      const fechaCalculada = addMonths(new Date(fechaInicioValue), meses);
      setValue('fechaFin', fechaCalculada);
    }

    // Actualizar tracking
    if (planCambio) setLastPlanId(planIdValue);
    if (fechaInicioCambio) setLastFechaInicioTime(fechaInicioValue.getTime());
  }, [planSeleccionado, fechaInicioValue, setValue, planIdValue, lastPlanId, fechasInicializadas, lastFechaInicioTime]);

  // Efecto para pre-seleccionar el plan cuando los planes están disponibles (solo una vez)
  useEffect(() => {
    // Solo ejecutar si NO ha sido inicializado y hay planes disponibles y la venta tiene un cicloPago definido
    if (!planInicializado && planesDisponibles.length > 0 && venta.cicloPago) {
      // Buscar el plan que coincida con el cicloPago de la venta
      const match = planesDisponibles.find((p) => p.cicloPago === venta.cicloPago);
      if (match) {
        setValue('planId', match.id);
        setLastPlanId(match.id);
        setPlanInicializado(true);
      } else if (!planIdValue) {
        // Si no hay coincidencia exacta y no hay plan seleccionado, seleccionar el primero
        setValue('planId', planesDisponibles[0].id);
        setLastPlanId(planesDisponibles[0].id);
        setPlanInicializado(true);
      }
    }
  }, [planesDisponibles, planIdValue, setValue, venta.cicloPago, planInicializado]);

  useEffect(() => {
    const loadPerfilesOcupados = async () => {
      if (!servicioIdValue) return;
      try {
        const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.VENTAS, [
          { field: 'servicioId', operator: '==', value: servicioIdValue },
        ]);
        const ocupados = new Set<number>();
        docs.forEach((doc) => {
          const estado = (doc.estado as string | undefined) ?? 'activo';
          if (estado === 'inactivo') return;
          const perfil = (doc.perfilNumero as number | null | undefined) ?? null;
          if (!perfil) return;
          if (doc.id === venta.id) return;
          ocupados.add(perfil);
        });
        setPerfilesOcupadosVenta((prev) => ({ ...prev, [servicioIdValue]: ocupados }));
      } catch (error) {
        console.error('Error cargando perfiles ocupados por ventas:', error);
        setPerfilesOcupadosVenta((prev) => ({ ...prev, [servicioIdValue]: new Set() }));
      }
    };

    loadPerfilesOcupados();
  }, [servicioIdValue, venta.id]);

  const slotsDisponibles = useMemo(() => {
    if (!servicioSeleccionado) return 0;
    // perfilesOcupadosVenta ya excluye la venta actual (doc.id === venta.id)
    // Es la fuente de verdad real; no combinar con perfilesOcupados para evitar doble conteo
    if (perfilesOcupadosVenta[servicioIdValue] !== undefined) {
      return Math.max((servicioSeleccionado.perfilesDisponibles || 0) - perfilesOcupadosVenta[servicioIdValue].size, 0);
    }
    // Mientras carga, usar el campo denormalizado como fallback
    return Math.max((servicioSeleccionado.perfilesDisponibles || 0) - (servicioSeleccionado.perfilesOcupados || 0), 0);
  }, [servicioSeleccionado, perfilesOcupadosVenta, servicioIdValue]);

  const simboloMoneda = getCurrencySymbol(metodoPagoSeleccionado?.moneda || venta.moneda);
  const precioBase = Number(precioValue) || 0;
  const descuentoNumero = Number(descuentoValue) || 0;
  const precioFinal = Math.max(precioBase * (1 - descuentoNumero / 100), 0);

  const hasChanges = useMemo(() => {
    if (clienteIdValue !== venta.clienteId) return true;
    if (metodoPagoIdValue !== venta.metodoPagoId) return true;
    if (categoriaIdValue !== venta.categoriaId) return true;
    if (servicioIdValue !== venta.servicioId) return true;
    if (planIdValue && planIdValue !== '') {
      const planActual = planSeleccionado?.id || '';
      if (planActual !== planIdValue) return true;
    }
    const perfilActual = venta.perfilNumero ? String(venta.perfilNumero) : '';
    if ((perfilNumeroValue || '') !== perfilActual) return true;
    if ((perfilNombreValue || '') !== (venta.perfilNombre || '')) return true;
    if ((precioValue || '') !== venta.precio.toFixed(2)) return true;
    if ((descuentoValue || '') !== (venta.descuento?.toFixed(2) ?? '')) return true;
    if ((codigoValue || '') !== (venta.codigo || '')) return true;
    if ((estadoValue || 'activo') !== (venta.estado || 'activo')) return true;
    if ((notasValue || '') !== (venta.notas || '')) return true;
    if (fechaInicioValue && venta.fechaInicio && new Date(fechaInicioValue).getTime() !== new Date(venta.fechaInicio).getTime()) return true;
    if (fechaFinValue && venta.fechaFin && new Date(fechaFinValue).getTime() !== new Date(venta.fechaFin).getTime()) return true;
    return false;
  }, [
    clienteIdValue,
    metodoPagoIdValue,
    categoriaIdValue,
    servicioIdValue,
    planIdValue,
    planSeleccionado?.id,
    perfilNumeroValue,
    precioValue,
    descuentoValue,
    notasValue,
    fechaInicioValue,
    fechaFinValue,
    venta,
    codigoValue,
    estadoValue,
    perfilNombreValue,
  ]);

  const handleNext = async () => {
    let isValid = true;
    if (!clienteIdValue) {
      setError('clienteId', { type: 'manual', message: 'Seleccione un cliente' });
      isValid = false;
    }
    if (!metodoPagoIdValue) {
      setError('metodoPagoId', { type: 'manual', message: 'Seleccione un método de pago' });
      isValid = false;
    }
    if (!categoriaIdValue) {
      setError('categoriaId', { type: 'manual', message: 'Seleccione una categoría' });
      isValid = false;
    }
    if (!servicioIdValue) {
      setError('servicioId', { type: 'manual', message: 'Seleccione un servicio' });
      isValid = false;
    }
    if (!planIdValue) {
      setError('planId', { type: 'manual', message: 'Seleccione un plan' });
      isValid = false;
    }
    if (tipoItem === 'perfil' && !perfilNumeroValue) {
      setError('perfilNumero', { type: 'manual', message: 'Seleccione un perfil' });
      isValid = false;
    }
    if (!fechaInicioValue) {
      setError('fechaInicio', { type: 'manual', message: 'Seleccione fecha de inicio' });
      isValid = false;
    }
    if (!fechaFinValue) {
      setError('fechaFin', { type: 'manual', message: 'Seleccione fecha de fin' });
      isValid = false;
    }
    if (!isValid) return;

    setIsDatosTabComplete(true);
    setActiveTab('preview');
  };

  const handleTabChange = async (value: string) => {
    if (value === 'preview' && !isDatosTabComplete) {
      await handleNext();
      return;
    }
    setActiveTab(value as typeof activeTab);
  };

  const onSubmit = async (data: VentaEditFormData) => {
    try {
      const servicio = serviciosCategoria.find((s) => s.id === data.servicioId);
      const categoria = categorias.find((c) => c.id === data.categoriaId);
      const plan = categoria?.planes?.find((p) => p.id === data.planId);
      const precio = Number(data.precio) || 0;
      const descuento = Number(data.descuento) || 0;
      const precioFinalValue = Math.max(precio * (1 - descuento / 100), 0);

      // Actualizar SOLO metadatos en VentaDoc + campos denormalizados para notificaciones
      await update(COLLECTIONS.VENTAS, venta.id, {
        clienteId: data.clienteId,
        clienteNombre: clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : venta.clienteNombre,
        clienteTelefono: clienteSeleccionado?.telefono || '',  // For WhatsApp notifications
        categoriaId: data.categoriaId,
        servicioId: data.servicioId,
        servicioNombre: servicio?.nombre || venta.servicioNombre,
        servicioCorreo: servicio?.correo || venta.servicioCorreo,
        perfilNumero: Number(data.perfilNumero) || null,
        perfilNombre: data.perfilNombre?.trim() || '',
        codigo: data.codigo || '',
        estado: data.estado || 'activo',
        notas: data.notas || '',
        // ✅ DENORMALIZED FIELDS (for notifications sync)
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        cicloPago: plan?.cicloPago || venta.cicloPago,
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre || '',
        moneda: metodoPagoSeleccionado?.moneda || venta.moneda || 'USD',
        precio,
        descuento,
        precioFinal: precioFinalValue,
      });

      // Actualizar el pago más reciente (fuente de verdad para datos de pago)
      const todosLosPagos = await queryDocuments<PagoVenta>(COLLECTIONS.PAGOS_VENTA, [
        { field: 'ventaId', operator: '==', value: venta.id }
      ]);

      if (todosLosPagos.length > 0) {
        // Ordenar por fecha descendente para encontrar el más reciente
        const sorted = todosLosPagos.sort((a, b) => {
          const dateA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
          const dateB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
          return dateB.getTime() - dateA.getTime();
        });

        const pagoMasReciente = sorted[0];

        // Actualizar TODOS los campos de pago (sin condicionales)
        await update(COLLECTIONS.PAGOS_VENTA, pagoMasReciente.id, {
          precio,
          descuento,
          monto: precioFinalValue,
          metodoPagoId: data.metodoPagoId,
          metodoPago: metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre || '',
          moneda: metodoPagoSeleccionado?.moneda || venta.moneda || 'USD',
          cicloPago: plan?.cicloPago || venta.cicloPago,
          fechaInicio: data.fechaInicio,
          fechaVencimiento: data.fechaFin,
        });
      }

      const prevPerfil = venta.perfilNumero ?? null;
      const nextPerfil = Number(data.perfilNumero) || null;
      const prevServicioId = venta.servicioId;
      const nextServicioId = data.servicioId;
      const prevActivo = (venta.estado ?? 'activo') !== 'inactivo' && !!prevPerfil;
      const nextActivo = (data.estado ?? 'activo') !== 'inactivo' && !!nextPerfil;

      if (prevActivo && !nextActivo) {
        updatePerfilOcupado(prevServicioId, false);
      } else if (!prevActivo && nextActivo) {
        updatePerfilOcupado(nextServicioId, true);
      } else if (prevActivo && nextActivo && prevServicioId !== nextServicioId) {
        updatePerfilOcupado(prevServicioId, false);
        updatePerfilOcupado(nextServicioId, true);
      }

      // Ajustar ventasActivas si el estado cambió entre activo e inactivo
      const prevEstadoActivo = (venta.estado ?? 'activo') !== 'inactivo';
      const nextEstadoActivo = (data.estado ?? 'activo') !== 'inactivo';
      if (prevEstadoActivo && !nextEstadoActivo) {
        adjustServiciosActivos(venta.clienteId, -1);
      } else if (!prevEstadoActivo && nextEstadoActivo) {
        adjustServiciosActivos(venta.clienteId, +1);
      }

      // Sync dashboard forecast when estado changes
      if (prevEstadoActivo !== nextEstadoActivo) {
        const ventaPronostico = nextEstadoActivo
          ? {
              id: venta.id,
              categoriaId: data.categoriaId,
              fechaInicio: data.fechaInicio instanceof Date ? data.fechaInicio.toISOString() : String(data.fechaInicio),
              fechaFin: data.fechaFin instanceof Date ? data.fechaFin.toISOString() : String(data.fechaFin),
              cicloPago: plan?.cicloPago || venta.cicloPago || 'mensual',
              precioFinal: precioFinalValue,
              moneda: metodoPagoSeleccionado?.moneda || venta.moneda || 'USD',
            }
          : null;
        upsertVentaPronostico(ventaPronostico, venta.id).catch(() => {});
        // Invalidate dashboard cache so it re-fetches on next visit
        import('@/store/dashboardStore').then(({ useDashboardStore }) => {
          useDashboardStore.getState().invalidateCache();
        }).catch(() => {});
      }

      toast.success('Venta actualizada', { description: 'Los datos de la venta han sido guardados correctamente.' });
      router.push(`/ventas/${venta.id}`);
    } catch (error) {
      console.error('Error actualizando venta:', error);
      toast.error('Error al actualizar la venta', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="datos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Información de la venta
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm ${
              !isDatosTabComplete ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Vista previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between">
                    {clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : 'Seleccionar cliente'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {clientes.map((cliente) => (
                    <DropdownMenuItem
                      key={cliente.id}
                      onClick={() => {
                        setValue('clienteId', cliente.id);
                        clearErrors('clienteId');
                      }}
                    >
                      {cliente.nombre} {cliente.apellido}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.clienteId && <p className="text-sm text-red-500">{errors.clienteId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between">
                    {metodoPagoSeleccionado ? metodoPagoSeleccionado.nombre : 'Seleccionar método de pago'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {metodosPago.map((metodo) => (
                    <DropdownMenuItem
                      key={metodo.id}
                      onClick={() => {
                        setValue('metodoPagoId', metodo.id);
                        clearErrors('metodoPagoId');
                      }}
                    >
                      {metodo.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.metodoPagoId && <p className="text-sm text-red-500">{errors.metodoPagoId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between">
                    {categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccionar categoría'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {categorias.map((categoria) => (
                    <DropdownMenuItem
                      key={categoria.id}
                      onClick={() => {
                        setValue('categoriaId', categoria.id);
                        setValue('servicioId', '');
                        setValue('planId', '');
                        setValue('perfilNumero', '');
                        clearErrors('categoriaId');
                      }}
                    >
                      {categoria.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.categoriaId && <p className="text-sm text-red-500">{errors.categoriaId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Servicio</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between" disabled={!categoriaIdValue || loadingServicios}>
                    {loadingServicios
                      ? 'Cargando servicios...'
                      : servicioIdValue
                      ? `${serviciosCategoria.find((s) => s.id === servicioIdValue)?.nombre} - ${serviciosCategoria.find((s) => s.id === servicioIdValue)?.correo}`
                      : categoriaIdValue
                        ? 'Seleccionar servicio'
                        : 'Primero selecciona categoría'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {serviciosOrdenados.map((servicio) => (
                    <DropdownMenuItem
                      key={servicio.id}
                      onClick={() => {
                        setValue('servicioId', servicio.id);
                        setValue('perfilNumero', '');
                        clearErrors('servicioId');
                      }}
                    >
                      {servicio.nombre} - {servicio.correo}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.servicioId && <p className="text-sm text-red-500">{errors.servicioId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Plan</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between" disabled={!categoriaIdValue}>
                    {planSeleccionado
                      ? planSeleccionado.nombre
                      : categoriaIdValue
                        ? 'Seleccionar plan'
                        : 'Primero selecciona categoría'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {planesDisponibles.map((plan) => (
                    <DropdownMenuItem
                      key={plan.id}
                      onClick={() => {
                        setValue('planId', plan.id);
                        clearErrors('planId');
                      }}
                    >
                      {plan.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.planId && <p className="text-sm text-red-500">{errors.planId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-between"
                    disabled={slotsDisponibles <= 0 && !perfilNumeroValue}
                  >
                    {perfilNumeroValue
                      ? `Perfil ${perfilNumeroValue}`
                      : slotsDisponibles > 0
                        ? 'Seleccionar perfil'
                        : 'No hay perfiles disponibles'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {Array.from({ length: servicioSeleccionado?.perfilesDisponibles || 0 }, (_, index) => {
                    const numero = index + 1;
                    const ocupadoEnVentas = perfilesOcupadosVenta[servicioIdValue]?.has(numero);
                    if (ocupadoEnVentas && String(numero) !== perfilNumeroValue) return null;
                    return (
                      <DropdownMenuItem
                        key={numero}
                        onClick={() => {
                          setValue('perfilNumero', String(numero));
                          clearErrors('perfilNumero');
                        }}
                      >
                        Perfil {numero}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.perfilNumero && <p className="text-sm text-red-500">{errors.perfilNumero.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Precio</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none select-none">
                  {simboloMoneda}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="pl-10"
                  {...register('precio')}
                />
              </div>
              {errors.precio && <p className="text-sm text-red-500">{errors.precio.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Descuento %</Label>
              <Input type="text" inputMode="decimal" {...register('descuento')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Popover open={fechaInicioOpen} onOpenChange={setFechaInicioOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn('w-full justify-start text-left font-normal', !fechaInicioValue && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicioValue ? formatearFecha(fechaInicioValue) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicioValue}
                    onSelect={(date) => setValue('fechaInicio', date || new Date())}
                    defaultMonth={fechaInicioValue ?? new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {errors.fechaInicio && <p className="text-sm text-red-500">{errors.fechaInicio.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Fecha de fin</Label>
              <Popover open={fechaFinOpen} onOpenChange={setFechaFinOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn('w-full justify-start text-left font-normal', !fechaFinValue && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFinValue ? formatearFecha(fechaFinValue) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaFinValue}
                    onSelect={(date) => setValue('fechaFin', date || new Date())}
                    defaultMonth={fechaFinValue ?? new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {errors.fechaFin && <p className="text-sm text-red-500">{errors.fechaFin.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre del Perfil</Label>
              <Input
                type="text"
                {...register('perfilNombre')}
                placeholder="Ej: Perfil Kids"
              />
            </div>

            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input
                type="text"
                inputMode="numeric"
                {...register('codigo')}
                onKeyDown={(e) => {
                  const char = e.key;
                  if (
                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)
                  ) {
                    return;
                  }
                  if (e.ctrlKey || e.metaKey) {
                    return;
                  }
                  if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Precio final</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none select-none">
                  {simboloMoneda}
                </span>
                <Input
                  type="text"
                  value={precioFinal.toFixed(2)}
                  readOnly
                  tabIndex={-1}
                  className="pl-10 pointer-events-none bg-muted/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between">
                    {estadoValue === 'inactivo' ? 'Inactivo' : 'Activo'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setValue('estado', 'activo')}>Activo</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue('estado', 'inactivo')}>Inactivo</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={4} {...register('notas')} placeholder="Notas adicionales" />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-0">
                <h2 className="text-lg font-semibold">Vista previa de la venta</h2>
                <p className="-mt-1 text-sm text-muted-foreground">Resumen general antes de guardar.</p>
              </div>
            </div>

            <div className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-background/40 p-4">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-sm font-medium">{clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : venta.clienteNombre}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-4">
                <p className="text-xs text-muted-foreground">Método de pago</p>
                <p className="text-sm font-medium">{metodoPagoSeleccionado?.nombre || venta.metodoPagoNombre}</p>
              </div>
            </div>

            <div className="mt-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Items agregados</h3>
                <span className="text-sm text-muted-foreground">1 item</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border bg-background/40 p-4 w-full md:w-[280px] md:flex-[0_0_auto]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{servicioSeleccionado?.nombre || venta.servicioNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCicloPagoLabel(planSeleccionado?.cicloPago || venta.cicloPago)}
                      </p>
                    </div>
                    <span className="text-green-500 font-semibold">{simboloMoneda} {precioFinal.toFixed(2)}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Fecha de inicio</p>
                      <p className="text-foreground font-medium">
                        {fechaInicioValue ? formatearFecha(fechaInicioValue) : '—'}
                      </p>
                    </div>
                    <div>
                      <p>Fecha de fin</p>
                      <p className="text-foreground font-medium">
                        {fechaFinValue ? formatearFecha(fechaFinValue) : '—'}
                      </p>
                    </div>
                    <div>
                      <p>Precio</p>
                      <p className="text-foreground font-medium">{simboloMoneda} {precioBase.toFixed(2)}</p>
                    </div>
                    <div>
                      <p>Descuento</p>
                      <p className="text-foreground font-medium">{descuentoNumero.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Nombre del perfil</p>
                      <p className="text-foreground font-medium">{perfilNombreValue?.trim() ? perfilNombreValue : '—'}</p>
                    </div>
                    <div>
                      <p>Codigo</p>
                      <p className="text-foreground font-medium">{codigoValue || '—'}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Precio final</p>
                    <p className="text-foreground font-medium">{simboloMoneda} {precioFinal.toFixed(2)}</p>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Notas</p>
                    <p className="text-foreground font-medium">{watch('notas') || 'Sin notas'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">Total de la venta</span>
                <span className="text-xl font-semibold text-green-500">{simboloMoneda} {precioFinal.toFixed(2)}</span>
              </div>
              <div className="mt-0 text-sm text-muted-foreground">
                El total corresponde a la suma de todos los items agregados.
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        {activeTab === 'preview' ? (
          <>
            <Button type="button" variant="outline" onClick={() => setActiveTab('datos')}>
              Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              Guardar cambios
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => router.push(`/ventas/${venta.id}`)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleNext();
              }}
            >
              Siguiente
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
