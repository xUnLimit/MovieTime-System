'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CategoriasTable } from '@/components/servicios/CategoriasTable';
import { ServiciosMetrics } from '@/components/servicios/ServiciosMetrics';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function ServiciosPageContent() {
  const { servicios, fetchServicios } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, [fetchServicios, fetchCategorias]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Servicios</span>
          </p>
        </div>
        <Link href="/servicios/crear">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        </Link>
      </div>

      <ServiciosMetrics
        servicios={servicios}
        categorias={categorias}
      />

      <CategoriasTable
        categorias={categorias}
        servicios={servicios}
        title="Todas las categorías"
      />
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <ModuleErrorBoundary moduleName="Servicios">
      <ServiciosPageContent />
    </ModuleErrorBoundary>
  );
}
