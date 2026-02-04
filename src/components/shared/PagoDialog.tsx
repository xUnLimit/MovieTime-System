'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MetodoPago, PagoServicio, Servicio } from '@/types';
import { getCurrencySymbol } from '@/lib/constants';
import { formatearFecha } from '@/lib/utils/calculations';

const pagoDialogSchema = z.object({
  periodoRenovacion: z
    .string()
    .refine((v) => ['mensual', 'trimestral', 'semestral', 'anual'].includes(v), {
      message: 'Seleccione el ciclo de facturación',
    }),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  costo: z.number().min(0, 'El costo debe ser mayor a 0'),
  descuento: z.number().min(0).max(100).optional(),
  fechaInicio: z.date(),
  fechaVencimiento: z.date(),
  notas: z.string().optional(),
});

type PagoDialogFormData = z.infer<typeof pagoDialogSchema>;

type PagoDialogMode = 'edit' | 'renew';
type PagoDialogContext = 'venta' | 'servicio';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metodosPago: MetodoPago[];
  mode: PagoDialogMode;
  onConfirm: (data: PagoDialogFormData) => void;
}

interface VentaDialogProps extends BaseProps {
  context: 'venta';
  venta: {
    clienteNombre: string;
    metodoPagoId?: string;
    precioFinal: number;
    fechaFin: Date;
  };
  pago?: {
    metodoPagoId?: string | null;
    cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual' | null;
    precio: number;
    descuento?: number | null;
    fechaInicio?: Date | null;
    fechaVencimiento?: Date | null;
    notas?: string | null;
  } | null;
}

interface ServicioDialogProps extends BaseProps {
  context: 'servicio';
  servicio: Servicio;
  pago?: PagoServicio | null;
}

type PagoDialogProps = VentaDialogProps | ServicioDialogProps;

