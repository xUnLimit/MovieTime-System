'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsuarioForm } from '@/components/usuarios/UsuarioForm';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Cliente, Revendedor } from '@/types';

function EditarUsuarioPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { clientes, fetchClientes } = useClientesStore();
  const { revendedores, fetchRevendedores } = useRevendedoresStore();
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();

  const [usuario, setUsuario] = useState<Cliente | Revendedor | null>(null);
  const [tipoUsuario, setTipoUsuario] = useState<'cliente' | 'revendedor'>('cliente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClientes(), fetchRevendedores(), fetchMetodosPago()]);
      setLoading(false);
    };
    loadData();
  }, [fetchClientes, fetchRevendedores, fetchMetodosPago]);

  useEffect(() => {
    if (!loading && id) {
      // Buscar primero en clientes
      const cliente = clientes.find((c) => c.id === id);
      if (cliente) {
        setUsuario(cliente);
        setTipoUsuario('cliente');
        return;
      }

      // Buscar en revendedores
      const revendedor = revendedores.find((r) => r.id === id);
      if (revendedor) {
        setUsuario(revendedor);
        setTipoUsuario('revendedor');
        return;
      }

      // No se encontró
      setUsuario(null);
    }
  }, [id, clientes, revendedores, loading]);

  const handleSuccess = () => {
    router.push('/usuarios');
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Usuario no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/usuarios" className="hover:text-foreground transition-colors">
              Usuarios
            </Link>{' '}
            / <span className="text-foreground">Editar</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">
            No se encontró el usuario con el ID proporcionado.
          </p>
          <Link
            href="/usuarios"
            className="inline-block mt-4 text-primary hover:underline"
          >
            Volver a Usuarios
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">
              Editar {tipoUsuario === 'cliente' ? 'Cliente' : 'Revendedor'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/usuarios" className="hover:text-foreground transition-colors">
              Usuarios
            </Link>{' '}
            / <span className="text-foreground">Editar</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <UsuarioForm
          usuario={usuario}
          tipoInicial={tipoUsuario}
          metodosPago={metodosPago}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isPage={true}
        />
      </div>
    </div>
  );
}

export default function EditarUsuarioPage() {
  return (
    <ModuleErrorBoundary moduleName="Editar Usuario">
      <EditarUsuarioPageContent />
    </ModuleErrorBoundary>
  );
}



