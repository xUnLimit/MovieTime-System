'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { TodasCategoriasTable } from '@/components/categorias/TodasCategoriasTable';
import { ClientesCategoriasTable } from '@/components/categorias/ClientesCategoriasTable';
import { RevendedoresCategoriasTable } from '@/components/categorias/RevendedoresCategoriasTable';
import { CategoriaDialog } from '@/components/categorias/CategoriaDialog';
import { CategoriasMetrics } from '@/components/categorias/CategoriasMetrics';
import { useCategoriasStore } from '@/store/categoriasStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Categoria } from '@/types';

function CategoriasPageContent() {
  const { categorias, fetchCategorias } = useCategoriasStore();
  const [activeTab, setActiveTab] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const handleCreate = useCallback(() => {
    setSelectedCategoria(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Categorías</span>
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <CategoriasMetrics categorias={categorias} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="revendedores">Revendedores</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <TodasCategoriasTable
            categorias={categorias}
            onEdit={handleEdit}
            title="Todas las categorías"
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesCategoriasTable
            categorias={categorias}
            onEdit={handleEdit}
            title="Categorías de Clientes"
          />
        </TabsContent>

        <TabsContent value="revendedores" className="space-y-4">
          <RevendedoresCategoriasTable
            categorias={categorias}
            onEdit={handleEdit}
            title="Categorías de Revendedores"
          />
        </TabsContent>
      </Tabs>

      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoria={selectedCategoria}
      />
    </div>
  );
}

export default function CategoriasPage() {
  return (
    <ModuleErrorBoundary moduleName="Categorías">
      <CategoriasPageContent />
    </ModuleErrorBoundary>
  );
}
