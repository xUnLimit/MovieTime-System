/**
 * ServiciosProximosTableV2 - Sistema de Notificaciones v2.1
 *
 * Esta es una extensión de ServiciosProximosTable que agrega:
 * - Sistema de íconos interactivos (🔔/🔕/⚠️)
 * - Toggle leída con click en ícono
 * - Badge resaltado con ⚠️
 * - Modal de acciones dual (Renovar/Resaltar)
 * - Auto-eliminación de notificaciones al renovar
 */

'use client';

import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Servicio } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Copy, Eye, Bell, EyeOff, RefreshCw, FileText, BellOff, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { queryDocuments, COLLECTIONS, getById } from '@/lib/firebase/firestore';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/lib/constants';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { MetodoPago, PagoServicio } from '@/types';
import { Plan } from '@/types/categorias';
import { useServiciosStore } from '@/store/serviciosStore';
import { crearPagoRenovacion, obtenerPagosDeServicio, contarRenovacionesDeServicio } from '@/lib/services/pagosServicioService';
import { useNotificacionesStore } from '@/store/notificacionesStore';
import { AccionesServicioDialog } from './AccionesServicioDialog';

interface ServicioRow {
  id: string;
  categoria: string;
  email: string;
  contrasena: string;
  fechaVencimiento: string;
  monto: number;
  moneda: string;
  diasRestantes: number;
  original: Servicio;
}

