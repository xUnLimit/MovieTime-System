'use client';

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
import { Search, Bell, MoreHorizontal, Eye, MessageCircle, X, RefreshCw, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PagoDialog } from '@/components/shared/PagoDialog';
import { queryDocuments, COLLECTIONS, getById } from '@/lib/firebase/firestore';
import { VentaDoc, MetodoPago, Usuario } from '@/types';
import { Plan } from '@/types/categorias';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useVentasStore } from '@/store/ventasStore';
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

export const VentasProximasTable = memo(function VentasProximasTable() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [ventas, setVentas] = useState<VentaDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<VentaDoc | null>(null);

  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [categoriaPlanes, setCategoriaPlanes] = useState<Plan[]>([]);

  const { updateVenta } = useVentasStore();
  const { fetchTemplates, getTemplateByTipo } = useTemplatesStore();

  useEffect(() => {
    // Evitar duplicación por React Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const load = async () => {
      setIsLoading(true);
      try {
        // Cargar templates
        await fetchTemplates();

        // Cargar todas las ventas activas
        const ventasBase = await queryDocuments<VentaDoc>(
          COLLECTIONS.VENTAS,
          [{ field: 'estado', operator: '==', value: 'activo' }]
        );

        // PRIMERO sincronizar con PagoVenta para obtener fechaFin actualizada
        const ventasConDatos = await getVentasConUltimoPago(ventasBase);

        // DESPUÉS filtrar por fechaFin <= hoy + 7 días
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
  }, [fetchTemplates]);

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

  const handleNotificar = async (venta: VentaDoc, diasRestantes: number) => {
    // Determinar template según días restantes
    const template = diasRestantes === 0
      ? getTemplateByTipo('dia_pago')
      : getTemplateByTipo('notificacion_regular');

    if (!template) {
      toast.error('Template de notificación no encontrado');
      return;
    }

    // Obtener teléfono del cliente
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
        clienteSoloNombre: cliente.nombre,  // Solo nombre
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

  const handleCancelar = async (venta: VentaDoc) => {
    const template = getTemplateByTipo('cancelacion');

    if (!template) {
      toast.error('Template de cancelación no encontrado');
      return;
    }

    // Obtener teléfono del cliente
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
        clienteSoloNombre: cliente.nombre,  // Solo nombre
        servicioNombre: venta.servicioNombre,
        categoriaNombre: venta.categoriaNombre || '',
        perfilNombre: venta.perfilNombre,
        correo: venta.servicioCorreo || '',
        contrasena: venta.servicioContrasena || '',
        fechaVencimiento: venta.fechaFin ? new Date(venta.fechaFin) : new Date(),
        monto: venta.precioFinal || 0,
      });

      openWhatsApp(cliente.telefono, mensaje);
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      toast.error('Error obteniendo datos del cliente');
    }
  };

  // Cargar métodos de pago y planes solo cuando se necesite (lazy loading)
  const loadMetodosPagoYPlanes = async (venta: VentaDoc) => {
    if (metodosPago.length > 0 && categoriaPlanes.length > 0) return; // Ya están cargados
    try {
      // Cargar métodos de pago asociados a usuarios/clientes
      if (metodosPago.length === 0) {
        const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
          { field: 'asociadoA', operator: '==', value: 'usuario' }
        ]);
        setMetodosPago(Array.isArray(methods) ? methods : []);
      }

      // Cargar planes de la categoría
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

  const [selectedClienteSoloNombre, setSelectedClienteSoloNombre] = useState<string>('');

  const handleRenovar = async (venta: VentaDoc) => {
    setSelectedVenta(venta);
    await loadMetodosPagoYPlanes(venta);

    // Obtener nombre solo del cliente
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
      // Calcular monto final
      const precioFinal = (formData.costo as number) * (1 - ((formData.descuento as number) || 0) / 100);

      // Obtener nombre del método de pago
      const metodoPago = metodosPago.find(mp => mp.id === formData.metodoPagoId);
      const metodoPagoNombre = metodoPago?.nombre || '';

      // Crear pago de renovación
      await crearPagoRenovacion(
        selectedVenta.id,              // ventaId
        selectedVenta.clienteId || '', // clienteId
        selectedVenta.clienteNombre,   // clienteNombre
        selectedVenta.categoriaId || '',// categoriaId
        precioFinal,                   // monto
        metodoPagoNombre,              // metodoPago
        formData.metodoPagoId as string, // metodoPagoId
        formData.moneda as string || 'USD', // moneda
        formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual', // cicloPago
        formData.notas as string,      // notas
        formData.fechaInicio as Date,  // fechaInicio
        formData.fechaVencimiento as Date, // fechaVencimiento
        formData.costo as number,      // precio
        (formData.descuento as number) || 0 // descuento
      );

      // Actualizar la venta con los nuevos datos
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

      toast.success('Venta renovada exitosamente');

      // Si se marcó notificar por WhatsApp, enviar mensaje
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
                monto: (formData.costo as number) * (1 - ((formData.descuento as number) || 0) / 100),
              });

              openWhatsApp(cliente.telefono, mensaje);
            }
          } catch (error) {
            console.error('Error enviando notificación WhatsApp:', error);
          }
        }
      }

      // Recargar ventas
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

  const getEstadoColor = (diasRestantes: number) => {
    if (diasRestantes < 0 || diasRestantes <= 3) {
      return 'border-red-500/50 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
    }
    return 'border-yellow-500/50 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
  };

  const getEstadoLabel = (diasRestantes: number) => {
    if (diasRestantes < 0) return `${Math.abs(diasRestantes)} días de retraso`;
    if (diasRestantes === 0) return 'Vence hoy';
    if (diasRestantes === 1) return '1 día restante';
    return `${diasRestantes} días restantes`;
  };

  const getIconColor = (diasRestantes: number) => {
    if (diasRestantes < 0 || diasRestantes <= 3) {
      return 'bg-red-100 dark:bg-red-500/20';
    }
    return 'bg-yellow-100 dark:bg-yellow-500/20';
  };

  const getIconButtonHoverColor = (diasRestantes: number) => {
    if (diasRestantes < 0 || diasRestantes <= 3) {
      return 'hover:bg-red-200 dark:hover:bg-red-500/30';
    }
    return 'hover:bg-yellow-200 dark:hover:bg-yellow-500/30';
  };

  const getBellIconColor = (diasRestantes: number) => {
    if (diasRestantes < 0 || diasRestantes <= 3) {
      return 'text-red-700 dark:text-red-300';
    }
    return 'text-yellow-700 dark:text-yellow-300';
  };

  const columns: Column<VentaProximaRow>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '5%',
      render: (item) => (
        <Button
          variant="ghost"
          size="icon"
          className={`mx-auto h-8 w-8 rounded-full transition-all duration-200 ease-in-out ${getIconColor(item.diasRestantes)} ${getIconButtonHoverColor(item.diasRestantes)} hover:scale-105`}
        >
          <Bell className={`h-5 w-5 ${getBellIconColor(item.diasRestantes)}`} />
        </Button>
      ),
    },
    {
      key: 'clienteNombre',
      header: 'Cliente',
      sortable: true,
      align: 'center',
      width: '20%',
      render: (item) => <span className="font-medium text-white">{item.clienteNombre}</span>,
    },
    {
      key: 'categoriaNombre',
      header: 'Categoría',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (item) => <span className="text-white">{item.categoriaNombre}</span>,
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Inicio',
      sortable: true,
      align: 'center',
      width: '18%',
      render: (item) => <span className="text-white">{item.fechaInicio}</span>,
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
      render: (item) => <span className="text-white">${item.monto.toFixed(2)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '14%',
      render: (item) => (
        <Badge variant="outline" className={`font-normal ${getEstadoColor(item.diasRestantes)}`}>
          {getEstadoLabel(item.diasRestantes)}
        </Badge>
      ),
    },
  ];

  return (
    <Card className="p-4 pb-2">
      <div className="space-y-0">
        <h3 className="text-xl font-semibold">Ventas próximas a vencer</h3>
        <p className="text-sm text-muted-foreground mb-0">
          Listado de ventas con vencimiento próximo o ya vencidas.
        </p>
      </div>

      <div className="flex items-center gap-4 -mb-4">
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
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="critico">Crítico (0-3 días)</SelectItem>
            <SelectItem value="proximoVencer">Próximo a vencer (4-7 días)</SelectItem>
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
          const row = item as unknown as VentaProximaRow;
          const venta = ventas.find(v => v.id === row.id);
          if (!venta) return null;

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
                <DropdownMenuItem onClick={() => handleCancelar(venta)} className="text-red-500">
                  <X className="h-4 w-4 mr-2 text-red-500" />
                  Cancelar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRenovar(venta)} className="text-purple-500">
                  <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
                  Renovar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/usuarios/${row.clienteId}`)}>
                  <User className="h-4 w-4 mr-2" />
                  Ver Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/ventas/${row.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Venta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />

      {selectedVenta && (
        <PagoDialog
          context="venta"
          open={renovarDialogOpen}
          onOpenChange={setRenovarDialogOpen}
          mode="renew"
          venta={{
            clienteNombre: selectedVenta.clienteNombre,
            metodoPagoId: selectedVenta.metodoPagoId,
            precioFinal: selectedVenta.precioFinal || 0,
            fechaFin: selectedVenta.fechaFin ? new Date(selectedVenta.fechaFin) : new Date(),
          }}
          metodosPago={metodosPago}
          categoriaPlanes={categoriaPlanes}
          clienteNombre={selectedVenta.clienteNombre}
          clienteSoloNombre={selectedClienteSoloNombre}
          servicioNombre={selectedVenta.servicioNombre}
          categoriaNombre={selectedVenta.categoriaNombre}
          onConfirm={handleConfirmRenovar}
        />
      )}
    </Card>
  );
});
