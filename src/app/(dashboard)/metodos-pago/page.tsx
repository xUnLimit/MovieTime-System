'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useMetodosPagoStore } from '@/store/metodosPagoStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MetodosPagoTable } from '@/components/metodos-pago/MetodosPagoTable';
import { MetodoPagoDialog } from '@/components/metodos-pago/MetodoPagoDialog';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { MetodoPago } from '@/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

function MetodosPagoPageContent() {
  const { metodosPago, fetchMetodosPago } = useMetodosPagoStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState<MetodoPago | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMetodosPago();
  }, [fetchMetodosPago]);

  const handleEdit = useCallback((metodo: MetodoPago) => {
    setEditingMetodo(metodo);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingMetodo(null);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMetodo(null);
    }
  }, []);

  const filteredMetodos = useMemo(() =>
    metodosPago.filter(
      (m) =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.identificador?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [metodosPago, searchTerm]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pago</h1>
          <p className="text-muted-foreground">
            Gestiona los métodos de pago disponibles
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Método
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o identificador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <MetodosPagoTable metodosPago={filteredMetodos} onEdit={handleEdit} />

      <MetodoPagoDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        metodoPago={editingMetodo}
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
