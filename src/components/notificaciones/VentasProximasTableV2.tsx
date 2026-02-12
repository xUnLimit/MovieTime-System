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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bell, BellOff, Star } from 'lucide-react';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { esNotificacionVenta } from '@/types/notificaciones';
import type { NotificacionVenta } from '@/types/notificaciones';

/**
 * Get color based on priority level
 */
function getPrioridadColor(prioridad: string): string {
  switch (prioridad) {
    case 'critica':
      return 'destructive';
    case 'alta':
      return 'secondary';
    case 'media':
      return 'outline';
    case 'baja':
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Get status badge color
 */
function getEstadoColor(estado: string): string {
  return estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
}

/**
 * Format days remaining for display
 */
function formatDiasRestantes(diasRestantes: number): string {
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return `${dias} día${dias > 1 ? 's' : ''} vencida`;
  }
  if (diasRestantes === 0) return 'Vence hoy';
  return `${diasRestantes} día${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}`;
}

interface VentasProximasTableV2Props {
  onOpenAccionesDialog?: (notif: NotificacionVenta & { id: string }) => void;
}

export function VentasProximasTableV2({ onOpenAccionesDialog }: VentasProximasTableV2Props) {
  const { notificaciones, toggleLeida, toggleResaltada } = useNotificacionesStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Get venta notifications (type-safe filtering)
  const ventasNotificaciones = useMemo(() => {
    return notificaciones
      .filter(esNotificacionVenta)
      .sort((a, b) => {
        // Sort by: resaltadas first, then by priority, then by dias restantes
        if (a.resaltada !== b.resaltada) {
          return a.resaltada ? -1 : 1;
        }
        const prioridades = ['critica', 'alta', 'media', 'baja'];
        const priorA = prioridades.indexOf(a.prioridad);
        const priorB = prioridades.indexOf(b.prioridad);
        if (priorA !== priorB) {
          return priorA - priorB;
        }
        return a.diasRestantes - b.diasRestantes;
      });
  }, [notificaciones]);

  if (ventasNotificaciones.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-gray-500">No hay notificaciones de ventas</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-8"></TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="w-24">Prioridad</TableHead>
            <TableHead className="w-24 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ventasNotificaciones.map((notif) => (
            <TableRow
              key={notif.id}
              className={`hover:bg-gray-50 transition-colors ${
                notif.resaltada ? 'bg-yellow-50' : notif.leida ? 'opacity-60' : ''
              }`}
              onClick={() => setSelectedId(notif.id)}
            >
              {/* Starred indicator */}
              <TableCell className="text-center">
                {notif.resaltada && <span className="text-lg">⭐</span>}
              </TableCell>

              {/* Cliente */}
              <TableCell className="font-medium">{notif.clienteNombre}</TableCell>

              {/* Servicio */}
              <TableCell>{notif.servicioNombre}</TableCell>

              {/* Categoría */}
              <TableCell>{notif.categoriaNombre}</TableCell>

              {/* Perfil */}
              <TableCell>{notif.perfilNombre || '—'}</TableCell>

              {/* Estado */}
              <TableCell>
                <Badge className={getEstadoColor(notif.estado)}>
                  {notif.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>

              {/* Vencimiento */}
              <TableCell className="text-sm">
                <div>{notif.fechaFin.toLocaleDateString()}</div>
                <div className="text-xs text-gray-500">
                  {formatDiasRestantes(notif.diasRestantes)}
                </div>
              </TableCell>

              {/* Prioridad */}
              <TableCell>
                <Badge variant={getPrioridadColor(notif.prioridad) as any}>
                  {notif.prioridad}
                </Badge>
              </TableCell>

              {/* Acciones */}
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  {/* Toggle leida */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLeida(notif.id, !notif.leida);
                    }}
                    title={notif.leida ? 'Marcar como sin leer' : 'Marcar como leída'}
                  >
                    {notif.leida ? (
                      <BellOff className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Toggle resaltada */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleResaltada(notif.id, !notif.resaltada);
                    }}
                    title={notif.resaltada ? 'Desmarcar como importante' : 'Marcar como importante'}
                  >
                    <Star
                      className={`h-4 w-4 ${notif.resaltada ? 'fill-yellow-400 text-yellow-400' : ''}`}
                    />
                  </Button>

                  {/* Acciones específicas de venta */}
                  {onOpenAccionesDialog && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAccionesDialog(notif);
                      }}
                    >
                      Acciones
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
