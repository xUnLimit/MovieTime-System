'use client';

import { Usuario } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import { User, MessageCircle, Monitor, Calendar, Clock, MoreHorizontal, RefreshCw, Copy } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useServiciosStore } from '@/store/serviciosStore';
import { useCategoriasStore } from '@/store/categoriasStore';
import { useVentasUsuario } from '@/hooks/use-ventas-usuario';
import { getCurrencySymbol } from '@/lib/constants';

interface UsuarioDetailsProps {
  usuario: Usuario;
}

export function UsuarioDetails({ usuario }: UsuarioDetailsProps) {
  const isRevendedor = usuario.tipo === 'revendedor';
  const { servicios, fetchServicios } = useServiciosStore();
  const { categorias, fetchCategorias } = useCategoriasStore();
  const { ventas: ventasUsuario, renovacionesByServicio, deleteVenta } = useVentasUsuario(usuario.id);

  // Confirmación de eliminación
  const [deleteTarget, setDeleteTarget] = useState<{ ventaId: string; servicioId?: string; perfilNumero?: number | null } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleWhatsApp = () => {
    const phone = usuario.telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleDeleteVenta = (ventaId: string, servicioId?: string, perfilNumero?: number | null) => {
    setDeleteTarget({ ventaId, servicioId, perfilNumero });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteVenta = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVenta(deleteTarget.ventaId, deleteTarget.servicioId, deleteTarget.perfilNumero);
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error eliminando venta:', error);
    }
  };

  useEffect(() => {
    fetchServicios();
    fetchCategorias();
  }, [fetchServicios, fetchCategorias]);

  const getCicloPagoLabel = (ciclo?: string) => {
    const labels: Record<string, string> = {
      mensual: 'Mensual',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual',
    };
    return ciclo ? labels[ciclo] || ciclo : '—';
  };


  const rows = useMemo(() => {
    const now = new Date();
    return ventasUsuario.map((venta) => {
      const servicio  = servicios.find((s) => s.id === venta.servicioId);
      const categoria = categorias.find((c) => c.id === venta.categoriaId);

      const totalDias     = venta.fechaInicio && venta.fechaFin ? Math.max(differenceInCalendarDays(venta.fechaFin, venta.fechaInicio), 0) : 0;
      const diasRestantes = venta.fechaFin ? Math.max(differenceInCalendarDays(venta.fechaFin, now), 0) : 0;
      const ratioRestante = totalDias > 0 ? Math.min(diasRestantes / totalDias, 1) : 0;
      const montoSinConsumir = totalDias > 0 ? Math.max(venta.precioFinal * ratioRestante, 0) : 0;

      return {
        id:              venta.id,
        categoriaNombre: categoria?.nombre || 'Sin categoría',
        servicioNombre:  servicio?.nombre  || venta.servicioNombre,
        servicioId:      venta.servicioId,
        correo:          venta.servicioCorreo !== '—' ? venta.servicioCorreo : (servicio?.correo || '—'),
        contrasena:      servicio?.contrasena || '—',
        cicloPago:       getCicloPagoLabel(venta.cicloPago),
        fechaInicio:     venta.fechaInicio,
        fechaFin:        venta.fechaFin,
        montoSinConsumir,
        renovaciones:    renovacionesByServicio[venta.servicioId] ?? 0,
        diasRestantes,
        estado:          venta.estado === 'inactivo' ? 'Inactiva' : 'Activa',
        moneda:          venta.moneda,
        perfilNumero:    venta.perfilNumero,
      };
    });
  }, [ventasUsuario, servicios, categorias, renovacionesByServicio]);

  return (
    <div className="space-y-6">

        {/* Layout de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Columna izquierda: Avatar y perfil */}
          <Card className="p-8">
            <div className="flex flex-col items-center space-y-6">
              {/* Avatar */}
              <div className="w-40 h-40 rounded-full bg-sidebar flex items-center justify-center">
                <User className="w-20 h-20 text-sidebar-foreground" />
              </div>

              {/* Nombre y tipo */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  {usuario.nombre} {usuario.apellido}
                </h2>
                <Badge
                  variant="outline"
                  className="text-sm"
                >
                  {isRevendedor ? 'Revendedor' : 'Cliente'}
                </Badge>
              </div>

              {/* Botón de WhatsApp */}
              <Button
                onClick={handleWhatsApp}
                className="w-full bg-green-700 hover:bg-green-800 text-white"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contactar por WhatsApp
              </Button>
            </div>
          </Card>

          {/* Columna derecha: Información */}
          <div className="space-y-6">
            {/* Información de Contacto */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold leading-none mb-3">Información de Contacto</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                  <p className="text-sm font-medium">{usuario.telefono}</p>
                </div>
                {usuario.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium">{usuario.email}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Información Adicional */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold leading-none mb-3">Información Adicional</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Método de Pago</p>
                  <p className="text-sm font-medium">{usuario.metodoPagoNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cliente desde</p>
                  <p className="text-sm font-medium">
                    {format(new Date(usuario.createdAt), "d 'de' MMMM 'del' yyyy, h:mm a", {
                      locale: es,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última actualización</p>
                  <p className="text-sm font-medium">
                    {format(new Date(usuario.updatedAt), "d 'de' MMMM 'del' yyyy, h:mm a", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                <p className="text-sm text-muted-foreground italic">No hay notas.</p>
              </div>
            </Card>
          </div>
        </div>

      {/* Servicios Asociados */}
      <Card className="p-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-none">Servicios Asociados</h3>
          <p className="text-sm text-muted-foreground leading-none">
            Lista de servicios y perfiles que este usuario tiene o ha tenido.
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="mt-4 text-center py-8 text-muted-foreground">
            <p>No hay servicios asociados a este usuario.</p>
          </div>
        ) : (
          <div className="mt-4 rounded-md border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Categoría</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-center text-muted-foreground">Contraseña</TableHead>
                  <TableHead className="text-center text-muted-foreground">Ciclo de Pago</TableHead>
                  <TableHead className="text-center text-muted-foreground">Fecha de Inicio</TableHead>
                  <TableHead className="text-center text-muted-foreground">Fecha de Expiración</TableHead>
                  <TableHead className="text-center text-muted-foreground">Monto Sin Consumir</TableHead>
                  <TableHead className="text-center text-muted-foreground">Renovaciones</TableHead>
                  <TableHead className="text-center text-muted-foreground">Días Restantes</TableHead>
                  <TableHead className="text-center text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-center text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium">{row.categoriaNombre}</p>
                          <p className="text-xs text-muted-foreground">{row.servicioNombre}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        <span className="font-medium">{row.correo}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(row.correo)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex w-full items-center justify-center gap-2">
                        <span className="font-medium">{row.contrasena}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(row.contrasena)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{row.cicloPago}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {row.fechaInicio ? format(row.fechaInicio, "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {row.fechaFin ? format(row.fechaFin, "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className="text-green-500">{getCurrencySymbol(row.moneda)}</span>
                      <span className="text-foreground"> {row.montoSinConsumir.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center gap-1 font-medium">
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.renovaciones}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400 hover:bg-green-600/30">
                        {row.diasRestantes} días restantes
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={row.estado === 'Activa' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                        {row.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteVenta(row.id, row.servicioId, row.perfilNumero)}
                          >
                            Eliminar venta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDeleteVenta}
        title="Eliminar Venta"
        description="¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };
