'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { CategoriaForm } from '@/components/categorias/CategoriaForm';

function EditarCategoriaPageContent() {
  const params = useParams();
  const { categorias, fetchCategorias } = useCategoriasStore();

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const categoria = useMemo(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    return categorias.find((c) => c.id === id) || null;
  }, [categorias, params.id]);

  if (!categoria) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/categorias">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Cargando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/categorias">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Editar Categoría</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/categorias" className="hover:text-foreground transition-colors">
              Categorías
            </Link>{' '}
            / <span className="text-foreground">Editar</span>
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card border rounded-lg p-6">
        <CategoriaForm mode="edit" categoria={categoria} />
      </div>
    </div>
  );
}

export default function EditarCategoriaPage() {
  return (
    <ModuleErrorBoundary moduleName="Editar Categoría">
      <EditarCategoriaPageContent />
    </ModuleErrorBoundary>
  );
}
