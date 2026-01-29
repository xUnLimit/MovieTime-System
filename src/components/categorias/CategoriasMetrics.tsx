'use client';

import { memo, useMemo } from 'react';
import { Categoria } from '@/types';
import { MetricCard } from '@/components/shared/MetricCard';
import { FolderOpen, Users, Store } from 'lucide-react';

interface CategoriasMetricsProps {
  categorias: Categoria[];
}

export const CategoriasMetrics = memo(function CategoriasMetrics({ categorias }: CategoriasMetricsProps) {
  const metrics = useMemo(() => {
    const total = categorias.length;
    const clientes = categorias.filter(c => c.tipo === 'cliente' || c.tipo === 'ambos').length;
    const revendedores = categorias.filter(c => c.tipo === 'revendedor' || c.tipo === 'ambos').length;

    return { total, clientes, revendedores };
  }, [categorias]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <MetricCard
        title="Total Categorías"
        value={metrics.total}
        icon={FolderOpen}
        iconColor="text-blue-500"
        underlineColor="bg-blue-500"
      />
      <MetricCard
        title="Categorías de Clientes"
        value={metrics.clientes}
        icon={Users}
        iconColor="text-purple-500"
        underlineColor="bg-purple-500"
      />
      <MetricCard
        title="Categorías de Revendedores"
        value={metrics.revendedores}
        icon={Store}
        iconColor="text-orange-500"
        underlineColor="bg-orange-500"
      />
    </div>
  );
});
