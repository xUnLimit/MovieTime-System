'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { toast } from 'sonner';
import { ChevronDown, Users, Calendar as CalendarIcon } from 'lucide-react';
import { formatearFecha } from '@/lib/utils/calculations';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { useRouter } from 'next/navigation';
import { Servicio, MetodoPago } from '@/types';
import { addMonths } from 'date-fns';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

const servicioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  categoriaId: z.string().min(1, 'Debe seleccionar una categoría'),
  tipoPlan: z.enum(['cuenta_completa', 'perfiles'], {
    message: 'Debe seleccionar un tipo de plan',
  }),
  correo: z.string().email('Por favor ingrese un correo electrónico válido'),
  contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  metodoPagoId: z.string().min(1, 'Debe seleccionar un método de pago'),
  costoServicio: z.string()
    .refine((val) => val !== '', 'Por favor ingrese el costo del servicio')
    .refine((val) => !isNaN(Number(val)), 'El costo debe ser un valor numérico')
    .refine((val) => Number(val) > 0, 'El costo debe ser mayor a 0'),
  perfilesDisponibles: z.string()
    .refine((val) => val !== '', 'Por favor ingrese el número de perfiles')
    .refine((val) => !isNaN(Number(val)), 'Debe ingresar un valor numérico')
    .refine((val) => Number(val) >= 1, 'Debe tener al menos 1 perfil disponible')
    .refine((val) => Number.isInteger(Number(val)), 'El número de perfiles debe ser un valor entero'),
  cicloPago: z.enum(['mensual', 'trimestral', 'semestral', 'anual']),
  fechaInicio: z.date(),
  fechaVencimiento: z.date(),
  estado: z.enum(['activo', 'inactivo']),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof servicioSchema>;

interface ServicioFormProps {
  servicio?: Servicio;
  returnTo?: string;
}

