// ===========================
// SERVICIO TYPES
// ===========================

export interface Servicio {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  tipo: 'cuenta_completa' | 'perfiles';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  perfilesOcupados: number;
  costoServicio: number;
  metodoPagoId?: string;
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio?: Date;
  fechaVencimiento?: Date;
  notas?: string;
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
  tipo: 'cuenta_completa' | 'perfiles';
  correo: string;
  contrasena: string;
  perfilesDisponibles: number;
  costoPorPerfil: number;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
}
