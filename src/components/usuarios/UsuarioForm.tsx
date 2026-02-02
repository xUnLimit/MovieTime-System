'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cliente, Revendedor, MetodoPago } from '@/types';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

const usuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  tipoUsuario: z.enum(['cliente', 'revendedor'], {
    message: 'Debe seleccionar un tipo de usuario',
  }),
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  metodoPagoId: z.string().min(1, 'El método de pago es requerido'),
  notas: z.string().optional(),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

interface UsuarioFormProps {
  usuario?: (Cliente | Revendedor) | null;
  tipoInicial?: 'cliente' | 'revendedor';
  metodosPago: MetodoPago[];
  onSuccess?: () => void;
  onCancel?: () => void;
  isPage?: boolean;
}

export function UsuarioForm({
  usuario,
  tipoInicial = 'cliente',
  metodosPago,
  onSuccess,
  onCancel,
  isPage = false,
}: UsuarioFormProps) {
  const { createCliente, updateCliente } = useClientesStore();
  const { createRevendedor, updateRevendedor } = useRevendedoresStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [isPersonalTabComplete, setIsPersonalTabComplete] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      tipoUsuario: '' as any,
      telefono: '',
      metodoPagoId: '',
      notas: '',
    },
  });

  const tipoUsuarioValue = watch('tipoUsuario');
  const metodoPagoIdValue = watch('metodoPagoId');
  const nombreValue = watch('nombre');
  const apellidoValue = watch('apellido');
  const telefonoValue = watch('telefono');

  // Detectar si hay cambios en el formulario (solo en modo edición)
  const hasChanges = useMemo(() => {
    if (!usuario) return true; // En modo creación, siempre permitir guardar
    
    const tipoActual = 'comisionPorcentaje' in usuario ? 'revendedor' : 'cliente';
    
    return (
      nombreValue !== (usuario.nombre || '') ||
      apellidoValue !== (usuario.apellido || '') ||
      tipoUsuarioValue !== tipoActual ||
      telefonoValue !== usuario.telefono ||
      metodoPagoIdValue !== usuario.metodoPagoId
    );
  }, [usuario, nombreValue, apellidoValue, tipoUsuarioValue, telefonoValue, metodoPagoIdValue]);

  // Limpiar errores cuando los campos se corrijan
  useEffect(() => {
    if (nombreValue && nombreValue.length >= 2 && errors.nombre) {
      clearErrors('nombre');
    }
  }, [nombreValue, errors.nombre, clearErrors]);

  useEffect(() => {
    if (apellidoValue && apellidoValue.length >= 2 && errors.apellido) {
      clearErrors('apellido');
    }
  }, [apellidoValue, errors.apellido, clearErrors]);

  useEffect(() => {
    if (tipoUsuarioValue && errors.tipoUsuario) {
      clearErrors('tipoUsuario');
    }
  }, [tipoUsuarioValue, errors.tipoUsuario, clearErrors]);

  useEffect(() => {
    if (telefonoValue && telefonoValue.length >= 8 && errors.telefono) {
      clearErrors('telefono');
    }
  }, [telefonoValue, errors.telefono, clearErrors]);

  useEffect(() => {
    if (usuario) {
      const tipo = 'comisionPorcentaje' in usuario ? 'revendedor' : 'cliente';
      reset({
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        tipoUsuario: tipo,
        telefono: usuario.telefono,
        metodoPagoId: usuario.metodoPagoId,
        notas: '',
      });
    } else {
      reset({
        nombre: '',
        apellido: '',
        tipoUsuario: '' as any,
        telefono: '',
        metodoPagoId: '',
        notas: '',
      });
    }
  }, [usuario, tipoInicial, reset]);

  const handleNext = async () => {
    // Validar campos de la pestaña personal
    const isValid = await trigger(['nombre', 'apellido', 'tipoUsuario', 'telefono']);
    if (isValid) {
      setIsPersonalTabComplete(true);
      setActiveTab('pago');
    }
  };

  const handlePrevious = () => {
    setActiveTab('personal');
  };

  const onSubmit = async (data: UsuarioFormData) => {
    try {
      const metodoPago = metodosPago.find((m) => m.id === data.metodoPagoId);

      if (data.tipoUsuario === 'cliente') {
        const clienteData = {
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          metodoPagoId: data.metodoPagoId,
          metodoPagoNombre: metodoPago?.nombre || '',
        };

        if (usuario && !('comisionPorcentaje' in usuario)) {
          await updateCliente(usuario.id, clienteData);
          toast.success('Cliente actualizado');
        } else {
          await createCliente(clienteData);
          toast.success('Cliente creado');
        }
      } else {
        const revendedorData = {
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          metodoPagoId: data.metodoPagoId,
          metodoPagoNombre: metodoPago?.nombre || '',
        };

        if (usuario && 'comisionPorcentaje' in usuario) {
          await updateRevendedor(usuario.id, revendedorData);
          toast.success('Revendedor actualizado');
        } else {
          await createRevendedor(revendedorData);
          toast.success('Revendedor creado');
        }
      }

      onSuccess?.();
    } catch (error) {
      toast.error('Error al guardar usuario');
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === 'pago' && !isPersonalTabComplete) {
      const isValid = await trigger(['nombre', 'apellido', 'tipoUsuario', 'telefono']);
      if (isValid) {
        setIsPersonalTabComplete(true);
        setActiveTab(value);
      }
    } else {
      setActiveTab(value);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={isPage ? 'space-y-6' : 'space-y-4'}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="personal"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Información Personal
          </TabsTrigger>
          <TabsTrigger
            value="pago"
            className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm ${
              !isPersonalTabComplete ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Información de Pago
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-13">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                {...register('nombre')}
                placeholder="Juan"
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
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                {...register('apellido')}
                placeholder="Pérez"
                onChange={(e) => {
                  const value = e.target.value;
                  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                  setValue('apellido', capitalized);
                }}
              />
              {errors.apellido && (
                <p className="text-sm text-red-500">{errors.apellido.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="tipoUsuario">Tipo de Usuario</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {tipoUsuarioValue === 'cliente' ? 'Cliente' : tipoUsuarioValue === 'revendedor' ? 'Revendedor' : 'Seleccionar...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setValue('tipoUsuario', 'cliente')}>
                    Cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue('tipoUsuario', 'revendedor')}>
                    Revendedor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.tipoUsuario && (
                <p className="text-sm text-red-500">{errors.tipoUsuario.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                {...register('telefono')}
                placeholder="+507 6000-0000"
                onKeyDown={(e) => {
                  // Permitir: números, backspace, delete, tab, escape, enter, +, -, (, ), espacios
                  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
                  const allowedChars = /[0-9+\-() ]/;

                  if (allowedKeys.includes(e.key) || allowedChars.test(e.key)) {
                    return;
                  }

                  e.preventDefault();
                }}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleNext}>
              Siguiente
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pago" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="metodoPagoId">Método de Pago</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    {metodoPagoIdValue
                      ? metodosPago.find((m) => m.id === metodoPagoIdValue)?.nombre
                      : 'Seleccionar método de pago...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {metodosPago
                    .filter((metodo) => metodo.asociadoA === 'usuario' || !metodo.asociadoA)
                    .map((metodo) => (
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register('notas')}
              placeholder="Añade notas sobre el método de pago o el cliente..."
              rows={6}
            />
          </div>

          <div className="flex gap-3 justify-end pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
            >
              Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (usuario ? 'Guardando...' : 'Creando...') : (usuario ? 'Guardar Cambios' : 'Crear Usuario')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
}
