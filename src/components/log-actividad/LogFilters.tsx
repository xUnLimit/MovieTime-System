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

interface LogFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  accionFilter: string;
  setAccionFilter: (value: string) => void;
  entidadFilter: string;
  setEntidadFilter: (value: string) => void;
  usuarioFilter: string;
  setUsuarioFilter: (value: string) => void;
}

export function LogFilters({
  searchTerm,
  setSearchTerm,
  accionFilter,
  setAccionFilter,
  entidadFilter,
  setEntidadFilter,
  usuarioFilter,
  setUsuarioFilter,
}: LogFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en actividad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={accionFilter} onValueChange={setAccionFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Acción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las acciones</SelectItem>
          <SelectItem value="creacion">Creación</SelectItem>
          <SelectItem value="actualizacion">Actualización</SelectItem>
          <SelectItem value="eliminacion">Eliminación</SelectItem>
          <SelectItem value="renovacion">Renovación</SelectItem>
        </SelectContent>
      </Select>

      <Select value={entidadFilter} onValueChange={setEntidadFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las entidades</SelectItem>
          <SelectItem value="venta">Venta</SelectItem>
          <SelectItem value="cliente">Cliente</SelectItem>
          <SelectItem value="revendedor">Revendedor</SelectItem>
          <SelectItem value="servicio">Servicio</SelectItem>
          <SelectItem value="usuario">Usuario</SelectItem>
          <SelectItem value="categoria">Categoría</SelectItem>
          <SelectItem value="metodo_pago">Método de Pago</SelectItem>
          <SelectItem value="gasto">Gasto</SelectItem>
        </SelectContent>
      </Select>

      <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Usuario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los usuarios</SelectItem>
          {/* TODO: Populate with actual users */}
        </SelectContent>
      </Select>
    </div>
  );
}
