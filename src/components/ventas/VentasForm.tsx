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
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDown, MessageCircle, Plus, Trash2, User } from 'lucide-react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useUsuariosStore } from '@/store/usuariosStore';
import { useTemplatesMensajesStore } from '@/store/templatesMensajesStore';
import { toast } from 'sonner';
import { COLLECTIONS, create, queryDocuments } from '@/lib/firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { formatearFechaWhatsApp, getSaludo } from '@/lib/utils/whatsapp';
import { getCurrencySymbol } from '@/lib/constants';
import { formatearFecha } from '@/lib/utils/calculations';

const ventaSchema = z.object({
  clienteId: z.string().min(1, 'Seleccione un cliente'),
  metodoPagoId: z.string().min(1, 'Seleccione un metodo de pago'),
  fechaInicio: z.date(),
  fechaFin: z.date(),
  codigo: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']),
});

type VentaFormData = z.infer<typeof ventaSchema>;

type TipoItem = 'cuenta' | 'perfil';

interface VentaItem {
  id: string;
  itemId: string;
  tipo: TipoItem;
  categoriaId: string;
  servicioId: string;
  servicioNombre: string;
  servicioCorreo?: string;
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio?: Date;
  fechaFin?: Date;
  perfilNumero?: number;
  perfilNombre?: string;
  precio: number;
  descuento: number;
  precioFinal: number;
  codigo?: string;
  notas?: string;
}

interface ItemErrors {
  categoria?: string;
  servicio?: string;
  plan?: string;
  perfil?: string;
  precio?: string;
}

const MESES_POR_CICLO: Record<string, number> = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};


