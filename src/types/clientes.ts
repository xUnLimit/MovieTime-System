// ===========================
// CLIENTE & REVENDEDOR TYPES
// ===========================

export interface Cliente {
  id: string;
  nombre: string;
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
  telefono: string;
  email?: string;
  metodoPagoId: string;
  metodoPagoNombre: string;
  comisionPorcentaje: number;
  suscripcionesTotales: number;
  montoTotal: number;
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
