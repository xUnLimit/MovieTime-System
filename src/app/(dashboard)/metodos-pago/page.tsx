'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UsuariosMetodosPagoTable } from '@/components/metodos-pago/UsuariosMetodosPagoTable';
import { ServiciosMetodosPagoTable } from '@/components/metodos-pago/ServiciosMetodosPagoTable';
import { MetodosPagoMetrics } from '@/components/metodos-pago/MetodosPagoMetrics';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { MetodoPago } from '@/types';

function MetodosPagoPageContent() {
  const router = useRouter();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const [activeTab, setActiveTab] = useState('usuarios');

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  const handleEdit = (metodo: MetodoPago) => {
    router.push(`/metodos-pago/${metodo.id}/editar`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pago</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link> / <span className="text-foreground">Métodos de Pago</span>
          </p>
        </div>
        <Link href="/metodos-pago/crear">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Método
          </Button>
        </Link>
      </div>

      <MetodosPagoMetrics />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent rounded-none p-0 h-auto inline-flex border-b border-border">
          <TabsTrigger
            value="usuarios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="servicios"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            Servicios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <UsuariosMetodosPagoTable
            metodosPago={metodosPago}
            title="Métodos de pago de Usuarios"
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <ServiciosMetodosPagoTable
            metodosPago={metodosPago}
            title="Métodos de pago de Servicios"
            onEdit={handleEdit}
          />
        </TabsContent>
      </Tabs>
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
