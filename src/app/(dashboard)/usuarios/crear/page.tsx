'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UsuarioForm } from '@/components/usuarios/UsuarioForm';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';

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
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Crear Cliente</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link> / <Link href="/usuarios" className="hover:text-foreground transition-colors">Clientes</Link> / <span className="text-foreground">Crear</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Nuevo Usuario</h2>
          <p className="text-sm text-muted-foreground">Complete la información para registrar un nuevo usuario.</p>
        </div>

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
