'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Monitor, Users, ShoppingCart, Eye, Search, ArrowUpDown, TrendingUp } from 'lucide-react';
import { Categoria, Servicio, PagoServicio, VentaDoc, PagoVenta } from '@/types';
import { queryDocuments, COLLECTIONS } from '@/lib/firebase/firestore';
import { calcularMontoSinConsumir } from '@/lib/utils/calculations';
import { getVentasConUltimoPago } from '@/lib/services/ventaSyncService';

interface CategoriasTableProps {
  categorias: Categoria[];
  title?: string;
}

interface CategoriaRow {
  categoria: Categoria;
  totalServicios: number;
  serviciosActivos: number;
  perfilesDisponibles: number;
  suscripcionesTotales: number;
  ingresoTotal: number;
  gastosTotal: number;
  gananciaTotal: number;
  montoSinConsumir: number;
}

export const CategoriasTable = memo(function CategoriasTable({
  categorias,
  title = 'Todas las categorías',
}: CategoriasTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<keyof CategoriaRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [gastosMap, setGastosMap] = useState<Map<string, number>>(new Map());
  const [ventasMap, setVentasMap] = useState<Map<string, VentaDoc[]>>(new Map());

  const handleViewCategoria = (categoriaId: string) => {
    router.push(`/servicios/${categoriaId}`);
  };

  // Cargar gastos desde pagosServicio (historial permanente)
  // Query DIRECTA por categoriaId - sin necesidad de cargar todos los servicios
  useEffect(() => {
    const fetchGastos = async () => {
      const gastosTemp = new Map<string, number>();

      for (const categoria of categorias.filter(c => c.activo)) {
        try {
          // Query DIRECTA: obtener todos los pagos de esta categoría
          // Gracias al campo denormalizado categoriaId en PagoServicio
          const pagos = await queryDocuments<PagoServicio>(
            COLLECTIONS.PAGOS_SERVICIO,
            [{ field: 'categoriaId', operator: '==', value: categoria.id }]
          );

          const totalGastos = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
          gastosTemp.set(categoria.id, totalGastos);
        } catch (error) {
          console.error(`Error cargando gastos de categoría ${categoria.nombre}:`, error);
          gastosTemp.set(categoria.id, 0);
        }
      }

      setGastosMap(gastosTemp);
    };

    if (categorias.length > 0) {
      fetchGastos();
    }
  }, [categorias]);

  // Cargar ventas activas por categoría para calcular monto sin consumir
  useEffect(() => {
    const fetchVentas = async () => {
      const ventasTemp = new Map<string, VentaDoc[]>();

      for (const categoria of categorias.filter(c => c.activo)) {
        try {
          // Query: obtener todas las ventas de esta categoría (sin filtro de estado)
          const todasVentas = await queryDocuments<VentaDoc>(
            COLLECTIONS.VENTAS,
            [{ field: 'categoriaId', operator: '==', value: categoria.id }]
          );

          // Filtrar manualmente las ventas activas
          const ventasActivas = todasVentas.filter(v => (v.estado ?? 'activo') !== 'inactivo');

          // Cargar datos actuales desde PagoVenta (fuente de verdad para fechas y precios)
          const ventasConDatos = await getVentasConUltimoPago(ventasActivas);

          ventasTemp.set(categoria.id, ventasConDatos);
        } catch (error) {
          console.error(`Error cargando ventas de categoría ${categoria.nombre}:`, error);
          ventasTemp.set(categoria.id, []);
        }
      }

      setVentasMap(ventasTemp);
    };

    if (categorias.length > 0) {
      fetchVentas();
    }
  }, [categorias]);

  const rows = useMemo(() => {
    const categoriaData: CategoriaRow[] = categorias
      .filter(cat => cat.activo)
      .map(categoria => {
        // Leer métricas directamente de los campos denormalizados
        const totalServicios = categoria.totalServicios ?? 0;
        const serviciosActivos = categoria.serviciosActivos ?? 0;
        const perfilesDisponibles = Math.max(0, categoria.perfilesDisponiblesTotal ?? 0);

        // Calcular gastosTotal desde pagosServicio (historial permanente)
        const gastosTotal = gastosMap.get(categoria.id) ?? 0;

        // Leer ventas e ingresos desde campos denormalizados
        const suscripcionesTotales = categoria.ventasTotales ?? 0;
        const ingresoTotal = categoria.ingresosTotales ?? 0;
        const gananciaTotal = ingresoTotal - gastosTotal;

        // Calcular monto sin consumir desde ventas activas
        const ventasActivas = ventasMap.get(categoria.id) ?? [];
        const montoSinConsumir = ventasActivas.reduce((sum, venta) => {
          if (!venta.fechaInicio || !venta.fechaFin) return sum;
          return sum + calcularMontoSinConsumir(
            new Date(venta.fechaInicio),
            new Date(venta.fechaFin),
            venta.precioFinal || 0
          );
        }, 0);

        return {
          categoria,
          totalServicios,
          serviciosActivos,
          perfilesDisponibles,
          suscripcionesTotales,
          ingresoTotal,
          gastosTotal,
          gananciaTotal,
          montoSinConsumir,
        };
      });

    return categoriaData;
  }, [categorias, gastosMap, ventasMap]);

  // Filtrar por búsqueda
  const filteredRows = useMemo(() => {
    return rows.filter(row =>
      row.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return [...filteredRows].sort((a, b) =>
        a.categoria.nombre.localeCompare(b.categoria.nombre, 'es')
      );
    }

    const getSortValue = (row: CategoriaRow, key: keyof CategoriaRow): string | number => {
      if (key === 'categoria') return row.categoria.nombre;
      return row[key];
    };

    return [...filteredRows].sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);

      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortKey, sortDirection]);

  const handleSort = (key: keyof CategoriaRow) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: keyof CategoriaRow) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return <ArrowUpDown className="h-3 w-3" />;
  };

  // Paginación
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getProgressPercentage = (activos: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((activos / total) * 100);
  };

  return (
    <Card className="p-4 pb-2">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="flex items-center gap-4 -mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('categoria')}
                  className={`h-8 -ml-3 ${sortKey === 'categoria' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Categoría
                  {getSortIcon('categoria')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('totalServicios')}
                  className={`h-8 w-full justify-center ${sortKey === 'totalServicios' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Total Servicios
                  {getSortIcon('totalServicios')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('serviciosActivos')}
                  className={`h-8 w-full justify-center ${sortKey === 'serviciosActivos' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Servicios Activos
                  {getSortIcon('serviciosActivos')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('perfilesDisponibles')}
                  className={`h-8 w-full justify-center ${sortKey === 'perfilesDisponibles' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Perfiles Disponibles
                  {getSortIcon('perfilesDisponibles')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('suscripcionesTotales')}
                  className={`h-8 w-full justify-center ${sortKey === 'suscripcionesTotales' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Suscripciones Totales
                  {getSortIcon('suscripcionesTotales')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('ingresoTotal')}
                  className={`h-8 w-full justify-center ${sortKey === 'ingresoTotal' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Ingreso Total
                  {getSortIcon('ingresoTotal')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('gastosTotal')}
                  className={`h-8 w-full justify-center ${sortKey === 'gastosTotal' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Gastos Totales
                  {getSortIcon('gastosTotal')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('gananciaTotal')}
                  className={`h-8 w-full justify-center ${sortKey === 'gananciaTotal' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Ganancia Total
                  {getSortIcon('gananciaTotal')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('montoSinConsumir')}
                  className={`h-8 w-full justify-center ${sortKey === 'montoSinConsumir' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Monto Sin Consumir
                  {getSortIcon('montoSinConsumir')}
                </Button>
              </TableHead>
              <TableHead className="text-center pr-6 text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                  No se encontraron categorías
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const progressPercentage = getProgressPercentage(
                  row.serviciosActivos,
                  row.totalServicios
                );

                return (
                  <TableRow key={row.categoria.id}>
                    <TableCell className="pl-6">
                      <span className="font-medium">{row.categoria.nombre}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Monitor className={`h-4 w-4 ${row.serviciosActivos > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${row.serviciosActivos > 0 ? '' : 'text-muted-foreground'}`}>{row.totalServicios}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className={`h-3 w-3 ${row.serviciosActivos > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <span className={`font-medium text-sm ${row.serviciosActivos > 0 ? '' : 'text-muted-foreground'}`}>{row.serviciosActivos} / {row.totalServicios}</span>
                        </div>
                        <div className="bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Users className={`h-4 w-4 ${row.perfilesDisponibles > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${row.perfilesDisponibles > 0 ? '' : 'text-muted-foreground'}`}>{row.perfilesDisponibles}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ShoppingCart className={`h-4 w-4 ${row.suscripcionesTotales > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${row.suscripcionesTotales > 0 ? '' : 'text-muted-foreground'}`}>{row.suscripcionesTotales}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`${row.ingresoTotal === 0 ? 'text-muted-foreground' : ''}`}>$</span>
                        <span className={`${row.ingresoTotal === 0 ? 'text-muted-foreground' : ''}`}>{row.ingresoTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`${row.gastosTotal === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>$</span>
                        <span className={`${row.gastosTotal === 0 ? 'text-muted-foreground' : ''}`}>{row.gastosTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`${row.gananciaTotal < 0 ? 'text-red-500' : row.gananciaTotal === 0 ? 'text-muted-foreground' : 'text-green-500'}`}>$</span>
                        <span className={`${row.gananciaTotal < 0 ? 'text-red-500' : row.gananciaTotal === 0 ? 'text-muted-foreground' : ''}`}>{row.gananciaTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`${row.montoSinConsumir === 0 ? 'text-muted-foreground' : 'text-orange-500'}`}>$</span>
                        <span className={`${row.montoSinConsumir === 0 ? 'text-muted-foreground' : ''}`}>{row.montoSinConsumir.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewCategoria(row.categoria.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={String(itemsPerPage)} onValueChange={(val) => {
            setItemsPerPage(Number(val));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});
