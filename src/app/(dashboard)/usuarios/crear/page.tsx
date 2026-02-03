'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UsuarioForm } from '@/components/usuarios/UsuarioForm';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CrearUsuarioPageContent() {
  const router = useRouter();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  const handleSuccess = () => {
    router.push('/usuarios');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/usuarios">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Usuario</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link> / <Link href="/usuarios" className="hover:text-foreground transition-colors">Clientes</Link> / <span className="text-foreground">Crear</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <UsuarioForm
          tipoInicial="cliente"
          metodosPago={metodosPago}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isPage={true}
        />
      </div>
    </div>
  );
}

export default function CrearUsuarioPage() {
  return (
    <ModuleErrorBoundary moduleName="Crear Usuario">
      <CrearUsuarioPageContent />
    </ModuleErrorBoundary>
  );
}
