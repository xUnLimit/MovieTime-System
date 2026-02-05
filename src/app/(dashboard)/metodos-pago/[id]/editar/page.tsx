'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { MetodoPagoForm } from '@/components/metodos-pago/MetodoPagoForm';

function EditarMetodoPagoPageContent() {
  const params = useParams();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  const metodoPago = useMemo(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    return metodosPago.find((m) => m.id === id) || null;
  }, [metodosPago, params.id]);

  if (!metodoPago) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/metodos-pago">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Cargando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/metodos-pago">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Editar Método de Pago</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/metodos-pago" className="hover:text-foreground transition-colors">
              Métodos de Pago
            </Link>{' '}
            / <span className="text-foreground">Editar</span>
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card border rounded-lg p-6">
        <MetodoPagoForm mode="edit" metodoPago={metodoPago} />
      </div>
    </div>
  );
}

export default function EditarMetodoPagoPage() {
  return (
    <ModuleErrorBoundary moduleName="Editar Método de Pago">
      <EditarMetodoPagoPageContent />
    </ModuleErrorBoundary>
  );
}