export const ServiciosProximosTableV2 = memo(function ServiciosProximosTableV2() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);

  // Estado para el modal de renovación
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [categoriaPlanes, setCategoriaPlanes] = useState<Plan[]>([]);
  const [ultimoPago, setUltimoPago] = useState<PagoServicio | null>(null);

  // Estado para el modal de acciones (renovar/resaltar)
  const [accionesDialogOpen, setAccionesDialogOpen] = useState(false);

  const { updateServicio } = useServiciosStore();
  const { notificaciones, toggleLeida, toggleResaltada, deleteNotificacionesPorEntidad } = useNotificacionesStore();

  useEffect(() => {
    // Evitar duplicación por React Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const fetchServicios = async () => {
      setIsLoading(true);
      try {
        // Fecha límite: 7 días desde hoy hacia el futuro
        const fechaLimite = addDays(new Date(), 7);

        // Query optimizado: solo servicios activos con fechaVencimiento <= fechaLimite
        const serviciosProximos = await queryDocuments<Servicio>(
          COLLECTIONS.SERVICIOS,
          [
            { field: 'activo', operator: '==', value: true },
            { field: 'fechaVencimiento', operator: '<=', value: fechaLimite }
          ]
        );

        // ✅ Filtro adicional client-side para garantizar ventana de 7 días
        const serviciosFiltrados = serviciosProximos.filter(servicio => {
          if (!servicio.fechaVencimiento) return false;
          const fechaVenc = new Date(servicio.fechaVencimiento);
          return fechaVenc <= fechaLimite;
        });

        // Ordenar por fecha de vencimiento (más próximos primero)
        serviciosFiltrados.sort((a, b) => {
          if (!a.fechaVencimiento || !b.fechaVencimiento) return 0;
          return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
        });

        setServicios(serviciosFiltrados);
      } catch (error) {
        console.error('Error cargando servicios:', error);
        toast.error('Error al cargar servicios');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServicios();
  }, []);

  const rows: ServicioRow[] = useMemo(() => {
    return servicios.map(servicio => {
      const fechaVencimiento = servicio.fechaVencimiento ? new Date(servicio.fechaVencimiento) : new Date();
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        id: servicio.id,
        categoria: servicio.categoriaNombre || servicio.nombre,
        email: servicio.correo,
        contrasena: servicio.contrasena,
        fechaVencimiento: format(fechaVencimiento, "d 'de' MMMM 'del' yyyy", { locale: es }),
        monto: servicio.costoServicio,
        moneda: servicio.moneda || 'USD',
        diasRestantes,
        original: servicio,
      };
    });
  }, [servicios]);

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = row.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (estadoFilter === 'todos') return true;
      if (estadoFilter === 'vencido') return row.diasRestantes < 0;
      if (estadoFilter === 'critico') return row.diasRestantes >= 0 && row.diasRestantes <= 3;
      if (estadoFilter === 'proximo') return row.diasRestantes > 3 && row.diasRestantes <= 30;

      return true;
    });
  }, [rows, searchTerm, estadoFilter]);

  // ============================
  // Helpers de Notificaciones v2.1
  // ============================

  /**
   * Obtener notificación asociada a un servicio
   */
  const getNotificacion = (servicioId: string) => {
    const notif = notificaciones.find(n => n.servicioId === servicioId);
    if (!notif) {
      // Si no existe notificación, inferir prioridad por días restantes
      const servicio = servicios.find(s => s.id === servicioId);
      const diasRestantes = servicio?.fechaVencimiento
        ? Math.ceil((new Date(servicio.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      const prioridad = diasRestantes < 0 ? 'critica'
        : diasRestantes <= 3 ? 'critica'
        : diasRestantes <= 7 ? 'alta'
        : 'media';

      return { prioridad, leida: false, resaltada: false };
    }
    return { prioridad: notif.prioridad, leida: notif.leida, resaltada: notif.resaltada };
  };

  /**
   * Toggle estado "leída" de una notificación
   */
  const handleToggleLeida = async (servicioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notif = notificaciones.find(n => n.servicioId === servicioId);
    if (notif) {
      await toggleLeida(notif.id);
    }
  };

  /**
   * Abrir modal de acciones (renovar/resaltar)
   */
  const handleAbrirAcciones = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setAccionesDialogOpen(true);
  };

  /**
   * Handler para renovar desde el modal de acciones
   */
  const handleRenovarDesdeAcciones = async () => {
    if (!selectedServicio) return;
    setAccionesDialogOpen(false);
    await handleRenovar(selectedServicio);
  };

  /**
   * Handler para resaltar notificación
   */
  const handleResaltar = async () => {
    if (!selectedServicio) return;
    const notif = notificaciones.find(n => n.servicioId === selectedServicio.id);
    if (notif) {
      await toggleResaltada(notif.id);
      toast.success('Notificación resaltada');
    }
    setAccionesDialogOpen(false);
  };

  /**
   * Renderizar ícono de notificación (🔔/🔕/⚠️)
   */
  const renderIcono = (servicio: Servicio) => {
    const notif = getNotificacion(servicio.id);

    // 🔥 PRIORIDAD MÁXIMA: Resaltada (⚠️ naranja)
    if (notif.resaltada) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 hover:scale-105"
          onClick={(e) => handleToggleLeida(servicio.id, e)}
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
          onClick={(e) => handleToggleLeida(servicio.id, e)}
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
        onClick={(e) => handleToggleLeida(servicio.id, e)}
        title="No leída - Click para marcar como leída"
      >
        <Bell className={`h-5 w-5 ${colorClasses[notif.prioridad]}`} />
      </Button>
    );
  };

  /**
   * Renderizar badge de estado (con resaltado naranja si está resaltada)
   */
  const renderBadgeEstado = (row: ServicioRow) => {
    const notif = getNotificacion(row.id);

    // 🔥 PRIORIDAD VISUAL: Si está resaltada, badge naranja siempre
    if (notif.resaltada) {
      const texto = row.diasRestantes < 0
        ? `⚠️ ${Math.abs(row.diasRestantes)} días vencida`
        : `⚠️ ${row.diasRestantes} días restantes`;

      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-500/50 dark:bg-orange-500/20 dark:text-orange-300 font-normal">
          {texto}
        </Badge>
      );
    }

    // Badge normal según días restantes
    const getEstadoColor = (diasRestantes: number) => {
      if (diasRestantes < 0 || diasRestantes <= 3) {
        return 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
      }
      return 'border-yellow-500/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
    };

    const getEstadoLabel = (diasRestantes: number) => {
      if (diasRestantes < 0) {
        return `${Math.abs(diasRestantes)} días de retraso`;
      } else if (diasRestantes === 0) {
        return 'Vence hoy';
      } else if (diasRestantes === 1) {
        return '1 día restante';
      } else {
        return `${diasRestantes} días restantes`;
      }
    };

    return (
      <Badge variant="outline" className={`font-normal ${getEstadoColor(row.diasRestantes)}`}>
        {getEstadoLabel(row.diasRestantes)}
      </Badge>
    );
  };

  // ============================
  // Handlers Originales
  // ============================

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const togglePasswordVisibility = (servicioId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(servicioId)) {
        newSet.delete(servicioId);
      } else {
        newSet.add(servicioId);
      }
      return newSet;
    });
  };

  const loadMetodosPagoYPlanes = async (servicio: Servicio) => {
    if (metodosPago.length > 0 && categoriaPlanes.length > 0) return;
    try {
      if (metodosPago.length === 0) {
        const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
          { field: 'asociadoA', operator: '==', value: 'servicio' }
        ]);
        setMetodosPago(Array.isArray(methods) ? methods : []);
      }

      if (categoriaPlanes.length === 0 && servicio?.categoriaId) {
        const categoriaDoc = await getById<Record<string, unknown>>(COLLECTIONS.CATEGORIAS, servicio.categoriaId);
        if (categoriaDoc && Array.isArray(categoriaDoc.planes)) {
          setCategoriaPlanes(categoriaDoc.planes as Plan[]);
        }
      }
    } catch (err) {
      console.error('Error cargando métodos de pago y planes:', err);
      setMetodosPago([]);
      setCategoriaPlanes([]);
    }
  };

  const handleRenovar = async (servicio: Servicio) => {
    setSelectedServicio(servicio);
    await loadMetodosPagoYPlanes(servicio);

    try {
      const pagos = await obtenerPagosDeServicio(servicio.id);
      if (pagos.length > 0) {
        const sortedPagos = pagos.sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        setUltimoPago(sortedPagos[0]);
      } else {
        setUltimoPago(null);
      }
    } catch (error) {
      console.error('Error obteniendo último pago:', error);
      setUltimoPago(null);
    }

    setRenovarDialogOpen(true);
  };

  const handleConfirmRenovar = async (formData: Record<string, unknown>) => {
    if (!selectedServicio) return;

    try {
      const numeroRenovacion = await contarRenovacionesDeServicio(selectedServicio.id) + 1;

      await crearPagoRenovacion(
        selectedServicio.id,
        selectedServicio.categoriaId,
        formData.costo as number,
        formData.metodoPagoId as string,
        (formData.metodoPagoNombre as string) || '',
        (formData.moneda as string) || 'USD',
        formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        formData.fechaInicio as Date,
        formData.fechaVencimiento as Date,
        numeroRenovacion,
        formData.notas as string | undefined
      );

      await updateServicio(selectedServicio.id, {
        fechaVencimiento: formData.fechaVencimiento as Date,
        cicloPago: formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        metodoPagoId: formData.metodoPagoId as string,
        costoServicio: formData.costo as number,
      });

      // ✅ Eliminar todas las notificaciones del servicio renovado
      await deleteNotificacionesPorEntidad(undefined, selectedServicio.id);

      toast.success('Servicio renovado exitosamente');

      // Recargar servicios
      const fechaLimite = addDays(new Date(), 7);
      const serviciosProximos = await queryDocuments<Servicio>(
        COLLECTIONS.SERVICIOS,
        [
          { field: 'activo', operator: '==', value: true },
          { field: 'fechaVencimiento', operator: '<=', value: fechaLimite }
        ]
      );
      serviciosProximos.sort((a, b) => {
        if (!a.fechaVencimiento || !b.fechaVencimiento) return 0;
        return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
      });
      setServicios(serviciosProximos);
      setRenovarDialogOpen(false);
    } catch (error) {
      console.error('Error renovando servicio:', error);
      toast.error('Error al renovar el servicio');
    }
  };

  // ============================
  // Columnas de la tabla
  // ============================

  const columns: Column<ServicioRow>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '5%',
      render: (item) => renderIcono(item.original),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (item) => <span className="font-medium text-white">{item.categoria}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: false,
      align: 'center',
      width: '20%',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <span className="text-white">{item.email}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleCopy(item.email, 'Email')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'contrasena',
      header: 'Contraseña',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (item) => {
        const isVisible = visiblePasswords.has(item.id);
        return (
          <div className="flex items-center justify-center gap-2">
            <span className="text-white font-medium">
              {isVisible ? item.contrasena : '•••••••••'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => togglePasswordVisibility(item.id)}
              title={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleCopy(item.contrasena, 'Contraseña')}
              title="Copiar contraseña"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      align: 'center',
      width: '18%',
      render: (item) => <span className="text-white">{item.fechaVencimiento}</span>,
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (item) => <span className="text-white">{getCurrencySymbol(item.moneda)}{item.monto.toFixed(2)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '15%',
      render: (item) => renderBadgeEstado(item),
    },
  ];

  return (
    <Card className="p-4 pb-2">
      <div className="space-y-0">
        <h3 className="text-xl font-semibold">Servicios próximos por pagar</h3>
        <p className="text-sm text-muted-foreground mb-0">Listado de servicios con vencimiento próximo o ya vencidos.</p>
      </div>

      <div className="flex items-center gap-4 -mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por categoría o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="critico">Críticos (0-3 días)</SelectItem>
            <SelectItem value="proximo">Próximos (4-30 días)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredRows as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        loading={isLoading}
        pagination={true}
        itemsPerPageOptions={[10, 25, 50, 100]}
        actions={(item) => {
          const row = item as unknown as ServicioRow;
          const servicio = servicios.find(s => s.id === row.id);
          if (!servicio) return null;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAbrirAcciones(servicio)} className="text-purple-500">
                  <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
                  Acciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/servicios/detalle/${row.id}`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Servicio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />

      {/* Modal de Renovación */}
      {selectedServicio && (
        <PagoDialog
          context="servicio"
          open={renovarDialogOpen}
          onOpenChange={setRenovarDialogOpen}
          mode="renew"
          servicio={selectedServicio}
          metodosPago={metodosPago}
          categoriaPlanes={categoriaPlanes}
          tipoPlan={selectedServicio.tipo === 'cuenta_completa' ? 'cuenta_completa' : 'perfiles'}
          pago={ultimoPago}
          onConfirm={handleConfirmRenovar}
        />
      )}

      {/* Modal de Acciones (Renovar/Resaltar) */}
      {selectedServicio && (
        <AccionesServicioDialog
          open={accionesDialogOpen}
          onOpenChange={setAccionesDialogOpen}
          servicio={selectedServicio}
          diasRestantes={selectedServicio.fechaVencimiento ? Math.ceil((new Date(selectedServicio.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0}
          estaResaltada={getNotificacion(selectedServicio.id).resaltada}
          onCortar={handleRenovarDesdeAcciones}
          onResaltar={handleResaltar}
        />
      )}
    </Card>
  );
});
