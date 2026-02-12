/**
 * ServiciosProximosTableV2 Component
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
import { esNotificacionServicio } from '@/types/notificaciones';
import { formatearMoneda } from '@/lib/utils/calculations';

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

export function ServiciosProximosTableV2() {
  const { notificaciones, toggleLeida, toggleResaltada } = useNotificacionesStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Get servicio notifications (type-safe filtering)
  const serviciosNotificaciones = useMemo(() => {
    return notificaciones
      .filter(esNotificacionServicio)
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

  if (serviciosNotificaciones.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-gray-500">No hay notificaciones de servicios</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-8"></TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Método Pago</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Ciclo</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="w-24">Prioridad</TableHead>
            <TableHead className="w-24 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {serviciosNotificaciones.map((notif) => (
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

              {/* Servicio */}
              <TableCell className="font-medium">{notif.servicioNombre}</TableCell>

              {/* Categoría */}
              <TableCell>{notif.categoriaNombre}</TableCell>

              {/* Tipo */}
              <TableCell>
                <Badge variant="outline">
                  {notif.tipoServicio === 'cuenta_completa' ? 'Cuenta Completa' : 'Perfiles'}
                </Badge>
              </TableCell>

              {/* Método Pago */}
              <TableCell className="text-sm">{notif.metodoPagoNombre}</TableCell>

              {/* Costo */}
              <TableCell className="text-sm">
                {notif.costoServicio} {notif.moneda}
              </TableCell>

              {/* Ciclo Pago */}
              <TableCell className="text-sm capitalize">{notif.cicloPago}</TableCell>

              {/* Vencimiento */}
              <TableCell className="text-sm">
                <div>{notif.fechaVencimiento.toLocaleDateString()}</div>
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
