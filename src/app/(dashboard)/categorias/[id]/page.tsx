'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, ChevronDown, DollarSign } from 'lucide-react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { Categoria } from '@/types';

function VerCategoriaPageContent() {
  const params = useParams();
  const router = useRouter();
  const { categorias, fetchCategorias, deleteCategoria } = useCategoriasStore();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (categorias.length > 0 && id) {
      const found = categorias.find((c) => c.id === id);
      setCategoria(found || null);
    }
  }, [categorias, params.id]);

  const handleDelete = async () => {
    if (categoria) {
      try {
        await deleteCategoria(categoria.id);
        toast.success('Categoría eliminada');
        router.push('/categorias');
      } catch (error) {
        toast.error('Error al eliminar categoría');
      }
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'cliente': return 'Cliente';
      case 'revendedor': return 'Revendedor';
      case 'ambos': return 'Cliente y Revendedor';
      default: return tipo;
    }
  };

  const getTipoCategoriaLabel = (tipo: string) => {
    switch (tipo) {
      case 'plataforma_streaming': return 'Plataforma De Streaming';
      case 'otros': return 'Otros';
      default: return tipo;
    }
  };

  const getCicloPagoLabel = (ciclo: string) => {
    switch (ciclo) {
      case 'mensual': return { label: 'Mensual', short: 'mes' };
      case 'trimestral': return { label: 'Trimestral', short: 'trimestre' };
      case 'semestral': return { label: 'Semestral', short: 'semestre' };
      case 'anual': return { label: 'Anual', short: 'año' };
      default: return { label: ciclo, short: ciclo };
    }
  };

  if (!categoria) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/categorias">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Categoría no encontrada</h1>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-muted-foreground">La categoría que buscas no existe.</p>
        </div>
      </div>
    );
  }

  const planesCuentaCompleta = categoria.planes?.filter(p => p.tipoPlan === 'cuenta_completa') || [];
  const planesPerfiles = categoria.planes?.filter(p => p.tipoPlan === 'perfiles') || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/categorias">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{categoria.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
              {' / '}
              <Link href="/categorias" className="hover:text-foreground transition-colors">Categorías</Link>
              {' / '}
              <span className="text-foreground">{categoria.nombre}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/categorias/${categoria.id}/editar`)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Fila superior: Información + Notas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Información de la Categoría (2/3) */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Información de la Categoría</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Datos básicos de la categoría</p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nombre:</span>
              <span className="text-sm font-medium">{categoria.nombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Asociado a:</span>
              <span className="text-sm font-medium">{getTipoLabel(categoria.tipo)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tipo de Categoría:</span>
              <Badge variant="outline" className="text-xs">{getTipoCategoriaLabel(categoria.tipoCategoria || '')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fecha de creación:</span>
              <span className="text-sm font-medium">
                {new Date(categoria.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última actualización:</span>
              <span className="text-sm font-medium">
                {new Date(categoria.updatedAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Notas (1/3) */}
        <div className="rounded-lg border bg-card p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Notas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Información adicional</p>
          </div>
          <div className="flex-1 flex items-start">
            {categoria.notas ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{categoria.notas}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No hay notas para esta categoría.</p>
            )}
          </div>
        </div>
      </div>

      {/* Planes lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Cuenta Completa */}
      {planesCuentaCompleta.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold">Cuenta Completa</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{planesCuentaCompleta.length} plan{planesCuentaCompleta.length !== 1 ? 'es' : ''} registrado{planesCuentaCompleta.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {planesCuentaCompleta.map((plan, index) => {
              const isOpen = expandedPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 overflow-hidden cursor-pointer"
                  onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{plan.nombre || `Plan ${index + 1}`}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-3 pt-0 border-t border-emerald-900/30 mt-0">
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tipo de plan</span>
                          <span className="text-xs font-medium text-emerald-400">Cuenta Completa</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Ciclo de pago</span>
                          <span className="text-xs font-medium">{getCicloPagoLabel(plan.cicloPago).label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Precio</span>
                          <span className="text-xs font-bold">${plan.precio.toFixed(2)}<span className="font-normal text-muted-foreground">/{getCicloPagoLabel(plan.cicloPago).short}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cuenta Completa
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{planesCuentaCompleta.length} de {planesCuentaCompleta.length} planes</span>
          </div>
        </div>
      )}

      {/* Planes: Perfiles */}
      {planesPerfiles.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold">Perfiles</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{planesPerfiles.length} plan{planesPerfiles.length !== 1 ? 'es' : ''} registrado{planesPerfiles.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {planesPerfiles.map((plan, index) => {
              const isOpen = expandedPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className="rounded-lg border border-blue-900/40 bg-blue-950/30 overflow-hidden cursor-pointer"
                  onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0">
                      <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{plan.nombre || `Plan ${index + 1}`}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-3 pt-0 border-t border-blue-900/30 mt-0">
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tipo de plan</span>
                          <span className="text-xs font-medium text-blue-400">Perfiles</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Ciclo de pago</span>
                          <span className="text-xs font-medium">{getCicloPagoLabel(plan.cicloPago).label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Precio</span>
                          <span className="text-xs font-bold">${plan.precio.toFixed(2)}<span className="font-normal text-muted-foreground">/{getCicloPagoLabel(plan.cicloPago).short}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Perfiles
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{planesPerfiles.length} de {planesPerfiles.length} planes</span>
          </div>
        </div>
      )}

      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Eliminar Categoría"
        description={`¿Estás seguro de que quieres eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

export default function VerCategoriaPage() {
  return (
    <ModuleErrorBoundary moduleName="Ver Categoría">
      <VerCategoriaPageContent />
    </ModuleErrorBoundary>
  );
}
