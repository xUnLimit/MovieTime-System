'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UsuarioDetails } from '@/components/usuarios/UsuarioDetails';
import { useClientesStore } from '@/store/clientesStore';
import { useRevendedoresStore } from '@/store/revendedoresStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Cliente, Revendedor } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

function UsuarioDetallesPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { clientes, fetchClientes, deleteCliente } = useClientesStore();
  const { revendedores, fetchRevendedores, deleteRevendedor } = useRevendedoresStore();

  const [usuario, setUsuario] = useState<Cliente | Revendedor | null>(null);
  const [tipoUsuario, setTipoUsuario] = useState<'cliente' | 'revendedor'>('cliente');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClientes(), fetchRevendedores()]);
      setLoading(false);
    };
    loadData();
  }, [fetchClientes, fetchRevendedores]);

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
            / <span className="text-foreground">Detalles</span>
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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (tipoUsuario === 'revendedor') {
        await deleteRevendedor(usuario!.id);
      } else {
        await deleteCliente(usuario!.id);
      }
      toast.success(`${tipoUsuario === 'revendedor' ? 'Revendedor' : 'Cliente'} eliminado`);
      router.push('/usuarios');
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const handleEdit = () => {
    router.push(`/usuarios/editar/${usuario!.id}`);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/usuarios">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{usuario.nombre} {usuario.apellido}</h1>
              <p className="text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
                {' / '}
                <Link href="/usuarios" className="hover:text-foreground transition-colors">Usuarios</Link>
                {' / '}
                <span className="text-foreground">{usuario.nombre} {usuario.apellido}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Eliminar
            </Button>
          </div>
        </div>

        <UsuarioDetails usuario={usuario} tipoUsuario={tipoUsuario} />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Eliminar ${tipoUsuario === 'revendedor' ? 'Revendedor' : 'Cliente'}`}
        description={`¿Estás seguro de que quieres eliminar a "${usuario.nombre} ${usuario.apellido}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}

export default function UsuarioDetallesPage() {
  return (
    <ModuleErrorBoundary moduleName="Detalles de Usuario">
      <UsuarioDetallesPageContent />
    </ModuleErrorBoundary>
  );
}
