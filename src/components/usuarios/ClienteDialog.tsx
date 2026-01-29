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
import { Cliente, MetodoPago } from '@/types';
import { useClientesStore } from '@/store/clientesStore';
import { toast } from 'sonner';

const clienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  metodosPago: MetodoPago[];
}

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  metodosPago,
}: ClienteDialogProps) {
  const { createCliente, updateCliente } = useClientesStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: '',
      telefono: '',
      email: '',
      metodoPagoId: '',
    },
  });

  const metodoPagoIdValue = watch('metodoPagoId');

  useEffect(() => {
    if (cliente) {
      reset({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email || '',
        metodoPagoId: cliente.metodoPagoId,
      });
    } else {
      reset({
        nombre: '',
        telefono: '',
        email: '',
        metodoPagoId: '',
      });
    }
  }, [cliente, reset]);

  const onSubmit = async (data: ClienteFormData) => {
    try {
      const metodoPago = metodosPago.find((m) => m.id === data.metodoPagoId);
      const clienteData = {
        ...data,
        active: cliente?.active ?? true,
        createdBy: cliente?.createdBy || 'current-user',
        metodoPagoNombre: metodoPago?.nombre || '',
      };

      if (cliente) {
        await updateCliente(cliente.id, clienteData);
        toast.success('Cliente actualizado');
      } else {
        await createCliente(clienteData);
        toast.success('Cliente creado');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar cliente');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cliente ? 'Editar' : 'Nuevo'} Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Juan Pérez"
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
              placeholder="cliente@ejemplo.com"
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
