'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ServicioDetailMetrics } from '@/components/servicios/ServicioDetailMetrics';
import { ServiciosCategoriaTable } from '@/components/servicios/ServiciosCategoriaTable';

export default function ServicioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const servicioId = params.id as string;

  const { servicios, fetchServicios } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, [fetchServicios, fetchCategorias]);

  const servicio = servicios.find(s => s.id === servicioId);

  if (!servicio) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Servicio no encontrado</p>
      </div>
    );
  }

  const categoria = categorias.find(c => c.id === servicio.categoriaId);
  const serviciosCategoria = servicios.filter(s => s.categoriaId === servicio.categoriaId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Servicios: {categoria?.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            {' '}/{' '}
            <Link href="/servicios" className="hover:text-foreground transition-colors">Servicios</Link>
            {' '}/{' '}
            <span className="text-foreground">{categoria?.nombre}</span>
          </p>
        </div>
        <Link href="/servicios/crear">
          <Button>
            + Nuevo Servicio
          </Button>
        </Link>
      </div>

      <ServicioDetailMetrics
        servicios={serviciosCategoria}
        categoria={categoria}
      />

      <ServiciosCategoriaTable
        servicios={serviciosCategoria}
        categoriaNombre={categoria?.nombre || ''}
      />
    </div>
  );
}
