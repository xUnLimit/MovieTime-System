'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ClientesTable } from '@/components/usuarios/ClientesTable';
import { RevendedoresTable } from '@/components/usuarios/RevendedoresTable';
import { TodosUsuariosTable } from '@/components/usuarios/TodosUsuariosTable';
import { ClienteDialog } from '@/components/usuarios/ClienteDialog';
import { RevendedorDialog } from '@/components/usuarios/RevendedorDialog';
import { UsuariosMetrics } from '@/components/usuarios/UsuariosMetrics';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Cliente, Revendedor } from '@/types';

function UsuariosPageContent() {
  const { clientes, fetchClientes } = useClientesStore();
  const { revendedores, fetchRevendedores } = useRevendedoresStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  const [activeTab, setActiveTab] = useState('todos');
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [revendedorDialogOpen, setRevendedorDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedRevendedor, setSelectedRevendedor] = useState<Revendedor | null>(null);

  useEffect(() => {
    fetchClientes();
    fetchRevendedores();
    fetchMetodosPago();
  }, [fetchClientes, fetchRevendedores, fetchMetodosPago]);

  const handleCreateCliente = useCallback(() => {
    setSelectedCliente(null);
    setClienteDialogOpen(true);
  }, []);

  const handleEditCliente = useCallback((cliente: Cliente) => {
    setSelectedCliente(cliente);
    setClienteDialogOpen(true);
  }, []);

  const handleCreateRevendedor = useCallback(() => {
    setSelectedRevendedor(null);
    setRevendedorDialogOpen(true);
  }, []);

  const handleEditRevendedor = useCallback((revendedor: Revendedor) => {
    setSelectedRevendedor(revendedor);
    setRevendedorDialogOpen(true);
  }, []);

  const handleNewUser = useCallback(() => {
    if (activeTab === 'revendedores') {
      handleCreateRevendedor();
    } else {
      handleCreateCliente();
    }
  }, [activeTab, handleCreateCliente, handleCreateRevendedor]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Usuarios</span>
          </p>
        </div>
        <Button onClick={handleNewUser}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <UsuariosMetrics clientes={clientes} revendedores={revendedores} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="revendedores">Revendedores</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <TodosUsuariosTable
            clientes={clientes}
            revendedores={revendedores}
            onEditCliente={handleEditCliente}
            onEditRevendedor={handleEditRevendedor}
            title="Todos los usuarios"
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesTable clientes={clientes} onEdit={handleEditCliente} title="Clientes" />
        </TabsContent>

        <TabsContent value="revendedores" className="space-y-4">
          <RevendedoresTable
            revendedores={revendedores}
            onEdit={handleEditRevendedor}
          />
        </TabsContent>
      </Tabs>

      <ClienteDialog
        open={clienteDialogOpen}
        onOpenChange={setClienteDialogOpen}
        cliente={selectedCliente}
        metodosPago={metodosPago}
      />

      <RevendedorDialog
        open={revendedorDialogOpen}
        onOpenChange={setRevendedorDialogOpen}
        revendedor={selectedRevendedor}
        metodosPago={metodosPago}
      />
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
