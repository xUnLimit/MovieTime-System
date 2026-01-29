// ===========================
// CATEGORIA TYPES
// ===========================

export interface Categoria {
  id: string;
  nombre: string;
  tipo: 'cliente' | 'revendedor' | 'ambos';
  iconUrl?: string;
  color?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