export function PagoDialog(props: PagoDialogProps) {
  const [fechaInicioOpen, setFechaInicioOpen] = useState(false);
  const [fechaVencimientoOpen, setFechaVencimientoOpen] = useState(false);
  const isVenta = props.context === 'venta';
  const isEdit = props.mode === 'edit';
  const venta = props.context === 'venta' ? props.venta : null;
  const servicio = props.context === 'servicio' ? props.servicio : null;
  const pago = props.pago ?? null;
  const { metodosPago } = props;

  const defaultMetodoPagoId = venta?.metodoPagoId || servicio?.metodoPagoId || '';
  const defaultCosto = venta
    ? (props.mode === 'renew' ? venta.precioFinal || 0 : 0)
    : (props.mode === 'renew' ? (servicio?.costoServicio || 0) : 0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PagoDialogFormData>({
    resolver: zodResolver(pagoDialogSchema),
    defaultValues: {
      periodoRenovacion: '',
      metodoPagoId: defaultMetodoPagoId,
      costo: defaultCosto,
      descuento: 0,
      fechaInicio: new Date(),
      fechaVencimiento: new Date(),
      notas: '',
    },
  });

  const periodoValue = watch('periodoRenovacion');
  const metodoPagoIdValue = watch('metodoPagoId');
  const costoValue = watch('costo');
  const descuentoValue = watch('descuento');
  const fechaInicioValue = watch('fechaInicio');
  const fechaVencimientoValue = watch('fechaVencimiento');

  const metodoPagoSeleccionado = metodosPago.find((m) => m.id === metodoPagoIdValue);
  const currencySymbol = getCurrencySymbol(metodoPagoSeleccionado?.moneda);
  const descuentoNumero = Number(descuentoValue) || 0;
  const precioFinal = Math.max((Number(costoValue) || 0) * (1 - descuentoNumero / 100), 0);

  useEffect(() => {
    if (!open) return;

    if (props.context === 'venta') {
      if (isEdit) {
        if (props.pago) {
          reset({
            periodoRenovacion: props.pago.cicloPago || '',
            metodoPagoId: (props.pago.metodoPagoId as string) || venta?.metodoPagoId || '',
            costo: props.pago.precio ?? 0,
            descuento: (props.pago.descuento as number) ?? 0,
            fechaInicio: props.pago.fechaInicio ? new Date(props.pago.fechaInicio) : new Date(),
            fechaVencimiento: props.pago.fechaVencimiento ? new Date(props.pago.fechaVencimiento) : new Date(),
            notas: props.pago.notas ?? '',
          });
          return;
        }
        reset({
          periodoRenovacion: '',
          metodoPagoId: venta?.metodoPagoId || '',
          costo: 0,
          descuento: 0,
          fechaInicio: new Date(),
          fechaVencimiento: new Date(),
          notas: '',
        });
        return;
      }

      const fechaVencimientoActual = venta?.fechaFin ? new Date(venta.fechaFin) : new Date();
      reset({
        periodoRenovacion: '',
        metodoPagoId: venta?.metodoPagoId || '',
        costo: venta?.precioFinal || 0,
        descuento: 0,
        fechaInicio: fechaVencimientoActual,
        fechaVencimiento: fechaVencimientoActual,
        notas: '',
      });
      return;
    }

    if (isEdit) {
      if (!props.pago || !servicio) return;
      reset({
        periodoRenovacion: servicio.cicloPago || '',
        metodoPagoId: servicio.metodoPagoId || '',
        costo: props.pago.monto,
        fechaInicio: new Date(props.pago.fechaInicio),
        fechaVencimiento: new Date(props.pago.fechaVencimiento),
        notas: '',
      });
      return;
    }

    const fechaVencimientoActual = servicio?.fechaVencimiento
      ? new Date(servicio.fechaVencimiento)
      : new Date();
    reset({
      periodoRenovacion: '',
      metodoPagoId: servicio?.metodoPagoId || '',
      costo: servicio?.costoServicio || 0,
      fechaInicio: fechaVencimientoActual,
      fechaVencimiento: fechaVencimientoActual,
      notas: '',
    });
  }, [open, isEdit, props.pago, reset, servicio, venta, props.context]);

  useEffect(() => {
    if (fechaInicioValue && periodoValue && periodoValue !== '') {
      const meses =
        periodoValue === 'mensual' ? 1 :
        periodoValue === 'trimestral' ? 3 :
        periodoValue === 'semestral' ? 6 : 12;
      const nuevaFechaVencimiento = addMonths(fechaInicioValue, meses);
      setValue('fechaVencimiento', nuevaFechaVencimiento);
    }
  }, [periodoValue, fechaInicioValue, setValue]);

  const hasChanges = useMemo(() => {
    if (props.context !== 'servicio' || props.mode !== 'edit') return true;
    if (!props.pago || !servicio) return false;
    const inicioPago = new Date(props.pago.fechaInicio).getTime();
    const vencimientoPago = new Date(props.pago.fechaVencimiento).getTime();
    return (
      periodoValue !== (servicio.cicloPago || '') ||
      metodoPagoIdValue !== (servicio.metodoPagoId || '') ||
      costoValue !== props.pago.monto ||
      fechaInicioValue?.getTime() !== inicioPago ||
      fechaVencimientoValue?.getTime() !== vencimientoPago
    );
  }, [
    costoValue,
    fechaInicioValue,
    fechaVencimientoValue,
    props.context,
    props.mode,
    metodoPagoIdValue,
    periodoValue,
    props.pago,
    servicio,
  ]);

  const onSubmit = async (data: PagoDialogFormData) => {
    props.onConfirm(data);
    props.onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
    props.onOpenChange(false);
  };

  if (!isVenta && isEdit && !pago) return null;

  const title = isVenta
    ? (isEdit ? 'Editar Pago' : `Renovar Venta: ${venta?.clienteNombre || ''}`)
    : (isEdit ? `Editar pago del servicio: ${servicio?.nombre || ''}` : `Renovar Servicio: ${servicio?.nombre || ''}`);
  const description = isVenta
    ? (isEdit
        ? 'Actualiza la información del pago seleccionado.'
        : 'Registre un nuevo pago para esta venta para extender su fecha de vencimiento.')
    : (isEdit
        ? `Corrija los datos del último pago registrado (${(pago as PagoServicio | null)?.descripcion ?? 'Pago'}) si se ingresó algo incorrecto.`
        : 'Registre un nuevo pago para este servicio para extender su fecha de vencimiento.');

  const metodosFiltrados = metodosPago.filter((m) =>
    m.activo && (isVenta ? m.asociadoA === 'usuario' : (m.asociadoA === 'servicio' || !m.asociadoA))
  );

  const submitDisabled = isSubmitting || (!isVenta && isEdit && !hasChanges);

  const renderPeriodoField = () => (
    <div className="space-y-2">
      <Label htmlFor="periodoRenovacion">Ciclo de facturación</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className="w-full justify-between border-input bg-transparent dark:bg-input/30 dark:hover:bg-input/50 h-9"
          >
            {periodoValue === 'mensual' ? 'Mensual' : periodoValue === 'trimestral' ? 'Trimestral' : periodoValue === 'semestral' ? 'Semestral' : periodoValue === 'anual' ? 'Anual' : 'Seleccionar ciclo'}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuItem onClick={() => { setValue('periodoRenovacion', 'mensual'); clearErrors('periodoRenovacion'); }}>Mensual</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setValue('periodoRenovacion', 'trimestral'); clearErrors('periodoRenovacion'); }}>Trimestral</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setValue('periodoRenovacion', 'semestral'); clearErrors('periodoRenovacion'); }}>Semestral</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setValue('periodoRenovacion', 'anual'); clearErrors('periodoRenovacion'); }}>Anual</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {errors.periodoRenovacion && (
        <p className="text-sm text-red-500">{errors.periodoRenovacion.message}</p>
      )}
    </div>
  );

  const renderMetodoField = () => (
    <div className="space-y-2">
      <Label htmlFor="metodoPagoId">Método de pago</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className="w-full justify-between border-input bg-transparent dark:bg-input/30 dark:hover:bg-input/50 h-9"
          >
            {metodoPagoIdValue ? metodosPago.find((m) => m.id === metodoPagoIdValue)?.nombre : 'Seleccionar método'}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {metodosFiltrados.map((m) => (
            <DropdownMenuItem key={m.id} onClick={() => { setValue('metodoPagoId', m.id); clearErrors('metodoPagoId'); }}>
              {m.nombre}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {errors.metodoPagoId && (
        <p className="text-sm text-red-500">{errors.metodoPagoId.message}</p>
      )}
    </div>
  );

  const renderCostoField = (label: string) => (
    <div className="space-y-2">
      <Label htmlFor="costo">{label}</Label>
      <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] outline-none">
        <span className="text-muted-foreground shrink-0 pr-2">{currencySymbol}</span>
        <input
          id="costo"
          type="number"
          step="0.01"
          value={costoValue}
          onChange={(e) => setValue('costo', parseFloat(e.target.value) || 0)}
          className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      {errors.costo && (
        <p className="text-sm text-red-500">{errors.costo.message}</p>
      )}
    </div>
  );

  const renderDescuentoField = () => (
    <div className="space-y-2">
      <Label htmlFor="descuento">Descuento %</Label>
      <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] outline-none">
        <input
          id="descuento"
          type="number"
          step="0.01"
          value={descuentoValue ?? ''}
          onFocus={() => {
            if (descuentoValue === 0) setValue('descuento', undefined);
          }}
          onChange={(e) => {
            const value = e.target.value;
            setValue('descuento', value === '' ? undefined : parseFloat(value));
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-muted-foreground shrink-0 pl-2">%</span>
      </div>
      {errors.descuento && (
        <p className="text-sm text-red-500">{errors.descuento.message}</p>
      )}
    </div>
  );

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {isVenta ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {renderPeriodoField()}
                {renderMetodoField()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderCostoField('Precio')}
                {renderDescuentoField()}
              </div>

              <div className="space-y-2">
                <Label>Precio Final</Label>
                <div className="h-9 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm font-medium">
                  {currencySymbol} {precioFinal.toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {renderPeriodoField()}
              {renderMetodoField()}
              {renderCostoField('Costo')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Popover open={fechaInicioOpen} onOpenChange={setFechaInicioOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fechaInicioValue && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicioValue ? (
                      formatearFecha(fechaInicioValue)
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicioValue}
                    onSelect={(date) => {
                      setValue('fechaInicio', date || new Date());
                    }}
                    defaultMonth={fechaInicioValue ?? new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Popover open={fechaVencimientoOpen} onOpenChange={setFechaVencimientoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fechaVencimientoValue && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaVencimientoValue ? (
                      formatearFecha(fechaVencimientoValue)
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaVencimientoValue}
                    onSelect={(date) => {
                      setValue('fechaVencimiento', date || new Date());
                    }}
                    defaultMonth={fechaVencimientoValue ?? new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register('notas')}
              placeholder="Añade notas si es necesario..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitDisabled} className="bg-purple-600 hover:bg-purple-700">
              {isEdit ? (
                <>
                  {!isVenta && (
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  Guardar cambios
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Confirmar Renovación
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
