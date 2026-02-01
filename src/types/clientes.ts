// ===========================
// CLIENTE & REVENDEDOR TYPES
// ===========================

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  montoSinConsumir: number;
  serviciosActivos: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Revendedor {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  suscripcionesTotales: number;
  montoSinConsumir: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Form Types
export interface ClienteFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
}

export interface RevendedorFormData {
  nombre: string;
  telefono: string;
  email?: string;
  metodoPagoId: string;
  comisionPorcentaje: number;
}
