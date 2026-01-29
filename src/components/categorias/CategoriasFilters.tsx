'use client';

import { Badge } from '@/components/ui/badge';

interface CategoriasFiltersProps {
  tipoFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { value: 'todos', label: 'Todos' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'revendedor', label: 'Revendedor' },
  { value: 'ambos', label: 'Ambos' },
];

export function CategoriasFilters({
  tipoFilter,
  onFilterChange,
}: CategoriasFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Filtrar por tipo:</span>
      <div className="flex gap-2">
        {filters.map((filter) => (
          <Badge
            key={filter.value}
            variant={tipoFilter === filter.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
