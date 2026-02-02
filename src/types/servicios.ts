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
  /** Variables exclusivas del pago inicial (nunca se envían en actualizaciones) */
  pagoInicialFechaInicio?: Date;
  pagoInicialFechaVencimiento?: Date;
  pagoInicialMonto?: number;
  /** Ciclo de facturación del pago inicial (guardado al crear el servicio) */
  pagoInicialCicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  /** @deprecated Usar pagoInicial*; se mantiene para compatibilidad al leer de Firestore */
  fechaInicioInicial?: Date;
  fechaVencimientoInicial?: Date;
  costoServicioInicial?: number;
  notas?: string;
  activo: boolean;
  renovacionAutomatica: boolean;
  fechaRenovacion?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/** Registro de un pago/renovación del servicio para el historial */
export interface PagoServicio {
  id: string;
  servicioId: string;
  /** Fecha en que se registró el pago */
  fecha: Date;
  /** "Pago inicial" o "Renovación #1", "Renovación #2", etc. */
  descripcion: string;
  /** Ciclo de facturación de este pago (mensual, trimestral, semestral, anual) */
  cicloPago?: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  fechaInicio: Date;
  fechaVencimiento: Date;
  monto: number;
  createdAt: Date;
  updatedAt: Date;
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
