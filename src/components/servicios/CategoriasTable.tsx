'use client';

import { memo, useMemo, useState } from 'react';
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
import { Categoria, Servicio, Suscripcion } from '@/types';

interface CategoriasTableProps {
  categorias: Categoria[];
  servicios: Servicio[];
  suscripciones: Suscripcion[];
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
  servicios,
  suscripciones,
  title = 'Todas las categorías',
}: CategoriasTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const rows = useMemo(() => {
    const categoriaData: CategoriaRow[] = categorias
      .filter(cat => cat.activo)
      .map(categoria => {
        // Filtrar servicios de esta categoría
        const serviciosCategoria = servicios.filter(s => s.categoriaId === categoria.id);
        const serviciosActivos = serviciosCategoria.filter(s => s.activo);

        // Filtrar suscripciones de esta categoría
        const suscripcionesCategoria = suscripciones.filter(
          sub => sub.categoriaId === categoria.id
        );

        // Calcular totales
        const totalServicios = serviciosCategoria.length;
        const serviciosActivosCount = serviciosActivos.length;
        const perfilesDisponibles = serviciosCategoria.reduce(
          (sum, s) => sum + s.perfilesDisponibles,
          0
        );
        const suscripcionesTotales = suscripcionesCategoria.length;

        // Ingresos: suma de montos de todas las suscripciones
        const ingresoTotal = suscripcionesCategoria.reduce(
          (sum, sub) => sum + sub.monto,
          0
        );

        // Gastos: suma de costos de servicios activos
        const gastosTotal = serviciosActivos.reduce(
          (sum, s) => sum + s.costoTotal,
          0
        );

        // Ganancia: ingresos - gastos
        const gananciaTotal = ingresoTotal - gastosTotal;

        // Monto sin consumir: suma de montos restantes de suscripciones activas
        const montoSinConsumir = suscripcionesCategoria
          .filter(sub => sub.estado === 'activa')
          .reduce((sum, sub) => sum + (sub.montoRestante || 0), 0);

        return {
          categoria,
          totalServicios,
          serviciosActivos: serviciosActivosCount,
          perfilesDisponibles,
          suscripcionesTotales,
          ingresoTotal,
          gastosTotal,
          gananciaTotal,
          montoSinConsumir,
        };
      });

    return categoriaData;
  }, [categorias, servicios, suscripciones]);

  // Filtrar por búsqueda
  const filteredRows = useMemo(() => {
    return rows.filter(row =>
      row.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let aValue: any = a[sortKey as keyof CategoriaRow];
      let bValue: any = b[sortKey as keyof CategoriaRow];

      if (sortKey === 'categoria') {
        aValue = a.categoria.nombre;
        bValue = b.categoria.nombre;
      }

      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortKey, sortDirection]);

  const handleSort = (key: string) => {
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

  const getSortIcon = (columnKey: string) => {
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
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="font-medium text-sm">{row.serviciosActivos} / {row.totalServicios}</span>
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
                        <span className={`font-medium ${row.ingresoTotal === 0 ? 'text-muted-foreground' : 'text-blue-500'}`}>$</span>
                        <span className={`font-medium ${row.ingresoTotal === 0 ? 'text-muted-foreground' : 'text-white'}`}>{row.ingresoTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${row.gastosTotal === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>$</span>
                        <span className={`font-medium ${row.gastosTotal === 0 ? 'text-muted-foreground' : 'text-white'}`}>{row.gastosTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${row.gananciaTotal < 0 ? 'text-red-500' : row.gananciaTotal === 0 ? 'text-muted-foreground' : 'text-green-500'}`}>$</span>
                        <span className={`font-medium ${row.gananciaTotal < 0 ? 'text-red-500' : row.gananciaTotal === 0 ? 'text-muted-foreground' : 'text-white'}`}>{row.gananciaTotal.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${row.montoSinConsumir === 0 ? 'text-muted-foreground' : row.montoSinConsumir < 0 ? 'text-red-500' : 'text-red-500'}`}>$</span>
                        <span className={`font-medium ${row.montoSinConsumir === 0 ? 'text-muted-foreground' : row.montoSinConsumir < 0 ? 'text-red-500' : 'text-white'}`}>{row.montoSinConsumir.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver detalles"
                        onClick={() => {
                          const servicioCategoria = servicios.find(s => s.categoriaId === row.categoria.id);
                          if (servicioCategoria) {
                            router.push(`/servicios/${servicioCategoria.id}`);
                          }
                        }}
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

      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
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
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});
