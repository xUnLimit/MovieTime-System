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

const renovacionSchema = z.object({
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

type RenovacionVentaFormData = z.infer<typeof renovacionSchema>;

interface RenovarVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venta: {
    clienteNombre: string;
    metodoPagoId?: string;
    precioFinal: number;
    fechaFin: Date;
  };
  metodosPago: MetodoPago[];
  onConfirm: (data: RenovacionVentaFormData) => void;
}

export function RenovarVentaDialog({
  open,
  onOpenChange,
  venta,
  metodosPago,
  onConfirm,
}: RenovarVentaDialogProps) {
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
  } = useForm<RenovacionVentaFormData>({
    resolver: zodResolver(renovacionSchema),
    defaultValues: {
      periodoRenovacion: '',
      metodoPagoId: venta.metodoPagoId || '',
      costo: venta.precioFinal || 0,
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
  const currencySymbol = getCurrencySymbol(metodoPagoSeleccionado?.moneda);

  useEffect(() => {
    if (open && venta) {
      const fechaVencimientoActual = venta.fechaFin ? new Date(venta.fechaFin) : new Date();
      reset({
        periodoRenovacion: '',
        metodoPagoId: venta.metodoPagoId || '',
        costo: venta.precioFinal || 0,
        fechaInicio: fechaVencimientoActual,
        fechaVencimiento: fechaVencimientoActual,
        notas: '',
      });
    }
  }, [open, venta, reset]);

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

  const onSubmit = async (data: RenovacionVentaFormData) => {
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
          <DialogTitle>Renovar Venta: {venta.clienteNombre}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Registre un nuevo pago para esta venta para extender su fecha de vencimiento.
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
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Confirmar Renovación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
