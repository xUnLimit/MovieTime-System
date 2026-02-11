// ===========================
// CATEGORIA TYPES
// ===========================

export interface Plan {
  id: string;
  nombre: string;
  precio: number;
  cicloPago: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  tipoPlan: 'cuenta_completa' | 'perfiles';
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: 'cliente' | 'revendedor' | 'ambos';
  tipoCategoria?: 'plataforma_streaming' | 'otros';
  planes?: Plan[];
  notas?: string;
  iconUrl?: string;
  color?: string;
  activo: boolean;

  // Campos denormalizados (actualizados automáticamente por serviciosStore y ventasStore)
  totalServicios: number;           // Total de servicios en esta categoría
  serviciosActivos: number;         // Servicios con activo=true
  perfilesDisponiblesTotal: number; // Suma de (perfilesDisponibles - perfilesOcupados) de servicios activos
  ventasTotales: number;            // Total de ventas (suscripciones) asociadas a servicios de esta categoría
  ingresosTotales: number;          // Suma total de ingresos de ventas de esta categoría

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
