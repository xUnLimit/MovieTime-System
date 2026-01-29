'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { UsuariosMetodosPagoTable } from '@/components/metodos-pago/UsuariosMetodosPagoTable';
import { ServiciosMetodosPagoTable } from '@/components/metodos-pago/ServiciosMetodosPagoTable';
import { MetodoPagoDialog } from '@/components/metodos-pago/MetodoPagoDialog';
import { MetodosPagoMetrics } from '@/components/metodos-pago/MetodosPagoMetrics';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { MetodoPago } from '@/types';

function MetodosPagoPageContent() {
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMetodo, setSelectedMetodo] = useState<MetodoPago | null>(null);

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  const handleCreate = useCallback(() => {
    setSelectedMetodo(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((metodo: MetodoPago) => {
    setSelectedMetodo(metodo);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pago</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Métodos de Pago</span>
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Método
        </Button>
      </div>

      <MetodosPagoMetrics metodosPago={metodosPago} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <UsuariosMetodosPagoTable
            metodosPago={metodosPago}
            onEdit={handleEdit}
            title="Métodos de pago de Usuarios"
          />
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <ServiciosMetodosPagoTable
            metodosPago={metodosPago}
            onEdit={handleEdit}
            title="Métodos de pago de Servicios"
          />
        </TabsContent>
      </Tabs>

      <MetodoPagoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metodoPago={selectedMetodo}
      />
    </div>
  );
}

export default function MetodosPagoPage() {
  return (
    <ModuleErrorBoundary moduleName="Métodos de Pago">
      <MetodosPagoPageContent />
    </ModuleErrorBoundary>
  );
}
