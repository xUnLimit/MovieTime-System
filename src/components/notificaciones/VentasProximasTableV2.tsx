'use client';

/**
 * VentasProximasTableV2 - Sistema de Notificaciones v2.1
 *
 * Implementación completa con:
 * - Sistema de íconos interactivos (🔔/🔕/⚠️)
 * - Toggle leída con click en ícono
 * - Badge resaltado naranja
 * - Modal de acciones dual
 * - Auto-eliminación al renovar
 */

import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Bell, BellOff, AlertTriangle, MoreHorizontal, Eye, MessageCircle, X, RefreshCw, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { AccionesVentaDialog } from './AccionesVentaDialog';
import { queryDocuments, COLLECTIONS, getById, adjustServiciosActivos } from '@/lib/firebase/firestore';
import { VentaDoc, MetodoPago, Usuario } from '@/types';
import { Plan } from '@/types/categorias';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useVentasStore } from '@/store/ventasStore';
import { useServiciosStore } from '@/store/serviciosStore';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { useTemplatesStore } from '@/store/templatesStore';
import { openWhatsApp, generarMensajeVenta } from '@/lib/utils/whatsapp';
import { crearPagoRenovacion } from '@/lib/services/pagosVentaService';

interface VentaProximaRow {
  id: string;
  clienteId: string;
  clienteNombre: string;
  categoriaNombre: string;
  fechaInicio: string;
  fechaVencimiento: string;
  monto: number;
  diasRestantes: number;
  estado: string;
}

