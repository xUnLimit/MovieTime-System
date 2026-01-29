'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCheck } from 'lucide-react';

interface NotificacionesFiltersProps {
  tipoFilter: string;
  setTipoFilter: (value: string) => void;
  prioridadFilter: string;
  setPrioridadFilter: (value: string) => void;
  estadoFilter: string;
  setEstadoFilter: (value: string) => void;
  onMarkAllRead: () => void;
}

export function NotificacionesFilters({
  tipoFilter,
  setTipoFilter,
  prioridadFilter,
  setPrioridadFilter,
  estadoFilter,
  setEstadoFilter,
  onMarkAllRead,
}: NotificacionesFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select value={tipoFilter} onValueChange={setTipoFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="suscripcion_vencimiento">Suscripción Vencimiento</SelectItem>
          <SelectItem value="pago_servicio">Pago Servicio</SelectItem>
          <SelectItem value="sistema">Sistema</SelectItem>
        </SelectContent>
      </Select>

      <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="baja">Baja</SelectItem>
          <SelectItem value="media">Media</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="critica">Crítica</SelectItem>
        </SelectContent>
      </Select>

      <Select value={estadoFilter} onValueChange={setEstadoFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="leida">Leídas</SelectItem>
          <SelectItem value="no_leida">No Leídas</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onMarkAllRead} className="ml-auto">
        <CheckCheck className="mr-2 h-4 w-4" />
        Marcar todas como leídas
      </Button>
    </div>
  );
}
