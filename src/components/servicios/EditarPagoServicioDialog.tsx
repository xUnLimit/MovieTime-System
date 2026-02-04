'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Servicio, MetodoPago, PagoServicio } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/constants';

const editarPagoSchema = z.object({
  periodoRenovacion: z
    .string()
    .refine((v) => ['mensual', 'trimestral', 'semestral', 'anual'].includes(v), {
      message: 'Seleccione el ciclo de facturación',
    }),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  costo: z.number().min(0, 'El costo debe ser mayor a 0'),
  fechaInicio: z.date(),
  fechaVencimiento: z.date(),
  notas: z.string().optional(),
});

type EditarPagoFormData = z.infer<typeof editarPagoSchema>;

interface EditarPagoServicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: PagoServicio | null;
  servicio: Servicio;
  metodosPago: MetodoPago[];
  onConfirm: (data: EditarPagoFormData) => void;
}

export function EditarPagoServicioDialog({
  open,
  onOpenChange,
  pago,
  servicio,
  metodosPago,
  onConfirm,
}: EditarPagoServicioDialogProps) {
  const [fechaInicioOpen, setFechaInicioOpen] = useState(false);
  const [fechaVencimientoOpen, setFechaVencimientoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EditarPagoFormData>({
    resolver: zodResolver(editarPagoSchema),
    defaultValues: {
      periodoRenovacion: servicio.cicloPago || '',
      metodoPagoId: servicio.metodoPagoId || '',
      costo: 0,
      fechaInicio: new Date(),
      fechaVencimiento: new Date(),
      notas: '',
    },
  });

  const periodoValue = watch('periodoRenovacion');
  const metodoPagoIdValue = watch('metodoPagoId');
  const costoValue = watch('costo');
  const fechaInicioValue = watch('fechaInicio');
  const fechaVencimientoValue = watch('fechaVencimiento');

  const metodoPagoSeleccionado = metodosPago.find((m) => m.id === metodoPagoIdValue);
  const currencySymbol = getCurrencySymbol(metodoPagoSeleccionado?.moneda);

  useEffect(() => {
    if (open && pago && servicio) {
      reset({
        periodoRenovacion: servicio.cicloPago || '',
        metodoPagoId: servicio.metodoPagoId || '',
        costo: pago.monto,
        fechaInicio: new Date(pago.fechaInicio),
        fechaVencimiento: new Date(pago.fechaVencimiento),
        notas: '',
      });
    }
  }, [open, pago, servicio, reset]);

  const handleCicloChange = (ciclo: 'mensual' | 'trimestral' | 'semestral' | 'anual') => {
    setValue('periodoRenovacion', ciclo);
    clearErrors('periodoRenovacion');
    const fechaInicio = getValues('fechaInicio');
    if (fechaInicio) {
      const meses = ciclo === 'mensual' ? 1 : ciclo === 'trimestral' ? 3 : ciclo === 'semestral' ? 6 : 12;
      setValue('fechaVencimiento', addMonths(fechaInicio, meses));
    }
  };

  const hasChanges = useMemo(() => {
    if (!pago || !servicio) return false;
    const inicioPago = new Date(pago.fechaInicio).getTime();
    const vencimientoPago = new Date(pago.fechaVencimiento).getTime();
    return (
      periodoValue !== (servicio.cicloPago || '') ||
      metodoPagoIdValue !== (servicio.metodoPagoId || '') ||
      costoValue !== pago.monto ||
      fechaInicioValue?.getTime() !== inicioPago ||
      fechaVencimientoValue?.getTime() !== vencimientoPago
    );
  }, [pago, servicio, periodoValue, metodoPagoIdValue, costoValue, fechaInicioValue, fechaVencimientoValue]);

  const onSubmit = async (data: EditarPagoFormData) => {
    onConfirm(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  if (!pago) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar pago del servicio: {servicio.nombre}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Corrija los datos del último pago registrado ({pago.descripcion}) si se ingresó algo incorrecto.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
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
                  <DropdownMenuItem onClick={() => handleCicloChange('mensual')}>Mensual</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloChange('trimestral')}>Trimestral</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloChange('semestral')}>Semestral</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCicloChange('anual')}>Anual</DropdownMenuItem>
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
                    .filter((m) => m.activo && (m.asociadoA === 'servicio' || !m.asociadoA))
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

            <div className="space-y-2">
              <Label htmlFor="costo">Costo</Label>
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
            <Button type="submit" disabled={isSubmitting || !hasChanges} className="bg-purple-600 hover:bg-purple-700">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
