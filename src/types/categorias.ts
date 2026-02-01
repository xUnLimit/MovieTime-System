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
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
