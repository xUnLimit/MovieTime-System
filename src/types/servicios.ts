// ===========================
// SERVICIO TYPES
// ===========================

export interface Servicio {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  tipo: 'individual' | 'familiar';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  perfilesOcupados: number;
  costoPorPerfil: number;
  costoTotal: number;
  activo: boolean;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Form Types
export interface ServicioFormData {
  categoriaId: string;
  nombre: string;
  tipo: 'individual' | 'familiar';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  costoPorPerfil: number;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
}
