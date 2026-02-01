'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { MetodoPago } from '@/types';
import { MetodoPagoEditForm } from '@/components/metodos-pago/MetodoPagoEditForm';

function EditarMetodoPagoPageContent() {
  const params = useParams();
  const router = useRouter();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (metodosPago.length > 0 && id) {
      const found = metodosPago.find((m) => m.id === id);
      setMetodoPago(found || null);
    }
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
        <MetodoPagoEditForm metodoPago={metodoPago} />
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
