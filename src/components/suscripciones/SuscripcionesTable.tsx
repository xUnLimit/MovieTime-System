'use client';

import { useState } from 'react';
import { Suscripcion } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, RefreshCw, Pause, Play, MessageCircle } from 'lucide-react';
import { useSuscripcionesStore } from '@/store/suscripcionesStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface SuscripcionesTableProps {
  suscripciones: Suscripcion[];
  onEdit: (suscripcion: Suscripcion) => void;
}

export function SuscripcionesTable({ suscripciones, onEdit }: SuscripcionesTableProps) {
  const { deleteSuscripcion, renovarSuscripcion, suspenderSuscripcion, reactivarSuscripcion } = useSuscripcionesStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suscripcionToDelete, setSuscripcionToDelete] = useState<Suscripcion | null>(null);

  const handleDelete = (suscripcion: Suscripcion) => {
    setSuscripcionToDelete(suscripcion);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (suscripcionToDelete) {
      try {
        await deleteSuscripcion(suscripcionToDelete.id);
        toast.success('Suscripción eliminada');
      } catch (error) {
        toast.error('Error al eliminar suscripción');
      }
    }
  };

  const handleRenovar = async (suscripcion: Suscripcion) => {
    try {
      await renovarSuscripcion(suscripcion.id);
      toast.success('Suscripción renovada');
    } catch (error) {
      toast.error('Error al renovar suscripción');
    }
  };

  const handleSuspender = async (suscripcion: Suscripcion) => {
    try {
      await suspenderSuscripcion(suscripcion.id);
      toast.success('Suscripción suspendida');
    } catch (error) {
      toast.error('Error al suspender suscripción');
    }
  };

  const handleActivar = async (suscripcion: Suscripcion) => {
    try {
      await reactivarSuscripcion(suscripcion.id);
      toast.success('Suscripción activada');
    } catch (error) {
      toast.error('Error al activar suscripción');
    }
  };

  const handleWhatsApp = (suscripcion: Suscripcion) => {
    const phone = suscripcion.clienteNombre || suscripcion.revendedorNombre || '';
    // TODO: Get actual phone number from cliente/revendedor
    toast.info('Función de WhatsApp pendiente de implementación');
  };

  const getEstadoBadge = (estado: Suscripcion['estado']) => {
    const variants: Record<Suscripcion['estado'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      activa: 'default',
      suspendida: 'secondary',
      inactiva: 'outline',
      vencida: 'destructive',
    };
    return <Badge variant={variants[estado]}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</Badge>;
  };

  const getDaysUntilExpiration = (suscripcion: Suscripcion) => {
    return differenceInDays(new Date(suscripcion.fechaVencimiento), new Date());
  };

  const columns: Column<Suscripcion>[] = [
    {
      key: 'cliente',
      header: 'Cliente/Revendedor',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">
            {item.tipo === 'cliente' ? item.clienteNombre : item.revendedorNombre}
          </div>
          <Badge variant="outline" className="text-xs">
            {item.tipo}
          </Badge>
        </div>
      ),
    },
    {
      key: 'servicio',
      header: 'Servicio',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.servicioNombre}</div>
          <div className="text-sm text-muted-foreground">{item.categoriaNombre}</div>
        </div>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">
            ${item.monto.toFixed(2)} {item.moneda}
          </div>
          <div className="text-sm text-muted-foreground capitalize">{item.cicloPago}</div>
        </div>
      ),
    },
    {
      key: 'consumo',
      header: 'Consumo',
      render: (item) => (
        <div className="w-32">
          <div className="flex justify-between text-sm mb-1">
            <span>{item.consumoPorcentaje}%</span>
            <span className="text-muted-foreground">${item.montoRestante.toFixed(2)}</span>
          </div>
          <Progress value={item.consumoPorcentaje} className="h-2" />
        </div>
      ),
    },
    {
      key: 'vencimiento',
      header: 'Vencimiento',
      sortable: true,
      render: (item) => {
        const days = getDaysUntilExpiration(item);
        return (
          <div>
            <div className="font-medium">
              {format(new Date(item.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
            </div>
            <div
              className={`text-sm ${
                days < 3
                  ? 'text-red-600'
                  : days < 7
                  ? 'text-yellow-600'
                  : 'text-muted-foreground'
              }`}
            >
              {days > 0 ? `${days} días` : `${Math.abs(days)} días vencido`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      render: (item) => getEstadoBadge(item.estado),
    },
    {
      key: 'renovaciones',
      header: 'Renovaciones',
      sortable: true,
      render: (item) => <Badge variant="outline">{item.renovaciones}</Badge>,
    },
  ];

  return (
    <>
      <DataTable
        data={suscripciones}
        columns={columns}
        actions={(item) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleWhatsApp(item)}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRenovar(item)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renovar
                </DropdownMenuItem>
                {item.estado === 'activa' ? (
                  <DropdownMenuItem onClick={() => handleSuspender(item)}>
                    <Pause className="mr-2 h-4 w-4" />
                    Suspender
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleActivar(item)}>
                    <Play className="mr-2 h-4 w-4" />
                    Activar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleDelete(item)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar Suscripción"
        description={`¿Estás seguro de que quieres eliminar esta suscripción? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
