'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Search, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface LogFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  accionFilter: string;
  setAccionFilter: (value: string) => void;
  entidadFilter: string;
  setEntidadFilter: (value: string) => void;
  usuarioFilter: string;
  setUsuarioFilter: (value: string) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onDeleteByDays: (days: number) => void;
}

export function LogFilters({
  searchTerm,
  setSearchTerm,
  accionFilter,
  setAccionFilter,
  entidadFilter,
  setEntidadFilter,
  selectedCount,
  onDeleteSelected,
  onDeleteByDays,
}: LogFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por usuario, entidad, ID o detalle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 justify-start text-left font-normal whitespace-nowrap">
            <CalendarIcon className="h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM dd, yyyy', { locale: es })} -{' '}
                  {format(dateRange.to, 'MMM dd, yyyy', { locale: es })}
                </>
              ) : (
                format(dateRange.from, 'MMM dd, yyyy', { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>

      <Select value={entidadFilter} onValueChange={setEntidadFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todas las entidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las entidades</SelectItem>
          <SelectItem value="venta">Venta</SelectItem>
          <SelectItem value="cliente">Cliente</SelectItem>
          <SelectItem value="revendedor">Revendedor</SelectItem>
          <SelectItem value="servicio">Servicio</SelectItem>
          <SelectItem value="usuario">Usuario</SelectItem>
          <SelectItem value="categoria">Categoría</SelectItem>
          <SelectItem value="metodo_pago">Pago de Venta</SelectItem>
          <SelectItem value="gasto">Gasto</SelectItem>
        </SelectContent>
      </Select>

      <Select value={accionFilter} onValueChange={setAccionFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todas las acciones" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las acciones</SelectItem>
          <SelectItem value="creacion">Creación</SelectItem>
          <SelectItem value="actualizacion">Actualización</SelectItem>
          <SelectItem value="eliminacion">Eliminación</SelectItem>
          <SelectItem value="renovacion">Renovación</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white whitespace-nowrap">
            <Trash2 className="h-4 w-4" />
            Limpiar Logs
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
          >
            Limpiar logs seleccionados ({selectedCount} en total)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteByDays(7)}>
            Eliminar Logs de +7 días
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteByDays(14)}>
            Eliminar Logs de +14 días
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteByDays(30)}>
            Eliminar Logs de +30 días
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
