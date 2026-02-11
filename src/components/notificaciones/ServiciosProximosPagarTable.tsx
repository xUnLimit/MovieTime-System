'use client';

import { useState, useEffect, useMemo, memo } from 'react';
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
import { Search, MoreHorizontal, Eye, EyeOff, Copy, Mail, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useServiciosStore } from '@/store/serviciosStore';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { differenceInDays } from 'date-fns';
import { getAll, COLLECTIONS } from '@/lib/firebase/firestore';
import { VentaDoc } from '@/types';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';

interface ServicioProximoPagarRow {
  id: string;
  servicioNombre: string;
  email: string;
  contrasena: string;
  fechaVencimiento: string;
  monto: number;
  diasRestantes: number;
  estado: string;
}

export const ServiciosProximosPagarTable = memo(function ServiciosProximosPagarTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [ventas, setVentas] = useState<VentaDoc[]>([]);
  const { servicios } = useServiciosStore();

  useEffect(() => {
    const load = async () => {
      try {
        // Paso 1: Cargar ventas base (solo metadatos)
        const ventasBase = await getAll<VentaDoc>(COLLECTIONS.VENTAS);

        // Paso 2: Cargar datos actuales desde PagoVenta (fuente de verdad)
        const ventasConDatos = await getVentasConUltimoPago(ventasBase);

        setVentas(ventasConDatos);
      } catch (error) {
        console.error('Error cargando ventas:', error);
      }
    };
    load();
  }, []);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const rows: ServicioProximoPagarRow[] = useMemo(() => {
    const hoy = new Date();
    return ventas
      .filter((venta) => {
        if (venta.estado === 'inactivo') return false;
        if (!venta.fechaFin) return false;
        const diasRestantes = differenceInDays(new Date(venta.fechaFin), hoy);
        return diasRestantes <= 100;
      })
      .map((venta) => {
        const servicio = servicios.find((s) => s.id === venta.servicioId);
        const fechaFin = venta.fechaFin ?? new Date();
        const diasRestantes = differenceInDays(new Date(fechaFin), hoy);

        return {
          id: venta.id,
          servicioNombre: venta.servicioNombre || servicio?.nombre || 'N/A',
          email: venta.servicioCorreo || servicio?.correo || 'N/A',
          contrasena: servicio?.contrasena || '',
          fechaVencimiento: new Date(fechaFin).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          monto: venta.precioFinal || 0,
          diasRestantes,
          estado: diasRestantes <= 0 ? 'vencido' : diasRestantes <= 7 ? 'proximoVencer' : 'activo',
        };
      });
  }, [ventas, servicios]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.servicioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado =
        estadoFilter === 'todos' || row.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [rows, searchTerm, estadoFilter]);

  const getBellColor = (diasRestantes: number) => {
    if (diasRestantes >= 1 && diasRestantes <= 7) return 'text-yellow-600';
    if (diasRestantes <= 0) return 'text-red-500';
    return 'text-green-600';
  };

  const getEstadoColor = (diasRestantes: number) => {
    if (diasRestantes >= 1 && diasRestantes <= 7) return 'border-yellow-600 text-yellow-600';
    if (diasRestantes <= 0) return 'border-red-500 text-red-500';
    return 'border-green-600 text-green-600';
  };

  const getEstadoLabel = (diasRestantes: number) => {
    if (diasRestantes <= 0) return 'Día de pago';
    if (diasRestantes === 1) return '1 día restante';
    if (diasRestantes >= 2 && diasRestantes <= 7) return `${diasRestantes} días restantes`;
    return 'Activo';
  };

  const columns: Column<ServicioProximoPagarRow>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: false,
      align: 'center',
      width: '5%',
      render: (item) => (
        <div className="flex items-center justify-center">
          <Bell className={`h-5 w-5 ${getBellColor(item.diasRestantes)}`} />
        </div>
      ),
    },
    {
      key: 'servicioNombre',
      header: 'Servicio',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (item) => <span className="font-medium">{item.servicioNombre}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      align: 'center',
      width: '20%',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <span>{item.email}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-transparent"
            onClick={() => copyToClipboard(item.email)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'contrasena',
      header: 'Contraseña',
      sortable: false,
      align: 'center',
      width: '18%',
      render: (item) => (
        <div className="flex items-center gap-2 justify-center">
          <span>
            {visiblePasswords.has(item.id) ? item.contrasena : '••••••••'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-transparent"
            onClick={() => togglePasswordVisibility(item.id)}
          >
            {visiblePasswords.has(item.id) ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-transparent"
            onClick={() => copyToClipboard(item.contrasena)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      align: 'center',
      width: '15%',
      render: (item) => <span>{item.fechaVencimiento}</span>,
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (item) => <span>${item.monto.toFixed(2)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: false,
      align: 'center',
      width: '10%',
      render: (item) => (
        <Badge
          variant="outline"
          className={`border ${getEstadoColor(item.diasRestantes)}`}
        >
          {getEstadoLabel(item.diasRestantes)}
        </Badge>
      ),
    },
  ];

  return (
    <Card className="p-4 pb-2">
      <div className="space-y-0">
        <h3 className="text-xl font-semibold">Servicios próximos por pagar</h3>
        <p className="text-sm text-muted-foreground mb-0">
          Listado de servicios con vencimiento próximo o ya vencidos.
        </p>
      </div>

      <div className="flex items-center gap-4 -mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por servicio o email..."
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
            <SelectItem value="proximoVencer">Próximo a vencer</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredRows as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        pagination={true}
        itemsPerPageOptions={[10, 25, 50, 100]}
        actions={(item) => {
          const row = item as unknown as ServicioProximoPagarRow;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => copyToClipboard(row.email)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const subject = `Datos de acceso - ${row.servicioNombre}`;
                    const body = `Email: ${row.email}\nContraseña: ${row.contrasena}`;
                    window.location.href = `mailto:${row.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />
    </Card>
  );
});
