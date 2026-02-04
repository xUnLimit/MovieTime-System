'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { ActivityLog } from '@/types';

const actionIcons = {
  creacion: Plus,
  actualizacion: Edit,
  eliminacion: Trash2,
};

const actionLabels = {
  creacion: 'Creó',
  actualizacion: 'Actualizó',
  eliminacion: 'Eliminó',
};

// Mapeo de acciones a colores específicos
const actionColors = {
  creacion: 'bg-green-500/10 text-green-500',
  actualizacion: 'bg-blue-500/10 text-blue-500',
  eliminacion: 'bg-red-500/10 text-red-500',
};

export function RecentActivity() {
  const logs: ActivityLog[] = [];
  const recentLogs = logs.slice(0, 6);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
          <CardDescription className="text-sm">
            Un vistazo a las últimas acciones realizadas.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-1 flex-1 flex flex-col">
        <div className="space-y-2.5 flex-1 flex items-center justify-center pt-4">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No hay actividad reciente
            </p>
          ) : (
            <div className="w-full space-y-2.5">
            {recentLogs.map((log) => {
              const Icon = actionIcons[log.accion as keyof typeof actionIcons] || Plus;
              const colorClass = actionColors[log.accion as keyof typeof actionColors] || 'bg-purple-500/10 text-purple-500';

              return (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${colorClass.split(' ')[0]}`}>
                      <Icon className={`h-3.5 w-3.5 ${colorClass.split(' ')[1]}`} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-0 min-w-0">
                    <p className="text-sm leading-tight">
                      {actionLabels[log.accion as keyof typeof actionLabels]}{' '}
                      {log.entidad.toLowerCase()} para{' '}
                      <span className="text-primary font-medium">{log.entidadNombre}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.timestamp
                        ? `hace ${formatDistanceToNow(new Date(log.timestamp), { locale: es }).replace('alrededor de ', '')}`
                        : 'Fecha desconocida'}
                    </p>
                  </div>
                </div>
              );
            })
            }
            </div>
          )}
        </div>
        <div className="pt-3 mt-auto">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/log-actividad">
              Ver todo el historial
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
