'use client';

import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useRouter } from 'next/navigation';
import { Plan } from '@/types';

const categoriaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  tipo: z.enum(['cliente', 'revendedor'], {
    message: 'Debe seleccionar asociado a',
  }),
  tipoCategoria: z.enum(['plataforma_streaming', 'otros'], {
    message: 'Debe seleccionar un tipo de categoría',
  }),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof categoriaSchema>;

export function CategoriaForm() {
  const router = useRouter();
  const { createCategoria } = useCategoriasStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isGeneralTabComplete, setIsGeneralTabComplete] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tipoPlanSeleccionado, setTipoPlanSeleccionado] = useState<'cuenta_completa' | 'perfiles'>('cuenta_completa');
  const [planesError, setPlanesError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    clearErrors,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: '',
      tipo: '' as any,
      tipoCategoria: '' as any,
      notas: '',
    },
  });

  const nombreValue = watch('nombre');
  const tipoValue = watch('tipo');
  const tipoCategoriaValue = watch('tipoCategoria');

  // Limpieza automática de errores
  useEffect(() => {
    if (nombreValue && nombreValue.length >= 2 && errors.nombre) {
      clearErrors('nombre');
    }
  }, [nombreValue, errors.nombre, clearErrors]);

  useEffect(() => {
    if (tipoValue && errors.tipo) {
      clearErrors('tipo');
    }
  }, [tipoValue, errors.tipo, clearErrors]);

  useEffect(() => {
    if (tipoCategoriaValue && errors.tipoCategoria) {
      clearErrors('tipoCategoria');
    }
  }, [tipoCategoriaValue, errors.tipoCategoria, clearErrors]);

  const onSubmit = async (data: FormData) => {
    // Validar que al menos exista un plan
    if (planes.length === 0) {
      setPlanesError('Debe agregar al menos un plan a la categoría');
      setActiveTab('planes');
      return;
    }

    // Validar que cada plan tenga nombre válido
    const planesConError = planes.some(plan => !plan.nombre || plan.nombre.trim() === '');
    if (planesConError) {
      setPlanesError('Todos los planes deben tener un nombre');
      setActiveTab('planes');
      return;
    }

    try {
      setPlanesError('');
      await createCategoria({
        nombre: data.nombre,
        tipo: data.tipo,
        tipoCategoria: data.tipoCategoria,
        planes: planes.length > 0 ? planes : undefined,
        activo: true,
      });
      toast.success('Categoría creada exitosamente');
      router.push('/categorias');
    } catch (error) {
      toast.error('Error al crear la categoría', { description: error instanceof Error ? error.message : undefined });
      console.error(error);
    }
  };

  const agregarPlan = (tipoPlan: 'cuenta_completa' | 'perfiles') => {
    const nuevoPlan: Plan = {
      id: `plan-${Date.now()}`,
      nombre: '',
      precio: 0,
      cicloPago: 'mensual',
      tipoPlan,
    };
    setPlanes([...planes, nuevoPlan]);
    setPlanesError('');
  };

  const eliminarPlan = (id: string) => {
    setPlanes(planes.filter((plan) => plan.id !== id));
  };

  const actualizarPlan = (
    id: string,
    campo: 'nombre' | 'precio' | 'cicloPago' | 'tipoPlan',
    valor: string | number
  ) => {
    setPlanes(
      planes.map((plan) =>
        plan.id === id ? { ...plan, [campo]: valor } : plan
      )
    );
  };

  const planesCuentaCompleta = planes.filter((p) => p.tipoPlan === 'cuenta_completa');
  const planesPerfiles = planes.filter((p) => p.tipoPlan === 'perfiles');

  const getCicloPagoLabel = (ciclo: string) => {
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

  const onCancel = () => {
    router.push('/categorias');
  };

  const getAsociadoLabel = (tipo: string) => {
    switch (tipo) {
      case 'cliente':
        return 'Cliente';
      case 'revendedor':
        return 'Revendedor';
      default:
        return 'Seleccionar';
    }
  };

  const getTipoCategoriaLabel = (tipo: string) => {
    switch (tipo) {
      case 'plataforma_streaming':
        return 'Plataforma de Streaming';
      case 'otros':
        return 'Otros';
      default:
        return 'Seleccionar tipo';
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === 'planes' && !isGeneralTabComplete) {
      const isValid = await trigger(['nombre', 'tipo', 'tipoCategoria']);
      if (isValid) {
        setIsGeneralTabComplete(true);
        setActiveTab(value);
      }
    } else {
      setActiveTab(value);
    }
  };

  const handleNext = async () => {
    const isValid = await trigger(['nombre', 'tipo', 'tipoCategoria']);
    if (isValid) {
      setIsGeneralTabComplete(true);
      setActiveTab('planes');
    }
  };

  const handlePrevious = () => {
    setActiveTab('general');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-8 bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Información General
          </TabsTrigger>
          <TabsTrigger
            value="planes"
            className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm ${
              !isGeneralTabComplete ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Planes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            {...register('nombre')}
            placeholder="Ej: Servicios de Streaming"
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

        {/* Grid de 2 columnas para Asociado a y Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asociado a */}
          <div className="space-y-2">
            <Label htmlFor="asociado">Asociado a</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  type="button"
                >
                  {getAsociadoLabel(tipoValue)}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => setValue('tipo', 'cliente')}>
                  Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setValue('tipo', 'revendedor')}>
                  Revendedor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {errors.tipo && (
              <p className="text-sm text-red-500">{errors.tipo.message}</p>
            )}
          </div>

          {/* Tipo de Categoría */}
          <div className="space-y-2">
            <Label htmlFor="tipoCategoria">Tipo de Categoría</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  type="button"
                >
                  {getTipoCategoriaLabel(tipoCategoriaValue)}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => setValue('tipoCategoria', 'plataforma_streaming')}>
                  Plataforma de Streaming
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setValue('tipoCategoria', 'otros')}>
                  Otros
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {errors.tipoCategoria && (
              <p className="text-sm text-red-500">{errors.tipoCategoria.message}</p>
            )}
          </div>
        </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register('notas')}
              placeholder="Añade notas sobre la categoría..."
              rows={6}
            />
          </div>

          {/* Botones Tab 1 */}
          <div className="flex gap-3 justify-end pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleNext}>
              Siguiente
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="planes" className="space-y-4">
          {planesError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{planesError}</p>
            </div>
          )}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Columna izquierda: Selector de tipo de plan */}
            <div className="lg:w-[420px] space-y-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Tipo de Planes</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona el tipo de plan
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Opción: Cuenta Completa */}
                <button
                  type="button"
                  onClick={() => setTipoPlanSeleccionado('cuenta_completa')}
                  className={`p-4 border-2 rounded-lg transition-all hover:shadow-sm ${
                    tipoPlanSeleccionado === 'cuenta_completa'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Cuenta Completa</h4>
                      {tipoPlanSeleccionado === 'cuenta_completa' && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Acceso completo a la cuenta
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        {planesCuentaCompleta.length} plan{planesCuentaCompleta.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Opción: Perfiles */}
                <button
                  type="button"
                  onClick={() => setTipoPlanSeleccionado('perfiles')}
                  className={`p-4 border-2 rounded-lg transition-all hover:shadow-sm ${
                    tipoPlanSeleccionado === 'perfiles'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Perfiles</h4>
                      {tipoPlanSeleccionado === 'perfiles' && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Por perfil individual
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        {planesPerfiles.length} plan{planesPerfiles.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Línea vertical divisora */}
            <div className="hidden lg:block">
              <div className="h-full border-r" />
            </div>

            {/* Columna derecha: Lista de planes */}
            <div className="flex-1 space-y-4">
            {/* Mostrar planes según el tipo seleccionado */}
            {tipoPlanSeleccionado === 'cuenta_completa' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Planes para Cuenta Completa</h3>
                  <Button
                    type="button"
                    onClick={() => agregarPlan('cuenta_completa')}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Plan
                  </Button>
                </div>

                {planesCuentaCompleta.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        No hay planes agregados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Haz clic en "Agregar Plan" para crear tu primer plan de cuenta completa
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                  {planesCuentaCompleta.map((plan, index) => (
                    <div
                      key={plan.id}
                      className="p-4 border rounded-lg bg-card space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Plan {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarPlan(plan.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`plan-nombre-${plan.id}`}>
                            Nombre del Plan
                          </Label>
                          <Input
                            id={`plan-nombre-${plan.id}`}
                            value={plan.nombre}
                            onChange={(e) =>
                              actualizarPlan(plan.id, 'nombre', e.target.value)
                            }
                            placeholder="Ej: Básico, Estándar, Premium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`plan-precio-${plan.id}`}>Precio</Label>
                          <Input
                            id={`plan-precio-${plan.id}`}
                            type="number"
                            step="0.01"
                            value={plan.precio}
                            onChange={(e) =>
                              actualizarPlan(
                                plan.id,
                                'precio',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="$0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`plan-ciclo-${plan.id}`}>
                            Período de Tiempo
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                                type="button"
                              >
                                {getCicloPagoLabel(plan.cicloPago)}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[var(--radix-dropdown-menu-trigger-width)]"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'mensual')
                                }
                              >
                                Mensual
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'trimestral')
                                }
                              >
                                Trimestral
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'semestral')
                                }
                              >
                                Semestral
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'anual')
                                }
                              >
                                Anual
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {tipoPlanSeleccionado === 'perfiles' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Planes para Perfiles</h3>
                  <Button
                    type="button"
                    onClick={() => agregarPlan('perfiles')}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Plan
                  </Button>
                </div>

                {planesPerfiles.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        No hay planes agregados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Haz clic en "Agregar Plan" para crear tu primer plan de perfiles
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                  {planesPerfiles.map((plan, index) => (
                    <div
                      key={plan.id}
                      className="p-4 border rounded-lg bg-card space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Plan {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarPlan(plan.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`plan-nombre-${plan.id}`}>
                            Nombre del Plan
                          </Label>
                          <Input
                            id={`plan-nombre-${plan.id}`}
                            value={plan.nombre}
                            onChange={(e) =>
                              actualizarPlan(plan.id, 'nombre', e.target.value)
                            }
                            placeholder="Ej: Básico, Estándar, Premium"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`plan-precio-${plan.id}`}>Precio</Label>
                          <Input
                            id={`plan-precio-${plan.id}`}
                            type="number"
                            step="0.01"
                            value={plan.precio}
                            onChange={(e) =>
                              actualizarPlan(
                                plan.id,
                                'precio',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="$0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`plan-ciclo-${plan.id}`}>
                            Período de Tiempo
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                                type="button"
                              >
                                {getCicloPagoLabel(plan.cicloPago)}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[var(--radix-dropdown-menu-trigger-width)]"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'mensual')
                                }
                              >
                                Mensual
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'trimestral')
                                }
                              >
                                Trimestral
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'semestral')
                                }
                              >
                                Semestral
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  actualizarPlan(plan.id, 'cicloPago', 'anual')
                                }
                              >
                                Anual
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Botones Tab 2 */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Categoría'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
}
