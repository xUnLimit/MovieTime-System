'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ClientesTable } from '@/components/usuarios/ClientesTable';
import { RevendedoresTable } from '@/components/usuarios/RevendedoresTable';
import { TodosUsuariosTable } from '@/components/usuarios/TodosUsuariosTable';
import { UsuariosMetrics } from '@/components/usuarios/UsuariosMetrics';
import { useUsuariosStore } from '@/store/usuariosStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { useServerPagination } from '@/hooks/useServerPagination';
import { invalidateVentasPorUsuariosCache } from '@/hooks/use-ventas-por-usuarios';
import { Usuario } from '@/types';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { FilterOption } from '@/lib/firebase/pagination';

const PAGE_SIZE = 10;

function UsuariosPageContent() {
  const router = useRouter();
  const { totalClientes, totalRevendedores, totalNuevosHoy, totalUsuariosActivos, fetchCounts } = useUsuariosStore();

  const [activeTab, setActiveTab] = useState('todos');

  // Filtros según tab activo
  const filters: FilterOption[] = useMemo(() => {
    if (activeTab === 'clientes') return [{ field: 'tipo', operator: '==', value: 'cliente' }];
    if (activeTab === 'revendedores') return [{ field: 'tipo', operator: '==', value: 'revendedor' }];
    return [];
  }, [activeTab]);

  // Paginación server-side
  const { data: pageData, isLoading, hasMore, hasPrevious, page, next, previous, refresh } = useServerPagination<Usuario>({
    collectionName: COLLECTIONS.USUARIOS,
    filters,
    pageSize: PAGE_SIZE,
  });

  // Total según tab (para calcular páginas)
  const totalCurrentTab = activeTab === 'clientes' ? totalClientes : activeTab === 'revendedores' ? totalRevendedores : totalClientes + totalRevendedores;
  const totalPages = Math.ceil(totalCurrentTab / PAGE_SIZE);

  const paginationProps = { page, totalPages, hasPrevious, hasMore, onPrevious: previous, onNext: next };

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Escuchar cuando se elimina una venta en la MISMA página (ej: desde UsuarioDetails)
  // La sincronización entre páginas diferentes ya la maneja useVentasPorUsuarios via shouldInvalidateCache()
  useEffect(() => {
    const handleVentaDeleted = () => {
      console.log('[UsuariosPage] Venta deleted in same page, invalidating cache and refreshing');
      invalidateVentasPorUsuariosCache();
      refresh();
    };

    window.addEventListener('venta-deleted', handleVentaDeleted);

    return () => {
      window.removeEventListener('venta-deleted', handleVentaDeleted);
    };
  }, [refresh]);

  const handleEdit = (usuario: Usuario) => {
    router.push(`/usuarios/editar/${usuario.id}`);
  };

  const handleView = (usuario: Usuario) => {
    router.push(`/usuarios/${usuario.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Usuarios</span>
          </p>
        </div>
        <Link href="/usuarios/crear">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </Link>
      </div>

      <UsuariosMetrics
        totalClientes={totalClientes}
        totalRevendedores={totalRevendedores}
        usuariosActivos={totalUsuariosActivos}
        totalNuevosHoy={totalNuevosHoy}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="todos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger
            value="clientes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger
            value="revendedores"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Revendedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <TodosUsuariosTable
            usuarios={pageData}
            onEdit={handleEdit}
            onView={handleView}
            title="Todos los usuarios"
            isLoading={isLoading}
            pagination={paginationProps}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesTable
            clientes={pageData}
            onEdit={handleEdit}
            onView={handleView}
            title="Clientes"
            isLoading={isLoading}
            pagination={paginationProps}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="revendedores" className="space-y-4">
          <RevendedoresTable
            revendedores={pageData}
            onEdit={handleEdit}
            onView={handleView}
            isLoading={isLoading}
            pagination={paginationProps}
            onRefresh={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <ModuleErrorBoundary moduleName="Usuarios">
      <UsuariosPageContent />
    </ModuleErrorBoundary>
  );
}
