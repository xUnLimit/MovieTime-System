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

function UsuariosPageContent() {
  const router = useRouter();
  const { totalClientes, totalRevendedores, totalNuevosHoy, totalUsuariosActivos, fetchCounts, fetchUsuarios, usuarios } = useUsuariosStore();

  const [activeTab, setActiveTab] = useState('todos');
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchMode = searchQuery.trim().length > 0;

  // Filtros según tab activo
  const filters: FilterOption[] = useMemo(() => {
    if (activeTab === 'clientes') return [{ field: 'tipo', operator: '==', value: 'cliente' }];
    if (activeTab === 'revendedores') return [{ field: 'tipo', operator: '==', value: 'revendedor' }];
    return [];
  }, [activeTab]);

  // Paginación server-side (solo cuando NO hay búsqueda activa)
  const { data: pageData, isLoading: isLoadingPage, hasMore, hasPrevious, page, next, previous, refresh } = useServerPagination<Usuario>({
    collectionName: COLLECTIONS.USUARIOS,
    filters,
    pageSize,
  });

  // Modo búsqueda: fetchAll con cache y filtrar en memoria
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  useEffect(() => {
    if (!isSearchMode) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingSearch(true);
      await fetchUsuarios();
      if (!cancelled) setIsLoadingSearch(false);
    };
    load();
    return () => { cancelled = true; };
  }, [isSearchMode, fetchUsuarios]);

  const searchResults = useMemo(() => {
    if (!isSearchMode) return [];
    const q = searchQuery.trim().toLowerCase();
    const base = activeTab === 'clientes'
      ? usuarios.filter(u => u.tipo === 'cliente')
      : activeTab === 'revendedores'
        ? usuarios.filter(u => u.tipo === 'revendedor')
        : usuarios;
    return base.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      (u.apellido ?? '').toLowerCase().includes(q) ||
      u.telefono.includes(q)
    );
  }, [isSearchMode, searchQuery, usuarios, activeTab]);

  const isLoading = isSearchMode ? isLoadingSearch : isLoadingPage;
  const displayData = isSearchMode ? searchResults : pageData;

  // Total según tab (para calcular páginas)
  const totalCurrentTab = activeTab === 'clientes' ? totalClientes : activeTab === 'revendedores' ? totalRevendedores : totalClientes + totalRevendedores;
  const totalPages = Math.ceil(totalCurrentTab / pageSize);

  const paginationProps = { page, totalPages, hasPrevious, hasMore, onPrevious: previous, onNext: next, pageSize, onPageSizeChange: (size: number) => { setPageSize(size); refresh(); } };

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Escuchar cuando se elimina una venta en la MISMA página (ej: desde UsuarioDetails)
  // La sincronización entre páginas diferentes ya la maneja useVentasPorUsuarios via shouldInvalidateCache()
  useEffect(() => {
    const handleVentaDeleted = () => {
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

      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setSearchQuery(''); }}>
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
            usuarios={displayData}
            onEdit={handleEdit}
            onView={handleView}
            title="Todos los usuarios"
            isLoading={isLoading}
            pagination={isSearchMode ? undefined : paginationProps}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesTable
            clientes={displayData}
            onEdit={handleEdit}
            onView={handleView}
            title="Clientes"
            isLoading={isLoading}
            pagination={isSearchMode ? undefined : paginationProps}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="revendedores" className="space-y-4">
          <RevendedoresTable
            revendedores={displayData}
            onEdit={handleEdit}
            onView={handleView}
            isLoading={isLoading}
            pagination={isSearchMode ? undefined : paginationProps}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
