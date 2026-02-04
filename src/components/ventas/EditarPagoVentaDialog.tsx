'use client';

import { useEffect, useState } from 'react';
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
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MetodoPago } from '@/types';
import { getCurrencySymbol } from '@/lib/constants';

const editarPagoSchema = z.object({
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

type EditarPagoVentaFormData = z.infer<typeof editarPagoSchema>;

interface EditarPagoVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venta: {
    metodoPagoId?: string;
  };
  pago: {
    metodoPagoId?: string | null;
    cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual' | null;
    precio: number;
    fechaInicio?: Date | null;
    fechaVencimiento?: Date | null;
    notas?: string | null;
  } | null;
  metodosPago: MetodoPago[];
  onConfirm: (data: EditarPagoVentaFormData) => void;
}

export function EditarPagoVentaDialog({
  open,
  onOpenChange,
  venta,
  pago,
  metodosPago,
  onConfirm,
}: EditarPagoVentaDialogProps) {
  const [fechaInicioOpen, setFechaInicioOpen] = useState(false);
  const [fechaVencimientoOpen, setFechaVencimientoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EditarPagoVentaFormData>({
    resolver: zodResolver(editarPagoSchema),
    defaultValues: {
      periodoRenovacion: '',
      metodoPagoId: venta.metodoPagoId || '',
      costo: 0,
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
    if (open && pago) {
      reset({
        periodoRenovacion: pago.cicloPago || '',
        metodoPagoId: (pago.metodoPagoId as string) || venta.metodoPagoId || '',
        costo: pago.precio ?? 0,
        descuento: (pago.descuento as number) ?? 0,
        fechaInicio: pago.fechaInicio ? new Date(pago.fechaInicio) : new Date(),
        fechaVencimiento: pago.fechaVencimiento ? new Date(pago.fechaVencimiento) : new Date(),
        notas: pago.notas ?? '',
      });
    }
  }, [open, pago, venta.metodoPagoId, reset]);

  // Auto-calcular fecha de vencimiento cuando se selecciona el ciclo (desde fecha de inicio)
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

  const onSubmit = async (data: EditarPagoVentaFormData) => {
    onConfirm(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Pago</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Actualiza la información del pago seleccionado.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
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
                  {metodosPago
                    .filter((m) => m.activo && m.asociadoA === 'usuario')
                    .map((m) => (
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costo">Precio</Label>
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
          </div>

          <div className="space-y-2">
            <Label>Precio Final</Label>
            <div className="h-9 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm font-medium">
              {currencySymbol} {precioFinal.toFixed(2)}
            </div>
          </div>

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
                      format(fechaInicioValue, "d 'de' MMMM 'del' yyyy", { locale: es })
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
                      format(fechaVencimientoValue, "d 'de' MMMM 'del' yyyy", { locale: es })
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
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
