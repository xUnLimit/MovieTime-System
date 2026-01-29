'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useServiciosStore } from '@/store/serviciosStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Servicio } from '@/types';
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function PagosServiciosPageContent() {
  const { servicios, fetchServicios } = useServiciosStore();
  const [filter, setFilter] = useState<'todos' | 'vencidos' | 'proximos'>('todos');

  useEffect(() => {
    fetchServicios();
  }, [fetchServicios]);

  // Calculate payment metrics
  const metrics = useMemo(() => {
    const hoy = new Date();
    let totalMensual = 0;
    let serviciosConRenovacion = 0;
    let serviciosSinRenovacion = 0;
    let proximosVencer = 0;

    servicios.forEach((s) => {
      if (s.activo) {
        totalMensual += s.costoTotal;

        if (s.renovacionAutomatica) {
          serviciosConRenovacion++;

          // Check if renewal is within next 7 days
          if (s.fechaRenovacion) {
            const diasHastaRenovacion = Math.ceil(
              (new Date(s.fechaRenovacion).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diasHastaRenovacion <= 7 && diasHastaRenovacion >= 0) {
              proximosVencer++;
            }
          }
        } else {
          serviciosSinRenovacion++;
        }
      }
    });

    return {
      totalMensual,
      serviciosConRenovacion,
      serviciosSinRenovacion,
      proximosVencer,
    };
  }, [servicios]);

  // Filter services based on renewal status
  const filteredServicios = useMemo(() => {
    if (filter === 'todos') return servicios;

    const hoy = new Date();

    if (filter === 'proximos') {
      return servicios.filter((s) => {
        if (!s.activo || !s.renovacionAutomatica || !s.fechaRenovacion) return false;
        const diasHastaRenovacion = Math.ceil(
          (new Date(s.fechaRenovacion).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diasHastaRenovacion <= 7 && diasHastaRenovacion >= 0;
      });
    }

    if (filter === 'vencidos') {
      return servicios.filter((s) => {
        if (!s.activo || !s.fechaRenovacion) return false;
        return new Date(s.fechaRenovacion) < hoy;
      });
    }

    return servicios;
  }, [servicios, filter]);

  const columns: Column<Servicio>[] = [
    {
      key: 'categoriaNombre',
      header: 'Categoría',
      sortable: true,
      render: (servicio) => (
        <div className="font-medium">{servicio.categoriaNombre}</div>
      ),
    },
    {
      key: 'nombre',
      header: 'Servicio',
      sortable: true,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: true,
      render: (servicio) => (
        <Badge variant={servicio.tipo === 'familiar' ? 'default' : 'secondary'}>
          {servicio.tipo === 'familiar' ? 'Familiar' : 'Individual'}
        </Badge>
      ),
    },
    {
      key: 'costoTotal',
      header: 'Costo Mensual',
      sortable: true,
      render: (servicio) => (
        <div className="font-semibold">${servicio.costoTotal.toFixed(2)}</div>
      ),
    },
    {
      key: 'renovacionAutomatica',
      header: 'Renovación',
      render: (servicio) => (
        <div className="flex items-center gap-2">
          {servicio.renovacionAutomatica ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Automática</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-600">Manual</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'fechaRenovacion',
      header: 'Próxima Renovación',
      sortable: true,
      render: (servicio) => {
        if (!servicio.fechaRenovacion) {
          return <span className="text-muted-foreground">-</span>;
        }

        const hoy = new Date();
        const fechaRenovacion = new Date(servicio.fechaRenovacion);
        const diasHastaRenovacion = Math.ceil(
          (fechaRenovacion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
        );

        let variant: 'default' | 'secondary' | 'destructive' = 'default';
        if (diasHastaRenovacion < 0) {
          variant = 'destructive';
        } else if (diasHastaRenovacion <= 3) {
          variant = 'destructive';
        } else if (diasHastaRenovacion <= 7) {
          variant = 'secondary';
        }

        return (
          <div className="space-y-1">
            <div className="text-sm">
              {format(fechaRenovacion, 'dd MMM yyyy', { locale: es })}
            </div>
            <Badge variant={variant} className="text-xs">
              {diasHastaRenovacion < 0
                ? `Vencido hace ${Math.abs(diasHastaRenovacion)} días`
                : diasHastaRenovacion === 0
                ? 'Vence hoy'
                : `En ${diasHastaRenovacion} días`
              }
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pagos de Servicios</h1>
        <p className="text-muted-foreground">
          Gestiona los pagos y renovaciones de servicios de streaming
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total Mensual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalMensual.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              De {servicios.filter((s) => s.activo).length} servicios activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renovación Automática</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.serviciosConRenovacion}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.serviciosSinRenovacion} requieren renovación manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.proximosVencer}</div>
            <p className="text-xs text-muted-foreground">
              En los próximos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Pagos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Al día</div>
            <p className="text-xs text-muted-foreground">
              Todos los servicios activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'todos' ? 'default' : 'outline'}
          onClick={() => setFilter('todos')}
        >
          Todos ({servicios.length})
        </Button>
        <Button
          variant={filter === 'proximos' ? 'default' : 'outline'}
          onClick={() => setFilter('proximos')}
        >
          Próximos a Vencer ({metrics.proximosVencer})
        </Button>
        <Button
          variant={filter === 'vencidos' ? 'default' : 'outline'}
          onClick={() => setFilter('vencidos')}
        >
          Vencidos
        </Button>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Pagos</CardTitle>
          <CardDescription>
            Lista de todos los servicios y sus fechas de renovación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredServicios}
            columns={columns}
            emptyMessage="No hay servicios para mostrar"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PagosServiciosPage() {
  return (
    <ModuleErrorBoundary moduleName="Pagos de Servicios">
      <PagosServiciosPageContent />
    </ModuleErrorBoundary>
  );
}
