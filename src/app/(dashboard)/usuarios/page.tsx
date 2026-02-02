'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ClientesTable } from '@/components/usuarios/ClientesTable';
import { RevendedoresTable } from '@/components/usuarios/RevendedoresTable';
import { TodosUsuariosTable } from '@/components/usuarios/TodosUsuariosTable';
import { UsuariosMetrics } from '@/components/usuarios/UsuariosMetrics';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

function UsuariosPageContent() {
  const router = useRouter();
  const { clientes, fetchClientes } = useClientesStore();
  const { revendedores, fetchRevendedores } = useRevendedoresStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  const [activeTab, setActiveTab] = useState('todos');

  useEffect(() => {
    fetchClientes();
    fetchRevendedores();
    fetchMetodosPago();
  }, [fetchClientes, fetchRevendedores, fetchMetodosPago]);

  const handleEditCliente = (cliente: any) => {
    router.push(`/usuarios/editar/${cliente.id}`);
  };

  const handleEditRevendedor = (revendedor: any) => {
    router.push(`/usuarios/editar/${revendedor.id}`);
  };

  const handleViewCliente = (cliente: any) => {
    router.push(`/usuarios/${cliente.id}`);
  };

  const handleViewRevendedor = (revendedor: any) => {
    router.push(`/usuarios/${revendedor.id}`);
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

      <UsuariosMetrics clientes={clientes} revendedores={revendedores} />

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
            clientes={clientes}
            revendedores={revendedores}
            onEditCliente={handleEditCliente}
            onEditRevendedor={handleEditRevendedor}
            onViewCliente={handleViewCliente}
            onViewRevendedor={handleViewRevendedor}
            title="Todos los usuarios"
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesTable
            clientes={clientes}
            onEdit={handleEditCliente}
            onView={handleViewCliente}
            title="Clientes"
          />
        </TabsContent>

        <TabsContent value="revendedores" className="space-y-4">
          <RevendedoresTable
            revendedores={revendedores}
            onEdit={handleEditRevendedor}
            onView={handleViewRevendedor}
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