export function VentasForm() {
  const router = useRouter();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const { servicios, fetchServicios, updatePerfilOcupado } = useServiciosStore();
  const { usuarios, fetchUsuarios } = useUsuariosStore();
  const fetchTemplates = useTemplatesMensajesStore((state) => state.fetchTemplates);
  const templateNotificacion = useTemplatesMensajesStore((state) => state.getTemplateByTipo('suscripcion'));

  const [activeTab, setActiveTab] = useState<'datos' | 'preview'>('datos');
  const [isDatosTabComplete, setIsDatosTabComplete] = useState(false);
  const [tipoItem, setTipoItem] = useState<TipoItem | null>(null);
  const [categoriaId, setCategoriaId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [planId, setPlanId] = useState('');
  const [precio, setPrecio] = useState('');
  const [descuento, setDescuento] = useState('');
  const [perfilNumero, setPerfilNumero] = useState('');
  const [perfilNombre, setPerfilNombre] = useState('');
  const [notasItem, setNotasItem] = useState('');
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<VentaItem[]>([]);
  const [fechaInicioOpen, setFechaInicioOpen] = useState(false);
  const [fechaFinOpen, setFechaFinOpen] = useState(false);
  const [perfilesOcupadosVenta, setPerfilesOcupadosVenta] = useState<Record<string, Set<number>>>({});
  const [notifyCliente, setNotifyCliente] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      clienteId: '',
      metodoPagoId: '',
      fechaInicio: new Date(),
      fechaFin: addMonths(new Date(), 1),
      codigo: '',
      estado: 'activo',
    },
  });

  const clienteIdValue = watch('clienteId');
  const metodoPagoIdValue = watch('metodoPagoId');
  const fechaInicioValue = watch('fechaInicio');
  const fechaFinValue = watch('fechaFin');
  const estadoValue = watch('estado');
  useEffect(() => {
    if (estadoValue === 'inactivo' && notifyCliente) {
      setNotifyCliente(false);
    }
  }, [estadoValue, notifyCliente]);

  useEffect(() => {
    fetchCategorias();
    fetchMetodosPago();
    fetchServicios();
    fetchUsuarios();
    fetchTemplates();
  }, [fetchCategorias, fetchMetodosPago, fetchServicios, fetchUsuarios, fetchTemplates]);

  useEffect(() => {
    setPlanId('');
    setPrecio('');
    setDescuento('');
    setPerfilNumero('');
    setPerfilNombre('');
    setNotasItem('');
    setItemErrors({});
  }, [tipoItem]);

  useEffect(() => {
    const loadPerfilesOcupados = async () => {
      if (!servicioId) return;
      try {
        const docs = await queryDocuments<Record<string, unknown>>(COLLECTIONS.VENTAS, [
          { field: 'servicioId', operator: '==', value: servicioId },
        ]);
        const ocupados = new Set<number>();
        docs.forEach((doc) => {
          const estado = (doc.estado as string | undefined) ?? 'activo';
          if (estado === 'inactivo') return;
          const perfil = (doc.perfilNumero as number | null | undefined) ?? null;
          if (perfil) ocupados.add(perfil);
        });
        setPerfilesOcupadosVenta((prev) => ({ ...prev, [servicioId]: ocupados }));
      } catch (error) {
        console.error('Error cargando perfiles ocupados por ventas:', error);
        setPerfilesOcupadosVenta((prev) => ({ ...prev, [servicioId]: new Set() }));
      }
    };

    loadPerfilesOcupados();
  }, [servicioId]);

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId),
    [categorias, categoriaId]
  );

  const planesDisponibles = useMemo(() => {
    if (!categoriaSeleccionada?.planes || !tipoItem) return [];
    return categoriaSeleccionada.planes.filter((plan) =>
      tipoItem === 'cuenta' ? plan.tipoPlan === 'cuenta_completa' : plan.tipoPlan === 'perfiles'
    );
  }, [categoriaSeleccionada, tipoItem]);

  const planSeleccionado = useMemo(
    () => planesDisponibles.find((plan) => plan.id === planId),
    [planesDisponibles, planId]
  );

  useEffect(() => {
    if (!planSeleccionado) return;
    setPrecio(planSeleccionado.precio.toFixed(2));
    setItemErrors((prev) => ({
      ...prev,
      plan: undefined,
      precio: undefined,
    }));
  }, [planSeleccionado]);

  useEffect(() => {
    if (!planSeleccionado || !fechaInicioValue) return;
    const meses = MESES_POR_CICLO[planSeleccionado.cicloPago] ?? 1;
    setValue('fechaFin', addMonths(new Date(fechaInicioValue), meses));
  }, [planSeleccionado, fechaInicioValue, setValue]);

  const clientes = useMemo(() => usuarios.filter((u) => u.tipo === 'cliente'), [usuarios]);
  const clienteSeleccionado = clientes.find((c) => c.id === clienteIdValue);
  const metodoPagoSeleccionado = metodosPago.find((m) => m.id === metodoPagoIdValue);
  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter((s) => {
      if (categoriaId && s.categoriaId !== categoriaId) return false;
      if (tipoItem === 'perfil') {
        const ocupados = s.perfilesOcupados || 0;
        const disponibles = (s.perfilesDisponibles || 0) - ocupados;
        if (disponibles <= 0) return false;
      }
      return true;
    });
  }, [servicios, categoriaId, tipoItem]);

  const serviciosOrdenados = useMemo(() => {
    return [...serviciosFiltrados].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [serviciosFiltrados]);

  const perfilesUsados = useMemo(() => {
    return items.reduce<Record<string, Set<number>>>((acc, item) => {
      if (!item.perfilNumero) return acc;
      if (!acc[item.servicioId]) acc[item.servicioId] = new Set<number>();
      acc[item.servicioId].add(item.perfilNumero);
      return acc;
    }, {});
  }, [items]);

  const getSlotsDisponibles = (servicioIdValue: string) => {
    const servicio = servicios.find((s) => s.id === servicioIdValue);
    if (!servicio) return 0;
    const ocupadosActual = servicio.perfilesOcupados || 0;
    const ocupadosEnVenta = perfilesUsados[servicioIdValue]?.size || 0;
    return Math.max((servicio.perfilesDisponibles || 0) - ocupadosActual - ocupadosEnVenta, 0);
  };

  const simboloMoneda = getCurrencySymbol(metodoPagoSeleccionado?.moneda);
  const precioBase = Number(precio) || 0;
  const descuentoNumero = Number(descuento) || 0;
  const precioFinalNumero = Math.max(precioBase * (1 - descuentoNumero / 100), 0);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.precio, 0), [items]);
  const previewItem = items[0];
  const previewServicio = previewItem
    ? servicios.find((s) => s.id === previewItem.servicioId)
    : servicioSeleccionado;
  const previewCategoria = previewItem
    ? categorias.find((c) => c.id === previewItem.categoriaId)
    : categoriaSeleccionada;
  const previewClienteNombre = clienteSeleccionado
    ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
    : 'Sin cliente';
  const previewNombreCliente = clienteSeleccionado?.nombre || previewClienteNombre.split(' ')[0] || 'Cliente';
  const previewFechaVencimiento = previewItem?.fechaFin ?? fechaFinValue;
  const previewMonto = previewItem?.precioFinal ?? subtotal;
  const previewCodigo = previewItem?.codigo || watch('codigo')?.trim() || '—';
  const previewPerfilNombre = previewItem?.perfilNombre?.trim() || '—';
  const previewCorreo = previewServicio?.correo || previewItem?.servicioCorreo || '—';
  const previewContrasena = previewServicio?.contrasena || '—';
  const previewCategoriaNombre = previewCategoria?.nombre || previewItem?.servicioNombre || 'Servicio';
  const previewServicioNombre = previewItem?.servicioNombre || previewServicio?.nombre || 'Servicio';
  const formatItemsList = (names: string[]) => {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    if (cleaned.length === 0) return '—';
    if (cleaned.length === 1) return `*${cleaned[0]}*`;
    if (cleaned.length === 2) return `*${cleaned[0]}* y *${cleaned[1]}*`;
    const first = cleaned.slice(0, -1).map((n) => `*${n}*`).join(', ');
    const last = `*${cleaned[cleaned.length - 1]}*`;
    return `${first} y ${last}`;
  };
  const itemsList = formatItemsList(
    Array.from(
      new Set(
        items.map((item) => categorias.find((c) => c.id === item.categoriaId)?.nombre || item.servicioNombre || 'Servicio')
      )
    )
  );
  const replaceAllPlaceholders = (text: string, values: Record<string, string>) => {
    let next = text;
    Object.entries(values).forEach(([key, value]) => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(escaped, 'g'), value);
    });
    return next;
  };
  const renderTemplateWithItems = (template: string, globals: Record<string, string>) => {
    const blockMatch = template.match(/{{#items}}([\s\S]*?){{\/items}}/);
    let content = template;
    if (blockMatch) {
      const block = blockMatch[1].replace(/^\s*\n/, '').replace(/\n\s*$/, '');
      const renderedItems = items.map((item) => {
        const servicio = servicios.find((s) => s.id === item.servicioId);
        const categoria = categorias.find((c) => c.id === item.categoriaId);
        const itemValues: Record<string, string> = {
          '{servicio}': item.servicioNombre || servicio?.nombre || 'Servicio',
          '{categoria}': categoria?.nombre || item.servicioNombre || 'Servicio',
          '{correo}': servicio?.correo || item.servicioCorreo || '—',
          '{contrasena}': servicio?.contrasena || '—',
          '{perfil_nombre}': item.perfilNombre?.trim() || '—',
          '{codigo}': item.codigo || '—',
          '{vencimiento}': item.fechaFin ? formatearFechaWhatsApp(new Date(item.fechaFin)) : '—',
          '{monto}': item.precioFinal?.toFixed(2) || '0.00',
        };
        return replaceAllPlaceholders(block, { ...globals, ...itemValues });
      }).join('\n\n');
      content = content.replace(blockMatch[0], renderedItems);
    }
    return replaceAllPlaceholders(content, globals);
  };
  const previewMessage = useMemo(() => {
    const content = templateNotificacion?.contenido || 'No hay plantilla de Notificación de Suscripción configurada.';
    const placeholders: Record<string, string> = {
      '{saludo}': getSaludo(),
      '{cliente}': previewClienteNombre,
      '{nombre_cliente}': previewNombreCliente,
      '{items}': itemsList,
      '{servicio}': previewServicioNombre,
      '{categoria}': previewCategoriaNombre,
      '{perfil_nombre}': previewPerfilNombre,
      '{correo}': previewCorreo,
      '{contrasena}': previewContrasena,
      '{vencimiento}': previewFechaVencimiento ? formatearFechaWhatsApp(new Date(previewFechaVencimiento)) : '—',
      '{monto}': previewMonto.toFixed(2),
      '{codigo}': previewCodigo,
    };
    return renderTemplateWithItems(content, placeholders);
  }, [
    templateNotificacion?.contenido,
    previewClienteNombre,
    previewNombreCliente,
    previewCategoriaNombre,
    previewPerfilNombre,
    previewCorreo,
    previewContrasena,
    previewFechaVencimiento,
    previewMonto,
    previewCodigo,
    previewServicioNombre,
    itemsList,
    items,
    servicios,
    categorias,
  ]);

  const handleAddItem = () => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    const plan = planesDisponibles.find((p) => p.id === planId);
    const errors: ItemErrors = {};
    if (!categoriaId) {
      errors.categoria = 'Seleccione una categoria';
    }
    if (!servicioId) {
      errors.servicio = 'Seleccione un servicio';
    }
    if (!tipoItem) {
      errors.plan = 'Seleccione el tipo de plan';
    }
    if (!plan) {
      errors.plan = 'Seleccione un plan';
    }
    if (!precio || Number(precio) <= 0) {
      errors.precio = 'Ingrese un precio valido';
    }
    const slotsDisponibles = getSlotsDisponibles(servicioId);
    if (!perfilNumero) {
      errors.perfil = 'Seleccione el numero de perfil';
    } else if (slotsDisponibles <= 0) {
      errors.perfil = 'No hay perfiles disponibles';
    } else if (perfilesUsados[servicioId]?.has(Number(perfilNumero))) {
      errors.perfil = 'Ese perfil ya fue agregado';
    } else if (perfilesOcupadosVenta[servicioId]?.has(Number(perfilNumero))) {
      errors.perfil = 'Ese perfil ya esta ocupado';
    }
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }
    setItemErrors({});
    if (!plan || !categoria || !tipoItem) return;
    const itemId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newItem: VentaItem = {
      id: `${servicioId}-${plan.id}-${Date.now()}`,
      itemId,
      tipo: tipoItem,
      categoriaId: categoria.id,
        servicioId,
        servicioNombre: servicioSeleccionado?.nombre || plan.nombre,
        servicioCorreo: servicioSeleccionado?.correo,
        cicloPago: plan.cicloPago,
        fechaInicio: fechaInicioValue ? new Date(fechaInicioValue) : undefined,
        fechaFin: fechaFinValue ? new Date(fechaFinValue) : undefined,
        perfilNumero: perfilNumero ? Number(perfilNumero) : undefined,
        perfilNombre: perfilNombre?.trim() || undefined,
        precio: Number(precio) || 0,
        descuento: Number(descuento) || 0,
        precioFinal: precioFinalNumero,
        codigo: watch('codigo')?.trim() ? watch('codigo')?.trim() : undefined,
        notas: notasItem?.trim() ? notasItem.trim() : undefined,
      };

    setItems((prev) => [...prev, newItem]);
    setCategoriaId('');
    setServicioId('');
    setPlanId('');
    setPrecio('');
    setDescuento('');
    setPerfilNumero('');
    setPerfilNombre('');
    setValue('codigo', '');
    setNotasItem('');
    setItemErrors({});
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const onSubmit = async () => {
    if (activeTab !== 'preview') return;
    if (items.length === 0) {
      toast.error('Agregue al menos un item');
      return;
    }
    toast.success('Venta registrada');
  };

  const handleNext = async () => {
    let isValid = true;
    if (!clienteIdValue) {
      setError('clienteId', { type: 'manual', message: 'Seleccione un cliente' });
      isValid = false;
    }
    if (!metodoPagoIdValue) {
      setError('metodoPagoId', { type: 'manual', message: 'Seleccione un metodo de pago' });
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
    if (items.length === 0) {
      toast.error('Agregue al menos un item');
      return;
    }
    setIsDatosTabComplete(true);
    setActiveTab('preview');
  };

  const handleGuardarVenta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Agregue al menos un item');
      return;
    }
    if (!clienteIdValue || !metodoPagoIdValue || !fechaInicioValue || !fechaFinValue) {
      toast.error('Complete los datos requeridos');
      return;
    }
    const clienteNombre = clienteSeleccionado
      ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
      : 'Sin cliente';
    const metodoPagoNombre = metodoPagoSeleccionado?.nombre || 'Sin metodo';
    const moneda = metodoPagoSeleccionado?.moneda || 'USD';
    const estadoVenta = watch('estado');
    const ventaId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());

    try {
      setSaving(true);
      const writes = items.map((item) =>
        create(COLLECTIONS.VENTAS, {
          clienteId: clienteIdValue,
          clienteNombre,
          metodoPagoId: metodoPagoIdValue,
          metodoPagoNombre,
          moneda,
          fechaInicio: item.fechaInicio ?? fechaInicioValue,
          fechaFin: item.fechaFin ?? fechaFinValue,
          codigo: item.codigo || '',
          perfilNombre: item.perfilNombre || '',
          estado: estadoVenta || 'activo',
          notas: item.notas || '',
          categoriaId: item.categoriaId,
          servicioId: item.servicioId,
          servicioNombre: item.servicioNombre,
          servicioCorreo: item.servicioCorreo ?? '',
          cicloPago: item.cicloPago ?? undefined,
          perfilNumero: item.perfilNumero ?? null,
          precio: item.precio,
          descuento: item.descuento,
          precioFinal: item.precioFinal,
          pagos: [
            {
              fecha: new Date(),
              descripcion: 'Pago inicial',
              precio: item.precio,
              descuento: item.descuento,
              total: item.precioFinal,
              metodoPagoId: metodoPagoIdValue,
              metodoPagoNombre,
              moneda,
              isPagoInicial: true,
            },
          ],
          itemId: item.itemId,
          ventaId,
          totalVenta: subtotal,
        })
      );
      await Promise.all(writes);
      if (estadoVenta !== 'inactivo') {
        items.forEach((item) => {
          if (item.perfilNumero) {
            updatePerfilOcupado(item.servicioId, true);
          }
        });
      }
      toast.success('Venta registrada');
      if (notifyCliente && estadoVenta !== 'inactivo') {
        const phoneRaw = clienteSeleccionado?.telefono || '';
        const phone = phoneRaw.replace(/\D/g, '');
        if (phone && previewMessage) {
          const toastId = toast.custom(() => (
            <div className="w-full max-w-md rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Venta Creada</p>
                  <p className="text-xs text-muted-foreground">La venta se ha registrado exitosamente.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => {
                    const link = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(previewMessage)}`;
                    window.open(link, '_blank', 'noopener,noreferrer');
                    toast.dismiss(toastId);
                  }}
                >
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          ), { duration: Infinity });
        }
      }
      router.push('/ventas');
    } catch (error) {
      console.error('Error guardando venta:', error);
      toast.error('Error al guardar la venta', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === 'preview' && !isDatosTabComplete) {
      await handleNext();
      return;
    }
    setActiveTab(value as typeof activeTab);
  };

  return (
    <form onSubmit={handleGuardarVenta} className="space-y-6" noValidate>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="datos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Informacion de la Venta
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
          <div className="space-y-6">


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
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
                          if (cliente.metodoPagoId) {
                            setValue('metodoPagoId', cliente.metodoPagoId);
                            clearErrors('metodoPagoId');
                          }
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
                <Label>Metodo de Pago</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between">
                      {metodoPagoSeleccionado ? metodoPagoSeleccionado.nombre : 'Seleccionar metodo de pago'}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {metodosPago
                      .filter((m) => m.activo && m.asociadoA === 'usuario')
                      .map((metodo) => (
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

            <div className="mt-2 border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Agregar items a la venta</h3>
                <span className="text-sm text-muted-foreground">{items.length} items</span>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/20 p-2">
                <button
                  type="button"
                  onClick={() => setTipoItem('cuenta')}
                  className={cn(
                    'h-8 w-full rounded-xl border text-sm font-medium transition-colors',
                    tipoItem === 'cuenta'
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  Cuentas completas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoItem('perfil')}
                  className={cn(
                    'h-8 w-full rounded-xl border text-sm font-medium transition-colors',
                    tipoItem === 'perfil'
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  Perfiles
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-between">
                        {categoriaId ? categorias.find((c) => c.id === categoriaId)?.nombre : 'Seleccionar categoria'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {categorias.map((categoria) => (
                        <DropdownMenuItem
                          key={categoria.id}
                          onClick={() => {
                            setCategoriaId(categoria.id);
                            setServicioId('');
                            setPlanId('');
                            setPrecio('');
                            setDescuento('');
                            setPerfilNumero('');
                            setItemErrors((prev) => ({ ...prev, categoria: undefined }));
                          }}
                        >
                          {categoria.nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {itemErrors.categoria && <p className="text-sm text-red-500">{itemErrors.categoria}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Servicio</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-between" disabled={!categoriaId}>
                        {servicioId
                          ? `${servicios.find((s) => s.id === servicioId)?.nombre} - ${servicios.find((s) => s.id === servicioId)?.correo}`
                          : categoriaId
                            ? 'Seleccionar servicio'
                            : 'Primero selecciona categoria'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {serviciosOrdenados.map((servicio) => (
                        <DropdownMenuItem
                          key={servicio.id}
                          onClick={() => {
                            setServicioId(servicio.id);
                            setPerfilNumero('');
                            setItemErrors((prev) => ({ ...prev, servicio: undefined }));
                          }}
                        >
                          {servicio.nombre} - {servicio.correo}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {itemErrors.servicio && <p className="text-sm text-red-500">{itemErrors.servicio}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full justify-between"
                        disabled={!categoriaId || !tipoItem}
                      >
                        {planId
                          ? planSeleccionado?.nombre
                          : categoriaId
                            ? tipoItem
                              ? 'Seleccionar plan'
                              : 'Selecciona el tipo de plan'
                            : 'Primero selecciona categoria'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {planesDisponibles.map((plan) => (
                        <DropdownMenuItem
                          key={plan.id}
                          onClick={() => {
                            setPlanId(plan.id);
                            setItemErrors((prev) => ({ ...prev, plan: undefined }));
                          }}
                        >
                          {plan.nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {itemErrors.plan && <p className="text-sm text-red-500">{itemErrors.plan}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full justify-between"
                        disabled={!servicioId || getSlotsDisponibles(servicioId) <= 0}
                      >
                        {perfilNumero
                          ? `Perfil ${perfilNumero}`
                          : getSlotsDisponibles(servicioId) > 0
                          ? 'Seleccionar perfil'
                          : 'No hay perfiles disponibles'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {Array.from({ length: servicioSeleccionado?.perfilesDisponibles || 0 }, (_, index) => {
                        const numero = index + 1;
                        if (getSlotsDisponibles(servicioId) <= 0) return null;
                        const ocupado = perfilesUsados[servicioId]?.has(numero);
                        const ocupadoEnVentas = perfilesOcupadosVenta[servicioId]?.has(numero);
                        if (ocupado || ocupadoEnVentas) return null;
                        return (
                          <DropdownMenuItem
                            key={numero}
                            onClick={() => {
                              setPerfilNumero(String(numero));
                              setItemErrors((prev) => ({ ...prev, perfil: undefined }));
                            }}
                          >
                            Perfil {numero}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {itemErrors.perfil && <p className="text-sm text-red-500">{itemErrors.perfil}</p>}
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
                      value={precio}
                      onChange={(e) => {
                        const nextValue = e.target.value.replace(',', '.');
                        setPrecio(nextValue);
                        setItemErrors((prev) => ({ ...prev, precio: undefined }));
                      }}
                      className="pl-10"
                      onKeyDown={(e) => {
                        const char = e.key;
                        const currentValue = (e.target as HTMLInputElement).value;
                        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                          return;
                        }
                        if (e.ctrlKey || e.metaKey) {
                          return;
                        }
                        if (!/[0-9.]/.test(char)) {
                          e.preventDefault();
                        }
                        if (char === '.' && currentValue.includes('.')) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                  {itemErrors.precio && <p className="text-sm text-red-500">{itemErrors.precio}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Descuento %</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={descuento}
                    onChange={(e) => {
                      const nextValue = e.target.value.replace(',', '.');
                      setDescuento(nextValue);
                    }}
                    onKeyDown={(e) => {
                      const char = e.key;
                      const currentValue = (e.target as HTMLInputElement).value;
                      if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                        return;
                      }
                      if (e.ctrlKey || e.metaKey) {
                        return;
                      }
                      if (!/[0-9.]/.test(char)) {
                        e.preventDefault();
                      }
                      if (char === '.' && currentValue.includes('.')) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
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
                      onSelect={(date) => {
                        setValue('fechaInicio', date || new Date());
                        clearErrors('fechaInicio');
                      }}
                        defaultMonth={fechaInicioValue ?? new Date()}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Fin</Label>
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
                      onSelect={(date) => {
                        setValue('fechaFin', date || new Date());
                        clearErrors('fechaFin');
                      }}
                        defaultMonth={fechaFinValue ?? new Date()}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nombre del Perfil</Label>
                <Input
                  type="text"
                  value={perfilNombre}
                  onChange={(e) => setPerfilNombre(e.target.value)}
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
                <Label>Precio Final</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none select-none">
                    {simboloMoneda}
                  </span>
                  <Input
                    type="text"
                    value={precioFinalNumero.toFixed(2)}
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
              <Textarea
                rows={3}
                value={notasItem}
                onChange={(e) => setNotasItem(e.target.value)}
                placeholder="Notas adicionales"
              />
            </div>

            <Button type="button" variant="secondary" className="w-full" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar al carrito
            </Button>

              {items.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-0">
                    <div className="text-sm font-medium">
                      Items Agregados ({items.length})
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Total: {simboloMoneda} {subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-600">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                          <p className="font-medium">
                            {categorias.find((c) => c.id === item.categoriaId)?.nombre || item.servicioNombre}
                            {' - '}
                            {item.servicioCorreo || 'Sin correo'}
                          </p>
                          {item.perfilNumero && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-purple-600/10 text-white px-2 py-0.5 text-xs">
                              {item.perfilNombre ? item.perfilNombre : `Perfil ${item.perfilNumero}`}
                            </span>
                          )}
                          {item.codigo && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Codigo: {item.codigo}
                            </span>
                          )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{simboloMoneda} {item.precioFinal.toFixed(2)}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                    <span className="text-sm font-semibold">{simboloMoneda} {subtotal.toFixed(2)}</span>
                  </div>
                </Card>
              )}
            </div>

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
                <p className="text-sm font-medium">{clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : 'Sin seleccionar'}</p>
              </div>
              <div className="rounded-lg border bg-background/40 p-4">
                <p className="text-xs text-muted-foreground">Método de pago</p>
                <p className="text-sm font-medium">{metodoPagoSeleccionado?.nombre || 'Sin seleccionar'}</p>
              </div>
            </div>


            <div className="mt-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Items agregados</h3>
                <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>

              {items.length === 0 ? (
                <div className="rounded-lg border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  No hay items agregados.
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-background/40 p-4 w-full md:w-[280px] md:flex-[0_0_auto]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.servicioNombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.cicloPago ? `${item.cicloPago.charAt(0).toUpperCase()}${item.cicloPago.slice(1)}` : '—'}
                          </p>
                        </div>
                        <span className="text-green-500 font-semibold">{simboloMoneda} {item.precioFinal.toFixed(2)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p>Fecha de inicio</p>
                          <p className="text-foreground font-medium">
                            {item.fechaInicio ? formatearFecha(item.fechaInicio) : '—'}
                          </p>
                        </div>
                        <div>
                          <p>Fecha de fin</p>
                          <p className="text-foreground font-medium">
                            {item.fechaFin ? formatearFecha(item.fechaFin) : '—'}
                          </p>
                        </div>
                        <div>
                          <p>Precio</p>
                          <p className="text-foreground font-medium">{simboloMoneda} {item.precio.toFixed(2)}</p>
                        </div>
                        <div>
                          <p>Descuento</p>
                          <p className="text-foreground font-medium">{item.descuento.toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p>Nombre del perfil</p>
                          <p className="text-foreground font-medium">
                            {item.perfilNombre?.trim() ? item.perfilNombre : '—'}
                          </p>
                        </div>
                        <div>
                          <p>Codigo</p>
                          <p className="text-foreground font-medium">{item.codigo || '—'}</p>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        <p>Precio final</p>
                        <p className="text-foreground font-medium">{simboloMoneda} {item.precioFinal.toFixed(2)}</p>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        <p>Notas</p>
                        <p className="text-foreground font-medium">{item.notas ? item.notas : 'Sin notas'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-1 rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">Total de la venta</span>
                <span className="text-xl font-semibold text-green-500">{simboloMoneda} {subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-0 text-sm text-muted-foreground">
                El total corresponde a la suma de todos los items agregados.
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-background/40 p-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={notifyCliente}
                  onCheckedChange={setNotifyCliente}
                  disabled={estadoValue === 'inactivo'}
                />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span>Notificar al cliente por WhatsApp</span>
                </div>
              </div>

              {notifyCliente && estadoValue !== 'inactivo' && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Editar Mensaje de Notificación</p>
                  <Textarea
                    value={previewMessage}
                    readOnly
                    rows={10}
                    className="min-h-[220px] resize-none text-sm leading-relaxed bg-background/60"
                  />
                </div>
              )}
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
            <Button type="submit" disabled={saving}>
              Guardar venta
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => router.push('/ventas')}>
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

