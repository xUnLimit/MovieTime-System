'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UsuarioDetails } from '@/components/usuarios/UsuarioDetails';
import { useUsuariosStore } from '@/store/usuariosStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { useState } from 'react';

function UsuarioDetallesPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { usuarios, fetchUsuarios, deleteUsuario, isLoading } = useUsuariosStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const usuario = useMemo(() => 
    usuarios.find((u) => u.id === id) ?? null,
    [usuarios, id]
  );

  if (isLoading) {
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
      await deleteUsuario(usuario!.id);
      toast.success(`${usuario?.tipo === 'revendedor' ? 'Revendedor' : 'Cliente'} eliminado`);
      router.push('/usuarios');
    } catch (error) {
      toast.error('Error al eliminar usuario', { description: error instanceof Error ? error.message : undefined });
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

        <UsuarioDetails usuario={usuario} />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Eliminar ${usuario.tipo === 'revendedor' ? 'Revendedor' : 'Cliente'}`}
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



