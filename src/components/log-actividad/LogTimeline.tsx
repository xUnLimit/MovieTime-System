'use client';

import { ActivityLog } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileEdit,
  FilePlus,
  Trash2,
  RefreshCw,
  User,
  Server,
  ShoppingCart,
  Tag,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LogTimelineProps {
  logs: ActivityLog[];
}

export function LogTimeline({ logs }: LogTimelineProps) {
  const getActionIcon = (accion: ActivityLog['accion']) => {
    const icons = {
      creacion: FilePlus,
      actualizacion: FileEdit,
      eliminacion: Trash2,
      renovacion: RefreshCw,
    };
    return icons[accion];
  };

  const getEntityIcon = (entidad: ActivityLog['entidad']) => {
    const icons = {
      venta: ShoppingCart,
      cliente: User,
      revendedor: User,
      servicio: Server,
      usuario: User,
      categoria: Tag,
      metodo_pago: CreditCard,
      gasto: DollarSign,
    };
    return icons[entidad];
  };

  const getActionColor = (accion: ActivityLog['accion']) => {
    const colors = {
      creacion: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      actualizacion: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      eliminacion: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      renovacion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return colors[accion];
  };

  const getActionLabel = (accion: ActivityLog['accion']) => {
    const labels = {
      creacion: 'Creación',
      actualizacion: 'Actualización',
      eliminacion: 'Eliminación',
      renovacion: 'Renovación',
    };
    return labels[accion];
  };

  const getEntityLabel = (entidad: ActivityLog['entidad']) => {
    const labels = {
      venta: 'Venta',
      cliente: 'Cliente',
      revendedor: 'Revendedor',
      servicio: 'Servicio',
      usuario: 'Usuario',
      categoria: 'Categoría',
      metodo_pago: 'Método de Pago',
      gasto: 'Gasto',
    };
    return labels[entidad];
  };

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const ActionIcon = getActionIcon(log.accion);
        const EntityIcon = getEntityIcon(log.entidad);

        return (
          <div key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials(log.usuarioEmail)}
                </AvatarFallback>
              </Avatar>
              {index < logs.length - 1 && (
                <div className="w-px h-full bg-border mt-2" />
              )}
            </div>

            <Card className="flex-1 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <EntityIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{log.usuarioEmail}</span>
                  <Badge className={getActionColor(log.accion)}>
                    <ActionIcon className="mr-1 h-3 w-3" />
                    {getActionLabel(log.accion)}
                  </Badge>
                  <Badge variant="outline">{getEntityLabel(log.entidad)}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.timestamp), "dd MMM yyyy 'a las' HH:mm", {
                    locale: es,
                  })}
                </span>
              </div>

              <p className="text-sm mb-2">
                <span className="font-medium">{log.entidadNombre}</span>
              </p>

              {log.detalles && (
                <p className="text-sm text-muted-foreground">{log.detalles}</p>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
