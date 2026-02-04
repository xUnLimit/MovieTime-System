'use client';

import { Notificacion } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Trash2, MessageCircle } from 'lucide-react';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificacionesListProps {
  notificaciones: Notificacion[];
}

export function NotificacionesList({ notificaciones }: NotificacionesListProps) {
  const { markAsRead, deleteNotificacion } = useNotificacionesStore();

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      toast.error('Error al marcar como leída', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificacion(id);
      toast.success('Notificación eliminada');
    } catch (error) {
      toast.error('Error al eliminar notificación', { description: error instanceof Error ? error.message : undefined });
    }
  };

  const getPrioridadColor = (prioridad: Notificacion['prioridad']) => {
    const colors = {
      baja: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      critica: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[prioridad];
  };

  const getEstadoBadge = (estado: Notificacion['estado']) => {
    const labels = {
      '100_dias': '100 días',
      '11_dias': '11 días',
      '8_dias': '8 días',
      '7_dias': '7 días',
      '3_dias': '3 días',
      '2_dias': '2 días',
      '1_dia': '1 día',
      'vencido': 'Vencido',
    };
    return labels[estado] || estado;
  };

  if (notificaciones.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No hay notificaciones</h3>
        <p className="text-muted-foreground">
          Cuando haya notificaciones, aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notificaciones.map((notificacion) => (
        <Card
          key={notificacion.id}
          className={cn(
            'p-4 transition-colors',
            !notificacion.leida && 'bg-muted/50'
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{notificacion.titulo}</h3>
                    {!notificacion.leida && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{format(new Date(notificacion.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}</span>
                    <span>•</span>
                    <Badge variant="outline">{getEstadoBadge(notificacion.estado)}</Badge>
                    <Badge className={getPrioridadColor(notificacion.prioridad)}>
                      {notificacion.prioridad}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm mb-3">{notificacion.mensaje}</p>

              {notificacion.clienteNombre && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Cliente: {notificacion.clienteNombre}</span>
                  {notificacion.diasRetraso && (
                    <>
                      <span>•</span>
                      <span className="text-red-600">
                        {notificacion.diasRetraso} días de retraso
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!notificacion.leida && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMarkAsRead(notificacion.id)}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              )}
              {notificacion.clienteNombre && (
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(notificacion.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
