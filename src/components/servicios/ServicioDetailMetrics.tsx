'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, CalendarDays, Users } from 'lucide-react';
import { Servicio } from '@/types';

interface ServicioDetailMetricsProps {
  servicios: Servicio[];
}

export function ServicioDetailMetrics({ servicios }: ServicioDetailMetricsProps) {
  const serviciosActivos = servicios.filter(s => s.activo);
  const totalPerfiles = servicios.reduce((sum, s) => sum + s.perfilesDisponibles, 0);
  const perfilesOcupados = servicios.reduce((sum, s) => sum + (s.perfilesOcupados || 0), 0);
  const perfilesDisponibles = totalPerfiles - perfilesOcupados;

  // Calcular próximos pagos (servicios con 7 días restantes o menos)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const msDia = 1000 * 60 * 60 * 24;

  const proximosPagos = servicios.filter(s => {
    if (!s.fechaVencimiento) return false;
    const fechaVenc = new Date(s.fechaVencimiento);
    fechaVenc.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / msDia);
    return diffDias >= 0 && diffDias <= 7;
  }).length;

  const metrics = [
    {
      title: 'Servicios Activos',
      value: `${serviciosActivos.length}/${servicios.length}`,
      icon: Monitor,
      color: 'text-blue-600',
    },
    {
      title: 'Próximos Pagos (7 días)',
      value: proximosPagos.toString(),
      icon: CalendarDays,
      color: 'text-yellow-600',
    },
    {
      title: 'Perfiles',
      value: `${perfilesDisponibles}/${totalPerfiles} disponibles`,
      icon: Users,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className={`h-5 w-5 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