export function ServicioForm({ servicio, returnTo = '/servicios' }: ServicioFormProps) {
  const router = useRouter();
  const { createServicio, updateServicio, fetchCounts } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { fetchMetodosPagoServicios } = useMetodosPagoStore();
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [activeTab, setActiveTab] = useState('datos');
  const [isDatosTabComplete, setIsDatosTabComplete] = useState(false);
  const [manualFechaVencimiento, setManualFechaVencimiento] = useState(false);
  const [openFechaInicio, setOpenFechaInicio] = useState(false);
  const [openFechaVencimiento, setOpenFechaVencimiento] = useState(false);
  const prevCicloPagoRef = useRef(servicio?.cicloPago ?? 'mensual');
  const prevFechaInicioRef = useRef<Date | null>(servicio?.fechaInicio ? new Date(servicio.fechaInicio) : null);

  // Cargar solo métodos de pago para servicios al montar
  useEffect(() => {
    const loadMetodosPago = async () => {
      const metodos = await fetchMetodosPagoServicios();
      setMetodosPago(metodos);
    };
    loadMetodosPago();
  }, [fetchMetodosPagoServicios]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    getValues,
    clearErrors,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(servicioSchema),
    defaultValues: {
      nombre: servicio?.nombre || '',
      categoriaId: servicio?.categoriaId || '',
      tipoPlan: (servicio?.tipo || '') as FormData['tipoPlan'],
      correo: servicio?.correo || '',
      contrasena: servicio?.contrasena || '',
      metodoPagoId: '',
      costoServicio: '',
      perfilesDisponibles: '',
      cicloPago: 'mensual' as 'mensual' | 'trimestral' | 'semestral' | 'anual',
      fechaInicio: new Date(),
      fechaVencimiento: addMonths(new Date(), 1),
      estado: 'activo' as 'activo' | 'inactivo',
      notas: '',
    },
  });

  const nombreValue = watch('nombre');
  const correoValue = watch('correo');
  const contrasenaValue = watch('contrasena');
  const categoriaIdValue = watch('categoriaId');
  const tipoPlanValue = watch('tipoPlan');
  const metodoPagoIdValue = watch('metodoPagoId');
  const costoServicioValue = watch('costoServicio');
  const perfilesDisponiblesValue = watch('perfilesDisponibles');
  const cicloPagoValue = watch('cicloPago');
  const fechaInicioValue = watch('fechaInicio');
  const fechaVencimientoValue = watch('fechaVencimiento');
  const estadoValue = watch('estado');
  const notasValue = watch('notas');


  // Detectar si hay cambios en el formulario
  const hasChanges = useMemo(() => {
    if (!servicio?.id) return true; // Si es nuevo, siempre permitir guardar

    return (
      nombreValue !== servicio.nombre ||
      correoValue !== servicio.correo ||
      contrasenaValue !== servicio.contrasena ||
      categoriaIdValue !== servicio.categoriaId ||
      tipoPlanValue !== servicio.tipo ||
      metodoPagoIdValue !== (servicio.metodoPagoId || '') ||
      String(costoServicioValue) !== String(servicio.costoServicio || 0) ||
      String(perfilesDisponiblesValue) !== String(servicio.perfilesDisponibles || 1) ||
      cicloPagoValue !== (servicio.cicloPago || 'mensual') ||
      estadoValue !== (servicio.activo ? 'activo' : 'inactivo') ||
      notasValue !== (servicio.notas || '') ||
      fechaInicioValue?.getTime() !== servicio.fechaInicio?.getTime() ||
      fechaVencimientoValue?.getTime() !== servicio.fechaVencimiento?.getTime()
    );
  }, [
    servicio,
    nombreValue,
    correoValue,
    contrasenaValue,
    categoriaIdValue,
    tipoPlanValue,
    metodoPagoIdValue,
    costoServicioValue,
    perfilesDisponiblesValue,
    cicloPagoValue,
    estadoValue,
    notasValue,
    fechaInicioValue,
    fechaVencimientoValue,
  ]);

  // Pre-llenar el formulario cuando se edita un servicio existente
  useEffect(() => {
    if (servicio?.id) {
      setValue('nombre', servicio.nombre);
      setValue('categoriaId', servicio.categoriaId);
      setValue('tipoPlan', servicio.tipo);
      setValue('correo', servicio.correo);
      setValue('contrasena', servicio.contrasena);
      setValue('metodoPagoId', servicio.metodoPagoId || '');
      setValue('costoServicio', String(servicio.costoServicio || 0));
      setValue('perfilesDisponibles', String(servicio.perfilesDisponibles || 1));
      setValue('cicloPago', servicio.cicloPago || 'mensual');
      prevCicloPagoRef.current = servicio.cicloPago || 'mensual';
      if (servicio.fechaInicio) {
        setValue('fechaInicio', new Date(servicio.fechaInicio));
      }
      if (servicio.fechaVencimiento) {
        setValue('fechaVencimiento', new Date(servicio.fechaVencimiento));
      }
      setValue('estado', servicio.activo ? 'activo' : 'inactivo');
      setValue('notas', servicio.notas || '');
      setManualFechaVencimiento(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio?.id, setValue]);

  // Auto-limpiar errores solo para campos que no necesitan validación compleja
  useEffect(() => {
    if (nombreValue && nombreValue.length >= 2 && errors.nombre) {
      clearErrors('nombre');
    }
  }, [nombreValue, errors.nombre, clearErrors]);

  useEffect(() => {
    if (correoValue && correoValue.includes('@') && correoValue.includes('.') && errors.correo) {
      clearErrors('correo');
    }
  }, [correoValue, errors.correo, clearErrors]);

  useEffect(() => {
    if (contrasenaValue && contrasenaValue.length >= 6 && errors.contrasena) {
      clearErrors('contrasena');
    }
  }, [contrasenaValue, errors.contrasena, clearErrors]);

  useEffect(() => {
    if (categoriaIdValue && errors.categoriaId) {
      clearErrors('categoriaId');
    }
  }, [categoriaIdValue, errors.categoriaId, clearErrors]);

  useEffect(() => {
    if (tipoPlanValue && errors.tipoPlan) {
      clearErrors('tipoPlan');
    }
  }, [tipoPlanValue, errors.tipoPlan, clearErrors]);

  useEffect(() => {
    if (metodoPagoIdValue && errors.metodoPagoId) {
      clearErrors('metodoPagoId');
    }
  }, [metodoPagoIdValue, errors.metodoPagoId, clearErrors]);

  useEffect(() => {
    if (costoServicioValue && !isNaN(Number(costoServicioValue)) && Number(costoServicioValue) > 0 && errors.costoServicio) {
      clearErrors('costoServicio');
    }
  }, [costoServicioValue, errors.costoServicio, clearErrors]);

  useEffect(() => {
    if (perfilesDisponiblesValue && !isNaN(Number(perfilesDisponiblesValue)) && Number(perfilesDisponiblesValue) >= 1 && Number.isInteger(Number(perfilesDisponiblesValue)) && errors.perfilesDisponibles) {
      clearErrors('perfilesDisponibles');
    }
  }, [perfilesDisponiblesValue, errors.perfilesDisponibles, clearErrors]);

  // Auto-calcular fecha de vencimiento cuando cambia el ciclo o la fecha de inicio
  // En edición: también recalcular si el usuario cambia fechaInicio manualmente
  useEffect(() => {
    if (!fechaInicioValue) return;
    const cicloChanged = prevCicloPagoRef.current !== cicloPagoValue;
    const fechaInicioChanged = prevFechaInicioRef.current?.getTime() !== fechaInicioValue.getTime();
    if (cicloChanged) {
      prevCicloPagoRef.current = cicloPagoValue;
      setManualFechaVencimiento(false);
    }
    if (fechaInicioChanged) {
      prevFechaInicioRef.current = fechaInicioValue;
      setManualFechaVencimiento(false);
    }
    if (cicloChanged || fechaInicioChanged || !manualFechaVencimiento) {
      const meses = cicloPagoValue === 'mensual' ? 1 : cicloPagoValue === 'trimestral' ? 3 : cicloPagoValue === 'semestral' ? 6 : 12;
      setValue('fechaVencimiento', addMonths(fechaInicioValue, meses));
    }
  }, [cicloPagoValue, fechaInicioValue, manualFechaVencimiento, setValue]);

  const handleCicloPagoChange = (ciclo: 'mensual' | 'trimestral' | 'semestral' | 'anual') => {
    setValue('cicloPago', ciclo);
    prevCicloPagoRef.current = ciclo;
    setManualFechaVencimiento(false);
    const fechaInicio = getValues('fechaInicio');
    if (fechaInicio) {
      const meses = ciclo === 'mensual' ? 1 : ciclo === 'trimestral' ? 3 : ciclo === 'semestral' ? 6 : 12;
      setValue('fechaVencimiento', addMonths(fechaInicio, meses));
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === 'perfil' && !isDatosTabComplete) {
      const isValid = await trigger(['nombre', 'categoriaId', 'tipoPlan', 'correo', 'contrasena', 'metodoPagoId', 'costoServicio', 'perfilesDisponibles', 'cicloPago', 'fechaInicio', 'fechaVencimiento', 'estado']);
      if (isValid) {
        setIsDatosTabComplete(true);
        setActiveTab(value);
      }
    } else {
      setActiveTab(value);
    }
  };

  const handleNext = async () => {
    const isValid = await trigger(['nombre', 'categoriaId', 'tipoPlan', 'correo', 'contrasena', 'metodoPagoId', 'costoServicio', 'perfilesDisponibles', 'cicloPago', 'fechaInicio', 'fechaVencimiento', 'estado']);
    if (isValid) {
      setIsDatosTabComplete(true);
      setActiveTab('perfil');
    }
  };

  const handlePrevious = () => {
    setActiveTab('datos');
  };

  const onSubmit = async (data: FormData) => {
    try {
      const categoria = categorias.find(c => c.id === data.categoriaId);
      const metodoPagoSeleccionado = metodosPago.find(m => m.id === data.metodoPagoId);

      const servicioData = {
        nombre: data.nombre,
        categoriaId: data.categoriaId,
        categoriaNombre: categoria?.nombre || '',
        correo: data.correo,
        contrasena: data.contrasena,
        tipo: data.tipoPlan,
        costoServicio: Number(data.costoServicio),
        perfilesDisponibles: Number(data.perfilesDisponibles),
        metodoPagoId: data.metodoPagoId,
        metodoPagoNombre: metodoPagoSeleccionado?.nombre,  // Denormalizado
        moneda: metodoPagoSeleccionado?.moneda,            // Denormalizado
        cicloPago: data.cicloPago,
        fechaInicio: data.fechaInicio,
        fechaVencimiento: data.fechaVencimiento,
        notas: data.notas,
        activo: data.estado === 'activo',
        renovacionAutomatica: false,
        createdBy: 'admin',
        gastosTotal: servicio?.gastosTotal ?? 0, // Preservar o inicializar campo denormalizado
      };

      if (servicio?.id) {
        await updateServicio(servicio.id, {
          ...servicio,
          ...servicioData,
        });
        toast.success('Servicio actualizado', { description: 'Los datos del servicio han sido guardados correctamente.' });
      } else {
        await createServicio(servicioData);
        toast.success('Servicio creado', { description: 'El nuevo servicio ha sido registrado correctamente en el sistema.' });
      }

      // Refrescar categorías y contadores de servicios para que se actualicen los widgets
      await Promise.all([
        fetchCategorias(true),
        fetchCounts(true), // Force refresh para actualizar inmediatamente
      ]);

      router.push(returnTo);
    } catch (error) {
      toast.error(servicio?.id ? 'Error al actualizar el servicio' : 'Error al crear el servicio', { description: error instanceof Error ? error.message : undefined });
      console.error(error);
    }
  };

  const onCancel = () => {
    router.push(returnTo);
  };

  const getCicloLabel = (ciclo: string) => {
    switch (ciclo) {
      case 'mensual':
        return 'Mensual';
      case 'trimestral':
        return 'Trimestral';
      case 'semestral':
        return 'Semestral';
      case 'anual':
        return 'Anual';
      default:
        return 'Seleccionar período';
    }
  };

  const categoriaNombre = categoriaIdValue
    ? categorias.find(c => c.id === categoriaIdValue)?.nombre
    : 'Seleccionar categoría';

  const getTipoPlanLabel = (tipo: string) => {
    switch (tipo) {
      case 'cuenta_completa':
        return 'Cuenta Completa';
      case 'perfiles':
        return 'Perfiles';
      default:
        return 'Seleccionar tipo';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'inactivo':
        return 'Inactivo';
      default:
        return 'Seleccionar estado';
    }
  };

  const metodoPagoSeleccionado = metodoPagoIdValue
    ? metodosPago.find(m => m.id === metodoPagoIdValue)
    : null;

  const metodoPagoNombre = metodoPagoSeleccionado?.nombre || 'Seleccionar método de pago';

  const getSimboloMoneda = (moneda?: string, pais?: string): string => {
    if (!moneda) return '$';
    const monedaKey = moneda.toUpperCase();
    const paisKey = (pais || '').toUpperCase();
    return CURRENCY_SYMBOLS[monedaKey] || CURRENCY_SYMBOLS[paisKey] || monedaKey;
  };

  const simboloMoneda = metodoPagoSeleccionado
    ? getSimboloMoneda(metodoPagoSeleccionado.moneda, metodoPagoSeleccionado.pais)
    : '$';

  const categoriasActivas = useMemo(
    () => categorias.filter((c) => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [categorias]
  );
  const metodosPagoActivos = useMemo(
    () => metodosPago.filter(m => m.activo && (!m.asociadoA || m.asociadoA === 'servicio')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [metodosPago]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="datos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Datos del Servicio
          </TabsTrigger>
          <TabsTrigger
            value="perfil"
            className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm ${
              !isDatosTabComplete ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Vista previa de perfiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="space-y-6">
          {/* Row 1: Nombre del servicio / Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del servicio</Label>
              <Input
                id="nombre"
                {...register('nombre')}
                placeholder="Ej: Netflix, Disney+"
                onChange={(e) => {
                  const value = e.target.value;
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setValue('nombre', capitalized);
                }}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {categoriaNombre}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {categoriasActivas.map((categoria) => (
                    <DropdownMenuItem
                      key={categoria.id}
                      onClick={() => setValue('categoriaId', categoria.id)}
                    >
                      {categoria.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.categoriaId && (
                <p className="text-sm text-red-500">{errors.categoriaId.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Email / Contraseña */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="correo">Email</Label>
              <Input
                id="correo"
                type="email"
                {...register('correo')}
                placeholder="correo@ejemplo.com"
              />
              {errors.correo && (
                <p className="text-sm text-red-500">{errors.correo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrasena">Contraseña</Label>
              <Input
                id="contrasena"
                type="text"
                {...register('contrasena')}
                placeholder="Ingrese la contraseña"
              />
              {errors.contrasena && (
                <p className="text-sm text-red-500">{errors.contrasena.message}</p>
              )}
            </div>
          </div>

          {/* Row 3: Método de Pago / Costo del servicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {metodoPagoNombre}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {metodosPagoActivos.map((metodo) => (
                    <DropdownMenuItem
                      key={metodo.id}
                      onClick={() => setValue('metodoPagoId', metodo.id)}
                    >
                      {metodo.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.metodoPagoId && (
                <p className="text-sm text-red-500">{errors.metodoPagoId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="costoServicio">Costo del servicio</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none select-none">
                  {simboloMoneda}
                </span>
                <Input
                  id="costoServicio"
                  type="text"
                  inputMode="decimal"
                  {...register('costoServicio')}
                  placeholder="0.00"
                  className="pl-8"
                  onKeyDown={(e) => {
                    const char = e.key;
                    const currentValue = (e.target as HTMLInputElement).value;
                    // Permitir teclas de control (backspace, delete, tab, escape, enter, arrow keys)
                    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                      return;
                    }
                    // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                    if (e.ctrlKey || e.metaKey) {
                      return;
                    }
                    // Solo permitir números y punto decimal
                    if (!/[0-9.]/.test(char)) {
                      e.preventDefault();
                    }
                    // Solo permitir un punto decimal
                    if (char === '.' && currentValue.includes('.')) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              {errors.costoServicio && (
                <p className="text-sm text-red-500">{errors.costoServicio.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: Tipo de Plan / Ciclo de Facturación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tipoPlan">Tipo de Plan</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {getTipoPlanLabel(tipoPlanValue)}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setValue('tipoPlan', 'perfiles')}>
                    Perfiles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue('tipoPlan', 'cuenta_completa')}>
                    Cuenta Completa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.tipoPlan && (
                <p className="text-sm text-red-500">{errors.tipoPlan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciclo">Ciclo de Facturación</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {getCicloLabel(cicloPagoValue)}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => handleCicloPagoChange('mensual')}>
                    Mensual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloPagoChange('trimestral')}>
                    Trimestral
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloPagoChange('semestral')}>
                    Semestral
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloPagoChange('anual')}>
                    Anual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.cicloPago && (
                <p className="text-sm text-red-500">{errors.cicloPago.message}</p>
              )}
            </div>
          </div>

          {/* Row 5: Fecha de inicio / Fecha de vencimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Popover open={openFechaInicio} onOpenChange={setOpenFechaInicio}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-auto py-2 px-3 flex items-center gap-2"
                    type="button"
                  >
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {fechaInicioValue ? (
                        formatearFecha(fechaInicioValue)
                      ) : (
                        'Seleccionar fecha'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicioValue}
                    onSelect={(date) => {
                      if (date) {
                        setValue('fechaInicio', date);
                      }
                    }}
                    defaultMonth={fechaInicioValue ?? new Date()}
                    disabled={false}
                  />
                </PopoverContent>
              </Popover>
              {errors.fechaInicio && (
                <p className="text-sm text-red-500">{errors.fechaInicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
              <Popover open={openFechaVencimiento} onOpenChange={setOpenFechaVencimiento}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-auto py-2 px-3 flex items-center gap-2"
                    type="button"
                  >
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {fechaVencimientoValue ? (
                        formatearFecha(fechaVencimientoValue)
                      ) : (
                        'Seleccionar fecha'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaVencimientoValue}
                    onSelect={(date) => {
                      if (date) {
                        setValue('fechaVencimiento', date);
                        setManualFechaVencimiento(true);
                      }
                    }}
                    defaultMonth={fechaVencimientoValue ?? new Date()}
                    disabled={false}
                  />
                </PopoverContent>
              </Popover>
              {errors.fechaVencimiento && (
                <p className="text-sm text-red-500">{errors.fechaVencimiento.message}</p>
              )}
            </div>
          </div>

          {/* Row 6: Número de perfiles / Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="perfiles">Número de perfiles</Label>
              <Input
                id="perfiles"
                type="text"
                inputMode="numeric"
                {...register('perfilesDisponibles', {
                  onChange: (e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > 15) {
                      e.target.value = '15';
                    }
                  }
                })}
                placeholder="Ingrese la cantidad"
                onKeyDown={(e) => {
                  const char = e.key;
                  // Permitir teclas de control (backspace, delete, tab, escape, enter, arrow keys)
                  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                    return;
                  }
                  // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                  if (e.ctrlKey || e.metaKey) {
                    return;
                  }
                  // Solo permitir números (sin decimales)
                  if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                  }
                }}
              />
              {errors.perfilesDisponibles && (
                <p className="text-sm text-red-500">{errors.perfilesDisponibles.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {getEstadoLabel(estadoValue)}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setValue('estado', 'activo')}>
                    Activo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue('estado', 'inactivo')}>
                    Inactivo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.estado && (
                <p className="text-sm text-red-500">{errors.estado.message}</p>
              )}
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea
              id="notas"
              {...register('notas')}
              placeholder="Información adicional relevante..."
              rows={6}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleNext}>
              Siguiente
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="perfil" className="space-y-6">
          {/* Vista previa de perfiles */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Vista previa de perfiles</h3>
              <p className="text-sm text-muted-foreground">
                {perfilesDisponiblesValue ? `${Number(perfilesDisponiblesValue) || 0} de ${Number(perfilesDisponiblesValue) || 0} perfiles actualmente disponibles.` : 'Ingrese el número de perfiles en la pestaña anterior.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: Number(perfilesDisponiblesValue) || 0 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-6 rounded-lg bg-green-100 border border-green-300 dark:bg-green-900/40 dark:border-green-700"
                >
                  <Users className="h-8 w-8 text-green-700 dark:text-white mb-2" />
                  <span className="text-sm font-medium text-green-700 dark:text-white">Perfil {index + 1}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 mt-1">Disponible</span>
                </div>
              ))}
            </div>

            {/* Resumen del servicio */}
            <div className="p-5 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-semibold text-base mb-3">Resumen del servicio</h4>

              <div className="space-y-3">
                {/* Fila 1: Nombre del servicio / Categoría */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Nombre del servicio</span>
                    <span className="font-medium">{nombreValue || 'Sin especificar'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Categoría</span>
                    <span className="font-medium">{categoriaNombre || 'Sin especificar'}</span>
                  </div>
                </div>

                {/* Fila 2: Tipo de plan / Perfiles disponibles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Tipo de plan</span>
                    <span className="font-medium">{getTipoPlanLabel(tipoPlanValue)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Perfiles disponibles</span>
                    <span className="font-medium">{perfilesDisponiblesValue || 0}</span>
                  </div>
                </div>

                {/* Fila 3: Email de acceso / Contraseña */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Email de acceso</span>
                    <span className="font-medium text-sm">{correoValue || 'Sin especificar'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Contraseña</span>
                    <span className="font-medium text-sm">
                      {contrasenaValue || 'Sin especificar'}
                    </span>
                  </div>
                </div>

                {/* Fila 4: Método de pago / Ciclo de facturación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Método de pago</span>
                    <span className="font-medium">{metodoPagoNombre}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Ciclo de facturación</span>
                    <span className="font-medium">{getCicloLabel(cicloPagoValue)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Fecha de inicio</span>
                    <span className="font-medium">{fechaInicioValue ? formatearFecha(fechaInicioValue) : 'Sin especificar'}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Fecha de vencimiento</span>
                    <span className="font-medium">{fechaVencimientoValue ? formatearFecha(fechaVencimientoValue) : 'Sin especificar'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block mb-1">Costo del servicio</span>
                    <span className="font-medium text-primary text-lg">{simboloMoneda} {costoServicioValue ? Number(costoServicioValue).toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones Tab 2 */}
          <div className="flex gap-3 justify-end pt-6">
            <Button type="button" variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (servicio?.id ? 'Actualizando...' : 'Creando...') : (servicio?.id ? 'Guardar Cambios' : 'Crear Servicio')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
}
