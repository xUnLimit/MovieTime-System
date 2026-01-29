'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Venta, Cliente, Revendedor, Servicio, MetodoPago, Categoria } from '@/types';
import { useVentasStore } from '@/store/ventasStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ventaSchema = z.object({
  tipo: z.enum(['cliente', 'revendedor']),
  clienteId: z.string().optional(),
  revendedorId: z.string().optional(),
  servicioId: z.string().min(1, 'El servicio es requerido'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  moneda: z.enum(['USD', 'PAB']),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  cicloPago: z.enum(['mensual', 'trimestral', 'anual']),
  fechaInicio: z.date(),
}).refine((data) => {
  if (data.tipo === 'cliente' && !data.clienteId) {
    return false;
  }
  if (data.tipo === 'revendedor' && !data.revendedorId) {
    return false;
  }
  return true;
}, {
  message: 'Debe seleccionar un cliente o revendedor',
  path: ['clienteId'],
});

type VentaFormData = z.infer<typeof ventaSchema>;

interface VentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venta: Venta | null;
  clientes: Cliente[];
  revendedores: Revendedor[];
  servicios: Servicio[];
  metodosPago: MetodoPago[];
  categorias: Categoria[];
}

export function VentaDialog({
  open,
  onOpenChange,
  venta,
  clientes,
  revendedores,
  servicios,
  metodosPago,
  categorias,
}: VentaDialogProps) {
  const { createVenta, updateVenta } = useVentasStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      tipo: 'cliente',
      clienteId: '',
      revendedorId: '',
      servicioId: '',
      monto: 0,
      moneda: 'USD',
      metodoPagoId: '',
      cicloPago: 'mensual',
      fechaInicio: new Date(),
    },
  });

  const tipoValue = watch('tipo');
  const clienteIdValue = watch('clienteId');
  const revendedorIdValue = watch('revendedorId');
  const servicioIdValue = watch('servicioId');
  const monedaValue = watch('moneda');
  const metodoPagoIdValue = watch('metodoPagoId');
  const cicloPagoValue = watch('cicloPago');

  useEffect(() => {
    if (venta) {
      reset({
        tipo: venta.tipo,
        clienteId: venta.clienteId,
        revendedorId: venta.revendedorId,
        servicioId: venta.servicioId,
        monto: venta.monto,
        moneda: venta.moneda,
        metodoPagoId: venta.metodoPagoId,
        cicloPago: venta.cicloPago,
        fechaInicio: new Date(venta.fechaInicio),
      });
    } else {
      reset({
        tipo: 'cliente',
        clienteId: '',
        revendedorId: '',
        servicioId: '',
        monto: 0,
        moneda: 'USD',
        metodoPagoId: '',
        cicloPago: 'mensual',
        fechaInicio: new Date(),
      });
    }
  }, [venta, reset]);

  // Auto-populate metodoPago based on cliente/revendedor
  useEffect(() => {
    if (tipoValue === 'cliente' && clienteIdValue) {
      const cliente = clientes.find((c) => c.id === clienteIdValue);
      if (cliente) {
        setValue('metodoPagoId', cliente.metodoPagoId);
      }
    } else if (tipoValue === 'revendedor' && revendedorIdValue) {
      const revendedor = revendedores.find((r) => r.id === revendedorIdValue);
      if (revendedor) {
        setValue('metodoPagoId', revendedor.metodoPagoId);
      }
    }
  }, [tipoValue, clienteIdValue, revendedorIdValue, clientes, revendedores, setValue]);

  const onSubmit = async (data: VentaFormData) => {
    try {
      const servicio = servicios.find((s) => s.id === data.servicioId);
      const categoria = categorias.find((c) => c.id === servicio?.categoriaId);
      const metodoPago = metodosPago.find((m) => m.id === data.metodoPagoId);
      const cliente = data.tipo === 'cliente' ? clientes.find((c) => c.id === data.clienteId) : null;
      const revendedor = data.tipo === 'revendedor' ? revendedores.find((r) => r.id === data.revendedorId) : null;

      const ventaData = {
        ...data,
        createdBy: venta?.createdBy || 'current-user',
        categoriaId: servicio?.categoriaId || '',
        correo: servicio?.correo || '',
        contrasena: servicio?.contrasena || '',
        servicioNombre: servicio?.nombre || '',
        categoriaNombre: categoria?.nombre || '',
        metodoPagoNombre: metodoPago?.nombre || '',
        clienteNombre: cliente?.nombre,
        revendedorNombre: revendedor?.nombre,
      };

      if (venta) {
        await updateVenta(venta.id, ventaData);
        toast.success('Venta actualizada');
      } else {
        await createVenta(ventaData);
        toast.success('Venta creada');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar venta');
    }
  };

  const getClienteRevendedorOptions = () => {
    if (tipoValue === 'cliente') {
      return clientes.filter((c) => c.active);
    }
    return revendedores.filter((r) => r.active);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {venta ? 'Editar' : 'Nueva'} Venta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Venta</Label>
            <Select
              value={tipoValue}
              onValueChange={(value) => {
                setValue('tipo', value as any);
                setValue('clienteId', '');
                setValue('revendedorId', '');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="revendedor">Revendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={tipoValue === 'cliente' ? 'clienteId' : 'revendedorId'}>
              {tipoValue === 'cliente' ? 'Cliente' : 'Revendedor'}
            </Label>
            <Select
              value={tipoValue === 'cliente' ? clienteIdValue : revendedorIdValue}
              onValueChange={(value) => {
                if (tipoValue === 'cliente') {
                  setValue('clienteId', value);
                } else {
                  setValue('revendedorId', value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Seleccionar ${tipoValue}`} />
              </SelectTrigger>
              <SelectContent>
                {getClienteRevendedorOptions().map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nombre} - {item.telefono}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clienteId && (
              <p className="text-sm text-red-500">{errors.clienteId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="servicioId">Servicio</Label>
            <Select
              value={servicioIdValue}
              onValueChange={(value) => setValue('servicioId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {servicios
                  .filter((s) => s.activo)
                  .map((servicio) => (
                    <SelectItem key={servicio.id} value={servicio.id}>
                      {servicio.nombre} - {servicio.categoriaNombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.servicioId && (
              <p className="text-sm text-red-500">{errors.servicioId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                {...register('monto', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.monto && (
                <p className="text-sm text-red-500">{errors.monto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select
                value={monedaValue}
                onValueChange={(value) => setValue('moneda', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PAB">PAB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cicloPago">Ciclo de Pago</Label>
              <Select
                value={cicloPagoValue}
                onValueChange={(value) => setValue('cicloPago', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metodoPagoId">Método de Pago</Label>
              <Select
                value={metodoPagoIdValue}
                onValueChange={(value) => setValue('metodoPagoId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {metodosPago
                    .filter((m) => m.activo)
                    .map((metodo) => (
                      <SelectItem key={metodo.id} value={metodo.id}>
                        {metodo.nombre} ({metodo.tipo})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.metodoPagoId && (
                <p className="text-sm text-red-500">{errors.metodoPagoId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                {...register('fechaInicio', { valueAsDate: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
