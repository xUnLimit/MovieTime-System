'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDashboardStore } from '@/store/dashboardStore';

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
  const { recentActivity, isLoading } = useDashboardStore();
  const recentLogs = recentActivity;

  return (
    <Card className="flex flex-col py-1">
      {/* py-1 = padding vertical del Card (4px arriba + 4px abajo, igual que Ingresos por Categoría) */}
      {/* flex flex-col = layout vertical para organizar contenido */}
      <CardHeader className="pt-3 px-6 pb-2">
        {/* pt-3 = padding arriba del título (12px, igual que Ingresos por Categoría) */}
        {/* px-6 = separación del borde (24px) */}
        {/* pb-2 = espacio entre título y contenido (8px, igual que Ingresos por Categoría) */}
        <div className="space-y-0.5">
          {/* space-y-0.5 = espacio mínimo entre título y descripción (2px) */}
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
          <CardDescription className="text-sm">
            Un vistazo a las últimas acciones realizadas.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="-mt-4 pt-0 px-6 pb-2 flex-1 flex flex-col">
        {/* -mt-4 = margen negativo arriba para subir actividades (16px hacia arriba) */}
        {/* pt-0 = sin espacio arriba */}
        {/* px-6 = separación del borde (24px) */}
        {/* pb-2 = espacio abajo (8px) */}
        {/* flex-1 = ocupa todo el espacio vertical disponible */}
        {/* flex flex-col = layout en columna (actividades arriba, botón abajo) */}
        <div className="space-y-1.5 pt-0">
          {/* space-y-1.5 = espacio vertical entre elementos (6px) */}
          {isLoading ? (
            <div className="w-full space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1 pt-0.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center">No hay actividad reciente</p>
            </div>
          ) : (
            <div className="w-full space-y-1.5">
            {recentLogs.map((log) => {
              const Icon = actionIcons[log.accion as keyof typeof actionIcons] || Plus;
              const colorClass = actionColors[log.accion as keyof typeof actionColors] || 'bg-purple-500/10 text-purple-500';

              return (
                <div key={log.id} className="flex items-start gap-1.5">
                  {/* gap-1.5 = espacio entre icono y texto (6px) */}
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
        <div className="pt-6">
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
