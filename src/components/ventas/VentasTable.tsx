'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Search, MoreHorizontal, Monitor, User, Clock, ArrowUpRight, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Categoria } from '@/types';
import { VentaDoc } from '@/components/ventas/VentasMetrics';
import { cn } from '@/lib/utils';

interface VentasTableProps {
  ventas: VentaDoc[];
  categorias: Categoria[];
  estadoFiltro: 'todas' | 'activas' | 'inactivas';
  title: string;
  onDelete?: (ventaId: string, servicioId?: string, perfilNumero?: number | null) => void;
}

interface VentaRow {
  id: string;
  cliente: string;
  clienteDetalle: string;
  servicio: string;
  servicioDetalle: string;
  cicloPago: string;
  fechaInicio?: Date;
  fechaVencimiento?: Date;
  monto: number;
  consumoPorcentaje: number;
  montoRestante: number;
  moneda: string;
  estado: 'activa' | 'suspendida' | 'inactiva';
  categoriaId?: string;
  original: VentaDoc;
}

const getCicloPagoLabel = (ciclo?: string) => {
  const labels: Record<string, string> = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };
  return ciclo ? labels[ciclo] || ciclo : '—';
};

const getCurrencySymbol = (moneda?: string): string => {
  if (!moneda) return '$';
  const symbols: Record<string, string> = {
    USD: '$',
    PAB: 'B/.',
    EUR: '€',
    COP: '$',
    MXN: '$',
    CRC: '₡',
    VES: 'Bs.',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    NGN: '₦',
    TRY: '₺',
  };
  return symbols[moneda] || '$';
};

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export function VentasTable({
  ventas,
  categorias,
  estadoFiltro,
  title,
  onDelete,
}: VentasTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');

  const rows = useMemo(() => {
    const hoy = new Date();

    return ventas.map((venta) => {
      const moneda = venta.moneda || 'USD';

      const fechaInicio = venta.fechaInicio ? new Date(venta.fechaInicio) : undefined;
      const fechaVencimiento = venta.fechaFin ? new Date(venta.fechaFin) : undefined;

      const totalMs = fechaInicio && fechaVencimiento ? fechaVencimiento.getTime() - fechaInicio.getTime() : 0;
      const elapsedMs = fechaInicio ? hoy.getTime() - fechaInicio.getTime() : 0;
      const ratio = totalMs > 0 ? clamp(elapsedMs / totalMs) : 0;
      const consumoPorcentaje = Math.round(ratio * 100);
      const monto = venta.precioFinal ?? 0;
      const montoRestante = Math.max(monto * (1 - ratio), 0);
      const inactivaPorEstado = venta.estado === 'inactivo';
      const estado: VentaRow['estado'] = inactivaPorEstado ? 'inactiva' : 'activa';

      return {
        id: venta.id,
        cliente: venta.clienteNombre || 'Sin cliente',
        clienteDetalle: '',
        servicio: venta.servicioNombre,
        servicioDetalle: venta.servicioCorreo || 'Sin correo',
        cicloPago: getCicloPagoLabel(venta.cicloPago),
        fechaInicio,
        fechaVencimiento,
        monto,
        consumoPorcentaje,
        montoRestante,
        moneda,
        estado,
        categoriaId: venta.categoriaId,
        original: venta,
      } satisfies VentaRow;
    });
  }, [ventas]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.clienteDetalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.servicio.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategoria = categoriaFilter === 'todas' || row.categoriaId === categoriaFilter;

      const matchesEstado =
        estadoFiltro === 'todas' ||
        (estadoFiltro === 'activas' && row.estado === 'activa') ||
        (estadoFiltro === 'inactivas' && row.estado === 'inactiva');

      return matchesSearch && matchesCategoria && matchesEstado;
    });
  }, [rows, searchQuery, categoriaFilter, estadoFiltro]);

  const columns: Column<VentaRow>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      width: '16%',
      render: (item) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-500" />
          <div>
            <p className="font-medium">{item.cliente}</p>
            {item.clienteDetalle ? (
              <p className="text-xs text-muted-foreground">{item.clienteDetalle}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'servicio',
      header: 'Servicio',
      sortable: true,
      width: '18%',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-green-500" />
          <div>
            <p className="font-medium">{item.servicio}</p>
            <p className="text-xs text-muted-foreground">{item.servicioDetalle}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'cicloPago',
      header: 'Ciclo de Pago',
      sortable: true,
      width: '12%',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getCicloPagoLabel(item.cicloPago)}</span>
        </div>
      ),
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Inicio',
      sortable: true,
      width: '12%',
      align: 'center',
      render: (item) => (
        <div className="text-center">
          {item.fechaInicio ? format(item.fechaInicio, "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
        </div>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Fecha de Vencimiento',
      sortable: true,
      width: '12%',
      align: 'center',
      render: (item) => (
        <div className="text-center">
          {item.fechaVencimiento ? format(item.fechaVencimiento, "d 'de' MMMM 'del' yyyy", { locale: es }) : '—'}
        </div>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      sortable: true,
      width: '10%',
      align: 'center',
      render: (item) => (
        <div className="text-center font-medium">
          <span className="text-green-500">{getCurrencySymbol(item.moneda)}</span>
          <span className="text-foreground"> {item.monto.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'consumoPorcentaje',
      header: 'Consumo del Pago',
      sortable: true,
      width: '14%',
      align: 'center',
      render: (item) => (
        <div className="min-w-[140px] text-center">
          <span className="text-xs text-muted-foreground">{item.consumoPorcentaje}%</span>
          <div className="mt-1 h-2 w-full rounded-full bg-muted">
            <div
              className={cn(
                'h-2 rounded-full',
                item.consumoPorcentaje >= 75
                  ? 'bg-red-500'
                  : item.consumoPorcentaje >= 45
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              )}
              style={{ width: `${item.consumoPorcentaje}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'montoRestante',
      header: 'Monto Restante',
      sortable: true,
      width: '12%',
      align: 'center',
      render: (item) => (
        <div className="text-center font-medium">
          <span className="text-green-500">{getCurrencySymbol(item.moneda)}</span>
          <span className="text-foreground"> {item.montoRestante.toFixed(2)}</span>
        </div>
      ),
    },
  ];

  return (
    <Card className="p-4 pb-2">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="flex items-center gap-4 -mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, servicio o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        pagination={true}
        itemsPerPageOptions={[10, 25, 50, 100]}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/ventas/${item.original.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/ventas/${item.original.id}/editar`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item.original.id, item.original.servicioId, item.original.perfilNumero)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar venta
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      />
    </Card>
  );
}
