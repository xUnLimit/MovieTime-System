'use client';

import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Servicio } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Copy, Eye, Bell, EyeOff, RefreshCw, FileText } from 'lucide-react';
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

export const ServiciosProximosTable = memo(function ServiciosProximosTable() {
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

  const { updateServicio } = useServiciosStore();

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

        // Ordenar por fecha de vencimiento (más próximos primero)
        serviciosProximos.sort((a, b) => {
          if (!a.fechaVencimiento || !b.fechaVencimiento) return 0;
          return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
        });

        setServicios(serviciosProximos);
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
        monto: servicio.costoServicio, // Monto correcto del servicio
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

  // Cargar métodos de pago y planes solo cuando se necesite (lazy loading)
  const loadMetodosPagoYPlanes = async (servicio: Servicio) => {
    if (metodosPago.length > 0 && categoriaPlanes.length > 0) return; // Ya están cargados
    try {
      // Cargar métodos de pago asociados a servicios
      if (metodosPago.length === 0) {
        const methods = await queryDocuments<MetodoPago>(COLLECTIONS.METODOS_PAGO, [
          { field: 'asociadoA', operator: '==', value: 'servicio' }
        ]);
        setMetodosPago(Array.isArray(methods) ? methods : []);
      }

      // Cargar planes de la categoría
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

    // Obtener último pago del servicio
    try {
      const pagos = await obtenerPagosDeServicio(servicio.id);
      if (pagos.length > 0) {
        // Ordenar por fecha descendente y tomar el primero
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
      // Contar renovaciones existentes para generar número correcto
      const numeroRenovacion = await contarRenovacionesDeServicio(selectedServicio.id) + 1;

      // Crear pago de renovación
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

      // Actualizar el servicio con los nuevos datos
      await updateServicio(selectedServicio.id, {
        fechaVencimiento: formData.fechaVencimiento as Date,
        cicloPago: formData.periodoRenovacion as 'mensual' | 'trimestral' | 'semestral' | 'anual',
        metodoPagoId: formData.metodoPagoId as string,
        costoServicio: formData.costo as number,
      });

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

  const columns: Column<ServicioRow>[] = [
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
                <DropdownMenuItem onClick={() => handleRenovar(servicio)} className="text-purple-500">
                  <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
                  Renovar
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
    </Card>
  );
});
