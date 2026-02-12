/**
 * VentasProximasTableV2 Component
 *
 * Displays venta (sales) notifications with NO additional queries
 * All data is denormalized in the notification document
 *
 * Type-Safe: Uses esNotificacionVenta type guard to narrow union type
 */

'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BellRing, Search, MoreHorizontal } from 'lucide-react';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { esNotificacionVenta } from '@/types/notificaciones';
import type { NotificacionVenta } from '@/types/notificaciones';

/**
 * Get bell icon color based on days remaining
 */
function getBellIconColor(diasRestantes: number): {
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
} {
  if (diasRestantes < 0) {
    // Vencida - Red
    return {
      bgColor: 'bg-red-100 dark:bg-red-500/20',
      hoverBgColor: 'hover:bg-red-200 dark:hover:bg-red-500/30',
      textColor: 'text-red-600 dark:text-red-400',
    };
  } else if (diasRestantes <= 3) {
    // Próxima - Yellow
    return {
      bgColor: 'bg-yellow-100 dark:bg-yellow-500/20',
      hoverBgColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-500/30',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    };
  } else {
    // Normal - Green
    return {
      bgColor: 'bg-green-100 dark:bg-green-500/20',
      hoverBgColor: 'hover:bg-green-200 dark:hover:bg-green-500/30',
      textColor: 'text-green-600 dark:text-green-400',
    };
  }
}

/**
 * Get status badge based on days remaining
 */
function getEstadoBadge(diasRestantes: number): {
  variant: string;
  text: string;
} {
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return {
      variant: 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      text: `${dias} día${dias > 1 ? 's' : ''} de retraso`,
    };
  } else if (diasRestantes === 0) {
    return {
      variant: 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      text: 'Vence hoy',
    };
  } else if (diasRestantes <= 7) {
    return {
      variant: 'border-yellow-500/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
      text: `${diasRestantes} día${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}`,
    };
  } else {
    return {
      variant: 'border-green-500/50 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
      text: `${diasRestantes} día${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}`,
    };
  }
}

/**
 * Format date as "d de MMMM del yyyy" in Spanish
 */
function formatearFecha(fecha: Date): string {
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();

  return `${dia} de ${mes} del ${año}`;
}

interface VentasProximasTableV2Props {
  onOpenAccionesDialog?: (notif: NotificacionVenta & { id: string }) => void;
}

export function VentasProximasTableV2({ onOpenAccionesDialog }: VentasProximasTableV2Props) {
  const { notificaciones, toggleLeida } = useNotificacionesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  // Get venta notifications (type-safe filtering)
  const ventasNotificaciones = useMemo(() => {
    let filtered = notificaciones.filter(esNotificacionVenta);

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notif) =>
          notif.clienteNombre.toLowerCase().includes(searchLower) ||
          notif.categoriaNombre.toLowerCase().includes(searchLower)
      );
    }

    // Apply estado filter
    if (estadoFilter !== 'todos') {
      if (estadoFilter === 'vencidas') {
        filtered = filtered.filter((n) => n.diasRestantes < 0);
      } else if (estadoFilter === 'proximas') {
        filtered = filtered.filter((n) => n.diasRestantes >= 0 && n.diasRestantes <= 7);
      } else if (estadoFilter === 'normales') {
        filtered = filtered.filter((n) => n.diasRestantes > 7);
      }
    }

    // Sort by: resaltadas first, then by dias restantes (ascending)
    return filtered.sort((a, b) => {
      if (a.resaltada !== b.resaltada) {
        return a.resaltada ? -1 : 1;
      }
      return a.diasRestantes - b.diasRestantes;
    });
  }, [notificaciones, searchQuery, estadoFilter]);

  return (
    <Card className="p-4 pb-2">
      <h3 className="text-xl font-semibold">Ventas próximas a vencer</h3>
      <div className="flex items-center gap-4 -mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Estado filter */}
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="vencidas">Vencidas</SelectItem>
            <SelectItem value="proximas">Próximas (≤7 días)</SelectItem>
            <SelectItem value="normales">Normales (&gt;7 días)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ventasNotificaciones.length === 0 ? (
        <div className="rounded-md border p-8 text-center mt-4">
          <p className="text-sm text-muted-foreground">
            No se encontraron notificaciones de ventas
          </p>
        </div>
      ) : (
        <div className="rounded-md border mt-4">
          <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b hover:bg-muted/50">
                      <TableHead className="h-12 px-4 text-center text-muted-foreground w-[80px]">
                        Tipo
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Cliente
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Categoría
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Fecha de Inicio
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Fecha de Vencimiento
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Monto
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="h-12 px-4 text-center text-muted-foreground">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {ventasNotificaciones.map((notif) => {
                      const bellColors = getBellIconColor(notif.diasRestantes);
                      const estadoBadge = getEstadoBadge(notif.diasRestantes);

                      return (
                        <TableRow
                          key={notif.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          {/* Tipo - Bell icon */}
                          <TableCell className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out ${bellColors.bgColor} ${bellColors.hoverBgColor} hover:scale-105`}
                              onClick={() => toggleLeida(notif.id, !notif.leida)}
                              title={notif.leida ? 'Marcar como sin leer' : 'Marcar como leída'}
                            >
                              <BellRing
                                className={`h-4 w-4 transition-all duration-200 ease-in-out ${bellColors.textColor} opacity-100`}
                              />
                            </Button>
                          </TableCell>

                          {/* Cliente */}
                          <TableCell className="p-4 text-center font-medium truncate">
                            {notif.clienteNombre}
                          </TableCell>

                          {/* Categoría */}
                          <TableCell className="p-4 text-center">
                            {notif.categoriaNombre}
                          </TableCell>

                          {/* Fecha de Inicio */}
                          <TableCell className="p-4 text-center">
                            {formatearFecha(new Date(notif.fechaInicio))}
                          </TableCell>

                          {/* Fecha de Vencimiento */}
                          <TableCell className="p-4 text-center">
                            {formatearFecha(new Date(notif.fechaFin))}
                          </TableCell>

                          {/* Monto */}
                          <TableCell className="p-4 text-center">
                            ${notif.precioFinal?.toFixed(2) || '0.00'}
                          </TableCell>

                          {/* Estado */}
                          <TableCell className="p-4 text-center">
                            <Badge
                              variant="outline"
                              className={`font-normal ${estadoBadge.variant}`}
                            >
                              {estadoBadge.text}
                            </Badge>
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (onOpenAccionesDialog) {
                                      onOpenAccionesDialog(notif);
                                    }
                                  }}
                                >
                                  Ver acciones
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleLeida(notif.id, !notif.leida)}
                                >
                                  {notif.leida ? 'Marcar sin leer' : 'Marcar leída'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
    </Card>
  );
}