export const VentasProximasTableV2 = memo(function VentasProximasTableV2() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [ventas, setVentas] = useState<VentaDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [accionesDialogOpen, setAccionesDialogOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<VentaDoc | null>(null);

  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [categoriaPlanes, setCategoriaPlanes] = useState<Plan[]>([]);
  const [selectedClienteSoloNombre, setSelectedClienteSoloNombre] = useState<string>('');

  const { updateVenta } = useVentasStore();
  const { updatePerfilOcupado } = useServiciosStore();
  const {
    notificaciones,
    fetchNotificaciones,
    toggleLeida,
    toggleResaltada,
    deleteNotificacionesPorEntidad
  } = useNotificacionesStore();
  const { fetchTemplates, getTemplateByTipo } = useTemplatesStore();

  // Cargar datos
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        await fetchTemplates();
        await fetchNotificaciones(true);

        const ventasBase = await queryDocuments<VentaDoc>(
          COLLECTIONS.VENTAS,
          [{ field: 'estado', operator: '==', value: 'activo' }]
        );

        const ventasConDatos = await getVentasConUltimoPago(ventasBase);
        const fechaLimite = addDays(new Date(), 7);
        const ventasFiltradas = ventasConDatos.filter(venta => {
          if (!venta.fechaFin) return false;
          const fechaFin = new Date(venta.fechaFin);
          return fechaFin <= fechaLimite;
        });

        setVentas(ventasFiltradas);
      } catch (error) {
        console.error('Error cargando ventas:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchTemplates, fetchNotificaciones]);

  // Helper: Obtener notificación de una venta
  /**
   * Obtener notificación asociada a una venta.
   * Si no existe, infiere prioridad por días restantes.
   */
  const getNotificacion = (ventaId: string) => {
    const notif = notificaciones.find(n => n.ventaId === ventaId);
    if (!notif) {
      // Si no existe notificación, inferir prioridad por días restantes
      const venta = ventas.find(v => v.id === ventaId);
      const diasRestantes = venta?.fechaFin
        ? Math.ceil((new Date(venta.fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      const prioridad = diasRestantes < 0 ? 'critica'
        : diasRestantes <= 3 ? 'critica'
        : diasRestantes <= 7 ? 'alta'
        : 'media';

      return { prioridad, leida: false, resaltada: false };
    }
    return { prioridad: notif.prioridad, leida: notif.leida, resaltada: notif.resaltada };
  };

  // ✅ Handler: Toggle leída (click en ícono)
  const handleToggleLeida = async (ventaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notif = notificaciones.find(n => n.ventaId === ventaId);
    if (notif) {
      await toggleLeida(notif.id);
    } else {
      toast.info('Ejecuta la sincronización de notificaciones primero');
    }
  };

  // ✅ Handler: Abrir modal de acciones
  const handleAbrirModal = (venta: VentaDoc) => {
    setSelectedVenta(venta);
    setAccionesDialogOpen(true);
  };

  // ✅ Handler: Cortar venta
  const handleCortar = async () => {
    if (!selectedVenta) return;

    try {
      // 1. Cambiar estado a inactivo
      await updateVenta(selectedVenta.id, {
        estado: 'inactivo'
      });

      // 2. Liberar perfil
      if (selectedVenta.servicioId) {
        await updatePerfilOcupado(selectedVenta.servicioId, false);
      }

      // 3. Decrementar contador del cliente
      if (selectedVenta.clienteId) {
        await adjustServiciosActivos(selectedVenta.clienteId, -1);
      }

      // 4. Eliminar notificaciones
      await deleteNotificacionesPorEntidad(selectedVenta.id, undefined);

      toast.success('Venta cortada exitosamente');

      // Recargar
      const ventasBase = await queryDocuments<VentaDoc>(
        COLLECTIONS.VENTAS,
        [{ field: 'estado', operator: '==', value: 'activo' }]
      );
      const ventasConDatos = await getVentasConUltimoPago(ventasBase);
      const fechaLimite = addDays(new Date(), 7);
      const ventasFiltradas = ventasConDatos.filter(venta => {
        if (!venta.fechaFin) return false;
        const fechaFin = new Date(venta.fechaFin);
        return fechaFin <= fechaLimite;
      });
      setVentas(ventasFiltradas);
    } catch (error) {
      console.error('Error cortando venta:', error);
      toast.error('Error al cortar la venta');
    }
  };

  // ✅ Handler: Resaltar venta
  const handleResaltar = async () => {
    if (!selectedVenta) return;

    try {
      const notif = notificaciones.find(n => n.ventaId === selectedVenta.id);
      if (notif) {
        await toggleResaltada(notif.id);
        toast.success('Venta resaltada para seguimiento');
      } else {
        toast.info('Ejecuta la sincronización de notificaciones primero');
      }
    } catch (error) {
      console.error('Error resaltando venta:', error);
      toast.error('Error al resaltar la venta');
    }
  };

  // Handlers existentes
  const handleNotificar = async (venta: VentaDoc, diasRestantes: number) => {
    const template = diasRestantes === 0
      ? getTemplateByTipo('dia_pago')
      : getTemplateByTipo('notificacion_regular');

    if (!template) {
      toast.error('Template de notificación no encontrado');
      return;
    }

    if (!venta.clienteId) {
      toast.error('Cliente no encontrado');
      return;
    }

    try {
      const cliente = await getById<Usuario>(COLLECTIONS.USUARIOS, venta.clienteId);
      if (!cliente || !cliente.telefono) {
        toast.error('Teléfono del cliente no encontrado');
        return;
      }

      const mensaje = generarMensajeVenta(template.contenido, {
        clienteNombre: venta.clienteNombre,
        clienteSoloNombre: cliente.nombre,
        servicioNombre: venta.servicioNombre,
        categoriaNombre: venta.categoriaNombre || '',
        perfilNombre: venta.perfilNombre,
        correo: venta.servicioCorreo || '',
        contrasena: venta.servicioContrasena || '',
        fechaVencimiento: venta.fechaFin ? new Date(venta.fechaFin) : new Date(),
        monto: venta.precioFinal || 0,
        diasRetraso: diasRestantes < 0 ? Math.abs(diasRestantes) : undefined,
      });

      openWhatsApp(cliente.telefono, mensaje);
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      toast.error('Error obteniendo datos del cliente');
    }
  };

  const loadMetodosPagoYPlanes = async (venta: VentaDoc) => {
    if (metodosPago.length > 0 && categoriaPlanes.length > 0) return;
    try {
      if (metodosPago.length === 0) {
        const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
          { field: 'asociadoA', operator: '==', value: 'usuario' }
        ]);
        setMetodosPago(Array.isArray(methods) ? methods : []);
      }

      if (categoriaPlanes.length === 0 && venta?.categoriaId) {
        const categoriaDoc = await getById<Record<string, unknown>>(COLLECTIONS.CATEGORIAS, venta.categoriaId);
        if (categoriaDoc && Array.isArray(categoriaDoc.planes)) {
          setCategoriaPlanes(categoriaDoc.planes as Plan[]);
        }
      }
    } catch (error) {
      console.error('Error cargando métodos de pago y planes:', error);
      setMetodosPago([]);
      setCategoriaPlanes([]);
    }
  };

  const handleRenovar = async (venta: VentaDoc) => {
    setSelectedVenta(venta);
    await loadMetodosPagoYPlanes(venta);

    if (venta.clienteId) {
      try {
        const cliente = await getById<Usuario>(COLLECTIONS.USUARIOS, venta.clienteId);
        if (cliente) {
          setSelectedClienteSoloNombre(cliente.nombre);
        }
      } catch (error) {
        console.error('Error obteniendo cliente:', error);
      }
    }

    setRenovarDialogOpen(true);
  };

  const handleConfirmRenovar = async (formData: Record<string, unknown>) => {
    if (!selectedVenta) return;

    try {
      const precioFinal = (formData.costo as number) * (1 - ((formData.descuento as number) || 0) / 100);
      const metodoPago = metodosPago.find(mp => mp.id === formData.metodoPagoId);
      const metodoPagoNombre = metodoPago?.nombre || '';

      await crearPagoRenovacion(
        selectedVenta.id,
        selectedVenta.clienteId || '',
        selectedVenta.clienteNombre,
        selectedVenta.categoriaId || '',
        precioFinal,
        metodoPagoNombre,
        formData.metodoPagoId as string,
        formData.moneda as string || 'USD',
        formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        formData.notas as string,
        formData.fechaInicio as Date,
        formData.fechaVencimiento as Date,
        formData.costo as number,
        (formData.descuento as number) || 0
      );

      await updateVenta(selectedVenta.id, {
        fechaInicio: formData.fechaInicio as Date,
        fechaFin: formData.fechaVencimiento as Date,
        cicloPago: formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        metodoPagoId: formData.metodoPagoId as string,
        metodoPagoNombre: metodoPagoNombre,
        moneda: formData.moneda as string || 'USD',
        precio: formData.costo as number,
        descuento: (formData.descuento as number) || 0,
        precioFinal,
      });

      // ✅ Eliminar notificaciones de esta venta
      await deleteNotificacionesPorEntidad(selectedVenta.id, undefined);

      toast.success('Venta renovada exitosamente');

      if (formData.notificarWhatsApp) {
        const template = getTemplateByTipo('renovacion');
        if (template && selectedVenta.clienteId) {
          try {
            const cliente = await getById<Usuario>(COLLECTIONS.USUARIOS, selectedVenta.clienteId);
            if (cliente && cliente.telefono) {
              const mensaje = generarMensajeVenta(template.contenido, {
                clienteNombre: selectedVenta.clienteNombre,
                clienteSoloNombre: cliente.nombre,
                servicioNombre: selectedVenta.servicioNombre,
                categoriaNombre: selectedVenta.categoriaNombre || '',
                perfilNombre: selectedVenta.perfilNombre,
                correo: selectedVenta.servicioCorreo || '',
                contrasena: selectedVenta.servicioContrasena || '',
                fechaVencimiento: formData.fechaVencimiento as Date,
                monto: precioFinal,
              });
              openWhatsApp(cliente.telefono, mensaje);
            }
          } catch (error) {
            console.error('Error enviando notificación WhatsApp:', error);
          }
        }
      }

      // Recargar
      const ventasBase = await queryDocuments<VentaDoc>(
        COLLECTIONS.VENTAS,
        [{ field: 'estado', operator: '==', value: 'activo' }]
      );
      const ventasConDatos = await getVentasConUltimoPago(ventasBase);
      const fechaLimite = addDays(new Date(), 7);
      const ventasFiltradas = ventasConDatos.filter(venta => {
        if (!venta.fechaFin) return false;
        const fechaFin = new Date(venta.fechaFin);
        return fechaFin <= fechaLimite;
      });
      setVentas(ventasFiltradas);
    } catch (error) {
      console.error('Error renovando venta:', error);
      toast.error('Error al renovar la venta');
    }
  };

  const rows: VentaProximaRow[] = useMemo(() => {
    return ventas.map((venta) => {
      const fechaInicio = venta.fechaInicio ? new Date(venta.fechaInicio) : new Date();
      const fechaFin = venta.fechaFin ? new Date(venta.fechaFin) : new Date();
      const diasRestantes = Math.ceil((fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        id: venta.id,
        clienteId: venta.clienteId || '',
        clienteNombre: venta.clienteNombre || 'N/A',
        categoriaNombre: venta.categoriaNombre || 'N/A',
        fechaInicio: format(fechaInicio, "d 'de' MMMM 'del' yyyy", { locale: es }),
        fechaVencimiento: format(fechaFin, "d 'de' MMMM 'del' yyyy", { locale: es }),
        monto: venta.precioFinal || 0,
        diasRestantes,
        estado: diasRestantes <= 0 ? 'vencido' : diasRestantes <= 3 ? 'critico' : 'proximoVencer',
      };
    });
  }, [ventas]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.categoriaNombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado =
        estadoFilter === 'todos' || row.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [rows, searchTerm, estadoFilter]);

  // ✅ Render: Ícono según estado
  const renderIcono = (venta: VentaDoc) => {
    const notif = getNotificacion(venta.id);

    // 🔥 PRIORIDAD MÁXIMA: Resaltada (⚠️ naranja)
    if (notif.resaltada) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 hover:scale-105"
          onClick={(e) => handleToggleLeida(venta.id, e)}
          title="Resaltada - Click para marcar como leída/no leída"
        >
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </Button>
      );
    }

    // 🔕 Leída (campana apagada, gris)
    if (notif.leida) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out bg-gray-100 dark:bg-gray-500/20 hover:bg-gray-200 dark:hover:bg-gray-500/30 hover:scale-105"
          onClick={(e) => handleToggleLeida(venta.id, e)}
          title="Leída - Click para marcar como no leída"
        >
          <BellOff className="h-5 w-5 text-gray-400" />
        </Button>
      );
    }

    // 🔔 No leída (color según prioridad)
    const colorClasses: Record<string, string> = {
      critica: 'text-red-700 dark:text-red-300',
      alta: 'text-orange-700 dark:text-orange-300',
      media: 'text-yellow-700 dark:text-yellow-300',
      baja: 'text-blue-700 dark:text-blue-300',
    };

    const bgClasses: Record<string, string> = {
      critica: 'bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30',
      alta: 'bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30',
      media: 'bg-yellow-100 dark:bg-yellow-500/20 hover:bg-yellow-200 dark:hover:bg-yellow-500/30',
      baja: 'bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30',
    };

    return (
      <Button
        variant="ghost"
        size="icon"
        className={`mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out ${bgClasses[notif.prioridad]} hover:scale-105`}
        onClick={(e) => handleToggleLeida(venta.id, e)}
        title="No leída - Click para marcar como leída"
      >
        <Bell className={`h-5 w-5 ${colorClasses[notif.prioridad]}`} />
      </Button>
    );
  };

  // ✅ Render: Badge de estado
  const renderBadgeEstado = (diasRestantes: number, ventaId: string) => {
    const notif = getNotificacion(ventaId);

    // 🔥 PRIORIDAD VISUAL: Si está resaltada, badge naranja siempre
    if (notif.resaltada) {
      const texto = diasRestantes < 0
        ? `⚠️ ${Math.abs(diasRestantes)} días vencida`
        : `⚠️ ${diasRestantes} días restantes`;

      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-500/50 dark:bg-orange-500/20 dark:text-orange-300 font-normal">
          {texto}
        </Badge>
      );
    }

    // Badge normal según días restantes
    const getEstadoColor = (dias: number) => {
      if (dias < 0 || dias <= 3) {
        return 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
      }
      return 'border-yellow-500/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
    };

    const getEstadoLabel = (dias: number) => {
      if (dias < 0) {
        return `${Math.abs(dias)} días de retraso`;
      } else if (dias === 0) {
        return 'Vence hoy';
      } else if (dias === 1) {
        return '1 día restante';
      } else {
        return `${dias} días restantes`;
      }
    };

    return (
      <Badge variant="outline" className={`font-normal ${getEstadoColor(diasRestantes)}`}>
        {getEstadoLabel(diasRestantes)}
      </Badge>
    );
  };

  const columns: Column<VentaProximaRow>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '5%',
      render: (row) => {
        const venta = ventas.find(v => v.id === row.id);
        return venta ? renderIcono(venta) : <Bell className="h-5 w-5 text-gray-400" />;
      },
    },
    {
      key: 'clienteNombre',
      header: 'Cliente',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (row) => <span className="font-medium text-white">{row.clienteNombre}</span>,
    },
    {
      key: 'categoriaNombre',
      header: 'Categoría',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (row) => <span className="text-white">{row.categoriaNombre}</span>,
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Inicio',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (row) => <span className="text-white">{row.fechaInicio}</span>,
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (row) => <span className="text-white">{row.fechaVencimiento}</span>,
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (row) => <span className="text-white">${row.monto.toFixed(2)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (row) => renderBadgeEstado(row.diasRestantes, row.id),
    },
  ];

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Ventas próximas a vencer</h2>
              <p className="text-sm text-muted-foreground">
                Listado de ventas con vencimiento próximo o ya vencidas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="proximoVencer">Próximo a vencer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={filteredRows as unknown as Record<string, unknown>[]}
            loading={isLoading}
            pagination={true}
            itemsPerPageOptions={[10, 25, 50, 100]}
            actions={(item) => {
              const row = item as unknown as VentaProximaRow;
              const venta = ventas.find(v => v.id === row.id);
              if (!venta) return null;

              const notif = getNotificacion(venta.id);
              const estaResaltada = notif?.resaltada || false;

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleNotificar(venta, row.diasRestantes)} className="text-green-500">
                      <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                      Notificar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAbrirModal(venta)}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {estaResaltada ? 'Cortar Servicio' : 'Acciones'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRenovar(venta)} className="text-purple-500">
                      <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
                      Renovar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/ventas/${venta.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/usuarios/${venta.clienteId}`)}>
                      <User className="h-4 w-4 mr-2" />
                      Ver Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }}
          />
        </div>
      </Card>

      {/* Modal de renovación */}
      {selectedVenta && (
        <PagoDialog
          context="venta"
          open={renovarDialogOpen}
          onOpenChange={setRenovarDialogOpen}
          mode="renew"
          venta={{
            clienteNombre: selectedVenta.clienteNombre || '',
            metodoPagoId: selectedVenta.metodoPagoId,
            precioFinal: selectedVenta.precioFinal || 0,
            fechaFin: selectedVenta.fechaFin || new Date(),
          }}
          metodosPago={metodosPago}
          categoriaPlanes={categoriaPlanes}
          tipoPlan="perfiles"
          onConfirm={handleConfirmRenovar}
        />
      )}

      {/* Modal de acciones v2.1 */}
      {selectedVenta && (
        <AccionesVentaDialog
          venta={selectedVenta}
          diasRestantes={selectedVenta.fechaFin ? differenceInDays(new Date(selectedVenta.fechaFin), new Date()) : 0}
          estaResaltada={getNotificacion(selectedVenta.id)?.resaltada || false}
          open={accionesDialogOpen}
          onOpenChange={setAccionesDialogOpen}
          onCortar={handleCortar}
          onResaltar={handleResaltar}
        />
      )}
    </>
  );
});
