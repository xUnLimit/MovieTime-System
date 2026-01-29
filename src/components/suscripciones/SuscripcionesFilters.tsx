'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Categoria } from '@/types';

interface SuscripcionesFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  tipoFilter: string;
  setTipoFilter: (value: string) => void;
  categoriaFilter: string;
  setCategoriaFilter: (value: string) => void;
  estadoFilter: string;
  setEstadoFilter: (value: string) => void;
  cicloFilter: string;
  setCicloFilter: (value: string) => void;
  categorias: Categoria[];
}

export function SuscripcionesFilters({
  searchTerm,
  setSearchTerm,
  tipoFilter,
  setTipoFilter,
  categoriaFilter,
  setCategoriaFilter,
  estadoFilter,
  setEstadoFilter,
  cicloFilter,
  setCicloFilter,
  categorias,
}: SuscripcionesFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar suscripciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={tipoFilter} onValueChange={setTipoFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="cliente">Cliente</SelectItem>
          <SelectItem value="revendedor">Revendedor</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categorias.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.iconUrl && <span className="mr-2">{cat.iconUrl}</span>}
              {cat.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={estadoFilter} onValueChange={setEstadoFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="activa">Activa</SelectItem>
          <SelectItem value="suspendida">Suspendida</SelectItem>
          <SelectItem value="inactiva">Inactiva</SelectItem>
          <SelectItem value="vencida">Vencida</SelectItem>
        </SelectContent>
      </Select>

      <Select value={cicloFilter} onValueChange={setCicloFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Ciclo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="mensual">Mensual</SelectItem>
          <SelectItem value="trimestral">Trimestral</SelectItem>
          <SelectItem value="anual">Anual</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
