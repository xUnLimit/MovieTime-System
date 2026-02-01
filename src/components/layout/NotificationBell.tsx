'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notificaciones, unreadCount, markAsRead, markAllAsRead } =
    useNotificacionesStore();

  const recentNotifications = notificaciones.slice(0, 5);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleViewAll = () => {
    setOpen(false);
    router.push('/notificaciones');
  };

  const handleNotificationClick = (notificationId: string) => {
    handleMarkAsRead(notificationId);
    setOpen(false);
  };

  const getPriorityColor = (prioridad: string) => {
    const colors: Record<string, string> = {
      '100_dias': 'bg-red-600',
      '11_dias': 'bg-red-500',
      '8_dias': 'bg-orange-500',
      '7_dias': 'bg-orange-400',
      '3_dias': 'bg-yellow-500',
      '2_dias': 'bg-yellow-400',
      '1_dia': 'bg-yellow-300',
      vencido: 'bg-red-700',
    };
    return colors[prioridad] || 'bg-gray-500';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            recentNotifications.map((notificacion) => (
              <div
                key={notificacion.id}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  !notificacion.leida ? 'bg-primary/5' : ''
                }`}
                onClick={() =>
                  handleNotificationClick(notificacion.id)
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-2 w-2 rounded-full mt-2 ${getPriorityColor(
                      notificacion.prioridad
                    )}`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notificacion.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notificacion.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notificacion.createdAt
                        ? formatDistanceToNow(new Date(notificacion.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })
                        : 'Fecha desconocida'}
                    </p>
                  </div>
                  {!notificacion.leida && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {recentNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleViewAll}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
