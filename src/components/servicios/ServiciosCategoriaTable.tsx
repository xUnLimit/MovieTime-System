'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Users, Eye, Pencil } from 'lucide-react';
import { Servicio } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ServiciosCategoriaTableProps {
  servicios: Servicio[];
  categoriaNombre: string;
}

export function ServiciosCategoriaTable({ servicios, categoriaNombre }: ServiciosCategoriaTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredServicios = servicios.filter((servicio) =>
    servicio.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servicio.correo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularDiasRestantes = (fechaVencimiento?: Date) => {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const getBadgeColor = (dias: number) => {
    if (dias < 0) return 'destructive';
    if (dias <= 7) return 'destructive';
    if (dias <= 30) return 'default';
    return 'default';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Todos los servicios</h2>
        <p className="text-sm text-muted-foreground">{filteredServicios.length} resultado(s)</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Fecha de Inicio</TableHead>
              <TableHead>Fecha de Vencimiento</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Días Restantes</TableHead>
              <TableHead>Renovaciones</TableHead>
              <TableHead>Perfiles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServicios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No se encontraron servicios
                </TableCell>
              </TableRow>
            ) : (
              filteredServicios.map((servicio) => {
                const diasRestantes = calcularDiasRestantes(servicio.fechaVencimiento);
                const badgeColor = getBadgeColor(diasRestantes);
                const perfilesOcupados = servicio.perfilesOcupados || 0;
                const perfilesLibres = servicio.perfilesDisponibles - perfilesOcupados;

                return (
                  <TableRow key={servicio.id}>
                    <TableCell className="font-medium">{servicio.nombre}</TableCell>
                    <TableCell className="text-sm">{servicio.correo}</TableCell>
                    <TableCell>
                      {servicio.fechaInicio
                        ? format(new Date(servicio.fechaInicio), "d 'de' MMM 'del' yyyy", { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {servicio.fechaVencimiento
                        ? format(new Date(servicio.fechaVencimiento), "d 'de' MMM 'del' yyyy", { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell className="font-medium">${servicio.costoPorPerfil * servicio.perfilesDisponibles}</TableCell>
                    <TableCell>
                      <Badge variant={badgeColor}>
                        {diasRestantes < 0 ? `Vencido` : `${diasRestantes} días restantes`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">🔄</span>
                        <span className="font-medium">{servicio.renovaciones || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {Array.from({ length: servicio.perfilesDisponibles }).map((_, i) => {
                            const isOcupado = i < perfilesOcupados;
                            return (
                              <div
                                key={i}
                                className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                                  isOcupado ? 'bg-red-600' : 'bg-green-600'
                                }`}
                              >
                                <Users className="h-3 w-3 text-white" />
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <span className={perfilesLibres === 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{perfilesLibres}</span>/{servicio.perfilesDisponibles} disponibles
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={servicio.activo ? 'default' : 'secondary'}>
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/servicios/detalle/${servicio.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/servicios/${servicio.id}/editar`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
