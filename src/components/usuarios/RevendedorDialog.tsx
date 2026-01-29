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
import { Revendedor, MetodoPago } from '@/types';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { toast } from 'sonner';

const revendedorSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  comisionPorcentaje: z.number().min(0, 'La comisión debe ser mayor o igual a 0').max(100, 'La comisión debe ser menor o igual a 100'),
});

type RevendedorFormData = z.infer<typeof revendedorSchema>;

interface RevendedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revendedor: Revendedor | null;
  metodosPago: MetodoPago[];
}

export function RevendedorDialog({
  open,
  onOpenChange,
  revendedor,
  metodosPago,
}: RevendedorDialogProps) {
  const { createRevendedor, updateRevendedor } = useRevendedoresStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RevendedorFormData>({
    resolver: zodResolver(revendedorSchema),
    defaultValues: {
      nombre: '',
      telefono: '',
      email: '',
      metodoPagoId: '',
      comisionPorcentaje: 10,
    },
  });

  const metodoPagoIdValue = watch('metodoPagoId');

  useEffect(() => {
    if (revendedor) {
      reset({
        nombre: revendedor.nombre,
        telefono: revendedor.telefono,
        email: revendedor.email || '',
        metodoPagoId: revendedor.metodoPagoId,
        comisionPorcentaje: revendedor.comisionPorcentaje,
      });
    } else {
      reset({
        nombre: '',
        telefono: '',
        email: '',
        metodoPagoId: '',
        comisionPorcentaje: 10,
      });
    }
  }, [revendedor, reset]);

  const onSubmit = async (data: RevendedorFormData) => {
    try {
      const metodoPago = metodosPago.find((m) => m.id === data.metodoPagoId);
      const revendedorData = {
        ...data,
        active: revendedor?.active ?? true,
        createdBy: revendedor?.createdBy || 'current-user',
        metodoPagoNombre: metodoPago?.nombre || '',
        suscripcionesTotales: revendedor?.suscripcionesTotales ?? 0,
        montoTotal: revendedor?.montoTotal ?? 0,
      };

      if (revendedor) {
        await updateRevendedor(revendedor.id, revendedorData);
        toast.success('Revendedor actualizado');
      } else {
        await createRevendedor(revendedorData);
        toast.success('Revendedor creado');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar revendedor');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {revendedor ? 'Editar' : 'Nuevo'} Revendedor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="María García"
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              {...register('telefono')}
              placeholder="+507 6000-0000"
            />
            {errors.telefono && (
              <p className="text-sm text-red-500">{errors.telefono.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="revendedor@ejemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodoPagoId">Método de Pago</Label>
            <Select
              value={metodoPagoIdValue}
              onValueChange={(value) => setValue('metodoPagoId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((metodo) => (
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
            <Label htmlFor="comisionPorcentaje">Comisión (%)</Label>
            <Input
              id="comisionPorcentaje"
              type="number"
              min="0"
              max="100"
              step="0.1"
              {...register('comisionPorcentaje', { valueAsNumber: true })}
              placeholder="10"
            />
            {errors.comisionPorcentaje && (
              <p className="text-sm text-red-500">{errors.comisionPorcentaje.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Porcentaje de comisión por cada venta
            </p>
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
