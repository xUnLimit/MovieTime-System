'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { ServiciosCategoriaMetrics } from '@/components/servicios/ServiciosCategoriaMetrics';
import { ServiciosCategoriaFilters } from '@/components/servicios/ServiciosCategoriaFilters';
import { ServiciosCategoriaTableDetalle } from '@/components/servicios/ServiciosCategoriaTableDetalle';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function ServiciosCategoriaPageContent() {
  const params = useParams();
  const router = useRouter();
  const categoriaId = params.id as string;

  const { servicios, fetchServicios } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [cicloFilter, setCicloFilter] = useState('todos');
  const [perfilFilter, setPerfilFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('activo');

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, [fetchServicios, fetchCategorias]);

  const categoria = categorias.find(c => c.id === categoriaId);

  // Filtrar servicios por categoría
  const serviciosCategoria = useMemo(() => {
    return servicios.filter(s => s.categoriaId === categoriaId);
  }, [servicios, categoriaId]);

  // Aplicar filtros adicionales
  const serviciosFiltrados = useMemo(() => {
    return serviciosCategoria.filter(servicio => {
      // Filtro de búsqueda
      const matchSearch = searchTerm === '' ||
        servicio.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.correo?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de ciclo de pago
      const matchCiclo = cicloFilter === 'todos' || servicio.cicloPago === cicloFilter;

      // Filtro de perfil
      const perfilesLibres = (servicio.perfilesDisponibles || 0) - (servicio.perfilesOcupados || 0);
      const matchPerfil = perfilFilter === 'todos' ||
        (perfilFilter === 'con_disponibles' && perfilesLibres > 0) ||
        (perfilFilter === 'sin_disponibles' && perfilesLibres <= 0);

      // Filtro de estado
      const matchEstado =
        estadoFilter === 'todos' ||
        (estadoFilter === 'activo' && servicio.activo) ||
        (estadoFilter === 'suspendido' && !servicio.activo) ||
        (estadoFilter === 'inactivo' && !servicio.activo);

      return matchSearch && matchCiclo && matchPerfil && matchEstado;
    });
  }, [serviciosCategoria, searchTerm, cicloFilter, perfilFilter, estadoFilter]);

  const handleEdit = (id: string) => {
    router.push(`/servicios/${id}/editar`);
  };

  if (!categoria) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Categoría no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/servicios')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Servicios: {categoria.nombre}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <Link href="/servicios" className="hover:text-foreground transition-colors">Servicios</Link> / <span className="text-foreground">{categoria.nombre}</span>
          </p>
        </div>
        <Link href="/servicios/crear">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        </Link>
      </div>

      <ServiciosCategoriaMetrics servicios={serviciosCategoria} />

      <ServiciosCategoriaFilters
        estadoFilter={estadoFilter}
        onEstadoChange={setEstadoFilter}
      />

      <ServiciosCategoriaTableDetalle
        servicios={serviciosFiltrados}
        onEdit={handleEdit}
        title="Todos los servicios"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cicloFilter={cicloFilter}
        onCicloChange={setCicloFilter}
        perfilFilter={perfilFilter}
        onPerfilChange={setPerfilFilter}
      />
    </div>
  );
}

export default function ServiciosCategoriaPage() {
  return (
    <ModuleErrorBoundary moduleName="Servicios">
      <ServiciosCategoriaPageContent />
    </ModuleErrorBoundary>
  );
}
