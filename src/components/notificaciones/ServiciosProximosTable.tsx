/**
 * ServiciosProximosTable Component
 *
 * Displays servicio (streaming service) notifications with NO additional queries
 * All data is denormalized in the notification document
 *
 * Type-Safe: Uses esNotificacionServicio type guard to narrow union type
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
import {
  BellRing,
  BellOff,
  Search,
  MoreHorizontal,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Star,
  StarOff,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { esNotificacionServicio } from '@/types/notificaciones';
import type { NotificacionServicio } from '@/types/notificaciones';
import { getCurrencySymbol } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Get bell icon color based on days remaining
 */
function getBellIconColor(diasRestantes: number): {
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
} {
  if (diasRestantes <= 0) {
    return {
      bgColor: 'bg-red-100 dark:bg-red-500/20',
      hoverBgColor: 'hover:bg-red-200 dark:hover:bg-red-500/30',
      textColor: 'text-red-600 dark:text-red-400',
    };
  } else if (diasRestantes >= 1 && diasRestantes <= 7) {
    return {
      bgColor: 'bg-yellow-100 dark:bg-yellow-500/20',
      hoverBgColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-500/30',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    };
  } else {
    return {
      bgColor: 'bg-yellow-100 dark:bg-yellow-500/20',
      hoverBgColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-500/30',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    };
  }
}

/**
 * Get status badge based on days remaining and resaltada state
 */
function getEstadoBadge(
  diasRestantes: number,
  resaltada: boolean
): { variant: string; text: string } {
  const prefix = resaltada ? '⚠️ ' : '';

  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return {
      variant: resaltada
        ? 'border-orange-500/50 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
        : 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      text: `${prefix}${dias} día${dias > 1 ? 's' : ''} de retraso`,
    };
  } else if (diasRestantes === 0) {
    return {
      variant: resaltada
        ? 'border-orange-500/50 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
        : 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      text: `${prefix}Vence hoy`,
    };
  } else if (diasRestantes <= 7) {
    return {
      variant: resaltada
        ? 'border-orange-500/50 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
        : 'border-yellow-500/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
      text: `${prefix}${diasRestantes} día${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}`,
    };
  } else {
    return {
      variant: resaltada
        ? 'border-orange-500/50 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
        : 'border-green-500/50 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
      text: `${prefix}${diasRestantes} día${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}`,
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

export function ServiciosProximosTable() {
  const router = useRouter();
  const { notificaciones, toggleLeida, toggleResaltada } = useNotificacionesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Get servicio notifications (type-safe filtering)
  const serviciosNotificaciones = useMemo(() => {
    let filtered = notificaciones.filter(esNotificacionServicio);

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notif) =>
          notif.categoriaNombre.toLowerCase().includes(searchLower) ||
          notif.correo.toLowerCase().includes(searchLower)
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

  // Pagination calculations
  const totalPages = Math.ceil(serviciosNotificaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotificaciones = serviciosNotificaciones.slice(startIndex, endIndex);


  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
    } catch {
      toast.error(`Error al copiar ${label}`);
    }
  };

  const togglePasswordVisibility = (notifId: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notifId)) {
        newSet.delete(notifId);
      } else {
        newSet.add(notifId);
      }
      return newSet;
    });
  };

  /**
   * Handle Resaltar action - Toggle resaltada state
   */
  const handleResaltar = async (notif: NotificacionServicio & { id: string }) => {
    try {
      await toggleResaltada(notif.id, !notif.resaltada);
      toast.success(
        notif.resaltada
          ? 'Notificación desmarcada'
          : 'Notificación resaltada para seguimiento'
      );
    } catch {
      toast.error('Error al actualizar la notificación');
    }
  };

  /**
   * Handle Renovar - Navigate to service detail where payment can be made
   */
  const handleRenovar = (notif: NotificacionServicio & { id: string }) => {
    router.push(`/servicios/detalle/${notif.servicioId}`);
  };

  /**
   * Handle Ver Servicio - Navigate to service detail page
   */
  const handleVerServicio = (notif: NotificacionServicio & { id: string }) => {
    router.push(`/servicios/${notif.servicioId}`);
  };

  return (
    <Card className="p-4 pb-2">
      <h3 className="text-xl font-semibold">Servicios próximos a vencer</h3>
      <div className="flex items-center gap-4 -mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por categoría o email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>

        {/* Estado filter */}
        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v); setCurrentPage(1); }}>
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

      {serviciosNotificaciones.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontraron notificaciones de servicios
          </p>
        </div>
      ) : (
        <div>
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b hover:bg-muted/50">
                    <TableHead className="h-12 px-4 text-center text-muted-foreground w-[80px]">
                      Tipo
                    </TableHead>
                    <TableHead className="h-12 px-4 text-center text-muted-foreground">
                      Categoría
                    </TableHead>
                    <TableHead className="h-12 px-4 text-center text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="h-12 px-4 text-center text-muted-foreground">
                      Contraseña
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
                  {paginatedNotificaciones.map((notif) => {
                    const bellColors = getBellIconColor(notif.diasRestantes);
                    const estadoBadge = getEstadoBadge(notif.diasRestantes, notif.resaltada);

                    return (
                      <TableRow
                        key={notif.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          notif.resaltada ? 'bg-orange-50/50 dark:bg-orange-500/5' : ''
                        }`}
                      >
                        {/* Tipo - Bell/Warning icon */}
                        <TableCell className="p-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out ${
                              notif.resaltada
                                ? 'bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30'
                                : notif.leida
                                  ? 'bg-gray-100 dark:bg-gray-500/20 hover:bg-gray-200 dark:hover:bg-gray-500/30'
                                  : `${bellColors.bgColor} ${bellColors.hoverBgColor}`
                            } hover:scale-105`}
                            onClick={() => !notif.resaltada && toggleLeida(notif.id, !notif.leida)}
                            title={
                              notif.resaltada
                                ? 'Notificación resaltada (click en Acciones para gestionar)'
                                : notif.leida
                                  ? 'Marcar como sin leer'
                                  : 'Marcar como leída'
                            }
                          >
                            {notif.resaltada ? (
                              <AlertTriangle className="h-4 w-4 transition-all duration-200 ease-in-out text-orange-500" />
                            ) : notif.leida ? (
                              <BellOff className="h-4 w-4 transition-all duration-200 ease-in-out text-gray-400 dark:text-gray-500" />
                            ) : (
                              <BellRing className={`h-4 w-4 transition-all duration-200 ease-in-out ${bellColors.textColor}`} />
                            )}
                          </Button>
                        </TableCell>

                        {/* Categoría */}
                        <TableCell className="p-4 text-center">
                          {notif.categoriaNombre}
                        </TableCell>

                        {/* Email */}
                        <TableCell className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-medium truncate max-w-[200px]">
                              {notif.correo}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => copyToClipboard(notif.correo, 'Email')}
                              title="Copiar email"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Contraseña */}
                        <TableCell className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-medium">
                              {visiblePasswords.has(notif.id) ? notif.contrasena : '••••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => togglePasswordVisibility(notif.id)}
                              title={visiblePasswords.has(notif.id) ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                              {visiblePasswords.has(notif.id) ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => copyToClipboard(notif.contrasena, 'Contraseña')}
                              title="Copiar contraseña"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Fecha de Vencimiento */}
                        <TableCell className="p-4 text-center">
                          {formatearFecha(new Date(notif.fechaVencimiento))}
                        </TableCell>

                        {/* Monto */}
                        <TableCell className="p-4 text-center">
                          {getCurrencySymbol(notif.moneda)}{notif.costoServicio.toFixed(2)}
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
                              <DropdownMenuItem onClick={() => handleRenovar(notif)}>
                                <RefreshCw className="h-4 w-4 mr-2 text-purple-600" />
                                <span className="text-purple-600">Renovar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResaltar(notif)}>
                                {notif.resaltada ? (
                                  <>
                                    <StarOff className="h-4 w-4 mr-2 text-orange-600" />
                                    <span className="text-orange-600">Desmarcar</span>
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-4 w-4 mr-2 text-orange-600" />
                                    <span className="text-orange-600">Resaltar</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerServicio(notif)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver Servicio
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-[70px] px-2 justify-between">
                    {itemsPerPage}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {[10, 25, 50, 100].map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => handleItemsPerPageChange(size.toString())}
                      className={itemsPerPage === size ? 'bg-accent' : ''}
                    >
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
